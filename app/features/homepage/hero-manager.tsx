"use client";

/* eslint-disable @next/next/no-img-element */
import { FormEvent, useCallback, useEffect, useState } from "react";
import { homepageApi } from "./homepage-api";
import type { ClientFeedback, ClientFeedbackInput, HeroSlide, HeroSlideInput, HomepageBannerInput } from "./types";
import { categoryApi } from "../categories/category-api";
import type { Category } from "../categories/types";
import { catalogApi } from "../catalog/catalog-api";
import { productImageUrl, type Product } from "../catalog/types";
import { confirmToast } from "../notifications";

const empty: HeroSlideInput = { subtitle: null, title: null, description: null, badge_text: null, button_text: null, button_url: null, delivery_text: null, image_url: null, active: true, sort_order: 0 };

function TopCategoriesPanel({ categories, selected, saving, onToggle, onSave }: { categories: Category[]; selected: string[]; saving: boolean; onToggle: (id: string) => void; onSave: () => void }) {
  const selectedCategories = selected.map((id) => categories.find((category) => category.id === id)).filter(Boolean) as Category[];
  return <section className="top-categories-admin"><div className="top-category-selected"><h2>Select Top Categories</h2><div>{selectedCategories.length ? selectedCategories.map((category) => <button key={category.id} onClick={() => onToggle(category.id)}>{category.name}<span>×</span></button>) : <span className="top-category-placeholder">Select the categories to display on the storefront</span>}</div></div><div className="top-category-options">{categories.map((category) => <label key={category.id} className={selected.includes(category.id) ? "selected" : ""}><input type="checkbox" checked={selected.includes(category.id)} onChange={() => onToggle(category.id)} /><span>{category.thumbnail_url ? <img src={category.thumbnail_url} alt="" /> : category.name[0]}</span><strong>{category.name}</strong><small>{category.parent_name ? `L2 · ${category.parent_name}` : "L1 Main Category"}</small></label>)}</div><button className="primary-button top-category-save" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save Categories"}</button></section>;
}

