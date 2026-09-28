import { CalculationResult } from '../types';

export function generateCsvCutList(result: CalculationResult): string {
  const headers = [
    'Part ID',
    'Part Description',
    'Quantity',
    'Blank Width (mm)',
    'Blank Length (mm)',
    'Area (m²)',
    'Unit Weight (kg)',
    'Total Weight (kg)',
    'Bend Count',
    'Model',
    'Category',
    'Notes',
  ];

  const rows: string[][] = [];

  result.parts.forEach(part => {
    rows.push([
      `"${part.id}"`,
      `"${part.partName}"`,
      String(part.quantity),
      String(part.blankWidthMm),
      String(part.blankLengthMm),
      String(part.areaM2),
      String(part.weightKg),
      String((part.weightKg * part.quantity).toFixed(2)),
      String(part.bendCount),
      `"${result.modelName}"`,
      `"${result.category}"`,
      `"${(part.notes || []).join('; ')}"`,
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    '"TOTALS"',
    '""',
    String(result.parts.reduce((a, b) => a + b.quantity, 0)),
    '""',
    '""',
    String(result.totalBlankAreaM2),
    '""',
    String(result.totalWeightKg),
    String(result.parts.reduce((a, b) => a + b.bendCount, 0)),
    '""',
    '""',
    `"SMACNA Compliant: ${result.smacnaCompliant ? 'YES' : 'NO'}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function downloadCsvCutList(result: CalculationResult, fileName?: string) {
  const csv = generateCsvCutList(result);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${result.modelId}_cut_list.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
