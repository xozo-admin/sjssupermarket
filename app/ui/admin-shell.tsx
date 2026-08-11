"use client";

import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { getAuthSession, logout } from "../features/auth-client";

const AdminPageLoader = () => (
  <div className="admin-page-loader" role="status" aria-live="polite">
    <span />
    <span />
    <span />
    <p>Loading page...</p>
  </div>
);

const dynamicAdminPage = <Props extends object>(
  loader: () => Promise<{ default: ComponentType<Props> }>,
) =>
  dynamic(loader, { loading: AdminPageLoader });

const DashboardManager = dynamicAdminPage(() => import("../features/dashboard/dashboard-manager"));
const CategoryManager = dynamicAdminPage(() => import("../features/categories/category-manager"));
const HeroManager = dynamicAdminPage(() => import("../features/homepage/hero-manager"));
const EntityManager = dynamicAdminPage(() => import("../features/catalog/entity-manager"));
const ProductManager = dynamicAdminPage(() => import("../features/catalog/product-manager"));
const AddProductPage = dynamicAdminPage(() => import("../features/catalog/add-product-page"));
const ProductImportWidget = dynamicAdminPage(() => import("../features/catalog/product-import-widget"));
const OrderManager = dynamicAdminPage(() => import("../features/orders/order-manager"));
const RefundManager = dynamicAdminPage(() => import("../features/refunds/refund-manager"));
const CustomerManager = dynamicAdminPage(() => import("../features/customers/customer-manager"));
const DeliveryManager = dynamicAdminPage(() => import("../features/delivery/delivery-manager"));
const ReportManager = dynamicAdminPage(() => import("../features/reports/report-manager"));
const PosManager = dynamicAdminPage(() => import("../features/pos/pos-manager"));
const StaffManager = dynamicAdminPage(() => import("../features/staff-manager"));
const SupplierManager = dynamicAdminPage(() => import("../features/supplier-manager"));
const ShippingZoneManager = dynamicAdminPage(() => import("../features/shipping/shipping-zone-manager"));

type IconName =
  | "dashboard"
  | "box"
  | "cart"
  | "stock"
  | "refund"
  | "wallet"
  | "users"
  | "truck"
  | "tag"
  | "page"
  | "blog"
  | "media"
  | "map"
  | "report"
  | "query"
  | "store"
  | "eye"
  | "shield"
  | "settings"
  | "card"
  | "login"
  | "language"
  | "tools";
