"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StockAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import type { Inventaire } from "@/lib/types";

export default function InventaireDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuth();
  const id = Number(params.id);
  const canValider = user && ["ADMIN", "GERANT", "MAGASINIER"].includes(user.role);

  const [inv, setInv] = useState<Inventaire | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setError(null);
      setInv(await StockAPI.inventaire(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const d = await StockAPI.inventaire(id);
        if (active) setInv(d);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  async function valider() {
    if (!window.confirm("Valider cet inventaire ? Les écarts seront appliqués au stock.")) return;
    setBusy(true);
    try {
      await StockAPI.validerInventaire(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  if (!inv) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        {error ?? "Inventaire introuvable."}
      </div>
    );
  }

  const ecartTotal = (inv.lignes ?? []).reduce((s, l) => s + l.ecart, 0);
  const lignesEcart = (inv.lignes ?? []).filter((l) => l.ecart !== 0).length;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/stock"
            className="text-sm text-zinc-500 hover:text-indigo-700"
          >
            ← Stock
          </Link>
          <h1 className="text-xl font-semibold">Inventaire #{inv.id}</h1>
          <p className="text-sm text-zinc-500">
            {formatDate(inv.date, true)} · par {inv.utilisateur?.nom ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              inv.statut === "VALIDEE"
                ? "bg-indigo-100 text-indigo-700"
                : inv.statut === "BROUILLON"
                  ? "bg-zinc-100 text-zinc-600"
                  : "bg-red-100 text-red-600"
            }`}
          >
            {inv.statut}
          </span>
          {canValider && inv.statut === "BROUILLON" && (
            <button
              onClick={() => void valider()}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? "Validation…" : "Valider l’inventaire"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Écart total
          </p>
          <p
            className={`mt-1 text-xl font-semibold ${
              ecartTotal === 0
                ? "text-zinc-900"
                : ecartTotal > 0
                  ? "text-indigo-700"
                  : "text-red-600"
            }`}
          >
            {ecartTotal > 0 ? `+${ecartTotal}` : ecartTotal}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Lignes comptées
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">
            {inv.lignes?.length ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-zinc-400">
            Lignes avec écart
          </p>
          <p className="mt-1 text-xl font-semibold text-zinc-900">
            {lignesEcart}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Produit</th>
              <th className="px-4 py-3 text-right font-medium">Théorique</th>
              <th className="px-4 py-3 text-right font-medium">Réel</th>
              <th className="px-4 py-3 text-right font-medium">Écart</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {inv.lignes?.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <span className="font-medium text-zinc-900">
                    {l.produit?.nom ?? `#${l.produitId}`}
                  </span>
                  <p className="text-xs text-zinc-400">{l.produit?.reference}</p>
                </td>
                <td className="px-4 py-3 text-right text-zinc-600">
                  {l.qteTheorique}
                </td>
                <td className="px-4 py-3 text-right font-medium">{l.qteReelle}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    l.ecart === 0
                      ? "text-zinc-400"
                      : l.ecart > 0
                        ? "text-indigo-700"
                        : "text-red-600"
                  }`}
                >
                  {l.ecart > 0 ? `+${l.ecart}` : l.ecart}
                </td>
              </tr>
            ))}
            {!inv.lignes?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucune ligne.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}