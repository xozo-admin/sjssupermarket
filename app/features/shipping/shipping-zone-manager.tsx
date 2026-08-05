"use client";

import { LocateFixed, MapPin, Save, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import AddressMapModal, { type MapSelection } from "../../components/address-map-modal";
import { shippingZoneApi, type ShippingZoneInput } from "../shipping-zone-api";

const initial: ShippingZoneInput = {
  store_name: "SJS Super Market",
  store_address: "",
  latitude: 13.0827,
  longitude: 80.2707,
  radius_km: 5,
  delivery_fee: 0,
  enabled: true,
};

export default function ShippingZoneManager() {
  const [form, setForm] = useState(initial);
  const [originalForm, setOriginalForm] = useState(initial);
  const [mapOpen, setMapOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void shippingZoneApi.get()
      .then((zone) => {
        setForm(zone);
        setOriginalForm(zone);
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, []);

  const selectLocation = (selection: MapSelection) => {
    const address = [selection.street, selection.locality, selection.city, selection.state, selection.pincode]
      .filter(Boolean).join(", ");
    setForm((current) => ({
      ...current,
      latitude: selection.latitude,
      longitude: selection.longitude,
      store_address: address || current.store_address,
    }));
    setMapOpen(false);
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const saved = await shippingZoneApi.save(form);
      setForm(saved);
      setOriginalForm(saved);
      setMessage("Shipping zone saved successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save shipping zone.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
  form.store_name !== originalForm.store_name ||
  form.store_address !== originalForm.store_address ||
  form.latitude !== originalForm.latitude ||
  form.longitude !== originalForm.longitude ||
  form.radius_km !== originalForm.radius_km ||
  form.delivery_fee !== originalForm.delivery_fee ||
  form.enabled !== originalForm.enabled;

  return (
    <div className="shipping-zone-admin">
      <header>
        <div><p>Admin panel</p><h1>Shipping Zones</h1><span>Set the supermarket location and delivery coverage range.</span></div>
        <button disabled={loading || saving || !hasChanges} onClick={() => void save()}><Save />{saving ? "Saving..." : "Save settings"}</button>
      </header>

      <div className="shipping-zone-layout">
        <section>
          <h2><MapPin /> Supermarket location</h2>
          <label>Supermarket name<input value={form.store_name} onChange={(event) => setForm({ ...form, store_name: event.target.value })} /></label>
          <label>Full address<textarea rows={3} value={form.store_address} onChange={(event) => setForm({ ...form, store_address: event.target.value })} placeholder="Enter supermarket address" /></label>
          <div className="shipping-coordinates">
            <label>Latitude<input type="number" step="any" value={form.latitude} onChange={(event) => setForm({ ...form, latitude: Number(event.target.value) })} /></label>
            <label>Longitude<input type="number" step="any" value={form.longitude} onChange={(event) => setForm({ ...form, longitude: Number(event.target.value) })} /></label>
          </div>
          <button className="shipping-map-button" type="button" onClick={() => setMapOpen(true)}><LocateFixed /> Select location on map</button>
        </section>

        <section>
          <h2><Truck /> Delivery range</h2>
          <label>Delivery radius (km)<input type="number" min="0.1" max="500" step="0.1" value={form.radius_km} onChange={(event) => setForm({ ...form, radius_km: Number(event.target.value) })} /></label>
          <input className="shipping-range" type="range" min="1" max="100" value={Math.min(100, form.radius_km)} onChange={(event) => setForm({ ...form, radius_km: Number(event.target.value) })} />
          <div className="shipping-radius-preview"><strong>{form.radius_km} km</strong><span>Customers within this distance from the supermarket can receive delivery.</span></div>
          <label>Delivery fee (₹)<input type="number" min="0" step="1" value={form.delivery_fee} onChange={(event) => setForm({ ...form, delivery_fee: Number(event.target.value) })} /></label>
          <label className="shipping-toggle"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} /><span><b>Enable this shipping zone</b><small>Allow delivery to addresses inside the configured radius.</small></span></label>
        </section>
      </div>
      {message && <p className="shipping-zone-message">{message}</p>}
      {mapOpen && <AddressMapModal initial={{ latitude: form.latitude, longitude: form.longitude }} onClose={() => setMapOpen(false)} onConfirm={selectLocation} />}
    </div>
  );
}
