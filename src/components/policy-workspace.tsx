"use client";

import { useState } from "react";
import { FinancialSummary } from "@/components/financial-summary";
import { PolicyEvidence } from "@/components/policy-evidence";
import { SampleButton } from "@/components/sample-button";
import { TimelineChart } from "@/components/timeline-chart";
import { tokyoAnalysis, tokyoBooking, tokyoPolicyText } from "@/data/examples/tokyo-policy";
import { evaluatePolicy, resolveRules } from "@/lib/calculations/evaluate-policy";
import { formatPropertyTime, resolvePropertyTime } from "@/lib/dates/property-time";

const sample = resolveRules(tokyoAnalysis, tokyoBooking.propertyTimeZone);
const checkIn = resolvePropertyTime(tokyoBooking.checkInLocal, tokyoBooking.propertyTimeZone);
const firstThreshold = sample.rules[0]?.deadlineMs ?? 0;
const sampleMin = firstThreshold - 60 * 60 * 1000;
const sampleMax = checkIn.ok ? checkIn.epochMs : firstThreshold;

export function PolicyWorkspace() {
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [selectedMs, setSelectedMs] = useState(sampleMin);
  const outcome = evaluatePolicy(tokyoBooking.amount, tokyoBooking.currency, sample.rules, selectedMs);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="RefundCurve home">
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 17h4c3.5 0 4-10 8-10h5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
              <path d="m17 4 3 3-3 3" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          RefundCurve
        </a>
        <div className="topbar-note"><span className="status-dot" /> Hotel policy clarity</div>
      </header>

      <main className="main-content" id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">A clearer way to decide</p>
            <h1 id="hero-title">Know what cancellation could cost, <span>at every deadline.</span></h1>
            <p className="hero-copy">Hotel policies are hard to read when money is on the line. RefundCurve turns the important dates into one clear timeline, with each change tied back to the policy.</p>
          </div>
          <aside className="hero-aside">
            <strong>Built for confidence, not guesswork</strong>
            Every estimate stays linked to its source text. Unsupported policy details are surfaced instead of being filled in.
          </aside>
        </section>

        <section className="sample-card" aria-label="Try the example booking">
          <div>
            <p className="sample-label">A ready-to-explore example</p>
            <h2>See how the curve works</h2>
            <p>A fictional Tokyo hotel stay with two cancellation deadlines. Explore the exact moment the potential refund changes.</p>
          </div>
          <SampleButton onClick={() => {
            setSelectedMs(sampleMin);
            setSampleLoaded(true);
          }} />
        </section>

        {sampleLoaded ? (
          <section className="workspace" aria-label="Tokyo sample results">
            <div className="workspace-heading">
              <div>
                <p className="sample-label">Sample analysis · no AI request</p>
                <h2>Tokyo sample booking</h2>
                <p>Fictional stay · Policy shown below</p>
              </div>
              <div className="booking-meta" aria-label="Booking details">
                <span className="meta-pill">{tokyoBooking.currency} · $1,200 total</span>
                <span className="meta-pill">Check-in · {formatPropertyTime(sampleMax, tokyoBooking.propertyTimeZone)}</span>
                <span className="meta-pill">{tokyoBooking.propertyTimeZone}</span>
              </div>
            </div>

            <FinancialSummary booking={tokyoBooking} selectedMs={selectedMs} outcome={outcome} />
            <TimelineChart
              booking={tokyoBooking}
              rules={sample.rules}
              selectedMs={selectedMs}
              onChange={setSelectedMs}
              minMs={sampleMin}
              maxMs={sampleMax}
              outcome={outcome}
            />
            <PolicyEvidence rules={tokyoAnalysis.rules} />
            <div className="workspace-footer">
              <span><strong>Policy text:</strong> {tokyoPolicyText}</span>
              <span>Example only · No reservation or payment is changed</span>
            </div>
          </section>
        ) : <div className="empty-workspace" aria-live="polite" />}
      </main>
    </div>
  );
}
