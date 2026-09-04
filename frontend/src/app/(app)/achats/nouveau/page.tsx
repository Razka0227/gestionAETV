"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AchatsAPI, FournisseursAPI, ProduitsAPI } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type {
  CommandeAchat,
  Fournisseur,
  Produit,
} from "@/lib/types";

interface Ligne {
  produitId: number;
  quantite: number;
  prixUnitaire: number;
}

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function NouvelleCommandePage() {
  const router = useRouter();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [fournisseurId, setFournisseurId] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [prodId, setProdId] = useState("");
  const [qte, setQte] = useState("1");
  const [prix, setPrix] = useState("");
  const [remise, setRemise] = useState("0");
  const [frais, setFrais] = useState("0");
  const [taxe, setTaxe] = useState("0");
  const [modePaiement, setModePaiement] = useState("ESPECES");
  const [echeance, setEcheance] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [f, p] = await Promise.all([
          FournisseursAPI.list(),
          ProduitsAPI.list(),
        ]);
        if (!active) return;
        setFournisseurs(f);
        setProduits(p);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function addLigne() {
    const pid = Number(prodId);
    if (!pid || !produits.find((p) => p.id === pid)) return;
    setLignes((l) => [
      ...l,
      {
        produitId: pid,
        quantite: Math.max(1, Number(qte) || 1),
        prixUnitaire: Math.floor(Number(prix) || 0),
      },
    ]);
    setProdId("");
    setQte("1");
    setPrix("");
  }

  const totalHt = lignes.reduce(
    (s, l) =>
      s + l.prixUnitaire * l.quantite,
    0,
  );
  const totalTtc = Math.max(
    0,
    totalHt - (Number(remise) || 0) + (Number(frais) || 0) + (Number(taxe) || 0),
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const c: CommandeAchat = await AchatsAPI.create({
        fournisseurId: Number(fournisseurId),
        modePaiement,
        remise: Number(remise) || 0,
        fraisTransport: Number(frais) || 0,
        taxe: Number(taxe) || 0,
        echeance: echeance ? new Date(echeance).toISOString() : undefined,
        lignes: lignes.map((l) => ({
          produitId: l.produitId,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
      });
      router.push(`/achats/${c.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Nouvelle commande d’achat</h1>
          <p className="text-sm text-zinc-500">
            Bon de commande destiné à un fournisseur.
          </p>
        </div>
        <Link
          href="/achats"
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
        >
          Retour
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">
            Fournisseur *
          </span>
          <select
            value={fournisseurId}
            onChange={(e) => setFournisseurId(e.target.value)}
            required
            className={inputCls}
          >
            <option value="">— Sélectionner —</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
                {f.entreprise ? ` · ${f.entreprise}` : ""}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-zinc-700">
            Articles
          </legend>
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 sm:grid-cols-[1fr_90px_110px_auto]">
            <select
              value={prodId}
              onChange={(e) => {
                setProdId(e.target.value);
                const p = produits.find(
                  (x) => x.id === Number(e.target.value),
                );
                setPrix(p ? String(p.prixAchat) : "");
              }}
              className={inputCls}
            >
              <option value="">— Produit —</option>
              {produits.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom} ({p.reference}) · stock {p.stock}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={qte}
              onChange={(e) => setQte(e.target.value)}
              placeholder="Qté"
              className={inputCls}
            />
            <input
              type="number"
              min={0}
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="Prix"
              className={inputCls}
            />
            <button
              type="button"
              onClick={addLigne}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              +
            </button>
          </div>

          {lignes.length > 0 && (
            <ul className="mt-2 divide-y divide-zinc-100 rounded-xl border border-zinc-100">
              {lignes.map((l, i) => {
                const p = produits.find((x) => x.id === l.produitId);
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 text-sm"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{p?.nom ?? `#${l.produitId}`}</p>
                      <p className="text-xs text-zinc-400">
                        {l.quantite} × {formatMoney(l.prixUnitaire)}
                      </p>
                    </div>
                    <span className="font-medium">
                      {formatMoney(l.quantite * l.prixUnitaire)}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLignes((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Retirer
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Mode de paiement
            </span>
            <select
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className={inputCls}
            >
              <option value="ESPECES">Espèces</option>
              <option value="VIREMENT">Virement</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CARTE">Carte</option>
              <option value="CREDIT_CLIENT">Crédit fournisseur</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Échéance
            </span>
            <input
              type="date"
              value={echeance}
              onChange={(e) => setEcheance(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Remise</span>
            <input
              type="number"
              min={0}
              value={remise}
              onChange={(e) => setRemise(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Frais de transport
            </span>
            <input
              type="number"
              min={0}
              value={frais}
              onChange={(e) => setFrais(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Taxe</span>
            <input
              type="number"
              min={0}
              value={taxe}
              onChange={(e) => setTaxe(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        <div className="flex flex-col items-end gap-1 rounded-xl bg-zinc-50 px-4 py-3 text-sm">
          <div className="flex w-full justify-between">
            <span className="text-zinc-500">Sous-total</span>
            <span>{formatMoney(totalHt)}</span>
          </div>
          <div className="flex w-full justify-between font-semibold">
            <span className="text-zinc-700">Total TTC</span>
            <span className="text-indigo-700">{formatMoney(totalTtc)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Link
            href="/achats"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving || lignes.length === 0 || !fournisseurId}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Création…" : "Créer la commande"}
          </button>
        </div>
      </form>
    </div>
  );
}