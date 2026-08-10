import { authHeaders } from "../auth-client";
import { apiErrorMessage } from "../api-error";
import { API_BASE_URL } from "../../services/api-service";

export type DashboardData = {
  summary: { revenue: number; today_revenue: number; total_orders: number; today_orders: number; active_orders: number; customers: number; active_customers: number; products: number; low_stock: number };
  order_statuses: Record<string, number>;
  sales_days: Array<{ date: string; label: string; revenue: number; orders: number }>;
  recent_orders: Array<{ id: string; created_at: string; status: string; total: number; customer_name: string | null }>;
  top_products: Array<{ product_id: string; name: string; quantity: number; revenue: number }>;
  low_stock_products: Array<{ id: string; name: string; category_l1: string; inventory_qty: number; unit: string }>;
  delivery: Record<string, number>;
};

let cache: DashboardData | null = null;

export const cachedDashboard = () => cache;

export async function getDashboard(): Promise<DashboardData> {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard`, { headers: authHeaders() });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(apiErrorMessage(body, "Could not load dashboard"));
  cache = body as DashboardData;
  return cache;
}
