const DEFAULT_API_ORIGIN = "https://sjssupermarket-backend.onrender.com";
const API_VERSION_PATH = "/api/v1";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? `${DEFAULT_API_ORIGIN}${API_VERSION_PATH}`
).replace(/\/+$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function apiSocketUrl(path: string): string {
  const base = API_BASE_URL.replace(
    /^http/,
    API_BASE_URL.startsWith("https") ? "wss" : "ws",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
