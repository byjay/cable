import React, { useState, useMemo } from 'react';
import { SystemResult } from '../types';
import { ZoomIn, ZoomOut, Maximize, Calculator, CheckCircle2, AlertTriangle, List, Info, Grid } from 'lucide-react';

interface TrayVisualizerProps {
    systemResult: SystemResult;
    fillRatioLimit: number;
}

const TrayVisualizer: React.FC<TrayVisualizerProps> = ({ systemResult, fillRatioLimit }) => {
    const [zoom, setZoom] = useState(1.0);

    const getTypeColor = (type: string, idStr: string) => {
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = type.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 85%, 70%)`;
    };

    const processedTiers = useMemo(() => {
        let globalCounter = 1;
        return systemResult.tiers.map(tier => ({
            ...tier,
            cables: tier.cables.map(c => ({
                ...c,
                displayIndex: globalCounter++
            }))
        }));
    }, [systemResult]);

    const TRAY_WIDTH = systemResult.systemWidth;
    const TRAY_HEIGHT = systemResult.maxHeightPerTier;
    const TIER_PITCH = 200;
    const TIER_COUNT = systemResult.tiers.length;

    const POST_WIDTH = 25;
    const BEAM_HEIGHT = 15;

    const MARGIN_LEFT_LABEL = 80;
    const MARGIN_RIGHT_LABEL = 240;
    const MARGIN_TOP = 50;
    const MARGIN_BOTTOM = 80;

    const DRAWING_WIDTH = MARGIN_LEFT_LABEL + POST_WIDTH + TRAY_WIDTH + POST_WIDTH + MARGIN_RIGHT_LABEL;
    const STRUCTURE_HEIGHT = (TIER_COUNT * TIER_PITCH) + MARGIN_TOP;
    const SVG_HEIGHT = STRUCTURE_HEIGHT + MARGIN_BOTTOM;

    const X_TRAY_START = MARGIN_LEFT_LABEL + POST_WIDTH;
    const X_TRAY_END = X_TRAY_START + TRAY_WIDTH;
    const X_POST_RIGHT_START = X_TRAY_END;

    const getTierY = (tierIndex: number) => {
        return STRUCTURE_HEIGHT - 80 - (tierIndex * TIER_PITCH);
    };

    return (
        <div className="flex flex-col lg:flex-row h-full bg-slate-100 gap-3 overflow-hidden">
            <div className="flex-1 flex flex-col gap-3 h-full overflow-hidden">
                {/* Main Visualizer */}
                <div className="flex-1 bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden relative flex flex-col">
                    <div className="bg-slate-900 text-white p-4 shadow-md border-b border-slate-700 shrink-0">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-blue-600 p-2 rounded shadow-md">
                                    <Calculator size={18} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Cable Tray Optimization</h2>
                                    <p className="text-lg font-black text-white leading-none">W {TRAY_WIDTH} mm <span className="text-[10px] font-normal text-slate-500 ml-1">({TRAY_WIDTH >= 1000 ? 'MAX' : 'OPTIMIZED'})</span></p>
                                </div>
                            </div>
                            <div className={`px-2.5 py-1.5 rounded font-black text-[10px] flex items-center gap-1.5 border shadow-sm ${systemResult.success ? 'bg-green-500/10 text-green-400 border-green-500/50' : 'bg-red-500/10 text-red-400 border-red-500/50'}`}>
                                {systemResult.success ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
                                {systemResult.success ? 'DESIGN SUCCESS' : 'DENSITY ALERT'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 border-b px-3 py-2 flex justify-between items-center z-10 shrink-0">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-tight flex items-center gap-1.5">
                                <Info size={13} className="text-blue-500" /> 기본 3단 적층 | 면적 기준 최적화
                            </span>
                            <span className="text-[10px] text-slate-300">|</span>
                            <span className="text-[10px] text-slate-700 font-black uppercase tracking-widest">Target Fill: {fillRatioLimit}%</span>
                        </div>
                        <div className="flex gap-1.5 bg-white p-1 rounded border border-slate-200">
                            <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} className="p-1 text-slate-400 hover:text-slate-900 transition-colors"><ZoomOut size={14} /></button>
                            <button onClick={() => setZoom(1.0)} className="p-1 text-slate-400 hover:text-slate-900 transition-colors"><Maximize size={14} /></button>
                            <button onClick={() => setZoom(z => Math.min(4, z + 0.1))} className="p-1 text-slate-400 hover:text-slate-900 transition-colors"><ZoomIn size={14} /></button>
                        </div>
                    </div>

                    <div className="flex-1 relative overflow-auto bg-white shadow-inner">
                        <div className="min-w-full min-h-full flex items-center justify-center p-12">
                            <svg
                                width={DRAWING_WIDTH * zoom}
                                height={SVG_HEIGHT * zoom}
                                viewBox={`0 0 ${DRAWING_WIDTH} ${SVG_HEIGHT}`}
                                className="bg-white"
                            >
                                <defs>
                                    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                                        <path d="M0,0 L0,6 L8,3 z" fill="#000" />
                                    </marker>
                                </defs>

                                <g fill="#f1f5f9" stroke="#1e293b" strokeWidth="2">
                                    <rect x={MARGIN_LEFT_LABEL} y={20} width={POST_WIDTH} height={STRUCTURE_HEIGHT - 20} rx="2" />
                                    <rect x={X_POST_RIGHT_START} y={20} width={POST_WIDTH} height={STRUCTURE_HEIGHT - 20} rx="2" />
                                </g>

                                {processedTiers.map((tier, idx) => {
                                    const floorY = getTierY(idx);
                                    return (
                                        <g key={`tier-${idx}`}>
                                            <text x={20} y={floorY - 15} fontSize="18" fontWeight="950" fill="#cbd5e1">LV. L{idx + 1}</text>
                                            <rect x={X_TRAY_START} y={floorY} width={TRAY_WIDTH} height={BEAM_HEIGHT} fill="#334155" stroke="#0f172a" strokeWidth="2" />
                                            <line x1={X_TRAY_START - 10} y1={floorY - TRAY_HEIGHT} x2={X_TRAY_END + 10} y2={floorY - TRAY_HEIGHT} stroke="#f87171" strokeWidth="1.5" strokeDasharray="5,3" />

                                            {tier.cables.map((c) => (
                                                <g key={c.id}>
                                                    <circle cx={X_TRAY_START + c.x} cy={floorY - c.y} r={c.od / 2} fill={getTypeColor(c.type, c.id)} stroke="#000" strokeWidth="1.2" />
                                                    <text
                                                        x={X_TRAY_START + c.x}
                                                        y={floorY - c.y}
                                                        fontSize={Math.max(10, Math.min(c.od * 0.6, 16))}
                                                        textAnchor="middle"
                                                        dominantBaseline="middle"
                                                        fill="#000"
                                                        fontWeight="950"
                                                        style={{ pointerEvents: 'none' }}
                                                    >
                                                        {c.displayIndex}
                                                    </text>
                                                </g>
                                            ))}

                                            <g transform={`translate(${X_POST_RIGHT_START + POST_WIDTH + 15}, ${floorY - 25})`}>
                                                <text x="0" y="0" fontSize="14" fontWeight="black" fill="#1e293b" className="tracking-tight uppercase" style={{ whiteSpace: 'pre' }}>
                                                    Σ OD: <tspan fill="#2563eb" fontWeight="950">{tier.totalODSum.toFixed(1)}</tspan>
                                                    <tspan fill="#64748b" className="mx-2"> / </tspan>
                                                    FILL: <tspan fill={tier.fillRatio > fillRatioLimit ? "#ef4444" : "#2563eb"}>{tier.fillRatio.toFixed(1)}%</tspan>
                                                </text>
                                                <rect x="0" y="8" width="130" height="10" fill="#f1f5f9" rx="5" />
                                                <rect x="0" y="8" width={Math.min(130, 130 * (tier.fillRatio / fillRatioLimit))} height="10" fill={tier.fillRatio > fillRatioLimit ? "#ef4444" : "#2563eb"} rx="5" />

                                                <text x="0" y="32" fontSize="10" fontWeight="bold" fill="#64748b" className="tracking-tight font-mono">
                                                    A(C): {tier.totalCableArea.toFixed(0)} <tspan fill="#cbd5e1">/</tspan> A(T): {(TRAY_WIDTH * TRAY_HEIGHT).toFixed(0)} mm²
                                                </text>
                                                <text x="0" y="44" fontSize="10" fontWeight="bold" fill="#2563eb" className="tracking-tight font-mono">
                                                    ACTUAL H: {tier.maxStackHeight.toFixed(1)} mm
                                                </text>
                                            </g>
                                        </g>
                                    );
                                })}

                                <g transform={`translate(0, ${STRUCTURE_HEIGHT - 25})`}>
                                    <line x1={X_TRAY_START} y1={0} x2={X_TRAY_END} y2={0} stroke="#000" strokeWidth="3" markerStart="url(#arrow)" markerEnd="url(#arrow)" />
                                    <text x={X_TRAY_START + (TRAY_WIDTH / 2)} y={30} textAnchor="middle" fontSize="28" fontWeight="1000" fill="#000" className="font-mono tracking-tighter">W {TRAY_WIDTH} mm</text>
                                </g>
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Optimization Matrix Table */}
                {systemResult.optimizationMatrix && (
                    <div className="h-64 bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden flex flex-col shrink-0">
                        <div className="bg-slate-800 text-white p-2 px-3 border-b border-slate-700 flex items-center gap-2">
                            <Grid size={14} className="text-blue-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">Optimization Matrix (Tier vs Width)</h3>
                            <span className="text-[9px] text-slate-400 ml-auto">Green = Optimal (Fill ≤ {fillRatioLimit}%)</span>
                        </div>
                        <div className="flex-1 overflow-auto p-2 bg-slate-50">
                            <table className="w-full text-center border-collapse text-[10px]">
                                <thead>
                                    <tr>
                                        <th className="p-1 border bg-slate-200 text-slate-600 font-bold sticky left-0 z-10">Tier \ Width</th>
                                        {systemResult.optimizationMatrix[0].map(cell => (
                                            <th key={cell.width} className="p-1 border bg-slate-100 text-slate-700 font-bold min-w-[50px]">{cell.width}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {systemResult.optimizationMatrix.map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            <td className="p-1 border bg-slate-100 font-bold text-slate-800 sticky left-0 z-10">{row[0].tiers}</td>
                                            {row.map((cell, cIdx) => (
                                                <td key={cIdx} className={`p-1 border font-mono transition-colors border-white
                                            ${cell.isOptimal
                                                        ? 'bg-green-500 text-white font-bold shadow-inner'
                                                        : cell.success
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-red-50 text-red-300'}
                                            ${cell.width === TRAY_WIDTH && cell.tiers === TIER_COUNT ? 'ring-2 ring-blue-600 z-20' : ''}
                                        `}>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] leading-tight">{cell.area.toLocaleString()}</span>
                                                        {cell.isOptimal && <span className="text-[8px] opacity-80 leading-none mt-0.5">{cell.fillRatio.toFixed(0)}%</span>}
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-48 flex flex-col bg-white rounded-lg shadow-lg border border-gray-300 overflow-hidden shrink-0">
                <div className="bg-slate-900 text-white p-3.5 flex items-center gap-2 border-b border-slate-800">
                    <List size={14} className="text-blue-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">CABLE INDEX</h3>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-50 p-2 space-y-3">
                    {processedTiers.map((tier, idx) => (
                        <div key={idx} className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-100 px-2.5 py-2 border-b border-slate-200 flex justify-between items-center">
                                <span className="font-black text-[10px] text-slate-700 uppercase">LV. L{idx + 1}</span>
                                <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2 rounded-full border border-blue-200 uppercase">
                                    {tier.cables.length} EA
                                </span>
                            </div>
                            <div className="max-h-[500px] overflow-y-auto">
                                <table className="w-full text-[10px] table-fixed">
                                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                                        <tr className="text-left font-black text-slate-400 uppercase border-b border-slate-100">
                                            <th className="w-8 px-2 py-2 text-center">NO</th>
                                            <th className="px-1 py-2">NAME</th>
                                            <th className="w-10 px-2 py-2 text-right">OD</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-medium">
                                        {tier.cables.map(c => (
                                            <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-2 py-2 text-center">
                                                    <span className="inline-block w-5 h-5 rounded bg-slate-200 text-slate-900 font-black flex items-center justify-center text-[8px]">{c.displayIndex}</span>
                                                </td>
                                                <td className="px-1 py-2 truncate text-slate-800 font-bold" title={c.name}>{c.name}</td>
                                                <td className="px-2 py-2 text-right font-mono font-black text-slate-950">{c.od.toFixed(0)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">designsir@seastargo.com</span>
                </div>
            </div>
        </div>
    );
};

export default TrayVisualizer;
