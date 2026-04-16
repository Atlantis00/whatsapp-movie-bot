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

        container.className = 'modal-content modal-type-' + type;
        const icons = { info: 'ℹ️', success: '✅', error: '❌', confirm: '❓', warning: '⚠️' };
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

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btn-login');
    const errorMsg = document.getElementById('login-error');

    btn.disabled = true;
    btn.innerText = 'Verifica in corso...';
    errorMsg.style.display = 'none';

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (data.success) {
            btn.innerText = 'Accesso riuscito! 🎉';
            btn.style.background = '#10b981';
            setTimeout(() => {
                window.location.href = '/';
            }, 500);
        } else {
            errorMsg.style.display = 'block';
            btn.disabled = false;
            btn.innerText = 'Accedi Ora 🚀';
        }
    } catch (err) {
        showModal({ title: 'Errore Connessione', text: 'Il server non risponde. Assicurati che il bot sia avviato.', type: 'error' });
        btn.disabled = false;
        btn.innerText = 'Accedi Ora 🚀';
    }
});

// Mostra/Nascondi Password
document.getElementById('toggle-password').addEventListener('change', function() {
    const passwordInput = document.getElementById('password');
    passwordInput.type = this.checked ? 'text' : 'password';
});
