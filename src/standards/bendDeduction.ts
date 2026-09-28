/**
 * Sheet Metal Bend Allowance and Bend Deduction Calculator
 * Based on DIN 6935 and SMACNA Sheet Metal Standards
 */

export interface BendCalculationResult {
  bendAngleDeg: number;
  innerRadiusMm: number;
  thicknessMm: number;
  kFactor: number;
  bendAllowanceMm: number;
  outsideSetbackMm: number;
  bendDeductionMm: number;
}

export function calculateBendParameters(
  thicknessMm: number,
  bendAngleDeg: number = 90,
  innerRadiusMm: number = 1.0,
  kFactor: number = 0.42
): BendCalculationResult {
  const angleRad = (bendAngleDeg * Math.PI) / 180;
  
  // Bend Allowance (BA)
  const bendAllowanceMm = angleRad * (innerRadiusMm + kFactor * thicknessMm);
  
  // Outside Setback (OSSB)
  const halfAngleRad = angleRad / 2;
  const outsideSetbackMm = Math.tan(halfAngleRad) * (innerRadiusMm + thicknessMm);
  
  // Bend Deduction (BD = 2 * OSSB - BA)
  const bendDeductionMm = 2 * outsideSetbackMm - bendAllowanceMm;
  
  return {
    bendAngleDeg,
    innerRadiusMm,
    thicknessMm,
    kFactor,
    bendAllowanceMm: Number(bendAllowanceMm.toFixed(3)),
    outsideSetbackMm: Number(outsideSetbackMm.toFixed(3)),
    bendDeductionMm: Number(bendDeductionMm.toFixed(3)),
  };
}
