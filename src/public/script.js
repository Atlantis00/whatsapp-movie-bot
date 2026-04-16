let currentBotStatus = 'offline';

// --- SISTEMA POPUP PREMIUM MODERNO ---
function injectModal() {
    if (document.getElementById('custom-modal-overlay')) return;
    const modalHtml = `
        <div id="custom-modal-overlay" class="modal-overlay">
            <div class="modal-content" id="modal-container">
                <div class="modal-icon" id="modal-icon">ℹ️</div>
                <div class="modal-title" id="modal-title">Titolo</div>
                <div class="modal-text" id="modal-text">Messaggio del popup...</div>
                <div class="modal-buttons">
                    <button id="modal-btn-cancel" class="btn-secondary" style="display:none">Annulla</button>
                    <button id="modal-btn-confirm">OK</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.showModal = function({ title, text, type = 'info', confirmText = 'OK', cancelText = 'Annulla', showCancel = false }) {
    injectModal();
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-modal-overlay');
        const container = document.getElementById('modal-container');
        const elTitle = document.getElementById('modal-title');
        const elText = document.getElementById('modal-text');
        const elIcon = document.getElementById('modal-icon');
        const btnConfirm = document.getElementById('modal-btn-confirm');
        const btnCancel = document.getElementById('modal-btn-cancel');

        // Setup icone e classi
        container.className = 'modal-content modal-type-' + type;
        const icons = { info: 'ℹ️', success: '✅', error: '❌', confirm: '❓', warning: '⚠️', restart: '🔄' };
        elIcon.innerText = icons[type] || 'ℹ️';
        
        elTitle.innerText = title || 'Messaggio';
        elText.innerText = text || '';
        btnConfirm.innerText = confirmText;
        btnCancel.innerText = cancelText;
        btnCancel.style.display = showCancel ? 'block' : 'none';

        overlay.classList.add('active');

        const cleanup = (result) => {
            overlay.classList.remove('active');
            btnConfirm.onclick = null;
            btnCancel.onclick = null;
            resolve(result);
        };

        btnConfirm.onclick = () => cleanup(true);
        btnCancel.onclick = () => cleanup(false);
        overlay.onclick = (e) => { if(e.target === overlay) cleanup(false); };
    });
};

// --- VARIABILI GLOBALI E SOCKET ---
const socket = io();
const elStatus = document.getElementById('connection-status');
const elQrContainer = document.getElementById('qr-container');
const elQrImage = document.getElementById('qr-image');
const elQrPlaceholder = document.getElementById('qr-placeholder');
const tbSubscribers = document.getElementById('subscribers-list');
const btnAddUser = document.getElementById('btn-add-user');
const inputNewUser = document.getElementById('new-user-number');
const btnRefresh = document.getElementById('btn-refresh');

socket.on('bot_status', (status) => {
    currentBotStatus = status;
    const qrSection = document.getElementById('qr-section');
    if (status === 'connected') {
        elStatus.className = 'status-badge online';
        elStatus.innerHTML = 'Online';
        qrSection.style.display = 'none';
    } else {
        elStatus.className = 'status-badge offline';
        elStatus.innerHTML = 'Offline';
        // Mostra solo se il tab attuale è uno di quelli consentiti
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
        if (activeTab && (activeTab === 'tab-logs' || activeTab === 'tab-admins')) {
            qrSection.style.display = 'none';
        } else {
            qrSection.style.display = 'block';
        }
    }
});

socket.on('qr_code', (qrDataUrl) => {
    elQrPlaceholder.style.display = 'none';
    elQrImage.style.display = 'block';
    elQrImage.src = qrDataUrl;
});

socket.on('ngrok_url', (url) => {
    const container = document.getElementById('remote-access-container');
    const btnCopy = document.getElementById('btn-copy-remote');
    if (url) {
        container.style.display = 'flex';
        btnCopy.onclick = () => {
            navigator.clipboard.writeText(url).then(() => {
                const originalText = btnCopy.innerText;
                btnCopy.innerText = '✅ Copiato!';
                btnCopy.style.background = '#10b981';
                setTimeout(() => {
                    btnCopy.innerText = originalText;
                    btnCopy.style.background = '';
                }, 2000);
            });
        };
    } else {
        container.style.display = 'none';
    }
});

async function loadSubscribers() {
    try {
        const response = await fetch('/api/subscribers');
        const data = await response.json();
        
        tbSubscribers.innerHTML = '';
        const entries = Object.entries(data).sort((a,b) => (b[1].active ? 1 : 0) - (a[1].active ? 1 : 0));
        if (entries.length === 0) {
            tbSubscribers.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">Nessun iscritto presente.</td></tr>';
            return;
        }

        entries.forEach(([id, info]) => {
            const tr = document.createElement('tr');
            // Estrai il numero raw (rimuove @c.us, @lid, ecc.)
            const rawPhone = id.split('@')[0];
            // Mostra sempre con il + davanti per chiarezza; se è @lid indica che è un ID interno
            const isLid = id.endsWith('@lid');
            const displayPhone = isLid 
                ? `ID interno: ${rawPhone}` 
                : `+${rawPhone}`;
            const statusClass = info.active ? 'badge-active' : 'badge-inactive';
            const statusText = info.active ? 'Attivo' : 'Disattivo';
            
            tr.innerHTML = `
                <td><strong>${displayPhone}</strong></td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td><button class="btn-danger" onclick="removeSub('${id}')">Elimina</button></td>
            `;
            tbSubscribers.appendChild(tr);
        });
    } catch (e) {
        console.error("Errore nel caricamento iscritti", e);
    }
}

btnAddUser.addEventListener('click', async () => {
    const rawNumber = inputNewUser.value.trim();
    if (!rawNumber) return;
    const cleanNumber = rawNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) return showModal({ title: 'Numero non valido', text: 'Inserisci un numero valido (es: 393...)', type: 'error' });
    
    await fetch('/api/subscribers', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chatId: `${cleanNumber}@c.us` })
    });
    inputNewUser.value = '';
    loadSubscribers();
});

btnRefresh.addEventListener('click', loadSubscribers);
window.removeSub = async (id) => {
    const confirmed = await showModal({ 
        title: 'Elimina Iscritto', 
        text: 'Eliminare definitivamente questo numero?', 
        type: 'confirm', 
        showCancel: true, 
        confirmText: 'Sì, elimina',
        cancelText: 'No'
    });
    if (!confirmed) return;
    await fetch(`/api/subscribers`, { 
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chatId: id })
    });
    loadSubscribers();
};

setInterval(loadSubscribers, 5000);
loadSubscribers();

// Controllo Permessi Utente per Tab Individuali
async function checkPermissions() {
    try {
        const res = await fetch('/api/me');
        const user = await res.json();
        
        const perms = user.permissions || { users: true, settings: true, stories: true };
        
        // Aggiorna info profilo nella testata
        const elUserName = document.getElementById('current-username');
        const elUserRole = document.getElementById('current-role');
        if (elUserName) elUserName.innerText = user.username;
        if (elUserRole) elUserRole.innerText = user.roleName || 'Collaboratore';

        // Mappatura Tab -> Permessi
        const tabMap = {
            'tab-users': !!perms.users,
            'tab-settings': !!perms.settings,
            'tab-stories': !!perms.stories,
            'nav-logs': !!perms.logs,
            'nav-admins': !!perms.admins
        };
        
        // Se non ci sono permessi (vecchia sessione), forza ricaricamento o logout per sicurzza
        // ma Atlantis è sempre OK.
        if (Object.keys(perms).length === 0 && user.username !== 'Atlantis') {
            console.warn("Sessione obsoleta rilevata.");
        }

        // Nascondi i tab a cui l'utente non ha accesso
        Object.keys(tabMap).forEach(id => {
            const el = document.getElementById(id) || document.querySelector(`[onclick="switchTab('${id}')"]`);
            if (el && !tabMap[id]) {
                el.style.display = 'none';
            }
        });

        // Se il tab iniziale (tab-users) è negato, vai al primo disponibile
        if (!perms.users) {
            if (perms.settings) switchTab('tab-settings');
            else if (perms.stories) switchTab('tab-stories');
            else if (perms.logs) switchTab('tab-logs');
            else if (perms.admins) switchTab('tab-admins');
        }

        // MOSTRA ZONE SPECIALI SOLO AD ATLANTIS
        const dangerZone = document.getElementById('danger-zone');
        const updateZone = document.getElementById('update-zone');
        const isAtlantis = user.username.toLowerCase() === 'atlantis';

        if (dangerZone) dangerZone.style.display = isAtlantis ? 'block' : 'none';
        if (updateZone) updateZone.style.display = isAtlantis ? 'block' : 'none';

    } catch (e) {
        console.error("Errore controllo permessi:", e);
    }
}
checkPermissions();

// ----------------------------------------------------
// TABS E IMPOSTAZIONI + CHATBOT
// ----------------------------------------------------
window.switchTab = function(tabId) {
    // Nascondi tutti i contenuti dei tab
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none'; // Backwards compatibility with inline styles if any
    });
    
    // Rimuovi classe active da tutti i bottoni
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Mostra il tab selezionato
    const activeSection = document.getElementById(tabId);
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.style.display = 'block';
    }
    
    // Evidenzia il bottone corretto
    const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // Gestione visibilità QR Section in base al tab
    const qrSection = document.getElementById('qr-section');
    if (currentBotStatus !== 'connected') {
        if (tabId === 'tab-logs' || tabId === 'tab-admins') {
            qrSection.style.display = 'none';
        } else {
            qrSection.style.display = 'block';
        }
    }
    
    if (tabId === 'tab-settings') {
        loadConfig();
    }
    if (tabId === 'tab-remote') {
        loadNgrokConfig();
    }
    if (tabId === 'tab-logs') fetchLogs();
    if (tabId === 'tab-admins') loadAdmins();
};

let loadedCustomCmds = [];

async function loadConfig() {
    const data = await (await fetch('/api/config')).json();
    document.getElementById('cfg-cron-day').value = data.cron?.day ?? 1;
    document.getElementById('cfg-cron-time').value = data.cron?.time ?? '12:00';
    document.getElementById('cfg-daily-status-enabled').checked = data.dailyStatus?.enabled ?? true;
    document.getElementById('cfg-daily-status-time').value = data.dailyStatus?.time ?? '09:00';
    document.getElementById('cfg-cmd-film').value = data.commands?.film || '';
    document.getElementById('cfg-cmd-stop').value = data.commands?.stop || '';
    document.getElementById('cfg-cmd-start').value = data.commands?.start || '';
    document.getElementById('cfg-msg-welcome').value = data.messages?.welcome || '';
    document.getElementById('cfg-msg-stop').value = data.messages?.stop || '';
    document.getElementById('cfg-msg-start').value = data.messages?.start || '';
    
    loadedCustomCmds = Array.isArray(data.customCommands) ? data.customCommands : [];
    renderCustomCommands();
}

async function loadNgrokConfig() {
    try {
        // Carica configurazione salvata
        const resEnv = await fetch('/api/system/ngrok');
        const envData = await resEnv.json();
        
        const tk = document.getElementById('cfg-ngrok-token');
        const dm = document.getElementById('cfg-ngrok-domain');
        if (tk) tk.value = envData.token || '';
        if (dm) dm.value = envData.domain || '';

        // Carica stato attuale della sessione (public url)
        const resStatus = await fetch('/api/ngrok-url');
        const statusData = await resStatus.json();
        
        const badge = document.getElementById('ngrok-status-badge');
        const infoBox = document.getElementById('ngrok-info-box');
        const urlCode = document.getElementById('ngrok-public-url');

        if (statusData && statusData.url) {
            badge.innerText = 'Attivo';
            badge.className = 'status-badge online';
            
            infoBox.style.display = 'block';
            urlCode.innerText = statusData.url;
        } else {
            badge.innerText = 'Disattivato';
            badge.className = 'status-badge offline';
            
            infoBox.style.display = 'none';
        }
    } catch (e) {
        console.error("Errore caricamento ngrok config:", e);
    }
}

window.toggleTokenVisibility = () => {
    const tk = document.getElementById('cfg-ngrok-token');
    const btn = event.currentTarget;
    if (tk.type === 'password') {
        tk.type = 'text';
        btn.innerHTML = '🙈 Nascondi';
    } else {
        tk.type = 'password';
        btn.innerHTML = '👁️ Mostra';
    }
};

window.copyNgrokUrl = () => {
    const url = document.getElementById('ngrok-public-url').innerText;
    if (url && url !== '---') {
        navigator.clipboard.writeText(url);
        showToast('Link copiato negli appunti!', 'success');
    }
};

function renderCustomCommands() {
    const list = document.getElementById('custom-commands-list');
    list.innerHTML = '';
    loadedCustomCmds.forEach((cmd, idx) => {
        const div = document.createElement('div');
        div.className = 'custom-cmd-card';
        div.innerHTML = `
            <button class="cmd-delete-btn btn-danger" onclick="removeCustomCmd(${idx})">🗑️ Elimina</button>
            <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;">
                <div class="config-group" style="margin-bottom: 0;">
                    <label>Innesco (Keyword):</label>
                    <input type="text" class="cfg-input" id="cc-trig-${idx}" value="${cmd.trigger}" placeholder="es: !orari" style="width: 100%; max-width: 300px; font-weight: bold; color: #fff; font-size: 1.1rem;">
                </div>
                <div class="config-group" style="margin-bottom: 0;">
                    <label>Risposta Automatica:</label>
                    <textarea class="cfg-textarea" id="cc-rep-${idx}" placeholder="Scrivi qui il messaggio di risposta..." style="width: 100%; min-height: 120px; font-size: 1rem; line-height: 1.4;">${cmd.reply}</textarea>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('btn-add-custom-cmd').addEventListener('click', () => {
    // Save current values back to array before pushing new empty one
    syncCustomCmds();
    loadedCustomCmds.push({ trigger: '', reply: '' });
    renderCustomCommands();
});

window.removeCustomCmd = (index) => {
    syncCustomCmds();
    loadedCustomCmds.splice(index, 1);
    renderCustomCommands();
};

function syncCustomCmds() {
    loadedCustomCmds.forEach((cmd, idx) => {
        const t = document.getElementById(`cc-trig-${idx}`);
        const r = document.getElementById(`cc-rep-${idx}`);
        if(t && r) {
            cmd.trigger = t.value.trim();
            cmd.reply = r.value.trim();
        }
    });
}

document.getElementById('btn-save-ngrok').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-ngrok');
    const token = document.getElementById('cfg-ngrok-token').value.trim();
    const domain = document.getElementById('cfg-ngrok-domain').value.trim();
    
    if (!token) {
        showToast('Inserisci un token valido per attivare l\'accesso remoto.', 'error');
        return;
    }

    btn.innerHTML = 'Salvataggio in corso...';
    btn.disabled = true;
    
    try {
        await fetch('/api/system/ngrok', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, domain })
        });
        
        btn.innerHTML = 'Riavvio Rete...';
        showToast('Credenziali salvate. Il bot si sta riavviando per attivare la rete...', 'info');
        
        setTimeout(() => { window.location.reload(); }, 5000);
        
    } catch (e) {
        showToast('Errore durante il salvataggio rete.', 'error');
        btn.innerHTML = 'Salva & Riavvia Rete';
        btn.disabled = false;
    }
});

