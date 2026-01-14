import React, { useState, useRef } from 'react';
import { Ship, Upload, X, Database, AlertTriangle, FileUp } from 'lucide-react';

interface ShipSelectionModalProps {
    onCancel: () => void;
    onLoadParsed?: (shipId: string) => void; // Updated signature
    onFileUpload?: (files: FileList) => void;
    availableShips: { id: string, name: string }[];
}

const ShipSelectionModal: React.FC<ShipSelectionModalProps> = ({ onCancel, onLoadParsed, onFileUpload, availableShips }) => {
    const [mode, setMode] = useState<'SELECT' | 'UPLOAD'>('SELECT');

    // File References
    const cableFileRef = useRef<HTMLInputElement>(null);
    const nodeFileRef = useRef<HTMLInputElement>(null);

    const handleDirectLoad = () => {
        if (onLoadParsed) onLoadParsed();
    };

    const handleUpload = () => {
        if (cableFileRef.current?.files?.length && nodeFileRef.current?.files?.length) {
            // Combine files into a DataTransfer list to mimic the original signature if needed, or pass array
            const dt = new DataTransfer();
            dt.items.add(cableFileRef.current.files[0]);
            dt.items.add(nodeFileRef.current.files[0]);

            if (onFileUpload) {
                onFileUpload(dt.files);
            }
        } else {
            alert("필수: 케이블 리스트와 노드 리스트를 모두 업로드해야 합니다.\n\nRequired: Both Cable List and Node List are mandatory for parsing.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-slate-900 px-10 py-8 flex justify-between items-center border-b border-white/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-transparent"></div>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                            <Ship className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Load Project Data</h3>
                            <p className="text-blue-200 text-sm font-medium mt-1">Select source or upload files</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="text-slate-400 hover:text-white transition-colors relative z-10 p-2 hover:bg-white/10 rounded-full">
                        <X size={28} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-10 bg-slate-50 min-h-[400px]">
                    {/* Tab Selection */}
                    <div className="flex gap-6 mb-10">
                        <button
                            onClick={() => setMode('SELECT')}
                            className={`flex-1 py-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-300 ${mode === 'SELECT'
                                ? 'border-blue-500 bg-white shadow-xl shadow-blue-200/50 scale-[1.02]'
                                : 'border-slate-200 bg-white/50 hover:border-blue-200 text-slate-400 hover:bg-white'
                                }`}
                        >
                            <div className={`p-4 rounded-full ${mode === 'SELECT' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Database size={32} />
                            </div>
                            <div>
                                <span className={`font-bold block text-lg ${mode === 'SELECT' ? 'text-slate-800' : 'text-slate-500'}`}>Existing Project</span>
                                <span className="text-xs text-slate-400 font-medium">Load pre-parsed data</span>
                            </div>
                        </button>

                        <button
                            onClick={() => setMode('UPLOAD')}
                            className={`flex-1 py-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all duration-300 ${mode === 'UPLOAD'
                                ? 'border-green-500 bg-white shadow-xl shadow-green-200/50 scale-[1.02]'
                                : 'border-slate-200 bg-white/50 hover:border-green-200 text-slate-400 hover:bg-white'
                                }`}
                        >
                            <div className={`p-4 rounded-full ${mode === 'UPLOAD' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                <Upload size={32} />
                            </div>
                            <div>
                                <span className={`font-bold block text-lg ${mode === 'UPLOAD' ? 'text-slate-800' : 'text-slate-500'}`}>Upload Excel</span>
                                <span className="text-xs text-slate-400 font-medium">Process new project files</span>
                            </div>
                        </button>
                    </div>

                    {/* MODE: EXISTING PROJECT */}
                    {mode === 'SELECT' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                <h4 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    Ready to Load
                                </h4>
                                <div className="space-y-3">
                                    {availableShips.map(ship => (
                                        <button
                                            key={ship.id}
                                            onClick={() => onLoadParsed?.(ship.id)}
                                            className="w-full flex items-center justify-between p-5 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-500 hover:bg-white hover:shadow-lg transition-all group duration-300"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors">
                                                    <Ship size={24} />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-black text-lg text-slate-800 group-hover:text-blue-600 transition-colors">{ship.id}</div>
                                                    <div className="text-xs text-slate-500 font-medium">{ship.name}</div>
                                                </div>
                                            </div>
                                            <div className="px-5 py-2 bg-blue-100 text-blue-700 text-sm font-bold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-[-5px]">
                                                LOAD DATA
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="text-xs text-center text-slate-400 font-medium">
                                * Parsed data is loaded directly from local storage or server.
                            </p>
                        </div>
                    )}

                    {/* MODE: UPLOAD EXCEL */}
                    {mode === 'UPLOAD' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex gap-4">
                                <AlertTriangle className="text-amber-600 shrink-0" size={24} />
                                <div className="text-sm text-amber-900 leading-relaxed">
                                    <span className="font-bold block mb-1 text-amber-700 uppercase tracking-wide">Requirement Check</span>
                                    For accurate routing calculations, you must upload both the <strong>Cable List</strong> and <strong>Node List</strong> simultaneously.
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="group">
                                    <label className="block text-sm font-bold text-slate-700 mb-3 ml-1 group-hover:text-blue-600 transition-colors">1. Node List (Excel)</label>
                                    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 group-hover:border-blue-400 bg-white transition-colors">
                                        <input
                                            type="file"
                                            ref={nodeFileRef}
                                            accept=".xlsx,.xls,.csv"
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-4 file:px-6 file:border-0 file:text-sm file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-blue-50 hover:file:text-blue-700 transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="block text-sm font-bold text-slate-700 mb-3 ml-1 group-hover:text-green-600 transition-colors">2. Cable List (Excel)</label>
                                    <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 group-hover:border-green-400 bg-white transition-colors">
                                        <input
                                            type="file"
                                            ref={cableFileRef}
                                            accept=".xlsx,.xls,.csv"
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-4 file:px-6 file:border-0 file:text-sm file:font-bold file:bg-slate-50 file:text-slate-700 hover:file:bg-green-50 hover:file:text-green-700 transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                className="w-full py-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-black text-lg rounded-2xl shadow-xl shadow-green-900/10 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 mt-4"
                            >
                                <FileUp size={24} />
                                PARSE & LOAD PROJECT
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShipSelectionModal;
