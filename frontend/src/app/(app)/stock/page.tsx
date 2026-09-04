"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ProduitsAPI, StockAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import {
  TYPE_MOUVEMENT,
  type MouvementStock,
  type Produit,
  type StockEtatItem,
} from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

type Onglet = "etat" | "mouvements" | "inventaires";

export default function StockPage() {
  const { user } = useAuth();
  const canAjuster = user && ["ADMIN", "GERANT", "MAGASINIER"].includes(user.role);
  const [onglet, setOnglet] = useState<Onglet>("etat");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Stock</h1>
        <p className="text-sm text-zinc-500">
          État des stocks, mouvements et inventaires.
        </p>
      </div>

      <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
        {(
          [
            { v: "etat", l: "État des stocks" },
            { v: "mouvements", l: "Mouvements" },
            { v: "inventaires", l: "Inventaires" },
          ] as { v: Onglet; l: string }[]
        ).map((t) => (
          <button
            key={t.v}
            onClick={() => setOnglet(t.v)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              onglet === t.v
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {onglet === "etat" && <EtatTab />}
      {onglet === "mouvements" && <MouvementsTab />}
      {onglet === "inventaires" && <InventairesTab canAjuster={!!canAjuster} />}
    </div>
  );
}

function EtatTab() {
  const [rows, setRows] = useState<StockEtatItem[]>([]);
  const [search, setSearch] = useState("");
  const [basStock, setBasStock] = useState(false);
  const [rupture, setRupture] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const d = await StockAPI.etat();
        if (active) setRows(d);
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
    const t = window.setTimeout(() => {
      void StockAPI.etat({
        search: search || undefined,
        basStock: basStock || undefined,
        rupture: rupture || undefined,
      })
        .then(setRows)
        .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
    }, 350);
    return () => window.clearTimeout(t);
  }, [search, basStock, rupture]);

  const totalValeur = rows.reduce((s, r) => s + r.valeurStock, 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (nom, référence)…"
          className={`${inputCls} min-w-48 flex-1`}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={basStock}
            onChange={(e) => setBasStock(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Stock bas
        </label>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          <input
            type="checkbox"
            checked={rupture}
            onChange={(e) => setRupture(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          Rupture
        </label>
        <span className="ml-auto text-sm text-zinc-500">
          Valeur du stock :{" "}
          <span className="font-semibold text-indigo-700">
            {formatMoney(totalValeur)}
          </span>
        </span>
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
              <th className="px-4 py-3 text-right font-medium">Stock</th>
              <th className="px-4 py-3 text-right font-medium">Seuil</th>
              <th className="px-4 py-3 font-medium">Emplacement</th>
              <th className="px-4 py-3 text-right font-medium">Valeur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              rows.map((r) => {
                const low = r.stock <= r.stockMin;
                const out = r.stock <= 0;
                return (
                  <tr key={r.id} className={out ? "bg-red-50/40" : low ? "bg-amber-50/40" : ""}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/produits/${r.id}`}
                        className="font-medium text-zinc-900 hover:text-indigo-700"
                      >
                        {r.nom}
                      </Link>
                      <p className="text-xs text-zinc-400">{r.reference}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{r.categorie ?? "—"}</td>
                    <td className="px-4 py-3 text-zinc-600">{r.marque ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={
                          out
                            ? "font-semibold text-red-600"
                            : low
                              ? "font-semibold text-amber-700"
                              : "font-medium text-zinc-900"
                        }
                      >
                        {r.stock}
                      </span>{" "}
                      <span className="text-xs text-zinc-400">{r.unite}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500">{r.stockMin}</td>
                    <td className="px-4 py-3 text-zinc-600">{r.emplacement ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-medium text-zinc-900">
                      {formatMoney(r.valeurStock)}
                    </td>
                  </tr>
                );
              })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucun produit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MouvementsTab() {
  const [rows, setRows] = useState<(MouvementStock & { produit?: { id: number; nom: string; reference: string } })[]>([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const d = await StockAPI.mouvements();
        if (active) setRows(d);
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
    const t = window.setTimeout(() => {
      void StockAPI.mouvements({ type: type || undefined })
        .then(setRows)
        .catch((e) => setError(e instanceof Error ? e.message : "Erreur"));
    }, 300);
    return () => window.clearTimeout(t);
  }, [type]);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={`${inputCls} max-w-xs`}
        >
          <option value="">Tous les mouvements</option>
          {Object.entries(TYPE_MOUVEMENT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
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
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 text-right font-medium">Quantité</th>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Par</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              rows.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(m.date, true)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">
                      {m.produit?.nom ?? `#${m.produitId}`}
                    </span>
                    <p className="text-xs text-zinc-400">{m.produit?.reference}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {TYPE_MOUVEMENT[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-semibold ${
                        m.quantite >= 0 ? "text-indigo-700" : "text-red-600"
                      }`}
                    >
                      {m.quantite >= 0 ? `+${m.quantite}` : m.quantite}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{m.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {m.utilisateur?.nom ?? "—"}
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucun mouvement.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventairesTab({ canAjuster }: { canAjuster: boolean }) {
  const [list, setList] = useState<{ id: number; date: string; statut: string; _count?: { lignes: number } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNouveau, setShowNouveau] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await StockAPI.inventaires());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const d = await StockAPI.inventaires();
        if (active) setList(d);
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

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        {canAjuster && (
          <button
            onClick={() => setShowNouveau(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Nouvel inventaire
          </button>
        )}
      </div>

      {showNouveau && (
        <NouvelInventaireCard
          onClose={() => setShowNouveau(false)}
          onSaved={() => {
            setShowNouveau(false);
            void load();
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">N°</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Lignes</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              list.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 font-medium text-zinc-900">#{inv.id}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatDate(inv.date, true)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                        inv.statut === "VALIDEE"
                          ? "bg-indigo-100 text-indigo-700"
                          : inv.statut === "BROUILLON"
                            ? "bg-zinc-100 text-zinc-600"
                            : "bg-red-100 text-red-600"
                      }`}
                    >
                      {inv.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {inv._count?.lignes ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/stock/inventaires/${inv.id}`}
                      className="text-sm font-medium text-indigo-700 hover:underline"
                    >
                      Voir
                    </Link>
                  </td>
                </tr>
              ))}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucun inventaire.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NouvelInventaireCard({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void ProduitsAPI.list({ actif: true, take: 200 })
      .then(setProduits)
      .catch(() => void 0);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void ProduitsAPI.list({ search: search || undefined, actif: true, take: 100 })
        .then(setProduits)
        .catch(() => void 0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  async function creer() {
    const lignes = Object.entries(counts)
      .filter(([, q]) => Number(q) >= 0)
      .map(([id, q]) => ({ produitId: Number(id), qteReelle: Number(q) }));
    if (lignes.length === 0) {
      setError("Saisissez au moins un comptage.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await StockAPI.createInventaire(lignes);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold">Nouvel inventaire</h2>
        <p className="mb-3 text-sm text-zinc-500">
          Saisissez la quantité réelle de chaque produit compté.
        </p>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un produit…"
          className={inputCls}
        />
        <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
          {produits.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-100 px-3 py-2"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{p.nom}</span>
                <span className="block text-xs text-zinc-400">
                  {p.reference} · théorique {p.stock} {p.unite}
                </span>
              </span>
              <input
                type="number"
                min={0}
                value={counts[p.id] ?? ""}
                onChange={(e) =>
                  setCounts((m) => ({ ...m, [p.id]: Number(e.target.value) }))
                }
                placeholder="réel"
                className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm text-right"
              />
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            onClick={() => void creer()}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Création…" : "Créer l’inventaire"}
          </button>
        </div>
      </div>
    </div>
  );
}