import React, { useState } from 'react';
import { Ship, Anchor, Save } from 'lucide-react';

interface ShipConfig {
    id: string;
    name: string;
    type: string;
    length: number;
    beam: number;
    draft: number;
    decks: number;
    description: string;
}

interface ShipDefinitionProps {
    currentShipId: string;
    onShipChange: (shipId: string) => void;
}

const MOCK_SHIPS: ShipConfig[] = [
    { id: 'S1001_35K_FD', name: '35K FD VESSEL', type: 'FPSO', length: 280, beam: 58, draft: 22, decks: 8, description: '35,000 ton class FPSO vessel' },
    { id: 'S1002_50K_DRILL', name: '50K DRILL SHIP', type: 'Drillship', length: 320, beam: 62, draft: 25, decks: 10, description: '50,000 ton class drilling ship' },
    { id: 'S1003_JACK_UP', name: 'JACK-UP RIG', type: 'Jack-up', length: 120, beam: 90, draft: 8, decks: 5, description: 'Jack-up drilling rig' },
];

const ShipDefinition: React.FC<ShipDefinitionProps> = ({ currentShipId, onShipChange }) => {
    const [ships] = useState<ShipConfig[]>(MOCK_SHIPS);
    const [selectedShip, setSelectedShip] = useState<ShipConfig | null>(
        ships.find(s => s.id === currentShipId) || ships[0]
    );

    const handleSelect = (ship: ShipConfig) => {
        setSelectedShip(ship);
    };

    const handleApply = () => {
        if (selectedShip) {
            onShipChange(selectedShip.id);
        }
    };

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <h2 className="text-xl font-bold text-seastar-cyan mb-4 flex items-center gap-2">
                <Ship size={20} /> Ship Definition
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
                {/* Ship List */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <h3 className="text-sm font-bold text-gray-300 mb-3">Available Ships</h3>
                    <div className="space-y-2">
                        {ships.map(ship => (
                            <div
                                key={ship.id}
                                onClick={() => handleSelect(ship)}
                                className={`p-3 rounded-lg cursor-pointer transition ${selectedShip?.id === ship.id
                                        ? 'bg-seastar-cyan/20 border border-seastar-cyan'
                                        : 'bg-seastar-800 hover:bg-seastar-700 border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    <Anchor size={16} className={selectedShip?.id === ship.id ? 'text-seastar-cyan' : 'text-gray-400'} />
                                    <span className="font-bold text-white">{ship.name}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">{ship.type} • {ship.id}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Ship Details */}
                {selectedShip && (
                    <div className="lg:col-span-2 glass-panel p-4 rounded-lg border border-seastar-700">
                        <h3 className="text-sm font-bold text-gray-300 mb-4">Ship Specifications</h3>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-seastar-800 p-3 rounded-lg">
                                <div className="text-xs text-gray-400">Ship ID</div>
                                <div className="text-lg font-bold text-seastar-cyan">{selectedShip.id}</div>
                            </div>
                            <div className="bg-seastar-800 p-3 rounded-lg">
                                <div className="text-xs text-gray-400">Type</div>
                                <div className="text-lg font-bold text-white">{selectedShip.type}</div>
                            </div>
                            <div className="bg-seastar-800 p-3 rounded-lg">
                                <div className="text-xs text-gray-400">Length (m)</div>
                                <div className="text-lg font-bold text-yellow-400">{selectedShip.length}</div>
                            </div>
                            <div className="bg-seastar-800 p-3 rounded-lg">
                                <div className="text-xs text-gray-400">Beam (m)</div>
                                <div className="text-lg font-bold text-yellow-400">{selectedShip.beam}</div>
                            </div>
                            <div className="bg-seastar-800 p-3 rounded-lg">
                                <div className="text-xs text-gray-400">Draft (m)</div>
                                <div className="text-lg font-bold text-yellow-400">{selectedShip.draft}</div>
                            </div>
                            <div className="bg-seastar-800 p-3 rounded-lg">
                                <div className="text-xs text-gray-400">Number of Decks</div>
                                <div className="text-lg font-bold text-blue-400">{selectedShip.decks}</div>
                            </div>
                        </div>

                        <div className="bg-seastar-800 p-3 rounded-lg mb-4">
                            <div className="text-xs text-gray-400 mb-1">Description</div>
                            <div className="text-sm text-gray-300">{selectedShip.description}</div>
                        </div>

                        <button
                            onClick={handleApply}
                            disabled={selectedShip.id === currentShipId}
                            className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 ${selectedShip.id === currentShipId
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                        >
                            <Save size={16} />
                            {selectedShip.id === currentShipId ? 'Current Project' : 'Switch to This Ship'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ShipDefinition;
