---
doc: spec
status: approved
---

# RefundCurve — Technical Spec

## How This Works, In Plain Language

The traveler enters the hotel policy and booking details on one page. The app sends only the policy text and the property's time zone to OpenAI once, asking it to identify supported cancellation deadlines and quote the exact words that support each one. The app checks that response before using it. It never asks AI to calculate money.

RefundCurve then uses ordinary code to turn each checked deadline into a penalty percentage. It uses the booking amount the traveler entered to calculate the penalty and possible refund. A timeline lets the traveler move a time selector and see the amounts update immediately; moving it does not call AI again. Selecting a rule also shows its original policy excerpt.

The sample booking uses the same calculator but skips AI, so it works without an API key. Nothing is saved after the page is closed. This is a small web app with one server route for AI analysis, rather than a database or a larger service setup.

## The Core Journey Through the System

1. `src/app/page.tsx` opens the single workspace. It offers policy entry and a separate sample action. Implements `prd.md > The Core Journey` and `prd.md > Screens and Layout`.
2. For a live policy, the booking form checks the required text, amount, currency, check-in information when supplied, and property time zone. The sample loader fills a clearly labeled fictional Tokyo booking. Implements `prd.md > Policy and Booking Input` and `prd.md > Sample and Timeline`.
3. The browser sends the policy text and time zone to the same-origin `/api/analyze` route. The route checks the request, calls the OpenAI Responses API, validates the returned structure, and confirms that every evidence quote occurs verbatim in the submitted policy. The booking amount and currency stay in the browser and are not sent to the model. Implements `prd.md > Analysis and Rule Evidence`.
4. The date helper resolves each usable local deadline in the property's IANA time zone. The evaluator checks ordering and supported rule shapes, then the money helper calculates the penalty and possible refund from the traveler-entered amount. If a required detail is missing or contradictory, the affected result remains unresolved. Implements `prd.md > Financial Outcome` and `prd.md > States and Boundaries`.
5. The result summary, evidence list, and stepped timeline appear below the input. A keyboard, pointer, or touch change to the timeline's native range control updates the selected time and amounts locally. Implements `prd.md > Sample and Timeline` and `prd.md > Screens and Layout`.

```text
Policy + property time zone ──> /api/analyze ──> OpenAI extraction
                                      │                 │
                                      └── validate <────┘
                                             │
Booking amount + validated rules ──> local date/money calculation
                                             │
                                 summary + evidence + timeline
```

## Stack

