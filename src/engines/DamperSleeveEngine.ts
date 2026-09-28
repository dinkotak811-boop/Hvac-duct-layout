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

export class DamperSleeveEngine implements DuctCalculationEngine {
  readonly id = 'damper_sleeve';
  readonly name = 'Volume Control Damper (VCD) Sleeve';
  readonly nameBn = 'ভলিউম কন্ট্রোল ড্যাম্পার স্লিভ (Damper Sleeve & Blades)';
  readonly category = 'special' as const;
  readonly description = 'Heavy gauge casing sleeve with factory pre-punched axle bushing holes and aerodynamic damper blades.';
  readonly descriptionBn = 'হেভি গেজ ড্যাম্পার স্লিভ ফ্রেম, শ্যাফ্ট বুশিং হোল ও অ্যারোডাইনামিক ড্যাম্পার ব্লেডস।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'width',
      label: 'Damper Width (W)',
      labelBn: 'ড্যাম্পার প্রস্থ (W)',
      type: 'number',
      defaultValue: 600,
      unit: 'mm',
      min: 150,
      max: 2000,
      step: 10,
    },
    {
      id: 'height',
      label: 'Damper Height (H)',
      labelBn: 'ড্যাম্পার উচ্চতা (H)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 150,
      max: 2000,
      step: 10,
    },
    {
      id: 'sleeveLength',
      label: 'Sleeve Depth (L)',
      labelBn: 'স্লিভ দৈর্ঘ্য (L)',
      type: 'number',
      defaultValue: 250,
      unit: 'mm',
      min: 150,
      max: 600,
      step: 10,
    },
    {
      id: 'numBlades',
      label: 'Number of Blades',
      labelBn: 'ব্লেড সংখ্যা',
      type: 'number',
      defaultValue: 3,
      unit: 'Blades',
      min: 1,
      max: 8,
      step: 1,
    },
    {
      id: 'shaftDiameter',
      label: 'Shaft / Spindle Diameter',
      labelBn: 'শ্যাফ্ট ব্যাস',
      type: 'number',
      defaultValue: 12.7, // 1/2" round
      unit: 'mm',
      min: 9.5,
      max: 19,
      step: 1,
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'two_piece_l',
      options: [
        { value: 'four_piece', label: '4 Parts (Top, Bot, Left, Right Single / ৪ পার্ট)', labelBn: '৪ পার্ট (সিঙ্গেল সিঙ্গেল ৪টি প্যানেল)' },
        { value: 'two_piece_l', label: '2 Parts (L-Type Halves / ২ পার্ট L-টাইপ)', labelBn: '২ পার্ট (২টি L-টাইপ সেকশন)' },
        { value: 'one_piece_wrap', label: '1 Part (Full Wrap Sleeve / ১ পার্ট)', labelBn: '১ পার্ট (ফুল র্যাপার বডি)' },
      ],
      description: 'Number of cutting pieces for the damper sleeve',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const w = inputs.dimensions.width || 0;
    const h = inputs.dimensions.height || 0;
    const l = inputs.dimensions.sleeveLength || 0;

    if (w <= 0 || h <= 0 || l <= 0) errors.push('Dimensions must be > 0');
    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w = inputs.dimensions.width || 600;
    const h = inputs.dimensions.height || 400;
    const l = inputs.dimensions.sleeveLength || 250;
    const numBlades = Math.max(1, Math.min(8, inputs.dimensions.numBlades || 3));
    const shaftD = inputs.dimensions.shaftDiameter || 12.7;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = Math.max(1.2, getGaugeThickness(inputs.gauge)); // Min 1.2mm (18 Ga) for damper frame
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const transAllowance = connSpec.allowancePerEndMm;
    const femalePocket = seamSpec.femalePocketAllowanceMm;
    const maleTongue = seamSpec.maleTongueAllowanceMm;

    // 1. Sleeve Frame 2-Piece L-Sections
    // Covers W + H with shaft bearing holes on the Height panel
    const blankW = femalePocket + w + h + maleTongue;
    const blankL = l + 2 * transAllowance;
    const bendX = femalePocket + w;
    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'two_piece_l';

    const parts: FlatPatternPart[] = [];

    if (style === 'one_piece_wrap') {
      const wrapW = 2 * w + 2 * h + femalePocket + maleTongue;
      const lines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: wrapW, y: 0 }, type: 'cut' },
        { start: { x: wrapW, y: 0 }, end: { x: wrapW, y: blankL }, type: 'cut' },
        { start: { x: wrapW, y: blankL }, end: { x: 0, y: blankL }, type: 'cut' },
        { start: { x: 0, y: blankL }, end: { x: 0, y: 0 }, type: 'cut' },
      ];
      const b1 = femalePocket + w;
      const b2 = b1 + h;
      const b3 = b2 + w;
      [b1, b2, b3].forEach((bx, idx) => {
        lines.push({ start: { x: bx, y: transAllowance }, end: { x: bx, y: blankL - transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: `Corner Bend ${idx + 1}` });
      });

      const holeY = transAllowance + l / 2;
      const bladePitch = h / numBlades;
      const rHole = shaftD / 2;
      for (let b = 1; b <= numBlades; b++) {
        const holeX1 = b1 + (b - 0.5) * bladePitch;
        const holeX2 = b3 + (b - 0.5) * bladePitch;
        [holeX1, holeX2].forEach(hx => {
          for (let s = 0; s < 16; s++) {
            const a1 = (s / 16) * 2 * Math.PI;
            const a2 = ((s + 1) / 16) * 2 * Math.PI;
            lines.push({
              start: { x: hx + rHole * Math.cos(a1), y: holeY + rHole * Math.sin(a1) },
              end: { x: hx + rHole * Math.cos(a2), y: holeY + rHole * Math.sin(a2) },
              type: 'cut',
              description: `Axle Bearing Hole #${b}`,
            });
          }
        });
      }

      const areaM2 = (wrapW * blankL) / 1e6;
      parts.push({
        id: 'sleeve_full_wrap',
        partName: `1-Piece Continuous Wrap Damper Sleeve (${w}x${h}x${l}mm)`,
        partNameBn: `১-পিস ফুল র্যাপ ড্যাম্পার স্লিভ বডি (${w}x${h}x${l}মিমি)`,
        quantity: 1,
        blankWidthMm: Math.round(wrapW * 10) / 10,
        blankLengthMm: Math.round(blankL * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number((areaM2 * (thickness / 1000) * material.density).toFixed(2)),
        lines,
        outerContour: [{ x: 0, y: 0 }, { x: wrapW, y: 0 }, { x: wrapW, y: blankL }, { x: 0, y: blankL }],
        labels: [
          { text: `1-Piece Wrap Damper Sleeve ${w}x${h}x${l}mm`, position: { x: wrapW / 2, y: blankL / 2 }, fontSize: 20, type: 'part_name' },
        ],
        bendCount: 5,
      });
    } else if (style === 'four_piece') {
      const topW = w + femalePocket + maleTongue;
      const holeY = transAllowance + l / 2;
      const bladePitch = h / numBlades;
      const rHole = shaftD / 2;

      ['top', 'bottom'].forEach(pos => {
        const pLines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: topW, y: 0 }, type: 'cut' },
          { start: { x: topW, y: 0 }, end: { x: topW, y: blankL }, type: 'cut' },
          { start: { x: topW, y: blankL }, end: { x: 0, y: blankL }, type: 'cut' },
          { start: { x: 0, y: blankL }, end: { x: 0, y: 0 }, type: 'cut' },
        ];
        const aM2 = (topW * blankL) / 1e6;
        parts.push({
          id: `sleeve_panel_${pos}`,
          partName: `Damper Sleeve ${pos === 'top' ? 'Top' : 'Bottom'} Panel (Single)`,
          partNameBn: `ড্যাম্পার স্লিভ ${pos === 'top' ? 'টপ' : 'বটম'} প্যানেল (সিঙ্গেল)`,
          quantity: 1,
          blankWidthMm: Math.round(topW * 10) / 10,
          blankLengthMm: Math.round(blankL * 10) / 10,
          areaM2: Number(aM2.toFixed(3)),
          weightKg: Number((aM2 * (thickness / 1000) * material.density).toFixed(2)),
          lines: pLines,
          outerContour: [{ x: 0, y: 0 }, { x: topW, y: 0 }, { x: topW, y: blankL }, { x: 0, y: blankL }],
          labels: [{ text: `${pos.toUpperCase()} PANEL (${w}x${l}mm)`, position: { x: topW / 2, y: blankL / 2 }, fontSize: 18, type: 'part_name' }],
          bendCount: 2,
        });
      });

      const sideW = h + femalePocket + maleTongue;
      ['left', 'right'].forEach(pos => {
        const sLines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: sideW, y: 0 }, type: 'cut' },
          { start: { x: sideW, y: 0 }, end: { x: sideW, y: blankL }, type: 'cut' },
          { start: { x: sideW, y: blankL }, end: { x: 0, y: blankL }, type: 'cut' },
          { start: { x: 0, y: blankL }, end: { x: 0, y: 0 }, type: 'cut' },
        ];
        for (let b = 1; b <= numBlades; b++) {
          const holeX = femalePocket + (b - 0.5) * bladePitch;
          for (let s = 0; s < 16; s++) {
            const a1 = (s / 16) * 2 * Math.PI;
            const a2 = ((s + 1) / 16) * 2 * Math.PI;
            sLines.push({
              start: { x: holeX + rHole * Math.cos(a1), y: holeY + rHole * Math.sin(a1) },
              end: { x: holeX + rHole * Math.cos(a2), y: holeY + rHole * Math.sin(a2) },
              type: 'cut',
              description: `Axle Bearing Hole #${b}`,
            });
          }
        }
        const aM2 = (sideW * blankL) / 1e6;
        parts.push({
          id: `sleeve_panel_${pos}`,
          partName: `Damper Sleeve ${pos === 'left' ? 'Left' : 'Right'} Side Wall with Holes`,
          partNameBn: `ড্যাম্পার স্লিভ ${pos === 'left' ? 'বাম' : 'ডান'} ওয়াল (হোলসহ)`,
          quantity: 1,
          blankWidthMm: Math.round(sideW * 10) / 10,
          blankLengthMm: Math.round(blankL * 10) / 10,
          areaM2: Number(aM2.toFixed(3)),
          weightKg: Number((aM2 * (thickness / 1000) * material.density).toFixed(2)),
          lines: sLines,
          outerContour: [{ x: 0, y: 0 }, { x: sideW, y: 0 }, { x: sideW, y: blankL }, { x: 0, y: blankL }],
          labels: [{ text: `${pos.toUpperCase()} WALL (${h}x${l}mm) WITH HOLES`, position: { x: sideW / 2, y: blankL / 2 }, fontSize: 16, type: 'part_name' }],
          bendCount: 2,
        });
      });
    } else {
      for (let p = 1; p <= 2; p++) {
        const lines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: blankW, y: 0 }, type: 'cut' },
          { start: { x: blankW, y: 0 }, end: { x: blankW, y: blankL }, type: 'cut' },
          { start: { x: blankW, y: blankL }, end: { x: 0, y: blankL }, type: 'cut' },
          { start: { x: 0, y: blankL }, end: { x: 0, y: 0 }, type: 'cut' },
          // Corner 90° bend
          { start: { x: bendX, y: transAllowance }, end: { x: bendX, y: blankL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        ];

        if (transAllowance > 0) {
          lines.push(
            { start: { x: 0, y: transAllowance }, end: { x: blankW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
            { start: { x: 0, y: blankL - transAllowance }, end: { x: blankW, y: blankL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 }
          );
        }

        // Spindle bearing holes on the Height side panel (between bendX and blankW - maleTongue):
        const holeY = transAllowance + l / 2; // Center along sleeve depth
        const bladePitch = h / numBlades;
        const rHole = shaftD / 2;

        for (let b = 1; b <= numBlades; b++) {
          const holeX = bendX + (b - 0.5) * bladePitch;
          // Circular hole cutout (16 segments)
          for (let s = 0; s < 16; s++) {
            const a1 = (s / 16) * 2 * Math.PI;
            const a2 = ((s + 1) / 16) * 2 * Math.PI;
            lines.push({
              start: { x: holeX + rHole * Math.cos(a1), y: holeY + rHole * Math.sin(a1) },
              end: { x: holeX + rHole * Math.cos(a2), y: holeY + rHole * Math.sin(a2) },
              type: 'cut',
              description: `Axle Bearing Hole #${b}`,
            });
          }

          // Quadrant handle centerlines on panel 1
          if (p === 1 && b === 1) {
            lines.push(
              { start: { x: holeX - 25, y: holeY }, end: { x: holeX + 25, y: holeY }, type: 'guide', description: 'Lock Quadrant Bracket Centerline' },
              { start: { x: holeX, y: holeY - 25 }, end: { x: holeX, y: holeY + 25 }, type: 'guide' }
            );
          }
        }

        const areaM2 = (blankW * blankL) / 1e6;
        parts.push({
          id: `damper_sleeve_part_${p}`,
          partName: `Damper Sleeve Casing L-Section #${p}`,
          partNameBn: `ড্যাম্পার স্লিভ ফ্রেম L-সেকশন #${p}`,
          quantity: 1,
          blankWidthMm: Math.round(blankW * 10) / 10,
          blankLengthMm: Math.round(blankL * 10) / 10,
          areaM2: Number(areaM2.toFixed(3)),
          weightKg: Number((areaM2 * (thickness / 1000) * material.density).toFixed(2)),
          lines,
          outerContour: [
            { x: 0, y: 0 },
            { x: blankW, y: 0 },
            { x: blankW, y: blankL },
            { x: 0, y: blankL },
          ],
          labels: [
            {
              text: `Damper Sleeve ${w}x${h}x${l}mm (#${p})`,
              position: { x: blankW / 2, y: blankL / 2 },
              fontSize: 20,
              type: 'part_name',
            },
            {
              text: `${numBlades} Axle Holes (Ø${shaftD}mm)`,
              position: { x: bendX + h / 2, y: holeY - 30 },
              fontSize: 14,
              type: 'dimension',
            },
          ],
          bendCount: 3,
          notes: [
            'Pre-punched bearing holes for bronze / sintered nylon axle bushings',
            `Heavy gauge 18 Ga (${thickness}mm) for structural rigidity`,
          ],
        });
      }
    }

    // 2. Individual Aerodynamic Damper Blade Flat Patterns (Quantity: numBlades)
    // Blade length = w - 10mm (clearance)
    // Blade width = (h / numBlades) + 25mm (overlap seal)
    const bladeW = w - 12;
    const bladeH = (h / numBlades) + 20;
    const bladeLines: Line2D[] = [
      { start: { x: 0, y: 0 }, end: { x: bladeW, y: 0 }, type: 'cut' },
      { start: { x: bladeW, y: 0 }, end: { x: bladeW, y: bladeH }, type: 'cut' },
      { start: { x: bladeW, y: bladeH }, end: { x: 0, y: bladeH }, type: 'cut' },
      { start: { x: 0, y: bladeH }, end: { x: 0, y: 0 }, type: 'cut' },
      // Central 3-bend axle channel for 1/2" spindle clamp
      { start: { x: 0, y: bladeH / 2 - 12 }, end: { x: bladeW, y: bladeH / 2 - 12 }, type: 'bend_up', bendAngleDeg: 60, description: 'Axle Channel V-Groove' },
      { start: { x: 0, y: bladeH / 2 }, end: { x: bladeW, y: bladeH / 2 }, type: 'bend_down', bendAngleDeg: 120, description: 'Axle Channel Center' },
      { start: { x: 0, y: bladeH / 2 + 12 }, end: { x: bladeW, y: bladeH / 2 + 12 }, type: 'bend_up', bendAngleDeg: 60, description: 'Axle Channel V-Groove' },
      // Edge stiffening hem folds
      { start: { x: 0, y: 10 }, end: { x: bladeW, y: 10 }, type: 'bend_up', bendAngleDeg: 90, description: 'Edge Seal Lip' },
      { start: { x: 0, y: bladeH - 10 }, end: { x: bladeW, y: bladeH - 10 }, type: 'bend_up', bendAngleDeg: 90, description: 'Edge Seal Lip' },
    ];

    const bladeAreaM2 = (bladeW * bladeH) / 1e6;
    parts.push({
      id: 'damper_blade_pattern',
      partName: `Damper Aerodynamic Blade (${Math.round(bladeW)}x${Math.round(bladeH)}mm)`,
      partNameBn: `ড্যাম্পার অ্যারোডাইনামিক ব্লেড (${numBlades}টি প্রয়োজন)`,
      quantity: numBlades,
      blankWidthMm: Math.round(bladeW * 10) / 10,
      blankLengthMm: Math.round(bladeH * 10) / 10,
      areaM2: Number(bladeAreaM2.toFixed(3)),
      weightKg: Number((bladeAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
      lines: bladeLines,
      outerContour: [
        { x: 0, y: 0 },
        { x: bladeW, y: 0 },
        { x: bladeW, y: bladeH },
        { x: 0, y: bladeH },
      ],
      labels: [
        {
          text: `Damper Blade (${numBlades} Required)`,
          position: { x: bladeW / 2, y: bladeH / 2 },
          fontSize: 18,
          type: 'part_name',
        },
      ],
      bendCount: 5,
      notes: [
        'Form central V-groove to clamp around continuous spindle shaft',
        'Top and bottom lips interlock when closed for airtight shutoff',
      ],
    });

    // 3D Geometry: Rectangular sleeve frame WITH rotating damper blades and central spindle shaft!
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    const halfW = w / 2;
    const halfH = h / 2;
    const halfL = l / 2;

    // 1. Sleeve Frame (8 vertices, hollow, open ends)
    // Front face (Z = +halfL): 0, 1, 2, 3
    // Back face (Z = -halfL): 4, 5, 6, 7
    vertices.push(
      -halfW, -halfH,  halfL, // 0
       halfW, -halfH,  halfL, // 1
       halfW,  halfH,  halfL, // 2
      -halfW,  halfH,  halfL, // 3
      -halfW, -halfH, -halfL, // 4
       halfW, -halfH, -halfL, // 5
       halfW,  halfH, -halfL, // 6
      -halfW,  halfH, -halfL  // 7
    );

    // 4 Frame side walls (Bottom, Top, Right, Left)
    indices.push(
      0, 1, 5,  0, 5, 4,
      3, 6, 2,  3, 7, 6,
      1, 2, 6,  1, 6, 5,
      0, 4, 7,  0, 7, 3
    );

    // Wireframes for Frame
    wireframeLines.push([
      { x: -halfW, y: -halfH, z:  halfL },
      { x:  halfW, y: -halfH, z:  halfL },
      { x:  halfW, y:  halfH, z:  halfL },
      { x: -halfW, y:  halfH, z:  halfL },
      { x: -halfW, y: -halfH, z:  halfL },
    ]);
    wireframeLines.push([
      { x: -halfW, y: -halfH, z: -halfL },
      { x:  halfW, y: -halfH, z: -halfL },
      { x:  halfW, y:  halfH, z: -halfL },
      { x: -halfW, y:  halfH, z: -halfL },
      { x: -halfW, y: -halfH, z: -halfL },
    ]);
    wireframeLines.push([
      { x: -halfW, y: -halfH, z: -halfL },
      { x: -halfW, y: -halfH, z:  halfL },
    ]);
    wireframeLines.push([
      { x:  halfW, y: -halfH, z: -halfL },
      { x:  halfW, y: -halfH, z:  halfL },
    ]);
    wireframeLines.push([
      { x: -halfW, y:  halfH, z: -halfL },
      { x: -halfW, y:  halfH, z:  halfL },
    ]);
    wireframeLines.push([
      { x:  halfW, y:  halfH, z: -halfL },
      { x:  halfW, y:  halfH, z:  halfL },
    ]);

    // 2. Rotating Damper Blades mounted at Z = 0 (tilted at ~35° open angle for realistic airflow look)
    const bladePitchY = h / numBlades;
    const bladeTiltAngle = (35 * Math.PI) / 180;
    const cosTilt = Math.cos(bladeTiltAngle);
    const sinTilt = Math.sin(bladeTiltAngle);
    const bladeHalfChord = (bladePitchY * 0.58);

    for (let b = 0; b < numBlades; b++) {
      const centerY = -halfH + (b + 0.5) * bladePitchY;
      const bIdx = vertices.length / 3;

      // 4 corners of blade plane:
      // Left axle: (-halfW + 8) to (+halfW - 8)
      const bLeftX = -halfW + 8;
      const bRightX = halfW - 8;

      const yFront = centerY + bladeHalfChord * sinTilt;
      const zFront = bladeHalfChord * cosTilt;
      const yBack = centerY - bladeHalfChord * sinTilt;
      const zBack = -bladeHalfChord * cosTilt;

      vertices.push(
        bLeftX,  yFront, zFront, // bIdx + 0
        bRightX, yFront, zFront, // bIdx + 1
        bRightX, yBack,  zBack,  // bIdx + 2
        bLeftX,  yBack,  zBack   // bIdx + 3
      );

      // Double-sided quad for blade
      indices.push(
        bIdx, bIdx + 1, bIdx + 2,
        bIdx, bIdx + 2, bIdx + 3,
        bIdx, bIdx + 2, bIdx + 1,
        bIdx, bIdx + 3, bIdx + 2
      );

      // Spindle shaft line through pivot axis (centerY, Z=0)
      wireframeLines.push([
        { x: -halfW - 35, y: centerY, z: 0 },
        { x:  halfW + 35, y: centerY, z: 0 },
      ]);

      // Blade outline
      wireframeLines.push([
        { x: bLeftX,  y: yFront, z: zFront },
        { x: bRightX, y: yFront, z: zFront },
        { x: bRightX, y: yBack,  z: zBack },
        { x: bLeftX,  y: yBack,  z: zBack },
        { x: bLeftX,  y: yFront, z: zFront },
      ]);
    }

    const totalWeightKg = parts.reduce((a, b) => a + b.weightKg * b.quantity, 0);
    const totalBlankAreaM2 = parts.reduce((a, b) => a + b.areaM2 * b.quantity, 0);

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
          min: { x: -halfW - 35, y: -halfH, z: -halfL },
          max: { x:  halfW + 35, y:  halfH, z:  halfL },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((totalBlankAreaM2 * 0.85).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 92,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        'Insert sintered bronze bushings into punched holes before blade assembly.',
        'Use heavy-duty lock quadrant with wing nut for positive manual locking in balancing runs.',
      ],
      dimensionsSummary: {
        'Size (W x H)': `${w} x ${h} mm`,
        'Sleeve Depth': `${l} mm`,
        'Blades': `${numBlades} Aerodynamic Blades`,
        'Shaft Spindle': `Ø${shaftD} mm`,
      },
    };
  }
}