document.getElementById('btn-disconnect-ngrok').addEventListener('click', async () => {
    if (!confirm("Sei sicuro di voler disabilitare l'accesso remoto? Il bot si riavvierà per chiudere la connessione sicura.")) return;

    const btn = document.getElementById('btn-disconnect-ngrok');
    btn.innerHTML = 'Disconnessione...';
    btn.disabled = true;

    try {
        // Inviamo stringhe vuote per pulire il .env
        await fetch('/api/system/ngrok', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: '', domain: '' })
        });
        
        showToast('Accesso remoto disabilitato. Riavvio in corso...', 'info');
        setTimeout(() => { window.location.reload(); }, 5000);
    } catch (e) {
        showToast('Errore durante la disconnessione.', 'error');
        btn.innerHTML = '🛑 Disabilita e Scollega';
        btn.disabled = false;
    }
});

document.getElementById('btn-save-config').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-config');
    btn.innerHTML = 'Salvataggio in corso...';
    
    syncCustomCmds();
    
    // Filter out empties
    const validCmds = loadedCustomCmds.filter(c => c.trigger !== '' && c.reply !== '');
    
    const freshConf = {
        cron: {
            day: parseInt(document.getElementById('cfg-cron-day').value, 10),
            time: document.getElementById('cfg-cron-time').value
        },
        dailyStatus: {
            enabled: document.getElementById('cfg-daily-status-enabled').checked,
            time: document.getElementById('cfg-daily-status-time').value
        },
        commands: {
            film: document.getElementById('cfg-cmd-film').value.trim(),
            stop: document.getElementById('cfg-cmd-stop').value.trim(),
            start: document.getElementById('cfg-cmd-start').value.trim()
        },
        messages: {
            welcome: document.getElementById('cfg-msg-welcome').value.trim(),
            stop: document.getElementById('cfg-msg-stop').value.trim(),
            start: document.getElementById('cfg-msg-start').value.trim()
        },
        customCommands: validCmds
    };
    
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(freshConf)
        });
        btn.innerHTML = 'Salvato!';
        setTimeout(() => btn.innerHTML = 'Salva Tutte le Modifiche', 2000);
        
        // Reload per pulire graficamente vuoti
        loadConfig();
    } catch (e) {
        showModal({ title: 'Errore', text: 'Errore nel salvataggio della configurazione.', type: 'error' });
        btn.innerHTML = 'Salva Tutte le Modifiche';
    }
});

