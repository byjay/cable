import React from 'react';
import { X } from 'lucide-react';

interface SimpleModalProps {
    title: string;
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const SimpleModal: React.FC<SimpleModalProps> = ({ title, isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="glass-panel w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border border-seastar-700 m-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-seastar-700 bg-seastar-800/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">{title}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
