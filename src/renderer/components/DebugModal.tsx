import React, { useRef } from "react";

interface DebugModalProps {
    isOpen: boolean;
    logs: string[];
    onClose: () => void;
    onClearLogs: () => void;
}

export const DebugModal: React.FC<DebugModalProps> = ({
    isOpen,
    logs,
    onClose,
    onClearLogs
}) => {
    const logsEndRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333',
                borderRadius: 12,
                padding: 24,
                maxWidth: '80%',
                maxHeight: '80%',
                overflow: 'auto',
                minWidth: 500
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <button
                        className="btn"
                        style={{ background: 'transparent', border: '1px solid #666', padding: '4px 12px' }}
                        onClick={onClose}
                    >
                        ✕ Cerrar
                    </button>
                </div>
                <div style={{ marginBottom: 12 }}>
                    <button
                        className="btn secondary"
                        onClick={onClearLogs}
                        style={{ fontSize: 12, padding: '4px 10px' }}
                    >
                        Limpiar Logs
                    </button>
                </div>
                <div className="logger" style={{
                    maxHeight: 400,
                    overflowY: 'auto',
                    background: '#000',
                    padding: 12,
                    borderRadius: 8,
                    fontFamily: 'monospace',
                    fontSize: 13
                }}>
                    {logs.length === 0 && (
                        <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>
                            No hay logs aún...
                        </div>
                    )}
                    {logs.map((l, i) => (
                        <div key={i} style={{ marginBottom: 4 }}>{l}</div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
