"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category } from "../features/categories/types";

const fallbackCategories = [
  "Beverages",
  "Confectionery",
  "Dairy",
  "Dairy or Refrigerated",
  "Groceries",
  "Health and Beauty",
  "Household",
  "Personal Care",
  "Toys",
];

export default function CategoryMegaNav({ categories }: { categories: Category[] }) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const mainCategories = categories.filter((item) => !item.parent_id);
  // const visibleCategories = mainCategories.slice(0, 6);
  // const overflowCategories = mainCategories.slice(6);

  const isTablet =
    typeof window !== "undefined" && window.innerWidth <= 1024;
  const visibleCategories = isTablet
    ? mainCategories.slice(0, 4)
    : mainCategories.slice(0, 6);
  const overflowCategories = isTablet
    ? mainCategories.slice(4)
    : mainCategories.slice(6);


  if (!mainCategories.length) {
    return (
      <div className="shop-category-strip category-mega-nav">
        {fallbackCategories.map((name) => (
          <Link key={name} href={`/products?category=${encodeURIComponent(name)}`}>{name}</Link>
        ))}
        <Link className="category-all-link" href="/products" aria-label="View all products"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>
      </div>
    );
  }

  return (
    <div className="shop-category-strip category-mega-nav">
      {visibleCategories.map((parent) => {
        const children = categories.filter((item) => item.parent_id === parent.id);

        return (
          <div className={`category-nav-item ${openCategoryId === parent.id ? "open" : ""}`} key={parent.id}>
            <a
              className="category-nav-trigger"
              href={`/products?category=${encodeURIComponent(parent.name)}`}
              onClick={(event) => {
                if (children.length > 0 && window.matchMedia("(max-width: 800px)").matches) {
                  event.preventDefault();
                  setOpenCategoryId((current) => current === parent.id ? null : parent.id);
                  setOverflowOpen(false);
                }
              }}
            >
              {parent.name}
              {children.length > 0 && <svg className="category-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>}
            </a>

            {children.length > 0 && (
              <div className="category-mega-menu">
                <div className="category-mega-grid">
                  {children.map((child) => (
                    <a
                      key={child.id}
                      href={`/products?category=${encodeURIComponent(child.name)}`}
                    >
                      {child.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {overflowCategories.length > 0 && <div className={`category-overflow ${overflowOpen ? "open" : ""}`}>
        <button className="category-overflow-trigger" style={{ border: 0, background: "transparent", color: "#4d5766" }} type="button" aria-label="More categories">»</button>
        <div className="category-overflow-menu">
          {overflowCategories.map((parent) => {
            const children = categories.filter((item) => item.parent_id === parent.id);
            return <div className="category-overflow-item" key={parent.id}>
              <a href={`/products?category=${encodeURIComponent(parent.name)}`}>{parent.name}{children.length > 0 && <span>›</span>}</a>
              {children.length > 0 && <div className="category-overflow-children">{children.map((child) => <a key={child.id} href={`/products?category=${encodeURIComponent(child.name)}`}>{child.name}</a>)}</div>}
            </div>;
          })}
          <Link className="category-overflow-all" href="/products">All Products</Link>
        </div>
      </div>}
      {!overflowCategories.length && <Link className="category-all-link" href="/products" aria-label="View all products"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></Link>}
    </div>
  );
}
