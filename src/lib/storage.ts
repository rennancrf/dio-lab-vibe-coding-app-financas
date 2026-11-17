import type { AppState, ChatMessage, Goal, Settings, Transaction } from "../types";
import { emptyState } from "./agent";
import { isCategoryId } from "./categories";
import { isISODate } from "./parse";
import { uid } from "./id";

export const STORAGE_KEY = "caderninho:v1";

export const WELCOME_TEXT =
  "Olá 👋 Sou seu assistente financeiro. Tente me contar um gasto de hoje, como \"almoço 30 reais\", e eu registro para você.";

export function createWelcomeMessage(now: Date): ChatMessage {
  return {
    id: uid(),
    role: "agent",
    text: WELCOME_TEXT,
    createdAt: now.toISOString(),
    tone: "default",
  };
}

export function createInitialState(now: Date = new Date()): AppState {
  return {
    ...emptyState(),
    messages: [createWelcomeMessage(now)],
  };
}

function validTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Partial<Transaction>;
  return (
    typeof transaction.id === "string" &&
    typeof transaction.amount === "number" &&
    Number.isFinite(transaction.amount) &&
    transaction.amount > 0 &&
    isCategoryId(transaction.category) &&
    typeof transaction.description === "string" &&
    typeof transaction.createdAt === "string" &&
    !Number.isNaN(new Date(transaction.createdAt).getTime())
  );
}

function validMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "agent") &&
    typeof message.text === "string" &&
    typeof message.createdAt === "string" &&
    !Number.isNaN(new Date(message.createdAt).getTime())
  );
}

function validGoal(value: unknown): value is Goal {
  if (!value || typeof value !== "object") return false;
  const goal = value as Partial<Goal>;
  return (
    typeof goal.id === "string" &&
    typeof goal.name === "string" &&
    typeof goal.targetAmount === "number" &&
    goal.targetAmount > 0 &&
    typeof goal.deadline === "string" &&
    isISODate(goal.deadline) &&
    Array.isArray(goal.contributions) &&
    goal.contributions.every(
      (contribution) =>
        contribution &&
        typeof contribution.id === "string" &&
        typeof contribution.amount === "number" &&
        contribution.amount > 0 &&
        typeof contribution.createdAt === "string",
    )
  );
}

function sanitizeSettings(value: unknown): Settings {
  const fallback: Settings = { monthlyBudget: null, categoryLimits: {} };
  if (!value || typeof value !== "object") return fallback;
  const settings = value as Partial<Settings>;
  const monthlyBudget =
    typeof settings.monthlyBudget === "number" && settings.monthlyBudget > 0
      ? Math.round(settings.monthlyBudget)
      : null;
  const categoryLimits: Settings["categoryLimits"] = {};
  if (settings.categoryLimits && typeof settings.categoryLimits === "object") {
    for (const [key, limit] of Object.entries(settings.categoryLimits)) {
      if (isCategoryId(key) && typeof limit === "number" && limit > 0) {
        categoryLimits[key] = Math.round(limit);
      }
    }
  }
  return { monthlyBudget, categoryLimits };
}

/** Lê o estado do navegador com validação defensiva (dados podem vir de versões antigas). */
export function loadState(now: Date = new Date()): AppState {
  if (typeof window === "undefined") return createInitialState(now);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState(now);

    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || typeof parsed !== "object") return createInitialState(now);

    const transactions = Array.isArray(parsed.transactions)
      ? parsed.transactions.filter(validTransaction)
      : [];
    const messages = Array.isArray(parsed.messages)
      ? parsed.messages.filter(validMessage)
      : [];

    const state: AppState = {
      version: 1,
      transactions,
      messages: messages.length ? messages : [createWelcomeMessage(now)],
      goal: validGoal(parsed.goal) ? parsed.goal : null,
      settings: sanitizeSettings(parsed.settings),
      pending:
        parsed.pending && typeof parsed.pending === "object"
          ? {
              amount:
                typeof parsed.pending.amount === "number" && parsed.pending.amount > 0
                  ? parsed.pending.amount
                  : null,
              category: isCategoryId(parsed.pending.category) ? parsed.pending.category : null,
              description:
                typeof parsed.pending.description === "string" ? parsed.pending.description : "",
              createdAt:
                typeof parsed.pending.createdAt === "string"
                  ? parsed.pending.createdAt
                  : now.toISOString(),
            }
          : null,
      dismissedSuggestions: Array.isArray(parsed.dismissedSuggestions)
        ? parsed.dismissedSuggestions.filter((id): id is string => typeof id === "string")
        : [],
    };

    return state;
  } catch {
    return createInitialState(now);
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Sem espaço ou modo privado: o app continua funcionando em memória.
  }
}

export function clearState(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignora
  }
}
