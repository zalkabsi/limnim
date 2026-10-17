import { DateTime } from "luxon";
import { formatPropertyTime } from "@/lib/dates/property-time";
import type { Booking, FinancialOutcome, ResolvedRule } from "@/types/policy";

const chart = { left: 54, right: 944, top: 30, bottom: 192 };

function xPosition(timeMs: number, minMs: number, maxMs: number): number {
  return chart.left + ((timeMs - minMs) / (maxMs - minMs)) * (chart.right - chart.left);
}

function refundY(penaltyPercent: string): number {
  const refundPercent = 100 - Number(penaltyPercent);
  return chart.top + ((100 - refundPercent) / 100) * (chart.bottom - chart.top);
}

function thresholdLabel(timeMs: number, zone: string): string {
  return DateTime.fromMillis(timeMs, { zone }).toFormat("LLL d · h:mm a");
}

export function TimelineChart({
  booking,
  rules,
  selectedMs,
  onChange,
  minMs,
  maxMs,
  endLabel,
  outcome,
}: {
  booking: Booking;
  rules: ResolvedRule[];
  selectedMs: number;
  onChange: (value: number) => void;
  minMs: number;
  maxMs: number;
  endLabel: string;
  outcome: FinancialOutcome;
}) {
  const visibleRules = rules.filter((rule) => rule.deadlineMs > minMs && rule.deadlineMs < maxMs);
  let previousY = refundY("0");
  let linePath = `M ${chart.left} ${previousY}`;
  for (const rule of visibleRules) {
    const x = xPosition(rule.deadlineMs, minMs, maxMs);
    const nextY = refundY(rule.penaltyPercent);
    linePath += ` L ${x} ${previousY} L ${x} ${nextY}`;
    previousY = nextY;
  }
  linePath += ` L ${chart.right} ${previousY}`;
  const areaPath = `${linePath} L ${chart.right} ${chart.bottom} L ${chart.left} ${chart.bottom} Z`;

  return (
    <section className="card timeline-card" aria-labelledby="timeline-title" data-testid="timeline-card">
      <div className="timeline-head">
        <div>
          <p className="section-kicker">The refund curve</p>
          <h3 id="timeline-title">Your refund changes over time</h3>
        </div>
        <div className="selected-time" aria-live="polite">
          <span>Cancellation time</span>
          <strong data-testid="selected-time">{formatPropertyTime(selectedMs, booking.propertyTimeZone)}</strong>
        </div>
      </div>

      <div className="chart-wrap">
        <svg className="timeline-svg" viewBox="0 0 980 224" role="img" aria-labelledby="chart-title chart-desc" data-testid="timeline-chart">
          <title id="chart-title">Refund amount over cancellation time</title>
          <desc id="chart-desc">The potential refund steps down at each policy deadline. Teal shows the refundable amount; labels name each penalty change.</desc>
          <defs>
            <linearGradient id="refundFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#87c7ad" stopOpacity=".25" />
              <stop offset="100%" stopColor="#87c7ad" stopOpacity=".02" />
            </linearGradient>
          </defs>
          {[chart.top, chart.top + (chart.bottom - chart.top) / 2, chart.bottom].map((y, index) => (
            <g key={y}>
              <line className="chart-grid" x1={chart.left} x2={chart.right} y1={y} y2={y} />
              <text className="chart-axis" x="4" y={y + 4}>{index === 0 ? "100%" : index === 1 ? "50%" : "0%"}</text>
            </g>
          ))}
          <text className="chart-axis" x="4" y="14">Refund</text>
          <path className="chart-area" d={areaPath} />
          <path className="chart-line" d={linePath} />
          {visibleRules.map((rule) => {
            const x = xPosition(rule.deadlineMs, minMs, maxMs);
            return (
              <g key={rule.id}>
                <line className="chart-marker" x1={x} x2={x} y1={chart.top} y2={chart.bottom + 8} />
                <circle className="chart-dot" cx={x} cy={refundY(rule.penaltyPercent)} r="6" />
                <text className="chart-threshold-label" x={x} y={chart.bottom + 25} textAnchor="middle">{thresholdLabel(rule.deadlineMs, booking.propertyTimeZone)}</text>
                <text className="chart-threshold-label" x={x} y={chart.top - 8} textAnchor="middle">{rule.penaltyPercent}% penalty</text>
              </g>
            );
          })}
        </svg>
      </div>

      <ol className="deadline-list" aria-label="Policy penalty deadlines">
        {rules.map((rule) => (
          <li key={rule.id}>
            <span>{formatPropertyTime(rule.deadlineMs, booking.propertyTimeZone)}</span>
            <strong>{rule.penaltyPercent}% penalty</strong>
          </li>
        ))}
      </ol>

      <label className="sr-only" htmlFor="cancellation-time">Cancellation time</label>
      <input
        id="cancellation-time"
        className="range-control"
        type="range"
        min={minMs}
        max={maxMs}
        step={60_000}
        value={selectedMs}
        aria-valuetext={`${formatPropertyTime(selectedMs, booking.propertyTimeZone)}. Potential refund ${outcome.refund} ${booking.currency}; penalty ${outcome.penaltyPercent} percent.`}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <div className="range-caption" aria-hidden="true">
        <span>{formatPropertyTime(minMs, booking.propertyTimeZone)}</span>
        <span>{endLabel} · {formatPropertyTime(maxMs, booking.propertyTimeZone)}</span>
      </div>
      <p className="timeline-helper">Move the control or use the arrow keys to see the estimate change at each policy deadline.</p>
    </section>
  );
}
