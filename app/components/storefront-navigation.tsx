"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { categoryApi } from "../features/categories/category-api";
import type { Category } from "../features/categories/types";
import {
  getAuthSession,
  logout,
  startAuthRefresh,
  type AuthUser,
} from "../features/auth-client";
import { readCart } from "../features/cart-store";
import { loadWishlist, readWishlistIds } from "../features/wishlist-store";
import CategoryMegaNav from "./category-mega-nav";
import ProductSearch from "./product-search";
import StorefrontAuthModal from "./storefront-auth-modal";

function Icon({
  name,
}: {
  name: "heart" | "bag" | "orders" | "bell" | "user";
}) {
  const paths = {
    heart: (
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    ),
    bag: (
      <>
        <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L20.5 8H6" />
        <circle cx="10" cy="20" r="1.3" />
        <circle cx="18" cy="20" r="1.3" />
      </>
    ),
    orders: (
      <>
        <path d="M6 3h12a2 2 0 0 1 2 2v16l-3-2-3 2-3-2-3 2-2-1.3V5a2 2 0 0 1 2-2Z" />
        <path d="M9 8h6M9 12h6" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="9" r="3" />
        <path d="M6.8 19a5.5 5.5 0 0 1 10.4 0" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg className="nav-chevron" viewBox="0 0 16 16" aria-hidden="true">
      <path d="m4 6 4 4 4-4" />
    </svg>
  );
}

export default function StorefrontNavigation() {
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    if (!isAdmin)
      void categoryApi
        .list()
        .then((result) => setCategories(result.items))
        .catch(() => setCategories([]));
  }, [isAdmin]);
  useEffect(() => {
    const sync = () => setUser(getAuthSession()?.user ?? null);
    sync();
    window.addEventListener("sjs-auth-updated", sync);
    return () => window.removeEventListener("sjs-auth-updated", sync);
  }, []);
  useEffect(() => startAuthRefresh(), []);
  useEffect(() => {
    const open = () => setAuthOpen(true);
    window.addEventListener("sjs-auth-required", open);
    return () => window.removeEventListener("sjs-auth-required", open);
  }, []);
  useEffect(() => {
    const sync = () =>
      setCartCount(
        readCart().reduce((total, item) => total + item.quantity, 0),
      );
    sync();
    window.addEventListener("sjs-cart-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sjs-cart-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    const sync = () => setWishlistCount(readWishlistIds().size);
    const hydrate = () => void loadWishlist().then(sync).catch(sync);
    sync();
    hydrate();
    window.addEventListener("sjs-wishlist-updated", sync);
    window.addEventListener("sjs-auth-updated", hydrate);
    return () => {
      window.removeEventListener("sjs-wishlist-updated", sync);
      window.removeEventListener("sjs-auth-updated", hydrate);
    };
  }, []);

  if (isAdmin) return null;
  return (
    <>
      <div className="storefront global-storefront-navigation">
        <header className="shop-header">
          <div className="shop-nav">
            <Link className="shop-logo" href="/">
              <span>
                <img src="/app_logo.jpeg" alt="SJS Super Market" />
              </span>
              <div>
                <b>SJS</b>
                <small>SUPER MARKET</small>
              </div>
            </Link>
            <ProductSearch value={search} onChange={setSearch} shortcut />
            <div className="shop-tools">
              <Link
                className="global-wishlist-link"
                href="/wishlist"
                aria-label={`Wishlist with ${wishlistCount} items`}
              >
                <span className="cart-icon-wrap">
                  <Icon name="heart" />
                  {wishlistCount > 0 && (
                    <b>{wishlistCount > 99 ? "99+" : wishlistCount}</b>
                  )}
                </span>
              </Link>
              <Link
                className="global-cart-link"
                href="/cart"
                aria-label={`Cart with ${cartCount} items`}
              >
                <span className="cart-icon-wrap">
                  <Icon name="bag" />
                  {cartCount > 0 && <b>{cartCount > 99 ? "99+" : cartCount}</b>}
                </span>
                <span>Cart</span>
              </Link>
              <Link
                className="global-orders-link"
                href="/orders"
                aria-label="My orders"
              >
                <Icon name="orders" />
                <span>Orders</span>
              </Link>
              <button aria-label="Notifications">
                <Icon name="bell" />
              </button>
              {user ? (
                <button
                  className="global-user-button"
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                >
                  <Icon name="user" />
                  <span>{user.name}</span>
                  <ChevronDown />
                </button>
              ) : (
                <button
                  className="global-login-button"
                  onClick={() => setAuthOpen(true)}
                >
                  <Icon name="user" />
                  <span>Login</span>
                  <ChevronDown />
                </button>
              )}
              {user && profileOpen && (
                <section className="global-profile-card" role="menu">
                  <header>
                    <span>{user.name.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </div>
                  </header>
                  <dl>
                    <div><dt>Role</dt><dd>{user.role}</dd></div>
                    {user.mobile && <div><dt>Mobile</dt><dd>{user.mobile}</dd></div>}
                    {user.designation && <div><dt>Designation</dt><dd>{user.designation}</dd></div>}
                  </dl>
                  {user.role === "admin" && (
                    <Link href="/admin/dashboard" onClick={() => setProfileOpen(false)}>
                      Open admin dashboard
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                      window.location.href = "/";
                    }}
                  >
                    Logout
                  </button>
                </section>
              )}
            </div>
          </div>
          <CategoryMegaNav categories={categories} />
        </header>
      </div>
      {authOpen && <StorefrontAuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
