import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import BulkPriceModal from "../components/BulkPriceModal";
import DiscountModal from "../components/DiscountModal";
import { CheckIcon, PlusIcon, SearchIcon, TagIcon } from "../components/icons";
import ItemFormModal from "../components/ItemFormModal";
import ItemRow from "../components/ItemRow";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useI18n } from "../i18n";
import type { Category, Item } from "../types";

type Status = "all" | "available" | "soldout" | "promo" | "noimage" | "nodesc";
const STATUSES: Status[] = ["all", "available", "soldout", "promo", "noimage", "nodesc"];

const matches: Record<Status, (i: Item) => boolean> = {
  all: () => true,
  available: (i) => i.is_available,
  soldout: (i) => !i.is_available,
  promo: (i) => !!i.discount?.active,
  noimage: (i) => !i.image_url,
  nodesc: (i) => !(i.description ?? "").trim(),
};

export default function MenuPage() {
  const { owner } = useAuth();
  const { t, tf } = useI18n();
  const restaurantId = owner!.restaurant.id;
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const [discountFor, setDiscountFor] = useState<Item[] | null>(null);
  const [pricing, setPricing] = useState(false);
  const [form, setForm] = useState<{ item: Item | null } | null>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);

  const statusParam = params.get("status") as Status | null;
  const status: Status = statusParam && STATUSES.includes(statusParam) ? statusParam : "all";
  const setStatus = (s: Status) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (s === "all") next.delete("status");
        else next.set("status", s);
        return next;
      },
      { replace: true },
    );

  const notify = useCallback((text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 2500);
  }, []);

  const fail = useCallback(
    (err: unknown) =>
      notify(err instanceof ApiError && err.status ? err.message : t("networkError"), true),
    [notify, t],
  );

  useEffect(() => {
    Promise.all([api.items(), api.categories(restaurantId)])
      .then(([i, c]) => {
        setItems(i);
        setCategories(c);
      })
      .catch(fail)
      .finally(() => setLoading(false));
  }, [restaurantId, fail]);

  // "Add item" quick action from the overview: /menu?add=1
  useEffect(() => {
    if (params.get("add") === "1") {
      setForm({ item: null });
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete("add");
          return next;
        },
        { replace: true },
      );
    }
  }, [params, setParams]);

  const replaceItems = (updated: Item[]) => {
    const byId = new Map(updated.map((i) => [i.id, i]));
    setItems((prev) => prev.map((i) => byId.get(i.id) ?? i));
  };
  const replaceItem = (updated: Item) => replaceItems([updated]);

  async function toggle(item: Item) {
    replaceItem({ ...item, is_available: !item.is_available }); // instant feedback
    try {
      const res = await api.updateItem(item.id, { is_available: !item.is_available });
      replaceItem(res.item);
    } catch (err) {
      replaceItem(item); // roll back
      fail(err);
    }
  }

  async function changePrice(item: Item, price: number) {
    try {
      const res = await api.updateItem(item.id, { price });
      replaceItem(res.item);
      notify(t("saved"));
    } catch (err) {
      fail(err);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await api.deleteItem(target.id);
      setItems((prev) => prev.filter((i) => i.id !== target.id));
      notify(t("deleted"));
    } catch (err) {
      fail(err);
    }
  }

  const counts = useMemo(() => {
    const out = {} as Record<Status, number>;
    for (const s of STATUSES) out[s] = items.filter(matches[s]).length;
    return out;
  }, [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (i) =>
        (categoryId === null || i.category_id === categoryId) &&
        matches[status](i) &&
        (!q || i.name.toLowerCase().includes(q)),
    );
  }, [items, search, categoryId, status]);

  const groups = useMemo(() => {
    const order = new Map(categories.map((c, idx) => [c.id, idx]));
    const map = new Map<number, { name: string; items: Item[] }>();
    for (const item of visible) {
      const g = map.get(item.category_id) ?? { name: item.category_name, items: [] };
      g.items.push(item);
      map.set(item.category_id, g);
    }
    return [...map.entries()]
      .sort(([a], [b]) => (order.get(a) ?? 999) - (order.get(b) ?? 999))
      .map(([id, g]) => ({ id, ...g }));
  }, [visible, categories]);

  // ----- selection -----
  const toggleSelect = (item: Item) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  const exitSelection = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  const selectedItems = items.filter((i) => selected.has(i.id));
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selected.has(i.id));

  async function bulkAvailability(flag: boolean) {
    try {
      const res = await api.bulk(
        selectedItems.map((i) => i.id),
        { action: "availability", is_available: flag },
      );
      replaceItems(res.items);
      notify(tf("bulkDone", { n: res.items.length }));
      exitSelection();
    } catch (err) {
      fail(err);
    }
  }

  const statusLabel: Record<Status, string> = {
    all: t("statusAll"),
    available: t("available"),
    soldout: t("soldOut"),
    promo: t("statPromo"),
    noimage: t("filterNoImage"),
    nodesc: t("filterNoDesc"),
  };

  const bulkBtn =
    "btn-soft px-3.5 py-2.5 text-sm disabled:opacity-40";

  return (
    <div className={selecting ? "pb-24" : ""}>
      <PageHeader
        title={t("navMenu")}
        subtitle={t("sortHint")}
        actions={
          <>
            <button
              type="button"
              onClick={() => (selecting ? exitSelection() : setSelecting(true))}
              className={selecting ? "btn-primary px-4 py-2.5" : "btn-soft px-4 py-2.5"}
            >
              <CheckIcon width={18} height={18} /> {selecting ? t("done") : t("select")}
            </button>
            <button
              type="button"
              onClick={() => setForm({ item: null })}
              className="btn-primary hidden px-4 py-2.5 sm:inline-flex"
            >
              <PlusIcon width={18} height={18} /> {t("addItem")}
            </button>
          </>
        }
      />

      {/* Status filters */}
      <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            aria-pressed={status === s}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition ${
              status === s
                ? "bg-ink text-white shadow"
                : "border border-line bg-white text-ink hover:bg-stone-50"
            }`}
            style={{ minHeight: 40 }}
          >
            {statusLabel[s]}
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                status === s ? "bg-white/20" : "bg-stone-100 text-ink-soft"
              }`}
            >
              {loading ? "–" : counts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Search + categories */}
      <div className="sticky top-[68px] z-20 -mx-4 bg-cream px-4 pb-2 pt-1 lg:top-0 lg:mx-0 lg:px-0">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="field ps-12"
          />
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {[{ id: null as number | null, name: t("all") }, ...categories].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              onClick={() => setCategoryId(c.id)}
              className={`shrink-0 rounded-full px-4 text-sm font-bold transition ${
                categoryId === c.id
                  ? "bg-brand-700 text-white shadow"
                  : "border border-line bg-white text-ink hover:bg-stone-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <ul className="mt-4 animate-pulse space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="h-[76px] rounded-2xl bg-stone-200/70" />
          ))}
        </ul>
      ) : groups.length === 0 ? (
        <p className="py-16 text-center text-ink-soft">{items.length ? t("noResults") : t("noItems")}</p>
      ) : (
        groups.map((g) => (
          <section key={g.id} className="mt-5">
            <h2 className="mb-2 flex items-center gap-2 text-lg font-extrabold">
              {g.name}
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold text-ink-soft">
                {g.items.length}
              </span>
            </h2>
            <ul className="flex flex-col gap-2.5">
              {g.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  onToggle={toggle}
                  onPrice={changePrice}
                  onDiscount={(i) => setDiscountFor([i])}
                  onEdit={(i) => setForm({ item: i })}
                  onDelete={setDeleting}
                  selectable={selecting}
                  selected={selected.has(item.id)}
                  onSelect={toggleSelect}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Bulk action bar */}
      {selecting && (
        <div className="card rise fixed inset-x-3 bottom-[76px] z-40 mx-auto flex max-w-3xl flex-wrap items-center gap-2 p-3 shadow-xl lg:bottom-6 lg:ms-72 lg:max-w-2xl">
          <label className="flex items-center gap-2 pe-2 text-sm font-bold">
            <input
              type="checkbox"
              className="h-5 w-5 accent-brand-600"
              checked={allVisibleSelected}
              onChange={() =>
                setSelected(allVisibleSelected ? new Set() : new Set(visible.map((i) => i.id)))
              }
            />
            {selected.size > 0 ? tf("selectedCount", { n: selected.size }) : t("selectAll")}
          </label>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <button type="button" disabled={!selected.size} onClick={() => bulkAvailability(false)} className={bulkBtn}>
              {t("markSoldOut")}
            </button>
            <button type="button" disabled={!selected.size} onClick={() => bulkAvailability(true)} className={bulkBtn}>
              {t("markAvailable")}
            </button>
            <button type="button" disabled={!selected.size} onClick={() => setPricing(true)} className={bulkBtn}>
              {t("adjustPrices")}
            </button>
            <button
              type="button"
              disabled={!selected.size}
              onClick={() => setDiscountFor(selectedItems)}
              className="btn-primary px-3.5 py-2.5 text-sm"
            >
              <TagIcon width={16} height={16} /> {t("applyPromo")}
            </button>
          </div>
        </div>
      )}

      {!selecting && (
        <button
          type="button"
          onClick={() => setForm({ item: null })}
          className="btn-primary fixed bottom-[84px] end-4 z-30 gap-2 rounded-full px-5 py-3.5 text-lg shadow-xl sm:hidden"
          aria-label={t("addItem")}
        >
          <PlusIcon /> {t("addItem")}
        </button>
      )}

      {discountFor && (
        <DiscountModal
          items={discountFor}
          onClose={() => setDiscountFor(null)}
          onSaved={(updated) => {
            replaceItems(updated);
            setDiscountFor(null);
            notify(t("saved"));
            if (updated.length > 1) exitSelection();
          }}
        />
      )}

      {pricing && (
        <BulkPriceModal
          items={selectedItems}
          onClose={() => setPricing(false)}
          onSaved={(updated) => {
            replaceItems(updated);
            setPricing(false);
            notify(tf("bulkDone", { n: updated.length }));
            exitSelection();
          }}
        />
      )}

      {form && (
        <ItemFormModal
          item={form.item}
          categories={categories}
          onClose={() => setForm(null)}
          onCategoryAdded={(c) => setCategories((prev) => [...prev, c])}
          onSaved={(saved) => {
            setItems((prev) =>
              prev.some((i) => i.id === saved.id)
                ? prev.map((i) => (i.id === saved.id ? saved : i))
                : [...prev, saved],
            );
            setForm(null);
            notify(t("saved"));
          }}
        />
      )}

      {deleting && (
        <Modal title={t("confirmDelete")} onClose={() => setDeleting(null)}>
          <p className="mb-5 text-lg font-semibold text-ink-soft">{deleting.name}</p>
          <div className="flex gap-2">
            <button type="button" onClick={confirmDelete} className="btn flex-1 bg-red-600 py-3 text-white hover:bg-red-700">
              {t("delete")}
            </button>
            <button type="button" onClick={() => setDeleting(null)} className="btn-soft px-5 py-3">
              {t("cancel")}
            </button>
          </div>
        </Modal>
      )}

      {toast && (
        <div
          role="status"
          className={`rise fixed inset-x-4 top-4 z-[60] mx-auto max-w-sm rounded-2xl px-4 py-3 text-center font-bold text-white shadow-xl ${
            toast.error ? "bg-red-600" : "bg-ink"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
