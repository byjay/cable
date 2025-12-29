import React, { useState, useRef } from 'react';
import { Cable } from '../types';
import { Play, Download, Loader2, AlertCircle, FileText, CheckCircle, Upload, Ship, ArrowRight, Save } from 'lucide-react';

// Hardcoded for now, should come from props or API
const AVAILABLE_SHIPS = [
    { id: "S1001_35K_FD", name: "S1001 - 35K Product Carrier" },
    { id: "S1002_LNG", name: "S1002 - 174K LNG Carrier" },
    { id: "H5500_CONT", name: "H5500 - 16K TEU Container" },
    { id: "K2024_FERRY", name: "K2024 - Passenger Ferry" }
];

interface ExtractionSummary {
    total_count: number;
    system_distribution: Record<string, number>;
    potential_misses: string[];
    processing_time_ms: number;
    ship_metadata: {
        hull_no: string;
        ship_type: string;
    };
    cables: any[]; // Use any to avoid strict type checks initially, will map to Cable
}

interface WDExtractionViewProps {
    onImportCables: (cables: Cable[]) => void;
    currentShipId: string;
}

const WDExtractionView: React.FC<WDExtractionViewProps> = ({ onImportCables, currentShipId }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedShipId, setSelectedShipId] = useState(currentShipId);

    const [isLoading, setIsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<ExtractionSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

    // Reset state when ship selection changes
    React.useEffect(() => {
        setUploadedFiles([]);
        setResult(null);
        setError(null);
        setStep(1);
        // We don't automatically update parent ship ID until import confirmation
    }, [selectedShipId]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);

            const response = await fetch(`http://localhost:8000/api/upload/${selectedShipId}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed");

            setUploadedFiles(prev => [...prev, e.target.files![0].name]);
        } catch (err) {
            setError("Failed to upload file. Check connection.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRunExtraction = async () => {
        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await fetch(`http://localhost:8000/api/extract/${selectedShipId}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error(`Server Error: ${response.statusText}`);
            }

            const data = await response.json();
            setResult(data);
            setStep(3);
        } catch (err) {
            console.error(err);
            setError("Failed to connect to Extraction Backend.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyToProject = () => {
        if (!result) return;

        // Map backend format to frontend Cable format (CLEAN MAPPING)
        const mappedCables = result.cables.map((c: any) => ({
            id: c.cable_name,
            name: c.cable_name,
            type: c.cable_type,
            od: 0,
            length: 0,
            system: c.system || c.cable_name[0] || 'U',
            fromDeck: c.from_room || '',
            fromNode: c.from_node || '', // Correctly populated from backend
            fromRoom: c.from_room,
            fromEquip: c.from_equip,
            toDeck: c.to_room || '',
            toNode: c.to_node || '', // Correctly populated from backend
            toRoom: c.to_room,
            toEquip: c.to_equip,
            page: String(c.page_number)
        }));

        if (window.confirm(`Are you sure you want to overwrite project data for ${selectedShipId} with ${mappedCables.length} cables?`)) {
            onImportCables(mappedCables);
        }
    };

    return (
        <div className="p-6 bg-seastar-900 min-h-full text-white font-sans">
            <div className="flex justify-between items-center mb-8 border-b border-seastar-700 pb-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="text-seastar-cyan" />
                    Ship Data Importer
                </h1>
                <div className="flex items-center gap-4 text-sm">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${step >= 1 ? 'bg-seastar-cyan text-seastar-900 font-bold' : 'bg-seastar-800 text-gray-500'}`}>1. Select Ship</div>
                    <ArrowRight size={14} className="text-gray-600" />
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${step >= 2 ? 'bg-seastar-cyan text-seastar-900 font-bold' : 'bg-seastar-800 text-gray-500'}`}>2. Upload</div>
                    <ArrowRight size={14} className="text-gray-600" />
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${step >= 3 ? 'bg-seastar-cyan text-seastar-900 font-bold' : 'bg-seastar-800 text-gray-500'}`}>3. Review & Apply</div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">

                {/* STEP 1: SHIP SELECTION */}
                <div className={`bg-seastar-800 p-6 rounded-lg border ${step === 1 ? 'border-seastar-cyan shadow-lg shadow-cyan-900/20' : 'border-seastar-700 opacity-50'}`}>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Ship /> Target Ship</h3>
                    <div className="flex gap-4">
                        <select
                            value={selectedShipId}
                            onChange={(e) => setSelectedShipId(e.target.value)}
                            disabled={step > 1}
                            className="bg-seastar-900 border border-seastar-600 rounded px-4 py-2 text-white flex-1"
                        >
                            {AVAILABLE_SHIPS.map(ship => (
                                <option key={ship.id} value={ship.id}>{ship.name}</option>
                            ))}
                        </select>
                        {step === 1 && (
                            <button
                                onClick={() => setStep(2)}
                                className="bg-seastar-cyan hover:bg-cyan-400 text-seastar-900 px-6 py-2 rounded font-bold"
                            >
                                Confirm & Next
                            </button>
                        )}
                        {step > 1 && (
                            <button onClick={() => setStep(1)} className="text-sm text-gray-400 hover:text-white underline">Change</button>
                        )}
                    </div>
                </div>

                {/* STEP 2: UPLOAD */}
                {step >= 2 && (
                    <div className={`bg-seastar-800 p-6 rounded-lg border ${step === 2 ? 'border-seastar-cyan shadow-lg shadow-cyan-900/20' : 'border-seastar-700'}`}>
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Upload /> Upload Drawings</h3>

                        <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center bg-seastar-900/50 hover:bg-seastar-900/80 transition-colors">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                className="hidden"
                                accept=".pdf"
                            />
                            <div className="flex flex-col items-center gap-2">
                                <FileText size={48} className="text-gray-500" />
                                <p className="text-gray-400">Drag & Drop PDF here or</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="bg-seastar-700 hover:bg-seastar-600 px-4 py-2 rounded text-white flex items-center gap-2"
                                >
                                    {uploading ? <Loader2 className="animate-spin" /> : <Upload size={16} />}
                                    Browse Files
                                </button>
                            </div>
                        </div>

                        {uploadedFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <div className="text-xs font-bold text-gray-400 uppercase">Uploaded Files ({uploadedFiles.length})</div>
                                {uploadedFiles.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm bg-seastar-900 p-2 rounded border border-seastar-700">
                                        <CheckCircle size={14} className="text-green-500" />
                                        {f}
                                    </div>
                                ))}
                            </div>
                        )}

                        {step === 2 && uploadedFiles.length > 0 && (
                            <div className="mt-6 flex justify-end">
                                <button
                                    onClick={handleRunExtraction}
                                    disabled={isLoading}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded font-bold flex items-center gap-2 shadow-lg"
                                >
                                    {isLoading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                                    Analyze & Extract
                                </button>
                            </div>
                        )}
                        {error && <div className="mt-4 text-red-400 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>}
                    </div>
                )}

                {/* STEP 3: RESULT */}
                {result && step === 3 && (
                    <div className="bg-seastar-800 p-6 rounded-lg border border-green-500 shadow-lg shadow-green-900/20 animate-in slide-in-from-bottom-4">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400"><CheckCircle /> Extraction Complete</h3>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-seastar-900 p-4 rounded border border-seastar-700 text-center">
                                <div className="text-3xl font-bold text-white">{result.total_count}</div>
                                <div className="text-xs text-gray-400 uppercase mt-1">Total Cables</div>
                            </div>
                            <div className="bg-seastar-900 p-4 rounded border border-seastar-700 text-center">
                                <div className="text-xl font-bold text-white text-ellipsis overflow-hidden">{result.ship_metadata.hull_no || "N/A"}</div>
                                <div className="text-xs text-gray-400 uppercase mt-1">Detected Hull No</div>
                            </div>
                            <div className="bg-seastar-900 p-4 rounded border border-seastar-700 text-center">
                                <div className={`text-3xl font-bold ${result.potential_misses.length > 0 ? 'text-yellow-500' : 'text-green-500'}`}>{result.potential_misses.length}</div>
                                <div className="text-xs text-gray-400 uppercase mt-1">Potential Misses</div>
                            </div>
                        </div>

                        {result.potential_misses.length > 0 && (
                            <div className="mb-6 bg-yellow-900/20 border border-yellow-900/50 p-4 rounded max-h-40 overflow-y-auto custom-scrollbar">
                                <div className="text-xs font-bold text-yellow-500 mb-2 sticky top-0 bg-transparent">WARNING: Verify these patterns</div>
                                {result.potential_misses.map((m, i) => (
                                    <div key={i} className="text-xs text-yellow-200 font-mono border-b border-yellow-900/30 py-1 last:border-0">{m}</div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end gap-4">
                            <button
                                onClick={() => { setStep(2); setResult(null); }}
                                className="px-6 py-3 border border-gray-600 text-gray-300 rounded hover:bg-seastar-700"
                            >
                                Cancel / Retry
                            </button>
                            <button
                                onClick={handleApplyToProject}
                                className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-bold flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                            >
                                <Save size={20} />
                                CONFIRM & APPLY CHANGE
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WDExtractionView;
