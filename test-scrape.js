const axios = require('axios');
const cheerio = require('cheerio');

async function scrape() {
    try {
        const { data } = await axios.get('https://cinemafamiglia.it/');
        const $ = cheerio.load(data);
        
        const movies = [];
        // Analizza gli elementi per trovare i film
        $('h3').each((i, el) => {
            const elText = $(el).text().trim();
            const link = $(el).find('a').attr('href');
            if (elText) {
                movies.push({ title: elText, link });
            }
        });

        console.log("Found h3 text:", movies);
        
        // Magari proviamo a tirare fuori tutti i link che hanno '/film/'
        const filmLinks = new Set();
        $('a[href*="/film/"]').each((i, el) => {
            const title = $(el).text().trim();
            const link = $(el).attr('href');
            if (title && !title.includes('Acquista') && title.length > 2) {
                filmLinks.add(JSON.stringify({ title, link }));
            }
        });
        
        console.log("\nFound film links:");
        console.log(Array.from(filmLinks).map(s => JSON.parse(s)));
        
    } catch (e) {
        console.error(e);
    }
}

scrape();
