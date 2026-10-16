import Decimal from "decimal.js";

export function currencyFractionDigits(currency: string): number {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function calculatePenalty(amount: string, penaltyPercent: string, currency: string): string {
  const fractionDigits = currencyFractionDigits(currency);
  return new Decimal(amount)
    .mul(penaltyPercent)
    .div(100)
    .toDecimalPlaces(fractionDigits, Decimal.ROUND_HALF_UP)
    .toFixed(fractionDigits);
}

export function calculateRefund(amount: string, penalty: string, currency: string): string {
  const fractionDigits = currencyFractionDigits(currency);
  return new Decimal(amount).minus(penalty).toFixed(fractionDigits);
}

export function formatMoney(amount: string, currency: string): string {
  const fractionDigits = currencyFractionDigits(currency);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(new Decimal(amount).toNumber());
}
