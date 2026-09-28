import React, { useState } from 'react';
import { BookOpen, X, Calculator, ShieldCheck, Check, Layers, Cpu } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'en' | 'bn';
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({
  isOpen,
  onClose,
  lang,
}) => {
  const [activeTab, setActiveTab] = useState<'triangulation' | 'gore' | 'bends' | 'seams' | 'smacna'>('triangulation');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-850 px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {lang === 'bn' ? 'এইচভিএসি ডাক্ট ফেব্রিকেশন ফর্মুলা ও ইঞ্জিনিয়ারিং গাইড' : 'HVAC Sheet Metal Calculation Formulas & Standards'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'bn' ? 'SMACNA ও DIN 6935 স্ট্যান্ডার্ড ভিত্তিক গাণিতিক বিশ্লেষণ' : 'Mathematical derivation for true flat pattern development'}
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

        {/* Tab Buttons */}
        <div className="bg-slate-950 px-6 border-b border-slate-800 flex space-x-2 overflow-x-auto py-2 shrink-0">
          {[
            { id: 'triangulation', label: 'Square-to-Round Triangulation', labelBn: 'ট্রায়াঙ্গুলেশন মেথড' },
            { id: 'gore', label: 'Gore Lobster-Back Sine Miter', labelBn: 'গোর এলবো সাইন মাইটার' },
            { id: 'bends', label: 'Bend Deduction & K-Factor', labelBn: 'বেন্ড ডিডাকশন ও K-ফ্যাক্টর' },
            { id: 'seams', label: 'Pittsburgh & TDC Seam Standards', labelBn: 'পিটসবার্গ ও TDC সিম' },
            { id: 'smacna', label: 'SMACNA Duct Construction Spec', labelBn: 'SMACNA কনস্ট্রাকশন স্পেক' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {lang === 'bn' ? tab.labelBn : tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-xs leading-relaxed font-sans">
          {activeTab === 'triangulation' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                <span>Square-to-Round Radial Triangulation Formula</span>
              </h4>
              <p>
                In transitioning from a rectangular or square base to a circular top, the geometry consists of 4 flat triangular corner bases connected to cylindrical quadrant conic elements.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-2">
                <div>1. Top Circle Discretization:</div>
                <div className="text-slate-400 pl-4">
                  P_top(i) = [ X_off + R_top · cos(2π·i / N), Y_off + R_top · sin(2π·i / N), L_height ]
                </div>
                <div>2. Plan View Distance to Base Corner C(k):</div>
                <div className="text-slate-400 pl-4">
                  ΔX = P_x - C_x, &nbsp; ΔY = P_y - C_y, &nbsp; L_plan = √(ΔX² + ΔY²)
                </div>
                <div>3. True Slant Length (Triangulation Line):</div>
                <div className="text-amber-400 pl-4 font-bold">
                  TL_i = √(L_plan² + L_height²) = √((P_x - C_x)² + (P_y - C_y)² + L_height²)
                </div>
                <div>4. Top Circular Chord Pitch:</div>
                <div className="text-slate-400 pl-4">
                  Chord = 2 · R_top · sin(π / N)
                </div>
              </div>

              <p>
                The flat pattern unfolds by constructing triangles sequentially using the chord distance along the top circle and the computed true slant lengths from each base corner. Scored press brake bend lines guide the bump-bending process.
              </p>
            </div>
          )}

          {activeTab === 'gore' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>Lobster Back Segmented Elbow Miter Angle & Sine Cut Line</span>
              </h4>
              <p>
                A segmented round elbow of N gores consists of 2 end half-gores and (N - 2) middle full gores.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-2">
                <div>1. Half-Miter Cut Angle:</div>
                <div className="text-amber-400 pl-4 font-bold">
                  α = θ_total / [ 2 · (N_gores - 1) ]
                </div>
                <div className="text-slate-400 pl-4">
                  (Example: For 90° 5-gore elbow: α = 90° / 8 = 11.25°)
                </div>
                <div>2. Middle Full Gore Joint Angle:</div>
                <div className="text-slate-400 pl-4">
                  2α = 2 · 11.25° = 22.50°
                </div>
                <div>3. Sine Miter Cut Height along Flat Circumference x ∈ [0, πD]:</div>
                <div className="text-emerald-400 pl-4 font-bold">
                  Y_cut(x) = Y_baseline + (D / 2) · tan(α) · cos( 2π · x / (πD) )
                </div>
                <div>4. Centerline, Heel & Throat Heights for Middle Gore:</div>
                <div className="text-slate-400 pl-4">
                  H_center = 2 · R · tan(α)<br />
                  H_heel &nbsp;&nbsp;= 2 · (R + D/2) · tan(α)<br />
                  H_throat = 2 · (R - D/2) · tan(α)
                </div>
              </div>

              <p>
                Because the development follows a true sinusoidal curve, laser or CNC plasma cutting yields flawless mating joints ready for lock seaming or rotary swaging.
              </p>
            </div>
          )}

          {activeTab === 'bends' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span>Bend Allowance, Setback & Bend Deduction (DIN 6935)</span>
              </h4>
              <p>
                When sheet metal is bent, the outer surface stretches in tension and the inner surface compresses. The neutral axis remains unstrained, located at distance $K \cdot T$ from the inner radius.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-red-300 space-y-2">
                <div>1. Neutral Axis K-Factor:</div>
                <div className="text-slate-400 pl-4">
                  Galvanized Steel: K = 0.42 | Stainless Steel: K = 0.38 | Aluminum: K = 0.44
                </div>
                <div>2. Bend Allowance (BA):</div>
                <div className="text-amber-400 pl-4 font-bold">
                  BA = (θ · π / 180) · ( R_inside + K · Thickness )
                </div>
                <div>3. Outside Setback (OSSB):</div>
                <div className="text-slate-400 pl-4">
                  OSSB = tan(θ / 2) · ( R_inside + Thickness )
                </div>
                <div>4. Bend Deduction (BD):</div>
                <div className="text-emerald-400 pl-4 font-bold">
                  BD = 2 · OSSB - BA
                </div>
                <div>5. Flat Blank Unfolded Width:</div>
                <div className="text-cyan-400 pl-4">
                  Blank_Width = Flange_A + Flange_B - BD
                </div>
              </div>
            </div>
          )}

          {activeTab === 'seams' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
                <span>HVAC Seams & Connector Allowance Specifications</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-cyan-400">Pittsburgh Lock (SMACNA)</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Female Pocket: +25.4 mm (1.0 inch)</li>
                    <li>Male Tongue / Flanged edge: +6.35 mm (0.25 inch)</li>
                    <li>Total perimeter addition: +31.75 mm</li>
                    <li>Airtight for low, medium, and high velocity static pressure.</li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-emerald-400">TDC / TDF Flange Connector</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Roll-formed turn-up: +35.0 mm per duct end</li>
                    <li>Corner Notch: 45° relief notch at bend intersections</li>
                    <li>Assembled with galvanized corner clips and 1/2" bolt/nut with butyl gasket tape.</li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-amber-400">Button Snap Lock</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Female pocket: +12.7 mm (1/2 inch)</li>
                    <li>Male punched tongue: +12.7 mm (1/2 inch)</li>
                    <li>Fast assembly for light commercial and residential ductwork.</li>
                  </ul>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-purple-400">Round Crimped & Beaded Slip</div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                    <li>Male slip allowance: +38.0 mm (1.5 inch)</li>
                    <li>Stop bead rolled at 38mm distance</li>
                    <li>Secured with 3 self-tapping screws at 120° spacing.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'smacna' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
                <span>SMACNA Recommended Minimum Sheet Metal Gauges (500 Pa / 2" wg)</span>
              </h4>
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3">Max Duct Dimension (mm)</th>
                      <th className="p-3">Recommended Gauge</th>
                      <th className="p-3">Thickness (mm)</th>
                      <th className="p-3">SMACNA Reinforcement / Joint Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="p-3 font-mono">Up to 300 mm (12")</td>
                      <td className="p-3 font-bold text-cyan-400">26 Ga</td>
                      <td className="p-3 font-mono">0.55 mm</td>
                      <td className="p-3">S & Drive or TDC; No tie rods</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">301 - 750 mm (13" - 30")</td>
                      <td className="p-3 font-bold text-cyan-400">24 Ga</td>
                      <td className="p-3 font-mono">0.70 mm</td>
                      <td className="p-3">TDC / TDF flange; Joint spacing max 1500mm</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">751 - 1000 mm (31" - 40")</td>
                      <td className="p-3 font-bold text-cyan-400">22 Ga</td>
                      <td className="p-3 font-mono">0.85 mm</td>
                      <td className="p-3">TDC/TDF with corner clips; Cross-breaking required</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">1001 - 1500 mm (41" - 60")</td>
                      <td className="p-3 font-bold text-cyan-400">20 Ga</td>
                      <td className="p-3 font-mono">1.00 mm</td>
                      <td className="p-3">Internal tie rod or external structural rib angle</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-mono">1501 - 2100 mm (61" - 84")</td>
                      <td className="p-3 font-bold text-cyan-400">18 Ga</td>
                      <td className="p-3 font-mono">1.30 mm</td>
                      <td className="p-3">Angle iron companion flange + intermediate stiffener</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-850 px-6 py-3 border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition"
          >
            {lang === 'bn' ? 'বন্ধ করুন' : 'Close Guide'}
          </button>
        </div>
      </div>
    </div>
  );
};
