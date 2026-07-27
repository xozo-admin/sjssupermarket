"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, ShoppingCart, Star } from "lucide-react";
import { catalogApi } from "../features/catalog/catalog-api";
import { productImageUrl, type Product } from "../features/catalog/types";
import { categoryApi } from "../features/categories/category-api";
import type { Category } from "../features/categories/types";
import CategoryMegaNav from "../components/category-mega-nav";
import { addCartItem, readCart } from "../features/cart-store";
import { requireAuth } from "../features/auth-client";
import StorefrontLoader from "../components/storefront-loader";
import {
  loadWishlist,
  readWishlistIds,
  toggleWishlist,
} from "../features/wishlist-store";

type Sort = "popular" | "low" | "high" | "newest" | "deals";

function ProductNav({
  categories,
  search,
  onSearch,
}: {
  categories: Category[];
  search: string;
  onSearch: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const icon = (
    name: "search" | "heart" | "bag" | "bell" | "user" | "menu",
  ) => {
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
      menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    };
    return <svg viewBox="0 0 24 24">{paths[name]}</svg>;
  };
  return (
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
        <nav className={open ? "open" : ""}>
          <Link href="/">Home</Link>
        </nav>
        <label className="shop-search">
          {icon("search")}
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search products..."
          />
        </label>
        <div className="shop-tools">
          <Link href="/wishlist" aria-label="Favorites">
            {icon("heart")}
          </Link>
          <button aria-label="Cart">{icon("bag")}</button>
          <button aria-label="Notifications">{icon("bell")}</button>
          <Link href="/admin/dashboard">{icon("user")}Login</Link>
        </div>
        <button
          className="shop-mobile-menu"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation"
        >
          {icon("menu")}
        </button>
      </div>
      <CategoryMegaNav categories={categories} />
    </header>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [brands, setBrands] = useState<string[]>([]);
  const [brandOptions, setBrandOptions] = useState<string[]>([]);
  const [minimumRating, setMinimumRating] = useState(0);
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [page, setPage] = useState(1);
  const [categoryMode, setCategoryMode] = useState(false);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [nextApiPage, setNextApiPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const filtersInitialized = useRef(false);
  const [loading, setLoading] = useState(true);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [cartProductIds, setCartProductIds] = useState<Set<string>>(new Set());
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const pageSize = 12;

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const selected = query.get("category") || "";
    const requestedSort = query.get("sort");
    if (requestedSort && ["popular", "low", "high", "newest", "deals"].includes(requestedSort)) setSort(requestedSort as Sort);
    setSearch(query.get("search") || "");
    void categoryApi.list()
      .then(async (categoryResult) => {
        setCategories(categoryResult.items);
        const selectedCategory = categoryResult.items.find(
          (item) => item.name === selected,
        );
        let selectedMain = "";
        let selectedSub = "";
        if (selectedCategory?.parent_id) {
          selectedSub = selectedCategory.name;
          selectedMain = categoryResult.items.find(
              (item) => item.id === selectedCategory.parent_id,
            )?.name || "";
        } else if (selectedCategory) selectedMain = selectedCategory.name;
        setMainCategory(selectedMain);
        setSubCategory(selectedSub);
        const usesCategoryPaging = Boolean(selectedCategory);
        const productResult = await catalogApi.products(query.get("search") || "", "", "true", 1, usesCategoryPaging ? 24 : 100, selectedMain, selectedSub, { sort: requestedSort || "popular" });
        setProducts(productResult.items);
        setCategoryMode(usesCategoryPaging);
        setCatalogTotal(productResult.total);
        setNextApiPage(2);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !categoryMode || loadingMore || products.length >= catalogTotal) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0]?.isIntersecting) return;
      setLoadingMore(true);
      void catalogApi.products(search, "", "true", nextApiPage, 24, mainCategory, subCategory, { brands, minimumRating, minimumPrice, maximumPrice, sort })
        .then((result) => {
          setProducts((current) => {
            const known = new Set(current.map((item) => item.id));
            return [...current, ...result.items.filter((item) => !known.has(item.id))];
          });
          setCatalogTotal(result.total);
          setNextApiPage((value) => value + 1);
        })
        .finally(() => setLoadingMore(false));
    }, { rootMargin: "400px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [brands, catalogTotal, categoryMode, loadingMore, mainCategory, maximumPrice, minimumPrice, minimumRating, nextApiPage, products.length, search, sort, subCategory]);
  useEffect(() => {
    if (!categoryMode) return;
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }
    const timer = setTimeout(() => {
      setLoadingMore(true);
      void catalogApi.products(search, "", "true", 1, 24, mainCategory, subCategory, { brands, minimumRating, minimumPrice, maximumPrice, sort })
        .then((result) => {
          setProducts(result.items);
          setCatalogTotal(result.total);
          setNextApiPage(2);
        })
        .finally(() => setLoadingMore(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [brands, categoryMode, mainCategory, maximumPrice, minimumPrice, minimumRating, search, sort, subCategory]);
  useEffect(() => {
    setWishlistIds(readWishlistIds());
    void loadWishlist()
      .then((items) => setWishlistIds(new Set(items.map((item) => item.id))))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    void catalogApi.entities("brands", "", "true")
      .then((items) => setBrandOptions(items.map((item) => item.name).sort()))
      .catch(() => setBrandOptions([]));
  }, []);

  useEffect(() => {
    const syncCart = () =>
      setCartProductIds(new Set(readCart().map((item) => item.product.id)));
    Promise.resolve().then(syncCart);
    window.addEventListener("sjs-cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("sjs-cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    const openProduct = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const card = target.closest<HTMLElement>(".products-market-grid article");
      const productName = card?.querySelector("h2")?.textContent?.trim();
      const selectedProduct = products.find(
        (item) => item.name === productName,
      );
      if (target.closest(".market-cart")) {
        if (selectedProduct && cartProductIds.has(selectedProduct.id)) {
          window.location.href = "/cart";
          return;
        }
        if (selectedProduct && requireAuth(`/products/${selectedProduct.id}`))
          addCartItem(selectedProduct);
        return;
      }
      if (target.closest("button")) return;
      if (selectedProduct)
        window.location.href = `/products/${selectedProduct.id}`;
    };
    document.addEventListener("click", openProduct);
    return () => document.removeEventListener("click", openProduct);
  }, [products, cartProductIds]);

  const mainCategories = useMemo(
    () => categories.filter((item) => !item.parent_id),
    [categories],
  );
  const activeMain = mainCategories.find((item) => item.name === mainCategory);
  const subCategories = useMemo(
    () => categories.filter((item) => item.parent_id === activeMain?.id),
    [activeMain?.id, categories],
  );
  const filtered = useMemo(
    () =>
      products
        .filter((product) => {
          const query = search.toLowerCase();
          const price = Number(product.selling_price);
          return (
            (!query ||
              product.name.toLowerCase().includes(query) ||
              (product.brand || "").toLowerCase().includes(query)) &&
            (!mainCategory || product.category_l1 === mainCategory) &&
            (!subCategory || product.category_l2 === subCategory) &&
            (!brands.length ||
              Boolean(product.brand && brands.includes(product.brand))) &&
            Number(product.rating) >= minimumRating &&
            (!minimumPrice || price >= Number(minimumPrice)) &&
            (!maximumPrice || price <= Number(maximumPrice))
          );
        })
        .sort((a, b) =>
          sort === "low"
            ? Number(a.selling_price) - Number(b.selling_price)
            : sort === "high"
              ? Number(b.selling_price) - Number(a.selling_price)
              : sort === "newest"
                ? new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
                : sort === "deals"
                  ? (Number(b.mrp) - Number(b.selling_price)) / Math.max(Number(b.mrp), 1) -
                    (Number(a.mrp) - Number(a.selling_price)) / Math.max(Number(a.mrp), 1)
                : Number(b.featured_score) - Number(a.featured_score),
        ),
    [
      products,
      search,
      mainCategory,
      subCategory,
      brands,
      minimumRating,
      minimumPrice,
      maximumPrice,
      sort,
    ],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages);
  const shown = categoryMode ? filtered : filtered.slice((current - 1) * pageSize, current * pageSize);
  const filterChanged = () => setPage(1);
  const resetFilters = () => {
    setMainCategory("");
    setSubCategory("");
    setBrands([]);
    setMinimumRating(0);
    setMinimumPrice("");
    setMaximumPrice("");
    setPage(1);
  };

  if (loading) return <StorefrontLoader />;

  return (
    <main className="storefront products-list-page">
      <ProductNav
        categories={categories}
        search={search}
        onSearch={(value) => {
          setSearch(value);
          filterChanged();
        }}
      />
      <button
        className="mobile-filter-button"
        onClick={() => setMobileFilters(true)}
      >
        Filters
      </button>
      <div className="products-list-layout">
        <aside
          className={`products-filters ${mobileFilters ? "mobile-open" : ""}`}
        >
          <header>
            <h2>Filters</h2>
            <button onClick={() => setMobileFilters(false)}>×</button>
          </header>
          <button className="clear-filters" onClick={resetFilters}>
            Clear all
          </button>
          <section>
            <h3>Main Category</h3>
            <select
              value={mainCategory}
              onChange={(event) => {
                setMainCategory(event.target.value);
                setSubCategory("");
                filterChanged();
              }}
            >
              <option value="">All categories</option>
              {mainCategories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </section>
          <section>
            <h3>Subcategory</h3>
            <select
              value={subCategory}
              disabled={!mainCategory || !subCategories.length}
              onChange={(event) => {
                setSubCategory(event.target.value);
                filterChanged();
              }}
            >
              <option value="">All subcategories</option>
              {subCategories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </section>
          <section>
            <h3>Brand</h3>
            <div className="filter-options-scroll">
              {brandOptions.map((brand) => (
                <label key={brand}>
                  <input
                    type="checkbox"
                    checked={brands.includes(brand)}
                    onChange={() => {
                      setBrands((currentBrands) =>
                        currentBrands.includes(brand)
                          ? currentBrands.filter((item) => item !== brand)
                          : [...currentBrands, brand],
                      );
                      filterChanged();
                    }}
                  />
                  <span>{brand}</span>
                </label>
              ))}
            </div>
          </section>
          <section>
            <h3>Minimum Rating</h3>
            <div className="rating-filter">
              {[4, 3, 2, 1].map((rating) => (
                <button
                  className={minimumRating === rating ? "active" : ""}
                  key={rating}
                  onClick={() => {
                    setMinimumRating(minimumRating === rating ? 0 : rating);
                    filterChanged();
                  }}
                >
                  {rating} ★ &amp; above
                </button>
              ))}
            </div>
          </section>
          <section>
            <h3>Price Range</h3>
            <div className="price-filter">
              <label>
                <span>Min</span>
                <input
                  type="number"
                  min="0"
                  value={minimumPrice}
                  onChange={(event) => {
                    setMinimumPrice(event.target.value);
                    filterChanged();
                  }}
                  placeholder="0"
                />
              </label>
              <i>—</i>
              <label>
                <span>Max</span>
                <input
                  type="number"
                  min="0"
                  value={maximumPrice}
                  onChange={(event) => {
                    setMaximumPrice(event.target.value);
                    filterChanged();
                  }}
                  placeholder="Any"
                />
              </label>
            </div>
          </section>
        </aside>
        {mobileFilters && (
          <button
            className="filter-backdrop"
            onClick={() => setMobileFilters(false)}
            aria-label="Close filters"
          />
        )}
        <section className="products-results">
          <div className="products-top-row">
            <div className="products-breadcrumb">
              <Link href="/">Home</Link>
              <span>›</span>
              <b>{subCategory || mainCategory || "All Products"}</b>
            </div>
            <header>
              <nav>
                <b>Sort By</b>
                {[
                  ["popular", "Popularity"],
                  ["deals", "Best Deals"],
                  ["low", "Price — Low to High"],
                  ["high", "Price — High to Low"],
                  ["newest", "Newest First"],
                ].map(([value, label]) => (
                  <button
                    className={sort === value ? "active" : ""}
                    key={value}
                    onClick={() => {
                      setSort(value as Sort);
                      setPage(1);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </nav>
            </header>
          </div>
          {loading ? (
            <div className="products-list-empty">Loading products...</div>
          ) : shown.length ? (
            <div className="products-market-grid">
              {shown.map((product) => {
                const image = productImageUrl(product, "l");
                const price = Number(product.selling_price);
                const mrp = Number(product.mrp);
                const discount =
                  mrp > price ? Math.round((1 - price / mrp) * 100) : 0;
                const inStock =
                  product.stock_status === "in_stock" &&
                  product.inventory_qty > 0;
                const inCart = cartProductIds.has(product.id);
                return (
                  <article key={product.id}>
                    <div className="market-image">
                      {image ? (
                        <img src={image} alt={product.name} />
                      ) : (
                        <div className="product-no-image">No image</div>
                      )}
                      <button
                        className={`market-heart ${wishlistIds.has(product.id) ? "active" : ""}`}
                        aria-label={`Wishlist ${product.name}`}
                        onClick={() =>
                          void toggleWishlist(
                            product.id,
                            `/products/${product.id}`,
                          ).then((active) =>
                            setWishlistIds((current) => {
                              const next = new Set(current);
                              if (active) next.add(product.id);
                              else next.delete(product.id);
                              return next;
                            }),
                          )
                        }
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
                        {inStock
                          ? `${product.inventory_qty} in stock`
                          : "Out of stock"}
                      </b>
                    </div>
                    {discount >= 20 && (
                      <em className="market-deal">Hot Deal</em>
                    )}
                    <button
                      className={`market-cart ${inCart ? "in-cart" : ""}`}
                      disabled={!inStock && !inCart}
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
            </div>
          ) : (
            <div className="products-list-empty">
              No products match these filters.
            </div>
          )}
          {categoryMode && <div ref={loadMoreRef} className="products-infinite-status">{loadingMore ? "Loading more products..." : products.length < catalogTotal ? "Scroll for more products" : `All ${catalogTotal} products loaded`}</div>}
          {!categoryMode && pages > 1 && (
            <div className="products-pagination">
              <button
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
              >
                Previous
              </button>
              <span>
                Page {current} of {pages}
              </span>
              <button
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
