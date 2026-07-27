"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { productImageUrl } from "../features/catalog/types";
import { readCart, writeCart, type CartItem } from "../features/cart-store";
import { getAuthSession } from "../features/auth-client";

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => { if (!getAuthSession()) { window.location.href = "/login?next=/cart"; return; } setItems(readCart()); }, []);
  const update = (next: CartItem[]) => { setItems(next); writeCart(next); };
  const subtotal = useMemo(() => items.reduce((sum,item)=>sum+Number(item.product.selling_price)*item.quantity,0),[items]);
  const savings = useMemo(() => items.reduce((sum,item)=>sum+Math.max(0,Number(item.product.mrp)-Number(item.product.selling_price))*item.quantity,0),[items]);
  const delivery = items.length && subtotal < 500 ? 40 : 0;

  return <main className="commerce-page"><div className="commerce-shell"><header className="cart-heading"><div><small>SJS FRESH MARKET</small><h1>Shopping cart</h1></div><span>{items.reduce((sum,item)=>sum+item.quantity,0)} items</span></header>{items.length?<div className="cart-layout"><section className="cart-items">{items.map((item,index)=>{const image=productImageUrl(item.product,"l");return <article key={item.product.id}>{image?<img src={image} alt={item.product.name}/>:<span>{item.product.name[0]}</span>}<div className="cart-item-copy"><h2>{item.product.name}</h2><p>{item.product.brand || item.product.category_l2} · {item.product.unit_value} {item.product.unit}</p><strong>{item.product.currency} {Number(item.product.selling_price).toFixed(0)}</strong></div><div className="cart-item-actions"><div><button onClick={()=>update(items.map((current,i)=>i===index?{...current,quantity:Math.max(1,current.quantity-1)}:current))}>−</button><b>{item.quantity}</b><button onClick={()=>update(items.map((current,i)=>i===index?{...current,quantity:current.quantity+1}:current))}>+</button></div><strong>{item.product.currency} {(Number(item.product.selling_price)*item.quantity).toFixed(0)}</strong><button className="cart-remove" onClick={()=>update(items.filter((_,i)=>i!==index))}>Remove</button></div></article>})}<Link className="continue-shopping" href="/products">← Continue shopping</Link></section><aside className="price-card"><h2>Price details</h2><dl><div><dt>Subtotal</dt><dd>INR {subtotal.toFixed(0)}</dd></div><div><dt>Product savings</dt><dd className="saving">− INR {savings.toFixed(0)}</dd></div><div><dt>Delivery</dt><dd>{delivery?`INR ${delivery}`:"FREE"}</dd></div><div className="price-total"><dt>Total</dt><dd>INR {(subtotal+delivery).toFixed(0)}</dd></div></dl>{delivery>0&&<p>Add INR {Math.max(0,500-subtotal).toFixed(0)} more for free delivery.</p>}<Link className="checkout-button" href="/checkout">Proceed to checkout</Link><ul><li>Fast and reliable delivery</li><li>Carefully packed products</li><li>Secure checkout</li></ul></aside></div>:<section className="empty-cart"><h2>Your cart is empty</h2><p>Add fresh products to continue shopping.</p><Link href="/products">Browse products</Link></section>}</div></main>;
}
