import React from 'react';
import { 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  FolderDown, 
  FolderUp, 
  RotateCcw,
  Languages,
  Share2,
  MoreHorizontal
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
  onOpenExport: () => void;
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
  onOpenExport,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);

  const actions = [
    {
      id: 'export',
      label: lang === 'bn' ? 'এক্সপোর্ট' : 'Export',
      title: 'Export DXF / SVG / PDF / CSV',
      Icon: Share2,
      iconClass: 'text-cyan-400',
      onClick: onOpenExport,
      primary: true,
    },
    {
      id: 'nesting',
      label: lang === 'bn' ? 'নেস্টিং' : 'Nesting',
      title: 'Sheet Nesting & Material Efficiency',
      Icon: Layers,
      iconClass: 'text-cyan-400',
      onClick: onOpenNesting,
    },
    {
      id: 'docs',
      label: lang === 'bn' ? 'স্ট্যান্ডার্ড' : 'Formulas',
      title: 'Fabrication Standards & Formulas',
      Icon: BookOpen,
      iconClass: 'text-amber-400',
      onClick: onOpenDocs,
    },
    {
      id: 'tests',
      label: lang === 'bn' ? 'টেস্ট' : 'Tests',
      title: 'Run Automated Engine Verification Tests',
      Icon: CheckCircle2,
      iconClass: 'text-emerald-400',
      onClick: onOpenTests,
    },
    {
      id: 'projects',
      label: lang === 'bn' ? 'প্রজেক্ট' : 'Projects',
      title: 'Project Manager (Save/Load/Presets)',
      Icon: FolderUp,
      iconClass: 'text-blue-400',
      onClick: onOpenProjectManager,
    },
    {
      id: 'reset',
      label: lang === 'bn' ? 'রিসেট' : 'Reset',
      title: 'Reset parameters to factory defaults',
      Icon: RotateCcw,
      iconClass: 'text-slate-400',
      onClick: onResetDefaults,
    },
  ];

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

          {/* Action Toolbar: full on desktop, compact + overflow menu on mobile */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Export is always visible (primary action) */}
            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/70 border border-cyan-700/60 transition cursor-pointer"
              title="Export DXF / SVG / PDF / CSV"
            >
              <Share2 className="w-3.5 h-3.5 text-cyan-300" />
              <span>{lang === 'bn' ? 'এক্সপোর্ট' : 'Export'}</span>
            </button>

            {/* Desktop / tablet: the rest of the actions inline */}
            <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
              {actions.filter(a => !a.primary).map(a => (
                <button
                  key={a.id}
                  onClick={a.onClick}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
                  title={a.title}
                >
                  <a.Icon className={`w-3.5 h-3.5 ${a.iconClass}`} />
                  <span className="hidden lg:inline">{a.label}</span>
                </button>
              ))}
            </div>

            <div className="h-4 w-px bg-slate-800 mx-0.5 hidden sm:block" />

            {/* Language Switch */}
            <button
              onClick={onToggleLang}
              className="px-2 py-1.5 rounded-md text-xs font-semibold text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 hover:bg-cyan-900/60 transition cursor-pointer"
              title="Toggle English / বাংলা"
            >
              {lang === 'en' ? 'বাংলা' : 'EN'}
            </button>

            {/* Mobile overflow menu */}
            <div className="relative md:hidden">
              <button
                onClick={() => setMenuOpen(o => !o)}
                aria-label="More actions"
                aria-expanded={menuOpen}
                className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-800/60 border border-slate-700/60 transition cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-52 z-40 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden py-1">
                    {actions.filter(a => !a.primary).map(a => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setMenuOpen(false);
                          a.onClick();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition cursor-pointer text-left"
                      >
                        <a.Icon className={`w-4 h-4 shrink-0 ${a.iconClass}`} />
                        <span>{a.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
