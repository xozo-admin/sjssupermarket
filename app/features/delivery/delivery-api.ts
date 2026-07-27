import { authHeaders, getAuthSession } from "../auth-client";
import { apiErrorMessage } from "../api-error";
import { API_BASE_URL, apiSocketUrl } from "../../services/api-service";

const API = API_BASE_URL;
export type DeliveryMan = {
  id: string;
  name: string;
  mobile: string;
  email: string;
  address: string;
  photo_url: string | null;
  zone: string;
  vehicle_type: string;
  vehicle_number: string;
  documents: Record<string, string>;
  bank_details: Record<string, string>;
  verification_status: string;
  delivery_status: string;
  online: boolean;
  active: boolean;
  blocked: boolean;
  rating: number;
  total_deliveries: number;
  completed_orders: number;
  cancelled_orders: number;
  failed_orders: number;
  average_delivery_minutes: number;
  latitude: number | null;
  longitude: number | null;
  last_active_at: string | null;
  created_at: string;
  active_order_id: string | null;
};
export type DeliveryOrder = {
  id: string;
  delivery_man_id: string | null;
  customer_name: string | null;
  customer_mobile: string | null;
  delivery_address: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  created_at: string;
  items: { product_name: string; quantity: number }[];
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
  } catch {
    throw new Error("Unable to connect to the server. Please try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(apiErrorMessage(body, "Delivery request failed"));
  return body as T;
}

const base = "/admin/delivery-men";
export const deliveryApi = {
  dashboard: () => req<Record<string, number>>(base + "/dashboard"),
  list: (q = "") => req<DeliveryMan[]>(`${base}?${q}`),
  create: (body: unknown) =>
    req<DeliveryMan>(base, { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: unknown) =>
    req<DeliveryMan>(`${base}/detail/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  remove: (id: string) =>
    req<void>(`${base}/detail/${id}`, { method: "DELETE" }),
  resetPassword: (id: string, password: string) =>
    req<void>(`${base}/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),
  assign: (order_id: string, delivery_man_id: string) =>
    req(`${base}/assign/order`, {
      method: "POST",
      body: JSON.stringify({ order_id, delivery_man_id }),
    }),
  attendance: () => req<any[]>(base + "/operations/attendance"),
  earnings: () => req<any[]>(base + "/operations/earnings"),
  leaves: () => req<any[]>(base + "/operations/leaves"),
  decideLeave: (id: string, status: string) =>
    req(`${base}/operations/leaves/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  logs: () => req<any[]>(base + "/operations/logs"),
  notify: (body: unknown) =>
    req(base + "/operations/notifications", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  orders: () => req<DeliveryOrder[]>("/orders/admin"),
};

export function deliverySocketUrl() {
  const token = getAuthSession()?.access_token;
  if (!token) return null;
  return apiSocketUrl(`/ws/delivery?token=${encodeURIComponent(token)}`);
}
