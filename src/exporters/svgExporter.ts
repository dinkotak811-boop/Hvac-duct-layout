import { FlatPatternPart, CalculationResult } from '../types';
import { extractPointToPointSegments } from '../standards/pointToPointDimensions';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, c => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

const COMMON_SVG_STYLES = `
  .cut-line { stroke: #38bdf8; stroke-width: 1.8; fill: none; stroke-linecap: round; }
  .bend-up { stroke: #f87171; stroke-width: 1.4; stroke-dasharray: 6,4; fill: none; }
  .bend-down { stroke: #4ade80; stroke-width: 1.4; stroke-dasharray: 4,4; fill: none; }
  .seam-line { stroke: #c084fc; stroke-width: 1.2; stroke-dasharray: 8,3,2,3; fill: none; }
  .notch-line { stroke: #fb923c; stroke-width: 1.8; fill: none; }
  .guide-line { stroke: #94a3b8; stroke-width: 0.8; stroke-dasharray: 3,3; fill: none; }
  .part-label { fill: #f8fafc; font-size: 18px; font-weight: bold; text-anchor: middle; font-family: sans-serif; }
  .dim-label { fill: #38bdf8; font-size: 13px; text-anchor: middle; font-family: monospace; }
  .align-label { fill: #fbbf24; font-size: 11px; text-anchor: middle; font-family: sans-serif; }
  .p2p-badge-bg { fill: #0f172a; stroke: #f59e0b; stroke-width: 0.8; rx: 3; opacity: 0.9; }
  .p2p-badge-text { fill: #fef08a; font-size: 10px; font-family: monospace; font-weight: bold; text-anchor: middle; }
  .sheet-border { stroke: #475569; stroke-width: 1.2; stroke-dasharray: 8,4; fill: rgba(30, 41, 59, 0.45); }
  .part-card-header { fill: #38bdf8; font-size: 20px; font-weight: bold; font-family: sans-serif; }
  .part-card-sub { fill: #94a3b8; font-size: 12px; font-family: monospace; }
`;

function renderSvgPartContent(part: FlatPatternPart, xOffset: number = 0, yOffset: number = 0): string {
  let content = `<g transform="translate(${xOffset}, ${yOffset})">\n`;

  // Part Header
  content += `  <!-- Part Header -->\n`;
  content += `  <text class="part-card-header" x="0" y="-30">${escapeXml(part.partName)} (Qty: ${part.quantity})</text>\n`;
  content += `  <text class="part-card-sub" x="0" y="-12">Blank: ${part.blankWidthMm} x ${part.blankLengthMm} mm | Area: ${part.areaM2} m² | Weight: ${part.weightKg} kg</text>\n`;

  // Sheet Blank Boundary
  content += `  <!-- Sheet Blank Boundary -->\n`;
  content += `  <rect class="sheet-border" x="0" y="0" width="${part.blankWidthMm}" height="${part.blankLengthMm}" />\n`;

  // Workpiece Outer Contour
  if (part.outerContour && part.outerContour.length > 2) {
    const pts = part.outerContour.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    content += `  <polygon points="${pts}" fill="rgba(14, 165, 233, 0.12)" stroke="#0284c7" stroke-width="2.0" />\n`;
  }

  // Cut & Bend Lines
  content += `  <!-- Cut and Bend Lines -->\n  <g id="lines">\n`;
  part.lines.forEach(l => {
    let cls = 'cut-line';
    if (l.type === 'bend_up') cls = 'bend-up';
    else if (l.type === 'bend_down') cls = 'bend-down';
    else if (l.type === 'seam') cls = 'seam-line';
    else if (l.type === 'notch') cls = 'notch-line';
    else if (l.type === 'guide') cls = 'guide-line';

    content += `    <line class="${cls}" x1="${l.start.x.toFixed(2)}" y1="${l.start.y.toFixed(2)}" x2="${l.end.x.toFixed(2)}" y2="${l.end.y.toFixed(2)}">\n`;
    if (l.description) content += `      <title>${escapeXml(l.description)}: ${Math.hypot(l.end.x - l.start.x, l.end.y - l.start.y).toFixed(1)}mm</title>\n`;
    content += `    </line>\n`;
  });

  if (part.arcs) {
    part.arcs.forEach(a => {
      let cls = 'cut-line';
      if (a.type === 'bend_up') cls = 'bend-up';
      else if (a.type === 'seam') cls = 'seam-line';
      else if (a.type === 'guide') cls = 'guide-line';

      const sx = a.center.x + a.radius * Math.cos(a.startAngleRad);
      const sy = a.center.y + a.radius * Math.sin(a.startAngleRad);
      const ex = a.center.x + a.radius * Math.cos(a.endAngleRad);
      const ey = a.center.y + a.radius * Math.sin(a.endAngleRad);
      const deltaAngle = a.endAngleRad - a.startAngleRad;
      const largeArcFlag = Math.abs(deltaAngle) > Math.PI ? 1 : 0;
      const sweepFlag = 1;

      content += `    <path class="${cls}" d="M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${a.radius.toFixed(2)} ${a.radius.toFixed(2)} 0 ${largeArcFlag} ${sweepFlag} ${ex.toFixed(2)} ${ey.toFixed(2)}" />\n`;
    });
  }
  content += `  </g>\n`;

  // Point-to-Point Length Dimension Badges
  const p2pSegments = extractPointToPointSegments(part);
  content += `  <!-- Point to Point Length Annotations -->\n  <g id="p2p-dimensions">\n`;
  p2pSegments.forEach(seg => {
    // Only label segments >= 6mm to maintain high CNC visual legibility
    if (seg.lengthMm < 6) return;
    const badgeW = 44;
    const badgeH = 14;
    const rot = seg.angleDeg ? ` transform="rotate(${seg.angleDeg}, ${seg.labelPosition.x}, ${seg.labelPosition.y})"` : '';

    content += `    <g${rot}>\n`;
    content += `      <rect class="p2p-badge-bg" x="${(seg.labelPosition.x - badgeW / 2).toFixed(2)}" y="${(seg.labelPosition.y - badgeH / 2).toFixed(2)}" width="${badgeW}" height="${badgeH}" />\n`;
    content += `      <text class="p2p-badge-text" x="${seg.labelPosition.x.toFixed(2)}" y="${(seg.labelPosition.y + 3.5).toFixed(2)}">${seg.lengthMm}mm</text>\n`;
    content += `    </g>\n`;
  });
  content += `  </g>\n`;

  // Text Labels
  content += `  <!-- Text Labels -->\n  <g id="labels">\n`;
  part.labels.forEach(lbl => {
    let cls = 'dim-label';
    if (lbl.type === 'part_name') cls = 'part-label';
    else if (lbl.type === 'alignment') cls = 'align-label';

    const rot = lbl.rotationDeg ? ` transform="rotate(${lbl.rotationDeg}, ${lbl.position.x}, ${lbl.position.y})"` : '';
    content += `    <text class="${cls}" x="${lbl.position.x.toFixed(2)}" y="${lbl.position.y.toFixed(2)}"${rot}>${escapeXml(lbl.text)}</text>\n`;
  });
  content += `  </g>\n`;

  content += `</g>\n`;
  return content;
}

