import { useI18n } from "../i18n";
import type { TKey } from "../i18n";
import type { Activity } from "../types";
import { PencilIcon, PlusIcon, TagIcon, TrashIcon } from "./icons";

function useAgo() {
  const { lang, t } = useI18n();
  const rtf = new Intl.RelativeTimeFormat(lang === "ar" ? "ar-MA-u-nu-latn" : "fr", {
    numeric: "auto",
    style: "short",
  });
  return (iso: string) => {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const abs = Math.abs(seconds);
    if (abs < 45) return t("justNow");
    if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
    return rtf.format(Math.round(seconds / 86400), "day");
  };
}

const TITLE: Record<string, TKey> = {
  "create:item": "actItemCreate",
  "update:item": "actItemUpdate",
  "delete:item": "actItemDelete",
  "bulk:item": "actItemBulk",
  "create:category": "actCategoryCreate",
  "update:category": "actCategoryUpdate",
  "delete:category": "actCategoryDelete",
  "update:restaurant": "actRestaurantUpdate",
};

function icon(a: Activity) {
  if (a.action_type === "create") return <PlusIcon width={16} height={16} />;
  if (a.action_type === "delete") return <TrashIcon width={16} height={16} />;
  if (a.details && typeof a.details === "object" && "discount" in a.details)
    return <TagIcon width={16} height={16} />;
  return <PencilIcon width={16} height={16} />;
}

const TONE: Record<string, string> = {
  create: "bg-brand-100 text-brand-700",
  delete: "bg-red-100 text-red-700",
  update: "bg-stone-100 text-ink-soft",
  bulk: "bg-saffron-100 text-saffron-700",
};

export default function ActivityList({ items }: { items: Activity[] }) {
  const { t, tf, money } = useI18n();
  const ago = useAgo();

  /** Localized sentence with the (user-typed) name isolated so mixed scripts keep their order. */
  function title(a: Activity) {
    const key = TITLE[`${a.action_type}:${a.object_type}`];
    if (!key) return a.object_name;
    let name = a.object_name ?? "";
    if (a.action_type === "bulk" && a.details && typeof a.details === "object" && "count" in a.details) {
      name = tf("productsCount", { n: Number(a.details.count) });
    }
    const [before, after = ""] = t(key).split("{name}");
    return (
      <>
        {before}
        <bdi>{name}</bdi>
        {after}
      </>
    );
  }

  /** Short human detail line for an update/bulk entry. */
  function detail(a: Activity): string | null {
    const d = a.details;
    if (!d || typeof d !== "object") return null;
    const parts: string[] = [];
    if ("new_price" in d && typeof d.new_price === "number") {
      const was = typeof d.old_price === "number" ? `${money(d.old_price)} → ` : "";
      parts.push(`${was}${money(d.new_price)}`);
    }
    if ("new_availability" in d) parts.push(t(d.new_availability ? "detAvailable" : "detSoldOut"));
    if ("is_available" in d) parts.push(t(d.is_available ? "detAvailable" : "detSoldOut"));
    if ("discount" in d) {
      const disc = d.discount as { type?: string; value?: number } | null;
      parts.push(
        disc
          ? tf("detPromo", { v: disc.type === "percent" ? `-${disc.value}%` : `-${disc.value}` })
          : t("detPromoRemoved"),
      );
    }
    if ("mode" in d && typeof d.value === "number") {
      const v = `${d.value > 0 ? "+" : ""}${d.value}${d.mode === "percent" ? "%" : ""}`;
      parts.push(tf(d.value >= 0 ? "detPriceUp" : "detPriceDown", { v }));
    }
    return parts.length ? parts.join(" · ") : null;
  }

  return (
    <ul className="flex flex-col">
      {items.map((a, idx) => {
        const sub = detail(a);
        return (
          <li
            key={a.id}
            className={`flex items-start gap-3 py-3 ${idx > 0 ? "border-t border-line/70" : ""}`}
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[a.action_type]}`}
            >
              {icon(a)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-snug">{title(a)}</p>
              {sub && <p className="truncate text-sm text-ink-soft">{sub}</p>}
            </div>
            <time
              dateTime={a.created_at}
              className="shrink-0 whitespace-nowrap text-xs text-ink-soft"
              style={{ marginTop: 3 }}
            >
              {ago(a.created_at)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
