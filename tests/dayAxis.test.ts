import { describe, expect, it } from 'vitest';
import { dayAxis } from '../shared/domain/day';

describe('dayAxis', () => {
  it('bedtime after midnight extends the axis instead of collapsing it', () => {
    const { from, to } = dayAxis(420, 30, [], []);
    expect(from).toBe(360);
    expect(to).toBeGreaterThanOrEqual(1440);
    expect(to - from).toBeGreaterThanOrEqual(480);
  });
  it('is never shorter than 8 h and capped at 06:00 next day', () => {
    expect(dayAxis(420, 600, [], [])).toEqual({ from: 360, to: 840 });
    expect(dayAxis(420, 1380, [], [3000]).to).toBe(1800);
  });
});
