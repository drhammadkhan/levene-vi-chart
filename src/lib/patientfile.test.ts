import { beforeEach, describe, expect, it } from 'vitest';
import { buildPatientHtml, parseImport, parsePatientHtml, patientFileName, readEmbedded } from './patientfile';
import { newMeasurement, newPatient } from './types';

function fakeApp() {
  document.documentElement.innerHTML =
    '<head><title>App</title><style>body{color:red}</style></head><body><div id="app"><p>rendered UI</p></div><script type="module">window.__x=1</script></body>';
}

describe('patient file', () => {
  beforeEach(fakeApp);

  it('round-trips a patient and strips the rendered UI', () => {
    const p = newPatient();
    p.name = 'Baby A'; p.notes = 'tricky </script><b>x</b> & "quotes"';
    const m = newMeasurement(); m.cgaWeeks = 30; m.rightVi = 12.5; p.measurements.push(m);

    const html = buildPatientHtml(document, p);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).not.toContain('rendered UI');
    expect(html).toContain('window.__x=1');          // app code is kept
    expect(html).toContain('body{color:red}');       // styles are kept
    expect(html.match(/<\/script>/g)!.length).toBe(2); // notes can't break out of the data script
    expect(parsePatientHtml(html)).toEqual([p]);
    expect(parseImport(html)).toEqual([p]);
  });

  it('does not mutate the live document', () => {
    buildPatientHtml(document, newPatient());
    expect(document.querySelector('#app')!.textContent).toContain('rendered UI');
    expect(document.getElementById('vi-data')).toBeNull();
  });

  it('replaces previously embedded data instead of stacking it', () => {
    const a = newPatient(); a.name = 'First';
    const b = newPatient(); b.name = 'Second';
    const once = buildPatientHtml(document, a);
    document.documentElement.innerHTML = new DOMParser().parseFromString(once, 'text/html').documentElement.innerHTML;
    expect(readEmbedded(document)!.name).toBe('First');
    const twice = buildPatientHtml(document, b);
    expect(parsePatientHtml(twice).map((p) => p.name)).toEqual(['Second']);
    expect(twice.match(/id="vi-data"/g)).toHaveLength(1);
  });

  it('reports the plain app as having no embedded patient', () => {
    expect(readEmbedded(document)).toBeNull();
    expect(() => parsePatientHtml('<html><body>hi</body></html>')).toThrow(/no patient data/);
  });

  it('names files by hospital number, falling back to name', () => {
    const p = newPatient(); p.hospitalNumber = 'H 12/3'; p.name = 'X';
    expect(patientFileName(p, new Date('2026-10-03T12:00:00Z'))).toBe('VI-chart_H_12_3_2026-10-03.html');
    p.hospitalNumber = '';
    expect(patientFileName(p, new Date('2026-10-03T12:00:00Z'))).toBe('VI-chart_X_2026-10-03.html');
  });
});