// GESTIONE SPEGNIMENTO BOT E LOGOUT
document.getElementById('btn-stop-bot').addEventListener('click', async () => {
    const confirmed = await showModal({
        title: 'Arresto Bot',
        text: 'Sei sicuro di voler arrestare completamente il bot?\n\nNon risponderà più finché non lo riavvierai manualmente.',
        type: 'confirm',
        showCancel: true,
        confirmText: 'Arresta',
        cancelText: 'Annulla'
    });
    if (!confirmed) return;
    
    try {
        await fetch('/api/stop', { method: 'POST' });
        
        const btnStop = document.getElementById('btn-stop-bot');
        btnStop.innerText = 'Bot Spento';
        btnStop.disabled = true;
        btnStop.style.opacity = '0.5';
        
        document.getElementById('connection-status').className = 'status-badge offline';
        document.getElementById('connection-status').innerHTML = 'Offline - Spento';
        document.getElementById('btn-logout').style.display = 'none';
        
        await showModal({ 
            title: 'Bot Arrestato', 
            text: 'Il bot è stato fermato con successo. Questa scheda si chiuderà automaticamente tra 2 secondi.', 
            type: 'success',
            confirmText: 'Chiudi Ora'
        });

        // Tenta di chiudere la finestra
        window.close();
        
        // Se window.close() viene bloccato dal browser (comune), mostra messaggio di chiusura manuale
        setTimeout(() => {
            document.body.innerHTML = `
                <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #09090b; color: #fff; font-family: sans-serif; text-align: center; padding: 2rem;">
                    <div style="font-size: 4rem; margin-bottom: 2rem;">👋</div>
                    <h1 style="font-size: 2.2rem; margin-bottom: 1rem; background: linear-gradient(to right, #60a5fa, #34d399); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Bot Spento Correttamente</h1>
                    <p style="color: #94a3b8; font-size: 1.2rem; max-width: 500px; line-height: 1.6;">Tutte le attività sono state arrestate. <br>Puoi chiudere questa scheda del browser in sicurezza.</p>
                </div>
            `;
        }, 500);

    } catch (e) {
        showModal({ title: 'Errore', text: "Errore nell'arresto del bot.", type: 'error' });
        console.error(e);
    }
});

