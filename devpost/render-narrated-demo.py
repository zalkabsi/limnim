#!/usr/bin/env python3
"""Add a timed synthetic voiceover to the captioned Limnim screen recording."""

from __future__ import annotations

import asyncio
import json
import os
import shutil
import ssl
import subprocess
import sys
import tempfile
from pathlib import Path

import aiohttp
import edge_tts
import edge_tts.communicate as communicate


ASSET_DIR = Path(__file__).resolve().parent / "assets"
OUTPUT_PATH = ASSET_DIR / "limnim-demo-narrated.mp4"
VOICE = "en-US-AriaNeural"

LIVE_NARRATION = [
    ("opening", "Hotel cancellation questions can take staff away from guests. Limnim prepares an evidence-linked answer.", "+0%"),
    ("booking", "Here is a fictional Tokyo booking: twelve hundred US dollars, with check-in on November twenty-fifth, twenty twenty-six.", "+0%"),
    ("live-request", "Limnim sends only the fictional policy and Tokyo time zone for live AI extraction. The booking total stays in this browser.", "+0%"),
    ("supported-result", "The live extraction found a strictly-after fifty percent threshold, then an inclusive one hundred percent threshold.", "+0%"),
    ("evidence", "Each extracted deadline is linked to an exact sentence from the policy, so the evidence can be checked against the result.", "+0%"),
    ("copy-response", "The reply is calculated locally, includes the source wording, and can be reviewed before staff sends it.", "+0%"),
    ("before-first", "Before the first deadline, the estimate is twelve hundred dollars back with no cancellation penalty.", "+0%"),
    ("first-deadline", "At six p.m. the old rate still applies because the policy says after. At six-oh-one, the estimate changes to six hundred dollars back.", "+0%"),
    ("last-deadline", "At November twenty-fourth, three p.m. Japan time, the inclusive rule makes the booking non-refundable.", "+0%"),
    ("ambiguous-policy", "This second fictional policy says a fifty percent fee may apply within forty-eight hours, at the hotel's discretion.", "+0%"),
    ("ambiguous-request", "The live analyzer checks whether those incomplete terms support a precise deadline and penalty.", "+0%"),
    ("unresolved", "Because the policy gives no exact cutoff and makes the fee discretionary, Limnim shows no refund estimate.", "+0%"),
    ("closing", "The policy and booking are fictional. Staff should review each estimate; it is not confirmation of a hotel's refund.", "+0%"),
]

# IDs match the captions recorded by record-demo.mjs. This version describes
# only the fictional sample flow and must not imply that live AI analysis ran.
SAMPLE_NARRATION = [
    ("opening", "Limnim helps hotel staff answer cancellation questions with a clear estimate and the exact policy wording behind it.", "+0%"),
    ("sample-booking", "Fictional Tokyo sample booking.", "+0%"),
    ("guest-reply", "A reply is ready with policy evidence.", "+0%"),
    ("before-first", "No cancellation penalty before the deadline.", "+0%"),
    ("first-deadline", "At the first listed deadline, the inclusive rule produces a six hundred dollar refund and six hundred dollar penalty.", "+0%"),
    ("last-deadline", "At the final threshold, the sample shows no estimated refund and a twelve hundred dollar penalty.", "+0%"),
    ("evidence", "Each timeline result links to the exact policy wording for staff to review.", "+0%"),
    ("closing", "Staff review and send the draft through their existing channel. The data is fictional, and the estimate does not confirm a hotel refund.", "+0%"),
]


async def synthesize(destination: Path, narration: list[tuple[str, str, str]]) -> None:
    ca_bundle = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE")
    verify_context = ssl.create_default_context(cafile=ca_bundle or None)
    extra_ca = os.environ.get("NODE_EXTRA_CA_CERTS")
    if extra_ca and Path(extra_ca).is_file():
        verify_context.load_verify_locations(cafile=extra_ca)
    if verify_context.verify_mode != ssl.CERT_REQUIRED or not verify_context.check_hostname:
        raise RuntimeError("TLS certificate and host verification must stay enabled.")
    communicate._SSL_CTX = verify_context

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    if proxy is None:
        proxy = os.environ.get("HTTP_PROXY") or os.environ.get("http_proxy")
    if not proxy:
        raise RuntimeError("The workspace HTTPS proxy is missing; narration uses the configured proxy.")

    for index, (_, text, rate) in enumerate(narration, start=1):
        connector = aiohttp.TCPConnector(ssl=verify_context)
        tts = edge_tts.Communicate(
            text,
            voice=VOICE,
            rate=rate,
            connector=connector,
            proxy=proxy,
        )
        media_path = destination / f"line-{index:02d}.mp3"
        with media_path.open("wb") as media:
            async for chunk in tts.stream():
                if chunk["type"] == "audio":
                    media.write(chunk["data"])


