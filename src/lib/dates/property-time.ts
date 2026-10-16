import { DateTime, Info } from "luxon";

export type PropertyTimeError = "invalid_zone" | "invalid_time" | "ambiguous_time" | "nonexistent_time";

export type PropertyTimeResult =
  | { ok: true; epochMs: number }
  | { ok: false; error: PropertyTimeError };

export function resolvePropertyTime(localDateTime: string, zone: string): PropertyTimeResult {
  if (!Info.isValidIANAZone(zone)) {
    return { ok: false, error: "invalid_zone" };
  }

  const parsed = DateTime.fromISO(localDateTime, { zone });
  if (!parsed.isValid) {
    return { ok: false, error: "invalid_time" };
  }

  const expectedLocal = localDateTime.slice(0, 16);
  if (parsed.toFormat("yyyy-MM-dd'T'HH:mm") !== expectedLocal) {
    return { ok: false, error: "nonexistent_time" };
  }

  if (parsed.getPossibleOffsets().length > 1) {
    return { ok: false, error: "ambiguous_time" };
  }

  return { ok: true, epochMs: parsed.toMillis() };
}

export function formatPropertyTime(epochMs: number, zone: string): string {
  const date = DateTime.fromMillis(epochMs, { zone });
  if (!date.isValid) return "Time unavailable";
  return `${date.toFormat("ccc, LLL d, yyyy 'at' h:mm a")} · ${zone}`;
}

export function formatLocalDateTime(epochMs: number, zone: string): string {
  return DateTime.fromMillis(epochMs, { zone }).toFormat("yyyy-MM-dd'T'HH:mm");
}
