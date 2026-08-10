"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { catalogApi } from "./catalog-api";
import { productImageUrl, type CatalogEntity, type Product, type ProductFacet } from "./types";
import { confirmToast } from "../notifications";

export default function ProductManager() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]), [brands, setBrands] = useState<CatalogEntity[]>([]), [categories, setCategories] = useState<ProductFacet[]>([]), [viewing, setViewing] = useState<Product | null>(null);
    const [search, setSearch] = useState(""), [brand, setBrand] = useState(""), [active, setActive] = useState(""), [category, setCategory] = useState(""), [stock, setStock] = useState(""), [minPrice, setMinPrice] = useState(""), [maxPrice, setMaxPrice] = useState(""), [rating, setRating] = useState(""), [sort, setSort] = useState("popular");
    const [page, setPage] = useState(1), [size, setSize] = useState(20), [pages, setPages] = useState(1), [total, setTotal] = useState(0), [loading, setLoading] = useState(true), [error, setError] = useState("");
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handleClick(event: MouseEvent) {
            if (
                exportRef.current &&
                !exportRef.current.contains(event.target as Node)
            ) {
                setExportOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => {
            document.removeEventListener("mousedown", handleClick);
        };
    }, []);
    const load = useCallback(async () => { setLoading(true); try { const result = await catalogApi.products(search, brand, active, page, size, category, "", { minimumRating: rating ? Number(rating) : undefined, minimumPrice: minPrice, maximumPrice: maxPrice, sort, stockStatus: stock }); setProducts(result.items); setTotal(result.total); setPages(result.pages); if (page > result.pages) setPage(result.pages) } catch (e) { setError(e instanceof Error ? e.message : "Could not load products") } finally { setLoading(false) } }, [search, brand, active, page, size, category, stock, minPrice, maxPrice, rating, sort]);
    useEffect(() => { const timer = setTimeout(() => void load(), 250); return () => clearTimeout(timer) }, [load]);
    useEffect(() => { void Promise.all([catalogApi.entities("brands", "", "true"), catalogApi.productFacets("categories")]).then(([brandRows, categoryRows]) => { setBrands(brandRows); setCategories(categoryRows) }).catch(() => { setBrands([]); setCategories([]) }) }, []);
    const filter = (setter: (value: string) => void, value: string) => { setter(value); setPage(1) };
    const clearFilters = () => { setSearch(""); setBrand(""); setActive(""); setCategory(""); setStock(""); setMinPrice(""); setMaxPrice(""); setRating(""); setSort("popular"); setPage(1) };
    const remove = async (product: Product) => { if (await confirmToast(`Delete ${product.name}?`)) { await catalogApi.deleteProduct(product.id); await load() } };
    const headers = ["platform_product_id", "canonical_slug", "name", "short_description", "description_long", "category_l1", "category_l2", "brand", "currency", "tax_percent", "selling_price", "mrp", "rating", "inventory_qty", "stock_status", "is_active", "unit", "unit_value", "barcode", "featured_score", "color_hex", "supplier_user_id", "image_url"];
    const exportCsv = () => { const rows = [headers, ...products.map(product => headers.map(header => String(product[header as keyof Product] ?? "")))]; const blob = new Blob([rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv" }); const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = "platform-products.csv"; anchor.click(); URL.revokeObjectURL(anchor.href) };
    const exportExcel = () => {
        const rows = products.map((product) => ({
            ID: product.platform_product_id,
            Name: product.name,
            Category: product.category_l1,
            Subcategory: product.category_l2,
            Brand: product.brand,
            MRP: product.mrp,
            SellingPrice: product.selling_price,
            Rating: product.rating,
            Stock: product.inventory_qty,
            Status: product.stock_status,
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Products"
        );

        XLSX.writeFile(
            workbook,
            "platform-products.xlsx"
        );
    };
    const exportPdf = () => {
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("SJS Super Market - Product Report", 14, 20);

        autoTable(doc, {
            startY: 30,

            head: [[
                "S/L",
                "Product",
                "Brand",
                "Category",
                "MRP",
                "Selling",
                "Stock",
                "Status"
            ]],

            body: products.map((product, index) => [
                index + 1,
                product.name,
                product.brand || "-",
                product.category_l1,
                `${product.currency} ${product.mrp}`,
                `${product.currency} ${product.selling_price}`,
                product.inventory_qty,
                product.stock_status,
            ]),

            styles: {
                fontSize: 9,
                cellPadding: 3,
            },

            headStyles: {
                fillColor: [22, 163, 74],
                textColor: 255,
                fontStyle: "bold",
            },

            alternateRowStyles: {
                fillColor: [245, 245, 245],
            },
        });

        doc.save("platform-products.pdf");
    };

    const pageNumbers = Array.from({ length: Math.min(5, pages) }, (_, index) => Math.max(1, Math.min(page - 2, pages - 4)) + index), first = total ? (size === 0 ? 1 : (page - 1) * size + 1) : 0, last = size === 0 ? total : Math.min(page * size, total);
    return <div className="catalog-admin-page product-admin-page">
        {error && <div className="api-notice">{error}</div>}
        <section className="catalog-heading"><h1>Products</h1><div className="product-actions"><span className="product-total-count">{loading ? "Loading..." : `${total} ${total === 1 ? "Product" : "Products"}`}</span><div className="export-dropdown" ref={exportRef}>
            <button
                className="danger-button"
                onClick={() => setExportOpen(!exportOpen)}
            >
                ↓ Export
            </button>

            {exportOpen && (
                <div className="export-menu">

                    <button
                        onClick={() => {
                            exportExcel();
                            setExportOpen(false);
                        }}
                    >
                        📊 Excel (.xlsx)
                    </button>

                    <button
                        onClick={() => {
                            exportCsv();
                            setExportOpen(false);
                        }}
                    >
                        📄 CSV (.csv)
                    </button>

                    <button
                        onClick={() => {
                            exportPdf();
                            setExportOpen(false);
                        }}
                    >
                        📑 PDF (.pdf)
                    </button>

                </div>
            )}
        </div><label className="primary-button import-button">↑ Import<input type="file" /></label><button className="primary-button" onClick={() => router.push("/admin/products/new")}>＋ Add Product</button></div></section>
        <section className="catalog-list-card"><div className="catalog-filters product-filters product-filter-grid"><input value={search} onChange={event => filter(setSearch, event.target.value)} placeholder="Search name, ID or barcode" /><select value={category} onChange={event => filter(setCategory, event.target.value)}><option value="">All Categories</option>{[...new Set(categories.map(item => item.category_l1).filter(Boolean))].map(item => <option key={item} value={item}>{item}</option>)}</select><select value={brand} onChange={event => filter(setBrand, event.target.value)}><option value="">All Brands</option>{brands.map(item => <option key={item.id}>{item.name}</option>)}</select><select value={stock} onChange={event => filter(setStock, event.target.value)}><option value="">All Stock</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="out_of_stock">Out of stock</option></select><select value={active} onChange={event => filter(setActive, event.target.value)}><option value="">All Statuses</option><option value="true">Active</option><option value="false">Inactive</option></select><input type="number" min="0" value={minPrice} onChange={event => filter(setMinPrice, event.target.value)} placeholder="Min price" /><input type="number" min="0" value={maxPrice} onChange={event => filter(setMaxPrice, event.target.value)} placeholder="Max price" /><select value={rating} onChange={event => filter(setRating, event.target.value)}><option value="">Any Rating</option><option value="4">4★ & above</option><option value="3">3★ & above</option><option value="2">2★ & above</option></select><select value={sort} onChange={event => filter(setSort, event.target.value)}><option value="popular">Most popular</option><option value="newest">Newest first</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option><option value="deals">Best discount</option></select><button type="button" onClick={clearFilters}>Clear filters</button></div>
            <div className="category-table-scroll"><table className="simple-table product-table"><thead><tr><th>S/L</th><th>Image</th><th>Product</th><th>Category</th><th>Brand</th><th>MRP</th><th>Selling Price</th><th>Discount</th><th>Inventory</th><th>Stock Status</th><th>Status</th><th>Rating</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={13}>Loading products...</td></tr> : products.length === 0 ? <tr><td colSpan={13}>No products found.</td></tr> : products.map((product, index) => <ProductRow key={product.id} product={product} serial={(page - 1) * size + index + 1} onView={setViewing} onEdit={() => router.push(`/admin/products/${product.id}/edit`)} onDelete={() => void remove(product)} />)}</tbody></table></div>
            <div className="mobile-product-list">
                {products.map((product) => (
                    <div className="mobile-product-card" key={product.id}>

                        <ProductThumbnail product={product} />

                        <div className="mobile-product-info">

                            <h3>{product.name}</h3>

                            <p>
                                {product.category_l1}
                                {product.category_l2 && ` / ${product.category_l2}`}
                            </p>

                            <strong>
                                {product.currency} {Number(product.selling_price).toFixed(2)}
                            </strong>

                            <span className={`stock-status-pill ${product.stock_status}`}>
                                {product.stock_status.replaceAll("_", " ")}
                            </span>

                            <div className="mobile-product-actions">

                                <button aria-label={`View ${product.name}`} title="View" onClick={() => setViewing(product)}>
                                    <Eye aria-hidden="true" />
                                </button>

                                <button
                                    aria-label={`Edit ${product.name}`}
                                    title="Edit"
                                    onClick={() =>
                                        router.push(`/admin/products/${product.id}/edit`)
                                    }
                                >
                                    <Pencil aria-hidden="true" />
                                </button>

                                <button
                                    aria-label={`Delete ${product.name}`}
                                    title="Delete"
                                    onClick={() => void remove(product)}
                                >
                                    <Trash2 aria-hidden="true" />
                                </button>

                            </div>

                        </div>

                    </div>
                ))}
            </div>
            <footer className="product-pagination"><div className="pagination-summary">Showing {first}–{last} of {total}</div><label className="page-size">Rows<select value={size} onChange={event => { setSize(Number(event.target.value)); setPage(1) }}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option><option value="0">All</option></select></label>{size !== 0 && <nav className="pagination-buttons"><button disabled={page === 1} onClick={() => setPage(value => value - 1)}>‹</button>{pageNumbers.map(number => <button key={number} className={number === page ? "active" : ""} onClick={() => setPage(number)}>{number}</button>)}<button disabled={page === pages} onClick={() => setPage(value => value + 1)}>›</button></nav>}</footer>
        </section>{viewing && <ProductView product={viewing} onClose={() => setViewing(null)} onEdit={() => router.push(`/admin/products/${viewing.id}/edit`)} />}
    </div>;
}

function ProductRow({ product, serial, onView, onEdit, onDelete }: { product: Product; serial: number; onView: (product: Product) => void; onEdit: () => void; onDelete: () => void }) { const mrp = Number(product.mrp), sellingPrice = Number(product.selling_price), discount = mrp > 0 ? Math.max(0, Math.round((mrp - sellingPrice) / mrp * 100)) : 0; return <tr><td>{serial}</td><td><ProductThumbnail product={product} /></td><td><strong>{product.name}</strong><small>{product.platform_product_id}</small></td><td>{product.category_l1}{product.category_l2 ? ` / ${product.category_l2}` : ""}</td><td>{product.brand ?? "N/A"}</td><td className="product-mrp">{product.currency} {mrp.toFixed(2)}</td><td className="price">{product.currency} {sellingPrice.toFixed(2)}</td><td><span className="discount-pill">{discount}% off</span></td><td>{product.inventory_qty} {product.unit}</td><td><span className={`stock-status-pill ${product.stock_status}`}>{product.stock_status.replaceAll("_", " ")}</span></td><td><span className={`status-pill ${product.is_active ? "published" : ""}`}>{product.is_active ? "Active" : "Inactive"}</span></td><td>{product.rating}</td><td><div className="product-row-actions"><button className="row-action view" aria-label={`View ${product.name}`} title="View" onClick={() => onView(product)}><Eye aria-hidden="true" /></button><button className="row-action edit" aria-label={`Edit ${product.name}`} title="Edit" onClick={onEdit}><Pencil aria-hidden="true" /></button><button className="row-action delete" aria-label={`Delete ${product.name}`} title="Delete" onClick={onDelete}><Trash2 aria-hidden="true" /></button></div></td></tr> }
function ProductThumbnail({ product }: { product: Product }) { const source = productImageUrl(product, "s"); return <div className="product-table-image">{source ? <img src={source} alt={product.name} loading="lazy" onError={event => event.currentTarget.parentElement?.classList.add("image-error")} /> : <span>{product.name[0]?.toUpperCase()}</span>}</div> }
function ProductView({ product, onClose, onEdit }: { product: Product; onClose: () => void; onEdit: () => void }) { const [current, setCurrent] = useState(product), [uploading, setUploading] = useState(false), [uploadError, setUploadError] = useState(""); const image = productImageUrl(current, "m"); const upload = async (file: File) => { setUploading(true); setUploadError(""); try { const updated = await catalogApi.uploadProductImage(product.id, file); setCurrent(updated) } catch (error) { setUploadError(error instanceof Error ? error.message : "Upload failed") } finally { setUploading(false) } }; return <div className="variant-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="variant-modal product-view-modal"><header><h2>Product Details</h2><button onClick={onClose}>×</button></header><div className="product-view-body">{image && <img src={`${image}?preview=${current.updated_at}`} alt={current.name} />}<label className="product-image-upload"><input type="file" accept="image/webp,image/jpeg,image/png" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file) }} /><span>{uploading ? "Uploading..." : current.image_url ? "Replace Image" : "Upload Image"}</span><small>WEBP, JPG or PNG · maximum 8 MB</small></label>{uploadError && <p className="form-error">{uploadError}</p>}<div className="product-view-title"><h3>{current.name}</h3><span>{current.platform_product_id}</span></div><dl><div><dt>Category</dt><dd>{current.category_l1}{current.category_l2 ? ` / ${current.category_l2}` : ""}</dd></div><div><dt>Brand</dt><dd>{current.brand || "N/A"}</dd></div><div><dt>Price</dt><dd>{current.currency} {current.selling_price}</dd></div><div><dt>Inventory</dt><dd>{current.inventory_qty} {current.unit}</dd></div><div><dt>Stock</dt><dd>{current.stock_status.replaceAll("_", " ")}</dd></div><div><dt>Status</dt><dd>{current.is_active ? "Active" : "Inactive"}</dd></div></dl></div><footer><button className="variant-cancel-button" onClick={onClose}>Close</button><button className="variant-save-button" onClick={onEdit}>Edit Product</button></footer></section></div> }
