/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  DuctCategory, 
  DuctModelId, 
  DuctCalculationInput, 
  CalculationResult 
} from './types';
import { EngineFactory } from './engines/EngineRegistry';
import { ManufacturingValidationEngine } from './engines/ManufacturingValidationEngine';
import { Header } from './components/Header';
import { ModelSelector } from './components/ModelSelector';
import { ParameterForm } from './components/ParameterForm';
import { Pattern2DViewer } from './components/Pattern2DViewer';
import { Model3DViewer } from './components/Model3DViewer';
import { FabricationBOM } from './components/FabricationBOM';
import { NestingPreview } from './components/NestingPreview';
import { DocumentationModal } from './components/DocumentationModal';
import { UnitTestsModal } from './components/UnitTestsModal';
import { ProjectManagerModal } from './components/ProjectManagerModal';
import { ExportPanel } from './components/ExportPanel';
import {
  Maximize2,
  Box,
  Columns,
  CheckCircle2,
  AlertCircle,
  AlertOctagon,
  ShieldCheck,
  Settings2,
  Share2,
} from 'lucide-react';

type MobilePane = 'params' | 'design' | 'export';

export default function App() {
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [selectedCategory, setSelectedCategory] = useState<DuctCategory>('straight');
  const [selectedModelId, setSelectedModelId] = useState<DuctModelId>('rect_straight');
  const [selectedPartIndex, setSelectedPartIndex] = useState<number>(0);
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
  const [viewMode, setViewMode] = useState<'split' | '2d' | '3d'>(isSmallScreen ? '2d' : 'split');
  // Mobile/tablet only: which pane of the workspace is visible (desktop shows all).
  const [mobilePane, setMobilePane] = useState<MobilePane>('params');

  // Modals
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [isTestsOpen, setIsTestsOpen] = useState<boolean>(false);
  const [isNestingOpen, setIsNestingOpen] = useState<boolean>(false);
  const [isProjectOpen, setIsProjectOpen] = useState<boolean>(false);

  // Active inputs
  const [inputs, setInputs] = useState<DuctCalculationInput>({
    modelId: 'rect_straight',
    dimensions: {
      width: 600,
      height: 400,
      length: 1200,
      fabricationStyle: 'two_piece_l' as any,
    },
    material: 'galvanized',
    gauge: 24,
    longitudinalSeam: 'pittsburgh',
    transverseConnector: 'tdc_tdf',
  });

  // Active engine
  const currentEngine = useMemo(() => {
    try {
      return EngineFactory.getEngine(selectedModelId);
    } catch {
      return EngineFactory.getEngine('rect_straight');
    }
  }, [selectedModelId]);

  // When model changes, initialize defaults for that engine
  const handleSelectModel = (modelId: DuctModelId) => {
    setSelectedModelId(modelId);
    setSelectedPartIndex(0);
    const engine = EngineFactory.getEngine(modelId);
    const defaultDims: Record<string, any> = {};
    engine.parameters.forEach(p => {
      defaultDims[p.id] = p.defaultValue;
    });

    setInputs(prev => ({
      ...prev,
      modelId,
      dimensions: defaultDims,
    }));
  };

  const handleResetDefaults = () => {
    handleSelectModel(selectedModelId);
  };

  // Manufacturing Validation Engine evaluation
  const validationResult = useMemo(() => {
    return ManufacturingValidationEngine.validate(inputs);
  }, [inputs]);

  // Perform Calculation
  const calculationResult: CalculationResult = useMemo(() => {
    try {
      const baseResult = currentEngine.calculate(inputs);
      const val = ManufacturingValidationEngine.validate(inputs);
      const extraWarnings = val.issues.map(i =>
        lang === 'bn' ? `[${i.category}] ${i.messageBn}` : `[${i.category}] ${i.messageEn}`
      );
      return {
        ...baseResult,
        warnings: [...(baseResult.warnings || []), ...extraWarnings],
        smacnaCompliant: baseResult.smacnaCompliant && val.isValid,
      };
    } catch (err: any) {
      console.error('Calculation error:', err);
      // Fallback result to prevent crash
      return currentEngine.calculate({
        ...inputs,
        dimensions: currentEngine.parameters.reduce((acc, p) => ({ ...acc, [p.id]: p.defaultValue }), {}),
      });
    }
  }, [currentEngine, inputs, lang]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* 1. Header */}
      <Header
        currentModelId={selectedModelId}
        onSelectModel={handleSelectModel}
        lang={lang}
        onToggleLang={() => setLang(l => (l === 'en' ? 'bn' : 'en'))}
        onOpenDocs={() => setIsDocsOpen(true)}
        onOpenTests={() => setIsTestsOpen(true)}
        onOpenNesting={() => setIsNestingOpen(true)}
        onResetDefaults={handleResetDefaults}
        onOpenProjectManager={() => setIsProjectOpen(true)}
        onOpenExport={() => {
          setMobilePane('export');
          window.setTimeout(
            () => document.getElementById('export')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
            50,
          );
        }}
      />

      {/* 2. Model Selection Banner */}
      <ModelSelector
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedModelId={selectedModelId}
        onSelectModel={handleSelectModel}
        lang={lang}
      />

      {/* 3. Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {/* Mobile / tablet pane switcher (desktop shows every pane at once) */}
        <nav className="lg:hidden sticky top-14 z-20 -mx-3 px-3 py-2 bg-slate-950/95 backdrop-blur border-b border-slate-800">
          <div className="grid grid-cols-3 gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {([
              { id: 'params', label: lang === 'bn' ? 'প্যারামিটার' : 'Parameters', Icon: Settings2 },
              { id: 'design', label: lang === 'bn' ? 'ডিজাইন' : 'Design', Icon: Columns },
              { id: 'export', label: lang === 'bn' ? 'এক্সপোর্ট' : 'Export', Icon: Share2 },
            ] as { id: MobilePane; label: string; Icon: typeof Settings2 }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setMobilePane(tab.id)}
                aria-current={mobilePane === tab.id}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-md text-xs font-medium transition cursor-pointer ${
                  mobilePane === tab.id ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </nav>

        {/* Workspace View Mode Selector & Metadata Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-850">
          {/* Clean Unboxed Metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="text-sm font-bold text-white tracking-tight">
              {lang === 'bn' ? currentEngine.nameBn : currentEngine.name}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>
              {calculationResult.parts.length} {lang === 'bn' ? 'টি পার্ট' : 'parts'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-300">
              {calculationResult.totalWeightKg} kg
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className={validationResult.hasErrors ? 'text-red-400 font-medium' : 'text-emerald-400'}>
              {validationResult.hasErrors 
                ? (lang === 'bn' ? `${validationResult.errorCount}টি জ্যামিতিক সমস্যা` : `${validationResult.errorCount} geometric issues`)
                : (lang === 'bn' ? 'SMACNA স্ট্যান্ডার্ড প্রস্তুত' : 'SMACNA verified')}
            </span>
          </div>

          {/* View Mode Toggle: 2D Pattern / 3D Model / Split */}
          <div className={`${mobilePane === 'design' ? 'flex' : 'hidden'} lg:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5 overflow-x-auto scrollbar-none`}>
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === '2d' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="2D Flat Cutting Pattern Only"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '২ডি প্যাটার্ন' : '2D Pattern'}</span>
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === '3d' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="3D Assembly Model Only"
            >
              <Box className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? '৩ডি ডাক্ট' : '3D Model'}</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                viewMode === 'split' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
              title="Split View (2D Pattern & 3D Model)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'স্প্লিট ভিউ' : 'Split'}</span>
            </button>
          </div>
        </div>

        {/* Core Layout Grid: Parameters on Left, CAD Viewers on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
          {/* Left Parameter Form Column (4 cols) */}
          <div className={`${mobilePane === 'params' ? 'block' : 'hidden'} lg:block lg:col-span-4 xl:col-span-4 space-y-4`}>
            <ParameterForm
              engine={currentEngine}
              inputs={inputs}
              onChangeInput={setInputs}
              lang={lang}
            />
          </div>

          {/* Right CAD Viewport Column (8 cols) */}
          <div className={`${mobilePane === 'design' ? 'block' : 'hidden'} lg:block lg:col-span-8 xl:col-span-8 space-y-4 lg:space-y-5`}>
            {/* Viewports */}
            {viewMode === 'split' && (
              <div className="space-y-4">
                {/* 2D Flat Pattern Canvas */}
                <div className="h-[60vh] min-h-[320px] lg:h-[500px]">
                  <Pattern2DViewer
                    result={calculationResult}
                    selectedPartIndex={selectedPartIndex}
                    onSelectPartIndex={setSelectedPartIndex}
                    lang={lang}
                    material={inputs.material}
                    gauge={inputs.gauge}
                  />
                </div>

                {/* 3D Model Canvas */}
                <div className="h-[45vh] min-h-[280px] lg:h-[360px]">
                  <Model3DViewer
                    result={calculationResult}
                    lang={lang}
                  />
                </div>
              </div>
            )}

            {viewMode === '2d' && (
              <div className="h-[70vh] min-h-[380px] lg:h-[620px]">
                <Pattern2DViewer
                  result={calculationResult}
                  selectedPartIndex={selectedPartIndex}
                  onSelectPartIndex={setSelectedPartIndex}
                  lang={lang}
                  material={inputs.material}
                  gauge={inputs.gauge}
                />
              </div>
            )}

            {viewMode === '3d' && (
              <div className="h-[70vh] min-h-[380px] lg:h-[600px]">
                <Model3DViewer
                  result={calculationResult}
                  lang={lang}
                />
              </div>
            )}

            {/* Bill of Materials & Fabrication Summary */}
            <FabricationBOM
              result={calculationResult}
              lang={lang}
            />
          </div>
        </div>

        {/* 4. Export Center (own section, full width) */}
        <div className={`${mobilePane === 'export' ? 'block' : 'hidden'} lg:block`}>
          <ExportPanel
            result={calculationResult}
            inputs={inputs}
            selectedPartIndex={selectedPartIndex}
            lang={lang}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-400">AeroDuct CAD/CAM Layout Engine</span>
            <span>•</span>
            <span>SMACNA HVAC Duct Construction Standards Compliant</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsDocsOpen(true)}
              className="hover:text-slate-300 transition"
            >
              {lang === 'bn' ? 'ফর্মুলা ডকুমেন্টেশন' : 'Engineering Formulas'}
            </button>
            <button
              onClick={() => setIsTestsOpen(true)}
              className="hover:text-slate-300 transition"
            >
              {lang === 'bn' ? 'ইউনিট টেস্ট স্যুইট' : 'Run Unit Tests'}
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <NestingPreview
        result={calculationResult}
        isOpen={isNestingOpen}
        onClose={() => setIsNestingOpen(false)}
        lang={lang}
      />

      <DocumentationModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        lang={lang}
      />

      <UnitTestsModal
        isOpen={isTestsOpen}
        onClose={() => setIsTestsOpen(false)}
        lang={lang}
      />

      <ProjectManagerModal
        isOpen={isProjectOpen}
        onClose={() => setIsProjectOpen(false)}
        currentInput={inputs}
        onLoadInput={input => {
          setSelectedModelId(input.modelId);
          setSelectedPartIndex(0);
          setInputs(input);
        }}
        lang={lang}
      />
    </div>
  );
}
