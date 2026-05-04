import React from "react";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useSettings } from "../context/SettingsContext";

export const ToastNotification: React.FC = () => {
    const { notification, hideNotification } = useApp();
    const { config } = useSettings();
    const isDark = config.theme === 'dark';

    if (!notification) return null;

    const { type, message, actionLabel, onAction } = notification;

    return (
        <div className="fixed top-20 right-8 z-[200] animate-in slide-in-from-top-10 duration-500">
            <div className={`
                relative min-w-[320px] max-w-[420px] overflow-hidden rounded-2xl border shadow-2xl
                ${isDark ? "bg-wv-sidebar border-white/10 text-white" : "bg-white border-black/10 text-black"}
            `}>
                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <div className={`
                            mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                            ${type === 'error' ? 'bg-red-500/10 text-red-500' :
                              type === 'success' ? 'bg-green-500/10 text-green-500' :
                              'bg-blue-500/10 text-blue-500'}
                        `}>
                            {type === 'success' && <CheckCircle2 size={20} />}
                            {type === 'error' && <AlertCircle size={20} />}
                            {type === 'info' && <Info size={20} />}
                        </div>

                        <div className="flex-1 pr-6">
                            <p className="text-[13px] font-bold leading-tight">
                                {message}
                            </p>

                            {actionLabel && (
                                <button
                                    onClick={() => {
                                        onAction?.();
                                        hideNotification();
                                    }}
                                    className={`
                                        mt-3 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95
                                        ${type === 'error' ? 'bg-red-500 text-white hover:bg-red-600' :
                                          type === 'success' ? 'bg-green-500 text-white hover:bg-green-600' :
                                          'bg-blue-600 text-white hover:bg-blue-700'}
                                    `}
                                >
                                    {actionLabel}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={hideNotification}
                            className={`
                                absolute top-4 right-4 p-1.5 rounded-full transition-all
                                ${isDark ? "hover:bg-white/10 text-white/30 hover:text-white" : "hover:bg-black/10 text-black/30 hover:text-black"}
                            `}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
