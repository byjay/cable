import React, { useRef } from 'react';
import { Upload, FileSpreadsheet, Database } from 'lucide-react';

interface ImportPanelProps {
    onImportFiles: (files: FileList) => void;
    isLoading?: boolean;
}

const ImportPanel: React.FC<ImportPanelProps> = ({ onImportFiles, isLoading }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            onImportFiles(e.dataTransfer.files);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onImportFiles(e.target.files);
        }
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <h2 className="text-xl font-bold text-seastar-cyan mb-4 flex items-center gap-2">
                <Upload size={20} /> Import Data
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onClick={() => fileInputRef.current?.click()}
                    className="glass-panel p-8 rounded-lg border-2 border-dashed border-seastar-700 hover:border-seastar-cyan cursor-pointer transition flex flex-col items-center justify-center"
                >
                    <FileSpreadsheet size={64} className="text-seastar-cyan mb-4 opacity-50" />
                    <div className="text-lg font-bold text-white mb-2">Drop Excel Files Here</div>
                    <div className="text-sm text-gray-400 text-center mb-4">
                        or click to browse files
                    </div>
                    <div className="text-xs text-gray-500">
                        Supported: .xlsx, .xls (Cable Schedule, Node List, Cable Type)
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                </div>

                {/* Import Instructions */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                        <Database size={16} /> File Types & Naming Convention
                    </h3>

                    <div className="space-y-4 text-sm">
                        <div className="bg-seastar-800 p-3 rounded-lg">
                            <div className="font-bold text-blue-400 mb-1">Cable Schedule</div>
                            <div className="text-gray-400 text-xs">
                                File name should contain: <span className="text-white font-mono">sch</span> or <span className="text-white font-mono">cable</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                Required columns: CABLE_NAME, FROM_NODE, TO_NODE, CABLE_TYPE
                            </div>
                        </div>

                        <div className="bg-seastar-800 p-3 rounded-lg">
                            <div className="font-bold text-green-400 mb-1">Node List</div>
                            <div className="text-gray-400 text-xs">
                                File name should contain: <span className="text-white font-mono">node</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                Required columns: POINT, RELATION, LINK_LENGTH
                            </div>
                        </div>

                        <div className="bg-seastar-800 p-3 rounded-lg">
                            <div className="font-bold text-yellow-400 mb-1">Cable Type</div>
                            <div className="text-gray-400 text-xs">
                                File name should contain: <span className="text-white font-mono">type</span>
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                Required columns: COMP_NAME, CABLE_OUTDIA
                            </div>
                        </div>
                    </div>

                    {isLoading && (
                        <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg text-yellow-400 text-sm animate-pulse">
                            Processing files...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportPanel;
