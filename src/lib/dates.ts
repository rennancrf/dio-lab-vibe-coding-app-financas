export const DAY_MS = 24 * 60 * 60 * 1000;

export const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const MONTH_SHORT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function lastDayOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function addMonths(date: Date, amount: number): Date {
  const copy = new Date(date);
  const day = copy.getDate();
  copy.setDate(1);
  copy.setMonth(copy.getMonth() + amount);
  copy.setDate(Math.min(day, lastDayOfMonth(copy)));
  return copy;
}

export function startOfPreviousMonth(date: Date): Date {
  return startOfMonth(addMonths(date, -1));
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Fim do mesmo período do mês anterior (ex.: dia 13 → dia 13 do mês passado). */
export function previousMonthSamePeriodEnd(now: Date): Date {
  const previousStart = startOfPreviousMonth(now);
  const day = Math.min(now.getDate(), lastDayOfMonth(previousStart));
  return endOfDay(new Date(previousStart.getFullYear(), previousStart.getMonth(), day));
}

export function formatMonthYear(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} de ${date.getFullYear()}`;
}

export function formatMonthShort(date: Date): string {
  return `${MONTH_SHORT[date.getMonth()]}/${date.getFullYear()}`;
}

/** "2026-11-13" (data local, sem deslocamento de fuso). */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dayKey(date: Date): string {
  return toISODate(date);
}

/** Interpreta "2026-11-13" como data local. */
export function fromISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatDateShort(date: Date): string {
  return `${date.getDate()} de ${MONTH_SHORT[date.getMonth()]}.`;
}

export function formatDateLong(date: Date): string {
  return `${date.getDate()} de ${MONTH_NAMES[date.getMonth()]}`;
}

export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** Dias inteiros até o fim da data limite (0 quando o prazo já passou). */
export function daysUntil(deadline: string, now: Date): number {
  const end = endOfDay(fromISODate(deadline));
  const diff = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / DAY_MS));
}

export function isPastDeadline(deadline: string, now: Date): boolean {
  return endOfDay(fromISODate(deadline)).getTime() < startOfDay(now).getTime();
}

/** Dias já passados no mês, incluindo hoje (mínimo 1). */
export function elapsedDaysInMonth(now: Date): number {
  return Math.max(1, now.getDate());
}

export function daysInMonth(now: Date): number {
  return lastDayOfMonth(now);
}

export function weeksElapsed(now: Date): number {
  return Math.max(0.5, now.getDate() / 7);
}

export function weeksRemaining(now: Date): number {
  return Math.max(0, (lastDayOfMonth(now) - now.getDate() + 1) / 7);
}
