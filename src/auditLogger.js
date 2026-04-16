const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../dati/audit_logs.json');
const MAX_LOGS = 200;

/**
 * Registra un'azione nel registro degli audit
 * @param {string} user Nome dell'utente che compie l'azione
 * @param {string} action Tipo di azione (es. "Update Config")
 * @param {string} details Dettagli dell'azione
 */
function logAction(user, action, details) {
    let logs = [];
    
    // Leggi log esistenti
    if (fs.existsSync(logFile)) {
        try {
            logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
        } catch (e) {
            logs = [];
        }
    }

    // Crea nuova voce
    const newEntry = {
        timestamp: new Date().toLocaleString('it-IT'),
        user: user || 'Sistema',
        action: action,
        details: details || ''
    };

    // Aggiungi in testa (più recente prima)
    logs.unshift(newEntry);

    // Mantieni solo gli ultimi MAX_LOGS
    if (logs.length > MAX_LOGS) {
        logs = logs.slice(0, MAX_LOGS);
    }

    // Scrivi su file
    try {
        fs.writeFileSync(logFile, JSON.stringify(logs, null, 2), 'utf8');
    } catch (err) {
        console.error("Errore salvataggio audit log:", err);
    }
}

// Alias per compatibilità
const log = logAction;

/**
 * Ritorna tutti i log
 */
function getLogs() {
    if (!fs.existsSync(logFile)) return [];
    try {
        return JSON.parse(fs.readFileSync(logFile, 'utf8'));
    } catch (e) {
        return [];
    }
}

module.exports = {
    logAction,
    log,
    getLogs
};
