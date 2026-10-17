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

  it("leaves every amount unresolved when penalty rates decrease over time", () => {
    const inconsistent = {
      rules: [
        { ...tokyoAnalysis.rules[0], deadlineLocal: "2026-11-20T18:00", penaltyPercent: "50" },
        { ...tokyoAnalysis.rules[1], deadlineLocal: "2026-11-24T15:00", penaltyPercent: "25" },
      ],
      unresolvedIssues: [],
    };
    const result = resolveRules(inconsistent, "Asia/Tokyo");

    expect(result.rules).toEqual([]);
    expect(result.unresolvedIssues).toContain("Penalty percentages must not decrease at later deadlines.");
  });

  it("rejects conflicting rates at the same deadline and collapses exact duplicates", () => {
    const atSameTime = [
      { ...tokyoAnalysis.rules[0], id: "first", deadlineLocal: "2026-11-20T18:00", penaltyPercent: "50" },
      { ...tokyoAnalysis.rules[1], id: "second", deadlineLocal: "2026-11-20T18:00", penaltyPercent: "100" },
    ];
    const conflict = resolveRules({ rules: atSameTime, unresolvedIssues: [] }, "Asia/Tokyo");
    expect(conflict.rules).toEqual([]);
    expect(conflict.unresolvedIssues[0]).toMatch(/same local deadline/i);

    const duplicate = resolveRules({ rules: [atSameTime[0], { ...atSameTime[0], id: "duplicate" }], unresolvedIssues: [] }, "Asia/Tokyo");
    expect(duplicate.rules).toHaveLength(1);
  });

  it("does not resolve clarification-needed rules into thresholds", () => {
    const unresolved = {
      rules: [{ ...tokyoAnalysis.rules[0], status: "needs_clarification" as const, issue: "The year is missing." }],
      unresolvedIssues: [],
    };
    const result = resolveRules(unresolved, "Asia/Tokyo");
    expect(result.rules).toEqual([]);
    expect(result.unresolvedIssues).toContain("The year is missing.");
  });
});
