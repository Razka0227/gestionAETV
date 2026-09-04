"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CategoriesAPI,
  MarquesAPI,
  ProduitsAPI,
} from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/format";
import type { Categorie, Marque, Produit } from "@/lib/types";

export default function ProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [marques, setMarques] = useState<Marque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [marqueId, setMarqueId] = useState("");
  const [basStock, setBasStock] = useState(false);
  const [actif, setActif] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prods, cats, marqs] = await Promise.all([
        ProduitsAPI.list({
          search: search || undefined,
          categorieId: categorieId ? Number(categorieId) : undefined,
          marqueId: marqueId ? Number(marqueId) : undefined,
          basStock,
          actif: actif === "" ? undefined : actif === "true",
        }),
        CategoriesAPI.list(),
        MarquesAPI.list(),
      ]);
      setProduits(prods);
      setCategories(cats);
      setMarques(marqs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [search, categorieId, marqueId, basStock, actif]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setError(null);
      try {
        const [prods, cats, marqs] = await Promise.all([
          ProduitsAPI.list(),
          CategoriesAPI.list(),
          MarquesAPI.list(),
        ]);
        if (!active) return;
        setProduits(prods);
        setCategories(cats);
        setMarques(marqs);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 400);
    return () => window.clearTimeout(t);
  }, [search, categorieId, marqueId, basStock, actif, load]);

  const parents = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Produits</h1>
          <p className="text-sm text-zinc-500">
            Catalogue de la boutique · {formatNumber(produits.length)} affichés
          </p>
        </div>
        <Link
          href="/produits/nouveau"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Nouveau produit
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, référence, code-barres)…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={categorieId}
          onChange={(e) => setCategorieId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Toutes les catégories</option>
          {parents.map((c) => {
            const children = categories.filter((s) => s.parentId === c.id);
            return (
              <optgroup key={c.id} label={c.nom}>
                <option value={c.id}>{c.nom} (toutes)</option>
                {children.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nom}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <select
          value={marqueId}
          onChange={(e) => setMarqueId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Toutes les marques</option>
          {marques.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>
        <select
          value={actif}
          onChange={(e) => setActif(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Actifs & inactifs</option>
          <option value="true">Actifs uniquement</option>
          <option value="false">Inactifs</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={basStock}
            onChange={(e) => setBasStock(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
          />
          Stock bas
        </label>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Marque</th>
              <th className="px-4 py-3 text-right font-medium">Prix achat</th>
              <th className="px-4 py-3 text-right font-medium">Prix vente</th>
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              produits.map((p) => {
                const low =
                  p.stockMin > 0 && p.stock <= p.stockMin;
                return (
                  <tr key={p.id} className={p.actif ? "" : "opacity-50"}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/produits/${p.id}`}
                        className="font-medium text-zinc-900 hover:text-indigo-700"
                      >
                        {p.nom}
                      </Link>
                      <p className="text-xs text-zinc-400">{p.reference}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {p.categorie?.nom}
                      {p.categorie?.parent?.nom
                        ? ` (${p.categorie.parent.nom})`
                        : ""}
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {p.marque?.nom ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-600">
                      {formatMoney(p.prixAchat)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatMoney(p.prixVente)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-block rounded-lg px-2 py-0.5 text-xs font-semibold ${
                          p.stock === 0
                            ? "bg-red-100 text-red-700"
                            : low
                              ? "bg-amber-100 text-amber-700"
                              : "bg-indigo-100 text-indigo-700"
                        }`}
                      >
                        {formatNumber(p.stock)}
                        {p.stockMin > 0 && (
                          <span className="ml-1 font-normal opacity-70">
                            / {formatNumber(p.stockMin)}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.actif ? (
                        <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          Actif
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
                          Inactif
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!loading && produits.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucun produit trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}