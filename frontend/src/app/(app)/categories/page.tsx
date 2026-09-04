"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { CategoriesAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import type { Categorie } from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function CategoriesPage() {
  const { user } = useAuth();
  const canEdit = user && ["ADMIN", "GERANT", "MAGASINIER"].includes(user.role);

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories(await CategoriesAPI.list());
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
        const cats = await CategoriesAPI.list();
        if (active) setCategories(cats);
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

  const parents = categories.filter((c) => !c.parentId);
  const children = categories.filter((c) => c.parentId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Catégories</h1>
          <p className="text-sm text-zinc-500">
            Structure du catalogue produits.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Nouvelle catégorie
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

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800">
            Catégories principales
          </h2>
          <ul className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="h-4 animate-pulse rounded bg-zinc-100" />
                </li>
              ))}
            {!loading &&
              parents.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{c.nom}</p>
                    <p className="text-xs text-zinc-400">
                      {formatNumber(c._count?.produits ?? 0)} produit(s)
                    </p>
                  </div>
                  {canEdit && <RowActions cat={c} onChanged={() => void load()} />}
                </li>
              ))}
            {!loading && parents.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-zinc-400">
                Aucune catégorie.
              </li>
            )}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <h2 className="border-b border-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-800">
            Sous-catégories
          </h2>
          <ul className="divide-y divide-zinc-100">
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="h-4 animate-pulse rounded bg-zinc-100" />
                </li>
              ))}
            {!loading &&
              children.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-4 py-3 text-sm">
                  <div className="flex-1">
                    <p className="font-medium">{c.nom}</p>
                    <p className="text-xs text-zinc-400">
                      {c.parent?.nom} · {formatNumber(c._count?.produits ?? 0)} produit(s)
                    </p>
                  </div>
                  {canEdit && <RowActions cat={c} onChanged={() => void load()} />}
                </li>
              ))}
            {!loading && children.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-zinc-400">
                Aucune sous-catégorie.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RowActions({
  cat,
  onChanged,
}: {
  cat: Categorie;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(cat.nom);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    if (!editing.trim()) return;
    setBusy("save");
    setMsg(null);
    try {
      await CategoriesAPI.update(cat.id, { nom: editing.trim() });
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!window.confirm(`Supprimer la catégorie « ${cat.nom} » ?`)) return;
    setBusy("del");
    setMsg(null);
    try {
      await CategoriesAPI.remove(cat.id);
      onChanged();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {msg && <span className="text-xs text-red-600">{msg}</span>}
      <input
        value={editing}
        onChange={(e) => setEditing(e.target.value)}
        className="w-32 rounded-lg border border-zinc-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none"
      />
      <button
        onClick={() => void save()}
        disabled={busy === "save"}
        className="rounded-md border border-indigo-200 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
      >
        Renommer
      </button>
      <button
        onClick={() => void remove()}
        disabled={busy === "del"}
        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Suppr.
      </button>
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
  const [nom, setNom] = useState("");
  const [parente, setParente] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cats, setCats] = useState<Categorie[]>([]);

  useEffect(() => {
    let active = true;
    void CategoriesAPI.list().then((c) => {
      if (active) setCats(c);
    });
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await CategoriesAPI.create({
        nom: nom.trim(),
        parentId: parente ? Number(parente) : null,
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
        <h2 className="mb-4 text-lg font-semibold">Nouvelle catégorie</h2>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">Nom *</span>
            <input
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              required
              className={inputCls}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700">
              Catégorie parente (optionnel)
            </span>
            <select
              value={parente}
              onChange={(e) => setParente(e.target.value)}
              className={inputCls}
            >
              <option value="">Aucune (catégorie principale)</option>
              {cats
                .filter((c) => !c.parentId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
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
            {saving ? "Création…" : "Créer"}
          </button>
        </div>
      </form>
    </div>
  );
}