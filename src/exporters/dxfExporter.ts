import { FlatPatternPart, CalculationResult } from '../types';
import { extractPointToPointSegments } from '../standards/pointToPointDimensions';

/**
 * Professional DXF (AutoCAD R12/2000 compatible) Exporter
 * Creates standard DXF with dedicated CAD layers for CNC Plasma/Laser/Waterjet cutters
 * Includes sequential multi-part layout (পরপর সব পার্ট) and point-to-point length dimensions.
 */

function appendDxfPartEntities(
  lines: string[],
  part: FlatPatternPart,
  xOffset: number = 0,
  yOffset: number = 0,
  includeP2P: boolean = true
) {
  // 1. Export Lines
  part.lines.forEach(l => {
    let layer = 'CUT_OUTER';
    if (l.type === 'bend_up') layer = 'BEND_UP';
    else if (l.type === 'bend_down') layer = 'BEND_DOWN';
    else if (l.type === 'seam') layer = 'SEAM_LINE';
    else if (l.type === 'notch') layer = 'NOTCHES';
    else if (l.type === 'guide') layer = 'GUIDES';

    lines.push(
      '0', 'LINE',
      '8', layer,
      '10', (l.start.x + xOffset).toFixed(3),
      '20', (l.start.y + yOffset).toFixed(3),
      '30', '0.0',
      '11', (l.end.x + xOffset).toFixed(3),
      '21', (l.end.y + yOffset).toFixed(3),
      '31', '0.0'
    );
  });

  // 2. Export Arcs
  if (part.arcs) {
    part.arcs.forEach(a => {
      let layer = 'CUT_OUTER';
      if (a.type === 'bend_up') layer = 'BEND_UP';
      else if (a.type === 'seam') layer = 'SEAM_LINE';
      else if (a.type === 'guide') layer = 'GUIDES';

      const startAngleDeg = (a.startAngleRad * 180) / Math.PI;
      const endAngleDeg = (a.endAngleRad * 180) / Math.PI;

      lines.push(
        '0', 'ARC',
        '8', layer,
        '10', (a.center.x + xOffset).toFixed(3),
        '20', (a.center.y + yOffset).toFixed(3),
        '30', '0.0',
        '40', a.radius.toFixed(3),
        '50', startAngleDeg.toFixed(3),
        '51', endAngleDeg.toFixed(3)
      );
    });
  }

  // 3. Export Text Labels
  part.labels.forEach(lbl => {
    lines.push(
      '0', 'TEXT',
      '8', 'ANNOTATIONS',
      '10', (lbl.position.x + xOffset).toFixed(3),
      '20', (lbl.position.y + yOffset).toFixed(3),
      '30', '0.0',
      '40', (lbl.fontSize * 0.8).toFixed(1), // Height in mm
      '1', lbl.text,
      '50', (lbl.rotationDeg || 0).toFixed(1)
    );
  });

  // 4. Export Point-to-Point Length Dimensions
  if (includeP2P) {
    const p2pSegments = extractPointToPointSegments(part);
    p2pSegments.forEach(seg => {
      // Export length label near midpoint of each segment
      lines.push(
        '0', 'TEXT',
        '8', 'P2P_DIMENSIONS',
        '10', (seg.labelPosition.x + xOffset).toFixed(3),
        '20', (seg.labelPosition.y + yOffset).toFixed(3),
        '30', '0.0',
        '40', '12.0', // 12mm text height for readable CNC operator inspection
        '1', `L=${seg.lengthMm}`,
        '50', seg.angleDeg.toFixed(1)
      );
    });
  }

  // 5. Part Bounding Box & Header Plate (for clear CNC identification)
  lines.push(
    '0', 'TEXT',
    '8', 'PART_HEADER',
    '10', xOffset.toFixed(3),
    '20', (part.blankLengthMm + yOffset + 25).toFixed(3),
    '30', '0.0',
    '40', '22.0',
    '1', `${part.partName.toUpperCase()} [Qty: ${part.quantity}]`,
    '50', '0.0'
  );

  lines.push(
    '0', 'TEXT',
    '8', 'PART_HEADER',
    '10', xOffset.toFixed(3),
    '20', (part.blankLengthMm + yOffset + 8).toFixed(3),
    '30', '0.0',
    '40', '14.0',
    '1', `Blank: ${part.blankWidthMm} x ${part.blankLengthMm} mm | Area: ${part.areaM2} m2 | Wt: ${part.weightKg} kg`,
    '50', '0.0'
  );
}

