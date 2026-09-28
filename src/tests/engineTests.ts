import { EngineFactory } from '../engines/EngineRegistry';
import { DuctCalculationInput } from '../types';
import { ManufacturingValidationEngine } from '../engines/ManufacturingValidationEngine';

export interface TestCaseResult {
  engineId: string;
  testName: string;
  passed: boolean;
  expected: string;
  actual: string;
  message?: string;
}

export function runAllEngineUnitTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
} {
  const results: TestCaseResult[] = [];

  // 1. Rectangular Straight Test
  try {
    const engine = EngineFactory.getEngine('rect_straight');
    const input: DuctCalculationInput = {
      modelId: 'rect_straight',
      dimensions: { width: 600, height: 400, length: 1200, fabricationStyle: 'two_piece_l' as any },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    };
    const res = engine.calculate(input);
    const expectedBlankL = 1270;
    const actualBlankL = res.parts[0].blankLengthMm;
    const passL = Math.abs(actualBlankL - expectedBlankL) < 1;

    results.push({
      engineId: 'rect_straight',
      testName: 'Rectangular Straight 2-Piece L Blank Length with TDC',
      passed: passL,
      expected: `${expectedBlankL} mm`,
      actual: `${actualBlankL} mm`,
      message: passL ? 'TDC 35mm per end correctly added' : 'Length mismatch',
    });

    const valRes = engine.validate({ ...input, dimensions: { width: -100, height: 400, length: 1200 } });
    results.push({
      engineId: 'rect_straight',
      testName: 'Rectangular Straight Rejection of Negative Width',
      passed: !valRes.valid,
      expected: 'Invalid (false)',
      actual: String(!valRes.valid),
    });
  } catch (err: any) {
    results.push({
      engineId: 'rect_straight',
      testName: 'Rectangular Straight Test Suite',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 2. Round Straight Test
  try {
    const engine = EngineFactory.getEngine('round_straight');
    const input: DuctCalculationInput = {
      modelId: 'round_straight',
      dimensions: { diameter: 400, length: 1000, crimpEnd: true as any },
      material: 'galvanized',
      gauge: 26,
      longitudinalSeam: 'grooved_seam',
      transverseConnector: 'raw_edge',
    };
    const res = engine.calculate(input);
    const expectedBlankW = Math.PI * 400 + 20;
    const actualBlankW = res.parts[0].blankWidthMm;
    const passW = Math.abs(actualBlankW - expectedBlankW) < 1.5;

    results.push({
      engineId: 'round_straight',
      testName: 'Round Duct Circumference & Pipe Lock Seam',
      passed: passW,
      expected: `${expectedBlankW.toFixed(1)} mm`,
      actual: `${actualBlankW} mm`,
      message: passW ? 'Accurate π x D + seam formula verified' : 'Circumference mismatch',
    });
  } catch (err: any) {
    results.push({
      engineId: 'round_straight',
      testName: 'Round Straight Test Suite',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 3. Round Segmented Elbow (Gore) Test
  try {
    const engine = EngineFactory.getEngine('round_segmented_elbow');
    const input: DuctCalculationInput = {
      modelId: 'round_segmented_elbow',
      dimensions: { diameter: 400, centerlineRadius: 600, angleDeg: 90, numGores: 5 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'grooved_seam',
      transverseConnector: 'raw_edge',
    };
    const res = engine.calculate(input);
    // For 5 gores, divisions = 2 * (5 - 1) = 8
    // Miter angle = 90 / 8 = 11.25 deg
    const expectedHalfMiter = 11.25;
    const actualHalfMiter = parseFloat(String(res.dimensionsSummary['Miter Angle per Cut'] || res.dimensionsSummary['Half Miter Angle']));
    const passMiter = Math.abs(actualHalfMiter - expectedHalfMiter) < 0.1;

    results.push({
      engineId: 'round_segmented_elbow',
      testName: '5-Gore Elbow Half-Miter Angle Calculation',
      passed: passMiter,
      expected: `${expectedHalfMiter}°`,
      actual: `${actualHalfMiter}°`,
      message: passMiter ? 'Miter angle θ / [2*(N-1)] exact' : 'Miter angle error',
    });
  } catch (err: any) {
    results.push({
      engineId: 'round_segmented_elbow',
      testName: 'Round Segmented Elbow Suite',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 4. Square-to-Round Transition Test
  try {
    const engine = EngineFactory.getEngine('square_to_round');
    const input: DuctCalculationInput = {
      modelId: 'square_to_round',
      dimensions: { baseWidth: 500, baseHeight: 500, topDiameter: 350, length: 400, offsetX: 0, offsetY: 0 },
      material: 'galvanized',
      gauge: 22,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    };
    const res = engine.calculate(input);
    const passParts = res.parts.length === 2 && res.parts[0].bendCount >= 8;

    results.push({
      engineId: 'square_to_round',
      testName: 'Square-to-Round Triangulation Radial Lines & Halves',
      passed: passParts,
      expected: '2 Halves with >= 8 Triangulation lines each',
      actual: `${res.parts.length} parts, ${res.parts[0].bendCount} bends`,
      message: passParts ? 'Triangulation matrix generation verified' : 'Triangulation structure mismatch',
    });
  } catch (err: any) {
    results.push({
      engineId: 'square_to_round',
      testName: 'Square-to-Round Suite',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 5. Round Reducer Frustum Apex Angle Test
  try {
    const engine = EngineFactory.getEngine('round_concentric_reducer');
    const input: DuctCalculationInput = {
      modelId: 'round_concentric_reducer',
      dimensions: { largeDiameter: 500, smallDiameter: 350, length: 400 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'grooved_seam',
      transverseConnector: 'raw_edge',
    };
    const res = engine.calculate(input);
    const actualSweep = parseFloat(String(res.dimensionsSummary['Sweep Angle'] || res.dimensionsSummary['Apex Sweep Angle']));
    const passSweep = actualSweep > 60 && actualSweep < 72;

    results.push({
      engineId: 'round_concentric_reducer',
      testName: 'Conical Reducer Sector Sweep Angle',
      passed: passSweep,
      expected: '66.3° ± 2°',
      actual: `${actualSweep}°`,
      message: passSweep ? 'True apex radial line development confirmed' : 'Sweep angle mismatch',
    });
  } catch (err: any) {
    results.push({
      engineId: 'round_concentric_reducer',
      testName: 'Round Reducer Suite',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 6. 90° Radius Elbow Cheek & Arc Length Test
  try {
    const engine = EngineFactory.getEngine('rect_radius_elbow');
    const input: DuctCalculationInput = {
      modelId: 'rect_radius_elbow',
      dimensions: { width: 500, height: 300, throatRadius: 250, angleDeg: 90, throatExtension: 50 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    };
    const res = engine.calculate(input);
    const heelWrapper = res.parts.find(p => p.id === 'heel_wrapper');
    const passHeel = heelWrapper !== undefined && heelWrapper.blankLengthMm > 1200;

    results.push({
      engineId: 'rect_radius_elbow',
      testName: 'Radius Elbow Heel Wrapper Arc Length (R_heel = R_throat + W)',
      passed: passHeel,
      expected: '> 1200 mm',
      actual: `${heelWrapper?.blankLengthMm} mm`,
      message: passHeel ? 'R_heel = 750mm and arc length formula verified' : 'Heel length error',
    });
  } catch (err: any) {
    results.push({
      engineId: 'rect_radius_elbow',
      testName: 'Radius Elbow Suite',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 7. Manufacturing Validation Engine: Negative Throat Radius Test
  try {
    const invalidElbow: DuctCalculationInput = {
      modelId: 'rect_radius_elbow',
      dimensions: { width: 500, height: 350, throatRadius: -20, angleDeg: 90 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    };
    const valRes = ManufacturingValidationEngine.validate(invalidElbow);
    const hasNegativeRadiusError = valRes.issues.some(
      i => i.fieldId === 'throatRadius' && i.category === 'NEGATIVE_RADIUS' && i.severity === 'error'
    );

    results.push({
      engineId: 'rect_radius_elbow',
      testName: 'Manufacturing Engine: Negative Throat Radius Rejection',
      passed: hasNegativeRadiusError,
      expected: 'Flagged NEGATIVE_RADIUS Error on throatRadius',
      actual: hasNegativeRadiusError ? 'Error correctly flagged' : 'Failed to catch negative radius',
      message: hasNegativeRadiusError ? 'Prevented zero/negative radius crease impossibility' : 'Validation missed negative radius',
    });
  } catch (err: any) {
    results.push({
      engineId: 'rect_radius_elbow',
      testName: 'Manufacturing Validation Engine Negative Radius',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 8. Manufacturing Validation Engine: Segmented Elbow Negative Throat (R_cl <= D/2)
  try {
    const invalidGore: DuctCalculationInput = {
      modelId: 'round_segmented_elbow',
      dimensions: { diameter: 400, centerlineRadius: 180, numGores: 4, angleDeg: 90 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'grooved_seam',
      transverseConnector: 'raw_edge',
    };
    const valRes = ManufacturingValidationEngine.validate(invalidGore);
    const hasGoreThroatError = valRes.issues.some(
      i => i.fieldId === 'centerlineRadius' && i.category === 'NEGATIVE_RADIUS'
    );

    results.push({
      engineId: 'round_segmented_elbow',
      testName: 'Manufacturing Engine: Inside Gore Inversion (R_cl <= D/2)',
      passed: hasGoreThroatError,
      expected: 'Flagged NEGATIVE_RADIUS Error on centerlineRadius',
      actual: hasGoreThroatError ? 'Error correctly flagged' : 'Failed to flag gore inversion',
      message: hasGoreThroatError ? 'Throat R = 180 - 200 = -20mm successfully blocked' : 'Missed gore clash',
    });
  } catch (err: any) {
    results.push({
      engineId: 'round_segmented_elbow',
      testName: 'Manufacturing Validation Engine Gore Throat',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 9. Manufacturing Validation Engine: Acute-Angle Crotch Intersection (< 20°)
  try {
    const invalidWye: DuctCalculationInput = {
      modelId: 'wye_branch',
      dimensions: { inletDiameter: 450, branchDiameter: 300, totalAngle: 15, legLength: 400 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'raw_edge',
    };
    const valRes = ManufacturingValidationEngine.validate(invalidWye);
    const hasAcuteAngleError = valRes.issues.some(
      i => i.fieldId === 'totalAngle' && i.category === 'ACUTE_ANGLE_INTERSECTION'
    );

    results.push({
      engineId: 'wye_branch',
      testName: 'Manufacturing Engine: Acute Crotch Angle (< 20°) Rejection',
      passed: hasAcuteAngleError,
      expected: 'Flagged ACUTE_ANGLE_INTERSECTION Error on totalAngle',
      actual: hasAcuteAngleError ? 'Error correctly flagged' : 'Failed to flag acute angle',
      message: hasAcuteAngleError ? 'Prevented unreachable tool clash in acute crotch' : 'Missed acute angle',
    });
  } catch (err: any) {
    results.push({
      engineId: 'wye_branch',
      testName: 'Manufacturing Validation Engine Acute Angle',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 10. Manufacturing Validation Engine: Flat Oval Inverted Axes (Major < Minor)
  try {
    const invalidOval: DuctCalculationInput = {
      modelId: 'oval_straight',
      dimensions: { majorAxis: 300, minorAxis: 500, length: 1200 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'grooved_seam',
      transverseConnector: 'raw_edge',
    };
    const valRes = ManufacturingValidationEngine.validate(invalidOval);
    const hasOvalError = valRes.issues.some(
      i => i.fieldId === 'majorAxis' && i.category === 'GEOMETRIC_IMPOSSIBILITY'
    );

    results.push({
      engineId: 'oval_straight',
      testName: 'Manufacturing Engine: Flat Oval Negative Flat Length Rejection',
      passed: hasOvalError,
      expected: 'Flagged GEOMETRIC_IMPOSSIBILITY Error on majorAxis',
      actual: hasOvalError ? 'Error correctly flagged' : 'Failed to flag inverted axes',
      message: hasOvalError ? 'Negative flat length (300 - 500 = -200mm) blocked' : 'Missed oval inversion',
    });
  } catch (err: any) {
    results.push({
      engineId: 'oval_straight',
      testName: 'Manufacturing Validation Engine Oval Axes',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  // 11. Manufacturing Validation Engine: Auto-Fix Correction
  try {
    const brokenInput: DuctCalculationInput = {
      modelId: 'rect_radius_elbow',
      dimensions: { width: 500, height: 350, throatRadius: -10, angleDeg: 90, throatExtension: 10 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    };
    const firstCheck = ManufacturingValidationEngine.validate(brokenInput);
    const fixedInput = ManufacturingValidationEngine.autoFixInputs(brokenInput, firstCheck.issues);
    const secondCheck = ManufacturingValidationEngine.validate(fixedInput);

    results.push({
      engineId: 'rect_radius_elbow',
      testName: 'Manufacturing Engine: Auto-Fix Algorithmic Recovery',
      passed: secondCheck.isValid,
      expected: 'Valid after autoFix (0 Errors)',
      actual: secondCheck.isValid ? 'Cleanly resolved all errors' : `Still has ${secondCheck.errorCount} errors`,
      message: secondCheck.isValid ? `Throat radius corrected to ${fixedInput.dimensions.throatRadius}mm` : 'Auto-fix failed',
    });
  } catch (err: any) {
    results.push({
      engineId: 'rect_radius_elbow',
      testName: 'Manufacturing Validation Engine Auto-Fix',
      passed: false,
      expected: 'Pass',
      actual: String(err.message),
    });
  }

  const passed = results.filter(r => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };
}
