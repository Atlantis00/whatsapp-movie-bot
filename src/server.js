const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { spawn } = require('child_process');
const subManager = require('./subscriberManager');
const configManager = require('./configManager');
const cronJobs = require('./cronJobs');
const ngrok = require('@ngrok/ngrok');
const helmet = require('helmet');
const session = require('express-session');
const auditLogger = require('./auditLogger');
const adminManager = require('./adminManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sicurezza Header
app.use(helmet({
    contentSecurityPolicy: false
}));

// Configurazione Sessioni
app.use(session({
    secret: 'cine-famiglia-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 ore
}));

app.use(express.json({ limit: '50mb' }));

// Middleware per proteggere la Dashboard (eccetto login e asset pubblici)
const protect = (req, res, next) => {
    const publicPaths = ['/login.html', '/login-script.js', '/style.css', '/api/login'];
    if (req.session.authenticated || publicPaths.includes(req.path)) {
        return next();
    }
    res.redirect('/login.html');
};

// Applica protezione a tutto tranne il login
app.use((req, res, next) => {
    if (req.path === '/' || req.path.startsWith('/api') || req.path.endsWith('.html')) {
        return protect(req, res, next);
    }
    next();
});

app.use(express.static(path.join(__dirname, 'public')));

// API Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    const admin = adminManager.findAdmin(username, password);

    if (admin) {
        req.session.authenticated = true;
        req.session.username = admin.username;
        req.session.roleName = admin.roleName;
        req.session.permissions = admin.permissions;
        auditLogger.logAction(admin.username, "Accesso Dashboard", "Login effettuato correttamente");
        res.json({ success: true });
    } else {
        auditLogger.logAction(username, "Fallito Accesso", "Tentativo di login con credenziali errate");
        res.status(401).json({ success: false, error: 'Credenziali errate' });
    }
});

app.post('/api/logout-session', (req, res) => {
    const user = req.session.username;
    auditLogger.logAction(user, "Uscita Dashboard", "Logout effettuato");
    req.session.destroy();
    res.json({ success: true });
});

// Middleware helper per permessi
const requirePermission = (perm) => (req, res, next) => {
    if (req.session.permissions && req.session.permissions[perm]) {
        return next();
    }
    res.status(403).json({ error: "Accesso negato: permesso mancante (" + perm + ")" });
};

// Endpoint per i Log (Audit)
app.get('/api/logs', requirePermission('logs'), (req, res) => {
    res.json(auditLogger.getLogs());
});

// Endpoint per info utente corrente
app.get('/api/me', (req, res) => {
    res.json({ 
        username: req.session.username,
        roleName: req.session.roleName,
        permissions: req.session.permissions || {}
    });
});

// Endpoint Gestione Admin
app.get('/api/admins', requirePermission('admins'), (req, res) => {
    res.json(adminManager.getAllForManagement());
});

app.post('/api/admins/self-destruct', requirePermission('admins'), (req, res) => {
    const { phrase } = req.body;
    
    // Sicurezza Suprema: SOLO Atlantis può distruggere
    if (req.session.username !== 'Atlantis') {
        return res.status(403).json({ error: "Solo l'account principale Atlantis può eseguire questa azione." });
    }

    if (phrase !== "ELIMINA BOT DEFINITIVAMENTE") {
        return res.status(400).json({ error: "Frase di conferma errata." });
    }

    auditLogger.logAction("SISTEMA", "AUTODISTRUZIONE AVVIATA", "Richiesta da Atlantis tramite Dashboard");
    
    const projectPath = path.resolve(__dirname, '..');
    const parentDir = path.dirname(projectPath);
    
    // Sicurezza: non cancellare se il percorso è troppo corto (previene disastri se il path è la root)
    if (projectPath.length < 5 || projectPath.split(path.sep).length < 2) {
        return res.status(500).json({ error: "Errore di sicurezza: percorso troppo breve." });
    }

    // Script di distruzione per Windows
    // Importante: usiamo 'cd /d c:\\' o il parentDir per uscire dalla cartella prima di cancellarla
    const script = `timeout /t 5 && cd /d "${parentDir}" && rd /s /q "${projectPath}"`;
    
    spawn('cmd.exe', ['/c', script], {
        detached: true,
        stdio: 'ignore',
        cwd: parentDir // Impostiamo la directory di lavoro fuori dal progetto
    }).unref();

    res.json({ success: true, message: "Addio. Il bot si autodistruggerà tra 5 secondi." });
    
    setTimeout(() => {
        process.exit(0);
    }, 2000);
});

