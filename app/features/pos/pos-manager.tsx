"use client";

/* eslint-disable @next/next/no-img-element */
import {
  Banknote,
  Barcode,
  Clock3,
  CreditCard,
  History,
  Maximize2,
  Minimize2,
  Minus,
  Pause,
  Plus,
  Printer,
  ReceiptText,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { notify } from "../notifications";
import { posApi, type PosProduct, type PosSale, type PosSaleInput } from "./pos-api";
import { openRazorpayCheckout } from "../razorpay-checkout";
import { getAuthSession } from "../auth-client";

type CartLine = { product: PosProduct; quantity: number };
type Modal = "payment" | "holds" | "sales" | null;
const currency = (value: number | string) => `₹${Number(value).toFixed(2)}`;

function productFromHeld(item: PosSale["items"][number]): PosProduct {
  return {
    id: item.product_id,
    name: item.product_name,
    barcode: item.barcode,
    selling_price: item.unit_price,
    mrp: item.unit_price,
    tax_percent: item.tax_percent,
    inventory_qty: 999,
    is_active: true,
    stock_status: "in_stock",
    unit: "unit",
    image_url: null,
    category: "Held bill",
  };
}

export default function PosManager() {
  const pageRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const selectedItemRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [heldBills, setHeldBills] = useState<PosSale[]>([]);
  const [recentSales, setRecentSales] = useState<PosSale[]>([]);
  const [resumedHoldId, setResumedHoldId] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === pageRef.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await pageRef.current?.requestFullscreen();
    } catch {
      notify.warning("Fullscreen mode is not available in this browser");
    }
  }, []);

  const loadProducts = useCallback(async (search: string) => {
    if (!search.trim()) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setProducts(await posApi.products(search));
    } catch (reason) {
      notify.error(reason, "Could not load POS products");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadProducts(query), 180);
    return () => window.clearTimeout(timer);
  }, [loadProducts, query]);

  const addProduct = useCallback((product: PosProduct) => {
    if (
      !product.is_active ||
      product.stock_status !== "in_stock" ||
      product.inventory_qty < 1
    ) {
      notify.warning(`${product.name} is currently unavailable`);
      return;
    }
    setCart((current) => {
      const existing = current.find(
        (line) => line.product.id === product.id
      );
      if (existing) {
        if (existing.quantity >= product.inventory_qty) {
          notify.warning(
            `Only ${product.inventory_qty} ${product.unit} available`
          );
          return current;
        }
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + 1 }
            : line
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setSelectedId(product.id);
    setQuery("");
    searchRef.current?.focus();
  }, []);

  const quantity = (id: string, change: number) => {
    setSelectedId(id);
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === id
            ? {
              ...line,
              quantity: Math.min(
                line.product.inventory_qty,
                Math.max(0, line.quantity + change)
              ),
            }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const subtotal = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.product.selling_price) * line.quantity, 0),
    [cart],
  );
  const discount = Math.min(
    subtotal,
    discountType === "percent" ? subtotal * Math.min(discountValue, 100) / 100 : discountValue,
  );
  const total = Math.max(0, subtotal - discount);
  const tax = useMemo(
    () =>
      cart.reduce((sum, line) => {
        const rate = Number(line.product.tax_percent);
        return sum + (Number(line.product.selling_price) * line.quantity * rate) / (100 + rate);
      }, 0),
    [cart],
  );
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const payload = (paymentMethod: PosSaleInput["payment_method"], amountTendered: number): PosSaleInput => ({
    items: cart.map((line) => ({ product_id: line.product.id, quantity: line.quantity })),
    customer_name: customerName.trim() || null,
    customer_mobile: customerMobile.trim() || null,
    discount_type: discountType,
    discount_value: discountValue,
    payment_method: paymentMethod,
    amount_tendered: amountTendered,
    notes: notes.trim() || null,
  });

  const resetBill = () => {
    setCart([]);
    setCustomerName("");
    setCustomerMobile("");
    setDiscountValue(0);
    setNotes("");
    setSelectedId(null);
    setResumedHoldId(null);
    searchRef.current?.focus();
  };

  const holdBill = useCallback(async () => {
    if (!cart.length) return notify.warning("Add products before holding the bill");
    try {
      await posApi.hold(payload("cash", 0));
      notify.success("Bill held successfully");
      resetBill();
    } catch (reason) {
      notify.error(reason, "Could not hold bill");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart, customerName, customerMobile, discountType, discountValue, notes]);

  const openHolds = useCallback(async () => {
    try {
      setHeldBills(await posApi.holds());
      setModal("holds");
    } catch (reason) {
      notify.error(reason, "Could not load held bills");
    }
  }, []);

  const openSales = useCallback(async () => {
    try {
      setRecentSales(await posApi.sales());
      setModal("sales");
    } catch (reason) {
      notify.error(reason, "Could not load recent sales");
    }
  }, []);

  const resume = (sale: PosSale) => {
    setCart(sale.items.map((item) => ({ product: productFromHeld(item), quantity: item.quantity })));
    setCustomerName(sale.customer_name ?? "");
    setCustomerMobile(sale.customer_mobile ?? "");
    setDiscountType("fixed");
    setDiscountValue(Number(sale.discount));
    setNotes(sale.notes ?? "");
    setResumedHoldId(sale.id);
    setModal(null);
    notify.info(`Resumed ${sale.invoice_number}`);
  };

  const printReceipt = useCallback((sale: PosSale | null) => {
    if (!sale) return notify.warning("No completed receipt to print");
    const popup = window.open("", "_blank", "width=420,height=720");
    if (!popup) return notify.warning("Allow popups to print the receipt");
    const rows = sale.items
      .map(
        (item) =>
          `<tr><td>${item.product_name}<small>${item.quantity} × ${currency(item.unit_price)}</small></td><td>${currency(item.line_total)}</td></tr>`,
      )
      .join("");
    popup.document.write(`<!doctype html><html><head><title>${sale.invoice_number}</title><style>
      body{font:13px Arial;margin:0;padding:20px;color:#111}.head{text-align:center;border-bottom:1px dashed #777;padding-bottom:12px}
      .head img{width:62px;height:62px;object-fit:contain}.head h1{font-size:18px;margin:4px}.meta{display:grid;gap:4px;padding:12px 0;border-bottom:1px dashed #777}
      table{width:100%;border-collapse:collapse}td{padding:8px 0;border-bottom:1px dotted #bbb}td:last-child{text-align:right;font-weight:700}
      small{display:block;color:#555;margin-top:3px}.totals{margin-top:12px}.totals div{display:flex;justify-content:space-between;padding:3px 0}
      .grand{font-size:17px;font-weight:800;border-top:1px solid #111;margin-top:6px;padding-top:7px!important}.thanks{text-align:center;margin-top:20px}
      @media print{body{padding:0}} </style></head><body>
      <div class="head"><img src="${location.origin}/app_logo.jpeg"><h1>SJS Super Market</h1><div>Tax Invoice / POS Receipt</div></div>
      <div class="meta"><span>Invoice: <b>${sale.invoice_number}</b></span><span>Date: ${new Date(sale.created_at).toLocaleString("en-IN")}</span><span>Customer: ${sale.customer_name || "Walk-in customer"} ${sale.customer_mobile || ""}</span></div>
      <table>${rows}</table><div class="totals"><div><span>Subtotal</span><b>${currency(sale.subtotal)}</b></div><div><span>Discount</span><b>−${currency(sale.discount)}</b></div><div><span>Tax included</span><b>${currency(sale.tax)}</b></div><div class="grand"><span>Total</span><b>${currency(sale.total)}</b></div><div><span>Paid via</span><b>${sale.payment_method.toUpperCase()}</b></div><div><span>Change</span><b>${currency(sale.change_due)}</b></div></div>
      <div class="thanks">Thank you for shopping with us!</div><script>onload=()=>{print();onafterprint=()=>close()}</script></body></html>`);
    popup.document.close();
  }, []);

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const editing = ["INPUT", "TEXTAREA", "SELECT"].includes(
        (document.activeElement?.tagName ?? "").toUpperCase(),
      );
      if (event.key === "F2") { event.preventDefault(); searchRef.current?.focus(); }
      else if (event.key === "F4") { event.preventDefault(); customerRef.current?.focus(); }
      else if (event.key === "F6") { event.preventDefault(); discountRef.current?.focus(); }
      else if (event.key === "F8") { event.preventDefault(); void holdBill(); }
      else if (event.key === "F9") { event.preventDefault(); void openHolds(); }
      else if (event.key === "F10") { event.preventDefault(); if (cart.length) setModal("payment"); }
      else if (event.key === "F11") { event.preventDefault(); void toggleFullscreen(); }
      else if (event.ctrlKey && key === "p") { event.preventDefault(); printReceipt(lastSale); }
      else if (event.key === "Escape") { setModal(null); setQuery(""); searchRef.current?.focus(); }
      else if (!editing && (event.key === "+" || event.key === "=") && selectedId) quantity(selectedId, 1);
      else if (!editing && event.key === "-" && selectedId) quantity(selectedId, -1);
      else if (!editing && event.key === "Delete" && selectedId) {
        setCart((current) => current.filter((line) => line.product.id !== selectedId));
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [cart.length, holdBill, lastSale, openHolds, printReceipt, selectedId, toggleFullscreen]);

  const scan = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || !query.trim()) return;
    event.preventDefault();
    let matches = products;
    if (!matches.length) {
      try {
        matches = await posApi.products(query.trim());
        setProducts(matches);
      } catch (reason) {
        notify.error(reason, "Could not find scanned product");
        return;
      }
    }
    const exact = matches.find(
      (product) =>
        product.barcode?.toLowerCase() === query.trim().toLowerCase() ||
        product.name.toLowerCase() === query.trim().toLowerCase(),
    );
    if (exact) addProduct(exact);
    else if (matches.length === 1) addProduct(matches[0]);
    else notify.info("Select a matching product");
  };

 useEffect(() => {
    if (selectedItemRef.current) {
        selectedItemRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    }
}, [selectedId]);

  return (
    <div className="pos-page" ref={pageRef}>
      <header className="pos-topbar">
        <div><span>POINT OF SALE</span><h1>POS Billing</h1></div>
        <div className="pos-shift"><i />Register online · {new Date().toLocaleDateString("en-IN")}</div>
        <button onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize2 /> : <Maximize2 />}{fullscreen ? "Exit fullscreen" : "Fullscreen"} <kbd>F11</kbd></button>
        <button onClick={() => void openSales()}><History />Recent sales</button>
      </header>

      <section className="pos-workspace">
        <div className="pos-products-panel">
          <label className="pos-search"><Barcode /><input ref={searchRef} autoFocus value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => void scan(event)} placeholder="Scan barcode or search product..." /><kbd>F2</kbd></label>
          <div className="pos-result-header"><span>{loading ? "Searching..." : `${products.length} products`}</span><small>Press Enter to add exact barcode</small></div>
          <div className="pos-product-grid">
            {products.map((product) => (
              <button key={product.id} disabled={!product.is_active || product.stock_status !== "in_stock" || product.inventory_qty < 1} onClick={() => addProduct(product)}>
                <div>{product.image_url ? <img src={product.image_url} alt="" /> : <ShoppingCart />}</div>
                <strong>{product.name}</strong><small>{product.category} · {product.inventory_qty} {product.unit}{(!product.is_active || product.stock_status !== "in_stock" || product.inventory_qty < 1) ? " · Unavailable" : ""}</small>
                <footer><b>{currency(product.selling_price)}</b>{product.barcode && <span>{product.barcode}</span>}</footer>
              </button>
            ))}
            {!loading && !products.length && <div className="pos-empty-products"><Search /><b>{query.trim() ? "No matching products" : "Search or scan a product"}</b><span>{query.trim() ? "Try another product name or barcode" : "Only matching products will appear here"}</span></div>}
          </div>
        </div>

        <aside className="pos-cart-panel">
          <header><div><ShoppingCart /><b>Current bill</b><span>{itemCount} items</span></div><button disabled={!cart.length} onClick={resetBill}><Trash2 />Clear</button></header>
          <div className="pos-customer">
            <label><UserRound /><input ref={customerRef} value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name (optional)" /><kbd>F4</kbd></label>
            <input value={customerMobile} onChange={(event) => setCustomerMobile(event.target.value.replace(/[^\d+]/g, ""))} placeholder="Mobile number" />
          </div>
          <div className="pos-cart-lines">
            {cart.map((line, index) => (
              <article
                key={line.product.id}
                ref={selectedId === line.product.id ? selectedItemRef : null}
                className={selectedId === line.product.id ? "selected" : ""}
                onClick={() => setSelectedId(line.product.id)}
              >
                <span>{index + 1}</span>

                <div>
                  <b>{line.product.name}</b>
                  <small>
                    {currency(line.product.selling_price)} / {line.product.unit}
                  </small>
                </div>

                <div className="pos-qty">
                  <button onClick={() => quantity(line.product.id, -1)}>
                    <Minus />
                  </button>

                  <strong>{line.quantity}</strong>

                  <button onClick={() => quantity(line.product.id, 1)}>
                    <Plus />
                  </button>
                </div>

                <b>{currency(Number(line.product.selling_price) * line.quantity)}</b>

                <button
                  className="pos-remove"
                  onClick={() =>
                    setCart((current) =>
                      current.filter((item) => item.product.id !== line.product.id)
                    )
                  }
                >
                  <X />
                </button>
              </article>
            ))}

            {!cart.length && (
              <div className="pos-empty-cart">
                <ShoppingCart />
                <h3>Your bill is empty</h3>
                <p>Scan a barcode or select products to begin billing.</p>
              </div>
            )}
          </div>
          <div className="pos-discount-row">
            <select value={discountType} onChange={(event) => setDiscountType(event.target.value as "fixed" | "percent")}><option value="fixed">Discount ₹</option><option value="percent">Discount %</option></select>
            <input ref={discountRef} type="number" min="0" max={discountType === "percent" ? 100 : subtotal} value={discountValue || ""} onChange={(event) => setDiscountValue(Math.max(0, Number(event.target.value)))} placeholder="0" /><kbd>F6</kbd>
          </div>
          <div className="pos-totals"><div><span>Subtotal</span><b>{currency(subtotal)}</b></div><div><span>Discount</span><b className="discount">− {currency(discount)}</b></div><div><span>Tax included</span><b>{currency(tax)}</b></div><div className="grand"><span>Total payable</span><b>{currency(total)}</b></div></div>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Bill note (optional)" rows={2} />
          {resumedHoldId && <div className="pos-resumed"><Clock3 />Resumed held bill</div>}
          <footer className="pos-actions">
            <button disabled={!cart.length} onClick={() => void holdBill()}><Pause />Hold <kbd>F8</kbd></button>
            <button onClick={() => void openHolds()}><Clock3 />Resume <kbd>F9</kbd></button>
            <button className="pay" disabled={!cart.length} onClick={() => setModal("payment")}><WalletCards />Pay {currency(total)} <kbd>F10</kbd></button>
          </footer>
        </aside>
      </section>
      <div className="pos-shortcuts"><span><kbd>F2</kbd> Search</span><span><kbd>+</kbd>/<kbd>−</kbd> Quantity</span><span><kbd>Del</kbd> Remove</span><span><kbd>Ctrl P</kbd> Print last receipt</span><span><kbd>F11</kbd> Fullscreen</span><span><kbd>Esc</kbd> Close</span></div>

      {modal === "payment" && <PaymentModal total={total} onClose={() => setModal(null)} onComplete={async (method, tendered) => {
        try {
          let sale: PosSale;
          if (method === "razorpay") {
            const checkout = await posApi.createRazorpayOrder(payload("razorpay", 0));
            const user = getAuthSession()?.user;
            const payment = await openRazorpayCheckout(
              {
                checkout_id: checkout.pos_sale_id,
                razorpay_key_id: checkout.razorpay_key_id,
                razorpay_order_id: checkout.razorpay_order_id,
                amount: checkout.amount,
                display_amount: checkout.display_amount,
                currency: checkout.currency,
              },
              {
                name: customerName || user?.name || "",
                email: user?.email || "",
                mobile: customerMobile || user?.mobile || "",
              },
            );
            sale = await posApi.verifyRazorpayPayment(checkout.pos_sale_id, payment);
          } else {
            sale = await posApi.checkout(payload("cash", tendered));
          }
          if (resumedHoldId) await posApi.deleteHold(resumedHoldId).catch(() => undefined);
          setLastSale(sale); setModal(null); resetBill(); notify.success(`${sale.invoice_number} completed`); printReceipt(sale);
        } catch (reason) { notify.error(reason, "Could not complete the sale"); }
      }} />}
      {(modal === "holds" || modal === "sales") && <SaleDrawer title={modal === "holds" ? "Held bills" : "Recent sales"} sales={modal === "holds" ? heldBills : recentSales} onClose={() => setModal(null)} onResume={modal === "holds" ? resume : undefined} onPrint={printReceipt} />}
    </div>
  );
}

