import { useMemo, useState } from "react";
import { useI18n } from "../i18n";

interface Point {
  date: string; // YYYY-MM-DD
  views: number;
}

/** Round the axis maximum up to a clean, even number so ticks (0, half, max) are whole. */
function niceMax(max: number) {
  if (max <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const m of [1, 2, 4, 6, 8, 10]) if (m * pow >= max) return m * pow;
  return 10 * pow;
}

/**
 * Single-series column chart (one hue, so no legend: the card title names it).
 * Thin columns with a 4px rounded top, hairline grid, a tooltip per column on
 * hover AND keyboard focus, and a table view so no value is hover-only.
 */
export default function BarChart({ data }: { data: Point[] }) {
  const { lang, t } = useI18n();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);

  const locale = lang === "ar" ? "ar-MA-u-nu-latn" : "fr-FR";
  const short = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }),
    [locale],
  );
  const long = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      }),
    [locale],
  );
  const fmt = (f: Intl.DateTimeFormat, iso: string) => f.format(new Date(iso + "T00:00:00Z"));

  const max = niceMax(Math.max(0, ...data.map((d) => d.views)));
  const n = data.length;
  const labelIdx = n > 2 ? [0, Math.floor((n - 1) / 2), n - 1] : data.map((_, i) => i);

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setTable((v) => !v)}
          className="rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          style={{ minHeight: 36 }}
        >
          {table ? t("showChart") : t("showTable")}
        </button>
      </div>

      {table ? (
        <div className="max-h-60 overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-stone-50 text-ink-soft">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">{t("colDate")}</th>
                <th className="px-3 py-2 text-end font-semibold">{t("colVisits")}</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((d) => (
                <tr key={d.date} className="border-t border-line/70">
                  <td className="px-3 py-1.5">{fmt(long, d.date)}</td>
                  <td className="px-3 py-1.5 text-end font-bold tabular-nums">{d.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex gap-2" dir="ltr">
          {/* Y axis: only the values we don't label directly */}
          <div
            className="flex h-44 w-7 shrink-0 flex-col justify-between text-end text-xs tabular-nums text-ink-soft"
            aria-hidden="true"
          >
            <span>{max}</span>
            <span>{max / 2}</span>
            <span>0</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="relative h-44" onPointerLeave={() => setHover(null)}>
              {/* Hairline grid (recessive, solid) */}
              {[0, 50, 100].map((p) => (
                <div
                  key={p}
                  className="absolute inset-x-0 border-t border-line"
                  style={{ top: `${p}%` }}
                  aria-hidden="true"
                />
              ))}

              <div className="absolute inset-0 flex items-end gap-0.5" role="list">
                {data.map((d, i) => {
                  const h = d.views === 0 ? 0 : Math.max((d.views / max) * 100, 2);
                  return (
                    <div
                      key={d.date}
                      role="listitem"
                      tabIndex={0}
                      aria-label={`${fmt(long, d.date)}: ${d.views} ${t("visits")}`}
                      className="flex h-full min-w-0 flex-1 items-end justify-center outline-none"
                      onPointerEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                      onBlur={() => setHover(null)}
                    >
                      <div
                        className={`w-full max-w-6 rounded-t-[4px] transition-colors ${
                          hover === i ? "bg-brand-700" : "bg-brand-500"
                        }`}
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  );
                })}
              </div>

              {hover !== null && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-center shadow-lg"
                  style={{
                    left: `clamp(56px, ${((hover + 0.5) / n) * 100}%, calc(100% - 56px))`,
                    bottom: `calc(${(data[hover].views / max) * 100}% + 10px)`,
                  }}
                >
                  <p className="text-lg font-extrabold leading-none text-white">{data[hover].views}</p>
                  <p className="mt-1 whitespace-nowrap text-xs text-white/70">
                    {fmt(short, data[hover].date)}
                  </p>
                </div>
              )}
            </div>

            {/* X axis: first / middle / last only */}
            <div className="relative mt-1.5 h-4 text-xs text-ink-soft" aria-hidden="true">
              {labelIdx.map((i) => (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{
                    left: `clamp(16px, ${((i + 0.5) / n) * 100}%, calc(100% - 16px))`,
                  }}
                >
                  {fmt(short, data[i].date)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
