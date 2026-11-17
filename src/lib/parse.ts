import type { CategoryId } from "../types";
import { matchKeyword } from "./categories";
import {
  addMonths,
  fromISODate,
  lastDayOfMonth,
  MONTH_NAMES,
  toISODate,
} from "./dates";

/** Minúsculas, sem acentos e sem pontuação — usado para casar palavras-chave. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const NOISE = new Set([
  "gastei",
  "gastar",
  "gasto",
  "gastos",
  "paguei",
  "pagar",
  "pago",
  "comprei",
  "comprar",
  "foi",
  "foram",
  "deu",
  "custou",
  "custa",
  "valor",
  "total",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "no",
  "na",
  "nos",
  "nas",
  "num",
  "numa",
  "em",
  "com",
  "por",
  "para",
  "pra",
  "pro",
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "uns",
  "umas",
  "e",
  "ai",
  "la",
  "aqui",
  "hoje",
  "ontem",
  "anteontem",
  "agora",
  "meu",
  "minha",
  "meus",
  "minhas",
  "que",
  "so",
  "apenas",
  "tipo",
  "coisa",
  "reais",
  "real",
  "conto",
  "contos",
  "pila",
  "mangos",
  "mango",
  "r",
  "rs",
  "mil",
  "meta",
  "objetivo",
  "quero",
  "queria",
  "pretendo",
  "preciso",
  "vou",
  "guardar",
  "poupar",
  "economizar",
  "juntar",
  "guardei",
  "poupei",
  "economizei",
  "separei",
  "depositei",
  "coloquei",
  "botei",
]);

const WORD_NUMBERS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
  mil: 1000,
};

const CURRENCY_AFTER = /^\s*(?:reais|real|conto|contos|pila|mangos?)\b/;
const DURATION_AFTER = /^\s*(?:pessoas?|dias?|meses?|semanas?|parcelas?|anos?|vezes?)\b/;

/** Converte "1.234,56", "35.50", "1.200" em número. */
function parseNumberToken(raw: string): number | null {
  const token = raw.replace(/[^\d.,]/g, "");
  if (!token) return null;

  if (token.includes(",")) {
    const value = Number(token.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(value) ? value : null;
  }

  const parts = token.split(".");
  if (parts.length > 2) {
    const value = Number(parts.join(""));
    return Number.isFinite(value) ? value : null;
  }
  if (parts.length === 2) {
    // 1.200 = mil e duzentos; 35.50 = trinta e cinco e cinquenta
    const value = parts[1].length === 3 ? Number(parts.join("")) : Number(token);
    return Number.isFinite(value) ? value : null;
  }

  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

/** Esconde datas e horários para não confundi-los com valores. */
function maskDates(text: string, ignoreYears: boolean): string {
  let masked = text
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, " ")
    .replace(/\b\d{1,2}\s*(?:h|hs|horas)\b/g, " ")
    .replace(/\b\d{1,2}:\d{2}\b/g, " ")
    .replace(/\bdia\s+\d{1,2}\b/g, " ");
  if (ignoreYears) {
    masked = masked.replace(/\b(?:19|20)\d{2}\b/g, " ");
  }
  return masked;
}

function computeWordGroup(values: number[]): number {
  let total = 0;
  let current = 0;

  for (const value of values) {
    if (value === 0) continue;
    if (value === 1000) {
      total += (current === 0 ? 1 : current) * 1000;
      current = 0;
    } else {
      current += value;
    }
  }

  return total + current;
}

function extractWordAmount(normalized: string): number | null {
  const words = normalized.split(" ").filter(Boolean);
  const groups: Array<{ value: number; hasCurrency: boolean; single: string }> = [];
  let current: number[] = [];
  let currentWords: string[] = [];

  const flush = (nextWord: string | null) => {
    if (!current.length) return;
    const value = computeWordGroup(current);
    const hasCurrency = nextWord ? CURRENCY_AFTER.test(` ${nextWord}`) : false;
    groups.push({
      value,
      hasCurrency,
      single: currentWords.length === 1 ? currentWords[0] : "",
    });
    current = [];
    currentWords = [];
  };

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if (word in WORD_NUMBERS) {
      current.push(WORD_NUMBERS[word]);
      currentWords.push(word);
      continue;
    }
    if (word === "e" && current.length) continue;
    flush(word);
  }
  flush(null);

  const useful = groups.filter((group) => {
    if (group.value <= 0) return false;
    // "comprei um presente" não é um gasto de 1 real.
    if (group.value === 1 && !group.hasCurrency && (group.single === "um" || group.single === "uma")) {
      return false;
    }
    return true;
  });

  if (!useful.length) return null;

  const withCurrency = useful.filter((group) => group.hasCurrency);
  const chosen = (withCurrency.length ? withCurrency : useful).at(-1);
  return chosen ? chosen.value : null;
}

