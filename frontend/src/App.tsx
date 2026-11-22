import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./auth";
import { useI18n } from "./i18n";

// Each page is its own chunk. The customer menu (/m/:id) only loads its own code.
const Shell = lazy(() => import("./components/Shell"));
const Login = lazy(() => import("./pages/Login"));
const Overview = lazy(() => import("./pages/Overview"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const PromotionsPage = lazy(() => import("./pages/PromotionsPage"));
const QrPage = lazy(() => import("./pages/QrPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PublicMenuPage = lazy(() => import("./pages/PublicMenu"));

function Loading() {
  const { t } = useI18n();
  return <p className="p-8 text-center text-ink-soft">{t("loading")}</p>;
}

function Protected({ children }: { children: ReactNode }) {
  const { owner, ready } = useAuth();
  if (!ready) return <Loading />;
  if (!owner) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { owner } = useAuth();
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={owner ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/m/:restaurantId" element={<PublicMenuPage />} />
        <Route
          element={
            <Protected>
              <Shell />
            </Protected>
          }
        >
          <Route path="/" element={<Overview />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/promotions" element={<PromotionsPage />} />
          <Route path="/share" element={<QrPage />} />
          <Route path="/qr" element={<Navigate to="/share" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
