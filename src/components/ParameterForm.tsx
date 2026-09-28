import React, { useState } from 'react';
import { 
  DuctCalculationEngine 
} from '../engines/DuctCalculationEngine';
import { 
  DuctCalculationInput, 
  MaterialType, 
  LongitudinalSeam, 
  TransverseConnector,
  CuttingLayoutDesign 
} from '../types';
import { MATERIALS, GAUGE_TABLE, getSmacnaRecommendedGauge } from '../standards/materials';
import { LONGITUDINAL_SEAMS, TRANSVERSE_CONNECTORS } from '../standards/seams';
import { 
  ManufacturingValidationEngine, 
  ValidationIssue 
} from '../engines/ManufacturingValidationEngine';
import { 
  Sliders, 
  ShieldAlert, 
  CheckCircle, 
  Settings2, 
  Layers, 
  Ruler,
  AlertOctagon,
  AlertTriangle,
  ShieldCheck,
  Wrench,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Scissors
} from 'lucide-react';

interface ParameterFormProps {
  engine: DuctCalculationEngine;
  inputs: DuctCalculationInput;
  onChangeInput: (newInputs: DuctCalculationInput) => void;
  lang: 'en' | 'bn';
}

export const ParameterForm: React.FC<ParameterFormProps> = ({
  engine,
  inputs,
  onChangeInput,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'geometry' | 'material' | 'seams'>('geometry');
  const [showIssueDetails, setShowIssueDetails] = useState<boolean>(false);

  // Run Manufacturing Validation Engine on active inputs
  const validationResult = ManufacturingValidationEngine.validate(inputs);

  const handleDimensionChange = (key: string, value: any) => {
    onChangeInput({
      ...inputs,
      dimensions: {
        ...inputs.dimensions,
        [key]: value,
      },
    });
  };

  const handleMaterialChange = (mat: MaterialType) => {
    onChangeInput({ ...inputs, material: mat });
  };

  const handleGaugeChange = (gauge: number) => {
    onChangeInput({ ...inputs, gauge });
  };

  const handleLongitudinalSeamChange = (seam: LongitudinalSeam) => {
    onChangeInput({ ...inputs, longitudinalSeam: seam });
  };

  const handleTransverseConnectorChange = (conn: TransverseConnector) => {
    onChangeInput({ ...inputs, transverseConnector: conn });
  };

  const currentCuttingLayout: CuttingLayoutDesign = 
    (inputs.cuttingLayout as CuttingLayoutDesign) || 
    (inputs.dimensions?.fabricationStyle as CuttingLayoutDesign) || 
    'two_piece_l';

  const handleCuttingLayoutChange = (style: CuttingLayoutDesign) => {
    onChangeInput({
      ...inputs,
      cuttingLayout: style,
      dimensions: {
        ...inputs.dimensions,
        fabricationStyle: style,
      },
    });
  };

  const handleAutoFixAll = () => {
    const fixedInputs = ManufacturingValidationEngine.autoFixInputs(inputs, validationResult.issues);
    onChangeInput(fixedInputs);
  };

  const handleAutoFixField = (issue: ValidationIssue) => {
    if (issue.suggestedValue === undefined) return;
    if (issue.fieldId === 'gauge') {
      handleGaugeChange(Number(issue.suggestedValue));
    } else if (issue.fieldId === 'longitudinalSeam') {
      handleLongitudinalSeamChange(issue.suggestedValue as LongitudinalSeam);
    } else {
      handleDimensionChange(issue.fieldId, issue.suggestedValue);
    }
  };

  // Find max dimension for SMACNA gauge checking
  const dimValues = Object.values(inputs.dimensions).filter(v => typeof v === 'number') as number[];
  const maxDim = dimValues.length > 0 ? Math.max(...dimValues) : 600;
  const smacna = getSmacnaRecommendedGauge(maxDim);
  const isGaugeThin = inputs.gauge > smacna.recommendedGauge;

  const gaugeIssues = validationResult.fieldIssues['gauge'] || [];
  const seamIssues = validationResult.fieldIssues['longitudinalSeam'] || [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl space-y-4">
      {/* Title & Model ID */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold text-white">
            {lang === 'bn' ? 'প্যারামিটার ও স্পেসিফিকেশন' : 'Parameters & Specs'}
          </h2>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          {engine.id}
        </span>
      </div>

      {/* Validation Status Indicator Banner */}
      {validationResult.hasErrors ? (
        <div className="bg-red-950/40 border border-red-500/40 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2 text-xs text-red-200">
              <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">
                {validationResult.errorCount} {lang === 'bn' ? 'টি জ্যামিতিক সমস্যা' : 'Geometric Issues'}
              </span>
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setShowIssueDetails(prev => !prev)}
                className="text-[11px] text-red-300 hover:text-white px-2 py-1 rounded bg-red-950/60 border border-red-800/40 transition cursor-pointer"
              >
                {showIssueDetails ? (lang === 'bn' ? 'লুকান' : 'Hide') : (lang === 'bn' ? 'তালিকা' : 'Details')}
              </button>
              <button
                type="button"
                onClick={handleAutoFixAll}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>{lang === 'bn' ? 'অটো-ফিক্স' : 'Auto-Fix'}</span>
              </button>
            </div>
          </div>

          {showIssueDetails && (
            <ul className="space-y-1.5 pt-1 border-t border-red-900/40 text-[11px]">
              {validationResult.issues.map((issue, idx) => (
                <li
                  key={issue.id || idx}
                  className="p-1.5 rounded bg-black/40 text-slate-300 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{lang === 'bn' ? issue.messageBn : issue.messageEn}</span>
                  {issue.suggestedValue !== undefined && (
                    <button
                      type="button"
                      onClick={() => handleAutoFixField(issue)}
                      className="shrink-0 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono cursor-pointer"
                    >
                      Fix: {issue.suggestedValue}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : validationResult.warningCount > 0 ? (
        <div className="bg-amber-950/30 border border-amber-600/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{validationResult.warningCount} {lang === 'bn' ? 'টি ওয়ার্নিং' : 'Advisories'}</span>
          </div>
          <button
            type="button"
            onClick={handleAutoFixAll}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-600/80 hover:bg-amber-600 text-white text-[11px] font-medium transition cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>{lang === 'bn' ? 'অপটিমাইজ' : 'Optimize'}</span>
          </button>
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-800/80 rounded-lg px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-slate-300 text-[11px]">
              {lang === 'bn' ? 'ম্যানুফ্যাকচারিং যাচাইকৃত' : 'Manufacturing Verified'}
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-medium">SMACNA OK</span>
        </div>
      )}

      {/* 3 Clean Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('geometry')}
          className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
            activeTab === 'geometry'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Ruler className="w-3 h-3" />
          <span>{lang === 'bn' ? 'জ্যামিতি' : 'Geometry'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('material')}
          className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
            activeTab === 'material'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Layers className="w-3 h-3" />
          <span>{lang === 'bn' ? 'ম্যাটেরিয়াল' : 'Material'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('seams')}
          className={`flex items-center justify-center space-x-1 py-1.5 px-2 rounded-md text-xs font-medium transition cursor-pointer ${
            activeTab === 'seams'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>{lang === 'bn' ? 'সিম ও লক' : 'Seams'}</span>
        </button>
      </div>

      {/* TAB 1: GEOMETRY */}
      {activeTab === 'geometry' && (
        <div className="space-y-4 pt-1">
          {/* Cutting Layout Design Selector */}
          <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-950/50 border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300 flex items-center space-x-1.5">
                <Scissors className="w-3.5 h-3.5 text-cyan-400" />
                <span>{lang === 'bn' ? 'কাটিং লেআউট পার্টস' : 'Cutting Layout Style'}</span>
              </span>
              <span className="text-[10px] font-mono text-cyan-300 font-semibold">
                {currentCuttingLayout === 'one_piece_wrap' 
                  ? (lang === 'bn' ? '১ পার্ট বডি' : '1-Part Wrap')
                  : currentCuttingLayout === 'two_piece_l'
                  ? (lang === 'bn' ? '২ পার্ট L-টাইপ' : '2-Part L-Type')
                  : (lang === 'bn' ? '৪ পার্ট সিঙ্গেল' : '4-Part Single')}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleCuttingLayoutChange('one_piece_wrap')}
                className={`py-1.5 px-2 rounded-md border text-center transition cursor-pointer ${
                  currentCuttingLayout === 'one_piece_wrap'
                    ? 'bg-cyan-600/20 border-cyan-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">{lang === 'bn' ? '১ পার্ট' : '1 Part'}</div>
                <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'ফুল র্যাপ' : 'Full Wrap'}</div>
              </button>

              <button
                type="button"
                onClick={() => handleCuttingLayoutChange('two_piece_l')}
                className={`py-1.5 px-2 rounded-md border text-center transition cursor-pointer ${
                  currentCuttingLayout === 'two_piece_l'
                    ? 'bg-cyan-600/20 border-cyan-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">{lang === 'bn' ? '২ পার্ট' : '2 Parts'}</div>
                <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'L-টাইপ' : 'L-Type'}</div>
              </button>

              <button
                type="button"
                onClick={() => handleCuttingLayoutChange('four_piece')}
                className={`py-1.5 px-2 rounded-md border text-center transition cursor-pointer ${
                  currentCuttingLayout === 'four_piece'
                    ? 'bg-cyan-600/20 border-cyan-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-semibold">{lang === 'bn' ? '৪ পার্ট' : '4 Parts'}</div>
                <div className="text-[10px] text-slate-400">{lang === 'bn' ? 'সিঙ্গেল' : 'Single'}</div>
              </button>
            </div>
          </div>

          {/* Dynamic Dimension Controls */}
          <div className="space-y-3">
            {engine.parameters.map(param => {
              if (param.id === 'fabricationStyle') return null;

              const val = inputs.dimensions[param.id] ?? param.defaultValue;
              const fieldIssues = validationResult.fieldIssues[param.id] || [];
              const hasError = fieldIssues.some(i => i.severity === 'error');
              const hasWarning = !hasError && fieldIssues.some(i => i.severity === 'warning');
              const primaryIssue = fieldIssues[0];

              if (param.type === 'number') {
                return (
                  <div 
                    key={param.id} 
                    className={`p-2.5 rounded-lg border space-y-1.5 transition-all ${
                      hasError 
                        ? 'bg-red-950/20 border-red-500/60' 
                        : hasWarning 
                          ? 'bg-amber-950/20 border-amber-500/60' 
                          : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <label className={`font-medium ${hasError ? 'text-red-300' : hasWarning ? 'text-amber-300' : 'text-slate-300'}`}>
                        {lang === 'bn' ? param.labelBn : param.label}
                      </label>
                      <span className={`font-mono font-semibold ${
                        hasError ? 'text-red-400' : hasWarning ? 'text-amber-400' : 'text-cyan-400'
                      }`}>
                        {val} {param.unit}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min={param.min || 10}
                        max={param.max || 2500}
                        step={param.step || 10}
                        value={Number(val)}
                        onChange={e => handleDimensionChange(param.id, parseFloat(e.target.value))}
                        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                          hasError 
                            ? 'bg-red-950 accent-red-500' 
                            : hasWarning 
                              ? 'bg-amber-950 accent-amber-500' 
                              : 'bg-slate-700 accent-cyan-500'
                        }`}
                      />
                      <input
                        type="number"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={Number(val)}
                        onChange={e => handleDimensionChange(param.id, parseFloat(e.target.value) || 0)}
                        className={`w-16 px-1.5 py-0.5 text-xs font-mono font-semibold rounded text-right border focus:outline-none transition ${
                          hasError
                            ? 'bg-red-950/80 border-red-500 text-red-200'
                            : hasWarning
                              ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                              : 'bg-slate-800 border-slate-700 text-white focus:border-cyan-500'
                        }`}
                      />
                    </div>

                    {primaryIssue && (
                      <div className="flex items-center justify-between text-[10px] text-red-300 pt-0.5">
                        <span className="truncate">{lang === 'bn' ? primaryIssue.messageBn : primaryIssue.messageEn}</span>
                        {primaryIssue.suggestedValue !== undefined && (
                          <button
                            type="button"
                            onClick={() => handleAutoFixField(primaryIssue)}
                            className="shrink-0 text-cyan-300 hover:underline font-mono ml-2 cursor-pointer"
                          >
                            Fix: {primaryIssue.suggestedValue}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              if (param.type === 'select') {
                return (
                  <div key={param.id} className="p-2.5 rounded-lg border bg-slate-900/60 border-slate-800 space-y-1">
                    <label className="block text-xs font-medium text-slate-300">
                      {lang === 'bn' ? param.labelBn : param.label}
                    </label>
                    <select
                      value={String(val)}
                      onChange={e => handleDimensionChange(param.id, e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
                    >
                      {param.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {lang === 'bn' ? opt.labelBn : opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (param.type === 'checkbox') {
                return (
                  <div key={param.id} className="flex items-center space-x-2 p-2 rounded-lg bg-slate-900/40 border border-slate-800">
                    <input
                      type="checkbox"
                      id={param.id}
                      checked={Boolean(val)}
                      onChange={e => handleDimensionChange(param.id, e.target.checked)}
                      className="w-4 h-4 rounded bg-slate-800 border-slate-700 text-cyan-600 focus:ring-cyan-500"
                    />
                    <label htmlFor={param.id} className="text-xs text-slate-300 font-medium cursor-pointer">
                      {lang === 'bn' ? param.labelBn : param.label}
                    </label>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MATERIAL & GAUGE */}
      {activeTab === 'material' && (
        <div className="space-y-4 pt-1">
          {/* Material Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              {lang === 'bn' ? 'শীট মেটাল উপাদান' : 'Sheet Metal Material'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MATERIALS) as MaterialType[]).map(mKey => {
                const mat = MATERIALS[mKey];
                const isSelected = inputs.material === mKey;
                return (
                  <button
                    key={mKey}
                    type="button"
                    onClick={() => handleMaterialChange(mKey)}
                    className={`p-2 rounded-lg border text-left text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-slate-200">
                      {lang === 'bn' ? mat.nameBn : mat.name.split('(')[0]}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {mat.density} kg/m³
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gauge Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-300">
                {lang === 'bn' ? 'শীট মেটাল গেজ (Gauge)' : 'Sheet Metal Gauge'}
              </label>
              <span className="text-cyan-400 font-mono font-semibold">
                {inputs.gauge} Ga ({GAUGE_TABLE.find(g => g.gauge === inputs.gauge)?.thicknessMm} mm)
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
              {GAUGE_TABLE.map(g => {
                const isSelected = inputs.gauge === g.gauge;
                return (
                  <button
                    key={g.gauge}
                    type="button"
                    onClick={() => handleGaugeChange(g.gauge)}
                    className={`py-1.5 rounded text-xs font-mono font-medium border text-center transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600 border-cyan-500 text-white shadow-sm'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <div>{g.gauge}G</div>
                    <div className="text-[9px] opacity-75">{g.thicknessMm}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SMACNA Recommendation Box */}
          <div className={`p-2.5 rounded-lg border text-xs flex items-start space-x-2 ${
            isGaugeThin 
              ? 'bg-amber-950/30 border-amber-800/60 text-amber-200' 
              : 'bg-slate-850 border-slate-800 text-slate-300'
          }`}>
            {isGaugeThin ? (
              <ShieldAlert className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            )}
            <div className="text-[11px] leading-tight space-y-0.5">
              <div className="font-semibold text-slate-200">
                {isGaugeThin 
                  ? (lang === 'bn' ? 'সতর্কতা: প্রস্তাবিত গেজের চেয়ে পাতলা' : 'Warning: Gauge Thinner Than SMACNA Recommendation')
                  : (lang === 'bn' ? 'SMACNA স্ট্যান্ডার্ড কমপ্লায়েন্ট' : 'SMACNA Standard Compliant')}
              </div>
              <div className="text-slate-400">
                {lang === 'bn' 
                  ? `সর্বোচ্চ মাপ ${maxDim}মিমির জন্য ন্যূনতম গেজ: ${smacna.recommendedGauge} Ga (${smacna.minThicknessMm}মিমি)।`
                  : `Recommended minimum for ${maxDim}mm duct: ${smacna.recommendedGauge} Ga (${smacna.minThicknessMm}mm).`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEAMS & CONNECTORS */}
      {activeTab === 'seams' && (
        <div className="space-y-4 pt-1">
          {/* Longitudinal Seam Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-300">
                {lang === 'bn' ? 'লংজিটিউডিনাল সিম (Seam)' : 'Longitudinal Seam (Body Lock)'}
              </label>
              <span className="text-cyan-400 font-mono text-[10px]">
                +{LONGITUDINAL_SEAMS[inputs.longitudinalSeam].femalePocketAllowanceMm} / +{LONGITUDINAL_SEAMS[inputs.longitudinalSeam].maleTongueAllowanceMm} mm
              </span>
            </div>
            <select
              value={inputs.longitudinalSeam}
              onChange={e => handleLongitudinalSeamChange(e.target.value as LongitudinalSeam)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {Object.values(LONGITUDINAL_SEAMS).map(seam => (
                <option key={seam.id} value={seam.id}>
                  {lang === 'bn' ? seam.nameBn : seam.name} (+{seam.totalPerimeterAdditionMm}mm)
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400">
              {LONGITUDINAL_SEAMS[inputs.longitudinalSeam].description}
            </p>
          </div>

          {/* Transverse Connector Selection */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <label className="font-medium text-slate-300">
                {lang === 'bn' ? 'ট্রান্সভার্স কানেক্টর (Flange)' : 'Transverse Connector (Joint End)'}
              </label>
              <span className="text-cyan-400 font-mono text-[10px]">
                +{TRANSVERSE_CONNECTORS[inputs.transverseConnector].allowancePerEndMm} mm/end
              </span>
            </div>
            <select
              value={inputs.transverseConnector}
              onChange={e => handleTransverseConnectorChange(e.target.value as TransverseConnector)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500 font-medium"
            >
              {Object.values(TRANSVERSE_CONNECTORS).map(conn => (
                <option key={conn.id} value={conn.id}>
                  {lang === 'bn' ? conn.nameBn : conn.name}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400">
              {TRANSVERSE_CONNECTORS[inputs.transverseConnector].description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