function ProductSelectionPanel({ title, description, selected, saving, onToggle, onSave }: { title: string; description: string; selected: string[]; saving: boolean; onToggle: (id: string) => void; onSave: () => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [chosen, setChosen] = useState<Product[]>([]);
  const pageSize = 12;
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingProducts(true);
      void catalogApi.products(search, "", "true", page, pageSize)
        .then((result) => { setProducts(result.items); setTotal(result.total); setPages(result.pages); })
        .finally(() => setLoadingProducts(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [page, search]);
  useEffect(() => {
    void Promise.all(selected.map((id) => catalogApi.product(id).catch(() => null)))
      .then((items) => setChosen(items.filter(Boolean) as Product[]));
  }, [selected]);
  return <section className="fresh-picks-admin">
    <div className="fresh-picks-selected"><div><h2>{title}</h2><p>{description}</p></div><button className="primary-button" disabled={saving} onClick={onSave}>{saving ? "Saving..." : "Save Products"}</button></div>
    {chosen.length > 0 && <div className="fresh-pick-chips">{chosen.map((product) => <button key={product.id} onClick={() => onToggle(product.id)}>{product.name}<span>×</span></button>)}</div>}
    <label className="fresh-pick-search" style={{padding:"10px 12px",border:"1px solid var(--line)",borderRadius:9,background:"var(--surface)"}}><input style={{width:"100%",height:40,padding:"0 12px",border:"1px solid var(--line)",borderRadius:6,background:"var(--surface-soft)",color:"var(--ink)",outline:0}} value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search products by name, platform ID or barcode" /></label>
    <div className="fresh-pick-options">{loadingProducts ? <div className="homepage-empty">Loading products...</div> : products.map((product) => { const image = productImageUrl(product, "s"); return <label key={product.id} className={selected.includes(product.id) ? "selected" : ""}><input type="checkbox" checked={selected.includes(product.id)} onChange={() => onToggle(product.id)} /><span>{image ? <img src={image} alt="" /> : product.name[0]}</span><strong>{product.name}</strong><small>{product.brand || product.category_l2 || product.category_l1}</small><b>{product.currency} {Number(product.selling_price).toFixed(2)}</b></label>; })}</div>
    {total > pageSize && <div className="fresh-pick-pagination"><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span><div><button disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><b>{page} / {pages}</b><button disabled={page === pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}>Next</button></div></div>}
  </section>;
}

const emptyBanner: HomepageBannerInput = { eyebrow: null, title: null, description: null, button_text: null, button_url: null, image_url: null, active: true };

function BannerPanel({ sectionKey, title, onError }: { sectionKey: string; title: string; onError: (message: string) => void }) {
  const [form, setForm] = useState<HomepageBannerInput>(emptyBanner);
  const [image, setImage] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setForm(emptyBanner); setImage(null); void homepageApi.banner(sectionKey).then((banner) => { if (banner) setForm({ eyebrow: banner.eyebrow, title: banner.title, description: banner.description, button_text: banner.button_text, button_url: banner.button_url, image_url: banner.image_url, active: banner.active }); }).catch((reason) => onError(reason instanceof Error ? reason.message : "Could not load banner")); }, [onError, sectionKey]);
  const field = (key: keyof HomepageBannerInput, value: string | boolean | null) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => { event.preventDefault(); setSaving(true); try { let saved = await homepageApi.updateBanner(sectionKey, form); if (image) saved = await homepageApi.uploadBannerImage(sectionKey, image); setForm({ eyebrow: saved.eyebrow, title: saved.title, description: saved.description, button_text: saved.button_text, button_url: saved.button_url, image_url: saved.image_url, active: saved.active }); setImage(null); } catch (reason) { onError(reason instanceof Error ? reason.message : "Could not save banner"); } finally { setSaving(false); } };
  return <form className="homepage-banner-form" onSubmit={save}><header><div><h2>{title}</h2><p>Configure the promotional banner shown on the storefront.</p></div><button className="primary-button" disabled={saving}>{saving ? "Saving..." : "Save Banner"}</button></header><div className="homepage-banner-fields">
    <div className="brand-form-field"><label>Eyebrow</label><input value={form.eyebrow ?? ""} onChange={(event) => field("eyebrow", event.target.value || null)} placeholder="Fresh offer" /></div>
    <div className="brand-form-field"><label>Title</label><input value={form.title ?? ""} onChange={(event) => field("title", event.target.value || null)} placeholder="Save on everyday essentials" /></div>
    <div className="brand-form-field full"><label>Description</label><textarea rows={3} value={form.description ?? ""} onChange={(event) => field("description", event.target.value || null)} /></div>
    <div className="brand-form-field"><label>Button Text</label><input value={form.button_text ?? ""} onChange={(event) => field("button_text", event.target.value || null)} placeholder="Shop Now" /></div>
    <div className="brand-form-field"><label>Button Link</label><input value={form.button_url ?? ""} onChange={(event) => field("button_url", event.target.value || null)} placeholder="#products" /></div>
    <label className="hero-active full"><input type="checkbox" checked={form.active} onChange={(event) => field("active", event.target.checked)} /> Show banner on storefront</label>
    {form.image_url && !image && <img className="homepage-banner-preview full" src={form.image_url} alt="Current banner" />}
    <label className="catalog-image-picker full"><input type="file" accept="image/webp,image/jpeg,image/png" onChange={(event) => setImage(event.target.files?.[0] || null)} /><strong>{image ? image.name : form.image_url ? "Replace Banner Image" : "Upload Banner Image"}</strong><small>Recommended 1400 × 360 · WEBP, JPG or PNG · maximum 8 MB</small></label>
  </div></form>;
}

const emptyFeedback: ClientFeedbackInput = { client_name: "", client_role: null, feedback: "", rating: 5, avatar_url: null, active: true, sort_order: 0 };

