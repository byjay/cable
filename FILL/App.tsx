import React, { useState, useCallback, useEffect, useRef } from 'react';
import CableInput from './components/CableInput';
import TrayVisualizer from './components/TrayVisualizer';
import { solveSystem, solveSystemAtWidth } from './services/solver';
import { CableData, SystemResult } from './types';
import { Layers, Box, ChevronLeft, ChevronRight, RefreshCw, Play, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [cableData, setCableData] = useState<CableData[]>([]);
  const [showDataInput, setShowDataInput] = useState(false);

  // Configuration State
  const [fillRatioLimit, setFillRatioLimit] = useState(40);
  const [maxHeightLimit, setMaxHeightLimit] = useState(60);
  const [numberOfTiers, setNumberOfTiers] = useState(1);
  const [manualWidth, setManualWidth] = useState<number | null>(null);

  const [systemResult, setSystemResult] = useState<SystemResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const calculate = useCallback((overrideWidth: number | null = null) => {
    if (cableData.length === 0) return;

    setIsCalculating(true);

    setTimeout(() => {
      let solution: SystemResult;
      if (overrideWidth !== null) {
        solution = solveSystemAtWidth(cableData, numberOfTiers, overrideWidth, maxHeightLimit, fillRatioLimit);
      } else {
        solution = solveSystem(cableData, numberOfTiers, maxHeightLimit, fillRatioLimit);
      }
      setSystemResult(solution);
      setIsCalculating(false);
      setShowDataInput(false); // Close data input on mobile after calculation
    }, 10);
  }, [cableData, maxHeightLimit, fillRatioLimit, numberOfTiers]);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (cableData.length > 0) {
      setIsCalculating(true);
      timeoutRef.current = setTimeout(() => {
        setManualWidth(null);
        calculate(null);
      }, 400);
    }
  }, [fillRatioLimit, maxHeightLimit, numberOfTiers, cableData, calculate]);

  const adjustWidth = (delta: number) => {
    const currentW = systemResult?.systemWidth || 100;
    const nextW = Math.max(100, currentW + delta);
    setManualWidth(nextW);
    calculate(nextW);
  };

  const resetToAuto = () => {
    setManualWidth(null);
    calculate(null);
  };

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">

      {/* TOP BAR - Responsive */}
      <header className="bg-slate-900 text-white px-2 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0 z-20">

        {/* Left: Logo + Data Toggle (Mobile) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDataInput(!showDataInput)}
            className="p-1.5 bg-slate-800 rounded sm:hidden"
          >
            {showDataInput ? <X size={16} /> : <Menu size={16} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-600 rounded flex items-center justify-center">
              <Box size={14} className="sm:w-4 sm:h-4" />
            </div>
            <span className="text-sm sm:text-lg font-black">FILL</span>
          </div>
        </div>

        {/* Right: Controls - Compact on mobile */}
        <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto">

          {/* Tier Levels */}
          <div className="flex bg-slate-800 rounded p-0.5">
            {[1, 2, 3].map(tiers => (
              <button
                key={tiers}
                onClick={() => setNumberOfTiers(tiers)}
                className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black rounded ${numberOfTiers === tiers
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400'
                  }`}
              >
                {tiers}단
              </button>
            ))}
          </div>

          {/* Height - Hidden on very small screens */}
          <div className="hidden xs:flex items-center gap-1 bg-slate-800 rounded px-2 py-1">
            <span className="text-[9px] text-slate-400">H</span>
            <input
              type="range" min="40" max="100" step="5" value={maxHeightLimit}
              onChange={(e) => setMaxHeightLimit(parseInt(e.target.value))}
              className="w-12 sm:w-16 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[9px] font-bold text-blue-400">{maxHeightLimit}</span>
          </div>

          {/* Fill Rate */}
          <div className="flex items-center gap-1 bg-slate-800 rounded px-2 py-1">
            <span className="text-[9px] text-slate-400">F</span>
            <input
              type="range" min="10" max="60" step="5" value={fillRatioLimit}
              onChange={(e) => setFillRatioLimit(parseInt(e.target.value))}
              className="w-12 sm:w-16 h-1 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[9px] font-bold text-blue-400">{fillRatioLimit}%</span>
          </div>

          {/* Width Override */}
          <div className="flex items-center gap-0.5 bg-slate-800 rounded p-0.5">
            <button onClick={() => adjustWidth(-100)} className="p-1 text-slate-400 hover:text-white">
              <ChevronLeft size={12} />
            </button>
            <span className={`text-[9px] font-bold min-w-[35px] text-center ${manualWidth ? 'text-blue-400' : 'text-slate-300'}`}>
              {systemResult?.systemWidth || 0}
            </span>
            <button onClick={() => adjustWidth(100)} className="p-1 text-slate-400 hover:text-white">
              <ChevronRight size={12} />
            </button>
            {manualWidth && (
              <button onClick={resetToAuto} className="p-0.5 text-yellow-400">
                <RefreshCw size={10} />
              </button>
            )}
          </div>

          {/* Calculate */}
          <button
            onClick={() => calculate(manualWidth)}
            disabled={isCalculating || cableData.length === 0}
            className={`px-2 sm:px-3 py-1 rounded font-black text-[9px] sm:text-[10px] flex items-center gap-1 ${isCalculating || cableData.length === 0
              ? 'bg-slate-700 text-slate-500'
              : 'bg-blue-600 text-white'
              }`}
          >
            <Play size={10} />
            <span className="hidden sm:inline">{isCalculating ? "..." : "계산"}</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* Data Input - Show/hide instantly */}
        {showDataInput && (
          <>
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 z-10 sm:hidden"
              onClick={() => setShowDataInput(false)}
            />
            {/* Panel */}
            <div className="absolute sm:relative z-20 w-[85%] sm:w-72 md:w-80 h-full bg-white border-r border-slate-300 flex flex-col overflow-hidden shadow-xl sm:shadow-none">
              <CableInput onDataChange={setCableData} />
            </div>
          </>
        )}

        {/* Desktop sidebar - always visible */}
        <div className="hidden sm:flex w-72 md:w-80 h-full bg-white border-r border-slate-300 flex-col overflow-hidden">
          <CableInput onDataChange={setCableData} />
        </div>

        {/* Visualization */}
        <div className="flex-1 overflow-hidden">
          {systemResult ? (
            <TrayVisualizer
              systemResult={systemResult}
              fillRatioLimit={fillRatioLimit}
            />
          ) : (
            <div className="h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
              <Box className="w-12 h-12 opacity-20 mb-3" />
              <h3 className="text-xs sm:text-sm font-black uppercase">데이터를 입력하세요</h3>
              <p className="text-[10px] sm:text-xs mt-1">
                <button
                  onClick={() => setShowDataInput(true)}
                  className="text-blue-500 underline sm:hidden"
                >
                  메뉴 열기
                </button>
                <span className="hidden sm:inline">왼쪽에서 Excel 업로드 또는 직접 입력</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
