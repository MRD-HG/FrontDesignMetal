// small UI helpers used across pages (notifications, modal open/close)
const UI = (() => {
    function notify(msg, type = 'info') {
        try {
            if (window.app && typeof app.showNotification === 'function') {
                return app.showNotification(msg, type);
            }
        } catch {}
        if (type === 'error') console.error(msg);
        else console.log(msg);
        // minimal toast fallback
        const el = document.createElement('div');
        el.textContent = msg;
        el.style.position = 'fixed';
        el.style.right = '16px';
        el.style.bottom = '16px';
        el.style.zIndex = 9999;
        el.style.padding = '10px 14px';
        el.style.borderRadius = '6px';
        el.style.color = '#fff';
        el.style.background = type === 'error' ? '#e11d48' : type === 'success' ? '#10b981' : '#334155';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function openModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.remove('hidden');
    }

    function closeModal(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    }

    return { notify, openModal, closeModal };
})();