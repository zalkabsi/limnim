# Test Report

**Run date:** October 20, 2026 · **Project:** Limnim · **Runtime:** Node.js v24.19.0, npm 11.9.0, Next.js 16.4.1

## Results

| Check | Result | Evidence |
|---|---|---|
| Locked dependency install | Passed | `npm ci --cache /tmp/limnim-npm-cache --prefer-online --loglevel=error` installed 416 packages from the lockfile in an isolated validation copy. |
| Lint | Passed | `npm run lint` |
| Type check | Passed | `npm run typecheck` |
| Unit tests | Passed: 33 tests in 6 files | `npm run test:unit` |
| API integration tests | Passed: 12 tests | `npm run test:integration` |
| Production build | Passed | `npm run build` compiled the app and generated the static home page and dynamic `/api/analyze` route. |
| Browser end-to-end tests, dev server | Passed: 9 tests | Playwright Chromium ran against the dev server on port 3002. |
| Browser end-to-end tests, production build | Passed: 9 tests | After a clean lockfile install and production build, Playwright Chromium ran against the production server on port 3004. |
| Production dependency audit | Passed: 0 vulnerabilities | `npm audit --omit=dev` |
| Full dependency audit | Unresolved upstream advisory | `npm audit` reports 5 high-severity affected packages through the development-only Next ESLint dependency chain. The advisory is GHSA-vfj7-8cjw-p6xm for `braces`; npm reports no available fix. |
| Diff whitespace check | Passed | `git diff --check` |

The default Playwright port, 3000, was occupied by a pre-existing dev server that accepted connections but did not return a response. I left that process untouched and ran the browser checks on ports 3002 and 3004 using the configurable `PLAYWRIGHT_TEST_PORT` setting. The final application source and tests were validated from an isolated copy so dependency installation and browser/build artifacts did not disturb the existing workspace server.

The browser suite verifies the no-credential Tokyo sample, evidence display, unsupported policy handling, narrow layout, keyboard input, cancellation, quota recovery, the copyable front-desk response, and inclusive versus strict-after deadline behavior at and just beyond the threshold. The guest-response builder remains deterministic and client-side; it does not send messages or make another AI request.

## Live provider check

The latest real request through the app used the repository's prompt, JSON schema, model, and SDK with synthetic policy text. It returned `provider_quota_exhausted`, which maps the provider's HTTP 429 `credit_balance_exhausted` response to a safe user-facing message. Integration and browser tests verify that response. A successful live extraction has **not** been verified; do not describe it as working in submission materials until an authorized account with available credits completes a live check.

The API tests use a mock provider and do not prove account access. The demo recorder was not run because live extraction is unavailable and video production remains the final project task. No public deployment was attempted; the official challenge does not require one.

## Visual evidence

The README screenshot at `devpost/assets/limnim-sample-workspace.png` was captured from the production build after loading the fictional Tokyo sample. It shows the refund summary, stepped timeline, exact cancellation deadlines, source excerpts, and prepared staff reply. The 3:2 Devpost thumbnail is `devpost/assets/limnim-thumbnail.png` (1536 × 1024, 181,414 bytes). A 78.4-second captioned sample-mode draft is local-only at `devpost/assets/limnim-demo.mp4` (842,177 bytes); it is not in the public repository, does not demonstrate live extraction, and is not a public submission video.

## Publication state

The local origin points to `https://github.com/zalkabsi/limnim.git`. The tested Limnim source and refreshed images were published in commit [`8652ff3`](https://github.com/zalkabsi/limnim/commit/8652ff301f05d542e757e72f4e8d1c877360df2c); `main` was verified at that commit before this report-only follow-up. The local sample-mode draft has not been uploaded publicly. A final live-extraction video and Devpost submission remain pending.
