import type { Activity, Category, Discount, Item, Owner, PublicMenu, Stats } from "./types";

// Empty in dev (Vite proxies to Flask). Set VITE_API_URL for a deployed backend.
const BASE = import.meta.env.VITE_API_URL ?? "";
const TOKEN_KEY = "mx_token";

export const tokenStore = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: user simply logs in again next time */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body) headers["Content-Type"] = "application/json";
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(BASE + path, { ...init, headers });
  } catch {
    throw new ApiError("network", 0);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    // An expired/invalid token on a protected call: send the user back to login.
    if (res.status === 401 && token) {
      tokenStore.clear();
      window.dispatchEvent(new Event("auth-expired"));
    }
    throw new ApiError(body.error ?? "error", res.status);
  }
  return body as T;
}

const json = (data: unknown) => JSON.stringify(data);

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; owner: Owner }>("/auth/login", {
      method: "POST",
      body: json({ email, password }),
    }),
  me: () => request<{ owner: Owner }>("/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: json({ current_password, new_password }),
    }),

  stats: (days: number) => request<Stats>(`/admin/stats?days=${days}`),
  activity: (limit = 20) => request<Activity[]>(`/admin/activity?limit=${limit}`),
  renameRestaurant: (name: string) =>
    request<{ owner: Owner }>("/admin/restaurant", { method: "PATCH", body: json({ name }) }),

  bulk: (
    ids: number[],
    change:
      | { action: "availability"; is_available: boolean }
      | { action: "price"; mode: "percent" | "fixed"; value: number }
      | {
          action: "discount";
          discount: Pick<Discount, "type" | "value" | "starts_at" | "ends_at"> | null;
        },
  ) =>
    request<{ items: Item[] }>("/admin/items/bulk", {
      method: "POST",
      body: json({ ids, ...change }),
    }),

  items: () => request<Item[]>("/admin/items/allitems"),
  categories: (restaurantId: number) =>
    request<Category[]>(`/admin/categories/allcategories/${restaurantId}`),

  addItem: (data: {
    name: string;
    description: string;
    price: number;
    subcategory_id: number;
    image_url?: string;
  }) =>
    request<{ item: Item }>("/admin/items/add", {
      method: "POST",
      body: json(data),
    }),
  updateItem: (
    id: number,
    data: Partial<{
      name: string;
      description: string;
      price: number;
      is_available: boolean;
      subcategory_id: number;
      image_url: string;
      discount: Pick<Discount, "type" | "value" | "starts_at" | "ends_at"> | null;
    }>,
  ) =>
    request<{ item: Item }>(`/admin/items/update/${id}`, {
      method: "PATCH",
      body: json(data),
    }),
  updateCategory: (
    id: number,
    data: { name?: string; add_subcategories?: string[]; delete_subcategories?: number[] },
  ) =>
    request<{ category: Category }>(`/admin/categories/update/${id}`, {
      method: "PATCH",
      body: json(data),
    }),
  deleteCategory: (id: number) =>
    request<{ message: string }>(`/admin/categories/delete/${id}`, { method: "DELETE" }),

  deleteItem: (id: number) =>
    request<{ message: string }>(`/admin/items/delete/${id}`, { method: "DELETE" }),

  addCategory: (name: string) =>
    // One implicit subcategory with the same name, as the seed data does.
    request<{ category: Category }>("/admin/categories/add", {
      method: "POST",
      body: json({ name, subcategories: [name] }),
    }),

  recordView: (restaurantId: number | string) =>
    request<{ counted: boolean }>(`/api/restaurants/${restaurantId}/view`, { method: "POST" }),
  publicMenu: (restaurantId: number | string, preview = false) =>
    request<PublicMenu>(`/api/restaurants/${restaurantId}/menu/full${preview ? "?preview=1" : ""}`),
};
