import type { RazorpayCheckout, RazorpayPaymentResponse } from "./order-api";
import { authHeaders } from "./auth-client";
import { API_BASE_URL } from "../services/api-service";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  image: string;
  order_id: string;

  handler: (response: RazorpayPaymentResponse) => void;

  prefill: {
    name: string;
    email: string;
    contact: string;
  };

  theme: {
    color: string;
  };

  modal: {
    ondismiss: () => void;
  };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open(): void;

      on(
        event: "payment.failed",
        callback: (response: {
          error?: {
            description?: string;
          };
        }) => void,
      ): void;

      close(): void;
    };
  }
}

let loader: Promise<void> | null = null;

function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (loader) {
    return loader;
  }

  loader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");

    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpayCheckout = "true";

    script.onload = () => {
      if (window.Razorpay) {
        resolve();
      } else {
        reject(
          new Error("Razorpay checkout is unavailable"),
        );
      }
    };

    script.onerror = () => {
      reject(
        new Error("Unable to load Razorpay checkout"),
      );
    };

    document.head.appendChild(script);
  });

  return loader;
}

async function checkPaymentStatus(
  checkoutId: string,
) {
  const response = await fetch(
    `${API_BASE_URL}/payments/razorpay/check/${checkoutId}`,
    {
      method: "GET",
      headers: authHeaders(),
    },
  );

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      body?.detail ||
      "Could not check payment status",
    );
  }

  return body as {
    payment_status: string;
    order: unknown | null;
  };
}

export async function openRazorpayCheckout(
  checkout: RazorpayCheckout,
  customer: {
    name: string;
    email: string;
    mobile: string;
  },
) {
  await loadRazorpay();

  return new Promise<RazorpayPaymentResponse>(
    (resolve, reject) => {
      const Razorpay = window.Razorpay;

      if (!Razorpay) {
        reject(
          new Error(
            "Razorpay checkout is unavailable",
          ),
        );
        return;
      }

      let completed = false;
      let pollingTimer: ReturnType<typeof setInterval> | null = null;
      let gateway: {
        open(): void;
        close(): void;
        on(
          event: "payment.failed",
          callback: (response: {
            error?: {
              description?: string;
            };
          }) => void
        ): void;
      } | null = null;

      const stopPolling = () => {
        if (pollingTimer) {
          clearInterval(pollingTimer);
          pollingTimer = null;
        }
      };

      const finishSuccess = (
        response: RazorpayPaymentResponse,
      ) => {
        if (completed) {
          return;
        }

        completed = true;
        stopPolling();

        gateway?.close();

        resolve(response);
      };

      const checkBackendPayment = async () => {
        if (completed) {
          return;
        }

        try {
          const result =
            await checkPaymentStatus(
              checkout.checkout_id,
            );

          console.log(
            "Razorpay backend payment status:",
            result,
          );

          if (
            result.payment_status === "paid"
          ) {
            completed = true;
            stopPolling();

            console.log(
              "Payment confirmed by backend",
            );

            gateway?.close();

            resolve({
              razorpay_order_id:
                checkout.razorpay_order_id,

              razorpay_payment_id:
                "backend-confirmed",

              razorpay_signature:
                "backend-confirmed",
            });

            return;
          }
        } catch (error) {
          console.error(
            "Payment status check failed:",
            error,
          );
        }
      };

      gateway = new Razorpay({
        key: checkout.razorpay_key_id,

        amount: checkout.amount,

        currency: checkout.currency,

        name: "SJS Super Market",

        description:
          "Grocery order payment",

        image: "/app_logo.jpeg",

        order_id:
          checkout.razorpay_order_id,

        handler: (response) => {
          console.log(
            "RAZORPAY SUCCESS CALLBACK:",
            response,
          );

          finishSuccess(response);
        },

        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.mobile,
        },

        theme: {
          color: "#257a42",
        },

        modal: {
          ondismiss: () => {
            if (!completed) {
              stopPolling();

              reject(
                new Error(
                  "Payment cancelled",
                ),
              );
            }
          },
        },
      });

      gateway.on(
        "payment.failed",
        (response) => {
          if (completed) {
            return;
          }

          completed = true;
          stopPolling();

          reject(
            new Error(
              response.error?.description ||
              "Payment failed",
            ),
          );
        },
      );

      gateway.open();
      void checkBackendPayment();

      pollingTimer = setInterval(() => {
        void checkBackendPayment();
      }, 3000);
    },
  );
}