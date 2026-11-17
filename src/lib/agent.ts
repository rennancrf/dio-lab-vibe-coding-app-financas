import type {
  AppState,
  CategoryId,
  Goal,
  MessageTone,
  Transaction,
} from "../types";
import { getCategory } from "./categories";
import {
  formatDateLong,
  fromISODate,
} from "./dates";
import {
  categoryComparison,
  monthTransactions,
  monthTotal,
  totalByCategory,
  transactionsInRange,
} from "./finance";
import { brl, moneyText, percent, plural } from "./format";
import { goalProgress, suggestedDeadline } from "./goal";
import { uid } from "./id";
import { extractAmount, normalize, parseDeadline, parseEntry, parseGoalName } from "./parse";

export type AgentReply = {
  text: string;
  tone: MessageTone;
  meta?: {
    category?: CategoryId;
    amount?: number;
  };
};

export type AgentResult = {
  state: AppState;
  replies: AgentReply[];
};

function withMessages(state: AppState, replies: AgentReply[]): AgentResult {
  return { state, replies };
}

function agent(text: string, tone: MessageTone = "default", meta?: AgentReply["meta"]): AgentReply {
  return { text, tone, meta };
}

function categoryName(category: CategoryId): string {
  return getCategory(category).label.toLowerCase();
}

function formatDeadline(deadline: string, now: Date): string {
  const date = fromISODate(deadline);
  const label = formatDateLong(date);
  return date.getFullYear() === now.getFullYear() ? label : `${label} de ${date.getFullYear()}`;
}

function greetingReply(): AgentReply {
  return agent(
    'Oi! 🌤 Que bom te ver. O que você gastou hoje? Pode ser algo simples: "café 8 reais".',
  );
}

function helpReply(): AgentReply {
  return agent(
    [
      "Posso registrar gastos, acompanhar metas e sugerir economia. Tente:",
      '• "almoço 30" — registro um gasto',
      '• "guardei 100" — somo na sua meta',
      '• "meta de 500 reais até dezembro" — crio uma meta',
      '• "quanto gastei este mês" — faço um resumo',
    ].join("\n"),
  );
}

function budgetLine(state: AppState, now: Date): string | null {
  const budget = state.settings.monthlyBudget;
  if (!budget) return null;
  const spent = monthTotal(state.transactions, now);
  const remaining = budget - spent;
  if (remaining >= 0) {
    return `Ainda restam ${moneyText(remaining)} do seu orçamento.`;
  }
  return `Você passou ${moneyText(-remaining)} do orçamento, sem julgamento — dá para ajustar o ritmo.`;
}

function summaryReply(state: AppState, input: string, parsedCategory: CategoryId | null, now: Date): AgentReply {
  const normalized = normalize(input);
  const month = monthTransactions(state.transactions, now);

  if (/hoje/.test(normalized)) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const today = transactionsInRange(state.transactions, start, now);
    if (!today.length) {
      return agent("Hoje você ainda não registrou nenhum gasto. Se tiver algum, me conta por aqui. 🌿");
    }
    const total = today.reduce((sum, transaction) => sum + transaction.amount, 0);
    const list = today
      .slice(0, 4)
      .map((transaction) => `• ${transaction.description} · ${brl(transaction.amount)}`)
      .join("\n");
    return agent(`Hoje foram ${moneyText(total)} em ${today.length} ${plural(today.length, "registro", "registros")}:\n${list}`);
  }

  if (/ontem/.test(normalized)) {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);
    const yesterday = transactionsInRange(state.transactions, start, end);
    if (!yesterday.length) return agent("Ontem não teve nenhum gasto registrado por aqui. 🌿");
    const total = yesterday.reduce((sum, transaction) => sum + transaction.amount, 0);
    return agent(`Ontem foram ${moneyText(total)} em ${yesterday.length} ${plural(yesterday.length, "registro", "registros")}.`);
  }

  if (!month.length) {
    return agent(
      'Ainda não tenho gastos registrados neste mês. Me conta um: "café 8 reais". Assim já começo a montar seu resumo.',
    );
  }

  const total = month.reduce((sum, transaction) => sum + transaction.amount, 0);

  if (parsedCategory) {
    const categoryTotal = month
      .filter((transaction) => transaction.category === parsedCategory)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    if (categoryTotal === 0) {
      return agent(`Você ainda não registrou nada em ${categoryName(parsedCategory)} neste mês.`);
    }
    const comparison = categoryComparison(state.transactions, parsedCategory, now);
    let sentence = `Este mês você já gastou ${moneyText(categoryTotal)} em ${categoryName(parsedCategory)}.`;
    if (comparison.change !== null) {
      if (comparison.change <= -3) {
        sentence += ` Isso é ${percent(Math.abs(comparison.change))} menos que no mesmo período do mês passado.`;
      } else if (comparison.change >= 3) {
        sentence += ` Isso é ${percent(comparison.change)} mais que no mesmo período do mês passado.`;
      } else {
        sentence += " Praticamente o mesmo ritmo do mês passado.";
      }
    }
    return agent(sentence);
  }

  const totals = totalByCategory(month);
  const [topId, topValue] = (Object.entries(totals) as Array<[CategoryId, number]>).sort(
    (a, b) => b[1] - a[1],
  )[0];
  const share = total > 0 ? (topValue / total) * 100 : 0;

  const lines = [
    `Este mês você gastou ${moneyText(total)} em ${month.length} ${plural(month.length, "registro", "registros")}.`,
    `A maior parte foi ${categoryName(topId)}: ${moneyText(topValue)} (${percent(share)}).`,
  ];

  const budget = budgetLine(state, now);
  if (budget) lines.push(budget);

  return agent(lines.join("\n"));
}

