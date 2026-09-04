"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { Icon } from "./Icons";

interface NavItem {
  label: string;
  href?: string;
  icon: string;
  roles?: Role[];
  ready?: boolean;
  soonNote?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: "Pilotage",
    items: [
      { label: "Tableau de bord", href: "/dashboard", icon: "dashboard" },
      {
        label: "Rapports",
        href: "/rapports",
        icon: "report",
        roles: ["ADMIN", "GERANT", "COMPTABLE"],
      },
    ],
  },
  {
    title: "Commercial",
    items: [
      {
        label: "Point de vente",
        href: "/ventes/nouveau",
        icon: "cart",
        roles: ["ADMIN", "GERANT", "CAISSIER"],
      },
      {
        label: "Ventes & retours",
        href: "/ventes",
        icon: "cash",
        roles: ["ADMIN", "GERANT", "CAISSIER", "COMPTABLE"],
      },
      {
        label: "Clients",
        href: "/clients",
        icon: "users",
        roles: ["ADMIN", "GERANT", "CAISSIER", "COMPTABLE"],
      },
    ],
  },
  {
    title: "Catalogue & Achats",
    items: [
      {
        label: "Produits",
        href: "/produits",
        icon: "box",
      },
      {
        label: "Catégories & Marques",
        href: "/categories",
        icon: "scan",
        roles: ["ADMIN", "GERANT", "MAGASINIER"],
      },
      {
        label: "Fournisseurs",
        href: "/fournisseurs",
        icon: "supplier",
        roles: ["ADMIN", "GERANT", "MAGASINIER", "COMPTABLE"],
      },
      {
        label: "Achats",
        href: "/achats",
        icon: "truck",
        roles: ["ADMIN", "GERANT", "MAGASINIER"],
      },
    ],
  },
  {
    title: "Stock",
    items: [
      {
        label: "Stocks & mouvements",
        href: "/stock",
        icon: "layers",
        roles: ["ADMIN", "GERANT", "MAGASINIER"],
      },
    ],
  },
  {
    title: "Finances",
    items: [
      {
        label: "Dépenses",
        href: "/depenses",
        icon: "wallet",
        roles: ["ADMIN", "GERANT", "COMPTABLE"],
      },
      {
        label: "Caisse",
        href: "/caisse",
        icon: "cash",
        roles: ["ADMIN", "GERANT", "CAISSIER", "COMPTABLE"],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        label: "Utilisateurs",
        href: "/utilisateurs",
        icon: "settings",
        roles: ["ADMIN"],
      },
      {
        label: "Paramètres",
        href: "/parametres",
        icon: "settings",
        roles: ["ADMIN"],
      },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-zinc-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />
          <p className="text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  const initials = user.nom
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-zinc-200 bg-white transition-all ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        <div className="flex h-16 items-center gap-3 border-b border-zinc-100 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
            A
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">
                Gestion AETV
              </p>
              <p className="truncate text-xs text-zinc-400">
                {user.boutique?.nom ?? "Boutique"}
              </p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded-md p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Réduire le menu"
          >
            <Icon name={collapsed ? "settings" : "dashboard"} className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group, i) => {
            const visibleItems = group.items.filter(
              (it) =>
                !it.roles ||
                user.role === "ADMIN" ||
                it.roles.includes(user.role as Role),
            );
            if (visibleItems.length === 0) return null;
            return (
              <div key={i} className="mb-5">
                {!collapsed && (
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    {group.title}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {visibleItems.map((it, j) => {
                    const active = it.href === pathname;
                    if (!it.href || it.ready === false) {
                      return (
                        <li key={j}>
                          <div
                            className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-zinc-400 ${
                              collapsed ? "justify-center" : ""
                            }`}
                          >
                            <Icon name={it.icon} className="h-4.5 w-4.5" />
                            {!collapsed && (
                              <span className="flex-1 truncate">{it.label}</span>
                            )}
                            {!collapsed && (
                              <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                                {it.soonNote}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    }
                    return (
                      <li key={j}>
                        <Link
                          href={it.href}
                          className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm transition ${
                            collapsed ? "justify-center" : ""
                          } ${
                            active
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-zinc-600 hover:bg-zinc-100"
                          }`}
                        >
                          <Icon name={it.icon} className="h-4.5 w-4.5" />
                          {!collapsed && <span className="truncate">{it.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>

      <div className={`flex flex-1 flex-col ${collapsed ? "lg:pl-16" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-zinc-200 bg-white/80 px-6 backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">
              Tableau de bord
            </p>
            <p className="text-xs text-zinc-500">
              {new Date().toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-800">{user.nom}</p>
              <p className="text-xs text-zinc-500">
                {ROLE_LABELS[user.role as Role]}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
              {initials}
            </div>
            <button
              onClick={() => {
                void logout().then(() => router.replace("/login"));
              }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 transition hover:bg-zinc-50"
            >
              <Icon name="logout" className="h-4 w-4" />
              Déconnexion
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}