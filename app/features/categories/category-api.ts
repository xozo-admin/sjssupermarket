import type { Category, CategoryInput, CategoryListResponse } from "./types";
import { authHeaders } from "../auth-client";
import { API_BASE_URL } from "../../services/api-service";

const API_URL = API_BASE_URL;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.detail ?? "The category request failed.");
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
async function uploadImageRequest(id:string,file:File):Promise<Category>{const data=new FormData();data.append("image",file);const response=await fetch(`${API_URL}/categories/${id}/image`,{method:"POST",headers:authHeaders(),body:data});if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.detail??"Image upload failed")}return response.json()}

export const categoryApi = {
  list(search = ""): Promise<CategoryListResponse> {
    const query = new URLSearchParams({ page: "1", size: "500" });
    if (search.trim()) query.set("search", search.trim());
    return request(`/categories?${query}`);
  },
  create(payload: CategoryInput): Promise<Category> {
    return request("/categories", { method: "POST", body: JSON.stringify(payload) });
  },
  update(id: string, payload: CategoryInput): Promise<Category> {
    return request(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  remove(id: string): Promise<void> {
    return request(`/categories/${id}`, { method: "DELETE" });
  },
  uploadImage(id:string,file:File):Promise<Category>{return uploadImageRequest(id,file)},
};
