import { MaterialProperties, MaterialType, GaugeSpec } from '../types';

export const MATERIALS: Record<MaterialType, MaterialProperties> = {
  galvanized: {
    id: 'galvanized',
    name: 'Galvanized Sheet Steel (GI - ASTM A653)',
    nameBn: 'গ্যালভানাইজড স্টিল (GI শিট)',
    density: 7850, // kg/m³
    defaultKFactor: 0.42,
  },
  stainless: {
    id: 'stainless',
    name: 'Stainless Steel (SS 304 / 316)',
    nameBn: 'স্টেইনলেস স্টিল (SS 304)',
    density: 8000, // kg/m³
    defaultKFactor: 0.38,
  },
  aluminum: {
    id: 'aluminum',
    name: 'Aluminum Alloy (Al 3003-H14)',
    nameBn: 'অ্যালুমিনিয়াম অ্যালয় (Aluminium)',
    density: 2700, // kg/m³
    defaultKFactor: 0.44,
  },
  copper: {
    id: 'copper',
    name: 'Copper Sheet (Architectural)',
    nameBn: 'কপার শিট (Copper Sheet)',
    density: 8960, // kg/m³
    defaultKFactor: 0.45,
  },
};

// Standard Sheet Metal Gauges (SMACNA HVAC Standard)
export const GAUGE_TABLE: GaugeSpec[] = [
  { gauge: 28, thicknessMm: 0.48, weightGsmGalvanized: 3760 },
  { gauge: 26, thicknessMm: 0.55, weightGsmGalvanized: 4310 },
  { gauge: 24, thicknessMm: 0.70, weightGsmGalvanized: 5490 },
  { gauge: 22, thicknessMm: 0.85, weightGsmGalvanized: 6670 },
  { gauge: 20, thicknessMm: 1.00, weightGsmGalvanized: 7850 },
  { gauge: 18, thicknessMm: 1.30, weightGsmGalvanized: 10200 },
  { gauge: 16, thicknessMm: 1.60, weightGsmGalvanized: 12560 },
  { gauge: 14, thicknessMm: 2.00, weightGsmGalvanized: 15700 },
];

export function getGaugeThickness(gauge: number): number {
  const match = GAUGE_TABLE.find(g => g.gauge === gauge);
  return match ? match.thicknessMm : 0.8;
}

/**
 * SMACNA Recommended Minimum Gauge based on Maximum Duct Dimension (mm)
 * For 500 Pa (2 in. wg) Positive/Negative Static Pressure
 */
export function getSmacnaRecommendedGauge(maxDimensionMm: number): {
  recommendedGauge: number;
  minThicknessMm: number;
  reinforcementNote: string;
} {
  if (maxDimensionMm <= 300) {
    return { recommendedGauge: 26, minThicknessMm: 0.55, reinforcementNote: 'SMACNA: No tie rod required' };
  } else if (maxDimensionMm <= 750) {
    return { recommendedGauge: 24, minThicknessMm: 0.70, reinforcementNote: 'SMACNA: Joint spacing max 1500mm' };
  } else if (maxDimensionMm <= 1000) {
    return { recommendedGauge: 22, minThicknessMm: 0.85, reinforcementNote: 'SMACNA: TDC/TDF recommended' };
  } else if (maxDimensionMm <= 1500) {
    return { recommendedGauge: 20, minThicknessMm: 1.00, reinforcementNote: 'SMACNA: Internal tie rod or external rib angle' };
  } else if (maxDimensionMm <= 2100) {
    return { recommendedGauge: 18, minThicknessMm: 1.30, reinforcementNote: 'SMACNA: Intermediate angle stiffener' };
  } else {
    return { recommendedGauge: 16, minThicknessMm: 1.60, reinforcementNote: 'SMACNA Heavy Industrial Spec' };
  }
}

// Standard sheet blank dimensions
export const STANDARD_SHEET_SIZES = [
  { id: '4x8', label: '4 ft x 8 ft (1219 x 2438 mm)', widthMm: 1219, lengthMm: 2438 },
  { id: '1x2', label: '1000 mm x 2000 mm', widthMm: 1000, lengthMm: 2000 },
  { id: '1.25x2.5', label: '1250 mm x 2500 mm', widthMm: 1250, lengthMm: 2500 },
  { id: '1.5x3', label: '1500 mm x 3000 mm', widthMm: 1500, lengthMm: 3000 },
  { id: 'coil_1220', label: 'Coil Line (1220 mm continuous)', widthMm: 1220, lengthMm: 6000 },
];
