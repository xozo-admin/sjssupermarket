import { authHeaders } from "../auth-client";import { apiErrorMessage } from "../api-error";
import { API_BASE_URL } from "../../services/api-service";
const API=API_BASE_URL;
export type AdminCustomer={id:string;name:string;email:string;mobile:string|null;active:boolean;created_at:string;order_count:number;total_spent:string;refund_count:number;addresses:{id:string;label:string;is_default:boolean}[];recent_orders:{id:string;total:string;status:string;created_at:string}[]};
async function request<T>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(`${API}${path}`,{...init,headers:{"Content-Type":"application/json",...authHeaders()}});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(apiErrorMessage(body,"Customer request failed"));return body as T}
export const customerAdminApi={list:(search="",status="")=>request<AdminCustomer[]>(`/admin/customers?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),setStatus:(id:string,active:boolean)=>request<AdminCustomer>(`/admin/customers/${id}/status`,{method:"PATCH",body:JSON.stringify({active})})};
