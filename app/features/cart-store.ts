import type { Product } from "./catalog/types";

export type CartItem = { product: Product; quantity: number };
const CART_KEY = "sjs-shopping-cart";

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartItem[]; }
  catch { return []; }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("sjs-cart-updated"));
}

export function addCartItem(product: Product, quantity = 1) {
  const items = readCart();
  const existing = items.find((item) => item.product.id === product.id);
  if (existing) existing.quantity += quantity;
  else items.push({ product, quantity });
  writeCart(items);
}
