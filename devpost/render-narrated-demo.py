#!/usr/bin/env python3
"""Add a timed synthetic voiceover to the captioned RefundCurve screen recording."""

from __future__ import annotations

import asyncio
import os
import shutil
import ssl
import subprocess
import tempfile
from pathlib import Path

import edge_tts
import edge_tts.communicate as communicate


ASSET_DIR = Path(__file__).resolve().parent / "assets"
VIDEO_PATH = ASSET_DIR / "refundcurve-demo.mp4"
OUTPUT_PATH = ASSET_DIR / "refundcurve-demo-narrated.mp4"
VOICE = "en-US-AriaNeural"
VIDEO_DURATION = 78.4

# These starts match the narration timings in demo-script.md. The 0.8-second
# lead-in lets the recorded page finish its initial paint before speech begins.
NARRATION = [
    (0.8, "This is RefundCurve. It helps travelers see how a hotel's cancellation deadlines could affect what they get back.", "-10%"),
    (10.8, "I'll use the fictional Tokyo sample. Before the first deadline, the potential refund is twelve hundred dollars, with no cancellation penalty.", "+0%"),
    (21.8, "At the first deadline, the estimate changes to a six-hundred-dollar refund and a six-hundred-dollar penalty. Move the slider past that cutoff to see the potential refund recalculate. The displayed amounts follow the selected date and time.", "-10%"),
    (38.8, "At the final deadline, the booking becomes non-refundable in this sample, so the estimated refund drops to zero. The full booking total now appears as the cancellation penalty. The penalty stays tied to the original booking total.", "-10%"),
    (55.8, "Each step is tied to the policy text, so you can check what the estimate is based on. You can also inspect the quoted deadline and penalty.", "-10%"),
    (67.8, "RefundCurve helps you read the terms. It doesn't cancel bookings or promise refunds. Use the estimate to ask better questions before you decide.", "+0%"),
]


async def synthesize(destination: Path) -> None:
    ca_bundle = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    if ca_bundle:
        communicate._SSL_CTX = ssl.create_default_context(cafile=ca_bundle)

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy is None:
        proxy = os.environ.get("HTTP_PROXY") or os.environ.get("http_proxy")
    if not proxy:
        raise RuntimeError("The workspace HTTPS proxy is missing; narration uses the configured proxy.")

    for index, (_, text, rate) in enumerate(NARRATION, start=1):
        tts = edge_tts.Communicate(text, voice=VOICE, rate=rate, proxy=proxy)
        media_path = destination / f"line-{index:02d}.mp3"
        with media_path.open("wb") as media:
            async for chunk in tts.stream():
                if chunk["type"] == "audio":
                    media.write(chunk["data"])


def render() -> None:
    if not VIDEO_PATH.is_file():
        raise FileNotFoundError(f"Record the captioned video first: {VIDEO_PATH}")
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required to mux the narration into the MP4.")

    with tempfile.TemporaryDirectory(prefix="refundcurve-narration-") as temp_dir:
        temp_path = Path(temp_dir)
        asyncio.run(synthesize(temp_path))

        inputs = ["-i", str(VIDEO_PATH)]
        filter_parts: list[str] = []
        voice_inputs: list[str] = []
        for index, (start_seconds, _, _) in enumerate(NARRATION, start=1):
            inputs.extend(["-i", str(temp_path / f"line-{index:02d}.mp3")])
            label = f"voice{index}"
            delay_ms = round(start_seconds * 1_000)
            filter_parts.append(f"[{index}:a]adelay={delay_ms}:all=1[{label}]")
            voice_inputs.append(f"[{label}]")

        mix = "".join(voice_inputs)
        filter_parts.append(
            f"{mix}amix=inputs={len(NARRATION)}:duration=longest:dropout_transition=0,"
            f"loudnorm=I=-16:TP=-1.5:LRA=7,apad,atrim=duration={VIDEO_DURATION},"
            "aresample=48000[aout]"
        )
        command = [
            "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(filter_parts),
            "-map", "0:v:0", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
            "-t", str(VIDEO_DURATION), "-movflags", "+faststart",
            str(OUTPUT_PATH),
        ]
        subprocess.run(command, check=True)

    print(f"Saved {OUTPUT_PATH}")


if __name__ == "__main__":
    render()
