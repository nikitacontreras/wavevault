import React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Wrench, X } from "lucide-react";

interface DependencyBannerProps {
    dependencies: { python: boolean; ffmpeg: boolean; ffprobe: boolean };
    onOpenChecker: () => void;
    onDismiss: () => void;
    theme: 'light' | 'dark';
}

export const DependencyBanner: React.FC<DependencyBannerProps> = ({
    dependencies,
    onOpenChecker,
    onDismiss,
    theme
}) => {
    const { t } = useTranslation();
    const isDark = theme === 'dark';

    const missingList: string[] = [];
    if (!dependencies.python) missingList.push("Python 3.10+");
    if (!dependencies.ffmpeg) missingList.push("FFmpeg");
    if (!dependencies.ffprobe) missingList.push("FFprobe");

    if (missingList.length === 0) return null;

    const missingText = missingList.join(", ");

    return (
        <div
            className={`w-full px-6 py-2.5 border-b flex items-center justify-between gap-4 z-30 transition-all animate-in slide-in-from-top duration-300 ${
                isDark
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-200"
                    : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
        >
            <div className="flex items-center gap-3 min-w-0">
                <div className={`p-1.5 rounded-lg shrink-0 ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                    <AlertTriangle size={15} />
                </div>
                <div className="flex items-center gap-2 truncate">
                    <span className="text-xs font-semibold truncate">
                        {t('deps.bannerWarning', { missing: missingText })}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onOpenChecker}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ${
                        isDark
                            ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30"
                            : "bg-amber-200 hover:bg-amber-300 text-amber-900 border border-amber-300"
                    }`}
                >
                    <Wrench size={13} />
                    {t('deps.configure')}
                </button>
                <button
                    onClick={onDismiss}
                    className={`p-1 rounded-lg transition-colors ${
                        isDark
                            ? "hover:bg-amber-500/20 text-amber-400/60 hover:text-amber-200"
                            : "hover:bg-amber-200 text-amber-700/60 hover:text-amber-900"
                    }`}
                    title={t('deps.bannerDismiss')}
                >
                    <X size={15} />
                </button>
            </div>
        </div>
    );
};
