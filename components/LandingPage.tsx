import React, { useState } from 'react';
import { Ship, Lock, AlertCircle } from 'lucide-react';

interface LandingPageProps {
    onShipSelected: (shipId: string) => void;
}

const AVAILABLE_SHIPS = [
    { id: "HK2401", name: "HK2401 - 35K Product Carrier", status: "Active" },
    { id: "S1001_35K_FD", name: "S1001 - 35K Product Carrier", status: "Active" },
    { id: "S1002_LNG", name: "S1002 - 174K LNG Carrier", status: "Active" },
    { id: "H5500_CONT", name: "H5500 - 16K TEU Container", status: "Active" },
];

const LandingPage: React.FC<LandingPageProps> = ({ onShipSelected }) => {
    const [selectedShip, setSelectedShip] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedShip) {
            setError('호선을 선택해주세요.');
            return;
        }

        if (!password) {
            setError('비밀번호를 입력해주세요.');
            return;
        }

        setLoading(true);
        setError(null);

        // Simple password check (can be enhanced with backend auth)
        if (password === 'admin' || password === '1234') {
            setTimeout(() => {
                onShipSelected(selectedShip);
                setLoading(false);
            }, 500);
        } else {
            setError('비밀번호가 올바르지 않습니다.');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
            <div className="w-full max-w-md bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-center">
                    <Ship className="w-16 h-16 mx-auto mb-3 text-white" />
                    <h1 className="text-2xl font-bold text-white">SCMS</h1>
                    <p className="text-sm text-blue-100 mt-1">SEASTAR CABLE MANAGEMENT SYSTEM</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Ship Selection */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                            호선 선택 (Select Ship)
                        </label>
                        <div className="grid grid-cols-1 gap-2">
                            {AVAILABLE_SHIPS.map((ship) => (
                                <button
                                    key={ship.id}
                                    type="button"
                                    onClick={() => setSelectedShip(ship.id)}
                                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedShip === ship.id
                                            ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white text-sm">{ship.name}</div>
                                            <div className="text-xs text-slate-400 mt-1">Status: {ship.status}</div>
                                        </div>
                                        {selectedShip === ship.id && (
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                <div className="w-2 h-2 rounded-full bg-white"></div>
                                            </div>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Password */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                            Access Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                            <input
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-700 transition-all"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 text-red-400 text-sm flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? '접속 중...' : '접속하기 (Access)'}
                    </button>
                </form>

                {/* Footer */}
                <div className="px-6 pb-6 text-center text-xs text-slate-500">
                    <p>문의: designsir@seastargo.com</p>
                    <p className="mt-1">© 2026 SEASTAR ENGINEERING</p>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
