import { DateTime } from "luxon";
import type { DeadlineBoundary, PolicyRule } from "@/types/policy";

const monthNumbers: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

type Mention = { year: number; month: number; day: number; start: number; end: number };
type ClockTime = { hour: number; minute: number; unambiguous: boolean; start: number; end: number };

function validDate(year: number, month: number, day: number): boolean {
  if (year < 1000 || year > 9999) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateMentions(text: string): Mention[] {
  const dates: Mention[] = [];
  const collect = (pattern: RegExp, read: (match: RegExpExecArray) => [number, number, number]) => {
    for (const match of text.matchAll(pattern)) {
      const [year, month, day] = read(match as RegExpExecArray);
      const start = match.index ?? 0;
      if (validDate(year, month, day)) dates.push({ year, month, day, start, end: start + match[0].length });
    }
  };

  collect(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (match) => [Number(match[1]), Number(match[2]), Number(match[3])]);

  const monthNames = Object.keys(monthNumbers).sort((a, b) => b.length - a.length).join("|");
  const monthFirst = new RegExp(`\\b(${monthNames})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+(\\d{4})\\b`, "gi");
  collect(monthFirst, (match) => [Number(match[3]), monthNumbers[match[1].toLowerCase().replace(/\.$/, "")], Number(match[2])]);

  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthNames})\\.?[,]?\\s+(\\d{4})\\b`, "gi");
  collect(dayFirst, (match) => [Number(match[3]), monthNumbers[match[2].toLowerCase().replace(/\.$/, "")], Number(match[1])]);

  // Slash dates are accepted only when one component makes their order unambiguous.
  for (const match of text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    const month = first > 12 ? second : first;
    const day = first > 12 ? first : second;
    if ((first > 12 || second > 12) && validDate(year, month, day)) {
      const start = match.index ?? 0;
      dates.push({ year, month, day, start, end: start + match[0].length });
    }
  }

  return dates;
}

function clockTimes(text: string): ClockTime[] {
  const times: ClockTime[] = [];
  const pattern = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\b|\b(\d{1,2}):(\d{2})\b/gi;
  for (const match of text.matchAll(pattern)) {
    let hour = Number(match[1] ?? match[4]);
    const minute = Number(match[2] ?? match[5] ?? 0);
    const meridiem = match[3]?.toLowerCase().replaceAll(".", "");
    if (minute > 59 || hour > 23) continue;
    let unambiguous = Boolean(meridiem);
    if (meridiem) {
      if (hour < 1 || hour > 12) continue;
      hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
    } else {
      const writtenHour = match[4];
      // A bare 6:00 could mean 6 AM or 6 PM. Keep it unresolved unless the
      // source uses an unambiguous 24-hour value or zero-padded clock form.
      unambiguous = hour === 0 || hour > 12 || Boolean(writtenHour?.startsWith("0"));
    }
    const start = match.index ?? 0;
    times.push({ hour, minute, unambiguous, start, end: start + match[0].length });
  }
  return times;
}

function findQuotedDeadline(rule: PolicyRule): { date: Mention; time: ClockTime } | null {
  const expected = rule.deadlineLocal.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!expected) return null;
  const expectedParts = expected.slice(1).map(Number);
  const dates = dateMentions(rule.evidenceQuote);
  const times = clockTimes(rule.evidenceQuote);

  for (const date of dates) {
    if (date.year !== expectedParts[0] || date.month !== expectedParts[1] || date.day !== expectedParts[2]) continue;
    const nearbyTimes = times
      .map((time) => ({ time, distance: time.end < date.start ? date.start - time.end : time.start > date.end ? time.start - date.end : 0 }))
      .filter(({ distance }) => distance <= 48)
      .sort((left, right) => left.distance - right.distance);
    const closest = nearbyTimes[0];
    if (!closest || !closest.time.unambiguous || (nearbyTimes[1] && nearbyTimes[1].distance === closest.distance)) continue;
    if (closest.time.hour === expectedParts[3] && closest.time.minute === expectedParts[4]) {
      return { date, time: closest.time };
    }
  }
  return null;
}

function isWholeBookingNonRefundable(quote: string): boolean {
  const negated = /\b(?:not|never|isn't|is not)\s+(?:fully\s+)?non[- ]?refundable\b/i.test(quote);
  const nonRefundable = /\bnon[- ]?refundable\b|\bno refunds?\b|\bno refund (?:is|will be|shall be)?\b/i.test(quote);
  return nonRefundable && !negated;
}

function penaltyConsequencePosition(rule: PolicyRule): number | null {
  const quote = rule.evidenceQuote;
  const rate = Number(rule.penaltyPercent);
  const numberWords = "zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several|multiple|few|couple";
  const countedNight = new RegExp(
    `\\b(?:first|last|next|previous|prior|following|remaining)\\s+(?:\\d+|${numberWords})\\s+(?:consecutive\\s+)?nights?\\b|\\b(?:\\d+|${numberWords})[- ](?:consecutive[- ])?nights?\\b`,
    "i",
  );
  const fixedAmount = /[$€£¥￥₹₩₽₺₫฿₱]\s*\d|\b(?:USD|EUR|GBP|CAD|AUD|JPY|SGD|NZD)\s*\d|\b\d+(?:[.,]\d+)?\s*(?:USD|EUR|GBP|CAD|AUD|JPY|SGD|NZD|yen|dollars?|euros?|pounds?)\b|\b(?:fixed|flat)\s+(?:fee|charge|amount|rate)\b|\b(?:fee|charge|cost)\s+(?:of\s+)?\d+(?:[.,]\d{1,2})?(?!\s*%)(?!\w)/i;
  const partialScope =
    /\bdeposit\b|\bper[- ]?(?:room|night|person)\b|\b(?:first|last|one|each|every|remaining)\s+nights?\b|\brooms?\b|\btaxes?\b|\bfixed fee\b|\bnightly\b/i.test(quote) ||
    countedNight.test(quote) ||
    fixedAmount.test(quote);
  if (partialScope) return null;
  const percentages = [...quote.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:%|percent(?:age)?\b)/gi)];
  if (percentages.some((match) => Number(match[1]) !== rate)) return null;

  if (rate === 100) {
    const nonRefundable = quote.match(/\bnon[- ]?refundable\b|\bno refunds?\b|\bno refund (?:is|will be|shall be)?\b/i);
    const fullAmount = quote.match(/\b100\s*(?:%|percent(?:age)?)\b.{0,50}\b(?:entire|whole|full)\s+(?:booking|reservation|amount|total)\b/i);
    if (isWholeBookingNonRefundable(quote) && nonRefundable) return nonRefundable.index ?? null;
    return fullAmount?.index ?? null;
  }
  if (rate === 0) {
    const freeCancellation = quote.match(/\bfree cancellation\b|\bno cancellation fee\b|\bno penalty\b|\bfully refundable\b/i);
    return freeCancellation?.index ?? null;
  }

  const matchingPercent = percentages.find((match) => Number(match[1]) === rate);
  if (!matchingPercent) return null;
  const penaltyCuePattern = /\b(?:penalt(?:y|ies)|fees?|charg(?:e|es|ed)|forfeit(?:ed|ure)?|retain(?:ed|s)?|deduct(?:ed|ion)?|los(?:e|t)|withheld)\b/gi;
  const penaltyCues = [...quote.matchAll(penaltyCuePattern)];
  const penaltyCue = penaltyCues
    .map((match) => ({ index: match.index ?? 0, distance: Math.abs((match.index ?? 0) - (matchingPercent.index ?? 0)) }))
    .filter(({ distance }) => distance <= 48)
    .sort((left, right) => left.distance - right.distance)[0];
  return penaltyCue ? matchingPercent.index ?? null : null;
}

function percentageIsSupported(rule: PolicyRule): boolean {
  return penaltyConsequencePosition(rule) !== null;
}

function consequenceMatchesDeadline(
  rule: PolicyRule,
  deadline: { date: Mention; time: ClockTime },
  consequencePosition: number,
): Exclude<DeadlineBoundary, "unclear"> | null {
  const quote = rule.evidenceQuote;
  const deadlineStart = Math.min(deadline.date.start, deadline.time.start);
  const deadlineEnd = Math.max(deadline.date.end, deadline.time.end);
  const deadlineCenter = (deadlineStart + deadlineEnd) / 2;
  const relationPattern = /\b(?:on\s+or\s+after|on\s+or\s+later|or\s+after|or\s+later|thereafter|after|from|starting(?:\s+at)?|beginning(?:\s+at)?|begins?(?:\s+at)?|starts?(?:\s+at)?|takes\s+effect(?:\s+at)?|effective(?:\s+from|\s+as\s+of)?|as\s+of|on|at|until|before|prior\s+to|no\s+later\s+than|by)\b/gi;
  const linkTerms = [
    ...[...quote.matchAll(relationPattern)].flatMap((match) => {
      const index = match.index ?? 0;
      const phrase = match[0].toLowerCase().replace(/\s+/g, " ");
      // "at" is normally part of the clock expression, not a boundary cue.
      if (phrase === "at" && index >= deadline.date.start && index <= deadline.time.end) return [];
      const kind = /^(?:until|before|prior to|no later than|by)$/.test(phrase)
        ? "before" as const
        : /^(?:after|thereafter|or after|or later)$/.test(phrase)
          ? "exclusive" as const
          : /^(?:on or after|on or later|from|starting(?: at)?|beginning(?: at)?|begins?(?: at)?|starts?(?: at)?|takes effect(?: at)?|effective(?: from| as of)?|as of|on|at)$/.test(phrase)
            ? "inclusive" as const
            : "unknown" as const;
      return [{ index, kind }];
    }),
  ];
  const closest = linkTerms
    .map((term) => ({ ...term, distance: Math.abs(term.index - consequencePosition) }))
    .filter((term) => term.distance <= 100 && Math.abs(term.index - deadlineCenter) <= 100)
    .sort((left, right) => left.distance - right.distance)[0];
  if (!closest || closest.kind === "before" || closest.kind === "unknown") return null;
  return closest.kind;
}

const zoneTerms: Record<string, { zones: string[]; offsetMinutes: number }> = {
  UTC: { zones: ["UTC", "Etc/UTC", "Etc/GMT"], offsetMinutes: 0 },
  GMT: { zones: ["UTC", "Etc/UTC", "Etc/GMT"], offsetMinutes: 0 },
  JST: { zones: ["Asia/Tokyo"], offsetMinutes: 540 },
  PST: { zones: ["America/Los_Angeles", "America/Vancouver"], offsetMinutes: -480 },
  PDT: { zones: ["America/Los_Angeles", "America/Vancouver"], offsetMinutes: -420 },
  MST: { zones: ["America/Denver", "America/Edmonton"], offsetMinutes: -420 },
  MDT: { zones: ["America/Denver", "America/Edmonton"], offsetMinutes: -360 },
  CST: { zones: ["America/Chicago", "America/Winnipeg"], offsetMinutes: -360 },
  CDT: { zones: ["America/Chicago", "America/Winnipeg"], offsetMinutes: -300 },
  EST: { zones: ["America/New_York", "America/Toronto"], offsetMinutes: -300 },
  EDT: { zones: ["America/New_York", "America/Toronto"], offsetMinutes: -240 },
  CET: { zones: ["Europe/Paris", "Europe/Berlin", "Europe/Rome"], offsetMinutes: 60 },
  CEST: { zones: ["Europe/Paris", "Europe/Berlin", "Europe/Rome"], offsetMinutes: 120 },
  BST: { zones: ["Europe/London"], offsetMinutes: 60 },
  AEST: { zones: ["Australia/Sydney", "Australia/Melbourne"], offsetMinutes: 600 },
  AEDT: { zones: ["Australia/Sydney", "Australia/Melbourne"], offsetMinutes: 660 },
};
const unambiguousZoneTokens = new Set(["UTC", "GMT", "JST"]);

function explicitZoneMatches(rule: PolicyRule, propertyTimeZone: string): boolean {
  const abbreviationsAfterTime = clockTimes(rule.evidenceQuote)
    .map((time) => rule.evidenceQuote.slice(time.end).match(/^\s+([A-Z]{2,5})\b/)?.[1])
    .filter((abbreviation): abbreviation is string => Boolean(abbreviation))
    .map((abbreviation) => abbreviation.toUpperCase());
  if (abbreviationsAfterTime.some((abbreviation) => !(abbreviation in zoneTerms))) return false;

  const ianaZones = [...rule.evidenceQuote.matchAll(/\b(?:[A-Za-z_+-]+\/)+[A-Za-z_+-]+\b/g)].map((match) => match[0]);
  if (ianaZones.some((zone) => zone !== propertyTimeZone)) return false;

  const offset = rule.evidenceQuote.match(/\b([+-])(\d{2}):(\d{2})\b/);
  if (offset) {
    const amount = Number(offset[2]) * 60 + Number(offset[3]);
    const quotedOffset = amount * (offset[1] === "-" ? -1 : 1);
    const local = DateTime.fromISO(rule.deadlineLocal, { zone: propertyTimeZone });
    if (!local.isValid || local.offset !== quotedOffset) return false;
  }

  const tokens = rule.evidenceQuote.match(/\b(?:UTC|GMT|JST|PST|PDT|MST|MDT|CST|CDT|EST|EDT|CET|CEST|BST|AEST|AEDT)\b/gi) ?? [];
  const local = DateTime.fromISO(rule.deadlineLocal, { zone: propertyTimeZone });
  for (const token of tokens) {
    if (!unambiguousZoneTokens.has(token.toUpperCase())) return false;
    if ((token.toUpperCase() === "UTC" || token.toUpperCase() === "GMT") && offset) continue;
    const config = zoneTerms[token.toUpperCase()];
    if (!config || !config.zones.includes(propertyTimeZone) || !local.isValid || local.offset !== config.offsetMinutes) return false;
  }
  return true;
}

export function supportedRuleEvidenceIssue(rule: PolicyRule, propertyTimeZone: string): string | null {
  const deadline = findQuotedDeadline(rule);
  if (!deadline) {
    return "The quoted text does not confirm the complete date and time shown for this deadline.";
  }
  if (!percentageIsSupported(rule)) {
    return "The quoted text does not confirm this percentage as a penalty for the full booking amount.";
  }
  const consequencePosition = penaltyConsequencePosition(rule);
  const quotedBoundary = consequencePosition === null
    ? null
    : consequenceMatchesDeadline(rule, deadline, consequencePosition);
  if (!quotedBoundary) {
    return "The quoted text does not clearly tie this penalty to the deadline shown.";
  }
  if (rule.deadlineBoundary !== quotedBoundary) {
    return "The quoted wording does not support whether this penalty applies at the exact deadline or only after it.";
  }
  if (!explicitZoneMatches(rule, propertyTimeZone)) {
    return "The quoted time zone or UTC offset does not match the property's time zone.";
  }
  return null;
}
