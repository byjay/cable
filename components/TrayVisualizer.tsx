import React, { useMemo } from 'react';
import { SystemResult } from '../types';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface TrayVisualizerProps {
    systemResult: SystemResult;
}

const TrayVisualizer: React.FC<TrayVisualizerProps> = ({ systemResult }) => {

    const getTypeColor = (type: string) => {
        let hash = 0;
        for (let i = 0; i < type.length; i++) {
            hash = type.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 65%, 60%)`;
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

    const totalODSum = useMemo(() => {
        return processedTiers.reduce((sum, tier) =>
            sum + tier.cables.reduce((s, c) => s + c.od, 0), 0);
    }, [processedTiers]);

    const totalCableCount = useMemo(() => {
        return processedTiers.reduce((sum, tier) => sum + tier.cables.length, 0);
    }, [processedTiers]);

    const TRAY_WIDTH = systemResult.systemWidth;
    const TRAY_HEIGHT = systemResult.maxHeightPerTier;
    const TIER_COUNT = systemResult.tiers.length;

    // Responsive layout - vertical stack for mobile, horizontal for desktop
    const BEAM_HEIGHT = 10;
    const MARGIN = 40;
    const TIER_GAP = 30;

    // Calculate viewBox dimensions
    const SINGLE_TIER_WIDTH = TRAY_WIDTH + 60;
    const SINGLE_TIER_HEIGHT = TRAY_HEIGHT + BEAM_HEIGHT + 50;

    // Desktop: horizontal, Mobile: vertical
    const isVertical = TIER_COUNT > 1; // For single tier, always horizontal

    const viewBoxWidth = isVertical
        ? SINGLE_TIER_WIDTH + MARGIN * 2
        : (SINGLE_TIER_WIDTH * TIER_COUNT) + (TIER_GAP * (TIER_COUNT - 1)) + MARGIN * 2;

    const viewBoxHeight = isVertical
        ? (SINGLE_TIER_HEIGHT * TIER_COUNT) + (TIER_GAP * (TIER_COUNT - 1)) + MARGIN * 2
        : SINGLE_TIER_HEIGHT + MARGIN * 2;

    const getTierPosition = (tierIndex: number) => {
        if (isVertical) {
            return {
                x: MARGIN,
                y: MARGIN + tierIndex * (SINGLE_TIER_HEIGHT + TIER_GAP)
            };
        } else {
            return {
                x: MARGIN + tierIndex * (SINGLE_TIER_WIDTH + TIER_GAP),
                y: MARGIN
            };
        }
    };

    return (
        <div className="h-full w-full bg-slate-100 flex flex-col overflow-hidden">

            {/* Header - Responsive */}
            <div className="bg-slate-800 text-white px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 sm:gap-4">
                    <span className="text-sm sm:text-base font-black">W{TRAY_WIDTH}</span>
                    <span className="text-xs text-slate-400">H{TRAY_HEIGHT}</span>
                    <span className="text-xs text-slate-400 hidden sm:inline">• {TIER_COUNT}단</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <span className="text-[10px] sm:text-xs text-slate-400">
                        {totalCableCount}개 | Σ{totalODSum.toFixed(0)}
                    </span>
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${systemResult.success ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                        {systemResult.success ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                        {systemResult.success ? 'OK' : '!'}
                    </div>
                </div>
            </div>

            {/* SVG Container - Scales to fit */}
            <div className="flex-1 overflow-hidden p-2 sm:p-4 flex items-center justify-center">
                <svg
                    className="w-full h-full bg-white rounded shadow border border-slate-200"
                    viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {processedTiers.map((tier, idx) => {
                        const pos = getTierPosition(idx);
                        const beamY = pos.y + TRAY_HEIGHT;

                        return (
                            <g key={`tier-${idx}`}>
                                {/* Tier Label */}
                                <text
                                    x={pos.x + TRAY_WIDTH / 2}
                                    y={pos.y - 8}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="900"
                                    fill="#334155"
                                >
                                    {`T${idx + 1} (${tier.cables.length}개, ${Math.min(100, Math.round(tier.fillRatio))}%)`}
                                </text>

                                {/* Tray Beam */}
                                <rect
                                    x={pos.x}
                                    y={beamY}
                                    width={TRAY_WIDTH}
                                    height={BEAM_HEIGHT}
                                    fill="#475569"
                                    stroke="#1e293b"
                                    strokeWidth="1"
                                />

                                {/* Side walls */}
                                <rect x={pos.x - 5} y={pos.y - 5} width={5} height={TRAY_HEIGHT + BEAM_HEIGHT + 10} fill="#64748b" />
                                <rect x={pos.x + TRAY_WIDTH} y={pos.y - 5} width={5} height={TRAY_HEIGHT + BEAM_HEIGHT + 10} fill="#64748b" />

                                {/* Height limit */}
                                <line
                                    x1={pos.x} y1={pos.y}
                                    x2={pos.x + TRAY_WIDTH} y2={pos.y}
                                    stroke="#ef4444" strokeWidth="1" strokeDasharray="3,2"
                                />

                                {/* Cables */}
                                {
                                    tier.cables.map((c) => {
                                        const r = c.od / 2;
                                        const cx = pos.x + c.x;
                                        const cy = beamY - c.y;

                                        return (
                                            <g key={c.id}>
                                                <circle
                                                    cx={cx} cy={cy} r={r}
                                                    fill={getTypeColor(c.type)}
                                                    stroke="#1e293b" strokeWidth="0.5"
                                                />
                                                <text
                                                    x={cx} y={cy}
                                                    fontSize={Math.max(Math.min(c.od * 0.35, 8), 4)}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fill="#000"
                                                    fontWeight="900"
                                                >
                                                    {c.displayIndex}
                                                </text>
                                            </g>
                                        );
                                    })
                                }

                                {/* Width label */}
                                <text
                                    x={pos.x + TRAY_WIDTH / 2}
                                    y={beamY + BEAM_HEIGHT + 18}
                                    textAnchor="middle"
                                    fontSize="10"
                                    fontWeight="bold"
                                    fill="#000"
                                >
                                    {TRAY_WIDTH}mm
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div >
    );
};

export default TrayVisualizer;
