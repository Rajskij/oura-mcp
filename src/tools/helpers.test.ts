import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { daysAgo, isoDate, resolveRange, toMinutes } from './helpers.js';

describe('toMinutes', () => {
  it('converts seconds and rounds to the nearest minute', () => {
    expect(toMinutes(5460)).toBe(91);
    expect(toMinutes(89)).toBe(1);
    expect(toMinutes(29)).toBe(0);
    expect(toMinutes(0)).toBe(0);
  });

  it('passes null and undefined through as null', () => {
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes(undefined)).toBeNull();
  });
});

describe('date range defaults', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-03T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults to the last 7 days ending today', () => {
    expect(resolveRange(undefined, undefined)).toEqual({
      start_date: '2026-06-26',
      end_date: '2026-07-03',
    });
  });

  it('respects a custom default window', () => {
    expect(resolveRange(undefined, undefined, 1).start_date).toBe('2026-07-02');
  });

  it('keeps explicit dates untouched', () => {
    expect(resolveRange('2026-01-01', '2026-01-31')).toEqual({
      start_date: '2026-01-01',
      end_date: '2026-01-31',
    });
  });

  it('isoDate truncates to the day', () => {
    expect(isoDate(new Date('2026-07-03T23:59:59Z'))).toBe('2026-07-03');
  });

  it('daysAgo counts back from now', () => {
    expect(daysAgo(1)).toBe('2026-07-02');
    expect(daysAgo(0)).toBe('2026-07-03');
  });
});
