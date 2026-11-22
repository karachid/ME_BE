import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { FlameIcon, Logo, SearchIcon } from "../components/icons";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n";
import type { PublicItem, PublicMenu } from "../types";

const discountPct = (i: PublicItem) =>
  i.price > 0 ? Math.round((1 - i.final_price / i.price) * 100) : 0;

function PriceBlock({ item }: { item: PublicItem }) {
  const { money } = useI18n();
  const muted = !item.is_available;
  return (
    <div className="shrink-0 text-end">
      {item.discount_active && (
        <div className="flex items-center justify-end gap-1.5">
          {!muted && (
            <span dir="ltr" className="rounded-md bg-saffron-500 px-1.5 py-0.5 text-xs font-extrabold text-white">
              -{discountPct(item)}%
            </span>
          )}
          <s className="whitespace-nowrap text-sm text-ink-soft">{money(item.price)}</s>
        </div>
      )}
      <span
        className={`whitespace-nowrap text-lg font-extrabold ${
          muted ? "text-ink-soft" : item.discount_active ? "text-saffron-700" : "text-brand-700"
        }`}
      >
        {money(item.final_price)}
      </span>
    </div>
  );
}

function MenuItemCard({ item }: { item: PublicItem }) {
  const { t } = useI18n();
  const out = !item.is_available;
  return (
    <li className={`card rise flex items-center gap-3 p-3.5 ${out ? "bg-stone-50" : ""}`}>
      {item.image_url && (
        <img
          src={item.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className={`h-20 w-20 shrink-0 rounded-xl object-cover ${out ? "grayscale" : ""}`}
        />
      )}
      <div className="min-w-0 flex-1">
        <h4 className={`text-base font-bold leading-snug ${out ? "text-ink-soft" : ""}`}>
          {item.name}
        </h4>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-ink-soft">
            {item.description}
          </p>
        )}
        {out && (
          <span className="mt-1.5 inline-block rounded-md bg-stone-200 px-2 py-0.5 text-xs font-bold text-ink-soft">
            {t("soldOut")}
          </span>
        )}
      </div>
      <PriceBlock item={item} />
    </li>
  );
}

