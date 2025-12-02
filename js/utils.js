// js/utils.js
const Utils = (function () {
  // Simple toast using DOM
  function showNotification(text, type = 'info', timeout = 3500) {
    try {
      const rootId = '__wm_toast_root';
      let root = document.getElementById(rootId);
      if (!root) {
        root = document.createElement('div');
        root.id = rootId;
        root.style.position = 'fixed';
        root.style.zIndex = 9999;
        root.style.left = '50%';
        root.style.transform = 'translateX(-50%)';
        root.style.top = '20px';
        document.body.appendChild(root);
      }
      const el = document.createElement('div');
      el.style.minWidth = '220px';
      el.style.marginTop = '8px';
      el.style.padding = '10px 14px';
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 6px 18px rgba(0,0,0,.12)';
      el.style.color = '#fff';
      el.style.fontSize = '14px';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.gap = '8px';

      if (type === 'error') {
        el.style.background = '#dc2626';
      } else if (type === 'success') {
        el.style.background = '#16a34a';
      } else {
        el.style.background = '#2563eb';
      }

      el.textContent = text;
      root.appendChild(el);
      setTimeout(() => {
        el.style.transition = 'all .25s ease';
        el.style.opacity = '0';
        el.style.transform = 'translateY(-6px)';
        setTimeout(() => el.remove(), 250);
      }, timeout);
    } catch (e) {
      console[type === 'error' ? 'error' : 'log'](text);
    }
  }

  function formatCurrency(value) {
    try {
      if (value === null || value === undefined) value = 0;
      return new Intl.NumberFormat('ar-MA', { style: 'currency', currency: 'MAD' }).format(Number(value));
    } catch (e) {
      return value;
    }
  }

  function setActiveNav(filename) {
    try {
      document.querySelectorAll('.nav-link').forEach(a => {
        if (a.dataset && a.dataset.nav === filename) {
          a.classList.add('active');
        } else {
          a.classList.remove('active');
        }
      });
    } catch (e) {}
  }

  function formatDate(value) {
    try {
      if (!value) return '';
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return d.toLocaleDateString('ar-MA');
    } catch (e) {
      return value;
    }
  }

  function updateUserInfo(user) {
    // if you have user info from auth, call Utils.updateUserInfo({ name: '...' })
    try {
      const el = document.querySelector('[data-user-info="name"]');
      if (!el) return;
      if (user && user.name) el.textContent = user.name;
      else {
        // fallback: read from localStorage if you store name there
        const name = localStorage.getItem('wm_user_name') || 'مدير النظام';
        el.textContent = name;
      }
    } catch (e) {}
  }

  return { showNotification, formatCurrency, formatDate, setActiveNav, updateUserInfo };
})();
