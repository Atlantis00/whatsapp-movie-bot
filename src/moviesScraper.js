const axios = require('axios');
const cheerio = require('cheerio');

async function getMoviesProgrammation() {
    try {
        const { data } = await axios.get('https://cinemafamiglia.it/');
        const $ = cheerio.load(data);
        
        const movies = [];
        $('h3').each((i, el) => {
            const title = $(el).text().trim();
            const link = $(el).find('a').attr('href');
            if (title && link && link.includes('/film/')) {
                movies.push({ title, link });
            }
        });
        
        if (movies.length === 0) {
            return "Non ci sono film in programmazione al momento a Cinema Famiglia.";
        }

        let message = "🎥 *Ecco la programmazione settimanale del Cinema Famiglia!* 🍿\n\n";
        movies.forEach(m => {
            message += `🔹 *${m.title}*\n${m.link}\n\n`;
        });
        
        return message;

    } catch (error) {
        console.error("Errore durante il recupero dei film:", error);
        return "Si è verificato un errore nel recuperare i film.";
    }
}

module.exports = { getMoviesProgrammation };
