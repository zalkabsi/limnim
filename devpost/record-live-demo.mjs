import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir, tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const baseURL = process.env.LIMNIM_DEMO_URL ?? "http://127.0.0.1:3000";
const recordingDir = join(tmpdir(), "limnim-live-demo-" + process.pid);
const captionedVideoPath = join(recordingDir, "limnim-demo-live.mp4");
const cuePath = join(recordingDir, "narration-cues.json");
const finalVideoPath = join(process.cwd(), "devpost", "assets", "limnim-demo-narrated.mp4");
const policyText = "After November 20, 2026 at 6:00 PM JST, a 50% cancellation penalty applies. Starting November 24, 2026 at 3:00 PM JST, the entire booking is non-refundable.";
const ambiguousPolicyText = "Cancellations within 48 hours of arrival may incur a 50% penalty at the hotel's discretion.";
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ?? (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
const cues = [];

function configurePlaywrightFfmpegFallback() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH || process.platform !== "linux" || process.arch !== "x64") return;
  if (!existsSync("/usr/bin/ffmpeg")) return;

  const playwrightPath = fileURLToPath(import.meta.resolve("playwright-core"));
  const browserInfo = JSON.parse(readFileSync(join(dirname(playwrightPath), "browsers.json"), "utf8"));
  const revision = browserInfo.browsers.find((browser) => browser.name === "ffmpeg")?.revision;
  if (!revision) return;

  const defaultFfmpeg = join(homedir(), ".cache", "ms-playwright", `ffmpeg-${revision}`, "ffmpeg-linux");
  if (existsSync(defaultFfmpeg)) return;

  const fallbackRegistry = join(tmpdir(), "limnim-playwright");
  const fallbackFfmpeg = join(fallbackRegistry, `ffmpeg-${revision}`, "ffmpeg-linux");
  mkdirSync(dirname(fallbackFfmpeg), { recursive: true });
  if (!existsSync(fallbackFfmpeg)) symlinkSync("/usr/bin/ffmpeg", fallbackFfmpeg);
  process.env.PLAYWRIGHT_BROWSERS_PATH = fallbackRegistry;
}

configurePlaywrightFfmpegFallback();
const { chromium } = await import("playwright");

mkdirSync(recordingDir, { recursive: true });

function run(command, args, label, stdio = "pipe") {
  const result = spawnSync(command, args, { encoding: "utf8", stdio });
  if (result.error || result.status !== 0) {
    const detail = stdio === "pipe" ? result.stderr?.trim().split("\n").at(-1) : undefined;
    throw new Error(label + " failed" + (detail ? ": " + detail : "."));
  }
  return typeof result.stdout === "string" ? result.stdout.trim() : "";
}

function probeVideo(path) {
  const output = run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration:stream=codec_type,codec_name",
    "-of", "json", path,
  ], "Video inspection");
  return JSON.parse(output);
}

async function caption(page, recordingStartedAt, id, text) {
  await page.evaluate((captionText) => {
    let element = document.getElementById("limnim-demo-caption");
    if (!element) {
      element = document.createElement("div");
      element.id = "limnim-demo-caption";
      document.body.append(element);
    }
    element.textContent = captionText;
  }, text);
  cues.push({ id, startSeconds: (performance.now() - recordingStartedAt) / 1000 });
  return performance.now();
}

async function hold(page, startedAt, seconds) {
  const remaining = startedAt + seconds * 1000 - performance.now();
  if (remaining > 0) await page.waitForTimeout(remaining);
}

async function submitPolicy(page) {
  const requestPromise = page.waitForRequest(
    (request) => request.url().includes("/api/analyze") && request.method() === "POST",
    { timeout: 60_000 },
  );
  const responsePromise = page.waitForResponse(
    (response) => response.url().includes("/api/analyze") && response.request().method() === "POST",
    { timeout: 60_000 },
  );
  await page.getByRole("button", { name: "Analyze policy" }).click();
  const request = await requestPromise;
  const requestBody = JSON.parse(request.postData() ?? "{}");
  const requestFields = Object.keys(requestBody).sort();
  assert.deepEqual(requestFields, ["policyText", "propertyTimeZone"]);
  const response = await responsePromise;
  const body = await response.json();
  if (response.status() !== 200) {
    const apiError = body?.error;
    const details = typeof apiError?.code === "string" && typeof apiError?.message === "string"
      ? ` (${apiError.code}: ${apiError.message})`
      : "";
    throw new Error(`Live policy analysis returned HTTP ${response.status()}${details}.`);
  }
  return { body, requestFields };
}

async function setTime(slider, isoTime) {
  const timestamp = Date.parse(isoTime);
  await slider.evaluate((element, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, String(value));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, timestamp);
}

async function readAmounts(page) {
  return {
    refund: (await page.getByTestId("refund-amount").innerText()).trim(),
    penalty: (await page.getByTestId("penalty-amount").innerText()).trim(),
  };
}

let browser;
let context;
let page;
let recordingStartedAt;
let video;
let completed = false;
let primaryAnalysis;
let ambiguousAnalysis;
let timeline;

