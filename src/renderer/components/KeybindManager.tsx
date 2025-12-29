import React, { useState, useEffect } from "react";
import { KeybindConfig } from "../types";
import { Keyboard, AlertTriangle, RefreshCw, Save, X } from "lucide-react";

interface KeybindManagerProps {
    keybinds: KeybindConfig[];
    onUpdateKeybind: (id: string, accelerator: string) => Promise<void>;
    onRefresh?: () => Promise<void>;
    theme: 'light' | 'dark';
}

interface KeybindConflict {
    existingKeybind: KeybindConfig;
    newKeybind: KeybindConfig;
}

export const KeybindManager: React.FC<KeybindManagerProps> = ({
    keybinds,
    onUpdateKeybind,
    onRefresh,
    theme
}) => {
    const isDark = theme === 'dark';
    const [editingKeybind, setEditingKeybind] = useState<string | null>(null);
    const [tempAccelerator, setTempAccelerator] = useState<string>("");
    const [isRecording, setIsRecording] = useState(false);
    const [conflicts, setConflicts] = useState<KeybindConflict[]>([]);
    const [hasChanges, setHasChanges] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<Map<string, string>>(new Map());

    const categories = {
        global: { name: "Globales", description: "Funcionan en todo el sistema", color: isDark ? "text-blue-400" : "text-blue-600" },
        app: { name: "Aplicación", description: "Dentro de la aplicación", color: isDark ? "text-green-400" : "text-green-600" },
        media: { name: "Multimedia", description: "Control de reproducción", color: isDark ? "text-purple-400" : "text-purple-600" }
    };

    const normalizeAccelerator = (accelerator: string): string => {
        return accelerator
            .toLowerCase()
            .replace(/commandorcontrol/g, "ctrl")
            .replace(/\s+/g, "")
            .replace(/\+/g, "");
    };

    const checkConflicts = (accelerator: string, excludeId?: string): KeybindConflict[] => {
        const normalizedAccel = normalizeAccelerator(accelerator);
        const conflicts: KeybindConflict[] = [];

        keybinds.forEach(keybind => {
            if (keybind.id !== excludeId && normalizeAccelerator(keybind.accelerator) === normalizedAccel) {
                conflicts.push({
                    existingKeybind: keybind,
                    newKeybind: { ...keybinds.find(k => k.id === excludeId)!, accelerator }
                });
            }
        });

        return conflicts;
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isRecording) return;
        e.preventDefault();
        e.stopPropagation();

        const parts: string[] = [];
        if (e.metaKey || e.ctrlKey) parts.push("CommandOrControl");
        if (e.shiftKey) parts.push("Shift");
        if (e.altKey) parts.push("Alt");

        const ignoredKeys = ["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Dead"];
        if (!ignoredKeys.includes(e.key)) {
            let keyName = e.key;
            if (keyName === " ") keyName = "Space";
            if (keyName === "+") keyName = "Plus";
            if (keyName === "-") keyName = "Minus";
            if (keyName.length === 1) keyName = keyName.toUpperCase();
            parts.push(keyName);
        }

        if (parts.length > 0 && !ignoredKeys.includes(e.key)) {
            const newAccelerator = parts.join("+");
            setTempAccelerator(newAccelerator);

            const newConflicts = checkConflicts(newAccelerator, editingKeybind || undefined);
            setConflicts(newConflicts);

            if (newConflicts.length === 0) {
                setIsRecording(false);
            }
        }
    };

    const startEditing = (keybind: KeybindConfig) => {
        setEditingKeybind(keybind.id);
        setTempAccelerator(keybind.accelerator);
        setIsRecording(true);
        setConflicts([]);
    };

    const cancelEditing = () => {
        setEditingKeybind(null);
        setTempAccelerator("");
        setIsRecording(false);
        setConflicts([]);
        setHasChanges(false);
        setPendingChanges(new Map());
    };

    const applyChange = async (id: string, accelerator: string) => {
        try {
            await onUpdateKeybind(id, accelerator);
            setPendingChanges(prev => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
            });

            if (pendingChanges.size === 1) {
                setHasChanges(false);
            }
        } catch (error) {
            console.error('Failed to update keybind:', error);
        }
    };

    const savePendingChanges = async () => {
        for (const [id, accelerator] of pendingChanges) {
            await applyChange(id, accelerator);
        }
        setEditingKeybind(null);
        setTempAccelerator("");
        setIsRecording(false);
        setConflicts([]);
        setHasChanges(false);
        setPendingChanges(new Map());
    };

    const toggleKeybind = async (id: string, enabled: boolean) => {
        await onUpdateKeybind(id, keybinds.find(k => k.id === id)!.accelerator);
    };

    const resetToDefaults = async () => {
        if (confirm("¿Restablecer todos los atajos a sus valores predeterminados?")) {
            await onRefresh?.();
            cancelEditing();
        }
    };

    const displayAccelerator = (accelerator: string) => {
        return accelerator
            .replace("CommandOrControl", "⌘/Ctrl")
            .replace("Space", "Espacio")
            .replace("Plus", "+")
            .replace("Minus", "-");
    };

    const groupedKeybinds = Object.entries(categories).map(([key, config]) => ({
        category: key,
        ...config,
        keybinds: keybinds.filter(k => k.category === key && k.category !== 'media')
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className={`text-sm font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>
                        Gestor de Atajos de Teclado
                    </h3>
                    <p className="text-[10px] text-wv-gray mt-1">
                        Configura los atajos para acceder rápidamente a las funciones
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <button
                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-[10px] font-bold uppercase tracking-wider text-green-400 transition-colors flex items-center gap-1.5"
                            onClick={savePendingChanges}
                        >
                            <Save size={12} />
                            Guardar Cambios
                        </button>
                    )}
                    <button
                        className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/5 text-black"}`}
                        onClick={resetToDefaults}
                    >
                        <RefreshCw size={12} />
                        Restablecer
                    </button>
                </div>
            </div>

            {conflicts.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="text-red-500 mt-0.5" size={16} />
                        <div className="flex-1">
                            <h4 className="text-[11px] font-bold text-red-500 uppercase tracking-wider mb-2">
                                Conflicto de Atajos Detectado
                            </h4>
                            <div className={`space-y-1 text-[10px] ${isDark ? "text-red-300" : "text-red-600"}`}>
                                {conflicts.map((conflict, index) => (
                                    <div key={index}>
                                        "{displayAccelerator(conflict.newKeybind.accelerator)}" ya está siendo usado por
                                        <span className={`font-medium ${isDark ? "text-white" : "text-black"}`}> {conflict.existingKeybind.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            className="text-red-500 hover:text-red-600 transition-colors"
                            onClick={() => setConflicts([])}
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {groupedKeybinds.map(({ category, name, description, color, keybinds: categoryKeybinds }) => (
                categoryKeybinds.length > 0 && (
                    <div key={category} className={`${isDark ? "bg-wv-sidebar border-white/5" : "bg-white border-black/5"} border rounded-2xl p-6 shadow-sm`}>
                        <div className={`flex items-center gap-2.5 mb-4 border-b pb-3 ${isDark ? "border-white/5" : "border-black/5"}`}>
                            <Keyboard className={color} size={14} />
                            <div>
                                <h4 className={`text-xs font-bold tracking-tight uppercase tracking-wider ${isDark ? "text-white" : "text-black"}`}>
                                    {name}
                                </h4>
                                <p className="text-[9px] text-wv-gray">
                                    {description}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {categoryKeybinds.map(keybind => (
                                <div key={keybind.id} className={`flex items-center justify-between py-3 border-b last:border-0 ${isDark ? "border-white/[0.03]" : "border-black/[0.03]"}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className={`w-3.5 h-3.5 rounded border transition-all ${isDark ? "border-white/20 bg-wv-sidebar checked:bg-white" : "border-black/20 bg-white checked:bg-black"}`}
                                                    checked={keybind.enabled}
                                                    onChange={(e) => toggleKeybind(keybind.id, e.target.checked)}
                                                />
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`text-xs font-medium truncate ${isDark ? "text-white" : "text-black"}`}>
                                                        {keybind.name}
                                                    </span>
                                                    <span className="text-[9px] text-wv-gray truncate">
                                                        {keybind.description}
                                                    </span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 min-w-0">
                                        {editingKeybind === keybind.id ? (
                                            <div className="relative group flex-1 min-w-[200px]">
                                                <input
                                                    type="text"
                                                    readOnly
                                                    className={`w-full border rounded-lg px-3 py-2 text-xs font-mono outline-none transition-all cursor-default ${isDark
                                                        ? (isRecording ? 'bg-wv-bg border-white/40 ring-2 ring-white/10 text-white' : 'bg-wv-bg border-white/5 text-wv-gray')
                                                        : (isRecording ? 'bg-wv-surface border-black/40 ring-2 ring-black/5 text-black' : 'bg-wv-surface border-black/5 text-black/40')
                                                        }`}
                                                    value={isRecording ? "Presiona las teclas..." : displayAccelerator(tempAccelerator)}
                                                    onKeyDown={handleKeyDown}
                                                />
                                                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                                                    <button
                                                        className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${isDark
                                                            ? (isRecording ? 'bg-white text-black ring-4 ring-black/50' : 'bg-white/5 text-wv-gray hover:bg-white/10 hover:text-white')
                                                            : (isRecording ? 'bg-black text-white ring-4 ring-white/50' : 'bg-black/5 text-black/40 hover:bg-black/10 hover:text-black')
                                                            }`}
                                                        onClick={() => setIsRecording(!isRecording)}
                                                    >
                                                        {isRecording ? "Grabando" : "Grabar"}
                                                    </button>
                                                    <button
                                                        className="px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-500 rounded-md text-[9px] font-bold uppercase tracking-wider transition-colors"
                                                        onClick={cancelEditing}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-3">
                                                <code className={`border rounded-lg px-3 py-1.5 text-xs font-mono min-w-[120px] text-center ${isDark ? "bg-wv-bg border-white/5 text-wv-gray" : "bg-wv-tertiary border-black/5 text-black/40"}`}>
                                                    {displayAccelerator(keybind.accelerator)}
                                                </code>
                                                <button
                                                    className={`px-2.5 py-1.5 border rounded-lg text-[9px] font-bold uppercase tracking-wider transition-colors ${isDark ? "bg-white/5 hover:bg-white/10 border-white/5 text-white" : "bg-black/5 hover:bg-black/10 border-black/5 text-black"}`}
                                                    onClick={() => startEditing(keybind)}
                                                >
                                                    Editar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ))}

            <div className={`border rounded-2xl p-6 ${isDark ? "bg-black/20 border-white/5" : "bg-black/[0.02] border-black/5 shadow-sm"}`}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-wv-gray mb-3 flex items-center gap-2">
                    <Keyboard size={12} />
                    Atajos de Multimedia
                </h4>
                <div className="space-y-3">
                    {keybinds.filter(k => k.category === 'media').map(keybind => (
                        <div key={keybind.id} className="flex items-center justify-between py-2">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    className={`w-3.5 h-3.5 rounded border transition-all ${isDark ? "border-white/20 bg-wv-sidebar checked:bg-white" : "border-black/20 bg-white checked:bg-black"}`}
                                    checked={keybind.enabled}
                                    onChange={(e) => toggleKeybind(keybind.id, e.target.checked)}
                                />
                                <div>
                                    <span className={`text-xs font-medium ${isDark ? "text-white" : "text-black"}`}>{keybind.name}</span>
                                    <span className="text-[9px] text-wv-gray ml-2">{keybind.description}</span>
                                </div>
                            </div>
                            <code className={`border rounded-lg px-3 py-1.5 text-xs font-mono ${isDark ? "bg-wv-bg border-white/5 text-wv-gray" : "bg-wv-tertiary border-black/5 text-black/40"}`}>
                                {displayAccelerator(keybind.accelerator)}
                            </code>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};