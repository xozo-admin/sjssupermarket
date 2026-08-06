"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { categoryApi } from "./category-api";
import CategoryForm from "./category-form";
import CategoryList from "./category-list";
import type { Category, CategoryInput } from "./types";
import { confirmToast } from "../notifications";

export default function CategoryManager() {
  const pathname = usePathname(); const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]), [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Category | null>(null), [showForm, setShowForm] = useState(pathname.endsWith("/new"));
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [notice, setNotice] = useState("");
  // const load = useCallback(async (query = "") => { setLoading(true); try { setCategories((await categoryApi.list(query)).items); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not load categories"); } finally { setLoading(false); } }, []);
  const load = useCallback(async (query = "") => {
    setLoading(true);

    try {
      const result = await categoryApi.list(query);

      console.log("API Result:", result);
      console.log("Items:", result.items);

      setCategories(result.items);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not load categories");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(search), 250); return () => clearTimeout(timer); }, [load, search]);
  const closeForm = () => { setEditing(null); setShowForm(false); router.push("/admin/products/categories"); };
  const save = async (payload: CategoryInput, image: File | null) => { setSaving(true); setNotice(""); try { const saved = editing ? await categoryApi.update(editing.id, payload) : await categoryApi.create(payload); if (image) await categoryApi.uploadImage(saved.id, image); await load(); closeForm(); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save category"); } finally { setSaving(false); } };
  const remove = async (item: Category) => { if (!(await confirmToast(`Delete ${item.name}?`))) return; try { await categoryApi.remove(item.id); await load(search); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not delete category"); } };
  const openEdit = (item: Category) => { setEditing(item); setShowForm(true); };
  console.log("Categories state:", categories);
  console.log("Categories count:", categories.length);
  return <>{notice && <div className="api-notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}{showForm ? <CategoryForm categories={categories} initial={editing} saving={saving} onCancel={closeForm} onSave={save} /> : <CategoryList categories={categories} loading={loading} search={search} onSearchChange={setSearch} onAdd={() => { setEditing(null); setShowForm(true); router.push("/admin/products/categories/new"); }} onEdit={openEdit} onDelete={remove} />}</>;
}
