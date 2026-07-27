"use client";

/* eslint-disable @next/next/no-img-element */
import { Banknote, Check, ChevronLeft, CreditCard, LocateFixed, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AddressMapModal, { type MapSelection } from "../components/address-map-modal";
import { getAuthSession } from "../features/auth-client";
import { productImageUrl } from "../features/catalog/types";
import { readCart, writeCart, type CartItem } from "../features/cart-store";
import { customerAddressApi, type CustomerAddress } from "../features/customer-address-api";
import { createRazorpayOrder, placeOrder, verifyRazorpayPayment, type OrderSummary } from "../features/order-api";
import { openRazorpayCheckout } from "../features/razorpay-checkout";
import { notify } from "../features/notifications";
import { shippingZoneApi, type DeliveryAvailability } from "../features/shipping-zone-api";

const emptyAddress = { name: "", mobile: "", street: "", locality: "", city: "", state: "", pincode: "", landmark: "" };

export default function CheckoutPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState("cod");
  const [address, setAddress] = useState(emptyAddress);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressId, setAddressId] = useState<string | null>(null);
  const [addressSaved, setAddressSaved] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [savingAddress, setSavingAddress] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [placedOrder, setPlacedOrder] = useState<OrderSummary | null>(null);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [availability, setAvailability] = useState<DeliveryAvailability | null>(null);
  const [deletingAddress, setDeletingAddress] = useState(false);
  const setAddressField = (field: keyof typeof emptyAddress, value: string) => setAddress((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!getAuthSession()) { window.location.href = "/login?next=/checkout"; return; }
    setItems(readCart());
    void customerAddressApi.list().then((addresses) => {
      setAddresses(addresses);
      const saved = addresses.find((item) => item.is_default) ?? addresses[0];
      if (!saved) return;
      selectAddress(saved);
    }).catch(() => undefined);
  }, []);

  function selectAddress(saved: CustomerAddress) {
    setAddressId(saved.id);
    setAddress({ name: saved.full_name, mobile: saved.mobile, street: saved.street, locality: saved.locality ?? "", city: saved.city, state: saved.state, pincode: saved.pincode, landmark: saved.landmark ?? "" });
    const point = saved.latitude != null && saved.longitude != null ? { latitude: saved.latitude, longitude: saved.longitude } : null;
    setCoordinates(point);
    if (point) {
      setAddressError("");
      void checkAvailability(point.latitude, point.longitude);
    }
    else {
      setAvailability(null);
      setAddressError("Select this delivery location on the map to check availability.");
    }
    setAddressSaved(true);
  }

  async function checkAvailability(latitude: number, longitude: number) {
    setAvailability(null);
    try {
      const result = await shippingZoneApi.availability(latitude, longitude);
      setAvailability(result);
      setAddressError(result.available ? "" : result.message);
      return result;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Could not check delivery availability.";
      setAvailability(null);
      setAddressError(message);
      return null;
    }
  }

  const addAddress = () => {
    setAddressId(null);
    setAddress(emptyAddress);
    setCoordinates(null);
    setAvailability(null);
    setAddressSaved(false);
    setAddressError("");
  };

  const deleteSelectedAddress = async () => {
    if (!addressId || deletingAddress || !window.confirm("Delete this delivery address?")) return;
    setDeletingAddress(true);
    setAddressError("");
    try {
      await customerAddressApi.remove(addressId);
      const remaining = addresses.filter((item) => item.id !== addressId);
      setAddresses(remaining);
      if (remaining.length) selectAddress(remaining[0]);
      else addAddress();
      notify.success("Delivery address deleted");
    } catch (reason) {
      setAddressError(reason instanceof Error ? reason.message : "Could not delete the delivery address.");
    } finally {
      setDeletingAddress(false);
    }
  };

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + Number(item.product.selling_price) * item.quantity, 0), [items]);
  const savings = useMemo(() => items.reduce((sum, item) => sum + Math.max(0, Number(item.product.mrp) - Number(item.product.selling_price)) * item.quantity, 0), [items]);
  const delivery = items.length && subtotal < 500 ? 40 : 0;

  const selectLocation = (selection: MapSelection) => {
    setCoordinates({ latitude: selection.latitude, longitude: selection.longitude });
    setAddress((current) => ({ ...current, street: selection.street || current.street, locality: selection.locality || current.locality, city: selection.city || current.city, state: selection.state || current.state, pincode: selection.pincode || current.pincode }));
    setMapOpen(false);
    void checkAvailability(selection.latitude, selection.longitude);
  };

  const saveAddress = async (event: FormEvent) => {
    event.preventDefault();
    if (!coordinates || availability?.available !== true) {
      setAddressError(availability?.message || "Select your location on the map and confirm delivery availability.");
      return;
    }
    setSavingAddress(true); setAddressError("");
    try {
      const payload = { full_name: address.name.trim(), mobile: address.mobile.trim(), street: address.street.trim(), locality: address.locality.trim() || null, city: address.city.trim(), state: address.state.trim(), pincode: address.pincode.trim(), landmark: address.landmark.trim() || null, latitude: coordinates?.latitude ?? null, longitude: coordinates?.longitude ?? null, is_default: true };
      const saved = addressId ? await customerAddressApi.update(addressId, payload) : await customerAddressApi.create(payload);
      setAddresses((current) => [saved, ...current.filter((item) => item.id !== saved.id)].map((item) => ({ ...item, is_default: item.id === saved.id })));
      selectAddress(saved);
    } catch (reason) { setAddressError(reason instanceof Error ? reason.message : "Could not save the delivery address."); }
    finally { setSavingAddress(false); }
  };

  const submitOrder = async () => {
    if (!addressId || !addressSaved || !items.length || placingOrder) return;
    setPlacingOrder(true); setOrderError("");
    try {
      const orderItems = items.map((item) => ({ product_id: item.product.id, quantity: item.quantity }));
      let order: OrderSummary;
      if (payment === "razorpay") {
        const checkout = await createRazorpayOrder({ address_id: addressId, items: orderItems });
        const session = getAuthSession();
        const response = await openRazorpayCheckout(checkout, {
          name: session?.user.name ?? address.name,
          email: session?.user.email ?? "",
          mobile: session?.user.mobile ?? address.mobile,
        });
        order = await verifyRazorpayPayment(checkout.checkout_id, response);
        notify.success("Payment successful and order placed");
      } else {
        order = await placeOrder({ address_id: addressId, payment_method: "cod", items: orderItems });
        notify.success("Order placed successfully");
      }
      writeCart([]); setItems([]); setPlacedOrder(order);
    } catch (reason) { setOrderError(reason instanceof Error ? reason.message : "Could not place your order."); }
    finally { setPlacingOrder(false); }
  };

  const paymentMethods = [
    { value: "cod", title: "Cash on delivery", help: "Pay when your order arrives", icon: Banknote },
    { value: "razorpay", title: "Pay online with Razorpay", help: "UPI, cards, netbanking and supported wallets", icon: CreditCard },
  ];

  return <main className="commerce-page">
    <div className="commerce-shell checkout-shell">
      <Link className="back-cart" href="/cart"><ChevronLeft />Back to cart</Link><h1>Checkout</h1>
      <div className="checkout-layout"><div>
        <section className="checkout-card delivery-address-card">
          <header><b>1</b><MapPin className="checkout-section-icon" /><h2>Delivery address</h2></header>
          {addressSaved ? <><div className="address-list" role="radiogroup" aria-label="Saved delivery addresses">{addresses.map((item) => <button type="button" role="radio" aria-checked={item.id === addressId} className={item.id === addressId ? "selected" : ""} key={item.id} onClick={() => selectAddress(item)}><span className="address-radio">{item.id === addressId && <Check />}</span><span><strong>{item.full_name} · {item.mobile}</strong><small>{[item.street, item.locality, item.city, item.state, item.pincode].filter(Boolean).join(", ")}</small></span>{item.is_default && <em>Default</em>}</button>)}</div><div className="address-actions"><button type="button" onClick={() => setAddressSaved(false)}>Edit selected</button><button className="delete-address" type="button" disabled={deletingAddress} onClick={() => void deleteSelectedAddress()}><Trash2 />{deletingAddress ? "Deleting..." : "Delete"}</button><button type="button" onClick={addAddress}>+ Add new address</button></div>{addressError && <div className="checkout-address-error">{addressError}</div>}</> :
            <form className="address-form" onSubmit={saveAddress}>
              <label>Full name *<input required value={address.name} onChange={(e) => setAddressField("name", e.target.value)} placeholder="Enter your full name" /></label>
              <label>Mobile number *<input required value={address.mobile} onChange={(e) => setAddressField("mobile", e.target.value)} placeholder="Enter mobile number" /></label>
              <label className="wide">House / flat / street *<button className="address-map-trigger" type="button" onClick={() => setMapOpen(true)}><LocateFixed />Select on map</button><input required value={address.street} onChange={(e) => setAddressField("street", e.target.value)} placeholder="Street address" /></label>
              <label className="wide">Area / locality<input value={address.locality} onChange={(e) => setAddressField("locality", e.target.value)} placeholder="Area or locality" /></label>
              <label>City *<input required value={address.city} onChange={(e) => setAddressField("city", e.target.value)} placeholder="City" /></label><label>State *<input required value={address.state} onChange={(e) => setAddressField("state", e.target.value)} placeholder="State" /></label>
              <label>Pincode *<input required value={address.pincode} onChange={(e) => setAddressField("pincode", e.target.value)} placeholder="Pincode" /></label><label>Landmark<input value={address.landmark} onChange={(e) => setAddressField("landmark", e.target.value)} placeholder="Optional landmark" /></label>
              {coordinates && availability?.available && <div className="selected-map-location"><Check />{availability.message}</div>}{addressError && <div className="checkout-address-error">{addressError}</div>}<button disabled={savingAddress || availability?.available !== true}>{savingAddress ? "Saving address..." : "Save delivery address"}</button>
            </form>}
        </section>
        <section className="checkout-card payment-card"><header><b>3</b><CreditCard className="checkout-section-icon" /><h2>Payment</h2></header>{paymentMethods.map(({ value, title, help, icon: Icon }) => <label className={payment === value ? "selected" : ""} key={value}><input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} /><span className="payment-method-icon"><Icon /></span><span><strong>{title}</strong><small>{help}</small></span><i>{payment === value && <Check />}</i></label>)}</section>
      </div><aside className="order-card"><header><b>2</b><h2>Order summary</h2></header>{placedOrder ? <div className="order-success"><Check /><h3>Order placed successfully</h3><p>Order #{placedOrder.id.slice(0, 8).toUpperCase()}</p><strong>INR {Number(placedOrder.total).toFixed(0)}</strong><Link href="/">Continue shopping</Link></div> : <><div className="order-products">{items.map((item) => { const image = productImageUrl(item.product, "s"); return <article key={item.product.id}>{image && <img src={image} alt="" />}<div><strong>{item.product.name}</strong><small>Qty: {item.quantity}</small></div><b>INR {(Number(item.product.selling_price) * item.quantity).toFixed(0)}</b></article>; })}</div><dl><div><dt>Subtotal</dt><dd>INR {subtotal.toFixed(0)}</dd></div><div><dt>Savings</dt><dd className="saving">− INR {savings.toFixed(0)}</dd></div><div><dt>Delivery</dt><dd>{delivery ? `INR ${delivery}` : "FREE"}</dd></div><div className="price-total"><dt>Total</dt><dd>INR {(subtotal + delivery).toFixed(0)}</dd></div></dl>{orderError && <div className="checkout-address-error">{orderError}</div>}{addressSaved && availability?.available === false && <div className="checkout-address-error">{availability.message}</div>}<button type="button" className="checkout-button" disabled={!addressSaved || availability?.available !== true || !items.length || placingOrder} onClick={submitOrder}><ShieldCheck />{placingOrder ? (payment === "razorpay" ? "Opening secure payment..." : "Placing order...") : (payment === "razorpay" ? "Pay securely with Razorpay" : "Place order")}</button><p>{addressSaved ? (availability?.available ? "Review your order and payment method before placing it." : "Delivery is unavailable for the selected address.") : "Complete your delivery information before placing the order."}</p></>}</aside></div>
    </div>{mapOpen && <AddressMapModal initial={coordinates} onClose={() => setMapOpen(false)} onConfirm={selectLocation} />}
  </main>;
}
