import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "../auth";
import { CheckIcon, CopyIcon, Logo, PrinterIcon } from "../components/icons";
import PageHeader from "../components/PageHeader";
import { useI18n } from "../i18n";

const KEY = "mx_public_url";
function readSaved() {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

/** What customers should open: build-time setting, else this page's origin,
 *  but never "localhost" when we know the PC's network address. */
function defaultBase() {
  const configured = import.meta.env.VITE_PUBLIC_URL;
  if (configured) return configured;
  const origin = window.location.origin;
  const isLocal = /^https?:\/\/(localhost|127\.|\[::1\])/i.test(origin);
  return isLocal && __LAN_URL__ ? __LAN_URL__ : origin;
}

export default function QrPage() {
  const { owner } = useAuth();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const restaurant = owner!.restaurant;

  // Customers scan this on their own phones, so it must be an address THEY can
  // reach: never "localhost". Order: saved override > build-time setting > this page's origin.
  const [base, setBase] = useState(
    () => readSaved() || defaultBase(),
  );
  const cleanBase = base.trim().replace(/\/+$/, "");
  const url = `${cleanBase}/m/${restaurant.id}`;
  const unreachable = /^https?:\/\/(localhost|127\.|\[::1\])/i.test(cleanBase);

  function changeBase(value: string) {
    setBase(value);
    try {
      localStorage.setItem(KEY, value);
    } catch {
      /* ignore */
    }
  }
  function resetBase() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setBase(defaultBase());
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is shown on screen anyway */
    }
  }

  return (
    <>
      <div className="no-print">
        <PageHeader title={t("shareTitle")} subtitle={t("shareSubtitle")} />
      </div>
      <div className="mx-auto flex max-w-md flex-col gap-5">

      {/* The printable table card */}
      <section className="pattern rise overflow-hidden rounded-3xl bg-brand-800 p-6 text-center text-white shadow-xl print:shadow-none">
        <div className="flex justify-center">
          <Logo size={48} />
        </div>
        <h1 className="mt-4 text-3xl font-extrabold leading-tight">{restaurant.name}</h1>
        <p className="mt-1 text-brand-200">{t("scanToOrder")}</p>
        <div className="mx-auto mt-5 w-fit rounded-3xl bg-white p-5">
          <QRCodeSVG value={url} size={240} marginSize={0} fgColor="#0e3a33" />
        </div>
        <p className="mt-4 break-all text-xs text-brand-200" dir="ltr">
          {url}
        </p>
      </section>

      {unreachable && (
        <p role="alert" className="no-print rounded-2xl bg-saffron-50 p-3.5 text-sm font-semibold text-saffron-700">
          {t("localWarning")}
        </p>
      )}

      <label className="no-print flex flex-col gap-1.5 text-sm font-semibold">
        {t("publicAddress")}
        <div className="flex gap-2">
          <input
            value={base}
            onChange={(e) => changeBase(e.target.value)}
            className="field min-w-0 flex-1"
            dir="ltr"
            inputMode="url"
          />
          <button type="button" onClick={resetBase} className="btn-soft shrink-0 px-4">
            {t("reset")}
          </button>
        </div>
      </label>

      <p className="no-print text-center text-ink-soft">{t("qrHelp")}</p>

      <div className="no-print flex gap-3">
        <button type="button" onClick={copy} className="btn-soft flex-1 py-3">
          {copied ? <CheckIcon className="text-brand-600" /> : <CopyIcon />}
          {copied ? t("copied") : t("copyLink")}
        </button>
        <button type="button" onClick={() => window.print()} className="btn-primary flex-1 py-3">
          <PrinterIcon /> {t("print")}
        </button>
      </div>
      </div>
    </>
  );
}
