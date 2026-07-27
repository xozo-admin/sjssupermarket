import { authHeaders } from "./auth-client";
import { API_BASE_URL } from "../services/api-service";
const API=API_BASE_URL;
function apiError(body:unknown):string{
 const detail=(body as {detail?:unknown}|null)?.detail;
 if(typeof detail==="string")return detail;
 if(Array.isArray(detail))return detail.map((item)=>{
  if(!item||typeof item!=="object")return String(item);
  const error=item as {loc?:unknown[];msg?:string};
  const field=error.loc?.filter((part)=>part!=="body").join(" → ");
  return `${field?`${field}: `:""}${error.msg??"Invalid value"}`;
 }).join(". ");
 return "Request failed";
}
async function call<T>(path:string,init?:RequestInit):Promise<T>{const r=await fetch(`${API}${path}`,{...init,headers:{"Content-Type":"application/json",...authHeaders(),...init?.headers}});const b=await r.json().catch(()=>null);if(!r.ok)throw new Error(apiError(b));return b as T}
export type Staff={id:string;name:string;email:string;mobile:string|null;designation:string|null;permissions:string[];active:boolean;created_at:string};
export type Supplier={id:string;name:string;contact_person:string|null;email:string|null;mobile:string;gst_number:string|null;address:string|null;active:boolean;notes:string|null;created_at:string};
export type POLine={id:string;product_id:string;product_name:string;quantity:number;received_quantity:number;unit_cost:string;tax_percent:string;line_total:string};
export type PurchaseOrder={id:string;po_number:string;supplier_id:string;supplier_name:string;status:string;payment_status:string;expected_date:string|null;subtotal:string;tax:string;total:string;notes:string|null;created_at:string;items:POLine[]};
export const staffApi={list:()=>call<Staff[]>("/admin/staff"),permissions:()=>call<string[]>("/admin/staff/permissions"),create:(body:object)=>call<Staff>("/admin/staff",{method:"POST",body:JSON.stringify(body)}),update:(id:string,body:object)=>call<Staff>(`/admin/staff/${id}`,{method:"PUT",body:JSON.stringify(body)}),password:(id:string,password:string)=>call(`/admin/staff/${id}/password`,{method:"PATCH",body:JSON.stringify({password})})};
export const supplierApi={suppliers:()=>call<Supplier[]>("/admin/suppliers/suppliers"),addSupplier:(body:object)=>call<Supplier>("/admin/suppliers/suppliers",{method:"POST",body:JSON.stringify(body)}),editSupplier:(id:string,body:object)=>call<Supplier>(`/admin/suppliers/suppliers/${id}`,{method:"PUT",body:JSON.stringify(body)}),orders:()=>call<PurchaseOrder[]>("/admin/suppliers/orders"),createOrder:(body:object)=>call<PurchaseOrder>("/admin/suppliers/orders",{method:"POST",body:JSON.stringify(body)}),receive:(id:string,items:{item_id:string;quantity:number}[])=>call<PurchaseOrder>(`/admin/suppliers/orders/${id}/receive`,{method:"POST",body:JSON.stringify({items})}),payment:(id:string,status:string)=>call<PurchaseOrder>(`/admin/suppliers/orders/${id}/payment`,{method:"PATCH",body:JSON.stringify({status})}),cancel:(id:string)=>call(`/admin/suppliers/orders/${id}/cancel`,{method:"PATCH"})};
