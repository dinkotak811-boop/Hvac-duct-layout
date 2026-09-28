import React from 'react';
import { CalculationResult } from '../types';
import { 
  ClipboardList, 
  Weight, 
  Ruler, 
  ShieldCheck, 
  AlertTriangle, 
  Percent, 
  Check, 
  Layers
} from 'lucide-react';

interface FabricationBOMProps {
  result: CalculationResult;
  lang: 'en' | 'bn';
}

export const FabricationBOM: React.FC<FabricationBOMProps> = ({ result, lang }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <ClipboardList className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white">
            {lang === 'bn' ? 'বিল অব ম্যাটেরিয়ালস ও ফেব্রিকেশন সামারি' : 'Bill of Materials & Fabrication Summary'}
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>{lang === 'bn' ? 'SMACNA ভেরিফায়েড' : 'SMACNA Standard'}</span>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-lg">
          <div className="flex items-center space-x-1 text-slate-400 text-xs mb-1">
            <Weight className="w-3.5 h-3.5 text-cyan-400" />
            <span>{lang === 'bn' ? 'মোট ওজন' : 'Total Weight'}</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {result.totalWeightKg} <span className="text-xs text-slate-400 font-normal">kg</span>
          </div>
          <div className="text-[10px] text-slate-400">
            ≈ {(result.totalWeightKg * 2.20462).toFixed(1)} lbs
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-lg">
          <div className="flex items-center space-x-1 text-slate-400 text-xs mb-1">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>{lang === 'bn' ? 'মোট ব্ল্যাঙ্ক এরিয়া' : 'Blank Area'}</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {result.totalBlankAreaM2} <span className="text-xs text-slate-400 font-normal">m²</span>
          </div>
          <div className="text-[10px] text-slate-400">
            ≈ {(result.totalBlankAreaM2 * 10.7639).toFixed(1)} sq.ft
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-lg">
          <div className="flex items-center space-x-1 text-slate-400 text-xs mb-1">
            <Percent className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'bn' ? 'মেটেরিয়াল এফিসিয়েন্সি' : 'Sheet Efficiency'}</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {result.materialEfficiency}%
          </div>
          <div className="text-[10px] text-emerald-400">
            Scrap: {(100 - result.materialEfficiency).toFixed(1)}%
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-lg">
          <div className="flex items-center space-x-1 text-slate-400 text-xs mb-1">
            <Ruler className="w-3.5 h-3.5 text-purple-400" />
            <span>{lang === 'bn' ? 'মোট পার্টস সংখ্যা' : 'Total Parts'}</span>
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {result.parts.reduce((a, b) => a + b.quantity, 0)} <span className="text-xs text-slate-400 font-normal">pcs</span>
          </div>
          <div className="text-[10px] text-slate-400">
            {result.parts.length} unique shapes
          </div>
        </div>
      </div>

      {/* Parts Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-lg">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th className="px-3 py-2.5">{lang === 'bn' ? 'পার্ট বর্ণনা' : 'Part Description'}</th>
              <th className="px-3 py-2.5 text-center">{lang === 'bn' ? 'পরিমাণ' : 'Qty'}</th>
              <th className="px-3 py-2.5 font-mono">{lang === 'bn' ? 'ব্ল্যাঙ্ক সাইজ (W x L)' : 'Blank (W x L mm)'}</th>
              <th className="px-3 py-2.5 font-mono">{lang === 'bn' ? 'এরিয়া (m²)' : 'Area (m²)'}</th>
              <th className="px-3 py-2.5 font-mono">{lang === 'bn' ? 'ওজন (kg)' : 'Weight (kg)'}</th>
              <th className="px-3 py-2.5 text-center">{lang === 'bn' ? 'বেন্ড সংখ্যা' : 'Bends'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-medium">
            {result.parts.map(p => (
              <tr key={p.id} className="hover:bg-slate-800/40 transition">
                <td className="px-3 py-2 text-white font-semibold">
                  <div>{lang === 'bn' ? p.partNameBn : p.partName}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{p.id}</div>
                </td>
                <td className="px-3 py-2 text-center font-mono font-bold text-cyan-400">
                  {p.quantity}
                </td>
                <td className="px-3 py-2 font-mono text-slate-200">
                  {p.blankWidthMm} x {p.blankLengthMm}
                </td>
                <td className="px-3 py-2 font-mono">
                  {p.areaM2}
                </td>
                <td className="px-3 py-2 font-mono text-emerald-400">
                  {p.weightKg}
                </td>
                <td className="px-3 py-2 text-center font-mono">
                  {p.bendCount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SMACNA Recommendations and Warnings */}
      <div className="space-y-2 pt-1">
        {result.warnings.length > 0 && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs space-y-1">
            <div className="font-bold flex items-center space-x-1.5 text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span>{lang === 'bn' ? 'সতর্কতা' : 'Engineering Warnings'}</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] opacity-90">
              {result.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {result.recommendations.length > 0 && (
          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-750 text-slate-300 text-xs space-y-1">
            <div className="font-bold flex items-center space-x-1.5 text-cyan-400">
              <Check className="w-4 h-4" />
              <span>{lang === 'bn' ? 'SMACNA ফেব্রিকেশন নির্দেশিকা' : 'SMACNA Fabrication Guidelines'}</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
              {result.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
