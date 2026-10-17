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
  const policyText = "Cancellation is free before November 20, 2026 at 6:00 PM. A 50% penalty begins at that time. A 100% penalty begins November 24, 2026 at 3:00 PM JST.";
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
              evidenceQuote: "A 50% penalty begins at that time.",
              interpretation: "A 50% penalty starts at the first deadline.",
              status: "supported",
              issue: "",
            },
            {
              id: "penalty-100",
              deadlineLocal: "2026-11-24T15:00",
              penaltyPercent: "100",
              evidenceQuote: "A 100% penalty begins November 24, 2026 at 3:00 PM JST.",
              interpretation: "The full booking amount becomes the penalty at the second deadline.",
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
