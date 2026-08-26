import StorefrontClient from "./storefront-client";
import type { CategoryListResponse } from "./features/categories/types";
import type { StorefrontHomepage } from "./features/homepage/homepage-api";
import { API_BASE_URL } from "./services/api-service";

const STOREFRONT_CACHE_SECONDS = 300;

async function getStorefrontData() {
  const request = (path: string) =>
    fetch(`${API_BASE_URL}${path}`, {
      next: {
        revalidate: STOREFRONT_CACHE_SECONDS,
        tags: ["storefront"],
      },
    });

  const [categoriesResult, homepageResult] = await Promise.allSettled([
    request("/categories?page=1&size=500"),
    request("/homepage/storefront"),
  ]);

  const categories =
    categoriesResult.status === "fulfilled" && categoriesResult.value.ok
      ? ((await categoriesResult.value.json()) as CategoryListResponse).items
      : [];
      
  const homepage =
    homepageResult.status === "fulfilled" && homepageResult.value.ok
      ? ((await homepageResult.value.json()) as StorefrontHomepage)
      : null;

  return { categories, homepage };
}

export default async function Home() {
  const { categories, homepage } = await getStorefrontData();
  return (
    <StorefrontClient
      initialCategories={categories}
      initialHomepage={homepage}
    />
  );
}
