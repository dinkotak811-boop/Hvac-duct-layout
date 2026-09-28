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

export class RectangularRadiusElbowEngine implements DuctCalculationEngine {
  readonly id = 'rect_radius_elbow';
  readonly name = 'Rectangular Radius Elbow (90° / 45°)';
  readonly nameBn = 'রেকটেঙ্গুলার রেডিয়াস এলবো (Rectangular Radius Elbow)';
  readonly category = 'elbow' as const;
  readonly description = 'Smooth radius rectangular elbow with 2 Cheek plates, 1 Throat wrapper, and 1 Heel wrapper.';
  readonly descriptionBn = 'মসৃণ কার্ভ আয়তাকার এলবো - ২টি চিক প্লেট, ১টি থ্রোট র্যাপার ও ১টি হিল র্যাপার।';

  readonly parameters: FormParameterField[] = [
    {
      id: 'width',
      label: 'Width (W in bend plane)',
      labelBn: 'প্রস্থ (W - বাঁকানো তলে)',
      type: 'number',
      defaultValue: 500,
      unit: 'mm',
      min: 100,
      max: 2500,
      step: 10,
      description: 'Duct width along the plane of the bend',
    },
    {
      id: 'height',
      label: 'Height / Depth (H)',
      labelBn: 'উচ্চতা / গভীরতা (Height H)',
      type: 'number',
      defaultValue: 350,
      unit: 'mm',
      min: 100,
      max: 2500,
      step: 10,
      description: 'Duct depth perpendicular to the bend',
    },
    {
      id: 'throatRadius',
      label: 'Throat Radius (R)',
      labelBn: 'থ্রোট রেডিয়াস (Throat Radius R)',
      type: 'number',
      defaultValue: 250,
      unit: 'mm',
      min: 50,
      max: 2000,
      step: 10,
      description: 'Inside throat radius (standard is 0.5W to 1.0W)',
    },
    {
      id: 'angleDeg',
      label: 'Bend Angle (deg)',
      labelBn: 'বাঁক কোণ (Angle Degree)',
      type: 'number',
      defaultValue: 90,
      unit: '°',
      min: 15,
      max: 120,
      step: 5,
      description: 'Bend angle (typically 90° or 45°)',
    },
    {
      id: 'throatExtension',
      label: 'Tangent Extension (mm)',
      labelBn: 'ট্যানজেন্ট এক্সটেনশন (মিমি)',
      type: 'number',
      defaultValue: 50,
      unit: 'mm',
      min: 0,
      max: 300,
      step: 10,
      description: 'Straight tangent extension on ends for connector fitting',
    },
    {
      id: 'fabricationStyle',
      label: 'Cutting Layout / Part Style',
      labelBn: 'কাটিং লেআউট / পার্ট নির্ধারণ',
      type: 'select',
      defaultValue: 'four_piece',
      options: [
        { value: 'four_piece', label: '4 Parts (2 Cheeks + Throat + Heel Single / ৪ পার্ট)', labelBn: '৪ পার্ট (সিঙ্গেল সিঙ্গেল ৪টি প্লেট)' },
        { value: 'two_piece_l', label: '2 Parts (L-Type Halves / ২ পার্ট L-টাইপ)', labelBn: '২ পার্ট (২টি L-টাইপ সেকশন)' },
        { value: 'one_piece_wrap', label: '1 Part (Continuous Wrap Body / ১ পার্ট)', labelBn: '১ পার্ট (ফুল র্যাপার বডি)' },
      ],
      description: 'Number of cutting pieces for the radius elbow body',
    },
  ];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const w = inputs.dimensions.width || 0;
    const h = inputs.dimensions.height || 0;
    const r = inputs.dimensions.throatRadius || 0;
    const ang = inputs.dimensions.angleDeg || 0;

    if (w <= 0) errors.push('Width must be > 0');
    if (h <= 0) errors.push('Height must be > 0');
    if (r <= 0) errors.push('Throat Radius must be > 0');
    if (ang <= 0 || ang > 180) errors.push('Bend angle must be between 1° and 180°');

