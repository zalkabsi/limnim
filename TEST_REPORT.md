# Test Report

**Run date:** October 20, 2026  
**Project:** RefundCurve  
**Runtime:** Node.js v24.19.0, npm 11.9.0, Next.js 16.4.1

## Results

| Check | Result | Evidence |
|---|---|---|
| Dependency install | Passed | `npm ci --cache /tmp/refundcurve-npm-cache --prefer-online --loglevel=error` installed the locked dependency tree. |
| Lint | Passed | `npm run lint` |
| Type check | Passed | `npm run typecheck` |
| Unit tests | Passed: 29 tests in 5 files | `npm run test:unit` |
| API integration tests | Passed: 12 tests | `npm run test:integration` |
| Production build | Passed | `npm run build` compiled the app and generated the static home page and dynamic `/api/analyze` route. |
| Browser end-to-end tests | Passed: 9 tests | Playwright Chromium ran against the production build on port 3001. Coverage includes exact refund boundaries, evidence, unsupported rules, narrow layout, keyboard input, cancellation, and quota recovery. |
| Production dependency audit | Passed: 0 vulnerabilities | `npm audit --omit=dev` |
| Full dependency audit | Unresolved upstream advisory | `npm audit` reports 5 high-severity affected packages through the development-only Next ESLint dependency chain. The underlying `braces` advisory is GHSA-vfj7-8cjw-p6xm (versions through 3.0.3); npm reports no available fix. |
| Diff whitespace check | Passed | `git diff --check` |

The default Playwright port, 3000, was occupied by a pre-existing dev server that accepted connections but did not return a response. I left that process untouched and ran all nine browser tests against the production build on port 3001 with a temporary Playwright config, which was removed after the run.

## Live provider check

One real OpenAI Responses API request was made with the repository's prompt, JSON schema, model, and SDK using synthetic policy text. It returned HTTP 429 `credit_balance_exhausted`. The app now presents an actionable, credential-safe message, and the integration and browser tests verify that behavior. A successful live extraction has **not** been verified; do not describe it as working in submission materials until an authorized account with available credits completes a live check.

The API tests use a mock provider and do not prove account access. The demo recorder was not run because live extraction is unavailable and video production remains the final project task. No public deployment was attempted; the official challenge does not require one.

## Visual evidence

The README screenshot at `devpost/assets/refundcurve-sample-workspace.png` was captured from the production build after loading the fictional Tokyo sample. It shows the refund summary, stepped timeline, exact cancellation deadlines, and source excerpts.
