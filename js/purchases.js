// js/purchases.js
// Purchases page data layer + UI interactions
// Assumptions:
// - API wrapper exists at window.API with Products and Purchases and Inventory methods (optional).
// - If not, falls back to fetch() against relative /api/* endpoints.
// - Uses Utils.showNotification / Utils.formatCurrency / Utils.formatDate if available.

(function () {
  const baseUrl = "https://localhost:5062"; // use relative root; adjust if your API is elsewhere.

  // small helpers fallback
  const UtilsLocal = {
    showNotification: (msg, type = "info") => {
      if (window.Utils && Utils.showNotification)
        return Utils.showNotification(msg, type);
      alert(msg);
    },
    formatCurrency: (v) => {
      if (window.Utils && Utils.formatCurrency) return Utils.formatCurrency(v);
      return (
        (Number(v) || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " درهم"
      );
    },
    formatDate: (iso) => {
      if (window.Utils && Utils.formatDate) return Utils.formatDate(iso);
      try {
        const d = new Date(iso);
        if (isNaN(d)) return iso;
        return d.toLocaleDateString("fr-CA"); // yyyy-mm-dd-ish
      } catch (e) {
        return iso;
      }
    },
  };

  // API wrapper: use window.API if present, otherwise use fetch
  const ApiClient = {
    async productsList() {
      if (window.API && API.Products && API.Products.list)
        return API.Products.list();
      const r = await fetch(baseUrl + "/api/Products", {
        headers: { accept: "application/json" },
      });
      return await r.json();
    },
    async productGet(id) {
      if (window.API && API.Products && API.Products.get)
        return API.Products.get(id);
      const r = await fetch(baseUrl + `/api/Products/${id}`, {
        headers: { accept: "application/json" },
      });
      return await r.json();
    },
    async purchasesList() {
      if (window.API && API.Purchases && API.Purchases.list)
        return API.Purchases.list();
      const r = await fetch(baseUrl + "/api/Purchases", {
        headers: { accept: "application/json" },
      });
      return await r.json();
    },
    async purchasesCreate(payload) {
      if (window.API && API.Purchases && API.Purchases.create)
        return API.Purchases.create(payload);
      const r = await fetch(baseUrl + "/api/Purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      return await r.json();
    },
    async purchasesDelete(id) {
      if (window.API && API.Purchases && API.Purchases.remove)
        return API.Purchases.remove(id);
      const r = await fetch(baseUrl + `/api/Purchases/${id}`, {
        method: "DELETE",
      });
      return await r.json();
    },
    async purchasesUpdateStatus(id, payload) {
      // prefer PUT /api/Purchases/{id}/status or PATCH depending on backend; try PUT first
      if (window.API && API.Purchases && API.Purchases.updateStatus)
        return API.Purchases.updateStatus(id, payload);
      const url = baseUrl + `/api/Purchases/${id}/status`;
      const r = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await r.json();
    },
    async inventoryUpdateStock(payload) {
      if (window.API && API.Inventory && API.Inventory.updateStock)
        return API.Inventory.updateStock(payload);
      const r = await fetch(baseUrl + "/api/Inventory/update-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return await r.json();
    },
  };

  // Application state
  const state = {
    products: [],
    purchases: [],
    purchaseItems: [],
    filters: { search: "", dateFrom: "", dateTo: "" },
    taxRate: 10, // default %
  };

  // DOM helpers
  const $ = (id) => document.getElementById(id);

  // Load products (for selector)
  async function loadProducts() {
    try {
      const res = await ApiClient.productsList();
      // if the API returns {success: true, data: [...]}
      const arr =
        res && res.data ? res.data : Array.isArray(res) ? res : res?.data ?? [];
      state.products = arr;
    } catch (err) {
      console.error("loadProducts error", err);
      UtilsLocal.showNotification("فشل جلب المنتجات", "error");
      state.products = [];
    }
  }

  // Load purchases
  async function loadPurchases() {
    try {
      const res = await ApiClient.purchasesList();
      const arr =
        res && res.data ? res.data : Array.isArray(res) ? res : res?.data ?? [];
      state.purchases = arr;
      renderPurchases();
      updateStats();
    } catch (err) {
      console.error("loadPurchases error", err);
      UtilsLocal.showNotification("فشل جلب المشتريات", "error");
      state.purchases = [];
      renderPurchases();
    }
  }

  // Render purchases table
  function renderPurchases() {
    const tbody = $("purchasesTableBody");
    const emptyState = $("emptyState");
    let list = [...state.purchases];

    // Filters
    const s = state.filters.search?.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (p) =>
          (p.purchase_number || "").toLowerCase().includes(s) ||
          (p.supplier?.name || "").toLowerCase().includes(s)
      );
    }
    if (state.filters.dateFrom) {
      list = list.filter(
        (p) => new Date(p.created_at) >= new Date(state.filters.dateFrom)
      );
    }
    if (state.filters.dateTo) {
      list = list.filter(
        (p) => new Date(p.created_at) <= new Date(state.filters.dateTo)
      );
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (!list.length) {
      tbody.innerHTML = "";
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    tbody.innerHTML = list.map((p) => createPurchaseRow(p)).join("");
    anime({
      targets: ".purchase-row",
      translateX: [50, 0],
      opacity: [0, 1],
      delay: anime.stagger(30),
      duration: 350,
      easing: "easeOutExpo",
    });
  }

  function createPurchaseRow(purchase) {
    const paymentStatusColor =
      purchase.payment_status === "PAID"
        ? "bg-green-100 text-green-800"
        : purchase.payment_status === "PARTIAL"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

    const deliveryStatusColor =
      purchase.delivery_status === "DELIVERED"
        ? "bg-green-100 text-green-800"
        : purchase.delivery_status === "PARTIAL"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

    return `
            <tr class="purchase-row">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-slate-900">${
                      purchase.purchase_number ?? purchase.id
                    }</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-900">${
                      purchase.supplier?.name || "مورد"
                    }</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-slate-600">${UtilsLocal.formatDate(
                      purchase.created_at
                    )}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <div class="text-sm text-slate-900">${
                      (purchase.items || []).length
                    }</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="text-sm font-semibold text-slate-900">${UtilsLocal.formatCurrency(
                      purchase.total
                    )}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${paymentStatusColor}">
                        ${
                          purchase.payment_status === "PAID"
                            ? "مدفوع"
                            : purchase.payment_status === "PARTIAL"
                            ? "مدفوع جزئياً"
                            : "قيد الانتظار"
                        }
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-center">
                    <span class="px-2 py-1 text-xs font-medium rounded-full ${deliveryStatusColor}">
                        ${
                          purchase.delivery_status === "DELIVERED"
                            ? "تم التوصيل"
                            : purchase.delivery_status === "PARTIAL"
                            ? "تم التوصيل جزئياً"
                            : "قيد الانتظار"
                        }
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex space-x-2">
                        <button onclick="Purchases.viewPurchase('${
                          purchase.id
                        }')" class="text-blue-600 hover:text-blue-800 text-sm">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="Purchases.updatePurchaseStatusPrompt('${
                          purchase.id
                        }')" class="text-green-600 hover:text-green-800 text-sm">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="Purchases.deletePurchase('${
                          purchase.id
                        }')" class="text-red-600 hover:text-red-800 text-sm">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
  }

  // Stats update
  function updateStats() {
    const today = new Date().toISOString().split("T")[0];
    const todayPurchases = state.purchases.filter(
      (p) => (p.created_at || "").split("T")[0] === today
    );
    const todayTotal = todayPurchases.reduce((s, p) => s + (p.total || 0), 0);
    const totalPurchases = state.purchases.reduce(
      (s, p) => s + (p.total || 0),
      0
    );
    const totalOrders = state.purchases.length;

    $("todayPurchases").textContent = UtilsLocal.formatCurrency(todayTotal);
    $("totalPurchases").textContent = UtilsLocal.formatCurrency(totalPurchases);
    $("totalOrders").textContent = totalOrders;
    animateNumbers(["todayPurchases", "totalPurchases", "totalOrders"]);
  }

  function animateNumbers(ids) {
    ids.forEach((id) => {
      const el = $(id);
      anime({
        targets: el,
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 700,
        easing: "easeOutElastic(1, .8)",
      });
    });
  }

  // Purchase modal / items UI
  function openPurchaseModal() {
    $("purchaseModal").classList.add("show");
    resetPurchaseForm();
  }
  function closePurchaseModal() {
    $("purchaseModal").classList.remove("show");
    resetPurchaseForm();
  }

  function resetPurchaseForm() {
    const f = $("purchaseForm");
    if (f) f.reset();
    state.purchaseItems = [];
    renderPurchaseItems();
    updatePurchaseSummary();
  }

  // Product selector modal
  function openProductSelector() {
    $("productSelectorModal").classList.remove("hidden");
    renderProductList();
  }
  function closeProductSelector() {
    $("productSelectorModal").classList.add("hidden");
    $("productSearch").value = "";
  }

  function renderProductList() {
    const list = $("productList");
    if (!list) return;
    list.innerHTML = (state.products || [])
      .map((product) => {
        return (product.variants || [])
          .map(
            (variant) => `
                <div class="p-3 border-b border-slate-200 hover:bg-slate-50 cursor-pointer" 
                     onclick="Purchases.addPurchaseItem('${product.id}','${variant.id}')">
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="font-medium text-slate-900">${product.name_ar}</div>
                            <div class="text-sm text-slate-600">${variant.specification} - ${variant.sku}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-slate-600">المخزون: ${variant.stock}</div>
                        </div>
                    </div>
                </div>
            `
          )
          .join("");
      })
      .join("");
  }

  function filterProductList(searchTerm) {
    const term = (searchTerm || "").toLowerCase();
    const products = state.products.filter((product) => {
      if ((product.name_ar || "").toLowerCase().includes(term)) return true;
      return (product.variants || []).some(
        (v) =>
          (v.specification || "").toLowerCase().includes(term) ||
          (v.sku || "").toLowerCase().includes(term)
      );
    });
    const list = $("productList");
    list.innerHTML = products
      .map((p) =>
        (p.variants || [])
          .map(
            (v) => `
            <div class="p-3 border-b border-slate-200 hover:bg-slate-50 cursor-pointer" 
                 onclick="Purchases.addPurchaseItem('${p.id}','${v.id}')">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="font-medium text-slate-900">${p.name_ar}</div>
                        <div class="text-sm text-slate-600">${v.specification} - ${v.sku}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-slate-600">المخزون: ${v.stock}</div>
                    </div>
                </div>
            </div>
        `
          )
          .join("")
      )
      .join("");
  }

  // Purchase items management
  function addPurchaseItem(productId, variantId) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) return;
    const variant = (product.variants || []).find((v) => v.id === variantId);
    if (!variant) return;

    const existing = state.purchaseItems.find(
      (it) => it.product_id === productId && it.variant_id === variantId
    );
    if (existing) {
      existing.quantity = (existing.quantity || 0) + 1;
      existing.total_cost = existing.quantity * existing.unit_cost;
    } else {
      state.purchaseItems.push({
        product_id: productId,
        variant_id: variantId,
        product_name: product.name_ar,
        variant_name: variant.specification,
        quantity: 1,
        unit_cost: variant.cost || 0,
        total_cost: variant.cost || 0,
      });
    }
    closeProductSelector();
    renderPurchaseItems();
    updatePurchaseSummary();
  }

  function renderPurchaseItems() {
    const container = $("purchaseItems");
    container.innerHTML = (state.purchaseItems || [])
      .map(
        (item, idx) => `
            <div class="purchase-item p-4 border border-slate-200 rounded-lg">
                <div class="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div class="md:col-span-2">
                        <div class="font-medium text-slate-900">${
                          item.product_name
                        }</div>
                        <div class="text-sm text-slate-600">${
                          item.variant_name
                        }</div>
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-700 mb-1">الكمية</label>
                        <input type="number" min="1" value="${
                          item.quantity
                        }" onchange="Purchases.updatePurchaseItemQuantity(${idx}, this.value)"
                               class="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500">
                    </div>
                    <div>
                        <label class="block text-xs font-medium text-slate-700 mb-1">سعر الشراء</label>
                        <input type="number" min="0" step="0.01" value="${
                          item.unit_cost
                        }" onchange="Purchases.updatePurchaseItemCost(${idx}, this.value)"
                               class="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500">
                    </div>
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-sm font-semibold text-slate-900">${UtilsLocal.formatCurrency(
                              item.total_cost
                            )}</div>
                        </div>
                        <button type="button" onclick="Purchases.removePurchaseItem(${idx})" class="text-red-600 hover:text-red-800">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `
      )
      .join("");
  }

  function updatePurchaseItemQuantity(index, qty) {
    qty = parseInt(qty) || 0;
    if (!state.purchaseItems[index]) return;
    state.purchaseItems[index].quantity = qty;
    state.purchaseItems[index].total_cost =
      state.purchaseItems[index].unit_cost * qty;
    renderPurchaseItems();
    updatePurchaseSummary();
  }

  function updatePurchaseItemCost(index, cost) {
    cost = parseFloat(cost) || 0;
    if (!state.purchaseItems[index]) return;
    state.purchaseItems[index].unit_cost = cost;
    state.purchaseItems[index].total_cost =
      state.purchaseItems[index].quantity * cost;
    renderPurchaseItems();
    updatePurchaseSummary();
  }

  function removePurchaseItem(index) {
    state.purchaseItems.splice(index, 1);
    renderPurchaseItems();
    updatePurchaseSummary();
  }

  function updatePurchaseSummary() {
    const subtotal = state.purchaseItems.reduce(
      (s, i) => s + (i.total_cost || 0),
      0
    );
    const tax = subtotal * (state.taxRate / 100);
    const total = subtotal + tax;
    $("subtotal").textContent = UtilsLocal.formatCurrency(subtotal);
    $("taxAmount").textContent = UtilsLocal.formatCurrency(tax);
    $("totalAmount").textContent = UtilsLocal.formatCurrency(total);
  }

  // Save purchase & immediately update stock (B: direct stock update)
  async function savePurchase(e) {
    e && e.preventDefault();
    if (!state.purchaseItems.length) {
      UtilsLocal.showNotification("يرجى إضافة عناصر للطلب", "error");
      return;
    }
    const supplierName = $("supplierName").value?.trim();
    if (!supplierName) {
      UtilsLocal.showNotification("يرجى إدخال اسم المورد", "error");
      return;
    }

    const subtotal = state.purchaseItems.reduce(
      (s, i) => s + (i.total_cost || 0),
      0
    );
    const tax = subtotal * (state.taxRate / 100);
    const total = subtotal + tax;

    const payload = {
      supplier: {
        name: supplierName,
        contact: $("supplierContact").value || "",
        phone: $("supplierPhone").value || "",
        address: $("supplierAddress").value || "",
      },
      items: state.purchaseItems.map((it) => ({
        productId: it.product_id,
        variantId: it.variant_id,
        quantity: it.quantity,
        unitCost: it.unit_cost,
      })),
      subtotal,
      tax,
      total,
      payment_status: $("paymentStatus").value || "PENDING",
      delivery_status: $("deliveryStatus").value || "DELIVERED",
    };

    try {
      const createRes = await ApiClient.purchasesCreate(payload);
      const created =
        createRes && createRes.data
          ? createRes.data
          : Array.isArray(createRes)
          ? createRes[0]
          : createRes;
      // attempt to update stock for each item (direct update)
      for (const it of payload.items) {
        try {
          await ApiClient.inventoryUpdateStock({
            productId: it.productId,
            variantId: it.variantId,
            quantity: it.quantity,
            type: "IN",
            notes: `Purchase ${created?.purchase_number ?? created?.id ?? ""}`,
          });
        } catch (err) {
          console.warn("inventory update failed for", it, err);
          // continue trying others but show a notification
          UtilsLocal.showNotification(
            `فشل تحديث المخزون للعنصر: ${it.variantId}`,
            "error"
          );
        }
      }

      UtilsLocal.showNotification(
        "تم إنشاء طلب الشراء وتحديث المخزون",
        "success"
      );
      await refreshAll();
      closePurchaseModal();
    } catch (err) {
      console.error("savePurchase error", err);
      UtilsLocal.showNotification("فشل إنشاء الطلب", "error");
    }
  }

  // Delete purchase
  async function deletePurchase(id) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      await ApiClient.purchasesDelete(id);
      UtilsLocal.showNotification("تم حذف الطلب", "success");
      await refreshAll();
    } catch (err) {
      console.error("deletePurchase error", err);
      UtilsLocal.showNotification("فشل حذف الطلب", "error");
    }
  }

  // Prompt & update purchase status (and optionally inventory if needed)
  async function updatePurchaseStatusPrompt(id) {
    const purchase = state.purchases.find((p) => p.id === id);
    if (!purchase) return;
    const newPayment =
      prompt(
        `حالة الدفع الحالية: ${purchase.payment_status}\nأدخل الحالة الجديدة (PAID, PENDING, PARTIAL):`,
        purchase.payment_status
      ) || "";
    const newDelivery =
      prompt(
        `حالة التوصيل الحالية: ${purchase.delivery_status}\nأدخل الحالة الجديدة (DELIVERED, PENDING, PARTIAL):`,
        purchase.delivery_status
      ) || "";

    const payload = {
      payment_status: newPayment.toUpperCase(),
      delivery_status: newDelivery.toUpperCase(),
    };

    try {
      await ApiClient.purchasesUpdateStatus(id, payload);
      UtilsLocal.showNotification("تم تحديث حالة الطلب", "success");
      await refreshAll();
    } catch (err) {
      console.error("updatePurchaseStatus error", err);
      UtilsLocal.showNotification("فشل تحديث الحالة", "error");
    }
  }

  // View purchase (preview)
  function viewPurchase(id) {
    const purchase = state.purchases.find((p) => p.id === id);
    if (!purchase) return;
    const previewContent = `
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <div class="flex justify-between items-center mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-slate-900">William Metal</h2>
                        <p class="text-slate-600">الدار البيضاء، المغرب</p>
                        <p class="text-slate-600">هاتف: +212522123456</p>
                    </div>
                    <div class="text-left">
                        <h3 class="text-xl font-bold text-slate-900">طلب شراء</h3>
                        <p class="text-slate-600">رقم الطلب: ${
                          purchase.purchase_number ?? purchase.id
                        }</p>
                        <p class="text-slate-600">التاريخ: ${UtilsLocal.formatDate(
                          purchase.created_at
                        )}</p>
                    </div>
                </div>

                <div class="border-t border-b border-slate-200 py-4 mb-6">
                    <h4 class="font-semibold text-slate-900 mb-2">معلومات المورد:</h4>
                    <p class="text-slate-700">الاسم: ${
                      purchase.supplier?.name || "مورد"
                    }</p>
                    ${
                      purchase.supplier?.contact
                        ? `<p class="text-slate-700">جهة الاتصال: ${purchase.supplier.contact}</p>`
                        : ""
                    }
                    ${
                      purchase.supplier?.phone
                        ? `<p class="text-slate-700">الهاتف: ${purchase.supplier.phone}</p>`
                        : ""
                    }
                    ${
                      purchase.supplier?.address
                        ? `<p class="text-slate-700">العنوان: ${purchase.supplier.address}</p>`
                        : ""
                    }
                </div>

                <table class="w-full mb-6">
                    <thead>
                        <tr class="border-b border-slate-200">
                            <th class="text-right py-2 font-semibold text-slate-900">المنتج</th>
                            <th class="text-center py-2 font-semibold text-slate-900">الكمية</th>
                            <th class="text-right py-2 font-semibold text-slate-900">سعر الشراء</th>
                            <th class="text-right py-2 font-semibold text-slate-900">المجموع</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(purchase.items || [])
                          .map((item) => {
                            const product =
                              state.products.find(
                                (p) => p.id === item.product_id
                              ) || {};
                            return `
                                <tr class="border-b border-slate-100">
                                    <td class="py-2 text-slate-700">${
                                      product.name_ar || ""
                                    } - ${item.variant_name || ""}</td>
                                    <td class="py-2 text-center text-slate-700">${
                                      item.quantity
                                    }</td>
                                    <td class="py-2 text-right text-slate-700">${UtilsLocal.formatCurrency(
                                      item.unit_cost
                                    )}</td>
                                    <td class="py-2 text-right text-slate-700">${UtilsLocal.formatCurrency(
                                      item.total_cost ||
                                        item.unit_cost * item.quantity
                                    )}</td>
                                </tr>
                            `;
                          })
                          .join("")}
                    </tbody>
                </table>

                <div class="flex justify-end">
                    <div class="w-64">
                        <div class="flex justify-between mb-2">
                            <span class="font-medium text-slate-700">المجموع الفرعي:</span>
                            <span class="font-semibold text-slate-900">${UtilsLocal.formatCurrency(
                              purchase.subtotal
                            )}</span>
                        </div>
                        <div class="flex justify-between mb-2">
                            <span class="font-medium text-slate-700">الضريبة:</span>
                            <span class="font-semibold text-slate-900">${UtilsLocal.formatCurrency(
                              purchase.tax
                            )}</span>
                        </div>
                        <div class="flex justify-between pt-2 border-t border-slate-200">
                            <span class="text-lg font-bold text-slate-900">الإجمالي:</span>
                            <span class="text-lg font-bold text-slate-900">${UtilsLocal.formatCurrency(
                              purchase.total
                            )}</span>
                        </div>
                    </div>
                </div>

                <div class="mt-6 pt-4 border-t border-slate-200">
                    <p class="text-sm text-slate-600">حالة الدفع: ${
                      purchase.payment_status
                    }</p>
                    <p class="text-sm text-slate-600">حالة التوصيل: ${
                      purchase.delivery_status
                    }</p>
                </div>
            </div>
        `;

    const modal = document.createElement("div");
    modal.className =
      "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center";
    modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-96 overflow-y-auto">
                <div class="p-6">
                    ${previewContent}
                    <div class="flex justify-end mt-6">
                        <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                                class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors">
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        `;
    document.body.appendChild(modal);
  }

  // Export purchases to CSV
  function exportPurchases() {
    const purchases = state.purchases.map((p) => ({
      "رقم الطلب": p.purchase_number || p.id,
      المورد: p.supplier?.name || "",
      "جهة الاتصال": p.supplier?.contact || "",
      التاريخ: UtilsLocal.formatDate(p.created_at),
      "عدد العناصر": (p.items || []).length,
      "المجموع الفرعي": p.subtotal,
      الضريبة: p.tax,
      الإجمالي: p.total,
      "حالة الدفع": p.payment_status,
      "حالة التوصيل": p.delivery_status,
    }));
    if (!purchases.length) {
      UtilsLocal.showNotification("لا توجد مشتريات للتصدير", "error");
      return;
    }
    const csv = convertToCSV(purchases);
    downloadCSV(csv, "purchases_report.csv");
    UtilsLocal.showNotification("تم تصدير المشتريات بنجاح", "success");
  }

  function convertToCSV(arr) {
    const headers = Object.keys(arr[0]);
    const lines = [headers.join(",")];
    for (const row of arr) {
      lines.push(headers.map((h) => `"${String(row[h] ?? "")}"`).join(","));
    }
    return lines.join("\n");
  }
  function downloadCSV(csv, filename) {
    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // refresh both lists
  async function refreshAll() {
    await loadProducts();
    await loadPurchases();
  }

  // setup page events
  function setupEvents() {
    $("searchInput").addEventListener("input", (e) => {
      state.filters.search = e.target.value;
      renderPurchases();
    });
    $("dateFrom").addEventListener("change", (e) => {
      state.filters.dateFrom = e.target.value;
      renderPurchases();
    });
    $("dateTo").addEventListener("change", (e) => {
      state.filters.dateTo = e.target.value;
      renderPurchases();
    });

    $("productSearch").addEventListener("input", (e) =>
      filterProductList(e.target.value)
    );

    $("purchaseForm").addEventListener("submit", savePurchase);

    // product selector open/close handlers
    document
      .querySelectorAll('[onclick="openProductSelector()"]')
      .forEach((btn) => btn.addEventListener("click", openProductSelector));
    document
      .querySelectorAll('[onclick="closeProductSelector()"]')
      .forEach((btn) => btn.addEventListener("click", closeProductSelector));
    // close purchase modal binding (top right 'x' button in modal already inline onclick)
    document
      .querySelectorAll('[onclick="closePurchaseModal()"]')
      .forEach((btn) => btn.addEventListener("click", closePurchaseModal));
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      if (window.Auth && Auth.logout) Auth.logout();
    });
  }


  // Initialize page
  document.addEventListener("DOMContentLoaded", async () => {
    // set active nav if utils available
    if (window.Utils && Utils.setActiveNav)
      Utils.setActiveNav("purchases.html");
    if (window.Auth && Auth.init) await Auth.init();
    if (window.Utils && Utils.updateUserInfo) Utils.updateUserInfo();

    setupEvents();
    await refreshAll();

    // intersection observer for animations
    const observer = new IntersectionObserver((entries) =>
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("visible");
      })
    );
    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
  });
  window.Purchases = {
    addPurchaseItem,
    updatePurchaseItemQuantity,
    updatePurchaseItemCost,
    removePurchaseItem,
    deletePurchase,
    viewPurchase,
    updatePurchaseStatusPrompt,
    exportPurchases,
  };

  // expose open/close modal for inline buttons
  window.openPurchaseModal = openPurchaseModal;
  window.closePurchaseModal = closePurchaseModal;
  window.openProductSelector = openProductSelector;
  window.closeProductSelector = closeProductSelector;
})();
