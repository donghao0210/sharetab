import { defaultLocale, type Locale } from "@/i18n/routing";

const moneyLocales: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  sv: "sv-SE",
  fr: "fr-FR",
  de: "de-DE",
  "pt-BR": "pt-BR",
  ja: "ja-JP",
  "zh-CN": "zh-CN",
  ko: "ko-KR",
} satisfies Record<Locale, string>;

export function formatCents(cents: number, currency = "USD", locale: string = defaultLocale): string {
  const safeLocale = moneyLocales[locale] ?? locale;
  try {
    return new Intl.NumberFormat(safeLocale, {
      style: "currency",
      currency: normalizeCurrencyCode(currency),
    }).format(cents / 100);
  } catch {
    return new Intl.NumberFormat(safeLocale, {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }
}

const CURRENCY_SYMBOL_TO_ISO: Record<string, string> = {
  RM: "MYR",
  S$: "SGD",
  HK$: "HKD",
  NT$: "TWD",
  A$: "AUD",
  C$: "CAD",
  NZ$: "NZD",
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₹": "INR",
  "₽": "RUB",
  "₩": "KRW",
};

/**
 * Map common receipt symbols to their ISO 4217 currency codes.
 * Returns the input unchanged if it's already a 3-letter code.
 */
export function normalizeCurrencyCode(input: string): string {
  if (!input) return "USD";
  const trimmed = input.trim();
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper;
  return CURRENCY_SYMBOL_TO_ISO[trimmed] ?? CURRENCY_SYMBOL_TO_ISO[upper] ?? "USD";
}

export function parseToCents(value: string): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}
