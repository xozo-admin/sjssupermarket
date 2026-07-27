import { createElement, useState, type ChangeEvent, type FormEvent } from "react";
import { toast, type ToastOptions } from "react-toastify";

const messageFrom = (reason: unknown, fallback: string) =>
  reason instanceof Error && reason.message ? reason.message : fallback;

export const notify = {
  success(message: string, options?: ToastOptions) {
    return toast.success(message, options);
  },
  error(reason: unknown, fallback = "Something went wrong", options?: ToastOptions) {
    return toast.error(messageFrom(reason, fallback), options);
  },
  info(message: string, options?: ToastOptions) {
    return toast.info(message, options);
  },
  warning(message: string, options?: ToastOptions) {
    return toast.warning(message, options);
  },
  promise<T>(
    task: Promise<T>,
    messages: { pending: string; success: string; error: string },
  ) {
    return toast.promise(task, messages);
  },
};

export function confirmToast(message: string, confirmLabel = "Delete") {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (answer: boolean) => {
      if (settled) return;
      settled = true;
      toast.dismiss(id);
      resolve(answer);
    };
    const id = toast(
      createElement(
        "div",
        { className: "toast-confirm" },
        createElement("strong", null, "Please confirm"),
        createElement("p", null, message),
        createElement(
          "div",
          { className: "toast-confirm-actions" },
          createElement(
            "button",
            { type: "button", className: "toast-confirm-cancel", onClick: () => finish(false) },
            "Cancel",
          ),
          createElement(
            "button",
            { type: "button", className: "toast-confirm-accept", onClick: () => finish(true) },
            confirmLabel,
          ),
        ),
      ),
      {
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        draggable: false,
        onClose: () => finish(false),
        type: "warning",
      },
    );
  });
}

function PromptContent({
  message,
  initialValue,
  sensitive,
  onCancel,
  onSubmit,
}: {
  message: string;
  initialValue: string;
  sensitive: boolean;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return createElement(
    "form",
    {
      className: "toast-confirm toast-prompt",
      onSubmit: (event: FormEvent) => {
        event.preventDefault();
        if (value.trim()) onSubmit(value.trim());
      },
    },
    createElement("strong", null, message),
    createElement("input", {
      autoFocus: true,
      type: sensitive ? "password" : "text",
      value,
      onChange: (event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value),
    }),
    createElement(
      "div",
      { className: "toast-confirm-actions" },
      createElement(
        "button",
        { type: "button", className: "toast-confirm-cancel", onClick: onCancel },
        "Cancel",
      ),
      createElement(
        "button",
        { type: "submit", className: "toast-prompt-accept", disabled: !value.trim() },
        "Continue",
      ),
    ),
  );
}

export function promptToast(message: string, initialValue = "", sensitive = false) {
  return new Promise<string | null>((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      toast.dismiss(id);
      resolve(value);
    };
    const id = toast(
      createElement(PromptContent, {
        message,
        initialValue,
        sensitive,
        onCancel: () => finish(null),
        onSubmit: (value) => finish(value),
      }),
      {
        autoClose: false,
        closeButton: false,
        closeOnClick: false,
        draggable: false,
        onClose: () => finish(null),
        type: "info",
      },
    );
  });
}
