import React, { useState } from 'react';
import { CalculationResult } from '../types';
import { STANDARD_SHEET_SIZES } from '../standards/materials';
import { Layers, X, Info, Scissors, Check, Sparkles } from 'lucide-react';

interface NestingPreviewProps {
  result: CalculationResult;
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'bn';
}

export const NestingPreview: React.FC<NestingPreviewProps> = ({
  result,
  isOpen,
  onClose,
  lang,
}) => {
  const [selectedSheetId, setSelectedSheetId] = useState<string>('4x8');
  const sheet = STANDARD_SHEET_SIZES.find(s => s.id === selectedSheetId) || STANDARD_SHEET_SIZES[0];

  if (!isOpen) return null;

  // Calculate Nesting Metrics:
  const sheetAreaM2 = (sheet.widthMm * sheet.lengthMm) / 1e6;
  const totalPartAreaM2 = result.totalBlankAreaM2;

  // Estimated sheets needed (with 15% nesting kerf/kerf padding)
  const estimatedSheets = Math.max(1, Math.ceil((totalPartAreaM2 * 1.15) / sheetAreaM2));
  const totalPurchasedSheetAreaM2 = estimatedSheets * sheetAreaM2;
  const scrapAreaM2 = Math.max(0, totalPurchasedSheetAreaM2 - totalPartAreaM2);
  const scrapPercentage = ((scrapAreaM2 / totalPurchasedSheetAreaM2) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-y-auto max-h-[92vh] shadow-2xl space-y-0 text-slate-200">
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? 'শীট মেটাল নেস্টিং ও স্ক্র্যাপ ক্যালকুলেশন' : 'Sheet Metal Nesting & Scrap Optimization'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'স্ট্যান্ডার্ড শীটে পার্টস বসানোর হিসাব ও স্ক্র্যাপ কমানোর কৌশল' : 'Material yield analysis on commercial standard sheet sizes'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Sheet Size Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              {lang === 'bn' ? 'স্ট্যান্ডার্ড শীট সাইজ নির্বাচন করুন' : 'Select Standard Sheet Blank Size:'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {STANDARD_SHEET_SIZES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSheetId(s.id)}
                  className={`p-3 rounded-xl border text-left text-xs transition-all ${
                    selectedSheetId === s.id
                      ? 'bg-slate-800 border-cyan-500 text-cyan-300 shadow-sm ring-1 ring-cyan-500/40'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-slate-200">{s.label}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    {((s.widthMm * s.lengthMm) / 1e6).toFixed(2)} m² per sheet
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Nesting Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-xl">
              <div className="text-slate-400 mb-1">{lang === 'bn' ? 'প্রয়োজনীয় শীট' : 'Sheets Required'}</div>
              <div className="text-2xl font-bold font-mono text-cyan-400">{estimatedSheets} <span className="text-xs font-normal">sheets</span></div>
            </div>
            <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-xl">
              <div className="text-slate-400 mb-1">{lang === 'bn' ? 'পার্টস নেট এরিয়া' : 'Net Parts Area'}</div>
              <div className="text-2xl font-bold font-mono text-white">{totalPartAreaM2} <span className="text-xs font-normal">m²</span></div>
            </div>
            <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-xl">
              <div className="text-slate-400 mb-1">{lang === 'bn' ? 'উপাদান ব্যবহার' : 'Material Yield'}</div>
              <div className="text-2xl font-bold font-mono text-emerald-400">{result.materialEfficiency}%</div>
            </div>
            <div className="bg-slate-800/60 border border-slate-750 p-3 rounded-xl">
              <div className="text-slate-400 mb-1">{lang === 'bn' ? 'স্ক্র্যাপ পার্সেন্ট' : 'Est. Scrap %'}</div>
              <div className="text-2xl font-bold font-mono text-amber-400">{scrapPercentage}%</div>
            </div>
          </div>

          {/* Visual Schematic Diagram of Sheet Nesting */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300">
              {lang === 'bn' ? 'ভিজ্যুয়াল নেস্টিং প্রিভিউ' : 'Visual Sheet Blank Representation:'}
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-center">
              <div className="relative border-2 border-dashed border-slate-600 bg-slate-900/60 rounded-lg p-2 max-w-full overflow-hidden"
                   style={{ width: '450px', height: '220px' }}>
                <span className="absolute top-2 left-2 text-[10px] font-mono text-slate-500">
                  {sheet.widthMm} x {sheet.lengthMm} mm
                </span>

                {/* Simulated nested parts representation */}
                <div className="w-full h-full pt-5 flex flex-wrap gap-1.5 items-start justify-start content-start">
                  {result.parts.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-cyan-950/80 border border-cyan-500/80 rounded p-1 text-[9px] font-mono text-cyan-300 flex items-center justify-center truncate"
                      style={{
                        width: `${Math.min(130, Math.max(50, (p.blankWidthMm / sheet.widthMm) * 400))}px`,
                        height: `${Math.min(90, Math.max(35, (p.blankLengthMm / sheet.lengthMm) * 180))}px`,
                      }}
                      title={`${p.partName}: ${p.blankWidthMm}x${p.blankLengthMm}mm`}
                    >
                      {p.id.substring(0, 10)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shop Floor Optimization Tips */}
          <div className="p-3.5 bg-slate-850 border border-slate-800 rounded-xl text-xs space-y-1.5">
            <div className="font-bold flex items-center space-x-1.5 text-cyan-400">
              <Sparkles className="w-4 h-4" />
              <span>{lang === 'bn' ? 'ফেব্রিকেশন টিপস' : 'CAM Nesting Optimization Tips'}</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>{lang === 'bn' ? 'কয়েল লাইন ব্যবহার করলে দৈর্ঘ্য বরাবর কাটিং স্ক্র্যাপ শূন্য করা সম্ভব।' : 'Continuous coil line feed (1220mm / 1500mm coil) eliminates transverse length scrap completely.'}</li>
              <li>{lang === 'bn' ? 'TDC/TDF কর্ণাটকের ৩০° বা ৪৫° নচ আগে পাঞ্চ করে বেন্ডিং করলে সময় ও বিদ্যুৎ বাঁচে।' : 'Punch TDC corner relief notches prior to roll-forming to avoid edge tearing during final bending.'}</li>
              <li>{lang === 'bn' ? 'ছোট পার্টসগুলো (যেমন ট্যাপ কলার, এন্ড ক্যাপ) বড় এলবো চিকের অবশিষ্ট খালি জায়গায় নেস্ট করুন।' : 'Nest small fittings (register boots, tap collars, end caps) in the hollow throat area of large elbow cheeks.'}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
