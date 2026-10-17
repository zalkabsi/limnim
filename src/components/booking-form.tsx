"use client";

import { useState, type FormEvent } from "react";
import { Info } from "luxon";
import { currencyFractionDigits } from "@/lib/calculations/money";
import { BookingInputSchema, SUPPORTED_CURRENCIES, type BookingInput } from "@/lib/validation/booking";

export function BookingForm({
  isAnalyzing,
  error,
  onAnalyze,
}: {
  isAnalyzing: boolean;
  error: string | null;
  onAnalyze: (policyText: string, input: BookingInput) => void;
}) {
  const [policyText, setPolicyText] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [propertyTimeZone, setPropertyTimeZone] = useState("");
  const [checkInLocal, setCheckInLocal] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const amountStep = String(10 ** -currencyFractionDigits(currency));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = BookingInputSchema.safeParse({ amount, currency, propertyTimeZone, checkInLocal });
    if (!policyText.trim()) {
      setValidationError("Paste the cancellation policy before analyzing it.");
      return;
    }
    if (!result.success) {
      setValidationError(result.error.issues[0]?.message ?? "Check the booking details and try again.");
      return;
    }
    if (!Info.isValidIANAZone(result.data.propertyTimeZone.trim())) {
      setValidationError("Enter the property's IANA time zone, such as America/New_York or Asia/Tokyo.");
      return;
    }
    setValidationError(null);
    onAnalyze(policyText.trim(), { ...result.data, propertyTimeZone: result.data.propertyTimeZone.trim() });
  }

  return (
    <form className="live-form card" onSubmit={handleSubmit} aria-labelledby="live-form-title">
      <div className="form-heading">
        <div>
          <p className="section-kicker">Analyze a policy</p>
          <h2 id="live-form-title">See what each deadline could mean</h2>
        </div>
        <span className="form-step">Policy + booking details</span>
      </div>

      <label className="form-field" htmlFor="policy-text">
        <span>Cancellation policy</span>
        <textarea
          id="policy-text"
          name="policyText"
          rows={6}
          maxLength={15_000}
          placeholder="Paste the hotel's cancellation terms here…"
          value={policyText}
          onChange={(event) => setPolicyText(event.currentTarget.value)}
          required
        />
        <small>Paste the relevant text. Remove names, confirmation numbers, and other personal details.</small>
      </label>

      <div className="form-grid">
        <label className="form-field" htmlFor="booking-amount">
          <span>Booking total</span>
          <input id="booking-amount" name="amount" type="number" min={amountStep} max="999999999999" step={amountStep} placeholder="1,200.00" value={amount} onChange={(event) => setAmount(event.currentTarget.value)} required />
        </label>
        <label className="form-field" htmlFor="booking-currency">
          <span>Currency</span>
          <select id="booking-currency" name="currency" value={currency} onChange={(event) => setCurrency(event.currentTarget.value)}>
            {SUPPORTED_CURRENCIES.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
        <label className="form-field" htmlFor="property-zone">
          <span>Property time zone</span>
          <input id="property-zone" name="propertyTimeZone" placeholder="Asia/Tokyo" value={propertyTimeZone} onChange={(event) => setPropertyTimeZone(event.currentTarget.value)} required />
          <small>Use an IANA name from the property&apos;s location.</small>
        </label>
        <label className="form-field" htmlFor="check-in">
          <span>Check-in date and time <em>optional</em></span>
          <input id="check-in" name="checkInLocal" type="datetime-local" value={checkInLocal} onChange={(event) => setCheckInLocal(event.currentTarget.value)} />
          <small>Helps set the end of the timeline.</small>
        </label>
      </div>

      <div className="form-submit-row">
        <p className="privacy-note">
          Submitting sends policy text and the property time zone to OpenAI. Your booking amount and currency stay in this browser. The provider may retain API inputs for abuse monitoring for up to 30 days; <code>store: false</code> disables response storage.
        </p>
        <button className="button" type="submit" disabled={isAnalyzing}>
          {isAnalyzing ? "Analyzing policy…" : "Analyze policy"}
          {!isAnalyzing && <span className="arrow" aria-hidden="true">→</span>}
        </button>
      </div>
      <div className="form-feedback" aria-live="polite" role={error || validationError ? "alert" : "status"}>
        {(validationError || error) && <p className="form-error">{validationError || error}</p>}
        {isAnalyzing && <p className="form-pending">Reading the policy and checking its quoted deadlines…</p>}
      </div>
    </form>
  );
}