/**
 * Extrai o valor em centavos de uma frase.
 * Estratégia: último número "com cara de dinheiro" (moeda tem prioridade),
 * com suporte a "1.234,56", "2 mil" e números escritos.
 */
export function extractAmount(text: string, options: { ignoreYears?: boolean } = {}): number | null {
  const lower = text.toLowerCase();
  const masked = maskDates(lower, Boolean(options.ignoreYears));
  const candidates: Array<{ value: number; start: number; end: number; currency: boolean }> = [];

  for (const match of masked.matchAll(/\d+(?:[.,]\d+)*/g)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    const before = masked.slice(Math.max(0, start - 10), start);
    const after = masked.slice(end, end + 14);

    if (/^\s*(?:x|vezes|%)\b/.test(after)) continue;
    if (/^\s*(?:h|hs|horas)\b/.test(after)) continue;
    if (DURATION_AFTER.test(after)) continue;

    let value = parseNumberToken(raw);
    if (value === null || value <= 0) continue;

    if (/^\s*mil\b/.test(after)) value *= 1000;

    const currency =
      CURRENCY_AFTER.test(after) || /(?:r\$|reais|real)\s*$/.test(before);

    candidates.push({ value, start, end, currency });
  }

  if (!candidates.length) {
    const wordAmount = extractWordAmount(normalize(text));
    return wordAmount ? Math.round(wordAmount * 100) : null;
  }

  const withCurrency = candidates.filter((candidate) => candidate.currency);
  const chosen = (withCurrency.length ? withCurrency : candidates).at(-1);
  if (!chosen) return null;

  const cents = Math.round(chosen.value * 100);
  return cents > 0 ? cents : null;
}

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Texto restante depois de tirar valores, verbos e conectivos. */
export function extractDescription(text: string): string {
  const withoutValues = text
    .replace(/\br\$\s*/gi, " ")
    .replace(/\b\d+(?:[.,]\d+)*\b/g, " ")
    .replace(/\b(?:reais|real|conto|contos|pila|mangos?|mil)\b/gi, " ");

  const kept = withoutValues
    .split(/[\s,.;:!?]+/)
    .filter(Boolean)
    .filter((token) => {
      const normalized = normalize(token);
      return normalized.length > 0 && !NOISE.has(normalized) && !/^\d+$/.test(normalized);
    });

  return capitalize(kept.join(" ").slice(0, 42).trim());
}

export type ParsedEntry = {
  amount: number | null;
  category: CategoryId | null;
  /** Descrição amigável para exibir (ex.: "Táxi", "Aquele negócio"). */
  description: string;
  /** Rótulo canônico quando houve casamento de palavra-chave. */
  keywordLabel: string | null;
  /** Sobra de texto quando não houve casamento — indício de que o usuário explicou algo. */
  leftover: string;
  normalized: string;
};

export function parseEntry(text: string): ParsedEntry {
  const normalized = normalize(text);
  const keyword = matchKeyword(normalized);
  const leftover = extractDescription(text);
  const amount = extractAmount(text);

  return {
    amount,
    category: keyword?.category ?? null,
    description: keyword?.label ?? leftover,
    keywordLabel: keyword?.label ?? null,
    leftover,
    normalized,
  };
}

function buildLocalDate(year: number, monthIndex: number, day: number): Date {
  return new Date(year, monthIndex, day);
}