/**
 * Generates SVG for a single flat pattern part
 */
export function generateSvgString(part: FlatPatternPart, paddingMm: number = 50): string {
  const minX = -paddingMm;
  const minY = -paddingMm - 40;
  const viewBoxW = part.blankWidthMm + 2 * paddingMm;
  const viewBoxH = part.blankLengthMm + 2 * paddingMm + 40;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="${minX} ${minY} ${viewBoxW} ${viewBoxH}" 
     width="${viewBoxW}mm" 
     height="${viewBoxH}mm" 
     style="background-color: #0b1120; font-family: monospace;">
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" stroke-width="0.5"/>
    </pattern>
    <style>${COMMON_SVG_STYLES}</style>
  </defs>

  <!-- Grid background -->
  <rect x="${minX}" y="${minY}" width="${viewBoxW}" height="${viewBoxH}" fill="url(#grid)" />

  ${renderSvgPartContent(part, 0, 0)}
</svg>`;
  return svg;
}

/**
 * Generates an SVG file containing ALL parts sequentially side by side (পরপর সব পার্টস)
 */
export function generateCompleteSvgString(result: CalculationResult, paddingMm: number = 60): string {
  const GAP_BETWEEN_PARTS_MM = 120;
  const HEADER_TOP_MARGIN_MM = 100;

  let totalWidth = paddingMm;
  let maxPartHeight = 0;

  result.parts.forEach(part => {
    totalWidth += part.blankWidthMm + GAP_BETWEEN_PARTS_MM;
    maxPartHeight = Math.max(maxPartHeight, part.blankLengthMm);
  });
  totalWidth += paddingMm;

  const totalHeight = maxPartHeight + HEADER_TOP_MARGIN_MM + 2 * paddingMm;
  const minX = 0;
  const minY = 0;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     viewBox="${minX} ${minY} ${totalWidth} ${totalHeight}" 
     width="${totalWidth}mm" 
     height="${totalHeight}mm" 
     style="background-color: #0b1120; font-family: monospace;">
  <defs>
    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
      <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" stroke-width="0.5"/>
    </pattern>
    <style>${COMMON_SVG_STYLES}</style>
  </defs>

  <!-- Background Grid -->
  <rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="url(#grid)" />

  <!-- Master Header Bar -->
  <g transform="translate(${paddingMm}, 45)">
    <text fill="#ffffff" font-size="28px" font-weight="bold" font-family="sans-serif">AERODUCT CAD/CAM - ${escapeXml(result.modelName.toUpperCase())}</text>
    <text fill="#38bdf8" font-size="16px" font-family="monospace" y="24">ALL ${result.parts.length} FABRICATION PARTS DEVELOPED CONSECUTIVELY (পরপর সব কাটিং পার্টস) | TOTAL WT: ${result.totalWeightKg} KG</text>
  </g>
`;

  let currentX = paddingMm;
  const yOffset = HEADER_TOP_MARGIN_MM + paddingMm;

  result.parts.forEach(part => {
    svg += renderSvgPartContent(part, currentX, yOffset);
    currentX += part.blankWidthMm + GAP_BETWEEN_PARTS_MM;
  });

  svg += `\n</svg>`;
  return svg;
}

export function downloadSvg(part: FlatPatternPart, fileName?: string) {
  const content = generateSvgString(part);
  const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${part.id}_flat_pattern.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCompleteSvg(result: CalculationResult, fileName?: string) {
  const content = generateCompleteSvgString(result);
  const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${result.modelId}_ALL_PARTS_consecutive.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
