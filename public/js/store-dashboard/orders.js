(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.orders) return;

    const module = {
        _loaded: true,
        _inited: false,
        ctx: null,
    };

    // Map order statuses to colors
    const STATUS_COLORS = {
        pending: '#f59e0b', // amber
        processing: '#3b82f6', // blue
        confirmed: '#2563eb',
        accepted: '#2563eb',
        shipped: '#06b6d4', // cyan
        delivered: '#10b981', // green
        completed: '#10b981',
        cancelled: '#ef4444', // red
        refunded: '#8b5cf6', // purple
    };

    function hexToRgba(hex, alpha = 1) {
        if (!hex) return `rgba(0,0,0,${alpha})`;
        const cleaned = hex.replace('#', '');
        const bigint = parseInt(cleaned, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function getTextColorForHex(hex) {
        if (!hex) return '#fff';
        const cleaned = hex.replace('#', '');
        const bigint = parseInt(cleaned, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;
        // Perceived luminance
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return lum > 160 ? '#111' : '#fff';
    }

    function getStatusStyles(status) {
        const key = String(status || '').toLowerCase();
        const hex = STATUS_COLORS[key] || '#6b7280';
        return {
            hex,
            border: hexToRgba(hex, 0.14),
            glow: `0 6px 24px ${hexToRgba(hex, 0.12)}`,
            tint: hexToRgba(hex, 0.04),
            text: getTextColorForHex(hex),
        };
    }

    function renderOrderCard(order, state, helpers) {
        const total = helpers.formatCurrency(order.totalPrice, state.analytics.currency);
        const statusLabel = (helpers.STATUS_LABELS && helpers.STATUS_LABELS[order.status]) || order.status;
        const items = Array.isArray(order.products)
            ? order.products.map((item) => {
                const name = helpers.escapeHtml(resolveProductName(item.productId, state));
                const opts = Array.isArray(item.selectedOptions) && item.selectedOptions.length
                    ? `<div class="order-item-opts">${item.selectedOptions.map(o => `${helpers.escapeHtml(o.name)}: ${helpers.escapeHtml(o.value)}`).join(' ، ')}</div>`
                    : '';
                return `<li>
                    <div>
                        <span>${item.quantity} × ${name}</span>
                        ${opts}
                    </div>
                    <span>${helpers.formatCurrency(item.price, state.analytics.currency)}</span>
                </li>`;
            }).join('')
            : '<li>لا توجد بيانات منتجات</li>';
        const history = Array.isArray(order.history) ? order.history : [];
        const _styles = getStatusStyles(order.status);

        // Render a compact card with border-only styling. Responsive: cards flow side-by-side.
        return `
            <div class="order-card" data-id="${order._id}" style="flex:1 1 300px;max-inline-size:360px;margin:12px;border:1px solid ${_styles.border};border-radius:10px;background:${_styles.tint};box-shadow:${_styles.glow};overflow:hidden;display:flex;flex-direction:column;transition:box-shadow .25s,border-color .25s,transform .12s;">
                <div class="order-card-header" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-block-end:1px solid rgba(255,255,255,0.04);background:transparent;">
                    <div>
                        <h4 style="margin:0;font-size:1.05rem;">#${helpers.escapeHtml(String(order._id).slice(-6))}</h4>
                        <p style="margin:2px 0 0;color:#6b7280;font-size:.9rem;">${helpers.formatDate(order.createdAt)}</p>
                    </div>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <button class="btn btn-secondary btn-sm" data-action="print-order" data-id="${order._id}" title="طباعة الطلب"><i class="fas fa-print"></i></button>
                        <div style="display:flex;flex-direction:column;align-items:flex-end;">
                            <select data-action="change-status" data-id="${order._id}" style="margin-block-end:6px;">
                                ${Object.entries(helpers.STATUS_LABELS || {}).map(([value, label]) => `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`).join('')}
                            </select>
                            <span class="status-badge status-${order.status}" style="font-size:.85rem;padding:6px 8px;border-radius:6px;background:${_styles.hex};color:${_styles.text};">${statusLabel}</span>
                        </div>
                    </div>
                </div>
                <div class="order-card-body" style="display:flex;gap:12px;padding:12px;">
                    <div style="flex:1;">
                        <p style="margin:0 0 6px;"><strong>إجمالي الطلب:</strong> ${total}</p>
                        <p style="margin:0 0 6px;"><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'whatsapp_confirmation' ? 'التواصل عبر واتساب' : 'الدفع عند الاستلام'}</p>
                        ${order.customerName ? `<p style="margin:0 0 6px;"><strong>العميل:</strong> ${helpers.escapeHtml(order.customerName)}</p>` : ''}
                        ${order.customerWhatsapp ? `<p style="margin:0 0 6px;"><strong>واتساب:</strong> ${helpers.escapeHtml(order.customerWhatsapp)}</p>` : ''}
                        ${order.customerAddress ? `<p style="margin:0 0 6px;"><strong>العنوان:</strong> ${helpers.escapeHtml(order.customerAddress)}</p>` : ''}
                    </div>
                    <div style="inline-size:160px;">
                        <h5 style="margin:0 0 6px;font-size:1rem;">المنتجات</h5>
                        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">
                            ${Array.isArray(order.products) ? order.products.slice(0,4).map(it => `
                                <li style="display:flex;gap:8px;align-items:center;">
                                    ${it.imageUrl ? `<img src="${helpers.escapeHtml(it.imageUrl)}" style="inline-size:48px;block-size:48px;object-fit:cover;border-radius:6px;">` : `<div style="inline-size:48px;block-size:48px;background:#f3f4f6;border-radius:6px;"></div>`}
                                    <div style="flex:1;min-inline-size:0;">
                                        <div style="font-size:.95rem;font-weight:600;">${helpers.escapeHtml(resolveProductName(it.productId, state))}</div>
                                        <div style="color:#6b7280;font-size:.85rem;">${it.quantity} × ${helpers.formatCurrency(it.price, state.analytics.currency)}</div>
                                        ${Array.isArray(it.selectedOptions) && it.selectedOptions.length ? `<div style="font-size:.78rem;color:#4b5563;margin-block-start:4px;">${it.selectedOptions.map(o => `${helpers.escapeHtml(o.name)}: ${helpers.escapeHtml(o.value)}`).join(' ، ')}</div>` : ''}
                                    </div>
                                </li>
                            `).join('') : '<li>لا توجد منتجات</li>'}
                        </ul>
                    </div>
                </div>
                <details class="order-history" style="padding:12px;border-block-start:1px solid rgba(255,255,255,0.04);background:transparent;">
                    <summary style="cursor:pointer;"><i class="fas fa-history"></i> سجل التغييرات</summary>
                    <ul style="margin-block-start:8px;">
                        ${history.length ? history.map((entry) => `<li style="display:flex;gap:12px;align-items:center;padding:6px 0;border-block-end:1px solid #f1f5f9;"><span style="color:#6b7280;font-size:.85rem;">${helpers.formatDate(entry.changedAt)}</span><span style="font-weight:600;">${(helpers.STATUS_LABELS && helpers.STATUS_LABELS[entry.status]) || entry.status}</span><span style="color:#374151;">${helpers.escapeHtml(entry.note || '')}</span></li>`).join('') : '<li>لا يوجد تغييرات مسجلة.</li>'}
                    </ul>
                </details>
            </div>
        `;
    }

    function resolveProductName(productId, state) {
        if (!productId) return 'منتج غير معروف';
        const fromCatalog = (state.catalogSnapshot || []).find((product) => String(product._id) === String(productId));
        if (fromCatalog) return fromCatalog.productName;
        const fromPage = (state.products || []).find((product) => String(product._id) === String(productId));
        return fromPage ? fromPage.productName : 'منتج غير معروف';
    }

    function bindOrdersPanel() {
        const panel = document.getElementById('store-orders-panel');
        if (!panel) return;
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        // click handler for print buttons etc.
        panel.addEventListener('click', async (event) => {
            const btn = event.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const orderId = btn.getAttribute('data-id');
            if (action === 'print-order') {
                const order = (state.orders || []).find(o => String(o._id) === String(orderId));
                if (!order) return helpers.showToast('الطلب غير موجود للطباعة', 'error');
                printOrder(order, state, helpers);
            }
        });

        panel.addEventListener('change', async (event) => {
            const select = event.target.closest('select[data-action="change-status"]');
            if (!select) return;
            const orderId = select.dataset.id;
            const status = select.value;
            try {
                await helpers.handleApiRequest(`/api/orders/${state.store._id}/orders/${orderId}`, {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status }),
                }, null, 'فشل في تحديث الطلب');
                helpers.showToast('تم تحديث حالة الطلب', 'success');
                if (typeof helpers.refreshDashboard === 'function') {
                    await helpers.refreshDashboard();
                }
            } catch (err) {
                helpers.showToast(err.message || 'تعذر تحديث حالة الطلب', 'error');
            }
        });

        document.getElementById('refreshOrdersBtn')?.addEventListener('click', async () => {
            if (typeof module.ctx.helpers.refreshDashboard === 'function') {
                await module.ctx.helpers.refreshDashboard();
            }
        });

        document.getElementById('exportOrdersCsv')?.addEventListener('click', () => {
            if (typeof module.exportOrdersToCsv === 'function') module.exportOrdersToCsv();
        });
    }

    function renderPanel() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-orders-panel');
        if (!panel) return;

        if (!Array.isArray(state.orders) || !state.orders.length) {
            panel.innerHTML = '<div class="store-card"><p>لا توجد طلبات حالياً.</p></div>';
            return;
        }

        panel.innerHTML = `
            <div class="store-card" style="background:transparent;border:0;padding:0;margin:0;">
                <div class="orders-toolbar" style="padding:8px 0 12px;display:flex;gap:8px;align-items:center;">
                    <button class="btn btn-secondary btn-sm" id="refreshOrdersBtn"><i class="fas fa-sync"></i> تحديث</button>
                    <button class="btn btn-primary btn-sm" id="exportOrdersCsv"><i class="fas fa-file-export"></i> تصدير CSV</button>
                </div>
                <div class="orders-list" style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:flex-start;">
                    ${state.orders.map((order) => renderOrderCard(order, state, helpers)).join('')}
                </div>
            </div>
        `;

        bindOrdersPanel();
    }

    function exportOrdersToCsv() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        if (!Array.isArray(state.orders) || !state.orders.length) {
            helpers.showToast('لا توجد طلبات للتصدير', 'info');
            return;
        }
        const headers = ['Order ID', 'Status', 'Total', 'Payment Method', 'Created At'];
        const rows = state.orders.map((order) => [
            order._id,
            (helpers.STATUS_LABELS && helpers.STATUS_LABELS[order.status]) || order.status,
            Number(order.totalPrice) || 0,
            order.paymentMethod,
            helpers.formatDate(order.createdAt),
        ]);
        if (typeof helpers.downloadCsv === 'function') {
            helpers.downloadCsv('orders.csv', [headers, ...rows]);
        }
    }

        // Print an order in a printer-friendly window
        function printOrder(order, state, helpers) {
                try {
                        const w = window.open('', '_blank');
                        if (!w) return helpers.showToast('تعذر فتح نافذة الطباعة (افتح السماح بالنوافذ المنبثقة)', 'error');
                        const css = `
                            body{font-family:Arial, Helvetica, sans-serif;padding:20px;color:#111}
                            .header{display:flex;justify-content:space-between;align-items:center;margin-block-end:18px}
                            h1{font-size:18px;margin:0}
                            table{inline-size:100%;border-collapse:collapse;margin-block-start:12px}
                            th,td{border:1px solid #e5e7eb;padding:8px;text-align:end}
                            .small{font-size:13px;color:#374151}
                            .tot{font-weight:700}
                            img{inline-size:72px;block-size:72px;object-fit:cover;border-radius:6px}
                        `;

                        const itemsHtml = (Array.isArray(order.products) ? order.products : []).map(p => `
                                <tr>
                                    <td style="inline-size:80px">${p.imageUrl ? `<img src="${helpers.escapeHtml(p.imageUrl)}">` : ''}</td>
                                    <td>
                                        ${helpers.escapeHtml(resolveProductName(p.productId, state))}
                                        ${Array.isArray(p.selectedOptions) && p.selectedOptions.length ? `<div style="font-size:12px;color:#374151;margin-block-start:6px">${p.selectedOptions.map(o => `${helpers.escapeHtml(o.name)}: ${helpers.escapeHtml(o.value)}`).join(' ، ')}</div>` : ''}
                                    </td>
                                    <td style="inline-size:80px;text-align:center">${p.quantity}</td>
                                    <td style="inline-size:120px;text-align:start">${helpers.formatCurrency(p.price, state.analytics.currency)}</td>
                                </tr>
                        `).join('');

                        const historyHtml = (Array.isArray(order.history) ? order.history : []).map(h => `<div class="small">${helpers.formatDate(h.changedAt)} - ${(helpers.STATUS_LABELS && helpers.STATUS_LABELS[h.status]) || h.status} ${helpers.escapeHtml(h.note || '')}</div>`).join('');

                        const html = `
                                <!doctype html>
                                <html>
                                <head>
                                    <meta charset="utf-8">
                                    <title>طباعة الطلب #${helpers.escapeHtml(String(order._id).slice(-6))}</title>
                                    <style>${css}</style>
                                </head>
                                <body>
                                    <div class="header">
                                        <div>
                                            <h1>طلب رقم #${helpers.escapeHtml(String(order._id))}</h1>
                                            <div class="small">تاريخ: ${helpers.formatDate(order.createdAt)}</div>
                                        </div>
                                        <div style="text-align:start">
                                            <div class="small">المتجر: ${helpers.escapeHtml(state.store?.name || '')}</div>
                                            <div class="small">المجموع: <span class="tot">${helpers.formatCurrency(order.totalPrice, state.analytics.currency)}</span></div>
                                        </div>
                                    </div>
                                    <div>
                                        <strong>معلومات العميل</strong>
                                        <div class="small">${helpers.escapeHtml(order.customerName || '')} - ${helpers.escapeHtml(order.customerWhatsapp || '')}</div>
                                        <div class="small">${helpers.escapeHtml(order.customerAddress || '')}</div>
                                        ${order.customerNote ? `<div class="small">ملاحظة: ${helpers.escapeHtml(order.customerNote)}</div>` : ''}
                                    </div>
                                    <table>
                                        <thead><tr><th>صورة</th><th>المنتج</th><th>كمية</th><th>السعر</th></tr></thead>
                                        <tbody>
                                            ${itemsHtml}
                                        </tbody>
                                    </table>
                                    <div style="margin-block-start:12px">${historyHtml}</div>
                                </body>
                                </html>
                        `;

                        w.document.open();
                        w.document.write(html);
                        w.document.close();
                        w.focus();
                        // Give the browser a moment to render images
                        setTimeout(() => { w.print(); /* optionally w.close(); */ }, 600);
                } catch (e) {
                        console.error('printOrder error', e);
                        helpers.showToast('حصل خطأ أثناء تجهيز الطباعة', 'error');
                }
        }

    module.init = function(ctx) {
        if (module._inited) return module;
        module.ctx = ctx || {};
        module._inited = true;
        return module;
    };

    module.renderPanel = renderPanel;
    module.exportOrdersToCsv = exportOrdersToCsv;

    window.storeDashboard.orders = module;
})();
