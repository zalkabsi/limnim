# RefundCurve Live Demo

The recording uses two fictional policies and booking details. The first request demonstrates live AI extraction for a Tokyo booking; the second shows that a discretionary, relative deadline remains unresolved. The script checks the API request contains only the policy text and property time zone, verifies verbatim evidence and the calculated timeline, and checks that no estimate appears for the ambiguous policy.

## Record the final demo

Install the dependencies and start the app with the workspace proxy enabled:

```sh
npm ci
python3 -m pip install --upgrade --target /tmp/refundcurve-demo-python -r devpost/requirements-demo.txt
NODE_USE_ENV_PROXY=1 npm run dev
```

In a second terminal, run:

```sh
PYTHONPATH=/tmp/refundcurve-demo-python npm run demo:live
```

The live recording requires a funded OpenAI API account bound to the runtime secret `OPENAI_API_KEY`. Keep the server running. The script records captions, synthesizes narration, checks that the resulting MP4 has audio and video and lasts between one and three minutes, and only then replaces `devpost/assets/refundcurve-demo-narrated.mp4`. It never reads a real booking, uses a real policy, or displays the API key.

The recorder uses Playwright's ffmpeg helper when available and falls back to `/usr/bin/ffmpeg` on Linux. On another platform, install the helper with `npx playwright install ffmpeg`.

## Scene outline

1. Introduce RefundCurve and the fictional Tokyo booking.
2. Explain the live extraction request and show the two supported deadlines and exact quoted evidence.
3. Move the timeline through the $1,200/$0 starting point, the $600/$600 first threshold, and the $0/$1,200 final threshold.
4. Submit the fictional ambiguous policy and show its unresolved status without an estimate or timeline.
5. Close by noting that the booking and policies are fictional and the estimate is not a promise of a hotel's refund.

The narration is synthetic. Review the final video before uploading it.
