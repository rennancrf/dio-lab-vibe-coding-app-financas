import { useState } from "react";
import {
  ArrowRight,
  Bike,
  CalendarDays,
  Gauge,
  Leaf,
  Lightbulb,
  Pencil,
  PiggyBank,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { useFinance } from "../store/useFinance";
import { ContributionSheet } from "../components/ContributionSheet";
import { GoalSheet } from "../components/GoalSheet";
import { Toast, useToast } from "../components/Toast";
import { brl, moneyText, percent } from "../lib/format";
import { goalProgress } from "../lib/goal";
import { monthTotal } from "../lib/finance";

const SUGGESTION_ICONS = {
  limit: Gauge,
  growth: TrendingUp,
  delivery: Bike,
  pace: CalendarDays,
  insight: Lightbulb,
} as const;

const TONE_STYLES = {
  amber: {
    card: "border-amber/25 bg-[#fffaf0]",
    icon: "bg-amber-soft text-amber-deep",
  },
  green: {
    card: "border-green/25 bg-[#f7fbf3]",
    icon: "bg-green-soft text-green-deep",
  },
  neutral: {
    card: "border-line bg-surface",
    icon: "bg-cream-2 text-ink-soft",
  },
} as const;

export function GoalsPage({ onGoToChat, onGoToOverview }: { onGoToChat: () => void; onGoToOverview: () => void }) {
  const { state, suggestions, saveGoal, deleteGoal, addContribution, dismissSuggestion } = useFinance();
  const [goalOpen, setGoalOpen] = useState(false);
  const [contributionOpen, setContributionOpen] = useState(false);
  const [suggestedContribution, setSuggestedContribution] = useState<number | undefined>(undefined);
  const { message: toast, show: showToast } = useToast();

  const now = new Date();
  const goal = state.goal;
  const progress = goal ? goalProgress(goal, now) : null;
  const budget = state.settings.monthlyBudget;
  const budgetLeftover = budget ? Math.max(0, budget - monthTotal(state.transactions, now)) : 0;

  const openContribution = (amount?: number) => {
    setSuggestedContribution(amount);
    setContributionOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="px-4 pb-8 pt-5">
        <header>
          <p className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Metas e sugestões
          </p>
          <div className="mt-1 flex items-center justify-between gap-3 px-1">
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-ink">
              Pequenos passos
              <br />
              contam muito
            </h1>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-green-soft text-green-deep">
              <Leaf size={19} strokeWidth={1.8} />
            </span>
          </div>
        </header>

        {!goal || !progress ? (
          <section className="relative mt-5 overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-br from-[#edf3e5] via-[#fbf9f1] to-[#f9efe0] p-6 text-center shadow-[0_14px_36px_-26px_rgba(110,130,90,0.55)]">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/50 blur-2xl"
            />
            <div className="relative">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/80 text-green-deep shadow-sm">
                <PiggyBank size={26} strokeWidth={1.6} />
              </span>
              <h2 className="mt-4 text-[18px] font-semibold tracking-tight text-ink">
                Uma pequena meta
              </h2>
              <p className="mx-auto mt-1.5 max-w-[270px] text-[12.5px] leading-relaxed text-ink-soft">
                Guardar um pouco por vez é mais leve do que parece. Comece com um valor possível
                para este momento.
              </p>
              <button
                type="button"
                onClick={() => setGoalOpen(true)}
                className="btn-green mt-5 rounded-full px-6"
              >
                <Target size={16} />
                Definir uma pequena meta
              </button>
              <p className="mt-2.5 text-[10px] text-ink-faint">ex.: guardar R$ 300 até o fim do ano</p>
            </div>
          </section>
        ) : (
          <section
            aria-label="Sua meta de economia"
            className="relative mt-5 overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-br from-[#e9f0e0] via-[#f8f7ec] to-[#f9eee0] p-5 shadow-[0_14px_36px_-26px_rgba(110,130,90,0.55)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-white/45 blur-2xl"
            />
            <div className="relative">
              <div className="flex items-center justify-between gap-2">
                <span className="pill bg-white/70 text-[10px] uppercase tracking-[0.14em] text-green-deep">
                  {progress.complete ? "meta conquistada" : "sua meta"}
                </span>
                <button
                  type="button"
                  onClick={() => setGoalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-white/60 px-2.5 py-1.5 text-[10.5px] font-medium text-ink-soft transition hover:bg-white"
                >
                  <Pencil size={11} /> Editar
                </button>
              </div>

              <h2 className="mt-2 text-[19px] font-semibold leading-snug tracking-tight text-ink">
                {goal.name}
              </h2>

              <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-[28px] font-semibold leading-none tracking-tight text-ink tabular-nums">
                {brl(progress.saved)}
                <span className="text-[11.5px] font-medium text-ink-soft">
                  de {brl(progress.target)}
                </span>
              </p>

              <div
                className="mt-3.5 h-2.5 w-full overflow-hidden rounded-full bg-white/70"
                role="progressbar"
                aria-valuenow={Math.round(progress.percent)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da meta"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8fb283] to-green-deep transition-[width] duration-700"
                  style={{ width: `${Math.max(progress.saved > 0 ? 3 : 0, progress.percent)}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-ink-soft">
                <span>{percent(progress.percent)} guardado</span>
                <span>
                  {progress.complete
                    ? "concluída 🎉"
                    : progress.expired
                      ? "prazo encerrado"
                      : `${progress.daysLeft} ${progress.daysLeft === 1 ? "dia restante" : "dias restantes"}`}
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-3 gap-1.5">
                <div className="min-w-0 rounded-2xl bg-white/55 px-2 py-2.5">
                  <p className="truncate text-[9px] uppercase tracking-[0.06em] text-ink-faint">faltam</p>
                  <p className="mt-0.5 text-[12px] font-semibold leading-tight text-ink tabular-nums">
                    {progress.complete ? "—" : brl(progress.remaining)}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl bg-white/55 px-2 py-2.5">
                  <p className="truncate text-[9px] uppercase tracking-[0.06em] text-ink-faint">por semana</p>
                  <p className="mt-0.5 text-[12px] font-semibold leading-tight text-ink tabular-nums">
                    {progress.complete ? "—" : brl(progress.perWeek)}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl bg-white/55 px-2 py-2.5">
                  <p className="truncate text-[9px] uppercase tracking-[0.06em] text-ink-faint">por dia</p>
                  <p className="mt-0.5 text-[12px] font-semibold leading-tight text-ink tabular-nums">
                    {progress.complete ? "—" : brl(progress.perDay)}
                  </p>
                </div>
              </div>

              {progress.complete ? (
                <p className="mt-3 rounded-2xl bg-white/60 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-green-deep">
                  Você chegou lá! Que tal escolher a próxima meta com calma?
                </p>
              ) : (
                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openContribution()}
                    className="btn-green flex-1 whitespace-nowrap px-3 py-2.5"
                  >
                    <Plus size={15} /> Guardar agora
                  </button>
                  {budgetLeftover > 0 ? (
                    <button
                      type="button"
                      onClick={() => openContribution(budgetLeftover)}
                      title={`Sobra de ${brl(budgetLeftover)} este mês`}
                      className="flex-1 whitespace-nowrap rounded-full border border-white/80 bg-white/60 px-3 py-2.5 text-[11.5px] font-medium text-ink-soft transition hover:bg-white"
                    >
                      Usar sobra
                    </button>
                  ) : null}
                </div>
              )}

              {!progress.complete && budgetLeftover > 0 ? (
                <p className="mt-2.5 text-center text-[10px] leading-relaxed text-ink-faint">
                  Sua sobra de orçamento este mês é {moneyText(budgetLeftover)}.
                </p>
              ) : null}
            </div>
          </section>
        )}

        <section className="mt-6" aria-label="Sugestões de economia">
          <div className="mb-2 flex items-end justify-between px-1">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">Sugestões para você</h2>
            <span className="text-[10.5px] text-ink-faint">com base no seu mês</span>
          </div>

          {suggestions.length > 0 ? (
            <div className="space-y-2.5">
              {suggestions.map((suggestion) => {
                const Icon = SUGGESTION_ICONS[suggestion.icon];
                const tone = TONE_STYLES[suggestion.tone];
                return (
                  <article
                    key={suggestion.id}
                    className={`animate-rise relative rounded-[22px] border p-4 pr-10 ${tone.card}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${tone.icon}`}>
                        <Icon size={16} strokeWidth={1.9} />
                      </span>
                      <p className="text-[12.5px] leading-relaxed text-ink">{suggestion.text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissSuggestion(suggestion.id)}
                      aria-label="Dispensar sugestão"
                      className="absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full text-ink-faint/70 transition hover:bg-white/70 hover:text-ink-soft"
                    >
                      <X size={13} />
                    </button>
                  </article>
                );
              })}
            </div>
          ) : state.transactions.length === 0 ? (
            <div className="card px-6 py-7 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-soft/60 text-amber-deep">
                <Sparkles size={21} strokeWidth={1.7} />
              </span>
              <p className="mx-auto mt-3 max-w-[250px] text-[12.5px] leading-relaxed text-ink-soft">
                Depois de registrar alguns gastos, vou dar sugestões de economia aqui.
              </p>
              <button type="button" onClick={onGoToChat} className="btn-ghost mt-4">
                Contar um gasto <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="card px-5 py-6">
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Tudo tranquilo por aqui. Continue registrando que eu observo o ritmo e aviso quando
                algo merecer atenção.
              </p>
              <button
                type="button"
                onClick={onGoToOverview}
                className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-amber-deep"
              >
                Ajustar orçamento e limites <ArrowRight size={13} />
              </button>
            </div>
          )}
        </section>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[10px] text-ink-faint">
          <Leaf size={11} className="text-green" />
          Sugestões são gentis, não cobranças.
        </p>
      </div>

      <GoalSheet
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        goal={state.goal}
        onSave={(input) => {
          saveGoal(input);
          showToast(goal ? "Meta atualizada. 🌿" : "Meta criada. Vamos com calma. 🌱");
        }}
        onDelete={() => {
          deleteGoal();
          showToast("Meta removida.");
        }}
      />

      {goal && progress ? (
        <ContributionSheet
          open={contributionOpen}
          onClose={() => {
            setContributionOpen(false);
            setSuggestedContribution(undefined);
          }}
          goal={goal}
          remaining={progress.remaining}
          suggestedAmount={suggestedContribution}
          onSave={(amount) => {
            addContribution(amount);
            setSuggestedContribution(undefined);
            showToast("Guardado! 🌱");
          }}
        />
      ) : null}

      <Toast message={toast} />
    </div>
  );
}
