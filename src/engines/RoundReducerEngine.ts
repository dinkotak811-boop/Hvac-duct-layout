import { DuctCalculationEngine } from './DuctCalculationEngine';
import {
  DuctCalculationInput,
  CalculationResult,
  FormParameterField,
  FlatPatternPart,
  Line2D,
  Arc2D,
  Point2D,
  Point3D,
} from '../types';
import { MATERIALS, getGaugeThickness, getSmacnaRecommendedGauge } from '../standards/materials';
import { getLongitudinalAllowance, getTransverseAllowance } from '../standards/seams';

export class RoundReducerEngine implements DuctCalculationEngine {
  readonly id = 'round_concentric_reducer';
  readonly name = 'Round Concentric / Conical Reducer';
  readonly nameBn = 'রাউন্ড কোনিক্যাল রিডিউসার (Concentric Conical Reducer)';
  readonly category = 'reducer' as const;
  readonly description = 'Radial line development for true truncated cone duct transition with apex radius and sweep angle.';
  readonly descriptionBn = 'রেডিয়াল লাইন ডেভেলপমেন্ট - শীর্ষ রেডিয়াস ও সুইপ কোণ সহ বৃত্তাকার কোন ট্রানজিশন।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'largeDiameter',
      label: 'Large Diameter (D1)',
      labelBn: 'বড় ব্যাস (Large Dia D1)',
      type: 'number',
      defaultValue: 500,
      unit: 'mm',
      min: 100,
      max: 2500,
      step: 10,
    },
    {
      id: 'smallDiameter',
      label: 'Small Diameter (D2)',
      labelBn: 'ছোট ব্যাস (Small Dia D2)',
      type: 'number',
      defaultValue: 300,
      unit: 'mm',
      min: 80,
      max: 2000,
      step: 10,
    },
    {
      id: 'length',
      label: 'Conical Length / Height (L)',
      labelBn: 'দৈর্ঘ্য / উচ্চতা (Length L)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 100,
      max: 2000,
      step: 10,
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'one_piece_wrap',
      options: [
        { value: 'one_piece_wrap', label: '1 Part (Full Conical Frustum Wrap / ১ পার্ট)', labelBn: '১ পার্ট (ফুল কোনিকাল ফ্রাস্টাম)' },
        { value: 'two_piece_l', label: '2 Parts (180° Half-Conical Sectors / ২ পার্ট)', labelBn: '২ পার্ট (১৮০° সেমি-কোন)' },
        { value: 'four_piece', label: '4 Parts (90° Quadrant Sectors / ৪ পার্ট)', labelBn: '৪ পার্ট (৯০° কোয়াড্রান্ট সেক্টর)' },
      ],
      description: 'Cutting layout segmentation for conical frustum sheet development',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const d1 = inputs.dimensions.largeDiameter || 0;
    const d2 = inputs.dimensions.smallDiameter || 0;
    const l = inputs.dimensions.length || 0;

    if (d1 <= 0) errors.push('Large Diameter must be > 0');
    if (d2 <= 0) errors.push('Small Diameter must be > 0');
    if (l <= 0) errors.push('Length must be > 0');
    if (d2 >= d1) errors.push('Large Diameter (D1) must be strictly greater than Small Diameter (D2)');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const d1 = inputs.dimensions.largeDiameter || 500;
    const d2 = inputs.dimensions.smallDiameter || 300;
    const l = inputs.dimensions.length || 400;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);

    // Conical frustum geometry:
    // Slant height S = sqrt(L^2 + ((D1 - D2)/2)^2)
    // Apex distance for large radius: R1 = S * D1 / (D1 - D2)
    // Apex distance for small radius: R2 = S * D2 / (D1 - D2) = R1 - S
    // Sweep angle theta = (PI * D1) / R1 (in radians)
    const deltaR = (d1 - d2) / 2;
    const slantHeight = Math.sqrt(l * l + deltaR * deltaR);
    const r1 = (slantHeight * d1) / (d1 - d2);
    const r2 = r1 - slantHeight;

    const sweepAngleRad = (Math.PI * d1) / r1;
    const sweepAngleDeg = (sweepAngleRad * 180) / Math.PI;
    const seamAllowance = seamSpec.femalePocketAllowanceMm + seamSpec.maleTongueAllowanceMm;
    const sectorAreaM2 = (0.5 * sweepAngleRad * (r1 * r1 - r2 * r2)) / 1e6;

    // Cutting layout calculation (1-piece wrap, 2-piece, 4-piece)
    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'one_piece_wrap';
    const numPieces = style === 'four_piece' ? 4 : style === 'two_piece_l' ? 2 : 1;
    const pieceSweepRad = sweepAngleRad / numPieces;
    const pieceSweepDeg = (pieceSweepRad * 180) / Math.PI;

    const parts: FlatPatternPart[] = [];

    for (let p = 1; p <= numPieces; p++) {
      const halfSweep = pieceSweepRad / 2;
      const cx = 50 + r1;
      const cy = 50 + r1 * Math.sin(Math.min(Math.PI / 2, halfSweep));

      const arcs: Arc2D[] = [
        // Outer arc (large dia)
        {
          center: { x: cx, y: cy },
          radius: r1,
          startAngleRad: -halfSweep,
          endAngleRad: halfSweep,
          type: 'cut',
        },
        // Inner arc (small dia)
        {
          center: { x: cx, y: cy },
          radius: r2,
          startAngleRad: -halfSweep,
          endAngleRad: halfSweep,
          type: 'cut',
        },
      ];

      // Radial cut edge lines
      const pOuterStart = {
        x: cx + r1 * Math.cos(-halfSweep),
        y: cy + r1 * Math.sin(-halfSweep),
      };
      const pInnerStart = {
        x: cx + r2 * Math.cos(-halfSweep),
        y: cy + r2 * Math.sin(-halfSweep),
      };
      const pOuterEnd = {
        x: cx + r1 * Math.cos(halfSweep),
        y: cy + r1 * Math.sin(halfSweep),
      };
      const pInnerEnd = {
        x: cx + r2 * Math.cos(halfSweep),
        y: cy + r2 * Math.sin(halfSweep),
      };

      const lines: Line2D[] = [
        { start: pInnerStart, end: pOuterStart, type: 'cut', description: 'Radial Seam Edge 1' },
        { start: pInnerEnd, end: pOuterEnd, type: 'cut', description: 'Radial Seam Edge 2' },
      ];

      // Seam allowance lines
      if (seamAllowance > 0) {
        lines.push({
          start: { x: pInnerStart.x - seamAllowance, y: pInnerStart.y },
          end: { x: pOuterStart.x - seamAllowance, y: pOuterStart.y },
          type: 'seam',
          description: `Seam Allowance (+${seamAllowance}mm)`,
        });
      }

      // Outer contour polygon
      const contour: Point2D[] = [pInnerStart, pOuterStart];
      const steps = 24;
      for (let s = 1; s <= steps; s++) {
        const a = -halfSweep + (s / steps) * pieceSweepRad;
        contour.push({ x: cx + r1 * Math.cos(a), y: cy + r1 * Math.sin(a) });
      }
      contour.push(pInnerEnd);
      for (let s = steps; s >= 0; s--) {
        const a = -halfSweep + (s / steps) * pieceSweepRad;
        contour.push({ x: cx + r2 * Math.cos(a), y: cy + r2 * Math.sin(a) });
      }

      // Blank dimensions
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      contour.forEach(pt => {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      });

      const blankW = Math.ceil(maxX - minX + 50);
      const blankL = Math.ceil(maxY - minY + 50);
      const sectorAreaM2 = (0.5 * pieceSweepRad * (r1 * r1 - r2 * r2)) / 1e6;
      const weightKg = sectorAreaM2 * (thickness / 1000) * material.density;

      const partTitle = numPieces === 1
        ? `Round Conical Reducer Ø${d1} to Ø${d2}mm`
        : `Round Reducer Sector Piece #${p} of ${numPieces} (Ø${d1} to Ø${d2}mm)`;
      const partTitleBn = numPieces === 1
        ? `রাউন্ড কোনাল রিডিউসার বডি Ø${d1} to Ø${d2}মিমি`
        : `রাউন্ড রিডিউসার পার্ট #${p} (${numPieces} পার্টের ১টি)`;

      parts.push({
        id: `conical_reducer_piece_${p}`,
        partName: partTitle,
        partNameBn: partTitleBn,
        quantity: 1,
        blankWidthMm: Math.round(blankW * 10) / 10,
        blankLengthMm: Math.round(blankL * 10) / 10,
        areaM2: Number(sectorAreaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        arcs,
        outerContour: contour,
        labels: [
          {
            text: `Round Reducer ${numPieces > 1 ? `Sector #${p} ` : ''}(Sweep: ${pieceSweepDeg.toFixed(1)}°)`,
            position: { x: cx + ((r1 + r2) / 2), y: cy },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: `Apex Radii: R1=${Math.round(r1)}mm, R2=${Math.round(r2)}mm`,
            position: { x: cx + ((r1 + r2) / 2), y: cy - 30 },
            fontSize: 16,
            type: 'dimension',
          },
        ],
        bendCount: 0,
        notes: [
          `Apex Radius: Large R1 = ${r1.toFixed(1)} mm, Small R2 = ${r2.toFixed(1)} mm`,
          `Unfolded Sector Angle: ${pieceSweepDeg.toFixed(2)}°`,
          'Roll on slip roll machine to form conical frustum.',
        ],
      });
    }

    // 3D Geometry: Truncated cone (frustum) open at both ends
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    const segs = 32;
    const halfL = l / 2;
    const rad1 = d1 / 2;
    const rad2 = d2 / 2;

    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      // Large ring at Z = -halfL
      vertices.push(rad1 * cosP, rad1 * sinP, -halfL);
      // Small ring at Z = +halfL
      vertices.push(rad2 * cosP, rad2 * sinP,  halfL);
    }

    for (let i = 0; i < segs; i++) {
      const v0 = i * 2;
      const v1 = v0 + 1;
      const v2 = (i + 1) * 2;
      const v3 = v2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
    }

    const largeRing: Point3D[] = [];
    const smallRing: Point3D[] = [];
    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      largeRing.push({ x: rad1 * Math.cos(phi), y: rad1 * Math.sin(phi), z: -halfL });
      smallRing.push({ x: rad2 * Math.cos(phi), y: rad2 * Math.sin(phi), z:  halfL });
    }
    wireframeLines.push(largeRing, smallRing);

    // 4 Longitudinal slant lines
    [0, segs / 4, segs / 2, (3 * segs) / 4].forEach(idx => {
      const phi = (idx / segs) * 2 * Math.PI;
      wireframeLines.push([
        { x: rad1 * Math.cos(phi), y: rad1 * Math.sin(phi), z: -halfL },
        { x: rad2 * Math.cos(phi), y: rad2 * Math.sin(phi), z:  halfL },
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
          min: { x: -rad1, y: -rad1, z: -halfL },
          max: { x:  rad1, y:  rad1, z:  halfL },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number(sectorAreaM2.toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 85,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        `Taper Angle: ${((Math.atan(deltaR / l) * 180) / Math.PI).toFixed(1)}°`,
        'SMACNA recommends maximum slope of 1:4 (14°) for low noise supply air transition.',
      ],
      dimensionsSummary: {
        'Inlet Dia (D1)': `Ø${d1} mm`,
        'Outlet Dia (D2)': `Ø${d2} mm`,
        'Length (L)': `${l} mm`,
        'Sweep Angle': `${sweepAngleDeg.toFixed(1)}°`,
      },
    };
  }
}