document.getElementById('btn-restart-bot').addEventListener('click', async () => {
    const confirmed = await showModal({
        title: 'Riavvio Bot',
        text: 'Vuoi riavviare il bot? La dashboard si ricaricherà automaticamente tra qualche secondo.',
        type: 'restart',
        showCancel: true,
        confirmText: 'Riavvia Ora',
        cancelText: 'No'
    });
    if (!confirmed) return;
    
    try {
        await fetch('/api/restart', { method: 'POST' });
        
        const btn = document.getElementById('btn-restart-bot');
        btn.innerText = 'Riavvio in corso...';
        btn.disabled = true;
        
        // Attendi che il bot si riaccenda e ricarica la pagina
        setTimeout(() => {
            location.reload();
        }, 5000);
    } catch (e) {
        showModal({ title: 'Errore', text: 'Errore durante la richiesta di riavvio.', type: 'error' });
    }
});

let allLogs = [];

async function fetchLogs() {
    try {
        const res = await fetch('/api/logs');
        allLogs = await res.json();
        updateLogFilterOptions();
        applyLogFilters();
    } catch (e) {
        console.error("Errore recupero log:", e);
    }
}

function updateLogFilterOptions() {
    const actionSelect = document.getElementById('filter-log-action');
    const userSelect = document.getElementById('filter-log-user');
    
    // Salva i valori correnti per non perderli durante l'aggiornamento
    const currentAction = actionSelect.value;
    const currentUser = userSelect.value;
    
    const uniqueActions = [...new Set(allLogs.map(l => l.action))].sort();
    const uniqueUsers = [...new Set(allLogs.map(l => l.user))].sort();
    
    actionSelect.innerHTML = '<option value="">Tutte le azioni</option>';
    uniqueActions.forEach(act => {
        actionSelect.innerHTML += `<option value="${act}" ${act === currentAction ? 'selected' : ''}>${act}</option>`;
    });
    
    userSelect.innerHTML = '<option value="">Tutti gli utenti</option>';
    uniqueUsers.forEach(u => {
        userSelect.innerHTML += `<option value="${u}" ${u === currentUser ? 'selected' : ''}>${u}</option>`;
    });
}

