"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ClientsAPI, VentesAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import type { Client, Paiement, Vente } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const { user } = useAuth();
  const canEdit =
    user && ["ADMIN", "GERANT", "CAISSIER"].includes(user.role);

  const [data, setData] = useState<
    | (Client & { ventes?: (Vente & { _count?: { lignes: number } })[]; paiements?: Paiement[] })
    | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaiement, setShowPaiement] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await ClientsAPI.get(clientId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const d = await ClientsAPI.get(clientId);
        if (active) setData(d);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 animate-pulse rounded bg-zinc-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "Client introuvable"}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/clients"
            className="text-sm text-indigo-700 hover:underline"
          >
            ← Clients
          </Link>
          <h1 className="mt-1 text-xl font-semibold">
            {data.prenom ? `${data.prenom} ${data.nom}` : data.nom}
          </h1>
          <p className="text-sm text-zinc-500">
            {[data.telephone, data.email, data.adresse]
              .filter(Boolean)
              .join(" · ") || "Aucune coordonnée"}
          </p>
        </div>
        {canEdit && data.credit > 0 && (
          <button
            onClick={() => setShowPaiement(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Encaisser un paiement
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card label="Crédit en cours" value={formatMoney(data.credit)} warn={data.credit > 0} />
        <Card label="Plafond de crédit" value={formatMoney(data.plafondCredit)} />
        <Card label="Points fidélité" value={String(data.pointsFidelite)} />
      </div>

      {showPaiement && (
        <PaiementModal
          credit={data.credit}
          onClose={() => setShowPaiement(false)}
          onSaved={() => {
            setShowPaiement(false);
            void load();
          }}
        />
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Dernières ventes
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">N° ticket</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Crédit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(data.ventes ?? []).map((v) => (
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
                  <td className="px-4 py-3">
                    <StatutBadge statut={v.statut} />
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-900">
                    {formatMoney(v.total)}
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
              {(data.ventes ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-sm text-zinc-400"
                  >
                    Aucune vente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Paiements reçus
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(data.paiements ?? []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(p.date)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">{p.mode}</td>
                  <td className="px-4 py-3 text-right font-medium text-indigo-700">
                    {formatMoney(p.montant)}
                  </td>
                </tr>
              ))}
              {(data.paiements ?? []).length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-zinc-400"
                  >
                    Aucun paiement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm ${
        warn ? "border-amber-200 bg-amber-50/50" : ""
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${warn ? "text-amber-700" : "text-zinc-900"}`}>
        {value}
      </p>
    </div>
  );
}

function StatutBadge({ statut }: { statut: string }) {
  const styles =
    statut === "ANNULEE"
      ? "bg-red-100 text-red-700"
      : statut === "RETOURNEE"
        ? "bg-orange-100 text-orange-700"
        : "bg-indigo-100 text-indigo-700";
  return (
    <span className={`rounded-lg px-2 py-0.5 text-xs font-medium ${styles}`}>
      {statut}
    </span>
  );
}

function PaiementModal({
  credit,
  onClose,
  onSaved,
}: {
  credit: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [montant, setMontant] = useState(String(credit));
  const [mode, setMode] = useState("ESPECES");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = Number(montant);
    if (!Number.isFinite(m) || m <= 0 || m > credit) {
      setError(`Montant invalide (max ${formatMoney(credit)}).`);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await VentesAPI.payer(-1, { montant: m, mode });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-1 text-lg font-semibold">Encaisser un paiement</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Crédit restant du client :{" "}
          <span className="font-semibold text-amber-700">{formatMoney(credit)}</span>
        </p>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Montant *</span>
          <input
            type="number"
            min={1}
            max={credit}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            required
            className={inputCls}
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className={inputCls}
          >
            <option value="ESPECES">Espèces</option>
            <option value="CARTE">Carte</option>
            <option value="VIREMENT">Virement</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Encaisser"}
          </button>
        </div>
      </form>
    </div>
  );
}