function ClientFeedbackPanel({ onError }: { onError: (message: string) => void }) {
  const [items, setItems] = useState<ClientFeedback[]>([]);
  const [editing, setEditing] = useState<ClientFeedback | null>(null);
  const [form, setForm] = useState<ClientFeedbackInput>(emptyFeedback);
  const [image, setImage] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => { void homepageApi.clientFeedback().then(setItems).catch((reason) => onError(reason instanceof Error ? reason.message : "Could not load feedback")); }, [onError]);
  useEffect(load, [load]);
  const close = () => { setOpen(false); setEditing(null); setForm(emptyFeedback); setImage(null); };
  const edit = (item: ClientFeedback) => { setEditing(item); setForm({ client_name: item.client_name, client_role: item.client_role, feedback: item.feedback, rating: item.rating, avatar_url: item.avatar_url, active: item.active, sort_order: item.sort_order }); setOpen(true); };
  const save = async (event: FormEvent) => { event.preventDefault(); setSaving(true); try { let saved = editing ? await homepageApi.updateClientFeedback(editing.id, form) : await homepageApi.createClientFeedback(form); if (image) saved = await homepageApi.uploadClientAvatar(saved.id, image); close(); load(); } catch (reason) { onError(reason instanceof Error ? reason.message : "Could not save feedback"); } finally { setSaving(false); } };
  const remove = async (item: ClientFeedback) => { if (!(await confirmToast(`Delete feedback from “${item.client_name}”?`))) return; try { await homepageApi.deleteClientFeedback(item.id); load(); } catch (reason) { onError(reason instanceof Error ? reason.message : "Could not delete feedback"); } };
  return <section className="feedback-admin"><header><div><h2>Client Feedback</h2><p>Manage testimonials displayed on the storefront.</p></div><button className="primary-button" onClick={() => setOpen(true)}>＋ Add Feedback</button></header><div className="feedback-admin-grid">{items.length ? items.map((item) => <article key={item.id}>{item.avatar_url ? <img src={item.avatar_url} alt="" /> : <span>{item.client_name[0]}</span>}<div><strong>{item.client_name}</strong><small>{item.client_role || "Customer"}</small><b>{"★".repeat(item.rating)}{"☆".repeat(5-item.rating)}</b></div><p>{item.feedback}</p><footer><button className="row-action edit" onClick={() => edit(item)}>Edit</button><button className="row-action delete" onClick={() => void remove(item)}>Delete</button></footer></article>) : <div className="homepage-empty"><strong>No client feedback yet</strong><span>Add the first customer testimonial.</span></div>}</div>
  {open && <div className="variant-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="variant-modal hero-modal"><header><h2>{editing ? "Edit Feedback" : "Add Feedback"}</h2><button onClick={close}>×</button></header><form onSubmit={save}><div className="hero-form-body"><div className="brand-form-field"><label>Client Name *</label><input required value={form.client_name} onChange={(event) => setForm({...form,client_name:event.target.value})} /></div><div className="brand-form-field"><label>Client Role</label><input value={form.client_role ?? ""} onChange={(event) => setForm({...form,client_role:event.target.value || null})} /></div><div className="brand-form-field full"><label>Feedback *</label><textarea required rows={4} value={form.feedback} onChange={(event) => setForm({...form,feedback:event.target.value})} /></div><div className="brand-form-field"><label>Rating</label><select value={form.rating} onChange={(event) => setForm({...form,rating:Number(event.target.value)})}>{[5,4,3,2,1].map((rating) => <option key={rating} value={rating}>{rating} Stars</option>)}</select></div><div className="brand-form-field"><label>Sort Order</label><input type="number" min="0" value={form.sort_order} onChange={(event) => setForm({...form,sort_order:Number(event.target.value)})} /></div><label className="hero-active full"><input type="checkbox" checked={form.active} onChange={(event) => setForm({...form,active:event.target.checked})} /> Show on storefront</label><label className="catalog-image-picker full"><input type="file" accept="image/webp,image/jpeg,image/png" onChange={(event) => setImage(event.target.files?.[0] || null)} /><strong>{image ? image.name : form.avatar_url ? "Replace Client Photo" : "Upload Client Photo"}</strong></label></div><footer><button type="button" className="variant-cancel-button" onClick={close}>Cancel</button><button className="variant-save-button" disabled={saving}>{saving ? "Saving..." : "Save Feedback"}</button></footer></form></section></div>}
  </section>;
}

