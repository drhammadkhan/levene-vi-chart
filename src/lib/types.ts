export interface Measurement {
  id: string;
  /** Optional ISO date (yyyy-mm-dd) of the scan. */
  scanDate: string;
  /** Completed weeks of corrected gestational age; null while being entered. */
  cgaWeeks: number | null;
  cgaDays: number | null;
  rightVi: number | null;
  leftVi: number | null;
}

export interface Patient {
  id: string;
  name: string;
  hospitalNumber: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  measurements: Measurement[];
}

export const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function newPatient(): Patient {
  const now = new Date().toISOString();
  return { id: uid(), name: '', hospitalNumber: '', notes: '', createdAt: now, updatedAt: now, measurements: [] };
}

export function newMeasurement(): Measurement {
  return { id: uid(), scanDate: '', cgaWeeks: null, cgaDays: 0, rightVi: null, leftVi: null };
}

/**
 * Older versions called these fields pmaWeeks/pmaDays (the label has since become CGA).
 * Upgrade such records in place so previously saved patients still load.
 */
export function upgradeLegacyPatient(p: Patient): Patient {
  for (const m of p.measurements ?? []) {
    const legacy = m as unknown as Record<string, number | null | undefined>;
    if (m.cgaWeeks === undefined && legacy.pmaWeeks !== undefined) {
      m.cgaWeeks = legacy.pmaWeeks ?? null;
      m.cgaDays = legacy.pmaDays ?? 0;
    }
    delete legacy.pmaWeeks;
    delete legacy.pmaDays;
  }
  return p;
}
