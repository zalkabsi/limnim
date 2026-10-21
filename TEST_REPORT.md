# Pre-submission Audit Report

**Audit date:** October 20, 2026 · **Runtime:** Node.js 24.19.0, npm 11.9.0, Next.js 16.4.1

## Checks

| Check | Result | Evidence |
|---|---|---|
| Locked dependency install | Passed: 416 packages | `npm ci --cache /tmp/limnim-npm-cache --no-audit` |
| Lint | Passed | `npm run lint` |
| Type check | Passed | `npm run typecheck` |
| Unit tests | Passed: 33 tests in 6 files | `npm run test:unit` |
| API integration tests | Passed: 12 tests | `npm run test:integration` |
| Standard browser suite | Passed: 9; 1 sample-only test skipped by its mode guard | `env -u OPENAI_API_KEY npm run test:e2e` |
| Sample-only browser flow, dev | Passed: 1 | `env -u OPENAI_API_KEY NEXT_PUBLIC_SAMPLE_DEMO=true npm run test:e2e -- tests/e2e/sample-demo.spec.ts` |
| Production build | Passed | `env -u OPENAI_API_KEY NEXT_PUBLIC_SAMPLE_DEMO=true npm run build` |
| Sample-only browser flow, production build | Passed: 1 | Started the built app without `OPENAI_API_KEY`; Playwright confirmed the demo notice, Tokyo sample, responsive layout, threshold changes, and API rejection. |
| Whitespace and local Markdown links | Passed | `git diff --check`; local link scan found 0 broken targets. |
| Secret and debug scan | Passed | Secret-pattern scan found 0 hits; the app/config has no Render API key binding or app `console.*` calls. No secret values were printed. |

The sample-mode browser check ran at 390×844 and confirmed there is no horizontal overflow. It verified the $600/$600 first threshold, the $0/$1,200 final threshold, and that normal sample exploration sends no analysis request.

## Render demo

The live page at <https://limnim-sample-demo.onrender.com> returned HTTP 200 and included the “Interactive sample demo” notice and Tokyo sample. A POST to `/api/analyze` returned HTTP 503 with code `sample_demo_only` and the expected user-facing message. The live check succeeded through the configured workspace proxy. The Render service config sets `NEXT_PUBLIC_SAMPLE_DEMO=true` and contains no OpenAI key requirement.

The same checks passed against the local production build with `OPENAI_API_KEY` removed. The app does not call OpenAI for the Tokyo example. No Render settings or credentials were changed. The reviewed repository updates are published on public `main`; the live page and sample-only API response were checked again afterward.

## Screenshot and video

The README screenshot at `devpost/assets/limnim-sample-workspace.png` was recaptured from the sample-only production build. It shows the sample notice, fictional booking, refund/penalty summary, guest reply, timeline, and policy evidence.

The requested prior-workspace video was not present. A new local-only sample preview was generated at `devpost/assets/limnim-demo-narrated.mp4`; it is ignored by Git and was not uploaded or published. It is 78.5 seconds, 1440×900 at 10 fps, with H.264 video and AAC narration. `ffmpeg` decoded the full file without errors, and sampled frames match Limnim’s current sample-only UI and branding. Its silent source and cue file are also ignored by Git.

The Playwright ffmpeg helper download returned HTTP 403 `Domain forbidden` through the workspace proxy. The sample recorder now captures Chromium frames and encodes them with system `ffmpeg`, so it does not need that download. The separate live recorder was not run; it still requires the helper and an authorized OpenAI account with available credits.

## Remaining status

The last recorded live OpenAI request in prior project notes returned HTTP 429 `credit_balance_exhausted`. This audit did not retry live analysis; a successful live extraction remains unverified.

Public `main` includes the audit fixes, refreshed screenshot, and removal of the old RefundCurve MP4s. At the October 20 audit, the narrated sample video remained local and unuploaded. The entrant later supplied a YouTube URL; current Devpost fields remain unverified.

## Video link follow-up — October 22, 2026

The entrant supplied <https://youtu.be/q6SJWiaujMI> as the uploaded demo URL. This workspace's enforced HTTP egress allowlist does not include YouTube, so the URL's playback, visibility, and uploaded contents could not be independently checked. The local 78.5-second preview described above remains the version reviewed against the current sample-only demo. Confirm the public link and save it in the Devpost video field.
