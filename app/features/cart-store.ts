import type { Product } from "./catalog/types";
import { getAuthSession } from "./auth-client";

export type CartItem = {
  product: Product;
  quantity: number;
};

const GUEST_CART_KEY = "sjs-shopping-cart-guest";

function getCartKey() {
  const user = getAuthSession()?.user;

  if (user?.id) {
    return `sjs-shopping-cart-${user.id}`;
  }

  return GUEST_CART_KEY;
}

export function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const key = getCartKey();

    return JSON.parse(
      localStorage.getItem(key) || "[]"
    ) as CartItem[];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  const key = getCartKey();

  localStorage.setItem(
    key,
    JSON.stringify(items)
  );

  window.dispatchEvent(
    new Event("sjs-cart-updated")
  );
}

export function addCartItem(
  product: Product,
  quantity = 1
) {
  const items = readCart();

  const existing = items.find(
    (item) => item.product.id === product.id
  );

  if (existing) {
    existing.quantity += quantity;
  } else {
    items.push({
      product,
      quantity,
    });
  }

  writeCart(items);
}