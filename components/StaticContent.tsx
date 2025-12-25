import React from 'react';

export const TraySpecContent = () => (
    <div className="space-y-4 text-gray-300">
        <div className="bg-seastar-800 p-4 rounded-lg border border-seastar-700">
            <h3 className="text-seastar-cyan font-bold mb-2">Standard Tray Specifications</h3>
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-gray-400 border-b border-seastar-600">
                        <th className="pb-2">Type</th>
                        <th className="pb-2">Width (mm)</th>
                        <th className="pb-2">Height (mm)</th>
                        <th className="pb-2">Material</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-seastar-700/50">
                    <tr><td className="py-2">LADDER-300</td><td>300</td><td>100</td><td>HDG Steel</td></tr>
                    <tr><td className="py-2">LADDER-600</td><td>600</td><td>100</td><td>HDG Steel</td></tr>
                    <tr><td className="py-2">PERFORATED-150</td><td>150</td><td>50</td><td>Stainless Steel</td></tr>
                    <tr><td className="py-2">MESH-100</td><td>100</td><td>50</td><td>Electro-galvanized</td></tr>
                </tbody>
            </table>
        </div>
    </div>
);

export const CableBindingContent = () => (
    <div className="space-y-4 text-gray-300">
        <div className="bg-seastar-800 p-4 rounded-lg border border-seastar-700">
            <h3 className="text-seastar-cyan font-bold mb-2">Cable Binding Standards</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Use stainless steel ties for outdoor/exposed areas.</li>
                <li>Nylon ties (black, UV resistant) allowed for indoor/protected areas.</li>
                <li>Binding interval: Vertical runs every 300mm, Horizontal runs every 500mm.</li>
                <li>Spacing between power and signal cables: Minimum 200mm unless shielded.</li>
            </ul>
        </div>
    </div>
);

export const EquipCodeContent = () => (
    <div className="space-y-4 text-gray-300">
        <div className="bg-seastar-800 p-4 rounded-lg border border-seastar-700">
            <h3 className="text-seastar-cyan font-bold mb-2">Equipment Code Reference</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <div className="font-bold text-white mb-1">Prefixes</div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>P</span><span>Pump</span></div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>M</span><span>Motor</span></div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>V</span><span>Valve</span></div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>S</span><span>Sensor</span></div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>L</span><span>Light</span></div>
                </div>
                <div>
                    <div className="font-bold text-white mb-1">Systems</div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>NAV</span><span>Navigation</span></div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>COM</span><span>Communication</span></div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>PWR</span><span>Power Distribution</span></div>
                    <div className="flex justify-between border-b border-seastar-700 py-1"><span>AUT</span><span>Automation</span></div>
                </div>
            </div>
        </div>
    </div>
);

export const TerminalQtyContent = () => (
    <div className="space-y-4 text-gray-300">
        <div className="bg-seastar-800 p-4 rounded-lg border border-seastar-700">
            <h3 className="text-seastar-cyan font-bold mb-2">Terminal Quantity Estimation</h3>
            <div className="text-sm mb-4">
                Based on current cable list:
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-seastar-900 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-white">1,240</div>
                    <div className="text-xs text-gray-500">Ring Terminals</div>
                </div>
                <div className="bg-seastar-900 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-white">850</div>
                    <div className="text-xs text-gray-500">Pin Terminals</div>
                </div>
                <div className="bg-seastar-900 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-white">420</div>
                    <div className="text-xs text-gray-500">Fork Terminals</div>
                </div>
                <div className="bg-seastar-900 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-white">3,500</div>
                    <div className="text-xs text-gray-500">Ferrules</div>
                </div>
            </div>
        </div>
    </div>
);
