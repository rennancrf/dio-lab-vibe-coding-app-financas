import type { CategoryId, Transaction } from "../types";
import { CATEGORY_IDS } from "./categories";
import {
  dayKey,
  daysInMonth,
  endOfDay,
  endOfMonth,
  isSameMonth,
  monthKey,
  previousMonthSamePeriodEnd,
  startOfMonth,
  startOfPreviousMonth,
} from "./dates";

export function isWithin(date: Date, start: Date, end: Date): boolean {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function transactionsInRange(transactions: Transaction[], start: Date, end: Date): Transaction[] {
  return transactions.filter((transaction) => {
    const date = new Date(transaction.createdAt);
    return !Number.isNaN(date.getTime()) && isWithin(date, start, end);
  });
}

export function sumAmount(transactions: Transaction[]): number {
  return transactions.reduce((total, transaction) => total + transaction.amount, 0);
}

export function totalByCategory(transactions: Transaction[]): Record<CategoryId, number> {
  const totals = Object.fromEntries(CATEGORY_IDS.map((id) => [id, 0])) as Record<CategoryId, number>;
  for (const transaction of transactions) {
    totals[transaction.category] += transaction.amount;
  }
  return totals;
}

export function monthTransactions(transactions: Transaction[], month: Date): Transaction[] {
  return transactions.filter((transaction) => isSameMonth(new Date(transaction.createdAt), month));
}

export function monthTotal(transactions: Transaction[], month: Date): number {
  return sumAmount(monthTransactions(transactions, month));
}

export function entitiesForMonth(transactions: Transaction[], month: Date): Transaction[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return transactions.filter((transaction) => isWithin(new Date(transaction.createdAt), start, end));
}

export function latestTransactions(transactions: Transaction[], limit = 5): Transaction[] {
  return [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export type Comparison = {
  current: number;
  previous: number;
  /** Variação percentual arredondada; null quando não há base de comparação. */
  change: number | null;
};

/** Total da categoria no mês até hoje contra o mesmo período do mês passado. */
export function categoryComparison(
  transactions: Transaction[],
  category: CategoryId,
  now: Date,
): Comparison {
  const currentStart = startOfMonth(now);
  const currentEnd = endOfDay(now);
  const previousStart = startOfPreviousMonth(now);
  const previousEnd = previousMonthSamePeriodEnd(now);

  const current = sumAmount(
    transactionsInRange(transactions, currentStart, currentEnd).filter(
      (transaction) => transaction.category === category,
    ),
  );
  const previous = sumAmount(
    transactionsInRange(transactions, previousStart, previousEnd).filter(
      (transaction) => transaction.category === category,
    ),
  );

  const change =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

  return { current, previous, change };
}

/** Variação do total do mês contra o mesmo período do mês passado. */
export function monthComparison(transactions: Transaction[], now: Date): Comparison {
  const current = sumAmount(transactionsInRange(transactions, startOfMonth(now), endOfDay(now)));
  const previous = sumAmount(
    transactionsInRange(transactions, startOfPreviousMonth(now), previousMonthSamePeriodEnd(now)),
  );
  return {
    current,
    previous,
    change: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
  };
}

/** Projeção linear do gasto do mês com base no ritmo atual. */
export function projectMonthTotal(transactions: Transaction[], now: Date): number {
  const current = monthTotal(transactions, now);
  const elapsed = Math.max(1, now.getDate());
  return Math.round((current / elapsed) * daysInMonth(now));
}

export function spentByDay(transactions: Transaction[], month: Date): Map<string, number> {
  const totals = new Map<string, number>();
  for (const transaction of monthTransactions(transactions, month)) {
    const key = dayKey(new Date(transaction.createdAt));
    totals.set(key, (totals.get(key) ?? 0) + transaction.amount);
  }
  return totals;
}

export function currentMonthKey(now: Date): string {
  return monthKey(now);
}
