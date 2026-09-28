import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  CalculationResult, 
  FlatPatternPart, 
  Line2D, 
  Arc2D, 
  Point2D,
  MaterialType 
} from '../types';
import { MATERIALS, GAUGE_TABLE, getGaugeThickness, getSmacnaRecommendedGauge } from '../standards/materials';
import { downloadDxf, downloadCompleteDxf } from '../exporters/dxfExporter';
import { downloadSvg, downloadCompleteSvg } from '../exporters/svgExporter';
import { generatePdfReport, generateCompletePdfReport } from '../exporters/pdfExporter';
import { downloadCsvCutList } from '../exporters/csvExporter';
import { extractPointToPointSegments, PointToPointSegment, formatPoint } from '../standards/pointToPointDimensions';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  FileCode, 
  FileSpreadsheet, 
  FileText, 
  Download,
  Eye, 
  Grid, 
  Ruler, 
  Crosshair,
  Layers,
  HelpCircle,
  Tag,
  Scissors,
  Scale,
  Pin,
  PinOff,
  ShieldCheck,
  Sparkles,
  Maximize2,
  Info,
  ArrowLeftRight,
  X
} from 'lucide-react';

interface Pattern2DViewerProps {
  result: CalculationResult;
  selectedPartIndex: number;
  onSelectPartIndex: (index: number) => void;
  lang: 'en' | 'bn';
  material?: MaterialType;
  gauge?: number;
}

