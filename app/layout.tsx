import type { Metadata } from "next";
import { Inter, Red_Hat_Display } from "next/font/google";
import "./globals.css";
import "./product-import.css";
import "./platform-product.css";
import "./storefront.css";
import "./homepage-admin.css";
import "./fresh-picks-grid.css";
import "./footer.css";
import "./footer-wave.css";
import "./categories-page.css";
import "./categories-grid.css";
import "./category-expand.css";
import "./products-page.css";
import "./infinite-scroll.css";
import "./product-filters.css";
import "./product-card-reference.css";
import "./product-card-marketplace.css";
import "./product-search.css";
import "./category-mega-nav.css";
import "./category-mega-nav-position.css";
import "./categories-navbar.css";
import "./typography.css";
import "./product-detail.css";
import "./product-detail-legacy-ui.css";
import "./product-breadcrumb.css";
import "./product-detail-image-fit.css";
import "./commerce.css";
import StorefrontNavigation from "./components/storefront-navigation";
import "./common-navigation.css";
import "./auth.css";
import "./auth-compact.css";
import "./storefront-loader.css";
import "./global-font.css";
import "leaflet/dist/leaflet.css";
import "./checkout-map.css";
import "./checkout-typography.css";
import "./saved-address.css";
import "./checkout-old-ui.css";
import "./cart-ui.css";
import "./orders.css";
import "./orders-overrides.css";
import "./admin-orders.css";
import "./admin-orders-live.css";
import "./reports.css";
import "./order-invoice.css";
import "./order-filters.css";
import "./refunds.css";
import "./refund-request.css";
import "./customers-admin.css";
import "./delivery-admin.css";
import "./wishlist.css";
import "./not-found.css";
import "./shipping-zone.css";
import "./dashboard.css";
import "./product-stock-status.css";
import "./pos.css";
import "./pos-availability.css";
import "./pos-fullscreen.css";
import "./operations.css";
import "react-toastify/dist/ReactToastify.css";
import "./toast-confirm.css";
import "./landing-theme.css";
import "./landing-responsive.css";
import ToastProvider from "./components/toast-provider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-red-hat-display",
});

export const metadata: Metadata = {
  title: "SJS Fresh Market",
  description: "Fresh groceries delivered to your doorstep",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${redHatDisplay.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ToastProvider />
        <StorefrontNavigation />
        {children}
      </body>
    </html>
  );
}
