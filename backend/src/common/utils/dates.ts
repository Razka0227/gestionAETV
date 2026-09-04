export function startOfDayUTC(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addDaysUTC(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

/** Lundi comme premier jour de la semaine. */
export function startOfWeekUTC(date: Date = new Date()): Date {
  const start = startOfDayUTC(date);
  const day = start.getUTCDay(); // 0 = dimanche
  const diff = day === 0 ? 6 : day - 1; // lundi = 0
  return addDaysUTC(start, -diff);
}

export function startOfMonthUTC(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function endOfTodayUTC(): Date {
  return addDaysUTC(startOfDayUTC(), 1);
}