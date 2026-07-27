export type HeroSlide = {
  id: string;
  subtitle: string | null;
  title: string | null;
  description: string | null;
  badge_text: string | null;
  button_text: string | null;
  button_url: string | null;
  delivery_text: string | null;
  image_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type HeroSlideInput = Omit<HeroSlide, "id" | "created_at" | "updated_at">;

export type HomepageBanner = {
  id: string;
  section_key: string;
  eyebrow: string | null;
  title: string | null;
  description: string | null;
  button_text: string | null;
  button_url: string | null;
  image_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type HomepageBannerInput = Omit<HomepageBanner, "id" | "section_key" | "created_at" | "updated_at">;

export type ClientFeedback = {
  id: string;
  client_name: string;
  client_role: string | null;
  feedback: string;
  rating: number;
  avatar_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ClientFeedbackInput = Omit<ClientFeedback, "id" | "created_at" | "updated_at">;
