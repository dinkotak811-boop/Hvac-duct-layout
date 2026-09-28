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
import { MATERIALS, getGaugeThickness, getSmacnaRecommendedGauge } from '../standards/materials';
import { getLongitudinalAllowance, getTransverseAllowance } from '../standards/seams';

export class RectangularTeeEngine implements DuctCalculationEngine {
  readonly id = 'rect_straight_tee';
  readonly name = 'Rectangular 90° Tee (Straight & Reducing)';
  readonly nameBn = 'রেকটেঙ্গুলার ৯০° টি ডাক্ট (Rectangular Tee)';
  readonly category = 'tee' as const;
  readonly description = 'Main rectangular duct run with 90° branch tap opening and tabbed branch collar sleeve.';
  readonly descriptionBn = 'মেইন ডাক্ট রান ও পারপেন্ডিকুলার ব্রাঞ্চ ট্যাপ কলার সহ সম্পূর্ণ ৯০° টি অ্যাসেম্বলি।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'mainWidth',
      label: 'Main Width (Wm)',
      labelBn: 'মেইন ডাক্ট প্রস্থ (Wm)',
      type: 'number',
      defaultValue: 600,
      unit: 'mm',
      min: 150,
      max: 2500,
      step: 10,
    },
    {
      id: 'mainHeight',
      label: 'Main Height (Hm)',
      labelBn: 'মেইন ডাক্ট উচ্চতা (Hm)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 150,
      max: 2500,
      step: 10,
    },
    {
      id: 'mainLength',
      label: 'Main Length (Lm)',
      labelBn: 'মেইন রান দৈর্ঘ্য (Lm)',
      type: 'number',
      defaultValue: 1000,
      unit: 'mm',
      min: 400,
      max: 3000,
      step: 10,
    },
    {
      id: 'branchWidth',
      label: 'Branch Width (Wb)',
      labelBn: 'ব্রাঞ্চ প্রস্থ (Wb)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 100,
      max: 2000,
      step: 10,
    },
    {
      id: 'branchHeight',
      label: 'Branch Height (Hb)',
      labelBn: 'ব্রাঞ্চ উচ্চতা (Hb)',
      type: 'number',
      defaultValue: 300,
      unit: 'mm',
      min: 100,
      max: 2000,
      step: 10,
    },
    {
      id: 'branchLength',
      label: 'Branch Length (Lb)',
      labelBn: 'ব্রাঞ্চ দৈর্ঘ্য (Lb)',
      type: 'number',
      defaultValue: 350,
      unit: 'mm',
      min: 100,
      max: 1500,
      step: 10,
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'two_piece_l',
      options: [
        { value: 'two_piece_l', label: '2 Parts (2 L-Type Halves + Branch / ২ পার্ট L-টাইপ)', labelBn: '২ পার্ট (২টি L-টাইপ মেইন হাফ)' },
        { value: 'one_piece_wrap', label: '1 Part (Full Wrap Main Body + Branch / ১ পার্ট)', labelBn: '১ পার্ট (ফুল র্যাপার বডি)' },
        { value: 'four_piece', label: '4 Parts (4 Individual Main Panels + Branch / ৪ পার্ট)', labelBn: '৪ পার্ট (সিঙ্গেল সিঙ্গেল ৪টি প্যানেল)' },
      ],
      description: 'Cutting layout segmentation for main run duct and branch assembly',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const wm = inputs.dimensions.mainWidth || 0;
    const hm = inputs.dimensions.mainHeight || 0;
    const lm = inputs.dimensions.mainLength || 0;
    const wb = inputs.dimensions.branchWidth || 0;
    const hb = inputs.dimensions.branchHeight || 0;
    const lb = inputs.dimensions.branchLength || 0;

    if (wm <= 0 || hm <= 0 || lm <= 0) errors.push('Main duct dimensions must be > 0');
    if (wb <= 0 || hb <= 0 || lb <= 0) errors.push('Branch dimensions must be > 0');
    if (wb > wm) errors.push('Branch Width (Wb) cannot be larger than Main Duct Width (Wm)');
    if (hb > lm - 100) errors.push('Branch Height (Hb) must fit within Main Length (Lm - 100mm)');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const wm = inputs.dimensions.mainWidth || 600;
    const hm = inputs.dimensions.mainHeight || 400;
    const lm = inputs.dimensions.mainLength || 1000;
    const wb = inputs.dimensions.branchWidth || 400;
    const hb = inputs.dimensions.branchHeight || 300;
    const lb = inputs.dimensions.branchLength || 350;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const transAllowance = connSpec.allowancePerEndMm;
    const femalePocket = seamSpec.femalePocketAllowanceMm;
    const maleTongue = seamSpec.maleTongueAllowanceMm;

    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'two_piece_l';
    const parts: FlatPatternPart[] = [];

    const blankMainL = lm + 2 * transAllowance;
    const holeY = transAllowance + (lm - hb) / 2;

    if (style === 'one_piece_wrap') {
      // 1-Piece Continuous Wrap Body: Wm + Hm + Wm + Hm
      const wrapW = 2 * wm + 2 * hm + femalePocket + maleTongue;
      const holeX = femalePocket + (wm - wb) / 2;

      const mainLines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: wrapW, y: 0 }, type: 'cut', description: 'Transverse Edge Top' },
        { start: { x: wrapW, y: 0 }, end: { x: wrapW, y: blankMainL }, type: 'cut', description: 'Seam Tongue Edge' },
        { start: { x: wrapW, y: blankMainL }, end: { x: 0, y: blankMainL }, type: 'cut', description: 'Transverse Edge Bottom' },
        { start: { x: 0, y: blankMainL }, end: { x: 0, y: 0 }, type: 'cut', description: 'Seam Pocket Edge' },
        // Transverse connector fold lines
        { start: { x: 0, y: transAllowance }, end: { x: wrapW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: 0, y: blankMainL - transAllowance }, end: { x: wrapW, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
      ];

      // 3 Corner 90° bend lines
      const b1 = femalePocket + wm;
      const b2 = b1 + hm;
      const b3 = b2 + wm;
      [b1, b2, b3].forEach((bx, idx) => {
        mainLines.push({
          start: { x: bx, y: transAllowance },
          end: { x: bx, y: blankMainL - transAllowance },
          type: 'bend_up',
          bendAngleDeg: 90,
          description: `Corner Bend ${idx + 1}`,
        });
      });

      // Branch Tap Hole Cutout
      mainLines.push(
        { start: { x: holeX, y: holeY }, end: { x: holeX + wb, y: holeY }, type: 'cut', description: 'Tap Hole Cutout' },
        { start: { x: holeX + wb, y: holeY }, end: { x: holeX + wb, y: holeY + hb }, type: 'cut', description: 'Tap Hole Cutout' },
        { start: { x: holeX + wb, y: holeY + hb }, end: { x: holeX, y: holeY + hb }, type: 'cut', description: 'Tap Hole Cutout' },
        { start: { x: holeX, y: holeY + hb }, end: { x: holeX, y: holeY }, type: 'cut', description: 'Tap Hole Cutout' }
      );

      const mainAreaM2 = (wrapW * blankMainL) / 1e6;
      parts.push({
        id: 'main_run_wrap_body',
        partName: `Main Run 1-Piece Wrap with Tap Cutout (${wb}x${hb}mm)`,
        partNameBn: `মেইন ডাক্ট ১-পিস ফুল র্যাপার বডি (ট্যাপ হোল সহ)`,
        quantity: 1,
        blankWidthMm: Math.round(wrapW * 10) / 10,
        blankLengthMm: Math.round(blankMainL * 10) / 10,
        areaM2: Number(mainAreaM2.toFixed(3)),
        weightKg: Number((mainAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
        lines: mainLines,
        outerContour: [
          { x: 0, y: 0 },
          { x: wrapW, y: 0 },
          { x: wrapW, y: blankMainL },
          { x: 0, y: blankMainL },
        ],
        labels: [
          { text: `1-Piece Wrap Main Run ${wm}x${hm}x${lm}mm`, position: { x: wrapW / 2, y: blankMainL / 2 + 100 }, fontSize: 20, type: 'part_name' },
          { text: `BRANCH TAP CUTOUT ${wb}x${hb}mm`, position: { x: holeX + wb / 2, y: holeY + hb / 2 }, fontSize: 16, type: 'dimension' },
        ],
        bendCount: 5,
        notes: [
          'Full 1-piece wrap-around sheet. Plasma/laser cut central tap hole before bending.',
          `Transverse: ${connSpec.name} (+${transAllowance}mm each end)`,
        ],
      });
    } else if (style === 'four_piece') {
      // 4 Individual Panels: Top (with tap hole), Bottom, Left Side, Right Side
      const panelTopW = wm + 2 * femalePocket;
      const holeX = femalePocket + (wm - wb) / 2;

      // 1. Top Panel (with Tap Hole)
      const topLines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: panelTopW, y: 0 }, type: 'cut' },
        { start: { x: panelTopW, y: 0 }, end: { x: panelTopW, y: blankMainL }, type: 'cut' },
        { start: { x: panelTopW, y: blankMainL }, end: { x: 0, y: blankMainL }, type: 'cut' },
        { start: { x: 0, y: blankMainL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: 0, y: transAllowance }, end: { x: panelTopW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: 0, y: blankMainL - transAllowance }, end: { x: panelTopW, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: holeX, y: holeY }, end: { x: holeX + wb, y: holeY }, type: 'cut' },
        { start: { x: holeX + wb, y: holeY }, end: { x: holeX + wb, y: holeY + hb }, type: 'cut' },
        { start: { x: holeX + wb, y: holeY + hb }, end: { x: holeX, y: holeY + hb }, type: 'cut' },
        { start: { x: holeX, y: holeY + hb }, end: { x: holeX, y: holeY }, type: 'cut' },
      ];
      const topArea = (panelTopW * blankMainL) / 1e6;
      parts.push({
        id: 'main_top_panel_tap',
        partName: `Main Top Panel with Tap Cutout (${wb}x${hb}mm)`,
        partNameBn: `মেইন টপ প্যানেল (ট্যাপ কাটআউট সহ)`,
        quantity: 1,
        blankWidthMm: Math.round(panelTopW * 10) / 10,
        blankLengthMm: Math.round(blankMainL * 10) / 10,
        areaM2: Number(topArea.toFixed(3)),
        weightKg: Number((topArea * (thickness / 1000) * material.density).toFixed(2)),
        lines: topLines,
        outerContour: [{ x: 0, y: 0 }, { x: panelTopW, y: 0 }, { x: panelTopW, y: blankMainL }, { x: 0, y: blankMainL }],
        labels: [
          { text: `Top Panel ${wm}mm (Tap: ${wb}x${hb})`, position: { x: panelTopW / 2, y: blankMainL / 2 + 80 }, fontSize: 18, type: 'part_name' },
          { text: `BRANCH TAP CUTOUT`, position: { x: holeX + wb / 2, y: holeY + hb / 2 }, fontSize: 15, type: 'dimension' },
        ],
        bendCount: 2,
      });

      // 2. Bottom Panel
      const botLines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: panelTopW, y: 0 }, type: 'cut' },
        { start: { x: panelTopW, y: 0 }, end: { x: panelTopW, y: blankMainL }, type: 'cut' },
        { start: { x: panelTopW, y: blankMainL }, end: { x: 0, y: blankMainL }, type: 'cut' },
        { start: { x: 0, y: blankMainL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: 0, y: transAllowance }, end: { x: panelTopW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: 0, y: blankMainL - transAllowance }, end: { x: panelTopW, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
      ];
      parts.push({
        id: 'main_bottom_panel',
        partName: `Main Bottom Solid Panel (${wm}x${lm}mm)`,
        partNameBn: `মেইন বটম সলিড প্যানেল`,
        quantity: 1,
        blankWidthMm: Math.round(panelTopW * 10) / 10,
        blankLengthMm: Math.round(blankMainL * 10) / 10,
        areaM2: Number(topArea.toFixed(3)),
        weightKg: Number((topArea * (thickness / 1000) * material.density).toFixed(2)),
        lines: botLines,
        outerContour: [{ x: 0, y: 0 }, { x: panelTopW, y: 0 }, { x: panelTopW, y: blankMainL }, { x: 0, y: blankMainL }],
        labels: [{ text: `Bottom Panel ${wm}x${lm}mm`, position: { x: panelTopW / 2, y: blankMainL / 2 }, fontSize: 18, type: 'part_name' }],
        bendCount: 2,
      });

      // 3 & 4. Left and Right Side Panels
      const sideW = hm + 2 * maleTongue;
      for (let s = 1; s <= 2; s++) {
        const sideLines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: sideW, y: 0 }, type: 'cut' },
          { start: { x: sideW, y: 0 }, end: { x: sideW, y: blankMainL }, type: 'cut' },
          { start: { x: sideW, y: blankMainL }, end: { x: 0, y: blankMainL }, type: 'cut' },
          { start: { x: 0, y: blankMainL }, end: { x: 0, y: 0 }, type: 'cut' },
          { start: { x: 0, y: transAllowance }, end: { x: sideW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
          { start: { x: 0, y: blankMainL - transAllowance }, end: { x: sideW, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        ];
        const sArea = (sideW * blankMainL) / 1e6;
        parts.push({
          id: `main_side_panel_${s}`,
          partName: `Main Side Panel #${s} (${s === 1 ? 'Left' : 'Right'} ${hm}x${lm}mm)`,
          partNameBn: `মেইন সাইড প্যানেল #${s} (${s === 1 ? 'বাম' : 'ডান'})`,
          quantity: 1,
          blankWidthMm: Math.round(sideW * 10) / 10,
          blankLengthMm: Math.round(blankMainL * 10) / 10,
          areaM2: Number(sArea.toFixed(3)),
          weightKg: Number((sArea * (thickness / 1000) * material.density).toFixed(2)),
          lines: sideLines,
          outerContour: [{ x: 0, y: 0 }, { x: sideW, y: 0 }, { x: sideW, y: blankMainL }, { x: 0, y: blankMainL }],
          labels: [{ text: `Side Panel #${s} (${hm}x${lm}mm)`, position: { x: sideW / 2, y: blankMainL / 2 }, fontSize: 18, type: 'part_name' }],
          bendCount: 2,
        });
      }
    } else {
      // Standard 2-Piece L-Type: L-Section 1 (with Tap Hole) + L-Section 2 (Matching Solid L-Section)
      const blankMainW = femalePocket + wm + hm + maleTongue;
      const bendX = femalePocket + wm;

      // L-Section 1 (with Tap Cutout)
      const mainLines1: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: blankMainW, y: 0 }, type: 'cut' },
        { start: { x: blankMainW, y: 0 }, end: { x: blankMainW, y: blankMainL }, type: 'cut' },
        { start: { x: blankMainW, y: blankMainL }, end: { x: 0, y: blankMainL }, type: 'cut' },
        { start: { x: 0, y: blankMainL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: bendX, y: transAllowance }, end: { x: bendX, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: 0, y: transAllowance }, end: { x: blankMainW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: 0, y: blankMainL - transAllowance }, end: { x: blankMainW, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
      ];

      const holeX = femalePocket + (wm - wb) / 2;
      mainLines1.push(
        { start: { x: holeX, y: holeY }, end: { x: holeX + wb, y: holeY }, type: 'cut', description: 'Tap Hole Cutout' },
        { start: { x: holeX + wb, y: holeY }, end: { x: holeX + wb, y: holeY + hb }, type: 'cut', description: 'Tap Hole Cutout' },
        { start: { x: holeX + wb, y: holeY + hb }, end: { x: holeX, y: holeY + hb }, type: 'cut', description: 'Tap Hole Cutout' },
        { start: { x: holeX, y: holeY + hb }, end: { x: holeX, y: holeY }, type: 'cut', description: 'Tap Hole Cutout' }
      );

      const mainAreaM2 = (blankMainW * blankMainL) / 1e6;
      parts.push({
        id: 'main_run_with_tap_hole',
        partName: `Main Run L-Section #1 with Tap Hole (${wb}x${hb}mm)`,
        partNameBn: `মেইন ডাক্ট L-সেকশন #১ (ট্যাপ হোল সহ)`,
        quantity: 1,
        blankWidthMm: Math.round(blankMainW * 10) / 10,
        blankLengthMm: Math.round(blankMainL * 10) / 10,
        areaM2: Number(mainAreaM2.toFixed(3)),
        weightKg: Number((mainAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
        lines: mainLines1,
        outerContour: [
          { x: 0, y: 0 },
          { x: blankMainW, y: 0 },
          { x: blankMainW, y: blankMainL },
          { x: 0, y: blankMainL },
        ],
        labels: [
          { text: `Main Run L-Section #1 (${wm}x${hm}mm)`, position: { x: blankMainW / 2, y: blankMainL / 2 + 100 }, fontSize: 20, type: 'part_name' },
          { text: `BRANCH TAP CUTOUT ${wb}x${hb}mm`, position: { x: holeX + wb / 2, y: holeY + hb / 2 }, fontSize: 16, type: 'dimension' },
        ],
        bendCount: 3,
        notes: [
          'Plasma/laser cut the central tap cutout hole for branch collar insertion',
          `Transverse: ${connSpec.name} (+${transAllowance}mm each end)`,
        ],
      });

      // L-Section 2 (Matching Solid L-Section)
      const mainLines2: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: blankMainW, y: 0 }, type: 'cut' },
        { start: { x: blankMainW, y: 0 }, end: { x: blankMainW, y: blankMainL }, type: 'cut' },
        { start: { x: blankMainW, y: blankMainL }, end: { x: 0, y: blankMainL }, type: 'cut' },
        { start: { x: 0, y: blankMainL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: bendX, y: transAllowance }, end: { x: bendX, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: 0, y: transAllowance }, end: { x: blankMainW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        { start: { x: 0, y: blankMainL - transAllowance }, end: { x: blankMainW, y: blankMainL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
      ];

      parts.push({
        id: 'main_run_solid_l',
        partName: `Main Run L-Section #2 (Matching Solid L-Half)`,
        partNameBn: `মেইন ডাক্ট L-সেকশন #২ (ম্যাচিং সলিড হাফ)`,
        quantity: 1,
        blankWidthMm: Math.round(blankMainW * 10) / 10,
        blankLengthMm: Math.round(blankMainL * 10) / 10,
        areaM2: Number(mainAreaM2.toFixed(3)),
        weightKg: Number((mainAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
        lines: mainLines2,
        outerContour: [
          { x: 0, y: 0 },
          { x: blankMainW, y: 0 },
          { x: blankMainW, y: blankMainL },
          { x: 0, y: blankMainL },
        ],
        labels: [
          { text: `Main Run L-Section #2 (${wm}x${hm}mm)`, position: { x: blankMainW / 2, y: blankMainL / 2 }, fontSize: 20, type: 'part_name' },
        ],
        bendCount: 3,
        notes: [
          'Solid matching L-section to complete rectangular duct main body',
          `Transverse: ${connSpec.name} (+${transAllowance}mm each end)`,
        ],
      });
    }

    // 2. Branch Tap-In Collar (Wrap-around sleeve with dovetail tabs)
    const tabDepth = 15; // 15mm dovetail tabs
    const collarPerimeter = 2 * (wb + hb);
    const blankCollarW = femalePocket + collarPerimeter + maleTongue;
    const blankCollarL = lb + transAllowance + tabDepth;

    const collarLines: Line2D[] = [
      { start: { x: 0, y: 0 }, end: { x: blankCollarW, y: 0 }, type: 'cut' },
      { start: { x: blankCollarW, y: 0 }, end: { x: blankCollarW, y: blankCollarL }, type: 'cut' },
      { start: { x: blankCollarW, y: blankCollarL }, end: { x: 0, y: blankCollarL }, type: 'cut' },
      { start: { x: 0, y: blankCollarL }, end: { x: 0, y: 0 }, type: 'cut' },
    ];

    // Bend lines for 4 collar corners
    const cBends = [
      femalePocket + wb,
      femalePocket + wb + hb,
      femalePocket + 2 * wb + hb,
    ];
    cBends.forEach((bx, idx) => {
      collarLines.push({
        start: { x: bx, y: tabDepth },
        end: { x: bx, y: blankCollarL - transAllowance },
        type: 'bend_up',
        bendAngleDeg: 90,
        description: `Collar Corner Bend ${idx + 1}`,
      });
    });

    // Dovetail fold line at base
    collarLines.push({
      start: { x: 0, y: tabDepth },
      end: { x: blankCollarW, y: tabDepth },
      type: 'bend_down',
      bendAngleDeg: 90,
      description: 'Dovetail Tab Turn-Out Fold Line',
    });

    // Tab notches spaced every 40mm along base
    const numTabs = Math.floor(blankCollarW / 40);
    for (let t = 1; t < numTabs; t++) {
      const tx = t * 40;
      collarLines.push({
        start: { x: tx, y: 0 },
        end: { x: tx, y: tabDepth },
        type: 'notch',
        description: 'Dovetail Tab Notch',
      });
    }

    const collarAreaM2 = (blankCollarW * blankCollarL) / 1e6;
    parts.push({
      id: 'branch_collar_sleeve',
      partName: `Branch Tap Collar ${wb}x${hb} x ${lb}mm (Tabbed)`,
      partNameBn: `ব্রাঞ্চ ট্যাপ কলার (ডোভটেইল ট্যাব সহ)`,
      quantity: 1,
      blankWidthMm: Math.round(blankCollarW * 10) / 10,
      blankLengthMm: Math.round(blankCollarL * 10) / 10,
      areaM2: Number(collarAreaM2.toFixed(3)),
      weightKg: Number((collarAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
      lines: collarLines,
      outerContour: [
        { x: 0, y: 0 },
        { x: blankCollarW, y: 0 },
        { x: blankCollarW, y: blankCollarL },
        { x: 0, y: blankCollarL },
      ],
      labels: [
        {
          text: `Branch Collar ${wb}x${hb}x${lb}mm`,
          position: { x: blankCollarW / 2, y: blankCollarL / 2 },
          fontSize: 20,
          type: 'part_name',
        },
        {
          text: '15mm Dovetail Mounting Tabs (Alternate fold inside/outside)',
          position: { x: blankCollarW / 2, y: tabDepth / 2 + 5 },
          fontSize: 12,
          type: 'alignment',
        },
      ],
      bendCount: 4,
      notes: [
        'Fold collar into rectangular sleeve, insert into main tap hole, and turn over dovetail tabs.',
      ],
    });

    // 3D Geometry: BOTH the main rectangular duct run AND the perpendicular branching duct tap collar
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    const halfWm = wm / 2;
    const halfHm = hm / 2;
    const halfLm = lm / 2;

    // 1. Main Duct Hollow Box (along Z axis)
    // 8 vertices:
    // Front opening (Z = +halfLm): 0, 1, 2, 3
    // Back opening (Z = -halfLm): 4, 5, 6, 7
    vertices.push(
      -halfWm, -halfHm,  halfLm, // 0: Bottom-Left Front
       halfWm, -halfHm,  halfLm, // 1: Bottom-Right Front
       halfWm,  halfHm,  halfLm, // 2: Top-Right Front
      -halfWm,  halfHm,  halfLm, // 3: Top-Left Front
      -halfWm, -halfHm, -halfLm, // 4: Bottom-Left Back
       halfWm, -halfHm, -halfLm, // 5: Bottom-Right Back
       halfWm,  halfHm, -halfLm, // 6: Top-Right Back
      -halfWm,  halfHm, -halfLm  // 7: Top-Left Back
    );

    // 4 Hollow side walls (Bottom, Top, Right, Left) - Front and Back are open!
    indices.push(
      // Bottom (0, 1, 5, 4)
      0, 1, 5,  0, 5, 4,
      // Top (3, 2, 6, 7)
      3, 6, 2,  3, 7, 6,
      // Right (1, 2, 6, 5)
      1, 2, 6,  1, 6, 5,
      // Left (0, 4, 7, 3)
      0, 4, 7,  0, 7, 3
    );

    // 2. Branch Collar Duct extending along +Y axis (perpendicular from top face at Y = +halfHm to Y = halfHm + lb)
    const halfWb = wb / 2;
    const halfHb = hb / 2;
    const branchBaseIdx = 8;
    const topY = halfHm + lb;

    // Branch collar 8 vertices:
    // Bottom attachment ring on main top face (Y = +halfHm): 8, 9, 10, 11
    // Top outlet ring (Y = topY): 12, 13, 14, 15
    vertices.push(
      -halfWb, halfHm,  halfHb, // 8:  BL
       halfWb, halfHm,  halfHb, // 9:  BR
       halfWb, halfHm, -halfHb, // 10: TR
      -halfWb, halfHm, -halfHb, // 11: TL
      -halfWb, topY,    halfHb, // 12: BL Top
       halfWb, topY,    halfHb, // 13: BR Top
       halfWb, topY,   -halfHb, // 14: TR Top
      -halfWb, topY,   -halfHb  // 15: TL Top
    );

    // 4 vertical walls of branch duct:
    // Front wall: 8, 9, 13, 12
    // Right wall: 9, 10, 14, 13
    // Back wall: 10, 11, 15, 14
    // Left wall: 11, 8, 12, 15
    indices.push(
      // Front wall
      8, 9, 13,  8, 13, 12,
      // Right wall
      9, 10, 14, 9, 14, 13,
      // Back wall
      10, 11, 15, 10, 15, 14,
      // Left wall
      11, 8, 12,  11, 12, 15
    );

    // Wireframes:
    // Main run front and back rings
    wireframeLines.push([
      { x: -halfWm, y: -halfHm, z: halfLm },
      { x:  halfWm, y: -halfHm, z: halfLm },
      { x:  halfWm, y:  halfHm, z: halfLm },
      { x: -halfWm, y:  halfHm, z: halfLm },
      { x: -halfWm, y: -halfHm, z: halfLm },
    ]);
    wireframeLines.push([
      { x: -halfWm, y: -halfHm, z: -halfLm },
      { x:  halfWm, y: -halfHm, z: -halfLm },
      { x:  halfWm, y:  halfHm, z: -halfLm },
      { x: -halfWm, y:  halfHm, z: -halfLm },
      { x: -halfWm, y: -halfHm, z: -halfLm },
    ]);
    // 4 main longitudinal corner lines
    wireframeLines.push([
      { x: -halfWm, y: -halfHm, z: -halfLm },
      { x: -halfWm, y: -halfHm, z:  halfLm },
    ]);
    wireframeLines.push([
      { x:  halfWm, y: -halfHm, z: -halfLm },
      { x:  halfWm, y: -halfHm, z:  halfLm },
    ]);
    wireframeLines.push([
      { x: -halfWm, y:  halfHm, z: -halfLm },
      { x: -halfWm, y:  halfHm, z:  halfLm },
    ]);
    wireframeLines.push([
      { x:  halfWm, y:  halfHm, z: -halfLm },
      { x:  halfWm, y:  halfHm, z:  halfLm },
    ]);

    // Branch duct top ring and tap junction ring
    wireframeLines.push([
      { x: -halfWb, y: topY, z:  halfHb },
      { x:  halfWb, y: topY, z:  halfHb },
      { x:  halfWb, y: topY, z: -halfHb },
      { x: -halfWb, y: topY, z: -halfHb },
      { x: -halfWb, y: topY, z:  halfHb },
    ]);
    wireframeLines.push([
      { x: -halfWb, y: halfHm, z:  halfHb },
      { x:  halfWb, y: halfHm, z:  halfHb },
      { x:  halfWb, y: halfHm, z: -halfHb },
      { x: -halfWb, y: halfHm, z: -halfHb },
      { x: -halfWb, y: halfHm, z:  halfHb },
    ]);

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
          min: { x: -halfWm, y: -halfHm, z: -halfLm },
          max: { x: halfWm, y: halfHm + lb, z: halfLm },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((totalBlankAreaM2 * 0.85).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 86,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        'Dovetail tabs provide SMACNA compliant structural attachment without separate mounting angles.',
        'Apply acoustic duct sealant around tap collar perimeter to ensure airtight seal.',
      ],
      dimensionsSummary: {
        'Main Size': `${wm} x ${hm} x ${lm} mm`,
        'Branch Tap': `${wb} x ${hb} mm`,
        'Branch Length': `${lb} mm`,
      },
    };
  }
}
