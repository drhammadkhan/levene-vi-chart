import { describe, expect, it } from 'vitest';
import { centilesAt, decimalPma, flagVi } from './centiles';

describe('decimalPma', () => {
  it('converts weeks+days', () => {
    expect(decimalPma(29, 0)).toBe(29);
    expect(decimalPma(29, 7)).toBe(30);
    expect(decimalPma(30, 3)).toBeCloseTo(30 + 3 / 7);
  });
});

describe('centilesAt', () => {
  it('returns exact table values on whole weeks, including 27 and 40', () => {
    expect(centilesAt(27)).toEqual({ p50: 10, p97plus4: 14 });
    expect(centilesAt(31)).toEqual({ p50: 10.9, p97plus4: 14.9 });
    expect(centilesAt(40)).toEqual({ p50: 13.8, p97plus4: 17.8 });
  });
  it('interpolates linearly between weeks', () => {
    const c = centilesAt(30.5)!;
    expect(c.p50).toBeCloseTo(10.7);
    expect(c.p97plus4).toBeCloseTo(14.7);
    expect(centilesAt(39.5)!.p50).toBeCloseTo(13.65);
  });
  it('does not extrapolate outside 27-40 weeks', () => {
    expect(centilesAt(26.9)).toBeNull();
    expect(centilesAt(40.1)).toBeNull();
    expect(centilesAt(NaN)).toBeNull();
  });
});

describe('flagVi', () => {
  it('flags only values strictly above the 97th+4 line', () => {
    expect(flagVi(30, 14.5)).toBe('within');
    expect(flagVi(30, 14.6)).toBe('above');
  });
  it('uses the interpolated threshold', () => {
    expect(flagVi(30.5, 14.7)).toBe('within');
    expect(flagVi(30.5, 14.8)).toBe('above');
  });
  it('handles missing values and out-of-range ages', () => {
    expect(flagVi(30, null)).toBeNull();
    expect(flagVi(26, 10)).toBe('out-of-range');
  });
});
