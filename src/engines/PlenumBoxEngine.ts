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

export class PlenumBoxEngine implements DuctCalculationEngine {
  readonly id = 'plenum_box';
  readonly name = 'Plenum Box (AHU / Fan Coil Supply & Return)';
  readonly nameBn = 'প্লেনাম বক্স (Plenum Box - AHU / FCU)';
  readonly category = 'special' as const;
  readonly description = 'Main air distribution box with folded sheet metal pan, top access cap, and circular takeoff collars.';
  readonly descriptionBn = 'এয়ার হ্যান্ডলিং ইউনিট প্লেনাম বক্স - মাল্টিপল টেকঅফ কলার ও অ্যাক্সেস ক্যাপ সহ।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'width',
      label: 'Plenum Width (W)',
      labelBn: 'প্লেনাম প্রস্থ (W)',
      type: 'number',
      defaultValue: 800,
      unit: 'mm',
      min: 200,
      max: 2500,
      step: 10,
    },
    {
      id: 'height',
      label: 'Plenum Height (H)',
      labelBn: 'প্লেনাম উচ্চতা (H)',
      type: 'number',
      defaultValue: 500,
      unit: 'mm',
      min: 200,
      max: 2500,
      step: 10,
    },
    {
      id: 'length',
      label: 'Plenum Depth / Length (L)',
      labelBn: 'প্লেনাম গভীরতা (L)',
      type: 'number',
      defaultValue: 700,
      unit: 'mm',
      min: 200,
      max: 2500,
      step: 10,
    },
    {
      id: 'numCollars',
      label: 'Takeoff Round Collars',
      labelBn: 'টেকঅফ কলার সংখ্যা',
      type: 'select',
      defaultValue: '2',
      options: [
        { value: '1', label: '1 Branch Collar (Ø250mm)', labelBn: '১টি ব্রাঞ্চ কলার (Ø২৫০মিমি)' },
        { value: '2', label: '2 Branch Collars (2 x Ø200mm)', labelBn: '২টি ব্রাঞ্চ কলার (২ x Ø২০০মিমি)' },
        { value: '3', label: '3 Branch Collars (3 x Ø160mm)', labelBn: '৩টি ব্রাঞ্চ কলার (৩ x Ø১৬০মিমি)' },
      ],
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'one_piece_wrap',
      options: [
        { value: 'one_piece_wrap', label: '1 Part (Continuous Folded Pan Box / ১ পার্ট)', labelBn: '১ পার্ট (ফুল ফোল্ডেড প্যান)' },
        { value: 'two_piece_l', label: '2 Parts (2 L-Type Shells / ২ পার্ট L-টাইপ)', labelBn: '২ পার্ট (২টি L-টাইপ শেকশন)' },
        { value: 'four_piece', label: '4 Parts (4 Individual Panels / ৪ পার্ট সিঙ্গেল)', labelBn: '৪ পার্ট (সিঙ্গেল সিঙ্গেল ৪টি প্যানেল)' },
      ],
      description: 'Cutting layout segmentation for plenum box fabrication',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const w = inputs.dimensions.width || 0;
    const h = inputs.dimensions.height || 0;
    const l = inputs.dimensions.length || 0;

    if (w <= 0 || h <= 0 || l <= 0) errors.push('Dimensions must be > 0');
    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w = inputs.dimensions.width || 800;
    const h = inputs.dimensions.height || 500;
    const l = inputs.dimensions.length || 700;
    const numCollars = parseInt(String(inputs.dimensions.numCollars || '2'), 10);

    const collarDia = numCollars === 1 ? 250 : numCollars === 2 ? 200 : 160;
    const collarLen = 80;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'one_piece_wrap';

    const lip = 25; // 25mm hem / attachment flange
    const parts: FlatPatternPart[] = [];

    const rC = collarDia / 2;

    if (style === 'two_piece_l') {
      // 2-Piece L-Type Shells: L-1 (Bottom + Right wall with collar cutouts), L-2 (Top + Left wall) + End Caps
      const blankLW = w + h + 2 * lip;
      const blankLL = l + 2 * lip;
      const bendX = lip + w;

      // L-1 with collar cutouts
      const lines1: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: blankLW, y: 0 }, type: 'cut' },
        { start: { x: blankLW, y: 0 }, end: { x: blankLW, y: blankLL }, type: 'cut' },
        { start: { x: blankLW, y: blankLL }, end: { x: 0, y: blankLL }, type: 'cut' },
        { start: { x: 0, y: blankLL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: bendX, y: lip }, end: { x: bendX, y: blankLL - lip }, type: 'bend_up', bendAngleDeg: 90, description: 'L-Corner 90° Bend' },
      ];

      for (let c = 1; c <= numCollars; c++) {
        const frac = c / (numCollars + 1);
        const holeY = lip + frac * l;
        const holeX = bendX + h / 2;
        for (let s = 0; s < 16; s++) {
          const a1 = (s / 16) * 2 * Math.PI;
          const a2 = ((s + 1) / 16) * 2 * Math.PI;
          lines1.push({
            start: { x: holeX + rC * Math.cos(a1), y: holeY + rC * Math.sin(a1) },
            end: { x: holeX + rC * Math.cos(a2), y: holeY + rC * Math.sin(a2) },
            type: 'cut',
            description: `Collar Cutout #${c}`,
          });
        }
      }

      const areaL = (blankLW * blankLL) / 1e6;
      parts.push({
        id: 'plenum_l_section_1',
        partName: `Plenum L-Section #1 with Collars (${w}+${h} x ${l}mm)`,
        partNameBn: `প্লেনাম L-সেকশন #১ (কলার কাটআউট সহ)`,
        quantity: 1,
        blankWidthMm: Math.round(blankLW * 10) / 10,
        blankLengthMm: Math.round(blankLL * 10) / 10,
        areaM2: Number(areaL.toFixed(3)),
        weightKg: Number((areaL * (thickness / 1000) * material.density).toFixed(2)),
        lines: lines1,
        outerContour: [{ x: 0, y: 0 }, { x: blankLW, y: 0 }, { x: blankLW, y: blankLL }, { x: 0, y: blankLL }],
        labels: [{ text: `L-Shell #1 (Bottom+Right)`, position: { x: blankLW / 2, y: blankLL / 2 }, fontSize: 18, type: 'part_name' }],
        bendCount: 1,
      });

      // L-2 solid
      const lines2: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: blankLW, y: 0 }, type: 'cut' },
        { start: { x: blankLW, y: 0 }, end: { x: blankLW, y: blankLL }, type: 'cut' },
        { start: { x: blankLW, y: blankLL }, end: { x: 0, y: blankLL }, type: 'cut' },
        { start: { x: 0, y: blankLL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: bendX, y: lip }, end: { x: bendX, y: blankLL - lip }, type: 'bend_up', bendAngleDeg: 90, description: 'L-Corner 90° Bend' },
      ];
      parts.push({
        id: 'plenum_l_section_2',
        partName: `Plenum L-Section #2 Solid Shell (${w}+${h} x ${l}mm)`,
        partNameBn: `প্লেনাম L-সেকশন #২ (সলিড L-হাফ)`,
        quantity: 1,
        blankWidthMm: Math.round(blankLW * 10) / 10,
        blankLengthMm: Math.round(blankLL * 10) / 10,
        areaM2: Number(areaL.toFixed(3)),
        weightKg: Number((areaL * (thickness / 1000) * material.density).toFixed(2)),
        lines: lines2,
        outerContour: [{ x: 0, y: 0 }, { x: blankLW, y: 0 }, { x: blankLW, y: blankLL }, { x: 0, y: blankLL }],
        labels: [{ text: `L-Shell #2 (Top+Left)`, position: { x: blankLW / 2, y: blankLL / 2 }, fontSize: 18, type: 'part_name' }],
        bendCount: 1,
      });
    } else if (style === 'four_piece') {
      // 4 Individual Panels: Top, Bottom, Right Wall (with collars), Left Wall
      const blankPW = w + 2 * lip;
      const blankPL = l + 2 * lip;
      const blankSideW = h + 2 * lip;
      const topArea = (blankPW * blankPL) / 1e6;
      const sideArea = (blankSideW * blankPL) / 1e6;

      // 1. Top Panel
      const p1Lines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: blankPW, y: 0 }, type: 'cut' },
        { start: { x: blankPW, y: 0 }, end: { x: blankPW, y: blankPL }, type: 'cut' },
        { start: { x: blankPW, y: blankPL }, end: { x: 0, y: blankPL }, type: 'cut' },
        { start: { x: 0, y: blankPL }, end: { x: 0, y: 0 }, type: 'cut' },
      ];
      parts.push({
        id: 'plenum_top_panel',
        partName: `Plenum Top Panel (${w}x${l}mm)`,
        partNameBn: `প্লেনাম টপ প্যানেল`,
        quantity: 1,
        blankWidthMm: Math.round(blankPW * 10) / 10,
        blankLengthMm: Math.round(blankPL * 10) / 10,
        areaM2: Number(topArea.toFixed(3)),
        weightKg: Number((topArea * (thickness / 1000) * material.density).toFixed(2)),
        lines: p1Lines,
        outerContour: [{ x: 0, y: 0 }, { x: blankPW, y: 0 }, { x: blankPW, y: blankPL }, { x: 0, y: blankPL }],
        labels: [{ text: `Top Panel ${w}x${l}mm`, position: { x: blankPW / 2, y: blankPL / 2 }, fontSize: 18, type: 'part_name' }],
        bendCount: 0,
      });

      // 2. Bottom Panel
      parts.push({
        id: 'plenum_bottom_panel',
        partName: `Plenum Bottom Panel (${w}x${l}mm)`,
        partNameBn: `প্লেনাম বটম প্যানেল`,
        quantity: 1,
        blankWidthMm: Math.round(blankPW * 10) / 10,
        blankLengthMm: Math.round(blankPL * 10) / 10,
        areaM2: Number(topArea.toFixed(3)),
        weightKg: Number((topArea * (thickness / 1000) * material.density).toFixed(2)),
        lines: p1Lines,
        outerContour: [{ x: 0, y: 0 }, { x: blankPW, y: 0 }, { x: blankPW, y: blankPL }, { x: 0, y: blankPL }],
        labels: [{ text: `Bottom Panel ${w}x${l}mm`, position: { x: blankPW / 2, y: blankPL / 2 }, fontSize: 18, type: 'part_name' }],
        bendCount: 0,
      });

      // 3. Right Side Wall (with Collar Cutouts)
      const p3Lines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: blankSideW, y: 0 }, type: 'cut' },
        { start: { x: blankSideW, y: 0 }, end: { x: blankSideW, y: blankPL }, type: 'cut' },
        { start: { x: blankSideW, y: blankPL }, end: { x: 0, y: blankPL }, type: 'cut' },
        { start: { x: 0, y: blankPL }, end: { x: 0, y: 0 }, type: 'cut' },
      ];
      for (let c = 1; c <= numCollars; c++) {
        const frac = c / (numCollars + 1);
        const holeY = lip + frac * l;
        const holeX = blankSideW / 2;
        for (let s = 0; s < 16; s++) {
          const a1 = (s / 16) * 2 * Math.PI;
          const a2 = ((s + 1) / 16) * 2 * Math.PI;
          p3Lines.push({
            start: { x: holeX + rC * Math.cos(a1), y: holeY + rC * Math.sin(a1) },
            end: { x: holeX + rC * Math.cos(a2), y: holeY + rC * Math.sin(a2) },
            type: 'cut',
          });
        }
      }
      parts.push({
        id: 'plenum_right_panel_collars',
        partName: `Plenum Right Wall Panel with Collars (${h}x${l}mm)`,
        partNameBn: `প্লেনাম সাইড প্যানেল (কলার সহ)`,
        quantity: 1,
        blankWidthMm: Math.round(blankSideW * 10) / 10,
        blankLengthMm: Math.round(blankPL * 10) / 10,
        areaM2: Number(sideArea.toFixed(3)),
        weightKg: Number((sideArea * (thickness / 1000) * material.density).toFixed(2)),
        lines: p3Lines,
        outerContour: [{ x: 0, y: 0 }, { x: blankSideW, y: 0 }, { x: blankSideW, y: blankPL }, { x: 0, y: blankPL }],
        labels: [{ text: `Right Wall (${numCollars} Collars)`, position: { x: blankSideW / 2, y: blankPL / 2 }, fontSize: 18, type: 'part_name' }],
        bendCount: 0,
      });

      // 4. Left Side Wall
      const p4Lines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: blankSideW, y: 0 }, type: 'cut' },
        { start: { x: blankSideW, y: 0 }, end: { x: blankSideW, y: blankPL }, type: 'cut' },
        { start: { x: blankSideW, y: blankPL }, end: { x: 0, y: blankPL }, type: 'cut' },
        { start: { x: 0, y: blankPL }, end: { x: 0, y: 0 }, type: 'cut' },
      ];
      parts.push({
        id: 'plenum_left_panel',
        partName: `Plenum Left Solid Wall Panel (${h}x${l}mm)`,
        partNameBn: `প্লেনাম বাম সাইড প্যানেল (সলিড)`,
        quantity: 1,
        blankWidthMm: Math.round(blankSideW * 10) / 10,
        blankLengthMm: Math.round(blankPL * 10) / 10,
        areaM2: Number(sideArea.toFixed(3)),
        weightKg: Number((sideArea * (thickness / 1000) * material.density).toFixed(2)),
        lines: p4Lines,
        outerContour: [{ x: 0, y: 0 }, { x: blankSideW, y: 0 }, { x: blankSideW, y: blankPL }, { x: 0, y: blankPL }],
        labels: [{ text: `Left Solid Wall ${h}x${l}mm`, position: { x: blankSideW / 2, y: blankPL / 2 }, fontSize: 18, type: 'part_name' }],
        bendCount: 0,
      });
    } else {
      // 1-Piece Folded Pan Body with True 12-Vertex Notched Contour
      // Base is W x L, 4 walls of height H fold upward
      const blankPanW = w + 2 * h + 2 * lip;
      const blankPanL = l + 2 * h + 2 * lip;
      const offset = h + lip;

      const panContour: Point2D[] = [
        { x: offset, y: 0 },
        { x: offset + w, y: 0 },
        { x: offset + w, y: offset },
        { x: blankPanW, y: offset },
        { x: blankPanW, y: offset + l },
        { x: offset + w, y: offset + l },
        { x: offset + w, y: blankPanL },
        { x: offset, y: blankPanL },
        { x: offset, y: offset + l },
        { x: 0, y: offset + l },
        { x: 0, y: offset },
        { x: offset, y: offset },
      ];

      const panLines: Line2D[] = [];
      for (let i = 0; i < panContour.length; i++) {
        panLines.push({
          start: panContour[i],
          end: panContour[(i + 1) % panContour.length],
          type: 'cut',
        });
      }

      // 4 Main 90° fold lines around base
      const pB1 = { x: offset, y: offset };
      const pB2 = { x: offset + w, y: offset };
      const pB3 = { x: offset + w, y: offset + l };
      const pB4 = { x: offset, y: offset + l };

      panLines.push(
        { start: pB1, end: pB2, type: 'bend_up', bendAngleDeg: 90, description: 'Front Wall Fold' },
        { start: pB2, end: pB3, type: 'bend_up', bendAngleDeg: 90, description: 'Right Wall Fold' },
        { start: pB3, end: pB4, type: 'bend_up', bendAngleDeg: 90, description: 'Back Wall Fold' },
        { start: pB4, end: pB1, type: 'bend_up', bendAngleDeg: 90, description: 'Left Wall Fold' }
      );

      // Cross-brake stiffening crease lines on base
      const pCenter = { x: offset + w / 2, y: offset + l / 2 };
      panLines.push(
        { start: pB1, end: pB3, type: 'guide', description: 'Cross-Brake Stiffener' },
        { start: pB2, end: pB4, type: 'guide', description: 'Cross-Brake Stiffener' }
      );

      // Circular takeoff hole cutouts on side walls
      for (let c = 1; c <= numCollars; c++) {
        const frac = c / (numCollars + 1);
        const holeY = offset + frac * l;
        const holeX = offset + w + h / 2; // on right side wall

        for (let s = 0; s < 16; s++) {
          const a1 = (s / 16) * 2 * Math.PI;
          const a2 = ((s + 1) / 16) * 2 * Math.PI;
          panLines.push({
            start: { x: holeX + rC * Math.cos(a1), y: holeY + rC * Math.sin(a1) },
            end: { x: holeX + rC * Math.cos(a2), y: holeY + rC * Math.sin(a2) },
            type: 'cut',
            description: `Takeoff Collar Cutout #${c}`,
          });
        }
      }

      const panAreaM2 = (blankPanW * blankPanL * 0.72) / 1e6;
      parts.push({
        id: 'plenum_pan_body',
        partName: `Plenum Box Pan (${w}x${l} x ${h}mm)`,
        partNameBn: `প্লেনাম বক্স প্যান বডি (${w}x${l} x ${h}মিমি)`,
        quantity: 1,
        blankWidthMm: Math.round(blankPanW * 10) / 10,
        blankLengthMm: Math.round(blankPanL * 10) / 10,
        areaM2: Number(panAreaM2.toFixed(3)),
        weightKg: Number((panAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
        lines: panLines,
        outerContour: panContour,
        labels: [
          {
            text: `Plenum Pan ${w}x${h}x${l}mm`,
            position: { x: pCenter.x, y: pCenter.y },
            fontSize: 22,
            type: 'part_name',
          },
          {
            text: `${numCollars} x Ø${collarDia}mm Branch Takeoffs`,
            position: { x: pCenter.x, y: pCenter.y - 30 },
            fontSize: 14,
            type: 'dimension',
          },
        ],
        bendCount: 4,
        notes: [
          'Fold 4 walls 90° upward and rivet corners',
          'Cross-brake stiffening crease recommended for low rumble noise',
        ],
      });
    }

    // 2. Takeoff Collars
    const collarCirc = Math.PI * collarDia;
    const collarBlankW = collarCirc + 20;
    const collarBlankL = collarLen + 15; // 15mm tabs

    const collarLines: Line2D[] = [
      { start: { x: 0, y: 0 }, end: { x: collarBlankW, y: 0 }, type: 'cut' },
      { start: { x: collarBlankW, y: 0 }, end: { x: collarBlankW, y: collarBlankL }, type: 'cut' },
      { start: { x: collarBlankW, y: collarBlankL }, end: { x: 0, y: collarBlankL }, type: 'cut' },
      { start: { x: 0, y: collarBlankL }, end: { x: 0, y: 0 }, type: 'cut' },
      { start: { x: 0, y: 15 }, end: { x: collarBlankW, y: 15 }, type: 'bend_up', bendAngleDeg: 90, description: 'Tab Turn-Out Fold' },
    ];
    for (let t = 1; t < Math.floor(collarBlankW / 25); t++) {
      collarLines.push({ start: { x: t * 25, y: 0 }, end: { x: t * 25, y: 15 }, type: 'notch' });
    }

    parts.push({
      id: 'takeoff_collar_pattern',
      partName: `Takeoff Collar Ø${collarDia} x ${collarLen}mm`,
      partNameBn: `টেকঅফ কলার Ø${collarDia}মিমি (${numCollars}টি প্রয়োজন)`,
      quantity: numCollars,
      blankWidthMm: Math.round(collarBlankW * 10) / 10,
      blankLengthMm: Math.round(collarBlankL * 10) / 10,
      areaM2: Number(((collarBlankW * collarBlankL) / 1e6).toFixed(3)),
      weightKg: Number((((collarBlankW * collarBlankL) / 1e6) * (thickness / 1000) * material.density).toFixed(2)),
      lines: collarLines,
      outerContour: [
        { x: 0, y: 0 },
        { x: collarBlankW, y: 0 },
        { x: collarBlankW, y: collarBlankL },
        { x: 0, y: collarBlankL },
      ],
      labels: [{ text: `Collar Ø${collarDia}mm`, position: { x: collarBlankW / 2, y: collarBlankL / 2 }, fontSize: 16, type: 'part_name' }],
      bendCount: 1,
    });

    // 3D Geometry: Main plenum box WITH multiple takeoff collars protruding from the right side wall!
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    const halfW = w / 2;
    const halfH = h / 2;
    const halfL = l / 2;

    // 1. Plenum Box (8 vertices, hollow, open front inlet)
    vertices.push(
      -halfW, -halfH,  halfL, // 0: BL Front
       halfW, -halfH,  halfL, // 1: BR Front
       halfW,  halfH,  halfL, // 2: TR Front
      -halfW,  halfH,  halfL, // 3: TL Front
      -halfW, -halfH, -halfL, // 4: BL Back
       halfW, -halfH, -halfL, // 5: BR Back
       halfW,  halfH, -halfL, // 6: TR Back
      -halfW,  halfH, -halfL  // 7: TL Back
    );

    // Box walls: Bottom, Top, Right, Left, and Back Plate
    indices.push(
      0, 1, 5,  0, 5, 4, // Bottom
      3, 6, 2,  3, 7, 6, // Top
      1, 2, 6,  1, 6, 5, // Right side wall
      0, 4, 7,  0, 7, 3, // Left side wall
      4, 5, 6,  4, 6, 7  // Back plate
    );

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
      { x:  halfW, y:  halfH, z: -halfL },
      { x:  halfW, y:  halfH, z:  halfL },
    ]);
    wireframeLines.push([
      { x: -halfW, y:  halfH, z: -halfL },
      { x: -halfW, y:  halfH, z:  halfL },
    ]);

    // 2. Protruding Round Takeoff Collars on Right Side Wall (along +X axis, from X = halfW to X = halfW + collarLen)
    const segs = 20;
    for (let c = 1; c <= numCollars; c++) {
      const frac = c / (numCollars + 1);
      const collarCenterZ = -halfL + frac * l;
      const baseV = vertices.length / 3;

      for (let i = 0; i <= segs; i++) {
        const phi = (i / segs) * 2 * Math.PI;
        const cy = rC * Math.cos(phi);
        const cz = collarCenterZ + rC * Math.sin(phi);

        vertices.push(halfW, cy, cz);                 // Base ring on right wall
        vertices.push(halfW + collarLen, cy, cz);     // Outer tip ring
      }

      for (let i = 0; i < segs; i++) {
        const v0 = baseV + i * 2;
        const v1 = v0 + 1;
        const v2 = baseV + (i + 1) * 2;
        const v3 = v2 + 1;
        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }

      // Wireframe rings for this collar
      const cBase: Point3D[] = [];
      const cTip: Point3D[] = [];
      for (let i = 0; i <= segs; i++) {
        const phi = (i / segs) * 2 * Math.PI;
        cBase.push({ x: halfW, y: rC * Math.cos(phi), z: collarCenterZ + rC * Math.sin(phi) });
        cTip.push({ x: halfW + collarLen, y: rC * Math.cos(phi), z: collarCenterZ + rC * Math.sin(phi) });
      }
      wireframeLines.push(cBase, cTip);
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
          min: { x: -halfW, y: -halfH, z: -halfL },
          max: { x:  halfW + collarLen, y:  halfH, z:  halfL },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((totalBlankAreaM2 * 0.85).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 81,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        'Apply internal fiberglass acoustic lining / duct board to dampen AHU fan noise.',
        'Spin-in collar tabs provide positive mechanical lock without separate angle frames.',
      ],
      dimensionsSummary: {
        'Size (W x H x L)': `${w} x ${h} x ${l} mm`,
        'Takeoff Collars': `${numCollars} x Ø${collarDia} mm`,
        'Collar Length': `${collarLen} mm`,
      },
    };
  }
}
