export const CRATE_GENRES = [
    "Soul", "Funk", "Jazz", "Psychedelic Rock", "Library Music", "Synth Pop",
    "Ambient", "City Pop", "Bossa Nova", "Reggae", "Dub", "Disco", "Fusion",
    "Gospel", "Soundtrack", "Dark Wave", "Minimal Synth", "Italo Disco",
    "Afrobeat", "Highlife", "Enka", "Chanson", "Bolero"
];

export const CRATE_ADJECTIVES = [
    "Obscure", "Rare", "Lo-Fi", "Vintage", "Dusty", "Experimental",
    "Dark", "Heavenly", "Raw", "Underground", "Forgotten", "Classic",
    "Jazzy", "Melodic", "Deep", "Atmospheric", "Distorted", "Smooth"
];

export const CRATE_INSTRUMENTS = [
    "Piano Solo", "Drum Break", "Guitar Riff", "Bassline", "Synth Solo",
    "Saxophone", "Vocal Chops", "String Section", "Flute", "Organ",
    "Rhodes", "Vibraphone", "Samples"
];

export function spinRoulette(): string {
    const genre = CRATE_GENRES[Math.floor(Math.random() * CRATE_GENRES.length)];
    const adj = CRATE_ADJECTIVES[Math.floor(Math.random() * CRATE_ADJECTIVES.length)];
    const instr = CRATE_INSTRUMENTS[Math.floor(Math.random() * CRATE_INSTRUMENTS.length)];

    // Randomize pattern
    const patterns = [
        `${adj} ${genre}`,
        `${genre} ${instr}`,
        `${adj} ${instr}`,
        `${genre} sample ${instr}`,
        `rare ${genre} vinyl`,
        `${adj} ${genre} full album`
    ];

    return patterns[Math.floor(Math.random() * patterns.length)];
}
