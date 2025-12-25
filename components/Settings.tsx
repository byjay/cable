import React, { useState } from 'react';
import { Settings as SettingsIcon, Moon, Sun, Bell, Database, Palette } from 'lucide-react';

interface SettingsProps {
    onThemeChange?: (theme: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ onThemeChange }) => {
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);
    const [autoSave, setAutoSave] = useState(true);
    const [autoRoute, setAutoRoute] = useState(true);

    const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) => (
        <div className="flex items-center justify-between p-3 bg-seastar-800 rounded-lg">
            <span className="text-gray-300">{label}</span>
            <button
                onClick={onChange}
                className={`w-12 h-6 rounded-full transition-colors ${checked ? 'bg-seastar-cyan' : 'bg-gray-600'}`}
            >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-seastar-900 p-4">
            <h2 className="text-xl font-bold text-seastar-cyan mb-4 flex items-center gap-2">
                <SettingsIcon size={20} /> Settings
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Appearance */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                        <Palette size={16} /> Appearance
                    </h3>
                    <div className="space-y-3">
                        <ToggleSwitch
                            checked={darkMode}
                            onChange={() => setDarkMode(!darkMode)}
                            label="Dark Mode"
                        />
                        <div className="p-3 bg-seastar-800 rounded-lg">
                            <div className="text-gray-300 mb-2">Theme Color</div>
                            <div className="flex gap-2">
                                {['#06b6d4', '#a855f7', '#f472b6', '#22c55e', '#f59e0b'].map(color => (
                                    <button
                                        key={color}
                                        className="w-8 h-8 rounded-full border-2 border-transparent hover:border-white"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data & Storage */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                        <Database size={16} /> Data & Storage
                    </h3>
                    <div className="space-y-3">
                        <ToggleSwitch
                            checked={autoSave}
                            onChange={() => setAutoSave(!autoSave)}
                            label="Auto Save on Changes"
                        />
                        <ToggleSwitch
                            checked={autoRoute}
                            onChange={() => setAutoRoute(!autoRoute)}
                            label="Auto Route on Load"
                        />
                        <div className="p-3 bg-seastar-800 rounded-lg">
                            <div className="text-gray-400 text-sm mb-2">Local Storage Usage</div>
                            <div className="w-full bg-gray-700 rounded-full h-2">
                                <div className="bg-seastar-cyan h-2 rounded-full" style={{ width: '35%' }} />
                            </div>
                            <div className="text-xs text-gray-500 mt-1">~2.1 MB used</div>
                        </div>
                    </div>
                </div>

                {/* Notifications */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 flex items-center gap-2">
                        <Bell size={16} /> Notifications
                    </h3>
                    <div className="space-y-3">
                        <ToggleSwitch
                            checked={notifications}
                            onChange={() => setNotifications(!notifications)}
                            label="Show Notifications"
                        />
                    </div>
                </div>

                {/* System Info */}
                <div className="glass-panel p-4 rounded-lg border border-seastar-700">
                    <h3 className="text-sm font-bold text-gray-300 mb-4">System Information</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Version</span>
                            <span className="text-white">SCMY v5.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Build Date</span>
                            <span className="text-white">2025-12-26</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Developer</span>
                            <span className="text-seastar-cyan">designsir@seastargo.com</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
