import React from 'react';
import { SystemResult } from '../types';

interface TrayVisualizerProps {
    systemResult: SystemResult;
}

const TrayVisualizer: React.FC<TrayVisualizerProps> = ({ systemResult }) => {
    const TRAY_WIDTH = 300;
    const TRAY_HEIGHT = 60;
    const BEAM_HEIGHT = 8;
    const CABLE_MIN_RADIUS = 2;
    const SCALE = 0.8;

    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50">
            <svg
                width={TRAY_WIDTH * SCALE}
                height={TRAY_HEIGHT * SCALE}
                viewBox={`0 0 ${TRAY_WIDTH} ${TRAY_HEIGHT}`}
                className="border border-gray-200 rounded"
            >
                {/* Tray Container */}
                <rect
                    x="0"
                    y="0"
                    width={TRAY_WIDTH}
                    height={TRAY_HEIGHT}
                    fill="#f8fafc"
                    stroke="#cbd5e1"
                    strokeWidth="2"
                />

                {/* Draw Tiers */}
                {systemResult.tiers.map((tier, idx) => {
                    const pos = { x: 0, y: tier.level * (TRAY_HEIGHT / systemResult.tiers.length) };
                    const beamY = pos.y + TRAY_HEIGHT / systemResult.tiers.length - BEAM_HEIGHT;

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
                                T{idx + 1} ({tier.cables.length}개, {Math.min(100, Math.round(tier.fillRatio))}%)
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

                            {/* Draw Cables */}
                            {tier.cables.map((cable, cableIdx) => (
                                <circle
                                    key={`cable-${cableIdx}`}
                                    cx={cable.x}
                                    cy={cable.y}
                                    r={Math.max(CABLE_MIN_RADIUS, cable.od / 2)}
                                    fill={
                                        cable.color || 
                                        `hsl(${(cableIdx * 137) % 360}, 70%, 50%)`
                                    }
                                    stroke="#1e293b"
                                    strokeWidth="0.5"
                                    opacity="0.8"
                                />
                            ))}
                        </g>
                    );
                })}

                {/* System Info */}
                <text
                    x={TRAY_WIDTH / 2}
                    y={TRAY_HEIGHT - 5}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#64748b"
                >
                    Width: {systemResult.systemWidth}mm | Success: {systemResult.success ? 'YES' : 'NO'}
                </text>
            </svg>
        </div>
    );
};

export default TrayVisualizer;
