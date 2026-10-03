import type { Patient } from './types';

/**
 * Local-only persistence. Patients live in IndexedDB on this device.
 * If IndexedDB is unavailable (some locked-down browsers / private modes) we fall
 * back to memory and report it so the UI can warn the clinician to export.
 */
const DB_NAME = 'levene-vi-chart';
const STORE = 'patients';

export interface PatientStore {
  readonly persistent: boolean;
  all(): Promise<Patient[]>;
  put(p: Patient): Promise<void>;
  remove(id: string): Promise<void>;
}

function reqToPromise<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const open = indexedDB.open(DB_NAME, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'id' });
    open.onsuccess = () => res(open.result);
    open.onerror = () => rej(open.error);
    open.onblocked = () => rej(new Error('IndexedDB blocked'));
  });
}

class IdbStore implements PatientStore {
  readonly persistent = true;
  constructor(private db: IDBDatabase) {}
  private store(mode: IDBTransactionMode) {
    return this.db.transaction(STORE, mode).objectStore(STORE);
  }
  all() { return reqToPromise(this.store('readonly').getAll() as IDBRequest<Patient[]>); }
  async put(p: Patient) { await reqToPromise(this.store('readwrite').put(p)); }
  async remove(id: string) { await reqToPromise(this.store('readwrite').delete(id)); }
}

class MemoryStore implements PatientStore {
  readonly persistent = false;
  private m = new Map<string, Patient>();
  async all() { return [...this.m.values()]; }
  async put(p: Patient) { this.m.set(p.id, structuredClone(p)); }
  async remove(id: string) { this.m.delete(id); }
}

export async function openStore(): Promise<PatientStore> {
  try {
    if (typeof indexedDB === 'undefined') throw new Error('no indexedDB');
    const store = new IdbStore(await openDb());
    // Ask the browser not to evict our data under storage pressure (best effort).
    try { await navigator.storage?.persist?.(); } catch { /* ignore */ }
    return store;
  } catch {
    return new MemoryStore();
  }
}
