"use client";

import { useRef, useState } from "react";
import { BookingForm } from "@/components/booking-form";
import { FinancialSummary } from "@/components/financial-summary";
import { GuestResponse } from "@/components/guest-response";
import { PolicyEvidence } from "@/components/policy-evidence";
import { SampleButton } from "@/components/sample-button";
import { TimelineChart } from "@/components/timeline-chart";
import { tokyoAnalysis, tokyoBooking, tokyoPolicyText } from "@/data/examples/tokyo-policy";
import { AnalyzeResponseSchema } from "@/lib/ai/schema";
import { evaluatePolicy, resolveRules } from "@/lib/calculations/evaluate-policy";
import { formatPropertyTime, resolvePropertyTime } from "@/lib/dates/property-time";
import { BookingInputSchema, type BookingInput } from "@/lib/validation/booking";
import type { Booking, PolicyAnalysis, ResolvedRule } from "@/types/policy";

const sample = resolveRules(tokyoAnalysis, tokyoBooking.propertyTimeZone);
const isSampleDemo = process.env.NEXT_PUBLIC_SAMPLE_DEMO === "true";
const checkIn = resolvePropertyTime(tokyoBooking.checkInLocal, tokyoBooking.propertyTimeZone);
const firstThreshold = sample.rules[0]?.deadlineMs ?? 0;
const sampleMin = firstThreshold - 60 * 60 * 1000;
const sampleMax = checkIn.ok ? checkIn.epochMs : firstThreshold;

type LiveResult = {
  booking: Booking;
  analysis: PolicyAnalysis;
  rules: ResolvedRule[];
  unresolvedIssues: string[];
  contextNotes: string[];
  isCalculable: boolean;
  minMs: number;
  maxMs: number;
  endLabel: string;
  selectedMs: number;
};

function apiErrorMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("error" in payload)) return null;
  const error = payload.error;
  if (typeof error !== "object" || error === null || !("message" in error)) return null;
  return typeof error.message === "string" ? error.message : null;
}

