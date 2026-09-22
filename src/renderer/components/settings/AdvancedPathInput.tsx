import React from "react";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AdvancedPathInputProps {
    label: string;
    value: string | null;
    onChange: (v: string) => void;
    placeholder: string;
    isDark: boolean;
    isValid?: boolean;
    version?: string;
    isLoading?: boolean;
}

export const AdvancedPathInput: React.FC<AdvancedPathInputProps> = ({
    label,
    value,
    onChange,
    placeholder,
    isDark,
    isValid,
    version,
    isLoading
}) => {
    const { t } = useTranslation();
    const [localVal, setLocalVal] = React.useState(value || '');

    React.useEffect(() => {
        setLocalVal(value || '');
    }, [value]);

    const handleCommit = () => {
        const trimmed = localVal.trim();
        if (trimmed !== (value || '')) {
            onChange(trimmed);
        }
    };

    const handlePick = async () => {
        const path = await window.api.pickFile();
        if (path) {
            setLocalVal(path);
            onChange(path);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-[9px] font-bold text-wv-gray uppercase tracking-widest">{label}</label>
            <div className="flex gap-2 items-center">
                <input
                    type="text"
                    className={`flex-1 border rounded-lg px-3 py-2 text-xs outline-none transition-all ${isDark ? "bg-wv-bg border-white/5 text-white focus:border-white/20" : "bg-white border-black/[0.08] text-black focus:border-black/20"}`}
                    value={localVal}
                    onChange={(e) => setLocalVal(e.target.value)}
                    onBlur={handleCommit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.currentTarget.blur();
                        }
                    }}
                    placeholder={placeholder}
                />
                <button
                    className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/[0.08] text-black"}`}
                    onClick={handlePick}
                >
                    {t('settings.browse')}
                </button>

                {/* Version badge */}
                <div className="shrink-0 flex items-center min-w-[100px] justify-end">
                    {isLoading ? (
                        <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1.5 ${isDark ? "bg-white/5 border-white/5 text-wv-gray" : "bg-black/5 border-black/5 text-black/40"}`}>
                            ...
                        </span>
                    ) : isValid ? (
                        <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider border flex items-center gap-1.5 transition-all ${isDark
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : "bg-emerald-50 border-emerald-200 text-emerald-700"
                            }`}>
                            <Check size={12} className="stroke-[2.5]" />
                            <span>{version ? (version.startsWith('v') || version === 'Integrado' || version === 'OK' ? version : `v${version}`) : 'Detectado'}</span>
                        </span>
                    ) : (
                        <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider border flex items-center gap-1.5 transition-all ${isDark
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-red-50 border-red-200 text-red-700"
                            }`}>
                            <X size={12} className="stroke-[2.5]" />
                            <span>{version ? `v${version} (< 3.10)` : 'No detectado'}</span>
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
