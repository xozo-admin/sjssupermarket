import type { RazorpayCheckout, RazorpayPaymentResponse } from "./order-api";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id: string;
  handler: (response: RazorpayPaymentResponse) => void;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open(): void;
      on(event: "payment.failed", callback: (response: { error?: { description?: string } }) => void): void;
    };
  }
}

let loader: Promise<void> | null = null;

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("Razorpay checkout is unavailable"));
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    document.head.appendChild(script);
  });
  return loader;
}

export async function openRazorpayCheckout(
  checkout: RazorpayCheckout,
  customer: { name: string; email: string; mobile: string },
) {
  await loadRazorpay();
  return new Promise<RazorpayPaymentResponse>((resolve, reject) => {
    const Razorpay = window.Razorpay;
    if (!Razorpay) return reject(new Error("Razorpay checkout is unavailable"));
    let completed = false;
    const gateway = new Razorpay({
      key: checkout.razorpay_key_id,
      amount: checkout.amount,
      currency: checkout.currency,
      name: "SJS Super Market",
      description: "Grocery order payment",
      image: "/app_logo.jpeg",
      order_id: checkout.razorpay_order_id,
      handler: (response) => {
        completed = true;
        resolve(response);
      },
      prefill: { name: customer.name, email: customer.email, contact: customer.mobile },
      theme: { color: "#257a42" },
      modal: {
        ondismiss: () => {
          if (!completed) reject(new Error("Payment cancelled"));
        },
      },
    });
    gateway.on("payment.failed", (response) => {
      completed = true;
      reject(new Error(response.error?.description || "Payment failed"));
    });
    gateway.open();
  });
}
