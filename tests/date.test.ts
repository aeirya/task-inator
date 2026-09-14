import { describe, expect, it } from 'vitest';
import { parseDateInput } from '../src/core/date.js';

const NOW = new Date('2026-09-14T10:00:00+02:00');

describe('natural-language dates', () => {
  it('parses tomorrow morning to local 09:00', () => {
    const parsed = new Date(parseDateInput('tomorrow morning', NOW)!);
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(15);
    expect(parsed.getHours()).toBe(9);
  });

  it('parses in 2 hours relative to now', () => {
    const parsed = new Date(parseDateInput('in 2 hours', NOW)!);
    expect(parsed.getTime() - NOW.getTime()).toBe(2 * 60 * 60 * 1000);
  });

  it('supports bare snooze presets such as 30 minutes', () => {
    const parsed = new Date(parseDateInput('30 minutes', NOW)!);
    expect(parsed.getTime() - NOW.getTime()).toBe(30 * 60 * 1000);
  });

  it('parses end of week as Friday evening', () => {
    const parsed = new Date(parseDateInput('end of week', NOW)!);
    expect(parsed.getDay()).toBe(5);
    expect(parsed.getHours()).toBe(18);
  });
});
