"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClientsAPI, ProduitsAPI, VentesAPI } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import type { Client, Produit } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

interface LignePanier {
  produit: Produit;
  quantite: number;
  prixUnitaire: number;
  sousTotal: number;
}

export default function NouvelleVentePage() {
  const router = useRouter();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [clientId, setClientId] = useState("");
  const [typeVente, setTypeVente] = useState("DETAIL");
  const [remise, setRemise] = useState(0);
  const [montantEncaisser, setMontantEncaisser] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [p, c] = await Promise.all([
          ProduitsAPI.list({ actif: true, take: 200 }),
          ClientsAPI.list(),
        ]);
        if (active) {
          setProduits(p);
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
    const t = window.setTimeout(() => {
      void ProduitsAPI.list({ search: search || undefined, actif: true, take: 60 })
        .then(setProduits)
        .catch(() => void 0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const sousTotal = panier.reduce((s, l) => s + l.sousTotal, 0);
  const total = Math.max(0, sousTotal - remise);
  const encaisser = montantEncaisser === "" ? total : Math.min(Number(montantEncaisser), total);
  const credit = Math.max(0, total - encaisser);

  function add(produit: Produit) {
    const prix =
      typeVente === "GROS" && produit.prixGros
        ? produit.prixGros
        : typeVente === "PERSONNALISE"
          ? produit.prixVente
          : produit.prixVente;
    setPanier((p) => {
      const ex = p.find((l) => l.produit.id === produit.id);
      if (ex) {
        return p.map((l) =>
          l.produit.id === produit.id
            ? {
                ...l,
                quantite: l.quantite + 1,
                sousTotal: (l.quantite + 1) * l.prixUnitaire,
              }
            : l,
        );
      }
      return [...p, { produit, quantite: 1, prixUnitaire: prix, sousTotal: prix }];
    });
  }

  function setQte(id: number, qte: number) {
    if (qte <= 0) {
      setPanier((p) => p.filter((l) => l.produit.id !== id));
      return;
    }
    setPanier((p) =>
      p.map((l) =>
        l.produit.id === id
          ? { ...l, quantite: qte, sousTotal: qte * l.prixUnitaire }
          : l,
      ),
    );
  }

  function setPrix(id: number, prix: number) {
    setPanier((p) =>
      p.map((l) =>
        l.produit.id === id
          ? { ...l, prixUnitaire: prix, sousTotal: l.quantite * prix }
          : l,
      ),
    );
  }

  async function enregistrer() {
    if (panier.length === 0) {
      setError("Ajoutez au moins un article à la vente.");
      return;
    }
    if (credit > 0 && !clientId) {
      setError("Un crédit est demandé : sélectionnez le client.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const v = await VentesAPI.create({
        clientId: clientId ? Number(clientId) : null,
        typeVente,
        modePaiement: credit > 0 ? "CREDIT_CLIENT" : "ESPECES",
        remise: remise > 0 ? remise : undefined,
        montantEncaisser: encaisser,
        items: panier.map((l) => ({
          produitId: l.produit.id,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
        })),
      });
      router.push(`/ventes/${v.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Nouvelle vente</h1>
        <p className="text-sm text-zinc-500">Point de vente — enregistrement du ticket.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit (nom, référence, code-barres)…"
              className={inputCls}
            />
            <div className="mt-3 grid max-h-[420px] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2">
              {produits.map((p) => (
                <button
                  key={p.id}
                  onClick={() => add(p)}
                  disabled={p.stock <= 0}
                  className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-left hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-40"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-zinc-900">
                      {p.nom}
                    </span>
                    <span className="block text-xs text-zinc-400">
                      {p.reference} · {p.stock} {p.unite}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-indigo-700">
                    {formatMoney(p.prixVente)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-800">Ticket</h2>
              <div className="flex gap-1 rounded-lg bg-zinc-100 p-1">
                {[
                  { v: "DETAIL", l: "Détail" },
                  { v: "GROS", l: "Gros" },
                  { v: "PERSONNALISE", l: "Prix libre" },
                ].map((t) => (
                  <button
                    key={t.v}
                    onClick={() => setTypeVente(t.v)}
                    className={`rounded-md px-2 py-1 text-xs font-medium ${
                      typeVente === t.v
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-zinc-500"
                    }`}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {panier.map((l) => (
                <li
                  key={l.produit.id}
                  className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {l.produit.nom}
                    </span>
                    <button
                      onClick={() => setQte(l.produit.id, l.quantite - 1)}
                      className="h-6 w-6 rounded-md bg-zinc-200 text-sm hover:bg-zinc-300"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={l.quantite}
                      onChange={(e) => setQte(l.produit.id, Number(e.target.value) || 1)}
                      className="w-14 rounded-md border border-zinc-300 px-1 py-1 text-center text-sm"
                    />
                    <button
                      onClick={() => setQte(l.produit.id, l.quantite + 1)}
                      className="h-6 w-6 rounded-md bg-zinc-200 text-sm hover:bg-zinc-300"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                    <span>PU :</span>
                    <input
                      type="number"
                      min={0}
                      value={l.prixUnitaire}
                      onChange={(e) => setPrix(l.produit.id, Number(e.target.value) || 0)}
                      className="w-24 rounded-md border border-zinc-300 px-1 py-0.5 text-xs text-zinc-700"
                    />
                    <span className="ml-auto font-semibold text-zinc-700">
                      {formatMoney(l.sousTotal)}
                    </span>
                  </div>
                </li>
              ))}
              {panier.length === 0 && (
                <li className="py-6 text-center text-sm text-zinc-400">
                  Aucun article — cliquez sur un produit.
                </li>
              )}
            </ul>

            <div className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>Sous-total</span>
                <span>{formatMoney(sousTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-500">
                <span>Remise</span>
                <input
                  type="number"
                  min={0}
                  value={remise || ""}
                  onChange={(e) => setRemise(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="w-24 rounded-md border border-zinc-300 px-2 py-0.5 text-right text-sm"
                />
              </div>
              <div className="flex justify-between text-base font-semibold text-zinc-900">
                <span>Total</span>
                <span className="text-indigo-700">{formatMoney(total)}</span>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-zinc-700">Client</span>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Client de passage</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 flex items-center justify-between font-medium text-zinc-700">
                  <span>Montant encaissé maintenant</span>
                  <span className="text-xs font-normal text-zinc-400">
                    différence = crédit client
                  </span>
                </span>
                <input
                  type="number"
                  min={0}
                  max={total}
                  value={encaisser}
                  onChange={(e) => setMontantEncaisser(Number(e.target.value))}
                  className={inputCls}
                />
              </label>
              {credit > 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  Crédit client : {formatMoney(credit)}
                  {!clientId && " — sélectionnez le client."}
                </p>
              )}
            </div>

            <button
              onClick={() => void enregistrer()}
              disabled={saving || panier.length === 0}
              className="mt-4 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Encaisser et imprimer le ticket"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}