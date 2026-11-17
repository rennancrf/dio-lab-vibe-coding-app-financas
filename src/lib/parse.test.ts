import { describe, expect, it } from "vitest";
import { extractAmount, normalize, parseDeadline, parseEntry, parseGoalName } from "./parse";

const NOW = new Date(2026, 10, 13, 15, 30);

describe("extractAmount", () => {
  it("lê valores simples", () => {
    expect(extractAmount("almoço 35")).toBe(3500);
    expect(extractAmount("táxi 28 reais")).toBe(2800);
    expect(extractAmount("R$ 12,50 no café")).toBe(1250);
  });

  it("lê separadores no padrão brasileiro", () => {
    expect(extractAmount("aluguel 1.234,56")).toBe(123456);
    expect(extractAmount("mercado 120,50")).toBe(12050);
    expect(extractAmount("camisa 89,90")).toBe(8990);
    expect(extractAmount("R$ 1.200")).toBe(120000);
  });

  it("não confunde quantidade com valor", () => {
    expect(extractAmount("2 pizzas 60 reais")).toBe(6000);
    expect(extractAmount("3 cafés 15")).toBe(1500);
    expect(extractAmount("gastei 2 mil no mercado")).toBe(200000);
  });

  it("entende números escritos", () => {
    expect(extractAmount("almoço trinta e cinco reais")).toBe(3500);
    expect(extractAmount("cinema vinte e cinco")).toBe(2500);
    expect(extractAmount("mercado cento e vinte reais")).toBe(12000);
  });

  it("ignora datas e horários", () => {
    expect(extractAmount("paguei 30 no dia 12/11")).toBe(3000);
    expect(extractAmount("uber 18 às 14:30")).toBe(1800);
  });

  it("devolve null quando não há valor", () => {
    expect(extractAmount("almoço")).toBeNull();
    expect(extractAmount("oi, tudo bem?")).toBeNull();
  });
});

describe("parseEntry", () => {
  it.each([
    ["almoço 35", "alimentacao", "Almoço"],
    ["táxi 28", "transporte", "Táxi"],
    ["uber 25", "transporte", "Uber"],
    ["cinema 40", "lazer", "Cinema"],
    ["netflix 39,90", "lazer", "Streaming"],
    ["comprei uma camisa por 89,90", "compras", "Roupas"],
    ["mercado livre 100", "compras", "Mercado Livre"],
    ["farmácia 45", "outros", "Saúde"],
    ["conta de luz 180", "outros", "Contas da casa"],
    ["ifood 42", "alimentacao", "Delivery"],
  ])("classifica %s", (input, category, label) => {
    const parsed = parseEntry(input);
    expect(parsed.category).toBe(category);
    expect(parsed.description).toBe(label);
  });

  it("pede esclarecimento quando só há valor", () => {
    const parsed = parseEntry("gastei 50");
    expect(parsed.amount).toBe(5000);
    expect(parsed.category).toBeNull();
    expect(parsed.leftover).toBe("");
  });

  it("mantém descrição livre para a categoria outros", () => {
    const parsed = parseEntry("paguei 80 naquele negócio");
    expect(parsed.category).toBeNull();
    expect(parsed.leftover.toLowerCase()).toContain("negócio");
  });

  it("normaliza acentos e pontuação", () => {
    expect(normalize("Almoço, café e pão!")).toBe("almoco cafe e pao");
  });
});

describe("parseDeadline", () => {
  it("interpreta datas explícitas", () => {
    expect(parseDeadline("meta até 30/12", NOW)).toBe("2026-12-30");
    expect(parseDeadline("meta até 30/12/2027", NOW)).toBe("2027-12-30");
  });

  it("interpreta nomes de meses", () => {
    expect(parseDeadline("meta até dezembro", NOW)).toBe("2026-12-31");
    expect(parseDeadline("até 30 de dezembro", NOW)).toBe("2026-12-30");
    expect(parseDeadline("até janeiro", NOW)).toBe("2027-01-31");
  });

  it("interpreta prazos relativos", () => {
    expect(parseDeadline("fim do mês", NOW)).toBe("2026-11-30");
    expect(parseDeadline("fim do ano", NOW)).toBe("2026-12-31");
    expect(parseDeadline("daqui a 3 meses", NOW)).toBe("2027-02-28");
    expect(parseDeadline("daqui a 10 dias", NOW)).toBe("2026-11-23");
  });

  it("devolve null quando não há prazo", () => {
    expect(parseDeadline("quero guardar 500 reais", NOW)).toBeNull();
  });
});

describe("parseGoalName", () => {
  it("extrai o nome depois de 'para'", () => {
    expect(parseGoalName("quero guardar 500 reais para a viagem")).toBe("Viagem");
    expect(parseGoalName("meta de 1000 para reserva de emergência")).toBe("Reserva emergência");
  });

  it("extrai nome livre", () => {
    expect(parseGoalName("meta: bicicleta nova 1200")).toBe("Bicicleta nova");
  });

  it("devolve null quando não há nome útil", () => {
    expect(parseGoalName("quero guardar 500 reais até dezembro")).toBeNull();
    expect(parseGoalName("meta de 500")).toBeNull();
  });
});
