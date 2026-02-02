import { useLibrary } from '../context/LibraryContext';

export function useStems(monitoringPath?: string) {
    const { activeStems, separateStems: ctxSeparate } = useLibrary();

    // Buscar la tarea activa para este archivo
    const task = activeStems.find(s => s.filePath === monitoringPath);

    const isSeparating = task ? task.status === 'loading' : false;
    const progress = task ? task.msg : '';
    const stems = (task && task.status === 'success') ? task.data : null;
    const error = (task && task.status === 'error') ? task.msg : null;

    const separate = async (filePath: string, outDir: string, title?: string) => {
        // Usar el título pasado o intentar buscarlo en la tarea existente
        const finalTitle = title || (task?.title) || filePath.split('/').pop() || 'Untitled';
        return await ctxSeparate(filePath, outDir, finalTitle);
    };

    return {
        isSeparating,
        progress,
        stems,
        error,
        separate
    };
}
