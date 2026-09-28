import {
  DuctModelId,
  DuctCategory,
  DuctCalculationInput,
  CalculationResult,
  FormParameterField,
} from '../types';

export interface DuctCalculationEngine {
  readonly id: DuctModelId;
  readonly name: string;
  readonly nameBn: string;
  readonly category: DuctCategory;
  readonly description: string;
  readonly descriptionBn: string;
  readonly parameters: FormParameterField[];

  validate(inputs: DuctCalculationInput): { valid: boolean; errors: string[] };
  calculate(inputs: DuctCalculationInput): CalculationResult;
}
