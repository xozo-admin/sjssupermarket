"use client";
import { Download, Eye, Printer, Search, X } from "lucide-react";
import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";
import {
  listAllOrders,
  orderSocketUrl,
  updateOrderStatus,
  type Order,
} from "../order-api";

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.4-4.2A8.5 8.5 0 1 1 20.5 11.8Z" />
      <path d="M8.2 7.8c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .5.4l.8 1.9c.1.3.1.5-.1.7l-.6.8c-.2.2-.1.4 0 .6.7 1.2 1.7 2.2 3 2.8.2.1.4.1.6-.1l.9-1.1c.2-.2.4-.3.7-.2l1.8.9c.3.1.4.3.4.5 0 .5-.2 1.5-.8 2-.6.5-1.4.8-2.3.6-1.1-.2-2.6-.8-4.4-2.4-1.5-1.4-2.6-3.1-2.9-4.3-.3-1.1 0-2 .4-2.5.2-.2.5-.4.8-.2Z" />
    </svg>
  );
}

export default function OrderManager() {
  const [allOrders, setOrders] = useState<Order[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Order | null>(null),
    [liveAlert, setLiveAlert] = useState<Order | null>(null);
  const [query, setQuery] = useState(""),
    [paymentFilter, setPaymentFilter] = useState(""),
    [statusFilter, setStatusFilter] = useState(""),
    [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filteredOrders = useMemo(
    () =>
      allOrders.filter((order) => {
        const searchText = [
          order.id,
          order.customer_name,
          order.customer_email,
          order.customer_mobile,
          order.delivery_address,
          ...order.items.map((item) => item.product_name),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!query.trim() || searchText.includes(query.trim().toLowerCase())) &&
          (!paymentFilter || order.payment_status === paymentFilter) &&
          (!statusFilter || order.status === statusFilter) &&
          (!typeFilter || typeFilter === "online")
        );
      }),
    [allOrders, query, paymentFilter, statusFilter, typeFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const orders = useMemo(
    () => filteredOrders.slice((page - 1) * pageSize, page * pageSize),
    [filteredOrders, page],
  );
  const total = useMemo(
    () => filteredOrders.reduce((sum, order) => sum + Number(order.total), 0),
    [filteredOrders],
  );
  useEffect(() => setPage(1), [query, paymentFilter, statusFilter, typeFilter]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);
  useEffect(() => {
    void listAllOrders()
      .then(setOrders)
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Could not load orders",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    let socket: WebSocket | null = null,
      retry: ReturnType<typeof setTimeout> | null = null,
      closed = false;
    const connect = () => {
      const url = orderSocketUrl();
      if (!url || closed) return;
      socket = new WebSocket(url);
      socket.onmessage = (event) => {
        if (event.data === "pong") return;
        try {
          const message = JSON.parse(event.data) as {
            event: string;
            data: Order & { order_id?: string };
          };
          if (message.event === "order_created") {
            setOrders((current) => [
              message.data,
              ...current.filter((order) => order.id !== message.data.id),
            ]);
            setLiveAlert(message.data);
            setSelected(message.data);
          } else if (message.event === "order_status_updated") {
            if (message.data?.id) {
              setOrders((current) =>
                current.map((order) =>
                  order.id === message.data.id ? message.data : order,
                ),
              );
              setSelected((current) =>
                current?.id === message.data.id ? message.data : current,
              );
            } else
              void listAllOrders().then((fresh) => {
                setOrders(fresh);
                setSelected((current) =>
                  current
                    ? fresh.find((order) => order.id === current.id) || current
                    : current,
                );
              });
          }
        } catch {}
      };
      socket.onclose = () => {
        if (!closed) retry = setTimeout(connect, 2000);
      };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, []);
  const changeStatus = (order: Order, status: string) => {
    void updateOrderStatus(order.id, status)
      .then((updated) => {
        setOrders((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSelected((current) =>
          current?.id === updated.id ? updated : current,
        );
      })
      .catch((reason) =>
        setError(
          reason instanceof Error
            ? reason.message
            : "Could not update order status",
        ),
      );
  };
  const openWhatsApp = (order: Order) => {
    let mobile = (order.customer_mobile || "").replace(/\D/g, "");
    if (!mobile) return;
    if (mobile.length === 10) mobile = `91${mobile}`;
    const message = `Hello ${order.customer_name || "Customer"}, regarding your SJS Super Market order #${order.id.slice(0, 8).toUpperCase()}.`;
    window.open(
      `https://wa.me/${mobile}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };
  const printOrder = (order: Order) => {
    setSelected(order);
    window.setTimeout(() => window.print(), 100);
  };
  const downloadInvoice = (order: Order) => {
    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const code = order.id.toUpperCase();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("SJS SUPER MARKET", 14, 18);
    pdf.setFontSize(15);
    pdf.text(`INVOICE #${code}`, 14, 29);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      `Order date: ${new Date(order.created_at).toLocaleDateString("en-GB")}`,
      14,
      37,
    );
    pdf.text(
      `Status: ${order.status.replaceAll("_", " ").toUpperCase()}`,
      14,
      43,
    );
    pdf.setDrawColor(220);
    pdf.line(14, 48, 196, 48);
    pdf.setFont("helvetica", "bold");
    pdf.text("CUSTOMER", 14, 57);
    pdf.text("DELIVERY ADDRESS", 108, 57);
    pdf.setFont("helvetica", "normal");
    pdf.text(order.customer_name || "Customer", 14, 64);
    pdf.text(order.customer_email || "-", 14, 70);
    pdf.text(order.customer_mobile || "-", 14, 76);
    pdf.setFontSize(9);
    pdf.text(pdf.splitTextToSize(order.delivery_address, 86), 108, 64);
    let y = 91;
    pdf.setFillColor(245, 247, 248);
    pdf.rect(14, y - 7, 182, 10, "F");
    pdf.setFont("helvetica", "bold");
    pdf.text("#", 17, y);
    pdf.text("PRODUCT", 27, y);
    pdf.text("UNIT PRICE", 124, y);
    pdf.text("QTY", 154, y);
    pdf.text("TOTAL", 176, y);
    pdf.setFont("helvetica", "normal");
    order.items.forEach((item, index) => {
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
      y += 11;
      pdf.text(String(index + 1), 17, y);
      pdf.text(pdf.splitTextToSize(item.product_name, 86)[0], 27, y);
      pdf.text(`INR ${Number(item.unit_price).toFixed(2)}`, 124, y);
      pdf.text(String(item.quantity), 156, y);
      pdf.text(`INR ${Number(item.line_total).toFixed(2)}`, 176, y, {
        align: "left",
      });
      pdf.setDrawColor(235);
      pdf.line(14, y + 4, 196, y + 4);
    });
    y += 16;
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Payment: ${order.payment_method.toUpperCase()} (${order.payment_status})`,
      14,
      y,
    );
    pdf.text(`Subtotal: INR ${Number(order.subtotal).toFixed(2)}`, 196, y, {
      align: "right",
    });
    y += 7;
    pdf.text(`Shipping: INR ${Number(order.delivery_fee).toFixed(2)}`, 196, y, {
      align: "right",
    });
    y += 9;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.text(`GRAND TOTAL: INR ${Number(order.total).toFixed(2)}`, 196, y, {
      align: "right",
    });
    pdf.save(`SJS-Invoice-${code}.pdf`);
  };
  return (
    <div className="admin-orders">
      {liveAlert && (
        <div className="admin-live-order-alert">
          <div>
            <b>New order received</b>
            <span>
              #{liveAlert.id.slice(0, 8).toUpperCase()} ·{" "}
              {liveAlert.customer_name || "Customer"} · ₹
              {Number(liveAlert.total).toFixed(0)}
            </span>
          </div>
          <button
            onClick={() => {
              setSelected(liveAlert);
              setLiveAlert(null);
            }}
          >
            View order
          </button>
          <button aria-label="Dismiss" onClick={() => setLiveAlert(null)}>
            ×
          </button>
        </div>
      )}
      <form
        className="admin-order-filters"
        onSubmit={(event) => event.preventDefault()}
      >
        <label>
          <Search />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search order ID, name, email, mobile, item or address"
          />
        </label>
        <select
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
        >
          <option value="">All payment statuses</option>
          <option value="pending">Unpaid / Pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All delivery statuses</option>
          <option value="placed">Order Placed</option>
          <option value="processing">Processing</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option value="">Online &amp; POS orders</option>
          <option value="online">Online orders</option>
          <option value="pos">POS orders</option>
        </select>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setPaymentFilter("");
            setStatusFilter("");
            setTypeFilter("");
          }}
        >
          Clear
        </button>
      </form>
      <header>
        <div>
          <span>Order management</span>
        </div>
        <div>
          <strong>{filteredOrders.length}</strong>
          <small>Total orders</small>
          <strong>₹{total.toFixed(0)}</strong>
          <small>Order value</small>
        </div>
      </header>
      <section>
        {loading ? (
          <div className="admin-orders-state">Loading orders...</div>
        ) : error ? (
          <div className="admin-orders-state error">{error}</div>
        ) : !orders.length ? (
          <div className="admin-orders-state">No orders have been placed.</div>
        ) : (
          <div className="admin-orders-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Delivery address</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b>#{order.id.slice(0, 8).toUpperCase()}</b>
                      <small>
                        {order.customer_name || order.user_id.slice(0, 8)}
                      </small>
                    </td>
                    <td>
                      {new Date(order.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td>
                      {order.items
                        .map(
                          (item) => `${item.product_name} × ${item.quantity}`,
                        )
                        .join(", ")}
                    </td>
                    <td>{order.delivery_address}</td>
                    <td>
                      {order.payment_method.toUpperCase()}
                      <small>{order.payment_status}</small>
                    </td>
                    <td>
                      <select
                        className="admin-order-status-select"
                        value={order.status}
                        onChange={(event) =>
                          changeStatus(order, event.target.value)
                        }
                      >
                        <option value="placed">Order Placed</option>
                        <option value="processing">Processing</option>
                        <option value="assigned">Assigned</option>
                        <option value="accepted">Accepted</option>
                        <option value="picked_up">Picked Up</option>
                        <option value="on_the_way">On the Way</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td>
                      <b>₹{Number(order.total).toFixed(0)}</b>
                    </td>
                    <td>
                      <div className="admin-order-actions">
                        <button
                          className="whatsapp-action"
                          title={
                            order.customer_mobile
                              ? "Contact customer on WhatsApp"
                              : "Customer mobile number unavailable"
                          }
                          disabled={!order.customer_mobile}
                          onClick={() => openWhatsApp(order)}
                        >
                          <WhatsAppIcon />
                        </button>
                        <button
                          title="View order details"
                          onClick={() => setSelected(order)}
                        >
                          <Eye />
                        </button>
                        <button
                          title="Print invoice"
                          onClick={() => printOrder(order)}
                        >
                          <Printer />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && filteredOrders.length > 0 && (
          <div className="admin-orders-pagination">
            <span>
              Showing {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, filteredOrders.length)} of{" "}
              {filteredOrders.length}
            </span>
            <div>
              <button
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </button>
              {Array.from({ length: pageCount }, (_, index) => index + 1).map(
                (value) => (
                  <button
                    key={value}
                    className={page === value ? "active" : ""}
                    onClick={() => setPage(value)}
                  >
                    {value}
                  </button>
                ),
              )}
              <button
                disabled={page === pageCount}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
      {selected && (
        <div
          className="order-detail-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <article className="order-invoice" role="dialog" aria-modal="true">
            <div className="invoice-top">
              <div className="invoice-title">
                <h2>
                  INVOICE <span>#{selected.id.toUpperCase()}</span>
                </h2>
                <p>
                  Order Date:{" "}
                  {new Date(selected.created_at).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <small>⌖ Default Location</small>
              </div>
              <label>
                Assign Deliveryman
                <select>
                  <option>Assign Deliveryman</option>
                </select>
              </label>
              <label>
                Payment Status
                <select defaultValue={selected.payment_status}>
                  <option value="pending">Unpaid</option>
                  <option value="paid">Paid</option>
                </select>
              </label>
              <label>
                Delivery Status
                <select
                  value={selected.status}
                  onChange={(event) =>
                    changeStatus(selected, event.target.value)
                  }
                >
                  <option value="placed">Order Placed</option>
                  <option value="processing">Processing</option>
                  <option value="assigned">Assigned</option>
                  <option value="accepted">Accepted</option>
                  <option value="picked_up">Picked Up</option>
                  <option value="on_the_way">On the Way</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </label>
              <button
                className="invoice-close"
                onClick={() => setSelected(null)}
              >
                <X />
              </button>
            </div>
            <div className="invoice-addresses">
              <div>
                <h3>Customer Info</h3>
                <p>Name: {selected.customer_name || "Customer"}</p>
                <p>Email: {selected.customer_email || "—"}</p>
                <p>Phone: {selected.customer_mobile || "—"}</p>
                <p>
                  Delivery Type: <b>Regular</b>
                </p>
              </div>
              <div>
                <h3>Shipping Address</h3>
                <p>{selected.delivery_address}</p>
              </div>
              <div>
                <h3>Billing Address</h3>
                <p>{selected.delivery_address}</p>
              </div>
            </div>
            <table className="invoice-products">
              <thead>
                <tr>
                  <th>S/L</th>
                  <th>Products</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <b>{item.product_name}</b>
                    </td>
                    <td>₹{Number(item.unit_price).toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td>₹{Number(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="invoice-summary">
              <div>
                <b>Payment Method</b>
                <span>{selected.payment_method.toUpperCase()}</span>
              </div>
              <div>
                <b>Logistic</b>
                <span>SJS Delivery</span>
              </div>
              <div>
                <b>Sub Total</b>
                <span>₹{Number(selected.subtotal).toFixed(2)}</span>
              </div>
              <div>
                <b>Tips</b>
                <span>₹0.00</span>
              </div>
              <div>
                <b>Shipping Cost</b>
                <span>₹{Number(selected.delivery_fee).toFixed(2)}</span>
              </div>
              <div>
                <b>Grand Total</b>
                <strong>₹{Number(selected.total).toFixed(2)}</strong>
              </div>
            </div>
            <footer>
              <button onClick={() => downloadInvoice(selected)}>
                <Download />
                Download invoice
              </button>
              <button onClick={() => window.print()}>
                <Printer />
                Print invoice
              </button>
            </footer>
          </article>
        </div>
      )}
    </div>
  );
}