type MenuItem = { label: string; icon: IconName; children?: string[]; disabled?: boolean; permission?: string };
type MenuGroup = { title?: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    items: [
      { label: "Dashboard", icon: "dashboard", permission: "dashboard.view" },
      {
        label: "Products",
        icon: "box",
        permission: "catalog.manage",
        children: [
          "All products",
          "All categories",
          "All variants",
          "All brands",
          "All units",
        ],
      },
      { label: "Orders", icon: "cart", permission: "orders.manage" },
      { label: "POS Billing", icon: "card", permission: "pos.manage" },
      /* Temporarily hidden sidebar options.
      { label: "Stocks", icon: "stock" },
      {
        label: "Refunds",
        icon: "refund",
        children: [
          "Refund Configurations",
          "Refund Requests",
          "Approved Refunds",
          "Rejected Refunds",
        ],
      },
      { label: "Rewards & Wallet", icon: "wallet" },
      */
    ],
  },
  {
    title: "Users",
    items: [
      { label: "Customers", icon: "users", permission: "customers.manage" },
      { label: "Staff & RBAC", icon: "shield", permission: "staff.manage" },
      {
        label: "Delivery Men",
        icon: "truck",
        permission: "delivery.manage",
        children: [
          "Delivery Dashboard",
          "Delivery Men List",
          "Add Delivery Man",
          "Live Tracking",
          "Order Assignment",
          "Attendance",
          "Earnings",
          "Leave Requests",
          "Delivery Reports",
          "Activity Logs",
          "Delivery Notifications",
          "Delivery Settings",
        ],
      },
    ],
  },
  {
    title: "Fulfillment",
    items: [
      // Temporarily hidden. Keep SupplierManager and its route implementation for later use.
      // { label: "Supplier Orders", icon: "store", permission: "suppliers.manage" },
      { label: "Shipping Zones", icon: "map", permission: "settings.manage" },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Reports",
        icon: "report",
        permission: "reports.view",
        children: [
          "Orders report",
          "Product sales",
          "Category wise sales",
          "Sales amount report",
          "Delivery status report",
        ],
      },
      { label: "Queries", icon: "query", permission: "reports.view" },
    ],
  },
  {
    title: "Appearance",
    items: [
      { label: "Grocery", icon: "store", permission: "settings.manage", children: ["Home page"] },
      /* Temporarily hidden sidebar option.
      {
        label: "Common Outlook",
        icon: "eye",
        disabled: true,
        children: [
          "Product page",
          "Product details",
          "About us",
          "Header",
          "Footer",
          "Themes",
        ],
      },
      */
    ],
  },
  /* Temporarily hidden Settings sidebar section.
  {
    title: "Settings",
    items: [
      { label: "Roles & Permission", icon: "shield" },
      {
        label: "System Settings",
        icon: "settings",
        children: [
          "General settings",
          "Auth settings",
          "Invoice settings",
          "OTP settings",
          "Order settings",
          "SMTP settings",
        ],
      },
      { label: "Payment Methods", icon: "card" },
      { label: "Social Media Login", icon: "login" },
      { label: "Multilingual Settings", icon: "language" },
      { label: "Utilities", icon: "tools" },
    ],
  },
  */
];

const routes: Record<string, string> = {
  Dashboard: "/admin/dashboard",
  "All products": "/admin/products",
  "All categories": "/admin/products/categories",
  "All variants": "/admin/products/variants",
  "All brands": "/admin/products/brands",
  "All units": "/admin/products/units",
  Orders: "/admin/orders",
  "POS Billing": "/admin/pos",
  "Staff & RBAC": "/admin/staff",
  "Supplier Orders": "/admin/suppliers",
  Stocks: "/admin/stocks",
  Refunds: "/admin/refunds",
  "Refund Configurations": "/admin/refunds/configuration",
  "Refund Requests": "/admin/refunds/requests",
  "Approved Refunds": "/admin/refunds/approved",
  "Rejected Refunds": "/admin/refunds/rejected",
  "Rewards & Wallet": "/admin/rewards-wallet",
  Customers: "/admin/customers",
  "Delivery Dashboard": "/admin/delivery-men/dashboard",
  "Delivery Men List": "/admin/delivery-men",
  "Add Delivery Man": "/admin/delivery-men/new",
  "Live Tracking": "/admin/delivery-men/tracking",
  "Order Assignment": "/admin/delivery-men/assignments",
  Attendance: "/admin/delivery-men/attendance",
  Earnings: "/admin/delivery-men/earnings",
  "Leave Requests": "/admin/delivery-men/leaves",
  "Delivery Reports": "/admin/delivery-men/reports",
  "Activity Logs": "/admin/delivery-men/logs",
  "Delivery Notifications": "/admin/delivery-men/notifications",
  "Delivery Settings": "/admin/delivery-men/settings",
  "Shipping Zones": "/admin/fulfillment/shipping-zones",
  "Orders report": "/admin/reports/orders",
  "Product sales": "/admin/reports/product-sales",
  "Category wise sales": "/admin/reports/category-sales",
  "Sales amount report": "/admin/reports/sales-amount",
  "Delivery status report": "/admin/reports/delivery-status",
  Queries: "/admin/queries",
  "Home page": "/admin/appearance/home",
  "Product page": "/admin/appearance/product-page",
  "Product details": "/admin/appearance/product-details",
  "About us": "/admin/appearance/about",
  Header: "/admin/appearance/header",
  Footer: "/admin/appearance/footer",
  Themes: "/admin/appearance/themes",
  "Roles & Permission": "/admin/settings/roles-permissions",
  "General settings": "/admin/settings/general",
  "Auth settings": "/admin/settings/auth",
  "Invoice settings": "/admin/settings/invoice",
  "OTP settings": "/admin/settings/otp",
  "Order settings": "/admin/settings/orders",
  "SMTP settings": "/admin/settings/smtp",
  "Payment Methods": "/admin/settings/payment-methods",
  "Social Media Login": "/admin/settings/social-login",
  "Multilingual Settings": "/admin/settings/multilingual",
  Utilities: "/admin/settings/utilities",
};

