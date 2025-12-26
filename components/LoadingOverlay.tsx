import React from 'react';

interface LoadingOverlayProps {
    message?: string;
    progress?: number;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    message = "케이블 라우팅 중...",
    progress
}) => {
    return (
        <div className="fixed inset-0 bg-seastar-900/95 flex flex-col items-center justify-center z-[9999]">
            {/* Rotating Logo */}
            <div className="perspective-1000">
                <img
                    src="/logo.jpg"
                    alt="SEASTAR Logo"
                    className="w-32 h-32 object-contain animate-spin-y"
                    style={{
                        animation: 'spin3d 2s linear infinite'
                    }}
                />
            </div>

            {/* Loading Text */}
            <div className="mt-8 text-center">
                <h2 className="text-xl font-bold text-seastar-cyan mb-2">
                    {message}
                </h2>
                {progress !== undefined && (
                    <div className="w-64 h-2 bg-seastar-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-seastar-cyan to-seastar-neon transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
                {progress !== undefined && (
                    <p className="mt-2 text-gray-400 text-sm">
                        {progress.toFixed(0)}% 완료
                    </p>
                )}
            </div>

            {/* Animated dots */}
            <div className="flex gap-2 mt-6">
                {[0, 1, 2].map(i => (
                    <div
                        key={i}
                        className="w-3 h-3 bg-seastar-cyan rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                    />
                ))}
            </div>

            {/* Keyframes style */}
            <style>{`
                @keyframes spin3d {
                    0% { transform: rotateY(0deg); }
                    100% { transform: rotateY(360deg); }
                }
                .animate-spin-y {
                    animation: spin3d 2s linear infinite;
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </div>
    );
};

export default LoadingOverlay;
