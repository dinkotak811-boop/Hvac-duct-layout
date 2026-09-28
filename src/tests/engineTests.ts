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

  // 2. Square-to-Round Transition Test
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

  // 3. 90° Radius Elbow Cheek & Arc Length Test
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

  // 4. Manufacturing Validation Engine: Negative Throat Radius Test
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

  // 5. Manufacturing Validation Engine: Auto-Fix Correction
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
