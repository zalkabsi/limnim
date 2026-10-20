import { chromium } from "playwright";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const baseURL = process.env.LIMNIM_DEMO_URL ?? "http://127.0.0.1:3000";
const outputPath = join(process.cwd(), "devpost", "assets", "limnim-demo.mp4");
const cuePath = join(process.cwd(), "devpost", "assets", "limnim-demo-cues.json");
const videoDir = join(tmpdir(), `limnim-video-${process.pid}`);
mkdirSync(videoDir, { recursive: true });
const narrationCues = [];

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({
  headless: true,
  ...(chromiumPath ? { executablePath: chromiumPath } : {}),
});
const warmupPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
try {
  await warmupPage.goto(baseURL, { waitUntil: "domcontentloaded" });
  await warmupPage.getByRole("heading", { name: /Answer cancellation questions/i }).waitFor();
} finally {
  await warmupPage.close();
}
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();
const recordingStartedAt = performance.now();

try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Answer cancellation questions/i }).waitFor();
  await page.addStyleTag({ content: `
    .live-form { display: none !important; }
    #limnim-demo-caption {
      position: fixed; z-index: 2147483647; left: 50%; bottom: 24px;
      transform: translateX(-50%); width: min(900px, calc(100vw - 48px));
      box-sizing: border-box; padding: 15px 24px; border-radius: 12px;
      background: rgba(17, 45, 37, .94); color: #fff;
      font: 600 18px/1.35 system-ui, sans-serif; text-align: center;
      letter-spacing: .01em; box-shadow: 0 8px 32px rgba(0,0,0,.18);
    }
  ` });

  const caption = async (id, text) => {
    await page.evaluate((label) => {
      let element = document.getElementById("limnim-demo-caption");
      if (!element) {
        element = document.createElement("div");
        element.id = "limnim-demo-caption";
        document.body.append(element);
      }
      element.textContent = label;
    }, text);
    narrationCues.push({ id, startSeconds: (performance.now() - recordingStartedAt) / 1000 });
  };

  const waitUntil = async (seconds) => {
    const remaining = recordingStartedAt + seconds * 1_000 - performance.now();
    if (remaining > 0) await page.waitForTimeout(remaining);
  };

  await caption("opening", "Limnim helps hotel staff answer cancellation questions with a clear estimate and the exact policy wording.");
  await waitUntil(9);
  await caption("sample-booking", "This fictional Tokyo sample booking totals $1,200 and has two cancellation deadlines.");
  await page.getByRole("button", { name: /Try sample booking/i }).click();
  const sampleHeading = page.getByRole("heading", { name: "Tokyo sample booking" });
  await sampleHeading.waitFor();
  await page.addStyleTag({ content: ".hero, .sample-card { display: none !important; }" });
  await page.locator(".workspace").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await expectAmounts("$1,200.00", "$0.00");
  await waitUntil(12);
  await page.locator(".guest-response-card").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await caption("guest-reply", "A prepared reply shows the selected time, calculated amounts, policy quote, and review caveat.");
  await waitUntil(17);
  await page.locator(".timeline-card").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await caption("before-first", "Before the cutoff, the full amount is refundable.");

  const slider = page.getByRole("slider", { name: "Cancellation time" });
  const setTime = async (localTime) => {
    const instant = Date.parse(`${localTime}:00+09:00`);
    await slider.evaluate((element, value) => {
      const input = element;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, instant);
  };

  await waitUntil(20.5);
  await setTime("2026-11-20T18:00");
  await expectAmounts("$600.00", "$600.00");
  await waitUntil(21);
  await caption("first-deadline", "At the first listed deadline, the inclusive rule produces a $600 refund and $600 penalty.");
  await waitUntil(37.5);
  await setTime("2026-11-24T15:00");
  await expectAmounts("$0.00", "$1,200.00");
  await waitUntil(38);
  await caption("last-deadline", "At the final threshold, the sample shows no estimated refund and a $1,200 penalty.");

  await waitUntil(54.5);
  const evidence = page.locator(".evidence-item blockquote").first();
  await evidence.evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await waitUntil(55);
  await caption("evidence", "Each timeline result links to the exact policy wording for staff to review.");

  await waitUntil(66.5);
  await page.locator(".summary-grid").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await waitUntil(67);
  await caption("closing", "Staff review and send the draft through their existing channel. The data is fictional, and the estimate does not confirm a hotel refund.");
  await waitUntil(78.4);
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  const rawPath = await video.path();
  const encoded = spawnSync("ffmpeg", [
    "-y", "-i", rawPath, "-t", "78.4", "-an", "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", outputPath,
  ], { stdio: "inherit" });
  if (encoded.status !== 0) throw new Error("ffmpeg could not create the MP4 demo recording.");
  writeFileSync(cuePath, `${JSON.stringify(narrationCues, null, 2)}\n`, "utf8");
  console.log(`Saved ${outputPath}`);
  console.log(`Saved narration cues ${cuePath}`);
}

async function expectAmounts(refund, penalty) {
  await page.getByTestId("refund-amount").waitFor();
  await page.getByTestId("penalty-amount").waitFor();
  assert.equal((await page.getByTestId("refund-amount").innerText()).trim(), refund);
  assert.equal((await page.getByTestId("penalty-amount").innerText()).trim(), penalty);
}
