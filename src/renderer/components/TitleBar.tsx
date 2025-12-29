import React from 'react';
import { AudioWaveform as WaveIcon } from 'lucide-react';

export const TitleBar: React.FC = () => {
    return (
        <div className="h-10 bg-wv-sidebar border-b border-white/5 flex items-center px-4 select-none drag-region">
            {/* Spacer for Mac Traffic Lights */}
            <div className="w-20 shrink-0" />

            <div className="flex-1 flex items-center justify-center gap-2">
                <WaveIcon size={14} className="text-white/40" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">WaveVault</span>
            </div>

            <div className="w-20 flex justify-end">
                <div className="text-[9px] font-bold text-white/20 uppercase tracking-widest border border-white/5 px-2 py-0.5 rounded">
                    v1.0.0
                </div>
            </div>
        </div>
    );
};
