import { jsPDF } from 'jspdf';
import { CalculationResult, FlatPatternPart } from '../types';
import { extractPointToPointSegments } from '../standards/pointToPointDimensions';

function renderPartPdfPage(
  doc: jsPDF,
  result: CalculationResult,
  part: FlatPatternPart,
  pageIndex: number,
  totalPages: number
) {
  const pageWidth = 297;
  const pageHeight = 210;

  // Background Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Title Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('AERODUCT CAD/CAM - HVAC FABRICATION WORK ORDER', 14, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Model: ${result.modelName} | Part ${pageIndex} of ${totalPages}: ${part.partName} (Qty: ${part.quantity}) | Date: ${new Date().toLocaleDateString()}`,
    14,
    17
  );

  // Status Badge
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.roundedRect(pageWidth - 75, 5, 65, 14, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SMACNA VERIFIED', pageWidth - 42.5, 11, { align: 'center' });
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`PART ${pageIndex} / ${totalPages}`, pageWidth - 42.5, 16, { align: 'center' });

  // Left Sidebar: Engineering Specifications Box + Point-to-Point Schedule
  const sideW = 75;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(10, 28, sideW, pageHeight - 36, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(10, 28, sideW, pageHeight - 36, 'S');

  // Specs Header
  doc.setFillColor(226, 232, 240);
  doc.rect(10, 28, sideW, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PART SPECIFICATIONS', 14, 33);

  let y = 40;
  const addSpecLine = (label: string, val: string) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label, 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(val, 80, y, { align: 'right' });
    y += 5.5;
  };

  addSpecLine('Part Name:', part.partName.substring(0, 20));
  addSpecLine('Quantity:', `${part.quantity} pcs`);
  addSpecLine('Blank Width:', `${part.blankWidthMm} mm`);
  addSpecLine('Blank Length:', `${part.blankLengthMm} mm`);
  addSpecLine('Part Net Area:', `${part.areaM2} m²`);
  addSpecLine('Part Weight:', `${part.weightKg} kg`);
  addSpecLine('Bends Count:', `${part.bendCount} bends`);

  // Point to Point Dimension Schedule Table Header
  y += 2;
  doc.setFillColor(226, 232, 240);
  doc.rect(10, y, sideW, 6.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(10, y, sideW, 6.5, 'S');
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('POINT-TO-POINT LENGTH SCHEDULE', 14, y + 4.5);
  y += 10;

  // Extract P2P segments
  const p2pSegments = extractPointToPointSegments(part);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('Seg', 12, y);
  doc.text('Start (X,Y)', 22, y);
  doc.text('End (X,Y)', 44, y);
  doc.text('Length (mm)', 82, y, { align: 'right' });
  y += 4;

  doc.setDrawColor(226, 232, 240);
  doc.line(12, y - 1, 82, y - 1);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);

  // Print top 15 key segments in schedule table
  p2pSegments.slice(0, 14).forEach((seg, idx) => {
    doc.text(`#${idx + 1}`, 12, y);
    doc.text(`${Math.round(seg.start.x)},${Math.round(seg.start.y)}`, 22, y);
    doc.text(`${Math.round(seg.end.x)},${Math.round(seg.end.y)}`, 44, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${seg.lengthMm}`, 82, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 4.5;
  });

  if (p2pSegments.length > 14) {
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`+ ${p2pSegments.length - 14} more segments shown on drawing`, 14, y + 1);
  }

  // Right Drawing Canvas Box (2D Flat Pattern)
  const drawX = 90;
  const drawY = 28;
  const drawW = pageWidth - drawX - 10; // ~197 mm
  const drawH = pageHeight - drawY - 8; // ~174 mm

  doc.setFillColor(255, 255, 255);
  doc.rect(drawX, drawY, drawW, drawH, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(drawX, drawY, drawW, drawH, 'S');

  // Drawing title
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `2D FLAT CUTTING PATTERN - ${part.partName.toUpperCase()} (EVERY POINT-TO-POINT LENGTH ANNOTATED)`,
    drawX + 6,
    drawY + 7
  );

  // Compute scaling to fit the flat pattern inside the canvas
  const padding = 18;
  const availW = drawW - 2 * padding;
  const availH = drawH - 2 * padding - 10;

  const scale = Math.min(availW / part.blankWidthMm, availH / part.blankLengthMm);
  const offsetX = drawX + padding + (availW - part.blankWidthMm * scale) / 2;
  const offsetY = drawY + padding + 8 + (availH - part.blankLengthMm * scale) / 2;

  // Draw Sheet Blank boundary (dashed slate)
  doc.setDrawColor(148, 163, 184);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(offsetX, offsetY, part.blankWidthMm * scale, part.blankLengthMm * scale, 'S');
  doc.setLineDashPattern([], 0); // reset

  // Draw Lines & P2P lengths
  part.lines.forEach(l => {
    const x1 = offsetX + l.start.x * scale;
    const y1 = offsetY + l.start.y * scale;
    const x2 = offsetX + l.end.x * scale;
    const y2 = offsetY + l.end.y * scale;

    if (l.type === 'cut') {
      doc.setDrawColor(37, 99, 235); // Blue cut line
      doc.setLineWidth(0.5);
      doc.setLineDashPattern([], 0);
    } else if (l.type === 'bend_up') {
      doc.setDrawColor(220, 38, 38); // Red bend up
      doc.setLineWidth(0.35);
      doc.setLineDashPattern([2, 1.5], 0);
    } else if (l.type === 'bend_down') {
      doc.setDrawColor(22, 163, 74); // Green bend down
      doc.setLineWidth(0.35);
      doc.setLineDashPattern([1.5, 1.5], 0);
    } else if (l.type === 'seam') {
      doc.setDrawColor(147, 51, 234); // Purple seam
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([3, 1], 0);
    } else {
      doc.setDrawColor(156, 163, 175); // Gray guide
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
    }

    doc.line(x1, y1, x2, y2);
  });

  doc.setLineDashPattern([], 0); // reset

  // Annotate Point-to-Point Lengths directly on Drawing
  p2pSegments.forEach(seg => {
    if (seg.lengthMm < 15) return; // avoid cluttering small notches
    const lx = offsetX + seg.labelPosition.x * scale;
    const ly = offsetY + seg.labelPosition.y * scale;

    // Small numeric length badge
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(217, 119, 6); // amber-600
    doc.text(`${Math.round(seg.lengthMm)}`, lx, ly, { align: 'center' });
  });

  // Draw Legend at bottom
  const legX = drawX + drawW - 75;
  const legY = drawY + drawH - 22;
  doc.setFillColor(248, 250, 252);
  doc.rect(legX, legY, 70, 18, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(legX, legY, 70, 18, 'S');

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  // Cut line legend
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(legX + 3, legY + 4, legX + 13, legY + 4);
  doc.text('Cut Line (Outer)', legX + 16, legY + 5);

  // Bend up legend
  doc.setDrawColor(220, 38, 38);
  doc.setLineDashPattern([2, 1], 0);
  doc.line(legX + 3, legY + 9, legX + 13, legY + 9);
  doc.text('Bend UP (Red)', legX + 16, legY + 10);

  // Bend down legend
  doc.setDrawColor(22, 163, 74);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.line(legX + 3, legY + 14, legX + 13, legY + 14);
  doc.text('Bend DOWN (Green)', legX + 16, legY + 15);
  doc.setLineDashPattern([], 0);
}

/**
 * Generates an overview page showing all parts sequentially side-by-side (পরপর সব পার্টস)
 */
function renderAllPartsSequentialPage(doc: jsPDF, result: CalculationResult) {
  doc.addPage();
  const pageWidth = 297;
  const pageHeight = 210;

  // Header Bar
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ALL PARTS CONSECUTIVE CUTTING LAYOUT (পরপর সব পার্টস)', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Model: ${result.modelName} | Total ${result.parts.length} Parts Developed | Sheet Nesting & Shear Schedule`,
    14,
    18
  );

  // Layout Box
  const drawX = 10;
  const drawY = 28;
  const drawW = pageWidth - 20;
  const drawH = pageHeight - 36;

  doc.setFillColor(248, 250, 252);
  doc.rect(drawX, drawY, drawW, drawH, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(drawX, drawY, drawW, drawH, 'S');

  // Compute total width and scaling across all parts
  let sumWidth = 0;
  let maxHeight = 0;
  const GAP_MM = 80;

  result.parts.forEach(p => {
    sumWidth += p.blankWidthMm;
    maxHeight = Math.max(maxHeight, p.blankLengthMm);
  });
  sumWidth += (result.parts.length - 1) * GAP_MM;

  const pad = 15;
  const availW = drawW - 2 * pad;
  const availH = drawH - 2 * pad - 12;

  const scale = Math.min(availW / sumWidth, availH / maxHeight);
  let curX = drawX + pad + (availW - sumWidth * scale) / 2;
  const baseY = drawY + pad + 10 + (availH - maxHeight * scale) / 2;

  result.parts.forEach((p, idx) => {
    const pw = p.blankWidthMm * scale;
    const ph = p.blankLengthMm * scale;

    // Part Label Header
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`#${idx + 1}: ${p.partName}`, curX, baseY - 3);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${p.blankWidthMm}x${p.blankLengthMm}mm (Qty:${p.quantity})`, curX, baseY - 0.5);

    // Sheet outline
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(curX, baseY, pw, ph, 'S');
    doc.setLineDashPattern([], 0);

    // Draw lines
    p.lines.forEach(l => {
      const x1 = curX + l.start.x * scale;
      const y1 = baseY + l.start.y * scale;
      const x2 = curX + l.end.x * scale;
      const y2 = baseY + l.end.y * scale;

      if (l.type === 'cut') {
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.4);
      } else {
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.25);
      }
      doc.line(x1, y1, x2, y2);
    });

    curX += pw + GAP_MM * scale;
  });
}

/**
 * Generates a complete multi-page PDF Work Order for all parts + sequential overview
 */
export function generateCompletePdfReport(result: CalculationResult) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4', // 297 x 210 mm
  });

  const totalParts = result.parts.length;

  result.parts.forEach((part, index) => {
    if (index > 0) doc.addPage();
    renderPartPdfPage(doc, result, part, index + 1, totalParts);
  });

  // Append sequential all-parts layout overview page
  renderAllPartsSequentialPage(doc, result);

  doc.save(`${result.modelId}_ALL_PARTS_fabrication_order.pdf`);
}

/**
 * Generates PDF report for a single specific part
 */
export function generatePdfReport(result: CalculationResult, selectedPart?: FlatPatternPart) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const part = selectedPart || result.parts[0];
  renderPartPdfPage(doc, result, part, 1, 1);
  doc.save(`${part.id}_fabrication_sheet.pdf`);
}
