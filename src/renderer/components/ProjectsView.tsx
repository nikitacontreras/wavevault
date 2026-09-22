import React from "react";
import { ProjectsSidebar } from "./projects/ProjectsSidebar";
import { RawProjectsView } from "./projects/RawProjectsView";
import { ProjectAlbumView } from "./projects/ProjectAlbumView";
import { ProjectsModals } from "./projects/ProjectsModals";
import { useProjects } from "./projects/useProjects";

interface ProjectsViewProps {
    theme: 'light' | 'dark';
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({ theme }) => {
    const isDark = theme === 'dark';
    const {
        db,
        viewMode,
        setViewMode,
        filterMode,
        setFilterMode,
        selectedAlbumId,
        setSelectedAlbumId,
        currentAlbum,
        projectSearch,
        setProjectSearch,
        workspaces,
        selectedWorkspaceId,
        setSelectedWorkspaceId,
        detectedDaws,
        savedDaws,
        movingVersion,
        setMovingVersion,
        movingToAlbumId,
        setMovingToAlbumId,
        pickingVersionForTrackId,
        setPickingVersionForTrackId,
        activeTrackMenu,
        setActiveTrackMenu,
        activeAlbumMenu,
        setActiveAlbumMenu,
        linkSearch,
        setLinkSearch,
        isCreatingTrackInline,
        setIsCreatingTrackInline,
        inlineTrackName,
        setInlineTrackName,
        modalData,
        setModalData,
        filteredVersions,
        handleAddWorkspace,
        handleRemoveWorkspace,
        handleScanWorkspaces,
        handleOpenDAWSettings,
        handleSaveDAW,
        handleManualDAWPick,
        handleCreateAlbum,
        handleEditAlbum,
        handleDeleteAlbum,
        handleCreateTrack,
        handleEditTrack,
        handleDeleteTrack,
        handleQuickStatusChange,
        handleMoveToTrack,
        handleConfirmCreateTrackInline,
        handleDeleteVersion,
        handleOpenVersion,
        handleOpenDetails,
        handleModalSubmit
    } = useProjects();

    const unorganizedCount = db.allVersions.filter((v: any) => v.isUnorganized === 1).length;

    return (
        <div className="flex-1 flex min-h-0 overflow-hidden text-[13px] relative">
            <style>{`
                .projects-scroll::-webkit-scrollbar { width: 4px; }
                .projects-scroll::-webkit-scrollbar-track { background: transparent; }
                .projects-scroll::-webkit-scrollbar-thumb { 
                    background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; 
                    border-radius: 10px; 
                }
                .projects-scroll:hover::-webkit-scrollbar-thumb { 
                    background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; 
                }
            `}</style>

            {/* Sidebar Modular */}
            <ProjectsSidebar
                isDark={isDark}
                viewMode={viewMode}
                setViewMode={setViewMode}
                unorganizedCount={unorganizedCount}
                selectedWorkspaceId={selectedWorkspaceId}
                setSelectedWorkspaceId={setSelectedWorkspaceId}
                workspaces={workspaces}
                onScanWorkspaces={handleScanWorkspaces}
                onRemoveWorkspace={handleRemoveWorkspace}
                onAddWorkspace={handleAddWorkspace}
                albums={db.albums}
                selectedAlbumId={selectedAlbumId}
                setSelectedAlbumId={setSelectedAlbumId}
                onCreateAlbum={handleCreateAlbum}
                onEditAlbum={handleEditAlbum}
                onDeleteAlbum={handleDeleteAlbum}
                onOpenDAWSettings={handleOpenDAWSettings}
                activeAlbumMenu={activeAlbumMenu}
                setActiveAlbumMenu={setActiveAlbumMenu}
            />

            {/* Contenido Principal */}
            <div className="flex-1 flex flex-col min-h-0">
                {viewMode === 'todos' ? (
                    <RawProjectsView
                        isDark={isDark}
                        selectedWorkspaceId={selectedWorkspaceId}
                        workspaces={workspaces}
                        filterMode={filterMode}
                        setFilterMode={setFilterMode}
                        projectSearch={projectSearch}
                        setProjectSearch={setProjectSearch}
                        filteredVersions={filteredVersions}
                        onMoveVersion={setMovingVersion}
                        onOpenDetails={handleOpenDetails}
                        onOpenVersion={handleOpenVersion}
                    />
                ) : (
                    <ProjectAlbumView
                        isDark={isDark}
                        currentAlbum={currentAlbum}
                        onEditAlbum={handleEditAlbum}
                        onCreateTrack={handleCreateTrack}
                        onEditTrack={handleEditTrack}
                        onDeleteTrack={handleDeleteTrack}
                        onQuickStatusChange={handleQuickStatusChange}
                        activeTrackMenu={activeTrackMenu}
                        setActiveTrackMenu={setActiveTrackMenu}
                        onOpenVersion={handleOpenVersion}
                        onDeleteVersion={handleDeleteVersion}
                        onPickVersionForTrack={setPickingVersionForTrackId}
                    />
                )}
            </div>

            {/* Modales Modulares */}
            <ProjectsModals
                isDark={isDark}
                movingVersion={movingVersion}
                movingToAlbumId={movingToAlbumId}
                setMovingVersion={setMovingVersion}
                setMovingToAlbumId={setMovingToAlbumId}
                albums={db.albums}
                allVersions={db.allVersions}
                onMoveToTrack={handleMoveToTrack}
                isCreatingTrackInline={isCreatingTrackInline}
                setIsCreatingTrackInline={setIsCreatingTrackInline}
                inlineTrackName={inlineTrackName}
                setInlineTrackName={setInlineTrackName}
                onConfirmCreateTrackInline={handleConfirmCreateTrackInline}
                pickingVersionForTrackId={pickingVersionForTrackId}
                setPickingVersionForTrackId={setPickingVersionForTrackId}
                linkSearch={linkSearch}
                setLinkSearch={setLinkSearch}
                modalData={modalData}
                setModalData={setModalData}
                onModalSubmit={handleModalSubmit}
                detectedDaws={detectedDaws}
                savedDaws={savedDaws}
                onManualDAWPick={handleManualDAWPick}
                onSaveDAW={handleSaveDAW}
            />
        </div>
    );
};
