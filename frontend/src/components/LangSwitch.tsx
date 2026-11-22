import { useI18n } from "../i18n";

/** Segmented AR | FR control. `onDark` for use on the brand-colored header. */
export default function LangSwitch({ onDark = false }: { onDark?: boolean }) {
  const { lang, setLang } = useI18n();
  const base = "rounded-full px-3 text-sm font-bold transition";
  const on = onDark ? "bg-white text-brand-800" : "bg-brand-600 text-white";
  const off = onDark ? "text-white/80 hover:text-white" : "text-ink-soft hover:text-ink";
  return (
    <div
      className={`inline-flex items-center rounded-full p-0.5 ${
        onDark ? "bg-white/15" : "border border-line bg-white"
      }`}
      role="group"
      aria-label="Language"
      dir="ltr"
    >
      {(["ar", "fr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`${base} ${lang === l ? on : off}`}
          style={{ minHeight: 36 }}
        >
          {l === "ar" ? "عربي" : "FR"}
        </button>
      ))}
    </div>
  );
}
