const cron = require('node-cron');
const { getMoviesProgrammation } = require('./moviesScraper');
const subManager = require('./subscriberManager');
const configManager = require('./configManager');

let runningJob = null;
let runningStatusJob = null;

function setupCronJobs(client) {
    const activeConf = configManager.getConfig();
    let cronDay = activeConf.cron?.day ?? 1;
    let cronTimeStr = activeConf.cron?.time ?? "12:00";
    
    let cronMin = 0;
    let cronHour = 12;
    if (cronTimeStr.includes(':')) {
        const parts = cronTimeStr.split(':');
        cronHour = parseInt(parts[0], 10);
        cronMin = parseInt(parts[1], 10);
    }
    
    const cronSchedule = `${cronMin} ${cronHour} * * ${cronDay}`;

    if (runningJob) {
        runningJob.stop();
        console.log("Cron job precedente fermato. Riavvio con il nuovo orario...");
    }

    runningJob = cron.schedule(cronSchedule, async () => {
        console.log("Esecuzione del job programmato per i film...");
        
        const message = await getMoviesProgrammation();
        const phoneNumbersChatIds = subManager.getActiveSubscribers();
        
        if (phoneNumbersChatIds.length === 0) {
            console.log("Job saltato: nessun iscritto attivo nel database.");
            return;
        }

        for (const chatId of phoneNumbersChatIds) {
            try {
                await client.sendMessage(chatId, message);
                console.log(`Messaggio inviato con successo a ${chatId}`);
            } catch (error) {
                console.error(`Errore nell'invio del messaggio a ${chatId}:`, error);
            }
        }
    });

    // --- JOB PER STORIE WHATSAPP ---
    if (runningStatusJob) {
        runningStatusJob.stop();
    }
    if (activeConf.dailyStatus && activeConf.dailyStatus.enabled) {
        const statusCronTimeStr = activeConf.dailyStatus.time || "09:00";
        let statusMin = 0;
        let statusHour = 9;
        if (statusCronTimeStr.includes(':')) {
            const parts = statusCronTimeStr.split(':');
            statusHour = parseInt(parts[0], 10);
            statusMin = parseInt(parts[1], 10);
        }
        
        const statusCronSchedule = `${statusMin} ${statusHour} * * *`;
        runningStatusJob = cron.schedule(statusCronSchedule, async () => {
            console.log("Esecuzione del job programmato per le Storie dei film...");
            try {
                const message = await getMoviesProgrammation();
                await client.sendMessage('status@broadcast', message);
                console.log("Storia WhatsApp giornaliera pubblicata con i film della settimana.");
            } catch (err) {
                console.error("Errore pubblicazione storia giornaliera:", err);
            }
        });
        console.log(`Cron job per le Storie inizializzato -> ${statusCronSchedule} (Ore ${statusCronTimeStr} tutti i giorni)`);
    } else {
        console.log("Cron job per le Storie disabilitato da config.");
    }
    
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    console.log(`Cron job per la rubrica inizializzato con schedule -> ${cronSchedule} (Giorno: ${giorni[cronDay] || cronDay}, Ore: ${cronTimeStr})`);
}

module.exports = { setupCronJobs };
