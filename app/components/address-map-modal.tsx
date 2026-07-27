"use client";

import type { CircleMarker, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";

export type MapSelection = {
  latitude: number;
  longitude: number;
  street?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
};

const DEFAULT_LOCATION: [number, number] = [13.0827, 80.2707];

export default function AddressMapModal({ initial, onClose, onConfirm }: {
  initial?: { latitude: number; longitude: number } | null;
  onClose: () => void;
  onConfirm: (selection: MapSelection) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<CircleMarker | null>(null);
  const [point, setPoint] = useState<[number, number]>(initial ? [initial.latitude, initial.longitude] : DEFAULT_LOCATION);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    void import("leaflet").then((L) => {
      if (disposed || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(point, initial ? 17 : 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      const marker = L.circleMarker(point, { radius: 9, color: "#fff", weight: 3, fillColor: "#0aa35b", fillOpacity: 1 }).addTo(map);
      map.on("click", (event) => {
        const next: [number, number] = [event.latlng.lat, event.latlng.lng];
        marker.setLatLng(next);
        setPoint(next);
      });
      mapRef.current = map;
      markerRef.current = marker;
      window.setTimeout(() => map.invalidateSize(), 0);
    });
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // Initialize the map once while the modal is mounted.

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Location access is not supported by this browser.");
      return;
    }
    setLocating(true);
    setError("");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      const next: [number, number] = [coords.latitude, coords.longitude];
      setPoint(next);
      markerRef.current?.setLatLng(next);
      mapRef.current?.flyTo(next, 17);
      setLocating(false);
    }, () => {
      setError("Could not access your location. Select the address directly on the map.");
      setLocating(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  const confirm = async () => {
    setSaving(true);
    setError("");
    const selection: MapSelection = { latitude: point[0], longitude: point[1] };
    try {
      const params = new URLSearchParams({ format: "jsonv2", lat: String(point[0]), lon: String(point[1]), addressdetails: "1" });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, { headers: { "Accept-Language": "en" } });
      if (response.ok) {
        const result = await response.json();
        const address = result.address ?? {};
        selection.street = [address.house_number, address.road].filter(Boolean).join(" ");
        selection.locality = address.suburb || address.neighbourhood || address.quarter || address.city_district;
        selection.city = address.city || address.town || address.village || address.county;
        selection.state = address.state;
        selection.pincode = address.postcode;
      }
    } catch {
      // Coordinates are still usable when reverse lookup is unavailable.
    }
    onConfirm(selection);
    setSaving(false);
  };

  return (
    <div className="address-map-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="address-map-dialog" role="dialog" aria-modal="true" aria-labelledby="address-map-title">
        <header><div><h2 id="address-map-title">Select delivery location</h2><p>Move around the map and click the exact delivery point.</p></div><button type="button" onClick={onClose} aria-label="Close map">×</button></header>
        <div className="address-map-canvas" ref={containerRef} />
        <footer>
          <div><strong>Selected location</strong><span>{point[0].toFixed(6)}, {point[1].toFixed(6)}</span>{error && <small>{error}</small>}</div>
          <button className="use-location-button" type="button" onClick={useCurrentLocation} disabled={locating}>{locating ? "Locating..." : "⌖ Use current location"}</button>
          <button className="confirm-location-button" type="button" onClick={confirm} disabled={saving}>{saving ? "Finding address..." : "Confirm location"}</button>
        </footer>
      </section>
    </div>
  );
}
