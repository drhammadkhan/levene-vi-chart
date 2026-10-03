export interface Measurement {
  id: string;
  /** Optional ISO date (yyyy-mm-dd) of the scan. */
  scanDate: string;
  /** Completed weeks of postmenstrual age; null while being entered. */
  pmaWeeks: number | null;
  pmaDays: number | null;
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
  return { id: uid(), scanDate: '', pmaWeeks: null, pmaDays: 0, rightVi: null, leftVi: null };
}
