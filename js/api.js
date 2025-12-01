// js/api.js
// Central API client (global API). Works with responses like { success, data } or plain arrays/objects.
const API_BASE = (function(){
  // use explicit host if set, otherwise relative to current origin
  try {
    // prefer environment value if exists (you can change here)
    return 'https://localhost:5062';
  } catch (e) { return ''; }
})();

const API = (function () {
  async function request(path, opts = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = Object.assign({}, opts.headers || {});
    if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

    // attach token if present
    const token = window.Auth && Auth.getToken ? Auth.getToken() : null;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const cfg = Object.assign({ method: 'GET', headers }, opts);

    if (cfg.body && typeof cfg.body !== 'string' && headers['Content-Type']?.includes('application/json')) {
      cfg.body = JSON.stringify(cfg.body);
    }

    const res = await fetch(url, cfg);
    const text = await res.text();
    let parsed = null;
    try { parsed = text ? JSON.parse(text) : null; } catch (err) { parsed = text; }

    if (!res.ok) {
      // try to extract message from parsed body
      const message = (parsed && (parsed.message || parsed.error)) || res.statusText || `HTTP ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.payload = parsed;
      throw error;
    }

    // if wrapper { success: true, data: ... } then return that data for convenience
    if (parsed && typeof parsed === 'object' && ('success' in parsed) && ('data' in parsed)) {
      return parsed;
    }
    return parsed;
  }

  function buildUrl(path, params) {
    if (!params) return path;
    const esc = encodeURIComponent;
    const qs = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null)
      .map(k => `${esc(k)}=${esc(params[k])}`).join('&');
    return qs ? `${path}?${qs}` : path;
  }

  // endpoints (keep same names used by your UI)
  const Auth = {
    login: (p) => request('/api/Auth/login', { method: 'POST', body: p }),
    register: (p) => request('/api/Auth/register', { method: 'POST', body: p }),
    me: () => request('/api/Auth/me'),
    changePassword: (p) => request('/api/Auth/change-password', { method: 'POST', body: p }),
    validateToken: (p) => request('/api/Auth/validate-token', { method: 'POST', body: p })
  };

  const Dashboard = {
    stats: () => request('/api/Dashboard/stats'),
    data: () => request('/api/Dashboard/data'),
    salesChart: () => request('/api/Dashboard/sales-chart'),
    stockAlerts: () => request('/api/Dashboard/stock-alerts'),
    topProducts: () => request('/api/Dashboard/top-products')
  };

  const Inventory = {
    stats: () => request('/api/Inventory/stats'),
    movements: (params) => request(buildUrl('/api/Inventory/movements', params)),
    alerts: () => request('/api/Inventory/alerts'),
    updateStock: (payload) => request('/api/Inventory/update-stock', { method: 'POST', body: payload }),
    adjustStock: (payload) => request('/api/Inventory/adjust-stock', { method: 'POST', body: payload }),
    movementById: (id) => request(`/api/Inventory/movements/${id}`)
  };

  const Products = {
    list: (params) => request(buildUrl('/api/Products', params)),
    create: (payload) => request('/api/Products', { method: 'POST', body: payload }),
    get: (id) => request(`/api/Products/${id}`),
    update: (id, payload) => request(`/api/Products/${id}`, { method: 'PUT', body: payload }),
    remove: (id) => request(`/api/Products/${id}`, { method: 'DELETE' }),
    categories: () => request('/api/Products/categories'),
    search: (params) => request(buildUrl('/api/Products/search', params)),
    addVariant: (productId, payload) => request(`/api/Products/${productId}/variants`, { method: 'POST', body: payload }),
    updateVariant: (productId, variantId, payload) => request(`/api/Products/${productId}/variants/${variantId}`, { method: 'PUT', body: payload }),
    deleteVariant: (productId, variantId) => request(`/api/Products/${productId}/variants/${variantId}`, { method: 'DELETE' })
  };

  const Purchases = {
    list: (params) => request(buildUrl('/api/Purchases', params)),
    create: (payload) => request('/api/Purchases', { method: 'POST', body: payload }),
    get: (id) => request(`/api/Purchases/${id}`),
    delete: (id) => request(`/api/Purchases/${id}`, { method: 'DELETE' }),
    updateStatus: (id, payload) => request(`/api/Purchases/${id}/status`, { method: 'PUT', body: payload }),
    suppliers: () => request('/api/Purchases/suppliers'),
    createSupplier: (payload) => request('/api/Purchases/suppliers', { method: 'POST', body: payload }),
    purchaseNumber: () => request('/api/Purchases/purchase-number')
  };

  const Sales = {
    list: (params) => request(buildUrl('/api/Sales', params)),
    create: (payload) => request('/api/Sales', { method: 'POST', body: payload }),
    get: (id) => request(`/api/Sales/${id}`),
    delete: (id) => request(`/api/Sales/${id}`, { method: 'DELETE' }),
    updateStatus: (id, payload) => request(`/api/Sales/${id}/status`, { method: 'PUT', body: payload }),
    customers: () => request('/api/Sales/customers'),
    createCustomer: (payload) => request('/api/Sales/customers', { method: 'POST', body: payload }),
    invoiceNumber: () => request('/api/Sales/invoice-number')
  };

  return { request, Auth, Dashboard, Inventory, Products, Purchases, Sales };
})();

// expose globally
window.API = API;