function goalStatusReply(state: AppState, now: Date): AgentReply {
  if (!state.goal) {
    return agent(
      'Você ainda não tem uma meta. Quer definir uma pequena? Ex.: "meta de 500 reais até dezembro".',
    );
  }
  const progress = goalProgress(state.goal, now);
  if (progress.complete) {
    return agent(
      `🎉 Sua meta "${state.goal.name}" foi concluída: ${brl(progress.saved)} de ${brl(progress.target)}. Que tal definir a próxima?`,
      "success",
    );
  }
  const lines = [
    `Sua meta "${state.goal.name}" está em ${percent(progress.percent)}: ${moneyText(progress.saved)} de ${moneyText(progress.target)}.`,
    `Faltam ${moneyText(progress.remaining)} até ${formatDeadline(state.goal.deadline, now)}${progress.expired ? " (o prazo já passou, podemos ajustar)" : ` — ${progress.daysLeft} ${plural(progress.daysLeft, "dia", "dias")} pela frente`}.`,
  ];
  return agent(lines.join("\n"));
}

function undoReply(state: AppState, now: Date): AgentResult {
  if (!state.transactions.length) {
    return withMessages(state, [agent("Não tenho nenhum registro para desfazer. 🌿")]);
  }
  const sorted = [...state.transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const last = sorted[0];
  const transactions = state.transactions.filter((transaction) => transaction.id !== last.id);
  const category = getCategory(last.category);
  void now;

  return withMessages(
    { ...state, transactions, pending: null },
    [
      agent(
        `Pronto, removi o último registro: ${category.label} · ${last.description} · ${brl(last.amount)}. Sem problema.`,
        "default",
        { category: last.category },
      ),
    ],
  );
}

function saveGoalReply(state: AppState, input: string, amount: number | null, now: Date): AgentResult {
  if (!amount) {
    return withMessages(state, [
      agent(
        'Boa ideia 🌱 Quanto você quer guardar? Pode dizer assim: "meta de 500 reais até dezembro".',
      ),
    ]);
  }

  const deadline = parseDeadline(input, now) ?? suggestedDeadline(now);
  const name = parseGoalName(input) ?? `Guardar ${brl(amount)}`;
  const existing = state.goal;

  const goal: Goal = existing
    ? {
        ...existing,
        name,
        targetAmount: amount,
        deadline,
        contributions: existing.contributions,
      }
    : {
        id: uid(),
        name,
        targetAmount: amount,
        deadline,
        createdAt: now.toISOString(),
        contributions: [],
      };

  const progress = goalProgress(goal, now);
  const perWeek = Math.ceil(progress.remaining / Math.max(1, Math.ceil(progress.daysLeft / 7)));
  const lines = [
    `${existing ? "Atualizei sua meta" : "Meta criada"}: ${name} · ${moneyText(amount)} até ${formatDeadline(deadline, now)}.`,
  ];

  if (progress.remaining === 0) {
    lines.push("E ela já está completa — que orgulho! 🎉");
  } else {
    lines.push(`Faltam ${moneyText(progress.remaining)} — cerca de ${moneyText(perWeek)} por semana. Vou acompanhar com você.`);
  }

  if (existing) {
    lines.push("Suas economias já guardadas continuam contando.");
  }

  return withMessages({ ...state, goal, pending: null }, [agent(lines.join("\n"), "success")]);
}

function contributionReply(state: AppState, amount: number | null, now: Date): AgentResult {
  if (!state.goal) {
    return withMessages(state, [
      agent(
        'Você ainda não tem uma meta ativa. Quer criar uma pequena? É rapidinho: "meta de 500 reais até dezembro".',
      ),
    ]);
  }

  if (!amount) {
    return withMessages(state, [
      agent('Quanto você quer guardar agora? Pode responder só o valor, tipo "100".'),
    ]);
  }

  const goal: Goal = {
    ...state.goal,
    contributions: [
      ...state.goal.contributions,
      { id: uid(), amount, createdAt: now.toISOString() },
    ],
  };

  const progress = goalProgress(goal, now);
  if (progress.complete) {
    return withMessages(
      { ...state, goal, pending: null },
      [
        agent(
          `🎉 Você chegou na meta "${goal.name}"! ${moneyText(progress.saved)} de ${moneyText(progress.target)}. Que tal escolher o próximo sonho?`,
          "success",
        ),
      ],
    );
  }

  const lines = [
    `🌱 Guardado: ${moneyText(amount)} a mais na meta "${goal.name}".`,
    `Agora são ${moneyText(progress.saved)} de ${moneyText(progress.target)} — faltam ${moneyText(progress.remaining)}.`,
  ];

  if (!progress.expired && progress.daysLeft > 0) {
    lines.push(`Se mantiver ${moneyText(progress.perWeek)} por semana, você chega lá em ${progress.daysLeft} ${plural(progress.daysLeft, "dia", "dias")}.`);
  }

  return withMessages({ ...state, goal, pending: null }, [agent(lines.join("\n"), "success")]);
}

function setBudgetReply(state: AppState, input: string, amount: number | null, category: CategoryId | null, now: Date): AgentResult {
  if (!amount) {
    const current = state.settings.monthlyBudget;
    return withMessages(state, [
      agent(
        current
          ? `Seu orçamento mensal está em ${moneyText(current)} e você já gastou ${moneyText(monthTotal(state.transactions, now))}. Para ajustar, diga "orçamento 2000".`
          : 'Você ainda não definiu um orçamento. Quer começar com algo simples? Diga, por exemplo: "orçamento 2000".',
      ),
    ]);
  }

  if (category) {
    const categoryInfo = getCategory(category);
    const spent = monthTransactions(state.transactions, now)
      .filter((transaction) => transaction.category === category)
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const settings = {
      ...state.settings,
      categoryLimits: { ...state.settings.categoryLimits, [category]: amount },
    };
    const ratio = (spent / amount) * 100;
    return withMessages({ ...state, settings }, [
      agent(
        `Combinado: limite de ${moneyText(amount)} para ${categoryInfo.label.toLowerCase()}. Você já usou ${percent(ratio)} (${moneyText(spent)}). Vou te avisar com carinho quando chegar perto.`,
        "success",
      ),
    ]);
  }

  const spent = monthTotal(state.transactions, now);
  const remaining = amount - spent;
  const settings = { ...state.settings, monthlyBudget: amount };
  const text =
    remaining >= 0
      ? `Anotado: orçamento de ${moneyText(amount)} para este mês. Você já gastou ${moneyText(spent)} — restam ${moneyText(remaining)}.`
      : `Anotado: orçamento de ${moneyText(amount)}. Você já gastou ${moneyText(spent)}, então passou ${moneyText(-remaining)}. Sem julgamento: dá para ajustar o valor quando quiser.`;

  void input;
  return withMessages({ ...state, settings }, [agent(text, "success")]);
}

function registerExpense(
  state: AppState,
  entry: { amount: number; category: CategoryId; description: string },
  now: Date,
): AgentResult {
  const category = getCategory(entry.category);
  const description = entry.description.trim() || category.label;

  const transaction: Transaction = {
    id: uid(),
    amount: entry.amount,
    category: entry.category,
    description,
    createdAt: now.toISOString(),
    source: "chat",
  };

  const transactions = [...state.transactions, transaction];
  const month = monthTransactions(transactions, now);
  const categoryTransactions = month.filter((item) => item.category === entry.category);
  const categoryTotal = categoryTransactions.reduce((sum, item) => sum + item.amount, 0);

  const comparison = categoryComparison(transactions, entry.category, now);
  const middle =
    description.toLowerCase() === category.label.toLowerCase() ? "" : ` · ${description}`;
  const receipt = `✅ ${category.label}${middle} · ${moneyText(entry.amount)}, registrado.`;

  let insight = `Este mês você já gastou ${moneyText(categoryTotal)} em ${categoryName(entry.category)}`;
  if (comparison.change !== null) {
    if (comparison.change <= -3) {
      insight += ` — ${percent(Math.abs(comparison.change))} menos que no mesmo período do mês passado.`;
    } else if (comparison.change >= 3) {
      insight += ` — ${percent(comparison.change)} mais que no mesmo período do mês passado.`;
    } else {
      insight += ", no mesmo ritmo do mês passado.";
    }
  } else if (categoryTransactions.length === 1) {
    insight += ". É o primeiro registro dessa categoria neste mês.";
  } else {
    insight += ".";
  }

  const lines = [receipt, insight];

  const afterTotal = monthTotal(transactions, now);
  const budget = state.settings.monthlyBudget;
  if (budget) {
    const remaining = budget - afterTotal;
    lines.push(
      remaining >= 0
        ? `Ainda restam ${moneyText(remaining)} do seu orçamento.`
        : `Você passou ${moneyText(-remaining)} do orçamento — sem drama, dá para reequilibrar.`,
    );
  }

  const limit = state.settings.categoryLimits[entry.category];
  if (limit && limit > 0) {
    const before = categoryTotal - entry.amount;
    const afterRatio = categoryTotal / limit;
    if (before < limit * 0.8 && afterRatio >= 0.8) {
      lines.push(
        afterRatio >= 1
          ? `Você chegou ao limite de ${categoryName(entry.category)} que combinamos. Deixei uma ideia em Metas.`
          : `Você chegou a ${percent(afterRatio * 100)} do limite de ${categoryName(entry.category)}. Deixei uma ideia em Metas.`,
      );
    }
  }

  const nextState: AppState = {
    ...state,
    transactions,
    pending: null,
  };

  return withMessages(nextState, [
    agent(lines.join("\n"), "success", {
      category: entry.category,
      amount: entry.amount,
    }),
  ]);
}

function askCategory(state: AppState, amount: number, now: Date): AgentResult {
  const pending = {
    amount,
    category: null,
    description: "",
    createdAt: now.toISOString(),
  };
  return withMessages({ ...state, pending }, [
    agent(
      `Esses ${moneyText(amount)} foram gastos com quê? Pode ser uma palavra: "almoço", "táxi", "cinema"...`,
      "question",
      { amount },
    ),
  ]);
}

function askAmount(state: AppState, category: CategoryId, description: string, now: Date): AgentResult {
  const pending = {
    amount: null,
    category,
    description,
    createdAt: now.toISOString(),
  };
  return withMessages({ ...state, pending }, [
    agent(
      `Anotei: ${description || categoryName(category)}. Quanto custou? Pode responder só o valor, tipo "35".`,
      "question",
      { category },
    ),
  ]);
}

function handleExpense(state: AppState, input: string, now: Date): AgentResult {
  const parsed = parseEntry(input);
  let amount = parsed.amount;
  let category = parsed.category;
  let description = parsed.description;
  const pending = state.pending;

  const unsure =
    /^(nao sei|sei la|nao lembro|esqueci|nao tenho certeza|qualquer|qualquer coisa|n sei)\.?$/.test(
      parsed.normalized,
    );

  if (pending && unsure && !amount) {
    if (pending.category) {
      return withMessages(state, [
        agent(
          `Sem problema. Para ${categoryName(pending.category)}, quanto custou? Pode responder só o número.`,
          "question",
        ),
      ]);
    }
    if (pending.amount) {
      return registerExpense(state, {
        amount: pending.amount,
        category: "outros",
        description: "Outros",
      }, now);
    }
  }

  if (pending) {
    if (category && !amount && pending.amount) {
      amount = pending.amount;
    } else if (amount && !category && !parsed.leftover && pending.category) {
      category = pending.category;
      description = getCategory(category).label;
    }
  }

  if (amount && category) {
    return registerExpense(state, { amount, category, description }, now);
  }

  if (amount && !category) {
    if (description) {
      return registerExpense(
        state,
        { amount, category: "outros", description },
        now,
      );
    }
    return askCategory(state, amount, now);
  }

  if (!amount && category) {
    return askAmount(state, category, description, now);
  }

  return withMessages(state, [
    agent(
      'Ainda não entendi 🤔 Me conta assim: "almoço 30" ou "táxi 28". Se quiser ver o que sei fazer, escreva "ajuda".',
    ),
  ]);
}

/**
 * Cérebro do agente: interpreta a frase, atualiza os dados e devolve as respostas.
 * Função pura (recebe `now`), o que facilita testar as regras.
 */
export function handleUserMessage(state: AppState, input: string, now: Date = new Date()): AgentResult {
  const text = input.trim();
  if (!text) {
    return withMessages(state, [agent("Me conta um gasto, tipo \"almoço 30 reais\". 🌿")]);
  }

  const normalized = normalize(text);
  const parsed = parseEntry(text);
  const amount = parsed.amount;

  // Saudações e agradecimentos
  if (/^(oi|ola|opa|e ai|eai|bom dia|boa tarde|boa noite|hey|alo)\b/.test(normalized) && !amount) {
    return withMessages(state, [greetingReply()]);
  }
  if (/\b(obrigad|obrigada|valeu|brigad|agradec)/.test(normalized) && !amount) {
    return withMessages(state, [agent("De nada 💛 Estou por aqui.")]);
  }

  // Ajuda
  if (/\b(ajuda|help|como funciona|o que voce faz|o que voce sabe|me ensina|comandos)\b/.test(normalized)) {
    return withMessages(state, [helpReply()]);
  }

  // Desfazer
  if (/\b(desfaz|desfazer|desfaca|apaga|apagar|apague|remove|remover|exclui|excluir|errei)\b/.test(normalized)) {
    return undoReply(state, now);
  }

  // Consulta de meta
  if (/\b(meta|metas|objetivo)\b/.test(normalized) && !amount) {
    if (/\b(como|quanto|falta|status|andamento|progresso|minha|ver|resumo|ta)\b/.test(normalized)) {
      return withMessages(state, [goalStatusReply(state, now)]);
    }
  }

  // Contribuição para a meta
  if (/\b(guardei|poupei|economizei|separei|depositei|coloquei|botei)\b/.test(normalized)) {
    return contributionReply(state, amount, now);
  }

  // Criação de meta
  const goalIntent =
    /\b(meta|metas|objetivo)\b/.test(normalized) ||
    (/\b(quero|queria|vou|pretendo|preciso|planejo|comecar a)\b/.test(normalized) &&
      /\b(guardar|poupar|economizar|juntar)\b/.test(normalized)) ||
    /^(guardar|poupar|economizar|juntar)\b/.test(normalized);

  if (goalIntent) {
    return saveGoalReply(state, text, extractAmount(text, { ignoreYears: true }) ?? amount, now);
  }

  // Orçamento e limites
  if (/\b(orcamento|limite|teto)\b/.test(normalized)) {
    if (/\b(limite|teto)\b/.test(normalized) && parsed.category) {
      return setBudgetReply(state, text, amount, parsed.category, now);
    }
    return setBudgetReply(state, text, amount, null, now);
  }

  // Consultas de resumo
  if (
    /\b(quanto|resumo|total|como estou|como ta|onde foi|para onde|gastos do mes|meus gastos)\b/.test(normalized) &&
    !amount
  ) {
    return withMessages(state, [summaryReply(state, text, parsed.category, now)]);
  }

  // Registro de gasto (fluxo principal)
  return handleExpense(state, text, now);
}

export function emptyState(): AppState {
  return {
    version: 1,
    transactions: [],
    messages: [],
    goal: null,
    settings: { monthlyBudget: null, categoryLimits: {} },
    pending: null,
    dismissedSuggestions: [],
  };
}
