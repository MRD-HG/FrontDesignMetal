import { initCommonPage } from "./main.js";
import { apiGetDashboardStats, apiGetSalesLast30Days } from "./api.js";
import { apiGetStockAlerts, apiGetSales, apiGetPurchases } from "./api.js";
import { formatCurrency, formatDate } from "./utils.js";
import { showNotification } from "./ui.js";

async function renderStats() {
  const stats = await apiGetDashboardStats();

  document.getElementById("totalProducts").textContent =
    stats.totalProducts ?? 0;

  document.getElementById("totalStockValue").textContent =
    formatCurrency(stats.totalStockValue ?? 0);

  document.getElementById("totalSales").textContent =
    formatCurrency(stats.totalSales ?? 0);

  document.getElementById("stockAlerts").textContent =
    stats.stockAlerts ?? 0;
}

async function renderSalesChart() {
  const el = document.getElementById("salesChart");
  if (!el) return;

  const data = await apiGetSalesLast30Days();

  if (!data || data.length === 0) {
    el.innerHTML = `<div class="text-slate-500 text-sm p-4">لا توجد بيانات</div>`;
    return;
  }

  if (typeof echarts === "undefined") return;

  const chart = echarts.init(el);
  chart.setOption({
    tooltip: { trigger: "axis" },
    xAxis: {
      type: "category",
      data: data.map(d => d.date),
      axisLabel: { fontSize: 10 }
    },
    yAxis: { type: "value" },
    series: [{
      data: data.map(d => d.amount),
      type: "line",
      smooth: true,
      lineStyle: { color: "#1e40af" },
      areaStyle: { opacity: 0.2 }
    }]
  });

  window.addEventListener("resize", () => chart.resize());
}

async function renderStockAlerts() {
  const container = document.getElementById("stockAlertsList");
  if (!container) return;

  const alerts = await apiGetStockAlerts();

  if (!alerts || alerts.length === 0) {
    container.innerHTML = `<div class="text-slate-500 text-sm">لا توجد تنبيهات</div>`;
    return;
  }

  container.innerHTML = alerts.slice(0, 5).map(a => `
    <div class="flex justify-between items-center p-3 border rounded-lg ${
      a.type === 'out_of_stock' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    }">
      <div>
        <p class="font-semibold">${a.product}</p>
        <p class="text-sm text-slate-500">${a.variant}</p>
      </div>
      <span class="font-bold ${
        a.type === 'out_of_stock' ? 'text-red-600' : 'text-yellow-600'
      }">${a.current_stock}</span>
    </div>
  `).join("");
}

async function init() {
  try {
    initCommonPage();   // auth + logout + nav
    await renderStats();
    await renderSalesChart();
    await renderStockAlerts();
  } catch (e) {
    console.error(e);
    showNotification("خطأ أثناء تحميل لوحة التحكم", "error");
  }
}

init();
