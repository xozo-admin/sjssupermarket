export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  parent_name: string | null;
  product_count: number;
  brands: string[];
  priority: number;
  thumbnail_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CategoryListResponse = {
  items: Category[];
  total: number;
  page: number;
  size: number;
};

export type CategoryInput = {
  name: string;
  description: string | null;
  parent_id: string | null;
  brands: string[];
  priority: number;
  thumbnail_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_image_url: string | null;
};
