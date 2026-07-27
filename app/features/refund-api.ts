import { authHeaders } from "./auth-client";
import { apiErrorMessage } from "./api-error";
import { API_BASE_URL } from "../services/api-service";
const API=API_BASE_URL;
export type RefundConfig={id:string;allowed_days:number;enabled:boolean};
export type Refund={id:string;user_id:string;order_id:string;order_item_id:string;customer_name:string|null;customer_mobile:string|null;product_name:string;amount:string;payment_method:string;reason:string;status:string;admin_note:string|null;created_at:string};
async function request<T>(path:string,init?:RequestInit):Promise<T>{const response=await fetch(`${API}${path}`,{...init,headers:{"Content-Type":"application/json",...authHeaders(),...init?.headers}});const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(apiErrorMessage(body,"Refund request failed"));return body as T}
export const refundApi={config:()=>request<RefundConfig>("/refunds/config"),customerConfig:()=>request<RefundConfig>("/refunds/customer-config"),saveConfig:(body:{allowed_days:number;enabled:boolean})=>request<RefundConfig>("/refunds/config",{method:"PUT",body:JSON.stringify(body)}),list:(status?:string)=>request<Refund[]>(`/refunds/admin${status?`?status=${status}`:""}`),decide:(id:string,status:"approved"|"rejected")=>request<Refund>(`/refunds/admin/${id}`,{method:"PATCH",body:JSON.stringify({status})}),create:(order_item_id:string,reason:string)=>request<Refund>("/refunds",{method:"POST",body:JSON.stringify({order_item_id,reason})}),mine:()=>request<Refund[]>("/refunds/mine")};
