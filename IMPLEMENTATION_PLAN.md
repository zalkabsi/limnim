# Implementation Plan

**Last updated:** October 20, 2026  
This is the working audit record; resolved tasks include verification evidence, and external or entrant-controlled blockers remain explicit.

## P0 — Submission blockers

| Finding | Affected area | Action | Status / verification |
|---|---|---|---|
| The bound OpenAI account has no available credits. A real Responses API request returned HTTP 429 `credit_balance_exhausted`. | `src/lib/ai/extract-policy.ts`, `/api/analyze`, submission claims | Use an authorized account with available credits and verify one live extraction before describing it as working in the final entry/video. | **Blocked externally.** App now returns targeted, credential-safe guidance. Mocked route tests do not verify provider availability. |
| Registration and several mandatory submission form fields are entrant-account actions. | Devpost entry | Entrant must verify eligibility, register, review the Skill Pack answer, check the age-of-majority item, confirm the “Try it out” repository URL, and submit before the cutoff. | **Blocked outside this workspace.** See `HACKATHON_COMPLIANCE.md`. |
| The final video must be made public and linked, but the user explicitly deferred video production until every other task is complete. | `devpost/assets/`, Devpost submission | Keep recording/editing/uploading as the last project task; use `DEMO_VIDEO_PLAN.md` then. | **Intentionally deferred.** No video creation or upload was performed. |
| New-project provenance, entrant eligibility, ownership, and any team representative status cannot be established from source files. | Entrant attestations | Entrant confirms facts in the Devpost account and discloses any pre-existing code/work if relevant. | **Entrant action.** The repository contains prior attestations, not independent proof. |

## P1 — Reliability and submission materials

| Finding | Affected files | Action | Status / verification |
|---|---|---|---|
| Handler could reject a valid provider response after appending up to 20 rule issues to 40 provider issues (response schema allowed only 40). | `src/lib/ai/schema.ts`, `src/lib/ai/analyze-handler.ts`, `tests/integration/analyze-route.test.ts` | Allow up to 60 combined issues while keeping the provider JSON schema at 40; add boundary regression coverage. | **Resolved.** Regression reproduced as HTTP 502, then passed after the limit fix. |
| A depleted API account was shown a generic connection/retry message. | `src/lib/ai/analyze-handler.ts`, API integration and browser tests | Map quota, rate-limit, and access-denied errors to actionable messages without returning provider details or user policy text. | **Resolved.** Integration and E2E checks cover the quota case; provider account itself remains blocked. |
| Audit required independent current compliance and submission materials. | `README.md`, `ARCHITECTURE.md`, `HACKATHON_COMPLIANCE.md`, `TEST_REPORT.md`, `SUBMISSION.md`, `DEMO_VIDEO_PLAN.md` | Publish the verified requirements, system design, evidence, submission drafts, and deferred video plan. | **Resolved for local project materials.** Final checks are recorded in `TEST_REPORT.md`; account-controlled Devpost fields remain entrant actions. |
| Hotel staff need a fast, traceable answer to repetitive cancellation questions. | `src/lib/guest-response.ts`, `src/components/guest-response.tsx`, `src/components/policy-workspace.tsx` | Build a copyable response from the selected time, deterministic amount, source quote, and estimate caveat. | **Resolved.** Available for the fictional sample and calculable live analyses; unit and browser coverage verifies its content and clipboard action. |
| The evaluator treated every penalty threshold as active at the exact deadline, even when the source says “after.” | `src/lib/ai/schema.ts`, `src/lib/ai/validate-analysis.ts`, `src/lib/calculations/evaluate-policy.ts`, timeline and summary components | Capture and verify inclusive/exclusive wording, keep the prior rate at an exclusive boundary, and show when the new rate begins. | **Resolved.** Unit, integration, and production-browser coverage checks the exact instant and the first later minute. |
| The user selected Limnim and renamed the public GitHub repository. | package metadata, UI, documentation, submission assets, recording scripts, Git remote | Carry the new name through the local project and refresh non-video assets. | **Resolved locally.** The GitHub rename and new origin are verified. Current `main` remains at the prior audited SHA; local edits are not pushed. |

## P2 — Judging quality and operational risk

| Finding | Affected area | Action | Status / verification |
|---|---|---|---|
| Public hosted operation is not configured; the official submission does not require a deployed website. | Deployment | Keep local install/run steps clear; do not claim a deployment URL. Add hosting only if an environment is provided. | **Documented.** No production deployment attempted. |
| `/api/analyze` has no shared rate limiter. | Live analysis endpoint | Add production-grade usage controls before any public deployment with a paid API key. An in-memory limiter would not protect serverless/multi-instance deployment. | **Documented; not required for the current local-only run.** |
| Full dependency audit reports a high severity advisory on development-only `braces` through Next ESLint tooling; npm reports no fix. | `eslint-config-next` dependency tree | Preserve the working lint tooling and track for a compatible upstream fix. Do not force an incompatible override. | **Unresolved upstream advisory.** `npm audit --omit=dev` reports zero vulnerabilities. |
| No CI workflow exists. | Repository automation | Consider adding GitHub Actions if the entrant wants automated checks after publishing the final commit. | **Optional.** Local lint, typecheck, tests, and build are available. |

## P3 — Optional enhancements

No unrelated feature work is planned. PDF upload, account storage, booking integrations, fixed fees, per-room terms, and cancellation execution remain outside the approved proof-of-concept scope.

## Completed implementation

- Enforced the combined unresolved-issue limit in the validated API response while keeping the provider's stricter limit.
- Added safe user guidance for exhausted provider credits, upstream rate limits, and denied API access.
- Added regression checks for issue aggregation and quota feedback.
- Prepared architecture, compliance, testing, submission, and demo-plan documentation.
- Added a non-video sample-workspace screenshot to the README submission materials.
- Added the staff-response composer with local clipboard support, source quote, property-local time, amounts, and a clear estimate caveat.
- Added an explicit deadline-boundary field from structured extraction through evidence validation, calculation, summary, and timeline display.
- Rebranded local package metadata, UI, documentation, demo preparation scripts, and submission assets to Limnim; confirmed `origin` uses the renamed repository URL.
- Refreshed the non-video sample screenshot and Devpost thumbnail from the local production build. Existing video files remain untouched as explicitly requested.
- Ran the final lint, type, unit, integration, production build, dependency audit, and production-browser checks; results are recorded in `TEST_REPORT.md`.

## Final verification criteria

- `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, and `npm run build` pass on the final tree.
- `npm audit --omit=dev` and the complete `npm audit` result are recorded, including unresolved upstream advisories.
- The local sample workflow is verified in Chromium on desktop and a narrow viewport against the production build.
- A staff reply copies to the clipboard on supported browsers and falls back to selectable text when clipboard access is unavailable.
- Inclusive and strict-after deadline wording is checked against evidence and calculates correctly at and just beyond the exact boundary.
- A real successful live AI request is recorded separately from mocked tests; it is currently blocked by provider account credits.
- Public repository state, Devpost fields, and entrant attestations are not marked complete without account/source evidence.
