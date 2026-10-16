import { describe, expect, it } from "vitest";
import { calculatePenalty, calculateRefund, formatMoney } from "@/lib/calculations/money";

describe("money calculations", () => {
  it("rounds a half-cent penalty half-up to the currency's minor unit", () => {
    const penalty = calculatePenalty("1.01", "50", "USD");
    expect(penalty).toBe("0.51");
    expect(calculateRefund("1.01", penalty, "USD")).toBe("0.50");
  });

  it("uses the currency's fraction digits when formatting", () => {
    expect(formatMoney("1200", "USD")).toBe("$1,200.00");
    expect(formatMoney("1200", "JPY")).toBe("¥1,200");
  });
});
