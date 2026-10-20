import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const baseURL = process.env.LIMNIM_DEMO_URL ?? "http://127.0.0.1:3000";
const outputPath = join(process.cwd(), "devpost", "assets", "limnim-demo.mp4");
const videoDir = join(tmpdir(), `limnim-video-${process.pid}`);
mkdirSync(videoDir, { recursive: true });

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

  const caption = async (text) => {
    await page.evaluate((label) => {
      let element = document.getElementById("limnim-demo-caption");
      if (!element) {
        element = document.createElement("div");
        element.id = "limnim-demo-caption";
        document.body.append(element);
      }
      element.textContent = label;
    }, text);
  };

  const waitUntil = async (seconds) => {
    const remaining = recordingStartedAt + seconds * 1_000 - performance.now();
    if (remaining > 0) await page.waitForTimeout(remaining);
  };

  await caption("Limnim helps hotel staff answer cancellation questions with a clear estimate and the exact policy wording.");
  await waitUntil(9);
  await page.getByRole("button", { name: /Try sample booking/i }).click();
  const sampleHeading = page.getByRole("heading", { name: "Tokyo sample booking" });
  await sampleHeading.waitFor();
  await page.addStyleTag({ content: ".hero, .sample-card { display: none !important; }" });
  await page.locator(".workspace").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await expectAmounts("$1,200.00", "$0.00");
  await page.locator(".guest-response-card").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await caption("This ready-to-review reply includes the selected time, estimate, policy quote, and a clear caveat.");
  await waitUntil(15);
  await page.locator(".timeline-card").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await waitUntil(10);
  await caption("This fictional Tokyo sample starts at $1,200, with no cancellation penalty before the first deadline.");

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
  await caption("The Tokyo sample uses inclusive thresholds, so its penalty applies at each exact deadline.");
  await waitUntil(37.5);
  await setTime("2026-11-24T15:00");
  await expectAmounts("$0.00", "$1,200.00");
  await waitUntil(38);
  await caption("At the final deadline, this sample booking becomes non-refundable.");

  await waitUntil(54.5);
  const evidence = page.locator(".evidence-item blockquote").first();
  await evidence.evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await waitUntil(55);
  await caption("Each step is tied to the policy text, so you can check what the estimate is based on.");

  await waitUntil(66.5);
  await page.locator(".summary-grid").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await waitUntil(67);
  await caption("Staff review and send replies through their existing channel. Limnim doesn't message guests or promise a refund.");
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
  console.log(`Saved ${outputPath}`);
}

async function expectAmounts(refund, penalty) {
  await page.getByTestId("refund-amount").waitFor();
  await page.getByTestId("penalty-amount").waitFor();
  assert.equal((await page.getByTestId("refund-amount").innerText()).trim(), refund);
  assert.equal((await page.getByTestId("penalty-amount").innerText()).trim(), penalty);
}
