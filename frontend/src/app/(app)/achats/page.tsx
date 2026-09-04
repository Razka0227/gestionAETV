"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AchatsAPI, FournisseursAPI } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import {
  STATUT_COMMANDE,
  type CommandeAchat,
  type Fournisseur,
} from "@/lib/types";

export default function AchatsPage() {
  const [rows, setRows] = useState<CommandeAchat[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statut, setStatut] = useState("");
  const [fournisseurId, setFournisseurId] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list] = await Promise.all([
        AchatsAPI.list({
          statut: statut || undefined,
          fournisseurId: fournisseurId ? Number(fournisseurId) : undefined,
          search: search || undefined,
        }),
        FournisseursAPI.list(),
      ]);
      setRows(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [statut, fournisseurId, search]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [list, f] = await Promise.all([
          AchatsAPI.list(),
          FournisseursAPI.list(),
        ]);
        if (!active) return;
        setRows(list);
        setFournisseurs(f);
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
    const t = window.setTimeout(() => void load(), 350);
    return () => window.clearTimeout(t);
  }, [statut, fournisseurId, search, load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Commandes d’achat</h1>
          <p className="text-sm text-zinc-500">
            Bon de commande, réception et paiements fournisseurs.
          </p>
        </div>
        <Link
          href="/achats/nouveau"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Nouvelle commande
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un N° de commande…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <select
          value={fournisseurId}
          onChange={(e) => setFournisseurId(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Tous les fournisseurs</option>
          {fournisseurs.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nom}
            </option>
          ))}
        </select>
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_COMMANDE).map(([k, v]) => (
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
              <th className="px-4 py-3 font-medium">N° commande</th>
              <th className="px-4 py-3 font-medium">Fournisseur</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Restant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              rows.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/achats/${c.id}`}
                      className="font-medium text-zinc-900 hover:text-indigo-700"
                    >
                      {c.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {c.fournisseur?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(c.date)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.statut === "RECUE" || c.statut === "PARTIELLEMENT_RECUE"
                          ? "bg-indigo-100 text-indigo-700"
                          : c.statut === "ANNULEE"
                            ? "bg-red-100 text-red-600"
                            : c.statut === "ENVOYEE"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {STATUT_COMMANDE[c.statut] ?? c.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(c.totalTtc)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {(c.resteAPayer ?? c.totalTtc) > 0 ? (
                      <span className="text-amber-700">
                        {formatMoney(c.resteAPayer ?? c.totalTtc)}
                      </span>
                    ) : (
                      <span className="text-zinc-400">Soldée</span>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucune commande d’achat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}