import React, { useState } from 'react';
import { User, Lock, ArrowRight, ShieldCheck, Ship, Globe } from 'lucide-react';
import { AuthService } from '../services/authService';

// Hardcoded version to avoid import issues
const APP_VERSION = '6.0.0';

interface LoginPanelProps {
    onLogin: () => void;
}

const LoginPanel: React.FC<LoginPanelProps> = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // ADMIN Override for quick dev access
        if (username === 'admin' && password === 'admin') {
            // Ensure admin exists
            const admin = AuthService.getUsers().find(u => u.username === 'admin');
            if (!admin) {
                AuthService.createUser({
                    id: 'admin',
                    username: 'admin',
                    password: 'admin',
                    role: 'ADMIN',
                    assignedShips: ['ALL']
                });
            }
        }

        const user = AuthService.login(username, password);
        if (user) {
            onLogin();
        } else {
            setError('Invalid credentials');
        }
    };

    const handleGuestLogin = () => {
        // Create or get guest user
        // Ideally Guest doesn't need a persistent account, but for consistent logic we can use a temp one
        // User asked for "Guest" role.
        const guestUser = {
            id: 'guest',
            username: 'guest',
            role: 'GUEST' as const,
            assignedShips: [] // Guests might see demo ship or nothing? Or public ships.
            // Let's assume Guests see nothing or specific demo.
            // For now, let's give Guest access to S1001 for demo.
        };
        // We won't save Guest to DB to avoid clutter, just set current user session
        localStorage.setItem('SEASTAR_CURRENT_USER', JSON.stringify({
            ...guestUser,
            assignedShips: ['S1001_35K_FD']
        }));
        onLogin();
    };

    return (
        <div className="min-h-screen bg-seastar-900 flex items-center justify-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-seastar-800/50 via-seastar-900 to-seastar-900"></div>
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVNcyI+PHBhdGggZD0iTTAgNDBoNDBWMEgwIiBmaWxsPSJub25lIi8+PHBhdGggZD0iTTAgNDBoMXYtMUgwIiBmaWxsPSJyZ2JhKDAsIDI0MywgMjU1LCAwLjEpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')]">
            </div>

            <div className="z-10 w-full max-w-md p-8 bg-seastar-800/80 backdrop-blur-lg rounded-2xl border border-seastar-700 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-seastar-700/50 mb-4 ring-2 ring-seastar-cyan/20">
                        <Ship size={32} className="text-seastar-cyan" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">SEASTAR <span className="text-seastar-cyan">SCMS</span></h1>
                    <p className="text-seastar-300 text-sm mt-2">Ship Cable Management System</p>
                    <div className="mt-1 text-xs text-gray-500 font-mono">
                        v{APP_VERSION}
                        <span className="ml-2 text-[10px] text-gray-600">Last Push: 2026-01-13 15:45</span>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-seastar-300 ml-1">Username</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-500 group-focus-within:text-seastar-cyan transition-colors" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-seastar-900/50 border border-seastar-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-seastar-cyan focus:ring-1 focus:ring-seastar-cyan transition-all"
                                placeholder="Enter your ID"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-seastar-300 ml-1">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-500 group-focus-within:text-seastar-cyan transition-colors" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-seastar-900/50 border border-seastar-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-seastar-cyan focus:ring-1 focus:ring-seastar-cyan transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                            <ShieldCheck size={14} /> {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-2.5 bg-gradient-to-r from-seastar-cyan to-blue-600 hover:from-seastar-cyan/90 hover:to-blue-600/90 text-white font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                    >
                        Sign In <ArrowRight size={16} />
                    </button>
                </form>

                <div className="my-6 flex items-center gap-4">
                    <div className="h-px bg-seastar-700 flex-1"></div>
                    <span className="text-xs text-gray-500 uppercase">or continue as</span>
                    <div className="h-px bg-seastar-700 flex-1"></div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={handleGuestLogin}
                        className="py-2 px-4 bg-seastar-800 hover:bg-seastar-700 border border-seastar-600 rounded-lg text-gray-300 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Globe size={16} /> Guest Access
                    </button>
                </div>
            </div>

            <div className="absolute bottom-4 text-center text-[10px] text-gray-600">
                © 2024 SEASTAR Corp. All rights reserved. <br />
                Authorized personnel only. System access is monitored.
            </div>
        </div>
    );
};

export default LoginPanel;
