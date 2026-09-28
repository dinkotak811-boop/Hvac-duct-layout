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

export class OvalStraightEngine implements DuctCalculationEngine {
  readonly id = 'oval_straight';
  readonly name = 'Flat Oval Straight Duct';
  readonly nameBn = 'ফ্ল্যাট ওভাল সোজা ডাক্ট (Flat Oval Straight)';
  readonly category = 'straight' as const;
  readonly description = 'Flat oval spiral or longitudinal seam duct with flat top/bottom and semicircular curved sides.';
  readonly descriptionBn = 'ফ্ল্যাট ওভাল ডাক্ট - ফ্ল্যাট সমান্তরাল অংশ ও দুই পাশের সেমিসার্কুলার কার্ভযুক্ত ডাক্ট।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'majorAxis',
      label: 'Major Axis (A - Overall Width)',
      labelBn: 'মেজর অক্ষ (A - মোট প্রস্থ)',
      type: 'number',
      defaultValue: 700,
      unit: 'mm',
      min: 200,
      max: 3000,
      step: 10,
    },
    {
      id: 'minorAxis',
      label: 'Minor Axis (B - Height / Depth)',
      labelBn: 'মাইনর অক্ষ (B - উচ্চতা)',
      type: 'number',
      defaultValue: 300,
      unit: 'mm',
      min: 150,
      max: 2000,
      step: 10,
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
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const a = inputs.dimensions.majorAxis || 0;
    const b = inputs.dimensions.minorAxis || 0;
    const l = inputs.dimensions.length || 0;

    if (a <= 0) errors.push('Major Axis (A) must be > 0');
    if (b <= 0) errors.push('Minor Axis (B) must be > 0');
    if (l <= 0) errors.push('Length (L) must be > 0');
    if (b >= a) errors.push('Major Axis (A) must be strictly greater than Minor Axis (B) for flat oval duct');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const a = inputs.dimensions.majorAxis || 700;
    const b = inputs.dimensions.minorAxis || 300;
    const l = inputs.dimensions.length || 1200;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const transAllowance = connSpec.allowancePerEndMm;
    const seamAllowance = seamSpec.femalePocketAllowanceMm + seamSpec.maleTongueAllowanceMm;

    // Flat Oval Geometry:
    // Flat width on top & bottom = A - B
    // Semicircles on left & right = Radius R = B / 2
    // True Perimeter = 2 * (A - B) + PI * B
    const flatWidth = a - b;
    const radius = b / 2;
    const semiCirc = Math.PI * radius;
    const totalPerimeter = 2 * flatWidth + Math.PI * b;

    const blankWidth = totalPerimeter + seamAllowance;
    const blankLength = l + 2 * transAllowance;

    // 4 Roll-forming transition lines where flat portions meet semicircles:
    // Starting seam at midpoint of bottom flat:
    // 0 -> seamAllowance (Pocket)
    // s1 = half-flat (flatWidth / 2) -> start of right semicircle
    // s2 = s1 + semiCirc -> start of top flat
    // s3 = s2 + flatWidth -> start of left semicircle
    // s4 = s3 + semiCirc -> start of second half of bottom flat
    const s0 = seamSpec.femalePocketAllowanceMm;
    const s1 = s0 + flatWidth / 2;
    const s2 = s1 + semiCirc;
    const s3 = s2 + flatWidth;
    const s4 = s3 + semiCirc;

    const lines: Line2D[] = [
      { start: { x: 0, y: 0 }, end: { x: blankWidth, y: 0 }, type: 'cut' },
      { start: { x: blankWidth, y: 0 }, end: { x: blankWidth, y: blankLength }, type: 'cut' },
      { start: { x: blankWidth, y: blankLength }, end: { x: 0, y: blankLength }, type: 'cut' },
      { start: { x: 0, y: blankLength }, end: { x: 0, y: 0 }, type: 'cut' },
    ];

    // Roll-forming transition guide lines
    [s1, s2, s3, s4].forEach((pos, idx) => {
      lines.push({
        start: { x: pos, y: transAllowance },
        end: { x: pos, y: blankLength - transAllowance },
        type: 'guide',
        description: `Roll Transition Line ${idx + 1} (Flat to Arc)`,
      });
    });

    // Seam fold lines
    if (seamSpec.femalePocketAllowanceMm > 0) {
      lines.push({
        start: { x: seamSpec.femalePocketAllowanceMm, y: 0 },
        end: { x: seamSpec.femalePocketAllowanceMm, y: blankLength },
        type: 'seam',
        description: 'Pittsburgh Pocket Fold Line',
      });
      lines.push({
        start: { x: blankWidth - seamSpec.maleTongueAllowanceMm, y: 0 },
        end: { x: blankWidth - seamSpec.maleTongueAllowanceMm, y: blankLength },
        type: 'seam',
        description: 'Pittsburgh Male Edge Fold Line',
      });
    }

    if (transAllowance > 0) {
      lines.push(
        { start: { x: 0, y: transAllowance }, end: { x: blankWidth, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Flange Fold' },
        { start: { x: 0, y: blankLength - transAllowance }, end: { x: blankWidth, y: blankLength - transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Flange Fold' }
      );
    }

    const areaM2 = (blankWidth * blankLength) / 1e6;
    const weightKg = areaM2 * (thickness / 1000) * material.density;

    const parts: FlatPatternPart[] = [
      {
        id: 'oval_duct_body',
        partName: `Flat Oval Duct Body ${a}x${b} x ${l}mm`,
        partNameBn: `ফ্ল্যাট ওভাল ডাক্ট বডি ${a}x${b} x ${l}মিমি`,
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
            text: `Flat Oval ${a} x ${b} mm (Perimeter: ${Math.round(totalPerimeter)}mm)`,
            position: { x: blankWidth / 2, y: blankLength / 2 },
            fontSize: 22,
            type: 'part_name',
          },
          {
            text: `Flat: ${flatWidth}mm | Semicircle: R${radius}mm`,
            position: { x: blankWidth / 2, y: blankLength / 2 - 35 },
            fontSize: 16,
            type: 'dimension',
          },
        ],
        bendCount: 4,
        notes: [
          `Major Axis: ${a} mm | Minor Axis: ${b} mm`,
          `Roll 3-roll former between transition lines to R${radius}mm`,
        ],
      },
    ];

    // 3D Geometry: Completely closed hollow flat-oval cylinder with open ends
    const halfL = l / 2;
    const halfFlat = flatWidth / 2;
    const segmentsArc = 16;
    const profilePoints: Point2D[] = [];

    // Continuous closed perimeter:
    // 1. Bottom Flat: from (-halfFlat, -radius) to (+halfFlat, -radius)
    profilePoints.push({ x: -halfFlat, y: -radius });
    profilePoints.push({ x: halfFlat, y: -radius });

    // 2. Right Semicircle: angle from -PI/2 to +PI/2
    for (let i = 1; i <= segmentsArc; i++) {
      const angle = -Math.PI / 2 + (i / segmentsArc) * Math.PI;
      profilePoints.push({ x: halfFlat + radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }

    // 3. Top Flat: from (+halfFlat, +radius) to (-halfFlat, +radius)
    profilePoints.push({ x: -halfFlat, y: radius });

    // 4. Left Semicircle: angle from +PI/2 to +3PI/2
    for (let i = 1; i < segmentsArc; i++) {
      const angle = Math.PI / 2 + (i / segmentsArc) * Math.PI;
      profilePoints.push({ x: -halfFlat + radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }

    const numRingPts = profilePoints.length;
    const vertices: number[] = [];
    const indices: number[] = [];

    // Generate front ring (Z = +halfL) and back ring (Z = -halfL)
    for (let i = 0; i < numRingPts; i++) {
      const p = profilePoints[i];
      vertices.push(p.x, p.y,  halfL); // index 2*i
      vertices.push(p.x, p.y, -halfL); // index 2*i + 1
    }

    // Connect rings in a continuous closed loop
    for (let i = 0; i < numRingPts; i++) {
      const nextI = (i + 1) % numRingPts;
      const v0 = i * 2;
      const v1 = v0 + 1;
      const v2 = nextI * 2;
      const v3 = v2 + 1;
      indices.push(v0, v2, v1);
      indices.push(v1, v2, v3);
    }

    const wirefront: Point3D[] = profilePoints.map(p => ({ x: p.x, y: p.y, z: halfL }));
    wirefront.push(wirefront[0]); // close loop
    const wireback: Point3D[] = profilePoints.map(p => ({ x: p.x, y: p.y, z: -halfL }));
    wireback.push(wireback[0]);   // close loop

    const wireframeLines: Point3D[][] = [wirefront, wireback];
    // Longitudinal transition lines
    [0, 1, segmentsArc + 1, segmentsArc + 2].forEach(idx => {
      if (idx < profilePoints.length) {
        wireframeLines.push([
          { x: profilePoints[idx].x, y: profilePoints[idx].y, z: -halfL },
          { x: profilePoints[idx].x, y: profilePoints[idx].y, z:  halfL },
        ]);
      }
    });

    const smacna = getSmacnaRecommendedGauge(a);

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
          min: { x: -(halfFlat + radius), y: -radius, z: -halfL },
          max: { x:  halfFlat + radius,  y:  radius, z:  halfL },
        },
      },
      totalWeightKg: Number(parts[0].weightKg.toFixed(2)),
      totalSurfaceAreaM2: Number(((totalPerimeter * l) / 1e6).toFixed(3)),
      totalBlankAreaM2: Number(parts[0].areaM2.toFixed(3)),
      materialEfficiency: 92,
      smacnaCompliant: inputs.gauge <= smacna.recommendedGauge,
      warnings: [],
      recommendations: [smacna.reinforcementNote],
      dimensionsSummary: {
        'Major Axis (A)': `${a} mm`,
        'Minor Axis (B)': `${b} mm`,
        'Flat Width': `${flatWidth} mm`,
        'Perimeter': `${totalPerimeter.toFixed(1)} mm`,
      },
    };
  }
}
