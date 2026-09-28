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

export class RoundTeeEngine implements DuctCalculationEngine {
  readonly id = 'round_90_tee';
  readonly name = 'Round 90° Tee (Cylinder Intersection)';
  readonly nameBn = 'রাউন্ড ৯০° টি (সিলিন্ডার ইন্টারসেকশন)';
  readonly category = 'tee' as const;
  readonly description = 'Exact cylinder-to-cylinder fish-mouth branch intersection with main header pipe cutout template.';
  readonly descriptionBn = 'সিলিন্ডার ইন্টারসেকশন - ব্রাঞ্চ পাইপের ফিশ-মাউথ কার্ভ ও মেইন পাইপ স্যাডল হোল কাটআউট টেমপ্লেট।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'mainDiameter',
      label: 'Main Pipe Diameter (Dm)',
      labelBn: 'মেইন পাইপ ব্যাস (Dm)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 100,
      max: 2000,
      step: 10,
    },
    {
      id: 'branchDiameter',
      label: 'Branch Diameter (Db)',
      labelBn: 'ব্রাঞ্চ ব্যাস (Db)',
      type: 'number',
      defaultValue: 300,
      unit: 'mm',
      min: 80,
      max: 2000,
      step: 10,
    },
    {
      id: 'branchLength',
      label: 'Branch Length (L)',
      labelBn: 'ব্রাঞ্চ দৈর্ঘ্য (Length L)',
      type: 'number',
      defaultValue: 350,
      unit: 'mm',
      min: 100,
      max: 1500,
      step: 10,
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const dm = inputs.dimensions.mainDiameter || 0;
    const db = inputs.dimensions.branchDiameter || 0;
    const l = inputs.dimensions.branchLength || 0;

    if (dm <= 0) errors.push('Main Diameter must be > 0');
    if (db <= 0) errors.push('Branch Diameter must be > 0');
    if (l <= 0) errors.push('Branch Length must be > 0');
    if (db > dm) errors.push('Branch Diameter (Db) cannot be larger than Main Pipe Diameter (Dm)');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const dm = inputs.dimensions.mainDiameter || 400;
    const db = inputs.dimensions.branchDiameter || 300;
    const l = inputs.dimensions.branchLength || 350;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const transAllowance = connSpec.allowancePerEndMm;
    const seamAllowance = seamSpec.femalePocketAllowanceMm + seamSpec.maleTongueAllowanceMm;

    const Rm = dm / 2;
    const Rb = db / 2;
    const circB = Math.PI * db;
    const circM = Math.PI * dm;

    const blankBranchW = circB + seamAllowance;
    const maxDrop = Rm - Math.sqrt(Math.max(0, Rm * Rm - Rb * Rb));
    const blankBranchL = l + maxDrop + transAllowance + 20;

    const parts: FlatPatternPart[] = [];
    const stations = 36;

    // 1. Branch Pipe Flat Pattern (with Fish-Mouth Cut Curve)
    const branchLines: Line2D[] = [];
    const fishMouthPts: Point2D[] = [];

    // Seam placed at phi = 0 (minimum penetration side / neutral axis)
    for (let i = 0; i <= stations; i++) {
      const phi = (i / stations) * 2 * Math.PI;
      const x = seamSpec.femalePocketAllowanceMm + (i / stations) * circB;
      // Cylinder intersection: z(phi) = Rm - sqrt(Rm^2 - (Rb * sin(phi))^2)
      const radInside = Math.max(0, Rm * Rm - Math.pow(Rb * Math.sin(phi), 2));
      const drop = Rm - Math.sqrt(radInside);
      const y = 30 + (maxDrop - drop);
      fishMouthPts.push({ x, y });
    }

    // Top straight cut
    branchLines.push({
      start: { x: 0, y: blankBranchL },
      end: { x: blankBranchW, y: blankBranchL },
      type: 'cut',
      description: 'Branch Outlet Cut',
    });

    // Left and right seam edges
    branchLines.push(
      { start: { x: 0, y: fishMouthPts[0].y }, end: { x: 0, y: blankBranchL }, type: 'cut' },
      { start: { x: blankBranchW, y: fishMouthPts[stations].y }, end: { x: blankBranchW, y: blankBranchL }, type: 'cut' }
    );

    // Fish-Mouth Saddle curve lines
    for (let i = 0; i < stations; i++) {
      branchLines.push({
        start: fishMouthPts[i],
        end: fishMouthPts[i + 1],
        type: 'cut',
        description: 'Fish-Mouth Saddle Cut Line',
      });
    }

    // Longitudinal Seam fold lines
    if (seamSpec.femalePocketAllowanceMm > 0) {
      branchLines.push({
        start: { x: seamSpec.femalePocketAllowanceMm, y: fishMouthPts[0].y },
        end: { x: seamSpec.femalePocketAllowanceMm, y: blankBranchL },
        type: 'seam',
        description: 'Pittsburgh Pocket Fold',
      });
    }

    // Outer contour for branch flat blank
    const branchContour: Point2D[] = [
      { x: 0, y: blankBranchL },
      { x: blankBranchW, y: blankBranchL },
      { x: blankBranchW, y: fishMouthPts[stations].y },
    ];
    for (let i = stations; i >= 0; i--) {
      branchContour.push(fishMouthPts[i]);
    }
    branchContour.push({ x: 0, y: fishMouthPts[0].y });

    const branchAreaM2 = (blankBranchW * blankBranchL) / 1e6;
    const branchWeightKg = branchAreaM2 * (thickness / 1000) * material.density;

    parts.push({
      id: 'round_tee_branch',
      partName: `Branch Pipe with Fish-Mouth (Ø${db} onto Ø${dm})`,
      partNameBn: `ব্রাঞ্চ পাইপ ফিশ-মাউথ প্যাটার্ন (Ø${db} onto Ø${dm})`,
      quantity: 1,
      blankWidthMm: Math.round(blankBranchW * 10) / 10,
      blankLengthMm: Math.round(blankBranchL * 10) / 10,
      areaM2: Number(branchAreaM2.toFixed(3)),
      weightKg: Number(branchWeightKg.toFixed(2)),
      lines: branchLines,
      outerContour: branchContour,
      labels: [
        {
          text: `Branch Ø${db}mm (Fish-Mouth Depth: ${maxDrop.toFixed(1)}mm)`,
          position: { x: blankBranchW / 2, y: blankBranchL / 2 },
          fontSize: 20,
          type: 'part_name',
        },
        {
          text: `Fits onto Main Header Ø${dm}mm`,
          position: { x: blankBranchW / 2, y: blankBranchL / 2 - 30 },
          fontSize: 16,
          type: 'dimension',
        },
      ],
      bendCount: 0,
      notes: [
        `Fish-mouth saddle drop: ${maxDrop.toFixed(1)} mm`,
        'Roll into true cylinder and weld or rivet onto header saddle cutout.',
      ],
    });

    // 2. Main Pipe Saddle Cutout Hole Template
    // An ellipse-like cutout template that wraps onto main pipe
    const holeBlankDim = db + 140;
    const holeCenter: Point2D = { x: holeBlankDim / 2, y: holeBlankDim / 2 };
    const holeLines: Line2D[] = [
      { start: { x: 0, y: 0 }, end: { x: holeBlankDim, y: 0 }, type: 'cut' },
      { start: { x: holeBlankDim, y: 0 }, end: { x: holeBlankDim, y: holeBlankDim }, type: 'cut' },
      { start: { x: holeBlankDim, y: holeBlankDim }, end: { x: 0, y: holeBlankDim }, type: 'cut' },
      { start: { x: 0, y: holeBlankDim }, end: { x: 0, y: 0 }, type: 'cut' },
    ];

    // Saddle hole cutout profile
    const holePoints: Point2D[] = [];
    for (let i = 0; i < stations; i++) {
      const phi = (i / stations) * 2 * Math.PI;
      const arcCoord = Rm * Math.asin((Rb * Math.sin(phi)) / Rm);
      const zCoord = Rb * Math.cos(phi);
      holePoints.push({
        x: holeCenter.x + zCoord,
        y: holeCenter.y + arcCoord,
      });
    }

    for (let i = 0; i < stations; i++) {
      holeLines.push({
        start: holePoints[i],
        end: holePoints[(i + 1) % stations],
        type: 'notch',
        description: 'Saddle Hole Cutout Edge',
      });
    }

    // Crosshair centerlines
    holeLines.push(
      { start: { x: holeCenter.x - Rb - 25, y: holeCenter.y }, end: { x: holeCenter.x + Rb + 25, y: holeCenter.y }, type: 'guide' },
      { start: { x: holeCenter.x, y: holeCenter.y - Rb - 25 }, end: { x: holeCenter.x, y: holeCenter.y + Rb + 25 }, type: 'guide' }
    );

    parts.push({
      id: 'main_pipe_saddle_hole',
      partName: `Header Pipe Saddle Hole Template (Ø${dm})`,
      partNameBn: `মেইন পাইপ স্যাডল হোল কাটআউট টেমপ্লেট`,
      quantity: 1,
      blankWidthMm: Math.round(holeBlankDim * 10) / 10,
      blankLengthMm: Math.round(holeBlankDim * 10) / 10,
      areaM2: Number(((holeBlankDim * holeBlankDim) / 1e6).toFixed(3)),
      weightKg: 0.5,
      lines: holeLines,
      outerContour: [
        { x: 0, y: 0 },
        { x: holeBlankDim, y: 0 },
        { x: holeBlankDim, y: holeBlankDim },
        { x: 0, y: holeBlankDim },
      ],
      labels: [
        {
          text: `Header Hole Template (Ø${db} into Ø${dm})`,
          position: { x: holeCenter.x, y: holeCenter.y },
          fontSize: 18,
          type: 'part_name',
        },
      ],
      bendCount: 0,
      notes: ['Wrap template around main pipe to trace or CNC-plasma cut the exact saddle opening.'],
    });

    // 3D Geometry: BOTH the main header pipe cylinder AND the perpendicular intersecting branch cylinder
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    // Main Pipe Cylinder along X axis: length = db + 400
    const mainHalfL = db / 2 + 250;
    const segMain = 24;

    // Main cylinder rings at -mainHalfL and +mainHalfL
    for (let i = 0; i <= segMain; i++) {
      const phi = (i / segMain) * 2 * Math.PI;
      const y = Rm * Math.cos(phi);
      const z = Rm * Math.sin(phi);
      vertices.push(-mainHalfL, y, z); // Left ring (index 2*i)
      vertices.push( mainHalfL, y, z); // Right ring (index 2*i + 1)
    }

    for (let i = 0; i < segMain; i++) {
      const v0 = i * 2;
      const v1 = v0 + 1;
      const v2 = (i + 1) * 2;
      const v3 = v2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
    }

    // Branch Pipe Cylinder along Y axis:
    // Starts at saddle intersection on main pipe and extends upwards by `l` to Y = Rm + l
    const branchBaseIdx = vertices.length / 3;
    const segBranch = 24;

    for (let i = 0; i <= segBranch; i++) {
      const phi = (i / segBranch) * 2 * Math.PI;
      const bx = Rb * Math.cos(phi);
      const bz = Rb * Math.sin(phi);

      // Saddle intersection Y on main cylinder (where x^2 + z^2 is inside main, main radius is Rm in Y-Z plane)
      // Main cylinder surface: Y^2 + Z^2 = Rm^2 -> Y = sqrt(Rm^2 - bz^2)
      const saddleY = Math.sqrt(Math.max(0, Rm * Rm - bz * bz));
      const topY = Rm + l;

      vertices.push(bx, saddleY, bz); // Bottom intersection ring
      vertices.push(bx, topY,    bz); // Top opening ring
    }

    for (let i = 0; i < segBranch; i++) {
      const v0 = branchBaseIdx + i * 2;
      const v1 = v0 + 1;
      const v2 = branchBaseIdx + (i + 1) * 2;
      const v3 = v2 + 1;
      indices.push(v0, v2, v1);
      indices.push(v1, v2, v3);
    }

    // Wireframe loops
    // Main pipe end rings
    const mainRingLeft: Point3D[] = [];
    const mainRingRight: Point3D[] = [];
    for (let i = 0; i <= segMain; i++) {
      const phi = (i / segMain) * 2 * Math.PI;
      mainRingLeft.push({ x: -mainHalfL, y: Rm * Math.cos(phi), z: Rm * Math.sin(phi) });
      mainRingRight.push({ x: mainHalfL, y: Rm * Math.cos(phi), z: Rm * Math.sin(phi) });
    }
    wireframeLines.push(mainRingLeft, mainRingRight);

    // Branch top opening ring
    const branchTopRing: Point3D[] = [];
    const branchSaddleRing: Point3D[] = [];
    for (let i = 0; i <= segBranch; i++) {
      const phi = (i / segBranch) * 2 * Math.PI;
      const bx = Rb * Math.cos(phi);
      const bz = Rb * Math.sin(phi);
      const saddleY = Math.sqrt(Math.max(0, Rm * Rm - bz * bz));
      branchTopRing.push({ x: bx, y: Rm + l, z: bz });
      branchSaddleRing.push({ x: bx, y: saddleY, z: bz });
    }
    wireframeLines.push(branchTopRing, branchSaddleRing);

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
          min: { x: -mainHalfL, y: -Rm, z: -Rm },
          max: { x: mainHalfL, y: Rm + l, z: Rm },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((totalBlankAreaM2 * 0.85).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 84,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        `Saddle intersection curve maximum drop: ${maxDrop.toFixed(1)} mm`,
        'Use the Header Pipe Saddle Hole Template to plasma-cut the exact header opening before mounting branch.',
      ],
      dimensionsSummary: {
        'Main Header': `Ø${dm} mm`,
        'Branch Dia': `Ø${db} mm`,
        'Branch Length': `${l} mm`,
        'Saddle Drop': `${maxDrop.toFixed(1)} mm`,
      },
    };
  }
}
