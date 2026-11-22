import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import ActivityList from "../components/ActivityList";
import BarChart from "../components/BarChart";
import {
  AlertIcon,
  CheckIcon,
  ChevronIcon,
  FlameIcon,
  ListIcon,
  PlusIcon,
  PrinterIcon,
  TagIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "../components/icons";
import PageHeader from "../components/PageHeader";
import { useI18n } from "../i18n";
import type { TKey } from "../i18n";
import type { Activity, Stats } from "../types";

const RANGES = [7, 14, 30] as const;

function Card({
  title,
  children,
  className = "",
  aside,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-soft">{label}</p>
        <p className="text-2xl font-extrabold leading-tight">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
      </div>
    </div>
  );
}

function Delta({ stats }: { stats: Stats }) {
  const { t } = useI18n();
  const { change_percent: pct, total } = stats.views;
  if (pct === null) {
    return total > 0 ? (
      <span className="rounded-md bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-800">
        {t("newLabel")}
      </span>
    ) : null;
  }
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-bold ${
        up ? "bg-brand-100 text-brand-800" : "bg-red-100 text-red-700"
      }`}
    >
      {up ? <TrendUpIcon width={16} height={16} /> : <TrendDownIcon width={16} height={16} />}
      <bdi dir="ltr">
        {up ? "+" : ""}
        {pct}%
      </bdi>
    </span>
  );
}

function Health({ stats }: { stats: Stats }) {
  const { t, tf } = useI18n();
  const h = stats.health;
  const score = h.quality_score;
  // Severity drives the fill; the track is a lighter step of the same ramp.
  const tone =
    score >= 80
      ? { fill: "bg-brand-500", track: "bg-brand-100" }
      : score >= 50
        ? { fill: "bg-saffron-500", track: "bg-saffron-100" }
        : { fill: "bg-red-500", track: "bg-red-100" };

  const all: { n: number; key: TKey; to: string }[] = [
    { n: h.missing_image, key: "healthNoImage", to: "/menu?status=noimage" },
    { n: h.missing_description, key: "healthNoDesc", to: "/menu?status=nodesc" },
    { n: h.sold_out, key: "healthSoldOut", to: "/menu?status=soldout" },
    { n: h.expired_promos, key: "healthExpired", to: "/promotions" },
    { n: h.empty_categories, key: "healthEmptyCat", to: "/categories" },
  ];
  const issues = all.filter((i) => i.n > 0);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-ink-soft">{t("scoreLabel")}</span>
        <span className="text-2xl font-extrabold">
          {score}
          <span className="text-base text-ink-soft">/100</span>
        </span>
      </div>
      <div
        className={`mt-1.5 h-2 overflow-hidden rounded-full ${tone.track}`}
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full ${tone.fill}`} style={{ width: `${score}%` }} />
      </div>

      {issues.length === 0 ? (
        <p className="mt-4 flex items-center gap-2 font-semibold text-brand-700">
          <CheckIcon /> {t("healthGood")}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col">
          {issues.map((i) => (
            <li key={i.key} className="border-t border-line/70 first:border-0">
              <Link
                to={i.to}
                className="flex items-center gap-3 rounded-lg py-2.5 text-sm font-semibold hover:text-brand-700"
              >
                <AlertIcon width={18} height={18} className="shrink-0 text-saffron-600" />
                <span className="min-w-0 flex-1">{tf(i.key, { n: i.n })}</span>
                <span className="flex items-center gap-0.5 text-xs text-brand-700">
                  {t("fix")} <ChevronIcon width={14} height={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Overview() {
  const { owner } = useAuth();
  const { t, tf, money } = useI18n();
  const [days, setDays] = useState<number>(14);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    // Keep the previous render while refetching (no skeleton flash on range change).
    api
      .stats(days)
      .then(setStats)
      .catch((e) => setError(e instanceof ApiError && e.status ? e.message : t("networkError")));
  }, [days, t]);

  useEffect(load, [load]);
  useEffect(() => {
    api.activity(8).then(setActivity).catch(() => setActivity([]));
  }, []);

  const range = (
    <div className="inline-flex rounded-xl bg-stone-200/60 p-1" role="group">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => setDays(r)}
          aria-pressed={days === r}
          className={`rounded-lg px-3 text-sm font-bold transition ${
            days === r ? "bg-white text-brand-700 shadow-sm" : "text-ink-soft"
          }`}
          style={{ minHeight: 38 }}
        >
          {t(r === 7 ? "range7" : r === 14 ? "range14" : "range30")}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        title={`${t("hello")}, ${owner!.restaurant.name}`}
        subtitle={t("overviewSubtitle")}
        actions={range}
      />

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700">
          {error}
        </p>
      )}

      {!stats ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-stone-200/70" />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-stone-200/70" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi
              label={t("statTotal")}
              value={stats.items.total}
              hint={`${stats.categories} ${t("navCategories").toLowerCase()}`}
              icon={<ListIcon />}
            />
            <Kpi
              label={t("kpiAvailability")}
              value={
                stats.items.total
                  ? `${Math.round((stats.items.available / stats.items.total) * 100)}%`
                  : "–"
              }
              hint={tf("ofItems", { n: stats.items.available, total: stats.items.total })}
              icon={<CheckIcon />}
            />
            <Kpi
              label={t("kpiPromos")}
              value={stats.promotions.active}
              hint={
                stats.promotions.scheduled
                  ? `+${stats.promotions.scheduled} ${t("promoScheduled").toLowerCase()}`
                  : undefined
              }
              icon={<FlameIcon />}
            />
            <Kpi
              label={t("kpiAvgPrice")}
              value={money(stats.items.average_price)}
              icon={<TagIcon />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {/* Views: the one hero figure on this page */}
            <Card title={t("viewsTitle")} className="lg:col-span-2">
              <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-5xl font-extrabold leading-none tracking-tight">
                  {stats.views.total}
                </span>
                <span className="text-ink-soft">{t("visits")}</span>
                <Delta stats={stats} />
                <span className="text-xs text-ink-soft">{t("vsPrev")}</span>
                <span className="ms-auto text-sm font-semibold text-ink-soft">
                  {tf("visitsToday", { n: stats.views.today })}
                </span>
              </div>
              {stats.views.total === 0 && (
                <p className="mb-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm text-brand-800">
                  {t("noViewsYet")}
                </p>
              )}
              <BarChart data={stats.views.series} />
            </Card>

            <Card title={t("healthTitle")}>
              <Health stats={stats} />
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title={t("quickActions")}>
              <div className="flex flex-col gap-2">
                {[
                  { to: "/menu?add=1", label: t("qaAddItem"), icon: <PlusIcon /> },
                  { to: "/menu?status=soldout", label: t("qaSoldOut"), icon: <AlertIcon /> },
                  { to: "/promotions", label: t("qaPromo"), icon: <TagIcon /> },
                  { to: "/share", label: t("qaShare"), icon: <PrinterIcon /> },
                ].map((a) => (
                  <Link
                    key={a.to}
                    to={a.to}
                    className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3 font-semibold transition hover:border-brand-400 hover:bg-brand-50"
                  >
                    <span className="text-brand-700">{a.icon}</span>
                    <span className="flex-1">{a.label}</span>
                    <ChevronIcon width={16} height={16} className="text-ink-soft" />
                  </Link>
                ))}
              </div>
            </Card>

            <Card title={t("recentActivity")} className="lg:col-span-2">
              {activity === null ? (
                <div className="h-32 animate-pulse rounded-xl bg-stone-100" />
              ) : activity.length === 0 ? (
                <p className="py-6 text-center text-ink-soft">{t("noActivity")}</p>
              ) : (
                <ActivityList items={activity} />
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
