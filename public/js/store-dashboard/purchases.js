(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.purchases) return;

    const module = { _loaded: true, _inited: false, ctx: null };
    let _lastInvoices = [];

    function renderProductsList(products, helpers) {
        if (!products || !products.length) return '<p>لا توجد منتجات</p>';
        return `
            <div class="products-list">
                ${products.map(p => `
                    <div class="product-item" data-id="${p._id}" data-name="${helpers.escapeHtml(p.productName||p.name||'') }" data-price="${p.purchasePrice||p.costPrice||p.cost||0}" data-image="${helpers.escapeHtml((p.primaryImage && (p.primaryImage.url||p.primaryImage)) || (p.images && p.images[0]) || '')}">
                        <div class="product-thumb">
                            <img src="${helpers.escapeHtml((p.primaryImage && (p.primaryImage.url||p.primaryImage)) || (p.images && p.images[0]) || '')}" onerror="this.style.display='none'" alt="">
                        </div>
                        <div class="product-name">${helpers.escapeHtml(p.productName||p.name||'')}</div>
                        <div class="product-price">${helpers.formatCurrency(p.purchasePrice||p.costPrice||p.cost||0)}</div>
                        <button class="btn btn-sm btn-outline add-product-btn">أضف</button>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function buildInvoiceTable(items, helpers) {
        if (!items.length) return '<p>الفاتورة فارغة</p>';
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead><tr><th>المنتج</th><th>الكمية</th><th>الإجمالي</th><th></th></tr></thead>
                    <tbody>
                        ${items.map((it, idx) => `
                            <tr data-idx="${idx}">
                                <td style="display:flex;gap:8px;align-items:center">${it.image?`<img src="${helpers.escapeHtml(it.image)}" style="inline-size:48px;block-size:48px;object-fit:cover;border-radius:6px">`:''}<div style="min-inline-size:0">${helpers.escapeHtml(it.name)}</div></td>
                                <td><input type="number" class="inv-qty" value="${it.qty}" min="1" style="inline-size:70px"></td>
                                <td class="item-total">${helpers.formatCurrency(it.total)}</td>
                                <td><button class="btn btn-sm btn-danger remove-item">حذف</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function computeTotals(items) {
        const subtotal = items.reduce((s, it) => s + (Number(it.total) || 0), 0);
        return { subtotal };
    }

    async function renderPanel() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-purchases-panel'); if (!panel) return;

        const products = state.catalogSnapshot && state.catalogSnapshot.length ? state.catalogSnapshot : state.products || [];
        state.currentInvoice = state.currentInvoice || { items: [], subtotal:0, tax:0, total:0 };

        panel.innerHTML = `
            <style>
                /* Purchases panel local styles */
                .store-card { padding: 14px; border-radius: 10px; background: transparent; }
                .products-list{display:flex;flex-wrap:wrap;gap:10px;max-block-size:520px;overflow:auto;padding:6px;margin-block-end:6px}
                .product-item{background:transparent;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);text-align:center;box-shadow:0 1px 0 rgba(0,0,0,0.03)}
                .products-list .product-item{inline-size:120px}
                @media(min-inline-size:1200px){ .products-list .product-item{inline-size:160px} }
                .product-item img{inline-size:100%;block-size:100px;object-fit:cover;border-radius:6px;border:1px solid rgba(0,0,0,0.06);background:#fff}
                .product-name{font-weight:600;white-space:normal;overflow:hidden;text-overflow:ellipsis;font-size:0.95rem}
                .product-price{color:var(--muted-color,#9aa0a6);font-size:1rem;margin-block-start:6px;font-weight:700}
                .add-product-btn{display:block;margin-inline:auto;margin-block-start:8px}
                /* Invoice/table tweaks */
                .store-table th{background:transparent;color:var(--muted-color,#9aa0a6);font-weight:600;padding:8px;text-align:end}
                .store-table td{padding:8px;vertical-align:middle;font-size:0.95rem}
                .store-table img{inline-size:48px;block-size:48px;object-fit:cover;border-radius:6px}
                .btn {border-radius:8px;padding:8px 10px}
                .btn-sm {padding:6px 8px;font-size:0.92rem}
                @media (max-inline-size:900px) { .store-card { grid-template-columns: 1fr !important } }
            </style>
            <div class="store-card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <h3><i class="fas fa-receipt"></i> المشتريات</h3>
                    <div style="margin-block:8px">
                        <label>المورد</label>
                        <select id="purchaseSupplierSelect"><option value="">-- اختر مورد --</option></select>
                    </div>
                    <div style="margin-block:8px">
                        <label>بحث عن منتج</label>
                        <input id="purchaseSearchInput" type="text" placeholder="ابحث بالاسم أو الكود">
                    </div>
                    <div id="productsListContainer">${renderProductsList(products.slice(0,100), helpers)}</div>
                </div>
                <div>
                    <h3><i class="fas fa-list"></i> فاتورة مشتريات</h3>
                    <div id="invoiceContainer">${buildInvoiceTable(state.currentInvoice.items || [], helpers)}</div>
                    <div style="display:flex;gap:8px;align-items:center;margin-block:8px"><label>الضريبة:</label><input id="purchaseTax" type="number" value="0" style="inline-size:120px"></div>
                    <div style="margin-block:8px"><strong>المجموع:</strong> <span id="purchaseTotal">${helpers.formatCurrency(state.currentInvoice.subtotal||0)}</span></div>
                    <div style="display:flex;gap:8px;align-items:center;margin-block:8px">
                        <label style="margin-block:0;margin-inline-end:8px">طريقة الدفع:</label>
                        <select id="purchasePaymentMethod">
                            <option value="cash">نقدي</option>
                            <option value="credit">بالدين</option>
                        </select>
                        <label style="margin-block:0;margin-inline-start:12px;margin-inline-end:6px">المبلغ المدفوع</label>
                        <input id="purchasePaid" type="number" value="0" style="inline-size:140px">
                    </div>
                    <div style="display:flex;gap:8px"><button class="btn btn-primary" id="saveInvoiceBtn">حفظ و طباعة</button><button class="btn btn-outline" id="clearInvoiceBtn">تفريغ الفاتورة</button></div>
                    <div style="margin-block:12px"><h4>سجل الفواتير</h4><div id="invoicesHistory"><div class="store-loading"><div class="loader"></div><p>تحميل...</p></div></div></div>
                </div>
            </div>
        `;

        bindPurchasesPanel();
        loadSuppliersIntoSelect();
        loadInvoicesHistory();
    }

    function bindPurchasesPanel() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-purchases-panel'); if (!panel) return;
        const productsContainer = panel.querySelector('#productsListContainer');
        const searchInput = panel.querySelector('#purchaseSearchInput');
        const supplierSelect = panel.querySelector('#purchaseSupplierSelect');
        const invoiceContainer = panel.querySelector('#invoiceContainer');
        const saveBtn = panel.querySelector('#saveInvoiceBtn');
        const clearBtn = panel.querySelector('#clearInvoiceBtn');
        const taxInput = panel.querySelector('#purchaseTax');

        searchInput?.addEventListener('input', helpers.debounce((e) => {
            const q = e.target.value.trim().toLowerCase();
            const products = (state.catalogSnapshot && state.catalogSnapshot.length) ? state.catalogSnapshot : state.products || [];
            const filtered = products.filter(p => (p.productName||p.name||'').toLowerCase().includes(q) || (p.barcode||'').includes(q)).slice(0,100);
            productsContainer.innerHTML = renderProductsList(filtered, helpers);
            bindProductsAddButtons();
        }, 250));

        // bind add buttons for the initial product list
        bindProductsAddButtons();

        function refreshInvoiceUI() {
            const items = state.currentInvoice.items || [];
            invoiceContainer.innerHTML = buildInvoiceTable(items, helpers);
            const totals = computeTotals(items);
            const tax = Number(taxInput?.value || 0);
            const fullTotal = (Number(totals.subtotal) || 0) + tax;
            document.getElementById('purchaseTotal').innerText = helpers.formatCurrency(fullTotal || 0);
            // if payment method is cash, set paid amount to full total
            const pmEl = document.getElementById('purchasePaymentMethod');
            const paidEl = document.getElementById('purchasePaid');
            if (pmEl && paidEl) {
                if (pmEl.value === 'cash') {
                    paidEl.value = String(Number(fullTotal || 0).toFixed(2));
                    paidEl.disabled = true;
                } else {
                    // keep user-entered paid value for credit, default 0
                    if (!paidEl.value) paidEl.value = '0';
                    paidEl.disabled = false;
                }
            }
            bindInvoiceControls();
        }

        function bindProductsAddButtons() {
            productsContainer.querySelectorAll('.add-product-btn')?.forEach(btn => {
                btn.addEventListener('click', () => {
                    const node = btn.closest('.product-item');
                    const id = node?.getAttribute('data-id');
                    const name = node?.getAttribute('data-name');
                    const price = Number(node?.getAttribute('data-price') || 0);
                    const image = node?.getAttribute('data-image') || '';
                    addToInvoice({ productId: id, name, unitPrice: price, image });
                    refreshInvoiceUI();
                });
            });
        }

        function bindInvoiceControls() {
            invoiceContainer.querySelectorAll('.inv-qty')?.forEach(input => {
                input.addEventListener('change', () => {
                    const tr = input.closest('tr'); const idx = Number(tr?.getAttribute('data-idx'));
                    const val = Math.max(1, Number(input.value || 1));
                    state.currentInvoice.items[idx].qty = val; state.currentInvoice.items[idx].total = state.currentInvoice.items[idx].unitPrice * val;
                    refreshInvoiceUI();
                });
            });
            // unit price is not editable from the invoice UI by design
            invoiceContainer.querySelectorAll('.remove-item')?.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tr = btn.closest('tr'); const idx = Number(tr?.getAttribute('data-idx'));
                    state.currentInvoice.items.splice(idx,1); refreshInvoiceUI();
                });
            });
        }

        taxInput?.addEventListener('change', () => refreshInvoiceUI());

        const paymentMethodEl = panel.querySelector('#purchasePaymentMethod');
        const paidInputEl = panel.querySelector('#purchasePaid');
        // ensure payment method behaviour
        paymentMethodEl?.addEventListener('change', () => {
            const totals = computeTotals(state.currentInvoice.items || []);
            const tax = Number(taxInput?.value || 0);
            const fullTotal = (Number(totals.subtotal) || 0) + tax;
            if (paymentMethodEl.value === 'cash') {
                paidInputEl.value = String(Number(fullTotal || 0).toFixed(2));
                paidInputEl.disabled = true;
            } else {
                paidInputEl.value = '0';
                paidInputEl.disabled = false;
            }
        });

        // track selected supplier name in state so print templates can use it
        supplierSelect?.addEventListener('change', () => {
            state.selectedSupplierName = supplierSelect.selectedOptions?.[0]?.text || '';
            // refresh invoice history for the selected supplier
            loadInvoicesHistory();
        });

        clearBtn?.addEventListener('click', () => { state.currentInvoice = { items: [] }; renderPanel(); });

        saveBtn?.addEventListener('click', async () => {
            const supplierId = supplierSelect?.value;
            if (!supplierId) return helpers.showToast('اختر موردًا قبل الحفظ', 'info');
            const items = state.currentInvoice.items || [];
            if (!items.length) return helpers.showToast('الفاتورة فارغة', 'info');
            const subtotal = items.reduce((s, it) => s + (Number(it.total)||0), 0);
            const tax = Number(taxInput?.value || 0);
            const total = subtotal + tax;
            const paymentMethod = panel.querySelector('#purchasePaymentMethod')?.value || 'credit';
            const paidInputVal = Number(panel.querySelector('#purchasePaid')?.value || 0);
            const paid = paymentMethod === 'cash' ? (paidInputVal || total) : (paidInputVal || 0);
            const payload = { invoiceNumber: '', items: items.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, unitPrice: i.unitPrice, total: i.total })), subtotal, tax, total, paid, paymentMethod };
            try {
                const headers = { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' };
                const res = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}/invoices`, { method: 'POST', headers }, JSON.stringify(payload), 'فشل في حفظ الفاتورة');
                helpers.showToast('تم حفظ الفاتورة وتحديث المخزون', 'success');
                openPrintInvoice(res.invoice, state, helpers);
                state.currentInvoice = { items: [] };
                renderPanel();
            } catch (err) {
                helpers.showToast(err.message || 'فشل في الحفظ', 'error');
            }
        });
        // ensure initial paid input state and totals are correct
        refreshInvoiceUI();
    }

    function addToInvoice(item) {
        const state = module.ctx.state;
        state.currentInvoice = state.currentInvoice || { items: [] };
        const existing = state.currentInvoice.items.find(i => String(i.productId) === String(item.productId));
        if (existing) { existing.qty = (existing.qty||1) + 1; existing.total = existing.qty * existing.unitPrice; }
        else { state.currentInvoice.items.push({ productId: item.productId, name: item.name || '', qty: 1, unitPrice: Number(item.unitPrice)||0, total: Number(item.unitPrice)||0, image: item.image||'' }); }
    }

    async function loadSuppliersIntoSelect() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const sel = document.getElementById('purchaseSupplierSelect'); if (!sel) return;
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const res = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers?limit=200`, { headers }, null, 'فشل في جلب الموردين');
            const suppliers = res.suppliers || [];
            sel.innerHTML = `<option value="">-- اختر مورد --</option>` + suppliers.map(c => `<option value="${c._id}">${helpers.escapeHtml(c.name||c.phone||c.email||c._id)}</option>`).join('');
        } catch (err) {
            sel.innerHTML = `<option value="">-- لا يوجد موردين --</option>`;
        }
    }

    async function loadInvoicesHistory() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const container = document.getElementById('invoicesHistory'); if (!container) return;
        container.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل سجل الفواتير...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            // try to fetch invoices for the currently selected supplier; if none selected, try to auto-select the first supplier
            const supplierSelect = document.getElementById('purchaseSupplierSelect');
            let supplierId = supplierSelect?.value || '';
            if (!supplierId) {
                // try to fetch first supplier as a fallback
                const supResp = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers?limit=1`, { headers }).catch(()=>({ suppliers: [] }));
                const first = (supResp.suppliers||[])[0];
                if (first) supplierId = first._id;
            }
            if (!supplierId) {
                container.innerHTML = '<p>اختر موردًا لعرض سجل الفواتير</p>';
                return;
            }
            const res = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}/invoices?page=1&limit=20`, { headers }, null, 'فشل في جلب الفواتير');
            _lastInvoices = res.invoices || [];
            const rows = (_lastInvoices||[]).map(i => `
                <div class="inv-row" style="border-block-end:1px solid #eee;padding:6px 0;display:flex;justify-content:space-between;align-items:center">
                    <div>فاتورة ${helpers.escapeHtml(i.invoiceNumber||String(i._id).slice(-6))} — ${new Date(i.createdAt).toLocaleString('ar-EG')}</div>
                    <div style="display:flex;gap:8px;align-items:center">
                        <div>${helpers.formatCurrency(i.total)}</div>
                        <button class="btn btn-sm btn-outline inv-print" data-id="${helpers.escapeHtml(i._id)}" title="طباعة" style="inline-size:30px;block-size:30px;padding:0;display:grid;place-items:center;border-radius:6px"><i class="fas fa-print"></i></button>
                    </div>
                </div>
            `).join('');
            container.innerHTML = rows || '<p>لا توجد فواتير</p>';
            // bind print buttons for each invoice
            container.querySelectorAll('.inv-print')?.forEach(btn => btn.addEventListener('click', (ev) => {
                const id = btn.getAttribute('data-id');
                const inv = (_lastInvoices||[]).find(x=> String(x._id) === String(id));
                if (!inv) return helpers.showToast('تعذر جلب بيانات الفاتورة للطباعة','error');
                openPrintInvoice(inv, state, helpers);
            }));
        } catch (err) {
            container.innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر جلب السجل')}</p>`;
        }
    }

    function openPrintInvoice(invoice, state, helpers) {
        try {
            const w = window.open('', '_blank'); if (!w) return helpers.showToast('تعذر فتح نافذة الطباعة', 'error');
            const css = `body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}header{display:flex;justify-content:space-between;align-items:center;margin-block-end:12px}table{inline-size:100%;border-collapse:collapse}th,td{border:1px solid #eee;padding:8px;text-align:end}`;
            const rows = (invoice.items||[]).map(i => `<tr><td>${helpers.escapeHtml(i.name)}</td><td>${i.qty}</td><td>${helpers.formatCurrency(i.total)}</td></tr>`).join('');
            const storeLogo = state.store && (state.store.logo || state.store.logoUrl) ? `<img src="${helpers.escapeHtml(state.store.logo || state.store.logoUrl)}" alt="${helpers.escapeHtml(state.store.name||'')} logo">` : '';
            // determine supplier name: prefer invoice.supplierName, then state.selectedSupplierName, then the selected option in the DOM
            const supplierName = invoice.supplierName || state.selectedSupplierName || (document.getElementById('purchaseSupplierSelect')?.selectedOptions?.[0]?.text) || '';
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>فاتورة مشتريات ${helpers.escapeHtml(invoice.invoiceNumber||String(invoice._id).slice(-6))}</title><style>${css}</style></head><body><header><div>${storeLogo}</div><div><h2>${helpers.escapeHtml(state.store?.name||'')}</h2><div>فاتورة مشتريات: ${helpers.escapeHtml(invoice.invoiceNumber||String(invoice._id).slice(-6))}</div><div>التاريخ: ${new Date(invoice.createdAt).toLocaleString('ar-EG')}</div></div></header><hr><h3>المورد: ${helpers.escapeHtml(supplierName||'')}</h3><table><thead><tr><th>المنتج</th><th>الكمية</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-block:12px"><strong>الضريبة:</strong> ${helpers.formatCurrency(invoice.tax||0)}</div><div><strong>الإجمالي:</strong> ${helpers.formatCurrency(invoice.total||0)}</div></body></html>`;
            w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
        } catch (e) { console.error('print invoice', e); module.ctx.helpers.showToast('خطأ في تجهيز الطباعة','error'); }
    }

    module.init = function(ctx) { if (module._inited) return module; module.ctx = ctx || {}; module._inited = true; return module; };
    module.renderPanel = renderPanel;
    module._loaded = true;
    window.storeDashboard.purchases = module;
})();
