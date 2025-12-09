(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.sales) return;

    const module = { _loaded: true, _inited: false, ctx: null };

    function renderProductsList(products, helpers) {
        if (!products || !products.length) return '<p>لا توجد منتجات</p>';
        return `
            <div class="products-list">
                ${products.map(p => `
                    <div class="product-item" data-id="${p._id}" data-name="${helpers.escapeHtml(p.productName||p.name||'') }" data-price="${p.salePrice||p.price||0}" data-image="${helpers.escapeHtml((p.primaryImage && (p.primaryImage.url||p.primaryImage)) || (p.images && p.images[0]) || '')}">
                        <div style="display:flex;gap:8px;align-items:center;">
                            <img src="${helpers.escapeHtml((p.primaryImage && (p.primaryImage.url||p.primaryImage)) || (p.images && p.images[0]) || '')}" onerror="this.style.display='none'" alt="" style="inline-size:56px;block-size:56px;object-fit:cover;border-radius:6px;background:#fff;border:1px solid #eee">
                            <div style="flex:1;min-inline-size:0">
                                <div class="product-name" style="font-weight:600;">${helpers.escapeHtml(p.productName||p.name||'')}</div>
                                <div class="product-price" style="color:#666;font-size:0.95rem;margin-block-start:6px">${helpers.formatCurrency(p.salePrice||p.price||0)}</div>
                            </div>
                            <button class="btn btn-sm btn-outline add-product-btn">أضف</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function buildCartTable(cart, state, helpers) {
        if (!cart.length) return '<p>السلة فارغة</p>';
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th></th></tr></thead>
                    <tbody>
                        ${cart.map((it, idx) => `
                            <tr data-idx="${idx}">
                                <td style="display:flex;gap:8px;align-items:center">
                                    ${it.image ? `<img src="${helpers.escapeHtml(it.image)}" onerror="this.style.display='none'" style="inline-size:48px;block-size:48px;object-fit:cover;border-radius:6px;border:1px solid #eee;margin-inline-end:6px">` : ''}
                                    <div style="min-inline-size:0">${helpers.escapeHtml(it.name)}</div>
                                </td>
                                <td><input type="number" class="cart-qty" value="${it.qty}" min="1" style="inline-size:70px"></td>
                                <td>${helpers.formatCurrency(it.unitPrice)}</td>
                                <td class="item-total">${helpers.formatCurrency(it.total)}</td>
                                <td><button class="btn btn-sm btn-danger remove-item">حذف</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function computeTotals(cart) {
        const subtotal = cart.reduce((s, it) => s + (Number(it.total) || 0), 0);
        return { subtotal };
    }

    async function renderPanel() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-sales-panel'); if (!panel) return;

        // prepare products list from snapshot for quick sale
        const products = state.catalogSnapshot && state.catalogSnapshot.length ? state.catalogSnapshot : state.products || [];
        state.salesCart = state.salesCart || [];
        const cart = state.salesCart;
        const totals = computeTotals(cart);

        panel.innerHTML = `
            <style>
                /* Sales panel local styles (logical properties) */
                .store-card { padding: 14px; border-radius: 10px; background: transparent; }
                .products-list{display:flex;flex-wrap:wrap;gap:10px;max-block-size:520px;overflow:auto;padding:6px;margin-block-end:6px}
                .product-item{background:transparent;padding:8px;border-radius:8px;border:1px solid rgba(255,255,255,0.04);inline-size:100%;box-shadow:0 1px 0 rgba(0,0,0,0.03)}
                .products-list .product-item{inline-size:calc(50% - 10px)}
                @media(min-inline-size:1200px){ .products-list .product-item{inline-size:calc(33.333% - 10px)} }
                .product-item img{inline-size:56px;block-size:56px;object-fit:cover;border-radius:6px;border:1px solid rgba(0,0,0,0.06);background:#fff}
                .product-name{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                .product-price{color:var(--muted-color,#9aa0a6);font-size:0.95rem}
                /* Cart table tweaks */
                .store-table th{background:transparent;color:var(--muted-color,#9aa0a6);font-weight:600;padding:10px;text-align:end}
                .store-table td{padding:10px;vertical-align:middle}
                .store-table img{inline-size:48px;block-size:48px;object-fit:cover;border-radius:6px}
                /* Buttons */
                .btn {border-radius:8px;padding:8px 10px}
                .btn-sm {padding:6px 8px;font-size:0.92rem}
                /* Sales panel responsive */
                @media (max-inline-size:900px) { .store-card { grid-template-columns: 1fr !important } }
            </style>
            <div class="store-card" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                    <h3><i class="fas fa-bolt"></i> مبيعات سريعة</h3>
                    <div style="display:flex;gap:8px;margin-block:8px;align-items:center;">
                        <input id="saleSearchInput" type="text" placeholder="ابحث عن منتج بالاسم أو الكود" style="flex:1">
                        <button class="btn btn-secondary btn-sm" id="refreshProductsBtn">تحديث</button>
                    </div>
                    <div id="productsListContainer">${renderProductsList(products.slice(0,50), helpers)}</div>
                </div>
                <div>
                    <h3><i class="fas fa-shopping-cart"></i> السلة</h3>
                    <div id="cartContainer">${buildCartTable(cart, state, helpers)}</div>
                    <div style="margin-block:8px">
                        <div style="display:flex;gap:8px;align-items:center;margin-block:6px;"><label>( الشحن ان وجد )</label><input id="saleShipping" type="number" value="0" style="inline-size:120px"></div>
                        <div style="display:flex;gap:8px;align-items:center;margin-block:6px;"><label>الطريقة:</label>
                            <select id="salePaymentMethod"><option value="cash">نقد</option><option value="account">على الحساب</option></select>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center;margin-block:6px;"><label>العميل (للمبيعات الآجلة)</label><select id="saleCustomerSelect"><option value="">-- اختار عميل --</option></select></div>
                        <div style="margin-block:8px"><strong>المجموع:</strong> <span id="saleTotal">${helpers.formatCurrency(totals.subtotal)}</span></div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn btn-primary" id="saveSaleBtn">حفظ و ${helpers.escapeHtml('طباعة')}</button>
                            <button class="btn btn-outline" id="clearCartBtn">افراغ السلة</button>
                        </div>
                        <div style="margin-block:8px"><h4>سجل المبيعات</h4><div id="salesHistory"><div class="store-loading"><div class="loader"></div><p>تحميل...</p></div></div></div>
                    </div>
                </div>
            </div>
        `;

        bindSalesPanel();
        loadCustomersForSelect();
        loadSalesHistory();
    }

    function bindSalesPanel() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-sales-panel'); if (!panel) return;
        const productsContainer = panel.querySelector('#productsListContainer');
        const refreshBtn = panel.querySelector('#refreshProductsBtn');
        const searchInput = panel.querySelector('#saleSearchInput');
        const cartContainer = panel.querySelector('#cartContainer');
        const saveBtn = panel.querySelector('#saveSaleBtn');
        const clearBtn = panel.querySelector('#clearCartBtn');
        const shippingInput = panel.querySelector('#saleShipping');
        const paymentSelect = panel.querySelector('#salePaymentMethod');
        const customerSelect = panel.querySelector('#saleCustomerSelect');

        refreshBtn?.addEventListener('click', () => {
            // re-render products list using latest snapshot
            const products = (state.catalogSnapshot && state.catalogSnapshot.length) ? state.catalogSnapshot : state.products || [];
            productsContainer.innerHTML = renderProductsList(products.slice(0,50), helpers);
            bindProductsAddButtons();
        });

        searchInput?.addEventListener('input', helpers.debounce((e) => {
            const q = e.target.value.trim().toLowerCase();
            const products = (state.catalogSnapshot && state.catalogSnapshot.length) ? state.catalogSnapshot : state.products || [];
            const filtered = products.filter(p => (p.productName||p.name||'').toLowerCase().includes(q) || (p.barcode||'').includes(q)).slice(0,50);
            productsContainer.innerHTML = renderProductsList(filtered, helpers);
            bindProductsAddButtons();
        }, 250));

        bindProductsAddButtons();

        function refreshCartUI() {
            const cart = state.salesCart || [];
            cartContainer.innerHTML = buildCartTable(cart, state, helpers);
            // update totals
            const totals = computeTotals(cart);
            const totalEl = document.getElementById('saleTotal');
            const shippingVal = Number(document.getElementById('saleShipping')?.value || 0);
            const fullTotal = (Number(totals.subtotal) || 0) + Number(shippingVal || 0);
            if (totalEl) totalEl.innerText = helpers.formatCurrency(fullTotal || 0);
            bindCartControls();
        }

        function bindProductsAddButtons() {
            productsContainer.querySelectorAll('.add-product-btn')?.forEach(btn => {
                btn.addEventListener('click', (ev) => {
                    const node = btn.closest('.product-item');
                    const id = node?.getAttribute('data-id');
                    const name = node?.getAttribute('data-name');
                    const price = Number(node?.getAttribute('data-price') || 0);
                    const image = node?.getAttribute('data-image') || '';
                    addToCart({ productId: id, name, unitPrice: price, image });
                    refreshCartUI();
                });
            });
        }

        function bindCartControls() {
            const cart = state.salesCart || [];
            const cartEl = document.getElementById('cartContainer');
            cartEl.querySelectorAll('.cart-qty')?.forEach(input => {
                input.addEventListener('change', () => {
                    const tr = input.closest('tr'); const idx = Number(tr?.getAttribute('data-idx'));
                    const val = Math.max(1, Number(input.value || 1));
                    cart[idx].qty = val; cart[idx].total = Number(cart[idx].unitPrice) * val;
                    refreshCartUI();
                });
            });
            cartEl.querySelectorAll('.remove-item')?.forEach(btn => {
                btn.addEventListener('click', () => {
                    const tr = btn.closest('tr'); const idx = Number(tr?.getAttribute('data-idx'));
                    state.salesCart.splice(idx,1); refreshCartUI();
                });
            });
        }

        shippingInput?.addEventListener('change', () => {
            const cart = state.salesCart || [];
            const totals = computeTotals(cart);
            const shippingVal = Number(shippingInput.value || 0);
            const totalEl = document.getElementById('saleTotal');
            if (totalEl) totalEl.innerText = helpers.formatCurrency((totals.subtotal || 0) + shippingVal);
        });

        paymentSelect?.addEventListener('change', () => {
            const method = paymentSelect.value;
            const customerRow = document.getElementById('saleCustomerSelect');
            if (method === 'account') {
                // require customer
                customerRow.setAttribute('required','required');
                helpers.showToast('عند اختيار "على الحساب" يجب اختيار عميل', 'info');
            } else {
                customerRow.removeAttribute('required');
            }
        });

        clearBtn?.addEventListener('click', () => { state.salesCart = []; refreshCartUI(); });

        saveBtn?.addEventListener('click', async () => {
            const cart = state.salesCart || [];
            if (!cart.length) return helpers.showToast('السلة فارغة', 'info');
            const shippingVal = Number(document.getElementById('saleShipping')?.value || 0);
            const paymentMethod = document.getElementById('salePaymentMethod')?.value || 'cash';
            const customerId = document.getElementById('saleCustomerSelect')?.value || null;
            if (paymentMethod === 'account' && !customerId) return helpers.showToast('اختيار العميل مطلوب للمبيعات الآجلة', 'error');
            const subtotal = cart.reduce((s, it) => s + (Number(it.total)||0), 0);
            const total = subtotal + Number(shippingVal||0);
            const payload = { items: cart, subtotal, shipping: shippingVal, total, paymentMethod, customerId };
            try {
                const headers = { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' };
                const res = await helpers.handleApiRequest(`/api/sales/${state.store._id}/sales`, { method: 'POST', headers }, JSON.stringify(payload), 'فشل في حفظ عملية البيع');
                helpers.showToast('تم حفظ عملية البيع', 'success');
                // open print window for the sale
                const sale = res.sale;
                openPrintSale(sale, state, helpers);
                // refresh history and clear cart
                state.salesCart = [];
                renderPanel();
            } catch (err) {
                helpers.showToast(err.message || 'فشل في حفظ البيع', 'error');
            }
        });

    }

    function addToCart(item) {
        const state = module.ctx.state;
        state.salesCart = state.salesCart || [];
        const existing = state.salesCart.find(i => String(i.productId) === String(item.productId));
        if (existing) { existing.qty = (existing.qty||1) + 1; existing.total = existing.qty * existing.unitPrice; existing.image = item.image || existing.image; }
        else { state.salesCart.push({ productId: item.productId, name: item.name || '', qty: 1, unitPrice: Number(item.unitPrice)||0, total: Number(item.unitPrice)||0, image: item.image || '' }); }
    }

    async function loadCustomersForSelect() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const sel = document.getElementById('saleCustomerSelect'); if (!sel) return;
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const res = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers?limit=200`, { headers }, null, 'فشل في جلب العملاء');
            const customers = res.customers || [];
            sel.innerHTML = `<option value="">-- اختار عميل --</option>` + customers.map(c => `<option value="${c._id}">${helpers.escapeHtml(c.name||c.phone||c.email||c._id)}</option>`).join('');
        } catch (err) {
            sel.innerHTML = `<option value="">-- لا يوجد عملاء --</option>`;
        }
    }

    async function loadSalesHistory(page = 1) {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const container = document.getElementById('salesHistory'); if (!container) return;
        container.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل سجل المبيعات...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const res = await helpers.handleApiRequest(`/api/sales/${state.store._id}/sales?page=${page}&limit=20`, { headers }, null, 'فشل في جلب سجل المبيعات');
            const rows = (res.sales||[]).map(s => `<div class="sale-row" data-id="${s._id}" style="border-block-end:1px solid #eee;padding:6px 0"><div style="display:flex;justify-content:space-between"><div><strong>${s.customerId? 'عميل':'زائر'}</strong> — ${new Date(s.createdAt).toLocaleString('ar-EG')}</div><div>${helpers.formatCurrency(s.total)}</div></div></div>`).join('');
            container.innerHTML = rows || '<p>لا توجد عمليات بيع بعد</p>';
        } catch (err) {
            container.innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر جلب السجل')}</p>`;
        }
    }

    function openPrintSale(sale, state, helpers) {
        try {
            const w = window.open('', '_blank'); if (!w) return helpers.showToast('تعذر فتح نافذة الطباعة', 'error');
            const css = `body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}header{display:flex;justify-content:space-between;align-items:center;margin-block-end:12px}header img{inline-size:80px;block-size:80px;object-fit:contain}table{inline-size:100%;border-collapse:collapse}th,td{border:1px solid #eee;padding:8px;text-align:end}`;
            const rows = (sale.items||[]).map(i => `<tr><td>${helpers.escapeHtml(i.name)}</td><td>${i.qty}</td><td>${helpers.formatCurrency(i.unitPrice)}</td><td>${helpers.formatCurrency(i.total)}</td></tr>`).join('');
            const storeLogo = state.store && (state.store.logo || state.store.logoUrl) ? `<img src="${helpers.escapeHtml(state.store.logo || state.store.logoUrl)}" alt="${helpers.escapeHtml(state.store.name||'')} logo">` : '';
            const storeName = helpers.escapeHtml(state.store?.name || '');
            const createdAt = new Date(sale.createdAt).toLocaleString('ar-EG');
            const invoiceNumber = sale.invoiceNumber || String(sale._id).slice(-6).toUpperCase();
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>فاتورة بيع ${helpers.escapeHtml(invoiceNumber)}</title><style>${css}</style></head><body><header><div>${storeLogo}</div><div><h2>${storeName}</h2><div>فاتورة: ${helpers.escapeHtml(invoiceNumber)}</div><div>التاريخ: ${createdAt}</div></div></header><hr><h3>العميل: ${helpers.escapeHtml(sale.customerId||'نقدي/زائر')}</h3><table><thead><tr><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>المجموع</th></tr></thead><tbody>${rows}</tbody></table><div style="margin-block:12px"><strong>( الشحن ان وجد )</strong> ${helpers.formatCurrency(sale.shipping||0)}</div><div><strong>الإجمالي:</strong> ${helpers.formatCurrency(sale.total||0)}</div></body></html>`;
            w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
        } catch (e) { console.error('print sale', e); module.ctx.helpers.showToast('خطأ في تجهيز الطباعة','error'); }
    }

    module.init = function(ctx) { if (module._inited) return module; module.ctx = ctx || {}; module._inited = true; return module; };
    module.renderPanel = renderPanel;
    module._loaded = true;
    window.storeDashboard.sales = module;
})();
