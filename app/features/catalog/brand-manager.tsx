"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { catalogApi } from "./catalog-api";
import type { CatalogEntity } from "./types";
import { confirmToast } from "../notifications";

const empty = { name: "", meta_title: "", meta_description: "", meta_image_url: "" };

function BrandMark({ item }: { item: CatalogEntity }) {
  const [failed, setFailed] = useState(false);
  if (item.image_url && !failed) {
    return <img className="brand-thumbnail" src={item.image_url} alt="" onError={() => setFailed(true)} />;
  }
  return <span>{item.name[0]?.toUpperCase()}</span>;
}

export default function BrandManager() {
  const [items, setItems] = useState<CatalogEntity[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(empty);
  const [image, setImage] = useState<File | null>(null);
  const [editing, setEditing] = useState<CatalogEntity | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await catalogApi.entities("brands", search, status));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load brands");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timer = setTimeout(() => void load(), 250);
    return () => clearTimeout(timer);
  }, [load]);

  const close = () => {
    setOpen(false);
    setEditing(null);
    setImage(null);
    setForm(empty);
  };

  const create = () => {
    close();
    setOpen(true);
  };

  const edit = (item: CatalogEntity) => {
    setEditing(item);
    setForm({
      name: item.name,
      meta_title: item.meta_title || "",
      meta_description: item.meta_description || "",
      meta_image_url: item.meta_image_url || "",
    });
    setOpen(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        active: editing?.active ?? true,
        image_url: editing?.image_url || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
        meta_image_url: form.meta_image_url || null,
      };
      const saved = editing
        ? await catalogApi.updateEntity("brands", editing.id, payload)
        : await catalogApi.createEntity("brands", payload);
      if (image) await catalogApi.uploadBrandImage(saved.id, image);
      close();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save brand");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: CatalogEntity) => {
    if (!(await confirmToast(`Delete ${item.name}?`))) return;
    await catalogApi.deleteEntity("brands", item.id);
    await load();
  };

  return (
    <div className="catalog-admin-page variant-page">
      {error && <div className="api-notice">{error}</div>}
      <section className="variant-header">
        <h1>All Brands</h1>
        <div className="variant-header-actions">
          <label className="variant-search"><span>⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search brands" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Status</option><option value="true">Active</option><option value="false">Inactive</option></select>
          <button className="variant-add-button" onClick={create}><span>＋</span>Add Brand</button>
        </div>
      </section>
      <section className="variant-table-card">
        <table className="variant-table brand-table">
          <thead><tr><th>S/L</th><th>Brand Name</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={4}>Loading...</td></tr> : items.length === 0 ? <tr><td colSpan={4}>No brands found.</td></tr> : items.map((item, index) => (
              <tr key={item.id}>
                <td>{index + 1}</td>
                <td><div className="variant-name"><BrandMark item={item} /><strong>{item.name}</strong></div></td>
                <td><button className={`switch ${item.active ? "on" : ""}`} onClick={async () => { await catalogApi.toggleEntity("brands", item.id); await load(); }}><i /></button></td>
                <td><div className="row-actions"><button className="row-action edit" onClick={() => edit(item)}>Edit</button><button className="row-action delete" onClick={() => void remove(item)}>Delete</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {open && (
        <div className="variant-modal-backdrop">
          <section className="variant-modal brand-modal">
            <header><h2>{editing ? "Edit Brand" : "Add Brand"}</h2><button onClick={close}>×</button></header>
            <form onSubmit={submit}>
              <div className="variant-modal-body brand-form-grid">
                <div className="brand-form-field full"><label>Brand Name *</label><input autoFocus value={form.name} onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} /></div>
                {editing?.image_url && !image && <img className="brand-form-preview" src={editing.image_url} alt={`${editing.name} brand`} />}
                <label className="catalog-image-picker full"><input type="file" accept="image/webp,image/jpeg,image/png" onChange={(event) => setImage(event.target.files?.[0] || null)} /><strong>{image ? image.name : editing?.image_url ? "Replace Brand Image" : "Upload Brand Image"}</strong><small>WEBP, JPG or PNG · maximum 8 MB</small></label>
                <div className="brand-form-field full"><label>Meta Title</label><input value={form.meta_title} onChange={(event) => setForm((value) => ({ ...value, meta_title: event.target.value }))} /></div>
                <div className="brand-form-field full"><label>Meta Description</label><textarea rows={3} value={form.meta_description} onChange={(event) => setForm((value) => ({ ...value, meta_description: event.target.value }))} /></div>
              </div>
              <footer><button type="button" className="variant-cancel-button" onClick={close}>Cancel</button><button className="variant-save-button" disabled={saving || form.name.trim().length < 2}>{saving ? "Saving..." : editing ? "Update Brand" : "Save Brand"}</button></footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
