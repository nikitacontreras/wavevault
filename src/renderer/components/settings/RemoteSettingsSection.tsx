import React from "react";
import { Activity, Trash2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';

interface RemoteSettingsSectionProps {
    isDark: boolean;
}

export const RemoteSettingsSection: React.FC<RemoteSettingsSectionProps> = ({ isDark }) => {
    const [enabled, setEnabled] = React.useState(false);
    const [serverInfo, setServerInfo] = React.useState<{ ip: string; port: number } | null>(null);
    const [pendingReq, setPendingReq] = React.useState<{ id: string; name: string; code: string } | null>(null);
    const [status, setStatus] = React.useState<{ trustedDevices: any[]; activePeers: any[] }>({ trustedDevices: [], activePeers: [] });

    React.useEffect(() => {
        const unsubPairing = window.api.onRemotePairingRequest((req: any) => setPendingReq(req));
        const unsubStatus = window.api.onRemoteStatusUpdate((data: any) => setStatus(data));
        const checkStatus = async () => {
            const res = await window.api.getRemoteStatus();
            if (res) setStatus(res);
        };
        checkStatus();
        return () => { unsubPairing(); unsubStatus(); };
    }, []);

    const toggleRemote = async () => {
        if (enabled) {
            await window.api.stopRemote();
            setEnabled(false);
            setServerInfo(null);
        } else {
            const info = await window.api.startRemote();
            if (info) {
                setServerInfo(info);
                setEnabled(true);
                const res = await window.api.getRemoteStatus();
                if (res) setStatus(res);
            }
        }
    };

    const handleApprove = async () => { if (!pendingReq) return; await window.api.approvePairing(pendingReq.id); setPendingReq(null); };
    const handleReject = async () => { if (!pendingReq) return; await window.api.rejectPairing(pendingReq.id); setPendingReq(null); };
    const handleForget = async (id: string) => { await window.api.forgetDevice(id); };

    const remoteUrl = serverInfo ? `http://${serverInfo.ip}:${serverInfo.port}` : '';

    return (
        <div className="flex flex-col gap-6">
            <div className={`flex items-center justify-between p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 rounded-2xl" : "bg-white border-black/[0.04] rounded-2xl"}`}>
                <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold">WaveVault Link</span>
                    <span className="text-xs text-wv-text-muted">Control & Sync across devices</span>
                </div>
                <button
                    onClick={toggleRemote}
                    className={`px-6 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${enabled ? "bg-green-500 text-white" : (isDark ? "bg-white text-black" : "bg-black text-white")}`}
                >
                    {enabled ? "LINK ACTIVE" : "START ENGINE"}
                </button>
            </div>

            {enabled && serverInfo && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col gap-6">
                        <div className={`p-8 border flex flex-col items-center gap-6 ${isDark ? "bg-white text-black border-white rounded-2xl" : "bg-white border-black/10 rounded-2xl shadow-sm"}`}>
                            <QRCodeSVG value={remoteUrl} size={160} />
                            <div className="text-[10px] font-bold uppercase tracking-widest border-t border-black/5 pt-4 w-full text-center opacity-40">Scan Access Key</div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <span className="text-[10px] font-bold text-wv-text-muted uppercase tracking-widest px-1">Access Point URL</span>
                            <div className={`p-4 border font-mono text-xs select-all rounded-xl ${isDark ? "bg-black/40 border-white/10 text-white/60" : "bg-black/5 border-black/5 text-black/60"}`}>
                                {remoteUrl}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6">
                        {pendingReq ? (
                            <div className="p-6 border border-amber-500/30 bg-amber-500/5 rounded-2xl flex flex-col gap-4 animate-pulse">
                                <div className="flex justify-between items-center text-amber-500">
                                    <span className="text-xs font-bold uppercase tracking-wider">Pairing Detected</span>
                                    <span className="text-xl font-mono font-black">{pendingReq.code}</span>
                                </div>
                                <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{pendingReq.name} is requesting access</div>
                                <div className="flex gap-4">
                                    <button onClick={handleApprove} className="flex-1 bg-green-500 text-white text-[10px] font-bold uppercase py-2.5 rounded-xl">Grant</button>
                                    <button onClick={handleReject} className="flex-1 bg-red-500 text-white text-[10px] font-bold uppercase py-2.5 rounded-xl">Deny</button>
                                </div>
                            </div>
                        ) : (
                            <div className={`p-6 border border-dashed flex flex-col items-center justify-center py-12 rounded-2xl ${isDark ? "border-white/10 text-white/20" : "border-black/10 text-black/20"}`}>
                                <Activity size={32} className="animate-pulse mb-4 opacity-20" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Waiting for Handshake</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <span className="text-[10px] font-bold text-wv-text-muted uppercase tracking-widest px-1">Connected Terminals</span>
                            <div className="space-y-2">
                                {status.activePeers.length === 0 ? (
                                    <div className={`p-4 border border-dashed rounded-xl text-[10px] text-center italic ${isDark ? "border-white/5 text-white/20" : "border-black/5 text-black/20"}`}>
                                        No active connections
                                    </div>
                                ) : (
                                    status.activePeers.map(peer => (
                                        <div key={peer.socketId} className={`flex items-center justify-between p-4 border rounded-xl ${isDark ? "bg-white/[0.02] border-white/5" : "bg-black/[0.02] border-black/5"}`}>
                                            <div className="flex items-center gap-4">
                                                <div className={`w-2 h-2 rounded-full ${peer.authorized ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" : "bg-amber-500 animate-pulse"}`} />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">{peer.name}</span>
                                                    <span className={`text-[9px] font-bold uppercase tracking-widest ${peer.authorized ? "text-green-500/60" : "text-amber-500/60"}`}>
                                                        {peer.authorized ? "Verified" : "Pending"}
                                                    </span>
                                                </div>
                                            </div>
                                            <button onClick={() => handleForget(peer.socketId)} className="p-2 text-wv-text-muted hover:text-red-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
