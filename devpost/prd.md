---
doc: prd
status: approved
---

# RefundCurve — Product Requirements

An AI-assisted hotel cancellation-policy tool for travelers deciding when to cancel. Source: `scope.md > Who It's For` and `scope.md > The Unique Kernel`.

## The Core Journey

1. **Arrive and choose a path.** The traveler sees what RefundCurve does, can paste a policy, and can try the clearly labeled Tokyo sample. Source: `scope.md > The Core Loop`.
2. **Enter booking details.** For a live analysis, the traveler provides policy text, total booking amount, currency, check-in date and time if known, and the property's time zone. The app does not silently fill in missing material details or let policy text change the user-provided amount or currency. Source: `scope.md > The Core Loop`.
3. **Analyze once.** The app shows progress while the policy is analyzed. It returns supported cancellation rules, their source excerpts, and any ambiguity or missing information. The sample is labeled as an example and does not pretend to be a live AI analysis. Source: `scope.md > The POC Boundary`.
4. **Review the financial result.** When determinable, the traveler sees the potential refund, penalty, and next relevant deadline in the property's time zone. Unresolved outcomes are labeled clearly. Source: `scope.md > The Unique Kernel`.
5. **Explore time and evidence.** The traveler selects a cancellation moment on the stepped timeline; refund and penalty update immediately from the validated rules. They can inspect the original excerpt behind each threshold. The timeline does not call the AI again. Source: `scope.md > What "Working" Looks Like`.

## Screens and Layout

One primary workspace supports the whole journey; no account or secondary dashboard is needed.

- **Before analysis:** show the product purpose, policy text input, essential booking details, the primary “Analyze cancellation policy” action, and a separate “Try sample booking” action.
- **After analysis:** keep the policy context available while showing the financial outcome, next deadline, stepped timeline, and evidence. The outcome is easy to scan; the timeline receives enough space to make threshold changes clear.
- **Mobile:** stack input, outcome, timeline, and evidence in the order a traveler uses them, with touch-friendly timeline controls.

**Approved layout:** the input and results live in one screen, with the timeline as the main visual area after analysis.

## Look and Feel

Use the learner's direction from `scope.md > Inspiration & Identity`: a precise, trustworthy mix of financial analytics and premium travel software. Use warm neutral surfaces, deep readable text, and a restrained teal accent. Refunds and penalties need distinct, accessible treatments; color is never the only status cue. Typography should be professional and clear, with especially legible financial amounts and tabular numerals. Keep animation subtle, responsive to reduced-motion preferences, and useful when values change.

## Features and Behavior

### Policy and Booking Input

- Accept pasted cancellation-policy text and prevent empty submissions.
- Collect booking amount, currency, check-in date/time when known, and property time zone.
- Explain which missing details prevent a reliable result; do not invent dates, times, time zones, fees, taxes, or booking values.
- Keep the sample scenario available without credentials or a document upload.

### Analysis and Rule Evidence

- Run live AI extraction only after the traveler submits a policy; show a specific loading state and useful retry guidance after an error.
- For supported rules, show the exact original source excerpt, its plain-language interpretation, and whether it is supported or needs clarification.
- Never fabricate excerpts or display uncalibrated confidence percentages.
- If a policy is ambiguous, conflicting, or outside the supported pattern, explain why and leave the affected calculation unresolved rather than silently approximating it.
- Treat policy text as source material, not as instructions to the application.

### Financial Outcome

- Use the traveler-entered amount and currency as authoritative.
- Show potential refund and cancellation penalty separately, plus refund and penalty percentages when determinable.
- Show the next relevant deadline with its property-local date, time, time zone, and financial consequence. Any remaining-time display uses the actual current time and the property's time zone, not the browser's zone.
- Describe the result as an estimate based on the supplied policy; do not claim a guaranteed cash refund or legal entitlement.

### Sample and Timeline

- Load the fictional Tokyo hotel sample as a prevalidated fixture and label it as an example, not a live extraction.
- The sample is $1,200 USD, check-in November 26, 2026 at 3:00 PM in `Asia/Tokyo`.
- Before November 20 at 6:00 PM JST, the penalty is $0 and refund is $1,200. At exactly November 20 at 6:00 PM, the penalty becomes $600 and refund becomes $600.
- Immediately before November 24 at 3:00 PM JST, the penalty remains $600. At exactly November 24 at 3:00 PM, the penalty becomes $1,200 and refund becomes $0.
- Selecting a date and time updates the amounts immediately. The stepped timeline uses threshold markers and works by keyboard as well as pointer or touch.

## States and Boundaries

- **First use:** explain what the product does, offer policy input and a sample, and do not show fabricated analysis results.
- **Empty or incomplete input:** identify the missing text or booking information and what the traveler can provide next.
- **Analyzing:** show that extraction is in progress; do not imply the financial result is ready yet.
- **Analysis failure:** explain that extraction did not complete and offer retry; keep the sample available.
- **Ambiguous, conflicting, or unsupported rule:** name the affected condition and mark its result unresolved.
- **Invalid or out-of-order deadlines:** reject the inconsistent rules and explain that the calculation is unavailable.
- **After closing:** booking documents are not stored persistently by the MVP.
- **Third-party processing:** explain that submitted text may be processed by the configured AI provider; do not promise provider retention behavior without evidence.
- **Product boundary:** estimates use the supplied policy only and do not verify payment, tax treatment, other contract terms, hotel enforcement, or local law.

## Product Decisions

- The financial timeline is the centerpiece because it shows how the outcome changes across policy deadlines. Source: `scope.md > The Unique Kernel`.
- AI extracts language; deterministic calculations produce the financial amounts; users can trace each threshold to source text. Source: `scope.md > The Unique Kernel`.
- The first demo follows the supplied Tokyo sample's percentage and non-refundable thresholds; broader policy forms are deferred. Source: approved `scope.md > The POC Boundary` and `scope.md > Later`.
- The learner approved a single primary workspace: input first, then results and the timeline, with the timeline as the main visual area.

## What We're Building

- A responsive hotel-policy experience with pasted text, essential booking details, and a reliable sample path.
- Live AI extraction for the supported rule pattern, with validated output, source evidence, uncertainty, and useful errors.
- Deterministic financial results and an interactive, stepped, time-zone-aware timeline for the sample and supported live policies.

## Deferred From the POC

- Text-based PDF upload, to keep the first workflow focused on pasted text and one reliable scenario.
- Fixed monetary fees, no-show rules, per-room policies, tax treatment, and other complex policy forms, because they need additional calculation behavior and evidence rules.
- Booking comparisons, exports, and user-local deadline display, because none is needed to prove the core decision loop.
- User accounts, persistent storage, payments, booking integrations, and cancellation execution, all outside the approved proof-of-concept boundary.

## Possible Later Enhancements

If the core flow works well, broaden the supported policy structures and add comparisons or an exportable summary.

## Non-Goals

- Do not cancel a reservation, contact a hotel, or verify that a charge was collected.
- Do not guarantee a refund or determine legal rights.
- Do not infer missing material policy details or make unsupported financial approximations.
- Do not expand beyond hotel reservations in this proof of concept.

## Open Questions

None for product approval. Technical implementation choices are addressed in `4-spec`.
