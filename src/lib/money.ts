/** Converte o texto digitado em reais para centavos. */
export function parseMoneyInput(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = normalized.split(".");
    if (parts.length > 2 || (parts[1] && parts[1].length === 3)) {
      normalized = parts.join("");
    }
  }

  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const cents = Math.round(amount * 100);
  return cents > 0 ? cents : null;
}

export function moneyInputValue(cents: number | null): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
