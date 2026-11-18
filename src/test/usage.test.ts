import { describe, it, expect } from 'vitest';
import { formatResetIn, limitStatus, weekPace } from '../utils/usage';

const NOW = new Date(2026, 9, 29, 15, 0, 0).getTime();

describe('formatResetIn', () => {
  const min = 60_000;
  it.each([
    [(2 * 60 + 53) * min, 'in 2 h 53 min'],
    [(4 * 1440 + 6 * 60 + 10) * min, 'in 4 T 6 h'],
    [12 * min + 30_000, 'in 12 min'],
    [-5 * min, 'jetzt'],
  ])('%d ms -> %s', (delta, s) => expect(formatResetIn(NOW + delta, NOW)).toBe(s));
});

describe('limitStatus', () => {
  it('is unknown without limits or with null usedPercent', () => {
    expect(limitStatus(null)).toBe('unknown');
    expect(limitStatus(undefined)).toBe('unknown');
    expect(limitStatus({ usedPercent: null, resetsAt: NOW })).toBe('unknown');
  });

  it('grades by percentage', () => {
    expect(limitStatus({ usedPercent: 0, resetsAt: NOW })).toBe('ok');
    expect(limitStatus({ usedPercent: 70, resetsAt: NOW })).toBe('warn');
    expect(limitStatus({ usedPercent: 95, resetsAt: NOW })).toBe('critical');
  });
});

describe('weekPace', () => {
  it('splits the week into Mo–Fr plus one weekend section', () => {
    expect(weekPace(new Date(2026, 10, 2, 0, 0).getTime())).toBe(0); // Monday 00:00
    expect(weekPace(new Date(2026, 10, 6, 12, 0).getTime())).toBeCloseTo((4.5 / 6) * 100); // Friday noon
    expect(weekPace(new Date(2026, 10, 7, 0, 0).getTime())).toBeCloseTo((5 / 6) * 100); // Saturday
    expect(weekPace(new Date(2026, 10, 8, 0, 0).getTime())).toBeCloseTo((5.5 / 6) * 100); // Sunday
  });
});
