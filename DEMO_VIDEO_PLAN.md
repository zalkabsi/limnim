# Demo Video Plan

**State:** Planning only. The user explicitly deferred recording, editing, rendering, uploading, and submitting a demo video. This plan keeps that video as the final project task after code, external access, and entrant account actions are ready.

## Official constraints

- The official rules say the video must be **under three minutes**, show the project functioning on its intended device, be publicly visible on YouTube or Vimeo, and be linked in the Devpost form.
- The challenge overview describes a 1-to-3-minute screen recording. Target **2:00–2:40** to satisfy both statements.
- Do not include third-party trademarks, copyrighted music, or other material without permission. Use fictional booking details only; never show `.env.local`, an API key, real confirmation numbers, names, or other personal details.
- The public project must remain available through the end of judging.

Sources: [official rules](https://learn-ai-basics.devpost.com/rules), [challenge overview](https://learn-ai-basics.devpost.com/).

## Readiness gates before recording

1. Restore available credits on an authorized OpenAI account and successfully complete a live analysis. The current account returned HTTP 429 `credit_balance_exhausted`; mocked tests are not enough for this step.
2. Run lint, typecheck, unit, integration, browser, and production-build checks on the final code.
3. Confirm the submission copy and the required Skill Pack answer with the entrant.
4. Confirm the public repository and entry fields are ready.
5. Only then run the live recorder, review the resulting file, upload it publicly, and add its URL to Devpost.

## Suggested sequence

| Time | Screen action | Point to make |
|---|---|---|
| 0:00–0:15 | Open the workspace and state the front-desk cancellation question. | Limnim prepares a clear, evidence-linked reply from the hotel's policy. |
| 0:15–0:35 | Load the clearly labelled Tokyo sample and review the guest response. | The sample works without an API request; the response shows its quote and estimate caveat. |
| 0:35–1:30 | Paste a fictional policy with one strict-after and one inclusive deadline, enter fictional reservation details, and run live analysis. | AI extracts language, the app verifies each quote and boundary, and deterministic code computes the result. |
| 1:30–1:55 | Copy or review the response, then move the timeline through the exact strict-after boundary and one minute later. | The old penalty remains active at the strict boundary; the reply and amounts update locally after it. |
| 1:55–2:20 | Inspect the supporting quote, then submit a relative or ambiguous rule. | Unsupported rules remain uncertain and produce no estimate or guest response. |
| 2:25–2:40 | State the boundary and close on the product name. | This is an estimate from supplied text, not a guaranteed refund or legal conclusion. |

## Recording environment

- Node.js 20.9 or newer (the repository was verified with Node.js 24.19.0), npm, the repository, and a Chromium browser.
- Copy `.env.example` to `.env.local` and set a server-side OpenAI API key with available API usage. Never show that file on screen.
- Start locally with `NODE_USE_ENV_PROXY=1 npm run dev` in managed environments that require the configured proxy. The Tokyo sample does not need the key.
- `npm run demo:live` is the existing live recording workflow. Run it only during the final video task; it overwrites `devpost/assets/limnim-demo-narrated.mp4`.
- The committed MP4s predate the Limnim rebrand and the staff-response workflow. They were left untouched while video production is deferred; do not submit them as the final demo.

## Review checklist for the final artifact

- Runtime is at least 1:00 and strictly under 3:00.
- The browser UI and key interaction are legible at normal playback size.
- The live flow succeeded during this recording, and the sample, exact thresholds, source quotes, and uncertainty are represented accurately.
- No API key, personal booking information, unlicensed logo, trademark, or copyrighted music appears.
- Audio/captions are clear; include English translation if any submitted content is not in English.
- Video is public on YouTube or Vimeo and the URL is saved in the Devpost form.
- Playback works without sign-in or access restrictions through judging.
