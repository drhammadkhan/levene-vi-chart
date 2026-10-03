import { jsPDF } from 'jspdf';
import { svg2pdf } from 'svg2pdf.js';
import { centilesAt, decimalPma, flagVi } from './centiles';
import { buildChartSvg } from './chart';
import { CITATION } from './reference';
import type { Patient } from './types';

const fmt = (n: number | null) => (n == null ? '-' : n.toFixed(1));

function flagText(pma: number | null, vi: number | null): string {
  if (pma == null || vi == null) return '';
  const f = flagVi(pma, vi);
  return f === 'above' ? 'ABOVE' : f === 'out-of-range' ? 'n/a' : '';
}

/** Build a vector PDF of the chart plus a table of all VI values. */
export async function exportPatientPdf(p: Patient): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  doc.setFont('helvetica', 'bold').setFontSize(16);
  doc.text('Ventricular index chart', margin, 18);
  doc.setFont('helvetica', 'normal').setFontSize(10);
  doc.text(`Name: ${p.name || '-'}`, margin, 26);
  doc.text(`Hospital number: ${p.hospitalNumber || '-'}`, margin, 31);
  doc.text(`Exported: ${new Date().toLocaleString()}`, pageW - margin, 26, { align: 'right' });

  // Chart (vector). svg2pdf needs the node in the DOM for style resolution.
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0';
  host.innerHTML = buildChartSvg(p.measurements);
  document.body.appendChild(host);
  let tableTop = 0;
  try {
    const chartW = pageW - margin * 2, chartH = (chartW * 460) / 760;
    await svg2pdf(host.firstElementChild as SVGElement, doc, { x: margin, y: 36, width: chartW, height: chartH });
    tableTop = 36 + chartH + 8;
  } finally {
    host.remove();
  }

  const cols = [
    { h: 'Scan date', x: margin },
    { h: 'PMA (w+d)', x: margin + 32 },
    { h: 'Right VI (mm)', x: margin + 62 },
    { h: 'Left VI (mm)', x: margin + 94 },
    { h: '97th+4 at PMA', x: margin + 126 },
    { h: 'Flag', x: margin + 158 },
  ];
  const header = (yy: number) => {
    doc.setFont('helvetica', 'bold').setFontSize(9);
    cols.forEach((c) => doc.text(c.h, c.x, yy));
    doc.setDrawColor(150).line(margin, yy + 1.5, pageW - margin, yy + 1.5);
    doc.setFont('helvetica', 'normal');
  };
  let yy = tableTop;
  header(yy);
  yy += 6;
  const rows = [...p.measurements]
    .filter((m) => m.pmaWeeks != null)
    .sort((a, b) => decimalPma(a.pmaWeeks!, a.pmaDays ?? 0) - decimalPma(b.pmaWeeks!, b.pmaDays ?? 0));
  for (const m of rows) {
    if (yy > pageH - 28) { doc.addPage(); yy = 20; header(yy); yy += 6; }
    const pma = decimalPma(m.pmaWeeks!, m.pmaDays ?? 0);
    const c = centilesAt(pma);
    const flags = [flagText(pma, m.rightVi) && `R ${flagText(pma, m.rightVi)}`, flagText(pma, m.leftVi) && `L ${flagText(pma, m.leftVi)}`].filter(Boolean).join(' ');
    const cells = [m.scanDate || '-', `${m.pmaWeeks}+${m.pmaDays ?? 0}`, fmt(m.rightVi), fmt(m.leftVi), c ? c.p97plus4.toFixed(1) : '-', flags];
    cells.forEach((t, i) => doc.text(t, cols[i].x, yy));
    yy += 5.5;
  }
  if (!rows.length) doc.text('No measurements recorded.', margin, yy);

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i).setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(100);
    const note = doc.splitTextToSize(`Reference: ${CITATION} Centiles are linearly interpolated between whole weeks and not extrapolated outside 27-40 weeks. "ABOVE" = above the 97th centile + 4 mm. This chart is a reference aid and does not replace clinical judgement.`, pageW - margin * 2);
    doc.text(note, margin, pageH - 14);
    doc.text(`Page ${i} of ${pages}`, pageW - margin, pageH - 6, { align: 'right' });
  }
  const safe = (p.hospitalNumber || p.name || 'patient').replace(/[^\w.-]+/g, '_');
  doc.save(`VI-chart_${safe}.pdf`);
}
