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

export class RectangularReducerEngine implements DuctCalculationEngine {
  readonly id = 'rect_concentric_reducer';
  readonly name = 'Rectangular Reducer / Transition';
  readonly nameBn = 'রেকটেঙ্গুলার রিডিউসার (Rectangular Transition)';
  readonly category = 'reducer' as const;
  readonly description = 'Tapered rectangular duct transition connecting different duct sizes (Concentric, FOB, FOT, FOS).';
  readonly descriptionBn = 'আয়তাকার সাইজ পরিবর্তনকারী রিডিউসার - কনসেন্ট্রিক ও ফ্ল্যাট-অন-বটম (FOB) স্টাইল সহ।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'w1',
      label: 'Inlet Width (W1)',
      labelBn: 'ইনলেট প্রস্থ (W1)',
      type: 'number',
      defaultValue: 700,
      unit: 'mm',
      min: 150,
      max: 2500,
      step: 10,
    },
    {
      id: 'h1',
      label: 'Inlet Height (H1)',
      labelBn: 'ইনলেট উচ্চতা (H1)',
      type: 'number',
      defaultValue: 450,
      unit: 'mm',
      min: 150,
      max: 2500,
      step: 10,
    },
    {
      id: 'w2',
      label: 'Outlet Width (W2)',
      labelBn: 'আউটলেট প্রস্থ (W2)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 100,
      max: 2500,
      step: 10,
    },
    {
      id: 'h2',
      label: 'Outlet Height (H2)',
      labelBn: 'আউটলেট উচ্চতা (H2)',
      type: 'number',
      defaultValue: 300,
      unit: 'mm',
      min: 100,
      max: 2500,
      step: 10,
    },
    {
      id: 'length',
      label: 'Length (L)',
      labelBn: 'দৈর্ঘ্য (Length L)',
      type: 'number',
      defaultValue: 500,
      unit: 'mm',
      min: 150,
      max: 2000,
      step: 10,
    },
    {
      id: 'alignment',
      label: 'Alignment',
      labelBn: 'অ্যালাইনমেন্ট',
      type: 'select',
      defaultValue: 'concentric',
      options: [
        { value: 'concentric', label: 'Concentric (Centered taper)', labelBn: 'কনসেন্ট্রিক (চারদিকে সমান)' },
        { value: 'fob', label: 'Flat On Bottom (FOB)', labelBn: 'ফ্ল্যাট অন বটম (তলায় সমান)' },
        { value: 'fot', label: 'Flat On Top (FOT)', labelBn: 'ফ্ল্যাট অন টপ (উপরে সমান)' },
        { value: 'fos', label: 'Flat On One Side (FOS)', labelBn: 'এক পাশে ফ্ল্যাট' },
      ],
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'four_piece',
      options: [
        { value: 'four_piece', label: '4 Parts (Top, Bot, Left, Right Single / ৪ পার্ট)', labelBn: '৪ পার্ট (সিঙ্গেল সিঙ্গেল ৪টি প্যানেল)' },
        { value: 'two_piece_l', label: '2 Parts (L-Type Tapered Wraps / ২ পার্ট)', labelBn: '২ পার্ট (২টি L-টাইপ সেকশন)' },
        { value: 'one_piece_wrap', label: '1 Part (Full Tapered Wrap / ১ পার্ট)', labelBn: '১ পার্ট (ফুল র্যাপ ট্রানজিশন)' },
      ],
      description: 'Panel segmentation for CNC sheet cutting',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const { w1, h1, w2, h2, length } = inputs.dimensions;
    if (!w1 || w1 <= 0) errors.push('Inlet Width must be > 0');
    if (!h1 || h1 <= 0) errors.push('Inlet Height must be > 0');
    if (!w2 || w2 <= 0) errors.push('Outlet Width must be > 0');
    if (!h2 || h2 <= 0) errors.push('Outlet Height must be > 0');
    if (!length || length <= 0) errors.push('Length must be > 0');
    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w1 = inputs.dimensions.w1 || 700;
    const h1 = inputs.dimensions.h1 || 450;
    const w2 = inputs.dimensions.w2 || 400;
    const h2 = inputs.dimensions.h2 || 300;
    const l = inputs.dimensions.length || 500;
    const alignment = (inputs.dimensions.alignment as unknown as string) || 'concentric';

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const femalePocket = seamSpec.femalePocketAllowanceMm;
    const maleTongue = seamSpec.maleTongueAllowanceMm;
    const transAllowance = connSpec.allowancePerEndMm;

    let deltaH_top = (h1 - h2) / 2;
    let deltaH_bot = (h1 - h2) / 2;
    let deltaW_left = (w1 - w2) / 2;
    let deltaW_right = (w1 - w2) / 2;

    if (alignment === 'fob') {
      deltaH_bot = 0;
      deltaH_top = h1 - h2;
    } else if (alignment === 'fot') {
      deltaH_top = 0;
      deltaH_bot = h1 - h2;
    } else if (alignment === 'fos') {
      deltaW_left = 0;
      deltaW_right = w1 - w2;
    }

    const slantTop = Math.sqrt(l * l + deltaH_top * deltaH_top);
    const slantBot = Math.sqrt(l * l + deltaH_bot * deltaH_bot);
    const slantLeft = Math.sqrt(l * l + deltaW_left * deltaW_left);
    const slantRight = Math.sqrt(l * l + deltaW_right * deltaW_right);

    const parts: FlatPatternPart[] = [];

    function createTrapezoidPanel(
      id: string,
      name: string,
      nameBn: string,
      baseW: number,
      topW: number,
      slantL: number,
      hasFemaleSeam: boolean
    ): FlatPatternPart {
      const pocket = hasFemaleSeam ? femalePocket : maleTongue;
      const bW = Math.max(baseW, topW) + 2 * pocket;
      const bL = slantL + 2 * transAllowance;

      const lines: Line2D[] = [];
      const xOffset = (baseW - topW) / 2;

      // Bottom edge (Inlet)
      const pBtmL = { x: pocket, y: transAllowance };
      const pBtmR = { x: pocket + baseW, y: transAllowance };

      // Top edge (Outlet)
      const pTopL = { x: pocket + xOffset, y: transAllowance + slantL };
      const pTopR = { x: pocket + xOffset + topW, y: transAllowance + slantL };

      lines.push(
        { start: pBtmL, end: pBtmR, type: 'cut', description: 'Inlet End Cut' },
        { start: pBtmR, end: pTopR, type: 'cut', description: 'Side Edge Right' },
        { start: pTopR, end: pTopL, type: 'cut', description: 'Outlet End Cut' },
        { start: pTopL, end: pBtmL, type: 'cut', description: 'Side Edge Left' }
      );

      // Transverse connector lines
      if (transAllowance > 0) {
        lines.push(
          { start: pBtmL, end: pBtmR, type: 'bend_up', bendAngleDeg: 90, description: 'Inlet TDC Fold' },
          { start: pTopL, end: pTopR, type: 'bend_up', bendAngleDeg: 90, description: 'Outlet TDC Fold' }
        );
      }

      // Seam allowance lines
      if (pocket > 0) {
        lines.push({
          start: { x: pBtmL.x - pocket, y: pBtmL.y },
          end: { x: pTopL.x - pocket, y: pTopL.y },
          type: 'seam',
          description: hasFemaleSeam ? 'Pittsburgh Pocket' : 'Single Flange',
        });
      }

      const areaM2 = (0.5 * (baseW + topW) * slantL) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;

      return {
        id,
        partName: name,
        partNameBn: nameBn,
        quantity: 1,
        blankWidthMm: Math.round(bW * 10) / 10,
        blankLengthMm: Math.round(bL * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        outerContour: [pBtmL, pBtmR, pTopR, pTopL],
        labels: [
          { text: `${name} (${baseW}->${topW}mm)`, position: { x: bW / 2, y: bL / 2 }, fontSize: 18, type: 'part_name' },
          { text: `Slant L: ${Math.round(slantL)}mm`, position: { x: bW / 2, y: bL / 2 - 30 }, fontSize: 15, type: 'dimension' },
        ],
        bendCount: 2,
      };
    }

    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'four_piece';

    if (style === 'one_piece_wrap') {
      // 1 continuous tapered wrap: Top + Left + Bottom + Right
      const totalInletPerim = 2 * w1 + 2 * h1 + femalePocket + maleTongue;
      const avgSlant = (slantTop + slantBot + slantLeft + slantRight) / 4;
      const bL = avgSlant + 2 * transAllowance;
      const areaM2 = (0.5 * (2 * w1 + 2 * h1 + 2 * w2 + 2 * h2) * avgSlant) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;
      const lines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: totalInletPerim, y: 0 }, type: 'cut', description: 'Inlet Perimeter Cut' },
        { start: { x: totalInletPerim, y: 0 }, end: { x: totalInletPerim, y: bL }, type: 'cut', description: 'Seam Edge Right' },
        { start: { x: totalInletPerim, y: bL }, end: { x: 0, y: bL }, type: 'cut', description: 'Outlet Perimeter Cut' },
        { start: { x: 0, y: bL }, end: { x: 0, y: 0 }, type: 'cut', description: 'Seam Edge Left' },
      ];
      // 3 bend lines between 4 panels
      const bx1 = femalePocket + w1;
      const bx2 = bx1 + h1;
      const bx3 = bx2 + w1;
      [bx1, bx2, bx3].forEach((bx, idx) => {
        lines.push({ start: { x: bx, y: transAllowance }, end: { x: bx, y: bL - transAllowance }, type: 'bend_down', bendAngleDeg: 90, description: `Corner Bend ${idx + 1}` });
      });
      parts.push({
        id: 'full_taper_wrap',
        partName: `1-Piece Tapered Wrap Reducer (${w1}x${h1}->${w2}x${h2})`,
        partNameBn: `১-পিস ফুল র্যাপ রিডিউসার (${w1}x${h1}->${w2}x${h2}মিমি)`,
        quantity: 1,
        blankWidthMm: Math.round(totalInletPerim * 10) / 10,
        blankLengthMm: Math.round(bL * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        outerContour: [{ x: 0, y: 0 }, { x: totalInletPerim, y: 0 }, { x: totalInletPerim, y: bL }, { x: 0, y: bL }],
        labels: [
          { text: `1-Piece Wrap Reducer ${w1}x${h1} -> ${w2}x${h2}mm`, position: { x: totalInletPerim / 2, y: bL / 2 }, fontSize: 20, type: 'part_name' },
        ],
        bendCount: 3,
      });
    } else if (style === 'two_piece_l') {
      // 2 L-shaped tapered sections: Top+Left and Bottom+Right
      for (let p = 1; p <= 2; p++) {
        const isFirst = p === 1;
        const bW1 = isFirst ? w1 : w1;
        const bH1 = isFirst ? h1 : h1;
        const sL = isFirst ? Math.max(slantTop, slantLeft) : Math.max(slantBot, slantRight);
        const lBlankW = femalePocket + bW1 + bH1 + maleTongue;
        const lBlankL = sL + 2 * transAllowance;
        const bendX = femalePocket + bW1;
        const areaM2 = (0.5 * (w1 + w2 + h1 + h2) * sL) / 1e6;
        const weightKg = areaM2 * (thickness / 1000) * material.density;
        const lines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: lBlankW, y: 0 }, type: 'cut' },
          { start: { x: lBlankW, y: 0 }, end: { x: lBlankW, y: lBlankL }, type: 'cut' },
          { start: { x: lBlankW, y: lBlankL }, end: { x: 0, y: lBlankL }, type: 'cut' },
          { start: { x: 0, y: lBlankL }, end: { x: 0, y: 0 }, type: 'cut' },
          { start: { x: bendX, y: transAllowance }, end: { x: bendX, y: lBlankL - transAllowance }, type: 'bend_down', bendAngleDeg: 90, description: 'L-Shape Corner Bend' },
        ];
        parts.push({
          id: `reducer_l_section_${p}`,
          partName: `L-Shape Tapered Section #${p} of 2`,
          partNameBn: `L-শেপ রিডিউসার সেকশন #${p} (২টির মধ্যে)`,
          quantity: 1,
          blankWidthMm: Math.round(lBlankW * 10) / 10,
          blankLengthMm: Math.round(lBlankL * 10) / 10,
          areaM2: Number(areaM2.toFixed(3)),
          weightKg: Number(weightKg.toFixed(2)),
          lines,
          outerContour: [{ x: 0, y: 0 }, { x: lBlankW, y: 0 }, { x: lBlankW, y: lBlankL }, { x: 0, y: lBlankL }],
          labels: [
            { text: `L-Section #${p} (${w1}x${h1}->${w2}x${h2}mm)`, position: { x: lBlankW / 2, y: lBlankL / 2 }, fontSize: 18, type: 'part_name' },
          ],
          bendCount: 1,
        });
      }
    } else {
      // 4-piece individual panels (default)
      parts.push(createTrapezoidPanel('top_panel', 'Top Panel (Single)', 'টপ প্যানেল (সিঙ্গেল)', w1, w2, slantTop, true));
      parts.push(createTrapezoidPanel('bottom_panel', 'Bottom Panel (Single)', 'বটম প্যানেল (সিঙ্গেল)', w1, w2, slantBot, true));
      parts.push(createTrapezoidPanel('left_panel', 'Left Side Panel (Single)', 'বাম সাইড প্যানেল (সিঙ্গেল)', h1, h2, slantLeft, false));
      parts.push(createTrapezoidPanel('right_panel', 'Right Side Panel (Single)', 'ডান সাইড প্যানেল (সিঙ্গেল)', h1, h2, slantRight, false));
    }

    // 3D Geometry: Aligned rectangular transition hollow box open at both ends
    const halfL = l / 2;

    // Inlet face centered at origin (Z = -halfL)
    const inBL = { x: -w1 / 2, y: -h1 / 2 };
    const inBR = { x:  w1 / 2, y: -h1 / 2 };
    const inTR = { x:  w1 / 2, y:  h1 / 2 };
    const inTL = { x: -w1 / 2, y:  h1 / 2 };

    // Outlet face (Z = +halfL) with position adjusted by alignment:
    let outX_center = 0;
    let outY_center = 0;

    if (alignment === 'fob') {
      outY_center = -h1 / 2 + h2 / 2; // Flat on bottom
    } else if (alignment === 'fot') {
      outY_center =  h1 / 2 - h2 / 2; // Flat on top
    } else if (alignment === 'fos') {
      outX_center = -w1 / 2 + w2 / 2; // Flat on left side
    }

    const outBL = { x: outX_center - w2 / 2, y: outY_center - h2 / 2 };
    const outBR = { x: outX_center + w2 / 2, y: outY_center - h2 / 2 };
    const outTR = { x: outX_center + w2 / 2, y: outY_center + h2 / 2 };
    const outTL = { x: outX_center - w2 / 2, y: outY_center + h2 / 2 };

    const vertices: number[] = [
      // Inlet face (z = -halfL): 0, 1, 2, 3
      inBL.x, inBL.y, -halfL,
      inBR.x, inBR.y, -halfL,
      inTR.x, inTR.y, -halfL,
      inTL.x, inTL.y, -halfL,
      // Outlet face (z = +halfL): 4, 5, 6, 7
      outBL.x, outBL.y, halfL,
      outBR.x, outBR.y, halfL,
      outTR.x, outTR.y, halfL,
      outTL.x, outTL.y, halfL,
    ];

    // 4 Hollow side walls (Bottom, Top, Right, Left)
    const indices: number[] = [
      0, 1, 5,  0, 5, 4, // Bottom
      3, 6, 2,  3, 7, 6, // Top
      1, 2, 6,  1, 6, 5, // Right
      0, 4, 7,  0, 7, 3, // Left
    ];

    const wireframeLines: Point3D[][] = [
      [
        { x: inBL.x, y: inBL.y, z: -halfL },
        { x: inBR.x, y: inBR.y, z: -halfL },
        { x: inTR.x, y: inTR.y, z: -halfL },
        { x: inTL.x, y: inTL.y, z: -halfL },
        { x: inBL.x, y: inBL.y, z: -halfL },
      ],
      [
        { x: outBL.x, y: outBL.y, z: halfL },
        { x: outBR.x, y: outBR.y, z: halfL },
        { x: outTR.x, y: outTR.y, z: halfL },
        { x: outTL.x, y: outTL.y, z: halfL },
        { x: outBL.x, y: outBL.y, z: halfL },
      ],
      [{ x: inBL.x, y: inBL.y, z: -halfL }, { x: outBL.x, y: outBL.y, z: halfL }],
      [{ x: inBR.x, y: inBR.y, z: -halfL }, { x: outBR.x, y: outBR.y, z: halfL }],
      [{ x: inTR.x, y: inTR.y, z: -halfL }, { x: outTR.x, y: outTR.y, z: halfL }],
      [{ x: inTL.x, y: inTL.y, z: -halfL }, { x: outTL.x, y: outTL.y, z: halfL }],
    ];

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
          min: { x: -w1 / 2, y: -h1 / 2, z: -halfL },
          max: { x:  w1 / 2, y:  h1 / 2, z:  halfL },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((parts.reduce((a, b) => a + b.areaM2, 0)).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 85,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        `Slope Angle Top: ${(((Math.atan(deltaH_top / l)) * 180) / Math.PI).toFixed(1)}°`,
        alignment === 'fob' ? 'Flat On Bottom (FOB) ensures zero water/condensation trapping and cleans easily.' : 'Concentric provides uniform velocity distribution.',
      ],
      dimensionsSummary: {
        'Inlet': `${w1} x ${h1} mm`,
        'Outlet': `${w2} x ${h2} mm`,
        'Length': `${l} mm`,
        'Alignment': alignment.toUpperCase(),
      },
    };
  }
}
