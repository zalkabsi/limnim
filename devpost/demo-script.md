# Limnim Live Demo

## Narrated sample-mode preview

`record-demo.mjs` writes the captioned, fictional sample recording and matching narration cues. To add the synthetic voiceover to an existing or newly recorded sample clip:

```sh
python3 -m pip install --upgrade --target /tmp/limnim-demo-python -r devpost/requirements-demo.txt
NODE_USE_ENV_PROXY=1 npm run dev
# In a second terminal:
npm run demo:sample
# Then render the narration:
PYTHONPATH=/tmp/limnim-demo-python python3 devpost/render-narrated-demo.py \
  devpost/assets/limnim-demo.mp4 devpost/assets/limnim-demo-cues.json --sample
```

This preview does not perform live AI extraction and is not the final hackathon demo. The narration explicitly describes the sample data and its limitations.

The recording uses two fictional policies and booking details. The first request demonstrates live AI extraction for a Tokyo booking; the second shows that a discretionary, relative deadline remains unresolved. The script checks the API request contains only the policy text and property time zone, verifies verbatim evidence and the calculated timeline, and checks that no estimate appears for the ambiguous policy.

## Record the final demo

Install the dependencies and start the app with the workspace proxy enabled:

```sh
npm ci
python3 -m pip install --upgrade --target /tmp/limnim-demo-python -r devpost/requirements-demo.txt
NODE_USE_ENV_PROXY=1 npm run dev
```

In a second terminal, run:

```sh
PYTHONPATH=/tmp/limnim-demo-python npm run demo:live
```

The live recording requires a funded OpenAI API account bound to the runtime secret `OPENAI_API_KEY`. Keep the server running. The script records captions, synthesizes narration, checks that the resulting MP4 has audio and video and lasts between one and three minutes, and only then replaces `devpost/assets/limnim-demo-narrated.mp4`. It never reads a real booking, uses a real policy, or displays the API key.

The recorder uses Playwright's ffmpeg helper when available and falls back to `/usr/bin/ffmpeg` on Linux. On another platform, install the helper with `npx playwright install ffmpeg`.

## Scene outline

1. Introduce Limnim as a front-desk aid for cancellation questions and show the fictional Tokyo booking.
2. Explain the live extraction request and show the two supported deadlines, exact quotes, and prepared guest response.
3. Show the strict-after deadline: the estimate remains $1,200/$0 at 6:00 PM, then changes to $600/$600 at 6:01 PM; show the inclusive final threshold at 3:00 PM and its $0/$1,200 result.
4. Submit the fictional ambiguous policy and show its unresolved status without an estimate, response, or timeline.
5. Close by noting that the booking and policies are fictional and the estimate is not a confirmed hotel refund.

The narration is synthetic. Review the final video before uploading it.
