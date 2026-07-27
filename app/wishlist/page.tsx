"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthSession, requireAuth } from "../features/auth-client";
import { addCartItem, readCart } from "../features/cart-store";
import { productImageUrl, type Product } from "../features/catalog/types";
import { loadWishlist, removeWishlist } from "../features/wishlist-store";

export default function WishlistPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartIds, setCartIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const session = getAuthSession();
    setSignedIn(Boolean(session));
    if (!session) {
      setLoading(false);
      return;
    }
    void loadWishlist()
      .then(setProducts)
      .finally(() => setLoading(false));
    setCartIds(new Set(readCart().map((item) => item.product.id)));
  }, []);
  const remove = async (id: string) => {
    await removeWishlist(id);
    setProducts((items) => items.filter((item) => item.id !== id));
  };
  return (
    <main className="wishlist-page">
      <header>
        <div>
          <span>MY SAVED ITEMS</span>
          <h1>My Wishlist</h1>
          <p>
            {products.length} {products.length === 1 ? "product" : "products"}{" "}
            saved for later
          </p>
        </div>
        <Heart />
      </header>
      {loading ? (
        <div className="wishlist-state">Loading wishlist…</div>
      ) : !signedIn ? (
        <div className="wishlist-state">
          <Heart />
          <h2>Sign in to view your wishlist</h2>
          <p>Save products and access them from any device.</p>
          <button onClick={() => requireAuth("/wishlist")}>
            Login to continue
          </button>
        </div>
      ) : !products.length ? (
        <div className="wishlist-state">
          <Heart />
          <h2>Your wishlist is empty</h2>
          <p>Tap the heart on products you would like to save.</p>
          <Link href="/products">Explore products</Link>
        </div>
      ) : (
        <section className="wishlist-grid">
          {products.map((product) => {
            const image = productImageUrl(product, "l");
            const price = Number(product.selling_price);
            const mrp = Number(product.mrp);
            const inStock =
              product.stock_status === "in_stock" && product.inventory_qty > 0;
            const inCart = cartIds.has(product.id);
            return (
              <article key={product.id}>
                <button
                  className="wishlist-remove"
                  onClick={() => void remove(product.id)}
                  title="Remove from wishlist"
                >
                  <Trash2 />
                </button>
                <Link
                  href={`/products/${product.id}`}
                  className="wishlist-image"
                >
                  {image ? (
                    <img src={image} alt={product.name} />
                  ) : (
                    <span>No image</span>
                  )}
                </Link>
                <small>{product.category_l2 || product.category_l1}</small>
                <Link href={`/products/${product.id}`}>
                  <h2>{product.name}</h2>
                </Link>
                <p>
                  {product.brand || "Generic"} · {Number(product.unit_value)}{" "}
                  {product.unit}
                </p>
                <div>
                  <strong>₹{price.toFixed(0)}</strong>
                  {mrp > price && <del>₹{mrp.toFixed(0)}</del>}
                </div>
                <em className={inStock ? "available" : "unavailable"}>
                  {inStock ? "In stock" : "Out of stock"}
                </em>
                <button
                  className={inCart ? "in-cart" : ""}
                  disabled={!inStock && !inCart}
                  onClick={() => {
                    if (inCart) {
                      window.location.href = "/cart";
                      return;
                    }
                    addCartItem(product);
                    setCartIds(new Set([...cartIds, product.id]));
                  }}
                >
                  <ShoppingCart />
                  {inCart
                    ? "Go to Cart"
                    : inStock
                      ? "Add to Cart"
                      : "Unavailable"}
                </button>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
