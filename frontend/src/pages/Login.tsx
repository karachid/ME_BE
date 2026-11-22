import { useState } from "react";
import type { FormEvent } from "react";
import { ApiError } from "../api";
import { useAuth } from "../auth";
import { Logo } from "../components/icons";
import LangSwitch from "../components/LangSwitch";
import { useI18n } from "../i18n";

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setError(
        status === 429 ? t("tooMany") : status === 0 ? t("networkError") : t("loginError"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="pattern relative flex flex-col justify-between gap-10 bg-brand-800 px-6 pb-16 pt-6 text-white lg:p-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo size={44} />
            <span className="text-2xl font-extrabold tracking-tight">{t("appName")}</span>
          </div>
          <LangSwitch onDark />
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-extrabold leading-tight lg:text-5xl">{t("tagline")}</h1>
          <p className="mt-3 text-lg text-white/80">{t("manageHint")}</p>
        </div>
      </section>

      {/* Form */}
      <section className="flex items-start justify-center px-4 lg:items-center">
        <form
          onSubmit={submit}
          className="card rise -mt-10 flex w-full max-w-sm flex-col gap-5 p-6 lg:mt-0 lg:border-0 lg:shadow-none"
        >
          <div>
            <h2 className="text-2xl font-extrabold">{t("login")}</h2>
            <p className="mt-1 text-sm text-ink-soft">{t("loginSubtitle")}</p>
          </div>

          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("email")}
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
              dir="ltr"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("password")}
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
              dir="ltr"
            />
          </label>

          {error && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-700"
            >
              {error}
            </p>
          )}

          <button disabled={busy} className="btn-primary py-3 text-lg">
            {t("login")}
          </button>
        </form>
      </section>
    </main>
  );
}
