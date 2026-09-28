import { DuctCalculationEngine } from './DuctCalculationEngine';
import {
  DuctCalculationInput,
  CalculationResult,
  FormParameterField,
  FlatPatternPart,
  Line2D,
  Point2D,
  Point3D,
} from '../types';
import { MATERIALS, getGaugeThickness } from '../standards/materials';
import { getLongitudinalAllowance, getTransverseAllowance } from '../standards/seams';

export class RectangularOffsetEngine implements DuctCalculationEngine {
  readonly id = 'rect_offset';
  readonly name = 'Rectangular Offset (Jog / Obstacle Bypass)';
  readonly nameBn = 'রেকটেঙ্গুলার অফসেট (Rectangular Offset Duct)';
  readonly category = 'offset' as const;
  readonly description = 'Double-bend or S-curve offset transition to bypass beams, pipes, and architectural structural obstacles.';
  readonly descriptionBn = 'বাধা অতিক্রমকারী অফসেট ডাক্ট - স্ট্রাকচারাল বিম/পাইপ বাইপাস ট্রানজিশন।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'width',
      label: 'Duct Width (W)',
      labelBn: 'ডাকট প্রস্থ (W)',
      type: 'number',
      defaultValue: 500,
      unit: 'mm',
      min: 150,
      max: 2000,
      step: 10,
    },
    {
      id: 'height',
      label: 'Duct Height (H)',
      labelBn: 'ডাকট উচ্চতা (H)',
      type: 'number',
      defaultValue: 350,
      unit: 'mm',
      min: 150,
      max: 2000,
      step: 10,
    },
    {
      id: 'length',
      label: 'Overall Length (L)',
      labelBn: 'মোট দৈর্ঘ্য (Length L)',
      type: 'number',
      defaultValue: 800,
      unit: 'mm',
      min: 300,
      max: 2500,
      step: 10,
    },
    {
      id: 'offsetShift',
      label: 'Offset Distance (S - Displacement)',
      labelBn: 'অফসেট শিফট (দূরত্ব S)',
      type: 'number',
      defaultValue: 200,
      unit: 'mm',
      min: 30,
      max: 1200,
      step: 10,
      description: 'Lateral displacement distance to bypass obstacle',
    },
    {
      id: 'collarLength',
      label: 'Straight Tangents (mm)',
      labelBn: 'সোজা কলার দৈর্ঘ্য (মিমি)',
      type: 'number',
      defaultValue: 75,
      unit: 'mm',
      min: 50,
      max: 300,
      step: 5,
      description: 'Straight collar at inlet and outlet for connection cleats',
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'four_piece',
      options: [
        { value: 'four_piece', label: '4 Parts (2 Cheeks + 2 Wrappers Single / ৪ পার্ট)', labelBn: '৪ পার্ট (সিঙ্গেল সিঙ্গেল ৪টি প্লেট)' },
        { value: 'two_piece_l', label: '2 Parts (2 L-Type Offset Halves / ২ পার্ট)', labelBn: '২ পার্ট (২টি L-টাইপ সেকশন)' },
        { value: 'one_piece_wrap', label: '1 Part (Full Wrap Offset Body / ১ পার্ট)', labelBn: '১ পার্ট (ফুল র্যাপার বডি)' },
      ],
      description: 'Number of cutting pieces for the offset duct',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const w = inputs.dimensions.width || 0;
    const h = inputs.dimensions.height || 0;
    const l = inputs.dimensions.length || 0;
    const s = inputs.dimensions.offsetShift || 0;

    if (w <= 0 || h <= 0 || l <= 0 || s <= 0) errors.push('All dimensions must be > 0');
    if (s > l) errors.push('Offset Shift (S) cannot be greater than Total Length (L)');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w = inputs.dimensions.width || 500;
    const h = inputs.dimensions.height || 350;
    const l = inputs.dimensions.length || 800;
    const s = inputs.dimensions.offsetShift || 200;
    const collar = inputs.dimensions.collarLength || 75;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const transAllowance = connSpec.allowancePerEndMm;
    const femalePocket = seamSpec.femalePocketAllowanceMm;
    const maleTongue = seamSpec.maleTongueAllowanceMm;

    // Center transition length
    const transL = l - 2 * collar;
    const slantLength = Math.sqrt(transL * transL + s * s);
    const thetaRad = Math.atan(s / transL);
    const thetaDeg = (thetaRad * 180) / Math.PI;

    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'four_piece';
    const parts: FlatPatternPart[] = [];

    // Helper to create cheek panel
    function createCheek(cp: number): FlatPatternPart {
      const lines: Line2D[] = [];
      const contour: Point2D[] = [];

      const p0 = { x: maleTongue, y: transAllowance };
      const p1 = { x: maleTongue + w, y: transAllowance };
      const p2 = { x: maleTongue + w, y: transAllowance + collar };
      const p3 = { x: maleTongue + w + s, y: transAllowance + collar + transL };
      const p4 = { x: maleTongue + w + s, y: transAllowance + l };
      const p5 = { x: maleTongue + s, y: transAllowance + l };
      const p6 = { x: maleTongue + s, y: transAllowance + collar + transL };
      const p7 = { x: maleTongue, y: transAllowance + collar };

      lines.push(
        { start: p0, end: p1, type: 'cut', description: 'Inlet End Cut' },
        { start: p1, end: p2, type: 'cut', description: 'Inlet Straight Right' },
        { start: p2, end: p3, type: 'cut', description: 'Slanted Offset Right' },
        { start: p3, end: p4, type: 'cut', description: 'Outlet Straight Right' },
        { start: p4, end: p5, type: 'cut', description: 'Outlet End Cut' },
        { start: p5, end: p6, type: 'cut', description: 'Outlet Straight Left' },
        { start: p6, end: p7, type: 'cut', description: 'Slanted Offset Left' },
        { start: p7, end: p0, type: 'cut', description: 'Inlet Straight Left' }
      );

      lines.push(
        { start: p0, end: p1, type: 'bend_up', bendAngleDeg: 90, description: 'Inlet TDC Flange Fold' },
        { start: p5, end: p4, type: 'bend_up', bendAngleDeg: 90, description: 'Outlet TDC Flange Fold' }
      );

      lines.push(
        { start: p7, end: p2, type: 'guide', description: `Jog Bend 1 (${thetaDeg.toFixed(1)}°)` },
        { start: p6, end: p3, type: 'guide', description: `Jog Bend 2 (${thetaDeg.toFixed(1)}°)` }
      );

      contour.push(p0, p1, p2, p3, p4, p5, p6, p7);

      const cheekBlankW = w + s + 2 * maleTongue;
      const cheekBlankL = l + 2 * transAllowance;

      const areaM2 = (w * l) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;

      return {
        id: `offset_cheek_${cp}`,
        partName: `Offset Cheek Panel #${cp} (${cp === 1 ? 'Top' : 'Bottom'})`,
        partNameBn: `অফসেট চিক প্যানেল #${cp} (${cp === 1 ? 'টপ চিক' : 'বটম চিক'})`,
        quantity: 1,
        blankWidthMm: Math.round(cheekBlankW * 10) / 10,
        blankLengthMm: Math.round(cheekBlankL * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        outerContour: contour,
        labels: [
          {
            text: `Offset Cheek (Shift: ${s}mm, Angle: ${thetaDeg.toFixed(1)}°)`,
            position: { x: cheekBlankW / 2, y: cheekBlankL / 2 },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: `Collar: ${collar}mm | Slant L: ${Math.round(slantLength)}mm`,
            position: { x: cheekBlankW / 2, y: cheekBlankL / 2 - 30 },
            fontSize: 14,
            type: 'dimension',
          },
        ],
        bendCount: 2,
        notes: [
          `Offset shift displacement: ${s} mm`,
          `Diagonal slant length: ${Math.round(slantLength)} mm`,
        ],
      };
    }

    const wrapperW = h + 2 * femalePocket;
    const wrapperL = 2 * collar + slantLength + 2 * transAllowance;
    const wrapAreaM2 = (wrapperW * wrapperL) / 1e6;

    if (style === 'one_piece_wrap') {
      const fullWrapW = 2 * w + 2 * h + 2 * femalePocket;
      const wrapLines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: fullWrapW, y: 0 }, type: 'cut' },
        { start: { x: fullWrapW, y: 0 }, end: { x: fullWrapW, y: wrapperL }, type: 'cut' },
        { start: { x: fullWrapW, y: wrapperL }, end: { x: 0, y: wrapperL }, type: 'cut' },
        { start: { x: 0, y: wrapperL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: 0, y: transAllowance + collar }, end: { x: fullWrapW, y: transAllowance + collar }, type: 'bend_up', bendAngleDeg: Math.round(thetaDeg) },
        { start: { x: 0, y: transAllowance + collar + slantLength }, end: { x: fullWrapW, y: transAllowance + collar + slantLength }, type: 'bend_down', bendAngleDeg: Math.round(thetaDeg) },
      ];
      parts.push({
        id: 'offset_full_wrap',
        partName: '1-Piece Continuous Wrap Offset Body',
        partNameBn: '১-পিস ফুল র্যাপ অফসেট ডাক্ট বডি',
        quantity: 1,
        blankWidthMm: Math.round(fullWrapW * 10) / 10,
        blankLengthMm: Math.round(wrapperL * 10) / 10,
        areaM2: Number(((fullWrapW * wrapperL) / 1e6).toFixed(3)),
        weightKg: Number((((fullWrapW * wrapperL) / 1e6) * (thickness / 1000) * material.density).toFixed(2)),
        lines: wrapLines,
        outerContour: [{ x: 0, y: 0 }, { x: fullWrapW, y: 0 }, { x: fullWrapW, y: wrapperL }, { x: 0, y: wrapperL }],
        labels: [
          { text: `1-Piece Wrap Offset ${w}x${h}x${l}mm`, position: { x: fullWrapW / 2, y: wrapperL / 2 }, fontSize: 20, type: 'part_name' },
        ],
        bendCount: 5,
      });
    } else if (style === 'two_piece_l') {
      for (let p = 1; p <= 2; p++) {
        const lPieceW = w + h + 2 * femalePocket;
        const lines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: lPieceW, y: 0 }, type: 'cut' },
          { start: { x: lPieceW, y: 0 }, end: { x: lPieceW, y: wrapperL }, type: 'cut' },
          { start: { x: lPieceW, y: wrapperL }, end: { x: 0, y: wrapperL }, type: 'cut' },
          { start: { x: 0, y: wrapperL }, end: { x: 0, y: 0 }, type: 'cut' },
          { start: { x: w + femalePocket, y: 0 }, end: { x: w + femalePocket, y: wrapperL }, type: 'bend_down', bendAngleDeg: 90, description: 'L-Shape Corner Bend' },
          { start: { x: 0, y: transAllowance + collar }, end: { x: lPieceW, y: transAllowance + collar }, type: 'bend_up', bendAngleDeg: Math.round(thetaDeg) },
          { start: { x: 0, y: transAllowance + collar + slantLength }, end: { x: lPieceW, y: transAllowance + collar + slantLength }, type: 'bend_down', bendAngleDeg: Math.round(thetaDeg) },
        ];
        const aM2 = (lPieceW * wrapperL) / 1e6;
        parts.push({
          id: `offset_l_section_${p}`,
          partName: `L-Shape Offset Section #${p} of 2`,
          partNameBn: `L-শেপ অফসেট সেকশন #${p} (২টির মধ্যে)`,
          quantity: 1,
          blankWidthMm: Math.round(lPieceW * 10) / 10,
          blankLengthMm: Math.round(wrapperL * 10) / 10,
          areaM2: Number(aM2.toFixed(3)),
          weightKg: Number((aM2 * (thickness / 1000) * material.density).toFixed(2)),
          lines,
          outerContour: [{ x: 0, y: 0 }, { x: lPieceW, y: 0 }, { x: lPieceW, y: wrapperL }, { x: 0, y: wrapperL }],
          labels: [
            { text: `L-Offset #${p} (${Math.round(lPieceW)}x${Math.round(wrapperL)}mm)`, position: { x: lPieceW / 2, y: wrapperL / 2 }, fontSize: 18, type: 'part_name' },
          ],
          bendCount: 3,
        });
      }
    } else {
      // 4 Parts (default): 2 Cheeks + 2 Side Wrappers
      parts.push(createCheek(1));
      parts.push(createCheek(2));

      for (let wp = 1; wp <= 2; wp++) {
        const wrapLines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: wrapperW, y: 0 }, type: 'cut' },
          { start: { x: wrapperW, y: 0 }, end: { x: wrapperW, y: wrapperL }, type: 'cut' },
          { start: { x: wrapperW, y: wrapperL }, end: { x: 0, y: wrapperL }, type: 'cut' },
          { start: { x: 0, y: wrapperL }, end: { x: 0, y: 0 }, type: 'cut' },
          {
            start: { x: 0, y: transAllowance + collar },
            end: { x: wrapperW, y: transAllowance + collar },
            type: wp === 1 ? 'bend_up' : 'bend_down',
            bendAngleDeg: Math.round(thetaDeg),
            description: `Offset Jog Bend 1 (${thetaDeg.toFixed(1)}°)`,
          },
          {
            start: { x: 0, y: transAllowance + collar + slantLength },
            end: { x: wrapperW, y: transAllowance + collar + slantLength },
            type: wp === 1 ? 'bend_down' : 'bend_up',
            bendAngleDeg: Math.round(thetaDeg),
            description: `Offset Jog Bend 2 (${thetaDeg.toFixed(1)}°)`,
          },
          { start: { x: femalePocket, y: 0 }, end: { x: femalePocket, y: wrapperL }, type: 'seam', description: 'Pittsburgh Pocket' },
          { start: { x: wrapperW - femalePocket, y: 0 }, end: { x: wrapperW - femalePocket, y: wrapperL }, type: 'seam', description: 'Pittsburgh Pocket' },
        ];

        parts.push({
          id: `offset_wrapper_${wp}`,
          partName: `Offset Side Wrapper #${wp} (${wp === 1 ? 'Left Wall' : 'Right Wall'})`,
          partNameBn: `অফসেট সাইড র্যাপার #${wp}`,
          quantity: 1,
          blankWidthMm: Math.round(wrapperW * 10) / 10,
          blankLengthMm: Math.round(wrapperL * 10) / 10,
          areaM2: Number(wrapAreaM2.toFixed(3)),
          weightKg: Number((wrapAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
          lines: wrapLines,
          outerContour: [
            { x: 0, y: 0 },
            { x: wrapperW, y: 0 },
            { x: wrapperW, y: wrapperL },
            { x: 0, y: wrapperL },
          ],
          labels: [
            {
              text: `Offset Wrapper #${wp} (2 Bends @ ${thetaDeg.toFixed(1)}°)`,
              position: { x: wrapperW / 2, y: wrapperL / 2 },
              fontSize: 20,
              type: 'part_name',
            },
          ],
          bendCount: 2,
          notes: [
            `Press brake bends: ${thetaDeg.toFixed(1)}° at ${collar}mm and ${(collar + slantLength).toFixed(0)}mm`,
          ],
        });
      }
    }

    // 3D Geometry: Authentic S-curve / double-miter jog offset duct with straight entrance and exit collars
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    const halfW = w / 2;
    const halfH = h / 2;

    // 4 Cross-section rings along length:
    // Ring 0: Inlet face at Z = 0, X offset = 0
    // Ring 1: Jog bend 1 at Z = collar, X offset = 0
    // Ring 2: Jog bend 2 at Z = collar + transL, X offset = s
    // Ring 3: Outlet face at Z = l, X offset = s
    const ringSpecs = [
      { z: 0,               offsetX: 0 },
      { z: collar,          offsetX: 0 },
      { z: collar + transL, offsetX: s },
      { z: l,               offsetX: s },
    ];

    ringSpecs.forEach((spec, rIdx) => {
      const z = spec.z;
      const ox = spec.offsetX;
      // 4 corners of cross section:
      // 0: BL, 1: BR, 2: TR, 3: TL
      vertices.push(
        -halfW + ox, -halfH, z,
         halfW + ox, -halfH, z,
         halfW + ox,  halfH, z,
        -halfW + ox,  halfH, z
      );

      // Wireframe ring loop
      wireframeLines.push([
        { x: -halfW + ox, y: -halfH, z },
        { x:  halfW + ox, y: -halfH, z },
        { x:  halfW + ox, y:  halfH, z },
        { x: -halfW + ox, y:  halfH, z },
        { x: -halfW + ox, y: -halfH, z },
      ]);
    });

    // Connect 3 segment quads (Bottom, Right, Top, Left)
    for (let r = 0; r < 3; r++) {
      const b = r * 4;
      const n = (r + 1) * 4;

      // Bottom (0, 1)
      indices.push(b, b + 1, n + 1,  b, n + 1, n);
      // Right (1, 2)
      indices.push(b + 1, b + 2, n + 2,  b + 1, n + 2, n + 1);
      // Top (2, 3)
      indices.push(b + 2, b + 3, n + 3,  b + 2, n + 3, n + 2);
      // Left (3, 0)
      indices.push(b + 3, b, n,  b + 3, n, n + 3);
    }

    // 4 Longitudinal corner crease lines
    [0, 1, 2, 3].forEach(c => {
      const cornerWire: Point3D[] = [];
      ringSpecs.forEach(spec => {
        const ox = spec.offsetX;
        const x = (c === 0 || c === 3 ? -halfW : halfW) + ox;
        const y = (c === 0 || c === 1 ? -halfH : halfH);
        cornerWire.push({ x, y, z: spec.z });
      });
      wireframeLines.push(cornerWire);
    });

    const totalWeightKg = parts.reduce((a, b) => a + b.weightKg, 0);
    const totalBlankAreaM2 = parts.reduce((a, b) => a + b.areaM2, 0);

    return {
      modelId: this.id,
      modelName: this.name,
      modelNameBn: this.nameBn,
      category: this.category,
      parts,
      geometry3D: {
        vertices,
        indices,
        wireframeLines,
        boundingBox: {
          min: { x: -halfW, y: -halfH, z: 0 },
          max: { x:  halfW + s, y:  halfH, z: l },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((2 * (w + h) * l / 1e6).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 86,
      smacnaCompliant: true,
      warnings: thetaDeg > 30 ? ['Offset deflection angle exceeds 30°; consider lengthening transition length to minimize airflow turbulence.'] : [],
      recommendations: [
        `Jog Deflection Angle: ${thetaDeg.toFixed(1)}°`,
        'Straight inlet/outlet collars ensure standard TDC or slip drive cleat installation.',
      ],
      dimensionsSummary: {
        'Size (W x H)': `${w} x ${h} mm`,
        'Total Length (L)': `${l} mm`,
        'Offset Shift (S)': `${s} mm`,
        'Jog Angle': `${thetaDeg.toFixed(1)}°`,
        'Slant Length': `${Math.round(slantLength)} mm`,
      },
    };
  }
}
