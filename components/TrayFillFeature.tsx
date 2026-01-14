
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import TrayVisualizer from './TrayVisualizer';
import { solveSystem, solveSystemAtWidth } from '../services/traySolver';
import { routeCables } from '../services/trayRouting';
// Import Cable type from types but alias it to CableData which the solver expects (they are compatible)
import { Cable as CableData, Node as NodeData, SystemResult } from '../types';
import { Box, Mail, ChevronLeft, ChevronRight, RefreshCw, Wand2, Settings, Layers, Info, Calculator, MapPin, Check } from 'lucide-react';

interface TrayFillFeatureProps {
    cables: CableData[];
    nodes: NodeData[];
}

const TrayFillFeature: React.FC<TrayFillFeatureProps> = ({ cables: rawCables, nodes: rawNodes }) => {
    // Use props instead of local state for data
    const [processedCables, setProcessedCables] = useState<CableData[]>([]); // Cables with paths calculated

    // Selection State
    const [selectedNode, setSelectedNode] = useState<string | null>(null);

    // Configuration State
    const [fillRatioLimit, setFillRatioLimit] = useState(60);
    const [maxHeightLimit, setMaxHeightLimit] = useState(60);
    const [numberOfTiers, setNumberOfTiers] = useState(1);
    const [manualWidth, setManualWidth] = useState<number | null>(null);

    const [systemResult, setSystemResult] = useState<SystemResult | null>(null);
    const [recommendedResult, setRecommendedResult] = useState<SystemResult | null>(null); // Optimal result reference
    const [isCalculating, setIsCalculating] = useState(false);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Routing Logic ---
    useEffect(() => {
        // Whenever raw data changes, recalculate routes
        // Optimization: In this main app, cables might already have calculatedPath.
        // But to be safe and use local logic if needed, we re-run routeCables OR trust the logic.
        // The user asked to "change only the logic for calling cable information".
        // We will perform routing here to ensure it matches the visualizer's expectation

        if (rawCables.length > 0) {
            if (rawNodes.length > 0) {
                // Perform Routing
                console.log("Routing cables for Tray Fill...");
                const routed = routeCables(rawCables, rawNodes);
                setProcessedCables(routed);
            } else {
                // No nodes provided, treat as simple list (all cables pass "everywhere")
                setProcessedCables(rawCables);
            }
        } else {
            setProcessedCables([]);
        }
    }, [rawCables, rawNodes]);

    // --- Filtering Cables based on Selection ---
    const activeCables = useMemo(() => {
        if (!selectedNode || rawNodes.length === 0) {
            // If no node selected, or no node data, use all cables (Simple Mode)
            return processedCables;
        }
        // Filter cables that pass through the selected node
        // Note: calculatedPath is string[]
        return processedCables.filter(c => c.calculatedPath?.includes(selectedNode));
    }, [processedCables, selectedNode, rawNodes]);


    // --- Sizing Calculation ---
    const calculate = useCallback((overrideWidth: number | null = null, overrideTiers: number | null = null) => {
        if (activeCables.length === 0) {
            setSystemResult(null);
            return;
        }

        setIsCalculating(true);
        const tiersToUse = overrideTiers ?? numberOfTiers;

        setTimeout(() => {
            // 1. Always calculate the Optimal Result (Auto) for the current rules
            const optimalSolution = solveSystem(activeCables, tiersToUse, maxHeightLimit, fillRatioLimit);
            setRecommendedResult(optimalSolution);

            // 2. Calculate the Actual Result based on user selection
            let actualSolution: SystemResult;
            if (overrideWidth !== null) {
                // Cap manual width at 1000mm
                const cappedWidth = Math.min(overrideWidth, 1000);
                actualSolution = solveSystemAtWidth(activeCables, tiersToUse, cappedWidth, maxHeightLimit, fillRatioLimit);
            } else {
                actualSolution = optimalSolution;
            }

            setSystemResult(actualSolution);
            setIsCalculating(false);
        }, 10);
    }, [activeCables, maxHeightLimit, fillRatioLimit, numberOfTiers]);

    useEffect(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Trigger calculation when active dataset changes
        if (activeCables.length > 0) {
            setIsCalculating(true);
            timeoutRef.current = setTimeout(() => {
                calculate(manualWidth, numberOfTiers);
            }, 400);
        } else {
            setSystemResult(null);
        }
    }, [fillRatioLimit, maxHeightLimit, numberOfTiers, activeCables, calculate, manualWidth]);

    const adjustWidth = (delta: number) => {
        const currentW = systemResult?.systemWidth || 100;
        const nextW = Math.min(1000, Math.max(100, currentW + delta));
        setManualWidth(nextW);
        calculate(nextW, numberOfTiers);
    };

    const autoOptimize = () => {
        setIsCalculating(true);
        setTimeout(() => {
            const tempRes = solveSystem(activeCables, 1, maxHeightLimit, fillRatioLimit);
            if (tempRes.optimizationMatrix) {
                const candidates = tempRes.optimizationMatrix.flat().filter(c => c.isOptimal);
                if (candidates.length > 0) {
                    candidates.sort((a, b) => a.area - b.area);
                    const best = candidates[0];
                    setNumberOfTiers(best.tiers);
                    setManualWidth(null);
                    setTimeout(() => calculate(null, best.tiers), 50);
                } else {
                    calculate(null, numberOfTiers);
                }
            }
        }, 100);
    };

    const resetToAuto = () => {
        setManualWidth(null);
        calculate(null);
    };

    const handleMatrixCellClick = (tiers: number, width: number) => {
        setNumberOfTiers(tiers);
        setManualWidth(width);
    };

    const exportToHtml = () => {
        if (!systemResult) return;
        const exportData = JSON.stringify(systemResult);
        const dateStr = new Date().toISOString().split('T')[0];
        const nodeStr = selectedNode ? `_Node-${selectedNode}` : '_All';

        // Updated HTML Content with Full Visualization Features (Posts, Beams, Numbers) and Y-Position Fix
        // Copied from source App.tsx
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tray Report - ${dateStr}</title>
    <style>
        body { font-family: sans-serif; background: #f8fafc; padding: 40px; color: #334155; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        h1 { color: #0f172a; margin-bottom: 5px; }
        .meta { font-size: 12px; color: #64748b; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; }
        .spec { display: flex; gap: 20px; margin-bottom: 30px; padding: 20px; background: #f1f5f9; border-radius: 6px; }
        .spec-item { display: flex; flex-direction: column; }
        .spec-label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; }
        .spec-value { font-size: 18px; font-weight: 900; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
        th { text-align: left; padding: 8px; background: #e2e8f0; font-weight: bold; text-transform: uppercase; color: #475569; }
        td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
        .visual { width: 100%; overflow-x: auto; border: 1px solid #cbd5e1; margin-bottom: 30px; display: flex; justify-content: center; background: white; border-radius: 4px; padding: 20px; }
        .tier-header { background: #0f172a; color: white; padding: 8px; font-weight: bold; font-size: 12px; margin-top: 20px; border-radius: 4px 4px 0 0; }
        .idx-badge { display: inline-block; width: 18px; height: 18px; background: #e2e8f0; color: #1e293b; border-radius: 4px; text-align: center; line-height: 18px; font-weight: bold; font-size: 9px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cable Tray Calculation Report</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Node: ${selectedNode || 'All'}</div>
        <div class="spec">
            <div class="spec-item">
                <span class="spec-label">Tray Width</span>
                <span class="spec-value">${systemResult.systemWidth} mm</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Height Limit</span>
                <span class="spec-value">${systemResult.maxHeightPerTier} mm</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Tiers</span>
                <span class="spec-value">${systemResult.tiers.length}</span>
            </div>
            <div class="spec-item">
                <span class="spec-label">Fill Limit</span>
                <span class="spec-value">${fillRatioLimit}%</span>
            </div>
        </div>

        <h3>Visualization Preview</h3>
        <div class="visual" id="canvas-container">
            <canvas id="trayCanvas"></canvas>
        </div>

        <h3>Cable Schedule by Tier</h3>
        <div id="tables"></div>
    </div>
    <script>
        const data = ${exportData};
        
        let globalCounter = 1;
        data.tiers.forEach(tier => {
            tier.cables.forEach(c => {
                c.displayIndex = globalCounter++;
            });
        });

        const getTypeColor = (type) => {
            let hash = 0;
            for (let i = 0; i < type.length; i++) {
                hash = type.charCodeAt(i) + ((hash << 5) - hash);
            }
            const hue = Math.abs(hash) % 360;
            return 'hsl(' + hue + ', 85%, 70%)';
        };

        const canvas = document.getElementById('trayCanvas');
        const ctx = canvas.getContext('2d');
        const SCALE = 2;
        
        const TIER_PITCH = 250;
        const TRAY_WIDTH = data.systemWidth;
        const TRAY_HEIGHT = data.maxHeightPerTier;
        const POST_WIDTH = 25;
        const BEAM_HEIGHT = 15;
        const MARGIN_LEFT_LABEL = 80;
        const MARGIN_RIGHT_LABEL = 240;
        const MARGIN_TOP = 50;
        const MARGIN_BOTTOM = 80;

        const STRUCTURE_HEIGHT = (data.tiers.length * TIER_PITCH) + MARGIN_TOP;
        const DRAWING_WIDTH = MARGIN_LEFT_LABEL + POST_WIDTH + TRAY_WIDTH + POST_WIDTH + MARGIN_RIGHT_LABEL;
        const HEIGHT = STRUCTURE_HEIGHT + MARGIN_BOTTOM;

        canvas.width = DRAWING_WIDTH * SCALE;
        canvas.height = HEIGHT * SCALE;
        canvas.style.width = DRAWING_WIDTH + 'px';
        canvas.style.height = HEIGHT + 'px';
        ctx.scale(SCALE, SCALE);

        const X_TRAY_START = MARGIN_LEFT_LABEL + POST_WIDTH;
        const X_TRAY_END = X_TRAY_START + TRAY_WIDTH;
        const X_POST_RIGHT_START = X_TRAY_END;
        const getTierY = (idx) => STRUCTURE_HEIGHT - 80 - (idx * TIER_PITCH);

        ctx.lineJoin = 'round';

        // 1. Posts
        ctx.fillStyle = '#f1f5f9';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.fillRect(MARGIN_LEFT_LABEL, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);
        ctx.strokeRect(MARGIN_LEFT_LABEL, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);
        ctx.fillRect(X_POST_RIGHT_START, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);
        ctx.strokeRect(X_POST_RIGHT_START, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);

        // 2. Tiers
        data.tiers.forEach((tier, idx) => {
            const floorY = getTierY(idx);
            
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '900 18px sans-serif';
            ctx.textAlign = 'start';
            ctx.fillText('LV. L' + (idx + 1), 20, floorY - 15);

            ctx.fillStyle = '#334155';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.fillRect(X_TRAY_START, floorY, TRAY_WIDTH, BEAM_HEIGHT);
            ctx.strokeRect(X_TRAY_START, floorY, TRAY_WIDTH, BEAM_HEIGHT);

            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 2]);
            ctx.beginPath();
            ctx.moveTo(X_TRAY_START - 10, floorY - TRAY_HEIGHT);
            ctx.lineTo(X_TRAY_END + 10, floorY - TRAY_HEIGHT);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('H' + TRAY_HEIGHT, X_TRAY_START - 15, floorY - TRAY_HEIGHT + 4);
            ctx.textAlign = 'start';

            const statsX = X_POST_RIGHT_START + POST_WIDTH + 15;
            const statsY = floorY - 40;
            
            ctx.fillStyle = '#1e293b';
            ctx.font = '900 14px sans-serif';
            ctx.fillText('OD: ' + tier.totalODSum.toFixed(1), statsX, statsY);
            ctx.fillText('AREA: ' + tier.totalCableArea.toFixed(0), statsX, statsY + 20);
            
            ctx.font = 'bold 10px sans-serif';
            ctx.fillStyle = '#64748b';
            ctx.fillText('FILL RATE', statsX, statsY + 35);
            
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(statsX, statsY + 40, 130, 12);
            ctx.fillStyle = tier.fillRatio > ${fillRatioLimit} ? '#ef4444' : '#3b82f6';
            ctx.fillRect(statsX, statsY + 40, Math.min(130, 130 * (tier.fillRatio/100)), 12);
            ctx.font = '900 12px sans-serif';
            ctx.fillText(tier.fillRatio.toFixed(1) + '%', statsX + 135, statsY + 50);
        });

        // 3. Cables
        data.tiers.forEach((tier, idx) => {
            const floorY = getTierY(idx);
            tier.cables.forEach(c => {
                const safeY = Math.max(c.y, c.od / 2);
                const cy = floorY - safeY;
                const cx = X_TRAY_START + c.x;
                
                ctx.beginPath();
                ctx.arc(cx, cy, c.od/2, 0, Math.PI * 2);
                ctx.fillStyle = getTypeColor(c.type || 'UNK');
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                if (c.od > 8) {
                    ctx.fillStyle = '#0f172a';
                    ctx.font = '900 ' + Math.min(c.od * 0.6, 16) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(c.displayIndex, cx, cy);
                }
            });
        });

        // Width Label
        ctx.beginPath();
        const bottomY = STRUCTURE_HEIGHT;
        ctx.moveTo(X_TRAY_START, bottomY);
        ctx.lineTo(X_TRAY_END, bottomY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = '900 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('W ' + TRAY_WIDTH + ' mm', X_TRAY_START + (TRAY_WIDTH/2), bottomY + 30);

    <\/script>
</body>
</html>`;

        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TrayReport_${dateStr}${nodeStr}.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-screen bg-slate-200">
            {/* 1. Header & Controls */}
            <div className="bg-white px-4 py-3 shadow-sm border-b border-slate-300 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-900 text-white p-2 rounded shadow">
                            <Layers size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-black text-slate-900 leading-tight">ADVANCED TRAY SOLVER</h1>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <span>Cables: {activeCables.length}</span>
                                <span className="w-1 h-3 bg-slate-300 rounded-full"></span>
                                <span>Node: {selectedNode || 'ALL'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Node Selector - Dynamic from Main App Nodes */}
                    <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>

                    <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        <select
                            value={selectedNode || ''}
                            onChange={e => setSelectedNode(e.target.value || null)}
                            className="bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-700 py-1.5 px-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">-- ALL NODES (Routing Disabled) --</option>
                            {rawNodes.map(n => (
                                <option key={n.name} value={n.name}>{n.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Configuration Panel */}
                    <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Height (mm)</label>
                            <input
                                type="number"
                                value={maxHeightLimit}
                                onChange={(e) => setMaxHeightLimit(Number(e.target.value))}
                                className="w-12 bg-transparent font-black text-sm text-slate-700 outline-none border-b border-dashed border-slate-300 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Fill Limit (%)</label>
                            <input
                                type="number"
                                value={fillRatioLimit}
                                onChange={(e) => setFillRatioLimit(Number(e.target.value))}
                                className="w-10 bg-transparent font-black text-sm text-slate-700 outline-none border-b border-dashed border-slate-300 focus:border-blue-500"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Tiers</label>
                            <select
                                value={numberOfTiers}
                                onChange={(e) => setNumberOfTiers(Number(e.target.value))}
                                className="bg-transparent font-black text-sm text-slate-700 outline-none border-b border-dashed border-slate-300 focus:border-blue-500"
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-200"></div>

                    {/* Width Controls */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => adjustWidth(-100)}
                            disabled={manualWidth !== null && manualWidth <= 100}
                            className="p-1.5 hover:bg-white rounded text-slate-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <div className="w-24 text-center font-black text-slate-800 tabular-nums text-sm">
                            {manualWidth ? `${manualWidth} mm` : 'AUTO'}
                        </div>
                        <button
                            onClick={() => adjustWidth(100)}
                            disabled={manualWidth !== null && manualWidth >= 1000}
                            className="p-1.5 hover:bg-white rounded text-slate-600 disabled:opacity-30 transition-all shadow-sm"
                        >
                            <ChevronRight size={16} />
                        </button>
                        {manualWidth !== null && (
                            <button onClick={resetToAuto} className="ml-2 text-[9px] font-bold text-blue-600 hover:text-blue-800 uppercase bg-blue-50 px-2 py-1 rounded">Reset</button>
                        )}
                    </div>

                    <button
                        onClick={autoOptimize}
                        disabled={isCalculating}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide shadow-lg shadow-blue-500/20 active:translate-y-0.5 transition-all"
                    >
                        {isCalculating ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
                        <span>Auto Optimize</span>
                    </button>
                </div>
            </div>

            {/* 2. Main Content Area */}
            <div className="flex-1 p-3 overflow-hidden">
                {systemResult ? (
                    <TrayVisualizer
                        systemResult={systemResult}
                        recommendedResult={recommendedResult}
                        fillRatioLimit={fillRatioLimit}
                        onApplyRecommendation={() => {
                            // Check if recommended exists
                            if (recommendedResult) {
                                setNumberOfTiers(recommendedResult.tiers.length);
                                setManualWidth(recommendedResult.systemWidth); // Lock to optimal
                            }
                        }}
                        onMatrixCellClick={handleMatrixCellClick}
                        onExportHtml={exportToHtml}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                            <Layers size={32} className="opacity-50" />
                        </div>
                        <p className="font-medium text-sm">Load data to start simulation</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrayFillFeature;
