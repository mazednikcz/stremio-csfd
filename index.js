const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { csfd } = require('node-csfd-api');
const NodeCache = require('node-cache');

// Cache udrží data 24 hodin, aby se ČSFD neptal pořád dokola
const myCache = new NodeCache({ stdTTL: 86400 });

const manifest = {
    id: 'org.moje.csfd.ochrana',
    version: '1.2.0',
    name: 'ČSFD Hodnocení',
    description: 'Barevné hodnocení z ČSFD s ochranou proti blokaci.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt']
};

const builder = new addonBuilder(manifest);

function getRatingEmoji(rating) {
    if (!rating || rating === 0) return '⚪';
    if (rating >= 80) return '🟩';
    if (rating >= 60) return '🟨';
    if (rating >= 40) return '🟧';
    return '🟥';
}

builder.defineStreamHandler(async (args) => {
    const imdbId = args.id;
    
    // 1. Zkusíme se podívat do paměti (cache)
    const cachedData = myCache.get(imdbId);
    if (cachedData) return { streams: [cachedData] };

    try {
        // 2. Pokud není v paměti, zeptáme se ČSFD
        const search = await csfd.search(imdbId);
        const movie = search.movies;

        if (movie) {
            const emoji = getRatingEmoji(movie.rating);
            const stream = {
                name: `ČSFD ${emoji}`,
                title: `${movie.rating || '??'}% - Klikni pro detail`,
                externalUrl: movie.url
            };
            
            // Uložíme do paměti pro příště
            myCache.set(imdbId, stream);
            return { streams: [stream] };
        }
    } catch (e) {
        console.error('ČSFD Error:', e);
    }
    return { streams: [] };
});

const port = process.env.PORT || 7000;
serveHTTP(builder, { port });
