import React, { useState } from 'react';
import { Ship, Lock, Unlock, Database } from 'lucide-react';

interface ShipOption {
    id: string;
    name: string;
}

interface ShipSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (shipId: string) => void;
    availableShips: ShipOption[];
}

const ShipSelectionModal: React.FC<ShipSelectionModalProps> = ({ isOpen, onClose, onSelect, availableShips }) => {
    const [selectedShipId, setSelectedShipId] = useState<string>('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (!selectedShipId) {
            setError('Please select a ship project.');
            return;
        }

        // Simple mock password check for demonstration (can be replaced with real auth)
        // For now, any non-empty password allows access, or specific logic
        if (password.trim() === '') {
            setError('Password is required for access.');
            return;
        }

        if (password === 'admin' || password === '1234') { // Mock passwords
            onSelect(selectedShipId);
            onClose();
        } else {
            setError('Invalid password. Access denied.');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-[#1e293b] border border-cyan-500/30 rounded-lg shadow-2xl w-[480px] text-gray-100 overflow-hidden">
                <div className="bg-cyan-950/50 px-6 py-4 border-b border-cyan-500/30 flex items-center gap-3">
                    <Database className="w-5 h-5 text-cyan-400" />
                    <h2 className="text-lg font-bold text-cyan-100">Load Project Data</h2>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-blue-900/20 p-4 rounded border border-blue-500/20 text-sm text-blue-200">
                        <p>Select a ship project to load data. Use authorized credentials to access project files.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Select Project (Ship)</label>
                            <div className="grid grid-cols-1 gap-2">
                                {availableShips.map(ship => (
                                    <button
                                        key={ship.id}
                                        onClick={() => setSelectedShipId(ship.id)}
                                        className={`flex items-center gap-3 px-4 py-3 rounded border text-left transition-all ${selectedShipId === ship.id
                                                ? 'bg-cyan-600/20 border-cyan-500 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                                : 'bg-slate-800 border-slate-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                            }`}
                                    >
                                        <Ship className={`w-5 h-5 ${selectedShipId === ship.id ? 'text-cyan-400' : 'text-gray-500'}`} />
                                        <div>
                                            <div className="font-medium">{ship.id}</div>
                                            <div className="text-xs opacity-70">{ship.name}</div>
                                        </div>
                                        {selectedShipId === ship.id && <div className="ml-auto text-cyan-400">●</div>}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">Access Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    className="w-full bg-slate-900 border border-slate-700 rounded px-10 py-2.5 text-gray-100 placeholder-gray-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                                    placeholder="Enter project password..."
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs bg-red-950/30 p-2 rounded border border-red-900/50 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 block"></span>
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-900/50 border-t border-slate-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded font-medium shadow-lg shadow-cyan-900/20 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Unlock className="w-4 h-4" />
                        Access & Load Data
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShipSelectionModal;
