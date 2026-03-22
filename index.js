const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { csfd } = require('node-csfd-api');
const NodeCache = require('node-cache');

const myCache = new NodeCache({ stdTTL: 86400 });

const manifest = {
    id: 'org.moje.csfd.final.v3',
    version: '1.3.0',
    name: 'ČSFD Hodnocení',
    description: 'Zobrazí hodnocení z ČSFD v seznamu streamů.',
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
    // Pro seriály Stremio posílá "tt12345:1:1", my chceme jen "tt12345"
    const imdbId = args.id.split(':')[0];
    
    console.log(`Hledám hodnocení pro: ${imdbId}`);

    const cachedData = myCache.get(imdbId);
    if (cachedData) return { streams: [cachedData] };

    try {
        const search = await csfd.search(imdbId);
        // Kontrola, zda máme výsledky v 'movies' nebo 'tvSeries'
        const item = (search.movies && search.movies[0]) || (search.tvSeries && search.tvSeries[0]);

        if (item) {
            const emoji = getRatingEmoji(item.rating);
            const stream = {
                name: `ČSFD ${emoji}`,
                title: `Hodnocení: ${item.rating || '??'}%\nKlikni pro detail na webu`,
                externalUrl: item.url,
                // Přidáno pro lepší kompatibilitu
                url: item.url 
            };
            
            myCache.set(imdbId, stream);
            return { streams: [stream] };
        }
    } catch (e) {
        console.error('CSFD API Error:', e.message);
    }
    return { streams: [] };
});

const addonInterface = builder.getInterface();
const port = process.env.PORT || 7000;
serveHTTP(addonInterface, { port });
