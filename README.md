# Levene VI chart

Plot right and left ventricular index (VI) against postmenstrual age on the Levene (1981) reference chart, keep a local patient list, and export a PDF or JSON.

**All data stays on the device.** There is no server, no analytics and no network access (enforced by a `connect-src 'none'` Content-Security-Policy). Patients are stored in the browser's IndexedDB.

## Features
- Patient list with name, hospital number, notes and any number of scans
- Right and left VI against the 50th centile and 97th centile + 4 mm
- Linear interpolation of centiles between whole weeks (27-40 weeks; never extrapolated)
- Values above the interpolated 97th + 4 mm line are flagged
- PDF export (vector chart + table of values), print, JSON export/import for backup and moving between devices

## Persistence: please read
Browser storage can be cleared (clearing site data, some private modes, storage pressure). Use **Back up all** regularly and keep the JSON file somewhere safe. Importing merges by patient id; the more recently edited copy wins.

## Two ways to run it
- **Hosted:** GitHub Pages build (`npm run build`, output in `dist/`).
- **Single file:** `npm run build:single` produces `dist-single/index.html`, one self-contained file that works offline from a USB stick or shared drive. Each tagged release (`v*`) attaches it as `levene-vi-chart.html`.

Note: the hosted site and the single file are different "origins", so their stored patients are separate. Move data between them with the JSON export/import.

## Development
```bash
npm install
npm run dev
npm test
```

## Reference
Levene MI. Measurement of the growth of the lateral ventricles in preterm infants with real-time ultrasound. Arch Dis Child 1981;56:900-904. https://pmc.ncbi.nlm.nih.gov/articles/PMC1627506/pdf/archdisch00762-0010.pdf

This is a reference aid and does not replace clinical judgement. It is not a certified medical device.
