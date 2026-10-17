import Decimal from "decimal.js";
import { z } from "zod";

export const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "SGD", "NZD"] as const;
const currencyDecimalPlaces: Record<(typeof SUPPORTED_CURRENCIES)[number], number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0,
  SGD: 2,
  NZD: 2,
};

export const BookingInputSchema = z.object({
  amount: z.string().trim().regex(/^\d{1,12}(?:\.\d{1,4})?$/, "Enter an amount up to 999,999,999,999."),
  currency: z.enum(SUPPORTED_CURRENCIES),
  propertyTimeZone: z.string().trim().min(1, "Enter the property's time zone."),
  checkInLocal: z.string(),
}).strict().superRefine((booking, context) => {
  let amount: Decimal;
  try {
    amount = new Decimal(booking.amount);
  } catch {
    context.addIssue({ code: "custom", path: ["amount"], message: "Enter a valid booking amount." });
    return;
  }
  if (!amount.isFinite() || !amount.gt(0)) {
    context.addIssue({ code: "custom", path: ["amount"], message: "Enter an amount greater than zero." });
  }
  const decimalPlaces = booking.amount.split(".")[1]?.length ?? 0;
  if (!SUPPORTED_CURRENCIES.includes(booking.currency)) return;
  const allowedDecimalPlaces = currencyDecimalPlaces[booking.currency];
  if (decimalPlaces > allowedDecimalPlaces) {
    context.addIssue({
      code: "custom",
      path: ["amount"],
      message: `${booking.currency} amounts support up to ${allowedDecimalPlaces} decimal places.`,
    });
  }
});

export type BookingInput = z.infer<typeof BookingInputSchema>;
