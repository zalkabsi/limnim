import Decimal from "decimal.js";
import { z } from "zod";

export const BookingInputSchema = z.object({
  amount: z.string().trim().regex(/^\d+(?:\.\d{1,4})?$/, "Enter a positive booking amount."),
  currency: z.string().regex(/^[A-Z]{3}$/, "Choose a currency."),
  propertyTimeZone: z.string().trim().min(1, "Enter the property's time zone."),
  checkInLocal: z.string(),
}).strict().superRefine((booking, context) => {
  if (!new Decimal(booking.amount).isFinite() || !new Decimal(booking.amount).gt(0)) {
    context.addIssue({ code: "custom", path: ["amount"], message: "Enter an amount greater than zero." });
  }
});

export type BookingInput = z.infer<typeof BookingInputSchema>;
