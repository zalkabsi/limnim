import { formatMoney } from "@/lib/calculations/money";
import { formatPropertyTime } from "@/lib/dates/property-time";
import type { Booking, FinancialOutcome, ResolvedRule } from "@/types/policy";

function boundaryDescription(rule: ResolvedRule, propertyTimeZone: string): string {
  const relation = rule.deadlineBoundary === "inclusive" ? "on or after" : "after";
  return `This threshold applies ${relation} ${formatPropertyTime(rule.deadlineMs, propertyTimeZone)}.`;
}

export function buildGuestResponse(
  booking: Booking,
  selectedMs: number,
  outcome: FinancialOutcome,
): string {
  const selectedTime = formatPropertyTime(selectedMs, booking.propertyTimeZone);
  const evidenceRule = outcome.activeRule ?? outcome.nextRule;
  const evidenceText = evidenceRule
    ? `Policy wording: “${evidenceRule.evidenceQuote}”\n${boundaryDescription(evidenceRule, booking.propertyTimeZone)}`
    : "No supported penalty threshold was found in the supplied policy.";
  const currentRuleNote = outcome.activeRule
    ? `The active supported policy rule is ${outcome.activeRule.penaltyPercent}% of the booking total.`
    : "No supported penalty threshold has taken effect yet in the supplied policy.";

  return [
    "Limnim cancellation estimate",
    `For a cancellation at ${selectedTime}:`,
    `Booking total: ${formatMoney(booking.amount, booking.currency)}`,
    `Estimated cancellation penalty: ${formatMoney(outcome.penalty, booking.currency)} (${outcome.penaltyPercent}%).`,
    `Estimated potential refund: ${formatMoney(outcome.refund, booking.currency)}.`,
    currentRuleNote,
    evidenceText,
    "This is an estimate from the policy text and booking details provided, not a confirmed refund amount. The final amount may depend on other booking terms, fees, taxes, and hotel handling. Please confirm with the property before cancelling.",
  ].join("\n");
}
