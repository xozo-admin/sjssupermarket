"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { categoryApi } from "./features/categories/category-api";
import type { Category } from "./features/categories/types";
import { catalogApi } from "./features/catalog/catalog-api";
import { productImageUrl, type Product } from "./features/catalog/types";
import { homepageApi } from "./features/homepage/homepage-api";
import type {
  ClientFeedback,
  HeroSlide,
  HomepageBanner,
} from "./features/homepage/types";
import ProductSearch from "./components/product-search";
import CategoryMegaNav from "./components/category-mega-nav";
import { addCartItem, readCart } from "./features/cart-store";
import { requireAuth } from "./features/auth-client";
import {
  loadWishlist,
  readWishlistIds,
  toggleWishlist,
} from "./features/wishlist-store";

const fallbackCategories = [
  "Vegetables",
  "Fruits",
  "Dairy & Eggs",
  "Bakery",
  "Meat & Fish",
  "Beverages",
  "Snacks",
];

function Icon({
  name,
}: {
  name:
    "search" | "heart" | "bag" | "bell" | "user" | "clock" | "arrow" | "menu";
}) {
  const paths = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    ),
    bag: (
      <>
        <path d="M5 8h14l-1 13H6L5 8Z" />
        <path d="M9 9V6a3 3 0 0 1 6 0v3" />
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
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function StoreLogo() {
  return (
    <Link className="shop-logo" href="/">
      <span>
        <img src="/app_logo.jpeg" alt="SJS Super Market" />
      </span>
      <div>
        <b>SJS</b>
        <small>SUPER MARKET</small>
      </div>
    </Link>
  );
}

function BenefitIcon({
  name,
}: {
  name: "delivery" | "fresh" | "secure" | "returns";
}) {
  const paths = {
    delivery: (
      <>
        <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="17" cy="19" r="2" />
      </>
    ),
    fresh: (
      <>
        <path d="M12 21c-5-3-7-7-6-12 5 0 9 2 12 7-1 3-3 4-6 5Z" />
        <path d="M8 13c3 0 6 1 9 4M15 8c1-3 3-5 6-5 0 3-1 6-5 7" />
      </>
    ),
    secure: (
      <>
        <path d="M12 3 20 7v5c0 5-3 8-8 10-5-2-8-5-8-10V7l8-4Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    returns: (
      <>
        <path d="M4 9V4m0 0h5M4 4l4 4" />
        <path d="M5 14a8 8 0 1 0 2-7" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function CategoryCard({
  category,
  index,
}: {
  category: Category | null;
  index: number;
}) {
  const colors = [
    "#e3efff",
    "#e1f8ff",
    "#eee7ff",
    "#ffe7ea",
    "#e3faef",
    "#fff2cf",
    "#f3e9ff",
  ];
  const name = category?.name ?? fallbackCategories[index];
  return (
    <a
      className="shop-category-card"
      href={`/products?category=${encodeURIComponent(name)}`}
      style={{ background: colors[index % colors.length] }}
    >
      <div className="shop-category-image">
        {category?.thumbnail_url ? (
          <img src={category.thumbnail_url} alt={name} />
        ) : (
          <span>{["🥬", "🍎", "🥛", "🥐", "🥩", "🥤", "🍿"][index % 7]}</span>
        )}
      </div>
      <strong>{name}</strong>
    </a>
  );
}

function ProductCard({
  product,
  inCart,
  wishlisted,
  onWishlist,
}: {
  product: Product;
  inCart: boolean;
  wishlisted: boolean;
  onWishlist: (id: string, active: boolean) => void;
}) {
  const image = productImageUrl(product, "l");
  const price = Number(product.selling_price);
  const mrp = Number(product.mrp);
  const discount = mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
  const inStock =
    product.stock_status === "in_stock" && product.inventory_qty > 0;
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => {
        window.location.href = `/products/${product.id}`;
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter")
          window.location.href = `/products/${product.id}`;
      }}
    >
      <div className="market-image">
        {image ? (
          <img src={image} alt={product.name} />
        ) : (
          <div className="product-no-image">No image</div>
        )}
        <button
          className={`market-heart ${wishlisted ? "active" : ""}`}
          aria-label={`Wishlist ${product.name}`}
          onClick={(event) => {
            event.stopPropagation();
            void toggleWishlist(product.id, `/products/${product.id}`).then(
              (active) => onWishlist(product.id, active),
            );
          }}
        >
          <Heart />
        </button>
      </div>
      <small className="market-sponsored">Sponsored</small>
      <h2>{product.name}</h2>
      <div className="market-product-meta">
        <span>{product.brand || "Generic"}</span>
        <i>·</i>
        <span>
          {Number(product.unit_value)} {product.unit}
        </span>
      </div>
      <div className="market-rating">
        <span>
          {Math.max(Number(product.rating), 3.7).toFixed(1)}
          <Star />
        </span>
        <small>0 reviews</small>
      </div>
      <div className="market-price">
        <strong>₹{price.toFixed(0)}</strong>
        {mrp > price && <del>₹{mrp.toFixed(0)}</del>}
        {discount > 0 && <span>{discount}% off</span>}
        <b className={inStock ? "in-stock" : "out-of-stock"}>
          {inStock ? `${product.inventory_qty} in stock` : "Out of stock"}
        </b>
      </div>
      {discount >= 20 && <em className="market-deal">Hot Deal</em>}
      <button
        className={`market-cart ${inCart ? "in-cart" : ""}`}
        disabled={!inStock && !inCart}
        onClick={(event) => {
          event.stopPropagation();
          if (inCart) {
            window.location.href = "/cart";
            return;
          }
          if (requireAuth(`/products/${product.id}`)) addCartItem(product);
        }}
      >
        <ShoppingCart />
        {inCart ? "Go to Cart" : inStock ? "Add to Cart" : "Unavailable"}
      </button>
    </article>
  );
}

export default function StorefrontClient({
  initialCategories = [],
  initialHomepage = null,
}: {
  initialCategories?: Category[];
  initialHomepage?: Awaited<ReturnType<typeof homepageApi.storefront>> | null;
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(
    initialHomepage?.products ?? [],
  );
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(
    initialHomepage?.hero_slides ?? [],
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroReady, setHeroReady] = useState(Boolean(initialHomepage));
  const [topCategoryIds, setTopCategoryIds] = useState<string[]>(
    initialHomepage?.top_category_ids ?? [],
  );
  const [freshPickIds, setFreshPickIds] = useState<string[]>(
    initialHomepage?.fresh_pick_ids ?? [],
  );
  const [trendingProductIds, setTrendingProductIds] = useState<string[]>(
    initialHomepage?.trending_product_ids ?? [],
  );
  const [bannerOne, setBannerOne] = useState<HomepageBanner | null>(
    initialHomepage?.banner_one ?? null,
  );
  const [weeklyDealIds, setWeeklyDealIds] = useState<string[]>(
    initialHomepage?.weekly_deal_ids ?? [],
  );
  const [bannerTwo, setBannerTwo] = useState<HomepageBanner | null>(
    initialHomepage?.banner_two ?? null,
  );
  const [clientFeedback, setClientFeedback] = useState<ClientFeedback[]>(
    initialHomepage?.client_feedback ?? [],
  );
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navSearch, setNavSearch] = useState("");
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (initialCategories.length === 0) {
      void categoryApi
        .list()
        .then((categoryResult) => {
          setCategories(categoryResult.items);
        })
        .catch(() => undefined);
    }
    if (!initialHomepage) {
      void homepageApi
        .storefront()
        .then((config) => {
          setHeroSlides(config.hero_slides);
          setTopCategoryIds(config.top_category_ids);
          setFreshPickIds(config.fresh_pick_ids);
          setTrendingProductIds(config.trending_product_ids);
          setBannerOne(config.banner_one);
          setWeeklyDealIds(config.weekly_deal_ids);
          setBannerTwo(config.banner_two);
          setClientFeedback(config.client_feedback);
          setProducts(config.products ?? []);
        })
        .catch(() => {
          setHeroSlides([]);
        })
        .finally(() => setHeroReady(true));
    }
  }, [initialCategories.length, initialHomepage]);
  useEffect(() => {
    setWishlistIds(readWishlistIds());
    void loadWishlist()
      .then((items) => setWishlistIds(new Set(items.map((item) => item.id))))
      .catch(() => undefined);
  }, []);
  const updateWishlist = (id: string, active: boolean) =>
    setWishlistIds((current) => {
      const next = new Set(current);
      if (active) next.add(id);
      else next.delete(id);
      return next;
    });

  useEffect(() => {
    if (heroSlides.length < 2) return;
    const timer = window.setInterval(
      () => setHeroIndex((index) => (index + 1) % heroSlides.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  useEffect(() => {
    const syncCart = () =>
      setCartProductIds(new Set(readCart().map((item) => item.product.id)));
    syncCart();
    window.addEventListener("sjs-cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("sjs-cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    if (clientFeedback.length < 2) return;
    const timer = window.setInterval(
      () => setFeedbackIndex((index) => (index + 1) % clientFeedback.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [clientFeedback.length]);

  const mainCategories = useMemo(
    () => categories.filter((item) => !item.parent_id),
    [categories],
  );
  const categorySlots = useMemo(
    () =>
      topCategoryIds
        .map((id) => categories.find((category) => category.id === id))
        .filter(Boolean) as Category[],
    [categories, topCategoryIds],
  );
  const freshPicks = useMemo(
    () =>
      freshPickIds
        .map((id) => products.find((product) => product.id === id))
        .filter(Boolean)
        .slice(0, 10) as Product[],
    [freshPickIds, products],
  );
  const trendingProducts = useMemo(
    () =>
      trendingProductIds
        .map((id) => products.find((product) => product.id === id))
        .filter(Boolean)
        .slice(0, 12) as Product[],
    [trendingProductIds, products],
  );
  const weeklyDeals = useMemo(
    () =>
      weeklyDealIds
        .map((id) => products.find((product) => product.id === id))
        .filter(Boolean)
        .slice(0, 12) as Product[],
    [weeklyDealIds, products],
  );
  const currentFeedback = clientFeedback.length
    ? clientFeedback[feedbackIndex % clientFeedback.length]
    : null;
  const hero = heroSlides.length
    ? heroSlides[heroIndex % heroSlides.length]
    : undefined;

  return (
    <main className="storefront landing-page">
      <header className="shop-header">
        <div className="shop-nav">
          <StoreLogo />
          <nav className={mobileOpen ? "open" : ""}>
            <a href="#home">Home</a>
            <a href="#categories">Categories</a>
          </nav>
          <ProductSearch value={navSearch} onChange={setNavSearch} shortcut />
          <div className="shop-tools">
            <Link href="/wishlist" aria-label="Favorites">
              <Icon name="heart" />
            </Link>
            <button aria-label="Cart">
              <Icon name="bag" />
            </button>
            <button aria-label="Notifications">
              <Icon name="bell" />
            </button>
            <Link href="/admin/dashboard">
              <Icon name="user" />
              Login
            </Link>
          </div>
          <button
            className="shop-mobile-menu"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Toggle navigation"
          >
            <Icon name="menu" />
          </button>
        </div>
        <CategoryMegaNav categories={categories} />
      </header>

      {!heroReady ? (
        <section
          className="shop-hero shop-hero-loading"
          id="home"
          aria-label="Loading hero"
        />
      ) : hero ? (
        <section className="shop-hero" id="home">
          <div className="shop-hero-copy">
            {hero.subtitle && (
              <div className="shop-eyebrow">
                ★ <span>{hero.subtitle}</span>
              </div>
            )}
            {hero.title && <h1>{hero.title}</h1>}
            {hero.description && <p>{hero.description}</p>}
            {(hero.button_text || hero.delivery_text) && (
              <div className="shop-hero-actions">
                {hero.button_text && (
                  <a href={hero.button_url || "#products"}>
                    {hero.button_text} <Icon name="arrow" />
                  </a>
                )}
                {hero.delivery_text && (
                  <span>
                    <Icon name="clock" />
                    <b>{hero.delivery_text}</b>
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="shop-hero-visual">
            {hero.image_url && (
              <img
                key={hero.id}
                src={`${hero.image_url}?v=${encodeURIComponent(hero.updated_at)}`}
                alt={hero.title || "Fresh grocery delivery"}
              />
            )}
          </div>
        </section>
      ) : null}

      {categorySlots.length > 0 && (
        <section className="shop-section" id="categories">
          <div className="shop-section-head">
            <div>
              <h2>Popular Categories</h2>
            </div>
            <Link className="section-show-all" href="/products">
              Show All <Icon name="arrow" />
            </Link>
          </div>
          <div className="shop-category-grid">
            {categorySlots.map((category, index) => (
              <CategoryCard
                key={category.id}
                category={category}
                index={index}
              />
            ))}
          </div>
        </section>
      )}

      {freshPicks.length > 0 && (
        <section className="shop-section shop-products" id="products">
          <div className="shop-section-head">
            <div>
              <h2>Today&apos;s Fresh Picks</h2>
            </div>
            <Link className="section-show-all" href="/products">
              Show All <Icon name="arrow" />
            </Link>
          </div>
          <div className="shop-product-grid products-market-grid">
            {freshPicks.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                inCart={cartProductIds.has(product.id)}
                wishlisted={wishlistIds.has(product.id)}
                onWishlist={updateWishlist}
              />
            ))}
          </div>
        </section>
      )}

      {trendingProducts.length > 0 && (
        <section
          className="shop-section shop-products shop-trending"
          id="trending-products"
        >
          <div className="shop-section-head">
            <div>
              <h2>Top Trending Products</h2>
            </div>
            <Link className="section-show-all" href="/products?sort=popular">
              Show All <Icon name="arrow" />
            </Link>
          </div>
          <div className="shop-product-grid products-market-grid">
            {trendingProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                inCart={cartProductIds.has(product.id)}
                wishlisted={wishlistIds.has(product.id)}
                onWishlist={updateWishlist}
              />
            ))}
          </div>
        </section>
      )}

      {bannerOne?.active &&
        (bannerOne.image_url || bannerOne.title || bannerOne.description) && (
          <section className="shop-banner-one">
            {bannerOne.image_url && (
              <img
                src={`${bannerOne.image_url}?v=${encodeURIComponent(bannerOne.updated_at)}`}
                alt={bannerOne.title || "Grocery promotion"}
              />
            )}
            {(bannerOne.eyebrow ||
              bannerOne.title ||
              bannerOne.description ||
              bannerOne.button_text) && (
              <div className="shop-banner-copy">
                {bannerOne.eyebrow && <small>{bannerOne.eyebrow}</small>}
                {bannerOne.title && <h2>{bannerOne.title}</h2>}
                {bannerOne.description && <p>{bannerOne.description}</p>}
                {bannerOne.button_text && (
                  <a href={bannerOne.button_url || "#products"}>
                    {bannerOne.button_text}
                    <Icon name="arrow" />
                  </a>
                )}
              </div>
            )}
          </section>
        )}

      {weeklyDeals.length > 0 && (
        <section
          className="shop-section shop-products shop-weekly-deals"
          id="weekly-deals"
        >
          <div className="shop-section-head">
            <div>
              <h2>Weekly Best Deals</h2>
            </div>
            <Link className="section-show-all" href="/products">
              Show All <Icon name="arrow" />
            </Link>
          </div>
          <div className="shop-product-grid products-market-grid">
            {weeklyDeals.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                inCart={cartProductIds.has(product.id)}
                wishlisted={wishlistIds.has(product.id)}
                onWishlist={updateWishlist}
              />
            ))}
          </div>
        </section>
      )}

      {bannerTwo?.active &&
        (bannerTwo.image_url || bannerTwo.title || bannerTwo.description) && (
          <section className="shop-banner-one shop-banner-two">
            {bannerTwo.image_url && (
              <img
                src={`${bannerTwo.image_url}?v=${encodeURIComponent(bannerTwo.updated_at)}`}
                alt={bannerTwo.title || "Grocery promotion"}
              />
            )}
            {(bannerTwo.eyebrow ||
              bannerTwo.title ||
              bannerTwo.description ||
              bannerTwo.button_text) && (
              <div className="shop-banner-copy">
                {bannerTwo.eyebrow && <small>{bannerTwo.eyebrow}</small>}
                {bannerTwo.title && <h2>{bannerTwo.title}</h2>}
                {bannerTwo.description && <p>{bannerTwo.description}</p>}
                {bannerTwo.button_text && (
                  <a href={bannerTwo.button_url || "#products"}>
                    {bannerTwo.button_text}
                    <Icon name="arrow" />
                  </a>
                )}
              </div>
            )}
          </section>
        )}

      {currentFeedback && (
        <section className="shop-client-feedback" id="client-feedback">
          <div className="shop-section-head">
            <div>
              <h2>What Our Clients Say</h2>
            </div>
            {clientFeedback.length > 1 && (
              <div className="shop-feedback-arrows">
                <button
                  aria-label="Previous feedback"
                  onClick={() =>
                    setFeedbackIndex(
                      (index) =>
                        (index - 1 + clientFeedback.length) %
                        clientFeedback.length,
                    )
                  }
                >
                  <Icon name="arrow" />
                </button>
                <button
                  aria-label="Next feedback"
                  onClick={() =>
                    setFeedbackIndex(
                      (index) => (index + 1) % clientFeedback.length,
                    )
                  }
                >
                  <Icon name="arrow" />
                </button>
              </div>
            )}
          </div>
          <div className="shop-feedback-slider">
            <article key={currentFeedback.id}>
              <div className="shop-feedback-stars">
                {"★".repeat(currentFeedback.rating)}
                {"☆".repeat(5 - currentFeedback.rating)}
              </div>
              <p>“{currentFeedback.feedback}”</p>
              <footer>
                {currentFeedback.avatar_url ? (
                  <img
                    src={currentFeedback.avatar_url}
                    alt={currentFeedback.client_name}
                  />
                ) : (
                  <span>{currentFeedback.client_name[0]}</span>
                )}
                <div>
                  <strong>{currentFeedback.client_name}</strong>
                  <small>{currentFeedback.client_role || "Customer"}</small>
                </div>
              </footer>
            </article>
          </div>
          {clientFeedback.length > 1 && (
            <div className="shop-feedback-dots">
              {clientFeedback.map((item, index) => (
                <button
                  key={item.id}
                  className={
                    index === feedbackIndex % clientFeedback.length
                      ? "active"
                      : ""
                  }
                  onClick={() => setFeedbackIndex(index)}
                  aria-label={`Show feedback ${index + 1}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="shop-promise" id="about">
        <article>
          <span>
            <BenefitIcon name="delivery" />
          </span>
          <div>
            <strong>Fast delivery</strong>
            <small>At your door in 20 minutes</small>
          </div>
        </article>
        <article>
          <span>
            <BenefitIcon name="fresh" />
          </span>
          <div>
            <strong>Always fresh</strong>
            <small>Handpicked quality produce</small>
          </div>
        </article>
        <article>
          <span>
            <BenefitIcon name="secure" />
          </span>
          <div>
            <strong>Secure checkout</strong>
            <small>Protected and easy payments</small>
          </div>
        </article>
        <article>
          <span>
            <BenefitIcon name="returns" />
          </span>
          <div>
            <strong>Easy returns</strong>
            <small>Simple, friendly support</small>
          </div>
        </article>
      </section>
      <footer className="shop-footer">
        <div className="shop-footer-wave" />
        <section className="shop-footer-columns">
          <div>
            <StoreLogo />
            <p>
              Fresh groceries, everyday essentials, and trusted local products
              delivered with care.
            </p>
          </div>
          <div>
            <h3>Categories</h3>
            {mainCategories.slice(0, 5).map((category) => (
              <a key={category.id} href="#categories">
                {category.name}
              </a>
            ))}
          </div>
          <div>
            <h3>Quick Links</h3>
            <a href="#home">Home</a>
            <a href="#products">Fresh Picks</a>
            <a href="#weekly-deals">Weekly Deals</a>
            <a href="#client-feedback">About Us</a>
          </div>
          <div>
            <h3>Customer Pages</h3>
            <a href="#">Your Account</a>
            <a href="#">Your Orders</a>
            <a href="#">Your Wishlist</a>
            <a href="#">Contact Us</a>
          </div>
          <div>
            <h3>Contact Info</h3>
            <span>SJS Fresh Market, India</span>
            <span>+91 98765 43210</span>
            <span>support@sjsfresh.com</span>
          </div>
        </section>
        <div className="shop-footer-bottom">
          <small>© 2026 SJS Fresh Market. All rights reserved.</small>
          <a href="#home" aria-label="Back to top">
            ↑
          </a>
        </div>
      </footer>
    </main>
  );
}
