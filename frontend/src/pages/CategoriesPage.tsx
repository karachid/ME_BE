import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { PencilIcon, PlusIcon, TrashIcon, XIcon } from "../components/icons";
import Modal from "../components/Modal";
import PageHeader from "../components/PageHeader";
import { useI18n } from "../i18n";
import type { Category } from "../types";

export default function CategoriesPage() {
  const { owner } = useAuth();
  const { t, tf } = useI18n();
  const restaurantId = owner!.restaurant.id;

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<{ id: number; value: string } | null>(null);
  const [addingSub, setAddingSub] = useState<{ id: number; value: string } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);

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
    api.categories(restaurantId).then(setCategories).catch((e) => {
      setCategories([]);
      fail(e);
    });
  }, [restaurantId, fail]);

  const replace = (c: Category) =>
    setCategories((prev) => (prev ?? []).map((x) => (x.id === c.id ? c : x)));

  async function add(e: FormEvent) {
    e.preventDefault();
    const label = name.trim();
    if (!label) return;
    try {
      // One default subcategory with the same name: items must live in a subcategory.
      const { category } = await api.addCategory(label);
      setCategories((prev) => [...(prev ?? []), category]);
      setName("");
      notify(t("saved"));
    } catch (err) {
      fail(err);
    }
  }

  async function rename(e: FormEvent) {
    e.preventDefault();
    if (!renaming) return;
    const value = renaming.value.trim();
    if (!value) return;
    try {
      const { category } = await api.updateCategory(renaming.id, { name: value });
      replace(category);
      setRenaming(null);
      notify(t("saved"));
    } catch (err) {
      fail(err);
    }
  }

  async function addSub(e: FormEvent) {
    e.preventDefault();
    if (!addingSub) return;
    const value = addingSub.value.trim();
    if (!value) return;
    try {
      const { category } = await api.updateCategory(addingSub.id, { add_subcategories: [value] });
      replace(category);
      setAddingSub(null);
      notify(t("saved"));
    } catch (err) {
      fail(err);
    }
  }

  async function removeSub(cat: Category, subId: number) {
    try {
      const { category } = await api.updateCategory(cat.id, { delete_subcategories: [subId] });
      replace(category);
    } catch (err) {
      fail(err);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await api.deleteCategory(target.id);
      setCategories((prev) => (prev ?? []).filter((c) => c.id !== target.id));
      notify(t("deleted"));
    } catch (err) {
      fail(err);
    }
  }

  return (
    <>
      <PageHeader title={t("catTitle")} subtitle={t("catSubtitle")} />

      <form onSubmit={add} className="mb-5 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("catNewPlaceholder")}
          className="field min-w-0 flex-1"
        />
        <button className="btn-primary px-5" disabled={!name.trim()}>
          <PlusIcon width={18} height={18} /> {t("catAdd")}
        </button>
      </form>

      {categories === null ? (
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-stone-200/70" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <p className="py-14 text-center text-ink-soft">{t("catEmpty")}</p>
      ) : (
        <ul className="grid items-start gap-3 md:grid-cols-2">
          {categories.map((c) => {
            // The default subcategory shares the category's name: don't list it twice.
            const realSubs = c.subcategories.filter((s) => s.name !== c.name);
            const blocked = c.item_count > 0;
            return (
              <li key={c.id} className="card flex flex-col gap-3 p-4">
                <div className="flex items-start gap-2">
                  {renaming?.id === c.id ? (
                    <form onSubmit={rename} className="flex min-w-0 flex-1 gap-2">
                      <input
                        autoFocus
                        value={renaming.value}
                        onChange={(e) => setRenaming({ id: c.id, value: e.target.value })}
                        onKeyDown={(e) => e.key === "Escape" && setRenaming(null)}
                        className="field min-w-0 flex-1"
                      />
                      <button className="btn-primary px-4">{t("save")}</button>
                    </form>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-lg font-extrabold">{c.name}</h2>
                        <p className="text-sm text-ink-soft">{tf("productsCount", { n: c.item_count })}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRenaming({ id: c.id, value: c.name })}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft hover:bg-stone-100"
                        title={t("catRename")}
                        aria-label={`${t("catRename")}: ${c.name}`}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        disabled={blocked}
                        onClick={() => setDeleting(c)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-red-700 hover:bg-red-50 disabled:text-stone-300 disabled:hover:bg-transparent"
                        title={blocked ? t("catDeleteBlocked") : t("delete")}
                        aria-label={`${t("delete")}: ${c.name}`}
                      >
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>

                {(realSubs.length > 0 || addingSub?.id === c.id) && (
                  <div>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-soft">
                      {t("catSubcategories")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {realSubs.map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 ps-3 pe-1 text-sm font-semibold text-brand-800"
                        >
                          {s.name}
                          <span className="text-xs opacity-60">{s.item_count}</span>
                          <button
                            type="button"
                            disabled={s.item_count > 0}
                            onClick={() => removeSub(c, s.id)}
                            title={s.item_count > 0 ? t("catDeleteBlocked") : t("delete")}
                            aria-label={`${t("delete")}: ${s.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-brand-100 disabled:opacity-30"
                            style={{ minHeight: 28 }}
                          >
                            <XIcon width={14} height={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {addingSub?.id === c.id ? (
                  <form onSubmit={addSub} className="flex gap-2">
                    <input
                      autoFocus
                      value={addingSub.value}
                      onChange={(e) => setAddingSub({ id: c.id, value: e.target.value })}
                      onKeyDown={(e) => e.key === "Escape" && setAddingSub(null)}
                      placeholder={t("catAddSub")}
                      className="field min-w-0 flex-1"
                    />
                    <button className="btn-primary px-4">{t("catAdd")}</button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingSub({ id: c.id, value: "" })}
                    className="self-start rounded-lg px-2 text-sm font-bold text-brand-700 hover:bg-brand-50"
                    style={{ minHeight: 36 }}
                  >
                    + {t("catAddSub")}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {deleting && (
        <Modal title={tf("catConfirmDelete", { name: deleting.name })} onClose={() => setDeleting(null)}>
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
    </>
  );
}
