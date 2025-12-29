import React from 'react';
import { AudioWaveform as WaveIcon } from 'lucide-react';

interface TitleBarProps {
    theme: 'light' | 'dark';
    version: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ theme, version }) => {
    const isDark = theme === 'dark';

    return (
        <div className={`h-10 flex items-center px-4 select-none drag-region transition-all duration-300 border-b ${isDark ? "bg-wv-sidebar border-white/5" : "bg-wv-surface border-black/5"}`}>
            {/* Spacer for Mac Traffic Lights */}
            <div className="w-20 shrink-0" />

            <div className="flex-1 flex items-center justify-center gap-2">
                <WaveIcon size={14} className={isDark ? "text-white/40" : "text-black/40"} />
                <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isDark ? "text-white/60" : "text-black/60"}`}>WaveVault</span>
            </div>

            <div className="w-20 flex justify-end">
                <div className={`text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded ${isDark ? "text-white/20 border-white/5" : "text-black/20 border-black/5"}`}>
                    v{version}
                </div>
            </div>
        </div>
    );
};