function applyLogFilters() {
    const filterAction = document.getElementById('filter-log-action').value;
    const filterUser = document.getElementById('filter-log-user').value;
    const searchDate = document.getElementById('filter-log-date').value;

    const filtered = allLogs.filter(log => {
        const parts = log.timestamp.split(', ');
        let matchDate = true;

        if (parts.length >= 2 && searchDate) {
            const datePart = parts[0];
            const [day, month, year] = datePart.split('/');
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            matchDate = (isoDate === searchDate);
        }

        const matchAction = !filterAction || log.action === filterAction;
        const matchUser = !filterUser || log.user === filterUser;

        return matchAction && matchUser && matchDate;
    });

    renderLogsUI(filtered);
}

function renderLogsUI(logs) {
    const list = document.getElementById('logs-list');
    list.innerHTML = '';
    if (logs.length === 0) {
        list.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem; color: var(--text-muted);">Nessun log trovato con i filtri attuali.</td></tr>';
        return;
    }
    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${log.timestamp}</td>
            <td><span class="user-badge">${log.user}</span></td>
            <td><strong>${log.action}</strong></td>
            <td style="font-size: 0.85rem; color: var(--text-muted);">${log.details || ''}</td>
        `;
        list.appendChild(tr);
    });
}

// GESTIONE AMMINISTRATORI (Solo Master)
async function loadAdmins() {
    try {
        const res = await fetch('/api/admins');
        if (!res.ok) {
            console.error("Accesso negato o errore server");
            return;
        }
        const admins = await res.json();
        if (!Array.isArray(admins)) return;

        const list = document.getElementById('admins-list');
        list.innerHTML = '';
        
        admins.forEach(admin => {
            const tr = document.createElement('tr');
            const isSelf = admin.username.toLowerCase() === 'atlantis';
            
            // Crea stringa icone permessi
            let permIcons = [];
            const p = admin.permissions || {};
            if (p.users) permIcons.push('👥');
            if (p.settings) permIcons.push('⚙️');
            if (p.stories) permIcons.push('📱');
            if (p.logs) permIcons.push('📜');
            if (p.admins) permIcons.push('🛡️');

            tr.innerHTML = `
                <td><strong>${admin.username}</strong> ${isSelf ? '🔥' : ''}</td>
                <td>${admin.password}</td>
                <td><span class="user-badge">${admin.roleName || 'Collaboratore'}</span></td>
                <td><div style="font-size: 1.2rem; display: flex; gap: 5px;">${permIcons.length ? permIcons.join(' ') : '---'}</div></td>
                <td style="display:flex; gap:5px;">
                    <button class="btn-mini" onclick="editAdmin('${admin.username}')" style="background:rgba(59,130,246,0.1); color:#60a5fa; border-color:rgba(59,130,246,0.2);">✏️</button>
                    ${!isSelf ? `<button class="btn-mini btn-danger" onclick="deleteAdmin('${admin.username}')" style="background:rgba(239,68,68,0.1); color:#fca5a5; border-color:rgba(239,68,68,0.2);">🗑️</button>` : ''}
                </td>
            `;
            list.appendChild(tr);
        });
    } catch (e) {
        console.error("Errore caricamento admin:", e);
    }
}

window.editAdmin = async (username) => {
    try {
        const res = await fetch('/api/admins');
        const admins = await res.json();
        const user = admins.find(a => a.username === username);
        if (!user) return;

        document.getElementById('admin-old-username').value = user.username;
        document.getElementById('admin-username').value = user.username;
        document.getElementById('admin-password').value = user.password;
        document.getElementById('admin-role-name').value = user.roleName || '';
        
        document.getElementById('perm-users').checked = !!user.permissions?.users;
        document.getElementById('perm-settings').checked = !!user.permissions?.settings;
        document.getElementById('perm-stories').checked = !!user.permissions?.stories;
        document.getElementById('perm-logs').checked = !!user.permissions?.logs;
        document.getElementById('perm-admins').checked = !!user.permissions?.admins;

        document.getElementById('btn-add-admin').innerText = "💾 Salva Modifiche Account";
        document.getElementById('tab-admins').scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
        console.error(e);
    }
};

document.getElementById('btn-add-admin').addEventListener('click', async () => {
    const oldUsername = document.getElementById('admin-old-username').value;
    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value.trim();
    const roleName = document.getElementById('admin-role-name').value.trim();
    
    // Raccogli permessi dai checkbox
    const permissions = {
        users: document.getElementById('perm-users').checked,
        settings: document.getElementById('perm-settings').checked,
        stories: document.getElementById('perm-stories').checked,
        logs: document.getElementById('perm-logs').checked,
        admins: document.getElementById('perm-admins').checked
    };

    if (!username || !password) {
        return showModal({ title: 'Campi Mancanti', text: 'Inserisci username e password!', type: 'warning' });
    }
    
    try {
        const res = await fetch('/api/admins', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ oldUsername, username, password, roleName, permissions })
        });
        if (res.ok) {
            showModal({ title: 'Account Salvato', text: oldUsername ? "Account aggiornato correttamente!" : "Nuovo account collaboratore creato!", type: 'success' });
            // Reset form
            document.getElementById('admin-old-username').value = '';
            document.getElementById('admin-username').value = '';
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-role-name').value = '';
            document.getElementById('btn-add-admin').innerText = "📦 Salva / Aggiorna Account Collaboratore";
            loadAdmins();
        } else {
            const data = await res.json();
            showModal({ title: 'Errore', text: data.error || "Impossibile salvare l'account", type: 'error' });
        }
    } catch (e) {
        console.error("Errore salvataggio admin:", e);
    }
});

window.deleteAdmin = async (username) => {
    const confirmed = await showModal({
        title: 'Elimina Account',
        text: `Sei sicuro di voler eliminare l'account '${username}'?`,
        type: 'confirm',
        showCancel: true,
        confirmText: 'Elimina',
        cancelText: 'Annulla'
    });
    if (!confirmed) return;
    try {
        const res = await fetch('/api/admins', {
            method: 'DELETE',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username })
        });
        if (res.ok) {
            loadAdmins();
        } else {
            const err = await res.json();
            showModal({ title: 'Errore', text: err.error || "Errore durante l'eliminazione.", type: 'error' });
        }
    } catch (e) {
        console.error("Errore eliminazione admin:", e);
    }
};

