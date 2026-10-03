import type { Measurement, Patient } from './types';

export const BACKUP_FORMAT = 'levene-vi-chart';
export const BACKUP_VERSION = 1;

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  patients: Patient[];
}

export function makeBackup(patients: Patient[]): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), patients };
}

const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const numOrNull = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

function parseMeasurement(raw: unknown): Measurement | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 100);
  if (!id) return null;
  return {
    id,
    scanDate: str(r.scanDate, 10),
    // pmaWeeks/pmaDays are the names used by earlier versions; still accepted so old files import.
    cgaWeeks: numOrNull(r.cgaWeeks ?? r.pmaWeeks),
    cgaDays: numOrNull(r.cgaDays ?? r.pmaDays),
    rightVi: numOrNull(r.rightVi),
    leftVi: numOrNull(r.leftVi),
  };
}

function parsePatient(raw: unknown): Patient | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 100);
  if (!id) return null;
  const ms = Array.isArray(r.measurements)
    ? r.measurements.map(parseMeasurement).filter((m): m is Measurement => m !== null)
    : [];
  const now = new Date().toISOString();
  return {
    id,
    name: str(r.name, 200),
    hospitalNumber: str(r.hospitalNumber, 100),
    notes: str(r.notes, 5000),
    createdAt: str(r.createdAt, 40) || now,
    updatedAt: str(r.updatedAt, 40) || now,
    measurements: ms,
  };
}

/** Parse and sanitise an imported file. Throws a readable Error if it isn't ours. */
export function parseBackup(text: string): Patient[] {
  let data: unknown;
  try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('File is not valid JSON.'); }
  const d = data as Partial<BackupFile> | null;
  if (!d || d.format !== BACKUP_FORMAT) throw new Error('This is not a Levene VI chart backup file.');
  if (typeof d.version !== 'number' || d.version > BACKUP_VERSION)
    throw new Error('This backup was made by a newer version of the app.');
  if (!Array.isArray(d.patients)) throw new Error('Backup contains no patient list.');
  return d.patients.map(parsePatient).filter((p): p is Patient => p !== null);
}

/**
 * Merge imported patients into existing ones by id. When both exist the more
 * recently updated copy wins. Returns the patients that should be written.
 */
export function mergeImport(existing: Patient[], incoming: Patient[]): { toWrite: Patient[]; added: number; updated: number } {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const toWrite: Patient[] = [];
  let added = 0, updated = 0;
  for (const p of incoming) {
    const cur = byId.get(p.id);
    if (!cur) { toWrite.push(p); added++; }
    else if (p.updatedAt > cur.updatedAt) { toWrite.push(p); updated++; }
  }
  return { toWrite, added, updated };
}
