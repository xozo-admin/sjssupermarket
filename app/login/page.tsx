"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authApi } from "../features/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.login(email, password);
      const next = new URLSearchParams(window.location.search).get("next");
      window.location.href = next?.startsWith("/") ? next : "/";
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel auth-login-panel">
        <button className="auth-close" type="button" aria-label="Close login" onClick={() => {
          const next = new URLSearchParams(window.location.search).get("next");
          if (next?.startsWith("/")) window.location.href = next;
          else if (window.history.length > 1) window.history.back();
          else window.location.href = "/";
        }}>×</button>
        <aside>
          <h1>Login</h1>
          <p>Get access to your orders, wishlist and recommendations.</p>
          <div className="auth-illustration"><span>♥</span><i /><b /></div>
        </aside>
        <form onSubmit={submit}>
          <h2>Welcome back</h2>
          <p>Login with your email and password.</p>
          <label>Email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter email address" /></label>
          <label>Password<input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter password" /></label>
          {error && <div className="auth-error">{error}</div>}
          <button disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
          <small>New to SJS? <Link href="/register">Create an account</Link></small>
        </form>
      </section>
    </main>
  );
}
