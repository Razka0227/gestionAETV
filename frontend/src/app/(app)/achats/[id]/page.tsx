"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AchatsAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import {
  MODE_PAIEMENT,
  STATUT_COMMANDE,
  type CommandeAchat,
} from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function CommandeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuth();
  const id = Number(params.id);
  const [c, setC] = useState<CommandeAchat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canReceive = user && ["ADMIN", "GERANT", "MAGASINIER"].includes(user.role);
  const canPay = user && ["ADMIN", "GERANT", "COMPTABLE"].includes(user.role);

  const load = async () => {
    try {
      setError(null);
      setC(await AchatsAPI.get(id));
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
        const data = await AchatsAPI.get(id);
        if (active) setC(data);
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
    setBusy("valider");
    try {
      await AchatsAPI.valider(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function annuler() {
    if (!window.confirm("Annuler cette commande ?")) return;
    setBusy("annuler");
    try {
      await AchatsAPI.annuler(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
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

  if (!c) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        {error ?? "Commande introuvable."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/achats"
            className="text-sm text-zinc-500 hover:text-indigo-700"
          >
            ← Commandes d’achat
          </Link>
          <h1 className="text-xl font-semibold">{c.numero}</h1>
          <p className="text-sm text-zinc-500">
            {c.fournisseur?.nom ?? "Fournisseur"} · {formatDate(c.date, true)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              c.statut === "RECUE" || c.statut === "PARTIELLEMENT_RECUE"
                ? "bg-indigo-100 text-indigo-700"
                : c.statut === "ANNULEE"
                  ? "bg-red-100 text-red-600"
                  : c.statut === "ENVOYEE"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {STATUT_COMMANDE[c.statut]}
          </span>
        </div>
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
              <th className="px-4 py-3 text-right font-medium">Qté</th>
              <th className="px-4 py-3 text-right font-medium">Prix unitaire</th>
              <th className="px-4 py-3 text-right font-medium">Sous-total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {c.lignes?.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`/produits/${l.produitId}`}
                    className="font-medium text-zinc-900 hover:text-indigo-700"
                  >
                    {l.produit?.nom ?? `#${l.produitId}`}
                  </Link>
                  <p className="text-xs text-zinc-400">{l.produit?.reference}</p>
                </td>
                <td className="px-4 py-3 text-right">{l.quantite}</td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(l.prixUnitaire)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatMoney(l.sousTotal)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-zinc-200 text-sm">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-zinc-500">
                Sous-total
              </td>
              <td className="px-4 py-2 text-right text-zinc-600">
                {formatMoney(c.totalHt)}
              </td>
            </tr>
            {c.remise > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-zinc-500">
                  Remise
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  − {formatMoney(c.remise)}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right font-semibold text-zinc-700">
                Total TTC
              </td>
              <td className="px-4 py-2 text-right font-semibold text-indigo-700">
                {formatMoney(c.totalTtc)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-zinc-500">
                Paiements
              </td>
              <td className="px-4 py-2 text-right text-zinc-600">
                {formatMoney(c.totalPaye)}
              </td>
            </tr>
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-zinc-500">
                Reste à payer
              </td>
              <td
                className={`px-4 py-2 text-right font-medium ${
                  (c.resteAPayer ?? 0) > 0 ? "text-amber-700" : "text-indigo-700"
                }`}
              >
                {formatMoney(c.resteAPayer ?? c.totalTtc)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {canReceive && (
          <ReceptionCard
            c={c}
            busy={busy}
            onDone={async () => {
              await load();
              setBusy(null);
            }}
            setBusy={setBusy}
          />
        )}

        {canPay && (
          <PaiementCard
            c={c}
            busy={busy}
            onDone={async () => {
              await load();
              setBusy(null);
            }}
            setBusy={setBusy}
          />
        )}

        <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-800">
            Paiements enregistrés
          </h2>
          {!c.paiements?.length && (
            <p className="text-sm text-zinc-400">Aucun paiement.</p>
          )}
          <ul className="divide-y divide-zinc-100 text-sm">
            {c.paiements?.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{formatMoney(p.montant)}</p>
                  <p className="text-xs text-zinc-400">
                    {MODE_PAIEMENT[p.mode] ?? p.mode} · {formatDate(p.date, true)}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    p.sens === "ENTREE" ? "text-indigo-600" : "text-red-600"
                  }`}
                >
                  {p.sens === "ENTREE" ? "Payé" : "Remboursé"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {(c.statut === "BROUILLON" || c.statut === "ENVOYEE") && canReceive && (
          <div className="flex items-end gap-2">
            {c.statut === "BROUILLON" && (
              <button
                onClick={() => void valider()}
                disabled={busy !== null}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                Valider la commande
              </button>
            )}
            <button
              onClick={() => void annuler()}
              disabled={busy !== null}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Annuler la commande
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceptionCard({
  c,
  busy,
  setBusy,
  onDone,
}: {
  c: CommandeAchat;
  busy: string | null;
  setBusy: (b: string | null) => void;
  onDone: () => Promise<void>;
}) {
  const recevable =
    c.statut === "ENVOYEE" || c.statut === "PARTIELLEMENT_RECUE";
  const [qtes, setQtes] = useState<Record<number, number>>({});
  const [msg, setMsg] = useState<string | null>(null);

  if (!recevable) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">
        Réceptionner la commande
      </h2>
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <ul className="space-y-2">
        {c.lignes?.map((l) => (
          <li key={l.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate font-medium">
              {l.produit?.nom ?? `#${l.produitId}`}
            </span>
            <span className="text-xs text-zinc-400">
              commandé {l.quantite}
            </span>
            <input
              type="number"
              min={0}
              max={l.quantite}
              value={qtes[l.id] ?? 0}
              onChange={(e) =>
                setQtes((m) => ({ ...m, [l.id]: Number(e.target.value) || 0 }))
              }
              className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </li>
        ))}
      </ul>
      <button
        onClick={() => {
          setBusy("reception");
          void (async () => {
            try {
              const lignes = (c.lignes ?? [])
                .filter((l) => (qtes[l.id] ?? 0) > 0)
                .map((l) => ({ ligneId: l.id, quantiteRecue: qtes[l.id] ?? 0 }));
              if (lignes.length === 0) {
                setMsg("Saisissez au moins une quantité reçue.");
                setBusy(null);
                return;
              }
              await AchatsAPI.receptionner(c.id, lignes);
              setMsg(null);
              await onDone();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Erreur");
              setBusy(null);
            }
          })();
        }}
        disabled={busy !== null}
        className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy === "reception" ? "Réception…" : "Enregistrer la réception"}
      </button>
    </div>
  );
}

function PaiementCard({
  c,
  busy,
  setBusy,
  onDone,
}: {
  c: CommandeAchat;
  busy: string | null;
  setBusy: (b: string | null) => void;
  onDone: () => Promise<void>;
}) {
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("ESPECES");
  const [msg, setMsg] = useState<string | null>(null);

  if ((c.resteAPayer ?? 0) <= 0) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">
        Payer le fournisseur
      </h2>
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <div className="space-y-2">
        <input
          type="number"
          min={1}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder={`Montant (reste ${c.resteAPayer ?? 0})`}
          className={inputCls}
        />
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
      </div>
      <button
        onClick={() => {
          setBusy("paiement");
          void (async () => {
            try {
              await AchatsAPI.payer(c.id, {
                montant: Number(montant),
                mode,
              });
              setMontant("");
              setMsg(null);
              await onDone();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Erreur");
              setBusy(null);
            }
          })();
        }}
        disabled={busy !== null || !(Number(montant) > 0)}
        className="mt-3 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {busy === "paiement" ? "Paiement…" : "Enregistrer le paiement"}
      </button>
    </div>
  );
}