def read_cues(cue_path: Path, narration: list[tuple[str, str, str]]) -> dict[str, float]:
    items = json.loads(cue_path.read_text(encoding="utf-8"))
    if not isinstance(items, list):
        raise ValueError("The narration cue file must contain a list.")
    cues: dict[str, float] = {}
    for item in items:
        cue_id = item.get("id")
        start_seconds = float(item.get("startSeconds"))
        if cue_id in cues or start_seconds < 0:
            raise ValueError("The narration cue file contains an invalid cue.")
        cues[cue_id] = start_seconds
    expected = {cue_id for cue_id, _, _ in narration}
    if set(cues) != expected:
        raise ValueError("The narration cues do not match the recorded captions.")
    return cues


def get_video_duration(video_path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(video_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    duration = float(result.stdout.strip())
    if duration <= 0:
        raise ValueError("The captioned video has no usable duration.")
    return duration


def get_media_duration(media_path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(media_path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


def render(video_path: Path, cue_path: Path, mode: str = "live") -> None:
    if not video_path.is_file():
        raise FileNotFoundError(f"Record the captioned video first: {video_path}")
    if not cue_path.is_file():
        raise FileNotFoundError(f"The narration cue file is missing: {cue_path}")
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg is required to mux the narration into the MP4.")
    if shutil.which("ffprobe") is None:
        raise RuntimeError("ffprobe is required to verify the narrated MP4.")

    narration = SAMPLE_NARRATION if mode == "sample" else LIVE_NARRATION
    cues = read_cues(cue_path, narration)
    video_duration = get_video_duration(video_path)
    output_path = OUTPUT_PATH
    with tempfile.TemporaryDirectory(prefix="limnim-narration-") as temp_dir:
        temp_path = Path(temp_dir)
        asyncio.run(synthesize(temp_path, narration))

        for index, (cue_id, _, _) in enumerate(narration, start=1):
            next_cue = narration[index][0] if index < len(narration) else None
            audio_end = cues[cue_id] + get_media_duration(temp_path / f"line-{index:02d}.mp3")
            next_start = cues[next_cue] if next_cue else video_duration
            if audio_end > next_start + 0.15:
                raise ValueError(f"Narration for {cue_id!r} overlaps the next scene or the end of the video.")

        inputs = ["-i", str(video_path)]
        filter_parts: list[str] = []
        voice_inputs: list[str] = []
        for index, (cue_id, _, _) in enumerate(narration, start=1):
            inputs.extend(["-i", str(temp_path / f"line-{index:02d}.mp3")])
            label = f"voice{index}"
            delay_ms = round(cues[cue_id] * 1_000)
            filter_parts.append(f"[{index}:a]adelay={delay_ms}:all=1[{label}]")
            voice_inputs.append(f"[{label}]")

        mix = "".join(voice_inputs)
        filter_parts.append(
            f"{mix}amix=inputs={len(narration)}:duration=longest:dropout_transition=0,"
            f"loudnorm=I=-16:TP=-1.5:LRA=7,apad,atrim=duration={video_duration},"
            "aresample=48000[aout]"
        )
        staging_path = output_path.with_name("limnim-demo-narrated.tmp.mp4")
        command = [
            "ffmpeg", "-y", *inputs,
            "-filter_complex", ";".join(filter_parts),
            "-map", "0:v:0", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
            "-t", str(video_duration), "-movflags", "+faststart",
            str(staging_path),
        ]
        try:
            subprocess.run(command, check=True)
            staging_path.replace(output_path)
        finally:
            staging_path.unlink(missing_ok=True)

    print(f"Saved {output_path}")


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4) or (len(sys.argv) == 4 and sys.argv[3] != "--sample"):
        raise SystemExit("Usage: python3 devpost/render-narrated-demo.py CAPTIONED_VIDEO CUES.json [--sample]")
    mode = "sample" if len(sys.argv) == 4 else "live"
    render(Path(sys.argv[1]), Path(sys.argv[2]), mode)
