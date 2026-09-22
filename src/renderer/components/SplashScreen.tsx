import React from 'react';
import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
    statusText?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
    statusText = "Iniciando WaveVault..."
}) => {
    return (
        <div className="h-screen w-screen bg-wv-bg text-wv-text flex flex-col items-center justify-center select-none font-sans">
            <div className="flex flex-col items-center gap-4">
                {/* WV Brand Squircle Badge */}
                <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-white text-black shadow-2xl">
                    <span className="text-2xl font-black italic tracking-tighter">WV</span>
                </div>

                {/* Title & Version */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-bold tracking-tight text-white">WaveVault</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/50">v1.0.60</span>
                    </div>
                    <div className="flex items-center gap-2 text-wv-text-muted text-xs font-mono mt-1">
                        <Loader2 size={13} className="animate-spin text-white/50" />
                        <span>{statusText}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
