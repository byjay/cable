import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { solveSystem, solveSystemAtWidth } from '../services/trayFillSolver';
import { routeCables } from '../services/routingService';
import { CableData, SystemResult, NodeData } from '../types/trayFillTypes';
import { Box, Mail, ChevronLeft, ChevronRight, RefreshCw, Wand2, Settings, Layers, Info, Calculator, MapPin, Check } from 'lucide-react';

interface TrayFillProps {
  cables: CableData[];
  nodes: NodeData[];
  selectedNode?: string;
  onNodeSelect?: (nodeId: string) => void;
}

const TrayFill: React.FC<TrayFillProps> = ({ 
  cables, 
  nodes, 
  selectedNode,
  onNodeSelect 
}) => {
  const [processedCables, setProcessedCables] = useState<CableData[]>([]);
  
  // Configuration State
  const [fillRatioLimit, setFillRatioLimit] = useState(60); 
  const [maxHeightLimit, setMaxHeightLimit] = useState(60);
  const [numberOfTiers, setNumberOfTiers] = useState(1);
  const [manualWidth, setManualWidth] = useState<number | null>(null);

  const [systemResult, setSystemResult] = useState<SystemResult | null>(null);
  const [recommendedResult, setRecommendedResult] = useState<SystemResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Routing Logic ---
  useEffect(() => {
    // Whenever cables change, recalculate routes
    if (cables.length > 0) {
      if (nodes.length > 0) {
        // Perform Routing
        console.log("Routing cables...");
        const routed = routeCables(cables, nodes);
        setProcessedCables(routed);
      } else {
        // No nodes provided, treat as simple list (all cables pass "everywhere")
        setProcessedCables(cables);
      }
    } else {
      setProcessedCables([]);
    }
  }, [cables, nodes]);

  // --- Filtering Cables based on Selection ---
  const activeCables = useMemo(() => {
    if (!selectedNode || nodes.length === 0) {
      // If no node selected, or no node data, use all cables (Simple Mode)
      return processedCables;
    }
    // Filter cables that pass through the selected node
    return processedCables.filter(c => c.calculatedPath?.includes(selectedNode));
  }, [processedCables, selectedNode, nodes]);

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

  const getTypeColor = (type: string, idStr: string) => {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
      hash = type.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 85%, 70%)`; 
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Layers className="text-blue-600" />
          케이블 트레이 최적화 시스템
        </h2>
        
        {/* Node Selection */}
        {nodes.length > 0 && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              노드 선택 (선택사항)
            </label>
            <select
              value={selectedNode || ''}
              onChange={(e) => onNodeSelect?.(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">모든 케이블</option>
              {nodes.map(node => (
                <option key={node.name} value={node.name}>
                  {node.name}
                </option>
              ))}
            </select>
            {selectedNode && (
              <div className="mt-2 text-sm text-gray-600">
                선택된 노드: {selectedNode} ({activeCables.length}개 케이블)
              </div>
            )}
          </div>
        )}

        {/* Configuration Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최대 높이 (mm)
            </label>
            <input
              type="number"
              value={maxHeightLimit}
              onChange={(e) => setMaxHeightLimit(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="10"
              max="500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              채움률 제한 (%)
            </label>
            <input
              type="number"
              value={fillRatioLimit}
              onChange={(e) => setFillRatioLimit(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="10"
              max="100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              티어 수
            </label>
            <input
              type="number"
              value={numberOfTiers}
              onChange={(e) => setNumberOfTiers(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded-md"
              min="1"
              max="6"
            />
          </div>
        </div>

        {/* Results */}
        {systemResult && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">최적화 결과</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">시스템 폭:</span>
                  <span className="ml-2 font-bold">{systemResult.systemWidth}mm</span>
                </div>
                <div>
                  <span className="text-gray-600">티어 수:</span>
                  <span className="ml-2 font-bold">{systemResult.tiers.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">최대 채움률:</span>
                  <span className="ml-2 font-bold">
                    {Math.max(...systemResult.tiers.map(t => t.fillRatio)).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">상태:</span>
                  <span className={`ml-2 font-bold ${systemResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {systemResult.success ? '성공' : '실패'}
                  </span>
                </div>
              </div>
            </div>

            {/* Cable List */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">
                케이블 목록 ({activeCables.length}개)
              </h3>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 text-left">ID</th>
                      <th className="p-2 text-left">이름</th>
                      <th className="p-2 text-left">타입</th>
                      <th className="p-2 text-left">OD</th>
                      <th className="p-2 text-left">시스템</th>
                      <th className="p-2 text-left">From</th>
                      <th className="p-2 text-left">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCables.map((cable, index) => (
                      <tr key={cable.id} className="border-b">
                        <td className="p-2">{index + 1}</td>
                        <td className="p-2">{cable.name}</td>
                        <td className="p-2">
                          <span 
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: getTypeColor(cable.type, cable.id) }}
                          />
                          <span className="ml-1">{cable.type}</span>
                        </td>
                        <td className="p-2">{cable.od}mm</td>
                        <td className="p-2">{cable.system || '-'}</td>
                        <td className="p-2">{cable.fromNode || '-'}</td>
                        <td className="p-2">{cable.toNode || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {isCalculating && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin text-blue-600 mr-2" />
            <span>계산 중...</span>
          </div>
        )}

        {!systemResult && !isCalculating && activeCables.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Box className="mx-auto mb-2" size={48} />
            <p>데이터가 없습니다. 케이블을 선택해주세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrayFill;
