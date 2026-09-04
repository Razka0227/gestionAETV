"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ClientsAPI, VentesAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import type { Client, Vente } from "@/lib/types";

const inputCls =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function VentesPage() {
  const { user } = useAuth();
  const canCreate = user && ["ADMIN", "GERANT", "CAISSIER"].includes(user.role);

  const [rows, setRows] = useState<(Vente & { _count?: { lignes: number } })[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [statut, setStatut] = useState("");
  const [clientId, setClientId] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await VentesAPI.list({
          dateDebut: dateDebut || undefined,
          dateFin: dateFin || undefined,
          statut: statut || undefined,
          clientId: clientId ? Number(clientId) : undefined,
          search: search || undefined,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [dateDebut, dateFin, statut, clientId, search]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [v, c] = await Promise.all([VentesAPI.list(), ClientsAPI.list()]);
        if (active) {
          setRows(v);
          setClients(c);
        }
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
  }, [dateDebut, dateFin, statut, clientId, search, load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Ventes & retours</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} vente(s) sur la période.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/ventes/nouveau"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Nouvelle vente
          </Link>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <input
          type="date"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
          className={inputCls}
        />
        <span className="text-sm text-zinc-400">→</span>
        <input
          type="date"
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
          className={inputCls}
        />
        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className={inputCls}
        >
          <option value="">Tous statuts</option>
          <option value="BROUILLON">Brouillon</option>
          <option value="VALIDEE">Validée</option>
          <option value="ANNULEE">Annulée</option>
          <option value="RETOURNEE">Retournée</option>
        </select>
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className={inputCls}
        >
          <option value="">Tous les clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Recherche n° ticket…"
          className={`${inputCls} min-w-40 flex-1`}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">N° ticket</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Vendeur</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Versés</th>
              <th className="px-4 py-3 text-right font-medium">Crédit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              rows.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ventes/${v.id}`}
                      className="font-medium text-zinc-900 hover:text-indigo-700"
                    >
                      {v.numeroTicket}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(v.date)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {v.client ? (v.client.nom) : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {v.utilisateur?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatutBadge statut={v.statut} />
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {formatMoney(v.total)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {formatMoney(v.montantEncaisse)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {v.montantCredit > 0 ? (
                      <span className="font-medium text-amber-700">
                        {formatMoney(v.montantCredit)}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  Aucune vente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const styles =
    statut === "ANNULEE"
      ? "bg-red-100 text-red-700"
      : statut === "RETOURNEE"
        ? "bg-orange-100 text-orange-700"
        : statut === "BROUILLON"
          ? "bg-zinc-100 text-zinc-600"
          : "bg-indigo-100 text-indigo-700";
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${styles}`}>
      {statut}
    </span>
  );
}