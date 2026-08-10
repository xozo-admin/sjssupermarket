"use client";

import { AlertTriangle, ArrowRight, IndianRupee, Package, ShoppingBag, Truck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cachedDashboard, getDashboard, type DashboardData } from "./dashboard-api";

const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function DashboardManager() {
  const [data, setData] = useState<DashboardData | null>(cachedDashboard);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState("");

  useEffect(() => {
    void getDashboard().then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="dashboard-state">Loading store analytics…</div>;
  if (error) return <div className="dashboard-state error">{error}</div>;
  if (!data) return null;

  const { summary, order_statuses: statuses, sales_days: days, delivery } = data;
  const chartMax = Math.max(1, ...days.map((day) => Number(day.revenue)));
  const fulfillment = summary.total_orders ? Math.round(((statuses.delivered ?? 0) / summary.total_orders) * 100) : 0;

  return <div className="analytics-dashboard">
    <header><div><small>STORE OVERVIEW</small><h1>Dashboard</h1><p>Live business performance and operational insights.</p></div><span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></header>
    <section className="dashboard-kpis">
      <article><i className="revenue"><IndianRupee /></i><span><small>Total revenue</small><strong>{money(Number(summary.revenue))}</strong><em>{money(Number(summary.today_revenue))} today</em></span></article>
      <article><i className="orders"><ShoppingBag /></i><span><small>Total orders</small><strong>{summary.total_orders}</strong><em>{summary.today_orders} today · {summary.active_orders} active</em></span></article>
      <article><i className="customers"><Users /></i><span><small>Customers</small><strong>{summary.customers}</strong><em>{summary.active_customers} active accounts</em></span></article>
      <article><i className="stock"><Package /></i><span><small>Products</small><strong>{summary.products}</strong><em className={summary.low_stock ? "warn" : ""}>{summary.low_stock} low stock</em></span></article>
    </section>
    <section className="dashboard-main-grid">
      <article className="dashboard-card sales-chart"><header><div><h2>Sales overview</h2><p>Revenue for the last 7 days</p></div><strong>{money(days.reduce((sum, day) => sum + Number(day.revenue), 0))}</strong></header><div className="bar-chart">{days.map((day) => <div key={day.date}><span><i style={{ height: `${Math.max(Number(day.revenue) ? 8 : 2, (Number(day.revenue) / chartMax) * 100)}%` }} title={`${money(Number(day.revenue))} · ${day.orders} orders`} /></span><b>{day.label}</b><small>{day.orders}</small></div>)}</div></article>
      <article className="dashboard-card status-card"><header><div><h2>Order status</h2><p>Current order distribution</p></div><b>{fulfillment}% delivered</b></header><div>{Object.entries(statuses).sort((a, b) => b[1] - a[1]).map(([status, count]) => <span key={status}><i className={status} /><b>{status.replaceAll("_", " ")}</b><strong>{count}</strong><em>{summary.total_orders ? Math.round(count / summary.total_orders * 100) : 0}%</em></span>)}</div></article>
    </section>
    <section className="dashboard-lists">
      <article className="dashboard-card"><header><div><h2>Recent orders</h2><p>Latest customer purchases</p></div><Link href="/admin/orders">View all <ArrowRight /></Link></header><div className="recent-orders">{data.recent_orders.map((order) => <div key={order.id}><span><b>#{order.id.slice(0, 8).toUpperCase()}</b><small>{order.customer_name || "Customer"} · {new Date(order.created_at).toLocaleDateString("en-IN")}</small></span><em className={order.status}>{order.status.replaceAll("_", " ")}</em><strong>{money(Number(order.total))}</strong></div>)}</div></article>
      <article className="dashboard-card"><header><div><h2>Top products</h2><p>Best sellers by units</p></div><Link href="/admin/reports/product-sales">Report <ArrowRight /></Link></header><div className="top-products">{data.top_products.map((product, index) => <div key={product.product_id}><i>{index + 1}</i><span><b>{product.name}</b><small>{product.quantity} units sold</small></span><strong>{money(Number(product.revenue))}</strong></div>)}{!data.top_products.length && <p>No sales data yet.</p>}</div></article>
      <article className="dashboard-card"><header><div><h2>Low stock alerts</h2><p>Products with 10 units or fewer</p></div><Link href="/admin/products">Manage <ArrowRight /></Link></header><div className="low-stock-list">{data.low_stock_products.map((product) => <div key={product.id}><AlertTriangle /><span><b>{product.name}</b><small>{product.category_l1}</small></span><strong>{product.inventory_qty} {product.unit}</strong></div>)}{!data.low_stock_products.length && <p>All active products have healthy stock.</p>}</div></article>
    </section>
    <section className="dashboard-operations">
      <article><Truck /><span><small>Delivery partners</small><strong>{delivery.total ?? 0}</strong></span></article><article><i /><span><small>Online now</small><strong>{delivery.active ?? 0}</strong></span></article><article><Package /><span><small>Today’s deliveries</small><strong>{delivery.today_deliveries ?? 0}</strong></span></article><article><IndianRupee /><span><small>Delivery earnings</small><strong>{money(Number(delivery.today_earnings ?? 0))}</strong></span></article>
    </section>
    <nav className="dashboard-quick-links"><b>Quick actions</b><Link href="/admin/products/new">Add product</Link><Link href="/admin/orders">Manage orders</Link><Link href="/admin/pos">Open POS</Link><Link href="/admin/delivery-men/assignments">Assign delivery</Link><Link href="/admin/reports/orders">View reports</Link></nav>
  </div>;
}
