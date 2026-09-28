import React, { useState } from 'react';
import { runAllEngineUnitTests, TestCaseResult } from '../tests/engineTests';
import { CheckCircle2, XCircle, RotateCcw, X, ShieldCheck } from 'lucide-react';

interface UnitTestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'bn';
}

export const UnitTestsModal: React.FC<UnitTestsModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [testReport, setTestReport] = useState(() => runAllEngineUnitTests());

  if (!isOpen) return null;

  const handleRerun = () => {
    setTestReport(runAllEngineUnitTests());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? 'অটোমেটেড ইঞ্জিন ইউনিট টেস্ট স্যুইট' : 'Calculation Engine Automated Unit Tests'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'প্রতিটি ডাক্ট মডেল ইঞ্জিনের গাণিতিক নির্ভুলতা ও এজ-কেস টেস্ট' : 'Verification of mathematical formulas, SMACNA bounds & edge cases'}
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

        {/* Test Summary Banner */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>PASSED: {testReport.passed}</span>
            </div>
            {testReport.failed > 0 && (
              <div className="flex items-center space-x-1.5 text-red-400 font-bold">
                <XCircle className="w-4 h-4" />
                <span>FAILED: {testReport.failed}</span>
              </div>
            )}
            <div className="text-slate-400">
              TOTAL: {testReport.total} Tests
            </div>
          </div>
          <button
            onClick={handleRerun}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'পুনরায় টেস্ট চালান' : 'Re-run Tests'}</span>
          </button>
        </div>

        {/* Test Cases List */}
        <div className="p-6 overflow-y-auto space-y-3">
          {testReport.results.map((t, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                t.passed
                  ? 'bg-slate-950/60 border-slate-800 text-slate-300'
                  : 'bg-red-950/40 border-red-800 text-red-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-bold text-white flex items-center space-x-2">
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{t.testName}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">
                  {t.engineId}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/60 p-2 rounded-lg border border-slate-850">
                <div>
                  <span className="text-slate-500">Expected: </span>
                  <span className="text-cyan-300">{t.expected}</span>
                </div>
                <div>
                  <span className="text-slate-500">Actual: </span>
                  <span className={t.passed ? 'text-emerald-400' : 'text-red-400'}>{t.actual}</span>
                </div>
              </div>

              {t.message && (
                <div className="text-[10px] text-slate-400 pl-6">
                  {t.message}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-end shrink-0">
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
