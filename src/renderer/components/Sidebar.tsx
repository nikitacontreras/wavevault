import React from "react";
import { Search, Folder, Settings, Music } from "lucide-react";

interface SidebarProps {
    currentView: string;
    onViewChange: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
    return (
        <aside className="w-56 bg-wv-sidebar border-r border-white/5 flex flex-col p-6 z-50">
            <div className="flex items-center gap-2.5 mb-8 px-1 cursor-default select-none group">
                <div className="p-1.5 bg-white rounded-lg">
                    <Music size={18} className="text-black" />
                </div>
                <span className="text-xl font-bold tracking-tight">WaveVault</span>
            </div>

            <nav className="flex flex-col gap-1.5">
                <NavItem
                    icon={<Search size={18} />}
                    label="Buscar"
                    active={currentView === "search"}
                    onClick={() => onViewChange("search")}
                />
                <NavItem
                    icon={<Folder size={18} />}
                    label="Librería"
                    active={currentView === "library"}
                    onClick={() => onViewChange("library")}
                />
                <NavItem
                    icon={<Settings size={18} />}
                    label="Ajustes"
                    active={currentView === "settings"}
                    onClick={() => onViewChange("settings")}
                />
            </nav>

            <div className="mt-auto pt-6 text-center">
                <div className="text-[9px] font-bold text-white/10 tracking-widest uppercase">
                    v1.0.0
                </div>
            </div>
        </aside>
    );
};

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick }) => (
    <div
        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200
            ${active
                ? "bg-white text-black font-bold shadow-md"
                : "text-wv-gray hover:bg-white/5 hover:text-white"
            }`}
        onClick={onClick}
    >
        <span className={active ? "text-black" : "text-wv-gray"}>
            {icon}
        </span>
        <span className="text-xs font-medium tracking-tight">{label}</span>
    </div>
);
