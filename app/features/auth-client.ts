import { API_BASE_URL } from "../services/api-service";

export type AuthUser = { id: string; name: string; email: string; mobile: string | null; role: string; designation?: string | null; permissions?: string[] };
export type AuthSession = { access_token: string; refresh_token: string; token_type: string; expires_in: number; access_expires_at?: number; user: AuthUser };
const API = API_BASE_URL;
const KEY = "sjs-auth-session";

export function getAuthSession(): AuthSession | null { if (typeof window === "undefined") return null; try { const raw = localStorage.getItem(KEY) || sessionStorage.getItem(KEY); if (!raw) return null; const session = JSON.parse(raw) as AuthSession; if (!localStorage.getItem(KEY)) { localStorage.setItem(KEY, raw); sessionStorage.removeItem(KEY) } return session } catch { return null } }
export function authHeaders(): Record<string, string> { const session = getAuthSession(); return session ? { Authorization: `Bearer ${session.access_token}` } : {} }
export function saveAuthSession(session: AuthSession) { session.access_expires_at = Date.now() + session.expires_in * 1000; localStorage.setItem(KEY, JSON.stringify(session)); window.dispatchEvent(new Event("sjs-auth-updated")) }
export async function refreshAuthSession(): Promise<AuthSession | null> { const current = getAuthSession(); if (!current?.refresh_token) return null; try { const response = await fetch(`${API}/auth/refresh`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: current.refresh_token }) }); const next = await response.json().catch(() => null); if (!response.ok) throw new Error(); saveAuthSession(next); return next } catch { localStorage.removeItem(KEY); sessionStorage.removeItem(KEY); window.dispatchEvent(new Event("sjs-auth-updated")); return null } }
export function startAuthRefresh() { const renew = () => { const session = getAuthSession(); if (session?.refresh_token && (!session.access_expires_at || session.access_expires_at - Date.now() < 5 * 60 * 1000)) void refreshAuthSession() }; renew(); const timer = window.setInterval(renew, 60_000); return () => window.clearInterval(timer) }
export function logout() {
  const session = getAuthSession();

  if (session?.refresh_token) {
    void fetch(`${API}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh_token: session.refresh_token,
      }),
    });
  }

  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);

  window.dispatchEvent(new Event("sjs-auth-updated"));
  window.dispatchEvent(new Event("sjs-cart-updated"));
}
export function requireAuth(returnTo?: string): boolean { if (getAuthSession()) return true; const next = returnTo ?? `${window.location.pathname}${window.location.search}`; window.dispatchEvent(new CustomEvent("sjs-auth-required", { detail: { returnTo: next } })); return false }
async function request(path: string, body: unknown): Promise<AuthSession> { const response = await fetch(`${API}/auth/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json().catch(() => null); if (!response.ok) throw new Error(data?.detail || "Authentication failed"); saveAuthSession(data); return data }
export const authApi = { login: (email: string, password: string) => request("login", { email, password }), register: (body: { name: string; email: string; mobile?: string; password: string }) => request("register", body) };