try {
  browser = await chromium.launch({
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

  context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
    recordVideo: { dir: recordingDir, size: { width: 1440, height: 900 } },
  });
  page = await context.newPage();
  recordingStartedAt = performance.now();
  await page.goto(baseURL, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /Answer cancellation questions/i }).waitFor();
  await page.addStyleTag({ content: ".sample-card{display:none!important}#limnim-demo-caption{position:fixed;z-index:2147483647;left:50%;bottom:24px;transform:translateX(-50%);width:min(960px,calc(100vw - 48px));box-sizing:border-box;padding:15px 24px;border-radius:12px;background:rgba(17,45,37,.95);color:#fff;font:600 18px/1.35 system-ui,sans-serif;text-align:center;letter-spacing:.01em;box-shadow:0 8px 32px rgba(0,0,0,.18)}" });

  let startedAt = await caption(page, recordingStartedAt, "opening", "Hotel cancellation questions can take staff away from guests. Limnim prepares an evidence-linked answer.");
  await hold(page, startedAt, 9.5);

  const form = page.locator(".live-form");
  await form.scrollIntoViewIfNeeded();
  await page.locator("#policy-text").fill(policyText);
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#booking-currency").selectOption("USD");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.locator("#check-in").fill("2026-11-25T15:00");
  startedAt = await caption(page, recordingStartedAt, "booking", "Here is a fictional Tokyo booking: twelve hundred US dollars, with check-in on November twenty-fifth, twenty twenty-six.");
  await hold(page, startedAt, 8.5);

  startedAt = await caption(page, recordingStartedAt, "live-request", "Limnim sends only the fictional policy and Tokyo time zone for live AI extraction. The booking total stays in this browser.");
  primaryAnalysis = await submitPolicy(page);
  await hold(page, startedAt, 10);
  await page.getByRole("heading", { name: "Your cancellation estimate" }).waitFor({ timeout: 60_000 });

  const primaryRules = [...primaryAnalysis.body.analysis.rules]
    .sort((left, right) => left.deadlineLocal.localeCompare(right.deadlineLocal));
  assert.equal(primaryRules.length, 2, "the fictional policy should produce two supported deadlines");
  for (const rule of primaryRules) {
    assert.equal(rule.status, "supported");
    assert.ok(policyText.includes(rule.evidenceQuote), "each extracted quote must appear verbatim in the fictional policy");
  }
  assert.deepEqual(primaryRules.map((rule) => [rule.deadlineLocal, rule.deadlineBoundary, rule.penaltyPercent]), [
    ["2026-11-20T18:00", "exclusive", "50"],
    ["2026-11-24T15:00", "inclusive", "100"],
  ]);
  assert.deepEqual(primaryAnalysis.requestFields, ["policyText", "propertyTimeZone"]);

  const workspace = page.locator('.workspace[aria-label="Live policy analysis"]');
  await workspace.scrollIntoViewIfNeeded();
  startedAt = await caption(page, recordingStartedAt, "supported-result", "The live extraction found a strictly-after fifty percent threshold, then an inclusive one hundred percent threshold.");
  await hold(page, startedAt, 9);

  const quoteBlocks = page.locator(".evidence-item blockquote");
  assert.equal(await quoteBlocks.count(), 2);
  const displayedQuotes = await quoteBlocks.allTextContents();
  assert.ok(primaryRules.every((rule) => displayedQuotes.some((quote) => quote.includes(rule.evidenceQuote))));
  const guestResponse = page.locator(".guest-response-text");
  await guestResponse.waitFor();
  assert.ok((await guestResponse.innerText()).includes("Estimated potential refund:"));
  await page.getByRole("button", { name: "Copy guest response" }).click();
  await page.waitForFunction(() => Boolean(document.querySelector(".guest-response-copy-status")?.textContent?.trim()));
  assert.match(await page.locator(".guest-response-copy-status").innerText(), /Guest response copied/i);
  startedAt = await caption(page, recordingStartedAt, "copy-response", "The reply is calculated locally, includes the source wording, and can be reviewed before staff sends it.");
  await hold(page, startedAt, 8);
  await page.locator(".evidence-card").scrollIntoViewIfNeeded();
  startedAt = await caption(page, recordingStartedAt, "evidence", "Each extracted deadline is linked to an exact sentence from the policy, so the evidence can be checked against the result.");
  await hold(page, startedAt, 8);

  const initialAmounts = await readAmounts(page);
  assert.deepEqual(initialAmounts, { refund: "$1,200.00", penalty: "$0.00" });
  await page.locator(".summary-grid").scrollIntoViewIfNeeded();
  startedAt = await caption(page, recordingStartedAt, "before-first", "Before the first deadline, the estimate is twelve hundred dollars back with no cancellation penalty.");
  await hold(page, startedAt, 8);

  const slider = page.locator("#cancellation-time");
  await setTime(slider, "2026-11-20T18:00:00+09:00");
  await page.waitForFunction(() => document.querySelector('[data-testid="refund-amount"]')?.textContent?.trim() === "$1,200.00");
  const atFirstDeadlineAmounts = await readAmounts(page);
  assert.deepEqual(atFirstDeadlineAmounts, { refund: "$1,200.00", penalty: "$0.00" });
  await setTime(slider, "2026-11-20T18:01:00+09:00");
  await page.waitForFunction(() => document.querySelector('[data-testid="refund-amount"]')?.textContent?.trim() === "$600.00");
  const firstDeadlineAmounts = await readAmounts(page);
  assert.deepEqual(firstDeadlineAmounts, { refund: "$600.00", penalty: "$600.00" });
  startedAt = await caption(page, recordingStartedAt, "first-deadline", "At six p.m. the old rate still applies because the policy says after. At six-oh-one, the estimate changes to six hundred dollars back.");
  await hold(page, startedAt, 9);

  await setTime(slider, "2026-11-24T15:00:00+09:00");
  await page.waitForFunction(() => document.querySelector('[data-testid="refund-amount"]')?.textContent?.trim() === "$0.00");
  const lastDeadlineAmounts = await readAmounts(page);
  assert.deepEqual(lastDeadlineAmounts, { refund: "$0.00", penalty: "$1,200.00" });
  timeline = {
    beforeFirstDeadline: initialAmounts,
    atExclusiveDeadline: atFirstDeadlineAmounts,
    firstDeadline: firstDeadlineAmounts,
    lastDeadline: lastDeadlineAmounts,
  };
  startedAt = await caption(page, recordingStartedAt, "last-deadline", "At November twenty-fourth, three p.m. Japan time, the inclusive rule makes the booking non-refundable.");
  await hold(page, startedAt, 8.2);

  await form.scrollIntoViewIfNeeded();
  await page.locator("#policy-text").fill(ambiguousPolicyText);
  startedAt = await caption(page, recordingStartedAt, "ambiguous-policy", "This second fictional policy says a fifty percent fee may apply within forty-eight hours, at the hotel's discretion.");
  await hold(page, startedAt, 8);

  startedAt = await caption(page, recordingStartedAt, "ambiguous-request", "The live analyzer checks whether those incomplete terms support a precise deadline and penalty.");
  ambiguousAnalysis = await submitPolicy(page);
  await hold(page, startedAt, 8);
  await page.getByText("No refund estimate yet").waitFor({ timeout: 60_000 });
  assert.ok(ambiguousAnalysis.body.analysis.unresolvedIssues.length > 0, "ambiguous terms should remain unresolved");
  assert.ok(ambiguousAnalysis.body.analysis.rules.every((rule) => rule.status !== "supported"));
  assert.equal(await page.locator(".timeline-card").count(), 0, "ambiguous policy must not show a refund timeline");

  await workspace.scrollIntoViewIfNeeded();
  startedAt = await caption(page, recordingStartedAt, "unresolved", "Because the policy gives no exact cutoff and makes the fee discretionary, Limnim shows no refund estimate.");
  await hold(page, startedAt, 8);
  await page.locator(".evidence-card").scrollIntoViewIfNeeded();
  startedAt = await caption(page, recordingStartedAt, "closing", "The policy and booking are fictional. Staff should review each estimate; it is not confirmation of a hotel's refund.");
  await hold(page, startedAt, 9.1);
  completed = true;
} finally {
  video = page?.video();
  if (context) await context.close();
  if (browser) await browser.close();

  if (completed && video) {
    const rawPath = await video.path();
    run("ffmpeg", [
      "-y", "-i", rawPath, "-an", "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", captionedVideoPath,
    ], "Captioned live video encoding", "inherit");
    writeFileSync(cuePath, JSON.stringify(cues, null, 2) + "\n", "utf8");
    run("python3", ["devpost/render-narrated-demo.py", captionedVideoPath, cuePath], "Narrated video rendering", "inherit");

    const videoInfo = probeVideo(finalVideoPath);
    const duration = Number(videoInfo.format?.duration);
    assert.ok(Number.isFinite(duration) && duration >= 60 && duration < 180, "final demo video must be between one and three minutes");
    assert.ok(videoInfo.streams?.some((stream) => stream.codec_type === "video"));
    assert.ok(videoInfo.streams?.some((stream) => stream.codec_type === "audio"), "final demo must include spoken audio");
    console.log(JSON.stringify({
      video: finalVideoPath,
      durationSeconds: duration,
      requestFields: primaryAnalysis.requestFields,
      extractedRules: primaryAnalysis.body.analysis.rules.map(({ deadlineLocal, penaltyPercent, evidenceQuote }) => ({ deadlineLocal, penaltyPercent, evidenceQuote })),
      timeline,
      ambiguousPolicy: {
        supportedRules: ambiguousAnalysis.body.analysis.rules.filter((rule) => rule.status === "supported").length,
        unresolvedIssues: ambiguousAnalysis.body.analysis.unresolvedIssues,
        estimateShown: false,
      },
    }, null, 2));
    rmSync(recordingDir, { recursive: true, force: true });
  } else {
    rmSync(recordingDir, { recursive: true, force: true });
  }
}
