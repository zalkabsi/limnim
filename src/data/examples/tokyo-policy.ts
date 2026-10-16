import type { Booking, PolicyAnalysis } from "@/types/policy";

export const tokyoBooking: Booking = {
  amount: "1200.00",
  currency: "USD",
  propertyTimeZone: "Asia/Tokyo",
  checkInLocal: "2026-11-26T15:00",
};

export const tokyoPolicyText =
  "Cancellations on or after November 20, 2026 at 6:00 PM JST incur a 50% penalty. Cancellations on or after November 24, 2026 at 3:00 PM JST are non-refundable.";

export const tokyoAnalysis: PolicyAnalysis = {
  rules: [
    {
      id: "penalty-50",
      deadlineLocal: "2026-11-20T18:00",
      penaltyPercent: "50",
      evidenceQuote:
        "Cancellations on or after November 20, 2026 at 6:00 PM JST incur a 50% penalty.",
      interpretation: "A 50% cancellation penalty begins at this time.",
      status: "supported",
    },
    {
      id: "penalty-100",
      deadlineLocal: "2026-11-24T15:00",
      penaltyPercent: "100",
      evidenceQuote:
        "Cancellations on or after November 24, 2026 at 3:00 PM JST are non-refundable.",
      interpretation: "The booking becomes non-refundable at this time.",
      status: "supported",
    },
  ],
  unresolvedIssues: [],
};
