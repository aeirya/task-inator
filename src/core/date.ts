import * as chrono from 'chrono-node';

function atLocalTime(base: Date, hour: number, minute = 0): Date {
  const result = new Date(base);
  result.setHours(hour, minute, 0, 0);
  return result;
}

function addDays(base: Date, days: number): Date {
  const result = new Date(base);
  result.setDate(result.getDate() + days);
  return result;
}

function nextWeekday(base: Date, weekday: number, includeToday = false): Date {
  const current = base.getDay();
  let delta = (weekday - current + 7) % 7;
  if (delta === 0 && !includeToday) delta = 7;
  return addDays(base, delta);
}

export function parseDateInput(value: string | Date | null | undefined, now = new Date()): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();

  const input = value.trim();
  if (!input) return null;

  const lower = input.toLowerCase();
  const bareDuration = lower.match(/^(\d+)\s*(minutes?|mins?|hours?|hrs?|days?|weeks?)$/);
  if (bareDuration) {
    const amount = Number(bareDuration[1]);
    const unit = bareDuration[2]!;
    const multipliers: Record<string, number> = {
      minute: 60_000, minutes: 60_000, min: 60_000, mins: 60_000,
      hour: 3_600_000, hours: 3_600_000, hr: 3_600_000, hrs: 3_600_000,
      day: 86_400_000, days: 86_400_000,
      week: 604_800_000, weeks: 604_800_000,
    };
    return new Date(now.getTime() + amount * multipliers[unit]!).toISOString();
  }
  if (lower === 'tonight') return atLocalTime(now, 19).toISOString();
  if (lower === 'tomorrow morning') return atLocalTime(addDays(now, 1), 9).toISOString();
  if (lower === 'tomorrow afternoon') return atLocalTime(addDays(now, 1), 15).toISOString();
  if (lower === 'this weekend') {
    const saturday = nextWeekday(now, 6, now.getDay() === 6);
    return atLocalTime(saturday, 10).toISOString();
  }
  if (lower === 'next week') return atLocalTime(nextWeekday(now, 1), 9).toISOString();
  if (lower === 'end of week' || lower === 'by end of week') {
    const friday = nextWeekday(now, 5, now.getDay() <= 5);
    return atLocalTime(friday, 18).toISOString();
  }

  const direct = new Date(input);
  if (!Number.isNaN(direct.getTime()) && /\d{4}|T\d{2}:\d{2}|[+-]\d{2}:?\d{2}|Z$/.test(input)) {
    return direct.toISOString();
  }

  const parsed = chrono.parseDate(input, now, { forwardDate: true });
  if (!parsed) throw new Error(`Could not parse date expression: "${value}"`);
  return parsed.toISOString();
}

export function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function isSameLocalDay(iso: string | null, date: Date): boolean {
  if (!iso) return false;
  const value = new Date(iso);
  return value.getFullYear() === date.getFullYear()
    && value.getMonth() === date.getMonth()
    && value.getDate() === date.getDate();
}

export function isTomorrow(iso: string | null, now: Date): boolean {
  return isSameLocalDay(iso, addDays(now, 1));
}

export function endOfLocalWeek(now: Date): Date {
  const day = now.getDay();
  const daysUntilSunday = (7 - day) % 7;
  return endOfLocalDay(addDays(now, daysUntilSunday));
}
