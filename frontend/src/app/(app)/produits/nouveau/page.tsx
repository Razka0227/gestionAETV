"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { CategoriesAPI, MarquesAPI, ProduitsAPI } from "@/lib/api";
import type { Categorie, Marque } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function NouveauProduitPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [marques, setMarques] = useState<Marque[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nom, setNom] = useState("");
  const [reference, setReference] = useState("");
  const [codeBarre, setCodeBarre] = useState("");
  const [categorieId, setCategorieId] = useState("");
  const [marqueId, setMarqueId] = useState("");
  const [prixAchat, setPrixAchat] = useState("");
  const [prixVente, setPrixVente] = useState("");
  const [prixGros, setPrixGros] = useState("");
  const [prixPromo, setPrixPromo] = useState("");
  const [stockMin, setStockMin] = useState("0");
  const [unite, setUnite] = useState("pièce");
  const [emplacement, setEmplacement] = useState("");
  const [suitLots, setSuitLots] = useState(false);
  const [variantes, setVariantes] = useState<
    { nomOption: string; valeur: string; prixAjustement: number }[]
  >([]);
  const [voNom, setVoNom] = useState("");
  const [voValeur, setVoValeur] = useState("");
  const [voPrix, setVoPrix] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [cats, marqs] = await Promise.all([
          CategoriesAPI.list(),
          MarquesAPI.list(),
        ]);
        if (!active) return;
        setCategories(cats);
        setMarques(marqs);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function addVariante() {
    if (!voNom.trim() || !voValeur.trim()) return;
    setVariantes([
      ...variantes,
      {
        nomOption: voNom.trim(),
        valeur: voValeur.trim(),
        prixAjustement: Number(voPrix) || 0,
      },
    ]);
    setVoNom("");
    setVoValeur("");
    setVoPrix("");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!categorieId) {
      setError("Veuillez choisir une catégorie.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nom: nom.trim(),
        reference: reference.trim() || undefined,
        codeBarre: codeBarre.trim() || null,
        categorieId: Number(categorieId),
        marqueId: marqueId ? Number(marqueId) : null,
        prixAchat: Number(prixAchat) || 0,
        prixVente: Number(prixVente) || 0,
        prixGros: prixGros ? Number(prixGros) : null,
        prixPromo: prixPromo ? Number(prixPromo) : null,
        stockMin: Number(stockMin) || 0,
        unite: unite.trim() || "pièce",
        emplacement: emplacement.trim() || null,
        suitLots,
        variantes: variantes.length ? variantes : undefined,
      };
      const created = await ProduitsAPI.create(payload);
      router.replace(`/produits/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  const parents = categories.filter((c) => !c.parentId);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link
          href="/produits"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          ← Retour aux produits
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Nouveau produit</h1>
        <p className="text-sm text-zinc-500">
          Créez un produit et ajoutez des variantes si nécessaire.
        </p>
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Nom du produit *" className="md:col-span-2">
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className={inputCls}
            />
          </Field>
          <Field label="Référence (vide = auto)">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="REF-0017…"
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
          <Field label="Catégorie *">
            <select
              value={categorieId}
              onChange={(e) => setCategorieId(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">— Choisir —</option>
              {parents.map((c) => {
                const children = categories.filter((s) => s.parentId === c.id);
                return (
                  <optgroup key={c.id} label={c.nom}>
                    <option value={c.id}>{c.nom}</option>
                    {children.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </Field>
          <Field label="Marque">
            <select
              value={marqueId}
              onChange={(e) => setMarqueId(e.target.value)}
              className={inputCls}
            >
              <option value="">— Aucune —</option>
              {marques.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nom}
                </option>
              ))}
            </select>
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
          <Field label="Unité">
            <input
              value={unite}
              onChange={(e) => setUnite(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Emplacement (étagère…)">
            <input
              value={emplacement}
              onChange={(e) => setEmplacement(e.target.value)}
              className={inputCls}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={suitLots}
              onChange={(e) => setSuitLots(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-indigo-600"
            />
            Suivi par lots / dates de péremption
          </label>
        </div>

        <div className="border-t border-zinc-100 pt-4">
          <p className="mb-2 text-sm font-medium text-zinc-700">
            Variantes (optionnel)
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <input
              value={voNom}
              onChange={(e) => setVoNom(e.target.value)}
              placeholder="Taille / Couleur…"
              className={`${inputCls} w-40`}
            />
            <input
              value={voValeur}
              onChange={(e) => setVoValeur(e.target.value)}
              placeholder="M, Noir…"
              className={`${inputCls} w-40`}
            />
            <input
              type="number"
              value={voPrix}
              onChange={(e) => setVoPrix(e.target.value)}
              placeholder="Ajustement prix"
              className={`${inputCls} w-40`}
            />
            <button
              type="button"
              onClick={addVariante}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
            >
              + Ajouter
            </button>
          </div>
          {variantes.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {variantes.map((v, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{v.nomOption}</strong> : {v.valeur}{" "}
                    {v.prixAjustement !== 0 && (
                      <span className="text-zinc-400">
                        ({(v.prixAjustement > 0 ? "+" : "")}
                        {v.prixAjustement} FCFA)
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setVariantes(variantes.filter((_, j) => j !== i))
                    }
                    className="text-xs text-red-600 hover:underline"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
          <Link
            href="/produits"
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Création…" : "Créer le produit"}
          </button>
        </div>
      </form>
    </div>
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