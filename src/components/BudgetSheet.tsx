import { useEffect, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import type { CategoryId, Settings } from "../types";
import { CATEGORIES } from "../lib/categories";
import { brl } from "../lib/format";
import { moneyInputValue, parseMoneyInput } from "../lib/money";
import { Sheet } from "./Sheet";

type BudgetSheetProps = {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  spentThisMonth: number;
  onSave: (settings: Settings) => void;
};

const SPLIT: Record<CategoryId, number> = {
  alimentacao: 0.35,
  transporte: 0.2,
  compras: 0.2,
  lazer: 0.15,
  outros: 0.1,
};

function emptyLimits(): Record<CategoryId, string> {
  return { alimentacao: "", transporte: "", compras: "", lazer: "", outros: "" };
}

export function BudgetSheet({ open, onClose, settings, spentThisMonth, onSave }: BudgetSheetProps) {
  const [budget, setBudget] = useState("");
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [limits, setLimits] = useState<Record<CategoryId, string>>(emptyLimits);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setBudget(moneyInputValue(settings.monthlyBudget));
    setLimits({
      alimentacao: moneyInputValue(settings.categoryLimits.alimentacao ?? null),
      transporte: moneyInputValue(settings.categoryLimits.transporte ?? null),
      compras: moneyInputValue(settings.categoryLimits.compras ?? null),
      lazer: moneyInputValue(settings.categoryLimits.lazer ?? null),
      outros: moneyInputValue(settings.categoryLimits.outros ?? null),
    });
    setLimitsOpen(Object.values(settings.categoryLimits).some((value) => Boolean(value)));
    setError(null);
  }, [open, settings]);

  const autoSplit = () => {
    const total = parseMoneyInput(budget);
    if (!total) {
      setError("Defina um orçamento total primeiro para dividir automaticamente.");
      return;
    }
    setError(null);
    setLimitsOpen(true);
    setLimits(
      Object.fromEntries(
        CATEGORIES.map((category) => {
          const value = Math.round((total * SPLIT[category.id]) / 100) * 100;
          return [category.id, moneyInputValue(value)];
        }),
      ) as Record<CategoryId, string>,
    );
  };

  const handleSave = () => {
    const total = budget.trim() ? parseMoneyInput(budget) : null;
    if (budget.trim() && total === null) {
      setError("Esse valor de orçamento não parece válido. Tente algo como 2.000.");
      return;
    }

    const categoryLimits: Settings["categoryLimits"] = {};
    for (const category of CATEGORIES) {
      const raw = limits[category.id].trim();
      if (!raw) continue;
      const value = parseMoneyInput(raw);
      if (value === null) {
        setError(`O limite de ${category.label.toLowerCase()} não parece válido.`);
        return;
      }
      categoryLimits[category.id] = value;
    }

    onSave({ monthlyBudget: total, categoryLimits });
    onClose();
  };

  const totalLimits = CATEGORIES.reduce(
    (sum, category) => sum + (parseMoneyInput(limits[category.id]) ?? 0),
    0,
  );

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Seu orçamento do mês"
      description="Um número-guia, não uma cobrança. Dá para mudar quando quiser."
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="budget-total" className="mb-1.5 block text-[13px] font-medium text-ink">
            Orçamento total
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
              R$
            </span>
            <input
              id="budget-total"
              className="field pl-10"
              inputMode="decimal"
              placeholder="2.000,00"
              value={budget}
              onChange={(event) => {
                setBudget(event.target.value);
                setError(null);
              }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-faint">
            Você já gastou {brl(spentThisMonth)} neste mês. O orçamento é só seu.
          </p>
        </div>

        <div className="rounded-2xl bg-surface-2/70 p-4">
          <button
            type="button"
            onClick={() => setLimitsOpen((value) => !value)}
            aria-expanded={limitsOpen}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-ink">
              <SlidersHorizontal size={15} className="text-ink-soft" />
              Limites por categoria
              <span className="pill bg-surface text-ink-faint">opcional</span>
            </span>
            <ChevronDown
              size={16}
              className={`shrink-0 text-ink-faint transition-transform ${limitsOpen ? "rotate-180" : ""}`}
            />
          </button>
          <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
            Ajuda o agente a sugerir economia antes de você estourar o limite.
          </p>

          {limitsOpen ? (
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={autoSplit}
                className="text-[11px] font-semibold text-amber-deep underline-offset-2 hover:underline"
              >
                Dividir automaticamente pelo total
              </button>

              {CATEGORIES.map((category) => (
                <div key={category.id} className="flex items-center gap-3">
                  <label
                    htmlFor={`limit-${category.id}`}
                    className="w-[92px] shrink-0 text-[12px] text-ink-soft"
                  >
                    {category.label}
                  </label>
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-ink-faint">
                      R$
                    </span>
                    <input
                      id={`limit-${category.id}`}
                      className="field py-2 pl-9 text-[13px]"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={limits[category.id]}
                      onChange={(event) => {
                        setLimits((previous) => ({
                          ...previous,
                          [category.id]: event.target.value,
                        }));
                        setError(null);
                      }}
                    />
                  </div>
                </div>
              ))}

              {totalLimits > 0 ? (
                <p className="text-[11px] text-ink-faint">
                  Soma dos limites: <span className="font-medium text-ink-soft">{brl(totalLimits)}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-2xl bg-attention-soft px-4 py-2.5 text-[12px] text-[#9a5a2e]">
            {error}
          </p>
        ) : null}

        <div className="sheet-actions flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary flex-[1.4]" onClick={handleSave}>
            Salvar orçamento
          </button>
        </div>
      </div>
    </Sheet>
  );
}
