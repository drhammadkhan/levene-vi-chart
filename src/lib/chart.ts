import { centilesAt, decimalPma } from './centiles';
import { LEVENE_REFERENCE } from './reference';
import type { Measurement } from './types';

export type ChartTheme = 'print' | 'light' | 'dark';

interface Palette { bg: string; text: string; grid: string; frame: string; right: string; left: string; p50: string; p97: string }

/** 'print' is the white-background palette used for the PDF; light/dark match the on-screen page. */
const PALETTES: Record<ChartTheme, Palette> = {
  print: { bg: '#ffffff', text: '#1b1814', grid: '#e5e0d4', frame: '#8a8275', right: '#1d5e57', left: '#1b1814', p50: '#7a7266', p97: '#c2321a' },
  light: { bg: 'none', text: '#1b1814', grid: '#d6cdbb', frame: '#7a7266', right: '#1d5e57', left: '#1b1814', p50: '#7a7266', p97: '#d63a1f' },
  dark: { bg: 'none', text: '#f1ebdd', grid: '#363126', frame: '#9b9384', right: '#6fd0c2', left: '#f1ebdd', p50: '#9b9384', p97: '#ff7a5c' },
};

export interface PlotPoint {
  pma: number;
  vi: number;
}

export function seriesFrom(ms: Measurement[], side: 'rightVi' | 'leftVi'): PlotPoint[] {
  return ms
    .filter((m) => m.pmaWeeks != null && m[side] != null)
    .map((m) => ({ pma: decimalPma(m.pmaWeeks!, m.pmaDays ?? 0), vi: m[side]! }))
    .sort((a, b) => a.pma - b.pma);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/**
 * Build the chart as a standalone SVG string. Only presentation attributes are
 * used (no CSS classes) so the same markup renders identically on screen and
 * when converted to vector PDF by svg2pdf.
 */
export function buildChartSvg(ms: Measurement[], opts: { width?: number; height?: number; title?: string; theme?: ChartTheme } = {}): string {
  const COLORS = PALETTES[opts.theme ?? 'print'];
  const ring = COLORS.bg === 'none' ? (opts.theme === 'dark' ? '#1d1a15' : '#ebe4d6') : COLORS.bg;
  const W = opts.width ?? 760, H = opts.height ?? 460;
  const m = { l: 56, r: 24, t: opts.title ? 44 : 20, b: 76 };
  const right = seriesFrom(ms, 'rightVi'), left = seriesFrom(ms, 'leftVi');
  const all = [...right, ...left];

  const xMin = 24, xMax = 42;
  const maxVi = Math.max(20, ...all.map((p) => p.vi));
  const yMin = 6, yMax = Math.ceil((maxVi + 1) / 2) * 2;
  const x = (v: number) => m.l + ((v - xMin) / (xMax - xMin)) * (W - m.l - m.r);
  const y = (v: number) => H - m.b - ((v - yMin) / (yMax - yMin)) * (H - m.t - m.b);
  const f = (n: number) => n.toFixed(1);
  const font = 'font-family="Helvetica, Arial, sans-serif"';

  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventricular index versus postmenstrual age">`;
  if (COLORS.bg !== 'none') s += `<rect width="${W}" height="${H}" fill="${COLORS.bg}"/>`;
  if (opts.title) s += `<text x="${W / 2}" y="26" text-anchor="middle" font-size="16" font-weight="bold" fill="${COLORS.text}" ${font}>${esc(opts.title)}</text>`;

  for (let v = xMin; v <= xMax; v += 2) {
    s += `<line x1="${f(x(v))}" y1="${m.t}" x2="${f(x(v))}" y2="${H - m.b}" stroke="${COLORS.grid}" stroke-width="1"/>`;
    s += `<text x="${f(x(v))}" y="${H - m.b + 16}" text-anchor="middle" font-size="11" fill="${COLORS.text}" ${font}>${v}</text>`;
  }
  for (let v = yMin; v <= yMax; v += 2) {
    s += `<line x1="${m.l}" y1="${f(y(v))}" x2="${W - m.r}" y2="${f(y(v))}" stroke="${COLORS.grid}" stroke-width="1"/>`;
    s += `<text x="${m.l - 8}" y="${f(y(v) + 4)}" text-anchor="end" font-size="11" fill="${COLORS.text}" ${font}>${v}</text>`;
  }
  s += `<rect x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="none" stroke="${COLORS.frame}" stroke-width="1"/>`;
  s += `<text x="${(m.l + W - m.r) / 2}" y="${H - m.b + 36}" text-anchor="middle" font-size="12" fill="${COLORS.text}" ${font}>Postmenstrual age (weeks)</text>`;
  s += `<text transform="translate(16 ${(m.t + H - m.b) / 2}) rotate(-90)" text-anchor="middle" font-size="12" fill="${COLORS.text}" ${font}>Ventricular index (mm)</text>`;

  const refLine = (key: 'p50' | 'p97plus4', color: string, dash: string) => {
    const pts = LEVENE_REFERENCE.map((r) => `${f(x(r.ga))},${f(y(r[key]))}`).join(' ');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;
  };
  s += refLine('p50', COLORS.p50, '6 4');
  s += refLine('p97plus4', COLORS.p97, '');

  const line = (pts: PlotPoint[], color: string) =>
    pts.length > 1 ? `<polyline points="${pts.map((p) => `${f(x(p.pma))},${f(y(p.vi))}`).join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.6"/>` : '';
  s += line(right, COLORS.right) + line(left, COLORS.left);
  for (const p of right) s += `<circle cx="${f(x(p.pma))}" cy="${f(y(p.vi))}" r="5" fill="${COLORS.right}" stroke="${ring}" stroke-width="1"/>`;
  for (const p of left) {
    const cx = x(p.pma), cy = y(p.vi);
    s += `<rect x="${f(cx - 4.5)}" y="${f(cy - 4.5)}" width="9" height="9" fill="${COLORS.left}" stroke="${ring}" stroke-width="1"/>`;
  }

  // Legend
  const items: [string, string][] = [['p50', 'Levene 50th centile'], ['p97', 'Levene 97th centile + 4 mm'], ['right', 'Right VI'], ['left', 'Left VI']];
  const lx = m.l, ly = H - 18;
  let cursor = lx;
  for (const [k, label] of items) {
    if (k === 'p50') s += `<line x1="${cursor}" y1="${ly}" x2="${cursor + 22}" y2="${ly}" stroke="${COLORS.p50}" stroke-width="2" stroke-dasharray="6 4"/>`;
    if (k === 'p97') s += `<line x1="${cursor}" y1="${ly}" x2="${cursor + 22}" y2="${ly}" stroke="${COLORS.p97}" stroke-width="2"/>`;
    if (k === 'right') s += `<circle cx="${cursor + 11}" cy="${ly}" r="5" fill="${COLORS.right}"/>`;
    if (k === 'left') s += `<rect x="${cursor + 6.5}" y="${ly - 4.5}" width="9" height="9" fill="${COLORS.left}"/>`;
    s += `<text x="${cursor + 28}" y="${ly + 4}" font-size="11" fill="${COLORS.text}" ${font}>${esc(label)}</text>`;
    cursor += 28 + label.length * 5.6 + 18;
  }
  return s + '</svg>';
}

export { centilesAt };
