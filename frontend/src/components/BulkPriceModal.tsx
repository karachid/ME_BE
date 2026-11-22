import { useState } from "react";
import { api, ApiError } from "../api";
import { useI18n } from "../i18n";
import type { Item } from "../types";
import Modal from "./Modal";

/** Raise or lower the prices of the selected items by a percentage or a fixed amount. */
export default function BulkPriceModal({
  items,
  onClose,
  onSaved,
}: {
  items: Item[];
  onClose: () => void;
  onSaved: (items: Item[]) => void;
}) {
  const { t, tf, money } = useI18n();
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const amount = Number(value);
  const signed = direction * amount;
  const valid = value !== "" && amount > 0;

  const preview = (price: number) =>
    Math.max(Math.round((mode === "percent" ? price * (1 + signed / 100) : price + signed) * 100) / 100, 0);
  const sample = items[0];

  async function apply() {
    setBusy(true);
    setError("");
    try {
      const res = await api.bulk(
        items.map((i) => i.id),
        { action: "price", mode, value: signed },
      );
      onSaved(res.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("networkError"));
      setBusy(false);
    }
  }

  const segment = (active: boolean) =>
    `rounded-xl py-2.5 font-bold transition ${active ? "bg-white text-brand-700 shadow" : "text-ink-soft"}`;

  return (
    <Modal title={tf("adjustPricesTitle", { n: items.length })} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-stone-100 p-1.5">
          <button type="button" className={segment(direction === 1)} onClick={() => setDirection(1)}>
            + {t("increase")}
          </button>
          <button type="button" className={segment(direction === -1)} onClick={() => setDirection(-1)}>
            − {t("decrease")}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-stone-100 p-1.5">
          <button type="button" className={segment(mode === "percent")} onClick={() => setMode("percent")}>
            {t("percent")}
          </button>
          <button type="button" className={segment(mode === "fixed")} onClick={() => setMode("fixed")}>
            {t("fixed")} ({t("currency")})
          </button>
        </div>

        <input
          type="number"
          inputMode="decimal"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="field text-xl font-bold"
          dir="ltr"
          aria-label={t("value")}
          autoFocus
        />

        {valid && sample && (
          <p className="rounded-2xl bg-brand-50 p-3.5 text-center text-sm text-brand-800">
            {t("example")} · {sample.name}:{" "}
            <s className="opacity-70">{money(sample.price)}</s>{" "}
            <b className="text-base">{money(preview(sample.price))}</b>
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <button type="button" disabled={!valid || busy} onClick={apply} className="btn-primary py-3">
          {t("save")}
        </button>
      </div>
    </Modal>
  );
}
