import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, tokenStore } from "./api";
import type { Owner } from "./types";

interface Auth {
  owner: Owner | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Replace the cached owner after the server changed it (e.g. restaurant renamed). */
  updateOwner: (owner: Owner) => void;
}

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [ready, setReady] = useState(false);

  // Restore an existing session on page load.
  useEffect(() => {
    if (!tokenStore.get()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((res) => setOwner(res.owner))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  // Any protected call that gets a 401 clears the token and fires this event.
  useEffect(() => {
    const onExpired = () => setOwner(null);
    window.addEventListener("auth-expired", onExpired);
    return () => window.removeEventListener("auth-expired", onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    tokenStore.set(res.token);
    setOwner(res.owner);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setOwner(null);
  }, []);

  return (
    <Ctx.Provider value={{ owner, ready, login, logout, updateOwner: setOwner }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
