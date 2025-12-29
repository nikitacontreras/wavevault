import React from "react";
import { AlertCircle, CheckCircle2, XCircle, RefreshCw, Cpu, Download, Info, Settings } from "lucide-react";

interface DependencyCheckerProps {
    dependencies: {
        python: boolean;
        ffmpeg: boolean;
        ffprobe: boolean;
    };
    onRetry: () => void;
    pythonPath: string;
    setPythonPath: (v: string) => void;
    ffmpegPath: string;
    setFfmpegPath: (v: string) => void;
    ffprobePath: string;
    setFfprobePath: (v: string) => void;
}


import { useState } from "react";

export const DependencyChecker: React.FC<DependencyCheckerProps> = ({
    dependencies, onRetry,
    pythonPath, setPythonPath,
    ffmpegPath, setFfmpegPath,
    ffprobePath, setFfprobePath
}) => {
    const [showConfig, setShowConfig] = useState(false);

    return (
        <div className="fixed inset-0 z-[3000] bg-wv-bg/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="max-w-md w-full bg-wv-sidebar border border-white/10 rounded-3xl p-8 shadow-2xl space-y-8">
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-2">
                        <AlertCircle size={32} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Faltan Dependencias</h2>
                    <p className="text-wv-gray text-sm leading-relaxed">
                        WaveVault requiere herramientas externas para el procesamiento de audio y la descarga de samples. Por favor, instala lo siguiente para continuar.
                    </p>
                </div>

                <div className="space-y-3">
                    <DependencyRow
                        icon={<Cpu size={14} />}
                        name="Python 3"
                        status={dependencies.python}
                        desc="Necesario para el motor de descarga (yt-dlp)."
                    />
                    <DependencyRow
                        icon={<Download size={14} />}
                        name="FFmpeg"
                        status={dependencies.ffmpeg}
                        desc="Necesario para la conversión de audio."
                    />
                    <DependencyRow
                        icon={<Info size={14} />}
                        name="FFprobe"
                        status={dependencies.ffprobe}
                        desc="Necesario para el análisis técnico (BPM/Key)."
                    />
                </div>



                <div className="space-y-4">
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="text-[10px] text-wv-gray font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Settings size={12} />
                        {showConfig ? "Ocultar Configuración" : "Configuración Manual"}
                    </button>

                    {showConfig && (
                        <div className="space-y-4 p-4 bg-black/20 rounded-2xl border border-white/5 animate-in slide-in-from-top-2 duration-300">
                            <MiniPathInput label="Ruta Python" value={pythonPath} onChange={setPythonPath} />
                            <MiniPathInput label="Ruta FFmpeg" value={ffmpegPath} onChange={setFfmpegPath} />
                            <MiniPathInput label="Ruta FFprobe" value={ffprobePath} onChange={setFfprobePath} />
                        </div>
                    )}
                </div>


                <div className="pt-4 flex flex-col gap-3">
                    <button
                        onClick={onRetry}
                        className="w-full py-3 bg-white text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all active:scale-95 shadow-lg"
                    >
                        <RefreshCw size={16} />
                        Reintentar Verificación
                    </button>

                    <p className="text-[10px] text-center text-wv-gray uppercase tracking-widest font-medium opacity-50">
                        Asegúrate de que estén en tu PATH de sistema
                    </p>
                </div>
            </div>
        </div>
    );
};

const DependencyRow = ({ icon, name, status, desc }: { icon: React.ReactNode, name: string, status: boolean, desc: string }) => (
    <div className={`p-4 rounded-2xl border transition-all ${status ? 'bg-green-500/5 border-green-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
        <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
                <div className={status ? 'text-green-500' : 'text-wv-gray'}>
                    {icon}
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">{name}</span>
            </div>
            {status ? (
                <CheckCircle2 size={16} className="text-green-500" />
            ) : (
                <XCircle size={16} className="text-red-500" />
            )}
        </div>
        <p className="text-[10px] text-wv-gray font-medium leading-relaxed mt-1 opacity-70">
            {desc}
        </p>
    </div>
);

const MiniPathInput = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
    const handlePick = async () => {
        const path = await (window as any).api.pickFile();
        if (path) onChange(path);
    };

    return (
        <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-bold text-wv-gray uppercase tracking-widest">{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="flex-1 bg-wv-bg border border-white/5 rounded-lg px-2 py-1.5 text-[10px] text-wv-gray outline-none focus:border-white/10"
                    placeholder="Auto"
                />
                <button
                    onClick={handlePick}
                    className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-bold uppercase"
                >
                    ...
                </button>
            </div>
        </div>
    );
};

