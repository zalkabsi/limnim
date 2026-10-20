"use client";

import { useState } from "react";
import { buildGuestResponse } from "@/lib/guest-response";
import type { Booking, FinancialOutcome } from "@/types/policy";

export function GuestResponse({
  booking,
  selectedMs,
  outcome,
}: {
  booking: Booking;
  selectedMs: number;
  outcome: FinancialOutcome;
}) {
  const response = buildGuestResponse(booking, selectedMs, outcome);
  const [copyResult, setCopyResult] = useState<{ response: string; message: string } | null>(null);
  const copyStatus = copyResult?.response === response ? copyResult.message : "";

  async function copyResponse() {
    try {
      await navigator.clipboard.writeText(response);
      setCopyResult({ response, message: "Guest response copied. Review it before sending." });
    } catch {
      setCopyResult({ response, message: "Clipboard access is unavailable. Select the response text and copy it manually." });
    }
  }

  return (
    <section className="card guest-response-card" aria-labelledby="guest-response-title">
      <div className="guest-response-heading">
        <div>
          <p className="section-kicker">Front desk reply</p>
          <h3 id="guest-response-title">A clear answer, ready to review</h3>
        </div>
        <button className="button" type="button" onClick={copyResponse}>Copy guest response</button>
      </div>
      <pre className="guest-response-text">{response}</pre>
      <p className="guest-response-note">Review and personalize this estimate before sharing it with a guest.</p>
      <p className="guest-response-copy-status" role="status" aria-live="polite">{copyStatus}</p>
    </section>
  );
}
