import { makeBackup, parseBackup } from './backup';
import type { Patient } from './types';

/**
 * A "patient file" is this whole app saved as one HTML file with a single
 * patient's data embedded in <script id="vi-data" type="application/json">.
 * Opening the file launches the app with that patient loaded; saving again
 * writes a fresh copy, so no separate export/import step is needed.
 */
export const DATA_ELEMENT_ID = 'vi-data';

/** JSON that is safe to place inside a <script> element. */
const scriptSafe = (json: string) => json.split('<').join('\\u003c').split(String.fromCharCode(0x2028)).join('\\u2028').split(String.fromCharCode(0x2029)).join('\\u2029');

/** Read the embedded patient from a live document, or null for the plain app. */
export function readEmbedded(doc: Document): Patient | null {
  const el = doc.getElementById(DATA_ELEMENT_ID);
  if (!el?.textContent?.trim()) return null;
  return parseBackup(el.textContent)[0] ?? null;
}

/** Serialise the running app, with the rendered UI stripped and `p` embedded. */
export function buildPatientHtml(doc: Document, p: Patient): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelector('#app')?.replaceChildren();
  clone.querySelector(`#${DATA_ELEMENT_ID}`)?.remove();
  const data = doc.createElement('script');
  data.id = DATA_ELEMENT_ID;
  data.type = 'application/json';
  data.textContent = scriptSafe(JSON.stringify(makeBackup([p])));
  clone.querySelector('#app')!.after(data);
  return '<!doctype html>\n' + clone.outerHTML;
}

/** Extract patients from the text of a saved patient file (HTML). */
export function parsePatientHtml(html: string): Patient[] {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  const el = parsed.getElementById(DATA_ELEMENT_ID);
  if (!el?.textContent?.trim()) throw new Error('This HTML file has no patient data in it.');
  return parseBackup(el.textContent);
}

/** Accept either a JSON backup or a saved patient HTML file. */
export function parseImport(text: string): Patient[] {
  return /^\s*(﻿)?\s*</.test(text) ? parsePatientHtml(text) : parseBackup(text);
}

export function patientFileName(p: Patient, date = new Date()): string {
  const who = (p.hospitalNumber || p.name || 'patient').replace(/[^\w.-]+/g, '_');
  return `VI-chart_${who}_${date.toISOString().slice(0, 10)}.html`;
}
