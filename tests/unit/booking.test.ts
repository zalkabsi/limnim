import { describe, expect, it } from "vitest";
import { BookingInputSchema } from "@/lib/validation/booking";

const validBooking = {
  amount: "1200.00",
  currency: "USD",
  propertyTimeZone: "Asia/Tokyo",
  checkInLocal: "2026-11-26T15:00",
};

describe("booking input validation", () => {
  it("accepts a supported currency with a valid minor-unit amount", () => {
    expect(BookingInputSchema.safeParse(validBooking).success).toBe(true);
  });

  it("rejects currency codes that the interface does not support", () => {
    expect(BookingInputSchema.safeParse({ ...validBooking, currency: "ZZZ" }).success).toBe(false);
  });

  it("rejects fractional amounts that the selected currency cannot represent", () => {
    expect(BookingInputSchema.safeParse({ ...validBooking, currency: "JPY", amount: "1200.01" }).success).toBe(false);
    expect(BookingInputSchema.safeParse({ ...validBooking, amount: "1200.001" }).success).toBe(false);
  });

  it("accepts whole-unit JPY amounts", () => {
    expect(BookingInputSchema.safeParse({ ...validBooking, currency: "JPY", amount: "1200" }).success).toBe(true);
  });

  it("rejects amounts above the supported display range", () => {
    expect(BookingInputSchema.safeParse({ ...validBooking, amount: "1000000000000.00" }).success).toBe(false);
  });

  it("returns validation issues for malformed amounts without throwing", () => {
    expect(() => BookingInputSchema.safeParse({ ...validBooking, amount: "not-an-amount" })).not.toThrow();
    expect(BookingInputSchema.safeParse({ ...validBooking, amount: "not-an-amount" }).success).toBe(false);
  });
});
