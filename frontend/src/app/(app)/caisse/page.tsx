"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CaisseAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import {
  SENS_CAISSE,
  STATUT_CAISSE,
  type CaisseSession,
} from "@/lib/types";

const inputCls =
  "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

type EtatCaisse = {
  ouverte: boolean;
  session: (CaisseSession & {
    mouvements?: { id: number; sens: string; montant: number; motif: string | null; reference: string | null; date: string }[];
    entree: number;
    sortie: number;
  }) | null;
};

export default function CaissePage() {
  const { user } = useAuth();
  const canOuvrir = user && ["ADMIN", "GERANT", "CAISSIER", "COMPTABLE"].includes(user.role);

  const [etat, setEtat] = useState<EtatCaisse | null>(null);
  const [jour, setJour] = useState<(CaisseSession & { entree: number; sortie: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOuvrir, setShowOuvrir] = useState(false);
  const [showFermer, setShowFermer] = useState(false);
  const [showMvt, setShowMvt] = useState(false);

  const load = async () => {
    try {
      setError(null);
      const [e, j] = await Promise.all([CaisseAPI.etat(), CaisseAPI.jour()]);
      setEtat(e);
      setJour(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [e, j] = await Promise.all([CaisseAPI.etat(), CaisseAPI.jour()]);
        if (active) {
          setEtat(e);
          setJour(j);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const open = etat?.ouverte && etat.session;
  const closedToday = jour.filter((s) => s.statut === "FERMEE");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Caisse</h1>
          <p className="text-sm text-zinc-500">
            Session du jour · suivi des encaissements et fonds.
          </p>
        </div>
        {canOuvrir && (
          <div className="flex items-center gap-2">
            {!open && (
              <button
                onClick={() => setShowOuvrir(true)}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Ouvrir la caisse
              </button>
            )}
            {open && (
              <>
                <button
                  onClick={() => setShowMvt(true)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Mouvement
                </button>
                <button
                  onClick={() => setShowFermer(true)}
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Fermer la caisse
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {open ? (
        <SessionActive session={etat!.session!} />
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500">
          Aucune session ouverte aujourd&apos;hui.
        </div>
      )}

      {closedToday.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Sessions fermées aujourd&apos;hui
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {closedToday.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    {STATUT_CAISSE[s.statut]}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {formatDate(s.dateOuverture, true)}
                  </p>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-zinc-500">Fond de caisse</dt>
                  <dd className="text-right font-medium">
                    {formatMoney(s.fondDeCaisse)}
                  </dd>
                  <dt className="text-zinc-500">Théorique</dt>
                  <dd className="text-right font-medium">
                    {formatMoney(s.montantTheorique)}
                  </dd>
                  <dt className="text-zinc-500">Réel</dt>
                  <dd className="text-right font-medium">
                    {formatMoney(s.montantReel ?? 0)}
                  </dd>
                  <dt className="text-zinc-500">Écart</dt>
                  <dd
                    className={`text-right font-semibold ${
                      (s.ecart ?? 0) === 0
                        ? "text-zinc-900"
                        : (s.ecart ?? 0) > 0
                          ? "text-indigo-700"
                          : "text-red-600"
                    }`}
                  >
                    {s.ecart === null || s.ecart === 0
                      ? "0"
                      : s.ecart > 0
                        ? `+${s.ecart}`
                        : s.ecart}
                  </dd>
                </dl>
                <p className="mt-2 text-xs text-zinc-400">
                  Ouverte le {formatDate(s.dateOuverture, true)} par{" "}
                  {s.utilisateur?.nom ?? "—"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {showOuvrir && (
        <OuvrirModal
          onClose={() => setShowOuvrir(false)}
          onSaved={() => {
            setShowOuvrir(false);
            void load();
          }}
        />
      )}
      {showFermer && etat?.session && (
        <FermerModal
          theorique={etat.session.fondDeCaisse + etat.session.entree - etat.session.sortie}
          onClose={() => setShowFermer(false)}
          onSaved={() => {
            setShowFermer(false);
            void load();
          }}
        />
      )}
      {showMvt && (
        <MouvementModal
          onClose={() => setShowMvt(false)}
          onSaved={() => {
            setShowMvt(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function SessionActive({ session }: { session: NonNullable<EtatCaisse["session"]> }) {
  const theorique = session.fondDeCaisse + (session.entree ?? 0) - (session.sortie ?? 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniCard label="Fond de caisse" value={formatMoney(session.fondDeCaisse)} />
        <MiniCard label="Encaissé (entrées)" value={formatMoney(session.entree ?? 0)} tone="positive" />
        <MiniCard label="Sorties" value={formatMoney(session.sortie ?? 0)} />
        <MiniCard label="Total théorique" value={formatMoney(theorique)} tone="accent" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">
            Mouvements de la session
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Sens</th>
              <th className="px-4 py-2 font-medium">Motif</th>
              <th className="px-4 py-2 font-medium">Référence</th>
              <th className="px-4 py-2 text-right font-medium">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {!session.mouvements?.length && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-zinc-400">
                  Aucun mouvement manuel — les encaissements de vente ne sont
                  pas listés ici.
                </td>
              </tr>
            )}
            {session.mouvements?.map((m) => (
              <tr key={m.id}>
                <td className="px-4 py-2 text-zinc-600">{formatDate(m.date, true)}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                      m.sens === "ENTREE"
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {SENS_CAISSE[m.sens] ?? m.sens}
                  </span>
                </td>
                <td className="px-4 py-2 text-zinc-700">{m.motif ?? "—"}</td>
                <td className="px-4 py-2 text-zinc-500">{m.reference ?? "—"}</td>
                <td
                  className={`px-4 py-2 text-right font-medium ${
                    m.sens === "ENTREE" ? "text-indigo-700" : "text-red-600"
                  }`}
                >
                  {m.sens === "ENTREE" ? "+" : "−"}
                  {formatMoney(m.montant)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MiniCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "accent";
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          tone === "positive" ? "text-indigo-700" : tone === "accent" ? "text-indigo-700" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function OuvrirModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fond, setFond] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await CaisseAPI.ouvrir(Number(fond) || 0);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <Modal title="Ouvrir la caisse" onClose={onClose} onSubmit={onSubmit} error={error} saving={saving}>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-zinc-700">
          Fond de caisse (FCFA)
        </span>
        <input
          type="number"
          min={0}
          value={fond}
          onChange={(e) => setFond(e.target.value)}
          className={inputCls}
        />
      </label>
    </Modal>
  );
}

function FermerModal({
  theorique,
  onClose,
  onSaved,
}: {
  theorique: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reel, setReel] = useState(String(theorique));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await CaisseAPI.fermer(Number(reel) || 0);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  const diff = (Number(reel) || 0) - theorique;

  return (
    <Modal
      title="Fermer la caisse"
      onClose={onClose}
      onSubmit={onSubmit}
      error={error}
      saving={saving}
    >
      <p className="mb-3 text-sm text-zinc-500">
        Montant théorique :{" "}
        <span className="font-semibold text-zinc-900">{formatMoney(theorique)}</span>
      </p>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-zinc-700">
          Montant réel compté *
        </span>
        <input
          type="number"
          min={0}
          value={reel}
          onChange={(e) => setReel(e.target.value)}
          className={inputCls}
        />
      </label>
      {diff !== 0 && (
        <p
          className={`mt-2 text-sm font-medium ${
            diff > 0 ? "text-indigo-700" : "text-red-600"
          }`}
        >
          Écart prévu : {diff > 0 ? "+" : "−"}
          {formatMoney(Math.abs(diff))}
        </p>
      )}
    </Modal>
  );
}

function MouvementModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sens, setSens] = useState("ENTREE");
  const [montant, setMontant] = useState("");
  const [motif, setMotif] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!(Number(montant) > 0) || !motif.trim()) {
      setError("Montant et motif requis.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await CaisseAPI.mouvement({
        sens,
        montant: Number(montant),
        motif: motif.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSaving(false);
    }
  }

  return (
    <Modal title="Mouvement manuel" onClose={onClose} onSubmit={onSubmit} error={error} saving={saving}>
      <div className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Sens</span>
          <select
            value={sens}
            onChange={(e) => setSens(e.target.value)}
            className={inputCls}
          >
            <option value="ENTREE">Entrée (espèce versée)</option>
            <option value="SORTIE">Sortie (retrait)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Montant *</span>
          <input
            type="number"
            min={1}
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700">Motif *</span>
          <input
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            className={inputCls}
          />
        </label>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  onSubmit,
  error,
  saving,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  error: string | null;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {children}
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