import { chromium } from "playwright";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

const baseURL = process.env.REFUNDCURVE_DEMO_URL ?? "http://127.0.0.1:3000";
const outputPath = join(process.cwd(), "devpost", "assets", "refundcurve-demo.mp4");
const videoDir = join(tmpdir(), `refundcurve-video-${process.pid}`);
mkdirSync(videoDir, { recursive: true });

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const browser = await chromium.launch({
  headless: true,
  ...(chromiumPath ? { executablePath: chromiumPath } : {}),
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  recordVideo: { dir: videoDir, size: { width: 1440, height: 900 } },
});
const page = await context.newPage();

try {
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Know what cancellation could cost/i }).waitFor();
  await page.addStyleTag({ content: `
    .live-form { display: none !important; }
    #refundcurve-demo-caption {
      position: fixed; z-index: 2147483647; left: 50%; bottom: 24px;
      transform: translateX(-50%); width: min(900px, calc(100vw - 48px));
      box-sizing: border-box; padding: 15px 24px; border-radius: 12px;
      background: rgba(17, 45, 37, .94); color: #fff;
      font: 600 18px/1.35 system-ui, sans-serif; text-align: center;
      letter-spacing: .01em; box-shadow: 0 8px 32px rgba(0,0,0,.18);
    }
  ` });

  const caption = async (text, duration = 7_000) => {
    await page.evaluate((label) => {
      let element = document.getElementById("refundcurve-demo-caption");
      if (!element) {
        element = document.createElement("div");
        element.id = "refundcurve-demo-caption";
        document.body.append(element);
      }
      element.textContent = label;
    }, text);
    await page.waitForTimeout(duration);
  };

  await caption("Hotel cancellation terms can be hard to compare.", 7_000);
  await page.getByRole("button", { name: /Try sample booking/i }).click();
  const sampleHeading = page.getByRole("heading", { name: "Tokyo sample booking" });
  await sampleHeading.waitFor();
  await page.addStyleTag({ content: ".hero, .sample-card { display: none !important; }" });
  await page.locator(".workspace").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await expectAmounts("$1,200.00", "$0.00");
  await caption("This fictional Tokyo booking starts at $1,200 USD.", 8_000);

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

  await setTime("2026-11-20T18:00");
  await expectAmounts("$600.00", "$600.00");
  await caption("Nov 20 at 6:00 PM JST: $600 refund, $600 penalty.", 12_000);
  await setTime("2026-11-24T15:00");
  await expectAmounts("$0.00", "$1,200.00");
  await caption("Nov 24 at 3:00 PM JST: the sample becomes non-refundable.", 12_000);

  const evidence = page.locator(".evidence-item blockquote").first();
  await evidence.evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  await caption("Each deadline links to the policy excerpt behind it.", 10_000);

  await page.locator(".summary-grid").evaluate((element) => {
    element.scrollIntoView({ block: "start", behavior: "instant" });
  });
  await caption("Every result is an estimate based on the policy text — never a promise of a refund.", 12_000);
  await caption("RefundCurve — clarity before you cancel.", 8_000);
} finally {
  const video = page.video();
  await context.close();
  await browser.close();
  const rawPath = await video.path();
  const encoded = spawnSync("ffmpeg", [
    "-y", "-i", rawPath, "-an", "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
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
