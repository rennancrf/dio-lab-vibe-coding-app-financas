import type { Goal } from "../types";
import { daysInMonth, daysUntil, isPastDeadline } from "./dates";
import { brl } from "./format";

export type GoalProgress = {
  saved: number;
  target: number;
  remaining: number;
  /** 0 a 100 */
  percent: number;
  daysLeft: number;
  expired: boolean;
  /** Quanto guardar por dia para chegar lá. */
  perDay: number;
  /** Quanto guardar por semana para chegar lá. */
  perWeek: number;
  complete: boolean;
};

export function goalSaved(goal: Goal | null): number {
  if (!goal) return 0;
  return goal.contributions.reduce((total, contribution) => total + contribution.amount, 0);
}

export function goalProgress(goal: Goal, now: Date): GoalProgress {
  const saved = goalSaved(goal);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const daysLeft = daysUntil(goal.deadline, now);
  const expired = isPastDeadline(goal.deadline, now);
  const percent = goal.targetAmount > 0 ? Math.min(100, (saved / goal.targetAmount) * 100) : 0;
  const complete = remaining === 0;
  const days = Math.max(1, daysLeft);
  const weeks = Math.max(1, Math.ceil(daysLeft / 7));

  return {
    saved,
    target: goal.targetAmount,
    remaining,
    percent,
    daysLeft,
    expired,
    perDay: Math.ceil(remaining / days),
    perWeek: Math.ceil(remaining / weeks),
    complete,
  };
}

/** Como as contribuições se comparam ao ritmo ideal (para textos curtos). */
export function goalPaceText(goal: Goal, now: Date): string {
  const progress = goalProgress(goal, now);
  if (progress.complete) return "Meta concluída — que orgulho!";
  if (progress.expired) return `O prazo terminou. Ainda faltam ${brl(progress.remaining)}.`;
  if (progress.daysLeft <= 7) {
    return `Faltam ${brl(progress.remaining)} em ${progress.daysLeft} dia${progress.daysLeft === 1 ? "" : "s"}.`;
  }
  return `Faltam ${brl(progress.remaining)} — cerca de ${brl(progress.perWeek)} por semana.`;
}

export function suggestedDeadline(now: Date, monthsAhead = 3): string {
  const target = new Date(now.getFullYear(), now.getMonth() + monthsAhead + 1, 0);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function goalDayOptions(now: Date): number {
  return daysInMonth(now);
}
