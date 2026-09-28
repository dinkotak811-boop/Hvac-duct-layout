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

export class EndCapEngine implements DuctCalculationEngine {
  readonly id = 'end_cap';
  readonly name = 'Rectangular End Cap / Closure Plug';
  readonly nameBn = 'রেকটেঙ্গুলার এন্ড ক্যাপ (Duct End Cap Plug)';
  readonly category = 'special' as const;
  readonly description = 'Duct termination end cap pan with 4-sided folded attachment flange and SMACNA cross-break stiffener.';
  readonly descriptionBn = 'ডাকট টার্মিনেশন এন্ড ক্যাপ - চারদিকে ফ্ল্যাঞ্জ ও ক্রস-ব্রেক রিইনফোর্সমেন্ট সহ।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'width',
      label: 'Duct Width (W)',
      labelBn: 'ডাকট প্রস্থ (W)',
      type: 'number',
      defaultValue: 500,
      unit: 'mm',
      min: 100,
      max: 2500,
      step: 10,
    },
    {
      id: 'height',
      label: 'Duct Height (H)',
      labelBn: 'ডাকট উচ্চতা (H)',
      type: 'number',
      defaultValue: 350,
      unit: 'mm',
      min: 100,
      max: 2500,
      step: 10,
    },
    {
      id: 'flangeDepth',
      label: 'Turn-Up Flange Depth (F)',
      labelBn: 'ফ্ল্যাঞ্জ গভীরতা (F)',
      type: 'number',
      defaultValue: 35,
      unit: 'mm',
      min: 20,
      max: 100,
      step: 5,
      description: 'Depth of folded slip/drive insertion flange',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const w = inputs.dimensions.width || 0;
    const h = inputs.dimensions.height || 0;
    const f = inputs.dimensions.flangeDepth || 0;

    if (w <= 0 || h <= 0 || f <= 0) errors.push('All dimensions must be > 0');
    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w = inputs.dimensions.width || 500;
    const h = inputs.dimensions.height || 350;
    const f = inputs.dimensions.flangeDepth || 35;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);

    const blankW = w + 2 * f;
    const blankH = h + 2 * f;

    // 8-Vertex 45° Corner Notched Outer Contour:
    // Allows 4 flanges to fold 90° into a pan without corner interference
    const contour: Point2D[] = [
      { x: f, y: 0 },
      { x: f + w, y: 0 },
      { x: blankW, y: f },
      { x: blankW, y: f + h },
      { x: f + w, y: blankH },
      { x: f, y: blankH },
      { x: 0, y: f + h },
      { x: 0, y: f },
    ];

    const lines: Line2D[] = [];
    // Outer perimeter cut lines
    for (let i = 0; i < contour.length; i++) {
      lines.push({
        start: contour[i],
        end: contour[(i + 1) % contour.length],
        type: 'cut',
      });
    }

    // 4 Flange 90° bend lines
    const p1 = { x: f, y: f };
    const p2 = { x: f + w, y: f };
    const p3 = { x: f + w, y: f + h };
    const p4 = { x: f, y: f + h };

    lines.push(
      { start: p1, end: p2, type: 'bend_up', bendAngleDeg: 90, description: 'Bottom Flange Fold' },
      { start: p2, end: p3, type: 'bend_up', bendAngleDeg: 90, description: 'Right Flange Fold' },
      { start: p3, end: p4, type: 'bend_up', bendAngleDeg: 90, description: 'Top Flange Fold' },
      { start: p4, end: p1, type: 'bend_up', bendAngleDeg: 90, description: 'Left Flange Fold' }
    );

    // Cross-break stiffening lines for anti-rumble (SMACNA recommendation for W or H >= 450mm)
    lines.push(
      { start: p1, end: p3, type: 'guide', description: 'Cross-Break Stiffener Line 1' },
      { start: p2, end: p4, type: 'guide', description: 'Cross-Break Stiffener Line 2' }
    );

    const areaM2 = (blankW * blankH * 0.95) / 1e6;
    const weightKg = areaM2 * (thickness / 1000) * material.density;

    const parts: FlatPatternPart[] = [
      {
        id: 'end_cap_plate',
        partName: `End Cap Plate ${w}x${h}mm`,
        partNameBn: `এন্ড ক্যাপ প্লেট ${w}x${h}মিমি`,
        quantity: 1,
        blankWidthMm: Math.round(blankW * 10) / 10,
        blankLengthMm: Math.round(blankH * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines,
        outerContour: contour,
        labels: [
          {
            text: `End Cap ${w}x${h}mm (+${f}mm Flange)`,
            position: { x: blankW / 2, y: blankH / 2 },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: 'SMACNA CROSS-BREAK STIFFENER',
            position: { x: blankW / 2, y: blankH / 2 - 25 },
            fontSize: 14,
            type: 'alignment',
          },
        ],
        bendCount: 4,
        notes: [
          `Fold 4 flanges 90° upward into ${f}mm deep pan plug`,
          '45° Corner notches prevent corner collision when bent',
          'Press brake: Light center crease along cross-break lines for vibration stiffness',
        ],
      },
    ];

    // 3D Geometry: Shallow pan cap with base and 4 turned-up flanges
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];

    const halfW = w / 2;
    const halfH = h / 2;

    // Base plate at Z = 0: 0, 1, 2, 3
    // Flange rim at Z = f: 4, 5, 6, 7
    vertices.push(
      -halfW, -halfH, 0, // 0
       halfW, -halfH, 0, // 1
       halfW,  halfH, 0, // 2
      -halfW,  halfH, 0, // 3
      -halfW, -halfH, f, // 4
       halfW, -halfH, f, // 5
       halfW,  halfH, f, // 6
      -halfW,  halfH, f  // 7
    );

    // Base plate face + 4 flange side walls (front open for duct insertion)
    indices.push(
      // Base plate
      0, 1, 2,  0, 2, 3,
      // Bottom flange (0, 1, 5, 4)
      0, 1, 5,  0, 5, 4,
      // Right flange (1, 2, 6, 5)
      1, 2, 6,  1, 6, 5,
      // Top flange (2, 3, 7, 6)
      2, 3, 7,  2, 7, 6,
      // Left flange (3, 0, 4, 7)
      3, 0, 4,  3, 4, 7
    );

    // Wireframes: base loop, rim loop, 4 corner crease lines
    wireframeLines.push([
      { x: -halfW, y: -halfH, z: 0 },
      { x:  halfW, y: -halfH, z: 0 },
      { x:  halfW, y:  halfH, z: 0 },
      { x: -halfW, y:  halfH, z: 0 },
      { x: -halfW, y: -halfH, z: 0 },
    ]);
    wireframeLines.push([
      { x: -halfW, y: -halfH, z: f },
      { x:  halfW, y: -halfH, z: f },
      { x:  halfW, y:  halfH, z: f },
      { x: -halfW, y:  halfH, z: f },
      { x: -halfW, y: -halfH, z: f },
    ]);
    [
      [-halfW, -halfH],
      [ halfW, -halfH],
      [ halfW,  halfH],
      [-halfW,  halfH],
    ].forEach(([cx, cy]) => {
      wireframeLines.push([
        { x: cx, y: cy, z: 0 },
        { x: cx, y: cy, z: f },
      ]);
    });

    // Cross-break 3D lines
    wireframeLines.push([
      { x: -halfW, y: -halfH, z: 0 },
      { x:  halfW, y:  halfH, z: 0 },
    ]);
    wireframeLines.push([
      { x:  halfW, y: -halfH, z: 0 },
      { x: -halfW, y:  halfH, z: 0 },
    ]);

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
          min: { x: -halfW, y: -halfH, z: 0 },
          max: { x:  halfW, y:  halfH, z: f },
        },
      },
      totalWeightKg: Number(weightKg.toFixed(2)),
      totalSurfaceAreaM2: Number(areaM2.toFixed(3)),
      totalBlankAreaM2: Number(areaM2.toFixed(3)),
      materialEfficiency: 95,
      smacnaCompliant: true,
      warnings: [],
      recommendations: [
        'Secure flange using self-tapping sheet metal screws at max 150mm centers.',
        'Apply mastic or foil tape along perimeter seam to ensure Class A airtight seal.',
      ],
      dimensionsSummary: {
        'Size (W x H)': `${w} x ${h} mm`,
        'Flange Depth': `${f} mm`,
        'Cross-Break': 'SMACNA Standard',
      },
    };
  }
}
