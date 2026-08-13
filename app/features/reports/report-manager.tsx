"use client";

import { ChevronDown, Download, FileText, Search } from "lucide-react";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { useEffect, useMemo, useState } from "react";
import { catalogApi } from "../catalog/catalog-api";
import type { Product } from "../catalog/types";
import { listAllOrders, orderSocketUrl, type Order } from "../order-api";

export type ReportMode =
  "orders" | "product" | "category" | "amount" | "delivery";
type ReportRow = Record<string, string | number>;

const titles: Record<ReportMode, string> = {
  orders: "Orders Report",
  product: "Product Sales Report",
  category: "Category Wise Sales Report",
  amount: "Amount Wise Sales Report",
  delivery: "Delivery Status Wise Report",
};
const iso = (date: Date) => date.toISOString().slice(0, 10);
const money = (value: number) =>
  `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ReportManager({ mode }: { mode: ReportMode }) {
  const today = new Date(),
    weekAgo = new Date(Date.now() - 7 * 86400000);
  const [from, setFrom] = useState(iso(weekAgo)),
    [to, setTo] = useState(iso(today)),
    [query, setQuery] = useState(""),
    [payment, setPayment] = useState(""),
    [status, setStatus] = useState(""),
    [sort, setSort] = useState("desc");
  const [orders, setOrders] = useState<Order[]>([]),
    [products, setProducts] = useState<Record<string, Product>>({}),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const load = async () => {
    try {
      const data = await listAllOrders();
      setOrders(data);
      const ids = [
        ...new Set(
          data.flatMap((order) => order.items.map((item) => item.product_id)),
        ),
      ];
      const list = await Promise.all(
        ids.map((id) => catalogApi.product(id).catch(() => null)),
      );
      setProducts(
        Object.fromEntries(
          list
            .filter((item): item is Product => Boolean(item))
            .map((item) => [item.id, item]),
        ),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load report",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
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
        if (event.data !== "pong") void load();
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
  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const date = order.created_at.slice(0, 10),
          text = [
            order.id,
            order.customer_name,
            ...order.items.map((item) => item.product_name),
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        return (
          (!from || date >= from) &&
          (!to || date <= to) &&
          (!payment || order.payment_status === payment) &&
          (!status || order.status === status) &&
          (mode !== "orders" || !query.trim() || text.includes(query.trim().toLowerCase()))
        );
      }),
    [orders, from, to, payment, status, query, mode],
  );
  const rows = useMemo<ReportRow[]>(() => {
    if (mode === "orders")
      return filtered.map((order, index) => ({
        "S/L": index + 1,
        "Order ID": `#${order.id.slice(0, 8).toUpperCase()}`,
        "Placed On": new Date(order.created_at).toLocaleDateString("en-IN"),
        Customer: order.customer_name || "Customer",
        Items: order.items.reduce((sum, item) => sum + item.quantity, 0),
        "Payment Status": order.payment_status,
        "Delivery Status": order.status.replaceAll("_", " "),
        Amount: Number(order.total),
      }));
    if (mode === "product") {
      const map = new Map<
        string,
        { name: string; quantity: number; revenue: number }
      >();
      filtered
        .filter((order) => order.status !== "cancelled")
        .forEach((order) =>
          order.items.forEach((item) => {
            const current = map.get(item.product_id) || {
              name: item.product_name,
              quantity: 0,
              revenue: 0,
            };
            current.quantity += item.quantity;
            current.revenue += Number(item.line_total);
            map.set(item.product_id, current);
          }),
        );
      return [...map.values()].map((item, index) => ({
        "S/L": index + 1,
        "Product Name": item.name,
        "Total Sales": item.quantity,
        Revenue: item.revenue,
      }));
    }
    if (mode === "category") {
      const map = new Map<string, { quantity: number; revenue: number }>();
      filtered
        .filter((order) => order.status !== "cancelled")
        .forEach((order) =>
          order.items.forEach((item) => {
            const category =
              products[item.product_id]?.category_l1 || "Uncategorized",
              current = map.get(category) || { quantity: 0, revenue: 0 };
            current.quantity += item.quantity;
            current.revenue += Number(item.line_total);
            map.set(category, current);
          }),
        );
      return [...map.entries()].map(([name, item], index) => ({
        "S/L": index + 1,
        "Category Name": name,
        "Total Sales": item.quantity,
        Revenue: item.revenue,
      }));
    }
    if (mode === "amount") {
      const map = new Map<string, number>();
      filtered
        .filter((order) => order.status !== "cancelled")
        .forEach((order) => {
          const date = order.created_at.slice(0, 10);
          map.set(date, (map.get(date) || 0) + Number(order.total));
        });
      return [...map.entries()].map(([date, total], index) => ({
        "S/L": index + 1,
        Date: new Date(`${date}T00:00:00`).toLocaleDateString("en-IN"),
        "Total Sales": total,
      }));
    }
    const map = new Map<string, { orders: number; amount: number }>();
    filtered.forEach((order) => {
      const key = order.status.replaceAll("_", " "),
        current = map.get(key) || { orders: 0, amount: 0 };
      current.orders++;
      current.amount += Number(order.total);
      map.set(key, current);
    });
    return [...map.entries()].map(([name, item], index) => ({
      "S/L": index + 1,
      "Delivery Status": name,
      "Total Orders": item.orders,
      "Order Amount": item.amount,
    }));
  }, [mode, filtered, products]);
  const sorted = useMemo<ReportRow[]>(
    () =>
      [...rows]
        .filter((row) => (mode !== "product" && mode !== "category") || !query.trim() || Object.values(row).join(" ").toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => {
          const key =
            mode === "orders"
              ? "Amount"
              : mode === "delivery"
                ? "Total Orders"
                : "Total Sales";
          return (
            (Number(a[key] || 0) - Number(b[key] || 0)) *
            (sort === "asc" ? 1 : -1)
          );
        })
        .map((row, index): ReportRow => ({ ...row, "S/L": index + 1 })),
    [rows, sort, mode, query],
  );
  const totalAmount = filtered.reduce(
    (sum, order) => sum + Number(order.total),
    0,
  );
  const columns = sorted.length
    ? Object.keys(sorted[0])
    : mode === "orders"
      ? [
        "S/L",
        "Order ID",
        "Placed On",
        "Customer",
        "Items",
        "Payment Status",
        "Delivery Status",
        "Amount",
      ]
      : mode === "product"
        ? ["S/L", "Product Name", "Total Sales", "Revenue"]
        : mode === "category"
          ? ["S/L", "Category Name", "Total Sales", "Revenue"]
          : mode === "amount"
            ? ["S/L", "Date", "Total Sales"]
            : ["S/L", "Delivery Status", "Total Orders", "Order Amount"];
  const exportExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(sorted);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Report");
    XLSX.writeFile(book, `${mode}-report-${from}-${to}.xlsx`);
  };
  const exportPdf = () => {
    const pdf = new jsPDF();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text(titles[mode], 14, 18);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.text(`${from} to ${to}`, 14, 25);
    let y = 34;
    sorted.forEach((row, index) => {
      const line = columns
        .slice(1)
        .map((column) => `${column}: ${row[column]}`)
        .join(" | ");
      pdf.text(pdf.splitTextToSize(`${index + 1}. ${line}`, 180), 14, y);
      y += 8;
      if (y > 280) {
        pdf.addPage();
        y = 18;
      }
    });
    pdf.save(`${mode}-report-${from}-${to}.pdf`);
  };
  return (
    <div className="reports-module">
      <header>
        <h1>{titles[mode]}</h1>
      </header>
      <section>
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="report-date">
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <span>to</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
          {mode === "orders" && (
            <>
              <select
                value={payment}
                onChange={(event) => setPayment(event.target.value)}
              >
                <option value="">Payment Status</option>
                <option value="pending">Unpaid</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">Delivery Status</option>
                <option value="placed">Order Placed</option>
                <option value="processing">Processing</option>
                <option value="assigned">Assigned</option>
                <option value="accepted">Accepted</option>
                <option value="picked_up">Picked Up</option>
                <option value="on_the_way">On the Way</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </>
          )}
          {/* {(mode === "product" || mode === "category") && (
            <label>
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
              />
            </label>
          )} */}
          {mode !== "delivery" && (
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="desc">High → Low</option>
              <option value="asc">Low → High</option>
            </select>
          )}
          {(mode === "orders" || mode === "product" || mode === "category") && (
            <label className="report-search">
              <Search />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
              />
              {query && (
                <button
                  type="button"
                  className="report-search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>
          )}
          <div className="report-export-wrapper">
            <span className="report-export-icon">
              <Download size={18} />
            </span>

            <select
              className="report-export-select"
              defaultValue=""
              onChange={(e) => {
                const value = e.target.value;

                if (value === "excel") {
                  exportExcel();
                }

                if (value === "pdf") {
                  exportPdf();
                }

                e.target.value = "";
              }}
            >
              <option value="" disabled>
                Export
              </option>

              <option value="excel">
                Excel
              </option>

              <option value="pdf">
                PDF
              </option>
            </select>
          </div>
          {/* <div className="report-export">
            <button
              type="button"
              className="report-export-trigger"
              onClick={() => setExportOpen((prev) => !prev)}
            >
              <Download size={17} />
              Export
              <ChevronDown size={15} />
            </button>

            {exportOpen && (
              <div className="report-export-menu">
                <button type="button" onClick={exportExcel}>
                  <Download size={15} />
                  Excel
                </button>

                <button type="button" onClick={exportPdf}>
                  <FileText size={15} />
                  PDF
                </button>
              </div>
            )}
          </div> */}
          <aside>
            <span>{mode === "delivery" ? "Total Orders" : "Total Amount"}</span>
            <b>{mode === "delivery" ? filtered.length : money(totalAmount)}</b>
          </aside>
        </form>
        {loading ? (
          <div className="report-state">Loading report...</div>
        ) : error ? (
          <div className="report-state error">{error}</div>
        ) : (
          <div className="report-table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length ? (
                  sorted.map((row, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column}>
                          {[
                            "Amount",
                            "Revenue",
                            "Total Sales",
                            "Order Amount",
                          ].includes(column) &&
                            typeof row[column] === "number" &&
                            column !== "Total Sales"
                            ? money(Number(row[column]))
                            : String(row[column])}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length}>No results</td>
                  </tr>
                )}
              </tbody>
            </table>
            <footer>
              Showing {sorted.length ? 1 : "-"} - {sorted.length} of{" "}
              {sorted.length} results
            </footer>
          </div>
        )}
      </section>
    </div>
  );
}