function PaymentModal({ total, onClose, onComplete }: { total: number; onClose: () => void; onComplete: (method: PosSaleInput["payment_method"], tendered: number) => Promise<void> }) {
  const [method, setMethod] = useState<PosSaleInput["payment_method"]>("cash");
  const [tendered, setTendered] = useState(total);
  const [busy, setBusy] = useState(false);
  const methods = [{ id: "cash", label: "Cash", icon: Banknote }, { id: "razorpay", label: "Razorpay", icon: CreditCard }] as const;
  const submit = async () => { setBusy(true); try { await onComplete(method, method === "cash" ? tendered : total); } finally { setBusy(false); } };
  return <div className="pos-modal-backdrop"><section className="pos-payment-modal"><header><div><small>AMOUNT DUE</small><h2>{currency(total)}</h2></div><button onClick={onClose}><X /></button></header><div className="pos-payment-methods" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>{methods.map(({ id, label, icon: Icon }) => <button key={id} className={method === id ? "active" : ""} onClick={() => { setMethod(id); setTendered(total) }}><Icon /><b>{label}</b></button>)}</div>{method === "cash" && <div className="pos-cash"><label>Cash received<input autoFocus type="number" min={total} value={tendered} onChange={event => setTendered(Number(event.target.value))} /></label><div>{[total, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100, 500, 1000].filter((value, index, array) => value >= total && array.indexOf(value) === index).map(value => <button key={value} onClick={() => setTendered(value)}>{currency(value)}</button>)}</div><p>Change due <strong>{currency(Math.max(0, tendered - total))}</strong></p></div>}<footer><button onClick={onClose}>Cancel</button><button className="complete" disabled={busy || (method === "cash" && tendered < total)} onClick={() => void submit()}>{busy ? "Processing..." : `Complete ${method.toUpperCase()} payment`}</button></footer></section></div>;
}

function SaleDrawer({ title, sales, onClose, onResume, onPrint }: { title: string; sales: PosSale[]; onClose: () => void; onResume?: (sale: PosSale) => void; onPrint: (sale: PosSale) => void }) {
  return <div className="pos-modal-backdrop drawer-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><aside className="pos-sale-drawer"><header><div><small>POS BILLING</small><h2>{title}</h2></div><button onClick={onClose}><X /></button></header><div>{sales.map(sale => <article key={sale.id}><div><b>{sale.invoice_number}</b><small>{new Date(sale.created_at).toLocaleString("en-IN")} · {sale.item_count} items</small><span>{sale.customer_name || "Walk-in customer"} {sale.customer_mobile || ""}</span></div><strong>{currency(sale.total)}</strong><footer>{onResume && <button onClick={() => onResume(sale)}>Resume</button>}<button onClick={() => onPrint(sale)}><Printer />Print</button></footer></article>)}{!sales.length && <div className="pos-drawer-empty"><ReceiptText /><b>No bills found</b></div>}</div></aside></div>;
}
