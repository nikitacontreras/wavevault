// Discogs API Service
// Documentation: https://www.discogs.com/developers

const DISCOGS_API_BASE = 'https://api.discogs.com';
const USER_AGENT = 'WaveVault/1.0 +https://github.com/nikitacontreras/wavevault';

export interface DiscogsSearchParams {
    query?: string;
    genre?: string;
    style?: string;
    country?: string;
    year?: string;
    format?: string;
    label?: string;
    type?: 'release' | 'master' | 'artist' | 'label';
    per_page?: number;
    page?: number;
}

export interface DiscogsRelease {
    id: number;
    title: string;
    year: string;
    country: string;
    genre: string[];
    style: string[];
    format: string[];
    label: string[];
    cover_image: string;
    thumb: string;
    resource_url: string;
    uri: string;
}

export interface DiscogsSearchResult {
    pagination: {
        page: number;
        pages: number;
        per_page: number;
        items: number;
    };
    results: DiscogsRelease[];
}

export async function searchDiscogs(
    token: string,
    params: DiscogsSearchParams
): Promise<DiscogsSearchResult> {
    if (!token) {
        throw new Error('Discogs token is required. Set it in Settings.');
    }

    const searchParams = new URLSearchParams();

    if (params.query) searchParams.set('q', params.query);
    if (params.genre) searchParams.set('genre', params.genre);
    if (params.style) searchParams.set('style', params.style);
    if (params.country) searchParams.set('country', params.country);
    if (params.year) searchParams.set('year', params.year);
    if (params.format) searchParams.set('format', params.format);
    if (params.label) searchParams.set('label', params.label);
    if (params.type) searchParams.set('type', params.type);

    searchParams.set('per_page', String(params.per_page || 20));
    searchParams.set('page', String(params.page || 1));

    const response = await fetch(
        `${DISCOGS_API_BASE}/database/search?${searchParams.toString()}`,
        {
            headers: {
                'Authorization': `Discogs token=${token}`,
                'User-Agent': USER_AGENT
            }
        }
    );

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid Discogs token. Please check your token in Settings.');
        }
        if (response.status === 429) {
            throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(`Discogs API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

export async function getRandomDiscogs(
    token: string,
    genre?: string,
    style?: string,
    yearRange?: { min: number; max: number }
): Promise<DiscogsSearchResult> {
    const params: DiscogsSearchParams = {
        type: 'release',
        per_page: 50,
        page: Math.floor(Math.random() * 10) + 1 // Random page 1-10
    };

    if (genre) params.genre = genre;
    if (style) params.style = style;
    if (yearRange) {
        params.year = `${yearRange.min}-${yearRange.max}`;
    }

    return searchDiscogs(token, params);
}

export async function getDiscogsRelease(token: string, id: number): Promise<any> {
    const response = await fetch(`${DISCOGS_API_BASE}/releases/${id}`, {
        headers: {
            'Authorization': `Discogs token=${token}`,
            'User-Agent': USER_AGENT
        }
    });

    if (!response.ok) {
        throw new Error(`Discogs API error: ${response.status}`);
    }

    return await response.json();
}

// Common Discogs genres for filtering UI
export const DISCOGS_GENRES = [
    'Blues', 'Brass & Military', 'Children\'s', 'Classical', 'Electronic',
    'Folk, World, & Country', 'Funk / Soul', 'Hip Hop', 'Jazz', 'Latin',
    'Non-Music', 'Pop', 'Reggae', 'Rock', 'Stage & Screen'
];

// Common Discogs styles (subset for UI)
export const DISCOGS_STYLES = {
    'Electronic': ['Ambient', 'Breakbeat', 'Disco', 'Downtempo', 'Electro', 'House', 'IDM', 'Synth-pop', 'Techno', 'Trance'],
    'Funk / Soul': ['Disco', 'Funk', 'Gospel', 'Neo Soul', 'P.Funk', 'Rhythm & Blues', 'Soul'],
    'Hip Hop': ['Boom Bap', 'Conscious', 'Gangsta', 'Instrumental', 'Jazzy Hip-Hop', 'Pop Rap', 'Trap'],
    'Jazz': ['Afro-Cuban Jazz', 'Bebop', 'Big Band', 'Cool Jazz', 'Free Jazz', 'Fusion', 'Hard Bop', 'Modal', 'Soul-Jazz'],
    'Rock': ['Alternative Rock', 'Classic Rock', 'Garage Rock', 'Indie Rock', 'Post-Punk', 'Psychedelic Rock', 'Punk'],
    'Reggae': ['Dancehall', 'Dub', 'Lovers Rock', 'Ragga', 'Reggae', 'Roots Reggae', 'Ska'],
    'Latin': ['Afro-Cuban', 'Bossa Nova', 'MPB', 'Rumba', 'Salsa', 'Samba', 'Son'],
    'Folk, World, & Country': ['African', 'Celtic', 'Country', 'Folk', 'Gospel', 'Highlife', 'World']
};

// Countries with rich sample heritage
export const DISCOGS_COUNTRIES = [
    'US', 'UK', 'Japan', 'Brazil', 'Jamaica', 'Nigeria', 'France',
    'Germany', 'Italy', 'Cuba', 'Colombia', 'South Africa', 'Ghana'
];
