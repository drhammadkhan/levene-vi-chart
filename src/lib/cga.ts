export const CGA_MIN_WEEKS = 22;
export const CGA_MAX_WEEKS = 45;

export type CgaParse = { ok: true; weeks: number; days: number } | { ok: false };

/**
 * Parse corrected gestational age typed as "weeks+days", e.g. "26+2".
 * A bare "26" means 26+0. Days must be 0-6; weeks must be a plausible 22-45.
 * Decimals are rejected on purpose: "26.2" is ambiguous (days or tenths of a week).
 */
export function parseCga(text: string): CgaParse {
  const m = /^(\d{1,2})\s*(?:\+\s*(\d))?$/.exec(text.trim());
  if (!m) return { ok: false };
  const weeks = Number(m[1]);
  const days = m[2] === undefined ? 0 : Number(m[2]);
  if (weeks < CGA_MIN_WEEKS || weeks > CGA_MAX_WEEKS || days > 6) return { ok: false };
  return { ok: true, weeks, days };
}

export function formatCga(weeks: number | null, days: number | null): string {
  return weeks == null ? '' : `${weeks}+${days ?? 0}`;
}
