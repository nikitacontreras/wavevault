import React from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

interface YouTubeAuthSectionProps {
    isDark: boolean;
}

export const YouTubeAuthSection: React.FC<YouTubeAuthSectionProps> = ({ isDark }) => {
    const [connected, setConnected] = React.useState(false);
    const [profile, setProfile] = React.useState<{ name: string; handle: string; avatar: string; id: string; } | null>(null);
    const [loading, setLoading] = React.useState(true);
    const { t } = useTranslation();

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const res = await window.api.youtubeStatus();
            if (res && res.success && res.data) {
                setConnected(res.data.connected);
                setProfile((res.data as any).profile || null);
            }
        } catch (err) {
            console.error("Failed to fetch YouTube status:", err);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        fetchStatus();

        // Listen for real-time updates from main process
        const unsub = window.api.on('youtube:status-changed', (data: any) => {
            setConnected(data.connected);
            setProfile(data.profile || null);
        });

        return () => unsub();
    }, []);

    const handleLogin = async () => {
        try {
            await window.api.youtubeLogin();
            fetchStatus();
        } catch (err) {
            console.error("YouTube login failed:", err);
        }
    };

    const handleLogout = async () => {
        try {
            await window.api.youtubeLogout();
            fetchStatus();
        } catch (err) {
            console.error("YouTube logout failed:", err);
        }
    };

    const cardClass = `p-6 border transition-all ${isDark ? "bg-white/[0.03] border-white/5 text-white rounded-2xl" : "bg-white border-black/[0.04] text-black rounded-2xl"}`;
    const btnClass = `px-6 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${isDark ? "bg-white text-black" : "bg-black text-white"}`;

    return (
        <div className={cardClass}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {connected && profile?.avatar && (
                        <img
                            src={profile.avatar}
                            className="w-10 h-10 rounded-full object-cover border border-white/10"
                            alt=""
                            referrerPolicy="no-referrer"
                        />
                    )}
                    <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">
                            {connected && profile?.name ? profile.name : t('settings.youtubeAccount')}
                        </span>
                        <span className="text-xs text-wv-text-muted">
                            {connected && profile?.handle ? `${profile.handle} • ID: ${profile.id}` : t('settings.youtubeAccountDesc')}
                        </span>
                    </div>
                </div>
                {loading ? (
                    <div className="w-4 h-4 border-2 border-wv-gray border-t-transparent rounded-full animate-spin" />
                ) : connected ? (
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Check size={12} /> {t('settings.youtubeConnected')}
                        </span>
                        <button onClick={handleLogout} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline">
                            {t('settings.youtubeLogout')}
                        </button>
                    </div>
                ) : (
                    <button onClick={handleLogin} className={btnClass}>
                        {t('settings.youtubeLogin')}
                    </button>
                )}
            </div>
        </div>
    );
};
