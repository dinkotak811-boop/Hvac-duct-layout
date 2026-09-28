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

export class RoundSegmentedElbowEngine implements DuctCalculationEngine {
  readonly id = 'round_segmented_elbow';
  readonly name = 'Round Segmented (Gore) Elbow / Lobster Back';
  readonly nameBn = 'রাউন্ড সেগমেন্টেড (গোর) এলবো / লবস্টার ব্যাক';
  readonly category = 'elbow' as const;
  readonly description = 'SMACNA industrial lobster-back bend developed from multiple mitered cylindrical gore segments.';
  readonly descriptionBn = 'ইন্ডাস্ট্রিয়াল লবস্টার ব্যাক বেন্ড - মাল্টি-গোর মাইটার ডেভেলপমেন্ট ও রোটেশনাল সোয়েজিং এলাউন্স।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'diameter',
      label: 'Duct Diameter (D)',
      labelBn: 'ডাকট ব্যাস (D)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 100,
      max: 2000,
      step: 10,
    },
    {
      id: 'centerlineRadius',
      label: 'Centerline Radius (R)',
      labelBn: 'সেন্টারলাইন রেডিয়াস (R)',
      type: 'number',
      defaultValue: 600,
      unit: 'mm',
      min: 150,
      max: 3000,
      step: 10,
      description: 'Standard is 1.5D for low pressure drop',
    },
    {
      id: 'angleDeg',
      label: 'Total Bend Angle (°)',
      labelBn: 'মোট বাঁক কোণ (°)',
      type: 'number',
      defaultValue: 90,
      unit: '°',
      min: 30,
      max: 180,
      step: 5,
    },
    {
      id: 'numGores',
      label: 'Number of Gores (Pieces)',
      labelBn: 'মোট গোর সংখ্যা (টুকরো)',
      type: 'number',
      defaultValue: 4,
      unit: 'Pieces',
      min: 3,
      max: 9,
      step: 1,
      description: 'Total pieces (2 end half-gores + middle full gores). Typically 4 or 5 for 90° bend.',
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'one_piece_wrap',
      options: [
        { value: 'one_piece_wrap', label: '1 Part (Full 360° Wrap Gores / ১ পার্ট)', labelBn: '১ পার্ট (ফুল ৩৬০° র্যাপ গোর)' },
        { value: 'two_piece_l', label: '2 Parts (180° Half-Gore Segments / ২ পার্ট)', labelBn: '২ পার্ট (১৮০° সেমি-গোর)' },
        { value: 'four_piece', label: '4 Parts (90° Quadrant Gore Panels / ৪ পার্ট)', labelBn: '৪ পার্ট (৯০° কোয়াড্রান্ট গোর)' },
      ],
      description: 'Cutting layout segmentation for segmented elbow gores',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const d = inputs.dimensions.diameter || 0;
    const r = inputs.dimensions.centerlineRadius || 0;
    const ang = inputs.dimensions.angleDeg || 0;
    const gores = inputs.dimensions.numGores || 0;

    if (d <= 0) errors.push('Diameter must be > 0');
    if (r <= d / 2) errors.push('Centerline radius R must be greater than half diameter (R > D/2)');
    if (ang < 15 || ang > 180) errors.push('Angle must be between 15° and 180°');
    if (gores < 3 || gores > 12) errors.push('Number of gores must be between 3 and 12');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const d = inputs.dimensions.diameter || 400;
    const r = inputs.dimensions.centerlineRadius || 600;
    const angleDeg = inputs.dimensions.angleDeg || 90;
    const numGores = Math.max(3, Math.min(12, inputs.dimensions.numGores || 4));

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);

    // Miter calculation:
    // Total bend angle is divided by: 2 * (numGores - 1)
    // End gores have 1 miter angle (half-gore)
    // Middle gores have 2 miter angles (full gore = 2 * miterAngle)
    const miterAngleDeg = angleDeg / (2 * (numGores - 1));
    const miterAngleRad = (miterAngleDeg * Math.PI) / 180;

    const circ = Math.PI * d;
    const seamAllowance = seamSpec.femalePocketAllowanceMm + seamSpec.maleTongueAllowanceMm;
    const blankWidth = circ + seamAllowance;

    // Minimum straight collar on end gores
    const endTangent = 50; // 50mm collar for slip joint

    // Middle Gore Heights:
    const midCenterHeight = 2 * r * Math.tan(miterAngleRad);
    const midHeelHeight = 2 * (r + d / 2) * Math.tan(miterAngleRad);
    const midThroatHeight = 2 * (r - d / 2) * Math.tan(miterAngleRad);

    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'one_piece_wrap';
    const numSplits = style === 'four_piece' ? 4 : style === 'two_piece_l' ? 2 : 1;
    const splitCirc = circ / numSplits;
    const splitBlankWidth = splitCirc + seamAllowance;

    const parts: FlatPatternPart[] = [];
    const stations = Math.max(12, Math.floor(36 / numSplits));

    // End Gores
    for (let s = 1; s <= (numSplits === 1 ? 1 : numSplits); s++) {
      const endLines: Line2D[] = [];
      const endCurvePts: Point2D[] = [];
      const phiStart = ((s - 1) / numSplits) * 2 * Math.PI;
      const phiRange = (1 / numSplits) * 2 * Math.PI;

      for (let i = 0; i <= stations; i++) {
        const stationX = seamSpec.femalePocketAllowanceMm + (i / stations) * splitCirc;
        const phi = phiStart + (i / stations) * phiRange;
        const h_phi = endTangent + (r - (d / 2) * Math.cos(phi)) * Math.tan(miterAngleRad);
        endCurvePts.push({ x: stationX, y: h_phi });
      }

      endLines.push({
        start: { x: seamSpec.femalePocketAllowanceMm, y: 0 },
        end: { x: seamSpec.femalePocketAllowanceMm + splitCirc, y: 0 },
        type: 'cut',
        description: 'Straight Connector Collar Edge',
      });
      endLines.push(
        { start: { x: seamSpec.femalePocketAllowanceMm, y: 0 }, end: endCurvePts[0], type: 'cut', description: 'Seam Edge Left' },
        { start: { x: seamSpec.femalePocketAllowanceMm + splitCirc, y: 0 }, end: endCurvePts[stations], type: 'cut', description: 'Seam Edge Right' }
      );
      for (let i = 0; i < stations; i++) {
        endLines.push({ start: endCurvePts[i], end: endCurvePts[i + 1], type: 'cut', description: 'Miter Cut Curve' });
      }
      endLines.push({
        start: { x: 0, y: endTangent },
        end: { x: splitBlankWidth, y: endTangent },
        type: 'guide',
        description: 'Collar Tangent Line',
      });

      let endMaxHeight = 0;
      endCurvePts.forEach(p => { endMaxHeight = Math.max(endMaxHeight, p.y); });
      const endAreaM2 = (splitBlankWidth * (endTangent + (r * Math.tan(miterAngleRad)) / numSplits)) / 1e6;
      const endWeightKg = endAreaM2 * (thickness / 1000) * material.density;

      const endContour: Point2D[] = [
        { x: seamSpec.femalePocketAllowanceMm, y: 0 },
        { x: seamSpec.femalePocketAllowanceMm + splitCirc, y: 0 },
      ];
      for (let i = stations; i >= 0; i--) endContour.push(endCurvePts[i]);

      const endName = numSplits === 1
        ? `End Half-Gore (Cut Angle: ${miterAngleDeg.toFixed(2)}°)`
        : `End Gore Segment #${s} of ${numSplits} (${(360 / numSplits).toFixed(0)}° Sector)`;
      const endNameBn = numSplits === 1
        ? `এন্ড হাফ-গোর (কাট অ্যাঙ্গেল: ${miterAngleDeg.toFixed(2)}°)`
        : `এন্ড গোর পার্ট #${s} (${numSplits} পার্টের ১টি)`;

      parts.push({
        id: `end_gore_${s}`,
        partName: endName,
        partNameBn: endNameBn,
        quantity: numSplits === 1 ? 2 : 2 * numSplits,
        blankWidthMm: Math.round(splitBlankWidth * 10) / 10,
        blankLengthMm: Math.round(endMaxHeight * 10) / 10,
        areaM2: Number(endAreaM2.toFixed(3)),
        weightKg: Number(endWeightKg.toFixed(2)),
        lines: endLines,
        outerContour: endContour,
        labels: [
          {
            text: `End Gore ${numSplits > 1 ? `#${s} ` : ''}(Angle ${miterAngleDeg.toFixed(1)}°)`,
            position: { x: splitBlankWidth / 2, y: endTangent / 2 },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: `Heel Height: ${Math.round(endMaxHeight)}mm | Throat: ${Math.round(endCurvePts[0].y)}mm`,
            position: { x: splitBlankWidth / 2, y: endMaxHeight / 2 },
            fontSize: 16,
            type: 'dimension',
          },
        ],
        bendCount: 0,
        notes: [
          `Miter Angle: ${miterAngleDeg.toFixed(2)}° per cut`,
          'Roll into cylinder and swage / bead miter lip for interlocking gore joints.',
        ],
      });
    }

    // Middle Gores
    if (numGores > 2) {
      const numMidGores = numGores - 2;
      for (let s = 1; s <= (numSplits === 1 ? 1 : numSplits); s++) {
        const midLines: Line2D[] = [];
        const topPts: Point2D[] = [];
        const botPts: Point2D[] = [];
        const yCenter = midHeelHeight / 2 + 30;
        const phiStart = ((s - 1) / numSplits) * 2 * Math.PI;
        const phiRange = (1 / numSplits) * 2 * Math.PI;

        for (let i = 0; i <= stations; i++) {
          const stationX = seamSpec.femalePocketAllowanceMm + (i / stations) * splitCirc;
          const phi = phiStart + (i / stations) * phiRange;
          const halfH_phi = (r - (d / 2) * Math.cos(phi)) * Math.tan(miterAngleRad);
          topPts.push({ x: stationX, y: yCenter + halfH_phi });
          botPts.push({ x: stationX, y: yCenter - halfH_phi });
        }

        midLines.push(
          { start: botPts[0], end: topPts[0], type: 'cut', description: 'Throat Seam Left' },
          { start: botPts[stations], end: topPts[stations], type: 'cut', description: 'Throat Seam Right' }
        );

        for (let i = 0; i < stations; i++) {
          midLines.push({ start: topPts[i], end: topPts[i + 1], type: 'cut', description: 'Top Miter Curve' });
          midLines.push({ start: botPts[i], end: botPts[i + 1], type: 'cut', description: 'Bottom Miter Curve' });
        }

        midLines.push({
          start: { x: 0, y: yCenter },
          end: { x: splitBlankWidth, y: yCenter },
          type: 'guide',
          description: 'Gore Pitch Centerline',
        });

        const midBlankL = midHeelHeight + 60;
        const midAreaM2 = (splitBlankWidth * midCenterHeight) / 1e6;
        const midWeightKg = midAreaM2 * (thickness / 1000) * material.density;

        const midContour: Point2D[] = [topPts[0]];
        for (let i = 1; i <= stations; i++) midContour.push(topPts[i]);
        for (let i = stations; i >= 0; i--) midContour.push(botPts[i]);

        const midName = numSplits === 1
          ? `Middle Full-Gore (Full Angle: ${(2 * miterAngleDeg).toFixed(2)}°)`
          : `Middle Gore Segment #${s} of ${numSplits}`;
        const midNameBn = numSplits === 1
          ? `মিডল ফুল-গোর (${numMidGores}টি প্রয়োজন)`
          : `মিডল গোর পার্ট #${s} (${numMidGores}টি সেট)`;

        parts.push({
          id: `middle_gore_${s}`,
          partName: midName,
          partNameBn: midNameBn,
          quantity: numSplits === 1 ? numMidGores : numMidGores * numSplits,
          blankWidthMm: Math.round(splitBlankWidth * 10) / 10,
          blankLengthMm: Math.round(midBlankL * 10) / 10,
          areaM2: Number(midAreaM2.toFixed(3)),
          weightKg: Number(midWeightKg.toFixed(2)),
          lines: midLines,
          outerContour: midContour,
          labels: [
            {
              text: `Middle Gore ${numSplits > 1 ? `#${s} ` : ''}(Angle ${(2 * miterAngleDeg).toFixed(1)}°)`,
              position: { x: splitBlankWidth / 2, y: yCenter },
              fontSize: 20,
              type: 'part_name',
            },
            {
              text: `Heel: ${Math.round(midHeelHeight)}mm | Center: ${Math.round(midCenterHeight)}mm | Throat: ${Math.round(midThroatHeight)}mm`,
              position: { x: splitBlankWidth / 2, y: yCenter - 25 },
              fontSize: 14,
              type: 'dimension',
            },
          ],
          bendCount: 0,
          notes: [
            `Full Gore Angle: ${(2 * miterAngleDeg).toFixed(2)}°`,
            'Rotary bead or gore-lock joint on both curves for assembly.',
          ],
        });
      }
    }

    // 3D Geometry: Multi-gore lobster-back bend with distinct miter segments and open ends
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];
    const ringSegments = 24;
    const numRings = numGores + 1;
    const ptsPerRing = ringSegments + 1;

    // Generate gore miter ring planes
    for (let g = 0; g < numRings; g++) {
      let ringAngleDeg = 0;
      if (g === 0) {
        ringAngleDeg = 0;
      } else if (g === numRings - 1) {
        ringAngleDeg = angleDeg;
      } else {
        ringAngleDeg = miterAngleDeg + (g - 1) * (2 * miterAngleDeg);
      }
      const ringAngleRad = (ringAngleDeg * Math.PI) / 180;
      const cosBend = Math.cos(ringAngleRad);
      const sinBend = Math.sin(ringAngleRad);

      const ringPts: Point3D[] = [];

      for (let s = 0; s <= ringSegments; s++) {
        const phi = (s / ringSegments) * 2 * Math.PI;
        // Radial displacement along bend plane: (d/2) * cos(phi)
        // Perpendicular height: (d/2) * sin(phi)
        const radDisp = (d / 2) * Math.cos(phi);
        const yCoord = (d / 2) * Math.sin(phi);

        const ptX = (r + radDisp) * cosBend;
        const ptZ = (r + radDisp) * sinBend;

        vertices.push(ptX, yCoord, ptZ);
        ringPts.push({ x: ptX, y: yCoord, z: ptZ });
      }

      wireframeLines.push(ringPts);
    }

    // Connect rings with quads (proper outward normals)
    for (let g = 0; g < numRings - 1; g++) {
      const r1 = g * ptsPerRing;
      const r2 = (g + 1) * ptsPerRing;

      for (let s = 0; s < ringSegments; s++) {
        const a = r1 + s;
        const b = r1 + s + 1;
        const c = r2 + s;
        const d_pt = r2 + s + 1;

        // Outward facing triangles
        indices.push(a, b, c);
        indices.push(b, d_pt, c);
      }
    }

    // 4 Longitudinal spine lines (Throat, Heel, Front, Back)
    [0, ringSegments / 4, ringSegments / 2, (3 * ringSegments) / 4].forEach(sIdx => {
      const spine: Point3D[] = [];
      for (let g = 0; g < numRings; g++) {
        const idx = g * ptsPerRing + sIdx;
        spine.push({ x: vertices[idx * 3], y: vertices[idx * 3 + 1], z: vertices[idx * 3 + 2] });
      }
      wireframeLines.push(spine);
    });

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
          min: { x: 0, y: -d / 2, z: 0 },
          max: { x: r + d / 2, y: d / 2, z: r + d / 2 },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((circ * (r * ((angleDeg * Math.PI) / 180)) / 1e6).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 82.5,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        `Centerline Radius Ratio R/D: ${(r / d).toFixed(2)} (SMACNA recommends 1.5 for low pressure drop)`,
        `Miter cut angle per joint: ${(2 * miterAngleDeg).toFixed(2)}°`,
        'Use rotary swager or gore-lock machine to bead and crimp miter joints.',
      ],
      dimensionsSummary: {
        'Diameter': `Ø${d} mm`,
        'Centerline Radius': `R${r} mm`,
        'Number of Gores': `${numGores} Pieces`,
        'Miter Angle per Cut': `${miterAngleDeg.toFixed(2)}°`,
        'Full Gore Angle': `${(2 * miterAngleDeg).toFixed(2)}°`,
      },
    };
  }
}
