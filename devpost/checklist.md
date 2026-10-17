---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Explore the sample booking on a working timeline**
  Becomes usable: The app runs locally; a traveler can load the clearly labeled Tokyo sample, move through both cancellation thresholds, see the refund and penalty recalculate, and inspect the supporting policy excerpts.
  Why now: This bootstraps the project while proving the deterministic financial timeline and sample path, the central visible behavior. Feedback here can still shape the input and live-analysis experience.
  PRD ref: `prd.md > The Core Journey` (steps 1, 4–5), `prd.md > Screens and Layout`, `prd.md > Financial Outcome`, `prd.md > Sample and Timeline`.
  Spec ref: `spec.md > Stack`, `spec.md > Components > Single Workspace Page`, `spec.md > Components > Tokyo Sample Loader`, `spec.md > Components > Property-Time Date Helper`, `spec.md > Components > Rule Evaluator and Money Helper`, `spec.md > Components > Financial Summary`, `spec.md > Components > Evidence List`, `spec.md > Components > Stepped Timeline`, `spec.md > File Structure`.
  Build: Scaffold the Next.js project and dependencies inside this slice. Implement the responsive single workspace, the sample fixture, exact property-time thresholds, decimal-safe penalty/refund calculations, evidence display, and accessible stepped timeline. Add unit and browser checks for the Tokyo sample.
  Verify (mechanical): Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:e2e`, and `npm run build`; confirm the Playwright sample flow reaches $1,200/$0 before Nov 20 at 6:00 PM JST, $600/$600 at that instant, and $0/$1,200 at Nov 24 at 3:00 PM JST.
  Learner check: Run the app, choose “Try sample booking,” move the time control before and exactly at each deadline, and inspect a policy excerpt. Share anything confusing or visually off before live analysis is built.
  Commit: `Build sample cancellation timeline`

- [x] **2. Analyze an explicit cancellation policy end to end**
  Becomes usable: A traveler can enter policy and booking details, receive extracted deadline candidates with exact evidence, and inspect the resulting refund/penalty timeline for supported explicit local date-and-time thresholds. The Tokyo sample still works without credentials.
  Why now: The sample has proved the deterministic calculation path. This slice adds the central AI-to-evidence-to-timeline kernel early, so its behavior can be reviewed before we harden edge cases.
  PRD ref: `prd.md > The Core Journey` (steps 2–5), `prd.md > Policy and Booking Input`, `prd.md > Analysis and Rule Evidence`, `prd.md > Financial Outcome`, `prd.md > Sample and Timeline`.
  Spec ref: `spec.md > Components > Policy and Booking Form`, `spec.md > Components > Analysis API Route`, `spec.md > Components > Extraction Prompt and Schema`, `spec.md > Components > Property-Time Date Helper`, `spec.md > Components > Rule Evaluator and Money Helper`, `spec.md > Components > Financial Summary`, `spec.md > Components > Evidence List`, `spec.md > External Services and Dependencies > OpenAI Responses API`.
  Build: Add the booking form and `/api/analyze` route. Call OpenAI Responses API with strict structured output, server-only credentials, `store: false`, and no booking amount/currency. Validate with Zod, require verbatim evidence quotes, resolve clear local deadlines, and calculate locally. Add loading and retryable API-failure states; keep sample behavior separate and available.
  Verify (mechanical): Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, and `npm run build`; mocked integration tests cover valid output, malformed output, quote mismatch, missing key, and provider failure without a secret.
  Learner check: With `OPENAI_API_KEY` set locally, submit a short policy with two explicit percentage deadlines and inspect its evidence and timeline. If no key is configured, submit once to see the key setup guidance, then use the sample to confirm the rest of the app still works.
  Commit: `Add evidence-backed live policy analysis`

- [x] **3. Make uncertain cases clear and finish the responsive experience**
  Becomes usable: Unsupported or inconsistent policies, missing details, and invalid/ambiguous local times leave calculations unresolved with a plain explanation; the full workspace remains clear on small screens and by keyboard.
  Why now: The central live journey is already usable and reviewable. This slice finishes the approved safety boundaries and accessibility details without delaying feedback on the core extraction flow.
  PRD ref: `prd.md > Analysis and Rule Evidence`, `prd.md > Financial Outcome`, `prd.md > Look and Feel`, `prd.md > States and Boundaries`.
  Spec ref: `spec.md > Components > Property-Time Date Helper`, `spec.md > Components > Rule Evaluator and Money Helper`, `spec.md > Components > Financial Summary`, `spec.md > Components > Evidence List`, `spec.md > Components > Stepped Timeline`, `spec.md > Important Failure Modes`, `spec.md > What Was Simplified and Why`, `spec.md > Where It Runs and How Someone Tries It`.
  Build: Complete unresolved states for unsupported, conflicting, out-of-order, missing-year, and daylight-saving cases. Add the third-party processing notice, responsive and reduced-motion styling, remaining keyboard/accessibility details, `.env.example`, MIT license, and setup/demo instructions in `README.md`.
  Verify (mechanical): Run `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, and `npm run build`; Playwright covers keyboard timeline use and small-screen layout, and integration tests confirm unsafe/unsupported rules cannot produce guessed amounts.
  Learner check: Try an unsupported or incomplete policy and a deadline that cannot be resolved; confirm the app tells you what is missing and does not invent an amount. At a narrow viewport, use the timeline with the keyboard and check that refund and penalty remain understandable without color alone.
  Commit: `Harden policy uncertainty and finish the workspace`

