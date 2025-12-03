// js/inventory.js
(function () {
  let selectedProductId = null;
  let selectedVariantId = null;

  // local helper shortcuts
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // state
  const state = {
    products: [],         // array of products from /api/Products
    alerts: [],           // from /api/Inventory/alerts
    stats: null,          // from /api/Inventory/stats
    filters: { search: '', category: '', stock: '' }
  };

  // initialize page
  async function init() {
    try {
      Utils.setActiveNav && Utils.setActiveNav('inventory.html');
      await Auth.init();
      Utils.updateUserInfo && Utils.updateUserInfo();

      bindUI();
      await loadAllData();
      // observe fade-in
      if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('visible')));
        $$('.fade-in').forEach(x => obs.observe(x));
      }
    } catch (err) {
      console.error('init error', err);
    }
  }

  // load products, stats and alerts
  async function loadAllData() {
    await Promise.all([fetchProducts(), fetchStats(), fetchAlerts()]);
    renderInventoryTable();
    populateProductSelects();
  }

  // fetch products (we build inventory table from products -> variants)
  async function fetchProducts() {
    try {
      // API.Products.list() returns { success, data } or data array
      const res = await API.Products.list();
      const arr = res?.data ?? res ?? [];
      state.products = Array.isArray(arr) ? arr : [];
    } catch (err) {
      console.error('fetchProducts', err);
      Utils.showNotification('فشل في جلب المنتجات', 'error');
      state.products = [];
    }
  }

  // fetch inventory stats
  async function fetchStats() {
    try {
      const res = await API.Inventory.stats();
      const payload = res?.data ?? res ?? null;
      state.stats = payload;
      renderStats(payload);
    } catch (err) {
      console.error('fetchStats', err);
      Utils.showNotification('فشل في جلب احصائيات المخزون', 'error');
    }
  }

  // fetch inventory alerts
  async function fetchAlerts() {
    try {
      const res = await API.Inventory.alerts();
      const list = res?.data ?? res ?? [];
      state.alerts = Array.isArray(list) ? list : [];
    } catch (err) {
      console.error('fetchAlerts', err);
      state.alerts = [];
    }
  }

  // render stats cards
  function renderStats(payload) {
    if (!payload) return;
    $('#totalItems').textContent = payload.totalItems ?? 0;
    $('#totalValue').textContent = Utils.formatCurrency(payload.totalValue ?? payload.totalStockValue ?? 0);
    $('#lowStockItems').textContent = payload.lowStockItems ?? payload.stockAlerts ?? 0;
    $('#outOfStockItems').textContent = payload.outOfStockItems ?? 0;
    animateNumbers();
  }

  function animateNumbers() {
    const ids = ['totalItems', 'totalValue', 'lowStockItems', 'outOfStockItems'];
    ids.forEach((id, i) => {
      const el = document.getElementById(id);
      if (!el) return;
      anime({
        targets: el,
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 600,
        delay: i * 80,
        easing: 'easeOutExpo'
      });
    });
  }

  // build flat variants list from products
  function getAllVariants() {
    const variants = [];
    state.products.forEach(product => {
      (product.variants || []).forEach(variant => {
        variants.push({
          productId: product.id,
          productName: product.nameAr ?? product.nameFr ?? product.name_ar ?? product.name_fr ?? '',
          category: product.category ?? '',
          // adapt to possible property names
          id: variant.id ?? variant.variantId ?? variant.id,
          specification: variant.specification ?? variant.spec ?? '',
          sku: variant.sku ?? variant.SKU ?? '',
          stock: variant.stock ?? variant.stock ?? 0,
          min_stock: variant.minStock ?? variant.min_stock ?? variant.min_stock ?? 0,
          price: variant.price ?? 0,
          cost: variant.cost ?? 0
        });
      });
    });
    return variants;
  }

  // mark alerts onto variants by matching sku/specification (best effort)
  function applyAlertsToVariants(variants) {
    if (!state.alerts || !state.alerts.length) return variants;
    // alerts entries have: product, variant, currentStock, minStock, type
    // match by variant string
    const mapped = variants.map(v => {
      const alert = state.alerts.find(a => {
        // match by variant string or sku
        const aVar = String(a.variant ?? a.specification ?? '').trim();
        if (!aVar) return false;
        return (String(v.specification ?? '').trim() === aVar) || (String(v.sku ?? '').trim() === aVar);
      });
      if (alert) {
        return Object.assign({}, v, { _alert: alert });
      }
      return v;
    });
    return mapped;
  }

  // render inventory table rows
  function renderInventoryTable() {
    const tbody = $('#inventoryTableBody');
    if (!tbody) return;

    let variants = getAllVariants();
    // attach alerts if any
    variants = applyAlertsToVariants(variants);

    // apply filters
    const term = (state.filters.search || '').trim().toLowerCase();
    if (term) {
      variants = variants.filter(v =>
        (v.productName || '').toLowerCase().includes(term) ||
        (v.specification || '').toLowerCase().includes(term) ||
        (v.sku || '').toLowerCase().includes(term)
      );
    }
    if (state.filters.category) {
      variants = variants.filter(v => v.category === state.filters.category);
    }
    if (state.filters.stock) {
      if (state.filters.stock === 'available') variants = variants.filter(v => Number(v.stock) > (v.min_stock ?? 0));
      if (state.filters.stock === 'low') variants = variants.filter(v => Number(v.stock) > 0 && Number(v.stock) <= (v.min_stock ?? 0));
      if (state.filters.stock === 'out') variants = variants.filter(v => Number(v.stock) === 0);
    }

    if (variants.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-6 text-center text-slate-500">لا توجد بيانات</td></tr>`;
      return;
    }

    tbody.innerHTML = variants.map(v => renderRow(v)).join('');
    // animate rows
    if (typeof anime !== 'undefined') {
      anime({ targets: '.stock-row', translateX: [30,0], opacity: [0,1], delay: anime.stagger(40), duration: 450, easing: 'easeOutExpo' });
    }
  }

  // choose classes and badge based on stock and optional alert
  function renderRow(v) {
    const stock = Number(v.stock ?? 0);
    const minStock = Number(v.min_stock ?? 0);
    let status = 'good';
    if (stock === 0) status = 'out';
    else if (stock <= minStock) status = 'low';

    // override if server alert specifically marks it
    if (v._alert && v._alert.type) {
      if (v._alert.type === 'out_of_stock') status = 'out';
      if (v._alert.type === 'low_stock') status = 'low';
    }

    const stockClass = `stock-${status}`;
    const badgeColor = status === 'out' ? 'bg-red-100 text-red-800' : status === 'low' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';

    // escape fields
    const productName = escapeHtml(v.productName || '');
    const spec = escapeHtml(v.specification || '');
    const sku = escapeHtml(v.sku || '');
    const category = escapeHtml(v.category || '');
    const price = Utils.formatCurrency(v.price ?? 0);
    const minValue = v.min_stock ?? minStock;

    return `
      <tr class="stock-row ${stockClass}">
        <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm font-medium text-slate-900">${productName}</div></td>
        <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-slate-900">${spec}</div></td>
        <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-slate-600">${category}</div></td>
        <td class="px-6 py-4 whitespace-nowrap"><div class="text-sm text-slate-900 font-mono">${sku}</div></td>
        <td class="px-6 py-4 whitespace-nowrap text-center"><div class="flex items-center justify-center"><span class="px-2 py-1 text-xs font-medium rounded-full ${badgeColor}">${stock}</span></div></td>
        <td class="px-6 py-4 whitespace-nowrap text-center"><div class="text-sm text-slate-600">${minValue}</div></td>
        <td class="px-6 py-4 whitespace-nowrap text-right"><div class="text-sm font-medium text-slate-900">${price}</div></td>
        <td class="px-6 py-4 whitespace-nowrap text-right">
          <div class="flex space-x-2">
            <button class="text-green-600 hover:text-green-800 text-sm" data-action="add" data-product="${escapeAttr(v.productId)}" data-variant="${escapeAttr(v.id)}" title="إضافة">
              <i class="fas fa-plus"></i>
            </button>
            <button class="text-red-600 hover:text-red-800 text-sm" data-action="remove" data-product="${escapeAttr(v.productId)}" data-variant="${escapeAttr(v.id)}" title="إخراج">
              <i class="fas fa-minus"></i>
            </button>
            <button class="text-slate-600 hover:text-slate-800 text-sm" data-action="openAdjust" data-product="${escapeAttr(v.productId)}" data-variant="${escapeAttr(v.id)}" title="تعديل يدوي">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  // helpers for escaping
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  // populate product selects used in modals
  function populateProductSelects() {
    const productOptions = state.products.map(p => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.nameAr ?? p.nameFr ?? p.name_ar ?? p.name_fr ?? '')}</option>`).join('');
    $('#stockProduct').innerHTML = `<option value="">اختر المنتج</option>${productOptions}`;
    $('#adjustProduct').innerHTML = `<option value="">اختر المنتج</option>${productOptions}`;
  }

  // when product selection changes, load its variants into the corresponding select
  function loadVariantsInto(selectId, productId) {
    const product = state.products.find(p => p.id === productId);
    const select = $(`#${selectId}`);
    if (!select) return;
    if (!product) {
      select.innerHTML = `<option value="">اختر المواصفة</option>`;
      return;
    }
    const options = (product.variants || []).map(v => `<option value="${escapeAttr(v.id)}">${escapeHtml(v.specification ?? v.spec ?? '')}</option>`).join('');
    select.innerHTML = `<option value="">اختر المواصفة</option>${options}`;
  }

  // get variant object by id
  function findVariant(productId, variantId) {
    const p = state.products.find(x => x.id === productId);
    if (!p) return null;
    return (p.variants || []).find(v => v.id === variantId);
  }

  // UI bindings
  function bindUI() {
    // filters
    $('#searchInput')?.addEventListener('input', (e) => {
      state.filters.search = e.target.value; renderInventoryTable();
    });
    $('#categoryFilter')?.addEventListener('change', (e) => {
      state.filters.category = e.target.value; renderInventoryTable();
    });
    $('#stockFilter')?.addEventListener('change', (e) => {
      state.filters.stock = e.target.value; renderInventoryTable();
    });

    // buttons
    $('#openStockBtn')?.addEventListener('click', () => openStockModal());
    $('#openAdjustBtn')?.addEventListener('click', () => openAdjustModal());
    $('#exportBtn')?.addEventListener('click', () => exportInventory());

    // stock modal controls
    $('#closeStockModalBtn')?.addEventListener('click', () => closeStockModal());
    $('#stockCancelBtn')?.addEventListener('click', () => closeStockModal());
    $('#stockProduct')?.addEventListener('change', (e) => loadVariantsInto('stockVariant', e.target.value));
    $('#stockForm')?.addEventListener('submit', (e) => { e.preventDefault(); onSubmitStockForm(); });

    // adjust modal controls
    $('#closeAdjustModalBtn')?.addEventListener('click', () => closeAdjustModal());
    $('#adjustCancelBtn')?.addEventListener('click', () => closeAdjustModal());
    $('#adjustProduct')?.addEventListener('change', (e) => {
      loadVariantsInto('adjustVariant', e.target.value);
      // reset current/new stock
      $('#currentStock').value = '';
      $('#newStock').value = '';
    });
    $('#adjustVariant')?.addEventListener('change', (e) => {
      const pid = $('#adjustProduct').value;
      const vid = e.target.value;
      const v = findVariant(pid, vid);
      $('#currentStock').value = v ? (v.stock ?? 0) : '';
    });
    $('#adjustmentForm')?.addEventListener('submit', (e) => { e.preventDefault(); onSubmitAdjustForm(); });

    // table action handlers (event delegation)
    document.getElementById('inventoryTableBody')?.addEventListener('click', (ev) => {
      const btn = ev.target.closest('button');
      if (!btn) return;
      const action = btn.dataset.action;
      const productId = btn.dataset.product;
      const variantId = btn.dataset.variant;
      if (!action) return;
      if (action === 'add') quickUpdateStock(productId, variantId, 'IN');
      if (action === 'remove') quickUpdateStock(productId, variantId, 'OUT');
      if (action === 'openAdjust') openAdjustModal(productId, variantId);
    });

    // logout
    $('#logoutBtn')?.addEventListener('click', () => Auth.logout());
  }

  // open / close stock modal
  function openStockModal() {
    $('#stockProduct').value = '';
    $('#stockVariant').innerHTML = `<option value="">اختر المواصفة</option>`;
    $('#stockQuantity').value = '';
    $('#stockType').value = 'IN';
    $('#stockNotes').value = '';
    $('#stockModal').classList.add('show'); $('#stockModal').setAttribute('aria-hidden', 'false');
  }
  function closeStockModal() {
    $('#stockModal').classList.remove('show'); $('#stockModal').setAttribute('aria-hidden', 'true');
  }

  // open adjust modal; optional preset product/variant
  function openAdjustModal(productId = '', variantId = '') {
    $('#adjustProduct').value = productId || '';
    loadVariantsInto('adjustVariant', productId || '');
    if (variantId) {
      setTimeout(() => { $('#adjustVariant').value = variantId; const v = findVariant(productId, variantId); $('#currentStock').value = v ? (v.stock ?? 0) : ''; }, 50);
    }
    $('#newStock').value = '';
    $('#adjustReason').value = '';
    $('#adjustmentModal').classList.add('show'); $('#adjustmentModal').setAttribute('aria-hidden', 'false');
  }
  function closeAdjustModal() {
    $('#adjustmentModal').classList.remove('show'); $('#adjustmentModal').setAttribute('aria-hidden', 'true');
  }

  // submit stock (IN/OUT)
  async function onSubmitStockForm() {
    const productId = $('#stockProduct').value;
    const variantId = $('#stockVariant').value;
    const quantity = Number($('#stockQuantity').value || 0);
    const type = $('#stockType').value;
    const notes = $('#stockNotes').value || '';

    if (!productId || !variantId || !quantity || quantity <= 0) {
      Utils.showNotification('يرجى ملء الحقول بشكل صحيح', 'error');
      return;
    }

    try {
      const payload = {
        productId,
        variantId,
        quantity,
        type,
        notes
      };
      await API.Inventory.updateStock(payload);
      Utils.showNotification('تم تحديث المخزون', 'success');
      await refreshData();
      closeStockModal();
    } catch (err) {
      console.error('updateStock error', err);
      Utils.showNotification('فشل تحديث المخزون', 'error');
    }
  }

  // submit adjustment (set absolute stock)// js/inventory.js
