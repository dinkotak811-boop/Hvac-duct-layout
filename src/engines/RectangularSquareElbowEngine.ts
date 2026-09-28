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

export class RectangularSquareElbowEngine implements DuctCalculationEngine {
  readonly id = 'rect_square_elbow';
  readonly name = 'Rectangular Square Throat Elbow (90°)';
  readonly nameBn = 'স্কয়ার থ্রোট রেকটেঙ্গুলার এলবো (Square Elbow with Vanes)';
  readonly category = 'elbow' as const;
  readonly description = 'Square throat and square heel 90° miter elbow with integrated turning vane runner rails.';
  readonly descriptionBn = 'সমকোণী (Square Throat) এলবো - টার্নিং ভেন রানার লাইন সহ ২-চিক, ১-থ্রোট ও ১-হিল র্যাপার।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'width',
      label: 'Width (W)',
      labelBn: 'প্রস্থ (Width W)',
      type: 'number',
      defaultValue: 600,
      unit: 'mm',
      min: 150,
      max: 2500,
      step: 10,
    },
    {
      id: 'height',
      label: 'Height / Depth (H)',
      labelBn: 'উচ্চতা / গভীরতা (Height H)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 150,
      max: 2500,
      step: 10,
    },
    {
      id: 'extension',
      label: 'Straight Tangent (mm)',
      labelBn: 'ট্যানজেন্ট দৈর্ঘ্য (মিমি)',
      type: 'number',
      defaultValue: 100,
      unit: 'mm',
      min: 50,
      max: 400,
      step: 10,
      description: 'Straight collar extension before and after miter',
    },
    {
      id: 'turningVanes',
      label: 'Include Turning Vanes',
      labelBn: 'টার্নিং ভেন রানার যুক্ত করুন',
      type: 'select',
      defaultValue: 'yes',
      options: [
        { value: 'yes', label: 'Yes (SMACNA Standard 2" / 4" Spacing)', labelBn: 'হ্যাঁ (SMACNA মানসম্মত)' },
        { value: 'no', label: 'No (High Pressure Drop Warning)', labelBn: 'না' },
      ],
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'four_piece',
      options: [
        { value: 'four_piece', label: '4 Parts (2 Cheeks + Throat + Heel Single / ৪ পার্ট)', labelBn: '৪ পার্ট (সিঙ্গেল সিঙ্গেল ৪টি প্লেট)' },
        { value: 'two_piece_l', label: '2 Parts (L-Type Halves / ২ পার্ট L-টাইপ)', labelBn: '২ পার্ট (২টি L-টাইপ হাফ)' },
        { value: 'one_piece_wrap', label: '1 Part (Continuous Wrapper Body / ১ পার্ট)', labelBn: '১ পার্ট (ফুল র্যাপার বডি)' },
      ],
      description: 'Number of cutting pieces for the square elbow body',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const w = inputs.dimensions.width || 0;
    const h = inputs.dimensions.height || 0;
    const ext = inputs.dimensions.extension || 0;

    if (w <= 0) errors.push('Width must be > 0');
    if (h <= 0) errors.push('Height must be > 0');
    if (ext < 50) errors.push('Straight extension must be at least 50mm for connector cleat installation');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w = inputs.dimensions.width || 600;
    const h = inputs.dimensions.height || 400;
    const ext = inputs.dimensions.extension || 100;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const transAllowance = connSpec.allowancePerEndMm;
    const femalePocket = seamSpec.femalePocketAllowanceMm;
    const maleTongue = seamSpec.maleTongueAllowanceMm;
    const maleAllowance = maleTongue;
    const includeVanes = (inputs.dimensions.turningVanes as unknown as string) !== 'no';

    // Dimensions:
    // Outside heel arm lengths: L1 = ext + w, L2 = ext + w
    // Inside throat arm lengths: ext, ext
    const arm1 = ext + w;
    const arm2 = ext + w;

    // Turning vanes calculation:
    // SMACNA recommends 2" (50mm) or 4.5" (115mm) radius vanes
    const vaneSpacing = w > 600 ? 115 : 60;
    const numVanes = includeVanes ? Math.max(2, Math.floor(w / vaneSpacing) - 1) : 0;

    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'four_piece';
    const parts: FlatPatternPart[] = [];

    // Helper to generate a Cheek Plate
    function createCheek(c: number): FlatPatternPart {
      const lines: Line2D[] = [];
      const contour: Point2D[] = [];

      const p0: Point2D = { x: transAllowance, y: transAllowance };
      const p1: Point2D = { x: transAllowance + arm1, y: transAllowance };
      const p2: Point2D = { x: transAllowance + arm1, y: transAllowance + w };
      const p3: Point2D = { x: transAllowance + w, y: transAllowance + w };
      const p4: Point2D = { x: transAllowance + w, y: transAllowance + arm2 };
      const p5: Point2D = { x: transAllowance, y: transAllowance + arm2 };

      // Perimeter Cut Lines
      lines.push(
        { start: p0, end: p1, type: 'cut', description: 'Outside Heel Arm 1' },
        { start: p1, end: p2, type: 'cut', description: 'Opening 1 Cut' },
        { start: p2, end: p3, type: 'cut', description: 'Inside Throat Arm 1' },
        { start: p3, end: p4, type: 'cut', description: 'Inside Throat Arm 2' },
        { start: p4, end: p5, type: 'cut', description: 'Opening 2 Cut' },
        { start: p5, end: p0, type: 'cut', description: 'Outside Heel Arm 2' }
      );

      // Transverse connector bend lines at openings
      lines.push(
        {
          start: { x: p1.x - transAllowance, y: p1.y },
          end: { x: p2.x - transAllowance, y: p2.y },
          type: 'bend_up',
          bendAngleDeg: 90,
          description: 'Opening 1 TDC Flange Fold',
        },
        {
          start: { x: p5.x, y: p5.y - transAllowance },
          end: { x: p4.x, y: p4.y - transAllowance },
          type: 'bend_up',
          bendAngleDeg: 90,
          description: 'Opening 2 TDC Flange Fold',
        }
      );

      if (maleAllowance > 0) {
        lines.push(
          { start: { x: p0.x, y: p0.y - maleAllowance }, end: { x: p1.x, y: p1.y - maleAllowance }, type: 'seam', description: 'Pittsburgh Single Flange' },
          { start: { x: p5.x - maleAllowance, y: p5.y }, end: { x: p0.x - maleAllowance, y: p0.y }, type: 'seam', description: 'Pittsburgh Single Flange' }
        );
      }

      if (numVanes > 0) {
        lines.push({
          start: p0,
          end: p3,
          type: 'guide',
          description: '45° Miter / Turning Vane Runner Rail Track',
        });
        for (let v = 1; v <= numVanes; v++) {
          const frac = v / (numVanes + 1);
          const vx = p0.x + frac * w;
          const vy = p0.y + frac * w;
          lines.push({
            start: { x: vx - 20, y: vy + 20 },
            end: { x: vx + 20, y: vy - 20 },
            type: 'guide',
            description: `Vane Rail Mounting Notch #${v}`,
          });
        }
      }

      contour.push(p0, p1, p2, p3, p4, p5);

      const cheekBlankW = arm1 + 2 * transAllowance;
      const cheekBlankH = arm2 + 2 * transAllowance;

      const cheekAreaM2 = (w * arm1 + w * ext) / 1e6;
      const cheekWeightKg = cheekAreaM2 * (thickness / 1000) * material.density;

      return {
        id: `square_cheek_${c}`,
        partName: `Square Elbow Cheek #${c} (${c === 1 ? 'Left Cheek' : 'Right Cheek'})`,
        partNameBn: `স্কয়ার এলবো চিক #${c} (${c === 1 ? 'বাম চিক' : 'ডান চিক'})`,
        quantity: 1,
        blankWidthMm: Math.round((cheekBlankW + maleAllowance) * 10) / 10,
        blankLengthMm: Math.round((cheekBlankH + maleAllowance) * 10) / 10,
        areaM2: Number(cheekAreaM2.toFixed(3)),
        weightKg: Number(cheekWeightKg.toFixed(2)),
        lines,
        outerContour: contour,
        labels: [
          {
            text: `Square Elbow Cheek ${w}x${h}mm`,
            position: { x: transAllowance + w / 2, y: transAllowance + w / 2 },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: numVanes > 0 ? `${numVanes} Turning Vanes on 45° Rail` : 'No Vanes',
            position: { x: transAllowance + w / 2, y: transAllowance + w / 2 - 25 },
            fontSize: 14,
            type: 'alignment',
          },
        ],
        bendCount: 2,
        notes: [
          `Arm 1: ${arm1}mm | Arm 2: ${arm2}mm`,
          `SMACNA Turning Vanes: ${numVanes} blades recommended for low pressure drop`,
        ],
      };
    }

    const throatBlankL = 2 * ext + 2 * transAllowance;
    const throatBlankW = h + 2 * femalePocket;
    const heelBlankL = 2 * arm1 + 2 * transAllowance;
    const heelBlankW = h + 2 * femalePocket;

    if (style === 'one_piece_wrap') {
      // 1-Piece continuous wrapper
      const totalWrapL = heelBlankL + throatBlankL;
      const wrapLines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: heelBlankW, y: 0 }, type: 'cut' },
        { start: { x: heelBlankW, y: 0 }, end: { x: heelBlankW, y: totalWrapL }, type: 'cut' },
        { start: { x: heelBlankW, y: totalWrapL }, end: { x: 0, y: totalWrapL }, type: 'cut' },
        { start: { x: 0, y: totalWrapL }, end: { x: 0, y: 0 }, type: 'cut' },
        // Bend lines
        { start: { x: 0, y: heelBlankL / 2 }, end: { x: heelBlankW, y: heelBlankL / 2 }, type: 'bend_up', bendAngleDeg: 90, description: 'Outside Heel 90° Bend' },
        { start: { x: 0, y: heelBlankL }, end: { x: heelBlankW, y: heelBlankL }, type: 'bend_up', bendAngleDeg: 90, description: 'Miter Transition Bend' },
        { start: { x: 0, y: heelBlankL + throatBlankL / 2 }, end: { x: heelBlankW, y: heelBlankL + throatBlankL / 2 }, type: 'bend_up', bendAngleDeg: 90, description: 'Inside Throat 90° Bend' },
      ];
      const areaM2 = (heelBlankW * totalWrapL) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;
      parts.push({
        id: 'square_elbow_full_wrap',
        partName: '1-Piece Continuous Wrap Square Elbow Body',
        partNameBn: '১-পিস ফুল র্যাপ স্কয়ার এলবো বডি',
        quantity: 1,
        blankWidthMm: Math.round(heelBlankW * 10) / 10,
        blankLengthMm: Math.round(totalWrapL * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines: wrapLines,
        outerContour: [{ x: 0, y: 0 }, { x: heelBlankW, y: 0 }, { x: heelBlankW, y: totalWrapL }, { x: 0, y: totalWrapL }],
        labels: [
          { text: `1-Piece Wrap Square Elbow ${w}x${h}mm`, position: { x: heelBlankW / 2, y: totalWrapL / 2 }, fontSize: 20, type: 'part_name' },
        ],
        bendCount: 3,
      });
    } else if (style === 'two_piece_l') {
      // 2 Parts: 2 L-Type sections
      for (let p = 1; p <= 2; p++) {
        const isFirst = p === 1;
        const curL = isFirst ? throatBlankL : heelBlankL;
        const curW = isFirst ? throatBlankW : heelBlankW;
        const halfL = curL / 2;
        const lines: Line2D[] = [
          { start: { x: 0, y: 0 }, end: { x: curW, y: 0 }, type: 'cut' },
          { start: { x: curW, y: 0 }, end: { x: curW, y: curL }, type: 'cut' },
          { start: { x: curW, y: curL }, end: { x: 0, y: curL }, type: 'cut' },
          { start: { x: 0, y: curL }, end: { x: 0, y: 0 }, type: 'cut' },
          { start: { x: 0, y: halfL }, end: { x: curW, y: halfL }, type: 'bend_up', bendAngleDeg: 90, description: isFirst ? 'Throat 90° Corner Bend' : 'Heel 90° Corner Bend' },
        ];
        const areaM2 = (curW * curL) / 1e6;
        const weightKg = areaM2 * (thickness / 1000) * material.density;
        parts.push({
          id: `square_elbow_l_section_${p}`,
          partName: isFirst ? 'L-Section #1 of 2 (Inside Throat L-Panel)' : 'L-Section #2 of 2 (Outside Heel L-Panel)',
          partNameBn: isFirst ? 'L-সেকশন #১ (ইনসাইড থ্রোট L-প্লেট)' : 'L-সেকশন #২ (আউটসাইড হিল L-প্লেট)',
          quantity: 1,
          blankWidthMm: Math.round(curW * 10) / 10,
          blankLengthMm: Math.round(curL * 10) / 10,
          areaM2: Number(areaM2.toFixed(3)),
          weightKg: Number(weightKg.toFixed(2)),
          lines,
          outerContour: [{ x: 0, y: 0 }, { x: curW, y: 0 }, { x: curW, y: curL }, { x: 0, y: curL }],
          labels: [
            { text: `L-Section #${p} (${Math.round(curW)}x${Math.round(curL)}mm)`, position: { x: curW / 2, y: curL / 2 }, fontSize: 18, type: 'part_name' },
          ],
          bendCount: 1,
        });
      }
    } else {
      // 4 Parts (default): 2 Cheeks + Throat Wrapper + Heel Wrapper
      parts.push(createCheek(1));
      parts.push(createCheek(2));

      // Inside Throat Wrapper
      parts.push({
        id: 'square_throat_wrapper',
        partName: 'Inside Throat Wrapper (90° Corner)',
        partNameBn: 'ইনসাইড থ্রোট র্যাপার (ভেতরের ৯০° প্লেট)',
        quantity: 1,
        blankWidthMm: Math.round(throatBlankW * 10) / 10,
        blankLengthMm: Math.round(throatBlankL * 10) / 10,
        areaM2: Number(((throatBlankW * throatBlankL) / 1e6).toFixed(3)),
        weightKg: Number((((throatBlankW * throatBlankL) / 1e6) * (thickness / 1000) * material.density).toFixed(2)),
        lines: [
          { start: { x: 0, y: 0 }, end: { x: throatBlankW, y: 0 }, type: 'cut' },
          { start: { x: throatBlankW, y: 0 }, end: { x: throatBlankW, y: throatBlankL }, type: 'cut' },
          { start: { x: throatBlankW, y: throatBlankL }, end: { x: 0, y: throatBlankL }, type: 'cut' },
          { start: { x: 0, y: throatBlankL }, end: { x: 0, y: 0 }, type: 'cut' },
          {
            start: { x: 0, y: throatBlankL / 2 },
            end: { x: throatBlankW, y: throatBlankL / 2 },
            type: 'bend_up',
            bendAngleDeg: 90,
            description: 'Center 90° Inside Corner Bend',
          },
          { start: { x: 0, y: transAllowance }, end: { x: throatBlankW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
          { start: { x: 0, y: throatBlankL - transAllowance }, end: { x: throatBlankW, y: throatBlankL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        ],
        outerContour: [
          { x: 0, y: 0 },
          { x: throatBlankW, y: 0 },
          { x: throatBlankW, y: throatBlankL },
          { x: 0, y: throatBlankL },
        ],
        labels: [
          {
            text: `Throat Wrapper 90° Fold (Arm: ${ext}mm)`,
            position: { x: throatBlankW / 2, y: throatBlankL / 2 },
            fontSize: 18,
            type: 'part_name',
          },
        ],
        bendCount: 3,
      });

      // Outside Heel Wrapper
      parts.push({
        id: 'square_heel_wrapper',
        partName: 'Outside Heel Wrapper (90° Corner)',
        partNameBn: 'আউটসাইড হিল র্যাপার (বাইরের ৯০° প্লেট)',
        quantity: 1,
        blankWidthMm: Math.round(heelBlankW * 10) / 10,
        blankLengthMm: Math.round(heelBlankL * 10) / 10,
        areaM2: Number(((heelBlankW * heelBlankL) / 1e6).toFixed(3)),
        weightKg: Number((((heelBlankW * heelBlankL) / 1e6) * (thickness / 1000) * material.density).toFixed(2)),
        lines: [
          { start: { x: 0, y: 0 }, end: { x: heelBlankW, y: 0 }, type: 'cut' },
          { start: { x: heelBlankW, y: 0 }, end: { x: heelBlankW, y: heelBlankL }, type: 'cut' },
          { start: { x: heelBlankW, y: heelBlankL }, end: { x: 0, y: heelBlankL }, type: 'cut' },
          { start: { x: 0, y: heelBlankL }, end: { x: 0, y: 0 }, type: 'cut' },
          {
            start: { x: 0, y: heelBlankL / 2 },
            end: { x: heelBlankW, y: heelBlankL / 2 },
            type: 'bend_up',
            bendAngleDeg: 90,
            description: 'Center 90° Outside Heel Bend',
          },
          { start: { x: 0, y: transAllowance }, end: { x: heelBlankW, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
          { start: { x: 0, y: heelBlankL - transAllowance }, end: { x: heelBlankW, y: heelBlankL - transAllowance }, type: 'bend_up', bendAngleDeg: 90 },
        ],
        outerContour: [
          { x: 0, y: 0 },
          { x: heelBlankW, y: 0 },
          { x: heelBlankW, y: heelBlankL },
          { x: 0, y: heelBlankL },
        ],
        labels: [
          {
            text: `Heel Wrapper 90° Fold (Arm: ${arm1}mm)`,
            position: { x: heelBlankW / 2, y: heelBlankL / 2 },
            fontSize: 18,
            type: 'part_name',
          },
        ],
        bendCount: 3,
      });
    }

    // 3D Geometry: True L-shaped hollow duct with open inlet and outlet
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];
    const halfH = h / 2;

    // 6 profile points in X-Z plane:
    // P0: (0, 0) - Outside Heel
    // P1: (arm1, 0) - Opening 1 Outer
    // P2: (arm1, w) - Opening 1 Inner
    // P3: (w, w) - Inside Throat
    // P4: (w, arm2) - Opening 2 Inner
    // P5: (0, arm2) - Opening 2 Outer
    const lProfile = [
      { x: 0, z: 0 },       // 0
      { x: arm1, z: 0 },    // 1
      { x: arm1, z: w },    // 2
      { x: w, z: w },       // 3
      { x: w, z: arm2 },    // 4
      { x: 0, z: arm2 },    // 5
    ];

    // Bottom profile (Y = -halfH) -> indices 0..5
    lProfile.forEach(p => vertices.push(p.x, -halfH, p.z));
    // Top profile (Y = +halfH) -> indices 6..11
    lProfile.forEach(p => vertices.push(p.x, halfH, p.z));

    // Connect walls with quads:
    // Wall 0: Heel arm 1 (0 -> 1)
    // Wall 1: Throat arm 1 (2 -> 3)
    // Wall 2: Throat arm 2 (3 -> 4)
    // Wall 3: Heel arm 2 (5 -> 0)
    // Note: Opening 1 (1 -> 2) and Opening 2 (4 -> 5) are OPEN for airflow!
    const closedEdges = [
      [0, 1], // Heel Arm 1
      [2, 3], // Throat Arm 1
      [3, 4], // Throat Arm 2
      [5, 0], // Heel Arm 2
    ];

    closedEdges.forEach(([i1, i2]) => {
      const b1 = i1;
      const b2 = i2;
      const t1 = i1 + 6;
      const t2 = i2 + 6;
      // Outward facing triangles
      indices.push(b1, b2, t2);
      indices.push(b1, t2, t1);
    });

    // Top and Bottom Cheek Plates:
    // Triangulate 6-point polygon (P0, P1, P2, P3, P4, P5):
    // Can be split into 2 rectangles:
    // Rect 1: [0, 1, 2, 3'] where 3' is (w, 0)... or:
    // Triangles: (0, 1, 3), (1, 2, 3), (0, 3, 5), (3, 4, 5)
    // Bottom cheek (Y = -halfH)
    indices.push(0, 3, 1,  1, 3, 2,  0, 5, 3,  3, 5, 4);
    // Top cheek (Y = +halfH)
    indices.push(6, 7, 9,  7, 8, 9,  6, 9, 11, 9, 10, 11);

    // Turning vanes inside the corner (curved vane blades along diagonal)
    if (numVanes > 0) {
      for (let v = 1; v <= numVanes; v++) {
        const frac = v / (numVanes + 1);
        const vx = frac * w;
        const vz = frac * w;
        wireframeLines.push([
          { x: vx - 25, y: -halfH + 10, z: vz + 25 },
          { x: vx + 25, y: -halfH + 10, z: vz - 25 },
        ]);
        wireframeLines.push([
          { x: vx - 25, y: halfH - 10, z: vz + 25 },
          { x: vx + 25, y: halfH - 10, z: vz - 25 },
        ]);
      }
    }

    // Wireframe boundary loops
    wireframeLines.push(lProfile.map(p => ({ x: p.x, y: -halfH, z: p.z })));
    wireframeLines.push(lProfile.map(p => ({ x: p.x, y: halfH, z: p.z })));

    // Vertical corner creases
    [0, 1, 2, 3, 4, 5].forEach(i => {
      wireframeLines.push([
        { x: lProfile[i].x, y: -halfH, z: lProfile[i].z },
        { x: lProfile[i].x, y:  halfH, z: lProfile[i].z },
      ]);
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
          min: { x: 0, y: -halfH, z: 0 },
          max: { x: arm1, y: halfH, z: arm2 },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((totalBlankAreaM2 * 0.88).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 84,
      smacnaCompliant: true,
      warnings: !includeVanes ? ['Square elbows without turning vanes have high pressure drop (loss coefficient ~1.3). Turning vanes strongly recommended.'] : [],
      recommendations: [
        `Turning Vanes: ${numVanes} single/double thickness vanes provide smooth 90° air redirection.`,
        'Fasten vane runners with pop rivets or self-drilling screws spaced every 100mm along the 45° track.',
      ],
      dimensionsSummary: {
        'Size (W x H)': `${w} x ${h} mm`,
        'Arm 1 Length': `${arm1} mm`,
        'Arm 2 Length': `${arm2} mm`,
        'Turning Vanes': `${numVanes} Pieces`,
      },
    };
  }
}