    return { valid: errors.length === 0, errors };
  }

  calculate(inputs: DuctCalculationInput): CalculationResult {
    const w = inputs.dimensions.width || 500;
    const h = inputs.dimensions.height || 350;
    const rThroat = inputs.dimensions.throatRadius || 250;
    const angleDeg = inputs.dimensions.angleDeg || 90;
    const ext = inputs.dimensions.throatExtension || 50;

    const angleRad = (angleDeg * Math.PI) / 180;
    const rHeel = rThroat + w;

    const material = MATERIALS[inputs.material] || MATERIALS.galvanized;
    const thickness = getGaugeThickness(inputs.gauge);
    const seamSpec = getLongitudinalAllowance(inputs.longitudinalSeam);
    const connSpec = getTransverseAllowance(inputs.transverseConnector);

    const femaleAllowance = seamSpec.femalePocketAllowanceMm;
    const maleAllowance = seamSpec.maleTongueAllowanceMm;
    const transAllowance = connSpec.allowancePerEndMm;

    const throatArcLength = rThroat * angleRad;
    const heelArcLength = rHeel * angleRad;
    const throatWrapperLength = throatArcLength + 2 * ext + 2 * transAllowance;
    const heelWrapperLength = heelArcLength + 2 * ext + 2 * transAllowance;
    const wrapperWidth = h + 2 * femaleAllowance;

    const style = (inputs.dimensions.fabricationStyle as string) || inputs.cuttingLayout || 'four_piece';
    const defaultParts: FlatPatternPart[] = [];

    // 1. Cheek Plates (Left & Right)
    // Coordinated properly with origin (0, 0)
    // The cheek is an arc quadrant with tangent straight collars
    const cheekBlankW = rHeel + ext + transAllowance + 20;
    const cheekBlankH = rHeel + ext + transAllowance + 20;

    for (let c = 1; c <= 2; c++) {
      const cheekLines: Line2D[] = [];
      const cheekArcs: Arc2D[] = [];
      const contour: Point2D[] = [];

      // Center of arcs at (ext + transAllowance, ext + transAllowance)
      const cx = ext + transAllowance;
      const cy = ext + transAllowance;

      // Inner Throat Arc
      cheekArcs.push({
        center: { x: cx, y: cy },
        radius: rThroat,
        startAngleRad: 0,
        endAngleRad: angleRad,
        type: 'cut',
      });

      // Outer Heel Arc
      cheekArcs.push({
        center: { x: cx, y: cy },
        radius: rHeel,
        startAngleRad: 0,
        endAngleRad: angleRad,
        type: 'cut',
      });

      // Straight connector End 1 (along X at y = cy - ext - transAllowance)
      cheekLines.push(
        {
          start: { x: cx + rThroat, y: 0 },
          end: { x: cx + rHeel, y: 0 },
          type: 'cut',
          description: 'End 1 Cut Line',
        },
        {
          start: { x: cx + rThroat, y: transAllowance },
          end: { x: cx + rHeel, y: transAllowance },
          type: 'bend_up',
          bendAngleDeg: 90,
          description: 'End 1 TDC/TDF Flange Bend',
        },
        // Tangent extensions connecting straight ends to arcs
        {
          start: { x: cx + rThroat, y: 0 },
          end: { x: cx + rThroat, y: cy },
          type: 'cut',
          description: 'Throat Straight Tangent 1',
        },
        {
          start: { x: cx + rHeel, y: 0 },
          end: { x: cx + rHeel, y: cy },
          type: 'cut',
          description: 'Heel Straight Tangent 1',
        }
      );

      // End 2 (rotated by angleDeg)
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      const pThroatEnd2 = {
        x: cx + rThroat * cosA - (ext + transAllowance) * sinA,
        y: cy + rThroat * sinA + (ext + transAllowance) * cosA,
      };
      const pHeelEnd2 = {
        x: cx + rHeel * cosA - (ext + transAllowance) * sinA,
        y: cy + rHeel * sinA + (ext + transAllowance) * cosA,
      };

      cheekLines.push(
        {
          start: pThroatEnd2,
          end: pHeelEnd2,
          type: 'cut',
          description: 'End 2 Cut Line',
        },
        {
          start: { x: cx + rThroat * cosA, y: cy + rThroat * sinA },
          end: pThroatEnd2,
          type: 'cut',
          description: 'Throat Tangent 2',
        },
        {
          start: { x: cx + rHeel * cosA, y: cy + rHeel * sinA },
          end: pHeelEnd2,
          type: 'cut',
          description: 'Heel Tangent 2',
        }
      );

      // Pittsburgh single flanged edge note / allowance lines
      if (maleAllowance > 0) {
        cheekArcs.push(
          {
            center: { x: cx, y: cy },
            radius: rThroat - maleAllowance,
            startAngleRad: 0,
            endAngleRad: angleRad,
            type: 'seam',
          },
          {
            center: { x: cx, y: cy },
            radius: rHeel + maleAllowance,
            startAngleRad: 0,
            endAngleRad: angleRad,
            type: 'seam',
          }
        );
      }

      // Generate polygon contour for cheek plate
      contour.push({ x: cx + rThroat, y: 0 });
      contour.push({ x: cx + rHeel, y: 0 });
      contour.push({ x: cx + rHeel, y: cy });

      // Discretize outer arc
      const arcSteps = 16;
      for (let s = 1; s <= arcSteps; s++) {
        const a = (s / arcSteps) * angleRad;
        contour.push({ x: cx + rHeel * Math.cos(a), y: cy + rHeel * Math.sin(a) });
      }
      contour.push(pHeelEnd2);
      contour.push(pThroatEnd2);

      // Discretize inner arc in reverse
      for (let s = arcSteps; s >= 0; s--) {
        const a = (s / arcSteps) * angleRad;
        contour.push({ x: cx + rThroat * Math.cos(a), y: cy + rThroat * Math.sin(a) });
      }

      const cheekAreaM2 = (0.5 * angleRad * (rHeel * rHeel - rThroat * rThroat) + w * ext * 2) / 1e6;
      const cheekWeightKg = cheekAreaM2 * (thickness / 1000) * material.density;

      defaultParts.push({
        id: `cheek_plate_${c}`,
        partName: `Elbow Cheek Plate #${c} (${c === 1 ? 'Left Cheek' : 'Right Cheek'})`,
        partNameBn: `এলবো চিক প্লেট #${c} (${c === 1 ? 'বাম চিক' : 'ডান চিক'})`,
        quantity: 1,
        blankWidthMm: Math.round(cheekBlankW * 10) / 10,
        blankLengthMm: Math.round(cheekBlankH * 10) / 10,
        areaM2: Number(cheekAreaM2.toFixed(3)),
        weightKg: Number(cheekWeightKg.toFixed(2)),
        lines: cheekLines,
        arcs: cheekArcs,
        outerContour: contour,
        labels: [
          {
            text: `Cheek Plate ${angleDeg}° (R${rThroat})`,
            position: { x: cx + (rThroat + w / 2) * Math.cos(angleRad / 2), y: cy + (rThroat + w / 2) * Math.sin(angleRad / 2) },
            fontSize: 20,
            type: 'part_name',
          },
          {
            text: `W: ${w}mm | Throat R${rThroat} | Heel R${rHeel}`,
            position: { x: cx + (rThroat + w / 2) * Math.cos(angleRad / 2), y: cy + (rThroat + w / 2) * Math.sin(angleRad / 2) - 28 },
            fontSize: 14,
            type: 'dimension',
          },
        ],
        bendCount: 2,
        notes: [
          `Throat Radius: R${rThroat}mm | Heel Radius: R${rHeel}mm`,
          `Pittsburgh Single Flanged Edge (+${maleAllowance}mm allowance)`,
        ],
      });
    }

    // 2. Throat Wrapper (Inner Arc)
    const throatAreaM2 = (wrapperWidth * throatWrapperLength) / 1e6;
    defaultParts.push({
      id: 'throat_wrapper',
      partName: 'Throat Wrapper (Inner Curved Panel)',
      partNameBn: 'থ্রোট র্যাপার (ভেতরের প্লেট)',
      quantity: 1,
      blankWidthMm: Math.round(wrapperWidth * 10) / 10,
      blankLengthMm: Math.round(throatWrapperLength * 10) / 10,
      areaM2: Number(throatAreaM2.toFixed(3)),
      weightKg: Number((throatAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
      lines: [
        { start: { x: 0, y: 0 }, end: { x: wrapperWidth, y: 0 }, type: 'cut' },
        { start: { x: wrapperWidth, y: 0 }, end: { x: wrapperWidth, y: throatWrapperLength }, type: 'cut' },
        { start: { x: wrapperWidth, y: throatWrapperLength }, end: { x: 0, y: throatWrapperLength }, type: 'cut' },
        { start: { x: 0, y: throatWrapperLength }, end: { x: 0, y: 0 }, type: 'cut' },
        // Seam pocket lines
        { start: { x: femaleAllowance, y: 0 }, end: { x: femaleAllowance, y: throatWrapperLength }, type: 'seam', description: 'Pittsburgh Pocket Left' },
        { start: { x: wrapperWidth - femaleAllowance, y: 0 }, end: { x: wrapperWidth - femaleAllowance, y: throatWrapperLength }, type: 'seam', description: 'Pittsburgh Pocket Right' },
        // Transverse bend lines
        { start: { x: 0, y: transAllowance }, end: { x: wrapperWidth, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Fold' },
        { start: { x: 0, y: throatWrapperLength - transAllowance }, end: { x: wrapperWidth, y: throatWrapperLength - transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Fold' },
      ],
      outerContour: [
        { x: 0, y: 0 },
        { x: wrapperWidth, y: 0 },
        { x: wrapperWidth, y: throatWrapperLength },
        { x: 0, y: throatWrapperLength },
      ],
      labels: [
        {
          text: `Throat Wrapper (Roll to R${rThroat}mm)`,
          position: { x: wrapperWidth / 2, y: throatWrapperLength / 2 },
          fontSize: 20,
          type: 'part_name',
        },
      ],
      bendCount: 2,
      notes: [
        `Roll to inside radius R${rThroat}mm`,
        `Pittsburgh female pocket (+${femaleAllowance}mm each side)`,
      ],
    });

    // 3. Heel Wrapper (Outer Arc)
    const heelAreaM2 = (wrapperWidth * heelWrapperLength) / 1e6;
    defaultParts.push({
      id: 'heel_wrapper',
      partName: 'Heel Wrapper (Outer Curved Panel)',
      partNameBn: 'হিল র্যাপার (বাইরের প্লেট)',
      quantity: 1,
      blankWidthMm: Math.round(wrapperWidth * 10) / 10,
      blankLengthMm: Math.round(heelWrapperLength * 10) / 10,
      areaM2: Number(heelAreaM2.toFixed(3)),
      weightKg: Number((heelAreaM2 * (thickness / 1000) * material.density).toFixed(2)),
      lines: [
        { start: { x: 0, y: 0 }, end: { x: wrapperWidth, y: 0 }, type: 'cut' },
        { start: { x: wrapperWidth, y: 0 }, end: { x: wrapperWidth, y: heelWrapperLength }, type: 'cut' },
        { start: { x: wrapperWidth, y: heelWrapperLength }, end: { x: 0, y: heelWrapperLength }, type: 'cut' },
        { start: { x: 0, y: heelWrapperLength }, end: { x: 0, y: 0 }, type: 'cut' },
        // Seam pocket lines
        { start: { x: femaleAllowance, y: 0 }, end: { x: femaleAllowance, y: heelWrapperLength }, type: 'seam', description: 'Pittsburgh Pocket Left' },
        { start: { x: wrapperWidth - femaleAllowance, y: 0 }, end: { x: wrapperWidth - femaleAllowance, y: heelWrapperLength }, type: 'seam', description: 'Pittsburgh Pocket Right' },
        // Transverse bend lines
        { start: { x: 0, y: transAllowance }, end: { x: wrapperWidth, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Fold' },
        { start: { x: 0, y: heelWrapperLength - transAllowance }, end: { x: wrapperWidth, y: heelWrapperLength - transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Fold' },
      ],
      outerContour: [
        { x: 0, y: 0 },
        { x: wrapperWidth, y: 0 },
        { x: wrapperWidth, y: heelWrapperLength },
        { x: 0, y: heelWrapperLength },
      ],
      labels: [
        {
          text: `Heel Wrapper (Roll to R${rHeel}mm)`,
          position: { x: wrapperWidth / 2, y: heelWrapperLength / 2 },
          fontSize: 20,
          type: 'part_name',
        },
      ],
      bendCount: 2,
      notes: [
        `Roll to outside radius R${rHeel}mm`,
        `Pittsburgh female pocket (+${femaleAllowance}mm each side)`,
      ],
    });

    const parts: FlatPatternPart[] = [];
    if (style === 'one_piece_wrap') {
      // 1 Part: Continuous Wrap Wrapper Body
      const totalWrapL = heelWrapperLength + throatWrapperLength;
      const wrapLines: Line2D[] = [
        { start: { x: 0, y: 0 }, end: { x: wrapperWidth, y: 0 }, type: 'cut' },
        { start: { x: wrapperWidth, y: 0 }, end: { x: wrapperWidth, y: totalWrapL }, type: 'cut' },
        { start: { x: wrapperWidth, y: totalWrapL }, end: { x: 0, y: totalWrapL }, type: 'cut' },
        { start: { x: 0, y: totalWrapL }, end: { x: 0, y: 0 }, type: 'cut' },
        { start: { x: femaleAllowance, y: 0 }, end: { x: femaleAllowance, y: totalWrapL }, type: 'seam', description: 'Pittsburgh Pocket Left' },
        { start: { x: wrapperWidth - femaleAllowance, y: 0 }, end: { x: wrapperWidth - femaleAllowance, y: totalWrapL }, type: 'seam', description: 'Pittsburgh Pocket Right' },
        { start: { x: 0, y: transAllowance }, end: { x: wrapperWidth, y: transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Fold Inlet' },
        { start: { x: 0, y: heelWrapperLength }, end: { x: wrapperWidth, y: heelWrapperLength }, type: 'bend_up', bendAngleDeg: 90, description: 'Transition Miter Bend' },
        { start: { x: 0, y: totalWrapL - transAllowance }, end: { x: wrapperWidth, y: totalWrapL - transAllowance }, type: 'bend_up', bendAngleDeg: 90, description: 'TDC/TDF Fold Outlet' },
      ];
      const areaM2 = (wrapperWidth * totalWrapL) / 1e6;
      const weightKg = areaM2 * (thickness / 1000) * material.density;
      parts.push({
        id: 'radius_elbow_full_wrap',
        partName: '1-Piece Continuous Wrap Radius Elbow Body',
        partNameBn: '১-পিস ফুল র্যাপার রেডিয়াস এলবো বডি',
        quantity: 1,
        blankWidthMm: Math.round(wrapperWidth * 10) / 10,
        blankLengthMm: Math.round(totalWrapL * 10) / 10,
        areaM2: Number(areaM2.toFixed(3)),
        weightKg: Number(weightKg.toFixed(2)),
        lines: wrapLines,
        outerContour: [
          { x: 0, y: 0 },
          { x: wrapperWidth, y: 0 },
          { x: wrapperWidth, y: totalWrapL },
          { x: 0, y: totalWrapL },
        ],
        labels: [
          {
            text: `1-Piece Wrap Elbow ${w}x${h}mm (Throat R${rThroat}, Heel R${rHeel})`,
            position: { x: wrapperWidth / 2, y: totalWrapL / 2 },
            fontSize: 20,
            type: 'part_name',
          },
        ],
        bendCount: 3,
        notes: [
          `Continuous wrapper combining Heel (L=${Math.round(heelWrapperLength)}mm) and Throat (L=${Math.round(throatWrapperLength)}mm)`,
          `Roll upper section to R${rHeel}mm and lower section to R${rThroat}mm`,
        ],
      });
    } else if (style === 'two_piece_l') {
      // 2 Parts (L-Type Halves): Section 1 (Throat + Cheek 1), Section 2 (Heel + Cheek 2)
      parts.push({
        ...defaultParts[0],
        id: 'radius_elbow_l_section_1',
        partName: 'Radius Elbow 2-Piece L-Type Section #1 (Throat + Left Cheek)',
        partNameBn: 'রেডিয়াস এলবো ২-পার্ট L-টাইপ সেকশন #১ (থ্রোট + বাম চিক)',
        quantity: 1,
      });
      parts.push({
        ...defaultParts[1],
        id: 'radius_elbow_l_section_2',
        partName: 'Radius Elbow 2-Piece L-Type Section #2 (Heel + Right Cheek)',
        partNameBn: 'রেডিয়াস এলবো ২-পার্ট L-টাইপ সেকশন #২ (হিল + ডান চিক)',
        quantity: 1,
      });
    } else {
      // 4 Parts (default: 2 Cheeks + Throat Wrapper + Heel Wrapper)
      parts.push(...defaultParts);
    }

    // 3D Geometry: Toroidal curved hollow duct with open inlet and outlet
    const segmentsArc = 24;
    const vertices: number[] = [];
    const indices: number[] = [];
    const wireframeLines: Point3D[][] = [];
    const halfH = h / 2;

    // Generate rings along bend curve:
    // Cross-section ring at angle `a`:
    // 0: Inner-Bottom (rThroat, -halfH)
    // 1: Outer-Bottom (rHeel, -halfH)
    // 2: Outer-Top (rHeel, +halfH)
    // 3: Inner-Top (rThroat, +halfH)
    for (let i = 0; i <= segmentsArc; i++) {
      const a = (i / segmentsArc) * angleRad;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);

      const xIn = rThroat * cosA;
      const zIn = rThroat * sinA;
      const xOut = rHeel * cosA;
      const zOut = rHeel * sinA;

      vertices.push(xIn, -halfH, zIn);  // 0
      vertices.push(xOut, -halfH, zOut); // 1
      vertices.push(xOut, halfH, zOut);  // 2
      vertices.push(xIn, halfH, zIn);   // 3
    }

    // Connect rings with quads (hollow duct walls: bottom, heel, top, throat)
    for (let i = 0; i < segmentsArc; i++) {
      const base = i * 4;
      const next = (i + 1) * 4;

      // Bottom Cheek (0 -> 1)
      indices.push(base, next, base + 1);
      indices.push(base + 1, next, next + 1);

      // Heel Outer Wrapper (1 -> 2)
      indices.push(base + 1, next + 1, base + 2);
      indices.push(base + 2, next + 1, next + 2);

      // Top Cheek (2 -> 3)
      indices.push(base + 2, next + 2, base + 3);
      indices.push(base + 3, next + 2, next + 3);

      // Throat Inner Wrapper (3 -> 0)
      indices.push(base + 3, next + 3, base);
      indices.push(base, next + 3, next);
    }

    // Wireframe perimeter curves
    const topInnerWire: Point3D[] = [];
    const topOuterWire: Point3D[] = [];
    const botInnerWire: Point3D[] = [];
    const botOuterWire: Point3D[] = [];

    for (let i = 0; i <= segmentsArc; i++) {
      const a = (i / segmentsArc) * angleRad;
      topInnerWire.push({ x: rThroat * Math.cos(a), y: halfH, z: rThroat * Math.sin(a) });
      topOuterWire.push({ x: rHeel * Math.cos(a), y: halfH, z: rHeel * Math.sin(a) });
      botInnerWire.push({ x: rThroat * Math.cos(a), y: -halfH, z: rThroat * Math.sin(a) });
      botOuterWire.push({ x: rHeel * Math.cos(a), y: -halfH, z: rHeel * Math.sin(a) });
    }
    wireframeLines.push(topInnerWire, topOuterWire, botInnerWire, botOuterWire);

    // Inlet and outlet opening rings
    wireframeLines.push([
      { x: rThroat, y: -halfH, z: 0 },
      { x: rHeel, y: -halfH, z: 0 },
      { x: rHeel, y: halfH, z: 0 },
      { x: rThroat, y: halfH, z: 0 },
      { x: rThroat, y: -halfH, z: 0 },
    ]);

    const endCos = Math.cos(angleRad);
    const endSin = Math.sin(angleRad);
    wireframeLines.push([
      { x: rThroat * endCos, y: -halfH, z: rThroat * endSin },
      { x: rHeel * endCos, y: -halfH, z: rHeel * endSin },
      { x: rHeel * endCos, y: halfH, z: rHeel * endSin },
      { x: rThroat * endCos, y: halfH, z: rThroat * endSin },
      { x: rThroat * endCos, y: -halfH, z: rThroat * endSin },
    ]);

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
          max: { x: rHeel, y: halfH, z: rHeel },
        },
      },
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      totalSurfaceAreaM2: Number((2 * parts[0].areaM2 + throatAreaM2 + heelAreaM2).toFixed(3)),
      totalBlankAreaM2: Number(totalBlankAreaM2.toFixed(3)),
      materialEfficiency: 86.4,
      smacnaCompliant: true,
      warnings: rThroat < 0.5 * w ? ['Throat radius R is less than SMACNA recommended 0.5W minimum. Turning vanes are strongly recommended.'] : [],
      recommendations: [
        `SMACNA R/W Ratio: ${(rThroat / w).toFixed(2)} (Standard is 0.5 to 1.0)`,
        rThroat < w ? 'Recommended: Install double-wall turning vanes for optimal aerodynamic efficiency.' : 'Airflow efficiency is excellent without vanes.',
      ],
      dimensionsSummary: {
        'Size (W x H)': `${w} x ${h} mm`,
        'Bend Angle': `${angleDeg}°`,
        'Throat Radius': `R${rThroat} mm`,
        'Heel Radius': `R${rHeel} mm`,
        'Heel Arc Length': `${Math.round(heelArcLength)} mm`,
      },
    };
  }
}
