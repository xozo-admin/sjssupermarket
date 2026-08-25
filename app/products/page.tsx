import ProductsClient from "./products-client";
import type { CategoryListResponse } from "../features/categories/types";
import type { Product } from "../features/catalog/types";
import { API_BASE_URL } from "../services/api-service";

const PRODUCTS_CACHE_SECONDS = 300;
const VALID_SORTS = ["popular", "low", "high", "newest", "deals"] as const;
type Sort = (typeof VALID_SORTS)[number];

type ProductsResponse = {
  items: Product[];
  total: number;
};

type ProductsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: PRODUCTS_CACHE_SECONDS, tags: ["storefront-products"] },
    });
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const query = await searchParams;
  const selected = first(query.category);
  const search = first(query.search);
  const brand = first(query.brand);  
  const requestedSort = first(query.sort);
  const sort: Sort = VALID_SORTS.includes(requestedSort as Sort)
    ? (requestedSort as Sort)
    : "popular";

  const categoryResult = await getJson<CategoryListResponse>(
    "/categories?page=1&size=500",
  );
  const categories = categoryResult?.items ?? [];
  const selectedCategory = categories.find((item) => item.name === selected);
  const subCategory = selectedCategory?.parent_id ? selectedCategory.name : "";
  const mainCategory = selectedCategory?.parent_id
    ? categories.find((item) => item.id === selectedCategory.parent_id)?.name ?? ""
    : selectedCategory?.name ?? "";
  // Keep the first response small for every catalog view; the client loads
  // subsequent pages as they approach the viewport.
  const categoryMode = true;

  const productQuery = new URLSearchParams({
    page: "1",
    size: "24",
    is_active: "true",
    sort,
  });
  if (search) productQuery.set("search", search);
  if (mainCategory) productQuery.set("category_l1", mainCategory);
  if (subCategory) productQuery.set("category_l2", subCategory);
  if (brand) productQuery.set("brands", brand);   

  const productResult = await getJson<ProductsResponse>(
    `/catalog/products/list?${productQuery}`,
  );

  return (
    <ProductsClient
      initialProducts={productResult?.items ?? []}
      initialCategories={categories}
      initialSearch={search}
      initialMainCategory={mainCategory}
      initialSubCategory={subCategory}
      initialSort={sort}
      initialCategoryMode={categoryMode}
      initialCatalogTotal={productResult?.total ?? 0}
      initialBrand={brand}                          
    />
  );
}
