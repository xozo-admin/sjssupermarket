import type { ClientFeedback, ClientFeedbackInput, HeroSlide, HeroSlideInput, HomepageBanner, HomepageBannerInput } from "./types";
import { authHeaders } from "../auth-client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export type StorefrontHomepage = {
  hero_slides: HeroSlide[];
  top_category_ids: string[];
  fresh_pick_ids: string[];
  trending_product_ids: string[];
  banner_one: HomepageBanner | null;
  weekly_deal_ids: string[];
  banner_two: HomepageBanner | null;
  client_feedback: ClientFeedback[];
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/homepage${path}`, { ...init, headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "Homepage request failed");
  }
  return response.status === 204 ? undefined as T : response.json();
}

export const homepageApi = {
  storefront: () => request<StorefrontHomepage>("/storefront"),
  list: (activeOnly = false) => request<HeroSlide[]>(`/hero-slides?active_only=${activeOnly}`),
  create: (body: HeroSlideInput) => request<HeroSlide>("/hero-slides", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: HeroSlideInput) => request<HeroSlide>(`/hero-slides/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  toggle: (id: string) => request<HeroSlide>(`/hero-slides/${id}/toggle`, { method: "PATCH" }),
  remove: (id: string) => request<void>(`/hero-slides/${id}`, { method: "DELETE" }),
  uploadImage: async (id: string, file: File) => {
    const data = new FormData();
    data.append("image", file);
    const response = await fetch(`${API}/homepage/hero-slides/${id}/image`, { method: "POST", headers: authHeaders(), body: data });
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail ?? "Hero image upload failed"); }
    return response.json() as Promise<HeroSlide>;
  },
  topCategories: () => request<string[]>("/top-categories"),
  updateTopCategories: (categoryIds: string[]) => request<string[]>("/top-categories", { method: "PUT", body: JSON.stringify({ category_ids: categoryIds }) }),
  freshPicks: () => request<string[]>("/fresh-picks"),
  updateFreshPicks: (productIds: string[]) => request<string[]>("/fresh-picks", { method: "PUT", body: JSON.stringify({ product_ids: productIds }) }),
  trendingProducts: () => request<string[]>("/trending-products"),
  updateTrendingProducts: (productIds: string[]) => request<string[]>("/trending-products", { method: "PUT", body: JSON.stringify({ product_ids: productIds }) }),
  banner: (section: string) => request<HomepageBanner | null>(`/banners/${section}`),
  updateBanner: (section: string, body: HomepageBannerInput) => request<HomepageBanner>(`/banners/${section}`, { method: "PUT", body: JSON.stringify(body) }),
  uploadBannerImage: async (section: string, file: File) => {
    const data = new FormData(); data.append("image", file);
    const response = await fetch(`${API}/homepage/banners/${section}/image`, { method: "POST", headers: authHeaders(), body: data });
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail ?? "Banner image upload failed"); }
    return response.json() as Promise<HomepageBanner>;
  },
  weeklyDeals: () => request<string[]>("/weekly-deals"),
  updateWeeklyDeals: (productIds: string[]) => request<string[]>("/weekly-deals", { method: "PUT", body: JSON.stringify({ product_ids: productIds }) }),
  clientFeedback: (activeOnly = false) => request<ClientFeedback[]>(`/client-feedback?active_only=${activeOnly}`),
  createClientFeedback: (body: ClientFeedbackInput) => request<ClientFeedback>("/client-feedback", { method: "POST", body: JSON.stringify(body) }),
  updateClientFeedback: (id: string, body: ClientFeedbackInput) => request<ClientFeedback>(`/client-feedback/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteClientFeedback: (id: string) => request<void>(`/client-feedback/${id}`, { method: "DELETE" }),
  uploadClientAvatar: async (id: string, file: File) => {
    const data = new FormData(); data.append("image", file);
    const response = await fetch(`${API}/homepage/client-feedback/${id}/avatar`, { method: "POST", headers: authHeaders(), body: data });
    if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail ?? "Client photo upload failed"); }
    return response.json() as Promise<ClientFeedback>;
  },
};
