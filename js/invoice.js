(async function () {
    function getQuery() {
        const url = new URL(window.location.href);
        return url.searchParams.get("id");
    }

    const saleId = getQuery();
    if (!saleId) {
        alert("Aucune facture sélectionnée");
        return;
    }
    window.__SALE_ID = saleId;

    let res;
    try {
        res = await API.Invoices.get(saleId);
    } catch (e) {
        console.error(e);
        alert("Erreur lors du chargement de la facture");
        return;
    }

    const invoice = res?.data ?? res;

    // remplir info
    document.getElementById("invNumber").textContent = invoice.invoiceNumber ?? invoice.saleId ?? "";
    const created = invoice.issuedAt ?? invoice.createdAt ?? invoice.created_at ?? invoice.date;
    document.getElementById("invDate").textContent = created ? new Date(created).toLocaleDateString("fr-FR") : "";

    document.getElementById("custName").textContent = invoice.customer?.name || "";
    document.getElementById("custPhone").textContent = invoice.customer?.phone || "";
    document.getElementById("custAddress").textContent = invoice.customer?.address || "";

    const itemsWrap = document.getElementById("itemsTable");
    let totalHT = 0;

    (invoice.items || []).forEach(it => {
        const unit = it.unitPrice ?? it.unit_price ?? 0;
        const lineTotal = it.lineTotal ?? ((it.quantity || 0) * unit);
        totalHT += lineTotal;

        itemsWrap.innerHTML += `
            <tr>
                <td>${it.productName ?? ''}</td>
                <td>${it.variantName ?? ''}</td>
                <td>${it.quantity ?? ''}</td>
                <td>${unit.toFixed(2)} DH</td>
                <td>${lineTotal.toFixed(2)} DH</td>
            </tr>
        `;
    });

    const taxRate = invoice.company?.taxRate ?? 0;
    const tax = invoice.tax ?? (totalHT * (taxRate / 100));
    const total = invoice.total ?? (totalHT + tax);

    const currency = invoice.company?.currency || "DH";
    document.getElementById("totalHT").textContent = totalHT.toFixed(2) + " " + currency;
    document.getElementById("totalTVA").textContent = tax.toFixed(2) + " " + currency;
    document.getElementById("totalTTC").textContent = total.toFixed(2) + " " + currency;

    async function downloadPdf() {
        try {
            const resPdf = await API.Invoices.pdf(window.__SALE_ID);
            const blob = await resPdf.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${document.getElementById('invNumber').textContent || window.__SALE_ID}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert("Erreur lors du téléchargement du PDF");
        }
    }

    function printInvoice() {
        window.print();
    }

    document.getElementById('downloadBtn')?.addEventListener('click', downloadPdf);
    document.getElementById('printBtn')?.addEventListener('click', printInvoice);
})();
