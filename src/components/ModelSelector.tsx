import React from 'react';
import { DuctCategory, DuctModelId } from '../types';
import { DUCT_CATEGORIES, EngineFactory } from '../engines/EngineRegistry';
import { 
  Maximize2, 
  CornerDownRight, 
  GitFork, 
  Minimize2, 
  TrendingUp, 
  Box, 
  ChevronRight
} from 'lucide-react';

interface ModelSelectorProps {
  selectedCategory: DuctCategory;
  onSelectCategory: (category: DuctCategory) => void;
  selectedModelId: DuctModelId;
  onSelectModel: (modelId: DuctModelId) => void;
  lang: 'en' | 'bn';
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedModelId,
  onSelectModel,
  lang,
}) => {
  const getCategoryIcon = (id: DuctCategory) => {
    switch (id) {
      case 'straight': return <Maximize2 className="w-3.5 h-3.5" />;
      case 'elbow': return <CornerDownRight className="w-3.5 h-3.5" />;
      case 'tee': return <GitFork className="w-3.5 h-3.5" />;
      case 'reducer': return <Minimize2 className="w-3.5 h-3.5" />;
      case 'offset': return <TrendingUp className="w-3.5 h-3.5" />;
      case 'special': return <Box className="w-3.5 h-3.5" />;
      default: return <Box className="w-3.5 h-3.5" />;
    }
  };

  const engines = EngineFactory.getEnginesByCategory(selectedCategory);

  return (
    <div className="bg-slate-900/80 border-b border-slate-800/80 py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
        {/* Category Tabs: Clean Segmented Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {DUCT_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  onSelectCategory(cat.id);
                  const firstEngine = EngineFactory.getEnginesByCategory(cat.id)[0];
                  if (firstEngine) {
                    onSelectModel(firstEngine.id);
                  }
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
                }`}
              >
                <span>{getCategoryIcon(cat.id)}</span>
                <span>{lang === 'bn' ? cat.nameBn : cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Model Selector: Clean, Balanced Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {engines.map(engine => {
            const isModelActive = selectedModelId === engine.id;
            return (
              <button
                key={engine.id}
                onClick={() => onSelectModel(engine.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer border ${
                  isModelActive
                    ? 'bg-slate-800 border-cyan-500/70 text-cyan-300 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isModelActive ? 'bg-cyan-400' : 'bg-slate-600'}`} />
                <span className="font-medium whitespace-nowrap">
                  {lang === 'bn' ? engine.nameBn : engine.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
