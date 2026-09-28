import { DuctCalculationEngine } from './DuctCalculationEngine';
import {
  DuctCalculationInput,
  CalculationResult,
  FormParameterField,
  FlatPatternPart,
  Line2D,
  Point3D,
} from '../types';
import { MATERIALS, getGaugeThickness, getSmacnaRecommendedGauge } from '../standards/materials';
import { getLongitudinalAllowance, getTransverseAllowance } from '../standards/seams';

export class RoundStraightEngine implements DuctCalculationEngine {
  readonly id = 'round_straight';
  readonly name = 'Round Straight Duct';
  readonly nameBn = 'গোলাকার সোজা ডাক্ট (Round Straight Duct)';
  readonly category = 'straight' as const;
  readonly description = 'Longitudinal seam or spiral flat sheet development for circular ductwork. Configurable as 1-part full wrap, 2-part halves, or 4-part quadrants.';
  readonly descriptionBn = 'বৃত্তাকার ডাক্টের জন্য ফ্ল্যাট শিট কাটিং প্যাটার্ন - ১ পার্ট ফুল র্যাপ, ২ পার্ট বা ৪ পার্ট সেগমেন্ট।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'diameter',
      label: 'Diameter (D)',
      labelBn: 'ব্যাস (Diameter D)',
      type: 'number',
      defaultValue: 400,
      unit: 'mm',
      min: 80,
      max: 2000,
      step: 10,
      description: 'Inside diameter of round duct',
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
      description: 'Length of round pipe section',
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'one_piece_wrap',
      options: [
        { value: 'one_piece_wrap', label: '1 Part (Full Cylinder Wrap / ১ পার্ট)', labelBn: '১ পার্ট (ফুল র্যাপ পাইপ)' },
        { value: 'two_piece_l', label: '2 Parts (180° Half-Cylinders / ২ পার্ট)', labelBn: '২ পার্ট (১৮০° সেমি-সিলিন্ডার)' },
        { value: 'four_piece', label: '4 Parts (90° Quadrant Panels / ৪ পার্ট)', labelBn: '৪ পার্ট (৯০° কোয়াড্রান্ট প্যানেল)' },
      ],
      description: 'Segment layout for cutting sheet metal panels',
    },
    {
      id: 'crimpEnd',
      label: 'Crimp One End',
      labelBn: 'এক মাথায় ক্রিম্প (Crimp End)',
      type: 'checkbox',
      defaultValue: true,
      description: 'Add 38mm crimped male end for slip joint insertion into next pipe',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const d = inputs.dimensions.diameter || 0;
    const l = inputs.dimensions.length || 0;
    if (d <= 0) errors.push('Diameter must be greater than 0 mm');
    if (l <= 0) errors.push('Length must be greater than 0 mm');
    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const d = inputs.dimensions.diameter || 400;
    const l = inputs.dimensions.length || 1200;
    const crimpEnd = Boolean(inputs.dimensions.crimpEnd ?? true);
    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'one_piece_wrap';

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const circ = Math.PI * d;
    const crimpAllowance = crimpEnd ? 38.0 : 0;
    const transAllowance = connSpec.allowancePerEndMm;
    const blankLength = l + transAllowance + crimpAllowance;

    const femaleSeam = seamSpec.femalePocketAllowanceMm;
    const maleSeam = seamSpec.maleTongueAllowanceMm;
    const seamAllowance = femaleSeam + maleSeam;

    const parts: FlatPatternPart[] = [];
    const numPieces = style === 'four_piece' ? 4 : style === 'two_piece_l' ? 2 : 1;
    const arcSpanDeg = 360 / numPieces;
    const arcWidthPerPiece = circ / numPieces;
    const pieceBlankWidth = arcWidthPerPiece + seamAllowance;

    for (let p = 1; p <= numPieces; p++) {
      const lines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: pieceBlankWidth, y: 0 }, type: 'cut' },
        { start: { x: pieceBlankWidth, y: 0 }, end: { x: pieceBlankWidth, y: blankLength }, type: 'cut' },
        { start: { x: pieceBlankWidth, y: blankLength }, end: { x: 0, y: blankLength }, type: 'cut' },
        { start: { x: 0, y: blankLength }, end: { x: 0, y: 0 }, type: 'cut' },
      ];

      // Seam fold lines
      if (femaleSeam > 0) {
        lines.push({
          start: { x: femaleSeam, y: 0 },
          end: { x: femaleSeam, y: blankLength },
          type: 'seam',
          description: 'Seam fold line 1',
        });
      }
      if (maleSeam > 0) {
        lines.push({
          start: { x: pieceBlankWidth - maleSeam, y: 0 },
          end: { x: pieceBlankWidth - maleSeam, y: blankLength },
          type: 'seam',
          description: 'Seam fold line 2',
        });
      }

      // Crimp and Bead reference lines
      if (crimpEnd) {
        lines.push(
          {
            start: { x: 0, y: crimpAllowance },
            end: { x: pieceBlankWidth, y: crimpAllowance },
            type: 'guide',
            description: 'Crimp Limit / Stop Bead Line',
          },
          {
            start: { x: 0, y: crimpAllowance / 2 },
            end: { x: pieceBlankWidth, y: crimpAllowance / 2 },
            type: 'guide',
            description: 'Crimp Roller Centerline',
          }
        );
      }

      const areaM2 = (pieceBlankWidth * blankLength) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;

      let nameEn = `Round Pipe Body Ø${d} x ${l}mm`;
      let nameBn = `গোলাকার পাইপ বডি Ø${d} x ${l}মিমি`;
      if (numPieces === 2) {
        nameEn = `180° Half Cylinder #${p} of 2`;
        nameBn = `১৮০° সেমি-সিলিন্ডার #${p} (২টির মধ্যে)`;
      } else if (numPieces === 4) {
        nameEn = `90° Quadrant Panel #${p} of 4`;
        nameBn = `৯০° কোয়াড্রান্ট প্যানেল #${p} (৪টির মধ্যে)`;
      }

      parts.push({
        id: `round_pipe_${p}`,
        partName: nameEn,
        partNameBn: nameBn,
        quantity: 1,
        blankWidthMm: Math.round(pieceBlankWidth * 10) / 10,
        blankLengthMm: Math.round(blankLength * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        outerContour: [
          { x: 0, y: 0 },
          { x: pieceBlankWidth, y: 0 },
          { x: pieceBlankWidth, y: blankLength },
          { x: 0, y: blankLength },
        ],
        labels: [
          {
            text: `${nameEn} (${Math.round(pieceBlankWidth)}x${Math.round(blankLength)}mm)`,
            position: { x: pieceBlankWidth / 2, y: blankLength / 2 },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: `Arc Span: ${arcSpanDeg}° (${Math.round(arcWidthPerPiece)}mm arc + ${seamAllowance}mm seams)`,
            position: { x: pieceBlankWidth / 2, y: blankLength / 2 - 35 },
            fontSize: 14,
            type: 'dimension',
          },
        ],
        bendCount: 0,
        notes: [
          `Arc Span: ${arcSpanDeg}°`,
          `Longitudinal Seam: ${seamSpec.name}`,
          crimpEnd ? 'Includes 38mm crimped male end' : 'Raw edges without crimp',
        ],
      });
    }

    // 3D Geometry: Cylindrical hollow tube
    const radialSegments = 32;
    const halfL = l / 2;
    const r = d / 2;

    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    for (let i = 0; i <= radialSegments; i++) {
      const theta = (i / radialSegments) * Math.PI * 2;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      vertices.push(x, y, halfL);
      vertices.push(x, y, -halfL);
    }

    for (let i = 0; i < radialSegments; i++) {
      const top1 = i * 2;
      const btm1 = i * 2 + 1;
      const top2 = (i + 1) * 2;
      const btm2 = (i + 1) * 2 + 1;
      indices.push(top1, btm1, top2);
      indices.push(top2, btm1, btm2);
    }

    const frontRing: Point3D[] = [];
    const backRing: Point3D[] = [];
    for (let i = 0; i <= 16; i++) {
      const theta = (i / 16) * Math.PI * 2;
      frontRing.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), z: halfL });
      backRing.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), z: -halfL });
    }
    wireframeLines.push(frontRing);
    wireframeLines.push(backRing);

    for (let i = 0; i < 4; i++) {
      const theta = (i / 4) * Math.PI * 2;
      wireframeLines.push([
        { x: r * Math.cos(theta), y: r * Math.sin(theta), z: -halfL },
        { x: r * Math.cos(theta), y: r * Math.sin(theta), z: halfL },
      ]);
    }

    const smacna = getSmacnaRecommendedGauge(d);
    const totalWeightKg = Number(parts.reduce((sum, p) => sum + p.weightKg * p.quantity, 0).toFixed(2));
    const totalSurfaceAreaM2 = Number(((circ * l) / 1e6).toFixed(3));
    const totalBlankAreaM2 = Number(parts.reduce((sum, p) => sum + p.areaM2 * p.quantity, 0).toFixed(3));

    return {
      modelId: 'round_straight',
      modelName: this.name,
      modelNameBn: this.nameBn,
      category: this.category,
      parts,
      geometry3D: {
        vertices,
        indices,
        wireframeLines,
        boundingBox: {
          min: { x: -r, y: -r, z: -halfL },
          max: { x: r, y: r, z: halfL },
        },
      },
      totalWeightKg,
      totalSurfaceAreaM2,
      totalBlankAreaM2,
      materialEfficiency: Number(((totalSurfaceAreaM2 / totalBlankAreaM2) * 100).toFixed(1)),
      smacnaCompliant: inputs.gauge <= smacna.recommendedGauge,
      warnings: [],
      recommendations: [smacna.reinforcementNote],
      dimensionsSummary: {
        'Diameter (D)': `${d} mm`,
        'Length (L)': `${l} mm`,
        'Circumference': `${circ.toFixed(1)} mm`,
        'Cutting Layout': `${numPieces} Part(s) (${style})`,
        'Blank Width per Part': `${Math.round(pieceBlankWidth)} mm`,
        'Blank Length': `${Math.round(blankLength)} mm`,
        'Crimp Male End': crimpEnd ? 'Yes (38mm)' : 'No',
        'Longitudinal Seam': seamSpec.name,
      },
    };
  }
}
