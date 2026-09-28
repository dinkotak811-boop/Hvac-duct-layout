import {
  DuctCalculationEngine,
} from './DuctCalculationEngine';
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
import { calculateBendParameters } from '../standards/bendDeduction';
import { createVNotch, createCornerNotchLines } from '../standards/notchLibrary';

export class RectangularStraightEngine implements DuctCalculationEngine {
  readonly id = 'rect_straight';
  readonly name = 'Rectangular Straight Duct';
  readonly nameBn = 'রেকটেঙ্গুলার সোজা ডাক্ট (Rectangular Straight)';
  readonly category = 'straight' as const;
  readonly description = 'Standard straight rectangular sheet metal duct. Configurable as 2-piece L-shape, 4-piece panel, or 1-piece wrap.';
  readonly descriptionBn = 'স্ট্যান্ডার্ড সোজা আয়তাকার ডাক্ট। ২-পিস L-শেপ বা ১-পিস বা ৪-পিস প্যানেল হিসেবে ডেভেলপমেন্ট।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'width',
      label: 'Width (W)',
      labelBn: 'প্রস্থ (Width W)',
      type: 'number',
      defaultValue: 600,
      unit: 'mm',
      min: 100,
      max: 3000,
      step: 10,
      description: 'Horizontal duct opening width',
    },
    {
      id: 'height',
      label: 'Height (H)',
      labelBn: 'উচ্চতা (Height H)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 100,
      max: 3000,
      step: 10,
      description: 'Vertical duct opening height',
    },
    {
      id: 'length',
      label: 'Length (L)',
      labelBn: 'দৈর্ঘ্য (Length L)',
      type: 'number',
      defaultValue: 1200,
      unit: 'mm',
      min: 100,
      max: 3000,
      step: 10,
      description: 'Duct section length (standard 1200mm or 1500mm coil)',
    },
    {
      id: 'fabricationStyle',
      label: 'Fabrication Style',
      labelBn: 'ফেব্রিকেশন স্টাইল',
      type: 'select',
      defaultValue: 'two_piece_l',
      options: [
        { value: 'two_piece_l', label: '2-Piece L-Shape (Standard Industry)', labelBn: '২-পিস L-শেপ (স্ট্যান্ডার্ড)' },
        { value: 'one_piece_wrap', label: '1-Piece Wrap-Around (Small ducts)', labelBn: '১-পিস ফুল র্যাপ' },
        { value: 'four_piece', label: '4-Piece Individual Panels (Large ducts)', labelBn: '৪-পিস আলাদা প্যানেল' },
      ],
      description: 'Number of sheet metal sections making up the duct cross-section',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const w = inputs.dimensions.width || 0;
    const h = inputs.dimensions.height || 0;
    const l = inputs.dimensions.length || 0;

    if (w <= 0) errors.push('Width must be greater than 0 mm');
    if (h <= 0) errors.push('Height must be greater than 0 mm');
    if (l <= 0) errors.push('Length must be greater than 0 mm');

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w = inputs.dimensions.width || 600;
    const h = inputs.dimensions.height || 400;
    const l = inputs.dimensions.length || 1200;
    const style = (inputs.dimensions.fabricationStyle as unknown as string) || inputs.cuttingLayout || 'two_piece_l';

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const bendDeduction = calculateBendParameters(thickness, 90, 1.0, material.defaultKFactor).bendDeductionMm;
    const transAllowance = connSpec.allowancePerEndMm;
    const femaleSeam = seamSpec.femalePocketAllowanceMm;
    const maleSeam = seamSpec.maleTongueAllowanceMm;

    const parts: FlatPatternPart[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    const smacna = getSmacnaRecommendedGauge(Math.max(w, h));
    if (inputs.gauge > smacna.recommendedGauge) {
      warnings.push(`Selected gauge (${inputs.gauge} Ga / ${thickness}mm) is thinner than SMACNA recommendation (${smacna.recommendedGauge} Ga / ${smacna.minThicknessMm}mm) for ${Math.max(w, h)}mm duct.`);
    }
    recommendations.push(smacna.reinforcementNote);

    const blankLength = l + 2 * transAllowance;

    if (style === 'two_piece_l' || style === undefined) {
      // 2 identical L-sections: [female allowance] + W + [corner bend] + H + [male tongue]
      // Corner bend width = W, then 90° bend, then H
      const blankWidth = femaleSeam + w + h + maleSeam - bendDeduction;

      for (let p = 1; p <= 2; p++) {
        const lines: Line2D[] = [];
        const bendX = femaleSeam + w;

        // Cut Lines - Outer boundary
        // Bottom edge
        lines.push({
          start: { x: 0, y: 0 },
          end: { x: blankWidth, y: 0 },
          type: 'cut',
          description: 'Bottom Edge',
        });
        // Right edge
        lines.push({
          start: { x: blankWidth, y: 0 },
          end: { x: blankWidth, y: blankLength },
          type: 'cut',
          description: 'Male Tongue Seam Edge',
        });
        // Top edge
        lines.push({
          start: { x: blankWidth, y: blankLength },
          end: { x: 0, y: blankLength },
          type: 'cut',
          description: 'Top Edge',
        });
        // Left edge
        lines.push({
          start: { x: 0, y: blankLength },
          end: { x: 0, y: 0 },
          type: 'cut',
          description: 'Female Pocket Seam Edge',
        });

        // Transverse Connector fold lines (TDC / S&D)
        if (transAllowance > 0) {
          lines.push(
            {
              start: { x: 0, y: transAllowance },
              end: { x: blankWidth, y: transAllowance },
              type: 'bend_up',
              bendAngleDeg: 90,
              description: `Connector Fold (${connSpec.name})`,
            },
            {
              start: { x: 0, y: blankLength - transAllowance },
              end: { x: blankWidth, y: blankLength - transAllowance },
              type: 'bend_up',
              bendAngleDeg: 90,
              description: `Connector Fold (${connSpec.name})`,
            }
          );

          // Corner V-notches along the connector fold lines at the corner bend
          lines.push(...createVNotch({ x: bendX, y: 0 }, transAllowance, connSpec.notchAngleDeg, 'horizontal_bottom'));
          lines.push(...createVNotch({ x: bendX, y: blankLength }, transAllowance, connSpec.notchAngleDeg, 'horizontal_top'));

          // Corner relief notches for Pittsburgh seam clearance
          if (femaleSeam > 0) {
            lines.push(...createCornerNotchLines({ x: 0, y: 0 }, transAllowance, femaleSeam, 'bottom_left'));
            lines.push(...createCornerNotchLines({ x: 0, y: blankLength }, transAllowance, femaleSeam, 'top_left'));
          }
          if (maleSeam > 0) {
            lines.push(...createCornerNotchLines({ x: blankWidth, y: 0 }, transAllowance, maleSeam, 'bottom_right'));
            lines.push(...createCornerNotchLines({ x: blankWidth, y: blankLength }, transAllowance, maleSeam, 'top_right'));
          }
        }

        // Corner 90° Bend Line
        lines.push({
          start: { x: bendX, y: transAllowance },
          end: { x: bendX, y: blankLength - transAllowance },
          type: 'bend_down',
          bendAngleDeg: 90,
          description: 'Corner 90° Bend Line',
        });

        // Seam fold indicator lines
        if (femaleSeam > 0) {
          lines.push({
            start: { x: femaleSeam, y: transAllowance },
            end: { x: femaleSeam, y: blankLength - transAllowance },
            type: 'seam',
            description: 'Pittsburgh Pocket Fold Line',
          });
        }
        if (maleSeam > 0) {
          lines.push({
            start: { x: blankWidth - maleSeam, y: transAllowance },
            end: { x: blankWidth - maleSeam, y: blankLength - transAllowance },
            type: 'seam',
            description: 'Single Edge Flange Line',
          });
        }

        const areaM2 = (blankWidth * blankLength) / 1e6;
        const weightKg = areaM2 * (thickness / 1000) * material.density;

        const part: FlatPatternPart = {
          id: `l_section_${p}`,
          partName: `L-Shape Section #${p} of 2`,
          partNameBn: `L-সেকশন #${p} (২টির মধ্যে)`,
          quantity: 1,
          blankWidthMm: Math.round(blankWidth * 10) / 10,
          blankLengthMm: Math.round(blankLength * 10) / 10,
          areaM2: Number(areaM2.toFixed(3)),
          weightKg: Number(weightKg.toFixed(2)),
          lines,
          outerContour: [
            { x: 0, y: 0 },
            { x: blankWidth, y: 0 },
            { x: blankWidth, y: blankLength },
            { x: 0, y: blankLength },
          ],
          labels: [
            {
              text: `L-Section ${w}x${h}x${l}mm (${p}/2)`,
              position: { x: blankWidth / 2, y: blankLength / 2 },
              fontSize: 22,
              type: 'part_name',
            },
            {
              text: `Width Panel: ${w}mm`,
              position: { x: femaleSeam + w / 2, y: blankLength / 2 - 40 },
              fontSize: 16,
              type: 'dimension',
            },
            {
              text: `Height Panel: ${h}mm`,
              position: { x: bendX + h / 2, y: blankLength / 2 - 40 },
              fontSize: 16,
              type: 'dimension',
            },
            {
              text: `BEND 90° DOWN`,
              position: { x: bendX + 5, y: blankLength / 2 },
              fontSize: 14,
              rotationDeg: 90,
              type: 'alignment',
            },
          ],
          bendCount: 1,
          notes: [
            `Longitudinal Seam: ${seamSpec.name}`,
            `Transverse Connector: ${connSpec.name} (${transAllowance}mm per end)`,
            `Bend Deduction applied: ${bendDeduction.toFixed(2)}mm`,
          ],
        };

        parts.push(part);
      }
    } else if (style === 'one_piece_wrap') {
      // 1-Piece Full Wrap: [female] + W + H + W + H + [male]
      const blankWidth = femaleSeam + 2 * w + 2 * h + maleSeam - 3 * bendDeduction;
      const lines: Line2D[] = [];
      const bends = [
        femaleSeam + w,
        femaleSeam + w + h,
        femaleSeam + 2 * w + h,
      ];

      lines.push(
        { start: { x: 0, y: 0 }, end: { x: blankWidth, y: 0 }, type: 'cut' },
        { start: { x: blankWidth, y: 0 }, end: { x: blankWidth, y: blankLength }, type: 'cut' },
        { start: { x: blankWidth, y: blankLength }, end: { x: 0, y: blankLength }, type: 'cut' },
        { start: { x: 0, y: blankLength }, end: { x: 0, y: 0 }, type: 'cut' }
      );

      bends.forEach((bx, idx) => {
        lines.push({
          start: { x: bx, y: transAllowance },
          end: { x: bx, y: blankLength - transAllowance },
          type: 'bend_down',
          bendAngleDeg: 90,
          description: `Corner Bend ${idx + 1}`,
        });
        if (transAllowance > 0) {
          lines.push(...createVNotch({ x: bx, y: 0 }, transAllowance, 90, 'horizontal_bottom'));
          lines.push(...createVNotch({ x: bx, y: blankLength }, transAllowance, 90, 'horizontal_top'));
        }
      });

      const areaM2 = (blankWidth * blankLength) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;

      parts.push({
        id: 'full_wrap',
        partName: '1-Piece Wrap-Around Body',
        partNameBn: '১-পিস ফুল র্যাপ ডাক্ট বডি',
        quantity: 1,
        blankWidthMm: Math.round(blankWidth * 10) / 10,
        blankLengthMm: Math.round(blankLength * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        outerContour: [
          { x: 0, y: 0 },
          { x: blankWidth, y: 0 },
          { x: blankWidth, y: blankLength },
          { x: 0, y: blankLength },
        ],
        labels: [
          {
            text: `Wrap Duct ${w}x${h}x${l}mm`,
            position: { x: blankWidth / 2, y: blankLength / 2 },
            fontSize: 22,
            type: 'part_name',
          },
        ],
        bendCount: 3,
      });
    } else {
      // 4-piece individual panels (2 Width panels, 2 Height panels)
      // Panel 1 & 3: Width panels (with female seams on both sides)
      // Panel 2 & 4: Height panels (with male flanged edges on both sides)
      const wBlankWidth = w + 2 * femaleSeam;
      const hBlankWidth = h + 2 * maleSeam;

      // 2 Width panels
      for (let i = 1; i <= 2; i++) {
        const areaM2 = (wBlankWidth * blankLength) / 1e6;
        parts.push({
          id: `width_panel_${i}`,
          partName: `Width Panel ${w}mm #${i}`,
          partNameBn: `প্রস্থ প্যানেল ${w}মিমি #${i}`,
          quantity: 1,
          blankWidthMm: Math.round(wBlankWidth * 10) / 10,
          blankLengthMm: Math.round(blankLength * 10) / 10,
          areaM2: Number(areaM2.toFixed(3)),
          weightKg: Number((areaM2 * (thickness / 1000) * material.density).toFixed(2)),
          lines: [
            { start: { x: 0, y: 0 }, end: { x: wBlankWidth, y: 0 }, type: 'cut' },
            { start: { x: wBlankWidth, y: 0 }, end: { x: wBlankWidth, y: blankLength }, type: 'cut' },
            { start: { x: wBlankWidth, y: blankLength }, end: { x: 0, y: blankLength }, type: 'cut' },
            { start: { x: 0, y: blankLength }, end: { x: 0, y: 0 }, type: 'cut' },
          ],
          outerContour: [
            { x: 0, y: 0 },
            { x: wBlankWidth, y: 0 },
            { x: wBlankWidth, y: blankLength },
            { x: 0, y: blankLength },
          ],
          labels: [
            {
              text: `Top/Bottom Panel ${w}x${l}mm`,
              position: { x: wBlankWidth / 2, y: blankLength / 2 },
              fontSize: 20,
              type: 'part_name',
            },
          ],
          bendCount: 0,
        });
      }

      // 2 Height panels
      for (let i = 1; i <= 2; i++) {
        const areaM2 = (hBlankWidth * blankLength) / 1e6;
        parts.push({
          id: `height_panel_${i}`,
          partName: `Height Panel ${h}mm #${i}`,
          partNameBn: `উচ্চতা প্যানেল ${h}মিমি #${i}`,
          quantity: 1,
          blankWidthMm: Math.round(hBlankWidth * 10) / 10,
          blankLengthMm: Math.round(blankLength * 10) / 10,
          areaM2: Number(areaM2.toFixed(3)),
          weightKg: Number((areaM2 * (thickness / 1000) * material.density).toFixed(2)),
          lines: [
            { start: { x: 0, y: 0 }, end: { x: hBlankWidth, y: 0 }, type: 'cut' },
            { start: { x: hBlankWidth, y: 0 }, end: { x: hBlankWidth, y: blankLength }, type: 'cut' },
            { start: { x: hBlankWidth, y: blankLength }, end: { x: 0, y: blankLength }, type: 'cut' },
            { start: { x: 0, y: blankLength }, end: { x: 0, y: 0 }, type: 'cut' },
          ],
          outerContour: [
            { x: 0, y: 0 },
            { x: hBlankWidth, y: 0 },
            { x: hBlankWidth, y: blankLength },
            { x: 0, y: blankLength },
          ],
          labels: [
            {
              text: `Side Panel ${h}x${l}mm`,
              position: { x: hBlankWidth / 2, y: blankLength / 2 },
              fontSize: 20,
              type: 'part_name',
            },
          ],
          bendCount: 0,
        });
      }
    }

    // 3D Geometry generation (Rectangular Hollow Duct)
    const halfW = w / 2;
    const halfH = h / 2;
    const halfL = l / 2;

    const vertices: number[] = [
      // Front face opening (z = +halfL)
      -halfW, -halfH, halfL,
       halfW, -halfH, halfL,
       halfW,  halfH, halfL,
      -halfW,  halfH, halfL,
      // Back face opening (z = -halfL)
      -halfW, -halfH, -halfL,
       halfW, -halfH, -halfL,
       halfW,  halfH, -halfL,
      -halfW,  halfH, -halfL,
    ];

    // 4 side wall triangles
    const indices: number[] = [
      // Bottom face
      0, 1, 5,  0, 5, 4,
      // Top face
      3, 6, 2,  3, 7, 6,
      // Right face
      1, 2, 6,  1, 6, 5,
      // Left face
      0, 4, 7,  0, 7, 3,
    ];

    const wireframeLines: Point3D[][] = [
      // Front ring
      [{ x: -halfW, y: -halfH, z: halfL }, { x: halfW, y: -halfH, z: halfL }],
      [{ x: halfW, y: -halfH, z: halfL }, { x: halfW, y: halfH, z: halfL }],
      [{ x: halfW, y: halfH, z: halfL }, { x: -halfW, y: halfH, z: halfL }],
      [{ x: -halfW, y: halfH, z: halfL }, { x: -halfW, y: -halfH, z: halfL }],
      // Back ring
      [{ x: -halfW, y: -halfH, z: -halfL }, { x: halfW, y: -halfH, z: -halfL }],
      [{ x: halfW, y: -halfH, z: -halfL }, { x: halfW, y: halfH, z: -halfL }],
      [{ x: halfW, y: halfH, z: -halfL }, { x: -halfW, y: halfH, z: -halfL }],
      [{ x: -halfW, y: halfH, z: -halfL }, { x: -halfW, y: -halfH, z: -halfL }],
      // 4 Longitudinal edges
      [{ x: -halfW, y: -halfH, z: halfL }, { x: -halfW, y: -halfH, z: -halfL }],
      [{ x: halfW, y: -halfH, z: halfL }, { x: halfW, y: -halfH, z: -halfL }],
      [{ x: halfW, y: halfH, z: halfL }, { x: halfW, y: halfH, z: -halfL }],
      [{ x: -halfW, y: halfH, z: halfL }, { x: -halfW, y: halfH, z: -halfL }],
    ];

    const totalWeightKg = parts.reduce((acc, p) => acc + p.weightKg, 0);
    const totalBlankAreaM2 = parts.reduce((acc, p) => acc + p.areaM2, 0);
    const nominalSurfaceAreaM2 = (2 * (w + h) * l) / 1e6;
    const materialEfficiency = Math.min(100, Number(((nominalSurfaceAreaM2 / totalBlankAreaM2) * 100).toFixed(1)));

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
          max: { x: halfW, y: halfH, z: halfL },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number(nominalSurfaceAreaM2.toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency,
      smacnaCompliant: inputs.gauge <= smacna.recommendedGauge,
      warnings,
      recommendations,
      dimensionsSummary: {
        'Section Size': `${w} x ${h} mm`,
        'Length': `${l} mm`,
        'Style': style,
        'Gauge': `${inputs.gauge} Ga (${thickness} mm)`,
        'Longitudinal Seam': seamSpec.name,
        'Transverse Connector': connSpec.name,
      },
    };
  }
}
