const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const { csfd } = require('node-csfd-api');

const manifest = {
    id: 'org.moje.csfd.final.v4',
    version: '1.4.0',
    name: 'ČSFD Rating',
    description: 'ČSFD hodnocení přímo ve streamech.',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tt'],
    catalogs: []
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async (args) => {
    try {
        const id = args.id.split(':')[0]; // Vezmeme jen ttID
        
        // Zkusíme najít film přímo podle ID
        let result = await csfd.search(id);
        let movie = (result.movies && result.movies[0]) || (result.tvSeries && result.tvSeries[0]);

        if (movie) {
            const rating = movie.rating || 0;
            const emoji = rating >= 80 ? '🟩' : (rating >= 60 ? '🟨' : (rating >= 40 ? '🟧' : '🟥'));
            
            return {
                streams: [{
                    name: `ČSFD ${emoji}`,
                    title: `Hodnocení: ${rating}%`,
                    externalUrl: movie.url
                }]
            };
        }
    } catch (e) {
        console.error('Chyba:', e.message);
    }
    return { streams: [] };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
