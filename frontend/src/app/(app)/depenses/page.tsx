"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { DepensesAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { MODE_PAIEMENT, type Depense, type DepenseCategorie } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function DepensesPage() {
  const { user } = useAuth();
  const canCreate = user && ["ADMIN", "GERANT", "COMPTABLE"].includes(user.role);

  const [rows, setRows] = useState<Depense[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<DepenseCategorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorieId, setCategorieId] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await DepensesAPI.list({
        categorieId: categorieId ? Number(categorieId) : undefined,
        dateDebut: dateDebut || undefined,
        dateFin: dateFin || undefined,
        search: search || undefined,
      });
      setRows(r.liste);
      setTotal(r.total);
      setCategories(await DepensesAPI.categories());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [categorieId, dateDebut, dateFin, search]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [r, c] = await Promise.all([
          DepensesAPI.list(),
          DepensesAPI.categories(),
        ]);
        if (active) {
          setRows(r.liste);
          setTotal(r.total);
          setCategories(c);
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
  }, [categorieId, dateDebut, dateFin, search, load]);

  async function supprimer(id: number) {
    if (!window.confirm("Supprimer cette dépense ?")) return;
    try {
      await DepensesAPI.remove(id);
      void load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Dépenses</h1>
          <p className="text-sm text-zinc-500">
            Suivi des charges de la boutique.
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Nouvelle dépense
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm">
        <select
          value={categorieId}
          onChange={(e) => setCategorieId(e.target.value)}
          className={inputCls}
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </select>
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher (description)…"
          className={`${inputCls} min-w-40 flex-1`}
        />
        <span className="ml-auto text-sm text-zinc-500">
          Total filtré :{" "}
          <span className="font-semibold text-zinc-900">{formatMoney(total)}</span>
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-zinc-400">{c.nom}</p>
            <p className="mt-1 text-lg font-semibold text-zinc-900">
              {formatMoney(c.totalDepenses)}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Description</th>
              <th className="px-4 py-3 font-medium">Mode</th>
              <th className="px-4 py-3 font-medium">Par</th>
              <th className="px-4 py-3 text-right font-medium">Montant</th>
              {canCreate && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={7} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              rows.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3 text-zinc-600">
                    {formatDate(d.date, true)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-lg bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      {d.categorie?.nom ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {d.description ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {MODE_PAIEMENT[d.modePaiement] ?? d.modePaiement}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {d.utilisateur?.nom ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900">
                    {formatMoney(d.montant)}
                  </td>
                  {canCreate && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void supprimer(d.id)}
                        className="text-xs font-medium text-red-500 hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucune dépense.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateModal
          categories={categories}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function CreateModal({
  categories,
  onClose,
  onSaved,
}: {
  categories: DepenseCategorie[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    categorieId: String(categories[0]?.id ?? ""),
    montant: "",
    description: "",
    modePaiement: "ESPECES",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.categorieId || !(Number(form.montant) > 0)) {
      setError("Catégorie et montant requis.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await DepensesAPI.create({
        categorieId: Number(form.categorieId),
        montant: Number(form.montant),
        description: form.description.trim() || undefined,
        modePaiement: form.modePaiement,
      });
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
        <h2 className="mb-4 text-lg font-semibold">Nouvelle dépense</h2>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Catégorie *
            </span>
            <select
              value={form.categorieId}
              onChange={(e) =>
                setForm((f) => ({ ...f, categorieId: e.target.value }))
              }
              className={inputCls}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Montant (FCFA) *
            </span>
            <input
              type="number"
              min={1}
              value={form.montant}
              onChange={(e) =>
                setForm((f) => ({ ...f, montant: e.target.value }))
              }
              required
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Description
            </span>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Mode</span>
            <select
              value={form.modePaiement}
              onChange={(e) =>
                setForm((f) => ({ ...f, modePaiement: e.target.value }))
              }
              className={inputCls}
            >
              <option value="ESPECES">Espèces</option>
              <option value="CARTE">Carte</option>
              <option value="VIREMENT">Virement</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </label>
        </div>
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
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}