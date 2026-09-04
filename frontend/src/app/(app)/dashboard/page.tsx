"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney, formatNumber } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import type { DashboardSummary } from "@/lib/types";

function StatCard({
  label,
  value,
  accent,
  hint,
  loading,
}: {
  label: string;
  value: string;
  accent: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      {loading ? (
        <div className="mt-2 h-7 w-24 animate-pulse rounded bg-zinc-100" />
      ) : (
        <p className={`mt-2 text-xl font-semibold ${accent}`}>{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<DashboardSummary>("/dashboard/summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  const loading = !data && !error;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          Bonjour, {user?.nom.split(" ")[0]}
        </h1>
        <p className="text-sm text-zinc-500">
          Voici l&apos;activité de votre boutique aujourd&apos;hui.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Impossible de charger les indicateurs : {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="CA du jour" value={formatMoney(data?.ca.jour)} accent="text-indigo-600" loading={loading} />
        <StatCard label="CA semaine" value={formatMoney(data?.ca.semaine)} accent="text-indigo-700" loading={loading} />
        <StatCard label="CA mois" value={formatMoney(data?.ca.mois)} accent="text-indigo-800" loading={loading} />
        <StatCard label="Ventes du jour" value={formatNumber(data?.ventes.jour)} accent="text-zinc-900" loading={loading} />
        <StatCard label="Bénéfice jour" value={formatMoney(data?.benefice.jour)} accent="text-sky-600" loading={loading} />
        <StatCard label="Bénéfice mois" value={formatMoney(data?.benefice.mois)} accent="text-sky-700" loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Produits les plus vendus (mois)">
            {loading ? (
              <Skeleton rows={5} />
            ) : (
              <ul className="divide-y divide-zinc-100">
                {data?.topProduits.map((tp) => (
                  <li key={tp.produit.id} className="flex items-center gap-3 py-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700">
                      {formatNumber(tp.quantite)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{tp.produit.nom}</p>
                      <p className="text-xs text-zinc-400">{tp.produit.reference}</p>
                    </div>
                    <p className="text-sm font-medium">{formatMoney(tp.montant)}</p>
                  </li>
                ))}
                {!data?.topProduits?.length && <p className="py-3 text-sm text-zinc-400">Aucune vente ce mois-ci.</p>}
              </ul>
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card title="Finances du mois">
              <dl className="space-y-3 text-sm">
                <Row label="Achats" value={formatMoney(data?.achatsMois)} loading={loading} />
                <Row label="Dépenses" value={formatMoney(data?.depensesMois)} loading={loading} />
                <Row label="Dettes fournisseurs" value={formatMoney(data?.dettesFournisseurs)} loading={loading} className="text-red-600" />
                <Row label="Crédits clients" value={formatMoney(data?.creditsClients)} loading={loading} className="text-amber-600" />
              </dl>
            </Card>

            <Card
              title="Alertes stock"
              action={
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                  {formatNumber(data?.stocks.rupture)} rupture(s)
                </span>
              }
            >
              {loading ? (
                <Skeleton rows={4} />
              ) : data && data.stocks.bas.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  Aucun produit sous le seuil minimum.
                  <br />
                  <span className="text-xs text-zinc-400">
                    {formatNumber(data.stocks.totalProduits)} produits référencés.
                  </span>
                </p>
              ) : (
                <ul className="space-y-2">
                  {data?.stocks.bas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                      <span className="truncate font-medium">{p.nom}</span>
                      <span className="shrink-0 text-xs text-amber-700">
                        {formatNumber(p.stock)} / min {formatNumber(p.stockMin)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Répartition CA — semaine vs mois">
            {loading ? (
              <Skeleton rows={4} />
            ) : (
              <div className="space-y-3">
                <BarRow label="Jour" value={data?.ca.jour ?? 0} total={data?.ca.mois ?? 1} />
                <BarRow label="Semaine" value={data?.ca.semaine ?? 0} total={data?.ca.mois ?? 1} />
                <BarRow label="Mois" value={data?.ca.mois ?? 0} total={data?.ca.mois ?? 1} />
              </div>
            )}
          </Card>

          <Card title="Activité vente">
            <dl className="space-y-3 text-sm">
              <Row label="Tickets aujourd'hui" value={formatNumber(data?.ventes.jour)} loading={loading} />
              <Row label="Tickets cette semaine" value={formatNumber(data?.ventes.semaine)} loading={loading} />
              <Row label="Tickets ce mois" value={formatNumber(data?.ventes.mois)} loading={loading} />
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  loading,
  className,
}: {
  label: string;
  value?: string;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-500">{label}</dt>
      {loading ? (
        <dd className="h-4 w-16 animate-pulse rounded bg-zinc-100" />
      ) : (
        <dd className={`font-medium ${className ?? "text-zinc-800"}`}>{value}</dd>
      )}
    </div>
  );
}

function BarRow({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = Math.min(100, Math.round((value / total) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-zinc-500">{label}</span>
        <span className="font-medium">{formatMoney(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-8 animate-pulse rounded bg-zinc-100" />
      ))}
    </div>
  );
}