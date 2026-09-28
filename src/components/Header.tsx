import React from 'react';
import { 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  FolderDown, 
  FolderUp, 
  RotateCcw,
  Languages,
  Wrench,
  Download
} from 'lucide-react';
import { DuctModelId } from '../types';

interface HeaderProps {
  currentModelId: DuctModelId;
  onSelectModel: (id: DuctModelId) => void;
  lang: 'en' | 'bn';
  onToggleLang: () => void;
  onOpenDocs: () => void;
  onOpenTests: () => void;
  onOpenNesting: () => void;
  onResetDefaults: () => void;
  onOpenProjectManager: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentModelId,
  onSelectModel,
  lang,
  onToggleLang,
  onOpenDocs,
  onOpenTests,
  onOpenNesting,
  onResetDefaults,
  onOpenProjectManager,
}) => {
  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
              <Layers className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center space-x-2.5">
              <span className="text-base font-bold tracking-tight text-white">
                AeroDuct
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                CAD/CAM
              </span>
              <span className="text-[10px] font-medium text-cyan-400/90 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.5 rounded">
                SMACNA
              </span>
            </div>
          </div>

          {/* Clean Action Toolbar */}
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            {/* Sheet Nesting */}
            <button
              onClick={onOpenNesting}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
              title="Sheet Nesting & Material Efficiency"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">{lang === 'bn' ? 'নেস্টিং' : 'Nesting'}</span>
            </button>

            {/* Engineering Formula Docs */}
            <button
              onClick={onOpenDocs}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
              title="Fabrication Standards & Formulas"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">{lang === 'bn' ? 'স্ট্যান্ডার্ড' : 'Formulas'}</span>
            </button>

            {/* Unit Tests Runner */}
            <button
              onClick={onOpenTests}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
              title="Run Automated Engine Verification Tests"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">{lang === 'bn' ? 'টেস্ট' : 'Tests'}</span>
            </button>

            {/* Save / Load Projects */}
            <button
              onClick={onOpenProjectManager}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
              title="Project Manager (Save/Load/Presets)"
            >
              <FolderUp className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{lang === 'bn' ? 'প্রজেক্ট' : 'Projects'}</span>
            </button>

            {/* Download Full Project ZIP */}
            <a
              href="/aeroduct-project.zip"
              download="aeroduct-cad-cam-full-project.zip"
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-950/50 hover:bg-emerald-900/60 border border-emerald-700/60 transition cursor-pointer shadow-sm"
              title="Download Full Project Source Code ZIP (সম্পূর্ণ সোর্স কোড জিপ ডাউনলোড)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'bn' ? 'ZIP ডাউনলোড' : 'Project ZIP'}</span>
            </a>

            <div className="h-4 w-px bg-slate-800 mx-1" />

            {/* Language Switch */}
            <button
              onClick={onToggleLang}
              className="px-2 py-1 rounded-md text-xs font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/60 transition cursor-pointer"
              title="Toggle English / বাংলা"
            >
              {lang === 'en' ? 'বাংলা' : 'EN'}
            </button>

            {/* Reset Defaults */}
            <button
              onClick={onResetDefaults}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Reset parameters to factory defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
