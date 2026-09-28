import React, { useState } from 'react';
import { DuctCalculationInput, DuctModelId } from '../types';
import { FolderDown, FolderUp, Download, Upload, Check, Trash2, X, Sparkles } from 'lucide-react';

interface ProjectPreset {
  id: string;
  name: string;
  nameBn: string;
  description: string;
  input: DuctCalculationInput;
}

export const INDUSTRY_PRESETS: ProjectPreset[] = [
  {
    id: 'ahu_supply',
    name: 'Commercial AHU Supply Duct (600x400mm)',
    nameBn: 'কমার্শিয়াল AHU সাপ্লাই ডাক্ট (৬০০x৪০০মিমি)',
    description: 'Standard 2-piece L-shape rectangular duct with TDC roll-formed flange and Pittsburgh lock.',
    input: {
      modelId: 'rect_straight',
      dimensions: { width: 600, height: 400, length: 1200, fabricationStyle: 'two_piece_l' as any },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    },
  },
  {
    id: 'square_elbow_vanes',
    name: 'Industrial Square Throat Elbow with Turning Vanes (600x400mm)',
    nameBn: 'ইন্ডাস্ট্রিয়াল স্কয়ার থ্রোট এলবো (টার্নিং ভেনসহ)',
    description: '90° mitered square throat elbow with turning vane runner rails for tight plant room routing.',
    input: {
      modelId: 'rect_square_elbow',
      dimensions: { width: 600, height: 400, extension: 100, turningVanes: 'yes' as any, fabricationStyle: 'four_piece' as any },
      material: 'galvanized',
      gauge: 22,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    },
  },
  {
    id: 'vav_sq_to_rd',
    name: 'VAV Square-to-Round Transition (500x500 to Ø350)',
    nameBn: 'VAV স্কয়ার-টু-রাউন্ড ট্রানজিশন',
    description: 'Triangulation transition fitting connecting rectangular trunk to round VAV terminal collar.',
    input: {
      modelId: 'square_to_round',
      dimensions: { baseWidth: 500, baseHeight: 500, topDiameter: 350, length: 400, offsetX: 0, offsetY: 0, patternSplit: 'two_halves' as any },
      material: 'galvanized',
      gauge: 22,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    },
  },
  {
    id: 'radius_elbow_vanes',
    name: '90° Rectangular Radius Elbow with Vanes (500x350mm)',
    nameBn: '৯০° রেডিয়াস এলবো (R=250mm)',
    description: 'Acoustically superior smooth radius bend with cheek plates and throat/heel wrappers.',
    input: {
      modelId: 'rect_radius_elbow',
      dimensions: { width: 500, height: 350, throatRadius: 250, angleDeg: 90, throatExtension: 50 },
      material: 'galvanized',
      gauge: 24,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    },
  },
  {
    id: 'fcu_plenum',
    name: 'FCU Return Air Plenum Box (1000x800x600mm)',
    nameBn: 'FCU রিটার্ন এয়ার প্লেনাম বক্স',
    description: 'Central distribution plenum box with corner notches and circular takeoff collar openings.',
    input: {
      modelId: 'plenum_box',
      dimensions: { width: 1000, height: 600, length: 800, numCollars: '4' as any },
      material: 'galvanized',
      gauge: 20,
      longitudinalSeam: 'pittsburgh',
      transverseConnector: 'tdc_tdf',
    },
  },
];

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentInput: DuctCalculationInput;
  onLoadInput: (input: DuctCalculationInput) => void;
  lang: 'en' | 'bn';
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentInput,
  onLoadInput,
  lang,
}) => {
  const [saveName, setSaveName] = useState<string>('');
  const [savedProjects, setSavedProjects] = useState<Array<{ name: string; date: string; input: DuctCalculationInput }>>(() => {
    try {
      const data = localStorage.getItem('aeroduct_saved_projects');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  if (!isOpen) return null;

  const handleSaveCurrent = () => {
    if (!saveName.trim()) return;
    const newEntry = {
      name: saveName.trim(),
      date: new Date().toLocaleDateString(),
      input: currentInput,
    };
    const updated = [newEntry, ...savedProjects.filter(p => p.name !== newEntry.name)];
    setSavedProjects(updated);
    localStorage.setItem('aeroduct_saved_projects', JSON.stringify(updated));
    setSaveName('');
  };

  const handleDeleteSaved = (name: string) => {
    const updated = savedProjects.filter(p => p.name !== name);
    setSavedProjects(updated);
    localStorage.setItem('aeroduct_saved_projects', JSON.stringify(updated));
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(currentInput, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentInput.modelId}_config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed.modelId && parsed.dimensions) {
          onLoadInput(parsed);
          onClose();
        }
      } catch (err) {
        alert('Invalid JSON file format');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <FolderUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? 'প্রজেক্ট ম্যানেজার ও স্ট্যান্ডার্ড প্রিসেট' : 'Project Manager & Standard Industry Presets'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'সেভ/লোড প্রজেক্ট ও কমার্শিয়াল এইচভিএসি প্রিসেট' : 'Load ready-made duct fittings or save custom project jobs'}
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
        <div className="p-6 overflow-y-auto space-y-6 text-slate-200">
          {/* Industry Presets Section */}
          <div className="space-y-3">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-cyan-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'স্ট্যান্ডার্ড এইচভিএসি প্রিসেট' : 'Standard Industry Sample Presets'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {INDUSTRY_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onLoadInput(preset.input);
                    onClose();
                  }}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-cyan-500 hover:bg-slate-800/80 text-left transition group"
                >
                  <div className="font-bold text-xs text-white group-hover:text-cyan-300">
                    {lang === 'bn' ? preset.nameBn : preset.name}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save / Export Tools */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {lang === 'bn' ? 'বর্তমান কনফিগারেশন সেভ করুন' : 'Save Current Duct Job'}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder={lang === 'bn' ? 'কাজের নাম লিখুন (যেমন: AHU-1 Supply Elbow)' : 'Job name (e.g. Floor 3 Supply Elbow)'}
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleSaveCurrent}
                disabled={!saveName.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition"
              >
                {lang === 'bn' ? 'সেভ করুন' : 'Save'}
              </button>
            </div>

            {/* JSON Export/Import */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                onClick={handleExportJson}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <label className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* User Saved Projects */}
          {savedProjects.length > 0 && (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {lang === 'bn' ? 'সংরক্ষিত প্রজেক্ট তালিকা' : 'Saved Projects'}
              </div>
              <div className="space-y-2">
                {savedProjects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/50 border border-slate-800 hover:border-slate-750"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{proj.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {proj.input.modelId} • {proj.date}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          onLoadInput(proj.input);
                          onClose();
                        }}
                        className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                      >
                        {lang === 'bn' ? 'লোড করুন' : 'Load'}
                      </button>
                      <button
                        onClick={() => handleDeleteSaved(proj.name)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