// (only the changed functions / fixes shown; keep the rest of your file as-is)
async function onSubmitAdjustForm() {
  const productId = $('#adjustProduct').value;
  const variantId = $('#adjustVariant').value;
  const newStock = Number($('#newStock').value || 0);
  const reason = $('#adjustReason').value || '';

  if (!productId || !variantId || isNaN(newStock) || newStock < 0 || !reason) {
    Utils.showNotification('يرجى ملء الحقول بشكل صحيح', 'error');
    return;
  }

  try {
    const payload = {
      productId,
      variantId,
      newStock,
      reason
    };
    // call API properly
    await API.Inventory.adjustStock(payload);

    Utils.showNotification('تم تعديل المخزون', 'success');
    await refreshData();
    closeAdjustModal();
  } catch (err) {
    console.error('adjustStock error', err);
    const msg = err?.message || 'فشل تعديل المخزون';
    Utils.showNotification(msg, 'error');
  }
}


  // quick + / - actions from table
  async function quickUpdateStock(productId, variantId, type) {
    const qty = prompt('أدخل الكمية:');
    if (!qty) return;
    const n = parseFloat(qty);
    if (isNaN(n) || n <= 0) {
      Utils.showNotification('كمية غير صحيحة', 'error');
      return;
    }
    try {
      const payload = { productId, variantId, quantity: n, type, notes: 'Quick update' };
      await API.Inventory.updateStock(payload);
      Utils.showNotification(type === 'IN' ? 'تم الإضافة' : 'تم الإنقاص', 'success');
      await refreshData();
    } catch (err) {
      console.error('quickUpdateStock', err);
      Utils.showNotification('فشل تحديث المخزون', 'error');
    }
  }

  // export CSV of current displayed inventory
  function exportInventory() {
    const variants = getAllVariants();
    const rows = variants.map(v => ({
      'المنتج': v.productName,
      'المواصفة': v.specification,
      'الفئة': v.category,
      'SKU': v.sku,
      'المخزون': v.stock,
      'الحد الأدنى': v.min_stock,
      'السعر': v.price,
      'التكلفة': v.cost
    }));
    if (!rows.length) {
      Utils.showNotification('لا توجد بيانات للتصدير', 'error');
      return;
    }
    const csv = toCSV(rows);
    downloadCSV(csv, 'inventory_report.csv');
    Utils.showNotification('تم تصدير المخزون', 'success');
  }

  function toCSV(rows) {
    const keys = Object.keys(rows[0]);
    const lines = [keys.join(',')];
    rows.forEach(r => {
      lines.push(keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','));
    });
    return lines.join('\n');
  }
  function downloadCSV(csv, filename) {
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  // refresh products, stats and alerts
  async function refreshData() {
    await Promise.all([fetchProducts(), fetchStats(), fetchAlerts()]);
    renderInventoryTable();
    populateProductSelects();
  }

  // load all and init
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });

  // expose a tiny API for console / debugging if needed
  window.InventoryPage = {
    refresh: refreshData,
    state
  };

})();
