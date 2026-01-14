import React, { useState, useEffect } from 'react';
import { useCableAuth } from '../contexts/CableAuthContext';
import { LogIn, Ship, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
    onShipSelected: (shipId: string) => void;
}

const AVAILABLE_SHIPS = ['HK2401', 'S1001_35K_FD', 'S1002_LNG', 'H5500_CONT'];

const LandingPage: React.FC<LandingPageProps> = ({ onShipSelected }) => {
    const { login, error: authError } = useCableAuth();

    // Auth State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Selection state
    const [selectedShip, setSelectedShip] = useState<string | null>(null);
    const [step, setStep] = useState<'LOGIN' | 'SHIP_SELECT'>('LOGIN');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            setStep('SHIP_SELECT');
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleShipSelect = (ship: string) => {
        setSelectedShip(ship);
    };

    const handleEnter = () => {
        if (selectedShip) {
            onShipSelected(selectedShip);
        }
    };

    if (step === 'LOGIN') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1498084393753-b411b2d26b34?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20 filter blur-sm scale-110"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/20 relative z-10 animate-in fade-in zoom-in duration-500">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 shadow-lg shadow-blue-500/30 mb-4 ring-4 ring-blue-500/20">
                            <Ship className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Cable Manager</h1>
                        <p className="text-blue-200 text-sm font-medium">SEASTAR Digital Solutions</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-1.5 ml-1">
                                Username / Email
                            </label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter your ID or Email"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-blue-200 uppercase tracking-wider mb-1.5 ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-800/50 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Enter password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center gap-2 animate-in slide-in-from-top-2">
                                <AlertTriangle size={16} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-lg shadow-lg shadow-blue-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={20} />
                                    Sign In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            Authorized personnel only. <br />All activities are monitored and logged.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h2 className="text-3xl font-black text-slate-900 mb-3">Select a Ship</h2>
                    <p className="text-slate-500 text-lg">Choose a vessel to manage cable data</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {AVAILABLE_SHIPS.map((ship, idx) => (
                        <button
                            key={ship}
                            onClick={() => handleShipSelect(ship)}
                            className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 text-left hover:shadow-xl ${selectedShip === ship
                                    ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-500/20 scale-[1.02]'
                                    : 'border-white bg-white hover:border-blue-300 hover:scale-[1.02]'
                                } animate-in fade-in slide-in-from-bottom-8 duration-700`}
                            style={{ animationDelay: `${idx * 100}ms` }}
                        >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${selectedShip === ship ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                                }`}>
                                <Ship size={24} />
                            </div>
                            <h3 className={`font-bold text-lg mb-1 transition-colors ${selectedShip === ship ? 'text-blue-700' : 'text-slate-700'
                                }`}>
                                {ship}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium">Cable Management System</p>

                            {selectedShip === ship && (
                                <div className="absolute top-4 right-4 text-blue-600 animate-in zoom-in">
                                    <ShieldCheck size={20} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-10 flex justify-center">
                    <button
                        onClick={handleEnter}
                        disabled={!selectedShip}
                        className={`
                            flex items-center gap-3 px-10 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-xl
                            ${selectedShip
                                ? 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-slate-900/30'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }
                        `}
                    >
                        Enter System
                        <ArrowRight size={20} className={selectedShip ? 'animate-pulse' : ''} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
