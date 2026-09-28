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

export class WyeBranchEngine implements DuctCalculationEngine {
  readonly id = 'wye_branch';
  readonly name = 'Wye Branch / True Y-Pant Leg (Breeches)';
  readonly nameBn = 'ওয়াই ব্রাঞ্চ / প্যান্ট লেগ (Wye Branch Breeches)';
  readonly category = 'tee' as const;
  readonly description = 'Symmetrical bifurcated breeches / pant leg transition dividing airflow into two angled round branch pipes.';
  readonly descriptionBn = 'সমদ্বিখণ্ডিত ওয়াই ব্রাঞ্চ (প্যান্ট লেগ) - নিখুঁত মাইটার ক্রচ ও ব্রাঞ্চ ফ্ল্যাট প্যাটার্ন।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'inletDiameter',
      label: 'Inlet Trunk Diameter (Di)',
      labelBn: 'ইনলেট ট্রাঙ্ক ব্যাস (Di)',
      type: 'number',
      defaultValue: 450,
      unit: 'mm',
      min: 150,
      max: 2000,
      step: 10,
    },
    {
      id: 'branchDiameter',
      label: 'Branch Legs Diameter (Db)',
      labelBn: 'ব্রাঞ্চ লেগ ব্যাস (Db)',
      type: 'number',
      defaultValue: 300,
      unit: 'mm',
      min: 100,
      max: 1800,
      step: 10,
    },
    {
      id: 'totalAngle',
      label: 'Included Spread Angle (°)',
      labelBn: 'মোট স্প্রেড অ্যাঙ্গেল (°)',
      type: 'number',
      defaultValue: 60,
      unit: '°',
      min: 30,
      max: 90,
      step: 5,
      description: 'Included angle between left and right branch legs (typically 45° or 60°)',
    },
    {
      id: 'legLength',
      label: 'Branch Leg Length (L)',
      labelBn: 'লেগ দৈর্ঘ্য (Length L)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 150,
      max: 1500,
      step: 10,
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const di = inputs.dimensions.inletDiameter || 0;
    const db = inputs.dimensions.branchDiameter || 0;
    const ang = inputs.dimensions.totalAngle || 0;
    const l = inputs.dimensions.legLength || 0;

    if (di <= 0 || db <= 0 || l <= 0) errors.push('Dimensions must be > 0');
    if (ang < 20 || ang > 120) errors.push('Total angle must be between 20° and 120°');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const di = inputs.dimensions.inletDiameter || 450;
    const db = inputs.dimensions.branchDiameter || 300;
    const totalAngle = inputs.dimensions.totalAngle || 60;
    const l = inputs.dimensions.legLength || 400;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const transAllowance = connSpec.allowancePerEndMm;
    const seamAllowance = seamSpec.femalePocketAllowanceMm + seamSpec.maleTongueAllowanceMm;

    // Half angle per leg relative to center axis
    const halfAngleDeg = totalAngle / 2;
    const halfAngleRad = (halfAngleDeg * Math.PI) / 180;

    const rLeg = db / 2;
    const legCirc = Math.PI * db;
    const blankWidth = legCirc + seamAllowance;

    // Miter cut depth at central crotch
    const crotchDrop = (db / 2) * Math.tan(halfAngleRad);
    const blankLength = l + crotchDrop * 2 + transAllowance + 30;

    const parts: FlatPatternPart[] = [];
    const stations = 36;

    // 2 Symmetrical Branch Legs (Left Leg and Right Leg)
    for (let leg = 1; leg <= 2; leg++) {
      const lines: Line2D[] = [];
      const miterPts: Point2D[] = [];

      // Miter curve across circumference:
      // Seam placed at phi = 0 (outermost hip of the leg, zero crotch drop)
      // Maximum crotch penetration occurs at phi = PI (inner crotch junction)
      for (let i = 0; i <= stations; i++) {
        const phi = (i / stations) * 2 * Math.PI;
        const x = seamSpec.femalePocketAllowanceMm + (i / stations) * legCirc;
        // Smooth sinusoidal miter cut curve
        const drop = (1 - Math.cos(phi)) * crotchDrop;
        const y = 30 + drop;
        miterPts.push({ x, y });
      }

      // Outlet straight cut
      lines.push({
        start: { x: 0, y: blankLength },
        end: { x: blankWidth, y: blankLength },
        type: 'cut',
        description: 'Branch Outlet Cut',
      });

      // Left and right seam cuts
      lines.push(
        { start: { x: 0, y: miterPts[0].y }, end: { x: 0, y: blankLength }, type: 'cut' },
        { start: { x: blankWidth, y: miterPts[stations].y }, end: { x: blankWidth, y: blankLength }, type: 'cut' }
      );

      // Crotch Miter Cut curve
      for (let i = 0; i < stations; i++) {
        lines.push({
          start: miterPts[i],
          end: miterPts[i + 1],
          type: 'cut',
          description: 'Crotch Miter Joint Cut',
        });
      }

      // Transverse connector bend line at outlet
      lines.push({
        start: { x: 0, y: blankLength - transAllowance },
        end: { x: blankWidth, y: blankLength - transAllowance },
        type: 'bend_up',
        bendAngleDeg: 90,
        description: 'Outlet TDC/Slip Fold',
      });

      // Seam fold lines
      if (seamSpec.femalePocketAllowanceMm > 0) {
        lines.push({
          start: { x: seamSpec.femalePocketAllowanceMm, y: miterPts[0].y },
          end: { x: seamSpec.femalePocketAllowanceMm, y: blankLength },
          type: 'seam',
          description: 'Seam Pocket Fold',
        });
      }

      // Outer contour polygon
      const contour: Point2D[] = [
        { x: 0, y: blankLength },
        { x: blankWidth, y: blankLength },
        { x: blankWidth, y: miterPts[stations].y },
      ];
      for (let i = stations; i >= 0; i--) {
        contour.push(miterPts[i]);
      }
      contour.push({ x: 0, y: miterPts[0].y });

      const areaM2 = (blankWidth * blankLength) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;

      parts.push({
        id: `wye_leg_${leg}`,
        partName: `Wye Branch Leg #${leg} (${leg === 1 ? 'Left Leg' : 'Right Leg'})`,
        partNameBn: `ওয়াই ব্রাঞ্চ লেগ #${leg} (${leg === 1 ? 'বাম লেগ' : 'ডান লেগ'})`,
        quantity: 1,
        blankWidthMm: Math.round(blankWidth * 10) / 10,
        blankLengthMm: Math.round(blankLength * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        outerContour: contour,
        labels: [
          {
            text: `Wye Leg ${leg} (Ø${db}mm, Spread ${totalAngle}°)`,
            position: { x: blankWidth / 2, y: blankLength / 2 },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: `Crotch Angle: ${halfAngleDeg}° | Length: ${l}mm`,
            position: { x: blankWidth / 2, y: blankLength / 2 - 30 },
            fontSize: 16,
            type: 'dimension',
          },
        ],
        bendCount: 1,
        notes: [
          `Leg spread angle: ${totalAngle}° (${halfAngleDeg}° deflection each)`,
          'Roll into true cylinder and weld/seam the central crotch joint between Left and Right legs.',
        ],
      });
    }

    // 3D Geometry: True bifurcated breeches / pant leg with central trunk and 2 angled branches
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    // 1. Center Trunk Cylinder (Inlet): length = 120mm along Z axis from Z = -120 to Z = 0
    const trunkLen = 120;
    const rIn = di / 2;
    const segs = 24;

    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      const tx = rIn * Math.cos(phi);
      const ty = rIn * Math.sin(phi);
      vertices.push(tx, ty, -trunkLen); // Trunk Inlet ring
      vertices.push(tx, ty, 0);         // Trunk Junction ring
    }

    for (let i = 0; i < segs; i++) {
      const v0 = i * 2;
      const v1 = v0 + 1;
      const v2 = (i + 1) * 2;
      const v3 = v2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
    }

    // 2. Left Branch Leg (angled by -halfAngleRad around Y axis)
    const leftBaseIdx = vertices.length / 3;
    const cosL = Math.cos(-halfAngleRad);
    const sinL = Math.sin(-halfAngleRad);

    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      const lx = rLeg * Math.cos(phi);
      const ly = rLeg * Math.sin(phi);

      // Junction at Z = 0
      const x0 = lx * cosL;
      const z0 = lx * sinL;
      // End of leg at distance `l`
      const x1 = lx * cosL + l * sinL;
      const z1 = lx * sinL + l * cosL;

      vertices.push(x0, ly, z0);
      vertices.push(x1, ly, z1);
    }

    for (let i = 0; i < segs; i++) {
      const v0 = leftBaseIdx + i * 2;
      const v1 = v0 + 1;
      const v2 = leftBaseIdx + (i + 1) * 2;
      const v3 = v2 + 1;
      indices.push(v0, v2, v1);
      indices.push(v1, v2, v3);
    }

    // 3. Right Branch Leg (angled by +halfAngleRad around Y axis)
    const rightBaseIdx = vertices.length / 3;
    const cosR = Math.cos(halfAngleRad);
    const sinR = Math.sin(halfAngleRad);

    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      const rx = rLeg * Math.cos(phi);
      const ry = rLeg * Math.sin(phi);

      const x0 = rx * cosR;
      const z0 = -rx * sinR;
      const x1 = rx * cosR + l * sinR;
      const z1 = -rx * sinR + l * cosR;

      vertices.push(x0, ry, z0);
      vertices.push(x1, ry, z1);
    }

    for (let i = 0; i < segs; i++) {
      const v0 = rightBaseIdx + i * 2;
      const v1 = v0 + 1;
      const v2 = rightBaseIdx + (i + 1) * 2;
      const v3 = v2 + 1;
      indices.push(v0, v1, v2);
      indices.push(v1, v3, v2);
    }

    // Wireframes:
    // Trunk inlet ring
    const trunkInletRing: Point3D[] = [];
    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      trunkInletRing.push({ x: rIn * Math.cos(phi), y: rIn * Math.sin(phi), z: -trunkLen });
    }
    wireframeLines.push(trunkInletRing);

    // Left leg outlet ring
    const leftOutletRing: Point3D[] = [];
    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      const lx = rLeg * Math.cos(phi);
      const ly = rLeg * Math.sin(phi);
      leftOutletRing.push({ x: lx * cosL + l * sinL, y: ly, z: lx * sinL + l * cosL });
    }
    wireframeLines.push(leftOutletRing);

    // Right leg outlet ring
    const rightOutletRing: Point3D[] = [];
    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * 2 * Math.PI;
      const rx = rLeg * Math.cos(phi);
      const ry = rLeg * Math.sin(phi);
      rightOutletRing.push({ x: rx * cosR + l * sinR, y: ry, z: -rx * sinR + l * cosR });
    }
    wireframeLines.push(rightOutletRing);

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
          min: { x: -l * Math.sin(halfAngleRad) - rLeg, y: -rIn, z: -trunkLen },
          max: { x:  l * Math.sin(halfAngleRad) + rLeg, y:  rIn, z:  l * Math.cos(halfAngleRad) },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((totalBlankAreaM2 * 0.85).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 82,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        'Wye crotch requires smooth aerodynamic splitter to prevent eddy formation.',
        'Continuous airtight weld or locked seam along the central bifurcation junction.',
      ],
      dimensionsSummary: {
        'Inlet Trunk': `Ø${di} mm`,
        'Branch Legs': `2 x Ø${db} mm`,
        'Total Spread': `${totalAngle}°`,
        'Leg Length': `${l} mm`,
      },
    };
  }
}
