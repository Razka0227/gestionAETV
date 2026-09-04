"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VentesAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { MODE_PAIEMENT, TYPE_VENTE, type Vente } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function VenteDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { user } = useAuth();
  const id = Number(params.id);
  const [v, setV] = useState<Vente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canEncais = user && ["ADMIN", "GERANT", "CAISSIER"].includes(user.role);
  const canAnnuler = user && ["ADMIN", "GERANT", "CAISSIER"].includes(user.role);
  const canRetourner = user && ["ADMIN", "GERANT", "CAISSIER"].includes(user.role);

  const load = async () => {
    try {
      setError(null);
      setV(await VentesAPI.get(id));
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
        const data = await VentesAPI.get(id);
        if (active) setV(data);
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

  async function annuler() {
    if (!window.confirm("Annuler cette vente ? Le stock sera restauré.")) return;
    setBusy("annuler");
    try {
      await VentesAPI.annuler(id);
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

  if (!v) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
        {error ?? "Vente introuvable."}
      </div>
    );
  }

  const recuperable = v.statut === "VALIDEE" && v.montantCredit > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/ventes"
            className="text-sm text-zinc-500 hover:text-indigo-700"
          >
            ← Ventes
          </Link>
          <h1 className="text-xl font-semibold">{v.numeroTicket}</h1>
          <p className="text-sm text-zinc-500">
            {v.client ? v.client.nom : "Client de passage"} ·{" "}
            {formatDate(v.date, true)} · {TYPE_VENTE[v.typeVente] ?? v.typeVente}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              v.statut === "VALIDEE"
                ? "bg-indigo-100 text-indigo-700"
                : v.statut === "ANNULEE"
                  ? "bg-red-100 text-red-600"
                  : v.statut === "RETOURNEE"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-zinc-100 text-zinc-600"
            }`}
          >
            {v.statut}
          </span>
          {canAnnuler && v.statut === "VALIDEE" && (
            <button
              onClick={() => void annuler()}
              disabled={busy !== null}
              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            >
              Annuler
            </button>
          )}
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
            {v.lignes?.map((l) => (
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
                {formatMoney(v.sousTotal)}
              </td>
            </tr>
            {v.remise > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-zinc-500">
                  Remise
                </td>
                <td className="px-4 py-2 text-right text-red-600">
                  − {formatMoney(v.remise)}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right font-semibold text-zinc-700">
                Total
              </td>
              <td className="px-4 py-2 text-right font-semibold text-indigo-700">
                {formatMoney(v.total)}
              </td>
            </tr>
            {v.montantCredit > 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-zinc-500">
                  Dont crédit client
                </td>
                <td className="px-4 py-2 text-right font-medium text-amber-700">
                  {formatMoney(v.montantCredit)}
                </td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {canEncais && recuperable && (
          <EncaissementCard
            v={v}
            busy={busy}
            onDone={async () => {
              await load();
              setBusy(null);
            }}
            setBusy={setBusy}
          />
        )}

        {canRetourner && v.statut === "VALIDEE" && (
          <RetourCard
            v={v}
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
          {!v.paiements?.length && (
            <p className="text-sm text-zinc-400">Aucun paiement.</p>
          )}
          <ul className="divide-y divide-zinc-100 text-sm">
            {v.paiements?.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{formatMoney(p.montant)}</p>
                  <p className="text-xs text-zinc-400">
                    {MODE_PAIEMENT[p.mode] ?? p.mode} ·{" "}
                    {formatDate(p.date, true)}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    p.sens === "ENTREE" ? "text-indigo-600" : "text-red-600"
                  }`}
                >
                  {p.sens === "ENTREE" ? "Encaissé" : "Remboursé"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {v.statut === "VALIDEE" && v.retours && v.retours.length > 0 && (
          <div className="space-y-2 rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">
              Retours effectués
            </h2>
            <ul className="divide-y divide-zinc-100 text-sm">
              {v.retours.map((r) => (
                <li key={r.id} className="py-2">
                  <p className="font-medium">
                    {r.numero} · {formatMoney(r.montant)}
                  </p>
                  <p className="text-xs text-zinc-400">{r.motif}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function EncaissementCard({
  v,
  busy,
  setBusy,
  onDone,
}: {
  v: Vente;
  busy: string | null;
  setBusy: (b: string | null) => void;
  onDone: () => Promise<void>;
}) {
  const [montant, setMontant] = useState("");
  const [mode, setMode] = useState("ESPECES");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-zinc-800">
        Encaisser le crédit
      </h2>
      <p className="mb-3 text-sm text-zinc-500">
        Crédit restant :{" "}
        <span className="font-semibold text-amber-700">
          {formatMoney(v.montantCredit)}
        </span>
      </p>
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <div className="space-y-2">
        <input
          type="number"
          min={1}
          max={v.montantCredit}
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder={`Montant (max ${v.montantCredit})`}
          className={inputCls}
        />
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
      </div>
      <button
        onClick={() => {
          setBusy("encaissement");
          void (async () => {
            try {
              await VentesAPI.payer(v.id, { montant: Number(montant), mode });
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
        {busy === "encaissement" ? "Encaissement…" : "Encaisser"}
      </button>
    </div>
  );
}

function RetourCard({
  v,
  busy,
  setBusy,
  onDone,
}: {
  v: Vente;
  busy: string | null;
  setBusy: (b: string | null) => void;
  onDone: () => Promise<void>;
}) {
  const [qtes, setQtes] = useState<Record<number, number>>({});
  const [motif, setMotif] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">Retour produit</h2>
      {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
      <ul className="mb-3 space-y-2">
        {v.lignes?.map((l) => (
          <li key={l.id} className="flex items-center gap-2 text-sm">
            <span className="flex-1 truncate font-medium">
              {l.produit?.nom ?? `#${l.produitId}`}
            </span>
            <span className="text-xs text-zinc-400">
              vendu {l.quantite} · {formatMoney(l.prixUnitaire)}
            </span>
            <input
              type="number"
              min={0}
              max={l.quantite}
              value={qtes[l.produitId] ?? 0}
              onChange={(e) =>
                setQtes((m) => ({
                  ...m,
                  [l.produitId]: Number(e.target.value) || 0,
                }))
              }
              className="w-20 rounded-lg border border-zinc-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </li>
        ))}
      </ul>
      <input
        value={motif}
        onChange={(e) => setMotif(e.target.value)}
        placeholder="Motif du retour *"
        className={inputCls}
      />
      <button
        onClick={() => {
          setBusy("retour");
          void (async () => {
            try {
              const lignes = (v.lignes ?? [])
                .filter((l) => (qtes[l.produitId] ?? 0) > 0)
                .map((l) => ({
                  produitId: l.produitId,
                  quantite: qtes[l.produitId] ?? 0,
                  prixUnitaire: l.prixUnitaire,
                }));
              if (lignes.length === 0 || !motif.trim()) {
                setMsg("Saisissez le motif et au moins une quantité à retourner.");
                setBusy(null);
                return;
              }
              await VentesAPI.retourner(v.id, { motif: motif.trim(), lignes });
              setQtes({});
              setMotif("");
              setMsg(null);
              await onDone();
            } catch (e) {
              setMsg(e instanceof Error ? e.message : "Erreur");
              setBusy(null);
            }
          })();
        }}
        disabled={busy !== null}
        className="mt-3 w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {busy === "retour" ? "Retour…" : "Enregistrer le retour"}
      </button>
    </div>
  );
}