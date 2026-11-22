import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";
import type { Discount, Item } from "../types";
import Avatar from "./Avatar";
import { DotsIcon, PencilIcon, TagIcon, TrashIcon } from "./icons";

interface Props {
  item: Item;
  onToggle: (item: Item) => void;
  onPrice: (item: Item, price: number) => Promise<void>;
  onDiscount: (item: Item) => void;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
  /** Bulk-selection mode */
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (item: Item) => void;
}

type DiscountState = "active" | "scheduled" | "expired";

export function discountState(d: Discount): DiscountState {
  if (d.active) return "active";
  return d.starts_at && new Date(d.starts_at) > new Date() ? "scheduled" : "expired";
}

function RowMenu({
  item,
  onEdit,
  onDelete,
  className = "",
}: Pick<Props, "item" | "onEdit" | "onDelete"> & { className?: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={item.name}
        className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-soft hover:bg-stone-100"
      >
        <DotsIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="card rise absolute end-0 top-full z-20 mt-1 w-44 overflow-hidden p-1 shadow-xl"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit(item);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start font-semibold hover:bg-stone-100"
          >
            <PencilIcon /> {t("edit")}
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              onDelete(item);
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start font-semibold text-red-700 hover:bg-red-50"
          >
            <TrashIcon /> {t("delete")}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ItemRow({
  item,
  onToggle,
  onPrice,
  onDiscount,
  onEdit,
  onDelete,
  selectable,
  selected,
  onSelect,
}: Props) {
  const { t, money } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const discount = item.discount;
  const dState = discount ? discountState(discount) : null;
  const live = dState === "active";

  async function commitPrice() {
    setEditing(false);
    const next = Number(draft);
    if (draft !== "" && Number.isFinite(next) && next >= 0 && next !== item.price) {
      await onPrice(item, next);
    }
  }

  const promoLabel = discount
    ? `${discount.type === "percent" ? `-${discount.value}%` : `-${discount.value} ${t("currency")}`}`
    : t("discount");

  return (
    <li
      className={`card flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:gap-4 ${
        selected ? "ring-2 ring-brand-500" : item.is_available ? "" : "bg-stone-50"
      }`}
    >
      {/* Identity */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onSelect?.(item)}
            aria-label={item.name}
            className="h-6 w-6 shrink-0 accent-brand-600"
          />
        )}
        <div className={item.is_available ? "" : "opacity-60 grayscale"}>
          <Avatar name={item.name} src={item.image_url} size={52} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-lg font-bold leading-tight ${item.is_available ? "" : "text-ink-soft"}`}>
            {item.name}
          </p>
          <p className="truncate text-sm text-ink-soft">
            {item.category_name}
            {item.subcategory_name !== item.category_name && ` › ${item.subcategory_name}`}
          </p>
        </div>
        <RowMenu item={item} onEdit={onEdit} onDelete={onDelete} className="sm:hidden" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 sm:flex-nowrap sm:justify-end sm:gap-3">
        {editing ? (
          <input
            autoFocus
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitPrice}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitPrice();
              if (e.key === "Escape") setEditing(false);
            }}
            className="field w-28 border-brand-500 text-center text-lg font-bold ring-4 ring-brand-100"
            dir="ltr"
            aria-label={t("price")}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(String(item.price));
              setEditing(true);
            }}
            className="group flex min-w-24 flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 px-3 py-1 leading-tight hover:border-brand-500 hover:bg-brand-50"
            aria-label={`${t("price")}: ${money(item.price)}`}
          >
            {live ? (
              <>
                <s className="whitespace-nowrap text-xs text-ink-soft">{money(item.price)}</s>
                <span className="whitespace-nowrap text-lg font-extrabold text-saffron-700">{money(item.final_price)}</span>
              </>
            ) : (
              <span className="whitespace-nowrap text-lg font-extrabold">{money(item.price)}</span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => onDiscount(item)}
          title={t("discountTitle")}
          className={`flex items-center gap-1.5 rounded-xl px-3 text-sm font-bold transition ${
            !discount
              ? "border border-stone-200 text-ink-soft hover:bg-stone-100"
              : live
                ? "bg-saffron-100 text-saffron-700 hover:bg-saffron-200"
                : "border border-dashed border-saffron-400 text-saffron-700 hover:bg-saffron-50"
          }`}
        >
          <TagIcon width={16} height={16} />
          <span className="flex flex-col items-start leading-tight">
            <bdi dir="ltr">{promoLabel}</bdi>
            {dState && dState !== "active" && (
              <span className="text-[10px] font-semibold opacity-80">
                {dState === "scheduled" ? t("scheduled") : t("expired")}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          role="switch"
          aria-checked={item.is_available}
          aria-label={`${item.name}: ${item.is_available ? t("available") : t("soldOut")}`}
          onClick={() => onToggle(item)}
          className="flex items-center gap-2 rounded-xl px-1"
        >
          <span
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              item.is_available ? "bg-brand-500" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                item.is_available ? "start-7" : "start-1"
              }`}
            />
          </span>
          <span
            className={`text-start text-xs font-bold leading-tight ${
              item.is_available ? "text-brand-700" : "text-ink-soft"
            }`}
          >
            {item.is_available ? t("available") : t("soldOut")}
          </span>
        </button>

        <RowMenu item={item} onEdit={onEdit} onDelete={onDelete} className="hidden sm:block" />
      </div>
    </li>
  );
}