## Hands-on Checkpoints

- [ ] Early usable behavior explored — after slice 1, including feedback on the sample workspace and timeline
- [ ] Integrated live core journey explored — after slice 2, so extraction/evidence feedback can shape final hardening
- [ ] Final kick-the-tires exploration and feedback completed — after slice 3

Progress note: The learner asked to continue past the first two hands-on checkpoints without reporting observations. The sample and integrated flows remain unreviewed by the learner. The original slice 3 commit (`557601d`) passed lint, typecheck, 18 unit tests, 8 integration tests, 4 browser flows, and the production build. The current review reran all checks after hardening: lint, typecheck, 28 unit tests, 10 integration tests, 6 browser flows, and the production build passed. This workspace has no configured OpenAI API key, so live provider calls are covered by mocked tests rather than exercised against OpenAI.

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — brief evidence-based recap
- [x] Optional edit and transfer reflection addressed — no learner edit was needed for the recap; the transferable practice is recorded without claiming a personal reflection
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: Brief factual recap and reusable evidence-checking practice are in `devpost/app-map.html`. Chromium rendered the standalone page, all 17 local links were checked, and the page has no scripts or linked assets.
Route and stops: The map provides a 3-stop reference route through `src/components/booking-form.tsx` and `src/components/policy-workspace.tsx`, `src/lib/ai/analyze-handler.ts` and `src/lib/ai/validate-analysis.ts`, then `src/lib/calculations/evaluate-policy.ts` and the result components. This was not an interactive learner tour.
Edit outcome: No optional learner edit was attempted or attributed to the learner.
Reflection: The map states a project-grounded practice to reuse. No personal reflection was provided or recorded.
Activity mode: Brief evidence-based recap with an offline reference map; no interactive app/editor tour.

## Revisions

- Use TypeScript 6.0.3 instead of the researched 7.0.2 — production build passed with TypeScript 7, but the Next.js ESLint preset's `typescript-eslint` parser does not support TypeScript 7.0 yet; TypeScript 6 retains the selected stack and supports both build and lint.
- Use Next's Webpack production builder and TypeScript compiler API — this sandbox blocks Turbopack's worker port and detached TypeScript CLI output, while both work through supported Next configuration paths; the app still uses the normal Next dev server.
- Cross-check extracted deadlines against the exact quote's date, unambiguous time, percentage, and named zone; an exact quote by itself does not prove that the model mapped its values correctly.
- Withhold the live estimate if any policy rule is unresolved or conflicts with another rule, since partial thresholds could omit a financial condition that changes the result.

## Official Hackathon Submission Requirements

Checked against the [official rules](https://learn-ai-basics.devpost.com/rules), [challenge page](https://learn-ai-basics.devpost.com/), and [Devpost's submission-form update](https://learn-ai-basics.devpost.com/updates/46821-two-new-questions-on-the-submission-form) on October 17, 2026. Submission closes **October 26, 2026 at 5:00 PM EDT**; judging ends **October 30, 2026 at 5:00 PM EDT**.

### Project and repository

- [x] Working project with an end-to-end function; local setup and demo instructions are in `README.md`.
- [x] Planning documents are committed under `devpost/`: `scope.md`, `prd.md`, and `spec.md`.
- [x] Open-source `LICENSE` file is present (MIT).
- [ ] A public GitHub, GitLab, or Bitbucket repository is accessible to judges and contains the finished source, assets, instructions, and planning documents. The configured remote was not publicly accessible when checked; confirm it is public after publishing.
- [ ] The repository page visibly detects/displays the open-source license.
- [ ] Put the public repository URL in Devpost's **Try it out** field.

### Submission materials and form

- [ ] Write the English project description for the entry. It must explain the project features/functionality; the challenge page also asks what it does, who it is for, and what the entrant learned.
- [ ] Record and publicly upload a **1 to under 3 minute** demo video to YouTube or Vimeo. It must show the app working on its intended platform and avoid third-party trademarks or copyrighted music/material unless permission is held.
- [ ] Include the public video URL in the submission form.
- [ ] Answer the required short-form question describing how the Devpost Learn Skill Pack was used.
- [ ] Complete the required age-of-majority checkbox.
- [ ] Register for the hackathon and confirm entrant eligibility, original-work ownership, and any required team authorization.
- [ ] Submit all required Devpost fields before the deadline. Keep the repo/video available without charge or access restrictions through judging.

The rules require a public repository and demo video; they do not list deployment of a public website as a submission requirement. Submission eligibility and the required personal attestations must be completed by the entrant.
