import { describe, expect, it } from "vitest";
import type { AppState, Transaction } from "../types";
import { generateSuggestions } from "./suggestions";
import { createInitialState } from "./storage";
import { handleUserMessage } from "./agent";

const NOW = new Date(2026, 10, 20, 12);
const KEY = "2026-11";

function transaction(
  amount: number,
  category: Transaction["category"],
  description: string,
  date = new Date(2026, 10, 5, 12),
): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    amount,
    category,
    description,
    createdAt: date.toISOString(),
    source: "chat",
  };
}

function stateWith(transactions: Transaction[], settings: AppState["settings"] = { monthlyBudget: null, categoryLimits: {} }): AppState {
  return { ...createInitialState(NOW), transactions, settings };
}

describe("generateSuggestions", () => {
  it("não sugere nada sem dados", () => {
    const state = stateWith([]);
    expect(
      generateSuggestions({ transactions: state.transactions, settings: state.settings, goal: null, now: NOW }),
    ).toEqual([]);
  });

  it("dispara sugestão ao passar de 80% do limite da categoria", () => {
    const state = stateWith(
      [transaction(8500, "alimentacao", "Almoço")],
      { monthlyBudget: 300000, categoryLimits: { alimentacao: 10000 } },
    );

    const suggestions = generateSuggestions({
      transactions: state.transactions,
      settings: state.settings,
      goal: null,
      now: NOW,
    });

    expect(suggestions.some((suggestion) => suggestion.id === `limit:alimentacao:${KEY}`)).toBe(true);
    expect(suggestions[0].text).toContain("85% do limite");
    expect(suggestions[0].icon).toBe("limit");
  });

  it("dispara sugestão quando a categoria cresce mais de 30%", () => {
    const state = stateWith([
      transaction(12000, "lazer", "Cinema", new Date(2026, 9, 8, 12)),
      transaction(18000, "lazer", "Cinema", new Date(2026, 10, 8, 12)),
    ]);

    const suggestions = generateSuggestions({
      transactions: state.transactions,
      settings: state.settings,
      goal: null,
      now: NOW,
    });

    const growth = suggestions.find((suggestion) => suggestion.id === `growth:lazer:${KEY}`);
    expect(growth).toBeDefined();
    expect(growth?.text).toContain("50% acima");
  });

  it("não sugere crescimento abaixo de 30%", () => {
    const state = stateWith([
      transaction(10000, "lazer", "Cinema", new Date(2026, 9, 8, 12)),
      transaction(12000, "lazer", "Cinema", new Date(2026, 10, 8, 12)),
    ]);

    const suggestions = generateSuggestions({
      transactions: state.transactions,
      settings: state.settings,
      goal: null,
      now: NOW,
    });

    expect(suggestions.some((suggestion) => suggestion.icon === "growth")).toBe(false);
  });

  it("identifica padrão de delivery e estima economia", () => {
    const state = stateWith([
      transaction(4000, "alimentacao", "Delivery", new Date(2026, 10, 3, 12)),
      transaction(4000, "alimentacao", "Delivery", new Date(2026, 10, 8, 12)),
      transaction(4000, "alimentacao", "Delivery", new Date(2026, 10, 12, 12)),
      transaction(4000, "alimentacao", "Delivery", new Date(2026, 10, 16, 12)),
    ]);

    const suggestions = generateSuggestions({
      transactions: state.transactions,
      settings: state.settings,
      goal: null,
      now: NOW,
    });

    const delivery = suggestions.find((suggestion) => suggestion.icon === "delivery");
    expect(delivery).toBeDefined();
    expect(delivery?.text).toContain("em delivery este mês");
    expect(delivery?.text).toContain("até o fim do mês");
  });

  it("alerta sobre o ritmo do orçamento", () => {
    const state = stateWith(
      [transaction(20000, "alimentacao", "Mercado")],
      { monthlyBudget: 25000, categoryLimits: {} },
    );

    const suggestions = generateSuggestions({
      transactions: state.transactions,
      settings: state.settings,
      goal: null,
      now: NOW,
    });

    expect(suggestions.some((suggestion) => suggestion.icon === "pace")).toBe(true);
  });

  it("remove sugestões dispensadas", () => {
    const state = stateWith(
      [transaction(8500, "alimentacao", "Almoço")],
      { monthlyBudget: null, categoryLimits: { alimentacao: 10000 } },
    );
    const id = `limit:alimentacao:${KEY}`;

    const suggestions = generateSuggestions({
      transactions: state.transactions,
      settings: state.settings,
      goal: null,
      now: NOW,
      dismissed: [id],
    });

    expect(suggestions.some((suggestion) => suggestion.id === id)).toBe(false);
  });

  it("funciona com dados criados pelo agente", () => {
    let state = createInitialState(NOW);
    state = handleUserMessage(state, "orçamento 1000", NOW).state;
    state = handleUserMessage(state, "almoço 300", NOW).state;
    state = handleUserMessage(state, "táxi 350", NOW).state;
    state = handleUserMessage(state, "cinema 100", NOW).state;

    const suggestions = generateSuggestions({
      transactions: state.transactions,
      settings: state.settings,
      goal: state.goal,
      now: NOW,
    });

    expect(suggestions.length).toBeGreaterThan(0);
  });
});
