import { centilesAt, decimalPma, flagVi } from '../lib/centiles';
import { buildChartSvg, type ChartTheme } from '../lib/chart';
import { makeBackup, mergeImport, parseBackup } from '../lib/backup';
import { openStore, type PatientStore } from '../lib/storage';
import { newMeasurement, newPatient, type Measurement, type Patient } from '../lib/types';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const LAST_BACKUP_KEY = 'levene-vi:lastBackup';

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseNum(v: string): number | null {
  const t = v.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

type FieldKey = 'pmaWeeks' | 'pmaDays' | 'rightVi' | 'leftVi';
const LIMITS: Record<FieldKey, { min: number; max: number; int: boolean }> = {
  pmaWeeks: { min: 22, max: 45, int: true },
  pmaDays: { min: 0, max: 6, int: true },
  rightVi: { min: 0, max: 60, int: false },
  leftVi: { min: 0, max: 60, int: false },
};
const isBad = (k: FieldKey, v: number | null) =>
  v != null && (Number.isNaN(v) || v < LIMITS[k].min || v > LIMITS[k].max || (LIMITS[k].int && !Number.isInteger(v)));

export async function startApp(root: HTMLElement) {
  const store: PatientStore = await openStore();
  let patients = (await store.all()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  let selectedId: string | null = patients[0]?.id ?? null;
  let filter = '';
  let toast = '';
  const saveTimers = new Map<string, number>();

  const current = () => patients.find((p) => p.id === selectedId) ?? null;
  const say = (t: string) => { toast = t; render(); setTimeout(() => { if (toast === t) { toast = ''; render(); } }, 4000); };

  function persist(p: Patient) {
    p.updatedAt = new Date().toISOString();
    clearTimeout(saveTimers.get(p.id));
    saveTimers.set(p.id, window.setTimeout(() => store.put(structuredClone(p)).catch(() => say('Could not save to this device.')), 250));
  }

  function backupNudge(): string {
    if (!patients.length) return '';
    let last = 0;
    try { last = Number(localStorage.getItem(LAST_BACKUP_KEY)) || 0; } catch { /* ignore */ }
    const days = (Date.now() - last) / 86400000;
    if (last && days < 7) return '';
    return last ? `Last backup was ${Math.floor(days)} days ago. ` : 'No backup has been exported yet. ';
  }

  function markBackedUp() { try { localStorage.setItem(LAST_BACKUP_KEY, String(Date.now())); } catch { /* ignore */ } }

  function render() {
    const p = current();
    const shown = patients.filter((x) => (x.name + ' ' + x.hospitalNumber).toLowerCase().includes(filter.toLowerCase()));
    root.innerHTML = `
      <header class="topbar">
        <div class="brand">Evelina Neonatal data group</div>
        <div class="kicker">Levene 1981 reference &middot; lateral ventricles</div>
        <h1>Ventricular index <em>chart</em></h1>
      </header>
      <div class="layout">
      <aside class="noprint">
        <div class="sidecard">
        <button class="primary" data-act="new">+ New patient</button>
        <input type="search" id="filter" placeholder="Search name / hospital no." value="${esc(filter)}" aria-label="Search patients">
        <ul class="plist">${shown.map((x) => `<li data-id="${x.id}" class="${x.id === selectedId ? 'sel' : ''}">${esc(x.name || 'Unnamed')}<small>${esc(x.hospitalNumber || 'no hospital no.')} · ${x.measurements.length} scan${x.measurements.length === 1 ? '' : 's'}</small></li>`).join('') || '<li class="muted">No patients yet</li>'}</ul>
        <div class="row">
          <button data-act="backup">Back up all</button>
          <button data-act="import">Import</button>
        </div>
        <input type="file" id="file" accept="application/json,.json" hidden>
        <div class="muted">All data stays on this device. Nothing is sent anywhere.</div>
        </div>
      </aside>
      <main>
        ${store.persistent ? '' : '<div class="banner">Browser storage is unavailable, so data will be lost when you close this page. Export a backup before leaving.</div>'}
        ${backupNudge() ? `<div class="banner noprint">${backupNudge()}Browser storage can be cleared, so use <b>Back up all</b> regularly.</div>` : ''}
        ${toast ? `<div class="banner">${esc(toast)}</div>` : ''}
        ${p ? patientView(p) : '<div class="card accent">Create or select a patient to begin.</div>'}
        ${legend()}
      </main>
      </div>`;
  }

  function legend(): string {
    return `<footer class="legend">
      <div class="notice" role="note"><strong>This tool supports, and does not replace, clinical judgement and current guidance.</strong> Use at your own discretion.</div>
      <div><b>Reference:</b> <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC1627506/pdf/archdisch00762-0010.pdf" target="_blank" rel="noopener">Levene MI. Arch Dis Child 1981;56:900-904</a>. Flag = above the 97th centile + 4 mm, linearly interpolated between whole weeks (27&ndash;40 weeks only).</div>
      <p class="credit">A tool from the Evelina Neonatal data group.</p>
    </footer>`;
  }

  const themeFor = (): ChartTheme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function patientView(p: Patient): string {
    const rows = p.measurements.map((m) => rowView(m)).join('');
    return `
      <div class="card accent">
        <div class="row">
          <label>Name<input data-p="name" value="${esc(p.name)}" autocomplete="off"></label>
          <label>Hospital number<input data-p="hospitalNumber" value="${esc(p.hospitalNumber)}" autocomplete="off"></label>
        </div>
        <div class="row" style="margin-top:8px"><label style="flex-basis:100%">Notes<textarea data-p="notes" rows="2">${esc(p.notes)}</textarea></label></div>
      </div>
      <div class="card">
        <h2>Measurements</h2>
        <table><thead><tr><th>Scan date</th><th>PMA weeks</th><th>PMA days</th><th>Right VI (mm)</th><th>Left VI (mm)</th><th>97th+4 at PMA</th><th></th></tr></thead>
        <tbody>${rows || '<tr><td colspan="7" class="muted">No scans yet.</td></tr>'}</tbody></table>
        <div class="row noprint" style="margin-top:10px"><button data-act="addrow">+ Add scan</button></div>
        <div class="hint">Values above the interpolated 97th centile + 4 mm are shown in red. Centiles only exist for 27–40 weeks PMA.</div>
      </div>
      <div class="card chartwrap">${buildChartSvg(p.measurements, { theme: themeFor(), title: [p.name, p.hospitalNumber].filter(Boolean).join(' · ') || undefined })}</div>
      <div class="row noprint">
        <button class="primary" data-act="pdf">Export PDF</button>
        <button data-act="export-one">Save patient (JSON)</button>
        <button data-act="print">Print</button>
        <button class="danger" data-act="delete">Delete patient</button>
      </div>`;
  }

  function rowView(m: Measurement): string {
    const inp = (k: FieldKey, v: number | null) => `<td><input data-m="${k}" inputmode="decimal" value="${v ?? ''}" class="${isBad(k, v) ? 'bad' : ''}"></td>`;
    const pma = m.pmaWeeks != null ? decimalPma(m.pmaWeeks, m.pmaDays ?? 0) : null;
    const c = pma != null ? centilesAt(pma) : null;
    const cls = (v: number | null) => (pma != null && flagVi(pma, v) === 'above' ? 'above' : '');
    return `<tr data-mid="${m.id}">
      <td><input data-m="scanDate" type="date" value="${esc(m.scanDate)}"></td>
      ${inp('pmaWeeks', m.pmaWeeks)}${inp('pmaDays', m.pmaDays)}
      <td class="${cls(m.rightVi)}">${inp('rightVi', m.rightVi).replace(/^<td>|<\/td>$/g, '')}</td>
      <td class="${cls(m.leftVi)}">${inp('leftVi', m.leftVi).replace(/^<td>|<\/td>$/g, '')}</td>
      <td class="calc">${c ? c.p97plus4.toFixed(1) : pma != null ? 'n/a' : ''}</td>
      <td class="noprint"><button data-act="delrow" title="Remove scan">✕</button></td></tr>`;
  }

  // Delegated events ------------------------------------------------------
  root.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'filter') {
      filter = t.value; const pos = t.selectionStart; render();
      const f = root.querySelector<HTMLInputElement>('#filter')!; f.focus(); f.setSelectionRange(pos, pos);
      return;
    }
    const p = current(); if (!p) return;
    if (t.dataset.p) { (p as unknown as Record<string, string>)[t.dataset.p] = t.value; persist(p); return; }
  });

  // Measurement edits commit on 'change' so rows re-sort without losing the cursor mid-typing.
  root.addEventListener('change', (e) => {
    const t = e.target as HTMLInputElement;
    const p = current(); if (!p) return;
    if (t.id === 'file') { void importFile(t); return; }
    const tr = t.closest<HTMLElement>('tr[data-mid]');
    const key = t.dataset.m;
    if (!tr || !key) return;
    const m = p.measurements.find((x) => x.id === tr.dataset.mid)!;
    if (key === 'scanDate') m.scanDate = t.value;
    else {
      const v = parseNum(t.value);
      if (isBad(key as FieldKey, v)) { t.classList.add('bad'); (m as unknown as Record<string, number | null>)[key] = null; }
      else (m as unknown as Record<string, number | null>)[key] = v;
    }
    p.measurements.sort((a, b) => {
      const pa = a.pmaWeeks == null ? Infinity : decimalPma(a.pmaWeeks, a.pmaDays ?? 0);
      const pb = b.pmaWeeks == null ? Infinity : decimalPma(b.pmaWeeks, b.pmaDays ?? 0);
      return pa - pb;
    });
    persist(p); render();
  });

  root.addEventListener('click', async (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-act],li[data-id]');
    if (!el) return;
    if (el.dataset.id) { selectedId = el.dataset.id; render(); return; }
    const p = current();
    switch (el.dataset.act) {
      case 'new': { const np = newPatient(); patients.unshift(np); selectedId = np.id; await store.put(np); render(); root.querySelector<HTMLInputElement>('[data-p="name"]')?.focus(); break; }
      case 'addrow': if (p) { p.measurements.push(newMeasurement()); persist(p); render(); root.querySelector<HTMLInputElement>('tr:last-child [data-m="pmaWeeks"]')?.focus(); } break;
      case 'delrow': if (p) { const id = el.closest<HTMLElement>('tr')!.dataset.mid; p.measurements = p.measurements.filter((m) => m.id !== id); persist(p); render(); } break;
      case 'delete': if (p && confirm(`Delete ${p.name || 'this patient'} and all their measurements from this device? Export a backup first if unsure.`)) { await store.remove(p.id); patients = patients.filter((x) => x.id !== p.id); selectedId = patients[0]?.id ?? null; render(); } break;
      case 'pdf': if (p) { try { const { exportPatientPdf } = await import('../lib/pdf'); await exportPatientPdf(p); } catch (err) { say('PDF export failed: ' + (err as Error).message); } } break;
      case 'print': window.print(); break;
      case 'export-one': if (p) download(`VI-${(p.hospitalNumber || p.name || 'patient').replace(/[^\w.-]+/g, '_')}.json`, JSON.stringify(makeBackup([p]), null, 2), 'application/json'); break;
      case 'backup': download(`VI-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(makeBackup(patients), null, 2), 'application/json'); markBackedUp(); render(); break;
      case 'import': root.querySelector<HTMLInputElement>('#file')!.click(); break;
    }
  });

  async function importFile(input: HTMLInputElement) {
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    try {
      const incoming = parseBackup(await file.text());
      const { toWrite, added, updated } = mergeImport(patients, incoming);
      for (const p of toWrite) await store.put(p);
      patients = (await store.all()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      selectedId = selectedId ?? patients[0]?.id ?? null;
      say(`Imported: ${added} new, ${updated} updated, ${incoming.length - toWrite.length} unchanged.`);
    } catch (err) { say((err as Error).message); }
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => render());
  render();
}
