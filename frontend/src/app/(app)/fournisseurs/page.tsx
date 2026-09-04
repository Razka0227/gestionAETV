"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { FournisseursAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import type { Fournisseur } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function FournisseursPage() {
  const { user } = useAuth();
  const canEdit =
    user && ["ADMIN", "GERANT", "MAGASINIER"].includes(user.role);

  const [rows, setRows] = useState<Fournisseur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await FournisseursAPI.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = await FournisseursAPI.list();
        if (active) setRows(rows);
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Fournisseurs</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} fournisseur(s) référencé(s) · soldes de dettes.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Nouveau fournisseur
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            void load();
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Fournisseur</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 text-right font-medium">Total achats</th>
              <th className="px-4 py-3 text-right font-medium">Payé</th>
              <th className="px-4 py-3 text-right font-medium">Dette</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-4 py-3">
                    <div className="h-4 animate-pulse rounded bg-zinc-100" />
                  </td>
                </tr>
              ))}
            {!loading &&
              rows.map((f) => (
                <tr key={f.id} className={f.actif ? "" : "opacity-50"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-zinc-900">{f.nom}</p>
                    {f.entreprise && (
                      <p className="text-xs text-zinc-400">{f.entreprise}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {f.telephone && <p>{f.telephone}</p>}
                    {f.email && <p className="text-xs">{f.email}</p>}
                    {!f.telephone && !f.email && <span>—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {formatMoney(f.totalAchats)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-600">
                    {formatMoney(f.totalPaye)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(f.dette ?? 0) > 0 ? (
                      <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {formatMoney(f.dette)}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {f.actif ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        Actif
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600">
                        Inactif
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-400">
                  Aucun fournisseur.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CreateModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nom: "",
    entreprise: "",
    telephone: "",
    email: "",
    adresse: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await FournisseursAPI.create({
        nom: form.nom.trim(),
        entreprise: form.entreprise.trim() || undefined,
        telephone: form.telephone.trim() || undefined,
        email: form.email.trim() || undefined,
        adresse: form.adresse.trim() || undefined,
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
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold">Nouveau fournisseur</h2>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium text-zinc-700">Nom *</span>
            <input
              value={form.nom}
              onChange={(e) => set("nom", e.target.value)}
              required
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Entreprise
            </span>
            <input
              value={form.entreprise}
              onChange={(e) => set("entreprise", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Téléphone
            </span>
            <input
              value={form.telephone}
              onChange={(e) => set("telephone", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Adresse</span>
            <input
              value={form.adresse}
              onChange={(e) => set("adresse", e.target.value)}
              className={inputCls}
            />
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
            {saving ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}