# Levene VI chart

Plot right and left ventricular index (VI) against postmenstrual age on the Levene (1981) reference chart, keep a local patient list, and export a PDF or JSON.

**All data stays on the device.** There is no server, no analytics and no network access (enforced by a `connect-src 'none'` Content-Security-Policy). Patients are stored in the browser's IndexedDB.

## Features
- Patient list with name, hospital number, notes and any number of scans
- Right and left VI against the 50th centile and 97th centile + 4 mm
- Linear interpolation of centiles between whole weeks (27-40 weeks; never extrapolated)
- Values above the interpolated 97th + 4 mm line are flagged
- PDF export (vector chart + table of values), print, JSON export/import for backup and moving between devices

## Saving: patient files
Each patient can be saved as a **patient file**: one HTML file containing the whole app plus that patient's details and measurements. Open it in any browser to carry on where you left off, then **Save patient file** again to write an updated copy. No export or import step is needed. A patient file is about 1 MB and contains patient-identifiable data, so store it securely.

- Opening a patient file loads that patient into the browser's local storage on that device. If the device already holds a *newer* copy of the same patient, the newer copy is shown and a notice says so.
- Patients are also autosaved in the browser's IndexedDB, but browser storage can be cleared, so patient files are the durable record.
- **Back up all** writes one JSON file with every patient, and **Import** accepts that JSON or any patient file (merging by patient id; the more recently edited copy wins).

## Build
`npm run build` produces `dist/index.html`, a single self-contained file. It is both the hosted GitHub Pages site and the template for patient files. Each tagged release (`v*`) attaches it as `levene-vi-chart.html`, which works offline from a USB stick or shared drive.

## Development
```bash
npm install
npm run dev
npm test
```

## Reference
Levene MI. Measurement of the growth of the lateral ventricles in preterm infants with real-time ultrasound. Arch Dis Child 1981;56:900-904. https://pmc.ncbi.nlm.nih.gov/articles/PMC1627506/pdf/archdisch00762-0010.pdf

This is a reference aid and does not replace clinical judgement. It is not a certified medical device.
