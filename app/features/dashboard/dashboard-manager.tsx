"use client";

import { AlertTriangle, ArrowRight, IndianRupee, Package, ShoppingBag, Truck, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { catalogApi } from "../catalog/catalog-api";
import type { Product } from "../catalog/types";
import { customerAdminApi, type AdminCustomer } from "../customers/customer-admin-api";
import { deliveryApi } from "../delivery/delivery-api";
import { listAllOrders, type Order } from "../order-api";

const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const finalStatuses = new Set(["delivered", "cancelled", "failed"]);

export default function DashboardManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [delivery, setDelivery] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([
      listAllOrders(),
      catalogApi.products("", "", "", 1, 0),
      customerAdminApi.list(),
      deliveryApi.dashboard(),
    ]).then(([orderRows, productRows, customerRows, deliveryStats]) => {
      setOrders(orderRows);
      setProducts(productRows.items);
      setCustomers(customerRows);
      setDelivery(deliveryStats);
    }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const analytics = useMemo(() => {
    const validOrders = orders.filter((order) => !["cancelled", "failed"].includes(order.status));
    const revenue = validOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const todayKey = new Date().toDateString();
    const todayOrders = validOrders.filter((order) => new Date(order.created_at).toDateString() === todayKey);
    const activeOrders = orders.filter((order) => !finalStatuses.has(order.status)).length;
    const lowStock = products.filter((product) => product.is_active && product.inventory_qty <= 10);
    const statuses = orders.reduce<Record<string, number>>((result, order) => {
      result[order.status] = (result[order.status] ?? 0) + 1;
      return result;
    }, {});
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    validOrders.forEach((order) => order.items.forEach((item) => {
      const current = productSales.get(item.product_id) ?? { name: item.product_name, quantity: 0, revenue: 0 };
      current.quantity += item.quantity;
      current.revenue += Number(item.line_total);
      productSales.set(item.product_id, current);
    }));
    const topProducts = [...productSales.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - offset));
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      const dayOrders = validOrders.filter((order) => {
        const created = new Date(order.created_at);
        return created >= date && created < next;
      });
      return { label: date.toLocaleDateString("en-IN", { weekday: "short" }), revenue: dayOrders.reduce((sum, order) => sum + Number(order.total), 0), orders: dayOrders.length };
    });
    return { revenue, todayRevenue: todayOrders.reduce((sum, order) => sum + Number(order.total), 0), todayOrders: todayOrders.length, activeOrders, lowStock, statuses, topProducts, days };
  }, [orders, products]);

  if (loading) return <div className="dashboard-state">Loading store analytics…</div>;
  if (error) return <div className="dashboard-state error">{error}</div>;
  const chartMax = Math.max(1, ...analytics.days.map((day) => day.revenue));
  const fulfillment = orders.length ? Math.round(((analytics.statuses.delivered ?? 0) / orders.length) * 100) : 0;

  return <div className="analytics-dashboard">
    <header><div><small>STORE OVERVIEW</small><h1>Dashboard</h1><p>Live business performance and operational insights.</p></div><span>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span></header>
    <section className="dashboard-kpis">
      <article><i className="revenue"><IndianRupee /></i><span><small>Total revenue</small><strong>{money(analytics.revenue)}</strong><em>{money(analytics.todayRevenue)} today</em></span></article>
      <article><i className="orders"><ShoppingBag /></i><span><small>Total orders</small><strong>{orders.length}</strong><em>{analytics.todayOrders} today · {analytics.activeOrders} active</em></span></article>
      <article><i className="customers"><Users /></i><span><small>Customers</small><strong>{customers.length}</strong><em>{customers.filter((customer) => customer.active).length} active accounts</em></span></article>
      <article><i className="stock"><Package /></i><span><small>Products</small><strong>{products.length}</strong><em className={analytics.lowStock.length ? "warn" : ""}>{analytics.lowStock.length} low stock</em></span></article>
    </section>
    <section className="dashboard-main-grid">
      <article className="dashboard-card sales-chart"><header><div><h2>Sales overview</h2><p>Revenue for the last 7 days</p></div><strong>{money(analytics.days.reduce((sum, day) => sum + day.revenue, 0))}</strong></header><div className="bar-chart">{analytics.days.map((day) => <div key={day.label}><span><i style={{ height: `${Math.max(day.revenue ? 8 : 2, (day.revenue / chartMax) * 100)}%` }} title={`${money(day.revenue)} · ${day.orders} orders`} /></span><b>{day.label}</b><small>{day.orders}</small></div>)}</div></article>
      <article className="dashboard-card status-card"><header><div><h2>Order status</h2><p>Current order distribution</p></div><b>{fulfillment}% delivered</b></header><div>{Object.entries(analytics.statuses).sort((a, b) => b[1] - a[1]).map(([status, count]) => <span key={status}><i className={status} /><b>{status.replaceAll("_", " ")}</b><strong>{count}</strong><em>{orders.length ? Math.round(count / orders.length * 100) : 0}%</em></span>)}</div></article>
    </section>
    <section className="dashboard-lists">
      <article className="dashboard-card"><header><div><h2>Recent orders</h2><p>Latest customer purchases</p></div><Link href="/admin/orders">View all <ArrowRight /></Link></header><div className="recent-orders">{orders.slice(0, 6).map((order) => <div key={order.id}><span><b>#{order.id.slice(0, 8).toUpperCase()}</b><small>{order.customer_name || "Customer"} · {new Date(order.created_at).toLocaleDateString("en-IN")}</small></span><em className={order.status}>{order.status.replaceAll("_", " ")}</em><strong>{money(Number(order.total))}</strong></div>)}</div></article>
      <article className="dashboard-card"><header><div><h2>Top products</h2><p>Best sellers by units</p></div><Link href="/admin/reports/product-sales">Report <ArrowRight /></Link></header><div className="top-products">{analytics.topProducts.map((product, index) => <div key={product.name}><i>{index + 1}</i><span><b>{product.name}</b><small>{product.quantity} units sold</small></span><strong>{money(product.revenue)}</strong></div>)}{!analytics.topProducts.length && <p>No sales data yet.</p>}</div></article>
      <article className="dashboard-card"><header><div><h2>Low stock alerts</h2><p>Products with 10 units or fewer</p></div><Link href="/admin/products">Manage <ArrowRight /></Link></header><div className="low-stock-list">{analytics.lowStock.slice(0, 6).map((product) => <div key={product.id}><AlertTriangle /><span><b>{product.name}</b><small>{product.category_l1}</small></span><strong>{product.inventory_qty} {product.unit}</strong></div>)}{!analytics.lowStock.length && <p>All active products have healthy stock.</p>}</div></article>
    </section>
    <section className="dashboard-operations">
      <article><Truck /><span><small>Delivery partners</small><strong>{delivery.total ?? 0}</strong></span></article><article><i /><span><small>Online now</small><strong>{delivery.active ?? 0}</strong></span></article><article><Package /><span><small>Today’s deliveries</small><strong>{delivery.today_deliveries ?? 0}</strong></span></article><article><IndianRupee /><span><small>Delivery earnings</small><strong>{money(delivery.today_earnings ?? 0)}</strong></span></article>
    </section>
    <nav className="dashboard-quick-links"><b>Quick actions</b><Link href="/admin/products/new">Add product</Link><Link href="/admin/orders">Manage orders</Link><Link href="/admin/pos">Open POS</Link><Link href="/admin/delivery-men/assignments">Assign delivery</Link><Link href="/admin/reports/orders">View reports</Link></nav>
  </div>;
}
