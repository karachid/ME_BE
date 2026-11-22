import { NavLink, Outlet } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import type { TKey } from "../i18n";
import {
  EyeIcon,
  FolderIcon,
  HomeIcon,
  ListIcon,
  Logo,
  LogoutIcon,
  QrIcon,
  SettingsIcon,
  TagIcon,
} from "./icons";
import LangSwitch from "./LangSwitch";

interface NavItem {
  to: string;
  label: TKey;
  icon: ReactNode;
  end?: boolean;
}

const NAV: NavItem[] = [
  { to: "/", label: "navOverview", icon: <HomeIcon />, end: true },
  { to: "/menu", label: "navMenu", icon: <ListIcon /> },
  { to: "/categories", label: "navCategories", icon: <FolderIcon /> },
  { to: "/promotions", label: "navPromos", icon: <TagIcon /> },
  { to: "/share", label: "navShare", icon: <QrIcon /> },
  { to: "/settings", label: "navSettings", icon: <SettingsIcon /> },
];

// Phones get five tabs; "share" lives in the top bar and on the overview.
const TABS = NAV.filter((n) => n.to !== "/share");

export default function Shell() {
  const { owner, logout } = useAuth();
  const { t } = useI18n();
  const restaurant = owner!.restaurant;

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar (desktop) */}
      <aside className="no-print pattern sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-brand-800 text-white lg:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <Logo size={42} />
          <div className="min-w-0">
            <p className="truncate font-extrabold leading-tight">{restaurant.name}</p>
            <p className="text-xs text-brand-200">MenuXpert</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3" aria-label="Main">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3.5 py-3 font-semibold transition ${
                  isActive
                    ? "bg-white text-brand-800 shadow"
                    : "text-brand-100 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {n.icon}
              {t(n.label)}
            </NavLink>
          ))}
          <a
            href={`/m/${restaurant.id}?preview=1`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center gap-3 rounded-xl border border-white/20 px-3.5 py-3 font-semibold text-brand-100 transition hover:bg-white/10 hover:text-white"
          >
            <EyeIcon />
            {t("viewLive")}
          </a>
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          <p className="truncate text-xs text-brand-200">
            {t("signedInAs")} <bdi dir="ltr">{owner!.email}</bdi>
          </p>
          <div className="flex items-center justify-between">
            <LangSwitch onDark />
            <button
              type="button"
              onClick={logout}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
              title={t("logout")}
              aria-label={t("logout")}
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Top bar (phones/tablets) */}
        <header className="no-print pattern sticky top-0 z-30 flex items-center gap-3 bg-brand-800 px-4 py-3 text-white lg:hidden">
          <Logo size={36} />
          <p className="min-w-0 flex-1 truncate font-extrabold">{restaurant.name}</p>
          <NavLink
            to="/share"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"
            aria-label={t("navShare")}
          >
            <QrIcon />
          </NavLink>
          <LangSwitch onDark />
        </header>

        <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom tabs (phones) */}
      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main"
      >
        {TABS.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-bold transition ${
                isActive ? "text-brand-700" : "text-ink-soft"
              }`
            }
            style={{ minHeight: 56 }}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                    isActive ? "bg-brand-100" : ""
                  }`}
                >
                  {n.icon}
                </span>
                <span className="max-w-full truncate px-1">{t(n.label)}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
