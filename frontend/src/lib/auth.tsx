"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, AuthAPI } from "./api";
import type { User } from "./types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, motDePasse: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Peut être étendu ; reflet de la matrice backend (src/common/permissions.ts).
const PERMISSION_MAP: Record<string, string[]> = {
  ADMIN: ["*"],
  GERANT: [
    "produits.view",
    "fournisseurs.view",
    "achats.view",
    "ventes.view",
    "stock.view",
    "depenses.view",
    "caisse.view",
    "rapports.voir",
    "rapports.export",
    "admin.parametres",
  ],
  CAISSIER: [
    "produits.view",
    "clients.view",
    "ventes.view",
    "stock.view",
    "caisse.view",
  ],
  MAGASINIER: ["produits.view", "fournisseurs.view", "achats.view", "stock.view"],
  COMPTABLE: [
    "produits.view",
    "clients.view",
    "fournisseurs.view",
    "achats.view",
    "ventes.view",
    "stock.view",
    "depenses.view",
    "caisse.view",
    "rapports.voir",
    "rapports.export",
  ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api<User>("/auth/me")
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, motDePasse: string) => {
    const res = await AuthAPI.login(email, motDePasse);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await AuthAPI.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      const perms = PERMISSION_MAP[user.role] ?? [];
      return perms.includes("*") || perms.includes(permission);
    },
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}