document.getElementById('btn-refresh-logs').addEventListener('click', fetchLogs);

// Gestione ESCI (Logout Sessione Dashboard)
document.getElementById('btn-logout').addEventListener('click', async () => {
    const confirmed = await showModal({
        title: 'Logout',
        text: 'Vuoi uscire dalla Dashboard?',
        type: 'confirm',
        showCancel: true,
        confirmText: 'Esci',
        cancelText: 'Rimani'
    });
    if (!confirmed) return;
    
    try {
        await fetch('/api/logout-session', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (e) {
        showModal({ title: 'Errore', text: 'Errore durante il logout.', type: 'error' });
        console.error(e);
    }
});

document.getElementById('btn-update-profile-info').addEventListener('click', async () => {
    const statusText = document.getElementById('cfg-profile-info').value.trim();
    if (!statusText) return showModal({ title: 'Info Mancante', text: 'Inserisci un testo per lo stato info.', type: 'warning' });
    try {
        const res = await fetch('/api/profile-info', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ statusText })
        });
        const data = await res.json();
        if (data.success) {
            showModal({ title: 'Profilo Aggiornato', text: 'Stato "Info" aggiornato con successo sul tuo account WhatsApp!', type: 'success' });
            document.getElementById('cfg-profile-info').value = '';
        } else {
            showModal({ title: 'Errore', text: data.error || "Impossibile aggiornare lo stato quando offline.", type: 'error' });
        }
    } catch (e) {
        showModal({ title: 'Errore', text: 'Errore di comunicazione col bot.', type: 'error' });
    }
});