export function PolicyWorkspace() {
  const activeAnalysisRef = useRef<AbortController | null>(null);
  const [sampleLoaded, setSampleLoaded] = useState(isSampleDemo);
  const [selectedMs, setSelectedMs] = useState(sampleMin);
  const [liveResult, setLiveResult] = useState<LiveResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const outcome = evaluatePolicy(tokyoBooking.amount, tokyoBooking.currency, sample.rules, selectedMs);

  async function analyzePolicy(policyText: string, input: BookingInput) {
    const bookingCheck = BookingInputSchema.safeParse(input);
    if (!bookingCheck.success) {
      setAnalysisError(bookingCheck.error.issues[0]?.message ?? "Check the booking details and try again.");
      return;
    }

    setSampleLoaded(false);
    setLiveResult(null);
    setAnalysisError(null);
    setIsAnalyzing(true);
    activeAnalysisRef.current?.abort();
    const controller = new AbortController();
    activeAnalysisRef.current = controller;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        // Amount and currency stay in this component and are never sent to the API.
        body: JSON.stringify({ policyText, propertyTimeZone: bookingCheck.data.propertyTimeZone }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(apiErrorMessage(payload) ?? "We couldn't analyze this policy. Please try again.");
      }

      const parsed = AnalyzeResponseSchema.parse(payload);
      const resolved = resolveRules(parsed.analysis, bookingCheck.data.propertyTimeZone);
      const unresolvedById = new Map(resolved.unresolvedRules.map((rule) => [rule.id, rule]));
      const baseDisplayAnalysis: PolicyAnalysis = {
        ...parsed.analysis,
        rules: parsed.analysis.rules.map((rule) => {
          const unresolved = unresolvedById.get(rule.id);
          return unresolved ? { ...rule, status: "needs_clarification", issue: unresolved.issue } : rule;
        }),
      };
      const contextNotes: string[] = [];
      const firstRule = resolved.rules[0];
      const lastRule = resolved.rules.at(-1);

      if (!firstRule || !lastRule) {
        setLiveResult({
          booking: bookingCheck.data,
          analysis: baseDisplayAnalysis,
          rules: resolved.rules,
          unresolvedIssues: resolved.unresolvedIssues,
          contextNotes,
          isCalculable: false,
          minMs: 0,
          maxMs: 0,
          endLabel: "Last supported deadline",
          selectedMs: 0,
        });
        return;
      }

      const checkInResult = bookingCheck.data.checkInLocal
        ? resolvePropertyTime(bookingCheck.data.checkInLocal, bookingCheck.data.propertyTimeZone)
        : null;
      const validCheckIn = checkInResult?.ok ? checkInResult.epochMs : null;
      const postCheckInRules = validCheckIn === null
        ? []
        : resolved.rules.filter((rule) => rule.deadlineMs > validCheckIn);
      if (checkInResult && !checkInResult.ok) {
        contextNotes.push(`Check-in time could not be resolved (${checkInResult.error}); the timeline ends at the last supported deadline.`);
      }
      if (validCheckIn !== null && validCheckIn < lastRule.deadlineMs) {
        contextNotes.push("At least one cancellation deadline falls after check-in. This prototype does not model post-check-in cancellations or no-show charges, so it cannot calculate a refund estimate for this policy and booking.");
      } else if (validCheckIn === lastRule.deadlineMs) {
        contextNotes.push("Check-in coincides with the last supported cancellation deadline; the timeline ends at check-in.");
      }
      if (!bookingCheck.data.checkInLocal) {
        contextNotes.push("Check-in was not provided, so the timeline ends at the last supported deadline.");
      }

      const postCheckInRuleIds = new Set(postCheckInRules.map((rule) => rule.id));
      const displayAnalysis: PolicyAnalysis = {
        ...baseDisplayAnalysis,
        rules: baseDisplayAnalysis.rules.map((rule) => {
          if (rule.status !== "supported" || !postCheckInRuleIds.has(rule.id)) return rule;
          return {
            ...rule,
            status: "needs_clarification",
            issue: "This cancellation deadline occurs after the supplied check-in time; post-check-in cancellation terms are outside this prototype's supported scope.",
          };
        }),
      };

      const proposedMin = firstRule.deadlineMs - 24 * 60 * 60 * 1000;
      const postThresholdMinute = lastRule.deadlineBoundary === "exclusive" ? 60_000 : 0;
      const finalTimelineMs = lastRule.deadlineMs + postThresholdMinute;
      const endsAtCheckIn = validCheckIn !== null && validCheckIn <= finalTimelineMs;
      const maxMs = endsAtCheckIn ? validCheckIn : finalTimelineMs;
      const minMs = Math.min(proposedMin, maxMs);
      const endLabel = endsAtCheckIn
        ? "Check-in"
        : lastRule.deadlineBoundary === "exclusive" ? "After last supported deadline" : "Last supported deadline";
      setLiveResult({
        booking: bookingCheck.data,
        analysis: displayAnalysis,
        rules: resolved.rules,
        unresolvedIssues: resolved.unresolvedIssues,
        contextNotes,
        isCalculable: resolved.unresolvedIssues.length === 0 && postCheckInRules.length === 0,
        minMs,
        maxMs,
        endLabel,
        selectedMs: minMs,
      });
    } catch (error) {
      if (!controller.signal.aborted) {
        setAnalysisError(error instanceof Error ? error.message : "We couldn't analyze this policy. Check your connection and try again.");
      }
    } finally {
      if (activeAnalysisRef.current === controller) {
        activeAnalysisRef.current = null;
        setIsAnalyzing(false);
      }
    }
  }

  function loadSample() {
    activeAnalysisRef.current?.abort();
    activeAnalysisRef.current = null;
    setIsAnalyzing(false);
    setLiveResult(null);
    setAnalysisError(null);
    setSelectedMs(sampleMin);
    setSampleLoaded(true);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Limnim home">
          <span className="brand-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 17h4c3.5 0 4-10 8-10h5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
              <path d="m17 4 3 3-3 3" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Limnim
        </a>
        <div className="topbar-note"><span className="status-dot" /> Hotel policy support</div>
      </header>

      <main className="main-content" id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div>
            <p className="eyebrow">A clearer answer for every guest</p>
            <h1 id="hero-title">Answer cancellation questions, <span>with evidence.</span></h1>
            <p className="hero-copy">Limnim turns hotel cancellation terms into a verified refund timeline and a ready-to-review guest reply, so staff can explain the estimate and point to the exact policy wording.</p>
          </div>
          <aside className="hero-aside">
            <strong>Built for confidence, not guesswork</strong>
            Every estimate stays linked to its source text. Unsupported policy details are surfaced instead of being filled in.
          </aside>
        </section>

        {isSampleDemo && (
          <aside className="demo-mode-banner" aria-label="Public sample demo">
            <strong>Interactive sample demo</strong>
            <span>This preview uses fictional Tokyo data. Live policy analysis is turned off.</span>
          </aside>
        )}

        {!isSampleDemo && <BookingForm isAnalyzing={isAnalyzing} error={analysisError} onAnalyze={analyzePolicy} />}

        {!isSampleDemo && (
          <section className="sample-card" aria-label="Try the example booking">
            <div>
              <p className="sample-label">A ready-to-explore example</p>
              <h2>See how the curve works</h2>
              <p>A fictional Tokyo hotel stay with two cancellation deadlines. Explore the exact moment the potential refund changes.</p>
            </div>
            <SampleButton onClick={loadSample} />
          </section>
        )}

        {sampleLoaded && (
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
            <GuestResponse booking={tokyoBooking} selectedMs={selectedMs} outcome={outcome} />
            <TimelineChart
              booking={tokyoBooking}
              rules={sample.rules}
              selectedMs={selectedMs}
              onChange={setSelectedMs}
              minMs={sampleMin}
              maxMs={sampleMax}
              endLabel="Check-in"
              outcome={outcome}
            />
            <PolicyEvidence rules={tokyoAnalysis.rules} sourceLabel="Quoted from the sample policy" />
            <div className="workspace-footer">
              <span><strong>Policy text:</strong> {tokyoPolicyText}</span>
              <span>Example only · No reservation or payment is changed</span>
            </div>
          </section>
        )}

        {liveResult && (
          <section className="workspace" aria-label="Live policy analysis">
            <div className="workspace-heading">
              <div>
                <p className="sample-label">Live analysis · evidence checked</p>
                <h2>Your cancellation estimate</h2>
                <p>Based on the policy you submitted</p>
              </div>
              <div className="booking-meta" aria-label="Booking details">
                <span className="meta-pill">{liveResult.booking.currency} · {liveResult.booking.amount} total</span>
                {liveResult.booking.checkInLocal && <span className="meta-pill">Check-in · {liveResult.booking.checkInLocal.replace("T", " ")}</span>}
                <span className="meta-pill">{liveResult.booking.propertyTimeZone}</span>
              </div>
            </div>

            {liveResult.isCalculable && liveResult.rules.length > 0 ? (() => {
              const liveOutcome = evaluatePolicy(liveResult.booking.amount, liveResult.booking.currency, liveResult.rules, liveResult.selectedMs);
              return (
                <>
                  <FinancialSummary booking={liveResult.booking} selectedMs={liveResult.selectedMs} outcome={liveOutcome} />
                  <GuestResponse booking={liveResult.booking} selectedMs={liveResult.selectedMs} outcome={liveOutcome} />
                  <TimelineChart
                    booking={liveResult.booking}
                    rules={liveResult.rules}
                    selectedMs={liveResult.selectedMs}
                    onChange={(value) => setLiveResult((current) => current ? { ...current, selectedMs: value } : current)}
                    minMs={liveResult.minMs}
                    maxMs={liveResult.maxMs}
                    endLabel={liveResult.endLabel}
                    outcome={liveOutcome}
                  />
                </>
              );
            })() : (
              <div className="no-calculation card" role="status">
                <strong>No refund estimate yet</strong>
                <p>The submitted policy and booking details did not produce a result this prototype can safely calculate. Review the notes below or clarify the policy text.</p>
              </div>
            )}
            <PolicyEvidence
              rules={liveResult.analysis.rules}
              unresolvedIssues={[...liveResult.unresolvedIssues, ...liveResult.contextNotes]}
              sourceLabel="Quoted from your submitted policy"
            />
          </section>
        )}
      </main>
    </div>
  );
}