// Customer-facing page (no login): what the QR code opens.
export default function PublicMenuPage() {
  const { restaurantId } = useParams();
  const [search] = useSearchParams();
  const { t, money } = useI18n();
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<number | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!restaurantId) return;
    api
      .publicMenu(restaurantId, search.get("preview") === "1")
      .then((m) => {
        setMenu(m);
        setActive(m.categories[0]?.id ?? null);
        setState("ok");
        // Count one visit per browser session; the owner's own preview is not a visit.
        if (search.get("preview") !== "1") {
          const key = `mx_viewed_${restaurantId}`;
          try {
            if (!sessionStorage.getItem(key)) {
              sessionStorage.setItem(key, "1");
              api.recordView(restaurantId).catch(() => {});
            }
          } catch {
            api.recordView(restaurantId).catch(() => {});
          }
        }
      })
      .catch(() => setState("missing"));
  }, [restaurantId]);

  const q = query.trim().toLowerCase();

  // Apply the search filter; drop empty subcategories/categories.
  const categories = useMemo(() => {
    if (!menu) return [];
    if (!q) return menu.categories;
    return menu.categories
      .map((c) => ({
        ...c,
        subcategories: c.subcategories
          .map((s) => ({
            ...s,
            items: s.items.filter(
              (i) =>
                i.name.toLowerCase().includes(q) ||
                (i.description ?? "").toLowerCase().includes(q),
            ),
          }))
          .filter((s) => s.items.length > 0),
      }))
      .filter((c) => c.subcategories.length > 0);
  }, [menu, q]);

  const offers = useMemo(
    () =>
      menu?.categories
        .flatMap((c) => c.subcategories.flatMap((s) => s.items))
        .filter((i) => i.discount_active && i.is_available) ?? [],
    [menu],
  );

  // Scroll-spy: highlight the category currently on screen.
  useEffect(() => {
    if (!categories.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length) {
          setActive(Number(visible[0].target.getAttribute("data-cat")));
        }
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    document.querySelectorAll("[data-cat]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [categories]);

  // Keep the active chip visible in the horizontal tab bar.
  useEffect(() => {
    const chip = navRef.current?.querySelector(`[data-chip="${active}"]`);
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  if (state === "loading")
    return (
      <div className="mx-auto max-w-2xl animate-pulse space-y-3 p-4">
        <div className="h-40 rounded-3xl bg-stone-200" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-stone-200" />
        ))}
      </div>
    );
  if (state === "missing" || !menu)
    return <p className="p-10 text-center text-ink-soft">{t("menuNotFound")}</p>;

  return (
    <div className="pb-12">
      {/* Hero */}
      <header className="pattern relative bg-brand-800 px-4 pb-12 pt-4 text-white sm:rounded-b-[2rem]">
        <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <Logo size={36} />
          <LangSwitch onDark />
        </div>
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-brand-200">
          {t("yourMenu")}
        </p>
        <h1 className="mt-1 text-4xl font-extrabold leading-tight">{menu.name}</h1>
        </div>
      </header>
      <div className="mx-auto max-w-2xl">

      {/* Search overlaps the hero */}
      <div className="relative z-20 -mt-6 px-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchMenu")}
            className="field ps-12 shadow-lg"
            style={{ minHeight: 52 }}
          />
        </div>
      </div>

      {/* Offers */}
      {!q && offers.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 flex items-center gap-2 px-4 text-lg font-extrabold">
            <FlameIcon className="text-saffron-600" /> {t("offers")}
          </h2>
          <ul className="flex gap-3 overflow-x-auto px-4 pb-2">
            {offers.map((i) => (
              <li
                key={i.id}
                className="w-44 shrink-0 rounded-2xl bg-gradient-to-br from-saffron-400 to-saffron-600 p-3.5 text-white shadow-md"
              >
                <span dir="ltr" className="inline-block rounded-md bg-white/25 px-1.5 py-0.5 text-xs font-extrabold">
                  -{discountPct(i)}%
                </span>
                <p className="mt-2 line-clamp-2 min-h-[2.75rem] font-bold leading-snug">{i.name}</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold">{money(i.final_price)}</span>
                  <s className="text-sm opacity-80">{money(i.price)}</s>
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Category tabs */}
      {!q && (
        <nav
          ref={navRef}
          className="sticky top-0 z-10 mt-3 flex gap-2 overflow-x-auto bg-cream/95 px-4 py-3 backdrop-blur"
        >
          {menu.categories.map((c) => (
            <a
              key={c.id}
              data-chip={c.id}
              href={`#cat-${c.id}`}
              className={`flex shrink-0 items-center rounded-full px-4 text-sm font-bold transition ${
                active === c.id
                  ? "bg-brand-700 text-white shadow"
                  : "border border-line bg-white text-ink"
              }`}
              style={{ minHeight: 44 }}
            >
              {c.name}
            </a>
          ))}
        </nav>
      )}

      {/* Items */}
      <div className="mt-2 space-y-8 px-4">
        {categories.length === 0 && (
          <p className="py-12 text-center text-ink-soft">{t("noResults")}</p>
        )}
        {categories.map((cat) => (
          <section key={cat.id} id={`cat-${cat.id}`} data-cat={cat.id} className="scroll-mt-20">
            <h2 className="mb-3 flex items-center gap-3 text-2xl font-extrabold">
              {cat.name}
              <span className="h-px flex-1 bg-line" />
            </h2>
            {cat.subcategories.map((sub) => (
              <div key={sub.id} className="mb-5">
                {sub.name !== cat.name && (
                  <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-brand-700">
                    {sub.name}
                  </h3>
                )}
                <ul className="flex flex-col gap-2.5">
                  {sub.items.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>

      <footer className="mt-12 flex items-center justify-center gap-2 text-sm text-ink-soft">
        {t("poweredBy")} <span className="font-extrabold text-brand-700">MenuXpert</span>
      </footer>
      </div>
    </div>
  );
}
