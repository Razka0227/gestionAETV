"use client";

import { useCallback, useEffect, useState } from "react";
import { RapportsAPI } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/format";
import type {
  RapportAchats,
  RapportClient,
  RapportGroupe,
  RapportOverview,
  RapportProduit,
  RapportStock,
  RapportVenteJour,
} from "@/lib/types";

const inputCls =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function defaultRange(): { dateDebut: string; dateFin: string } {
  const fin = new Date();
  const debut = new Date();
  debut.setMonth(debut.getMonth() - 1);
  return { dateDebut: iso(debut), dateFin: iso(fin) };
}

export default function RapportsPage() {
  const [range, setRange] = useState(defaultRange);
  const [overview, setOverview] = useState<RapportOverview | null>(null);
  const [jours, setJours] = useState<RapportVenteJour[]>([]);
  const [produits, setProduits] = useState<RapportProduit[]>([]);
  const [categories, setCategories] = useState<RapportGroupe[]>([]);
  const [marques, setMarques] = useState<RapportGroupe[]>([]);
  const [clients, setClients] = useState<RapportClient[]>([]);
  const [achats, setAchats] = useState<RapportAchats | null>(null);
  const [stock, setStock] = useState<RapportStock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const f = { dateDebut: range.dateDebut, dateFin: range.dateFin };
    setLoading(true);
    setError(null);
    try {
      const [o, v, p, c, m, cl, a, s] = await Promise.all([
        RapportsAPI.overview(f),
        RapportsAPI.ventes(f),
        RapportsAPI.produits(f, 10),
        RapportsAPI.categories(f),
        RapportsAPI.marques(f),
        RapportsAPI.clients(f, 10),
        RapportsAPI.achats(f),
        RapportsAPI.stock(),
      ]);
      setOverview(o);
      setJours(v.jours ?? []);
      setProduits(p);
      setCategories(c);
      setMarques(m);
      setClients(cl);
      setAchats(a);
      setStock(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, [range.dateDebut, range.dateFin]);

  useEffect(() => {
    const t = window.setTimeout(() => void load(), 200);
    return () => window.clearTimeout(t);
  }, [range.dateDebut, range.dateFin, load]);

  const maxJour = Math.max(0, ...jours.map((j) => j.montant));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Rapports</h1>
          <p className="text-sm text-zinc-500">
            Analyse des ventes, achats et performance de la boutique.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
          <input
            type="date"
            value={range.dateDebut}
            onChange={(e) => setRange((r) => ({ ...r, dateDebut: e.target.value }))}
            className={inputCls}
            aria-label="Date de début"
          />
          <span className="text-sm text-zinc-400">→</span>
          <input
            type="date"
            value={range.dateFin}
            onChange={(e) => setRange((r) => ({ ...r, dateFin: e.target.value }))}
            className={inputCls}
            aria-label="Date de fin"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-zinc-100" />
          ))}
        </div>
      ) : (
        <>
          {overview && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <OverviewCard label="Chiffre d'affaires" value={formatMoney(overview.ca)} accent />
              <OverviewCard label="Bénéfice net" value={formatMoney(overview.benefice)} />
              <OverviewCard
                label="Marge brute"
                value={formatMoney(overview.beneficeBrut)}
              />
              <OverviewCard label="Ventes" value={`${formatNumber(overview.nombreVentes)} · ${formatNumber(overview.unitesVendues)} u.`} />
              <OverviewCard label="Dépenses" value={formatMoney(overview.depenses)} />
              <OverviewCard label="Achats" value={formatMoney(overview.achats)} />
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Ventes par jour">
              {jours.length === 0 ? (
                <Empty />
              ) : (
                <div className="space-y-2">
                  {jours.map((j) => (
                    <div key={j.date} className="flex items-center gap-3 text-sm">
                      <span className="w-24 shrink-0 text-zinc-600">
                        {formatDateShort(j.date)}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className="h-full rounded-full bg-indigo-600"
                          style={{
                            width: `${maxJour ? Math.max(4, (j.montant / maxJour) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right font-medium text-zinc-900">
                        {formatMoney(j.montant)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Top produits (10)">
              {produits.length === 0 ? (
                <Empty />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="py-2 font-medium">Produit</th>
                      <th className="py-2 text-right font-medium">Qté</th>
                      <th className="py-2 text-right font-medium">Montant</th>
                      <th className="py-2 text-right font-medium">Bénéfice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {produits.map((p) => (
                      <tr key={p.produit.id}>
                        <td className="py-2 text-zinc-800">{p.produit.nom}</td>
                        <td className="py-2 text-right text-zinc-600">{formatNumber(p.quantite)}</td>
                        <td className="py-2 text-right font-medium text-zinc-900">
                          {formatMoney(p.montant)}
                        </td>
                        <td className="py-2 text-right font-medium text-indigo-700">
                          {formatMoney(p.benefice)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="Ventes par catégorie">
              {categories.length === 0 ? (
                <Empty />
              ) : (
                <CategoriesBars data={categories} />
              )}
            </Panel>

            <Panel title="Ventes par marque">
              {marques.length === 0 ? (
                <Empty />
              ) : (
                <CategoriesBars data={marques} />
              )}
            </Panel>

            <Panel title="Meilleurs clients (10)">
              {clients.length === 0 ? (
                <Empty />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-400">
                      <th className="py-2 font-medium">Client</th>
                      <th className="py-2 text-right font-medium">Ventes</th>
                      <th className="py-2 text-right font-medium">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {clients.map((c) => (
                      <tr key={c.client?.id ?? "anonyme"}>
                        <td className="py-2 text-zinc-800">
                          {c.client ? `${c.client.prenom ?? ""} ${c.client.nom}`.trim() : "Client de passage"}
                        </td>
                        <td className="py-2 text-right text-zinc-600">{formatNumber(c.nombre)}</td>
                        <td className="py-2 text-right font-medium text-zinc-900">
                          {formatMoney(c.montant)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="Achats & fournisseurs">
              {achats ? (
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-zinc-500">Achats sur période</dt>
                    <dd className="text-lg font-semibold text-zinc-900">
                      {formatMoney(achats.totalAchats)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Payé</dt>
                    <dd className="text-lg font-semibold text-zinc-900">
                      {formatMoney(achats.totalPaye)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Dette fournisseurs</dt>
                    <dd className="text-lg font-semibold text-red-600">
                      {formatMoney(achats.dette ?? 0)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <Empty />
              )}
            </Panel>

            <Panel title="Stock">
              {stock ? (
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-zinc-500">Produits actifs</dt>
                    <dd className="text-lg font-semibold text-zinc-900">
                      {formatNumber(stock.totalProduits)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Valeur de stock</dt>
                    <dd className="text-lg font-semibold text-zinc-900">
                      {formatMoney(stock.valeur)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Bas stock</dt>
                    <dd className="text-lg font-semibold text-amber-600">
                      {formatNumber(stock.bas)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Ruptures</dt>
                    <dd className="text-lg font-semibold text-red-600">
                      {formatNumber(stock.rupture)}
                    </dd>
                  </div>
                </dl>
              ) : (
                <Empty />
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function formatDateShort(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function OverviewCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <p
        className={`mt-1 text-lg font-semibold ${
          accent ? "text-indigo-700" : "text-zinc-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-zinc-800">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <p className="py-8 text-center text-sm text-zinc-400">
      Aucune donnée sur la période.
    </p>
  );
}

function CategoriesBars({ data }: { data: RapportGroupe[] }) {
  const max = Math.max(0, ...data.map((d) => d.montant));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.nom} className="flex items-center gap-3 text-sm">
          <span className="w-28 shrink-0 truncate text-zinc-700">{d.nom}</span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{
                width: `${max ? Math.max(3, (d.montant / max) * 100) : 0}%`,
              }}
            />
          </div>
          <span className="w-28 shrink-0 text-right font-medium text-zinc-900">
            {formatMoney(d.montant)}
          </span>
        </div>
      ))}
      {data.length === 0 && <Empty />}
    </div>
  );
}