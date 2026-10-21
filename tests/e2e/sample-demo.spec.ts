import { expect, test } from "@playwright/test";
import { DateTime } from "luxon";

test.skip(process.env.NEXT_PUBLIC_SAMPLE_DEMO !== "true", "Run this flow with NEXT_PUBLIC_SAMPLE_DEMO=true.");

test("sample-only mode opens Tokyo, stays responsive, and rejects live analysis", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const analyzeRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/analyze")) analyzeRequests.push(request.method());
  });

  await page.goto("/");
  const notice = page.locator(".demo-mode-banner");
  await expect(notice).toContainText("Interactive sample demo");
  await expect(notice).toContainText("fictional Tokyo data. Live policy analysis is turned off.");
  await expect(page.locator(".live-form")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Tokyo sample booking" })).toBeVisible();
  await expect(page.getByTestId("refund-amount")).toHaveText("$1,200.00");
  await expect(page.getByTestId("penalty-amount")).toHaveText("$0.00");
  await expect(page.locator(".guest-response-text")).toContainText("This is an estimate from the policy text and booking details provided");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(analyzeRequests).toEqual([]);

  const slider = page.getByRole("slider", { name: "Cancellation time" });
  const setTime = async (localTime: string) => {
    const target = DateTime.fromISO(localTime, { zone: "Asia/Tokyo" }).toMillis();
    await slider.evaluate((element, value) => {
      const input = element as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, String(value));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }, target);
  };

  await setTime("2026-11-20T18:00");
  await expect(page.getByTestId("refund-amount")).toHaveText("$600.00");
  await expect(page.getByTestId("penalty-amount")).toHaveText("$600.00");
  await setTime("2026-11-24T15:00");
  await expect(page.getByTestId("refund-amount")).toHaveText("$0.00");
  await expect(page.getByTestId("penalty-amount")).toHaveText("$1,200.00");
  expect(analyzeRequests).toEqual([]);

  const response = await page.evaluate(async () => {
    const result = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyText: "A fictional cancellation policy.", propertyTimeZone: "Asia/Tokyo" }),
    });
    return { status: result.status, body: await result.json() };
  });
  expect(response).toEqual({
    status: 503,
    body: {
      error: {
        code: "sample_demo_only",
        message: "Live policy analysis is unavailable in this public sample demo. Explore the fictional Tokyo booking instead.",
      },
    },
  });
  expect(analyzeRequests).toEqual(["POST"]);
});
