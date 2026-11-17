import type { AppState, CategoryId, Goal, Settings, Suggestion, Transaction } from "../types";
import { getCategory } from "./categories";
import {
  daysInMonth,
  monthKey,
  weeksElapsed,
  weeksRemaining,
} from "./dates";
import { categoryComparison, monthTransactions, totalByCategory } from "./finance";
import { brl, percent } from "./format";

type SuggestionInput = {
  transactions: Transaction[];
  settings: Settings;
  goal: Goal | null;
  now: Date;
  dismissed?: string[];
};

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function generateSuggestions({
  transactions,
  settings,
  now,
  dismissed = [],
}: SuggestionInput): Suggestion[] {
  const month = monthTransactions(transactions, now);
  if (!month.length) return [];

  const totals = totalByCategory(month);
  const monthTotal = Object.values(totals).reduce((total, value) => total + value, 0);
  const key = monthKey(now);
  const suggestions: Suggestion[] = [];

  // 1. Limite por categoria (80% ou mais do combinado)
  for (const [categoryId, limit] of Object.entries(settings.categoryLimits) as Array<
    [CategoryId, number | undefined]
  >) {
    if (!limit || limit <= 0) continue;
    const spent = totals[categoryId];
    const ratio = spent / limit;
    if (ratio < 0.8) continue;

    const category = getCategory(categoryId);
    if (ratio >= 1) {
      suggestions.push({
        id: `limit:${categoryId}:${key}`,
        tone: "neutral",
        icon: "limit",
        text: `Você chegou ao limite de ${brl(limit)} que combinamos para ${category.label.toLowerCase()} (já foram ${brl(spent)}). Sem drama — se fizer sentido, é só ajustar esse limite.`,
      });
    } else {
      suggestions.push({
        id: `limit:${categoryId}:${key}`,
        tone: "amber",
        icon: "limit",
        text: `${category.label} está em ${percent(ratio * 100)} do limite de ${brl(limit)} (${brl(spent)}). Ainda dá tempo de segurar o ritmo nas próximas compras.`,
      });
    }
  }

  // 2. Delivery: padrão concreto com economia estimada
  const deliveryItems = month.filter((transaction) =>
    /delivery|ifood|rappi/i.test(transaction.description),
  );
  const deliveryTotal = deliveryItems.reduce((total, item) => total + item.amount, 0);
  if (deliveryItems.length >= 3 && deliveryTotal > 0) {
    const average = deliveryTotal / deliveryItems.length;
    const perWeek = deliveryItems.length / weeksElapsed(now);
    const cutPerWeek = Math.min(2, Math.max(1, perWeek / 2));
    const savings = roundToNearest(cutPerWeek * average * weeksRemaining(now), 500);

    if (savings >= 1000) {
      const times = cutPerWeek === 1 ? "uma vez" : "duas vezes";
      suggestions.push({
        id: `delivery:${key}`,
        tone: "amber",
        icon: "delivery",
        text: `Você gastou ${brl(deliveryTotal)} em delivery este mês, em ${deliveryItems.length} pedidos. Pedindo ${times} menos por semana, dá para guardar cerca de ${brl(savings)} até o fim do mês.`,
      });
    }
  }

  // 3. Crescimento acima de 30% contra o mesmo período do mês passado
  for (const categoryId of Object.keys(totals) as CategoryId[]) {
    const spent = totals[categoryId];
    if (spent < 2000) continue;

    const comparison = categoryComparison(transactions, categoryId, now);
    if (comparison.change === null || comparison.change <= 30) continue;

    const category = getCategory(categoryId);
    const elapsed = Math.max(1, now.getDate());
    const projected = Math.round((spent / elapsed) * daysInMonth(now));
    suggestions.push({
      id: `growth:${categoryId}:${key}`,
      tone: "neutral",
      icon: "growth",
      text: `Seus gastos com ${category.label.toLowerCase()} estão ${percent(comparison.change)} acima do mesmo período do mês passado (${brl(spent)} contra ${brl(comparison.previous)}). Nesse ritmo, o mês fecha em cerca de ${brl(projected)}.`,
    });
  }

  // 4. Ritmo do orçamento
  if (settings.monthlyBudget && settings.monthlyBudget > 0) {
    const budget = settings.monthlyBudget;
    const elapsed = Math.max(1, now.getDate());
    const expected = (budget / daysInMonth(now)) * elapsed;
    const remaining = budget - monthTotal;

    if (elapsed >= 4 && monthTotal > budget) {
      suggestions.push({
        id: `pace:${key}`,
        tone: "neutral",
        icon: "pace",
        text: `O orçamento do mês já foi usado (${brl(monthTotal)} de ${brl(budget)}). Sem julgamento: dá para ajustar o valor ou recomeçar com calma no próximo mês.`,
      });
    } else if (elapsed >= 4 && monthTotal > expected * 1.15) {
      const daysLeft = Math.max(1, daysInMonth(now) - elapsed + 1);
      const perDay = Math.max(0, Math.floor(remaining / daysLeft));
      suggestions.push({
        id: `pace:${key}`,
        tone: "amber",
        icon: "pace",
        text: `No dia ${elapsed}, você já usou ${percent((monthTotal / budget) * 100)} do orçamento. Para fechar o mês tranquilo, tente gastar até ${brl(perDay)} por dia.`,
      });
    }
  }

  // 5. Fallback: maior categoria, com uma ideia concreta
  if (!suggestions.length && month.length >= 2) {
    const [topId, topValue] = (Object.entries(totals) as Array<[CategoryId, number]>).sort(
      (a, b) => b[1] - a[1],
    )[0];
    if (topValue > 0 && monthTotal > 0) {
      const category = getCategory(topId);
      const share = (topValue / monthTotal) * 100;
      const cut = roundToNearest(topValue * 0.1, 100);
      suggestions.push({
        id: `insight:${topId}:${key}`,
        tone: "green",
        icon: "insight",
        text: `${category.label} concentra ${percent(share)} dos gastos do mês (${brl(topValue)}). Um corte pequeno, de ${brl(Math.max(100, cut))}, já alivia o fim do mês.`,
      });
    }
  }

  return suggestions.filter((suggestion) => !dismissed.includes(suggestion.id)).slice(0, 4);
}

export function suggestionsForState(state: AppState, now: Date): Suggestion[] {
  return generateSuggestions({
    transactions: state.transactions,
    settings: state.settings,
    goal: state.goal,
    now,
    dismissed: state.dismissedSuggestions,
  });
}

export type { Goal };
