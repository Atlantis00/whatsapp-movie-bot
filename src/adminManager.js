const fs = require('fs');
const path = require('path');

const adminsFile = path.join(__dirname, '../dati/admins.json');

const DEFAULT_PERMS_MASTER = {
    users: true,
    settings: true,
    stories: true,
    logs: true,
    admins: true
};

const DEFAULT_PERMS_STANDARD = {
    users: true,
    settings: true,
    stories: true,
    logs: false,
    admins: false
};

/**
 * Inizializza il file degli admin se non esiste, migrando dal .env se necessario.
 * Gestisce anche la migrazione dal vecchio formato 'role' al nuovo 'permissions'.
 */
function initialize() {
    let admins = [];
    if (!fs.existsSync(adminsFile)) {
        admins = [
            { 
                username: process.env.DASHBOARD_USER || 'Cinebot', 
                password: process.env.DASHBOARD_PASS || 'Cinefamiglia',
                roleName: 'Assistente',
                permissions: { ...DEFAULT_PERMS_STANDARD }
            },
            { 
                username: process.env.DASHBOARD_USER_2 || 'Atlantis', 
                password: process.env.DASHBOARD_PASS_2 || 'Gabriele2007',
                roleName: 'Proprietario',
                permissions: { ...DEFAULT_PERMS_MASTER }
            }
        ];
    } else {
        try {
            admins = JSON.parse(fs.readFileSync(adminsFile, 'utf8'));
            // Migrazione: se trovi un admin col vecchio formato 'role', convertilo
            admins = admins.map(a => {
                if (a.role && !a.permissions) {
                    const isMaster = a.role === 'master' || a.username === 'Atlantis';
                    return {
                        username: a.username,
                        password: a.password,
                        roleName: isMaster ? 'Proprietario' : 'Collaboratore',
                        permissions: isMaster ? { ...DEFAULT_PERMS_MASTER } : { ...DEFAULT_PERMS_STANDARD }
                    };
                }
                // Forza Atlantis ad essere sempre master per sicurezza
                if (a.username === 'Atlantis') {
                    a.permissions = { ...DEFAULT_PERMS_MASTER };
                    a.roleName = a.roleName || 'Proprietario';
                }
                return a;
            });
        } catch (e) {
            admins = [];
        }
    }
    saveAdmins(admins);
}

function getAdmins() {
    if (!fs.existsSync(adminsFile)) initialize();
    try {
        return JSON.parse(fs.readFileSync(adminsFile, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveAdmins(admins) {
    fs.writeFileSync(adminsFile, JSON.stringify(admins, null, 2), 'utf8');
}

function findAdmin(username, password) {
    const admins = getAdmins();
    // Case-insensitive check per lo username per evitare errori di battitura comuni
    return admins.find(a => a.username.toLowerCase() === username.toLowerCase() && a.password === password) || null;
}

function getAllForManagement() {
    return getAdmins();
}

function addOrUpdateAdmin(adminData) {
    const admins = getAdmins();
    const { oldUsername, username, password, roleName, permissions } = adminData;

    // Se stiamo modificando un utente esistente (rinomina inclusa)
    let index = -1;
    if (oldUsername) {
        index = admins.findIndex(a => a.username.toLowerCase() === oldUsername.toLowerCase());
    } else {
        // Altrimenti cerchiamo per lo username attuale (aggiunta o update diretto)
        index = admins.findIndex(a => a.username.toLowerCase() === username.toLowerCase());
    }
    
    // Default permissions se non forniti
    const perms = permissions || { ...DEFAULT_PERMS_STANDARD };
    
    const newAdmin = {
        username: username,
        password: password,
        roleName: roleName || 'Collaboratore',
        permissions: username.toLowerCase() === 'atlantis' || (oldUsername && oldUsername.toLowerCase() === 'atlantis') 
                     ? { ...DEFAULT_PERMS_MASTER } : perms
    };

    // Impedisci di rinominare Atlantis ad altro, o di rinominare altro ad Atlantis
    if (oldUsername && oldUsername.toLowerCase() === 'atlantis' && username.toLowerCase() !== 'atlantis') {
        throw new Error("Non puoi rinominare l'utente principale Atlantis.");
    }

    if (index !== -1) {
        admins[index] = newAdmin;
    } else {
        admins.push(newAdmin);
    }
    
    saveAdmins(admins);
    return true;
}

function removeAdmin(username) {
    if (username.toLowerCase() === 'atlantis') return false; 
    let admins = getAdmins();
    admins = admins.filter(a => a.username.toLowerCase() !== username.toLowerCase());
    saveAdmins(admins);
    return true;
}

initialize();

module.exports = {
    getAdmins,
    findAdmin,
    getAllForManagement,
    addOrUpdateAdmin,
    removeAdmin
};
