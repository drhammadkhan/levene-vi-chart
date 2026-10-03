import { LEVENE_REFERENCE, REF_MAX_GA, REF_MIN_GA } from './reference';

export type Flag = 'above' | 'within' | 'out-of-range';

export interface CentileValues {
  p50: number;
  p97plus4: number;
}

/** Decimal corrected gestational age in weeks from completed weeks + days. */
export function decimalCga(weeks: number, days: number): number {
  return weeks + days / 7;
}

/**
 * Linearly interpolated reference values at a decimal CGA.
 * Returns null outside the published range (27-40 weeks); we never extrapolate.
 */
export function centilesAt(cga: number): CentileValues | null {
  if (!Number.isFinite(cga) || cga < REF_MIN_GA || cga > REF_MAX_GA) return null;
  const hi = LEVENE_REFERENCE.findIndex((r) => r.ga >= cga);
  const upper = LEVENE_REFERENCE[hi];
  if (upper.ga === cga) return { p50: upper.p50, p97plus4: upper.p97plus4 };
  const lower = LEVENE_REFERENCE[hi - 1];
  const t = (cga - lower.ga) / (upper.ga - lower.ga);
  return {
    p50: lower.p50 + t * (upper.p50 - lower.p50),
    p97plus4: lower.p97plus4 + t * (upper.p97plus4 - lower.p97plus4),
  };
}

/** Compare a VI against the interpolated 97th centile + 4 mm. */
export function flagVi(cga: number, vi: number | null | undefined): Flag | null {
  if (vi == null || !Number.isFinite(vi)) return null;
  const c = centilesAt(cga);
  if (!c) return 'out-of-range';
  return vi > c.p97plus4 ? 'above' : 'within';
}
