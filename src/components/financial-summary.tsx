import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/calculations/money";
import { formatPropertyTime } from "@/lib/dates/property-time";
import type { Booking, FinancialOutcome } from "@/types/policy";

export function FinancialSummary({
  booking,
  selectedMs,
  outcome,
}: {
  booking: Booking;
  selectedMs: number;
  outcome: FinancialOutcome;
}) {
  return (
    <>
      <div className="summary-grid" aria-label="Estimated cancellation outcome">
        <Card className="metric-card">
          <div className="metric-label">
            <span className="metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" focusable="false">
                <path d="M7 17 17 7M8 7h9v9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            Potential refund
          </div>
          <strong className="metric-value" data-testid="refund-amount">{formatMoney(outcome.refund, booking.currency)}</strong>
          <span className="metric-sub">{100 - Number(outcome.penaltyPercent)}% of booking total</span>
        </Card>
        <Card className="metric-card">
          <div className="metric-label"><span className="metric-icon penalty" aria-hidden="true">−</span> Cancellation penalty</div>
          <strong className="metric-value" data-testid="penalty-amount">{formatMoney(outcome.penalty, booking.currency)}</strong>
          <span className="metric-sub">{outcome.penaltyPercent}% of booking total</span>
        </Card>
        <Card className="next-deadline">
          <div className="deadline-title">Next policy change</div>
          {outcome.nextRule ? (
            <>
              <strong className="deadline-time">{formatPropertyTime(outcome.nextRule.deadlineMs, booking.propertyTimeZone)}</strong>
              <span className="deadline-consequence">Penalty becomes {outcome.nextRule.penaltyPercent}%</span>
              <span className="deadline-zone">Property time · {booking.propertyTimeZone}</span>
            </>
          ) : (
            <>
              <strong className="deadline-time">No later penalty deadline</strong>
              <span className="deadline-consequence">This is the final policy period</span>
              <span className="deadline-zone">Property time · {booking.propertyTimeZone}</span>
            </>
          )}
        </Card>
      </div>
      <p className="disclaimer"><span className="disclaimer-icon" aria-hidden="true">ⓘ</span><span>Estimate based on the policy text provided. The hotel’s final refund may depend on other booking terms, taxes, and its handling of your reservation.</span></p>
      <span className="sr-only">Cancellation time: {formatPropertyTime(selectedMs, booking.propertyTimeZone)}</span>
    </>
  );
}
