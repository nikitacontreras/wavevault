import React from "react";
import { useTranslation } from "react-i18next";
import { AdvancedPathInput } from "./AdvancedPathInput";

interface AdvancedSettingsSectionProps {
    isDark: boolean;
    pythonPath: string | null;
    setPythonPath: (p: string) => void;
    ffmpegPath: string | null;
    setFfmpegPath: (f: string) => void;
    ffprobePath: string | null;
    setFfprobePath: (f: string) => void;
    dependencies: any;
}

export const AdvancedSettingsSection: React.FC<AdvancedSettingsSectionProps> = ({
    isDark,
    pythonPath,
    setPythonPath,
    ffmpegPath,
    setFfmpegPath,
    ffprobePath,
    setFfprobePath,
    dependencies
}) => {
    const { t } = useTranslation();
    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;

    return (
        <div className="space-y-8">
            <section>
                <h3 className={`text-md font-bold mb-6 ${isDark ? "text-white" : "text-black"}`}>{t('settings.advanced')}</h3>
                <div className="space-y-4">
                    <div className={cardClass}>
                        <div className="space-y-6">
                            <AdvancedPathInput
                                label={t('settings.pythonPath')}
                                value={pythonPath}
                                onChange={setPythonPath}
                                placeholder={t('settings.autoDetect')}
                                isDark={isDark}
                                isValid={dependencies?.python}
                                version={dependencies?.pythonVersion}
                                isLoading={!dependencies}
                            />
                            <div className="h-px w-full bg-white/5" />
                            <AdvancedPathInput
                                label={t('settings.ffmpegPath')}
                                value={ffmpegPath}
                                onChange={setFfmpegPath}
                                placeholder={t('settings.integratedBinary')}
                                isDark={isDark}
                                isValid={dependencies?.ffmpeg}
                                version={dependencies?.ffmpegVersion}
                                isLoading={!dependencies}
                            />
                            <div className="h-px w-full bg-white/5" />
                            <AdvancedPathInput
                                label={t('settings.ffprobePath')}
                                value={ffprobePath}
                                onChange={setFfprobePath}
                                placeholder={t('settings.integratedBinary')}
                                isDark={isDark}
                                isValid={dependencies?.ffprobe}
                                version={dependencies?.ffprobeVersion}
                                isLoading={!dependencies}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};
