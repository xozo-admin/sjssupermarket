"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { catalogApi } from "../features/catalog/catalog-api";
import { productImageUrl, type Product } from "../features/catalog/types";

type ProductSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcut?: boolean;
};

export default function ProductSearch({
  value,
  onChange,
  placeholder = "Search fresh fruits, milk, bread...",
  shortcut = false,
}: ProductSearchProps) {
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [resultQuery, setResultQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const query = value.trim();
  const searching = focused && query.length >= 2 && resultQuery !== query;

  useEffect(() => {
    if (!focused || query.length < 2) return;

    let current = true;
    const timer = window.setTimeout(() => {
      void catalogApi
        .products(query, "", "true", 1, 7)
        .then((result) => {
          if (current) {
            setSuggestions(result.items);
            setResultQuery(query);
          }
        })
        .catch(() => {
          if (current) {
            setSuggestions([]);
            setResultQuery(query);
          }
        });
    }, 250);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [focused, query]);

  const submit = (term = value) => {
    if (term.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(term.trim())}`;
    }
  };

  return (
    <div className="product-search-wrap">
      <label className="shop-search">
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        <input
          value={value}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 160)}
          onChange={(event) => {
            onChange(event.target.value);
            setActive(-1);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((index) => Math.min(suggestions.length - 1, index + 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(-1, index - 1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              submit(active >= 0 ? suggestions[active].name : value);
            } else if (event.key === "Escape") {
              setFocused(false);
            }
          }}
          placeholder={placeholder}
        />
        {shortcut && <kbd>⌘K</kbd>}
      </label>
      {focused && query.length >= 2 && (
        <div className="product-search-suggestions">
          {searching ? (
            <div className="product-search-none">Searching products...</div>
          ) : suggestions.length ? (
            suggestions.map((product, index) => {
              const image = productImageUrl(product, "s");
              return (
                <button
                  className={active === index ? "active" : ""}
                  key={product.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => submit(product.name)}
                >
                  {image ? <img src={image} alt="" /> : <span>{product.name[0]}</span>}
                  <div>
                    <strong>{product.name}</strong>
                    <small>{product.brand || product.category_l2 || product.category_l1}</small>
                  </div>
                  <b>{product.currency} {Number(product.selling_price).toFixed(0)}</b>
                </button>
              );
            })
          ) : (
            <div className="product-search-none">No related products found</div>
          )}
          <button
            className="product-search-all"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => submit()}
          >
            View all results for “{query}”
          </button>
        </div>
      )}
    </div>
  );
}
