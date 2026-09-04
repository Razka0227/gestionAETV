"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AchatsAPI, FournisseursAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import {
  MODE_PAIEMENT,
  STATUT_COMMANDE,
  type CommandeAchat,
  type Fournisseur,
  type Paiement,
} from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function FournisseurDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuth();
  const id = Number(params.id);
  const canPayer = user && ["ADMIN", "GERANT", "COMPTABLE"].includes(user.role);

  const [data, setData] = useState<{
    fournisseur: Fournisseur;
    commandes: CommandeAchat[];
    paiements: Paiement[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPay, setShowPay] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const f = await FournisseursAPI.get(id);
      setData({
        fournisseur: f,
        commandes: (f.commandes ?? []).filter(
          (c): c is CommandeAchat => c.statut !== "ANNULEE",
        ),
        paiements: f.paiements ?? [],
      });
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
        const f = await FournisseursAPI.get(id);
        if (active)
          setData({
            fournisseur: f,
            commandes: (f.commandes ?? []).filter(
              (c): c is CommandeAchat => c.statut !== "ANNULEE",
            ),
            paiements: f.paiements ?? [],
          });
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

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error ?? "Fournisseur introuvable"}
      </div>
    );
  }

  const { fournisseur: f, commandes, paiements } = data;
  const totalAchats = commandes.reduce((s, c) => s + c.totalTtc, 0);
  const totalPaye = paiements.reduce((s, p) => s + p.montant, 0);
  const dette = Math.max(0, totalAchats - totalPaye);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/fournisseurs"
            className="text-sm text-indigo-700 hover:underline"
          >
            ← Fournisseurs
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{f.nom}</h1>
          <p className="text-sm text-zinc-500">
            {[f.entreprise, f.telephone, f.email, f.adresse]
              .filter(Boolean)
              .join(" · ") || "Aucune coordonnée"}
          </p>
        </div>
        {canPayer && dette > 0 && (
          <button
            onClick={() => setShowPay(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Payer le fournisseur
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card label="Total achats" value={formatMoney(totalAchats)} />
        <Card label="Total payé" value={formatMoney(totalPaye)} />
        <Card label="Dette" value={formatMoney(dette)} warn={dette > 0} />
      </div>

      {showPay && (
        <PayerModal
          commandes={commandes}
          max={dette}
          onClose={() => setShowPay(false)}
          onSaved={() => {
            setShowPay(false);
            void load();
          }}
        />
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Dernières commandes
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">N°</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {commandes.slice(0, 15).map((c) => (
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
                    {formatDate(c.date, true)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {STATUT_COMMANDE[c.statut] ?? c.statut}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatMoney(c.totalTtc)}
                  </td>
                </tr>
              ))}
              {commandes.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-zinc-400">
                    Aucune commande.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Paiements
        </h2>
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Mode</th>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Par</th>
                <th className="px-4 py-3 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paiements.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(p.date, true)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {MODE_PAIEMENT[p.mode] ?? p.mode}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{p.reference ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {p.utilisateur?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-indigo-700">
                    {formatMoney(p.montant)}
                  </td>
                </tr>
              ))}
              {paiements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-400">
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

function PayerModal({
  commandes,
  max,
  onClose,
  onSaved,
}: {
  commandes: CommandeAchat[];
  max: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [montant, setMontant] = useState(String(max));
  const [mode, setMode] = useState("ESPECES");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const m = Number(montant);
    if (!Number.isFinite(m) || m <= 0 || m > max) {
      setError(`Montant invalide (max ${formatMoney(max)}).`);
      return;
    }
    const cible =
      commandes.find((c) => (c.resteAPayer ?? 0) > 0) ??
      commandes.find((c) => c.statut !== "RECUE");
    if (!cible) {
      setError("Aucune commande impayée à solder.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await AchatsAPI.payer(cible.id, { montant: m, mode });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-1 text-lg font-semibold">Payer le fournisseur</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Dette restante :{" "}
          <span className="font-semibold text-amber-700">{formatMoney(max)}</span>
        </p>
        {commandes.find((c) => c.statut === "ENVOYEE") && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Une commande est encore non reçue : le paiement reposera sur la
            première commande impayée à laquelle il sera associé.
          </p>
        )}
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
            max={max}
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
            <option value="VIREMENT">Virement</option>
            <option value="MOBILE_MONEY">Mobile Money</option>
            <option value="CARTE">Carte</option>
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
            {saving ? "Paiement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}