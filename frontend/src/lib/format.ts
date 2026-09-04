export function formatMoney(n: number | null | undefined): string {
  return `${new Intl.NumberFormat("fr-FR").format(n ?? 0)} FCFA`;
}

export function formatNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("fr-FR").format(n ?? 0);
}

export function formatDate(
  d: string | Date | null | undefined,
  withTime = false,
): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatPercent(n: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(n)}%`;
}