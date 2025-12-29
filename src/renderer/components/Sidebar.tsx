import React from "react";
import { Search, Folder, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface SidebarProps {
    currentView: string;
    onViewChange: (view: string) => void;
    isCollapsed: boolean;
    onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange, isCollapsed, onToggle }) => {
    return (
        <aside className={`${isCollapsed ? "w-20" : "w-64"} bg-wv-sidebar border-r border-white/5 flex flex-col transition-all duration-300 ease-in-out z-50`}>
            <div className={`p-6 flex ${isCollapsed ? "justify-center" : "justify-between items-center"}`}>
                {!isCollapsed && (
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-wv-gray/40">Menú</span>
                )}
                <button
                    type="button"
                    onClick={onToggle}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-wv-gray hover:text-white transition-colors"
                >
                    {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                </button>
            </div>

            <nav className={`flex flex-col gap-1.5 ${isCollapsed ? "px-3" : "px-4"}`}>
                <NavItem
                    icon={<Search size={18} />}
                    label="Buscar"
                    active={currentView === "search"}
                    onClick={() => onViewChange("search")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    icon={<Folder size={18} />}
                    label="Librería"
                    active={currentView === "library"}
                    onClick={() => onViewChange("library")}
                    isCollapsed={isCollapsed}
                />
                <NavItem
                    icon={<Settings size={18} />}
                    label="Ajustes"
                    active={currentView === "settings"}
                    onClick={() => onViewChange("settings")}
                    isCollapsed={isCollapsed}
                />
            </nav>

            <div className="mt-auto p-6 text-center">
                {!isCollapsed ? (
                    <div className="text-[9px] font-bold text-white/10 tracking-widest uppercase">
                        v1.0.0
                    </div>
                ) : (
                    <div className="w-2 h-2 rounded-full bg-white/5 mx-auto" />
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
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isCollapsed }) => (
    <button
        type="button"
        className={`flex items-center rounded-xl cursor-pointer transition-all duration-200 w-full text-left overflow-hidden
            ${isCollapsed ? "justify-center p-3" : "gap-3 px-3.5 py-2.5"}
            ${active
                ? "bg-white text-black font-bold shadow-lg"
                : "text-wv-gray hover:bg-white/5 hover:text-white"
            }`}
        title={isCollapsed ? label : undefined}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
        <span className={`${active ? "text-black" : "text-wv-gray"} shrink-0`}>
            {icon}
        </span>
        {!isCollapsed && (
            <span className="text-xs font-medium tracking-tight whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-300">
                {label}
            </span>
        )}
    </button>
);

