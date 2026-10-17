# RefundCurve

RefundCurve is a small web app for exploring how a hotel cancellation policy can change a traveler's potential refund. It shows supported deadlines on a time-zone-aware timeline and links each rule to an exact policy excerpt. The estimate is not a guarantee of a hotel refund or a legal interpretation.

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```sh
npm ci
cp .env.example .env.local
```

For live policy analysis, add your OpenAI API key to `.env.local`. Keep it server-side and do not commit or share it. The model can be changed with `OPENAI_MODEL`; the default is `gpt-5.6-luna`.

```sh
npm run dev
```

Open <http://localhost:3000>. The Tokyo example works without credentials. Live analysis sends only pasted policy text and the property's IANA time zone to OpenAI. The booking amount and currency remain in the browser. Requests set `store: false`, which disables response storage; OpenAI may retain API inputs for abuse monitoring for up to 30 days. Avoid including names, confirmation numbers, or other personal details in policy text.

## Supported behavior

The first version calculates explicit local date-and-time cancellation thresholds with percentage penalties, including a clearly stated whole-booking non-refundable deadline. It leaves relative deadlines, missing years or times, ambiguous or unsupported time-zone abbreviations, daylight-saving ambiguities, conflicting or unlinked penalties, refund percentages, fixed fees, partial-night or per-room terms, taxes, and other unsupported rules unresolved. It does not save bookings, contact a hotel, or cancel a reservation.

The demo runs locally and has no public hosting or shared API-key rate limiter. Before deploying it with a server-side OpenAI key to the public internet, add abuse and usage controls for the analysis endpoint.

## Checks

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run test:e2e
npm run build
```

The integration tests mock OpenAI and do not need an API key. Playwright uses Chromium; set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` if Chromium is installed somewhere other than `/usr/bin/chromium`.

## Demo outline

1. Open the Tokyo example and move the timeline across both cancellation deadlines.
2. If an API key is available, submit a short policy with two explicit percentage thresholds and inspect the quoted excerpts.
3. Submit a relative or incomplete deadline and confirm that RefundCurve explains the missing detail without showing a guessed amount.

For a hackathon recording, keep the app local and avoid showing `.env.local`, API keys, or personal booking information.

## License

MIT. See [LICENSE](./LICENSE).
