/**
 * Core type definitions for AeroDuct CAD/CAM Layout Software
 */

export type DuctCategory = 
  | 'straight'
  | 'elbow'
  | 'tee'
  | 'reducer'
  | 'offset'
  | 'branch'
  | 'special';

export type DuctModelId =
  // Straight
  | 'rect_straight'
  | 'round_straight'
  | 'oval_straight'
  // Elbow
  | 'rect_radius_elbow'
  | 'rect_square_elbow'
  | 'rect_45_elbow'
  | 'round_segmented_elbow'
  // Tee
  | 'rect_straight_tee'
  | 'rect_reducing_tee'
  | 'round_90_tee'
  | 'wye_branch'
  | 'lateral_tee'
  // Reducer / Transition
  | 'rect_concentric_reducer'
  | 'rect_eccentric_reducer'
  | 'round_concentric_reducer'
  | 'square_to_round'
  | 'oval_to_round'
  // Offset
  | 'rect_offset'
  | 'round_offset'
  // Branch
  | 'rect_45_branch'
  | 'round_saddle_branch'
  // Special
  | 'plenum_box'
  | 'register_boot'
  | 'end_cap'
  | 'damper_sleeve';

export type MaterialType = 'galvanized' | 'stainless' | 'aluminum' | 'copper';

export type LongitudinalSeam = 
  | 'pittsburgh'      // 25mm pocket allowance / 6mm flanged edge
  | 'snap_lock'       // 12mm button / pocket
  | 'grooved_seam'    // 10mm pipe lock
  | 'standing_seam'   // 25mm standing seam
  | 'butt_weld';      // 0mm allowance

export type TransverseConnector = 
  | 'tdc_tdf'         // 35mm roll-formed flange with corner notches
  | 's_and_drive'     // S-slip (28mm) and Drive cleat (13mm)
  | 'raw_edge'        // 0mm
  | 'companion_angle' // 38mm angle iron slip flange
  | 'crimped_beaded'; // 38mm crimped male end for slip insertion

export interface MaterialProperties {
  id: MaterialType;
  name: string;
  nameBn: string;
  density: number; // kg/m^3
  defaultKFactor: number;
}

export interface GaugeSpec {
  gauge: number; // e.g. 26, 24, 22, 20, 18, 16
  thicknessMm: number;
  weightGsmGalvanized: number; // g/m²
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Line2D {
  start: Point2D;
  end: Point2D;
  type: 'cut' | 'bend_up' | 'bend_down' | 'seam' | 'notch' | 'guide';
  bendAngleDeg?: number;
  description?: string;
}

export interface Arc2D {
  center: Point2D;
  radius: number;
  startAngleRad: number;
  endAngleRad: number;
  type: 'cut' | 'bend_up' | 'bend_down' | 'seam' | 'guide';
  counterClockwise?: boolean;
}

export interface TextLabel2D {
  text: string;
  position: Point2D;
  fontSize: number;
  rotationDeg?: number;
  type: 'part_name' | 'dimension' | 'seam_note' | 'alignment';
}

export interface FlatPatternPart {
  id: string;
  partName: string;
  partNameBn: string;
  quantity: number;
  blankWidthMm: number;
  blankLengthMm: number;
  areaM2: number;
  weightKg: number;
  lines: Line2D[];
  arcs?: Arc2D[];
  labels: TextLabel2D[];
  outerContour: Point2D[]; // Polygon for nesting and cutting verification
  bendCount: number;
  notes?: string[];
}

export interface Geometry3DData {
  vertices: number[]; // Float32 array flat
  indices: number[];  // Triangles
  normals?: number[];
  wireframeLines: Point3D[][]; // For crisp CAD wireframe rendering
  boundingBox: {
    min: Point3D;
    max: Point3D;
  };
}

export interface CalculationResult {
  modelId: DuctModelId;
  modelName: string;
  modelNameBn: string;
  category: DuctCategory;
  parts: FlatPatternPart[];
  geometry3D: Geometry3DData;
  totalWeightKg: number;
  totalSurfaceAreaM2: number;
  totalBlankAreaM2: number;
  materialEfficiency: number; // percentage
  smacnaCompliant: boolean;
  warnings: string[];
  recommendations: string[];
  dimensionsSummary: Record<string, number | string>;
}

export interface FormParameterField {
  id: string;
  label: string;
  labelBn: string;
  type: 'number' | 'select' | 'checkbox';
  defaultValue: number | string | boolean;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string; labelBn: string }[];
  description?: string;
  descriptionBn?: string;
}

export type CuttingLayoutDesign = 'one_piece_wrap' | 'two_piece_l' | 'four_piece';

export interface DuctCalculationInput {
  modelId: DuctModelId;
  dimensions: Record<string, any>;
  material: MaterialType;
  gauge: number;
  longitudinalSeam: LongitudinalSeam;
  transverseConnector: TransverseConnector;
  sheetWidthMm?: number;
  sheetLengthMm?: number;
  cuttingLayout?: CuttingLayoutDesign;
}
