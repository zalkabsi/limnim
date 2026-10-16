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
