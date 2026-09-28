/**
 * Automated Manufacturing Validation Engine
 * 
 * Inspects 2D/3D duct fitting parameters and geometry for physical manufacturing impossibilities:
 * - Negative or zero inside radii (e.g., throatRadius <= 0, centerlineRadius <= diameter / 2)
 * - Zero-length throats and insufficient tangent extensions for roll-forming / TDC/TDF flanges
 * - Acute-angle intersections (e.g., wye branch < 20°, saddle miter clashes, acute crotches)
 * - Fish-mouth and miter cut penetrations slicing through host duct or exceeding pipe length
 * - Transition slope extremes / inverted triangulation petals (square-to-round, steep tapers)
 * - Oval straight inverted flat lengths (majorAxis < minorAxis)
 * - Offset jog length vs collar geometry collapse
 * - Damper blade swing interference beyond sleeve casing
 * - Sheet metal seam machine tooling clearances (Pittsburgh / Snaplock min throat width)
 */

import { DuctCalculationInput, MaterialType, LongitudinalSeam, TransverseConnector } from '../types';

export type ValidationSeverity = 'error' | 'warning';

export type ValidationCategory =
  | 'GEOMETRIC_IMPOSSIBILITY'
  | 'NEGATIVE_RADIUS'
  | 'ZERO_THROAT'
  | 'ACUTE_ANGLE_INTERSECTION'
  | 'INTERFERENCE_COLLISION'
  | 'ASPECT_RATIO_LIMIT'
  | 'SEAM_TOOLING_CLEARANCE';

export interface ValidationIssue {
  id: string;
  fieldId: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  titleEn: string;
  titleBn: string;
  messageEn: string;
  messageBn: string;
  problematicValue: any;
  suggestedValue?: any;
  minAllowed?: number;
  maxAllowed?: number;
}

export interface ManufacturingValidationResult {
  isValid: boolean;
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  fieldIssues: Record<string, ValidationIssue[]>;
}