| Tool | Use and reason |
|---|---|
| Node.js 24 LTS | Local development and server runtime. Next.js 16 requires Node 20.9 or newer. [Node release schedule](https://nodejs.org/en/about/previous-releases) |
| Next.js 16.4.x App Router and React | One page plus a same-origin server API route keeps the sample and live flow together without a separate backend. [Next.js App Router](https://nextjs.org/docs/app) |
| TypeScript 6.0.3 | Catches mismatches between extracted rules, calculations, and UI while the app is built. This version works with the current Next.js build and lint configuration. [TypeScript](https://www.typescriptlang.org/docs/) |
| Tailwind CSS 4.x | Implements the approved warm-neutral and teal design without adding a separate styling system. [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs) |
| shadcn/ui, selectively | Source-generated accessible building blocks such as buttons, form fields, and cards; avoid adding components that do not help this one-screen POC. [shadcn/ui with Next.js](https://ui.shadcn.com/docs/installation/next) |
| Zod 4.x | Validates browser input, provider output, and API responses at runtime. [Zod](https://zod.dev/) |
| OpenAI Node SDK 7.x and Responses API | One server-side structured extraction request per live analysis. The learner approved OpenAI and the recommended `gpt-5.6-luna` model. [Responses guide](https://github.com/openai/openai-node/blob/main/docs/responses.md) · [Structured outputs](https://github.com/openai/openai-node/blob/main/docs/structured-outputs.md) |
| Luxon 3.7.x — proposed for review | Resolves property-local deadlines using IANA zones and exposes repeated local times around daylight-saving changes. If a local time is ambiguous or does not exist, the app can leave that rule unresolved instead of silently choosing an instant. [Luxon](https://moment.github.io/luxon/) · [API reference](https://moment.github.io/luxon/api-docs/) |
| decimal.js 10.6.x | Calculates percentage penalties without binary floating-point rounding surprises, then rounds to the currency's minor unit. [decimal.js](https://github.com/MikeMcl/decimal.js) |
| Vitest and Playwright | Vitest covers calculation, date, and validation behavior; Playwright covers the sample journey and keyboard timeline if browser setup is practical. Pin versions compatible with the chosen Node/Next setup during implementation. [Vitest](https://vitest.dev/guide/) · [Playwright](https://playwright.dev/docs/intro) |

Use the versions shown as the researched baseline for the draft; verify package compatibility and pin exact versions in the lockfile at build time. The timeline is a small custom SVG step chart with a native range input, rather than a charting dependency: that keeps exact deadline boundaries visible and the main interaction keyboard-operable.

## Where It Runs and How Someone Tries It

RefundCurve runs locally in a browser, with the Next.js development server handling live AI requests. Install Node.js 24 LTS, then from the project directory:

```sh
npm install
cp .env.example .env.local
# Add OPENAI_API_KEY to .env.local for live policy analysis.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Tokyo sample works without credentials; a valid API key is needed only for live extraction. Keep the key in `.env.local`, which is ignored by Git, and never paste it into chat or client-side code. For a hackathon submission, record a demo video under three minutes and provide a public GitHub repository. Local operation is sufficient for the recording. Deployment is optional; Vercel remains a possible later host, not a build requirement.

## Look and Feel

Carry forward `scope.md > Inspiration & Identity` and `prd.md > Look and Feel`: warm neutral surfaces, deep readable text, and restrained teal accents create a precise, trustworthy travel-finance feel. Use clear typography with tabular numerals for amounts. Refund and penalty each get a text label and distinct treatment, so color is never the only cue. Give the timeline the most visual space after analysis, stack input, result, timeline, and evidence on small screens, and respect reduced-motion preferences.

## Components

### Single Workspace Page

Composes the input and result areas on one responsive page, keeping the policy context available after analysis. Implements `prd.md > Screens and Layout` and `prd.md > States and Boundaries`.

### Policy and Booking Form

Collects pasted policy text, amount, currency, check-in date/time when known, and property time zone. Validates required values and explains what's missing. Implements `prd.md > Policy and Booking Input`.

### Tokyo Sample Loader

Loads the fictional $1,200 USD Tokyo booking and its prevalidated two-threshold rules. Labels them as sample data and does not call the provider. Implements `prd.md > Sample and Timeline` and `prd.md > States and Boundaries`.

### Analysis API Route

`POST /api/analyze` enforces a 100 KB streamed request-body cap and a 15,000-character policy limit, validates the live request, calls OpenAI on the server, checks the response, and returns supported rules plus unresolved issues. The provider response is capped at 12,000 output tokens. The route does not receive booking amount or currency and never logs policy contents. Implements `prd.md > Analysis and Rule Evidence` and `prd.md > States and Boundaries`.

### Extraction Prompt and Schema

Defines the supported policy shape and strict, size-bounded structured response. Policy text is quoted source material, not instructions: the extraction prompt explicitly says to ignore instructions embedded in it. The schema returns candidate local deadlines, penalty percentages, verbatim evidence quotes, plain-language interpretations, and clarification status. The server checks that each quote is an exact substring, then cross-checks its explicit date, unambiguous clock time, penalty wording, relationship between penalty and deadline, and any named time zone against the candidate before allowing the rule to be calculated. Refund percentages, reversed cutoff relationships, ambiguous/unsupported time-zone abbreviations, and penalties that are not explicitly for the full booking remain unresolved. Implements `prd.md > Analysis and Rule Evidence`.

If any policy rule remains unresolved or the supported deadlines conflict, the live summary and timeline are withheld until the policy can support a complete calculation. A whole-booking non-refundable condition may map to a 100% penalty when the quoted text makes that scope explicit; deposits, per-night or per-room charges, and other partial amounts remain unresolved.

### Property-Time Date Helper

Validates IANA time-zone names and converts usable local date/time thresholds to instants. It detects invalid, missing, ambiguous, or nonexistent deadline times and passes those cases to the unresolved state. Exact threshold instants use the new penalty at the boundary. Implements `prd.md > Financial Outcome` and `prd.md > States and Boundaries`.

### Rule Evaluator and Money Helper

Checks that rules are supported, complete, ordered, and do not contradict each other. It rejects decreasing rates and different penalties at the same instant, and collapses exact duplicate thresholds. If a deadline cannot be resolved or a supported rule is incomplete, it leaves the whole live result unresolved. For a selected cancellation instant, it uses the last threshold at or before that instant. Penalty equals booking amount times penalty percentage; refund equals booking amount minus penalty. Use decimal arithmetic and round the penalty half-up to the currency's minor unit, then subtract it from the authoritative entered amount. Implements `prd.md > Financial Outcome` and `prd.md > Sample and Timeline`.

### Financial Summary

Shows potential refund and penalty separately, the selected cancellation time, the next relevant deadline in property-local time, and the estimate disclaimer. Remaining time is based on the actual current instant, displayed in the property's zone. Implements `prd.md > Financial Outcome`.

### Evidence List

Shows each threshold's exact policy excerpt, interpretation, and supported or clarification-needed status. If a quote fails exact matching, that rule is rejected rather than shown as evidence. Implements `prd.md > Analysis and Rule Evidence`.

### Stepped Timeline

Renders refund/penalty amounts as a clearly labeled step chart with threshold markers and a native range control. The control supports keyboard, pointer, and touch; updates call only local calculation code. A textual deadline list provides another way to inspect every threshold. Implements `prd.md > Sample and Timeline` and `prd.md > Look and Feel`.

## Data Model

- **Booking input:** amount kept as a decimal string, currency code, optional check-in local date/time, and property IANA zone. Lives in page memory; user edits update it immediately. It is not stored after closing or refreshing.
- **Policy input:** pasted text lives in page memory and is sent only for the requested live analysis. It is not saved by the app or written to logs. The provider handles the submitted text under its API data policy, described below.
- **Extracted rule:** local deadline string (or missing), percentage penalty (decimal string from 0 through 100), exact evidence quote, plain-language interpretation, support status, and issue explanation. Returned by the API and kept in page memory.
- **Resolved rule:** validated instant in UTC plus its property-zone display form, attached to the extracted rule. Invalid or ambiguous local times do not become calculation thresholds.
- **Selected time and result:** selected instant, penalty, refund, applicable rule, and next deadline are computed in the browser from the booking and resolved rules. Moving the slider recomputes these locally. Values disappear when the page is closed or refreshed.
- **Sample fixture:** static TypeScript data shipped with the app: $1,200 USD; check-in November 26, 2026 at 3:00 PM `Asia/Tokyo`; no penalty before November 20 at 6:00 PM; 50% penalty beginning exactly then; 100% beginning exactly November 24 at 3:00 PM. It uses the same rule evaluator and money helper as live results.

Live extraction output is accepted only when the response passes Zod validation, the evidence is a verbatim substring of the original policy, the quoted date/time and penalty match the candidate, deadlines resolve in the property zone, and rules are consistent. If a policy condition remains unresolved, no live refund amount is shown. Missing or unsupported conditions remain visible; they are not filled in by the model or calculation code.

## File Structure

```text
refundcurve/
├── .env.example                  # Server-side key/model variable names; no secrets
├── .gitignore                    # Excludes .env.local, node_modules, and build output
├── LICENSE                       # MIT license for the public project
├── README.md                     # Setup, local run, privacy, and demo steps
├── components.json               # shadcn/ui source configuration
├── eslint.config.mjs              # Lint configuration
├── next.config.ts                 # Next.js configuration
├── package.json                   # Scripts and dependencies
├── package-lock.json              # Reproducible dependency versions
├── next-env.d.ts                  # Next.js generated type references
├── playwright.config.ts           # Browser test configuration
├── postcss.config.mjs              # Tailwind/PostCSS integration
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Unit and integration test configuration
├── devpost/
│   ├── learner-profile.md       # Learner preferences and learning moments
│   ├── scope.md                 # Approved proof-of-concept boundary
│   ├── prd.md                   # Approved product behavior
│   ├── spec.md                  # This technical blueprint
│   ├── checklist.md             # Ordered build and submission checks
│   └── app-map.html             # Offline code route and architecture map
├── src/
│   ├── app/
│   │   ├── api/analyze/route.ts # Validated, server-only AI extraction endpoint
│   │   ├── globals.css          # Tailwind setup and design tokens
│   │   ├── icon.svg              # App icon
│   │   ├── layout.tsx           # App shell, metadata, fonts
│   │   └── page.tsx             # Single workspace composition
│   ├── components/
│   │   ├── booking-form.tsx     # Policy and booking input
│   │   ├── financial-summary.tsx # Refund, penalty, next deadline, disclaimer
│   │   ├── policy-evidence.tsx  # Quotes, interpretations, unresolved issues
│   │   ├── policy-workspace.tsx # Page flow, loading, retry, and result states
│   │   ├── sample-button.tsx    # Clearly labeled sample action
│   │   ├── timeline-chart.tsx   # Step SVG, markers, and native range control
│   │   └── ui/
│   │       ├── button.tsx       # Button primitive
│   │       └── card.tsx         # Content surface primitive
│   ├── data/examples/
│   │   └── tokyo-policy.ts      # Prevalidated fictional sample fixture
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── analyze-handler.ts # Injectable API handler and server validation
│   │   │   ├── extract-policy.ts # OpenAI Responses API call and response checks
│   │   │   ├── prompt.ts         # Extraction instructions
│   │   │   ├── schema.ts         # Strict provider schema and Zod validation
│   │   │   └── validate-analysis.ts # Quote-to-deadline and penalty evidence checks
│   │   ├── calculations/
│   │   │   ├── evaluate-policy.ts # Threshold selection and consistency checks
│   │   │   └── money.ts          # Decimal-safe penalty/refund arithmetic
│   │   ├── dates/
│   │   │   └── property-time.ts  # IANA validation and local deadline resolution
│   │   └── validation/
│   │       └── booking.ts        # Browser and API booking-input schemas
│   └── types/
│       └── policy.ts             # Shared rule and result types
├── tests/
│   ├── e2e/
│   │   └── sample-flow.spec.ts   # Sample/live flows, unresolved policy, keyboard and narrow-screen checks
│   ├── integration/
│   │   └── analyze-route.test.ts # API behavior with mocked provider response
│   └── unit/
│       ├── evaluate-policy.test.ts # Rule ordering and threshold behavior
│       ├── money.test.ts           # Decimal calculations and currency rounding
│       ├── property-time.test.ts   # IANA and daylight-saving boundary cases
│       └── validate-analysis.test.ts # Exact policy evidence checks
```

## External Services and Dependencies

### OpenAI Responses API

- **Call:** the server uses the OpenAI Node SDK `responses.create` method, which calls `POST https://api.openai.com/v1/responses`.
- **Model:** `gpt-5.6-luna`, configurable through the server-only `OPENAI_MODEL` environment variable.
- **Input:** instructions describing supported cancellation rules and safe handling of untrusted policy text; user content contains the policy text and property IANA zone. Do not include amount or currency.
- **Output:** strict JSON Schema using the Responses API `text.format` structured-output setting, then validated again with Zod and semantic checks by the server. The route returns extracted rule candidates and unresolved issues to the browser.
- **Storage and privacy:** set `store: false`; this disables Responses application-state storage, but standard API abuse monitoring may retain submitted content for up to 30 days. The UI must disclose that live analysis sends text to OpenAI and must not claim zero retention. No policy text in app logs. [Your data](https://developers.openai.com/api/docs/guides/your-data) · [Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)
- **Key:** `OPENAI_API_KEY`, server-side only. The sample does not need a key. `.env.local` is excluded from Git.
- **Cost:** the model pricing page listed $0.20 per 1M input tokens and $1.20 per 1M output tokens when researched for this draft; actual cost depends on submitted policy length and response length and can change. [Model details and pricing](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
- **Rate limits:** limits depend on the API project/account tier; check the account's current limits during setup. A provider error shows a concise failure and retry action. [Rate limits](https://developers.openai.com/api/docs/guides/rate-limits)

### Local Hosting

No external host is needed to build or record the POC. Vercel is an optional later deployment target from the learner's original preferences; it is not configured or required in this spec. There is no database or authentication provider.

## Important Failure Modes

- **Missing key, provider error, or slow response** → show a loading state, then a clear retry message; preserve the form contents and keep the sample usable.
- **Unclear, conflicting, unsupported rule or evidence mismatch** → identify the affected rule and leave its financial result unresolved; do not approximate or show a fabricated quote.
- **Invalid property zone, invalid deadline, or daylight-saving ambiguity** → explain which time could not be resolved and withhold the affected calculation rather than silently shifting its instant.

## What Was Simplified and Why

- **Pasted text only** instead of PDF uploads — the approved POC proves the policy-to-timeline loop without document extraction setup.
- **One supported percentage-threshold pattern** instead of every hotel policy format — fixed fees, per-room rules, no-show conditions, tax treatment, and other complex forms remain unresolved, as approved in `scope.md > Later`.
- **One browser session with in-memory data** instead of accounts or a database — saved bookings and cross-session history are outside the POC.
- **One OpenAI request per live policy** instead of agent loops or re-analysis during timeline changes — extraction happens once; money and timeline updates remain deterministic and local.
- **Custom step SVG plus native range input** instead of a charting package — there is one chart with exact threshold boundaries and a direct accessible control.
- **Local demo first** instead of deployment setup — the hackathon requires a short video and public repository; a local app is sufficient to record the demo.

## Decisions and Open Issues

### Decisions

- **Learner-approved product shape:** one primary workspace; input first and results afterward, with the timeline as the main visual area.
- **Learner-approved provider:** OpenAI Responses API with `gpt-5.6-luna`, accepted when the learner said “Continue” after the provider recommendation. The provider receives policy text and property zone only; deterministic local code computes money.
- **Learner-approved scope:** pasted policy text and the supplied percentage/non-refundable sample pattern; the official hackathon rules do not mandate additional cancellation-policy types. See the learning moment in `learner-profile.md > Learning Moments`.
- **Design and review:** warm neutral surfaces, dark readable type, teal accent, accessible timeline; review format is Markdown, per the saved profile.
- **Recommended technical choice for this review:** Luxon, because it supports IANA zones and exposes daylight-saving ambiguity; the tradeoff is one additional date library. “Continue” authorized ongoing work; approval of this spec will confirm or change this recommendation.
- **Derived implementation detail:** use decimal.js and currency-aware rounding for the financial amounts; use Zod on both sides of the API boundary; keep the provider key server-side.

### Learning moment

The learner asked whether the hackathon rules require other policy types. Checking the official rules showed they do not specify policy types, so the approved POC stays focused on the sample thresholds. This clarifies that policy-format breadth is a product decision, not a hackathon requirement.

### Proposed rule boundary for review

The app will calculate only when it can turn a clearly stated local date-and-time threshold into an unambiguous instant and validate a percentage from 0% to 100%. Relative wording such as “two days before arrival,” a missing year, fixed fees, and other unsupported policy structures will be marked unresolved in the first demo. This keeps deadline math explicit; if relative deadlines are important to the first demo, that would change the extraction schema and date-calculation work. The supplied Tokyo example is fully supported.

### Open issues

- Confirm during review that Luxon is acceptable and that relative-duration deadlines can remain unresolved in the first demo. These are the only proposed technical/supported-rule boundaries awaiting the learner's approval.
- At implementation, verify current package compatibility, exact patch versions, model availability/pricing, and the account-specific rate limit before pinning dependencies and recording the demo.
- No product-approval questions remain in `prd.md > Open Questions`.
