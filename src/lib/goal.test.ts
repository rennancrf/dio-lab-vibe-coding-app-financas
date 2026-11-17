import { describe, expect, it } from "vitest";
import type { Goal } from "../types";
import { goalProgress } from "./goal";

const NOW = new Date(2026, 10, 13, 12);

function goal(partial: Partial<Goal> = {}): Goal {
  return {
    id: "g1",
    name: "Guardar 500",
    targetAmount: 50000,
    deadline: "2026-12-31",
    createdAt: new Date(2026, 10, 1).toISOString(),
    contributions: [],
    ...partial,
  };
}

function contribution(amount: number) {
  return { id: Math.random().toString(36).slice(2), amount, createdAt: NOW.toISOString() };
}

describe("goalProgress", () => {
  it("mostra o valor restante correto sem contribuições", () => {
    const progress = goalProgress(goal(), NOW);
    expect(progress.saved).toBe(0);
    expect(progress.remaining).toBe(50000);
    expect(progress.percent).toBe(0);
    expect(progress.complete).toBe(false);
    expect(progress.daysLeft).toBe(49);
  });

  it("desconta as contribuições do valor restante", () => {
    const progress = goalProgress(goal({ contributions: [contribution(12000)] }), NOW);
    expect(progress.saved).toBe(12000);
    expect(progress.remaining).toBe(38000);
    expect(progress.percent).toBe(24);
  });

  it("marca a meta como concluída", () => {
    const progress = goalProgress(goal({ contributions: [contribution(50000)] }), NOW);
    expect(progress.remaining).toBe(0);
    expect(progress.complete).toBe(true);
    expect(progress.percent).toBe(100);
  });

  it("detecta prazo vencido", () => {
    const progress = goalProgress(goal({ deadline: "2026-11-01" }), NOW);
    expect(progress.expired).toBe(true);
    expect(progress.daysLeft).toBe(0);
  });

  it("sugere um valor por dia alcançável", () => {
    const progress = goalProgress(goal(), NOW);
    expect(progress.perDay).toBe(Math.ceil(50000 / 49));
  });
});
