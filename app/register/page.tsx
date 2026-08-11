"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authApi } from "../features/auth-client";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", mobile: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

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

    setLoading(true);

    try {
      await authApi.register({
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        password: form.password,
      });

      window.location.href = "/";
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-register-panel">
        <button className="auth-close" type="button" aria-label="Close registration" onClick={() => {
          if (window.history.length > 1) window.history.back();
          else window.location.href = "/";
        }}>×</button>
        <aside>
          <h1>Register</h1>
          <p>Create your account and start shopping fresh groceries.</p>
          <div className="auth-illustration"><span>♥</span><i /><b /></div>
        </aside>
        <form onSubmit={submit}>
          <h2>Create account</h2>
          <label>Full name<input required minLength={2} autoComplete="name" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Enter name" /></label>
          <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => set("email", event.target.value)} placeholder="Enter email" /></label>
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
          <label>Password<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => set("password", event.target.value)} placeholder="Min 8 chars, uppercase, number & symbol" /></label>
          {error && <div className="auth-error">{error}</div>}
          <button disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button>
          <small>Already have an account? <Link href="/login">Login</Link></small>
        </form>
      </section>
    </main>
  );
}
