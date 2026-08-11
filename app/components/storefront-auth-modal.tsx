"use client";

import { FormEvent, useEffect, useState } from "react";
import { authApi } from "../features/auth-client";

type Mode = "login" | "register";

export default function StorefrontAuthModal({ initialMode = "login", onClose }: { initialMode?: Mode; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", close);
    };
  }, [onClose]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode === "register") {
      if (!form.name.trim()) {
        setError("Full name is required.");
        return;
      }

      if (form.name.trim().length < 2) {
        setError("Full name must contain at least 2 characters.");
        return;
      }

      if (!form.email.trim()) {
        setError("Email address is required.");
        return;
      }

      if (!form.mobile.trim()) {
        setError("Mobile number is required.");
        return;
      }

      if (!/^[0-9]{10}$/.test(form.mobile)) {
        setError("Mobile number must contain exactly 10 digits.");
        return;
      }

      if (!form.password) {
        setError("Password is required.");
        return;
      }

      if (form.password.length < 8) {
        setError("Password must contain at least 8 characters.");
        return;
      }

      if (!/[A-Z]/.test(form.password)) {
        setError("Password must contain at least one uppercase letter.");
        return;
      }

      if (!/[a-z]/.test(form.password)) {
        setError("Password must contain at least one lowercase letter.");
        return;
      }

      if (!/[0-9]/.test(form.password)) {
        setError("Password must contain at least one number.");
        return;
      }

      if (!/[^A-Za-z0-9]/.test(form.password)) {
        setError("Password must contain at least one special character.");
        return;
      }
    }

    setLoading(true);

    try {
      const session =
        mode === "login"
          ? await authApi.login(form.email, form.password)
          : await authApi.register({
            name: form.name,
            email: form.email,
            mobile: form.mobile,
            password: form.password,
          });

      onClose();

      if (session.user.role === "admin") {
        window.location.href = "/admin/dashboard";
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Authentication failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setError("");
  };

  return (
    <div className="auth-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`auth-panel ${mode === "login" ? "auth-login-panel" : "auth-register-panel"}`} role="dialog" aria-modal="true" aria-label={mode === "login" ? "Login" : "Register"}>
        <button className="auth-close" type="button" onClick={onClose} aria-label="Close">×</button>
        <aside>
          <h1>{mode === "login" ? "Login" : "Register"}</h1>
          <p>{mode === "login" ? "Get access to your orders, wishlist and recommendations." : "Create your account and start shopping fresh groceries."}</p>
          <div className="auth-illustration"><span>♥</span><i /><b /></div>
        </aside>
        <form onSubmit={submit}>
          <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>
          {mode === "login" && <p>Login with your email and password.</p>}
          {mode === "register" && <label>Full name<input required minLength={2} autoComplete="name" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Enter name" /></label>}
          <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="Enter email address" /></label>
          {mode === "register" && (
            <label>
              Mobile number
              <input
                required
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                value={form.mobile}
                onChange={(event) =>
                  set("mobile", event.target.value.replace(/\D/g, ""))
                }
                placeholder="Enter mobile number"
              />
            </label>
          )}
          <label>Password<input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={form.password} onChange={(event) => set("password", event.target.value)} placeholder={mode === "login" ? "Enter password" : "Min 8 chars, uppercase, number & symbol"} /></label>
          
          {error && <div className="auth-error">{error}</div>}
          <button disabled={loading}>{loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}</button>
          <small>{mode === "login" ? <>New to SJS? <button type="button" onClick={() => changeMode("register")}>Create an account</button></> : <>Already have an account? <button type="button" onClick={() => changeMode("login")}>Login</button></>}</small>
        </form>
      </section>
    </div>
  );
}
