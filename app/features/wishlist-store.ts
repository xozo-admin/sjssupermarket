import { authHeaders, getAuthSession, requireAuth } from "./auth-client";
import type { Product } from "./catalog/types";
import { API_BASE_URL } from "../services/api-service";

const API = API_BASE_URL;
const key = () => `sjs-wishlist-${getAuthSession()?.user.id ?? "guest"}`;

export function readWishlistIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(key()) || "[]") as string[]);
  } catch {
    return new Set();
  }
}
function save(ids: Set<string>) {
  localStorage.setItem(key(), JSON.stringify([...ids]));
  window.dispatchEvent(new Event("sjs-wishlist-updated"));
}
async function request<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/wishlist${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail || "Wishlist request failed");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export async function loadWishlist(): Promise<Product[]> {
  if (!getAuthSession()) return [];
  const products = await request<Product[]>();
  save(new Set(products.map((product) => product.id)));
  return products;
}
export async function toggleWishlist(
  productId: string,
  returnTo = "/wishlist",
): Promise<boolean> {
  if (!requireAuth(returnTo)) return false;
  const ids = readWishlistIds();
  if (ids.has(productId)) {
    await request(`/${productId}`, { method: "DELETE" });
    ids.delete(productId);
  } else {
    await request(`/${productId}`, { method: "POST" });
    ids.add(productId);
  }
  save(ids);
  return ids.has(productId);
}
export async function removeWishlist(productId: string) {
  await request(`/${productId}`, { method: "DELETE" });
  const ids = readWishlistIds();
  ids.delete(productId);
  save(ids);
}
