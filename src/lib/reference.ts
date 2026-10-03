/**
 * Levene ventricular index reference values.
 * Source: Levene MI. Measurement of the growth of the lateral ventricles in
 * preterm infants with real-time ultrasound. Arch Dis Child 1981;56:900-904.
 * https://pmc.ncbi.nlm.nih.gov/articles/PMC1627506/pdf/archdisch00762-0010.pdf
 *
 * p97plus4 is the 97th centile + 4 mm, the usual threshold at which
 * intervention is considered.
 */
export interface RefPoint {
  ga: number;
  p50: number;
  p97plus4: number;
}

export const LEVENE_REFERENCE: readonly RefPoint[] = [
  { ga: 27, p50: 10.0, p97plus4: 14.0 },
  { ga: 28, p50: 10.1, p97plus4: 14.1 },
  { ga: 29, p50: 10.3, p97plus4: 14.3 },
  { ga: 30, p50: 10.5, p97plus4: 14.5 },
  { ga: 31, p50: 10.9, p97plus4: 14.9 },
  { ga: 32, p50: 11.4, p97plus4: 15.4 },
  { ga: 33, p50: 11.9, p97plus4: 15.9 },
  { ga: 34, p50: 12.4, p97plus4: 16.4 },
  { ga: 35, p50: 12.9, p97plus4: 16.9 },
  { ga: 36, p50: 13.2, p97plus4: 17.2 },
  { ga: 37, p50: 13.3, p97plus4: 17.3 },
  { ga: 38, p50: 13.4, p97plus4: 17.4 },
  { ga: 39, p50: 13.5, p97plus4: 17.5 },
  { ga: 40, p50: 13.8, p97plus4: 17.8 },
];

export const REF_MIN_GA = LEVENE_REFERENCE[0].ga;
export const REF_MAX_GA = LEVENE_REFERENCE[LEVENE_REFERENCE.length - 1].ga;

export const CITATION =
  'Levene MI. Measurement of the growth of the lateral ventricles in preterm infants with real-time ultrasound. Arch Dis Child 1981;56:900-904.';
