import { useState } from "react";
import { api, ApiError } from "../api";
import { useI18n } from "../i18n";
import type { Discount, DiscountType, Item } from "../types";
import Modal from "./Modal";

// ISO (UTC) <-> <input type="datetime-local"> (shop's local time)
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function previewPrice(price: number, type: DiscountType, value: number): number {
  const result = type === "percent" ? price * (1 - value / 100) : price - value;
  return Math.max(Math.round(result * 100) / 100, 0);
}

/** Set or clear a promotion on one item, or on several at once (bulk). */
export default function DiscountModal({
  items,
  onClose,
  onSaved,
}: {
  items: Item[];
  onClose: () => void;
  onSaved: (items: Item[]) => void;
}) {
  const { t, tf, money } = useI18n();
  const item = items[0];
  const single = items.length === 1;
  const minPrice = Math.min(...items.map((i) => i.price));
  const existing = single ? item.discount : null;
  const [type, setType] = useState<DiscountType>(existing?.type ?? "percent");
  const [value, setValue] = useState(existing ? String(existing.value) : "");
  const [scheduled, setScheduled] = useState(!!(existing?.starts_at || existing?.ends_at));
  const [from, setFrom] = useState(toLocalInput(existing?.starts_at ?? null));
  const [to, setTo] = useState(toLocalInput(existing?.ends_at ?? null));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const numeric = Number(value);
  const valid =
    value !== "" && numeric > 0 && (type === "percent" ? numeric <= 100 : numeric <= minPrice);

  async function save(
    discount: Pick<Discount, "type" | "value" | "starts_at" | "ends_at"> | null,
  ) {
    setBusy(true);
    setError("");
    try {
      if (single) {
        const res = await api.updateItem(item.id, { discount });
        onSaved([res.item]);
      } else {
        const res = await api.bulk(
          items.map((i) => i.id),
          { action: "discount", discount },
        );
        onSaved(res.items);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("networkError"));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={`${t("discountTitle")} — ${single ? item.name : tf("selectedCount", { n: items.length })}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {/* Type */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-stone-100 p-1.5">
          {(["percent", "fixed"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setType(kind)}
              className={`rounded-xl py-2.5 font-bold transition ${
                type === kind ? "bg-white text-brand-700 shadow" : "text-ink-soft"
              }`}
            >
              {t(kind)}
            </button>
          ))}
        </div>

        {type === "percent" && (
          <div className="grid grid-cols-4 gap-2">
            {[10, 20, 30, 50].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setValue(String(p))}
                className={`rounded-xl border-2 py-2.5 font-extrabold transition ${
                  numeric === p
                    ? "border-saffron-500 bg-saffron-50 text-saffron-700"
                    : "border-line text-ink hover:border-saffron-400"
                }`}
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("value")} {type === "percent" ? "(%)" : `(${t("currency")})`}
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="field text-xl font-bold"
            dir="ltr"
          />
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-stone-50 p-3 font-semibold">
          <input
            type="checkbox"
            checked={scheduled}
            onChange={(e) => setScheduled(e.target.checked)}
            className="h-5 w-5 accent-brand-600"
          />
          {t("schedule")}
        </label>
        {scheduled && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("from")}
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="field px-2"
                dir="ltr"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("to")}
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="field px-2"
                dir="ltr"
              />
            </label>
          </div>
        )}

        {valid && (
          <div className="rounded-2xl bg-saffron-50 p-4 text-center">
            <p className="text-sm font-semibold text-saffron-700">{t("newPrice")}</p>
            <p className="mt-1 flex items-baseline justify-center gap-3">
              <s className="text-lg text-ink-soft">{money(item.price)}</s>
              <span className="text-3xl font-extrabold text-saffron-700">
                {money(previewPrice(item.price, type, numeric))}
              </span>
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!valid || busy}
            onClick={() =>
              save({
                type,
                value: numeric,
                starts_at: scheduled ? fromLocalInput(from) : null,
                ends_at: scheduled ? fromLocalInput(to) : null,
              })
            }
            className="btn-primary flex-1 py-3"
          >
            {t("save")}
          </button>
          {(existing || !single) && (
            <button type="button" disabled={busy} onClick={() => save(null)} className="btn-danger px-4 py-3">
              {t("removeDiscount")}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
