import { describe, expect, it } from "vitest";
import { supportedRuleEvidenceIssue } from "@/lib/ai/validate-analysis";
import type { PolicyRule } from "@/types/policy";

function rule(overrides: Partial<PolicyRule> = {}): PolicyRule {
  return {
    id: "deadline-50",
    deadlineLocal: "2026-11-20T18:00",
    deadlineBoundary: "inclusive",
    penaltyPercent: "50",
    evidenceQuote: "A 50% penalty applies from November 20, 2026 at 6:00 PM.",
    interpretation: "A 50% penalty begins at the deadline.",
    status: "supported",
    ...overrides,
  };
}

describe("supported rule evidence", () => {
  it("accepts a matching full date, clock time, and penalty percentage", () => {
    expect(supportedRuleEvidenceIssue(rule(), "Asia/Tokyo")).toBeNull();
  });

  it("distinguishes inclusive wording from a strictly-after deadline", () => {
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies on or after November 20, 2026 at 6:00 PM.",
      deadlineBoundary: "inclusive",
    }), "Asia/Tokyo")).toBeNull();
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies after November 20, 2026 at 6:00 PM.",
      deadlineBoundary: "exclusive",
    }), "Asia/Tokyo")).toBeNull();
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies after November 20, 2026 at 6:00 PM.",
      deadlineBoundary: "inclusive",
    }), "Asia/Tokyo")).toMatch(/whether this penalty applies at the exact deadline/i);
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies on November 20, 2026 at 6:00 PM.",
      deadlineBoundary: "unclear",
    }), "Asia/Tokyo")).toMatch(/whether this penalty applies at the exact deadline/i);
  });

  it("accepts explicit 24-hour times and rejects bare ambiguous clock times", () => {
    expect(supportedRuleEvidenceIssue(rule({
      deadlineLocal: "2026-11-20T18:00",
      evidenceQuote: "A 50% penalty applies from November 20, 2026 at 18:00.",
    }), "Asia/Tokyo")).toBeNull();
    expect(supportedRuleEvidenceIssue(rule({
      deadlineLocal: "2026-11-20T18:00",
      evidenceQuote: "A 50% penalty applies from November 20, 2026 at 6:00.",
    }), "Asia/Tokyo")).toMatch(/complete date and time/i);
  });

  it("accepts the property's matching named time zone", () => {
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies from November 20, 2026 at 6:00 PM JST.",
    }), "Asia/Tokyo")).toBeNull();
  });

  it("rejects a deadline whose year or time is missing from the quote", () => {
    expect(supportedRuleEvidenceIssue(rule({ evidenceQuote: "A 50% penalty applies from November 20 at 6:00 PM." }), "Asia/Tokyo"))
      .toMatch(/complete date and time/i);
  });

  it("rejects a model date that differs from the source excerpt", () => {
    expect(supportedRuleEvidenceIssue(rule({
      deadlineLocal: "2026-11-21T18:00",
      evidenceQuote: "A 50% penalty applies from November 20, 2026 at 6:00 PM.",
    }), "Asia/Tokyo")).toMatch(/complete date and time/i);
  });

  it("rejects a penalty percentage that is not in the quote", () => {
    expect(supportedRuleEvidenceIssue(rule({
      penaltyPercent: "40",
    }), "Asia/Tokyo")).toMatch(/does not confirm this percentage/i);
  });

  it("rejects a refund percentage presented as a cancellation penalty", () => {
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "Cancellations on or after November 20, 2026 at 6:00 PM receive a 50% refund.",
    }), "Asia/Tokyo")).toMatch(/as a penalty/i);
  });

  it("rejects a penalty attached to cancellations before the proposed deadline", () => {
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies to cancellations before November 20, 2026 at 6:00 PM.",
    }), "Asia/Tokyo")).toMatch(/tie this penalty to the deadline/i);
  });

  it("rejects a quote that mentions a penalty and deadline without linking them", () => {
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies. The deadline is November 20, 2026 at 6:00 PM.",
    }), "Asia/Tokyo")).toMatch(/tie this penalty to the deadline/i);
  });

  it("allows a whole-booking non-refundable threshold but rejects partial scopes", () => {
    const nonRefundable = rule({
      deadlineLocal: "2026-11-20T18:00",
      penaltyPercent: "100",
      evidenceQuote: "From November 20, 2026 at 6:00 PM the entire booking is non-refundable.",
    });
    expect(supportedRuleEvidenceIssue(nonRefundable, "Asia/Tokyo")).toBeNull();
    expect(supportedRuleEvidenceIssue(rule({
      ...nonRefundable,
      evidenceQuote: "From November 20, 2026 at 6:00 PM the first night is non-refundable.",
    }), "Asia/Tokyo")).toMatch(/does not confirm this percentage/i);
    expect(supportedRuleEvidenceIssue(rule({
      ...nonRefundable,
      evidenceQuote: "From November 20, 2026 at 6:00 PM a 100% penalty applies to one night's room rate.",
    }), "Asia/Tokyo")).toMatch(/does not confirm this percentage/i);
  });

  it("rejects counted-night penalties and fixed fees in supported currencies", () => {
    const unsupportedQuotes = [
      "A 50% penalty applies from November 20, 2026 at 6:00 PM and covers only the first two nights.",
      "A 50% penalty applies from November 20, 2026 at 6:00 PM, then a ¥500 fee is charged.",
      "A 50% penalty applies from November 20, 2026 at 6:00 PM, plus a fixed fee of 500 yen.",
    ];

    for (const evidenceQuote of unsupportedQuotes) {
      expect(supportedRuleEvidenceIssue(rule({ evidenceQuote }), "Asia/Tokyo"))
        .toMatch(/does not confirm this percentage as a penalty for the full booking amount/i);
    }
  });

  it("rejects a time-zone abbreviation that conflicts with the property", () => {
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies from November 20, 2026 at 6:00 PM PST.",
    }), "Asia/Tokyo")).toMatch(/time zone or UTC offset/i);
  });

  it("rejects ambiguous and unrecognized time-zone abbreviations", () => {
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies from November 20, 2026 at 6:00 PM CST.",
    }), "America/Chicago")).toMatch(/time zone or UTC offset/i);
    expect(supportedRuleEvidenceIssue(rule({
      evidenceQuote: "A 50% penalty applies from November 20, 2026 at 6:00 PM IST.",
    }), "Asia/Tokyo")).toMatch(/time zone or UTC offset/i);
  });
});