document.getElementById('btn-post-story').addEventListener('click', async () => {
    const text = document.getElementById('story-text').value.trim();
    const fileInput = document.getElementById('story-image');
    
    if (!text && fileInput.files.length === 0) {
        return showModal({ title: 'Contenuto Vuoto', text: "Inserisci almeno un testo o seleziona un'immagine da pubblicare!", type: 'warning' });
    }
    
    const btn = document.getElementById('btn-post-story');
    btn.innerHTML = 'Pubblicazione in corso... ⏳';
    btn.disabled = true;

    try {
        let payload = { text };
        
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const reader = new FileReader();
            const getBase64 = new Promise(resolve => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            const base64Str = await getBase64;
            payload.imageBase64 = base64Str;
            payload.mimetype = file.type;
            payload.filename = file.name;
        }

        const res = await fetch('/api/post-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(data.success) {
            showModal({ title: 'Storia Pubblicata', text: 'Storia WhatsApp pubblicata con successo!', type: 'success' });
            document.getElementById('story-text').value = '';
            fileInput.value = '';
        } else {
            showModal({ title: 'Errore', text: data.error || "Errore nella pubblicazione della storia. Sei disconnesso?", type: 'error' });
        }
    } catch(e) {
        showModal({ title: 'Immagine Pesante', text: 'Errore di caricamento o immagine troppo pesante per il trasferimento.', type: 'error' });
    }
    
    btn.innerHTML = '🚀 Pubblica Storia Ora';
    btn.disabled = false;
});

document.getElementById('btn-save-stories-config').addEventListener('click', () => {
    document.getElementById('btn-save-config').click();
});

