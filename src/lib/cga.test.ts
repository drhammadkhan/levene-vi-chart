import { describe, expect, it } from 'vitest';
import { formatCga, parseCga } from './cga';

describe('parseCga', () => {
  it('parses weeks+days', () => {
    expect(parseCga('26+2')).toEqual({ ok: true, weeks: 26 + 0, days: 2 });
    expect(parseCga(' 30 + 6 ')).toEqual({ ok: true, weeks: 30, days: 6 });
    expect(parseCga('40+0')).toEqual({ ok: true, weeks: 40, days: 0 });
  });
  it('treats bare weeks as +0', () => {
    expect(parseCga('29')).toEqual({ ok: true, weeks: 29, days: 0 });
  });
  it('rejects bad days, implausible weeks and other formats', () => {
    for (const bad of ['26+7', '26+', '+2', '21+6', '46+0', '26.2', '26-2', '26/2', 'abc', '', '26+10', '260']) {
      expect(parseCga(bad)).toEqual({ ok: false });
    }
  });
});

describe('formatCga', () => {
  it('formats and handles blanks', () => {
    expect(formatCga(26, 2)).toBe('26+2');
    expect(formatCga(26, null)).toBe('26+0');
    expect(formatCga(null, 3)).toBe('');
  });
});
