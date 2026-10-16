import Decimal from "decimal.js";
import { calculatePenalty, calculateRefund } from "@/lib/calculations/money";
import { resolvePropertyTime } from "@/lib/dates/property-time";
import type { FinancialOutcome, PolicyAnalysis, ResolvedRule } from "@/types/policy";

export function resolveRules(
  analysis: PolicyAnalysis,
  propertyTimeZone: string,
): { rules: ResolvedRule[]; unresolvedIssues: string[] } {
  const unresolvedIssues = [...analysis.unresolvedIssues];
  const rules: ResolvedRule[] = [];

  for (const rule of analysis.rules) {
    if (rule.status !== "supported") {
      unresolvedIssues.push(rule.issue ?? `Clarification is needed for: ${rule.evidenceQuote}`);
      continue;
    }
    const resolved = resolvePropertyTime(rule.deadlineLocal, propertyTimeZone);
    if (!resolved.ok) {
      unresolvedIssues.push(`Could not resolve “${rule.deadlineLocal}” (${resolved.error}).`);
      continue;
    }
    rules.push({ ...rule, deadlineMs: resolved.epochMs });
  }

  rules.sort((a, b) => a.deadlineMs - b.deadlineMs);
  for (let index = 1; index < rules.length; index += 1) {
    if (new Decimal(rules[index].penaltyPercent).lt(rules[index - 1].penaltyPercent)) {
      unresolvedIssues.push("Penalty percentages must not decrease at later deadlines.");
      return { rules: [], unresolvedIssues };
    }
  }

  return { rules, unresolvedIssues };
}

export function evaluatePolicy(
  amount: string,
  currency: string,
  rules: ResolvedRule[],
  selectedMs: number,
): FinancialOutcome {
  const activeRule = [...rules].reverse().find((rule) => rule.deadlineMs <= selectedMs);
  const nextRule = rules.find((rule) => rule.deadlineMs > selectedMs);
  const penaltyPercent = activeRule?.penaltyPercent ?? "0";
  const penalty = calculatePenalty(amount, penaltyPercent, currency);

  return {
    refund: calculateRefund(amount, penalty, currency),
    penalty,
    penaltyPercent,
    activeRule,
    nextRule,
  };
}
