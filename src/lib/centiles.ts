import { LEVENE_REFERENCE, REF_MAX_GA, REF_MIN_GA } from './reference';

export type Flag = 'above' | 'within' | 'out-of-range';

export interface CentileValues {
  p50: number;
  p97plus4: number;
}

/** Decimal postmenstrual age in weeks from completed weeks + days. */
export function decimalPma(weeks: number, days: number): number {
  return weeks + days / 7;
}

/**
 * Linearly interpolated reference values at a decimal PMA.
 * Returns null outside the published range (27-40 weeks); we never extrapolate.
 */
export function centilesAt(pma: number): CentileValues | null {
  if (!Number.isFinite(pma) || pma < REF_MIN_GA || pma > REF_MAX_GA) return null;
  const hi = LEVENE_REFERENCE.findIndex((r) => r.ga >= pma);
  const upper = LEVENE_REFERENCE[hi];
  if (upper.ga === pma) return { p50: upper.p50, p97plus4: upper.p97plus4 };
  const lower = LEVENE_REFERENCE[hi - 1];
  const t = (pma - lower.ga) / (upper.ga - lower.ga);
  return {
    p50: lower.p50 + t * (upper.p50 - lower.p50),
    p97plus4: lower.p97plus4 + t * (upper.p97plus4 - lower.p97plus4),
  };
}

/** Compare a VI against the interpolated 97th centile + 4 mm. */
export function flagVi(pma: number, vi: number | null | undefined): Flag | null {
  if (vi == null || !Number.isFinite(vi)) return null;
  const c = centilesAt(pma);
  if (!c) return 'out-of-range';
  return vi > c.p97plus4 ? 'above' : 'within';
}
