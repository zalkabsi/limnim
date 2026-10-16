import { describe, expect, it } from "vitest";
import { formatPropertyTime, resolvePropertyTime } from "@/lib/dates/property-time";

describe("property-local time handling", () => {
  it("resolves a Tokyo wall-clock deadline to an instant", () => {
    const result = resolvePropertyTime("2026-11-20T18:00", "Asia/Tokyo");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(formatPropertyTime(result.epochMs, "Asia/Tokyo")).toContain("Nov 20, 2026 at 6:00 PM · Asia/Tokyo");
  });

  it("rejects unknown zones and malformed local times", () => {
    expect(resolvePropertyTime("2026-11-20T18:00", "Tokyo")).toEqual({ ok: false, error: "invalid_zone" });
    expect(resolvePropertyTime("not-a-date", "Asia/Tokyo")).toEqual({ ok: false, error: "invalid_time" });
  });

  it("flags repeated and skipped local times at daylight-saving changes", () => {
    expect(resolvePropertyTime("2026-11-01T01:30", "America/New_York")).toEqual({ ok: false, error: "ambiguous_time" });
    expect(resolvePropertyTime("2026-03-08T02:30", "America/New_York")).toEqual({ ok: false, error: "nonexistent_time" });
  });
});
