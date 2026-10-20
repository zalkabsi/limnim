export type DeadlineBoundary = "inclusive" | "exclusive" | "unclear";

export interface PolicyRule {
  id: string;
  deadlineLocal: string;
  deadlineBoundary: DeadlineBoundary;
  penaltyPercent: string;
  evidenceQuote: string;
  interpretation: string;
  status: "supported" | "needs_clarification";
  issue?: string;
}

export interface Booking {
  amount: string;
  currency: string;
  propertyTimeZone: string;
  checkInLocal: string;
}

export interface PolicyAnalysis {
  rules: PolicyRule[];
  unresolvedIssues: string[];
}

export interface ResolvedRule extends PolicyRule {
  deadlineMs: number;
}

export interface FinancialOutcome {
  refund: string;
  penalty: string;
  penaltyPercent: string;
  activeRule?: ResolvedRule;
  nextRule?: ResolvedRule;
}
