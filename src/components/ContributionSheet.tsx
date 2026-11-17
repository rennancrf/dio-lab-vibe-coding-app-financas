import { useEffect, useState } from "react";
import type { Goal } from "../types";
import { brl, moneyText } from "../lib/format";
import { moneyInputValue, parseMoneyInput } from "../lib/money";
import { Sheet } from "./Sheet";

type ContributionSheetProps = {
  open: boolean;
  onClose: () => void;
  goal: Goal;
  remaining: number;
  suggestedAmount?: number;
  onSave: (amount: number) => void;
};

export function ContributionSheet({
  open,
  onClose,
  goal,
  remaining,
  suggestedAmount,
  onSave,
}: ContributionSheetProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setError(null);
  }, [open]);

  const parsed = parseMoneyInput(amount);
  const chips = [2000, 5000, 10000];
  if (suggestedAmount && suggestedAmount >= 1000 && !chips.includes(suggestedAmount)) {
    chips.push(suggestedAmount);
  }

  const handleSave = () => {
    if (!parsed) {
      setError('Digite um valor para guardar. Pode ser pequeno, tipo "20".');
      return;
    }
    onSave(parsed);
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Guardar na meta"
      description={`Meta "${goal.name}" · faltam ${brl(remaining)}.`}
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="contribution-amount" className="mb-1.5 block text-[13px] font-medium text-ink">
            Quanto você está guardando?
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
              R$
            </span>
            <input
              id="contribution-amount"
              className="field pl-10 text-[17px] font-medium"
              inputMode="decimal"
              placeholder="50,00"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSave();
                }
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {chips.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(moneyInputValue(value))}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-green/50 hover:text-green-deep"
              >
                {suggestedAmount === value ? "Sobra do mês · " : ""}
                {brl(value)}
              </button>
            ))}
          </div>
        </div>

        {suggestedAmount ? (
          <p className="rounded-2xl bg-amber-soft/60 px-4 py-3 text-[12px] leading-relaxed text-[#8a5a26]">
            Sua sobra de orçamento este mês é {moneyText(suggestedAmount)}. Guardar uma parte agora
            já conta para a meta.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-2xl bg-attention-soft px-4 py-2.5 text-[12px] text-[#9a5a2e]">
            {error}
          </p>
        ) : null}

        <div className="sheet-actions flex gap-2">
          <button type="button" className="btn-ghost flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-green flex-[1.4]" onClick={handleSave} disabled={!parsed}>
            Guardar
          </button>
        </div>
      </div>
    </Sheet>
  );
}
