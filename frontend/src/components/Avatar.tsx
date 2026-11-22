// Soft, deterministic color tile with the item's initial, used when there is no photo.
const TONES = [
  "bg-brand-100 text-brand-800",
  "bg-saffron-100 text-saffron-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-800",
  "bg-violet-100 text-violet-700",
  "bg-lime-100 text-lime-800",
];

function toneFor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return TONES[h % TONES.length];
}

export default function Avatar({
  name,
  src,
  size = 48,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (src) {
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        style={style}
        className="shrink-0 rounded-xl object-cover"
      />
    );
  }
  return (
    <span
      style={style}
      className={`inline-flex shrink-0 items-center justify-center rounded-xl text-lg font-bold ${toneFor(name)}`}
      aria-hidden="true"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
