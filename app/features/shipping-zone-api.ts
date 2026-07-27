import { authHeaders } from "./auth-client";
import { apiErrorMessage } from "./api-error";
import { API_BASE_URL } from "../services/api-service";

const API = API_BASE_URL;

export type ShippingZone = {
  id: string;
  store_name: string;
  store_address: string;
  latitude: number;
  longitude: number;
  radius_km: number;
  delivery_fee: number;
  enabled: boolean;
};

export type ShippingZoneInput = Omit<ShippingZone, "id">;
export type DeliveryAvailability = {
  available: boolean;
  distance_km: number;
  radius_km: number | null;
  message: string;
};

async function request<T>(init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/admin/shipping-zone`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage(body, "Shipping zone request failed"));
  return body as T;
}

export const shippingZoneApi = {
  get: () => request<ShippingZone>(),
  save: (body: ShippingZoneInput) =>
    request<ShippingZone>({ method: "PUT", body: JSON.stringify(body) }),
  availability: async (latitude: number, longitude: number) => {
    const response = await fetch(`${API}/shipping/availability?latitude=${latitude}&longitude=${longitude}`);
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(apiErrorMessage(body, "Could not check delivery availability"));
    return body as DeliveryAvailability;
  },
};
