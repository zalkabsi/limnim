import { z } from "zod";

const localDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const PolicyRuleSchema = z.object({
  id: z.string().min(1).max(60),
  deadlineLocal: z.string().max(25),
  penaltyPercent: z.string().max(12),
  evidenceQuote: z.string().max(1200),
  interpretation: z.string().trim().min(1).max(500),
  status: z.enum(["supported", "needs_clarification"]),
  issue: z.string().max(500),
}).strict().superRefine((rule, context) => {
  if (rule.status === "supported") {
    if (!localDateTimePattern.test(rule.deadlineLocal)) {
      context.addIssue({ code: "custom", path: ["deadlineLocal"], message: "Supported deadlines need a complete local date and time." });
    }
    const percent = Number(rule.penaltyPercent);
    if (!/^(?:\d+(?:\.\d+)?|)$/.test(rule.penaltyPercent) || !Number.isFinite(percent) || percent < 0 || percent > 100) {
      context.addIssue({ code: "custom", path: ["penaltyPercent"], message: "Penalty must be between 0 and 100 percent." });
    }
    if (!rule.evidenceQuote.trim()) {
      context.addIssue({ code: "custom", path: ["evidenceQuote"], message: "Supported rules need an evidence quote." });
    }
    if (rule.issue.trim()) {
      context.addIssue({ code: "custom", path: ["issue"], message: "Supported rules should not have a clarification issue." });
    }
  } else if (!rule.issue.trim()) {
    context.addIssue({ code: "custom", path: ["issue"], message: "Rules needing clarification must say what is unclear." });
  }
});

export const PolicyAnalysisSchema = z.object({
  rules: z.array(PolicyRuleSchema).max(20).superRefine((rules, context) => {
    const seenIds = new Set<string>();
    rules.forEach((rule, index) => {
      if (seenIds.has(rule.id)) {
        context.addIssue({ code: "custom", path: [index, "id"], message: "Rule identifiers must be unique." });
      }
      seenIds.add(rule.id);
    });
  }),
  unresolvedIssues: z.array(z.string().min(1).max(500)).max(40),
}).strict();

export const AnalyzeRequestSchema = z.object({
  policyText: z.string().trim().min(1, "Paste the cancellation policy.").max(15_000, "Policy text must be 15,000 characters or fewer."),
  propertyTimeZone: z.string().trim().min(1).max(100),
}).strict();

export const AnalyzeResponseSchema = z.object({
  analysis: PolicyAnalysisSchema,
}).strict();

export const cancellationAnalysisJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["rules", "unresolvedIssues"],
  properties: {
    rules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "deadlineLocal", "penaltyPercent", "evidenceQuote", "interpretation", "status", "issue"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 60 },
          deadlineLocal: { type: "string", maxLength: 25, description: "YYYY-MM-DDTHH:mm in the property's IANA time zone; empty only when it cannot be resolved from explicit policy text." },
          penaltyPercent: { type: "string", maxLength: 12, description: "A decimal percentage from 0 through 100; use 100 only when the entire booking amount is explicitly non-refundable; use an empty string if the penalty cannot be resolved." },
          evidenceQuote: { type: "string", maxLength: 1200, description: "An exact, contiguous excerpt copied verbatim from the submitted policy, or empty when no excerpt supports this candidate." },
          interpretation: { type: "string", minLength: 1, maxLength: 500 },
          status: { type: "string", enum: ["supported", "needs_clarification"] },
          issue: { type: "string", maxLength: 500, description: "Short reason the rule needs clarification, or empty for a supported rule." },
        },
      },
      maxItems: 20,
    },
    unresolvedIssues: { type: "array", items: { type: "string", minLength: 1, maxLength: 500 }, maxItems: 40 },
  },
} as const;
