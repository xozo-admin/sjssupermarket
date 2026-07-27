"use client";

import {
  Barcode,
  Building2,
  PackageCheck,
  Plus,
  Search,
  ShoppingBasket,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { catalogApi } from "./catalog/catalog-api";
import type { Product } from "./catalog/types";
import { notify } from "./notifications";
import {
  supplierApi,
  type PurchaseOrder,
  type Supplier,
} from "./operations-api";

const supplierEmpty = {
  name: "",
  contact_person: "",
  email: "",
  mobile: "",
  gst_number: "",
  address: "",
  notes: "",
  active: true,
};
type PurchaseLine = {
  product_id: string;
  quantity: number;
  unit_cost: number;
  tax_percent: number;
};

export default function SupplierManager() {
  const [tab, setTab] = useState<"orders" | "suppliers">("orders");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [sf, setSf] = useState(supplierEmpty);
  const [po, setPo] = useState({ supplier_id: "", expected_date: "", notes: "" });
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    const first = await catalogApi.products("", "", "", 1, 100);
    if (first.pages <= 1) return first.items;
    const remaining = await Promise.all(
      Array.from({ length: first.pages - 1 }, (_, index) =>
        catalogApi.products("", "", "", index + 2, 100),
      ),
    );
    return [first, ...remaining].flatMap((page) => page.items);
  };

  const load = () =>
    void Promise.all([
      supplierApi.suppliers(),
      supplierApi.orders(),
      loadProducts(),
    ])
      .then(([s, o, p]) => {
        setSuppliers(s);
        setOrders(o);
        setProducts(p);
      })
      .catch((error) => notify.error(error));

  useEffect(load, []);

  const availableProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter(
      (product) =>
        !lines.some((line) => line.product_id === product.id) &&
        (!query ||
          product.name.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query) ||
          product.platform_product_id.toLowerCase().includes(query)),
    );
  }, [lines, productSearch, products]);

  const subtotal = lines.reduce(
    (sum, line) => sum + line.quantity * line.unit_cost,
    0,
  );
  const tax = lines.reduce(
    (sum, line) =>
      sum + line.quantity * line.unit_cost * (line.tax_percent / 100),
    0,
  );

  const addLine = (productId = selectedProduct) => {
    const product = products.find((item) => item.id === productId);
    if (!product) {
      notify.warning("Select a product first");
      return;
    }
    if (lines.some((line) => line.product_id === product.id)) {
      notify.warning("Product is already in this purchase order");
      return;
    }
    setLines((value) => [
      ...value,
      {
        product_id: product.id,
        quantity: 1,
        unit_cost: Number(product.selling_price),
        tax_percent: Number(product.tax_percent),
      },
    ]);
    setSelectedProduct("");
    setProductSearch("");
  };

  const createSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await supplierApi.addSupplier({
        ...sf,
        name: sf.name.trim(),
        mobile: sf.mobile.trim(),
        email: sf.email.trim() || null,
        contact_person: sf.contact_person.trim() || null,
        gst_number: sf.gst_number.trim() || null,
        address: sf.address.trim() || null,
        notes: sf.notes.trim() || null,
      });
      notify.success("Supplier added");
      setSupplierOpen(false);
      setSf(supplierEmpty);
      load();
    } catch (error) {
      notify.error(error);
    }
  };

  const createPO = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!po.supplier_id) return notify.warning("Select a supplier");
    if (!lines.length) return notify.warning("Add at least one product");
    if (lines.some((line) => line.quantity < 1 || line.unit_cost <= 0))
      return notify.warning("Check product quantity and purchase cost");
    setSaving(true);
    try {
      await supplierApi.createOrder({
        ...po,
        expected_date: po.expected_date || null,
        notes: po.notes || null,
        items: lines,
      });
      notify.success("Purchase order created");
      setOrderOpen(false);
      setLines([]);
      setPo({ supplier_id: "", expected_date: "", notes: "" });
      load();
    } catch (error) {
      notify.error(error);
    } finally {
      setSaving(false);
    }
  };

  const updateLine = (index: number, patch: Partial<PurchaseLine>) =>
    setLines((value) =>
      value.map((line, current) =>
        current === index ? { ...line, ...patch } : line,
      ),
    );

  return (
    <div className="ops-page">
      <header className="ops-heading">
        <div>
          <small>PROCUREMENT</small>
          <h1>Supplier Orders</h1>
          <p>Manage vendors, order supermarket stock, receive goods and track payments.</p>
        </div>
        <div>
          <button className="secondary" onClick={() => setSupplierOpen(true)}>
            <Building2 />Add supplier
          </button>
          <button onClick={() => setOrderOpen(true)}>
            <Plus />New purchase order
          </button>
        </div>
      </header>

      <nav className="ops-tabs">
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          <ShoppingBasket />Purchase orders
        </button>
        <button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>
          <Truck />Suppliers
        </button>
      </nav>

      {tab === "orders" ? (
        <section className="ops-table-card">
          <table>
            <thead><tr><th>PO number</th><th>Supplier</th><th>Items</th><th>Expected</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td><b>{order.po_number}</b><small>{new Date(order.created_at).toLocaleDateString("en-IN")}</small></td>
                  <td>{order.supplier_name}</td>
                  <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td>{order.expected_date || "—"}</td>
                  <td><b>₹{Number(order.total).toFixed(2)}</b></td>
                  <td>
                    <select value={order.payment_status} onChange={(event) => void supplierApi.payment(order.id, event.target.value).then(load).catch(notify.error)}>
                      <option value="unpaid">Unpaid</option><option value="partial">Partial</option><option value="paid">Paid</option>
                    </select>
                  </td>
                  <td><i className={`ops-status ${order.status === "received" ? "active" : ""}`}>{order.status.replaceAll("_", " ")}</i></td>
                  <td><div className="ops-row-actions">
                    {!["received", "cancelled"].includes(order.status) && (
                      <button onClick={() => {
                        const items = order.items.filter((item) => item.received_quantity < item.quantity).map((item) => ({ item_id: item.id, quantity: item.quantity - item.received_quantity }));
                        void supplierApi.receive(order.id, items).then(() => { notify.success("Stock received and inventory updated"); load(); }).catch(notify.error);
                      }}><PackageCheck />Receive balance</button>
                    )}
                  </div></td>
                </tr>
              ))}
              {!orders.length && <tr><td colSpan={8} className="ops-empty">No purchase orders.</td></tr>}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="supplier-grid">
          {suppliers.map((supplier) => (
            <article key={supplier.id}>
              <header><span><Building2 /></span><i className={`ops-status ${supplier.active ? "active" : ""}`}>{supplier.active ? "Active" : "Inactive"}</i></header>
              <h3>{supplier.name}</h3><p>{supplier.contact_person || "No contact person"}</p>
              <dl><div><dt>Mobile</dt><dd>{supplier.mobile}</dd></div><div><dt>Email</dt><dd>{supplier.email || "—"}</dd></div><div><dt>GST</dt><dd>{supplier.gst_number || "—"}</dd></div></dl>
              <small>{supplier.address}</small>
            </article>
          ))}
        </section>
      )}

      {supplierOpen && (
        <div className="ops-modal-backdrop">
          <form className="ops-modal small" onSubmit={createSupplier}>
            <header><h2>Add supplier</h2><button type="button" onClick={() => setSupplierOpen(false)}><X /></button></header>
            <div className="ops-form-grid">
              {(["name", "contact_person", "email", "mobile", "gst_number", "address", "notes"] as const).map((key) => (
                <label className={["address", "notes"].includes(key) ? "wide" : ""} key={key}>
                  {key.replaceAll("_", " ")}
                  <input
                    type={key === "email" ? "email" : key === "mobile" ? "tel" : "text"}
                    required={["name", "mobile"].includes(key)}
                    minLength={key === "name" ? 2 : key === "mobile" ? 7 : undefined}
                    maxLength={key === "name" ? 160 : key === "mobile" ? 30 : undefined}
                    value={sf[key] as string}
                    onChange={(event) => setSf({ ...sf, [key]: event.target.value })}
                  />
                </label>
              ))}
            </div>
            <footer><button type="button" onClick={() => setSupplierOpen(false)}>Cancel</button><button>Save supplier</button></footer>
          </form>
        </div>
      )}

      {orderOpen && (
        <div className="ops-modal-backdrop">
          <form className="ops-modal po-modal" onSubmit={createPO}>
            <header>
              <div><ShoppingBasket /><span><h2>New purchase order</h2><small>Create an order and add incoming stock after receiving it.</small></span></div>
              <button type="button" onClick={() => setOrderOpen(false)}><X /></button>
            </header>

            <div className="ops-form-grid">
              <label>Supplier
                <select required value={po.supplier_id} onChange={(event) => setPo({ ...po, supplier_id: event.target.value })}>
                  <option value="">Select supplier</option>
                  {suppliers.filter((supplier) => supplier.active).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name} · {supplier.mobile}</option>)}
                </select>
              </label>
              <label>Expected delivery
                <input type="date" min={new Date().toISOString().slice(0, 10)} value={po.expected_date} onChange={(event) => setPo({ ...po, expected_date: event.target.value })} />
              </label>
            </div>

            <section className="po-product-picker">
              <label><Search /><input placeholder="Search product, SKU or barcode" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} /></label>
              <label><Barcode /><select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>
                <option value="">Select product ({availableProducts.length} available)</option>
                {availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.unit_value} {product.unit} · Stock {product.inventory_qty}</option>)}
              </select></label>
              <button type="button" onClick={() => addLine()}><Plus />Add product</button>
            </section>

            <div className="po-lines">
              <header><h3>Purchase items <span>{lines.length}</span></h3></header>
              <div className="po-line-head"><span>Product</span><span>Qty</span><span>Unit cost</span><span>Tax %</span><span>Total</span><span /></div>
              {lines.map((line, index) => {
                const product = products.find((item) => item.id === line.product_id);
                const lineTotal = line.quantity * line.unit_cost * (1 + line.tax_percent / 100);
                return (
                  <div className="po-line" key={line.product_id}>
                    <div className="po-product-name"><b>{product?.name}</b><small>{product?.barcode || product?.platform_product_id} · Current stock {product?.inventory_qty} · {product?.unit_value} {product?.unit}</small></div>
                    <input aria-label="Quantity" type="number" min="1" value={line.quantity} onChange={(event) => updateLine(index, { quantity: Math.max(1, Number(event.target.value)) })} />
                    <input aria-label="Unit cost" type="number" min=".01" step=".01" value={line.unit_cost} onChange={(event) => updateLine(index, { unit_cost: Number(event.target.value) })} />
                    <input aria-label="Tax percent" type="number" min="0" max="100" step=".01" value={line.tax_percent} onChange={(event) => updateLine(index, { tax_percent: Number(event.target.value) })} />
                    <b>₹{lineTotal.toFixed(2)}</b>
                    <button aria-label={`Remove ${product?.name}`} type="button" onClick={() => setLines((value) => value.filter((_, current) => current !== index))}><Trash2 /></button>
                  </div>
                );
              })}
              {!lines.length && <div className="po-empty">Search and add products to this purchase order.</div>}
            </div>

            <label>Purchase notes
              <textarea placeholder="Payment terms, delivery instructions, invoice reference, etc." value={po.notes} onChange={(event) => setPo({ ...po, notes: event.target.value })} />
            </label>
            <div className="po-summary">
              <span>Subtotal <b>₹{subtotal.toFixed(2)}</b></span>
              <span>Tax <b>₹{tax.toFixed(2)}</b></span>
              <strong>Grand total <b>₹{(subtotal + tax).toFixed(2)}</b></strong>
            </div>
            <footer>
              <button type="button" onClick={() => setOrderOpen(false)}>Cancel</button>
              <button disabled={saving}>{saving ? "Creating…" : "Create purchase order"}</button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
