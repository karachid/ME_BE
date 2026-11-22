export type DiscountType = "percent" | "fixed";

export interface Discount {
  type: DiscountType;
  value: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

export interface Item {
  id: number;
  name: string;
  description: string | null;
  price: number;
  final_price: number;
  is_available: boolean;
  image_url: string | null;
  sort_order: number;
  discount: Discount | null;
  subcategory_id: number;
  subcategory_name: string;
  category_id: number;
  category_name: string;
}

export interface Category {
  id: number;
  name: string;
  restaurant_id: number;
  item_count: number;
  subcategories: { id: number; name: string; item_count: number }[];
}

export interface Stats {
  items: { total: number; available: number; sold_out: number; average_price: number };
  promotions: { active: number; scheduled: number; expired: number };
  views: {
    days: number;
    total: number;
    previous_total: number;
    change_percent: number | null;
    today: number;
    series: { date: string; views: number }[];
  };
  health: {
    quality_score: number;
    missing_image: number;
    missing_description: number;
    sold_out: number;
    expired_promos: number;
    empty_categories: number;
  };
  categories: number;
}

export interface Activity {
  id: number;
  owner_email: string | null;
  action_type: "create" | "update" | "delete" | "bulk";
  object_type: "item" | "category" | "restaurant";
  object_id: string | null;
  object_name: string | null;
  details: Record<string, unknown> | string | null;
  created_at: string;
}

export interface Owner {
  id: number;
  email: string;
  restaurant: { id: number; name: string };
}

export interface PublicItem {
  id: number;
  name: string;
  description: string | null;
  price: number;
  final_price: number;
  discount_active: boolean;
  is_available: boolean;
  image_url: string | null;
}

export interface PublicMenu {
  restaurant_id: number;
  name: string;
  categories: {
    id: number;
    name: string;
    subcategories: { id: number; name: string; items: PublicItem[] }[];
  }[];
}
