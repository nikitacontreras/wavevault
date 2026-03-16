import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, RefreshCcw, X, Info, CheckCircle2, AlertCircle, Loader2, Sparkles } from "lucide-react";

export type UpdateEvent = {
    type: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
    data?: any;
};

export const UpdateNotification: React.FC = () => {
    const { t } = useTranslation();
    const [event, setEvent] = useState<UpdateEvent | null>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const unsub = window.api.onUpdateEvent((evt: UpdateEvent) => {
            setEvent(evt);
            setVisible(true);

            // Auto-hide if no update or error after some time
            if (evt.type === 'not-available') {
                setTimeout(() => setVisible(false), 5000);
            }
        });
        return () => unsub();
    }, []);

    if (!visible || !event) return null;

    const onClose = () => setVisible(false);

    const handleDownload = async () => {
        await window.api.downloadUpdate();
    };

    const handleInstall = async () => {
        await window.api.installUpdate();
    };

    const isDark = document.documentElement.className.includes('dark');

    return (
        <div className="fixed top-20 right-8 z-[200] animate-in slide-in-from-right-10 duration-500">
            <div className={`
                relative w-80 overflow-hidden rounded-2xl border shadow-2xl
                ${isDark ? "bg-wv-sidebar border-white/10 text-white" : "bg-white border-black/10 text-black"}
            `}>
                {/* Progress bar for downloading */}
                {event.type === 'downloading' && (
                    <div className="absolute top-0 left-0 h-1 bg-blue-500 transition-all duration-300" style={{ width: `${event.data}%` }} />
                )}

                <div className="p-5">
                    <div className="flex items-start gap-4">
                        <div className={`
                            mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
                            ${event.type === 'error' ? 'bg-red-500/10 text-red-500' :
                                event.type === 'downloaded' || event.type === 'available' ? 'bg-green-500/10 text-green-500' :
                                    'bg-blue-500/10 text-blue-500'}
                        `}>
                            {event.type === 'checking' && <Loader2 size={20} className="animate-spin" />}
                            {event.type === 'available' && <Sparkles size={20} />}
                            {event.type === 'not-available' && <CheckCircle2 size={20} />}
                            {event.type === 'downloading' && <Download size={20} className="animate-bounce" />}
                            {event.type === 'downloaded' && <RefreshCcw size={20} className="animate-spin-slow" />}
                            {event.type === 'error' && <AlertCircle size={20} />}
                        </div>

                        <div className="flex-1 pr-6">
                            <h4 className="text-[13px] font-bold leading-none tracking-tight">
                                {event.type === 'checking' && "Buscando actualizaciones..."}
                                {event.type === 'available' && "¡Nueva versión disponible!"}
                                {event.type === 'not-available' && "Sistema actualizado"}
                                {event.type === 'downloading' && "Descargando actualización"}
                                {event.type === 'downloaded' && "Actualización lista"}
                                {event.type === 'error' && "Error de actualización"}
                            </h4>
                            <p className={`mt-2 text-[11px] leading-relaxed opacity-60 font-medium`}>
                                {event.type === 'available' && `La versión ${event.data.version} ya está disponible. ¿Deseas probar las últimas mejoras?`}
                                {event.type === 'not-available' && "Ya tienes la versión más reciente instalada. ¡Todo en orden!"}
                                {event.type === 'downloading' && `Descargando componentes del sistema... ${Math.round(event.data)}%`}
                                {event.type === 'downloaded' && "Se han descargado todos los archivos. Reinicia para aplicar los cambios."}
                                {event.type === 'error' && event.data}
                                {event.type === 'checking' && "Comprobando si hay nuevas funciones listas para ti."}
                            </p>

                            <div className="mt-4 flex gap-2">
                                {event.type === 'available' && (
                                    <>
                                        <button
                                            onClick={handleDownload}
                                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase py-2 rounded-lg transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                        >
                                            Actualizar ahora
                                        </button>
                                        <button
                                            onClick={onClose}
                                            className={`flex-1 ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} text-[10px] font-bold uppercase py-2 rounded-lg transition-all active:scale-95`}
                                        >
                                            Más tarde
                                        </button>
                                    </>
                                )}
                                {event.type === 'downloaded' && (
                                    <button
                                        onClick={handleInstall}
                                        className="w-full bg-green-600 hover:bg-green-500 text-white text-[10px] font-bold uppercase py-2 rounded-lg transition-all shadow-lg shadow-green-600/20 active:scale-95"
                                    >
                                        Reiniciar y aplicar
                                    </button>
                                )}
                                {event.type === 'error' && (
                                    <button
                                        onClick={onClose}
                                        className={`w-full ${isDark ? "bg-white/5 hover:bg-white/10" : "bg-black/5 hover:bg-black/10"} text-[10px] font-bold uppercase py-2 rounded-lg transition-all active:scale-95`}
                                    >
                                        Entendido
                                    </button>
                                )}
                            </div>
                        </div>

                        <button
                            onClick={onClose}
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
