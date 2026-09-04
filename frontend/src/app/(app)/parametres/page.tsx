"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const LABELS: Record<string, string> = {
  "boutique.nom": "Nom de la boutique",
  "boutique.adresse": "Adresse",
  "boutique.telephone": "Téléphone",
  devise: "Devise",
  taxe_defaut: "Taxe par défaut (%)",
  vente_negative: "Autoriser la vente en stock négatif",
  remise_max: "Remise max caissier (%)",
  programme_fidelite: "Programme de fidélité",
  points_par_1000: "Points fidélité / 1000 FCFA",
};

const RAW_ORDER = [
  "boutique.nom",
  "boutique.adresse",
  "boutique.telephone",
  "devise",
  "taxe_defaut",
  "remise_max",
  "vente_negative",
  "programme_fidelite",
  "points_par_1000",
];

export default function ParametresPage() {
  const [params, setParams] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const rows = await api<Record<string, string>>("/parametres");
        if (active) setParams(new Map(Object.entries(rows)));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Erreur");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaved(false);
    setError(null);
    try {
      const body: Record<string, string> = {};
      params.forEach((v, k) => {
        body[k] = v;
      });
      await api("/parametres", { method: "PATCH", body: JSON.stringify(body) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Paramètres</h1>
          <p className="text-sm text-zinc-500">
            Configuration générale de l&apos;application.
          </p>
        </div>
        <button
          onClick={() => void save()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Enregistrer
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          Paramètres enregistrés.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {RAW_ORDER.filter((cle) => params.has(cle)).map((cle) => (
          <div
            key={cle}
            className="flex flex-col gap-1 border-b border-zinc-100 px-4 py-3 last:border-0 sm:flex-row sm:items-center"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{LABELS[cle] ?? cle}</p>
            </div>
            <input
              value={params.get(cle) ?? ""}
              onChange={(e) =>
                setParams((prev) => new Map(prev).set(cle, e.target.value))
              }
              className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-44"
            />
          </div>
        ))}
      </div>
    </div>
  );
}