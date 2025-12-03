// js/products.js
(function () {
  const state = { products: [], filters: { search: '', category: '', stock: '' }, editingId: null };

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return Array.from(document.querySelectorAll(sel)); }

  function setPlaceholders(show = true) {
    const grid = qs('#productsGrid');
    if (!grid) return;
    if (show) {
      grid.innerHTML = Array.from({ length: 8 }).map(_ => `
        <div class="product-card glass-card rounded-xl overflow-hidden fade-in">
          <div class="aspect-w-16 aspect-h-9 bg-slate-200 animate-pulse" style="height:192px"></div>
          <div class="p-6">
            <div class="flex items-start justify-between mb-2">
              <div class="skeleton w-32 h-6"></div>
              <div class="skeleton w-12 h-6"></div>
            </div>
            <div class="skeleton w-full h-4 mb-2"></div>
            <div class="skeleton w-3/4 h-4 mb-4"></div>
            <div class="flex space-x-2">
              <div class="skeleton w-1/2 h-10"></div>
              <div class="skeleton w-1/2 h-10"></div>
            </div>
          </div>
        </div>`).join('');
      return;
    }
    grid.innerHTML = '';
  }

  async function loadProducts() {
    try {
      setPlaceholders(true);
      // server-side filters supported; we call without params here then client-side filter
      const res = await API.Products.list();
      const arr = res?.data ?? res ?? [];
      state.products = Array.isArray(arr) ? arr : [];
      renderProducts();
    } catch (err) {
      console.error(err);
      Utils.showNotification('فشل في جلب المنتجات', 'error');
      qs('#productsGrid').innerHTML = '';
    }
  }

  function renderProducts() {
    const grid = qs('#productsGrid');
    const empty = qs('#emptyState');
    if (!grid) return;

    const filtered = state.products.filter(p => {
      const q = (state.filters.search || '').toString().trim().toLowerCase();
      if (q) {
        if (!((p.nameAr ?? '').toString().toLowerCase().includes(q) || (p.nameFr ?? '').toString().toLowerCase().includes(q))) return false;
      }
      if (state.filters.category && (p.category ?? '') !== state.filters.category) return false;
      if (state.filters.stock) {
        const totalStock = (p.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0);
        if (state.filters.stock === 'available' && totalStock <= 0) return false;
        if (state.filters.stock === 'low' && !( (p.variants ?? []).some(v => (v.stock ?? 0) <= (v.minStock ?? v.min_stock ?? 0) && (v.stock ?? 0) > 0) )) return false;
        if (state.filters.stock === 'out' && totalStock > 0) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty && empty.classList.remove('hidden');
      return;
    }

    empty && empty.classList.add('hidden');

    grid.innerHTML = filtered.map(p => productCard(p)).join('');

    if (typeof anime !== 'undefined') anime({ targets: '.product-card', translateY: [50, 0], opacity: [0, 1], delay: anime.stagger(60), duration: 600, easing: 'easeOutExpo' });
  }

  function productCard(p) {
    const totalStock = (p.variants ?? []).reduce((s, v) => s + (v.stock ?? 0), 0);
    const avgPrice = (p.variants ?? []).length ? (p.variants.reduce((s, v) => s + (v.price ?? 0), 0) / p.variants.length) : 0;
    const stockStatus = totalStock === 0 ? 'out' : ((p.variants ?? []).some(v => (v.stock ?? 0) <= (v.minStock ?? v.min_stock ?? 0)) ? 'low' : 'available');
    const stockColor = stockStatus === 'out' ? 'text-red-600 bg-red-100' : stockStatus === 'low' ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100';
    return `
      <div class="product-card glass-card rounded-xl overflow-hidden fade-in">
        <div class="aspect-w-16 aspect-h-9 bg-slate-200">
          <img src="${p.image || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${escapeHtml(p.nameAr ?? p.nameFr ?? '')}" class="w-full h-48 object-cover">
        </div>
        <div class="p-6">
          <div class="flex items-start justify-between mb-2">
            <h3 class="text-lg font-semibold text-slate-900 line-clamp-2">${escapeHtml(p.nameFr ?? 'منتج')}</h3>
            <span class="px-2 py-1 text-xs font-medium rounded-full ${stockColor}">${totalStock} في المخزون</span>
          </div>
          <h3 class="text-lg font-semibold text-slate-900 line-clamp-2">${escapeHtml(p.nameAr  ?? 'منتج')}</h3>

          <p class="text-sm text-slate-600 mb-2">${escapeHtml(p.category ?? '')}</p>
          ${p.description ? `<p class="text-sm text-slate-500 mb-4 line-clamp-2">${escapeHtml(p.description)}</p>` : ''}
          <div class="flex items-center justify-between mb-4">
            <div>
              <p class="text-sm text-slate-600">عدد المواصفات</p>
              <p class="font-semibold text-slate-900">${(p.variants ?? []).length}</p>
            </div>
            <div class="text-left">
              <p class="text-sm text-slate-600">متوسط السعر</p>
              <p class="font-semibold text-slate-900">${Utils.formatCurrency(avgPrice)}</p>
            </div>
          </div>
          <div class="flex space-x-2">
            <button onclick="products_edit('${p.id}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"><i class="fas fa-edit ml-1"></i>تعديل</button>
            <button onclick="products_delete('${p.id}')" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"><i class="fas fa-trash ml-1"></i>حذف</button>
          </div>
        </div>
      </div>`;
  }

  function escapeHtml(s) { if (s == null) return ''; return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])); }

  // modal and variants
  function openModal(editId = null) {
    state.editingId = editId;
    const modal = qs('#productModal');
    qs('#modalTitle').textContent = editId ? 'تعديل المنتج' : 'إضافة منتج جديد';
    qs('#productForm').reset();
    qs('#variantsContainer').innerHTML = '';
    if (editId) loadProductIntoForm(editId); else addVariant();
    modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() { state.editingId = null; const modal = qs('#productModal'); modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }

  function addVariant(data = {}) {
    const container = qs('#variantsContainer');
    const row = document.createElement('div');
    row.className = 'variant-row p-4 bg-slate-50 rounded-lg';
    row.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div><label class="block text-xs font-medium text-slate-700 mb-1">المواصفة</label><input type="text" name="specification" value="${escapeHtml(data.specification ?? '')}" required class="w-full px-2 py-1 text-sm border border-slate-300 rounded"></div>
        <div><label class="block text-xs font-medium text-slate-700 mb-1">SKU</label><input type="text" name="sku" value="${escapeHtml(data.sku ?? '')}" required class="w-full px-2 py-1 text-sm border border-slate-300 rounded"></div>
        <div><label class="block text-xs font-medium text-slate-700 mb-1">السعر</label><input type="number" name="price" value="${data.price ?? ''}" step="0.01" required class="w-full px-2 py-1 text-sm border border-slate-300 rounded"></div>
        <div><label class="block text-xs font-medium text-slate-700 mb-1">التكلفة</label><input type="number" name="cost" value="${data.cost ?? ''}" step="0.01" class="w-full px-2 py-1 text-sm border border-slate-300 rounded"></div>
        <div class="flex items-end"><button type="button" class="w-full bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm remove-variant-btn"><i class="fas fa-trash"></i></button></div>
      </div>`;
    container.appendChild(row);
    row.querySelector('.remove-variant-btn').addEventListener('click', () => row.remove());
  }

  async function loadProductIntoForm(id) {
    try {
      const res = await API.Products.get(id);
      const p = res?.data ?? res;
      if (!p) return;
      qs('#productNameAr').value = p.nameAr ?? '';
      qs('#productNameEn').value = p.nameFr ?? '';
      qs('#productCategory').value = p.category ?? '';
      qs('#productImage').value = p.image ?? '';
      qs('#productDescription').value = p.description ?? '';
      const container = qs('#variantsContainer'); container.innerHTML = '';
      (p.variants ?? []).forEach(v => addVariant({ specification: v.specification, sku: v.sku, price: v.price, cost: v.cost }));
    } catch (err) {
      console.error(err); Utils.showNotification('فشل في جلب بيانات المنتج', 'error');
    }
  }

  function buildPayloadFromForm() {
    const form = qs('#productForm');
    const fd = new FormData(form);
    const payload = {
      nameAr: fd.get('name_ar') || qs('#productNameAr').value || '',
      nameFr: fd.get('name_en') || qs('#productNameEn').value || '',
      category: fd.get('category') || qs('#productCategory').value || '',
      description: fd.get('description') || qs('#productDescription').value || '',
      image: fd.get('image') || qs('#productImage').value || '',
      variants: []
    };
    const rows = qs('#variantsContainer').querySelectorAll('.variant-row');
    rows.forEach(r => {
      const spec = r.querySelector('input[name="specification"]').value;
      const sku = r.querySelector('input[name="sku"]').value;
      const price = parseFloat(r.querySelector('input[name="price"]').value || 0);
      const cost = parseFloat(r.querySelector('input[name="cost"]').value || 0);
      payload.variants.push({ specification: spec, sku, price, cost, stock: 0, minStock: 0, maxStock: 0 });
    });
    return payload;
  }

  async function saveProduct(e) {
    e.preventDefault();
    const payload = buildPayloadFromForm();
    try {
      if (state.editingId) {
        // update main product fields
        await API.Products.update(state.editingId, {
          nameAr: payload.nameAr,
          nameFr: payload.nameFr,
          category: payload.category,
          description: payload.description,
          image: payload.image
        });
        // update/create variants: fetch existing and match by sku
        const existingRes = await API.Products.get(state.editingId);
        const existing = existingRes?.data?.variants ?? existingRes?.variants ?? [];
        const mapBySku = {}; existing.forEach(v => { if (v.sku) mapBySku[v.sku] = v; });

        for (const v of payload.variants) {
          if (mapBySku[v.sku]) {
            const vid = mapBySku[v.sku].id;
            const updatePayload = Object.assign({}, mapBySku[v.sku], {
              specification: v.specification,
              sku: v.sku,
              price: v.price,
              cost: v.cost,
              productId: state.editingId
            });
            try { await API.Products.updateVariant(state.editingId, vid, updatePayload); } catch (err) { console.warn('Variant update failed', err); }
          } else {
            try { await API.Products.addVariant(state.editingId, v); } catch (err) { console.warn('Variant create failed', err); }
          }
        }

        Utils.showNotification('تم تحديث المنتج', 'success');
      } else {
        await API.Products.create(payload);
        Utils.showNotification('تم إضافة المنتج', 'success');
      }
      await loadProducts();
      closeModal();
    } catch (err) {
      console.error(err); Utils.showNotification('فشل في حفظ المنتج', 'error');
    }
  }

  async function deleteProductConfirm(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    try {
      await API.Products.remove(id);
      Utils.showNotification('تم حذف المنتج', 'success');
      await loadProducts();
    } catch (err) {
      console.error(err); Utils.showNotification('فشل في حذف المنتج', 'error');
    }
  }

  // globals for inline buttons
  window.products_edit = function (id) { openModal(id); };
  window.products_delete = function (id) { deleteProductConfirm(id); };

  // events wiring
  function bindUI() {
    qs('#searchInput')?.addEventListener('input', (e) => { state.filters.search = e.target.value; renderProducts(); });
    qs('#categoryFilter')?.addEventListener('change', (e) => { state.filters.category = e.target.value; renderProducts(); });
    qs('#stockFilter')?.addEventListener('change', (e) => { state.filters.stock = e.target.value; renderProducts(); });
    qs('#addProductBtn')?.addEventListener('click', () => openModal(null));
    qs('#emptyAddBtn')?.addEventListener('click', () => openModal(null));
    qs('#closeModalBtn')?.addEventListener('click', () => closeModal());
    qs('#cancelBtn')?.addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
    qs('#addVariantBtn')?.addEventListener('click', (e) => { e.preventDefault(); addVariant(); });
    qs('#productForm')?.addEventListener('submit', saveProduct);
    qs('#logoutBtn')?.addEventListener('click', () => Auth.logout());
  }

  // init
  document.addEventListener('DOMContentLoaded', async () => {
    Utils.setActiveNav && Utils.setActiveNav('products.html');
    await Auth.init();
    Utils.updateUserInfo && Utils.updateUserInfo();
    bindUI();
    await loadProducts();
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }));
      qsa('.fade-in').forEach(el => obs.observe(el));
    }
  });
})();
