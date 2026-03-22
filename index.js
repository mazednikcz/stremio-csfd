const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { csfd } = require('node-csfd-api');
const NodeCache = require('node-cache');

const myCache = new NodeCache({ stdTTL: 86400 });

const manifest = {
    id: 'org.moje.csfd.oprava',
    version: '1.2.2',
    name: 'ČSFD Hodnocení',
    description: 'Barevné hodnocení z ČSFD.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: []
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
    // Pro seriály Stremio posílá "tt12345:1:1", my potřebujeme jen "tt12345"
    const imdbId = args.id.split(':')[0];
    
    const cachedData = myCache.get(imdbId);
    if (cachedData) return { streams: [cachedData] };

    try {
        const search = await csfd.search(imdbId);
        // Kontrola, zda vyhledávání něco našlo
        if (search && search.movies && search.movies.length > 0) {
            const movie = search.movies[0];
            const emoji = getRatingEmoji(movie.rating);
            const stream = {
                name: `ČSFD ${emoji}`,
                title: `${movie.rating || '??'}% - Detail na webu`,
                externalUrl: movie.url
            };
            
            myCache.set(imdbId, stream);
            return { streams: [stream] };
        }
    } catch (e) {
        console.error('CSFD API Error:', e.message);
    }
    return { streams: [] };
});

const port = process.env.PORT || 7000;
serveHTTP(builder, { port });