export class ManufacturingValidationEngine {
  /**
   * Main entry point to validate any duct fitting input
   */
  public static validate(inputs: DuctCalculationInput): ManufacturingValidationResult {
    const issues: ValidationIssue[] = [];
    const dims = inputs.dimensions || {};
    const modelId = inputs.modelId;

    // 1. General non-negativity checks on all dimensions
    Object.entries(dims).forEach(([key, val]) => {
      if (typeof val === 'number' && isNaN(val)) {
        issues.push({
          id: `nan_${key}`,
          fieldId: key,
          severity: 'error',
          category: 'GEOMETRIC_IMPOSSIBILITY',
          titleEn: 'Invalid Numerical Value',
          titleBn: 'অকার্যকর সংখ্যা',
          messageEn: `The value for ${key} is not a valid number (NaN).`,
          messageBn: `${key}-এর মান একটি সঠিক সংখ্যা নয়।`,
          problematicValue: val,
          suggestedValue: 100,
        });
      }
    });

    // 2. Model-specific geometric validation
    switch (modelId) {
      case 'rect_radius_elbow':
      case 'rect_45_elbow': {
        const w = Number(dims.width) || 0;
        const h = Number(dims.height) || 0;
        const r = Number(dims.throatRadius);
        const ext = Number(dims.throatExtension);
        const ang = Number(dims.angleDeg);

        if (w <= 0) {
          issues.push({
            id: 'err_w_le0',
            fieldId: 'width',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Negative or Zero Width',
            titleBn: 'নেগেটিভ বা শূন্য প্রস্থ',
            messageEn: 'Duct width must be greater than zero. Sheet metal cannot be formed into a hollow duct with zero width.',
            messageBn: 'ডাক্টের প্রস্থ অবশ্যই ০ এর বেশি হতে হবে।',
            problematicValue: w,
            suggestedValue: 500,
            minAllowed: 100,
          });
        }

        if (h <= 0) {
          issues.push({
            id: 'err_h_le0',
            fieldId: 'height',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Negative or Zero Height',
            titleBn: 'নেগেটিভ বা শূন্য উচ্চতা',
            messageEn: 'Duct height must be greater than zero for airflow volume and side cheek plate assembly.',
            messageBn: 'ডাক্টের উচ্চতা অবশ্যই ০ এর বেশি হতে হবে।',
            problematicValue: h,
            suggestedValue: 350,
            minAllowed: 100,
          });
        }

        // Negative or Zero Throat Radius
        if (r === undefined || r <= 0) {
          issues.push({
            id: 'err_throat_le0',
            fieldId: 'throatRadius',
            severity: 'error',
            category: 'NEGATIVE_RADIUS',
            titleEn: 'Negative or Zero Throat Radius',
            titleBn: 'নেগেটিভ বা শূন্য থ্রোট রেডিয়াস',
            messageEn: `Throat radius (${r}mm) cannot be zero or negative. A radius elbow requires an inside curve (R > 0). For sharp 90° corners, use a Square Elbow.`,
            messageBn: `থ্রোট রেডিয়াস (${r}মিমি) শূন্য বা ঋণাত্মক হতে পারে না। মসৃণ বাঁকের জন্য ভিতরের রেডিয়াস অবশ্যই ধনাত্মক হতে হবে।`,
            problematicValue: r,
            suggestedValue: Math.max(150, Math.round(w * 0.5)),
            minAllowed: 50,
          });
        } else if (r < 50) {
          issues.push({
            id: 'warn_throat_tight',
            fieldId: 'throatRadius',
            severity: 'warning',
            category: 'ASPECT_RATIO_LIMIT',
            titleEn: 'Extremely Tight Throat Radius',
            titleBn: 'অতিরিক্ত আঁটসাঁট থ্রোট রেডিয়াস',
            messageEn: `Throat radius (${r}mm) is smaller than standard 50mm brake die clearance. May cause sheet metal cracking or roll-forming jamming.`,
            messageBn: `থ্রোট রেডিয়াস (${r}মিমি) ৫০মিমি-এর চেয়ে কম, যা বাঁকানোর সময় শিট মেটাল ফেটে যাওয়ার ঝুঁকি তৈরি করে।`,
            problematicValue: r,
            suggestedValue: 150,
            minAllowed: 50,
          });
        }

        // Tangent extension for connectors
        if (ext !== undefined && ext < 25 && inputs.transverseConnector === 'tdc_tdf') {
          issues.push({
            id: 'err_ext_tdc',
            fieldId: 'throatExtension',
            severity: 'error',
            category: 'ZERO_THROAT',
            titleEn: 'Insufficient Tangent for TDC/TDF Flange',
            titleBn: 'TDC/TDF ফ্ল্যাঞ্জের জন্য অপর্যাপ্ত ট্যানজেন্ট',
            messageEn: `Straight tangent extension (${ext}mm) is too short. Roll-formed TDC/TDF flanges require at least 35mm straight throat clearance before the curve starts.`,
            messageBn: `ট্যানজেন্ট এক্সটেনশন (${ext}মিমি) খুব কম। TDC/TDF রোলের জন্য কমপক্ষে ৩৫মিমি সোজা অংশ প্রয়োজন।`,
            problematicValue: ext,
            suggestedValue: 50,
            minAllowed: 35,
          });
        }

        if (ang !== undefined && (ang <= 0 || ang > 180)) {
          issues.push({
            id: 'err_ang_bounds',
            fieldId: 'angleDeg',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Invalid Elbow Bend Angle',
            titleBn: 'অকার্যকর এলবো বাঁক কোণ',
            messageEn: `Elbow angle (${ang}°) must be between 15° and 180°. Angles <= 0° or > 180° produce non-manufacturable cheek geometries.`,
            messageBn: `এলবো কোণ (${ang}°) অবশ্যই ১৫° থেকে ১৮০° এর মধ্যে হতে হবে।`,
            problematicValue: ang,
            suggestedValue: 90,
            minAllowed: 15,
            maxAllowed: 180,
          });
        }
        break;
      }

      case 'rect_square_elbow': {
        const w = Number(dims.width) || 0;
        const h = Number(dims.height) || 0;
        const ext = Number(dims.extension);

        if (w <= 0 || h <= 0) {
          issues.push({
            id: 'err_sq_wh',
            fieldId: w <= 0 ? 'width' : 'height',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Non-Positive Cross Section',
            titleBn: 'অকার্যকর প্রস্থ/উচ্চতা',
            messageEn: 'Width and height must both be greater than 0 mm.',
            messageBn: 'প্রস্থ ও উচ্চতা অবশ্যই ০ এর বেশি হতে হবে।',
            problematicValue: w <= 0 ? w : h,
            suggestedValue: 500,
            minAllowed: 100,
          });
        }

        if (ext !== undefined && ext <= 0) {
          issues.push({
            id: 'err_sq_ext_zero',
            fieldId: 'extension',
            severity: 'error',
            category: 'ZERO_THROAT',
            titleEn: 'Zero-Length Straight Tangent',
            titleBn: 'শূন্য-দৈর্ঘ্য সোজা ট্যানজেন্ট',
            messageEn: 'Zero tangent collar extension means transverse duct connector cannot clamp or hem onto the miter corner.',
            messageBn: 'ট্যানজেন্ট শূন্য হলে ডাক্ট কানেক্টর বা ফ্ল্যাঞ্জ যুক্ত করা অসম্ভব।',
            problematicValue: ext,
            suggestedValue: 75,
            minAllowed: 40,
          });
        } else if (ext !== undefined && ext < 30) {
          issues.push({
            id: 'warn_sq_ext_short',
            fieldId: 'extension',
            severity: 'warning',
            category: 'SEAM_TOOLING_CLEARANCE',
            titleEn: 'Short Tangent Extension',
            titleBn: 'স্বল্প ট্যানজেন্ট দৈর্ঘ্য',
            messageEn: `Straight extension (${ext}mm) is under SMACNA recommended minimum 50mm for turning vane rail installation.`,
            messageBn: `টার্নিং ভেন রানার লাগানোর জন্য কমপক্ষে ৫০মিমি ট্যানজেন্ট সুপারিশকৃত।`,
            problematicValue: ext,
            suggestedValue: 75,
            minAllowed: 30,
          });
        }
        break;
      }

      case 'round_segmented_elbow': {
        const d = Number(dims.diameter) || 0;
        const rCl = Number(dims.centerlineRadius) || 0;
        const numGores = Number(dims.numGores) || 0;
        const ang = Number(dims.angleDeg) || 0;

        if (d <= 0) {
          issues.push({
            id: 'err_round_d_le0',
            fieldId: 'diameter',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Non-Positive Duct Diameter',
            titleBn: 'অকার্যকর ডাক্ট ব্যাস',
            messageEn: 'Round duct diameter must be positive.',
            messageBn: 'রাউন্ড ডাক্টের ব্যাস অবশ্যই ০ এর বেশি হতে হবে।',
            problematicValue: d,
            suggestedValue: 400,
            minAllowed: 100,
          });
        }

        // Geometric Impossibility: Inside throat radius <= 0
        const throatR = rCl - d / 2;
        if (throatR <= 0) {
          issues.push({
            id: 'err_gore_throat_negative',
            fieldId: 'centerlineRadius',
            severity: 'error',
            category: 'NEGATIVE_RADIUS',
            titleEn: 'Negative / Zero Inside Throat Radius',
            titleBn: 'নেগেটিভ বা শূন্য ইনসাইড থ্রোট রেডিয়াস',
            messageEn: `Centerline radius (${rCl}mm) is <= half-diameter (${d/2}mm), resulting in a negative inside throat radius (${throatR}mm). The inner gore miters intersect and invert, making fabrication impossible. Increase Centerline Radius to at least ${Math.round(d * 0.75)}mm (1.0D to 1.5D recommended).`,
            messageBn: `সেন্টারলাইন রেডিয়াস (${rCl}মিমি) ডাক্টের ব্যাসার্ধ (${d/2}মিমি) এর সমান বা ছোট, ফলে ভেতরের থ্রোট রেডিয়াস ঋণাত্মক (${throatR}মিমি) হয়ে যায় যা তৈরি করা অসম্ভব। সেন্টারলাইন রেডিয়াস বৃদ্ধি করুন।`,
            problematicValue: rCl,
            suggestedValue: Math.round(d * 1.5),
            minAllowed: Math.round(d * 0.6),
          });
        } else if (throatR < 40) {
          issues.push({
            id: 'warn_gore_throat_tight',
            fieldId: 'centerlineRadius',
            severity: 'warning',
            category: 'ZERO_THROAT',
            titleEn: 'Choked Inside Gore Throat',
            titleBn: 'অতিরিক্ত সংকুচিত গোর থ্রোট',
            messageEn: `Inside throat radius (${throatR.toFixed(1)}mm) is extremely tight. Inner gore seam welding or rotary elbow swaging machine cannot rotate without crashing.`,
            messageBn: `ভেতরের থ্রোট অতিরিক্ত চাপা (${throatR.toFixed(1)}মিমি), যা রোটারি সোয়েজিং মেশিনে সমস্যা তৈরি করবে।`,
            problematicValue: rCl,
            suggestedValue: Math.round(d * 1.5),
            minAllowed: Math.round(d * 0.6),
          });
        }

        if (numGores < 3) {
          issues.push({
            id: 'err_num_gores_low',
            fieldId: 'numGores',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Insufficient Gore Segments',
            titleBn: 'অপর্যাপ্ত গোর সেগমেন্ট',
            messageEn: `A segmented bend requires at least 3 gores (2 half-end gores + 1 full middle gore). Fewer than 3 pieces cannot form a true segmented lobster bend.`,
            messageBn: `লবস্টার ব্যাক এলবো তৈরিতে কমপক্ষে ৩টি গোর প্রয়োজন।`,
            problematicValue: numGores,
            suggestedValue: 4,
            minAllowed: 3,
            maxAllowed: 9,
          });
        }

        if (ang <= 0 || ang > 180) {
          issues.push({
            id: 'err_gore_ang',
            fieldId: 'angleDeg',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Invalid Elbow Sweep Angle',
            titleBn: 'অকার্যকর এলবো বাঁক কোণ',
            messageEn: `Elbow sweep angle must be between 15° and 180°. Received ${ang}°.`,
            messageBn: `এলবো কোণ অবশ্যই ১৫° থেকে ১৮০° এর মধ্যে হতে হবে।`,
            problematicValue: ang,
            suggestedValue: 90,
            minAllowed: 15,
            maxAllowed: 180,
          });
        }
        break;
      }

      case 'wye_branch': {
        const di = Number(dims.inletDiameter) || 0;
        const db = Number(dims.branchDiameter) || 0;
        const totAng = Number(dims.totalAngle) || 0;
        const legL = Number(dims.legLength) || 0;

        // Acute-angle intersection impossibility (< 20°)
        if (totAng < 20) {
          issues.push({
            id: 'err_wye_acute_angle',
            fieldId: 'totalAngle',
            severity: 'error',
            category: 'ACUTE_ANGLE_INTERSECTION',
            titleEn: 'Physically Impossible Acute Crotch Angle',
            titleBn: 'শারীরিকভাবে অসম্ভব তীব্র ক্রচ কোণ',
            messageEn: `Included spread angle (${totAng}°) is too acute (< 20°). The two branch cylinders intersect at an extremely sharp wedge where welding guns, seam lock formers, and rivet tools cannot physically fit. Standard SMACNA bifurcated wye angle is 45° to 60°.`,
            messageBn: `স্প্রেড কোণ (${totAng}°) অত্যন্ত সূক্ষ্ম (< ২০°)। এই তীব্র কোণে ওয়েল্ডিং গান বা রিভেট টুল পৌঁছাতে পারে না। ন্যূনতম ২০° (সুপারিশকৃত ৪৫°-৬০°) কোণ নির্বাচন করুন।`,
            problematicValue: totAng,
            suggestedValue: 60,
            minAllowed: 20,
            maxAllowed: 110,
          });
        } else if (totAng > 110) {
          issues.push({
            id: 'warn_wye_blunt_angle',
            fieldId: 'totalAngle',
            severity: 'warning',
            category: 'ASPECT_RATIO_LIMIT',
            titleEn: 'Excessive Spread Angle (> 110°)',
            titleBn: 'অতিরিক্ত প্রশস্ত স্প্রেড কোণ (> ১১০°)',
            messageEn: `Included angle (${totAng}°) exceeds recommended 90° maximum, generating severe aerodynamic turbulence, eddy recirculation, and pressure drop.`,
            messageBn: `স্প্রেড কোণ ১১০° এর বেশি হলে মারাত্মক এয়ার ড্রপ এবং ঘূর্ণি বাতাসের বাধা তৈরি হয়।`,
            problematicValue: totAng,
            suggestedValue: 60,
            maxAllowed: 90,
          });
        }

        // Leg length vs Miter cut depth (Zero-length / slice-through)
        const halfSpreadRad = (totAng * Math.PI) / 360;
        const miterDepth = (db / 2) * Math.tan(halfSpreadRad);
        if (legL <= miterDepth + 25) {
          issues.push({
            id: 'err_wye_short_leg',
            fieldId: 'legLength',
            severity: 'error',
            category: 'ZERO_THROAT',
            titleEn: 'Branch Leg Length Shorter Than Miter Cut',
            titleBn: 'ব্রাঞ্চ দৈর্ঘ্য মাইটার কাটের চেয়ে ছোট',
            messageEn: `Leg length (${legL}mm) is too short for the ${totAng}° miter cut (depth ${miterDepth.toFixed(1)}mm). The miter cut will slice completely into the outlet duct flange! Increase leg length to at least ${Math.round(miterDepth + 60)}mm.`,
            messageBn: `লেগ দৈর্ঘ্য (${legL}মিমি) মাইটার কাটের গভীরতার চেয়ে কম। এর ফলে পাইপের সামনের ফ্ল্যাঞ্জ কাটা পড়ে যাবে। লেগ দৈর্ঘ্য কমপক্ষে ${Math.round(miterDepth + 60)}মিমি করুন।`,
            problematicValue: legL,
            suggestedValue: Math.max(350, Math.round(miterDepth + 100)),
            minAllowed: Math.round(miterDepth + 50),
          });
        }

        // Branch diameter vs Inlet diameter
        if (db >= di * 1.25) {
          issues.push({
            id: 'warn_wye_oversize_branch',
            fieldId: 'branchDiameter',
            severity: 'warning',
            category: 'INTERFERENCE_COLLISION',
            titleEn: 'Branch Diameter Exceeds Main Inlet Capacity',
            titleBn: 'ব্রাঞ্চের ব্যাস ইনলেটের চেয়ে বেশি',
            messageEn: `Each branch leg diameter (${db}mm) is larger than the main trunk inlet (${di}mm). Total outlet area is ${(2 * (db/di)**2).toFixed(1)}x the inlet area.`,
            messageBn: `প্রতিটি ব্রাঞ্চ লেগের আকার (${db}মিমি) মূল ইনলেটের চেয়ে অনেক বড়।`,
            problematicValue: db,
            suggestedValue: Math.round(di * 0.7),
          });
        }
        break;
      }

      case 'round_90_tee': {
        const dm = Number(dims.mainDiameter) || 0;
        const db = Number(dims.branchDiameter) || 0;
        const l = Number(dims.branchLength) || 0;

        if (db > dm) {
          issues.push({
            id: 'err_tee_branch_gt_main',
            fieldId: 'branchDiameter',
            severity: 'error',
            category: 'INTERFERENCE_COLLISION',
            titleEn: 'Branch Pipe Diameter Exceeds Main Pipe',
            titleBn: 'ব্রাঞ্চ পাইপ মূল পাইপের চেয়ে বড়',
            messageEn: `Branch diameter (${db}mm) cannot be greater than main trunk diameter (${dm}mm). A tap pipe cannot wrap around a smaller host pipe without open perimeter gaps.`,
            messageBn: `ব্রাঞ্চের ব্যাস (${db}মিমি) মূল পাইপের ব্যাস (${dm}মিমি) এর চেয়ে বড় হতে পারে না।`,
            problematicValue: db,
            suggestedValue: Math.min(dm, Math.round(dm * 0.75)),
            maxAllowed: dm,
          });
        }

        // Fishmouth cut penetration
        const fishmouthDepth = dm / 2 - Math.sqrt(Math.max(0, (dm / 2) ** 2 - (db / 2) ** 2));
        if (l <= fishmouthDepth + 30) {
          issues.push({
            id: 'err_tee_branch_short',
            fieldId: 'branchLength',
            severity: 'error',
            category: 'ZERO_THROAT',
            titleEn: 'Branch Length Too Short (Fishmouth Cutout Penetration)',
            titleBn: 'ব্রাঞ্চ দৈর্ঘ্য অত্যন্ত ছোট (ফিশমাউথ কাট পেনেট্রেশন)',
            messageEn: `Branch length (${l}mm) is too short. The saddle fishmouth cut penetrates ${fishmouthDepth.toFixed(1)}mm deep, leaving no straight collar for duct connection. Minimum required length is ${Math.round(fishmouthDepth + 60)}mm.`,
            messageBn: `ব্রাঞ্চ দৈর্ঘ্য (${l}মিমি) খুব কম। স্যাডল কাট গভীরতা ${fishmouthDepth.toFixed(1)}মিমি, ফলে কানেক্টরের জন্য সোজা পাইপ অবশিষ্ট থাকে না।`,
            problematicValue: l,
            suggestedValue: Math.round(fishmouthDepth + 120),
            minAllowed: Math.round(fishmouthDepth + 50),
          });
        }
        break;
      }

      case 'rect_straight_tee':
      case 'rect_reducing_tee': {
        const wm = Number(dims.mainWidth) || 0;
        const hm = Number(dims.mainHeight) || 0;
        const lm = Number(dims.mainLength) || 0;
        const wb = Number(dims.branchWidth) || 0;
        const hb = Number(dims.branchHeight) || 0;

        if (wb >= lm - 60) {
          issues.push({
            id: 'err_rect_tee_tap_length',
            fieldId: 'branchWidth',
            severity: 'error',
            category: 'INTERFERENCE_COLLISION',
            titleEn: 'Branch Tap Cutout Exceeds Main Run Length',
            titleBn: 'ব্রাঞ্চ ট্যাপ কাটআউট মূল ডাক্টের চেয়ে বড়',
            messageEn: `Branch width (${wb}mm) along main run cannot fit within total main length (${lm}mm). A minimum 50mm collar margin is required at each end for transverse flanges.`,
            messageBn: `ব্রাঞ্চ প্রস্থ (${wb}মিমি) মূল ডাক্ট দৈর্ঘ্য (${lm}মিমি) ছাড়িয়ে গেছে। দুই পাশে ফ্ল্যাঞ্জের জন্য জায়গা নেই।`,
            problematicValue: wb,
            suggestedValue: Math.max(150, lm - 150),
            maxAllowed: lm - 100,
          });
        }

        if (hb > hm) {
          issues.push({
            id: 'err_rect_tee_tap_height',
            fieldId: 'branchHeight',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Branch Height Taller Than Main Duct Face',
            titleBn: 'ব্রাঞ্চের উচ্চতা মূল ডাক্টের চেয়ে বেশি',
            messageEn: `Branch height (${hb}mm) is taller than the host duct face (${hm}mm). The cutout would slice through the top and bottom longitudinal seam locks.`,
            messageBn: `ব্রাঞ্চ উচ্চতা (${hb}মিমি) মূল ডাক্টের উচ্চতা (${hm}মিমি) এর চেয়ে বড়, যা কর্নার সিম কেটে ফেলবে।`,
            problematicValue: hb,
            suggestedValue: Math.max(100, hm - 50),
            maxAllowed: hm,
          });
        }
        break;
      }

      case 'rect_concentric_reducer':
      case 'rect_eccentric_reducer': {
        const w1 = Number(dims.w1) || 0;
        const h1 = Number(dims.h1) || 0;
        const w2 = Number(dims.w2) || 0;
        const h2 = Number(dims.h2) || 0;
        const l = Number(dims.length) || 0;

        if (l <= 0) {
          issues.push({
            id: 'err_red_len_zero',
            fieldId: 'length',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Zero-Length Transition',
            titleBn: 'শূন্য-দৈর্ঘ্য ট্রানজিশন',
            messageEn: 'Transition length must be greater than zero for flat pattern sheet metal development.',
            messageBn: 'ট্রানজিশনের দৈর্ঘ্য অবশ্যই ০ এর বেশি হতে হবে।',
            problematicValue: l,
            suggestedValue: 500,
            minAllowed: 100,
          });
        }

        const deltaW = Math.abs(w1 - w2);
        const slopeDeg = (Math.atan(deltaW / (2 * Math.max(1, l))) * 180) / Math.PI;
        if (slopeDeg > 60) {
          issues.push({
            id: 'err_red_slope_steep',
            fieldId: 'length',
            severity: 'error',
            category: 'ASPECT_RATIO_LIMIT',
            titleEn: 'Extreme Taper Angle (> 60°)',
            titleBn: 'অতিরিক্ত খাড়া টেপার কোণ (> ৬০°)',
            messageEn: `The reduction angle is ${slopeDeg.toFixed(1)}° (length ${l}mm for ${deltaW}mm delta). Press brake tooling cannot form such blunt tapers without severe sheet metal kinking and flow separation. Lengthen the reducer to at least ${Math.round(deltaW * 0.8)}mm.`,
            messageBn: `টেপার কোণ ${slopeDeg.toFixed(1)}° যা অতিরিক্ত খাড়া। শিট মেটাল প্রেস ব্রেকে বাঁকাতে সমস্যা হবে। দৈর্ঘ্য বৃদ্ধি করুন।`,
            problematicValue: l,
            suggestedValue: Math.round(deltaW * 1.2),
            minAllowed: Math.round(deltaW * 0.6),
          });
        }
        break;
      }

      case 'round_concentric_reducer': {
        const d1 = Number(dims.largeDiameter) || 0;
        const d2 = Number(dims.smallDiameter) || 0;
        const l = Number(dims.length) || 0;

        if (d1 <= 0 || d2 <= 0) {
          issues.push({
            id: 'err_rnd_red_d',
            fieldId: d1 <= 0 ? 'largeDiameter' : 'smallDiameter',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Non-Positive Conical Diameter',
            titleBn: 'অকার্যকর কোনিক্যাল ব্যাস',
            messageEn: 'Both large and small diameters must be positive.',
            messageBn: 'উভয় ব্যাস অবশ্যই ধনাত্মক হতে হবে।',
            problematicValue: d1 <= 0 ? d1 : d2,
            suggestedValue: 400,
            minAllowed: 80,
          });
        }

        if (d1 === d2) {
          issues.push({
            id: 'warn_rnd_red_equal',
            fieldId: 'smallDiameter',
            severity: 'warning',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Identical Diameters (Straight Pipe)',
            titleBn: 'উভয় ব্যাস সমান (সোজা পাইপ)',
            messageEn: `Large diameter (${d1}mm) equals small diameter (${d2}mm). This is a straight cylinder, not a tapered cone. Conical apex is at infinity.`,
            messageBn: `উভয় ব্যাস সমান, ফলে এটি ট্রাঙ্কেটেড কোন নয় বরং সোজা পাইপ।`,
            problematicValue: d2,
            suggestedValue: Math.round(d1 * 0.7),
          });
        }

        if (l <= 0) {
          issues.push({
            id: 'err_rnd_red_l',
            fieldId: 'length',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Zero Conical Length',
            titleBn: 'শূন্য কোন দৈর্ঘ্য',
            messageEn: 'Conical length must be greater than zero.',
            messageBn: 'দৈর্ঘ্য অবশ্যই ০ এর বেশি হতে হবে।',
            problematicValue: l,
            suggestedValue: 400,
            minAllowed: 100,
          });
        }
        break;
      }

      case 'square_to_round': {
        const bw = Number(dims.baseWidth) || 0;
        const bh = Number(dims.baseHeight) || 0;
        const td = Number(dims.topDiameter) || 0;
        const l = Number(dims.length) || 0;
        const offX = Number(dims.offsetX) || 0;
        const offY = Number(dims.offsetY) || 0;

        if (l <= 0) {
          issues.push({
            id: 'err_sq2rnd_l_zero',
            fieldId: 'length',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Zero Transition Height',
            titleBn: 'শূন্য ট্রানজিশন উচ্চতা',
            messageEn: 'Transition vertical height must be positive for radial triangulation development.',
            messageBn: 'ট্রায়াঙ্গুলেশন ডেভেলপমেন্টের জন্য উচ্চতা অবশ্যই ধনাত্মক হতে হবে।',
            problematicValue: l,
            suggestedValue: 400,
            minAllowed: 100,
          });
        }

        // Check if round top is pushed completely outside the base footprint by extreme eccentricity
        const maxX = Math.abs(offX) + td / 2;
        const maxY = Math.abs(offY) + td / 2;
        if (maxX > bw / 2 + 150 || maxY > bh / 2 + 150) {
          issues.push({
            id: 'err_sq2rnd_extreme_eccentric',
            fieldId: maxX > bw / 2 + 150 ? 'offsetX' : 'offsetY',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Top Circle Overhang Exceeds Base Footprint',
            titleBn: 'টপ সার্কেল বেস ফ্রেমের বাইরে চলে গেছে',
            messageEn: `Eccentric offset (${offX}, ${offY}mm) moves the round top completely outside the base boundaries. Creates inverted negative fold planes and self-intersecting triangulation petals.`,
            messageBn: `অফসেট অতিরিক্ত হওয়ায় টপ সার্কেল বেসের বাইরে চলে গেছে, যার ফলে ট্রায়াঙ্গুলেশন প্যাটার্ন নিজে নিজেকে ক্রস করবে।`,
            problematicValue: maxX > bw / 2 + 150 ? offX : offY,
            suggestedValue: 0,
          });
        }
        break;
      }

      case 'oval_straight': {
        const a = Number(dims.majorAxis) || 0;
        const b = Number(dims.minorAxis) || 0;
        const l = Number(dims.length) || 0;

        // Flat Oval impossibility: A < B creates negative flat length
        if (a < b) {
          issues.push({
            id: 'err_oval_inverted_axes',
            fieldId: 'majorAxis',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Major Axis Smaller Than Minor Axis (Negative Flat Length)',
            titleBn: 'মেজর অক্ষ মাইনর অক্ষের চেয়ে ছোট (নেগেটিভ ফ্ল্যাট দৈর্ঘ্য)',
            messageEn: `Major axis A (${a}mm) is smaller than minor axis B (${b}mm). Flat oval geometry requires flat sides of length (A - B). Here (A - B = ${a - b}mm) is negative, creating a geometrically impossible self-intersecting surface! Swap dimensions or increase Major Axis.`,
            messageBn: `মেজর অক্ষ A (${a}মিমি) মাইনর অক্ষ B (${b}মিমি) এর চেয়ে ছোট হতে পারে না। ফ্ল্যাট দৈর্ঘ্য (A - B = ${a - b}মিমি) ঋণাত্মক হয়ে যায় যা জ্যামিতিকভাবে অসম্ভব।`,
            problematicValue: a,
            suggestedValue: Math.max(a, Math.round(b * 1.5)),
            minAllowed: b,
          });
        } else if (a === b) {
          issues.push({
            id: 'warn_oval_is_round',
            fieldId: 'majorAxis',
            severity: 'warning',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Degenerated Flat Oval (Pure Round Duct)',
            titleBn: 'ফ্ল্যাট ওভাল বৃত্তাকারে পরিণত হয়েছে',
            messageEn: `Major axis (${a}mm) equals minor axis (${b}mm). Flat length is 0mm; this degenerates into a standard circular round duct.`,
            messageBn: `মেজর এবং মাইনর অক্ষ সমান, ফলে এটি ফ্ল্যাট ওভাল নয় বরং গোল ডাক্ট।`,
            problematicValue: a,
            suggestedValue: Math.round(b * 1.5),
          });
        }

        if (l <= 0) {
          issues.push({
            id: 'err_oval_l_zero',
            fieldId: 'length',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Non-Positive Oval Length',
            titleBn: 'অকার্যকর ওভাল দৈর্ঘ্য',
            messageEn: 'Duct length must be greater than zero.',
            messageBn: 'দৈর্ঘ্য অবশ্যই ০ এর বেশি হতে হবে।',
            problematicValue: l,
            suggestedValue: 1200,
            minAllowed: 100,
          });
        }
        break;
      }

      case 'rect_offset': {
        const l = Number(dims.length) || 0;
        const shift = Number(dims.offsetShift) || 0;
        const collar = Number(dims.collarLength) || 0;

        // Tangent collar collapse
        const jogL = l - 2 * collar;
        if (jogL <= 0) {
          issues.push({
            id: 'err_offset_jog_collapsed',
            fieldId: 'length',
            severity: 'error',
            category: 'ZERO_THROAT',
            titleEn: 'Total Length Shorter Than Collar Tangents Combined',
            titleBn: 'মোট দৈর্ঘ্য কলার ট্যানজেন্টের চেয়ে কম',
            messageEn: `Overall length (${l}mm) is <= 2x collar tangent length (${2 * collar}mm). Available jog transition distance is ${jogL}mm (<= 0), leaving zero distance for the offset jog to occur! Increase length to at least ${2 * collar + 150}mm.`,
            messageBn: `মোট দৈর্ঘ্য (${l}মিমি) দুইটি সোজা কলারের (${2 * collar}মিমি) চেয়ে কম বা সমান। অফসেট বাঁক নেয়ার কোনো জায়গা নেই। দৈর্ঘ্য কমপক্ষে ${2 * collar + 150}মিমি করুন।`,
            problematicValue: l,
            suggestedValue: 2 * collar + 300,
            minAllowed: 2 * collar + 50,
          });
        } else {
          const jogAngle = (Math.atan(shift / jogL) * 180) / Math.PI;
          if (jogAngle > 55) {
            issues.push({
              id: 'err_offset_steep',
              fieldId: 'offsetShift',
              severity: 'error',
              category: 'ASPECT_RATIO_LIMIT',
              titleEn: 'Excessive Offset Bypass Angle (> 55°)',
              titleBn: 'অতিরিক্ত খাড়া অফসেট কোণ (> ৫৫°)',
              messageEn: `Offset shift (${shift}mm) over available jog length (${jogL}mm) creates an angle of ${jogAngle.toFixed(1)}°. Standard sheet metal brakes cannot execute double-bends steeper than 45° without collision. Lengthen the duct or reduce the offset shift.`,
              messageBn: `অফসেট কোণ ${jogAngle.toFixed(1)}° যা অতিরিক্ত খাড়া। প্রেস ব্রেকে ক্ল্যাশ ঘটবে। দৈর্ঘ্য বাড়ান বা অফসেট শিফট কমান।`,
              problematicValue: shift,
              suggestedValue: Math.round(jogL * 0.5),
              maxAllowed: Math.round(jogL * 0.8),
            });
          }
        }
        break;
      }

      case 'damper_sleeve': {
        const h = Number(dims.height) || 0;
        const l = Number(dims.sleeveLength) || 0;
        const numBlades = Number(dims.numBlades) || 0;

        if (numBlades < 1) {
          issues.push({
            id: 'err_damper_blades',
            fieldId: 'numBlades',
            severity: 'error',
            category: 'GEOMETRIC_IMPOSSIBILITY',
            titleEn: 'Zero Damper Blades',
            titleBn: 'শূন্য ড্যাম্পার ব্লেড',
            messageEn: 'A volume control damper requires at least 1 blade.',
            messageBn: 'কমপক্ষে ১টি ড্যাম্পার ব্লেড প্রয়োজন।',
            problematicValue: numBlades,
            suggestedValue: 3,
            minAllowed: 1,
            maxAllowed: 8,
          });
        } else {
          const bladeChord = h / numBlades;
          const halfChord = bladeChord / 2;
          if (l < bladeChord) {
            issues.push({
              id: 'err_damper_blade_swing',
              fieldId: 'sleeveLength',
              severity: 'error',
              category: 'INTERFERENCE_COLLISION',
              titleEn: 'Blade Swing Interference Beyond Sleeve Casing',
              titleBn: 'ব্লেড সুইং স্লিভ বডির বাইরে সংঘর্ষ ঘটাবে',
              messageEn: `Each blade has a chord width of ${bladeChord.toFixed(1)}mm. When rotating to the 90° open position, blades protrude past the sleeve ends (${l}mm depth), colliding with connecting ductwork or fire dampers. Increase sleeve depth to at least ${Math.round(bladeChord + 40)}mm.`,
              messageBn: `প্রতিটি ব্লেডের চওড়া ${bladeChord.toFixed(1)}মিমি। স্লিভের দৈর্ঘ্য (${l}মিমি) কম হওয়ায় ব্লেড খোলার সময় পাশের ডাক্টে আঘাত করবে। স্লিভ দৈর্ঘ্য বৃদ্ধি করুন।`,
              problematicValue: l,
              suggestedValue: Math.round(bladeChord + 60),
              minAllowed: Math.round(bladeChord + 20),
            });
          }
        }
        break;
      }

      default:
        break;
    }

    // 3. Seam and Tooling Clearance Validation
    const seam = inputs.longitudinalSeam;
    const w = Number(dims.width) || Number(dims.baseWidth) || Number(dims.mainWidth) || 0;
    const h = Number(dims.height) || Number(dims.baseHeight) || Number(dims.mainHeight) || 0;

    if (seam === 'pittsburgh' && (w > 0 && w < 90 || h > 0 && h < 90)) {
      issues.push({
        id: 'warn_pittsburgh_min_throat',
        fieldId: w < 90 && w > 0 ? 'width' : 'height',
        severity: 'warning',
        category: 'SEAM_TOOLING_CLEARANCE',
        titleEn: 'Narrow Dimension for Pittsburgh Lock Seam',
        titleBn: 'পিটসবার্গ সিমের জন্য সংকুচিত ডাইমেনশন',
        messageEn: `Dimension under 90mm makes roll-forming a 25mm Pittsburgh pocket and closing with an air hammer extremely difficult due to tool clearance. Snap-lock or grooved seam recommended.`,
        messageBn: `৯০মিমির চেয়ে ছোট ডাক্টে পিটসবার্গ পকেট লক রোল করা ও এয়ার হ্যামার দিয়ে বন্ধ করা অত্যন্ত কঠিন। স্ন্যাপ লক বা গ্রুভড সিম ব্যবহার করুন।`,
        problematicValue: w < 90 && w > 0 ? w : h,
        suggestedValue: 120,
      });
    }

    // Heavy gauge with snap-lock warning
    if (seam === 'snap_lock' && inputs.gauge <= 18) {
      issues.push({
        id: 'warn_snaplock_heavy_gauge',
        fieldId: 'gauge',
        severity: 'warning',
        category: 'SEAM_TOOLING_CLEARANCE',
        titleEn: 'Snap Lock Incompatible With Heavy Gauge',
        titleBn: 'ভারী গেজে স্ন্যাপ লক অকার্যকর',
        messageEn: `Button snap-lock machines cannot punch buttons or form locks in heavy sheet metal (18 Ga or 16 Ga). Pittsburgh or continuous weld seam required.`,
        messageBn: `১৮ বা ১৬ গেজের মতো ভারী শিটে বাটন স্ন্যাপ লক পাঞ্চ করা যায় না। পিটসবার্গ বা ওয়েল্ড সিম প্রয়োজন।`,
        problematicValue: inputs.gauge,
        suggestedValue: 24,
      });
    }

    // Group issues by fieldId
    const fieldIssues: Record<string, ValidationIssue[]> = {};
    issues.forEach(issue => {
      if (!fieldIssues[issue.fieldId]) {
        fieldIssues[issue.fieldId] = [];
      }
      fieldIssues[issue.fieldId].push(issue);
    });

    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    return {
      isValid: errorCount === 0,
      hasErrors: errorCount > 0,
      errorCount,
      warningCount,
      issues,
      fieldIssues,
    };
  }

  /**
   * Helper to automatically correct problematic input fields to safe manufacturable values
   */
  public static autoFixInputs(
    inputs: DuctCalculationInput,
    issues: ValidationIssue[]
  ): DuctCalculationInput {
    const newDims = { ...inputs.dimensions };
    let newGauge = inputs.gauge;
    let newSeam = inputs.longitudinalSeam;

    issues.forEach(issue => {
      if (issue.suggestedValue !== undefined) {
        if (issue.fieldId === 'gauge') {
          newGauge = Number(issue.suggestedValue);
        } else if (issue.fieldId === 'longitudinalSeam') {
          newSeam = issue.suggestedValue as LongitudinalSeam;
        } else {
          newDims[issue.fieldId] = issue.suggestedValue;
        }
      }
    });

    return {
      ...inputs,
      gauge: newGauge,
      longitudinalSeam: newSeam,
      dimensions: newDims,
    };
  }
}