function buildDxfHeaderAndTables(lines: string[]) {
  // DXF HEADER
  lines.push('0', 'SECTION', '2', 'HEADER');
  lines.push('9', '$ACADVER', '1', 'AC1009'); // AutoCAD R12 compatibility
  lines.push('9', '$INSUNITS', '70', '4');    // Millimeters
  lines.push('0', 'ENDSEC');

  // DXF TABLES: LAYER DEFINITIONS
  lines.push('0', 'SECTION', '2', 'TABLES');
  lines.push('0', 'TABLE', '2', 'LAYER', '70', '8');

  // Layer: CUT_OUTER (Color 7: White/Black continuous)
  lines.push('0', 'LAYER', '2', 'CUT_OUTER', '70', '0', '62', '7', '6', 'CONTINUOUS');
  // Layer: BEND_UP (Color 1: Red dashed)
  lines.push('0', 'LAYER', '2', 'BEND_UP', '70', '0', '62', '1', '6', 'DASHED');
  // Layer: BEND_DOWN (Color 3: Green dashed)
  lines.push('0', 'LAYER', '2', 'BEND_DOWN', '70', '0', '62', '3', '6', 'DASHED');
  // Layer: SEAM_LINE (Color 4: Cyan hidden)
  lines.push('0', 'LAYER', '2', 'SEAM_LINE', '70', '0', '62', '4', '6', 'HIDDEN');
  // Layer: NOTCHES (Color 6: Magenta)
  lines.push('0', 'LAYER', '2', 'NOTCHES', '70', '0', '62', '6', '6', 'CONTINUOUS');
  // Layer: ANNOTATIONS (Color 2: Yellow)
  lines.push('0', 'LAYER', '2', 'ANNOTATIONS', '70', '0', '62', '2', '6', 'CONTINUOUS');
  // Layer: P2P_DIMENSIONS (Color 5: Blue/Cyan for point to point length dimensions)
  lines.push('0', 'LAYER', '2', 'P2P_DIMENSIONS', '70', '0', '62', '5', '6', 'CONTINUOUS');
  // Layer: PART_HEADER (Color 2: Yellow)
  lines.push('0', 'LAYER', '2', 'PART_HEADER', '70', '0', '62', '2', '6', 'CONTINUOUS');
  // Layer: GUIDES (Color 8: Gray)
  lines.push('0', 'LAYER', '2', 'GUIDES', '70', '0', '62', '8', '6', 'CENTER');

  lines.push('0', 'ENDTAB');
  lines.push('0', 'ENDSEC');
}

/**
 * Generates DXF for a single flat pattern part
 */
export function generateDxfString(part: FlatPatternPart, projectName: string = 'AeroDuct'): string {
  const lines: string[] = [];
  buildDxfHeaderAndTables(lines);

  lines.push('0', 'SECTION', '2', 'ENTITIES');
  appendDxfPartEntities(lines, part, 0, 0, true);
  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n');
}

/**
 * Generates a complete DXF file containing ALL parts sequentially side by side (পরপর সব পার্টস)
 */
export function generateCompleteDxfString(result: CalculationResult, projectName: string = 'AeroDuct'): string {
  const lines: string[] = [];
  buildDxfHeaderAndTables(lines);

  lines.push('0', 'SECTION', '2', 'ENTITIES');

  // Master Title Block
  lines.push(
    '0', 'TEXT',
    '8', 'PART_HEADER',
    '10', '0.0',
    '20', '-60.0',
    '30', '0.0',
    '40', '32.0',
    '1', `AERODUCT CAD/CAM - ${result.modelName.toUpperCase()} - COMPLETE FABRICATION CUT LIST (${result.parts.length} PARTS)`,
    '50', '0.0'
  );

  let currentX = 0;
  const GAP_BETWEEN_PARTS_MM = 120; // 120mm spacing between consecutive parts

  result.parts.forEach((part, index) => {
    appendDxfPartEntities(lines, part, currentX, 0, true);
    currentX += part.blankWidthMm + GAP_BETWEEN_PARTS_MM;
  });

  lines.push('0', 'ENDSEC');
  lines.push('0', 'EOF');

  return lines.join('\n');
}

export function downloadDxf(part: FlatPatternPart, fileName?: string) {
  const content = generateDxfString(part);
  const blob = new Blob([content], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${part.id}_flat_pattern.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadCompleteDxf(result: CalculationResult, fileName?: string) {
  const content = generateCompleteDxfString(result);
  const blob = new Blob([content], { type: 'application/dxf;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${result.modelId}_ALL_PARTS_consecutive.dxf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