export const Pattern2DViewer: React.FC<Pattern2DViewerProps> = ({
  result,
  selectedPartIndex,
  onSelectPartIndex,
  lang,
  material = 'galvanized',
  gauge = 24,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const part = result.parts[selectedPartIndex] || result.parts[0];

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 60, y: 60 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Layer Toggles
  const [showCutLines, setShowCutLines] = useState<boolean>(true);
  const [showBendLines, setShowBendLines] = useState<boolean>(true);
  const [showSeams, setShowSeams] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showSheetBlank, setShowSheetBlank] = useState<boolean>(true);
  const [showDimensions, setShowDimensions] = useState<boolean>(true);
  const [showP2P, setShowP2P] = useState<boolean>(true);

  // Consecutive View & Schedule Modal State
  const [viewMode, setViewMode] = useState<'single' | 'all_consecutive'>('single');
  const [showScheduleModal, setShowScheduleModal] = useState<boolean>(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Measurement Tool State
  const [measureMode, setMeasureMode] = useState<boolean>(false);
  const [measurePoint1, setMeasurePoint1] = useState<Point2D | null>(null);
  const [measurePoint2, setMeasurePoint2] = useState<Point2D | null>(null);
  const [mouseCoords, setMouseCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Material & Gauge calculations
  const materialObj = MATERIALS[material] || MATERIALS.galvanized;
  const thicknessMm = getGaugeThickness(gauge);
  const thicknessInches = (thicknessMm / 25.4).toFixed(4);
  const unitWeightKgPerM2 = thicknessMm * (materialObj.density / 1000);
  const unitWeightLbPerSqFt = (unitWeightKgPerM2 * 0.204816).toFixed(2);

  // Active Part Derived Values
  const partAreaSqFt = (part.areaM2 * 10.7639).toFixed(2);
  const partWeightLbs = (part.weightKg * 2.20462).toFixed(2);
  const totalBatchAreaSqFt = (part.areaM2 * 10.7639 * part.quantity).toFixed(2);
  const totalBatchWeightKg = (part.weightKg * part.quantity).toFixed(2);
  const totalBatchWeightLbs = (part.weightKg * part.quantity * 2.20462).toFixed(2);

  const blankFootprintM2 = (part.blankWidthMm * part.blankLengthMm) / 1e6;
  const blankFootprintSqFt = (blankFootprintM2 * 10.7639).toFixed(2);
  const sheetUtilizationPct = blankFootprintM2 > 0 
    ? Math.min(100, Math.max(10, (part.areaM2 / blankFootprintM2) * 100)).toFixed(1)
    : '85.0';

  // SMACNA guideline comparison
  const maxDuctDim = Math.max(part.blankWidthMm, part.blankLengthMm);
  const smacnaRec = getSmacnaRecommendedGauge(maxDuctDim);
  const isSmacnaCompliant = gauge <= smacnaRec.recommendedGauge;

  // Compute the TRUE bounding box of all geometry in the active part
  const geoBounds = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const includePoint = (x: number, y: number) => {
      if (Number.isFinite(x) && Number.isFinite(y)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    };

    if (part) {
      includePoint(0, 0);
      includePoint(part.blankWidthMm || 500, part.blankLengthMm || 500);

      if (part.outerContour && part.outerContour.length > 0) {
        part.outerContour.forEach(p => includePoint(p.x, p.y));
      }

      if (part.lines && part.lines.length > 0) {
        part.lines.forEach(l => {
          includePoint(l.start.x, l.start.y);
          includePoint(l.end.x, l.end.y);
        });
      }

      if (part.arcs && part.arcs.length > 0) {
        part.arcs.forEach(a => {
          includePoint(a.center.x - a.radius, a.center.y - a.radius);
          includePoint(a.center.x + a.radius, a.center.y + a.radius);
        });
      }
    }

    if (!Number.isFinite(minX)) {
      minX = 0;
      minY = 0;
      maxX = part?.blankWidthMm || 800;
      maxY = part?.blankLengthMm || 600;
    }

    const width = Math.max(10, maxX - minX);
    const height = Math.max(10, maxY - minY);

    return { minX, minY, maxX, maxY, width, height };
  }, [part]);

  const consecutivePartsLayout = useMemo(() => {
    const GAP = 100;
    let curX = 0;
    const items = result.parts.map((p, idx) => {
      const xOff = curX;
      curX += p.blankWidthMm + GAP;
      const p2p = extractPointToPointSegments(p);
      return {
        part: p,
        index: idx,
        xOffset: xOff,
        p2pSegments: p2p,
      };
    });
    const totalW = Math.max(100, curX - GAP);
    const maxH = Math.max(100, ...result.parts.map(p => p.blankLengthMm));
    return {
      items,
      totalWidth: totalW,
      maxHeight: maxH,
    };
  }, [result.parts]);

  const p2pSegments = useMemo(() => {
    return extractPointToPointSegments(part);
  }, [part]);

  // Auto-fit pattern to viewer on part switch or resize
  const fitToView = () => {
    if (!containerRef.current || !part) return;
    const { clientWidth, clientHeight } = containerRef.current;
    if (clientWidth === 0 || clientHeight === 0) return;

    const padding = 70;
    const targetW = viewMode === 'all_consecutive' ? consecutivePartsLayout.totalWidth : geoBounds.width;
    const targetH = viewMode === 'all_consecutive' ? consecutivePartsLayout.maxHeight : geoBounds.height;
    const targetMinX = viewMode === 'all_consecutive' ? 0 : geoBounds.minX;
    const targetMinY = viewMode === 'all_consecutive' ? 0 : geoBounds.minY;

    const scaleX = (clientWidth - padding * 2) / targetW;
    const scaleY = (clientHeight - padding * 2) / targetH;
    const fitScale = Math.min(scaleX, scaleY, 2.0);
    const safeScale = Math.max(0.02, fitScale);

    setZoom(safeScale);
    setPan({
      x: (clientWidth - targetW * safeScale) / 2 - targetMinX * safeScale,
      y: (clientHeight - targetH * safeScale) / 2 - targetMinY * safeScale,
    });
  };

  useEffect(() => {
    fitToView();
    setMeasurePoint1(null);
    setMeasurePoint2(null);
  }, [part?.id, selectedPartIndex, geoBounds, viewMode, consecutivePartsLayout]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.04), 10);
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const dx = (mouseX - pan.x) * (newZoom / zoom - 1);
      const dy = (mouseY - pan.y) * (newZoom / zoom - 1);
      setPan({ x: pan.x - dx, y: pan.y - dy });
    }
    setZoom(newZoom);
  };

  // Mouse drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (measureMode) {
      handleMeasureClick(e);
      return;
    }
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    const mmX = Math.round((screenX - pan.x) / zoom);
    const mmY = Math.round((screenY - pan.y) / zoom);
    setMouseCoords({ x: mmX, y: mmY });

    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMeasureClick = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mmX = Math.round((e.clientX - rect.left - pan.x) / zoom);
    const mmY = Math.round((e.clientY - rect.top - pan.y) / zoom);

    if (!measurePoint1) {
      setMeasurePoint1({ x: mmX, y: mmY });
      setMeasurePoint2(null);
    } else if (!measurePoint2) {
      setMeasurePoint2({ x: mmX, y: mmY });
    } else {
      setMeasurePoint1({ x: mmX, y: mmY });
      setMeasurePoint2(null);
    }
  };

  const measuredDistanceMm = measurePoint1 && measurePoint2
    ? Math.sqrt(Math.pow(measurePoint2.x - measurePoint1.x, 2) + Math.pow(measurePoint2.y - measurePoint1.y, 2))
    : 0;

  const renderPartGeometry = (
    p: FlatPatternPart,
    p2pList: PointToPointSegment[],
    xOffset: number = 0,
    isCurrent: boolean = true
  ) => {
    return (
      <g key={p.id} transform={`translate(${xOffset}, 0)`}>
        {/* Consecutive Mode Header */}
        {viewMode === 'all_consecutive' && (
          <g id={`header-${p.id}`} pointerEvents="none">
            <text 
              x={p.blankWidthMm / 2} 
              y={-40 / zoom} 
              fill="#38bdf8" 
              fontSize={15 / zoom} 
              fontWeight="bold" 
              fontFamily="sans-serif"
              textAnchor="middle"
            >
              {lang === 'bn' ? p.partNameBn : p.partName} (Qty: {p.quantity})
            </text>
            <text 
              x={p.blankWidthMm / 2} 
              y={-22 / zoom} 
              fill="#94a3b8" 
              fontSize={11 / zoom} 
              fontFamily="monospace" 
              textAnchor="middle"
            >
              Blank: {p.blankWidthMm}×{p.blankLengthMm}mm | Area: {p.areaM2}m² | Wt: {p.weightKg}kg
            </text>
          </g>
        )}

        {/* Sheet Blank Outline */}
        {showSheetBlank && (
          <g id={`blank-sheet-${p.id}`}>
            <rect
              x={0}
              y={0}
              width={p.blankWidthMm}
              height={p.blankLengthMm}
              fill="rgba(15, 23, 42, 0.4)"
              stroke="#475569"
              strokeWidth={1.5 / zoom}
              strokeDasharray={`${8 / zoom}, ${4 / zoom}`}
            />
          </g>
        )}

        {/* Actual Cut Sheet Metal Workpiece Body Polygon */}
        {p.outerContour && p.outerContour.length > 2 && (
          <g id={`workpiece-body-${p.id}`}>
            <polygon
              points={p.outerContour.map(pt => `${pt.x},${pt.y}`).join(' ')}
              fill="rgba(30, 41, 59, 0.65)"
              stroke="#0284c7"
              strokeWidth={2.2 / zoom}
              strokeLinejoin="round"
            />
          </g>
        )}

        {/* Pattern Lines */}
        <g id={`geometry-lines-${p.id}`} pointerEvents="none">
          {p.lines.map((line, idx) => {
            let strokeColor = '#38bdf8';
            let strokeWidth = 2.0 / zoom;
            let strokeDash = 'none';

            if (line.type === 'cut') {
              if (!showCutLines) return null;
              strokeColor = '#38bdf8';
              strokeWidth = 2.2 / zoom;
            } else if (line.type === 'bend_up') {
              if (!showBendLines) return null;
              strokeColor = '#f87171';
              strokeDash = `${6 / zoom}, ${4 / zoom}`;
              strokeWidth = 1.6 / zoom;
            } else if (line.type === 'bend_down') {
              if (!showBendLines) return null;
              strokeColor = '#4ade80';
              strokeDash = `${5 / zoom}, ${3 / zoom}`;
              strokeWidth = 1.6 / zoom;
            } else if (line.type === 'seam') {
              if (!showSeams) return null;
              strokeColor = '#c084fc';
              strokeDash = `${8 / zoom}, ${3 / zoom}, ${2 / zoom}, ${3 / zoom}`;
              strokeWidth = 1.4 / zoom;
            } else if (line.type === 'notch') {
              strokeColor = '#fb923c';
              strokeWidth = 2.2 / zoom;
            } else {
              strokeColor = '#64748b';
              strokeDash = `${3 / zoom}, ${3 / zoom}`;
              strokeWidth = 1.0 / zoom;
            }

            const isHighlighted = selectedSegmentId === `p2p_${idx + 1}`;

            return (
              <line
                key={idx}
                x1={line.start.x}
                y1={line.start.y}
                x2={line.end.x}
                y2={line.end.y}
                stroke={isHighlighted ? '#fbbf24' : strokeColor}
                strokeWidth={isHighlighted ? 3.5 / zoom : strokeWidth}
                strokeDasharray={strokeDash}
                strokeLinecap="round"
              >
                {line.description && <title>{line.description}</title>}
              </line>
            );
          })}
        </g>

        {/* Pattern Arcs */}
        {p.arcs && (
          <g id={`geometry-arcs-${p.id}`} pointerEvents="none">
            {p.arcs.map((arc, idx) => {
              let strokeColor = '#38bdf8';
              let strokeDash = 'none';
              if (arc.type === 'cut' && !showCutLines) return null;
              if (arc.type === 'bend_up' && !showBendLines) return null;
              if (arc.type === 'seam' && !showSeams) return null;

              if (arc.type === 'seam') {
                strokeColor = '#c084fc';
                strokeDash = `${6 / zoom}, ${4 / zoom}`;
              } else if (arc.type === 'bend_up') {
                strokeColor = '#f87171';
                strokeDash = `${6 / zoom}, ${4 / zoom}`;
              }

              const sx = arc.center.x + arc.radius * Math.cos(arc.startAngleRad);
              const sy = arc.center.y + arc.radius * Math.sin(arc.startAngleRad);
              const ex = arc.center.x + arc.radius * Math.cos(arc.endAngleRad);
              const ey = arc.center.y + arc.radius * Math.sin(arc.endAngleRad);
              const deltaAngle = arc.endAngleRad - arc.startAngleRad;
              const largeArcFlag = Math.abs(deltaAngle) > Math.PI ? 1 : 0;
              const sweepFlag = arc.counterClockwise ? 0 : 1;

              return (
                <path
                  key={idx}
                  d={`M ${sx} ${sy} A ${arc.radius} ${arc.radius} 0 ${largeArcFlag} ${sweepFlag} ${ex} ${ey}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={2.2 / zoom}
                  strokeDasharray={strokeDash}
                />
              );
            })}
          </g>
        )}

        {/* Point-to-Point Length Dimension Badges on EVERY line segment */}
        {showP2P && (
          <g id={`p2p-dimensions-${p.id}`} pointerEvents="none">
            {p2pList.map(seg => {
              if (seg.lengthMm < 5) return null;
              const badgeW = Math.max(34, String(seg.lengthMm).length * 7.5 + 10) / zoom;
              const badgeH = 14 / zoom;
              const isSelected = selectedSegmentId === seg.id;
              return (
                <g 
                  key={seg.id}
                  transform={seg.angleDeg ? `rotate(${seg.angleDeg}, ${seg.labelPosition.x}, ${seg.labelPosition.y})` : undefined}
                >
                  <rect
                    x={seg.labelPosition.x - badgeW / 2}
                    y={seg.labelPosition.y - badgeH / 2}
                    width={badgeW}
                    height={badgeH}
                    fill={isSelected ? '#0369a1' : '#0f172a'}
                    stroke={isSelected ? '#38bdf8' : '#f59e0b'}
                    strokeWidth={(isSelected ? 1.5 : 0.8) / zoom}
                    rx={3 / zoom}
                    opacity={0.94}
                  />
                  <text
                    x={seg.labelPosition.x}
                    y={seg.labelPosition.y + 3.5 / zoom}
                    fill={isSelected ? '#ffffff' : '#fef08a'}
                    fontSize={9.5 / zoom}
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {seg.lengthMm}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Overall Dimension Lines (W & L) */}
        {showDimensions && (
          <g id={`dimensions-${p.id}`} opacity="0.9" pointerEvents="none">
            <line
              x1={0}
              y1={-20 / zoom}
              x2={p.blankWidthMm}
              y2={-20 / zoom}
              stroke="#f59e0b"
              strokeWidth={1.2 / zoom}
              markerStart="url(#arrow-start)"
              markerEnd="url(#arrow-end)"
            />
            <line x1={0} y1={0} x2={0} y2={-26 / zoom} stroke="#f59e0b" strokeWidth={0.8 / zoom} />
            <line x1={p.blankWidthMm} y1={0} x2={p.blankWidthMm} y2={-26 / zoom} stroke="#f59e0b" strokeWidth={0.8 / zoom} />
            <text
              x={p.blankWidthMm / 2}
              y={-25 / zoom}
              fontSize={12 / zoom}
              fill="#fef08a"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
            >
              W: {p.blankWidthMm} mm
            </text>

            <line
              x1={-20 / zoom}
              y1={0}
              x2={-20 / zoom}
              y2={p.blankLengthMm}
              stroke="#f59e0b"
              strokeWidth={1.2 / zoom}
              markerStart="url(#arrow-start)"
              markerEnd="url(#arrow-end)"
            />
            <line x1={0} y1={0} x2={-26 / zoom} y2={0} stroke="#f59e0b" strokeWidth={0.8 / zoom} />
            <line x1={0} y1={p.blankLengthMm} x2={-26 / zoom} y2={p.blankLengthMm} stroke="#f59e0b" strokeWidth={0.8 / zoom} />
            <text
              x={-28 / zoom}
              y={p.blankLengthMm / 2}
              fontSize={12 / zoom}
              fill="#fef08a"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
              transform={`rotate(-90, ${-28 / zoom}, ${p.blankLengthMm / 2})`}
            >
              L: {p.blankLengthMm} mm
            </text>
          </g>
        )}

        {/* Text Annotations */}
        {showLabels && (
          <g id={`annotations-${p.id}`} pointerEvents="none">
            {p.labels.map((lbl, idx) => {
              let fillColor = '#38bdf8';
              let fSize = (lbl.fontSize || 16) / zoom;
              let fWeight = 'normal';

              if (lbl.type === 'part_name') {
                fillColor = '#f8fafc';
                fWeight = 'bold';
              } else if (lbl.type === 'alignment') {
                fillColor = '#fbbf24';
                fWeight = '600';
              } else if (lbl.type === 'dimension') {
                fillColor = '#94a3b8';
              }

              const rot = lbl.rotationDeg
                ? `rotate(${lbl.rotationDeg}, ${lbl.position.x}, ${lbl.position.y})`
                : undefined;

              return (
                <text
                  key={idx}
                  x={lbl.position.x}
                  y={lbl.position.y}
                  fill={fillColor}
                  fontSize={fSize}
                  fontWeight={fWeight}
                  textAnchor="middle"
                  fontFamily="monospace"
                  transform={rot}
                >
                  {lbl.text}
                </text>
              );
            })}
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-full select-none relative">
      {/* Top Bar: Part Selector Tabs & Clean Export Actions */}
      <div className="bg-slate-850 border-b border-slate-800 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Part Tabs & Consecutive View Switcher */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none max-w-full sm:max-w-[60%]">
          {result.parts.length > 1 && (
            <button
              onClick={() => setViewMode('all_consecutive')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'all_consecutive'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 border border-slate-700/60'
              }`}
              title="View all parts laid out side-by-side"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{lang === 'bn' ? 'পরপর সব পার্টস' : 'All Parts'}</span>
              <span className="text-[10px] bg-slate-900/80 px-1 rounded font-mono">
                {result.parts.length}
              </span>
            </button>
          )}

          {result.parts.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => {
                setViewMode('single');
                onSelectPartIndex(idx);
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'single' && selectedPartIndex === idx
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-slate-800/70 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/40'
              }`}
            >
              <span>{lang === 'bn' ? p.partNameBn : p.partName}</span>
              <span className="opacity-70 font-mono text-[10px]">
                ({p.blankWidthMm}×{p.blankLengthMm})
              </span>
            </button>
          ))}
        </div>

        {/* Clean Export Buttons Group */}
        <div className="flex items-center space-x-1">
          {/* DXF */}
          <button
            onClick={() => downloadCompleteDxf(result)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/70 transition cursor-pointer"
            title="Download AutoCAD DXF with Flat Cutting Patterns"
          >
            <FileCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>DXF</span>
          </button>

          {/* SVG */}
          <button
            onClick={() => downloadCompleteSvg(result)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700/70 transition cursor-pointer"
            title="Download Vector Graphic (SVG)"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>SVG</span>
          </button>

          {/* PDF */}
          <button
            onClick={() => generateCompletePdfReport(result)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700/70 transition cursor-pointer"
            title="Generate Engineering PDF Work Order Report"
          >
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span>PDF</span>
          </button>

          {/* CSV */}
          <button
            onClick={() => downloadCsvCutList(result, `${result.modelId}_cut_list.csv`)}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/70 transition cursor-pointer"
            title="Export CSV Cut List for Shear & ERP"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Sub-Toolbar: Clean Layer Toggles & Measure/Zoom Controls */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between text-xs gap-2">
        {/* Layer Switches */}
        <div className="flex items-center space-x-2.5 text-slate-300">
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showCutLines}
              onChange={e => setShowCutLines(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span className="flex items-center space-x-1">
              <span className="w-2 h-0.5 bg-cyan-400 inline-block" />
              <span className="text-[11px]">{lang === 'bn' ? 'কাট' : 'Cut'}</span>
            </span>
          </label>

          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showBendLines}
              onChange={e => setShowBendLines(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-red-500 focus:ring-0"
            />
            <span className="flex items-center space-x-1">
              <span className="w-2 h-0.5 bg-red-400 border-b border-dashed inline-block" />
              <span className="text-[11px]">{lang === 'bn' ? 'বেন্ড' : 'Bend'}</span>
            </span>
          </label>

          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showSeams}
              onChange={e => setShowSeams(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-purple-500 focus:ring-0"
            />
            <span className="flex items-center space-x-1">
              <span className="w-2 h-0.5 bg-purple-400 inline-block" />
              <span className="text-[11px]">{lang === 'bn' ? 'সিম' : 'Seam'}</span>
            </span>
          </label>

          {/* P2P Length Dimensions Toggle */}
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showP2P}
              onChange={e => setShowP2P(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-amber-500 focus:ring-0"
            />
            <span className="flex items-center space-x-1 text-amber-300">
              <span className="w-2 h-0.5 bg-amber-400 inline-block" />
              <span className="text-[11px] font-medium">P2P</span>
            </span>
          </label>

          {/* P2P Schedule Modal Button */}
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer text-[10px] font-medium"
            title="Open Point-to-Point Length Dimensions Schedule Table"
          >
            <Ruler className="w-3 h-3 text-amber-400" />
            <span>{lang === 'bn' ? 'P2P টেবিল' : 'Schedule'}</span>
            <span className="font-mono opacity-80">({p2pSegments.length})</span>
          </button>

          <label className="items-center space-x-1 cursor-pointer hidden md:flex">
            <input
              type="checkbox"
              checked={showDimensions}
              onChange={e => setShowDimensions(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-slate-400 focus:ring-0"
            />
            <span className="text-[11px]">{lang === 'bn' ? 'ডাইমেনশন' : 'Dim'}</span>
          </label>

          <label className="items-center space-x-1 cursor-pointer hidden md:flex">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={e => setShowLabels(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-slate-400 focus:ring-0"
            />
            <span className="text-[11px]">{lang === 'bn' ? 'লেবেল' : 'Labels'}</span>
          </label>
        </div>

        {/* Measure Tool & Zoom Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Measure Toggle */}
          <button
            onClick={() => {
              setMeasureMode(!measureMode);
              setMeasurePoint1(null);
              setMeasurePoint2(null);
            }}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-medium border transition cursor-pointer ${
              measureMode
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Point to point distance measurement tool"
          >
            <Ruler className="w-3 h-3" />
            <span>{measureMode ? (lang === 'bn' ? 'পরিমাপ...' : 'Measuring...') : (lang === 'bn' ? 'মাপ' : 'Measure')}</span>
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-0.5 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
            <button
              onClick={() => setZoom(z => Math.max(z * 0.8, 0.04))}
              className="p-1 hover:text-white text-slate-400 transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono px-1 text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(z => Math.min(z * 1.25, 10))}
              className="p-1 hover:text-white text-slate-400 transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              onClick={fitToView}
              className="p-1 hover:text-white text-slate-400 transition border-l border-slate-700 cursor-pointer"
              title="Fit Pattern to View"
            >
              <Maximize className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Interactive Canvas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`relative flex-1 bg-slate-950 overflow-hidden ${
          measureMode ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ minHeight: '450px' }}
      >
        <svg
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            {/* Background millimeter grid */}
            <pattern id="canvas-grid-50" width={50 * zoom} height={50 * zoom} patternUnits="userSpaceOnUse">
              <path d={`M ${50 * zoom} 0 L 0 0 0 ${50 * zoom}`} fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
            <pattern id="canvas-grid-200" width={200 * zoom} height={200 * zoom} patternUnits="userSpaceOnUse">
              <rect width={200 * zoom} height={200 * zoom} fill="none" stroke="#334155" strokeWidth="0.8" />
            </pattern>

            {/* Subtle sheet metal hatch for seams */}
            <pattern id="seam-hatch" width={10 / zoom} height={10 / zoom} patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2={10 / zoom} stroke="rgba(192, 132, 252, 0.25)" strokeWidth={1 / zoom} />
            </pattern>

            {/* Dimension arrow markers */}
            <marker id="arrow-start" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
              <path d="M 0 1.5 L 6 0 L 4.5 3 L 6 6 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-end" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
              <path d="M 0 1.5 L 6 0 L 4.5 3 L 6 6 z" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Grid Layer */}
          {showGrid && (
            <>
              <rect width="100%" height="100%" fill="url(#canvas-grid-50)" />
              <rect width="100%" height="100%" fill="url(#canvas-grid-200)" />
            </>
          )}

          {/* Transform group for pan & zoom */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Render all parts consecutively OR single active part with Point-to-Point length annotations */}
            {viewMode === 'all_consecutive' ? (
              consecutivePartsLayout.items.map(item =>
                renderPartGeometry(item.part, item.p2pSegments, item.xOffset, item.index === selectedPartIndex)
              )
            ) : (
              renderPartGeometry(part, p2pSegments, 0, true)
            )}

            {/* Measurement Feedback */}
            {measurePoint1 && (
              <g id="measure-layer" pointerEvents="none">
                <circle cx={measurePoint1.x} cy={measurePoint1.y} r={5 / zoom} fill="#f59e0b" />
                <text
                  x={measurePoint1.x}
                  y={measurePoint1.y - 8 / zoom}
                  fill="#f59e0b"
                  fontSize={12 / zoom}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  P1
                </text>

                {measurePoint2 && (
                  <>
                    <circle cx={measurePoint2.x} cy={measurePoint2.y} r={5 / zoom} fill="#f59e0b" />
                    <line
                      x1={measurePoint1.x}
                      y1={measurePoint1.y}
                      x2={measurePoint2.x}
                      y2={measurePoint2.y}
                      stroke="#f59e0b"
                      strokeWidth={2 / zoom}
                      strokeDasharray={`${5 / zoom}, ${3 / zoom}`}
                    />
                    <text
                      x={measurePoint2.x}
                      y={measurePoint2.y - 8 / zoom}
                      fill="#f59e0b"
                      fontSize={12 / zoom}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      P2
                    </text>
                    <rect
                      x={(measurePoint1.x + measurePoint2.x) / 2 - 40 / zoom}
                      y={(measurePoint1.y + measurePoint2.y) / 2 - 18 / zoom}
                      width={80 / zoom}
                      height={20 / zoom}
                      fill="#0f172a"
                      stroke="#f59e0b"
                      strokeWidth={1 / zoom}
                      rx={3 / zoom}
                    />
                    <text
                      x={(measurePoint1.x + measurePoint2.x) / 2}
                      y={(measurePoint1.y + measurePoint2.y) / 2 - 4 / zoom}
                      fill="#fef08a"
                      fontSize={12 / zoom}
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {measuredDistanceMm.toFixed(1)} mm
                    </text>
                  </>
                )}
              </g>
            )}
          </g>
        </svg>

        {/* Live Coordinate Display & Measurement Prompt */}
        <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-300 flex items-center space-x-3 pointer-events-none z-10">
          <div className="flex items-center space-x-1.5">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>X: {mouseCoords.x} mm</span>
            <span className="text-slate-600">|</span>
            <span>Y: {mouseCoords.y} mm</span>
          </div>
          {measureMode && (
            <div className="text-amber-400 border-l border-slate-700 pl-2">
              {!measurePoint1 ? 'Click Point 1' : !measurePoint2 ? 'Click Point 2' : 'Distance: ' + measuredDistanceMm.toFixed(1) + ' mm'}
            </div>
          )}
        </div>
      </div>

      {/* Docked Part Specification Inspector Strip (Clean, non-intrusive) */}
      <div className="bg-slate-900 border-t border-slate-800 px-3.5 py-2 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-y-1 gap-x-4">
        {/* Left: Active Part & Blank */}
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white">{part.partName}</span>
          <span className="text-[11px] text-slate-400 font-mono">
            Qty: {part.quantity}
          </span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-cyan-300 text-[11px]">
            Blank: {part.blankWidthMm} × {part.blankLengthMm} mm
          </span>
        </div>

        {/* Middle: Calculated Metrics */}
        <div className="flex items-center space-x-3 text-[11px] font-mono">
          <div>
            <span className="text-slate-400 font-sans">Area: </span>
            <span className="text-cyan-300 font-semibold">{partAreaSqFt} sq ft</span>
            <span className="text-slate-500"> ({part.areaM2} m²)</span>
          </div>
          <span className="text-slate-600">·</span>
          <div>
            <span className="text-slate-400 font-sans">Weight: </span>
            <span className="text-emerald-400 font-semibold">{part.weightKg} kg</span>
            <span className="text-slate-500"> ({partWeightLbs} lbs)</span>
          </div>
          <span className="text-slate-600">·</span>
          <div>
            <span className="text-slate-400 font-sans">Yield: </span>
            <span className="text-amber-300 font-semibold">{sheetUtilizationPct}%</span>
          </div>
        </div>

        {/* Right: Spec & SMACNA status */}
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-slate-400">{materialObj.name.split('(')[0].trim()}</span>
          <span className="font-mono text-slate-300">{gauge} Ga</span>
          {isSmacnaCompliant ? (
            <span className="text-emerald-400 flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px]">SMACNA</span>
            </span>
          ) : (
            <span className="text-amber-400 text-[10px] font-medium">Thin Gauge</span>
          )}
        </div>
      </div>

      {/* POINT-TO-POINT SEGMENT SCHEDULE MODAL (পয়েন্ট-টু-পয়েন্ট পরিমাপ তালিকা) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-slate-850 px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                  <Ruler className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base flex items-center space-x-2">
                    <span>
                      {lang === 'bn' 
                        ? 'পয়েন্ট-টু-পয়েন্ট কাটিং ও বেন্ড পরিমাপ শিডিউল' 
                        : 'Point-to-Point Cutting & Bend Dimensions Schedule'}
                    </span>
                    <span className="text-xs font-mono text-cyan-400 bg-slate-950/70 px-2 py-0.5 rounded border border-slate-700">
                      {part.partName}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {lang === 'bn' 
                      ? 'প্রতিটি লাইনের শুরু (Start) এবং শেষ (End) কোঅর্ডিনেট এবং সঠিক ইউক্লিডিয়ান দৈর্ঘ্য (মিমি)'
                      : 'Exact Euclidean start-to-end lengths for all cuts, bends, seams, and contours'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick summary badges */}
            <div className="bg-slate-950/80 px-5 py-2.5 border-b border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-400 font-sans">Total Segments</div>
                <div className="text-sm font-bold text-white">{p2pSegments.length} segments</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-cyan-400 font-sans">Outer Cut Lines</div>
                <div className="text-sm font-bold text-cyan-300">
                  {p2pSegments.filter(s => s.type === 'cut').reduce((acc, s) => acc + s.lengthMm, 0).toFixed(1)} mm
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-red-400 font-sans">Brake Press Bends</div>
                <div className="text-sm font-bold text-red-300">
                  {p2pSegments.filter(s => s.type.startsWith('bend')).reduce((acc, s) => acc + s.lengthMm, 0).toFixed(1)} mm
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-purple-400 font-sans">Seam Allowances</div>
                <div className="text-sm font-bold text-purple-300">
                  {p2pSegments.filter(s => s.type === 'seam').reduce((acc, s) => acc + s.lengthMm, 0).toFixed(1)} mm
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs text-slate-300 border-collapse font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-sans tracking-wider bg-slate-950/40">
                    <th className="py-2.5 px-3">Seg #</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Start (X1, Y1)</th>
                    <th className="py-2.5 px-3">End (X2, Y2)</th>
                    <th className="py-2.5 px-3 text-right">Length (mm)</th>
                    <th className="py-2.5 px-3 text-right">Angle</th>
                    <th className="py-2.5 px-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {p2pSegments.map((seg, idx) => {
                    const isSelected = selectedSegmentId === seg.id;
                    return (
                      <tr 
                        key={seg.id}
                        onClick={() => setSelectedSegmentId(seg.id)}
                        className={`hover:bg-slate-800/60 transition cursor-pointer ${
                          isSelected ? 'bg-amber-500/10 text-amber-200' : ''
                        }`}
                      >
                        <td className="py-2 px-3 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                            seg.type === 'cut' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                            seg.type === 'bend_up' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            seg.type === 'bend_down' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            seg.type === 'seam' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {seg.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-300">({seg.start.x}, {seg.start.y})</td>
                        <td className="py-2 px-3 text-slate-300">({seg.end.x}, {seg.end.y})</td>
                        <td className="py-2 px-3 text-right font-bold text-amber-300">
                          {seg.lengthMm} mm
                        </td>
                        <td className="py-2 px-3 text-right text-slate-400">{seg.angleDeg}°</td>
                        <td className="py-2 px-3 font-sans text-slate-400 truncate max-w-xs">
                          {seg.description || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-slate-850 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {lang === 'bn' ? 'সব পরিমাপ SMACNA ও CNC সহনশীলতার সাথে সঙ্গতিপূর্ণ' : 'All lengths computed in true millimeters for CNC shear & brake operations'}
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                >
                  {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
