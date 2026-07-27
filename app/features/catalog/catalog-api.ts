import type { CatalogEntity, Product, ProductFacet } from "./types";
import { authHeaders } from "../auth-client";
import { API_BASE_URL } from "../../services/api-service";
const API = API_BASE_URL;

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { "Content-Type": "application/json", ...authHeaders(), ...init?.headers } });
  if (!response.ok) { const body = await response.json().catch(() => null); const detail=body?.detail; if(Array.isArray(detail)){const issue=detail[0];const row=typeof issue?.loc?.[2]==="number"?`Row ${issue.loc[2]+2}: `:"";throw new Error(`${row}${issue?.msg??"Validation failed"}`)} throw new Error(typeof detail==="string"?detail:"Request failed"); }
  return response.status === 204 ? undefined as T : response.json();
}
async function upload<T>(path:string,file:File):Promise<T>{const data=new FormData();data.append("image",file);const response=await fetch(`${API}${path}`,{method:"POST",headers:authHeaders(),body:data});if(!response.ok){const body=await response.json().catch(()=>null);throw new Error(body?.detail??"Image upload failed")}return response.json()}

export const catalogApi = {
  entities: (kind: string, search = "", status = "") => call<CatalogEntity[]>(`/catalog/${kind}?${new URLSearchParams({ ...(search && { search }), ...(status && { active: status }) })}`),
  createEntity: (kind: string, body: Record<string, unknown>) => call<CatalogEntity>(`/catalog/${kind}`, { method: "POST", body: JSON.stringify(body) }),
  updateEntity: (kind: string, id: string, body: Record<string, unknown>) => call<CatalogEntity>(`/catalog/${kind}/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  toggleEntity: (kind: string, id: string) => call<CatalogEntity>(`/catalog/${kind}/${id}/toggle`, { method: "PATCH" }),
  deleteEntity: (kind: string, id: string) => call<void>(`/catalog/${kind}/${id}`, { method: "DELETE" }),
  products: (search = "", brand = "", status = "", page = 1, size = 20, categoryL1 = "", categoryL2 = "", filters: { brands?: string[]; minimumRating?: number; minimumPrice?: string; maximumPrice?: string; sort?: string; stockStatus?: string } = {}) => call<{items: Product[]; total: number; page:number; size:number; pages:number}>(`/catalog/products/list?${new URLSearchParams({ page:String(page), size:String(size), ...(search && { search }), ...(brand && { brand }), ...(status && { is_active: status }), ...(categoryL1 && { category_l1: categoryL1 }), ...(categoryL2 && { category_l2: categoryL2 }), ...(filters.brands?.length && { brands: filters.brands.join("|") }), ...(filters.minimumRating && { min_rating: String(filters.minimumRating) }), ...(filters.minimumPrice && { min_price: filters.minimumPrice }), ...(filters.maximumPrice && { max_price: filters.maximumPrice }), ...(filters.sort && { sort: filters.sort }), ...(filters.stockStatus && { stock_status: filters.stockStatus }) })}`),
  createProduct: (body: Record<string, unknown>) => call<Product>("/catalog/products/list", { method: "POST", body: JSON.stringify(body) }),
  product: (id: string) => call<Product>(`/catalog/products/list/${id}`),
  updateProduct: (id: string, body: Record<string, unknown>) => call<Product>(`/catalog/products/list/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  uploadProductImage: (id:string,file:File) => upload<Product>(`/catalog/products/list/${id}/image`,file),
  uploadBrandImage: (id:string,file:File) => upload<CatalogEntity>(`/catalog/brands/${id}/image`,file),
  importProducts: (products: Record<string, unknown>[]) => call<{total:number;created:number;updated:number;unchanged:number}>("/catalog/products/import", { method: "POST", body: JSON.stringify({ products }) }),
  deleteProduct: (id: string) => call<void>(`/catalog/products/list/${id}`, { method: "DELETE" }),
  productFacets: (kind: string, search = "") => call<ProductFacet[]>(`/catalog/products/facets/${kind}?${new URLSearchParams({ ...(search && { search }) })}`),
};
