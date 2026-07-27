"use client";

import Link from "next/link";
import { CalendarDays, CreditCard, MapPin, PackageCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getAuthSession } from "../features/auth-client";
import { listMyOrders, type Order } from "../features/order-api";
import { refundApi } from "../features/refund-api";
import { notify, promptToast } from "../features/notifications";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refundedItems, setRefundedItems] = useState<Set<string>>(new Set());
  const [refundEnabled, setRefundEnabled] = useState(false);
  useEffect(() => {
    if (!getAuthSession()) { window.location.replace("/login?next=/orders"); return; }
    void Promise.all([listMyOrders(), refundApi.mine(), refundApi.customerConfig()]).then(([orders,refunds,config]) => { setOrders(orders); setRefundedItems(new Set(refunds.map(item=>item.order_item_id))); setRefundEnabled(config.enabled); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load orders")).finally(() => setLoading(false));
  }, []);
  return <main className="commerce-page orders-page"><div className="orders-shell">
    <header><div><small>SJS FRESH MARKET</small><h1>My Orders</h1><p>Track and review your purchases.</p></div><Link href="/products">Continue shopping</Link></header>
    {loading ? <div className="orders-state">Loading orders...</div> : error ? <div className="orders-state error">{error}</div> : !orders.length ? <div className="orders-empty"><PackageCheck/><h2>No orders yet</h2><p>Your placed orders will appear here.</p><Link href="/products">Browse products</Link></div> :
      <section className="orders-list">{orders.map((order) => <article key={order.id}>
        <header><div className="order-identity"><small>ORDER NUMBER</small><strong>#{order.id.slice(0, 8).toUpperCase()}</strong></div><div className="order-date"><CalendarDays /><span><small>ORDERED ON</small><strong>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></span></div><span className={`order-status ${order.status}`}>{order.status.replaceAll("_", " ")}</span></header>
        <div className="order-lines">{order.items.map((item) => <div key={item.id}><span><b>{item.product_name}</b><small>{item.quantity} × ₹{Number(item.unit_price).toFixed(0)} each</small></span><strong>₹{Number(item.line_total).toFixed(0)}</strong>{refundEnabled&&<button className="request-refund" disabled={refundedItems.has(item.id)} onClick={async()=>{const reason=await promptToast("Why are you requesting a refund?");if(!reason)return;void refundApi.create(item.id,reason).then(()=>{setRefundedItems(current=>new Set(current).add(item.id));notify.success("Refund request submitted")}).catch(reason=>notify.error(reason,"Refund request failed"))}}>{refundedItems.has(item.id)?"Refund requested":"Request refund"}</button>}</div>)}</div>
        <footer><span className="order-delivery"><MapPin /><span><small>DELIVER TO</small>{order.delivery_address}</span></span><span className="order-payment"><CreditCard /><span><small>PAYMENT</small><b>{order.payment_method.toUpperCase()}</b><em className={order.payment_status}>{order.payment_status}</em></span></span><strong><small>ORDER TOTAL</small>₹{Number(order.total).toFixed(0)}</strong></footer>
      </article>)}</section>}
  </div></main>;
}
