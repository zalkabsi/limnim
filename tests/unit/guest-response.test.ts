import { describe, expect, it } from "vitest";
import { tokyoAnalysis, tokyoBooking } from "@/data/examples/tokyo-policy";
import { evaluatePolicy, resolveRules } from "@/lib/calculations/evaluate-policy";
import { resolvePropertyTime } from "@/lib/dates/property-time";
import { buildGuestResponse } from "@/lib/guest-response";

function instant(local: string): number {
  const result = resolvePropertyTime(local, tokyoBooking.propertyTimeZone);
  if (!result.ok) throw new Error(`Invalid test time: ${local}`);
  return result.epochMs;
}

describe("staff guest response", () => {
  it("includes the selected time, deterministic amounts, source quote, and estimate caveat", () => {
    const rules = resolveRules(tokyoAnalysis, tokyoBooking.propertyTimeZone).rules;
    const selectedMs = instant("2026-11-20T18:00");
    const response = buildGuestResponse(
      tokyoBooking,
      selectedMs,
      evaluatePolicy(tokyoBooking.amount, tokyoBooking.currency, rules, selectedMs),
    );

    expect(response).toContain("Fri, Nov 20, 2026 at 6:00 PM · Asia/Tokyo");
    expect(response).toContain("Estimated cancellation penalty: $600.00 (50%).");
    expect(response).toContain("Estimated potential refund: $600.00.");
    expect(response).toContain(tokyoAnalysis.rules[0]!.evidenceQuote);
    expect(response).toContain("not a confirmed refund amount");
  });

  it("makes a strict-after boundary clear in the copied wording", () => {
    const strictAnalysis = {
      rules: [{ ...tokyoAnalysis.rules[0]!, deadlineBoundary: "exclusive" as const }],
      unresolvedIssues: [],
    };
    const rules = resolveRules(strictAnalysis, tokyoBooking.propertyTimeZone).rules;
    const selectedMs = instant("2026-11-20T18:00");
    const response = buildGuestResponse(
      tokyoBooking,
      selectedMs,
      evaluatePolicy(tokyoBooking.amount, tokyoBooking.currency, rules, selectedMs),
    );

    expect(response).toContain("Estimated cancellation penalty: $0.00 (0%).");
    expect(response).toContain("This threshold applies after Fri, Nov 20, 2026 at 6:00 PM · Asia/Tokyo.");
  });
});
