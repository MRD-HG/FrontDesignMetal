// js/sales.js - API-driven selector and invoice creation

(function () {
    const state = { products: [], items: [] };

    async function loadProducts() {
        try {
            const res = await API.Products.list();
            const data = res?.data ?? res ?? [];
            state.products = Array.isArray(data) ? data : [];
            console.log('Products loaded:', state.products.length);
        } catch (e) {
            console.error('Error loading products:', e);
            state.products = [];
        }
    }

    /* ------------------------------- Product Modal ------------------------------ */
    function openProductSelector() {
        document.getElementById('productSelectorModal').classList.remove('hidden');
        renderProductSelector();
    }
    function closeProductSelector() {
        document.getElementById('productSelectorModal').classList.add('hidden');
        document.getElementById('productSearch').value = '';
    }

    /* ----------------------- Render Product Selector List ----------------------- */
    function renderProductSelector() {
        const wrap = document.getElementById('productList');
        wrap.innerHTML = '';
        if (!state.products.length) {
            wrap.innerHTML = `<p class="text-center text-slate-500 py-4">لا توجد منتجات متاحة</p>`;
            return;
        }
        state.products.forEach(p => {
            const pname = p.name_ar ?? p.nameAr ?? p.nameFr ?? p.name ?? 'Produit';
            const img = p.image || p.imageUrl || 'https://via.placeholder.com/80x60?text=Produit';
            (p.variants || []).forEach(v => {
                wrap.insertAdjacentHTML('beforeend', `
                    <div class="p-3 border-b hover:bg-gray-50 cursor-pointer flex gap-3"
                        onclick="Sales.chooseProduct('${p.id}', '${v.id}')">
                        <div class="w-16 h-12 rounded overflow-hidden flex-shrink-0 bg-slate-200">
                            <img src="${img}" alt="${pname}" style="width:100%;height:100%;object-fit:cover;">
                        </div>
                        <div class="flex-1">
                            <div class="font-semibold">${pname}</div>
                            <div class="text-sm text-slate-700">${v.specification ?? ''}</div>
                            <div class="text-xs text-slate-600">${v.sku ?? ''}</div>
                            <div class="text-xs text-slate-500">المخزون: ${v.stock ?? 0}</div>
                        </div>
                    </div>
                `);
            });
        });
    }

    /* ------------------------------- Add to Invoice ------------------------------ */
    function chooseProduct(productId, variantId) {
        const p = state.products.find(x => x.id === productId);
        if (!p) return alert('المنتج غير موجود');
        const v = (p.variants || []).find(x => x.id === variantId);
        if (!v) return alert('المواصفة غير موجودة');
        state.items.push({
            productId,
            variantId,
            name: p.name_ar ?? p.nameAr ?? p.nameFr ?? p.name ?? 'Produit',
            variant: v.specification ?? '',
            quantity: 1,
            price: v.price ?? 0
        });
        closeProductSelector();
        renderItems();
    }

    /* -------------------------- Render Invoice Item List ------------------------- */
    function renderItems() {
        const wrap = document.getElementById('invoiceItems');
        wrap.innerHTML = '';
        state.items.forEach((it, i) => {
            wrap.insertAdjacentHTML('beforeend', `
                <div class="p-3 bg-white shadow rounded mb-2 flex justify-between">
                    <div>
                        <div class="font-semibold">${it.name}</div>
                        <div class="text-sm">${it.variant}</div>
                    </div>
                    <div class="flex gap-2 items-center">
                        <input type="number" min="1" value="${it.quantity}" onchange="Sales.updateQty(${i}, this.value)" class="w-16 border rounded px-2 py-1">
                        <button onclick="Sales.removeItem(${i})" class="text-red-600"><i class="fa fa-trash"></i></button>
                    </div>
                </div>
            `);
        });
        updateTotals();
    }

    function updateQty(i, q) { state.items[i].quantity = Number(q); updateTotals(); }
    function removeItem(i) { state.items.splice(i, 1); renderItems(); }

    /* ------------------------------ Invoice Summary ------------------------------ */
    function updateTotals() {
        const subtotal = state.items.reduce((s, it) => s + (it.quantity * it.price), 0);
        const tax = subtotal * 0.20;
        const total = subtotal + tax;
        document.getElementById('subtotal').textContent = `${subtotal.toFixed(2)} درهم.`;
        document.getElementById('taxAmount').textContent = `${tax.toFixed(2)} درهم.`;
        document.getElementById('totalAmount').textContent = `${total.toFixed(2)} درهم.`;
    }

    /* ------------------------------- Save Invoice ------------------------------- */
    async function saveSale() {
        if (!state.items.length) { alert('أضف منتجات أولا'); return; }
        const payload = {
            customer: {
                name: document.getElementById('custName').value,
                phone: document.getElementById('custPhone').value,
                address: document.getElementById('custAddress').value
            },
            items: state.items.map(it => ({ productId: it.productId, variantId: it.variantId, quantity: it.quantity, unitPrice: it.price })),
            paymentMethod: document.getElementById('paymentMethod').value,
            taxRate: 20
        };
        try {
            const res = await API.Sales.create(payload);
            alert('تم إنشاء الفاتورة بنجاح');
            const newId = res?.data?.id;
            if (newId) window.location.href = `sales-invoice.html?id=${newId}`;
        } catch (e) {
            console.error(e);
            alert('خطأ أثناء إنشاء الفاتورة');
        }
    }

    document.addEventListener('DOMContentLoaded', async () => { await loadProducts(); });

    window.Sales = { openProductSelector, closeProductSelector, chooseProduct, updateQty, removeItem, saveSale };
})();
