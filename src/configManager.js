const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../dati/config.json');

const defaultConfig = {
  cron: {
    day: 1,
    time: "12:00"
  },
  dailyStatus: {
    enabled: true,
    time: "09:00"
  },
  commands: {
    film: "!film",
    stop: "!stop",
    start: "!start"
  },
  messages: {
    stop: "❌ Hai disattivato gli aggiornamenti settimanali della rubrica di Cinema Famiglia.\n\nPer riattivarli, scrivi !start in qualsiasi momento.",
    start: "✅ Hai riattivato con successo gli aggiornamenti! Riceverai di nuovo la programmazione dei film della settimana.",
    welcome: "Benvenuto alla rubrica di *Cinema Famiglia*! 🍿\n\nSei stato iscritto automaticamente all'elenco per ricevere ogni settimana le nostre novità sui film in programmazione!\n\n_Se vuoi sapere i film di adesso scrivi_ *!film*\n_Se vuoi annullare in qualsiasi momento la ricezione automatica, scrivi_ *!stop*"
  },
  customCommands: []
};

function readConfig() {
    if (!fs.existsSync(dataFile)) {
        writeConfig(defaultConfig);
        return defaultConfig;
    }
    const rawData = fs.readFileSync(dataFile, 'utf8');
    try {
        const parsed = JSON.parse(rawData);
        // Fallback per customCommands se non esiste nei vecchi file
        if (!parsed.customCommands) parsed.customCommands = [];
        return parsed;
    } catch (e) {
        return defaultConfig;
    }
}

function writeConfig(data) {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
    getConfig: readConfig,
    updateConfig: (newConf) => writeConfig(newConf)
};
