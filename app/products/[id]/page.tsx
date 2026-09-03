"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import CategoryMegaNav from "../../components/category-mega-nav";
import { catalogApi } from "../../features/catalog/catalog-api";
import { productImageUrl, type Product } from "../../features/catalog/types";
import { categoryApi } from "../../features/categories/category-api";
import type { Category } from "../../features/categories/types";
import { addCartItem, readCart } from "../../features/cart-store";
import { requireAuth } from "../../features/auth-client";
import StorefrontLoader from "../../components/storefront-loader";
import {
  loadWishlist,
  readWishlistIds,
  toggleWishlist,
} from "../../features/wishlist-store";

function StoreHeader({ categories }: { categories: Category[] }) {
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
        <nav>
          <Link href="/">Home</Link>
        </nav>
        <label className="shop-search">
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            placeholder="Search products..."
            onKeyDown={(event) => {
              if (event.key === "Enter")
                window.location.href = `/products?search=${encodeURIComponent(event.currentTarget.value)}`;
            }}
          />
        </label>
        <div className="shop-tools">
          <Link href="/wishlist" aria-label="Favorites">
            ♡
          </Link>
          <button aria-label="Cart">▢</button>
          <Link href="/admin/dashboard">Login</Link>
        </div>
      </div>
      <CategoryMegaNav categories={categories} />
    </header>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedQuantity, setSelectedQuantity] = useState(0);
  const [tab, setTab] = useState<"reviews" | "description">("reviews");
  const [loading, setLoading] = useState(true);
  const [inCart, setInCart] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    void Promise.all([
      catalogApi.product(id),
      catalogApi.products("", "", "true", 1, 100),
      categoryApi.list(),
    ])
      .then(([item, list, categoryList]) => {
        setProduct(item);
        setProducts(list.items);
        setCategories(categoryList.items);
      })
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    setWishlisted(readWishlistIds().has(id));
    void loadWishlist()
      .then((items) => setWishlisted(items.some((item) => item.id === id)))
      .catch(() => undefined);
  }, [id]);

  useEffect(() => {
    if (!product) return;
    const options = [
      { unit: product.unit, unit_value: product.unit_value },
      ...(product.unit_variants ?? []),
    ];
    const selected = options[selectedQuantity] ?? options[0];
    const syncCart = () =>
      setInCart(
        readCart().some(
          (item) =>
            item.product.id === product.id &&
            item.product.unit === selected.unit &&
            String(item.product.unit_value) === String(selected.unit_value),
        ),
      );
    syncCart();
    window.addEventListener("sjs-cart-updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("sjs-cart-updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, [product, selectedQuantity]);

  const related = useMemo(
    () =>
      product
        ? products
            .filter(
              (item) =>
                item.id !== product.id &&
                (item.category_l2 === product.category_l2 ||
                  item.category_l1 === product.category_l1),
            )
            .slice(0, 5)
        : [],
    [product, products],
  );

  if (loading) return <StorefrontLoader />;
  if (!product)
    return (
      <main className="storefront">
        <StoreHeader categories={categories} />
        <div className="product-detail-state">Product not found.</div>
      </main>
    );

  const quantityOptions = [
    {
      unit: product.unit,
      unit_value: product.unit_value,
      selling_price: product.selling_price,
      mrp: product.mrp,
      inventory_qty: product.inventory_qty,
      barcode: product.barcode,
    },
    ...(product.unit_variants ?? []),
  ];
  const selectedOption = quantityOptions[selectedQuantity] ?? quantityOptions[0];
  const selectedProduct: Product = {
    ...product,
    unit: selectedOption.unit,
    unit_value: String(selectedOption.unit_value),
    selling_price: String(selectedOption.selling_price),
    mrp: String(selectedOption.mrp),
    inventory_qty: selectedOption.inventory_qty,
    barcode: selectedOption.barcode,
  };
  const image = productImageUrl(product, "l");
  const oldPrice = Number(selectedOption.mrp);
  const price = Number(selectedOption.selling_price);
  const discount =
    oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : 0;
  const inStock =
    product.stock_status === "in_stock" && selectedOption.inventory_qty > 0;
  const maxQuantity = Math.max(1, Math.min(selectedOption.inventory_qty, 10));

  return (
    <main className="storefront product-detail-page">
      <StoreHeader categories={categories} />
      <div className="product-detail-shell">
        <div className="product-detail-breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>
          <Link
            href={`/products?category=${encodeURIComponent(product.category_l1)}`}
          >
            {product.category_l1}
          </Link>
          <span>›</span>
          <b>{product.name}</b>
        </div>
        <section className="product-detail-main">
          <div className="product-gallery">
            <div className="product-main-image">
              <button
                className={`product-wishlist ${wishlisted ? "active" : ""}`}
                aria-label={`Wishlist ${product.name}`}
                onClick={() =>
                  void toggleWishlist(
                    product.id,
                    `/products/${product.id}`,
                  ).then(setWishlisted)
                }
              >
                <Heart />
              </button>
              {image ? (
                <img src={image} alt={product.name} />
              ) : (
                <span>SJS</span>
              )}
            </div>
          </div>
          <div className="product-detail-copy">
            <small>{product.brand || "SJS Fresh Market"}</small>
            <div className="product-title-row">
              <h1>{product.name}</h1>
            </div>
            <p className="product-unit-line">
              {selectedOption.unit_value} {selectedOption.unit}
            </p>
            {quantityOptions.length > 1 && (
              <div className="product-quantity-options">
                <b>Available quantities</b>
                <div>
                  {quantityOptions.map((option, index) => (
                    <button
                      type="button"
                      className={selectedQuantity === index ? "active" : ""}
                      key={`${option.unit}-${option.unit_value}`}
                      onClick={() => {
                        setSelectedQuantity(index);
                        setQuantity(1);
                      }}
                    >
                      <strong>{option.unit_value} {option.unit}</strong>
                      <small>₹{Number(option.selling_price).toLocaleString("en-IN")}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="product-rating-line">
              <span>
                {Math.max(Number(product.rating), 3.7).toFixed(1)} <Star />
              </span>
            </div>
            <div className="product-detail-price">
              <strong>₹{Math.round(price).toLocaleString("en-IN")}</strong>
              {oldPrice > price && (
                <>
                  <del>₹{Math.round(oldPrice).toLocaleString("en-IN")}</del>
                  <span>{discount}% off</span>
                </>
              )}
            </div>
            <p className="tax-copy">Inclusive of all taxes</p>
            <div className={`product-stock ${inStock ? "" : "out"}`}>
              {inStock
                ? `In stock · ${selectedOption.inventory_qty} available`
                : "Currently out of stock"}
            </div>
            <div className="product-buy-row">
              <div className="quantity-control">
                <button
                  aria-label="Decrease quantity"
                  disabled={quantity === 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus />
                </button>
                <b>{quantity}</b>
                <button
                  aria-label="Increase quantity"
                  disabled={!inStock || quantity >= maxQuantity}
                  onClick={() =>
                    setQuantity(Math.min(maxQuantity, quantity + 1))
                  }
                >
                  <Plus />
                </button>
              </div>
              <button
                className={`detail-add-cart ${inCart ? "in-cart" : ""}`}
                disabled={!inStock && !inCart}
                onClick={() => {
                  if (inCart) {
                    window.location.href = "/cart";
                    return;
                  }
                  if (!requireAuth(`/products/${product.id}`)) return;
                  addCartItem(selectedProduct, quantity);
                }}
              >
                {inCart ? <Check /> : <ShoppingBag />}
                {inCart
                  ? "Go to Cart"
                  : inStock
                    ? "Add to Cart"
                    : "Unavailable"}
              </button>
            </div>
            <div className="product-service-row">
              <div>
                <Truck />
                <span>
                  <b>Fast delivery</b>
                  <small>Delivery options shown at checkout</small>
                </span>
              </div>
              <div>
                <ShieldCheck />
                <span>
                  <b>Quality assured</b>
                  <small>Fresh and carefully packed</small>
                </span>
              </div>
            </div>
            <div className="product-details-compact">
              <h2>Product details</h2>
              <p>
                {product.description_long ||
                  product.short_description ||
                  "Fresh quality grocery product selected for your everyday needs."}
              </p>
              <dl>
                <div>
                  <dt>Category</dt>
                  <dd>{product.category_l2 || product.category_l1}</dd>
                </div>
                <div>
                  <dt>Brand</dt>
                  <dd>{product.brand || "SJS Fresh"}</dd>
                </div>
                {selectedOption.barcode && (
                  <div>
                    <dt>Barcode</dt>
                    <dd>{selectedOption.barcode}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </section>

        <section className="product-info-tabs">
          <div className="product-tab-buttons">
            <button
              className={tab === "reviews" ? "active" : ""}
              onClick={() => setTab("reviews")}
            >
              Rating &amp; Reviews
            </button>
            <button
              className={tab === "description" ? "active" : ""}
              onClick={() => setTab("description")}
            >
              Description
            </button>
          </div>
          {tab === "description" ? (
            <div className="product-description">
              <h2>Product description</h2>
              <p>
                {product.description_long ||
                  product.short_description ||
                  "No additional description is available for this product."}
              </p>
            </div>
          ) : (
            <div className="reviews-layout">
              <div className="rating-summary">
                <strong>{Number(product.rating).toFixed(1)}</strong>
                <span>★★★★★</span>
                <small>Customer rating</small>
              </div>
              <div className="rating-bars">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div key={star}>
                    <span>{star} Star</span>
                    <i>
                      <b
                        style={{
                          width: `${star === 5 ? 82 : Math.max(7, 36 - star * 5)}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
              </div>
              <div className="review-invite">
                <h3>Review this product</h3>
                <p>Share your thoughts with other customers.</p>
                <button>Write a customer review</button>
              </div>
            </div>
          )}
        </section>

        <section className="review-list">
          <header>
            <h2>Review List</h2>
            <select>
              <option>Newest</option>
              <option>Highest rating</option>
            </select>
          </header>
          {[
            "Always Fresh and Delicious",
            "Super Fresh Orange",
            "Top Quality Orange Every Time",
          ].map((title, index) => (
            <article key={title}>
              <span>{["AK", "CM", "WM"][index]}</span>
              <div>
                <header>
                  <b>{["Eyman Khan", "Colam Mostafa", "Wahid Miah"][index]}</b>
                  <small>{index + 1} month ago</small>
                </header>
                <h3>{title}</h3>
                <p>
                  Fresh, flavorful and carefully packed. The product arrived in
                  excellent condition and matched the description.
                </p>
                <strong>★★★★★</strong>
              </div>
            </article>
          ))}
        </section>
      </div>
      <section className="related-products">
        <div>
          <small>FOR YOU</small>
          <h2>You might like also</h2>
        </div>
        <div className="related-product-grid">
          {related.map((item) => {
            const relatedImage = productImageUrl(item, "l");
            return (
              <a href={`/products/${item.id}`} key={item.id}>
                {relatedImage ? (
                  <img src={relatedImage} alt={item.name} />
                ) : (
                  <span>{item.name[0]}</span>
                )}
                <h3>{item.name}</h3>
                <small>{item.brand || item.category_l2}</small>
                <strong>
                  {item.currency} {Number(item.selling_price).toFixed(2)}
                </strong>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
