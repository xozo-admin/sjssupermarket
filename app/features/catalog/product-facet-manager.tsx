"use client";

import { useCallback, useEffect, useState } from "react";
import { catalogApi } from "./catalog-api";
import type { ProductFacet } from "./types";

type Kind = "categories" | "variations" | "brands" | "units" | "taxes";
const configs = {
  categories: { title: "Categories", description: "Hierarchy from category_l1 and category_l2", columns: ["Category L1", "Category L2"] },
  variations: { title: "Variants", description: "Configurations from unit, unit_value and color_hex", columns: ["Unit", "Value", "Color"] },
  brands: { title: "Brands", description: "Brand values currently used by products", columns: ["Brand"] },
  units: { title: "Units", description: "Unit and unit-value combinations used by products", columns: ["Unit", "Value"] },
  taxes: { title: "Taxes", description: "Tax percentages grouped by currency", columns: ["Tax", "Currency"] },
} as const;

export default function ProductFacetManager({ kind }: { kind: Kind }) {
  const config = configs[kind];
  const [items, setItems] = useState<ProductFacet[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setItems(await catalogApi.productFacets(kind, search)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load product data"); }
    finally { setLoading(false); }
  }, [kind, search]);
  useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer); }, [load]);
  const values = (item: ProductFacet) => kind === "categories" ? [item.category_l1, item.category_l2 || "—"] : kind === "variations" ? [item.unit, item.unit_value, item.color_hex || "—"] : kind === "brands" ? [item.brand] : kind === "units" ? [item.unit, item.unit_value] : [`${item.tax_percent}%`, item.currency];

  return <div className="catalog-admin-page">
    {error && <div className="api-notice">{error}</div>}
    <section className="catalog-heading facet-heading"><div><h1>{config.title}</h1><p>{config.description}</p></div></section>
    <section className="catalog-list-card">
      <div className="catalog-filters facet-filters"><div className="filter-search"><span>⌕</span><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} /></div><span className="facet-source">Synced from products</span></div>
      <div className="category-table-scroll"><table className="simple-table"><thead><tr><th>S/L</th>{config.columns.map(column => <th key={column}>{column}</th>)}<th>Products</th><th>Active</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={config.columns.length + 3}>Loading...</td></tr> : items.length === 0 ? <tr><td colSpan={config.columns.length + 3}>No values found. Import or add products to populate this page.</td></tr> : items.map((item, index) => <tr key={`${kind}-${values(item).join("-")}`}><td>{index + 1}</td>{values(item).map((value, valueIndex) => <td key={valueIndex}>{kind === "variations" && valueIndex === 2 && item.color_hex ? <span className="color-value"><i style={{ background: item.color_hex }} />{value}</span> : <strong>{value}</strong>}</td>)}<td>{item.product_count}</td><td>{item.active_count}</td></tr>)}
      </tbody></table></div><footer>Showing {items.length} product-derived {config.title.toLowerCase()}</footer>
    </section>
  </div>;
}
