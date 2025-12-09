(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.customers) return; // already loaded

    const module = {
        _loaded: true,
        _inited: false,
        ctx: null,
    };

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>"]+/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;'
        })[char] || char);
    }

    function renderCustomersTable(customers, total, page, pageSize, helpers) {
        if (!customers.length) return '<p>لا يوجد عملاء بعد.</p>';
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الهاتف</th>
                            <th>الرصيد</th>
                            <th>عدد الطلبات</th>
                            <th>إجمالي الإنفاق</th>
                            <th>آخر طلب</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customers.map(c => `
                            <tr data-id="${c._id}">
                                <td>${helpers.escapeHtml(c.name || '-')}</td>
                                <td>${helpers.escapeHtml(c.phone)}</td>
                                <td>${helpers.formatCurrency(c.balance || 0, c.currency || 'EGP')}</td>
                                <td>${helpers.formatNumber(c.totalOrders || 0)}</td>
                                <td>${helpers.formatCurrency(c.totalSpent || 0, c.currency || 'EGP')}</td>
                                <td>${c.lastOrderAt ? helpers.formatDate(c.lastOrderAt) : '-'}</td>
                                <td class="table-actions">
                                    <button class="btn btn-secondary btn-sm" data-action="view-customer"><i class="fas fa-eye"></i></button>
                                    <button class="btn btn-primary btn-sm" data-action="edit-customer"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-danger btn-sm" data-action="delete-customer"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" data-page="${page-1}" ${page<=1?'disabled':''}><i class="fas fa-chevron-right"></i></button>
                <span>صفحة ${page} من ${totalPages}</span>
                <button class="btn btn-secondary btn-sm" data-page="${page+1}" ${page>=totalPages?'disabled':''}><i class="fas fa-chevron-left"></i></button>
            </div>
        `;
    }

    async function loadCustomers(search = '', page = 1) {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        state.customerSearch = search;
        state.customerPage = page;
        const list = document.getElementById('customersList');
        if (!list) return;
        list.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const url = `/api/customers/${state.store._id}/customers?search=${encodeURIComponent(search||'')}&page=${page}&limit=${state.customerPageSize}`;
            const data = await helpers.handleApiRequest(url, { headers }, null, 'فشل في جلب العملاء');
            list.innerHTML = renderCustomersTable(data.customers || [], data.total || 0, page, state.customerPageSize, helpers);
            bindCustomersList();
        } catch (err) {
            list.innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر تحميل العملاء')}</p>`;
        }
    }

    function bindCustomersPanel() {
        const helpers = module.ctx.helpers;
        const searchInput = document.getElementById('customerSearchInput');
        const refreshBtn = document.getElementById('refreshCustomersBtn');
        const addBtn = document.getElementById('addCustomerBtn');
        searchInput?.addEventListener('input', helpers.debounce((e) => {
            loadCustomers(e.target.value.trim(), 1);
        }, 350));
        refreshBtn?.addEventListener('click', () => loadCustomers(searchInput?.value?.trim()||'', 1));
        addBtn?.addEventListener('click', () => openCustomerModal());
    }

    function bindCustomersList() {
        const list = document.getElementById('customersList');
        if (!list) return;
        list.querySelectorAll('.pagination-controls button[data-page]')?.forEach(btn => {
            btn.addEventListener('click', () => {
                const search = document.getElementById('customerSearchInput')?.value?.trim() || '';
                const page = Number(btn.getAttribute('data-page'));
                if (page > 0) loadCustomers(search, page);
            });
        });
        list.querySelectorAll('button[data-action="view-customer"]')?.forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('tr');
                const id = row?.getAttribute('data-id');
                if (!id) return;
                await openCustomerModal(id);
            });
        });
        list.querySelectorAll('button[data-action="edit-customer"]')?.forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('tr');
                const id = row?.getAttribute('data-id');
                if (!id) return;
                await openCustomerModal(id, { edit: true });
            });
        });
        list.querySelectorAll('button[data-action="delete-customer"]')?.forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('tr');
                const id = row?.getAttribute('data-id');
                if (!id) return;
                if (!confirm('هل أنت متأكد من حذف هذا العميل؟')) return;
                const state = module.ctx.state; const helpers = module.ctx.helpers;
                try {
                    await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } }, null, 'فشل في حذف العميل');
                    helpers.showToast('تم حذف العميل', 'success');
                    await loadCustomers(state.customerSearch||'', state.customerPage||1);
                } catch (err) {
                    helpers.showToast(err.message || 'تعذر حذف العميل', 'error');
                }
            });
        });
    }

    async function openCustomerModal(customerId, opts = {}) {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const overlay = document.createElement('div');
        overlay.className = 'store-modal';
        // modal opens in view-only mode by default; user can click "تحرير" to enable editing
        overlay.innerHTML = `
            <div class="store-modal-content" dir="rtl">
                <button class="modal-close" type="button"><i class="fas fa-times"></i></button>
                <h3>ملف العميل</h3>
                <div style="display:flex;gap:8px;align-items:center;margin-block:8px;">
                    <button class="btn btn-primary btn-sm" id="saveCustomerBtn" style="display:none">حفظ</button>
                    <button class="btn btn-outline btn-sm" id="startEditBtn">تحرير</button>
                    ${customerId ? `<button class="btn btn-secondary btn-sm" id="printStatementBtn">طباعة كشف حساب</button>` : ''}
                </div>
                <div id="customerDetails" style="min-inline-size:300px;min-block-size:120px;"></div>
            </div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));
        const close = () => { overlay.classList.remove('visible'); setTimeout(()=>overlay.remove(),200); };
        overlay.querySelector('.modal-close')?.addEventListener('click', close);
        overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });

        const box = overlay.querySelector('#customerDetails');
        // prepare form for create/edit and area for transactions
        box.innerHTML = `
            <div id="customerForm" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-block:6px;">
                <div><label>الاسم</label><input id="c_name" type="text"></div>
                <div><label>الهاتف</label><input id="c_phone" type="text"></div>
                <div><label>البريد</label><input id="c_email" type="email"></div>
                <div><label>العنوان</label><input id="c_address" type="text"></div>
                <div style="grid-column:1/-1"><label>ملاحظات</label><textarea id="c_notes" rows="2"></textarea></div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-block:10px;">
                <div style="flex:1"><strong>الرصيد الحالي:</strong> <span id="c_balance">0</span></div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <select id="tx_type"><option value="charge">خصم (دين)</option><option value="payment">سداد</option></select>
                    <input id="tx_amount" type="number" placeholder="المبلغ" style="inline-size:140px">
                    <button class="btn btn-primary btn-sm" id="addTxBtn">سجل معاملة</button>
                </div>
            </div>
            <div id="customerTxList">${customerId ? '<div class="store-loading"><div class="loader"></div><p>تحميل...</p></div>' : '<p class="muted">سجّل العميل أولاً ثم ستظهر المعاملات هنا.</p>'}</div>
        `;

        const saveBtn = overlay.querySelector('#saveCustomerBtn');
        const startEditBtn = overlay.querySelector('#startEditBtn');
        const printBtn = overlay.querySelector('#printStatementBtn');
        const nameInput = overlay.querySelector('#c_name');
        const phoneInput = overlay.querySelector('#c_phone');
        const emailInput = overlay.querySelector('#c_email');
        const addressInput = overlay.querySelector('#c_address');
        const notesInput = overlay.querySelector('#c_notes');
        const balanceEl = overlay.querySelector('#c_balance');
        const addTxBtn = overlay.querySelector('#addTxBtn');

        // default mode: view-only unless explicitly called with opts.edit === true
        // For new customer creation (no customerId) open modal in edit mode by default
        const isEditMode = !!opts.edit || !customerId;

        // If editing/viewing existing customer, load data and transactions
        if (customerId) {
            try {
                const headers = { Authorization: `Bearer ${state.token}` };
                const data = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${customerId}`, { headers }, null, 'فشل في جلب ملف العميل');
                const { customer } = data;
                nameInput.value = customer.name || '';
                phoneInput.value = customer.phone || '';
                emailInput.value = customer.email || '';
                addressInput.value = customer.address || '';
                notesInput.value = customer.notes || '';
                balanceEl.innerText = helpers.formatCurrency(customer.balance || 0, customer.currency || state.analytics.currency);
                await loadCustomerTransactions(customerId, overlay);
            } catch (err) {
                overlay.querySelector('#customerDetails').innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر تحميل ملف العميل')}</p>`;
            }
        } else {
            // new customer defaults
            phoneInput.value = '';
        }

        // set inputs/read-only and controls according to initial mode
        const setEditMode = (on) => {
            if (on) {
                saveBtn.style.display = '';
                startEditBtn.style.display = 'none';
                nameInput.removeAttribute('readonly');
                emailInput.removeAttribute('readonly');
                addressInput.removeAttribute('readonly');
                notesInput.removeAttribute('readonly');
                // phone remains readonly for existing customers to avoid unique constraint issues
                if (!customerId) phoneInput.removeAttribute('readonly');
                addTxBtn?.removeAttribute('disabled');
            } else {
                saveBtn.style.display = 'none';
                startEditBtn.style.display = '';
                nameInput.setAttribute('readonly','readonly');
                phoneInput.setAttribute('readonly','readonly');
                emailInput.setAttribute('readonly','readonly');
                addressInput.setAttribute('readonly','readonly');
                notesInput.setAttribute('readonly','readonly');
                addTxBtn?.setAttribute('disabled','disabled');
            }
        };

        setEditMode(isEditMode);

        saveBtn?.addEventListener('click', async () => {
            const payload = { name: nameInput.value.trim(), phone: phoneInput.value.trim(), email: emailInput.value.trim(), address: addressInput.value.trim(), notes: notesInput.value.trim() };
            try {
                if (customerId) {
                    await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${customerId}`, { method: 'PUT', headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, null, 'فشل في تحديث العميل');
                    helpers.showToast('تم تحديث بيانات العميل', 'success');
                } else {
                    await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers`, { method: 'POST', headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, null, 'فشل في إنشاء العميل');
                    helpers.showToast('تم إنشاء العميل', 'success');
                }
                close();
                await loadCustomers(state.customerSearch||'', state.customerPage||1);
            } catch (err) {
                helpers.showToast(err.message || 'تعذر حفظ العميل', 'error');
            }
        });

        startEditBtn?.addEventListener('click', () => {
            setEditMode(true);
        });

        addTxBtn?.addEventListener('click', async () => {
            const type = overlay.querySelector('#tx_type').value;
            const amount = Number(overlay.querySelector('#tx_amount').value || 0);
            const note = ''; // could add input
            if (!customerId) return helpers.showToast('سجّل العميل أولاً ثم أضف المعاملة', 'info');
            if (!amount || amount <= 0) return helpers.showToast('أدخل مبلغ صالح', 'info');
            try {
                const payload = { amount, type, note };
                const res = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${customerId}/transactions`, { method: 'POST', headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, null, 'فشل في تسجيل المعاملة');
                helpers.showToast('تم تسجيل المعاملة', 'success');
                // update balance display
                balanceEl.innerText = helpers.formatCurrency(res.balance || 0, state.analytics.currency);
                await loadCustomerTransactions(customerId, overlay);
            } catch (err) {
                helpers.showToast(err.message || 'تعذر إضافة المعاملة', 'error');
            }
        });

        printBtn?.addEventListener('click', async () => {
            if (!customerId) return;
            try {
                const headers = { Authorization: `Bearer ${state.token}` };
                const res = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${customerId}/statement`, { headers }, null, 'فشل في جلب كشف الحساب');
                openPrintCustomerStatement(res.customer, res.transactions, state, helpers);
            } catch (err) {
                helpers.showToast(err.message || 'تعذر جلب كشف الحساب للطباعة', 'error');
            }
        });

        // allow editing phone only if creating; if editing keep phone readonly
        if (customerId) phoneInput.setAttribute('readonly','readonly');
    }

    async function loadCustomerTransactions(customerId, overlay) {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const container = overlay.querySelector('#customerTxList');
        container.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل المعاملات...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const res = await helpers.handleApiRequest(`/api/customers/${state.store._id}/customers/${customerId}/transactions`, { headers }, null, 'فشل في جلب المعاملات');
            const tx = res.transactions || [];
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="store-table">
                        <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الملاحظة</th></tr></thead>
                        <tbody>
                            ${tx.map(t => `<tr><td>${helpers.formatDate(t.createdAt)}</td><td>${helpers.escapeHtml(t.type)}</td><td>${helpers.formatCurrency(t.amount, state.analytics.currency)}</td><td>${helpers.escapeHtml(t.note||'')}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر تحميل المعاملات')}</p>`;
        }
    }

    function openPrintCustomerStatement(customer, transactions, state, helpers) {
        try {
            const w = window.open('', '_blank'); if (!w) return helpers.showToast('تعذر فتح نافذة الطباعة', 'error');
            const css = `body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}table{inline-size:100%;border-collapse:collapse}th,td{border:1px solid #eee;padding:8px;text-align:end}`;
            const rows = (transactions||[]).map(t => `<tr><td>${helpers.formatDate(t.createdAt)}</td><td>${helpers.escapeHtml(t.type)}</td><td>${helpers.formatCurrency(t.amount, state.analytics.currency)}</td><td>${helpers.escapeHtml(t.note||'')}</td></tr>`).join('');
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>كشف حساب ${helpers.escapeHtml(customer.name||'')}</title><style>${css}</style></head><body><h2>كشف حساب: ${helpers.escapeHtml(customer.name||'')}</h2><div>الهاتف: ${helpers.escapeHtml(customer.phone||'')}</div><div>العنوان: ${helpers.escapeHtml(customer.address||'')}</div><div style="margin-block:12px"><strong>الرصيد الحالي:</strong> ${helpers.formatCurrency(customer.balance||0, state.analytics.currency)}</div><table><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الملاحظة</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
            w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
        } catch (e) { console.error('print statement',e); helpers.showToast('خطأ في تجهيز الطباعة','error'); }
    }

    function renderPanel() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-customers-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="store-card">
                <h3><i class="fas fa-users"></i> بيانات العملاء</h3>
                <div class="catalog-toolbar">
                    <div class="toolbar-group">
                        <input type="text" id="customerSearchInput" placeholder="ابحث بالاسم أو الهاتف أو البريد" value="${helpers.escapeHtml(state.customerSearch||'')}">
                    </div>
                    <div class="toolbar-group">
                        <button class="btn btn-primary btn-sm" id="addCustomerBtn"><i class="fas fa-user-plus"></i> إنشاء عميل جديد</button>
                        <button class="btn btn-secondary btn-sm" id="refreshCustomersBtn"><i class="fas fa-sync"></i> تحديث</button>
                    </div>
                </div>
                <div id="customersList"><div class="store-loading"><div class="loader"></div><p>تحميل قائمة العملاء...</p></div></div>
            </div>
        `;

        bindCustomersPanel();
        loadCustomers(state.customerSearch||'', state.customerPage||1);
    }

    module.init = function(ctx) {
        if (module._inited) return module;
        module.ctx = ctx || {};
        // ensure helpers: handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS
        module._inited = true;
        return module;
    };

    module.renderPanel = renderPanel;
    module.loadCustomers = loadCustomers;
    module.openCustomerModal = openCustomerModal;
    module._loaded = true;

    window.storeDashboard.customers = module;
})();
