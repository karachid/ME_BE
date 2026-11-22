import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api, ApiError } from "../api";
import { useAuth } from "../auth";
import { LogoutIcon } from "../components/icons";
import LangSwitch from "../components/LangSwitch";
import PageHeader from "../components/PageHeader";
import { useI18n } from "../i18n";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card p-5">
      <h2 className="mb-4 text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

type Msg = { text: string; error: boolean } | null;

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      role={msg.error ? "alert" : "status"}
      className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${
        msg.error ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-800"
      }`}
    >
      {msg.text}
    </p>
  );
}

export default function SettingsPage() {
  const { owner, updateOwner, logout } = useAuth();
  const { t } = useI18n();

  const [name, setName] = useState(owner!.restaurant.name);
  const [nameMsg, setNameMsg] = useState<Msg>(null);
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwMsg, setPwMsg] = useState<Msg>(null);
  const [savingPw, setSavingPw] = useState(false);

  const errText = (e: unknown) => (e instanceof ApiError && e.status ? e.message : t("networkError"));

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameMsg(null);
    try {
      const res = await api.renameRestaurant(name.trim());
      updateOwner(res.owner);
      setNameMsg({ text: t("saved"), error: false });
    } catch (err) {
      setNameMsg({ text: errText(err), error: true });
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    setPwMsg(null);
    try {
      await api.changePassword(current, next);
      setCurrent("");
      setNext("");
      setPwMsg({ text: t("passwordChanged"), error: false });
    } catch (err) {
      setPwMsg({ text: errText(err), error: true });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <PageHeader title={t("settingsTitle")} />

      <div className="grid max-w-2xl gap-4">
        <Section title={t("settingsRestaurant")}>
          <form onSubmit={saveName} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("restaurantName")}
              <input value={name} onChange={(e) => setName(e.target.value)} className="field" />
            </label>
            <Message msg={nameMsg} />
            <button
              disabled={savingName || !name.trim() || name.trim() === owner!.restaurant.name}
              className="btn-primary self-start px-5 py-2.5"
            >
              {t("saveChanges")}
            </button>
          </form>
        </Section>

        <Section title={t("settingsLanguage")}>
          <LangSwitch />
        </Section>

        <Section title={t("changePassword")}>
          <form onSubmit={savePassword} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("currentPassword")}
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="field"
                dir="ltr"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("newPassword")}
              <input
                type="password"
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                className="field"
                dir="ltr"
              />
              <span className="text-xs font-normal text-ink-soft">{t("passwordHint")}</span>
            </label>
            <Message msg={pwMsg} />
            <button disabled={savingPw || !current || next.length < 8} className="btn-primary self-start px-5 py-2.5">
              {t("changePassword")}
            </button>
          </form>
        </Section>

        <Section title={t("settingsAccount")}>
          <p className="mb-4 text-sm text-ink-soft">
            {t("signedInAs")} <bdi dir="ltr" className="font-semibold text-ink">{owner!.email}</bdi>
          </p>
          <button type="button" onClick={logout} className="btn-danger px-5 py-2.5">
            <LogoutIcon width={18} height={18} /> {t("logoutLong")}
          </button>
        </Section>
      </div>
    </>
  );
}
