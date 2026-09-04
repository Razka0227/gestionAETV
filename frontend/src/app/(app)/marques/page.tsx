"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { MarquesAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import type { Marque } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function MarquesPage() {
  const { user } = useAuth();
  const canEdit = user && ["ADMIN", "GERANT", "MAGASINIER"].includes(user.role);

  const [marques, setMarques] = useState<(Marque & { _count?: { produits: number } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [nom, setNom] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setMarques(await MarquesAPI.list());
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
        const list = await MarquesAPI.list();
        if (active) setMarques(list as (Marque & { _count?: { produits: number } })[]);
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

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    if (!window.confirm(`Créer la marque « ${nom.trim()} » ?`)) return;
    setError(null);
    setSaving(true);
    try {
      await MarquesAPI.create(nom.trim());
      setNom("");
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  async function rename(m: Marque, nouveau: string) {
    if (!nouveau.trim() || nouveau.trim() === m.nom) return;
    setError(null);
    try {
      await MarquesAPI.update(m.id, nouveau.trim());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  async function remove(m: Marque) {
    if (!window.confirm(`Supprimer la marque « ${m.nom} » ?`)) return;
    setError(null);
    try {
      await MarquesAPI.remove(m.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Marques</h1>
          <p className="text-sm text-zinc-500">
            Marques utilisées par les produits.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreate((s) => !s)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Nouvelle marque
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showCreate && canEdit && (
        <form
          onSubmit={create}
          className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
        >
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Nom de la marque *</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className={inputCls}
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? "Création…" : "Créer"}
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <ul className="divide-y divide-zinc-100">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <div className="h-4 animate-pulse rounded bg-zinc-100" />
              </li>
            ))}
          {!loading &&
            marques.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="flex-1">
                  <p className="font-medium">{m.nom}</p>
                  <p className="text-xs text-zinc-400">
                    {formatNumber(m._count?.produits ?? 0)} produit(s)
                  </p>
                </div>
                {canEdit && (
                  <input
                    defaultValue={m.nom}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        void rename(m, (e.target as HTMLInputElement).value);
                    }}
                    className="w-36 rounded-lg border border-zinc-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
                    placeholder="Renommer…"
                  />
                )}
                {canEdit && (
                  <button
                    onClick={() => void remove(m)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Suppr.
                  </button>
                )}
              </li>
            ))}
          {!loading && marques.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-zinc-400">
              Aucune marque.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}