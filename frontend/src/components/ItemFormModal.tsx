import { useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "../api";
import { useI18n } from "../i18n";
import type { Category, Item } from "../types";
import Modal from "./Modal";

interface Props {
  item: Item | null; // null = create
  categories: Category[];
  onClose: () => void;
  onSaved: (item: Item) => void;
  onCategoryAdded: (category: Category) => void;
}

export default function ItemFormModal({
  item,
  categories,
  onClose,
  onSaved,
  onCategoryAdded,
}: Props) {
  const { t } = useI18n();
  const options = categories.flatMap((c) =>
    c.subcategories.map((s) => ({
      id: s.id,
      label: s.name === c.name ? c.name : `${c.name} › ${s.name}`,
    })),
  );

  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [imageUrl, setImageUrl] = useState(item?.image_url ?? "");
  const [subId, setSubId] = useState<number | "">(item?.subcategory_id ?? options[0]?.id ?? "");
  const [newCategory, setNewCategory] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function addCategory() {
    const label = newCategory.trim();
    if (!label) return;
    try {
      const { category } = await api.addCategory(label);
      onCategoryAdded(category);
      setSubId(category.subcategories[0]?.id ?? "");
      setNewCategory("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("networkError"));
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const numericPrice = Number(price);
    if (!name.trim()) return setError(t("nameRequired"));
    if (price === "" || !Number.isFinite(numericPrice) || numericPrice < 0)
      return setError(t("priceInvalid"));
    if (subId === "") return setError(t("categoryRequired"));

    setBusy(true);
    setError("");
    try {
      const payload = {
        name: name.trim(),
        description,
        price: numericPrice,
        subcategory_id: subId,
        image_url: imageUrl.trim(),
      };
      const res = item
        ? await api.updateItem(item.id, payload)
        : await api.addItem(payload);
      onSaved(res.item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("networkError"));
      setBusy(false);
    }
  }

  const field = "field";

  return (
    <Modal title={item ? t("editItem") : t("addItem")} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("name")}
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("price")} ({t("currency")})
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={field}
            dir="ltr"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("category")}
          <select
            value={subId}
            onChange={(e) => setSubId(e.target.value ? Number(e.target.value) : "")}
            className={field}
          >
            {options.length === 0 && <option value="" />}
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder={t("newCategory")}
            className="field min-w-0 flex-1"
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCategory.trim()}
            className="btn-soft shrink-0 px-4"
          >
            {t("addCategory")}
          </button>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("description")}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="field py-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("imageUrl")}
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className={field}
            dir="ltr"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <button disabled={busy} className="btn-primary flex-1 py-3">
            {t("save")}
          </button>
          <button type="button" onClick={onClose} className="btn-soft px-5 py-3">
            {t("cancel")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
