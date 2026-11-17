export type CategoryId =
  | "alimentacao"
  | "transporte"
  | "compras"
  | "lazer"
  | "outros";

export type Category = {
  id: CategoryId;
  label: string;
  /** Cor principal da categoria (tons suaves, sem vermelho). */
  color: string;
  /** Fundo suave para ícones e destaques. */
  soft: string;
  /** Exemplos usados em textos de ajuda. */
  examples: string[];
};

export type Transaction = {
  id: string;
  /** Valor em centavos. */
  amount: number;
  category: CategoryId;
  description: string;
  createdAt: string;
  source: "chat" | "manual";
};

export type MessageTone = "default" | "success" | "question" | "nudge";

export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  createdAt: string;
  tone?: MessageTone;
  meta?: {
    category?: CategoryId;
    amount?: number;
  };
};

export type GoalContribution = {
  id: string;
  amount: number;
  createdAt: string;
};

export type Goal = {
  id: string;
  name: string;
  /** Valor da meta em centavos. */
  targetAmount: number;
  /** Data limite no formato YYYY-MM-DD. */
  deadline: string;
  createdAt: string;
  contributions: GoalContribution[];
};

export type Settings = {
  /** Orçamento mensal em centavos. */
  monthlyBudget: number | null;
  categoryLimits: Partial<Record<CategoryId, number>>;
};

export type PendingDraft = {
  amount: number | null;
  category: CategoryId | null;
  description: string;
  createdAt: string;
};

export type AppState = {
  version: 1;
  transactions: Transaction[];
  messages: ChatMessage[];
  goal: Goal | null;
  settings: Settings;
  pending: PendingDraft | null;
  dismissedSuggestions: string[];
};

export type Suggestion = {
  id: string;
  /** Tom visual do cartão. */
  tone: "amber" | "green" | "neutral";
  icon: "limit" | "growth" | "delivery" | "pace" | "insight";
  text: string;
};
