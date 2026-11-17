import { describe, expect, it } from "vitest";
import type { AppState } from "../types";
import { handleUserMessage } from "./agent";
import { createInitialState } from "./storage";

const NOW = new Date(2026, 10, 13, 15, 30);

function newState(): AppState {
  return createInitialState(NOW);
}

function send(state: AppState, text: string, now: Date = NOW) {
  return handleUserMessage(state, text, now);
}

function lastAgentText(result: ReturnType<typeof send>): string {
  return result.replies.at(-1)?.text ?? "";
}

describe("registro de gastos pelo chat", () => {
  it("interpreta 'almoço 35' e confirma em uma mensagem", () => {
    const result = send(newState(), "almoço 35");

    expect(result.state.transactions).toHaveLength(1);
    const [transaction] = result.state.transactions;
    expect(transaction.amount).toBe(3500);
    expect(transaction.category).toBe("alimentacao");
    expect(transaction.description).toBe("Almoço");

    const reply = lastAgentText(result);
    expect(reply).toContain("✅ Alimentação · Almoço · 35,00 reais, registrado.");
    expect(result.replies.at(-1)?.tone).toBe("success");
  });

  it("classifica três gastos consecutivos de categorias diferentes", () => {
    let state = newState();
    state = send(state, "almoço 35").state;
    state = send(state, "táxi 28").state;
    state = send(state, "cinema 40").state;

    expect(state.transactions.map((item) => item.category)).toEqual([
      "alimentacao",
      "transporte",
      "lazer",
    ]);
    expect(state.transactions.reduce((sum, item) => sum + item.amount, 0)).toBe(10300);
  });

  it("pergunta com o quê antes de registrar quando só há valor", () => {
    const result = send(newState(), "gastei 50");

    expect(result.state.transactions).toHaveLength(0);
    expect(result.state.pending?.amount).toBe(5000);
    expect(lastAgentText(result)).toContain("Esses 50,00 reais foram gastos com quê?");
  });

  it("conclui o registro pendente na mensagem seguinte", () => {
    let state = newState();
    state = send(state, "gastei 50").state;
    const result = send(state, "almoço");

    expect(result.state.transactions).toHaveLength(1);
    expect(result.state.transactions[0].amount).toBe(5000);
    expect(result.state.transactions[0].category).toBe("alimentacao");
    expect(result.state.pending).toBeNull();
  });

  it("completa a categoria pendente quando o usuário responde o valor", () => {
    let state = newState();
    state = send(state, "almoço").state;
    expect(state.pending?.category).toBe("alimentacao");

    state = send(state, "32").state;
    expect(state.transactions[0].amount).toBe(3200);
    expect(state.transactions[0].category).toBe("alimentacao");
  });

  it("usa 'outros' quando há descrição sem palavra-chave conhecida", () => {
    const result = send(newState(), "gastei 40 com aquele negócio");
    expect(result.state.transactions[0].category).toBe("outros");
    expect(result.state.transactions[0].description.toLowerCase()).toContain("negócio");
  });

  it("compara com o mesmo período do mês passado", () => {
    let state = newState();
    state = {
      ...state,
      transactions: [
        {
          id: "old",
          amount: 10000,
          category: "alimentacao",
          description: "Almoço",
          createdAt: new Date(2026, 9, 5, 12).toISOString(),
          source: "chat",
        },
      ],
    };

    const result = send(state, "almoço 35");
    expect(lastAgentText(result)).toContain("65% menos que no mesmo período do mês passado");
  });

  it("avisa quando chega perto do limite de uma categoria", () => {
    let state = newState();
    state = {
      ...state,
      settings: { monthlyBudget: 100000, categoryLimits: { alimentacao: 10000 } },
    };

    const result = send(state, "almoço 85");
    expect(lastAgentText(result)).toContain("85% do limite de alimentação");
  });
});

describe("metas", () => {
  it("cria meta com valor e prazo e calcula o restante após guardar", () => {
    let state = newState();
    const created = send(state, "quero guardar 500 reais até dezembro");
    state = created.state;

    expect(state.goal?.targetAmount).toBe(50000);
    expect(state.goal?.deadline).toBe("2026-12-31");
    expect(lastAgentText(created)).toContain("Meta criada");

    const contributed = send(state, "guardei 100");
    state = contributed.state;

    expect(state.goal?.contributions).toHaveLength(1);
    expect(lastAgentText(contributed)).toContain("faltam 400,00 reais");
  });

  it("não cria meta quando falta o valor", () => {
    const result = send(newState(), "quero criar uma meta");
    expect(result.state.goal).toBeNull();
    expect(lastAgentText(result)).toContain("Quanto você quer guardar?");
  });

  it("não registra contribuição sem meta", () => {
    const result = send(newState(), "guardei 50");
    expect(result.state.goal).toBeNull();
    expect(lastAgentText(result)).toContain("ainda não tem uma meta");
  });

  it("preserva economias ao atualizar a meta", () => {
    let state = send(newState(), "meta de 500 reais até dezembro").state;
    state = send(state, "guardei 100").state;
    state = send(state, "meta de 800 reais até janeiro").state;

    expect(state.goal?.targetAmount).toBe(80000);
    expect(state.goal?.contributions).toHaveLength(1);
  });
});

describe("orçamento", () => {
  it("define o orçamento mensal", () => {
    const result = send(newState(), "meu orçamento é 2 mil");
    expect(result.state.settings.monthlyBudget).toBe(200000);
    expect(lastAgentText(result)).toContain("orçamento de 2.000,00 reais");
  });

  it("define limite por categoria", () => {
    const result = send(newState(), "limite de alimentação 600");
    expect(result.state.settings.categoryLimits.alimentacao).toBe(60000);
    expect(lastAgentText(result)).toContain("limite de 600,00 reais para alimentação");
  });
});

describe("consultas e utilidades", () => {
  it("responde um resumo do mês", () => {
    let state = newState();
    state = send(state, "almoço 35").state;
    state = send(state, "táxi 28").state;

    const result = send(state, "quanto gastei este mês?");
    expect(lastAgentText(result)).toContain("63,00 reais");
    expect(lastAgentText(result)).toContain("em 2 registros");
  });

  it("desfaz o último registro", () => {
    let state = newState();
    state = send(state, "almoço 35").state;
    const result = send(state, "desfazer");

    expect(result.state.transactions).toHaveLength(0);
    expect(lastAgentText(result)).toContain("removi o último registro");
  });

  it("cumprimenta sem registrar gasto", () => {
    const result = send(newState(), "oi");
    expect(result.state.transactions).toHaveLength(0);
    expect(lastAgentText(result)).toContain("O que você gastou hoje?");
  });

  it("responde ajuda com exemplos", () => {
    const result = send(newState(), "ajuda");
    expect(lastAgentText(result)).toContain("almoço 30");
    expect(result.state.transactions).toHaveLength(0);
  });

  it("mostra o andamento da meta", () => {
    let state = send(newState(), "meta de 500 reais até dezembro").state;
    state = send(state, "guardei 250").state;
    const result = send(state, "como está minha meta?");
    expect(lastAgentText(result)).toContain("50%");
    expect(lastAgentText(result)).toContain("250,00 reais");
  });
});
