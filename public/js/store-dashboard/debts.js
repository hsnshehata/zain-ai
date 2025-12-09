(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.debts) return;

    const module = { _loaded: true, _inited: false, ctx: null };

    function renderDebtorsTable(customers, helpers) {
        if (!customers || !customers.length) return '<p>لا يوجد عملاء مديونين</p>';
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead><tr><th>العميل</th><th>الهاتف</th><th>الرصيد (مديونية)</th><th>آخر معاملة</th><th></th></tr></thead>
                    <tbody>
                        ${customers.map(c => `
                            <tr data-id="${c._id}">
                                <td>${helpers.escapeHtml(c.name||'—')}</td>
                                <td>${helpers.escapeHtml(c.phone||'—')}</td>
                                <td>${helpers.formatCurrency(c.balance||0)}</td>
                                <td>${c._lastTx ? helpers.formatDate(c._lastTx) : '-'}</td>
                                <td><button class="btn btn-sm btn-primary record-payment">تسجيل دفعة</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderCreditorsTable(suppliers, helpers) {
        if (!suppliers || !suppliers.length) return '<p>لا يوجد موردين دائنين</p>';
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead><tr><th>المورد</th><th>الهاتف</th><th>الرصيد (دائن)</th><th>آخر معاملة</th><th></th></tr></thead>
                    <tbody>
                        ${suppliers.map(s => `
                            <tr data-id="${s._id}">
                                <td>${helpers.escapeHtml(s.name||'—')}</td>
                                <td>${helpers.escapeHtml(s.phone||'—')}</td>
                                <td>${helpers.formatCurrency(s.balance||0)}</td>
                                <td>${s._lastTx ? helpers.formatDate(s._lastTx) : '-'}</td>
                                <td><button class="btn btn-sm btn-primary record-supplier-payment">تسجيل دفع للمورد</button></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async function renderPanel() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-debts-panel'); if (!panel) return;

        // initialize module tab state
        module._tab = module._tab || 'debtors'; // 'debtors' or 'creditors'

        panel.innerHTML = `
            <div class="store-card">
                <h3><i class="fas fa-wallet"></i> إدارة الديون والتحصيل</h3>
                <div style="display:flex;gap:12px;align-items:center;margin-block:8px">
                    <div><strong>إجمالي المديونية:</strong> <span id="totalDebt">${helpers.formatCurrency(0)}</span></div>
                    <div><strong>إجمالي الدائنين:</strong> <span id="totalCreditors">${helpers.formatCurrency(0)}</span></div>
                    <div style="margin-inline-start:auto"><button class="btn btn-secondary" id="refreshDebtsBtn">تحديث</button></div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;margin-block:8px">
                    <div>
                        <button class="btn btn-sm ${module._tab==='debtors'?'btn-primary':'btn-outline'}" id="tabDebtors">المدينون</button>
                        <button class="btn btn-sm ${module._tab==='creditors'?'btn-primary':'btn-outline'}" id="tabCreditors">الدائنون</button>
                    </div>
                    <div style="margin-inline-start:auto;display:flex;align-items:center">
                        <div class="form-group" style="min-inline-size:160px;max-inline-size:40%">
                            <input id="debtsSearch" class="debts-search" placeholder="ابحث باسم أو هاتف" type="text">
                        </div>
                    </div>
                </div>
                <div id="debtorsList"><div class="store-loading"><div class="loader"></div><p>جاري التحميل...</p></div></div>
            </div>
        `;

        bindDebtsPanel();
        // load totals for both sides so the header shows correct sums regardless of active tab
        await loadTotals();
        // load the active tab data
        if (module._tab === 'debtors') await loadDebtors(); else await loadCreditors();
    }

    // load both customers and suppliers totals and update header elements
    async function loadTotals() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const [custRes, supRes] = await Promise.all([
                helpers.handleApiRequest(`/api/customers/${state.store._id}/customers?limit=200`, { headers }, null, ''),
                helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers?limit=200`, { headers }, null, '')
            ]);
            const customers = (custRes.customers || []).map(c=> Object.assign({}, c));
            const suppliers = (supRes.suppliers || []).map(s=> Object.assign({}, s));

            const totalDebt = customers.reduce((s,c)=> s + (Number(c.balance)||0), 0);
            const totalCredit = suppliers.reduce((s,c)=> s + (Number(c.balance)||0), 0);

            const totalDebtEl = document.getElementById('totalDebt');
            if (totalDebtEl) totalDebtEl.innerText = helpers.formatCurrency(totalDebt);
            const totalCreditorsEl = document.getElementById('totalCreditors');
            if (totalCreditorsEl) totalCreditorsEl.innerText = helpers.formatCurrency(totalCredit);
        } catch (e) {
            // don't throw on totals failure; leave header as-is
            console.warn('loadTotals failed', e && e.message);
        }
    }

    function bindDebtsPanel() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-debts-panel'); if (!panel) return;
        const refreshBtn = panel.querySelector('#refreshDebtsBtn');
        const searchInput = panel.querySelector('#debtsSearch');
        const tabDebtors = panel.querySelector('#tabDebtors');
        const tabCreditors = panel.querySelector('#tabCreditors');

        refreshBtn?.addEventListener('click', async () => {
            if (module._tab === 'debtors') await loadDebtors(); else await loadCreditors();
        });

        searchInput?.addEventListener('input', helpers.debounce(async (e) => {
            const q = e.target.value || '';
            if (module._tab === 'debtors') await loadDebtors(q); else await loadCreditors(q);
        }, 300));

        tabDebtors?.addEventListener('click', async () => { module._tab = 'debtors'; await renderPanel(); });
        tabCreditors?.addEventListener('click', async () => { module._tab = 'creditors'; await renderPanel(); });

        panel.addEventListener('click', async (ev) => {
            const custBtn = ev.target.closest('.record-payment');
            if (custBtn) {
                const tr = custBtn.closest('tr');
                const customerId = tr?.getAttribute('data-id');
                if (customerId) await openRecordPaymentModal(customerId);
                return;
            }
            const suppBtn = ev.target.closest('.record-supplier-payment');
            if (suppBtn) {
                const tr = suppBtn.closest('tr');
                const supplierId = tr?.getAttribute('data-id');
                if (supplierId) await openRecordSupplierPaymentModal(supplierId);
                return;
            }
        });
    }

    async function loadDebtors(search = '') {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const container = document.getElementById('debtorsList'); if (!container) return;
        container.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const res = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers?limit=200&search=${encodeURIComponent(search||'')}`, { headers }, null, 'فشل في جلب العملاء');
            const customers = (res.customers || []).filter(c=> Number(c.balance) > 0).map(c=> Object.assign({}, c));

            // optionally fetch last transaction date for each debtor (best-effort, skip if many)
            const fetchLastTx = async (cust) => {
                try {
                    const txRes = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${cust._id}/transactions`, { headers }, null, '');
                    const txs = txRes.transactions || [];
                    if (txs.length) cust._lastTx = txs[0].createdAt;
                } catch (e) { /* ignore per-customer errors */ }
            };

            const toFetch = customers.slice(0, 50); // limit per-customer requests
            await Promise.all(toFetch.map(c => fetchLastTx(c)));

            const totalDebt = customers.reduce((s,c)=> s + (Number(c.balance)||0), 0);
            const totalDebtEl = document.getElementById('totalDebt');
            if (totalDebtEl) totalDebtEl.innerText = helpers.formatCurrency(totalDebt);
            const numDebtorsEl = document.getElementById('numDebtors');
            if (numDebtorsEl) numDebtorsEl.innerText = String(customers.length);

            container.innerHTML = renderDebtorsTable(customers, helpers);
        } catch (err) {
            container.innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر جلب المدينين')}</p>`;
        }
    }

    async function loadCreditors(search = '') {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const container = document.getElementById('debtorsList'); if (!container) return;
        container.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const res = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers?limit=200&search=${encodeURIComponent(search||'')}`, { headers }, null, 'فشل في جلب الموردين');
            const suppliers = (res.suppliers || []).filter(s => Number(s.balance) > 0).map(s => Object.assign({}, s));

            // fetch last tx per supplier (limited)
            const fetchLastTx = async (sup) => {
                try {
                    const txRes = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${sup._id}/transactions`, { headers }, null, '');
                    const txs = txRes.transactions || [];
                    if (txs.length) sup._lastTx = txs[0].createdAt;
                } catch (e) { }
            };
            const toFetch = suppliers.slice(0, 50);
            await Promise.all(toFetch.map(s => fetchLastTx(s)));

            const totalCredit = suppliers.reduce((s, c) => s + (Number(c.balance) || 0), 0);
            const totalCreditorsEl = document.getElementById('totalCreditors');
            if (totalCreditorsEl) totalCreditorsEl.innerText = helpers.formatCurrency(totalCredit);
            container.innerHTML = renderCreditorsTable(suppliers, helpers);
        } catch (err) {
            container.innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر جلب الموردين')}</p>`;
        }
    }

    async function openRecordPaymentModal(customerId) {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const custRes = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${customerId}`, { headers }, null, 'فشل في جلب بيانات العميل');
            const customer = custRes.customer || custRes;

            const modal = window.open('', '_blank', 'width=600,height=600');
            if (!modal) return helpers.showToast('تعذر فتح النافذة', 'error');

            const html = `<!doctype html><html><head><meta charset="utf-8"><title>تسجيل دفعة</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}label{display:block;margin-block-start:8px}input{inline-size:100%;padding:8px;margin-block-start:4px}button{margin-block-start:12px;padding:8px 12px}</style></head><body>
                <h3>تسجيل دفعة — ${helpers.escapeHtml(customer.name||customer.phone||'')}</h3>
                <div>الرصيد الحالي: <strong>${helpers.formatCurrency(customer.balance||0)}</strong></div>
                <label>المبلغ المستلم</label><input id="payAmount" type="number" value="0">
                <label>ملاحظة</label><input id="payNote" type="text" placeholder="ملاحظة (اختياري)">
                <div style="display:flex;gap:8px"><button id="saveBtn">حفظ وطباعة الإيصال</button><button id="cancelBtn">إلغاء</button></div>
                <script>
                    const saveBtn = document.getElementById('saveBtn');
                    const cancelBtn = document.getElementById('cancelBtn');
                    saveBtn.addEventListener('click', async ()=>{
                        const amount = Number(document.getElementById('payAmount').value||0);
                        const note = document.getElementById('payNote').value||'';
                        if (!amount || amount<=0) return alert('أدخل مبلغ صالح');
                        try {
                            const res = await fetch('/api/customers/${state.store._id}/customers/${customerId}/transactions', {
                                method: 'POST', headers: { 'Content-Type':'application/json', Authorization: 'Bearer ${state.token}' },
                                body: JSON.stringify({ amount, type: 'payment', note })
                            });
                            const data = await res.json();
                            if (!res.ok) return alert(data.message||'فشل في تسجيل الدفعة');
                            // open printable receipt (write directly to new window)
                            const w = window.open('','_blank');
                            if (w) {
                                const receiptHtml = "<!doctype html><html><head><meta charset=\"utf-8\"><title>إيصال استلام</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}table{inline-size:100%;border-collapse:collapse}th,td{padding:8px;text-align:end}</style></head><body><h2>إيصال استلام</h2><div>العميل: " +
                                    helpers.escapeHtml(customer.name||customer.phone||'') +
                                    "</div><div>المبلغ المدفوع: " + helpers.formatCurrency(amount) + "</div><div>تاريخ: " + (new Date()).toLocaleString('ar-EG') + "</div><div>ملاحظة: " + helpers.escapeHtml(note||'') + "</div></body></html>";
                                w.document.open(); w.document.write(receiptHtml); w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
                            }
                            alert('تم تسجيل الدفعة');
                            window.close();
                        } catch (e) { alert('خطأ في تسجيل الدفعة'); }
                    });
                    cancelBtn.addEventListener('click', ()=> window.close());
                <\/script>
            </body></html>`;

            modal.document.open(); modal.document.write(html); modal.document.close(); modal.focus();
        } catch (err) {
            console.error('openRecordPaymentModal', err);
            module.ctx.helpers.showToast(err.message || 'خطأ', 'error');
        }
    }

    async function openRecordSupplierPaymentModal(supplierId) {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const supRes = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}`, { headers }, null, 'فشل في جلب بيانات المورد');
            const supplier = supRes.supplier || supRes;

            const modal = window.open('', '_blank', 'width=600,height=560');
            if (!modal) return helpers.showToast('تعذر فتح النافذة', 'error');

            const html = '<!doctype html><html><head><meta charset="utf-8"><title>تسجيل دفع للمورد</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px}label{display:block;margin-block-start:8px}input{inline-size:100%;padding:8px;margin-block-start:4px}button{margin-block-start:12px;padding:8px 12px}</style></head><body>' +
                '<h3>تسجيل دفع للمورد — ' + helpers.escapeHtml(supplier.name||supplier.phone||'') + '</h3>' +
                '<div>الرصيد الحالي: <strong>' + helpers.formatCurrency(supplier.balance||0) + '</strong></div>' +
                '<label>المبلغ المسدد</label><input id="payAmount" type="number" value="0">' +
                '<label>ملاحظة</label><input id="payNote" type="text" placeholder="ملاحظة (اختياري)">' +
                '<div style="display:flex;gap:8px"><button id="saveBtn">حفظ وطباعة الإيصال</button><button id="cancelBtn">إلغاء</button></div>' +
                '</body></html>';

            modal.document.open(); modal.document.write(html); modal.document.close(); modal.focus();

            // bind events from parent context to modal elements
            setTimeout(() => {
                try {
                    const doc = modal.document;
                    const saveBtn = doc.getElementById('saveBtn');
                    const cancelBtn = doc.getElementById('cancelBtn');
                    const amountEl = doc.getElementById('payAmount');
                    const noteEl = doc.getElementById('payNote');
                    if (saveBtn) {
                        saveBtn.addEventListener('click', async () => {
                            const amount = Number(amountEl.value || 0);
                            const note = noteEl.value || '';
                            if (!amount || amount <= 0) return modal.alert('أدخل مبلغ صالح');
                            try {
                                const res = await fetch(`/api/suppliers/${state.store._id}/suppliers/${supplierId}/transactions`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
                                    body: JSON.stringify({ amount, type: 'payment', note })
                                });
                                const data = await res.json();
                                if (!res.ok) return modal.alert(data.message || 'فشل في تسجيل الدفعة');
                                const receipt = '<!doctype html><html><head><meta charset="utf-8"><title>إيصال استلام</title></head><body>' +
                                    '<h2>إيصال استلام</h2>' +
                                    '<div>المورد: ' + helpers.escapeHtml(supplier.name||supplier.phone||'') + '</div>' +
                                    '<div>المبلغ المدفوع: ' + helpers.formatCurrency(amount) + '</div>' +
                                    '<div>تاريخ: ' + (new Date()).toLocaleString('ar-EG') + '</div>' +
                                    '<div>ملاحظة: ' + helpers.escapeHtml(note||'') + '</div>' +
                                    '</body></html>';
                                const w = window.open('', '_blank');
                                if (w) { w.document.open(); w.document.write(receipt); w.document.close(); w.focus(); setTimeout(()=>w.print(), 400); }
                                modal.alert('تم تسجيل الدفعة');
                                modal.close();
                                // refresh creditors list
                                loadCreditors();
                            } catch (e) {
                                modal.alert('خطأ في تسجيل الدفعة');
                            }
                        });
                    }
                    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.close());
                } catch (e) {
                    console.error('bind supplier modal', e);
                }
            }, 150);
        } catch (err) {
            console.error('openRecordSupplierPaymentModal', err);
            module.ctx.helpers.showToast(err.message || 'خطأ', 'error');
        }
    }

    module.init = function(ctx) { if (module._inited) return module; module.ctx = ctx || {}; module._inited = true; return module; };
    module.renderPanel = renderPanel;
    module._loaded = true;
    window.storeDashboard.debts = module;
})();
