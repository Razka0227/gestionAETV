"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ProduitsAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import type { Produit } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

const MOUV_LABELS: Record<string, string> = {
  ENTREE_ACHAT: "Entrée achat",
  SORTIE_VENTE: "Sortie vente",
  AJUSTEMENT: "Ajustement",
  INVENTAIRE: "Inventaire",
  RETOUR_VENTE: "Retour vente",
  RETOUR_FOURNISSEUR: "Retour fournisseur",
  PERTE: "Perte",
  TRANSFERT: "Transfert",
};

export default function ProduitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const produitId = Number(id);

  const [produit, setProduit] = useState<Produit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const canEdit = user && ["ADMIN", "GERANT", "MAGASINIER"].includes(user.role);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const p = await ProduitsAPI.get(produitId);
        if (active) setProduit(p);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [produitId]);

  async function toggleActif() {
    if (!produit) return;
    try {
      const updated = await ProduitsAPI.update(produit.id, {
        actif: !produit.actif,
      });
      setProduit(updated);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-100" />
      </div>
    );
  }

  if (error || !produit) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? "Produit introuvable."}
        </div>
        <Link href="/produits" className="text-sm text-indigo-600 hover:underline">
          ← Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/produits"
            className="text-sm text-indigo-600 hover:text-indigo-700"
          >
            ← Retour aux produits
          </Link>
          <h1 className="mt-1 text-xl font-semibold">{produit.nom}</h1>
          <p className="text-sm text-zinc-500">
            {produit.reference}
            {produit.codeBarre ? ` · EAN ${produit.codeBarre}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {produit.actif ? (
            <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
              Actif
            </span>
          ) : (
            <span className="rounded-full bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600">
              Inactif
            </span>
          )}
          {canEdit && (
            <>
              <button
                onClick={() => setEditing((e) => !e)}
                className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                  editing
                    ? "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                    : "border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
              >
                {editing ? "Annuler" : "Modifier"}
              </button>
              <button
                onClick={() => void toggleActif()}
                className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                  produit.actif
                    ? "border-red-200 text-red-600 hover:bg-red-50"
                    : "border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                }`}
              >
                {produit.actif ? "Désactiver" : "Réactiver"}
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <EditForm produit={produit} onSaved={setProduit} />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <InfoGrid produit={produit} />

            <MovementsCard mouvements={produit.mouvementsStock ?? []} />
          </div>

          <div className="space-y-5">
            {canEdit && (
              <VariantesCard produit={produit} onChange={setProduit} />
            )}
            {produit.suitLots && canEdit && (
              <LotsCard produit={produit} onChange={setProduit} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoGrid({ produit }: { produit: Produit }) {
  const low = produit.stockMin > 0 && produit.stock <= produit.stockMin;
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat
          label="Stock"
          value={formatNumber(produit.stock)}
          sub={produit.stockMin > 0 ? `min ${formatNumber(produit.stockMin)}` : undefined}
          tone={produit.stock === 0 ? "text-red-600" : low ? "text-amber-600" : "text-indigo-600"}
        />
        <Stat label="Prix d'achat" value={formatMoney(produit.prixAchat)} />
        <Stat label="Prix de vente" value={formatMoney(produit.prixVente)} />
        <Stat
          label="Marge unitaire"
          value={formatMoney(produit.prixVente - produit.prixAchat)}
          tone="text-sky-600"
        />
        {produit.prixGros != null && (
          <Stat label="Prix de gros" value={formatMoney(produit.prixGros)} />
        )}
        {produit.prixPromo != null && (
          <Stat label="Prix promo" value={formatMoney(produit.prixPromo)} />
        )}
        <Stat
          label="Catégorie"
          value={produit.categorie?.nom ?? "—"}
          sub={produit.categorie?.parent?.nom}
        />
        <Stat label="Marque" value={produit.marque?.nom ?? "—"} />
        <Stat label="Unité" value={produit.unite} />
        <Stat label="Emplacement" value={produit.emplacement ?? "—"} />
      </div>
      {produit.description && (
        <p className="mt-4 border-t border-zinc-100 pt-4 text-sm text-zinc-600">
          {produit.description}
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className={`mt-1 text-base font-semibold ${tone ?? "text-zinc-900"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-400">{sub}</p>}
    </div>
  );
}

function MovementsCard({
  mouvements,
}: {
  mouvements: NonNullable<Produit["mouvementsStock"]>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">
          Derniers mouvements de stock
        </h2>
      </div>
      {mouvements.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-400">
          Aucun mouvement enregistré.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {mouvements.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                  m.quantite >= 0
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {m.quantite >= 0 ? "+" : ""}
                {formatNumber(m.quantite)}
              </span>
              <span className="flex-1">
                {MOUV_LABELS[m.type] ?? m.type}
                {m.reference && (
                  <span className="ml-1 text-xs text-zinc-400">{m.reference}</span>
                )}
              </span>
              <span className="text-xs text-zinc-400">{formatDate(m.date, true)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VariantesCard({
  produit,
  onChange,
}: {
  produit: Produit;
  onChange: (p: Produit) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [voNom, setVoNom] = useState("");
  const [voValeur, setVoValeur] = useState("");
  const [voPrix, setVoPrix] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!voNom.trim() || !voValeur.trim()) return;
    setError(null);
    try {
      await ProduitsAPI.addVariante(produit.id, {
        nomOption: voNom.trim(),
        valeur: voValeur.trim(),
        prixAjustement: Number(voPrix) || 0,
      });
      setVoNom("");
      setVoValeur("");
      setVoPrix("");
      const updated = await ProduitsAPI.get(produit.id);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function remove(vid: number) {
    setError(null);
    try {
      await ProduitsAPI.removeVariante(produit.id, vid);
      const updated = await ProduitsAPI.get(produit.id);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">Variantes</h2>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={add} className="mb-3 flex gap-2">
        <input
          value={voNom}
          onChange={(e) => setVoNom(e.target.value)}
          placeholder="Taille…"
          className={`${inputCls} flex-1`}
        />
        <input
          value={voValeur}
          onChange={(e) => setVoValeur(e.target.value)}
          placeholder="M…"
          className={`${inputCls} flex-1`}
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          +
        </button>
      </form>
      {(produit.variantes ?? []).length === 0 ? (
        <p className="text-sm text-zinc-400">Aucune variante.</p>
      ) : (
        <ul className="space-y-1.5">
          {(produit.variantes ?? []).map((v) => (
            <li
              key={v.id}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
            >
              <span>
                <strong>{v.nomOption}</strong> : {v.valeur}
                {v.prixAjustement !== 0 && (
                  <span className="ml-1 text-xs text-zinc-500">
                    ({(v.prixAjustement > 0 ? "+" : "")}
                    {formatNumber(v.prixAjustement)} FCFA)
                  </span>
                )}
              </span>
              <button
                onClick={() => void remove(v.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LotsCard({
  produit,
  onChange,
}: {
  produit: Produit;
  onChange: (p: Produit) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [numero, setNumero] = useState("");
  const [datePeremption, setDatePeremption] = useState("");
  const [quantite, setQuantite] = useState("");

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!numero.trim()) return;
    setError(null);
    try {
      await ProduitsAPI.addLot(produit.id, {
        numero: numero.trim(),
        datePeremption: datePeremption || undefined,
        quantite: quantite ? Number(quantite) : undefined,
      });
      setNumero("");
      setDatePeremption("");
      setQuantite("");
      const updated = await ProduitsAPI.get(produit.id);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function remove(lotId: number) {
    setError(null);
    try {
      await ProduitsAPI.removeLot(produit.id, lotId);
      const updated = await ProduitsAPI.get(produit.id);
      onChange(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-zinc-800">Lots</h2>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      <form onSubmit={add} className="mb-3 space-y-2">
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="N° de lot *"
          className={`${inputCls} w-full`}
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={datePeremption}
            onChange={(e) => setDatePeremption(e.target.value)}
            className={`${inputCls} flex-1`}
          />
          <input
            type="number"
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            placeholder="Qté"
            className={`${inputCls} w-24`}
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            +
          </button>
        </div>
      </form>
      {(produit.lots ?? []).length === 0 ? (
        <p className="text-sm text-zinc-400">Aucun lot.</p>
      ) : (
        <ul className="space-y-1.5">
          {(produit.lots ?? []).map((lot) => (
            <li
              key={lot.id}
              className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
            >
              <span>
                <strong>{lot.numero}</strong>
                {lot.datePeremption && (
                  <span className="ml-2 text-xs text-zinc-500">
                    exp. {formatDate(lot.datePeremption)}
                  </span>
                )}
                <span className="ml-2 text-xs text-zinc-400">
                  {formatNumber(lot.quantite)} u.
                </span>
              </span>
              <button
                onClick={() => void remove(lot.id)}
                className="text-xs text-red-600 hover:underline"
              >
                Retirer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function EditForm({
  produit,
  onSaved,
}: {
  produit: Produit;
  onSaved: (p: Produit) => void;
}) {
  const [nom, setNom] = useState(produit.nom);
  const [codeBarre, setCodeBarre] = useState(produit.codeBarre ?? "");
  const [prixAchat, setPrixAchat] = useState(String(produit.prixAchat));
  const [prixVente, setPrixVente] = useState(String(produit.prixVente));
  const [prixGros, setPrixGros] = useState(
    produit.prixGros == null ? "" : String(produit.prixGros),
  );
  const [prixPromo, setPrixPromo] = useState(
    produit.prixPromo == null ? "" : String(produit.prixPromo),
  );
  const [stockMin, setStockMin] = useState(String(produit.stockMin));
  const [unite, setUnite] = useState(produit.unite);
  const [emplacement, setEmplacement] = useState(produit.emplacement ?? "");
  const [description, setDescription] = useState(produit.description ?? "");
  const [suitLots, setSuitLots] = useState(produit.suitLots);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await ProduitsAPI.update(produit.id, {
        nom: nom.trim(),
        codeBarre: codeBarre.trim() || null,
        prixAchat: Number(prixAchat) || 0,
        prixVente: Number(prixVente) || 0,
        prixGros: prixGros ? Number(prixGros) : null,
        prixPromo: prixPromo ? Number(prixPromo) : null,
        stockMin: Number(stockMin) || 0,
        unite: unite.trim() || "pièce",
        emplacement: emplacement.trim() || null,
        description: description.trim() || null,
        suitLots,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nom *" className="md:col-span-2">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            className={inputCls}
          />
        </Field>
        <Field label="Code-barres">
          <input
            value={codeBarre}
            onChange={(e) => setCodeBarre(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Unité">
          <input
            value={unite}
            onChange={(e) => setUnite(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Prix d'achat (FCFA)">
          <input
            type="number"
            min={0}
            value={prixAchat}
            onChange={(e) => setPrixAchat(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Prix de vente (FCFA)">
          <input
            type="number"
            min={0}
            value={prixVente}
            onChange={(e) => setPrixVente(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Prix de gros (FCFA)">
          <input
            type="number"
            min={0}
            value={prixGros}
            onChange={(e) => setPrixGros(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Prix promo (FCFA)">
          <input
            type="number"
            min={0}
            value={prixPromo}
            onChange={(e) => setPrixPromo(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Stock minimum d'alerte">
          <input
            type="number"
            min={0}
            value={stockMin}
            onChange={(e) => setStockMin(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Emplacement">
          <input
            value={emplacement}
            onChange={(e) => setEmplacement(e.target.value)}
            className={inputCls}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-zinc-700 md:col-span-2">
          <input
            type="checkbox"
            checked={suitLots}
            onChange={(e) => setSuitLots(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
          />
          Suivi par lots / dates de péremption
        </label>
        <Field label="Description" className="md:col-span-2">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </Field>
      </div>
      <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}