/** Extrai uma data limite de frases como "até 30/12", "até dezembro" ou "daqui a 3 meses". */
export function parseDeadline(text: string, now: Date): string | null {
  const normalized = normalize(text);
  const lower = text.toLowerCase();

  // Data explícita: 30/12, 30/12/2027, 30-12
  const explicit = lower.match(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/);
  if (explicit) {
    const day = Number(explicit[1]);
    const month = Number(explicit[2]);
    let year = explicit[3] ? Number(explicit[3]) : now.getFullYear();
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let date = buildLocalDate(year, month - 1, day);
      if (!explicit[3] && date.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
        date = buildLocalDate(year + 1, month - 1, day);
      }
      return toISODate(date);
    }
  }

  if (/fim do ano|virada do ano|final do ano/.test(normalized)) {
    return toISODate(new Date(now.getFullYear(), 11, 31));
  }

  if (/fim do mes|final do mes|este mes/.test(normalized)) {
    return toISODate(new Date(now.getFullYear(), now.getMonth(), lastDayOfMonth(now)));
  }

  const durationMonths = normalized.match(/(?:daqui a|em|por)\s+(\d{1,2})\s+mes(?:es)?/);
  if (durationMonths) {
    const target = addMonths(now, Number(durationMonths[1]));
    return toISODate(new Date(target.getFullYear(), target.getMonth(), lastDayOfMonth(target)));
  }

  const durationDays = normalized.match(/(?:daqui a|em|por)\s+(\d{1,3})\s+(?:dias?|semanas?)/);
  if (durationDays) {
    const raw = normalized.match(/\d{1,3}\s+semanas?/) ? Number(durationDays[1]) * 7 : Number(durationDays[1]);
    const target = new Date(now);
    target.setDate(target.getDate() + raw);
    return toISODate(target);
  }

  const monthIndex = MONTH_NAMES.findIndex((month) => normalized.includes(month));
  if (monthIndex >= 0) {
    const dayMatch = normalized.match(new RegExp(`(\\d{1,2})\\s+(?:de\\s+)?${MONTH_NAMES[monthIndex]}`));
    let year = now.getFullYear();
    if (monthIndex < now.getMonth()) year += 1;
    const day = dayMatch ? Math.min(Number(dayMatch[1]), new Date(year, monthIndex + 1, 0).getDate()) : null;
    const date = new Date(year, monthIndex, day ?? new Date(year, monthIndex + 1, 0).getDate());
    return toISODate(date);
  }

  const dayOnly = normalized.match(/(?:dia|ate|para)\s+(\d{1,2})\b/);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    if (day >= 1 && day <= 31) {
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDayOfMonth(now)));
      if (thisMonth.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) {
        return toISODate(thisMonth);
      }
      const next = addMonths(now, 1);
      return toISODate(new Date(next.getFullYear(), next.getMonth(), Math.min(day, lastDayOfMonth(next))));
    }
  }

  return null;
}

/** Tenta extrair um nome para a meta ("... para a viagem" → "Viagem"). */
export function parseGoalName(text: string): string | null {
  const tokens = text.split(/[\s,.;:!?]+/).filter(Boolean);
  const normalizedTokens = tokens.map((token) => normalize(token));

  const stopwords = new Set([
    "de",
    "do",
    "da",
    "dos",
    "das",
    "o",
    "a",
    "os",
    "as",
    "um",
    "uma",
    "para",
    "pra",
    "pro",
    "ate",
    "dia",
    "dias",
    "mes",
    "meses",
    "ano",
    "anos",
    "semana",
    "semanas",
    "meta",
    "objetivo",
    "quero",
    "queria",
    "vou",
    "pretendo",
    "preciso",
    "guardar",
    "poupar",
    "economizar",
    "juntar",
    "reais",
    "real",
    "e",
    "em",
    "no",
    "na",
    ...MONTH_NAMES.map((month) => normalize(month)),
  ]);

  const cleanup = (raw: string): string => {
    const kept = raw
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => {
        const normalized = normalize(token);
        return normalized.length > 0 && !stopwords.has(normalized) && !/^\d+$/.test(normalized);
      });
    return capitalize(kept.slice(0, 4).join(" ").trim());
  };

  const prepositionIndex = normalizedTokens.findIndex((token) =>
    token === "para" || token === "pra" || token === "pro",
  );

  if (prepositionIndex >= 0) {
    const rest = tokens.slice(prepositionIndex + 1);
    const restNormalized = normalizedTokens.slice(prepositionIndex + 1);
    const breakIndex = restNormalized.findIndex((token) =>
      ["ate", "dia", "dias", "em", "no", "na"].includes(token),
    );
    const name = cleanup((breakIndex >= 0 ? rest.slice(0, breakIndex) : rest).join(" "));
    if (name.length >= 2) return name;
  }

  const freeName = cleanup(text);
  return freeName.length >= 3 ? freeName : null;
}


export function isISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(fromISODate(value).getTime());
}
