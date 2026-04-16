require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeLib = require('qrcode');
const { setupCronJobs } = require('./cronJobs');
const { getMoviesProgrammation } = require('./moviesScraper');
const WebApp = require('./server');
const subManager = require('./subscriberManager');
const configManager = require('./configManager');

WebApp.start(3000);

const client = new Client({ authStrategy: new LocalAuth() });
WebApp.setClient(client);

client.on('qr', async (qr) => {
    console.log('Codice QR ricevuto. Apri la Dashboard http://localhost:3000 dal tuo browser e scansiona il QR Code.');
    try {
        WebApp.setQrUrl(await qrcodeLib.toDataURL(qr));
    } catch (err) {
        console.error('Errore generazione QR image per la dashboard:', err);
    }
});

client.on('ready', () => {
    console.log('Client WhatsApp pronto!');
    WebApp.setStatus('connected');
    setupCronJobs(client);
});

client.on('message', async (msg) => {
    if (msg.fromMe) return;
    // Ignora gruppi, newsletter, stati e canali (@g.us, @newsletter, status@broadcast)
    // Permette sia @c.us che @lid (identificatore multi-device WhatsApp)
    if (msg.from.endsWith('@g.us') || msg.from.endsWith('@newsletter') || msg.from === 'status@broadcast') return;
    if (msg.isGroupMsg) return;

    const text = msg.body.trim().toLowerCase();
    const chatId = msg.from;
    const activeConf = configManager.getConfig();

    const cmdFilm = (activeConf.commands?.film || '!film').toLowerCase();
    const cmdStop = (activeConf.commands?.stop || '!stop').toLowerCase();
    const cmdStart = (activeConf.commands?.start || '!start').toLowerCase();

    if (text === cmdFilm) {
        msg.reply(await getMoviesProgrammation());
        return;
    }

    if (text === cmdStop) {
        subManager.disableSubscriber(chatId);
        msg.reply(activeConf.messages?.stop || 'Hai disattivato gli avvisi.');
        return;
    }

    if (text === cmdStart) {
        subManager.addSubscriber(chatId);
        msg.reply(activeConf.messages?.start || 'Hai riattivato gli avvisi.');
        return;
    }

    // Ricerca nei custom commands
    if (activeConf.customCommands && Array.isArray(activeConf.customCommands)) {
        const customFound = activeConf.customCommands.find(c => c.trigger && c.trigger.toLowerCase() === text);
        if (customFound && customFound.reply) {
            msg.reply(customFound.reply);
            return;
        }
    }

    // Normalizza l'ID del contatto: se è @lid recupera il numero reale @c.us
    let normalizedChatId = chatId;
    if (!chatId.endsWith('@c.us')) {
        try {
            const contact = await msg.getContact();
            if (contact && contact.id && contact.id._serialized) {
                normalizedChatId = contact.id._serialized; // formato corretto: +39...@c.us
            }
        } catch(e) {
            console.error("Errore nel recupero contatto:", e);
        }
    }

    // Se il comando non è riconosciuto ma l'utente è totalmente nuovo, allora lo sottoscrive e dà il benvenuto
    const subscribers = subManager.getAllSubscribers();
    if (!subscribers[normalizedChatId]) {
        subManager.addSubscriber(normalizedChatId);
        msg.reply(activeConf.messages?.welcome || 'Benvenuto!');
    }
});

client.initialize();
