# RefundCurve Demo Narration

Target video runtime: about 1 minute 18 seconds. The narration uses a relaxed pace with short pauses so viewers can inspect each change. The recording uses the fictional Tokyo sample, so no personal booking data or API key is needed.

| Time | On-screen action | Narration |
| --- | --- | --- |
| 0:00–0:10 | Show the opening workspace and project name. | “This is RefundCurve. It helps travelers see how a hotel's cancellation deadlines could affect what they get back.” |
| 0:10–0:21 | Choose **Try sample booking** and show the initial estimate. | “I'll use the fictional Tokyo sample. Before the first deadline, the potential refund is twelve hundred dollars, with no cancellation penalty.” |
| 0:21–0:38 | Move the timeline to November 20, 2026, at 6:00 PM JST. | “At the first deadline, the estimate changes to a six-hundred-dollar refund and a six-hundred-dollar penalty. Move the slider past that cutoff to see the potential refund recalculate. The displayed amounts follow the selected date and time.” |
| 0:38–0:55 | Move the timeline to November 24, 2026, at 3:00 PM JST. | “At the final deadline, the booking becomes non-refundable in this sample, so the estimated refund drops to zero. The full booking total now appears as the cancellation penalty. The penalty stays tied to the original booking total.” |
| 0:55–1:07 | Show the evidence excerpts beside the timeline. | “Each step is tied to the policy text, so you can check what the estimate is based on. You can also inspect the quoted deadline and penalty.” |
| 1:07–1:18 | Return to the full result view. | “RefundCurve helps you read the terms. It doesn't cancel bookings or promise refunds. Use the estimate to ask better questions before you decide.” |

The first-person wording is a draft. Adjust anything that does not sound like you before recording.

## Build the narrated video

With the project dependencies installed and the app running locally, record the captioned screen capture with `node devpost/record-demo.mjs`. Then install `edge-tts` with `python3 -m pip install edge-tts` and run `python3 devpost/render-narrated-demo.py`. The script uses the en-US-AriaNeural synthetic voice, the workspace HTTPS proxy, and the configured CA bundle; it keeps TLS verification enabled and writes `assets/refundcurve-demo-narrated.mp4`.
