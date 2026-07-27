import { authHeaders } from "./auth-client";
import { API_BASE_URL } from "../services/api-service";

const API = API_BASE_URL;

export type CustomerAddress = {
  id: string;
  full_name: string;
  mobile: string;
  street: string;
  locality: string | null;
  city: string;
  state: string;
  pincode: string;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type CustomerAddressInput = Omit<CustomerAddress, "id" | "created_at" | "updated_at">;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/customers/addresses${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail ?? "Could not save the delivery address");
  return body as T;
}

export const customerAddressApi = {
  list: () => request<CustomerAddress[]>(""),
  create: (address: CustomerAddressInput) => request<CustomerAddress>("", { method: "POST", body: JSON.stringify(address) }),
  update: (id: string, address: CustomerAddressInput) => request<CustomerAddress>(`/${id}`, { method: "PUT", body: JSON.stringify(address) }),
  remove: (id: string) => request<void>(`/${id}`, { method: "DELETE" }),
};
