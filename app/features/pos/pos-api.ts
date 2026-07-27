import { authHeaders } from "../auth-client";
import { API_BASE_URL } from "../../services/api-service";

const API = API_BASE_URL;

export type PosProduct = {
  id: string;
  name: string;
  barcode: string | null;
  selling_price: string;
  mrp: string;
  tax_percent: string;
  inventory_qty: number;
  is_active: boolean;
  stock_status: string;
  unit: string;
  image_url: string | null;
  category: string;
};

export type PosSaleItem = {
  product_id: string;
  product_name: string;
  barcode: string | null;
  quantity: number;
  unit_price: string;
  tax_percent: string;
  line_total: string;
};

export type PosSale = {
  id: string;
  invoice_number: string;
  status: string;
  customer_name: string | null;
  customer_mobile: string | null;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  payment_method: string;
  payment_status: string;
  amount_tendered: string;
  change_due: string;
  item_count: number;
  notes: string | null;
  created_at: string;
  items: PosSaleItem[];
};

export type PosSaleInput = {
  items: { product_id: string; quantity: number }[];
  customer_name: string | null;
  customer_mobile: string | null;
  discount_type: "fixed" | "percent";
  discount_value: number;
  payment_method: "cash" | "razorpay";
  amount_tendered: number;
  notes: string | null;
};

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/admin/pos${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  const body = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.detail ?? "POS request failed");
  return body as T;
}

export const posApi = {
  products: (search: string) => call<PosProduct[]>(`/products?${new URLSearchParams({ search, limit: "1000" })}`),
  checkout: (input: PosSaleInput) => call<PosSale>("/checkout", { method: "POST", body: JSON.stringify(input) }),
  hold: (input: PosSaleInput) => call<PosSale>("/hold", { method: "POST", body: JSON.stringify(input) }),
  holds: () => call<PosSale[]>("/holds"),
  deleteHold: (id: string) => call<void>(`/holds/${id}`, { method: "DELETE" }),
  sales: () => call<PosSale[]>("/sales?limit=30"),
  createRazorpayOrder: (input: PosSaleInput) =>
    call<{ pos_sale_id: string; razorpay_key_id: string; razorpay_order_id: string; amount: number; display_amount: string; currency: string }>(
      "/razorpay/create-order",
      { method: "POST", body: JSON.stringify(input) },
    ),
  verifyRazorpayPayment: (
    posSaleId: string,
    payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
  ) =>
    call<PosSale>("/razorpay/verify", {
      method: "POST",
      body: JSON.stringify({ pos_sale_id: posSaleId, ...payment }),
    }),
};