const permissionRoutes: Array<[path: string, permission: string]> = [
  ["/admin/delivery-men", "delivery.manage"],
  ["/admin/products", "catalog.manage"],
  ["/admin/suppliers", "suppliers.manage"],
  ["/admin/customers", "customers.manage"],
  ["/admin/reports", "reports.view"],
  ["/admin/queries", "reports.view"],
  ["/admin/orders", "orders.manage"],
  ["/admin/staff", "staff.manage"],
  ["/admin/pos", "pos.manage"],
  ["/admin/fulfillment", "settings.manage"],
  ["/admin/appearance", "settings.manage"],
  ["/admin/settings", "settings.manage"],
  ["/admin/dashboard", "dashboard.view"],
];

const permissionHomes: Array<[permission: string, path: string]> = [
  ["dashboard.view", "/admin/dashboard"],
  ["pos.manage", "/admin/pos"],
  ["orders.manage", "/admin/orders"],
  ["catalog.manage", "/admin/products"],
  ["suppliers.manage", "/admin/suppliers"],
  ["customers.manage", "/admin/customers"],
  ["delivery.manage", "/admin/delivery-men/dashboard"],
  ["reports.view", "/admin/reports/orders"],
  ["staff.manage", "/admin/staff"],
  ["settings.manage", "/admin/appearance/home"],
];

function labelFromPath(pathname: string): string {
  if (pathname === "/admin/products/categories/new") return "Add category";
  if (pathname === "/admin/products/new") return "Add product";
  if (/^\/admin\/products\/[^/]+\/edit$/.test(pathname)) return "Add product";
  return (
    Object.entries(routes).find(([, path]) => path === pathname)?.[0] ??
    "Dashboard"
  );
}

function parentFromPath(pathname: string): string | null {
  if (pathname.startsWith("/admin/products")) return "Products";
  if (pathname.startsWith("/admin/delivery-men")) return "Delivery Men";
  if (pathname.startsWith("/admin/reports")) return "Reports";
  if (pathname.startsWith("/admin/refunds")) return "Refunds";
  if (pathname === "/admin/appearance/home") return "Grocery";
  if (pathname.startsWith("/admin/appearance")) return "Common Outlook";
  if (
    [
      "/admin/settings/general",
      "/admin/settings/auth",
      "/admin/settings/invoice",
      "/admin/settings/otp",
      "/admin/settings/orders",
      "/admin/settings/smtp",
    ].includes(pathname)
  )
    return "System Settings";
  return null;
}

function Chevron({ open }: { open: boolean }) {
  return <span className={`chevron ${open ? "open" : ""}`}>›</span>;
}

function MenuIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    box: (
      <>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" />
        <path d="M12 11v10" />
      </>
    ),
    cart: (
      <>
        <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="17" cy="20" r="1" />
      </>
    ),
    stock: (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
        <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
      </>
    ),
    refund: (
      <>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 6 6v4" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h14a2 2 0 0 1 2 2v11H4a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h12" />
        <path d="M16 12h4" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="4" />
        <path d="M2 21v-2a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v2" />
        <path d="M16 4a4 4 0 0 1 0 8m2 2a6 6 0 0 1 4 5v2" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="18" cy="19" r="2" />
      </>
    ),
    tag: (
      <>
        <path d="M20 13 11 22l-9-9V4h9l9 9Z" />
        <circle cx="7" cy="9" r="1.5" />
      </>
    ),
    page: (
      <>
        <path d="M6 2h8l5 5v15H6z" />
        <path d="M14 2v6h5M9 13h6M9 17h6" />
      </>
    ),
    blog: (
      <>
        <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
        <path d="m14 6 4 4" />
      </>
    ),
    media: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m4 17 5-5 4 4 2-2 5 4" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    report: (
      <>
        <path d="M5 21V10M12 21V3M19 21v-6" />
      </>
    ),
    query: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.4-4.4M9 9a2.2 2.2 0 1 1 3 2c-1 .5-1 1-1 2M11 16h.01" />
      </>
    ),
    store: (
      <>
        <path d="M3 9 5 3h14l2 6M5 13v8h14v-8" />
        <path d="M3 9a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    card: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </>
    ),
    login: (
      <>
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
      </>
    ),
    language: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </>
    ),
    tools: (
      <>
        <path d="M14.7 6.3a4 4 0 0 0-5-5L12 3.6 8.4 7.2 6.1 4.9a4 4 0 0 0 5 5L20 18.8 18.8 20l-8.9-8.9" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function AdminShell() {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const activeItem = labelFromPath(pathname);
  const routeParent = parentFromPath(pathname);
  const currentUser = getAuthSession()?.user;
  const can = (permission?: string) =>
    !permission ||
    currentUser?.role === "admin" ||
    currentUser?.permissions?.includes("*") ||
    currentUser?.permissions?.includes(permission);

  useEffect(() => {
    Promise.resolve().then(() => {
      setExpanded(routeParent ? { [routeParent]: true } : {});
      setSidebarOpen(false);
    });
  }, [pathname, routeParent]);

  useEffect(() => {
    const session = getAuthSession();
    if (!session || !["admin", "staff"].includes(session.user.role)) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(
        `/login?next=${encodeURIComponent(next)}&admin=1`,
      );
      return;
    }
    Promise.resolve().then(() => setAccessChecked(true));
  }, []);

  useEffect(() => {
    if (currentUser?.role !== "staff") return;
    const required =
      pathname === "/admin"
        ? "dashboard.view"
        : permissionRoutes.find(([path]) => pathname.startsWith(path))?.[1];

    if (!required || can(required)) {
      Promise.resolve().then(() => setAccessDenied(false));
      return;
    }

    const fallback = permissionHomes.find(([permission]) => can(permission))?.[1];
    if (fallback) {
      router.replace(fallback);
      return;
    }
    Promise.resolve().then(() => setAccessDenied(true));
  }, [pathname, currentUser?.role, router]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  }, [darkMode]);

  const toggleSidebar = () => {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    if (nextValue) setExpanded({});
  };

  const chooseItem = (item: MenuItem) => {
    if (item.children) {
      setExpanded((value) => (value[item.label] ? {} : { [item.label]: true }));
    } else {
      router.push(routes[item.label] ?? "/admin/dashboard");
      setSidebarOpen(false);
    }
  };

  const visibleMenuGroups = menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => can(item.permission)),
    }))
    .filter((group) => group.items.length > 0);

  const adminHome =
    currentUser?.role === "staff"
      ? permissionHomes.find(([permission]) => can(permission))?.[1] ??
      "/admin/dashboard"
      : "/admin/dashboard";

  if (!accessChecked)
    return (
      <div className="admin-access-check">Checking administrator access...</div>
    );

  if (accessDenied)
    return (
      <div className="admin-access-check">
        No admin permissions have been assigned to this staff account. Contact an
        administrator.
      </div>
    );

  return (
    <div
      className={`admin-shell ${collapsed ? "is-collapsed" : ""} ${darkMode ? "dark-theme" : ""}`}
    >
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`sidebar ${sidebarOpen ? "mobile-open" : ""}`}
        style={{ width: collapsed ? 72 : 252 }}
      >
        <div className="brand-row">
          <button
            type="button"
            className="brand"
            onClick={() => router.push(adminHome)}
            aria-label="SJS Super Market admin home"
          >
            <img
              className="admin-brand-logo"
              src="/app_logo.jpeg"
              alt="SJS Super Market"
            />
            <span className="brand-name">SJS Super Market</span>
          </button>
        </div>

        <div className="admin-card">
          <span className="avatar avatar-admin">
            {currentUser?.name
              ?.split(" ")
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase() || "AM"}
          </span>
          <span className="admin-meta">
            <strong>{currentUser?.name || "Admin"}</strong>
            <small>
              {currentUser?.role === "staff"
                ? currentUser.designation || "Staff"
                : "Super Admin"}
            </small>
          </span>
          <i className="online-dot" />
          <button
            type="button"
            className="admin-theme-toggle"
            onClick={() => setDarkMode((value) => !value)}
            aria-label={darkMode ? "Use light mode" : "Use dark mode"}
          >
            {darkMode ? "☀" : "☾"}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Admin navigation">
          {visibleMenuGroups.map((group, groupIndex) => (
            <div className="menu-group" key={group.title ?? groupIndex}>
              {group.title && (
                <div className="group-title">
                  <span>{group.title}</span>
                </div>
              )}
              {group.items.filter((item) => can(item.permission)).map((item) => {
                const isOpen = Boolean(expanded[item.label]);
                const isActive =
                  activeItem === item.label || Boolean(item.children && isOpen);
                return (
                  <div key={item.label}>
                    <button
                      type="button"
                      disabled={item.disabled}
                      aria-expanded={item.children ? isOpen : undefined}
                      className={`menu-item ${isActive ? "active" : ""}`}
                      onClick={() => chooseItem(item)}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="menu-icon">
                        <MenuIcon name={item.icon} />
                      </span>
                      <span className="menu-label">{item.label}</span>
                      {item.children && <Chevron open={isOpen} />}
                    </button>
                    {item.children && !item.disabled && (
                      <div
                        className="submenu"
                        hidden={!isOpen || (collapsed && !sidebarOpen)}
                      >
                        {item.children.map((child) => (
                          <button
                            type="button"
                            key={child}
                            className={activeItem === child ? "active" : ""}
                            onClick={() => {
                              router.push(routes[child]);
                              setSidebarOpen(false);
                            }}
                          >
                            <span />
                            {child}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        <button
          type="button"
          className="admin-logout-button"
          onClick={() => {
            logout();
            window.location.href = "/";
          }}
        >
          <span className="menu-icon">
            <MenuIcon name="login" />
          </span>
          <span className="menu-label">Logout</span>
        </button>
      </aside>

      <button
        className="collapse-button"
        style={{ left: collapsed ? 57 : 237 }}
        type="button"
        onClick={toggleSidebar}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <Chevron open={collapsed} />
      </button>
      <button
        type="button"
        className="admin-mobile-menu"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open menu"
      >
        ☰
      </button>

      <div className="main-area" style={{ marginLeft: collapsed ? 72 : 252 }}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              ☰
            </button>
            <button type="button" className="search-button" aria-label="Search">
              <span /> <em>Search anything</em>
            </button>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="icon-action theme-toggle"
              onClick={() => setDarkMode((value) => !value)}
              aria-label={darkMode ? "Use light mode" : "Use dark mode"}
            >
              {darkMode ? "☀" : "☾"}
            </button>
            <button
              type="button"
              className="icon-action notification"
              aria-label="Notifications"
            >
              ♧<i />
            </button>
            <button
              type="button"
              className="profile-button"
              aria-label="Admin profile"
            >
              <span className="avatar">AM</span>
              <i />
            </button>
          </div>
        </header>

        <main
          className={`content ${["All categories", "Add category", "All products", "Add product", "All variants", "All brands", "All units"].includes(activeItem) ? "category-content" : ""}`}
        >
          {activeItem === "All categories" || activeItem === "Add category" ? (
            <CategoryManager />
          ) : activeItem === "Add product" ? (
            <AddProductPage />
          ) : activeItem === "All products" ? (
            <>
              <ProductManager />
              <ProductImportWidget />
            </>
          ) : activeItem === "All variants" ? (
            <EntityManager kind="variations" />
          ) : activeItem === "All brands" ? (
            <EntityManager kind="brands" />
          ) : activeItem === "All units" ? (
            <EntityManager kind="units" />
          ) : (
            <>
              {activeItem === "Dashboard" ? (
                <DashboardManager />
              ) : activeItem === "Orders" ? (
                <OrderManager />
              ) : activeItem === "POS Billing" ? (
                <PosManager />
              ) : activeItem === "Supplier Orders" ? (
                <SupplierManager />
              ) : activeItem === "Staff & RBAC" ? (
                <StaffManager />
              ) : activeItem === "Customers" ? (
                <CustomerManager />
              ) : activeItem === "Delivery Dashboard" ? (
                <DeliveryManager mode="dashboard" />
              ) : activeItem === "Delivery Men List" ? (
                <DeliveryManager mode="list" />
              ) : activeItem === "Add Delivery Man" ? (
                <DeliveryManager mode="add" />
              ) : activeItem === "Live Tracking" ? (
                <DeliveryManager mode="tracking" />
              ) : activeItem === "Order Assignment" ? (
                <DeliveryManager mode="assign" />
              ) : activeItem === "Attendance" ? (
                <DeliveryManager mode="attendance" />
              ) : activeItem === "Earnings" ? (
                <DeliveryManager mode="earnings" />
              ) : activeItem === "Leave Requests" ? (
                <DeliveryManager mode="leaves" />
              ) : activeItem === "Delivery Reports" ? (
                <DeliveryManager mode="reports" />
              ) : activeItem === "Activity Logs" ? (
                <DeliveryManager mode="logs" />
              ) : activeItem === "Delivery Notifications" ? (
                <DeliveryManager mode="notifications" />
              ) : activeItem === "Delivery Settings" ? (
                <DeliveryManager mode="settings" />
              ) : activeItem === "Shipping Zones" ? (
                <ShippingZoneManager />
              ) : activeItem === "Refund Configurations" ? (
                <RefundManager mode="config" />
              ) : activeItem === "Refund Requests" ? (
                <RefundManager mode="pending" />
              ) : activeItem === "Approved Refunds" ? (
                <RefundManager mode="approved" />
              ) : activeItem === "Rejected Refunds" ? (
                <RefundManager mode="rejected" />
              ) : activeItem === "Orders report" ? (
                <ReportManager mode="orders" />
              ) : activeItem === "Product sales" ? (
                <ReportManager mode="product" />
              ) : activeItem === "Category wise sales" ? (
                <ReportManager mode="category" />
              ) : activeItem === "Sales amount report" ? (
                <ReportManager mode="amount" />
              ) : activeItem === "Delivery status report" ? (
                <ReportManager mode="delivery" />
              ) : activeItem === "Home page" ? (
                <HeroManager />
              ) : (
                <>
                  <section className="page-heading">
                    <div>
                      <p>Admin panel</p>
                      <h1>{activeItem}</h1>
                    </div>
                    <div className="heading-actions">
                      <button className="secondary-button">View store</button>
                      <button className="primary-button">＋ Add product</button>
                    </div>
                  </section>
                  <section className="welcome-card">
                    <div className="welcome-icon">✦</div>
                    <div>
                      <p>Grocery administration</p>
                      <h2>{activeItem}</h2>
                      <span>
                        Select any item from the sidebar to navigate through
                        your store management tools.
                      </span>
                    </div>
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
