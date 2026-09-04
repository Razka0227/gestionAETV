export function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0');
}

/**
 * Génère un numéro type "FV-20260828-0005".
 * L'appelant fournit le séquencement (compteur du jour).
 */
export function generateNumero(
  prefix: string,
  seq: number,
  date: Date = new Date(),
): string {
  const ymd = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate(),
  )}`;
  return `${prefix}-${ymd}-${pad(seq, 4)}`;
}