app.post('/api/admins/remote-update', requirePermission('admins'), async (req, res) => {
    const { updateUrl } = req.body;
    
    // Sicurezza: SOLO Atlantis
    if (req.session.username !== 'Atlantis') {
        return res.status(403).json({ error: "Accesso negato." });
    }

    if (!updateUrl) return res.status(400).json({ error: "URL non valido." });

    try {
        auditLogger.logAction("SISTEMA", "DOWNLOAD AGGIORNAMENTO", `URL: ${updateUrl}`);
        const zipPath = path.resolve(__dirname, '..', 'update.zip');
        
        const response = await axios({
            method: 'get',
            url: updateUrl,
            responseType: 'stream'
        });

        const writer = fs.createWriteStream(zipPath);
        response.data.pipe(writer);

        writer.on('finish', () => {
            res.json({ success: true, message: "Aggiornamento scaricato. Il bot si riavviera' tra 3 secondi per installarlo." });
            setTimeout(() => {
                process.exit(100); // Trigger restart loop
            }, 3000);
        });

        writer.on('error', (err) => {
            throw err;
        });

    } catch (err) {
        console.error("Errore aggiornamento remoto:", err);
        res.status(500).json({ error: "Errore durante il download dell'aggiornamento." });
    }
});

app.post('/api/admins', requirePermission('admins'), (req, res) => {
    const { oldUsername, username, password, roleName, permissions } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Dati incompleti" });
    
    try {
        adminManager.addOrUpdateAdmin({ oldUsername, username, password, roleName, permissions });
        const details = oldUsername ? `Aggiornato account: ${username}` : `Creato nuovo account: ${username}`;
        auditLogger.logAction(req.session.username, "Gestione Account", details);
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

app.delete('/api/admins', requirePermission('admins'), (req, res) => {
    const { username } = req.body;
    if (adminManager.removeAdmin(username)) {
        auditLogger.logAction(req.session.username, "Gestione Account", `Eliminato account: ${username}`);
        res.json({ success: true });
    } else {
        res.status(400).json({ error: "Impossibile rimuovere l'utente master principale" });
    }
});

// API Endpoints Subscribers
app.get('/api/subscribers', requirePermission('users'), (req, res) => {
    res.json(subManager.getAllSubscribers());
});

app.post('/api/subscribers', requirePermission('users'), (req, res) => {
    const { chatId } = req.body;
    if (!chatId) return res.status(400).send('chatId is required');
    const user = subManager.addSubscriber(chatId);
    auditLogger.logAction(req.session.username, "Gestione Iscritti", `Aggiunto manualmente: ${chatId}`);
    res.json(user);
});

app.delete('/api/subscribers', requirePermission('users'), (req, res) => {
    const { chatId } = req.body;
    subManager.removeSubscriber(chatId);
    auditLogger.logAction(req.session.username, "Gestione Iscritti", `Rimosso manualmente: ${chatId}`);
    res.json({ success: true });
});

// API Endpoints Config (Impostazioni Testi)
app.get('/api/config', requirePermission('settings'), (req, res) => {
    res.json(configManager.getConfig());
});

app.post('/api/config', requirePermission('settings'), (req, res) => {
    configManager.updateConfig(req.body);
    auditLogger.logAction(req.session.username, "Aggiornata Configurazione", "Modificate le impostazioni dei testi o comandi");
    if (WebApp.client && botStatus === 'connected') {
        cronJobs.setupCronJobs(WebApp.client);
    }
    res.json({ success: true });
});

// API Ngrok Env Editor
app.get('/api/system/ngrok', requirePermission('settings'), (req, res) => {
    res.json({
        token: process.env.NGROK_AUTH_TOKEN || "",
        domain: process.env.NGROK_DOMAIN || ""
    });
});

app.post('/api/system/ngrok', requirePermission('settings'), (req, res) => {
    const { token, domain } = req.body;
    const envPath = path.resolve(__dirname, '../.env');
    let envContent = '';
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf8');
    }

    const setEnvVal = (key, val) => {
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${val}`);
        } else {
            envContent += `\n${key}=${val}`;
        }
    };

    setEnvVal('NGROK_AUTH_TOKEN', token || "");
    setEnvVal('NGROK_DOMAIN', domain || "");

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    auditLogger.logAction(req.session.username, "Modifica Accesso Remoto", "Aggiornato Token Ngrok (richiesto riavvio)");

    res.json({ success: true });
    
    // Inizia la procedura di riavvio controllato per ricaricare .env
    setTimeout(() => {
        process.exit(100); // 100 equivale al riavvio per i nostri script launcher
    }, 2000);
});

app.post('/api/stop', (req, res) => {
    const user = req.session.username;
    auditLogger.logAction(user, "Arresto Bot", "Richiesto spegnimento totale del bot");
    console.log(`Richiesto spegnimento del bot da ${user} tramite Dashboard Web.`);
    res.json({ success: true });
    setTimeout(() => {
        process.exit(99); // Codice speciale per lo STOP DEFINITIVO
    }, 1000);
});

app.post('/api/restart', (req, res) => {
    const user = req.session.username;
    auditLogger.logAction(user, "Riavvio Bot", "Richiesto riavvio controllato della sessione");
    console.log(`Richiesto riavvio del bot da ${user} tramite Dashboard Web.`);
    res.json({ success: true });
    setTimeout(() => {
        process.exit(100); // Exit code 100 segnala il riavvio agli script launcher
    }, 1000);
});

// Logout da WhatsApp
app.post('/api/logout', async (req, res) => {
    if (WebApp.client) {
        try {
            const user = req.session.username;
            auditLogger.logAction(user, "Disconnessione WhatsApp", "Richiesto logout dell'account dal client");
            console.log("Richiesto logout di WhatsApp tramite Dashboard Web.");
            await WebApp.client.logout();
            res.json({ success: true });
            setTimeout(() => {
                process.exit(1); // Exit 1 triggers restart in the .bat loop
            }, 1000);
        } catch (err) {
            console.error("Errore durante il logout:", err);
            res.status(500).json({ error: "Errore nel logout" });
        }
    } else {
        res.status(400).json({ error: "Client non inizializzato" });
    }
});

// Aggiornamento Stato Profile
app.post('/api/profile-info', requirePermission('settings'), async (req, res) => {
    const { statusText } = req.body;
    if (!statusText) return res.status(400).send('Stato non valido');
    
    if (WebApp.client && botStatus === 'connected') {
        try {
            await WebApp.client.setStatus(statusText);
            auditLogger.logAction(req.session.username, "Aggiornato Stato Info", `Nuovo stato: ${statusText}`);
            res.json({ success: true });
        } catch (err) {
            console.error("Errore durante l'aggiornamento stato:", err);
            res.status(500).json({ error: "Errore durante l'aggiornamento" });
        }
    } else {
        res.status(400).json({ error: "Client non connesso" });
    }
});

app.post('/api/post-status', requirePermission('stories'), async (req, res) => {
    if (!WebApp.client || botStatus !== 'connected') {
        return res.status(400).json({ error: "Bot disconnesso" });
    }
    const { text, imageBase64, mimetype, filename } = req.body;
    
    try {
        let content = text || '';
        let options = {};
        
        if (imageBase64) {
            const { MessageMedia } = require('whatsapp-web.js');
            content = new MessageMedia(mimetype, imageBase64.split(',')[1], filename || 'status.jpg');
            if (text) {
                options.caption = text;
            }
        }
        
        await WebApp.client.sendMessage('status@broadcast', content, options);
        auditLogger.logAction(req.session.username, "Pubblicata Storia", text ? `Testo: ${text}` : "Solo immagine");
        res.json({ success: true });
    } catch (e) {
        console.error("Errore post status:", e);
        res.status(500).json({ error: "Errore durante pubblicazione storia" });
    }
});

let botStatus = 'offline';
let latestQrUrl = null;
let publicUrl = null;

io.on('connection', (socket) => {
    socket.emit('bot_status', botStatus);
    if (latestQrUrl && botStatus === 'offline') {
        socket.emit('qr_code', latestQrUrl);
    }
    if (publicUrl) {
        socket.emit('ngrok_url', publicUrl);
    }
});

// API per ottenere l'URL pubblico ngrok
app.get('/api/ngrok-url', (req, res) => {
    res.json({ url: publicUrl });
});

const WebApp = {
    client: null,
    setClient: (clientInstance) => {
        WebApp.client = clientInstance;
    },
    start: (port = 3000) => {
        server.listen(port, () => {
            console.log(`\n======================================================`);
            console.log(` SERVER WEB AVVIATO CON SUCCESSO! [Sviluppato da G. Zarantonello]`);
            console.log(` VAI SUL TUO BROWSER ALL'INDIRIZZO:  http://localhost:${port}`);
            console.log(`======================================================\n`);

            // Avvia tunnel ngrok se è presente il token
            const ngrokToken = process.env.NGROK_AUTH_TOKEN;
            const ngrokDomain = process.env.NGROK_DOMAIN;
            if (ngrokToken) {
                const config = { addr: port, authtoken: ngrokToken };
                if (ngrokDomain) config.domain = ngrokDomain;

                ngrok.connect(config)
                    .then(listener => {
                        publicUrl = listener.url();
                        io.emit('ngrok_url', publicUrl);
                        console.log(`======================================================`);
                        console.log(` 🌐 ACCESSO REMOTO ATTIVO!`);
                        console.log(` URL PUBBLICO:  ${publicUrl}`);
                        console.log(` (Chiunque con questo link può accedere alla dashboard)`);
                        console.log(`======================================================\n`);
                    })
                    .catch(err => {
                        console.warn(` ⚠️  ngrok non avviato: ${err.message}`);
                        console.warn(` Controlla che NGROK_AUTH_TOKEN nel file .env sia valido.\n`);
                    });
            } else {
                console.log(` ℹ️  Accesso remoto disabilitato. Aggiungi NGROK_AUTH_TOKEN nel file .env per abilitarlo.\n`);
            }
        });
    },
    setStatus: (status) => {
        botStatus = status;
        io.emit('bot_status', status);
    },
    setQrUrl: (qrDataUrl) => {
        latestQrUrl = qrDataUrl;
        if (botStatus !== 'connected') {
            io.emit('qr_code', qrDataUrl);
        }
    }
};

module.exports = WebApp;
