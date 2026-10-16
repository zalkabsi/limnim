import { describe, expect, it } from "vitest";
import { tokyoAnalysis } from "@/data/examples/tokyo-policy";
import { evaluatePolicy, resolveRules } from "@/lib/calculations/evaluate-policy";
import { resolvePropertyTime } from "@/lib/dates/property-time";

const rules = resolveRules(tokyoAnalysis, "Asia/Tokyo").rules;

function instant(local: string): number {
  const result = resolvePropertyTime(local, "Asia/Tokyo");
  if (!result.ok) throw new Error(`Invalid test time: ${local}`);
  return result.epochMs;
}

describe("policy threshold evaluation", () => {
  it("applies a new penalty at the exact deadline", () => {
    const before = evaluatePolicy("1200", "USD", rules, instant("2026-11-20T17:59"));
    const atFirst = evaluatePolicy("1200", "USD", rules, instant("2026-11-20T18:00"));
    const beforeFinal = evaluatePolicy("1200", "USD", rules, instant("2026-11-24T14:59"));
    const atFinal = evaluatePolicy("1200", "USD", rules, instant("2026-11-24T15:00"));

    expect([before.refund, before.penalty]).toEqual(["1200.00", "0.00"]);
    expect([atFirst.refund, atFirst.penalty]).toEqual(["600.00", "600.00"]);
    expect([beforeFinal.refund, beforeFinal.penalty]).toEqual(["600.00", "600.00"]);
    expect([atFinal.refund, atFinal.penalty]).toEqual(["0.00", "1200.00"]);
  });

  it("reports the next deadline in order", () => {
    const result = evaluatePolicy("1200", "USD", rules, instant("2026-11-21T12:00"));
    expect(result.nextRule?.id).toBe("penalty-100");
    expect(result.activeRule?.id).toBe("penalty-50");
  });
});
