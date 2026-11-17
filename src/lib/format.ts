const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 0,
});

/** R$ 1.234,56 */
export function brl(cents: number): string {
  return brlFormatter.format(cents / 100);
}

/** 1.234,56 reais — usado nas respostas do agente, como no PRD. */
export function moneyText(cents: number): string {
  return `${decimalFormatter.format(cents / 100)} reais`;
}

/** 1.234,56 */
export function amountText(cents: number): string {
  return decimalFormatter.format(cents / 100);
}

/** 1.234 */
export function integerText(value: number): string {
  return compactFormatter.format(value);
}

/** 42% */
export function percent(value: number): string {
  const rounded = Math.round(value);
  return `${rounded}%`;
}

export function plural(value: number, singular: string, pluralForm: string): string {
  return value === 1 ? singular : pluralForm;
}
