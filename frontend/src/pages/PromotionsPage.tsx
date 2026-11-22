import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import Avatar from "../components/Avatar";
import DiscountModal from "../components/DiscountModal";
import { discountState } from "../components/ItemRow";
import PageHeader from "../components/PageHeader";
import { useI18n } from "../i18n";
import type { Item } from "../types";

type Section = "active" | "scheduled" | "expired";

export default function PromotionsPage() {
  const { t, tf, money, lang } = useI18n();
  const [items, setItems] = useState<Item[] | null>(null);
  const [editing, setEditing] = useState<Item | null>(null);
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
    api.items().then(setItems).catch((e) => {
      setItems([]);
      fail(e);
    });
  }, [fail]);

  const sections = useMemo(() => {
    const out: Record<Section, Item[]> = { active: [], scheduled: [], expired: [] };
    for (const i of items ?? []) if (i.discount) out[discountState(i.discount)].push(i);
    return out;
  }, [items]);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(lang === "ar" ? "ar-MA-u-nu-latn" : "fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [lang],
  );

  const replace = (updated: Item[]) => {
    const byId = new Map(updated.map((i) => [i.id, i]));
    setItems((prev) => (prev ?? []).map((i) => byId.get(i.id) ?? i));
  };

  async function remove(item: Item) {
    try {
      const res = await api.updateItem(item.id, { discount: null });
      replace([res.item]);
      notify(t("saved"));
    } catch (err) {
      fail(err);
    }
  }

  async function clearExpired() {
    try {
      const res = await api.bulk(
        sections.expired.map((i) => i.id),
        { action: "discount", discount: null },
      );
      replace(res.items);
      notify(t("clearConfirmed"));
    } catch (err) {
      fail(err);
    }
  }

  function when(item: Item) {
    const d = item.discount!;
    const state = discountState(d);
    if (state === "scheduled" && d.starts_at) return tf("promoFrom", { date: fmt.format(new Date(d.starts_at)) });
    if (state === "expired" && d.ends_at) return tf("promoEnded", { date: fmt.format(new Date(d.ends_at)) });
    if (d.ends_at) return tf("promoUntil", { date: fmt.format(new Date(d.ends_at)) });
    return t("promoNoLimit");
  }

  const SECTION_META: { key: Section; title: string; dot: string }[] = [
    { key: "active", title: t("promoActive"), dot: "bg-saffron-500" },
    { key: "scheduled", title: t("promoScheduled"), dot: "bg-sky-500" },
    { key: "expired", title: t("promoExpired"), dot: "bg-stone-400" },
  ];

  const total = sections.active.length + sections.scheduled.length + sections.expired.length;

  return (
    <>
      <PageHeader
        title={t("promosTitle")}
        subtitle={t("promosSubtitle")}
        actions={
          <Link to="/menu" className="btn-primary px-4 py-2.5">
            {t("goToMenu")}
          </Link>
        }
      />

      {items === null ? (
        <div className="animate-pulse space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-stone-200/70" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-bold">{t("promoNone")}</p>
          <p className="mx-auto mt-1 max-w-md text-ink-soft">{t("promoCreateHint")}</p>
        </div>
      ) : (
        <div className="space-y-7">
          {SECTION_META.map(({ key, title, dot }) =>
            sections[key].length === 0 ? null : (
              <section key={key}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  <h2 className="text-lg font-extrabold">{title}</h2>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-bold text-ink-soft">
                    {sections[key].length}
                  </span>
                  {key === "expired" && (
                    <button
                      type="button"
                      onClick={clearExpired}
                      className="ms-auto rounded-lg px-2 text-sm font-bold text-red-700 hover:bg-red-50"
                      style={{ minHeight: 36 }}
                    >
                      {t("clearExpired")}
                    </button>
                  )}
                </div>
                <ul className="flex flex-col gap-2.5">
                  {sections[key].map((item) => {
                    const d = item.discount!;
                    return (
                      <li key={item.id} className="card flex flex-wrap items-center gap-3 p-3.5">
                        <Avatar name={item.name} src={item.image_url} size={48} />
                        <div className="min-w-0 flex-1 basis-40">
                          <p className="truncate font-bold">{item.name}</p>
                          <p className="truncate text-sm text-ink-soft">{when(item)}</p>
                        </div>
                        <span
                          dir="ltr"
                          className={`rounded-lg px-2.5 py-1 text-sm font-extrabold ${
                            key === "active"
                              ? "bg-saffron-100 text-saffron-700"
                              : "bg-stone-100 text-ink-soft"
                          }`}
                        >
                          {d.type === "percent" ? `-${d.value}%` : `-${d.value} ${t("currency")}`}
                        </span>
                        <div className="min-w-24 text-end leading-tight">
                          <s className="whitespace-nowrap text-xs text-ink-soft">{money(item.price)}</s>
                          <p className="whitespace-nowrap font-extrabold">
                            {money(
                              d.type === "percent"
                                ? Math.round(item.price * (1 - d.value / 100) * 100) / 100
                                : Math.max(item.price - d.value, 0),
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditing(item)} className="btn-soft px-3.5 py-2 text-sm">
                            {t("edit")}
                          </button>
                          <button type="button" onClick={() => remove(item)} className="btn-danger px-3.5 py-2 text-sm">
                            {t("remove")}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ),
          )}
        </div>
      )}

      {editing && (
        <DiscountModal
          items={[editing]}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            replace(updated);
            setEditing(null);
            notify(t("saved"));
          }}
        />
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
