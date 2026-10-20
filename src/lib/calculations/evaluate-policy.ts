import Decimal from "decimal.js";
import { calculatePenalty, calculateRefund } from "@/lib/calculations/money";
import { resolvePropertyTime } from "@/lib/dates/property-time";
import type { FinancialOutcome, PolicyAnalysis, PolicyRule, ResolvedRule } from "@/types/policy";

type RuleResolution = {
  rules: ResolvedRule[];
  unresolvedRules: PolicyRule[];
  unresolvedIssues: string[];
};

export function resolveRules(
  analysis: PolicyAnalysis,
  propertyTimeZone: string,
): RuleResolution {
  const unresolvedIssues = [...analysis.unresolvedIssues];
  const rules: ResolvedRule[] = [];
  const unresolvedRules: PolicyRule[] = [];

  for (const rule of analysis.rules) {
    if (rule.status !== "supported") {
      const issue = rule.issue ?? `Clarification is needed for: ${rule.evidenceQuote}`;
      unresolvedIssues.push(issue);
      unresolvedRules.push({ ...rule, status: "needs_clarification", issue });
      continue;
    }
    if (rule.deadlineBoundary === "unclear") {
      const issue = `The policy wording does not establish whether the penalty applies at or only after “${rule.deadlineLocal}”.`;
      unresolvedIssues.push(issue);
      unresolvedRules.push({ ...rule, status: "needs_clarification", issue });
      continue;
    }
    const resolved = resolvePropertyTime(rule.deadlineLocal, propertyTimeZone);
    if (!resolved.ok) {
      const issue = `Could not resolve “${rule.deadlineLocal}” (${resolved.error}).`;
      unresolvedIssues.push(issue);
      unresolvedRules.push({ ...rule, status: "needs_clarification", issue });
      continue;
    }
    let penaltyPercent: Decimal;
    try {
      penaltyPercent = new Decimal(rule.penaltyPercent);
    } catch {
      const issue = `Penalty percentage for “${rule.evidenceQuote}” is invalid.`;
      unresolvedIssues.push(issue);
      unresolvedRules.push({ ...rule, status: "needs_clarification", issue });
      continue;
    }
    if (!penaltyPercent.isFinite() || penaltyPercent.lt(0) || penaltyPercent.gt(100)) {
      const issue = `Penalty percentage for “${rule.evidenceQuote}” must be between 0 and 100.`;
      unresolvedIssues.push(issue);
      unresolvedRules.push({ ...rule, status: "needs_clarification", issue });
      continue;
    }
    rules.push({ ...rule, deadlineMs: resolved.epochMs });
  }

  rules.sort((a, b) => a.deadlineMs - b.deadlineMs);
  const consistentRules: ResolvedRule[] = [];
  for (const rule of rules) {
    const previous = consistentRules.at(-1);
    if (previous && previous.deadlineMs === rule.deadlineMs) {
      if (!new Decimal(previous.penaltyPercent).eq(rule.penaltyPercent) || previous.deadlineBoundary !== rule.deadlineBoundary) {
        const issue = "Conflicting penalty terms apply at the same local deadline.";
        unresolvedIssues.push(issue);
        return {
          rules: [],
          unresolvedIssues: [...new Set(unresolvedIssues)],
          unresolvedRules: [...unresolvedRules, ...rules.map((candidate) => ({ ...candidate, status: "needs_clarification" as const, issue }))],
        };
      }
      continue;
    }
    if (previous && new Decimal(rule.penaltyPercent).lt(previous.penaltyPercent)) {
      const issue = "Penalty percentages must not decrease at later deadlines.";
      unresolvedIssues.push(issue);
      return {
        rules: [],
        unresolvedIssues: [...new Set(unresolvedIssues)],
        unresolvedRules: [...unresolvedRules, ...rules.map((candidate) => ({ ...candidate, status: "needs_clarification" as const, issue }))],
      };
    }
    consistentRules.push(rule);
  }

  return { rules: consistentRules, unresolvedRules, unresolvedIssues: [...new Set(unresolvedIssues)] };
}

export function evaluatePolicy(
  amount: string,
  currency: string,
  rules: ResolvedRule[],
  selectedMs: number,
): FinancialOutcome {
  const activeRule = [...rules].reverse().find((rule) => isRuleActiveAt(rule, selectedMs));
  const nextRule = rules.find((rule) => !isRuleActiveAt(rule, selectedMs));
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

export function isRuleActiveAt(rule: ResolvedRule, selectedMs: number): boolean {
  return rule.deadlineBoundary === "inclusive"
    ? rule.deadlineMs <= selectedMs
    : rule.deadlineBoundary === "exclusive" && rule.deadlineMs < selectedMs;
}

export function ruleEffectiveMs(rule: ResolvedRule): number {
  return rule.deadlineBoundary === "exclusive" ? rule.deadlineMs + 1 : rule.deadlineMs;
}