// LOGICA AUTODISTRUZIONE (SOLO ATLANTIS)
const btnDestruct = document.getElementById('btn-self-destruct');
if (btnDestruct) {
    btnDestruct.addEventListener('click', async () => {
        const phrase = document.getElementById('self-destruct-confirm').value.trim();
        if (phrase !== "ELIMINA BOT DEFINITIVAMENTE") {
            return showModal({ title: 'Conferma Errata', text: 'Frase di conferma errata! Scrivi esattamente: ELIMINA BOT DEFINITIVAMENTE', type: 'error' });
        }

        const confirmed = await showModal({
            title: '🧨 ATTENZIONE!',
            text: "SEI ASSOLUTAMENTE SICURO? Questa operazione cancellerà l'intero bot dal PC e non potrà essere annullata. Procedere?",
            type: 'confirm',
            showCancel: true,
            confirmText: 'Sì, DISTRUGGI',
            cancelText: 'ANNULLA'
        });
        if (!confirmed) return;

        try {
            const res = await fetch('/api/admins/self-destruct', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ phrase })
            });
            const data = await res.json();
            
            if (res.ok) {
                // Sostituisci la pagina con un messaggio finale
                document.body.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #ef4444; font-family: 'Courier New', monospace; text-align: center; padding: 2rem;">
                        <h1 style="font-size: 3rem; margin-bottom: 1rem;">🧨 AUTODISTRUZIONE AVVIATA</h1>
                        <p style="font-size: 1.2rem; color: #fff;">Il bot si sta eliminando dal computer...</p>
                        <p style="margin-top: 2rem; color: #666;">Connessione persa. Addio.</p>
                    </div>
                `;
            } else {
                showModal({ title: 'Errore', text: data.error || "Impossibile avviare l'autodistruzione", type: 'error' });
            }
        } catch (e) {
            console.error(e);
            showModal({ title: 'Server Offline', text: 'Il server non risponde più. Potrebbe essersi già chiuso.', type: 'info' });
        }
    });
}
// --- INIZIALIZZAZIONE CUSTOM TIME PICKER ---
function initCustomTimePicker(triggerId, popupId, inputId, hoursColId, minutesColId) {
    const trigger = document.getElementById(triggerId);
    const popup = document.getElementById(popupId);
    const input = document.getElementById(inputId);
    const hoursCol = document.getElementById(hoursColId);
    const minutesCol = document.getElementById(minutesColId);

    if (!trigger || !popup || !input) return;

    // Popola Ore
    for (let i = 0; i < 24; i++) {
        const val = i.toString().padStart(2, '0');
        const item = document.createElement('div');
        item.className = 'time-item';
        item.innerText = val;
        item.onclick = (e) => {
            e.stopPropagation();
            hoursCol.querySelectorAll('.time-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            updateTimeValue();
        };
        hoursCol.appendChild(item);
    }

    // Popola Minuti
    for (let i = 0; i < 60; i += 5) { // Intervalli di 5 per pulizia, o 1 per precisione
        const val = i.toString().padStart(2, '0');
        const item = document.createElement('div');
        item.className = 'time-item';
        item.innerText = val;
        item.onclick = (e) => {
            e.stopPropagation();
            minutesCol.querySelectorAll('.time-item').forEach(el => el.classList.remove('selected'));
            item.classList.add('selected');
            updateTimeValue();
        };
        minutesCol.appendChild(item);
    }

    function updateTimeValue() {
        const h = hoursCol.querySelector('.time-item.selected')?.innerText || '00';
        const m = minutesCol.querySelector('.time-item.selected')?.innerText || '00';
        input.value = `${h}:${m}`;
    }

    trigger.onclick = (e) => {
        e.stopPropagation();
        // Chiudi altri eventuali aperti
        document.querySelectorAll('.time-picker-popup').forEach(p => {
            if (p !== popup) p.classList.remove('active');
        });
        popup.classList.toggle('active');
        
        // Seleziona visivamente i valori attuali
        const [currH, currM] = input.value.split(':');
        hoursCol.querySelectorAll('.time-item').forEach(el => {
            if (el.innerText === currH) el.classList.add('selected');
            else el.classList.remove('selected');
        });
        minutesCol.querySelectorAll('.time-item').forEach(el => {
            if (el.innerText === currM) el.classList.add('selected');
            else el.classList.remove('selected');
        });
    };
}

// Chiudi tutto al click fuori
document.addEventListener('click', () => {
    document.querySelectorAll('.time-picker-popup').forEach(p => p.classList.remove('active'));
});

// Inizializza i due picker
initCustomTimePicker('time-picker-trigger', 'time-picker-popup', 'cfg-daily-status-time', 'hours-column', 'minutes-column');
initCustomTimePicker('cron-time-trigger', 'cron-time-popup', 'cfg-cron-time', 'cron-hours-column', 'cron-minutes-column');

// Inizializzazione UI
switchTab('tab-users');

// AGGIORNAMENTO REMOTO (OTA)
document.getElementById('filter-log-action').addEventListener('change', applyLogFilters);
document.getElementById('filter-log-user').addEventListener('change', applyLogFilters);
document.getElementById('filter-log-date').addEventListener('change', applyLogFilters);

document.getElementById('btn-reset-log-filters').addEventListener('click', () => {
    document.getElementById('filter-log-action').value = '';
    document.getElementById('filter-log-user').value = '';
    document.getElementById('filter-log-date').value = '';
    applyLogFilters();
});
document.getElementById('btn-remote-update').addEventListener('click', async () => {
    const url = document.getElementById('update-url').value;
    if (!url) return showModal({ title: 'URL Mancante', text: 'Inserisci un URL valido per il file .zip', type: 'warning' });

    const confirmed = await showModal({
        title: 'Aggiornamento OTA',
        text: "Avviare l'aggiornamento remoto? Il bot si riavvierà e sovrascriverà i file esistenti.",
        type: 'confirm',
        showCancel: true,
        confirmText: 'Aggiorna Ora',
        cancelText: 'Annulla'
    });
    if (!confirmed) return;

    const btn = document.getElementById('btn-remote-update');
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "⏳ Download in corso...";

    try {
        const res = await fetch('/api/admins/remote-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updateUrl: url })
        });

        const data = await res.json();
        if (data.success) {
            btn.innerText = "✅ Riavvio in corso...";
            btn.style.background = "#10b981";
            showModal({ title: 'Aggiornamento Completato', text: 'Aggiornamento terminato! Il sistema si riavvierà tra pochi secondi.', type: 'success' });
        } else {
            showModal({ title: 'Errore OTA', text: data.error || "Aggiornamento fallito.", type: 'error' });
            btn.disabled = false;
            btn.innerText = originalText;
        }
    } catch (err) {
        showModal({ title: 'Errore Connessione', text: "Errore di connessione durante l'aggiornamento.", type: 'error' });
        btn.disabled = false;
        btn.innerText = originalText;
    }
});
