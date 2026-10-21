# Demo Video Plan

**Reviewed local artifact:** A 78.5-second narrated sample-only preview is available at `devpost/assets/limnim-demo-narrated.mp4`. It uses fictional Tokyo data, matches the public Render demo, and makes no live analysis request. The video and its silent source are ignored by Git.

**YouTube URL supplied by the entrant:** <https://youtu.be/q6SJWiaujMI>. The local preview was reviewed and decoded successfully. The uploaded YouTube copy could not be checked from this workspace because YouTube is not in the enforced HTTP egress allowlist; confirm that this URL is publicly playable and points to the reviewed sample-only recording before entering it in Devpost.

## Official constraints

- The video must be under three minutes, show the project working, be publicly visible on YouTube or Vimeo, and be linked in the Devpost form.
- The challenge overview describes a 1-to-3-minute screen recording. The current preview is 78.5 seconds.
- Avoid unauthorized marks, copyrighted music, real booking details, `.env.local`, and API keys. Keep project claims consistent with the sample-only footage.
- Keep the public project available through the end of judging.

Sources: [official rules](https://learn-ai-basics.devpost.com/rules) and [challenge overview](https://learn-ai-basics.devpost.com/).

## Sample-only recording workflow

The sample preview needs Node.js, npm, Chromium, system `ffmpeg`, and the Python dependencies in `devpost/requirements-demo.txt`. It does not need an OpenAI key or Playwright's downloaded ffmpeg helper.

```sh
python3 -m pip install --upgrade --target /tmp/limnim-demo-python -r devpost/requirements-demo.txt
NEXT_PUBLIC_SAMPLE_DEMO=true NODE_USE_ENV_PROXY=1 npm run dev
```

In a second terminal, run:

```sh
npm run demo:sample
PYTHONPATH=/tmp/limnim-demo-python python3 devpost/render-narrated-demo.py \
  devpost/assets/limnim-demo.mp4 devpost/assets/limnim-demo-cues.json --sample
```

The recorder requires the sample-demo notice, confirms that the live form is absent, and fails if it sends an `/api/analyze` request. It captures Chromium frames and uses `ffmpeg` from `PATH` to create the silent source. The narration renderer adds synthetic English voiceover. All generated media remains local and ignored by Git.

## Preview content

1. Open Limnim with the interactive sample-demo notice and fictional Tokyo booking.
2. Show the refund and penalty summary, copyable staff reply, policy quote, and estimate caveat.
3. Move to the first inclusive threshold and show the $600 refund / $600 penalty.
4. Move to the final threshold and show the $0 refund / $1,200 penalty and supporting evidence.
5. Close by noting the booking is fictional and the estimate is not a confirmed hotel refund.

The preview does not demonstrate live AI extraction. Verify live analysis separately before making claims that it works. The separate `demo:live` recorder requires an authorized account with available credits and Playwright's ffmpeg capture helper; it overwrites the same narrated output path.

## Review and submission handoff

- The local preview's sample notice, figures, timeline, evidence, captions, and narration were checked against the current demo; the full file decoded without errors and runs for 78.5 seconds.
- The entrant supplied a YouTube link. Playback, visibility, and whether the upload is the same reviewed file could not be confirmed under the workspace's enforced egress policy.
- Confirm public playback and add the supplied URL to the Devpost video field. The video itself was not uploaded or changed by this audit.
