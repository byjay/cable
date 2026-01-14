
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import CableInput from './tray/CableInput';
import TrayVisualizer from './tray/TrayVisualizer';
import { solveSystem, solveSystemAtWidth } from '../services/tray/solver';
import { routeCables } from '../services/tray/routing';
import { CableData, SystemResult, NodeData } from '../services/tray/types';
import { Box, Mail, ChevronLeft, ChevronRight, RefreshCw, Wand2, Calculator, MapPin, Check, Settings, Layers } from 'lucide-react';

// Define expected input types from the main app (can be loose or strict)
interface AppCable {
  id: string;
  name: string;
  type: string;
  od: number;
  system: string;
  fromNode: string;
  toNode: string;
  checkNode?: string;
  calculatedPath?: string[];
  [key: string]: any;
}

interface AppNode {
  name: string;
  relation: string;
  [key: string]: any;
}

interface TrayFillProps {
  cables?: AppCable[];
  nodes?: AppNode[];
  selectedNode?: string | null;
  onNodeSelect?: (node: string | null) => void;
}

const TrayFill: React.FC<TrayFillProps> = ({
  cables: appCables,
  nodes: appNodes,
  selectedNode: appSelectedNode,
  onNodeSelect: appOnNodeSelect
}) => {
  const [rawData, setRawData] = useState<CableData[]>([]); // Raw cables from input/prop
  const [nodeData, setNodeData] = useState<NodeData[]>([]); // Raw nodes from input/prop
  const [processedCables, setProcessedCables] = useState<CableData[]>([]); // Cables with paths calculated

  // Selection State (Internal fallback if no external handler provided)
  const [internalSelectedNode, setInternalSelectedNode] = useState<string | null>(null);

  const selectedNode = appSelectedNode !== undefined ? appSelectedNode : internalSelectedNode;
  const setSelectedNode = appOnNodeSelect || setInternalSelectedNode;

  // Configuration State
  const [fillRatioLimit, setFillRatioLimit] = useState(60);
  const [maxHeightLimit, setMaxHeightLimit] = useState(60);
  const [numberOfTiers, setNumberOfTiers] = useState(1);
  const [manualWidth, setManualWidth] = useState<number | null>(null);

  const [systemResult, setSystemResult] = useState<SystemResult | null>(null);
  const [recommendedResult, setRecommendedResult] = useState<SystemResult | null>(null); // Optimal result reference
  const [isCalculating, setIsCalculating] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dataLoadedFromProps, setDataLoadedFromProps] = useState(false);

  // --- Load Data from Props ---
  useEffect(() => {
    if (appCables && appCables.length > 0 && !dataLoadedFromProps) {
      console.log("Loading cables from App Props...", appCables.length);
      const mappedCables: CableData[] = appCables.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        od: c.od || 0,
        system: c.system,
        fromNode: c.fromNode,
        toNode: c.toNode,
        checkNode: c.checkNode,
        calculatedPath: c.calculatedPath
      }));
      setRawData(mappedCables);

      if (appNodes && appNodes.length > 0) {
        const mappedNodes: NodeData[] = appNodes.map(n => ({
          name: n.name,
          relation: n.relation
        }));
        setNodeData(mappedNodes);
      }
      setDataLoadedFromProps(true);
    }
  }, [appCables, appNodes, dataLoadedFromProps]);


  // --- Routing Logic ---
  useEffect(() => {
    // Whenever raw data changes, recalculate routes (or trust existing ones)
    if (rawData.length > 0) {
      if (nodeData.length > 0) {
        // Perform Routing locally
        // Note: If cables already came with calculatedPath, we might skip this invalidation if we trust it.
        // But re-running ensures consistency with updated node data.

        /* Optimization: Check if all have paths first? 
           For now, just re-route to be safe as passing props might be raw.
        */
        const routed = routeCables(rawData, nodeData);
        setProcessedCables(routed);
      } else {
        // No nodes provided, treat as simple list (all cables pass "everywhere" or just ignore nodes)
        setProcessedCables(rawData);
      }
    } else {
      setProcessedCables([]);
    }
  }, [rawData, nodeData]);

  // --- Filtering Cables based on Selection ---
  const activeCables = useMemo(() => {
    if (!selectedNode || nodeData.length === 0) {
      // If no node selected, or no node data, use all cables (Simple Mode)
      return processedCables;
    }
    // Filter cables that pass through the selected node
    return processedCables.filter(c => c.calculatedPath?.includes(selectedNode));
  }, [processedCables, selectedNode, nodeData]);


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

    // HTML Template (Simpliifed)
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
        
        // Add Display Index
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
        
        // Visualizer Constants
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

        // Coordinates
        const X_TRAY_START = MARGIN_LEFT_LABEL + POST_WIDTH;
        const X_TRAY_END = X_TRAY_START + TRAY_WIDTH;
        const X_POST_RIGHT_START = X_TRAY_END;
        const getTierY = (idx) => STRUCTURE_HEIGHT - 80 - (idx * TIER_PITCH);

        // --- DRAWING ---
        ctx.lineJoin = 'round';

        // 1. Posts (Background)
        ctx.fillStyle = '#f1f5f9';
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        // Left
        ctx.fillRect(MARGIN_LEFT_LABEL, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);
        ctx.strokeRect(MARGIN_LEFT_LABEL, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);
        // Right
        ctx.fillRect(X_POST_RIGHT_START, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);
        ctx.strokeRect(X_POST_RIGHT_START, 20, POST_WIDTH, STRUCTURE_HEIGHT - 20);

        // 2. Tiers (Structure Pass)
        data.tiers.forEach((tier, idx) => {
            const floorY = getTierY(idx);
            
            // Label
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '900 18px sans-serif';
            ctx.textAlign = 'start';
            ctx.fillText('LV. L' + (idx + 1), 20, floorY - 15);

            // Beam
            ctx.fillStyle = '#334155';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2;
            ctx.fillRect(X_TRAY_START, floorY, TRAY_WIDTH, BEAM_HEIGHT);
            ctx.strokeRect(X_TRAY_START, floorY, TRAY_WIDTH, BEAM_HEIGHT);

            // Limit Line
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

            // Stats
            const statsX = X_POST_RIGHT_START + POST_WIDTH + 15;
            const statsY = floorY - 40;
            
            ctx.fillStyle = '#1e293b';
            ctx.font = '900 14px sans-serif';
            ctx.fillText('Σ OD: ' + tier.totalODSum.toFixed(1), statsX, statsY);
            ctx.fillText('Σ AREA: ' + tier.totalCableArea.toFixed(0), statsX, statsY + 20);
            
            // Fill Rate Bar
            ctx.fillStyle = '#64748b';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText('FILL RATE', statsX, statsY + 35);
            
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(statsX, statsY + 40, 130, 12);
            
            const limit = ${fillRatioLimit};
            const ratio = Math.min(1, tier.fillRatio / limit);
            const isOver = tier.fillRatio > limit;
            
            ctx.fillStyle = isOver ? '#ef4444' : '#3b82f6';
            ctx.fillRect(statsX, statsY + 40, 130 * ratio, 12);
            
            ctx.fillStyle = isOver ? '#ef4444' : '#3b82f6';
            ctx.font = '900 12px sans-serif';
            ctx.fillText(tier.fillRatio.toFixed(1) + '%', statsX + 135, statsY + 50);
        });

        // 3. Cables (Cable Pass - Overlay on top of structure)
        data.tiers.forEach((tier, idx) => {
            const floorY = getTierY(idx);
            tier.cables.forEach(c => {
                const cx = X_TRAY_START + c.x;
                const safeY = Math.max(c.y, c.od / 2);
                const cy = floorY - safeY;
                
                ctx.beginPath();
                ctx.arc(cx, cy, c.od/2, 0, 2 * Math.PI);
                ctx.fillStyle = getTypeColor(c.type);
                ctx.fill();
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1.2;
                ctx.stroke();
                
                // Index Number
                ctx.fillStyle = '#000';
                ctx.font = '900 ' + Math.max(10, Math.min(c.od * 0.6, 16)) + 'px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.displayIndex, cx, cy);
            });
        });

        // 4. Dimension Lines
        const dimY = STRUCTURE_HEIGHT - 25;
        ctx.beginPath();
        ctx.moveTo(X_TRAY_START, dimY);
        ctx.lineTo(X_TRAY_END, dimY);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.moveTo(X_TRAY_START, dimY); ctx.lineTo(X_TRAY_START+10, dimY-5); ctx.lineTo(X_TRAY_START+10, dimY+5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(X_TRAY_END, dimY); ctx.lineTo(X_TRAY_END-10, dimY-5); ctx.lineTo(X_TRAY_END-10, dimY+5); ctx.fill();

        ctx.font = '900 28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('W ' + TRAY_WIDTH + ' mm', X_TRAY_START + TRAY_WIDTH/2, dimY + 30);

        // --- TABLES ---
        const tableContainer = document.getElementById('tables');
        data.tiers.forEach((tier, idx) => {
            const h = document.createElement('div');
            h.className = 'tier-header';
            h.innerText = 'Tier L' + (idx+1) + ' - Cable List';
            tableContainer.appendChild(h);

            const table = document.createElement('table');
            let rows = '<thead><tr><th width="40" style="text-align:center">NO</th><th>Cable Name</th><th>Type</th><th style="text-align:right">OD (mm)</th><th>System</th></tr></thead><tbody>';
            tier.cables.forEach(c => {
                rows += '<tr><td style="text-align:center"><span class="idx-badge">' + c.displayIndex + '</span></td><td>' + c.name + '</td><td>' + c.type + '</td><td style="text-align:right; font-family:monospace; font-weight:bold">' + c.od + '</td><td>' + (c.system || '-') + '</td></tr>';
            });
            rows += '</tbody>';
            table.innerHTML = rows;
            tableContainer.appendChild(table);
        });

    </script>
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tray_optimization_report${nodeStr}_${dateStr}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Node Inspector Logic
  const validNodes = useMemo(() => {
    // Find all unique nodes that have at least one cable passing through
    const counts: Record<string, number> = {};
    processedCables.forEach(c => {
      if (c.calculatedPath) {
        c.calculatedPath.forEach(n => {
          counts[n] = (counts[n] || 0) + 1;
        });
      }
    });
    // Also include user provided nodes even if 0 cables
    nodeData.forEach(n => {
      if (!counts[n.name]) counts[n.name] = 0;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1]) // Sort by volume (cable count)
      .map(([name, count]) => ({ name, count }));
  }, [processedCables, nodeData]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex flex-col">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white"><Box size={24} /></div>
            Tray Sizing Optimizer
          </h1>
          <p className="text-slate-500 mt-1 font-semibold text-sm italic">
            {nodeData.length > 0 ? "Route-Based Calculation Active" : "Standard Cross-Section Mode (No Routing)"}
          </p>
        </div>
        <div className="hidden md:flex flex-col items-end text-[10px] font-black uppercase text-slate-400 border-r-4 border-blue-600 pr-4 mb-1">
          <span className="flex items-center gap-1"><Mail size={12} className="text-blue-500" /> designsir@seastargo.com</span>
          <span className="tracking-widest">v3.0 Routing Integrated</span>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
          <div className="flex-1 min-h-0">
            <CableInput
              onCableDataChange={setRawData}
              onNodeDataChange={setNodeData}
            />
          </div>

          {/* Node Selector Panel - Only if Nodes exist */}
          {nodeData.length > 0 && (
            <div className="bg-white p-3 rounded-lg shadow-md border border-slate-200 flex flex-col max-h-[300px]">
              <h4 className="font-black text-slate-800 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider">
                <MapPin size={12} className="text-red-500" /> Select Node to Visualize
              </h4>
              <div className="flex-1 overflow-y-auto pr-1 space-y-1">
                <button
                  onClick={() => setSelectedNode(null)}
                  className={`w-full text-left px-3 py-2 rounded text-[10px] font-bold flex justify-between items-center transition-colors ${selectedNode === null ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                >
                  <span>ALL CABLES (Global)</span>
                  {selectedNode === null && <Check size={10} />}
                </button>
                {validNodes.map(n => (
                  <button
                    key={n.name}
                    onClick={() => setSelectedNode(n.name)}
                    className={`w-full text-left px-3 py-2 rounded text-[10px] font-bold flex justify-between items-center transition-colors ${selectedNode === n.name ? 'bg-blue-600 text-white shadow' : 'bg-white border border-slate-100 text-slate-600 hover:bg-blue-50'}`}
                  >
                    <span>{n.name}</span>
                    <span className={`px-1.5 rounded-full ${selectedNode === n.name ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'}`}>{n.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-5 rounded-lg shadow-xl border border-slate-200">
            <h4 className="font-black text-slate-800 mb-5 flex items-center gap-2 border-b pb-3 uppercase tracking-tighter text-sm">
              <Settings className="w-4 h-4 text-blue-500" /> Sizing Rules
            </h4>

            <div className="space-y-6 mb-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Layers className="w-3 h-3" /> Tray Levels (Tiers)
                  </label>
                  <button
                    onClick={autoOptimize}
                    disabled={activeCables.length === 0}
                    className={`text-[9px] font-black text-white px-2 py-1 rounded shadow flex items-center gap-1 ${activeCables.length === 0 ? 'bg-slate-300' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    <Wand2 size={10} /> Auto-Select Best
                  </button>
                </div>
                <div className="flex bg-slate-100 rounded-md p-1 border border-slate-200">
                  {[1, 2, 3, 4, 5].map(tiers => (
                    <button
                      key={tiers}
                      onClick={() => setNumberOfTiers(tiers)}
                      className={`flex-1 py-1.5 text-[10px] font-black rounded transition-all ${numberOfTiers === tiers
                          ? 'bg-white text-blue-600 shadow-md border border-slate-200'
                          : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      L{tiers}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Tray Width Override (Max 1000)</label>
                  {manualWidth !== null && (
                    <button
                      onClick={resetToAuto}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase"
                    >
                      <RefreshCw size={10} /> Reset to Auto
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustWidth(-100)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-600 transition-colors"
                    title="-100mm"
                    disabled={systemResult?.systemWidth === 100}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-center">
                    <span className={`text-sm font-black ${manualWidth !== null ? 'text-blue-600' : 'text-slate-600'}`}>
                      {systemResult?.systemWidth || 0} mm
                      {manualWidth === null && <span className="text-[9px] ml-1 opacity-50 uppercase">(Auto)</span>}
                    </span>
                  </div>
                  <button
                    onClick={() => adjustWidth(100)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-600 transition-colors"
                    title="+100mm"
                    disabled={systemResult?.systemWidth === 1000}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider">Height Limit</label>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                    {maxHeightLimit} mm
                  </span>
                </div>
                <input
                  type="range" min="40" max="100" step="5" value={maxHeightLimit}
                  onChange={(e) => setMaxHeightLimit(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-black text-slate-500 uppercase tracking-wider text-sm">용적률 (Fill Rate)</label>
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
                    {fillRatioLimit}%
                  </span>
                </div>
                <input
                  type="range" min="10" max="80" step="5" value={fillRatioLimit}
                  onChange={(e) => setFillRatioLimit(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>

            <button
              onClick={() => calculate(manualWidth, numberOfTiers)}
              disabled={isCalculating || activeCables.length === 0}
              className={`w-full py-4 px-6 rounded-lg font-black text-xs uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-3
                ${isCalculating || activeCables.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-slate-900 hover:bg-slate-800 active:scale-95 shadow-slate-200'
                }`}
            >
              {isCalculating ? "Calculating..." : "Update Optimization"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-8 h-full min-h-[500px]">
          {systemResult ? (
            <TrayVisualizer
              systemResult={systemResult}
              recommendedResult={recommendedResult}
              fillRatioLimit={fillRatioLimit}
              onApplyRecommendation={resetToAuto}
              onMatrixCellClick={handleMatrixCellClick}
              onExportHtml={exportToHtml}
            />
          ) : (
            <div className="h-full bg-white rounded-xl shadow-inner border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 p-12 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4"><Calculator className="w-10 h-10 opacity-20" /></div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Awaiting Simulation</h3>
              {nodeData.length > 0 ? (
                <p className="max-w-xs mt-2 text-[11px] font-medium leading-relaxed italic">
                  Nodes loaded. Select a Node from the left panel to calculate fill based on routed cables.
                </p>
              ) : (
                <p className="max-w-xs mt-2 text-[11px] font-medium leading-relaxed italic">
                  Upload cable data via Excel or paste manually to begin. Upload Node data to enable route-based fill calculation.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default TrayFill;
