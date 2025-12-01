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

    let res;
    try {
        res = await API.Sales.get(saleId);
    } catch (e) {
        console.error(e);
        alert("Erreur lors du chargement de la facture");
        return;
    }

    const sale = res.data;

    // remplir info
    document.getElementById("invNumber").textContent = sale.invoiceNumber;
    document.getElementById("invDate").textContent = new Date(sale.createdAt).toLocaleDateString("fr-FR");

    document.getElementById("custName").textContent = sale.customer?.name || "";
    document.getElementById("custPhone").textContent = sale.customer?.phone || "";
    document.getElementById("custAddress").textContent = sale.customer?.address || "";

    const itemsWrap = document.getElementById("itemsTable");
    let totalHT = 0;

    sale.items.forEach(it => {
        const lineTotal = it.quantity * it.unitPrice;
        totalHT += lineTotal;

        itemsWrap.innerHTML += `
            <tr>
                <td>${it.productName}</td>
                <td>${it.variantName}</td>
                <td>${it.quantity}</td>
                <td>${it.unitPrice.toFixed(2)} DH</td>
                <td>${lineTotal.toFixed(2)} DH</td>
            </tr>
        `;
    });

    const TVA = totalHT * 0.20;
    const TTC = totalHT + TVA;

    document.getElementById("totalHT").textContent = totalHT.toFixed(2) + " DH";
    document.getElementById("totalTVA").textContent = TVA.toFixed(2) + " DH";
    document.getElementById("totalTTC").textContent = TTC.toFixed(2) + " DH";

})();
