import React, { useState } from 'react';
import { AudioWaveform as WaveIcon, Minus, Square, X } from 'lucide-react';

import { useSettings } from '../context/SettingsContext';
import { useApp } from '../context/AppContext';

export const TitleBar: React.FC = () => {
    const { config } = useSettings();
    const { version } = useApp();
    const isDark = config.theme === 'dark';
    const isMac = (window as any).api.platform === 'darwin';

    return (
        <div className={`h-10 flex items-center justify-between select-none drag-region transition-all duration-300 border-b ${isDark ? "bg-wv-sidebar border-white/5" : "bg-wv-surface border-black/5"}`}>

            {/* Left Section */}
            <div className="flex items-center w-32 pl-4">
                {isMac && <div className="w-16" />} {/* Spacer for traffic lights */}
                {!isMac && (
                    <div className={`text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded ${isDark ? "text-white/20 border-white/5" : "text-black/20 border-black/5"}`}>
                        v{version}
                    </div>
                )}
            </div>

            {/* Center Section */}
            <div className="flex items-center gap-2">
                <WaveIcon size={14} className={isDark ? "text-white/40" : "text-black/40"} />
                <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isDark ? "text-white/60" : "text-black/60"}`}>
                    WaveVault
                </span>
            </div>

            {/* Right Section */}
            <div className="flex items-center justify-end w-32">
                {isMac ? (
                    <div className={`mr-4 text-[9px] font-bold uppercase tracking-widest border px-2 py-0.5 rounded ${isDark ? "text-white/20 border-white/5" : "text-black/20 border-black/5"}`}>
                        v{version}
                    </div>
                ) : (
                    <div className="flex h-10 no-drag">
                        <button
                            onClick={() => window.api.minimizeWindow()}
                            className={`h-full px-3 flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/5 text-white/60 hover:text-white" : "hover:bg-black/5 text-black/60 hover:text-black"}`}
                        >
                            <Minus size={14} />
                        </button>
                        <button
                            onClick={() => window.api.toggleMaximizeWindow()}
                            className={`h-full px-3 flex items-center justify-center transition-colors ${isDark ? "hover:bg-white/5 text-white/60 hover:text-white" : "hover:bg-black/5 text-black/60 hover:text-black"}`}
                        >
                            <Square size={12} />
                        </button>
                        <button
                            onClick={() => window.api.closeWindow()}
                            className={`h-full px-3 flex items-center justify-center transition-colors hover:bg-red-500 hover:text-white ${isDark ? "text-white/60" : "text-black/60"}`}
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


