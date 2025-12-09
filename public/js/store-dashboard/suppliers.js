(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.suppliers) return; // already loaded

    const module = {
        _loaded: true,
        _inited: false,
        ctx: null,
    };

    function renderSuppliersTable(suppliers, total, page, pageSize, helpers) {
        if (!suppliers.length) return '<p>لا يوجد موردين بعد.</p>';
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الهاتف</th>
                            <th>الرصيد</th>
                            <th>إجمالي المشتريات</th>
                            <th>إجمالي المدفوع</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${suppliers.map(c => `
                            <tr data-id="${c._id}">
                                <td>${helpers.escapeHtml(c.name || '-')}</td>
                                <td>${helpers.escapeHtml(c.phone)}</td>
                                <td>${helpers.formatCurrency(c.balance || 0, c.currency || 'EGP')}</td>
                                <td>${helpers.formatCurrency(c.totalPurchases || 0, c.currency || 'EGP')}</td>
                                <td>${helpers.formatCurrency(c.totalPaid || 0, c.currency || 'EGP')}</td>
                                <td class="table-actions">
                                    <button class="btn btn-secondary btn-sm" data-action="view-supplier"><i class="fas fa-eye"></i></button>
                                    <button class="btn btn-primary btn-sm" data-action="edit-supplier"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-danger btn-sm" data-action="delete-supplier"><i class="fas fa-trash"></i></button>
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

    async function loadSuppliers(search = '', page = 1) {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        state.supplierSearch = search;
        state.supplierPage = page;
        const list = document.getElementById('suppliersList');
        if (!list) return;
        list.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const url = `/api/suppliers/${state.store._id}/suppliers?search=${encodeURIComponent(search||'')}&page=${page}&limit=${state.supplierPageSize || 20}`;
            const data = await helpers.handleApiRequest(url, { headers }, null, 'فشل في جلب الموردين');
            list.innerHTML = renderSuppliersTable(data.suppliers || [], data.total || 0, page, state.supplierPageSize || 20, helpers);
            bindSuppliersList();
        } catch (err) {
            list.innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر تحميل الموردين')}</p>`;
        }
    }

    function bindSuppliersPanel() {
        const helpers = module.ctx.helpers;
        const searchInput = document.getElementById('supplierSearchInput');
        const refreshBtn = document.getElementById('refreshSuppliersBtn');
        const addBtn = document.getElementById('addSupplierBtn');
        searchInput?.addEventListener('input', helpers.debounce((e) => {
            loadSuppliers(e.target.value.trim(), 1);
        }, 350));
        refreshBtn?.addEventListener('click', () => loadSuppliers(searchInput?.value?.trim()||'', 1));
        addBtn?.addEventListener('click', () => openSupplierModal());
    }

    function bindSuppliersList() {
        const list = document.getElementById('suppliersList');
        if (!list) return;
        list.querySelectorAll('.pagination-controls button[data-page]')?.forEach(btn => {
            btn.addEventListener('click', () => {
                const search = document.getElementById('supplierSearchInput')?.value?.trim() || '';
                const page = Number(btn.getAttribute('data-page'));
                if (page > 0) loadSuppliers(search, page);
            });
        });
        list.querySelectorAll('button[data-action="view-supplier"]')?.forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('tr');
                const id = row?.getAttribute('data-id');
                if (!id) return;
                await openSupplierModal(id);
            });
        });
        list.querySelectorAll('button[data-action="edit-supplier"]')?.forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('tr');
                const id = row?.getAttribute('data-id');
                if (!id) return;
                await openSupplierModal(id, { edit: true });
            });
        });
        list.querySelectorAll('button[data-action="delete-supplier"]')?.forEach(btn => {
            btn.addEventListener('click', async () => {
                const row = btn.closest('tr');
                const id = row?.getAttribute('data-id');
                if (!id) return;
                if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
                const state = module.ctx.state; const helpers = module.ctx.helpers;
                try {
                    await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } }, null, 'فشل في حذف المورد');
                    helpers.showToast('تم حذف المورد', 'success');
                    await loadSuppliers(state.supplierSearch||'', state.supplierPage||1);
                } catch (err) {
                    helpers.showToast(err.message || 'تعذر حذف المورد', 'error');
                }
            });
        });
    }

    async function openSupplierModal(supplierId, opts = {}) {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const overlay = document.createElement('div');
        overlay.className = 'store-modal';
        overlay.innerHTML = `
            <div class="store-modal-content" dir="rtl">
                <button class="modal-close" type="button"><i class="fas fa-times"></i></button>
                <h3>ملف المورد</h3>
                <div style="display:flex;gap:8px;align-items:center;margin-block:8px;">
                    <button class="btn btn-primary btn-sm" id="saveSupplierBtn" style="display:none">حفظ</button>
                    <button class="btn btn-outline btn-sm" id="startEditBtn">تحرير</button>
                    ${supplierId ? `<button class="btn btn-secondary btn-sm" id="printStatementBtn">طباعة كشف المورد</button>` : ''}
                </div>
                <div id="supplierDetails" style="min-inline-size:300px;min-block-size:120px;"></div>
            </div>`;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));
        const close = () => { overlay.classList.remove('visible'); setTimeout(()=>overlay.remove(),200); };
        overlay.querySelector('.modal-close')?.addEventListener('click', close);
        overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });

        const box = overlay.querySelector('#supplierDetails');
        box.innerHTML = `
            <div id="supplierForm" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-block:6px;">
                <div><label>الاسم</label><input id="s_name" type="text"></div>
                <div><label>الهاتف</label><input id="s_phone" type="text"></div>
                <div><label>البريد</label><input id="s_email" type="email"></div>
                <div><label>العنوان</label><input id="s_address" type="text"></div>
                <div style="grid-column:1/-1"><label>ملاحظات</label><textarea id="s_notes" rows="2"></textarea></div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;margin-block:10px;">
                <div style="flex:1"><strong>الرصيد الحالي:</strong> <span id="s_balance">0</span></div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <select id="tx_type"><option value="purchase">فاتورة مشتريات (دين)</option><option value="payment">سداد</option></select>
                    <input id="tx_amount" type="number" placeholder="المبلغ" style="inline-size:140px">
                    <button class="btn btn-primary btn-sm" id="addTxBtn">سجل معاملة</button>
                </div>
            </div>
            <div id="supplierTxList"><div class="store-loading"><div class="loader"></div><p>تحميل...</p></div></div>
        `;

        const saveBtn = overlay.querySelector('#saveSupplierBtn');
        const startEditBtn = overlay.querySelector('#startEditBtn');
        const printBtn = overlay.querySelector('#printStatementBtn');
        const nameInput = overlay.querySelector('#s_name');
        const phoneInput = overlay.querySelector('#s_phone');
        const emailInput = overlay.querySelector('#s_email');
        const addressInput = overlay.querySelector('#s_address');
        const notesInput = overlay.querySelector('#s_notes');
        const balanceEl = overlay.querySelector('#s_balance');
        const addTxBtn = overlay.querySelector('#addTxBtn');

        const isEditMode = !!opts.edit;

        if (supplierId) {
            try {
                const headers = { Authorization: `Bearer ${state.token}` };
                const data = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}`, { headers }, null, 'فشل في جلب ملف المورد');
                const { supplier } = data;
                nameInput.value = supplier.name || '';
                phoneInput.value = supplier.phone || '';
                emailInput.value = supplier.email || '';
                addressInput.value = supplier.address || '';
                notesInput.value = supplier.notes || '';
                balanceEl.innerText = helpers.formatCurrency(supplier.balance || 0, supplier.currency || state.analytics.currency);
                await loadSupplierTransactions(supplierId, overlay);
            } catch (err) {
                overlay.querySelector('#supplierDetails').innerHTML = `<p class="error">${helpers.escapeHtml(err.message || 'تعذر تحميل ملف المورد')}</p>`;
            }
        }

        const setEditMode = (on) => {
            if (on) {
                saveBtn.style.display = '';
                startEditBtn.style.display = 'none';
                nameInput.removeAttribute('readonly');
                emailInput.removeAttribute('readonly');
                addressInput.removeAttribute('readonly');
                notesInput.removeAttribute('readonly');
                if (!supplierId) phoneInput.removeAttribute('readonly');
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
                if (supplierId) {
                    await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}`, { method: 'PUT', headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, null, 'فشل في تحديث المورد');
                    helpers.showToast('تم تحديث بيانات المورد', 'success');
                } else {
                    await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers`, { method: 'POST', headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, null, 'فشل في إنشاء المورد');
                    helpers.showToast('تم إنشاء المورد', 'success');
                }
                closeOverlay(overlay);
                await loadSuppliers(state.supplierSearch||'', state.supplierPage||1);
            } catch (err) {
                helpers.showToast(err.message || 'تعذر حفظ المورد', 'error');
            }
        });

        startEditBtn?.addEventListener('click', () => {
            setEditMode(true);
        });

        addTxBtn?.addEventListener('click', async () => {
            const type = overlay.querySelector('#tx_type').value;
            const amount = Number(overlay.querySelector('#tx_amount').value || 0);
            const note = '';
            if (!supplierId) return helpers.showToast('سجّل المورد أولاً ثم أضف المعاملة', 'info');
            if (!amount || amount <= 0) return helpers.showToast('أدخل مبلغ صالح', 'info');
            try {
                const payload = { amount, type, note };
                const res = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}/transactions`, { method: 'POST', headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, null, 'فشل في تسجيل المعاملة');
                helpers.showToast('تم تسجيل المعاملة', 'success');
                balanceEl.innerText = helpers.formatCurrency(res.balance || 0, state.analytics.currency);
                await loadSupplierTransactions(supplierId, overlay);
            } catch (err) {
                helpers.showToast(err.message || 'تعذر إضافة المعاملة', 'error');
            }
        });

        printBtn?.addEventListener('click', async () => {
            if (!supplierId) return;
            try {
                const headers = { Authorization: `Bearer ${state.token}` };
                const res = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}/statement`, { headers }, null, 'فشل في جلب كشف المورد');
                openPrintSupplierStatement(res.supplier, res.transactions, res.invoices, state, helpers);
            } catch (err) {
                helpers.showToast(err.message || 'تعذر جلب كشف المورد للطباعة', 'error');
            }
        });

        if (supplierId) phoneInput.setAttribute('readonly','readonly');
    }

    async function loadSupplierTransactions(supplierId, overlay) {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const container = overlay.querySelector('#supplierTxList');
        container.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل المعاملات...</p></div>';
        try {
            const headers = { Authorization: `Bearer ${state.token}` };
            const res = await helpers.handleApiRequest(`/api/suppliers/${state.store._id}/suppliers/${supplierId}/transactions`, { headers }, null, 'فشل في جلب المعاملات');
            const tx = res.transactions || [];
            container.innerHTML = `
                <div class="table-responsive">
                    <table class="store-table">
                        <thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الملاحظة</th></tr></thead>
                        <tbody>
                            ${tx.map(t => `<tr><td>${module.ctx.helpers.formatDate(t.createdAt)}</td><td>${module.ctx.helpers.escapeHtml(t.type)}</td><td>${module.ctx.helpers.formatCurrency(t.amount, state.analytics.currency)}</td><td>${module.ctx.helpers.escapeHtml(t.note||'')}</td></tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<p class="error">${module.ctx.helpers.escapeHtml(err.message || 'تعذر تحميل المعاملات')}</p>`;
        }
    }

    function openPrintSupplierStatement(supplier, transactions, invoices, state, helpers) {
        try {
            const w = window.open('', '_blank'); if (!w) return helpers.showToast('تعذر فتح نافذة الطباعة', 'error');
            const css = `body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}table{inline-size:100%;border-collapse:collapse}th,td{border:1px solid #eee;padding:8px;text-align:end}`;
            const txRows = (transactions||[]).map(t => `<tr><td>${helpers.formatDate(t.createdAt)}</td><td>${helpers.escapeHtml(t.type)}</td><td>${helpers.formatCurrency(t.amount, state.analytics.currency)}</td><td>${helpers.escapeHtml(t.note||'')}</td></tr>`).join('');
            const invRows = (invoices||[]).map(i => `<tr><td>${helpers.formatDate(i.createdAt)}</td><td>${helpers.escapeHtml(i.invoiceNumber||'')}</td><td>${helpers.formatCurrency(i.total, state.analytics.currency)}</td><td>${helpers.formatCurrency(i.paid, state.analytics.currency)}</td></tr>`).join('');
            const html = `<!doctype html><html><head><meta charset="utf-8"><title>كشف مورد ${helpers.escapeHtml(supplier.name||'')}</title><style>${css}</style></head><body><h2>كشف مورد: ${helpers.escapeHtml(supplier.name||'')}</h2><div>الهاتف: ${helpers.escapeHtml(supplier.phone||'')}</div><div>العنوان: ${helpers.escapeHtml(supplier.address||'')}</div><div style="margin-block:12px"><strong>الرصيد الحالي:</strong> ${helpers.formatCurrency(supplier.balance||0, state.analytics.currency)}</div><h3>المعاملات</h3><table><thead><tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الملاحظة</th></tr></thead><tbody>${txRows}</tbody></table><h3>فواتير المشتريات</h3><table><thead><tr><th>التاريخ</th><th>رقم الفاتورة</th><th>الإجمالي</th><th>المدفوع</th></tr></thead><tbody>${invRows}</tbody></table></body></html>`;
            w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
        } catch (e) { console.error('print supplier',e); module.ctx.helpers.showToast('خطأ في تجهيز الطباعة','error'); }
    }

    function renderPanel() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-suppliers-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="store-card">
                <h3><i class="fas fa-truck"></i> إدارة الموردين</h3>
                <div class="catalog-toolbar">
                    <div class="toolbar-group">
                        <input type="text" id="supplierSearchInput" placeholder="ابحث بالاسم أو الهاتف أو البريد" value="${helpers.escapeHtml(state.supplierSearch||'')}">
                    </div>
                    <div class="toolbar-group">
                        <button class="btn btn-secondary btn-sm" id="refreshSuppliersBtn"><i class="fas fa-sync"></i> تحديث</button>
                        <button class="btn btn-primary btn-sm" id="addSupplierBtn"><i class="fas fa-plus"></i> إضافة مورد</button>
                    </div>
                </div>
                <div id="suppliersList"><div class="store-loading"><div class="loader"></div><p>تحميل قائمة الموردين...</p></div></div>
            </div>
        `;

        bindSuppliersPanel();
        loadSuppliers(state.supplierSearch||'', state.supplierPage||1);
    }

    function closeOverlay(overlay) { overlay.classList.remove('visible'); setTimeout(()=>overlay.remove(),200); }

    module.init = function(ctx) {
        if (module._inited) return module;
        module.ctx = ctx || {};
        module._inited = true;
        return module;
    };

    module.renderPanel = renderPanel;
    module.loadSuppliers = loadSuppliers;
    module.openSupplierModal = openSupplierModal;
    module._loaded = true;

    window.storeDashboard.suppliers = module;
})();
