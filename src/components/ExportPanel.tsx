import React, { useState } from 'react';
import {
  Download,
  FileCode,
  FileText,
  FileSpreadsheet,
  FileJson,
  Layers,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { CalculationResult, DuctCalculationInput } from '../types';
import { downloadDxf, downloadCompleteDxf } from '../exporters/dxfExporter';
import { downloadSvg, downloadCompleteSvg } from '../exporters/svgExporter';
import { generatePdfReport, generateCompletePdfReport } from '../exporters/pdfExporter';
import { downloadCsvCutList } from '../exporters/csvExporter';

interface ExportPanelProps {
  result: CalculationResult;
  inputs: DuctCalculationInput;
  selectedPartIndex: number;
  lang: 'en' | 'bn';
}

type ExportScope = 'all' | 'part';

const sanitize = (s: string) =>
  s.trim().replace(/[^a-zA-Z0-9-_]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'aeroduct';

export const ExportPanel: React.FC<ExportPanelProps> = ({
  result,
  inputs,
  selectedPartIndex,
  lang,
}) => {
  const [scope, setScope] = useState<ExportScope>('all');
  const [fileBase, setFileBase] = useState<string>('');
  const [lastExport, setLastExport] = useState<string | null>(null);

  const bn = lang === 'bn';
  const part = result.parts[selectedPartIndex] ?? result.parts[0];
  const singleScope = scope === 'part' && !!part;
  const base = sanitize(fileBase || result.modelId);

  const notify = (fileName: string) => {
    setLastExport(fileName);
    window.setTimeout(() => setLastExport(cur => (cur === fileName ? null : cur)), 6000);
  };

  const handleDxf = () => {
    const name = singleScope ? `${base}_${sanitize(part.partName)}.dxf` : `${base}_all_parts.dxf`;
    if (singleScope) downloadDxf(part, name);
    else downloadCompleteDxf(result, name);
    notify(name);
  };

  const handleSvg = () => {
    const name = singleScope ? `${base}_${sanitize(part.partName)}.svg` : `${base}_all_parts.svg`;
    if (singleScope) downloadSvg(part, name);
    else downloadCompleteSvg(result, name);
    notify(name);
  };

  const handlePdf = () => {
    if (singleScope) generatePdfReport(result, part);
    else generateCompletePdfReport(result);
    notify(singleScope ? `${base}_${sanitize(part.partName)}.pdf` : `${base}_work_order.pdf`);
  };

  const handleCsv = () => {
    const name = `${base}_cut_list.csv`;
    downloadCsvCutList(result, name);
    notify(name);
  };

  const handleJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      application: 'AeroDuct CAD/CAM',
      input: inputs,
      summary: {
        modelId: result.modelId,
        modelName: result.modelName,
        category: result.category,
        totalWeightKg: result.totalWeightKg,
        totalSurfaceAreaM2: result.totalSurfaceAreaM2,
        totalBlankAreaM2: result.totalBlankAreaM2,
        materialEfficiency: result.materialEfficiency,
        smacnaCompliant: result.smacnaCompliant,
        dimensionsSummary: result.dimensionsSummary,
        warnings: result.warnings,
      },
      parts: result.parts.map(p => ({
        id: p.id,
        partName: p.partName,
        quantity: p.quantity,
        blankWidthMm: p.blankWidthMm,
        blankLengthMm: p.blankLengthMm,
        areaM2: p.areaM2,
        weightKg: p.weightKg,
        bendCount: p.bendCount,
        notes: p.notes,
      })),
    };
    const name = `${base}_project.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
    notify(name);
  };

  const formats = [
    {
      id: 'dxf',
      title: 'DXF',
      subtitle: bn ? 'CNC / প্লাজমা কাটিং' : 'CNC / plasma cutting',
      hint: bn ? 'AutoCAD R12 লেয়ারসহ' : 'AutoCAD R12, layered',
      icon: FileCode,
      color: 'text-emerald-400',
      ring: 'hover:border-emerald-500/60 focus-visible:border-emerald-500/60',
      onClick: handleDxf,
    },
    {
      id: 'svg',
      title: 'SVG',
      subtitle: bn ? 'ভেক্টর ড্রয়িং' : 'Vector drawing',
      hint: bn ? '১:১ স্কেলে প্রিন্ট' : '1:1 scale print',
      icon: Download,
      color: 'text-cyan-400',
      ring: 'hover:border-cyan-500/60 focus-visible:border-cyan-500/60',
      onClick: handleSvg,
    },
    {
      id: 'pdf',
      title: 'PDF',
      subtitle: bn ? 'ওয়ার্ক অর্ডার রিপোর্ট' : 'Work order report',
      hint: bn ? 'শপ ফ্লোর শিট' : 'Shop floor sheet',
      icon: FileText,
      color: 'text-rose-400',
      ring: 'hover:border-rose-500/60 focus-visible:border-rose-500/60',
      onClick: handlePdf,
    },
    {
      id: 'csv',
      title: 'CSV',
      subtitle: bn ? 'কাট লিস্ট / ERP' : 'Cut list / ERP',
      hint: bn ? 'সব পার্ট (স্কোপ প্রযোজ্য নয়)' : 'Always all parts',
      icon: FileSpreadsheet,
      color: 'text-amber-400',
      ring: 'hover:border-amber-500/60 focus-visible:border-amber-500/60',
      onClick: handleCsv,
    },
    {
      id: 'json',
      title: 'JSON',
      subtitle: bn ? 'প্রজেক্ট ডেটা' : 'Project data',
      hint: bn ? 'ইনপুট + BOM ব্যাকআপ' : 'Inputs + BOM backup',
      icon: FileJson,
      color: 'text-violet-400',
      ring: 'hover:border-violet-500/60 focus-visible:border-violet-500/60',
      onClick: handleJson,
    },
  ];

  return (
    <section
      id="export"
      className="bg-slate-900 border border-slate-800 rounded-xl shadow-xl scroll-mt-20"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Share2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <h2 className="text-sm font-bold text-white truncate">
            {bn ? 'এক্সপোর্ট সেন্টার' : 'Export Center'}
          </h2>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-800/40 px-1.5 py-0.5 rounded hidden sm:inline">
            {result.parts.length} {bn ? 'পার্ট' : 'parts'}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          {result.totalWeightKg} kg · {result.totalBlankAreaM2} m²
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Scope + file name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
              {bn ? 'কী এক্সপোর্ট হবে' : 'Export scope'}
            </label>
            <div className="grid grid-cols-2 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setScope('all')}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  scope === 'all' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="truncate">{bn ? 'সব পার্ট' : 'All parts'}</span>
              </button>
              <button
                onClick={() => setScope('part')}
                disabled={!part}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer disabled:opacity-40 ${
                  scope === 'part' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span className="truncate">{bn ? 'নির্বাচিত পার্ট' : 'Selected part'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              {singleScope
                ? `${bn ? 'পার্ট' : 'Part'}: ${bn ? part.partNameBn : part.partName} (${part.blankWidthMm}×${part.blankLengthMm} mm)`
                : bn
                ? `${result.parts.length}টি পার্ট একসাথে এক ফাইলে`
                : `All ${result.parts.length} parts in one file`}
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="export-file-base"
              className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold"
            >
              {bn ? 'ফাইলের নাম' : 'File name'}
            </label>
            <input
              id="export-file-base"
              type="text"
              value={fileBase}
              onChange={e => setFileBase(e.target.value)}
              placeholder={result.modelId}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-600 transition"
            />
            <p className="text-[11px] text-slate-500 font-mono truncate">
              {base}_all_parts.dxf
            </p>
          </div>
        </div>

        {/* Format buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {formats.map(f => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                onClick={f.onClick}
                className={`group flex flex-col items-start gap-1 p-3 min-h-[76px] rounded-xl bg-slate-950/70 border border-slate-800 text-left transition active:scale-[0.98] cursor-pointer ${f.ring}`}
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className={`w-4 h-4 shrink-0 ${f.color}`} />
                  <span className="text-sm font-bold text-white">{f.title}</span>
                  <Download className="w-3 h-3 text-slate-600 ml-auto group-hover:text-slate-300 transition" />
                </div>
                <span className="text-[11px] text-slate-400 leading-tight">{f.subtitle}</span>
                <span className="text-[10px] text-slate-600 leading-tight hidden sm:block">{f.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Last export confirmation */}
        {lastExport && (
          <div className="flex items-center gap-2 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-mono truncate">{lastExport}</span>
            <span className="text-emerald-500/80 ml-auto hidden sm:inline">
              {bn ? 'ডাউনলোড শুরু হয়েছে' : 'download started'}
            </span>
          </div>
        )}

        {/* Quick facts */}
        <dl className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center">
          {[
            { k: bn ? 'পার্ট' : 'Parts', v: String(result.parts.length) },
            { k: bn ? 'ব্ল্যাঙ্ক এরিয়া' : 'Blank area', v: `${result.totalBlankAreaM2} m²` },
            { k: bn ? 'ওজন' : 'Weight', v: `${result.totalWeightKg} kg` },
            { k: bn ? 'দক্ষতা' : 'Efficiency', v: `${result.materialEfficiency}%` },
          ].map(item => (
            <div key={item.k} className="bg-slate-950/60 border border-slate-800/80 rounded-lg py-2 px-1">
              <dt className="text-[10px] uppercase tracking-wide text-slate-500">{item.k}</dt>
              <dd className="text-sm font-mono font-semibold text-slate-200">{item.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
};
