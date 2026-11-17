import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AppState, ChatMessage, Settings, Suggestion } from "../types";
import { handleUserMessage } from "../lib/agent";
import { brl } from "../lib/format";
import { uid } from "../lib/id";
import { clearState, createInitialState, loadState, saveState } from "../lib/storage";
import { suggestionsForState } from "../lib/suggestions";

type GoalInput = {
  name: string;
  targetAmount: number;
  deadline: string;
};

type FinanceApi = {
  state: AppState;
  typing: boolean;
  suggestions: Suggestion[];
  sendMessage: (text: string) => void;
  addContribution: (amount: number) => void;
  saveGoal: (input: GoalInput) => void;
  deleteGoal: () => void;
  deleteTransaction: (id: string) => void;
  saveBudget: (settings: Settings) => void;
  dismissSuggestion: (id: string) => void;
  reset: () => void;
};

const FinanceContext = createContext<FinanceApi | null>(null);

function toMessage(reply: ReturnType<typeof handleUserMessage>["replies"][number]): ChatMessage {
  return {
    id: uid(),
    role: "agent",
    text: reply.text,
    createdAt: new Date().toISOString(),
    tone: reply.tone,
    meta: reply.meta,
  };
}

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => loadState());
  const [typing, setTyping] = useState(false);
  const pendingReplies = useRef(0);
  const timers = useRef<number[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
    };
  }, []);

  const sendMessage = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;

    const userMessage: ChatMessage = {
      id: uid(),
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    };

    setState((previous) => ({
      ...previous,
      messages: [...previous.messages, userMessage],
    }));

    pendingReplies.current += 1;
    setTyping(true);

    const delay = 480 + Math.round(Math.random() * 380);
    const timer = window.setTimeout(() => {
      setState((previous) => {
        const result = handleUserMessage(previous, text, new Date());
        return {
          ...result.state,
          messages: [...result.state.messages, ...result.replies.map(toMessage)],
        };
      });
      pendingReplies.current = Math.max(0, pendingReplies.current - 1);
      if (pendingReplies.current === 0) setTyping(false);
    }, delay);

    timers.current.push(timer);
  }, []);

  const addContribution = useCallback((amount: number) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setState((previous) => {
      if (!previous.goal) return previous;
      return {
        ...previous,
        goal: {
          ...previous.goal,
          contributions: [
            ...previous.goal.contributions,
            { id: uid(), amount: Math.round(amount), createdAt: new Date().toISOString() },
          ],
        },
        pending: null,
      };
    });
  }, []);

  const saveGoal = useCallback((input: GoalInput) => {
    setState((previous) => {
      const target = Math.round(input.targetAmount);
      if (!Number.isFinite(target) || target <= 0 || !input.deadline) return previous;
      const name = input.name.trim() || `Guardar ${brl(target)}`;
      if (previous.goal) {
        return {
          ...previous,
          goal: {
            ...previous.goal,
            name,
            targetAmount: target,
            deadline: input.deadline,
          },
          pending: null,
        };
      }
      return {
        ...previous,
        goal: {
          id: uid(),
          name,
          targetAmount: target,
          deadline: input.deadline,
          createdAt: new Date().toISOString(),
          contributions: [],
        },
        pending: null,
      };
    });
  }, []);

  const deleteGoal = useCallback(() => {
    setState((previous) => ({ ...previous, goal: null }));
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((previous) => ({
      ...previous,
      transactions: previous.transactions.filter((transaction) => transaction.id !== id),
    }));
  }, []);

  const saveBudget = useCallback((settings: Settings) => {
    setState((previous) => ({
      ...previous,
      settings: {
        monthlyBudget:
          settings.monthlyBudget && settings.monthlyBudget > 0
            ? Math.round(settings.monthlyBudget)
            : null,
        categoryLimits: Object.fromEntries(
          Object.entries(settings.categoryLimits)
            .filter(([, value]) => typeof value === "number" && value > 0)
            .map(([key, value]) => [key, Math.round(value as number)]),
        ),
      },
    }));
  }, []);

  const dismissSuggestion = useCallback((id: string) => {
    setState((previous) => ({
      ...previous,
      dismissedSuggestions: previous.dismissedSuggestions.includes(id)
        ? previous.dismissedSuggestions
        : [...previous.dismissedSuggestions, id],
    }));
  }, []);

  const reset = useCallback(() => {
    clearState();
    pendingReplies.current = 0;
    setTyping(false);
    setState(createInitialState(new Date()));
  }, []);

  const suggestions = useMemo(
    () => suggestionsForState(state, now),
    [state, now],
  );

  const value = useMemo<FinanceApi>(
    () => ({
      state,
      typing,
      suggestions,
      sendMessage,
      addContribution,
      saveGoal,
      deleteGoal,
      deleteTransaction,
      saveBudget,
      dismissSuggestion,
      reset,
    }),
    [
      state,
      typing,
      suggestions,
      sendMessage,
      addContribution,
      saveGoal,
      deleteGoal,
      deleteTransaction,
      saveBudget,
      dismissSuggestion,
      reset,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance(): FinanceApi {
  const context = useContext(FinanceContext);
  if (!context) throw new Error("useFinance precisa estar dentro de FinanceProvider");
  return context;
}
