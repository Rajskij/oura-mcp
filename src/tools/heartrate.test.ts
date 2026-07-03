import { describe, expect, it } from 'vitest';
import { aggregateHourly, type HeartRateSample, toOuraDatetime } from './heartrate.js';

const sample = (bpm: number, timestamp: string): HeartRateSample => ({
  bpm,
  source: 'ppg',
  timestamp,
});

describe('aggregateHourly', () => {
  it('buckets samples into hours with avg, min, max and count', () => {
    const hours = aggregateHourly([
      sample(60, '2026-07-02T14:05:00+00:00'),
      sample(70, '2026-07-02T14:35:00+00:00'),
      sample(100, '2026-07-02T15:01:00+00:00'),
    ]);
    expect(hours).toEqual([
      { hour: '2026-07-02T14:00Z', avg_bpm: 65, min_bpm: 60, max_bpm: 70, samples: 2 },
      { hour: '2026-07-02T15:00Z', avg_bpm: 100, min_bpm: 100, max_bpm: 100, samples: 1 },
    ]);
  });

  it('sorts hours chronologically regardless of input order', () => {
    const hours = aggregateHourly([
      sample(80, '2026-07-02T18:00:00+00:00'),
      sample(50, '2026-07-02T03:00:00+00:00'),
    ]);
    expect(hours.map((h) => h.hour)).toEqual(['2026-07-02T03:00Z', '2026-07-02T18:00Z']);
  });

  it('rounds the average to a whole bpm', () => {
    const [hour] = aggregateHourly([
      sample(61, '2026-07-02T14:00:00+00:00'),
      sample(62, '2026-07-02T14:30:00+00:00'),
    ]);
    expect(hour?.avg_bpm).toBe(62);
  });

  it('returns an empty list for no samples', () => {
    expect(aggregateHourly([])).toEqual([]);
  });
});

describe('toOuraDatetime', () => {
  it('normalizes ISO strings to a +00:00 offset without milliseconds', () => {
    expect(toOuraDatetime('2026-07-02T15:30:45.123Z')).toBe('2026-07-02T15:30:45+00:00');
  });

  it('converts other offsets to UTC', () => {
    expect(toOuraDatetime('2026-07-02T15:00:00+02:00')).toBe('2026-07-02T13:00:00+00:00');
  });

  it('accepts Date objects', () => {
    expect(toOuraDatetime(new Date('2026-07-02T15:30:45Z'))).toBe('2026-07-02T15:30:45+00:00');
  });
});
