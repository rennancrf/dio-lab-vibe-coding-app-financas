import { useEffect, useState } from "react";
import { CalendarDays, Target, Trash2 } from "lucide-react";
import type { Goal } from "../types";
import { brl, moneyText } from "../lib/format";
import { daysUntil, toISODate } from "../lib/dates";
import { moneyInputValue, parseMoneyInput } from "../lib/money";
import { suggestedDeadline } from "../lib/goal";
import { Sheet } from "./Sheet";

type GoalSheetProps = {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSave: (input: { name: string; targetAmount: number; deadline: string }) => void;
  onDelete: () => void;
};

const PRESETS = [30000, 50000, 100000];

export function GoalSheet({ open, onClose, goal, onSave, onDelete }: GoalSheetProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    setName(goal?.name ?? "");
    setTarget(moneyInputValue(goal?.targetAmount ?? null));
    setDeadline(goal?.deadline ?? suggestedDeadline(now));
    setError(null);
    setConfirmDelete(false);
  }, [open, goal]);

  const now = new Date();
  const targetCents = parseMoneyInput(target);
  const minimumDate = toISODate(now);

  const handleSave = () => {
    if (!targetCents) {
      setError("Escolha quanto você quer guardar. Pode ser pouco — o tamanho não importa.");
      return;
    }
    if (!deadline) {
      setError("Escolha uma data para essa meta. Um prazo ajuda a manter o ritmo.");
      return;
    }
    if (deadline < minimumDate) {
      setError("Essa data já passou. Escolha uma data a partir de hoje.");
      return;
    }
    onSave({ name, targetAmount: targetCents, deadline });
    onClose();
  };

  const days = deadline ? daysUntil(deadline, now) : 0;
  const weeks = Math.max(1, Math.ceil(days / 7));
  const perWeek = targetCents ? Math.ceil(targetCents / weeks) : 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={goal ? "Editar sua meta" : "Definir uma pequena meta"}
      description={
        goal
          ? "Ajuste o valor ou o prazo sempre que precisar. A meta é sua."
          : "Escolha algo possível para este momento. Pequeno também conta."
      }
    >
      <div className="space-y-5">
        <div>
          <label htmlFor="goal-name" className="mb-1.5 block text-[13px] font-medium text-ink">
            Nome da meta <span className="font-normal text-ink-faint">(opcional)</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
              <Target size={16} />
            </span>
            <input
              id="goal-name"
              className="field pl-10"
              placeholder="Viagem, reserva, um respiro..."
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
            />
          </div>
        </div>

        <div>
          <label htmlFor="goal-target" className="mb-1.5 block text-[13px] font-medium text-ink">
            Quanto você quer guardar?
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-faint">
              R$
            </span>
            <input
              id="goal-target"
              className="field pl-10 text-[17px] font-medium"
              inputMode="decimal"
              placeholder="500,00"
              value={target}
              onChange={(event) => {
                setTarget(event.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="mt-2 flex gap-2">
            {PRESETS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTarget(moneyInputValue(value))}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-soft transition hover:border-amber/50 hover:text-amber-deep"
              >
                {brl(value)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="goal-deadline" className="mb-1.5 block text-[13px] font-medium text-ink">
            Até quando?
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
              <CalendarDays size={16} />
            </span>
            <input
              id="goal-deadline"
              type="date"
              min={minimumDate}
              className="field pl-10"
              value={deadline}
              onChange={(event) => {
                setDeadline(event.target.value);
                setError(null);
              }}
            />
          </div>
          {targetCents && deadline && deadline >= minimumDate ? (
            <p className="mt-2 rounded-2xl bg-green-soft/70 px-3.5 py-2.5 text-[12px] leading-relaxed text-green-deep">
              Cerca de <strong>{moneyText(perWeek)}</strong> por semana até lá. Um passo de cada vez.
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="rounded-2xl bg-attention-soft px-4 py-2.5 text-[12px] text-[#9a5a2e]">
            {error}
          </p>
        ) : null}

        {goal ? (
          <div className="border-t border-line pt-4">
            {confirmDelete ? (
              <div className="space-y-2">
                <p className="text-center text-[12px] text-ink-soft">
                  Remover a meta também apaga as economias registradas nela.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex-1"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Manter
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-attention-soft px-4 py-2.5 text-sm font-medium text-[#96562c] transition hover:bg-[#f7d9c2]"
                  >
                    <Trash2 size={15} /> Remover
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mx-auto flex items-center gap-1.5 text-[12px] font-medium text-ink-faint transition hover:text-ink-soft"
              >
                <Trash2 size={13} /> Remover meta
              </button>
            )}
          </div>
        ) : null}

        <div className="sheet-actions space-y-2">
          <button type="button" className="btn-green w-full" onClick={handleSave}>
            {goal ? "Salvar alterações" : "Criar minha meta"}
          </button>
          <button type="button" className="btn-ghost w-full" onClick={onClose}>
            Agora não
          </button>
        </div>
      </div>
    </Sheet>
  );
}
