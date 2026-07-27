"use client";
import {
  Download,
  Eye,
  MapPin,
  Plus,
  Search,
  ShieldBan,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  deliveryApi,
  deliverySocketUrl,
  type DeliveryMan,
  type DeliveryOrder,
} from "./delivery-api";
import { confirmToast, promptToast } from "../notifications";
const empty = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  address: "",
  zone: "",
  vehicle_type: "Bike",
  vehicle_number: "",
  verification_status: "pending",
  photo_url: null,
  documents: { aadhaar: "", license: "", rc: "", insurance: "" },
  bank_details: { account_name: "", account_number: "", ifsc: "" },
};
export default function DeliveryManager({ mode }: { mode: string }) {
  const [men, setMen] = useState<DeliveryMan[]>([]),
    [stats, setStats] = useState<Record<string, number>>({}),
    [rows, setRows] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [selected, setSelected] = useState<DeliveryMan | null>(null),
    [form, setForm] = useState<any>(empty),
    [message, setMessage] = useState("");
  const load = () => {
    void deliveryApi
      .list(new URLSearchParams({ search, status }).toString())
      .then(setMen);
    void deliveryApi.dashboard().then(setStats);
    if (mode === "attendance") void deliveryApi.attendance().then(setRows);
    if (mode === "earnings" || mode === "reports")
      void deliveryApi.earnings().then(setRows);
    if (mode === "leaves") void deliveryApi.leaves().then(setRows);
    if (mode === "logs") void deliveryApi.logs().then(setRows);
  };
  useEffect(load, [mode]);
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    const connect = () => {
      const url = deliverySocketUrl();
      if (!url || closed) return;
      socket = new WebSocket(url);
      socket.onmessage = (event) => {
        if (event.data !== "pong") load();
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
  }, [mode]);
  const exportCsv = () => {
    const data = mode === "list" ? men : rows;
    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map((r) =>
        Object.values(r)
          .map((v) => JSON.stringify(v ?? ""))
          .join(","),
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `delivery-${mode}.csv`;
    a.click();
  };
  if (mode === "dashboard")
    return (
      <div className="delivery-module">
        <Title title="Delivery Dashboard" />
        <div className="delivery-stats">
          {[
            ["Total Partners", "total"],
            ["Active", "active"],
            ["Offline", "offline"],
            ["Available", "available"],
            ["On Delivery", "on_delivery"],
            ["Pending Verification", "pending_verification"],
            ["Blocked", "blocked"],
            ["Today's Deliveries", "today_deliveries"],
            ["Today's Earnings", "today_earnings"],
            ["Average Rating", "average_rating"],
          ].map(([label, key]) => (
            <article key={key}>
              <small>{label}</small>
              <b>
                {Number(stats[key] || 0).toFixed(
                  key === "average_rating" ? 1 : 0,
                )}
              </b>
            </article>
          ))}
        </div>
      </div>
    );
  if (mode === "add")
    return (
      <div className="delivery-module">
        <Title title="Add Delivery Man" />
        <DeliveryForm form={form} setForm={setForm} />
        <button
          className="delivery-primary"
          onClick={() =>
            void deliveryApi
              .create(form)
              .then(() => {
                setMessage("Delivery partner added.");
                setForm(empty);
              })
              .catch((e) => setMessage(e.message))
          }
        >
          <Plus />
          Add Delivery Man
        </button>
        <p>{message}</p>
      </div>
    );
  if (["attendance", "earnings", "leaves", "logs", "reports"].includes(mode))
    return (
      <div className="delivery-module">
        <Title title={mode[0].toUpperCase() + mode.slice(1)} />
        <button className="delivery-export" onClick={exportCsv}>
          <Download />
          Export CSV
        </button>
        <GenericTable rows={rows} mode={mode} reload={load} />
      </div>
    );
  if (mode === "tracking")
    return (
      <div className="delivery-module">
        <Title title="Live Tracking" />
        <div className="tracking-grid">
          {men.map((m) => (
            <article key={m.id}>
              <MapPin />
              <b>{m.name}</b>
              <span>
                {m.latitude != null
                  ? `${m.latitude.toFixed(5)}, ${m.longitude?.toFixed(5)}`
                  : "Location unavailable"}
              </span>
              <small>
                {m.active_order_id
                  ? `Active order #${m.active_order_id.slice(0, 8)}`
                  : "No active delivery"}
              </small>
              <small>
                Last updated:{" "}
                {m.last_active_at
                  ? new Date(m.last_active_at).toLocaleString()
                  : "Never"}
              </small>
            </article>
          ))}
        </div>
      </div>
    );
  if (mode === "assign") return <AssignmentPanel men={men} />;
  if (mode === "notifications") return <NotificationPanel men={men} />;
  return (
    <div className="delivery-module">
      <Title
        title={mode === "assign" ? "Order Assignment" : "Delivery Men List"}
      />
      <form
        className="delivery-filters"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label>
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, mobile or email"
          />
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {[
            "available",
            "assigned",
            "accepted",
            "picked_up",
            "on_the_way",
            "delivered",
            "cancelled",
            "failed",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <button>Filter</button>
      </form>
      <section className="delivery-table">
        <table>
          <thead>
            <tr>
              <th>Profile</th>
              <th>Delivery ID</th>
              <th>Name / Mobile</th>
              <th>Zone</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Online</th>
              <th>Active Order</th>
              <th>Rating</th>
              <th>Deliveries</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {men.map((m) => (
              <tr key={m.id}>
                <td>
                  <span className="delivery-avatar">{m.name[0]}</span>
                </td>
                <td>#{m.id.slice(0, 8)}</td>
                <td>
                  <b>{m.name}</b>
                  <small>{m.mobile}</small>
                </td>
                <td>{m.zone}</td>
                <td>
                  {m.vehicle_type}
                  <small>{m.vehicle_number}</small>
                </td>
                <td>
                  <em>{m.delivery_status}</em>
                </td>
                <td>{m.online ? "Online" : "Offline"}</td>
                <td>
                  {m.active_order_id
                    ? `#${m.active_order_id.slice(0, 8)}`
                    : "—"}
                </td>
                <td>{m.rating.toFixed(1)}</td>
                <td>{m.total_deliveries}</td>
                <td>{new Date(m.created_at).toLocaleDateString()}</td>
                <td>
                  <div className="delivery-actions">
                    <button onClick={() => setSelected(m)}>
                      <Eye />
                    </button>
                    <button
                      onClick={() =>
                        void deliveryApi
                          .update(m.id, { blocked: !m.blocked })
                          .then(load)
                      }
                    >
                      <ShieldBan />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {selected && (
        <DeliveryDetail
          man={selected}
          close={() => setSelected(null)}
          update={(data: any) =>
            void deliveryApi.update(selected.id, data).then((updated) => {
              setSelected(updated);
              load();
            })
          }
        />
      )}
    </div>
  );
}
function Title({ title }: { title: string }) {
  return (
    <header className="delivery-title">
      <h1>{title}</h1>
    </header>
  );
}
function DeliveryForm({ form, setForm }: { form: any; setForm: any }) {
  const field = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <section className="delivery-form">
      <h2>Personal & Vehicle Information</h2>
      {[
        "name",
        "mobile",
        "email",
        "password",
        "address",
        "zone",
        "vehicle_type",
        "vehicle_number",
      ].map((k) => (
        <label key={k}>
          {k.replaceAll("_", " ")}
          <input
            type={k === "password" ? "password" : "text"}
            value={form[k] || ""}
            onChange={(e) => field(k, e.target.value)}
          />
        </label>
      ))}
      <label>
        Verification Status
        <select
          value={form.verification_status}
          onChange={(event) => field("verification_status", event.target.value)}
        >
          <option value="pending">Pending verification</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <h2>Documents</h2>
      {["aadhaar", "license", "rc", "insurance"].map((k) => (
        <label key={k}>
          {k}
          <input
            value={form.documents[k]}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                documents: { ...f.documents, [k]: e.target.value },
              }))
            }
            placeholder="Document URL / number"
          />
        </label>
      ))}
      <h2>Bank Details</h2>
      {["account_name", "account_number", "ifsc"].map((k) => (
        <label key={k}>
          {k.replaceAll("_", " ")}
          <input
            value={form.bank_details[k]}
            onChange={(e) =>
              setForm((f: any) => ({
                ...f,
                bank_details: { ...f.bank_details, [k]: e.target.value },
              }))
            }
          />
        </label>
      ))}
    </section>
  );
}
function AssignmentPanel({ men }: { men: DeliveryMan[] }) {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<string>("");
  const [selectedMan, setSelectedMan] = useState<string>("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const loadOrders = () => void deliveryApi.orders().then(setOrders);
  useEffect(loadOrders, [men]);

  const assignableOrders = orders.filter(
    (order) =>
      ["placed", "pending", "processing", "assigned"].includes(order.status) &&
      (!query.trim() ||
        [
          order.id,
          order.customer_name,
          order.customer_mobile,
          order.delivery_address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  const order = orders.find((item) => item.id === selectedOrder);
  const eligibleMen = men
    .filter(
      (man) =>
        man.active &&
        !man.blocked &&
        man.verification_status === "verified" &&
        (!man.active_order_id || man.active_order_id === selectedOrder),
    )
    .sort((a, b) => Number(b.online) - Number(a.online) || b.rating - a.rating);
  const man = men.find((item) => item.id === selectedMan);

  const assign = async () => {
    if (!order || !man) return;
    setBusy(true);
    setMessage("");
    try {
      await deliveryApi.assign(order.id, man.id);
      setMessage(
        `Order #${order.id.slice(0, 8).toUpperCase()} assigned to ${man.name}.`,
      );
      setSelectedOrder("");
      setSelectedMan("");
      await deliveryApi.orders().then(setOrders);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to assign order",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="delivery-module">
      <Title title="Order Assignment" />
      <div className="assignment-guide">
        <span className={selectedOrder ? "done" : "active"}>
          1. Select order
        </span>
        <span
          className={
            selectedOrder && !selectedMan ? "active" : selectedMan ? "done" : ""
          }
        >
          2. Select delivery partner
        </span>
        <span className={selectedMan ? "active" : ""}>
          3. Confirm assignment
        </span>
      </div>
      <section className="assignment-workspace">
        <div className="assignment-column">
          <header>
            <div>
              <b>Orders awaiting assignment</b>
              <small>{assignableOrders.length} orders</small>
            </div>
          </header>
          <label className="assignment-search">
            <Search />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search order, customer or mobile"
            />
          </label>
          <div className="assignment-options">
            {assignableOrders.map((item) => (
              <button
                className={selectedOrder === item.id ? "selected" : ""}
                key={item.id}
                onClick={() => {
                  setSelectedOrder(item.id);
                  setSelectedMan("");
                  setMessage("");
                }}
              >
                <span>
                  <b>#{item.id.slice(0, 8).toUpperCase()}</b>
                  <em>{item.status}</em>
                </span>
                <strong>
                  {item.customer_name || "Customer"}
                  <small>{item.customer_mobile || "No mobile"}</small>
                </strong>
                <small>
                  {item.items.reduce(
                    (sum, product) => sum + product.quantity,
                    0,
                  )}{" "}
                  items · ₹{Number(item.total).toFixed(0)} ·{" "}
                  {item.payment_method.toUpperCase()}
                </small>
                <small>{item.delivery_address}</small>
                {item.delivery_man_id && (
                  <i>Currently assigned — select to reassign</i>
                )}
              </button>
            ))}
            {!assignableOrders.length && (
              <p className="assignment-empty">No assignable orders.</p>
            )}
          </div>
        </div>
        <div className="assignment-column">
          <header>
            <div>
              <b>Eligible delivery partners</b>
              <small>Verified partners without another active order</small>
            </div>
          </header>
          {!order ? (
            <p className="assignment-empty">Select an order first.</p>
          ) : (
            <div className="assignment-options">
              {eligibleMen.map((item) => (
                <button
                  className={selectedMan === item.id ? "selected" : ""}
                  key={item.id}
                  onClick={() => setSelectedMan(item.id)}
                >
                  <span>
                    <b>{item.name}</b>
                    <em className={item.online ? "online" : "offline"}>
                      {item.online ? "Online" : "Offline"}
                    </em>
                  </span>
                  <strong>
                    {item.zone}
                    <small>
                      {item.vehicle_type} · {item.vehicle_number}
                    </small>
                  </strong>
                  <small>
                    Rating {item.rating.toFixed(1)} · {item.total_deliveries}{" "}
                    deliveries
                  </small>
                </button>
              ))}
              {!eligibleMen.length && (
                <p className="assignment-empty">
                  No eligible delivery partners are available.
                </p>
              )}
            </div>
          )}
        </div>
        <aside className="assignment-summary">
          <h3>Assignment summary</h3>
          <div>
            <small>Order</small>
            <b>
              {order
                ? `#${order.id.slice(0, 8).toUpperCase()}`
                : "Not selected"}
            </b>
          </div>
          <div>
            <small>Customer</small>
            <b>{order?.customer_name || "—"}</b>
          </div>
          <div>
            <small>Delivery partner</small>
            <b>{man?.name || "Not selected"}</b>
          </div>
          <div>
            <small>Partner status</small>
            <b>
              {man ? `${man.online ? "Online" : "Offline"} · ${man.zone}` : "—"}
            </b>
          </div>
          <button
            disabled={!order || !man || busy}
            onClick={() => void assign()}
          >
            {busy
              ? "Assigning…"
              : order?.delivery_man_id
                ? "Confirm reassignment"
                : "Confirm assignment"}
          </button>
          {message && <p className="assignment-message">{message}</p>}
        </aside>
      </section>
    </div>
  );
}

function DeliveryDetail({
  man,
  close,
  update,
}: {
  man: DeliveryMan;
  close: () => void;
  update: (d: any) => void;
}) {
  return (
    <div className="delivery-modal">
      <article>
        <header>
          <h2>{man.name}</h2>
          <button onClick={close}>
            <X />
          </button>
        </header>
        <div className="delivery-detail-stats">
          <span>Total {man.total_deliveries}</span>
          <span>Completed {man.completed_orders}</span>
          <span>Cancelled {man.cancelled_orders}</span>
          <span>Failed {man.failed_orders}</span>
          <span>Avg {man.average_delivery_minutes} min</span>
          <span>Rating {man.rating}</span>
          <span>Verification: {man.verification_status}</span>
        </div>
        <p>
          {man.email} · {man.mobile}
        </p>
        <p>{man.address}</p>
        <p>
          {man.vehicle_type} · {man.vehicle_number} · {man.zone}
        </p>
        <h3>Documents</h3>
        <pre>{JSON.stringify(man.documents, null, 2)}</pre>
        <div className="delivery-modal-actions">
          <button
            onClick={() =>
              update({
                verification_status:
                  man.verification_status === "verified"
                    ? "pending"
                    : "verified",
              })
            }
          >
            {man.verification_status === "verified"
              ? "Mark Pending"
              : "Verify Partner"}
          </button>
          <button onClick={() => update({ active: !man.active })}>
            {man.active ? "Deactivate" : "Activate"}
          </button>
          <button onClick={() => update({ blocked: !man.blocked })}>
            {man.blocked ? "Unblock" : "Block"}
          </button>
          <button onClick={() => (window.location.href = `tel:${man.mobile}`)}>
            Call
          </button>
          <button
            onClick={async () => {
              const order = await promptToast("Order ID to assign");
              if (order)
                void deliveryApi
                  .assign(order, man.id)
                  .then(() => update({ delivery_status: "assigned" }));
            }}
          >
            Assign Order
          </button>
          <button
            onClick={() => {
              if (man.latitude != null)
                window.open(
                  `https://www.google.com/maps?q=${man.latitude},${man.longitude}`,
                  "_blank",
                );
            }}
          >
            Live Location
          </button>
          <button
            onClick={async () => {
              const message = await promptToast("Message");
              if (message)
                void deliveryApi.notify({
                  delivery_man_id: man.id,
                  kind: "individual",
                  title: "Admin message",
                  message,
                });
            }}
          >
            Message
          </button>
          <button
            onClick={async () => {
              const zone = await promptToast("Assigned zone", man.zone);
              if (zone) update({ zone });
            }}
          >
            Edit
          </button>
          <button
            onClick={async () => {
              const password = await promptToast("New password", "", true);
              if (password) void deliveryApi.resetPassword(man.id, password);
            }}
          >
            Reset Password
          </button>
          <button
            onClick={async () => {
              if (await confirmToast("Delete this delivery partner?"))
                void deliveryApi.remove(man.id).then(() => {
                  close();
                  window.location.reload();
                });
            }}
          >
            Delete
          </button>
        </div>
      </article>
    </div>
  );
}
function GenericTable({
  rows,
  mode,
  reload,
}: {
  rows: any[];
  mode: string;
  reload: () => void;
}) {
  const keys = Object.keys(rows[0] || {}).slice(0, 8);
  return (
    <section className="delivery-table">
      <table>
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replaceAll("_", " ")}</th>
            ))}
            {mode === "leaves" && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {keys.map((k) => (
                <td key={k}>{String(r[k] ?? "—")}</td>
              ))}
              {mode === "leaves" && (
                <td>
                  <button
                    onClick={() =>
                      void deliveryApi
                        .decideLeave(r.id, "approved")
                        .then(reload)
                    }
                  >
                    Approve
                  </button>
                  <button
                    onClick={() =>
                      void deliveryApi
                        .decideLeave(r.id, "rejected")
                        .then(reload)
                    }
                  >
                    Reject
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <div className="delivery-empty">No results</div>}
    </section>
  );
}
function NotificationPanel({ men }: { men: DeliveryMan[] }) {
  const [form, setForm] = useState({
      delivery_man_id: "",
      kind: "broadcast",
      title: "",
      message: "",
    }),
    [msg, setMsg] = useState("");
  return (
    <div className="delivery-module">
      <Title title="Delivery Notifications" />
      <section className="notification-form">
        <select
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          {["order", "broadcast", "emergency", "individual"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          value={form.delivery_man_id}
          onChange={(e) =>
            setForm({ ...form, delivery_man_id: e.target.value })
          }
        >
          <option value="">All delivery men</option>
          {men.map((m) => (
            <option value={m.id} key={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <input
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <textarea
          placeholder="Message"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <button
          onClick={() =>
            void deliveryApi
              .notify({
                ...form,
                delivery_man_id: form.delivery_man_id || null,
              })
              .then(() => setMsg("Notification sent."))
          }
        >
          Send Notification
        </button>
        <p>{msg}</p>
      </section>
    </div>
  );
}
