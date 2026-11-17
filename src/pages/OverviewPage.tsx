import { useMemo, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pencil,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import type { Transaction } from "../types";
import { useFinance } from "../store/useFinance";
import { CategoryIcon } from "../components/CategoryIcon";
import { BudgetSheet } from "../components/BudgetSheet";
import { Toast, useToast } from "../components/Toast";
import { CATEGORIES, getCategory } from "../lib/categories";
import {
  addMonths,
  formatMonthYear,
  formatTime,
  isSameMonth,
  monthKey,
  MONTH_SHORT,
  startOfMonth,
} from "../lib/dates";
import {
  latestTransactions,
  monthComparison,
  monthTotal,
  monthTransactions,
  sumAmount,
  totalByCategory,
} from "../lib/finance";
import { brl, moneyText, percent } from "../lib/format";

function whenLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  const time = formatTime(date);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) return `hoje, ${time}`;
  if (diffDays === 1) return `ontem, ${time}`;
  return `${date.getDate()} ${MONTH_SHORT[date.getMonth()]}, ${time}`;
}

function TransactionRow({
  transaction,
  now,
  confirming,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  transaction: Transaction;
  now: Date;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const category = getCategory(transaction.category);

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <CategoryIcon category={transaction.category} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{transaction.description}</p>
        <p className="mt-0.5 truncate text-[11px] text-ink-faint">
          {category.label} · {whenLabel(transaction.createdAt, now)}
        </p>
      </div>
      <p className="shrink-0 text-[13.5px] font-semibold tabular-nums text-ink">
        {brl(transaction.amount)}
      </p>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full bg-attention-soft px-2.5 py-1 text-[11px] font-semibold text-[#96562c] transition hover:bg-[#f7d9c2]"
          >
            Excluir
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            aria-label="Cancelar exclusão"
            className="grid h-7 w-7 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAskDelete}
          aria-label={`Excluir registro ${transaction.description}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-faint/60 transition hover:bg-surface-2 hover:text-ink-soft"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export function OverviewPage({ onGoToChat }: { onGoToChat: () => void }) {
  const { state, saveBudget, deleteTransaction, reset } = useFinance();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const { message: toast, show: showToast } = useToast();

  const now = new Date();
  const isCurrentMonth = isSameMonth(month, now);
  const budget = state.settings.monthlyBudget;

  const monthData = useMemo(() => {
    const items = monthTransactions(state.transactions, month);
    const total = sumAmount(items);
    const totals = totalByCategory(items);
    const previousTotal = monthTotal(state.transactions, addMonths(month, -1));
    const comparison = monthComparison(state.transactions, now);
    const change =
      isCurrentMonth
        ? comparison.change
        : previousTotal > 0
          ? Math.round(((total - previousTotal) / previousTotal) * 100)
          : null;

    return {
      items,
      total,
      totals,
      latest: latestTransactions(items, 5),
      change,
      previousTotal,
    };
  }, [state.transactions, month, now, isCurrentMonth]);

  const hasData = monthData.items.length > 0;
  const remaining = budget !== null ? budget - monthData.total : null;
  const budgetRatio = budget && budget > 0 ? (monthData.total / budget) * 100 : 0;
  const canGoNext = !isSameMonth(month, now) && month.getTime() < startOfMonth(now).getTime();

  const comparisonScope = isCurrentMonth
    ? "no mesmo período do mês passado"
    : `em ${formatMonthYear(addMonths(month, -1))}`;

  const handleDelete = (id: string) => {
    deleteTransaction(id);
    setConfirmDelete(null);
    showToast("Registro removido. Sem problema.");
  };

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="px-4 pb-8 pt-5">
        <header>
          <p className="px-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Visão geral
          </p>
          <div className="mt-1 flex items-center justify-between gap-3 px-1">
            <h1 className="text-[24px] font-semibold leading-tight tracking-tight text-ink">
              Para onde foi
              <br />
              seu dinheiro
            </h1>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-soft text-amber-deep">
              <Wallet size={19} strokeWidth={1.8} />
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-full border border-line bg-surface px-1.5 py-1 shadow-[0_1px_2px_rgba(61,53,44,0.03)]">
            <button
              type="button"
              onClick={() => setMonth((value) => startOfMonth(addMonths(value, -1)))}
              aria-label="Mês anterior"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2"
            >
              <ChevronLeft size={17} />
            </button>
            <span className="text-[12.5px] font-medium text-ink" aria-live="polite">
              {formatMonthYear(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth((value) => startOfMonth(addMonths(value, 1)))}
              disabled={!canGoNext}
              aria-label="Próximo mês"
              className="grid h-8 w-8 place-items-center rounded-full text-ink-soft transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:text-line"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </header>

        {!hasData ? (
          <div className="mt-5 animate-rise">
            <div className="card px-6 py-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-soft/70 text-amber-deep">
                <Wallet size={24} strokeWidth={1.7} />
              </span>
              <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-ink">
                {isCurrentMonth ? "Seu resumo vai aparecer aqui" : "Nenhum registro neste mês"}
              </h2>
              <p className="mx-auto mt-2 max-w-[260px] text-[13px] leading-relaxed text-ink-soft">
                {isCurrentMonth
                  ? "Depois de registrar o primeiro gasto, seu resumo aparecerá aqui."
                  : `Não encontrei gastos em ${formatMonthYear(month)}. Que tal voltar para o mês atual?`}
              </p>
              <button
                type="button"
                onClick={isCurrentMonth ? onGoToChat : () => setMonth(startOfMonth(now))}
                className="btn-primary mt-5"
              >
                {isCurrentMonth ? "Contar um gasto" : "Voltar para o mês atual"}
                <ArrowRight size={16} />
              </button>
            </div>

            {isCurrentMonth ? (
              <div className="mt-4 rounded-[24px] border border-dashed border-line bg-surface/60 px-5 py-4">
                <p className="text-[12px] font-medium text-ink">Já sabe quanto pode gastar no mês?</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">
                  Defina um orçamento e eu mostro quanto ainda cabe — sem cobrança.
                </p>
                <button
                  type="button"
                  onClick={() => setBudgetOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-deep"
                >
                  Definir orçamento <ArrowRight size={13} />
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <section
              aria-label="Resumo do mês"
              className="relative mt-5 overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-br from-[#f8e8ca] via-[#fdf6ea] to-[#f7efe3] p-5 shadow-[0_14px_36px_-24px_rgba(150,105,45,0.55)]"
            >
              <div
                aria-hidden="true"
                className="animate-soft-pulse pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-white/50 blur-2xl"
              />
              <div className="relative">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#a3773e]">
                  Gasto este mês
                </p>
                <p className="mt-1 text-[34px] font-semibold leading-none tracking-tight text-ink tabular-nums">
                  {brl(monthData.total)}
                </p>

                {budget !== null && isCurrentMonth ? (
                  <div className="mt-4 rounded-2xl bg-white/60 p-3.5 backdrop-blur-[2px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11.5px] text-ink-soft">Orçamento restante</span>
                      <span
                        className={`text-[13px] font-semibold tabular-nums ${
                          remaining !== null && remaining < 0 ? "text-[#a96231]" : "text-ink"
                        }`}
                      >
                        {remaining !== null && remaining < 0
                          ? `- ${brl(Math.abs(remaining))}`
                          : brl(remaining ?? 0)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#eadfcb]">
                      <div
                        className={`h-full rounded-full transition-[width] duration-700 ${
                          remaining !== null && remaining < 0 ? "bg-attention" : "bg-amber"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, budgetRatio))}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10.5px] text-ink-soft">
                      <span>
                        {remaining !== null && remaining < 0
                          ? "Você passou um pouco do combinado"
                          : `${percent(budgetRatio)} de ${brl(budget)} usado`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setBudgetOpen(true)}
                        className="inline-flex items-center gap-1 font-semibold text-amber-deep"
                      >
                        Ajustar <Pencil size={11} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-white/55 p-3.5">
                    <p className="text-[11.5px] leading-snug text-ink-soft">
                      {isCurrentMonth
                        ? "Defina um orçamento para saber quanto ainda cabe no mês."
                        : "Orçamento é definido para o mês atual."}
                    </p>
                    {isCurrentMonth ? (
                      <button
                        type="button"
                        onClick={() => setBudgetOpen(true)}
                        className="shrink-0 rounded-full bg-white px-3 py-2 text-[11.5px] font-semibold text-amber-deep shadow-sm transition hover:bg-[#fffaf0]"
                      >
                        Definir
                      </button>
                    ) : null}
                  </div>
                )}

                {monthData.change !== null ? (
                  <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
                    {monthData.change <= -3
                      ? `${percent(Math.abs(monthData.change))} a menos`
                      : monthData.change >= 3
                        ? `${percent(monthData.change)} a mais`
                        : "No mesmo ritmo"}{" "}
                    {comparisonScope}.
                  </p>
                ) : (
                  <p className="mt-3 text-[10.5px] leading-relaxed text-ink-soft">
                    {moneyText(monthData.total)} em {monthData.items.length}{" "}
                    {monthData.items.length === 1 ? "registro" : "registros"}.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-6" aria-label="Gastos por categoria">
              <div className="mb-2 flex items-end justify-between px-1">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">Por categoria</h2>
                <span className="text-[10.5px] text-ink-faint">proporção do mês</span>
              </div>
              <div className="card px-4 py-2">
                {CATEGORIES.map((category) => {
                  const value = monthData.totals[category.id];
                  const share = monthData.total > 0 ? (value / monthData.total) * 100 : 0;
                  return (
                    <div key={category.id} className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <CategoryIcon category={category.id} size="sm" />
                        <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                          <span
                            className={`truncate text-[12.5px] font-medium ${
                              value > 0 ? "text-ink" : "text-ink-faint"
                            }`}
                          >
                            {category.label}
                          </span>
                          <span className="shrink-0 text-[11.5px] tabular-nums text-ink-soft">
                            {value > 0 ? (
                              <>
                                {brl(value)}{" "}
                                <span className="text-ink-faint">· {percent(share)}</span>
                              </>
                            ) : (
                              <span className="text-ink-faint">—</span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="ml-[40px] mt-1.5 h-[7px] overflow-hidden rounded-full bg-cream-2">
                        <div
                          className="animate-bar h-full rounded-full"
                          style={
                            {
                              "--bar-width": `${share}%`,
                              width: `${share}%`,
                              backgroundColor: category.color,
                              opacity: value > 0 ? 1 : 0,
                            } as CSSProperties
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="mt-6" aria-label="Últimos registros">
              <div className="mb-2 flex items-end justify-between px-1">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">Últimos registros</h2>
                <button
                  type="button"
                  onClick={onGoToChat}
                  className="text-[11px] font-medium text-amber-deep"
                >
                  Registrar outro
                </button>
              </div>
              <div className="card divide-y divide-line/70 overflow-hidden">
                {monthData.latest.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    now={now}
                    confirming={confirmDelete === transaction.id}
                    onAskDelete={() => setConfirmDelete(transaction.id)}
                    onCancelDelete={() => setConfirmDelete(null)}
                    onDelete={() => handleDelete(transaction.id)}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        <section className="mt-6 rounded-[24px] border border-line/80 bg-surface-2/60 p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface text-green-deep">
              <ShieldCheck size={15} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-ink">Seus dados ficam com você</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
                Sem login, sem nuvem. Tudo é salvo apenas neste navegador.
              </p>
            </div>
          </div>

          {confirmReset ? (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-surface px-3 py-2">
              <span className="text-[11px] text-ink-soft">Apagar tudo mesmo?</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="rounded-full px-2.5 py-1 text-[11px] font-medium text-ink-soft transition hover:bg-surface-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setConfirmReset(false);
                    setMonth(startOfMonth(new Date()));
                    showToast("Dados apagados. Começamos de novo.");
                  }}
                  className="rounded-full bg-attention-soft px-2.5 py-1 text-[11px] font-semibold text-[#96562c]"
                >
                  Apagar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="mt-3 text-[11px] font-medium text-ink-faint underline-offset-2 transition hover:text-ink-soft hover:underline"
            >
              Apagar todos os dados
            </button>
          )}
        </section>

        <p className="mt-6 text-center text-[10px] text-ink-faint">
          Caderninho · suas contas, sem drama
        </p>
      </div>

      <BudgetSheet
        open={budgetOpen}
        onClose={() => setBudgetOpen(false)}
        settings={state.settings}
        spentThisMonth={monthKey(now) === monthKey(month) ? monthData.total : monthTotal(state.transactions, now)}
        onSave={(settings) => {
          saveBudget(settings);
          showToast("Orçamento salvo. 🌿");
        }}
      />
      <Toast message={toast} />
    </div>
  );
}