export default function HeroManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState<HeroSlideInput>(empty);
  const [image, setImage] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [section, setSection] = useState("Hero Section");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [savingCategories, setSavingCategories] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [savingProducts, setSavingProducts] = useState(false);
  const [selectedTrending, setSelectedTrending] = useState<string[]>([]);
  const [savingTrending, setSavingTrending] = useState(false);
  const [selectedWeeklyDeals, setSelectedWeeklyDeals] = useState<string[]>([]);
  const [savingWeeklyDeals, setSavingWeeklyDeals] = useState(false);

  const load = useCallback(async () => { setLoading(true); try { setSlides(await homepageApi.list()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load hero slides"); } finally { setLoading(false); } }, []);
  useEffect(() => {
    void homepageApi.list().then(setSlides).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load hero slides")).finally(() => setLoading(false));
    void Promise.all([categoryApi.list(), homepageApi.topCategories()]).then(([categoryResult, selected]) => { setCategories(categoryResult.items); setSelectedCategories(selected); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load top categories"));
    void homepageApi.freshPicks().then(setSelectedProducts).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load fresh picks"));
    void homepageApi.trendingProducts().then(setSelectedTrending).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load trending products"));
    void homepageApi.weeklyDeals().then(setSelectedWeeklyDeals).catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load weekly deals"));
  }, []);
  const close = () => { setOpen(false); setEditing(null); setImage(null); setForm(empty); };
  const add = () => { close(); setOpen(true); };
  const edit = (slide: HeroSlide) => { setEditing(slide); setForm({ subtitle: slide.subtitle, title: slide.title, description: slide.description, badge_text: slide.badge_text, button_text: slide.button_text, button_url: slide.button_url, delivery_text: slide.delivery_text, image_url: slide.image_url, active: slide.active, sort_order: slide.sort_order }); setOpen(true); };
  const field = (key: keyof HeroSlideInput, value: string | number | boolean | null) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(""); try { const saved = editing ? await homepageApi.update(editing.id, form) : await homepageApi.create(form); if (image) await homepageApi.uploadImage(saved.id, image); close(); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save hero slide"); } finally { setSaving(false); } };
  const remove = async (slide: HeroSlide) => { if (!(await confirmToast(`Delete hero slide “${slide.title || "Untitled"}”?`))) return; try { await homepageApi.remove(slide.id); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete hero slide"); } };
  const toggleCategory = (id: string) => setSelectedCategories((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const saveCategories = async () => { setSavingCategories(true); setError(""); try { setSelectedCategories(await homepageApi.updateTopCategories(selectedCategories)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save top categories"); } finally { setSavingCategories(false); } };
  const toggleProduct = (id: string) => setSelectedProducts((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const saveProducts = async () => { setSavingProducts(true); setError(""); try { setSelectedProducts(await homepageApi.updateFreshPicks(selectedProducts)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save fresh picks"); } finally { setSavingProducts(false); } };
  const toggleTrending = (id: string) => setSelectedTrending((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const saveTrending = async () => { setSavingTrending(true); setError(""); try { setSelectedTrending(await homepageApi.updateTrendingProducts(selectedTrending)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save trending products"); } finally { setSavingTrending(false); } };
  const toggleWeeklyDeal = (id: string) => setSelectedWeeklyDeals((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const saveWeeklyDeals = async () => { setSavingWeeklyDeals(true); setError(""); try { setSelectedWeeklyDeals(await homepageApi.updateWeeklyDeals(selectedWeeklyDeals)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save weekly deals"); } finally { setSavingWeeklyDeals(false); } };

  return <div className="homepage-admin">
    {error && <div className="api-notice">{error}<button onClick={() => setError("")}>×</button></div>}
    <section className="homepage-title"><div><small>Appearance / Grocery</small><h1>{section === "Hero Section" ? "Hero Section Configuration" : section === "Top Categories" ? "Top Categories Configuration" : section}</h1></div>{section === "Hero Section" && <button className="primary-button" onClick={add}>＋ Add Hero Slide</button>}</section>
    <div className="homepage-layout">
      {section === "Hero Section" ? <>
      <section className="homepage-table-card"><table className="homepage-table"><thead><tr><th>S/L</th><th>Image</th><th>Subtitle</th><th>Title</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6}>Loading hero slides...</td></tr> : slides.length === 0 ? <tr><td colSpan={6}><div className="homepage-empty"><strong>No hero slides yet</strong><span>Add the first slide to update the storefront hero.</span><button onClick={add}>Add Hero Slide</button></div></td></tr> : slides.map((slide, index) => <tr key={slide.id}><td>{index + 1}</td><td>{slide.image_url ? <img src={`${slide.image_url}?v=${encodeURIComponent(slide.updated_at)}`} alt="" /> : <span className="hero-image-empty">No image</span>}</td><td>{slide.subtitle || "—"}</td><td><strong>{slide.title || "—"}</strong></td><td><button className={`switch ${slide.active ? "on" : ""}`} onClick={async () => { await homepageApi.toggle(slide.id); await load(); }}><i /></button></td><td><div className="row-actions"><button className="row-action edit" onClick={() => edit(slide)}>Edit</button><button className="row-action delete" onClick={() => void remove(slide)}>Delete</button></div></td></tr>)}
      </tbody></table></section>
      </> : section === "Top Categories" ? <TopCategoriesPanel categories={categories} selected={selectedCategories} saving={savingCategories} onToggle={toggleCategory} onSave={() => void saveCategories()} /> : section === "Today’s Fresh Picks" ? <ProductSelectionPanel title="Select Today’s Fresh Picks" description="Choose the products shown in Today’s Fresh Picks." selected={selectedProducts} saving={savingProducts} onToggle={toggleProduct} onSave={() => void saveProducts()} /> : section === "Top Trending Products" ? <ProductSelectionPanel title="Select Top Trending Products" description="Choose the products shown in Top Trending Products." selected={selectedTrending} saving={savingTrending} onToggle={toggleTrending} onSave={() => void saveTrending()} /> : section === "Weekly Best Deals" ? <ProductSelectionPanel title="Select Weekly Best Deals" description="Choose the discounted products shown in Weekly Best Deals." selected={selectedWeeklyDeals} saving={savingWeeklyDeals} onToggle={toggleWeeklyDeal} onSave={() => void saveWeeklyDeals()} /> : section === "Client Feedback" ? <ClientFeedbackPanel onError={setError} /> : <BannerPanel sectionKey={section === "Banner Section Two" ? "section-two" : "section-one"} title={section === "Banner Section Two" ? "Banner Section Two" : "Banner Section One"} onError={setError} />}
      <aside className="homepage-steps"><h2>Homepage Configuration</h2>{["Hero Section", "Top Categories", "Today’s Fresh Picks", "Top Trending Products", "Banner Section One", "Weekly Best Deals", "Banner Section Two", "Client Feedback"].map((name) => <button type="button" key={name} onClick={() => setSection(name)} className={section === name ? "active" : ""}><i />{name}</button>)}</aside>
    </div>
    {open && <div className="variant-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><section className="variant-modal hero-modal"><header><h2>{editing ? "Edit Hero Slide" : "Add Hero Slide"}</h2><button onClick={close}>×</button></header><form onSubmit={submit}><div className="hero-form-body">
      <div className="brand-form-field"><label>Subtitle</label><input value={form.subtitle ?? ""} onChange={(event) => field("subtitle", event.target.value || null)} /></div>
      <div className="brand-form-field"><label>Title</label><input value={form.title ?? ""} onChange={(event) => field("title", event.target.value || null)} /></div>
      <div className="brand-form-field full"><label>Description</label><textarea rows={3} value={form.description ?? ""} onChange={(event) => field("description", event.target.value || null)} /></div>
      <div className="brand-form-field"><label>Offer Badge</label><input value={form.badge_text ?? ""} onChange={(event) => field("badge_text", event.target.value || null)} /></div>
      <div className="brand-form-field"><label>Delivery Text</label><input value={form.delivery_text ?? ""} onChange={(event) => field("delivery_text", event.target.value || null)} /></div>
      <div className="brand-form-field"><label>Button Text</label><input value={form.button_text ?? ""} onChange={(event) => field("button_text", event.target.value || null)} /></div>
      <div className="brand-form-field"><label>Button Link</label><input value={form.button_url ?? ""} onChange={(event) => field("button_url", event.target.value || null)} /></div>
      <div className="brand-form-field"><label>Sort Order</label><input type="number" min="0" value={form.sort_order} onChange={(event) => field("sort_order", Number(event.target.value))} /></div>
      <label className="hero-active"><input type="checkbox" checked={form.active} onChange={(event) => field("active", event.target.checked)} /> Show this slide on storefront</label>
      {editing?.image_url && !image && <img className="hero-form-preview" src={editing.image_url} alt="Current hero" />}
      <label className="catalog-image-picker full"><input type="file" accept="image/webp,image/jpeg,image/png" onChange={(event) => setImage(event.target.files?.[0] || null)} /><strong>{image ? image.name : editing?.image_url ? "Replace Hero Image" : "Upload Hero Image"}</strong><small>Recommended 1824 × 576 · 19:6 ratio · WEBP, JPG or PNG · maximum 8 MB</small></label>
    </div><footer><button type="button" className="variant-cancel-button" onClick={close}>Cancel</button><button className="variant-save-button" disabled={saving}>{saving ? "Saving..." : editing ? "Update Slide" : "Save Slide"}</button></footer></form></section></div>}
  </div>;
}
