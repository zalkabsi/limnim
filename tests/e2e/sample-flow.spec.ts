import { expect, test } from "@playwright/test";
import { DateTime } from "luxon";

test("the Tokyo sample updates its estimate at exact policy boundaries", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Know what cancellation could cost/i })).toBeVisible();
  await page.getByRole("button", { name: /Try sample booking/i }).click();

  await expect(page.getByRole("heading", { name: "Tokyo sample booking" })).toBeVisible();
  await expect(page.getByTestId("refund-amount")).toHaveText("$1,200.00");
  await expect(page.getByTestId("penalty-amount")).toHaveText("$0.00");

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
  await expect(page.locator(".evidence-item blockquote").last()).toContainText("Cancellations on or after November 24");
});

test("live policy analysis uses verified rules while keeping the booking total in the browser", async ({ page }) => {
  const policyText = "Cancellation is free before November 20, 2026 at 6:00 PM. A 50% penalty begins at that time. From November 24, 2026 at 3:00 PM JST the entire booking is non-refundable.";
  let receivedBody: unknown;
  await page.route("**/api/analyze", async (route) => {
    receivedBody = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: {
          rules: [
            {
              id: "penalty-50",
              deadlineLocal: "2026-11-20T18:00",
              penaltyPercent: "50",
              evidenceQuote: "Cancellation is free before November 20, 2026 at 6:00 PM. A 50% penalty begins at that time.",
              interpretation: "A 50% penalty starts at the first deadline.",
              status: "supported",
              issue: "",
            },
            {
              id: "penalty-100",
              deadlineLocal: "2026-11-24T15:00",
              penaltyPercent: "100",
              evidenceQuote: "From November 24, 2026 at 3:00 PM JST the entire booking is non-refundable.",
              interpretation: "The entire booking becomes non-refundable at the second deadline.",
              status: "supported",
              issue: "",
            },
          ],
          unresolvedIssues: [],
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator("#policy-text").fill(policyText);
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.locator("#check-in").fill("2026-11-26T15:00");
  await page.getByRole("button", { name: "Analyze policy" }).click();

  await expect(page.getByRole("heading", { name: "Your cancellation estimate" })).toBeVisible();
  expect(receivedBody).toEqual({ policyText, propertyTimeZone: "Asia/Tokyo" });
  await expect(page.getByTestId("refund-amount")).toHaveText("$1,200.00");
  await expect(page.getByTestId("penalty-amount")).toHaveText("$0.00");
  await expect(page.locator(".evidence-item blockquote").first()).toContainText("A 50% penalty begins at that time.");

  const slider = page.getByRole("slider", { name: "Cancellation time" });
  const deadline = DateTime.fromISO("2026-11-20T18:00", { zone: "Asia/Tokyo" }).toMillis();
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, deadline);
  await expect(page.getByTestId("refund-amount")).toHaveText("$600.00");
  await expect(page.getByTestId("penalty-amount")).toHaveText("$600.00");
});

test("an exhausted AI account gets clear guidance and leaves the sample available", async ({ page }) => {
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: {
          code: "provider_quota_exhausted",
          message: "Live analysis is unavailable because the configured OpenAI account has no available API credits. Add credits or use an account with available usage; the sample still works without live analysis.",
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator("#policy-text").fill("A sample cancellation policy.");
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.getByRole("button", { name: "Analyze policy" }).click();

  await expect(page.locator(".live-form").getByRole("alert")).toContainText("no available API credits");
  await page.getByRole("button", { name: /Try sample booking/i }).click();
  await expect(page.getByRole("heading", { name: "Tokyo sample booking" })).toBeVisible();
  await expect(page.getByTestId("refund-amount")).toHaveText("$1,200.00");
});

test("a clarification-needed policy shows no guessed refund amount", async ({ page }) => {
  const policyText = "Cancellations made less than 48 hours before arrival are subject to the hotel's discretion.";
  const issue = "The deadline is relative to check-in, which is not stated as an exact date and time.";
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: {
          rules: [{
            id: "relative-deadline",
            deadlineLocal: "",
            penaltyPercent: "",
            evidenceQuote: policyText,
            interpretation: "The hotel decides whether this cancellation qualifies for a refund.",
            status: "needs_clarification",
            issue,
          }],
          unresolvedIssues: [issue],
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator("#policy-text").fill(policyText);
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.getByRole("button", { name: "Analyze policy" }).click();

  await expect(page.getByText("No refund estimate yet")).toBeVisible();
  await expect(page.getByTestId("refund-amount")).toHaveCount(0);
  await expect(page.getByText(issue).first()).toBeVisible();
});

test("the timeline supports keyboard changes and fits a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: /Try sample booking/i }).click();

  const slider = page.getByRole("slider", { name: "Cancellation time" });
  const oneMinuteBeforeFirstDeadline = DateTime.fromISO("2026-11-20T17:59", { zone: "Asia/Tokyo" }).toMillis();
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, oneMinuteBeforeFirstDeadline);
  await slider.focus();
  await slider.press("ArrowRight");
  await expect(page.getByTestId("refund-amount")).toHaveText("$600.00");
  await expect(page.getByTestId("penalty-amount")).toHaveText("$600.00");
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("live results label the final deadline when no check-in is entered", async ({ page }) => {
  const policyText = "A 50% penalty applies from November 20, 2026 at 6:00 PM.";
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: {
          rules: [{
            id: "single-deadline",
            deadlineLocal: "2026-11-20T18:00",
            penaltyPercent: "50",
            evidenceQuote: policyText,
            interpretation: "A 50% penalty starts at this deadline.",
            status: "supported",
            issue: "",
          }],
          unresolvedIssues: [],
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator("#policy-text").fill(policyText);
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.getByRole("button", { name: "Analyze policy" }).click();

  await expect(page.getByRole("heading", { name: "Your cancellation estimate" })).toBeVisible();
  await expect(page.getByText(/^Last supported deadline ·/)).toBeVisible();
  await expect(page.locator(".chart-marker")).toHaveCount(1);
  await expect(page.locator(".chart-threshold-label").filter({ hasText: "50% penalty" })).toHaveCount(1);
});

test("live results label check-in when it coincides with the final deadline", async ({ page }) => {
  const policyText = "A 50% penalty applies from November 20, 2026 at 6:00 PM.";
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: {
          rules: [{
            id: "single-deadline",
            deadlineLocal: "2026-11-20T18:00",
            penaltyPercent: "50",
            evidenceQuote: policyText,
            interpretation: "A 50% penalty starts at this deadline.",
            status: "supported",
            issue: "",
          }],
          unresolvedIssues: [],
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator("#policy-text").fill(policyText);
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.locator("#check-in").fill("2026-11-20T18:00");
  await page.getByRole("button", { name: "Analyze policy" }).click();

  await expect(page.getByRole("heading", { name: "Your cancellation estimate" })).toBeVisible();
  await expect(page.locator(".range-caption").getByText(/^Check-in ·/)).toBeVisible();
  await expect(page.getByText(/Check-in coincides with the last supported cancellation deadline/)).toBeVisible();
  await expect(page.locator(".chart-marker")).toHaveCount(1);
});

test("withholds the estimate when a policy deadline falls after check-in", async ({ page }) => {
  const policyText = "A 50% penalty applies from November 20, 2026 at 6:00 PM.";
  await page.route("**/api/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        analysis: {
          rules: [{
            id: "post-check-in-deadline",
            deadlineLocal: "2026-11-20T18:00",
            penaltyPercent: "50",
            evidenceQuote: policyText,
            interpretation: "A 50% penalty starts at this deadline.",
            status: "supported",
            issue: "",
          }],
          unresolvedIssues: [],
        },
      }),
    });
  });

  await page.goto("/");
  await page.locator("#policy-text").fill(policyText);
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.locator("#check-in").fill("2026-11-19T15:00");
  await page.getByRole("button", { name: "Analyze policy" }).click();

  await expect(page.getByRole("heading", { name: "Your cancellation estimate" })).toBeVisible();
  await expect(page.getByText("No refund estimate yet")).toBeVisible();
  await expect(page.getByTestId("refund-amount")).toHaveCount(0);
  await expect(page.locator(".evidence-status-warning")).toContainText(/after the supplied check-in time/i);
  await expect(page.getByText(/post-check-in cancellations or no-show charges/i)).toBeVisible();
});

test("loading the sample cancels an in-flight live analysis", async ({ page }) => {
  const policyText = "A 50% penalty applies from November 20, 2026 at 6:00 PM.";
  await page.route("**/api/analyze", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ analysis: { rules: [], unresolvedIssues: ["No explicit cancellation rule."] } }),
    }).catch(() => undefined);
  });

  await page.goto("/");
  await page.locator("#policy-text").fill(policyText);
  await page.locator("#booking-amount").fill("1200");
  await page.locator("#property-zone").fill("Asia/Tokyo");
  await page.getByRole("button", { name: "Analyze policy" }).click();
  await expect(page.getByText(/Reading the policy and checking its quoted deadlines/)).toBeVisible();
  await page.getByRole("button", { name: /Try sample booking/i }).click();
  await page.waitForTimeout(350);

  await expect(page.getByRole("heading", { name: "Tokyo sample booking" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your cancellation estimate" })).toHaveCount(0);
  await expect(page.getByTestId("refund-amount")).toHaveText("$1,200.00");
});
