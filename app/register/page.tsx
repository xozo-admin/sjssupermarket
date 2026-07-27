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
    setLoading(true);
    setError("");
    try {
      await authApi.register({ ...form, mobile: form.mobile || undefined });
      window.location.href = "/";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Registration failed");
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
          <label>Mobile number<input autoComplete="tel" value={form.mobile} onChange={(event) => set("mobile", event.target.value)} placeholder="Enter mobile number" /></label>
          <label>Password<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(event) => set("password", event.target.value)} placeholder="Minimum 8 characters" /></label>
          {error && <div className="auth-error">{error}</div>}
          <button disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button>
          <small>Already have an account? <Link href="/login">Login</Link></small>
        </form>
      </section>
    </main>
  );
}
