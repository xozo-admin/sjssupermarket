"use client";

import { useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";

export default function ToastProvider() {
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: unknown) => {
      toast.error(String(message ?? "Something went wrong"));
    };

    return () => {
      window.alert = nativeAlert;
    };
  }, []);

  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      hideProgressBar={false}
      newestOnTop
      closeOnClick
      pauseOnFocusLoss
      pauseOnHover
      draggable
      theme="colored"
      limit={4}
    />
  );
}
