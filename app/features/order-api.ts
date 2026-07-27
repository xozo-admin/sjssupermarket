import { authHeaders, getAuthSession } from "./auth-client";
import { API_BASE_URL } from "../services/api-service";

const API = API_BASE_URL;

export type OrderSummary = { id: string; total: string; status: string; payment_status: string };
export type OrderItem = { id: string; product_id: string; product_name: string; unit_price: string; quantity: number; line_total: string };
export type Order = OrderSummary & { user_id: string; customer_name: string | null; customer_email: string | null; customer_mobile: string | null; payment_method: string; subtotal: string; delivery_fee: string; delivery_address: string; created_at: string; items: OrderItem[] };
export type RazorpayCheckout = { checkout_id: string; razorpay_key_id: string; razorpay_order_id: string; amount: number; display_amount: string; currency: string };
export type RazorpayPaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

async function requestOrders(path: string): Promise<Order[]> {
  const response = await fetch(`${API}${path}`, { headers: authHeaders() });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail ?? "Could not load orders");
  return body as Order[];
}

export const listMyOrders = () => requestOrders("/orders");
export const listAllOrders = () => requestOrders("/orders/admin");

export async function updateOrderStatus(orderId: string, status: string) {
  const response = await fetch(`${API}/orders/admin/${orderId}/status`, { method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() }, body: JSON.stringify({ status }) });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail ?? "Could not update order status");
  return body as Order;
}

export function orderSocketUrl() {
  const accessToken = getAuthSession()?.access_token;
  if (!accessToken) return null;
  return `${API.replace(/^http/, API.startsWith("https") ? "wss" : "ws")}/ws/delivery?token=${encodeURIComponent(accessToken)}`;
}

export async function placeOrder(input: { address_id: string; payment_method: string; items: { product_id: string; quantity: number }[] }) {
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail ?? "Could not place your order");
  return body as OrderSummary;
}

export async function createRazorpayOrder(input: { address_id: string; items: { product_id: string; quantity: number }[] }) {
  const response = await fetch(`${API}/payments/razorpay/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail ?? "Could not start Razorpay payment");
  return body as RazorpayCheckout;
}

export async function verifyRazorpayPayment(checkoutId: string, payment: RazorpayPaymentResponse) {
  const response = await fetch(`${API}/payments/razorpay/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ checkout_id: checkoutId, ...payment }),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail ?? "Could not verify Razorpay payment");
  return body.order as OrderSummary;
}
