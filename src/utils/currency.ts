import type { Currency } from "@/types";

const LOCALES: Record<Currency, string> = {
  ARS: "es-AR",
  EUR: "de-DE",
  USD: "en-US",
};

export function formatCurrency(
  amount: number | string,
  currency: Currency = "ARS"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num);
}
