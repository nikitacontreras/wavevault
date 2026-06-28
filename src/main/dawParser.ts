import { FLP } from 'dawparse';

export interface DAWProjectMetadata {
    bpm?: number;
    title?: string;
    comments?: string;
    flVersion?: string;
    plugins?: string[];
    samples?: string[];
    timeSignature?: string;
    genre?: string;
    artists?: string;
}

export function parseDAWProject(filePath: string): DAWProjectMetadata | null {
    try {
        let flpInstance: FLP;
        if (filePath.toLowerCase().endsWith('.zip')) {
            flpInstance = new FLP({ zip: filePath });
        } else {
            flpInstance = new FLP({ file: filePath });
        }

        const project = flpInstance.project;
        if (!project || !project.events) return null;

        const events = project.events;

        // 1. Extract Tempo (BPM)
        // Event ID 156: Project Tempo (usually stored in thousandths of a BPM)
        let bpm: number | undefined = undefined;
        const tempoEvent = events.find(e => e.id === 156);
        if (tempoEvent) {
            const rawBpm = Number(tempoEvent.value);
            if (rawBpm > 0) {
                bpm = rawBpm > 1000 ? Math.round(rawBpm / 1000) : Math.round(rawBpm);
            }
        }

        // 2. Extract Title
        const titleEvent = events.find(e => e.id === 194);
        const title = titleEvent ? String(titleEvent.value).trim() : undefined;

        // 3. Extract Comments
        const commentsEvent = events.find(e => e.id === 195);
        const comments = commentsEvent ? String(commentsEvent.value).trim() : undefined;

        // 4. Extract FL Studio Version
        const versionEvent = events.find(e => e.id === 199);
        const flVersion = versionEvent ? String(versionEvent.value).trim() : undefined;

        // 5. Extract Unique Plugins
        // Event ID 203: Plugin Name, Event ID 201: Plugin Internal Name
        const pluginNames = events
            .filter(e => e.id === 203 || e.id === 201)
            .map(e => String(e.value).trim())
            .filter(Boolean);
        const plugins = Array.from(new Set(pluginNames));

        // 6. Extract Sample paths
        // Event ID 196: Channel Sample Path
        const samplePaths = events
            .filter(e => e.id === 196)
            .map(e => String(e.value).trim())
            .filter(Boolean);
        const samples = Array.from(new Set(samplePaths));

        // 7. Time Signature (numerator id 17, denominator id 18)
        const numEvent = events.find(e => e.id === 17);
        const denEvent = events.find(e => e.id === 18);
        const timeSignature = numEvent && denEvent ? `${numEvent.value}/${denEvent.value}` : undefined;

        // 8. Genre (id 206)
        const genreEvent = events.find(e => e.id === 206);
        const genre = genreEvent ? String(genreEvent.value).trim() : undefined;

        // 9. Artists (id 207)
        const artistsEvent = events.find(e => e.id === 207);
        const artists = artistsEvent ? String(artistsEvent.value).trim() : undefined;

        return {
            bpm,
            title,
            comments,
            flVersion,
            plugins,
            samples,
            timeSignature,
            genre,
            artists
        };
    } catch (error) {
        console.error(`[dawParser] Error parsing DAW project file ${filePath}:`, error);
        return null;
    }
}
