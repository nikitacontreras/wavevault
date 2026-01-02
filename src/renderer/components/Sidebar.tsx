import React from "react";
import { Search, Folder, Layout, Settings, PanelLeftClose, PanelLeftOpen, Sun, Moon, Disc, RefreshCw } from "lucide-react";

import { useTranslation } from "react-i18next";

interface SidebarProps {
    currentView: string;
    onViewChange: (view: string) => void;
    isCollapsed: boolean;
    onToggle: () => void;
    theme: 'light' | 'dark';
    onThemeToggle: () => void;
    version: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentView,
    onViewChange,
    isCollapsed,
    onToggle,
    theme,
    onThemeToggle,
    version
}) => {
    const isDark = theme === 'dark';
    const { t } = useTranslation();

    return (
        <aside className={`
            ${isCollapsed ? "w-20" : "w-64"} 
            ${isDark ? "bg-wv-sidebar border-white/5" : "bg-wv-surface border-black/5"} 
            border-r flex flex-col transition-all duration-300 ease-in-out z-50
        `}>
            <div className={`p-6 flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
                <img
                    src={isDark ? "wavevault-white.svg" : "wavevault.svg"}
                    className={`${isCollapsed ? "w-8 h-8" : "w-6 h-6"} object-contain`}
                    alt="Logo"
                />

                {!isCollapsed && (
                    <span className={`text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? "text-white" : "text-black"}`}>
                        WaveVault
                    </span>
                )}
            </div>


            <nav className={`flex flex-col gap-1.5 ${isCollapsed ? "px-3" : "px-4"}`}>
                <NavItem
                    icon={<Search size={18} />}
                    label={t('sidebar.search')}
                    active={currentView === "search"}
                    onClick={() => onViewChange("search")}
                    isCollapsed={isCollapsed}
                    theme={theme}
                />
                <NavItem
                    icon={<Folder size={18} />}
                    label={t('sidebar.library')}
                    active={currentView === "library"}
                    onClick={() => onViewChange("library")}
                    isCollapsed={isCollapsed}
                    theme={theme}
                />
                <NavItem
                    icon={<Disc size={18} />}
                    label={t('sidebar.discovery')}
                    active={currentView === "discovery"}
                    onClick={() => onViewChange("discovery")}
                    isCollapsed={isCollapsed}
                    theme={theme}
                />
                <NavItem
                    icon={<RefreshCw size={18} />}
                    label={t('sidebar.converter')}
                    active={currentView === "converter"}
                    onClick={() => onViewChange("converter")}
                    isCollapsed={isCollapsed}
                    theme={theme}
                />
                <NavItem
                    icon={<Layout size={18} />}
                    label={t('sidebar.projects')}
                    active={currentView === "projects"}
                    onClick={() => onViewChange("projects")}
                    isCollapsed={isCollapsed}
                    theme={theme}
                />
                <NavItem
                    icon={<Settings size={18} />}
                    label={t('sidebar.settings')}
                    active={currentView === "settings"}
                    onClick={() => onViewChange("settings")}
                    isCollapsed={isCollapsed}
                    theme={theme}
                />
            </nav>

            <div className="mt-auto p-4 flex flex-col gap-4">
                <button
                    onClick={onThemeToggle}
                    className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                        ${isCollapsed ? "justify-center" : ""}
                        ${isDark
                            ? "text-wv-gray hover:bg-white/5 hover:text-white"
                            : "text-black/40 hover:bg-black/5 hover:text-black"}
                    `}
                    title={isCollapsed ? (isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')) : undefined}
                >
                    {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    {!isCollapsed && (
                        <span className="text-xs font-medium tracking-tight">
                            {isDark ? t('sidebar.lightMode') : t('sidebar.darkMode')}
                        </span>
                    )}
                </button>

                {!isCollapsed ? (
                    <div className={`text-[9px] font-bold tracking-widest uppercase text-center ${isDark ? "text-white/10" : "text-black/10"}`}>
                        v{version}
                    </div>
                ) : (
                    <div className={`w-2 h-2 rounded-full mx-auto ${isDark ? "bg-white/5" : "bg-black/5"}`} />
                )}
            </div>
        </aside>
    );
};


interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
    isCollapsed: boolean;
    theme: 'light' | 'dark';
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isCollapsed, theme }) => {
    const isDark = theme === 'dark';

    return (
        <button
            type="button"
            className={`flex items-center rounded-xl cursor-pointer transition-all duration-200 w-full text-left overflow-hidden
                ${isCollapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"}
                ${active
                    ? (isDark ? "bg-white text-black font-bold shadow-lg" : "bg-black text-white font-bold shadow-lg")
                    : (isDark ? "text-wv-gray hover:bg-white/5 hover:text-white" : "text-black/40 hover:bg-black/5 hover:text-black")
                }`}
            title={isCollapsed ? label : undefined}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
        >
            <span className={`${active ? (isDark ? "text-black" : "text-white") : (isDark ? "text-wv-gray" : "text-black/40")} shrink-0`}>
                {icon}
            </span>
            {!isCollapsed && (
                <span className="text-xs font-medium tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                    {label}
                </span>
            )}
        </button>
    );
};


