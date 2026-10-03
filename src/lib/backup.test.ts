import { describe, expect, it } from 'vitest';
import { makeBackup, mergeImport, parseBackup } from './backup';
import { newMeasurement, newPatient } from './types';

describe('backup', () => {
  it('round-trips patients and measurements', () => {
    const p = newPatient();
    p.name = 'Baby A';
    const m = newMeasurement();
    m.pmaWeeks = 30; m.rightVi = 12.5;
    p.measurements.push(m);
    const back = parseBackup(JSON.stringify(makeBackup([p])));
    expect(back).toEqual([p]);
  });
  it('rejects foreign or malformed files', () => {
    expect(() => parseBackup('nope')).toThrow(/JSON/);
    expect(() => parseBackup('{"format":"other"}')).toThrow(/not a Levene/);
    expect(() => parseBackup(JSON.stringify({ format: 'levene-vi-chart', version: 99, patients: [] }))).toThrow(/newer/);
  });
  it('drops non-numeric values rather than trusting them', () => {
    const p = newPatient();
    const raw = JSON.stringify({ ...makeBackup([p]), patients: [{ ...p, measurements: [{ id: 'x', rightVi: '12', pmaWeeks: 30 }] }] });
    expect(parseBackup(raw)[0].measurements[0].rightVi).toBeNull();
  });
  it('merge keeps the newer copy and counts additions', () => {
    const a = newPatient(); a.updatedAt = '2026-01-02T00:00:00Z';
    const older = { ...a, updatedAt: '2026-01-01T00:00:00Z' };
    const newer = { ...a, updatedAt: '2026-01-03T00:00:00Z' };
    const b = newPatient();
    expect(mergeImport([a], [older]).toWrite).toHaveLength(0);
    expect(mergeImport([a], [newer, b])).toMatchObject({ added: 1, updated: 1 });
  });
});
