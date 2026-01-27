(function(){
  window.storeDashboard = window.storeDashboard || {};
  if (window.storeDashboard.chatOrders) return;

  const module = { _loaded: true, _inited: false, ctx: null };

  const STATUS_COLORS = {
    pending: '#f59e0b',
    processing: '#3b82f6',
    confirmed: '#2563eb',
    shipped: '#06b6d4',
    delivered: '#10b981',
    cancelled: '#ef4444'
  };

  function badge(text, color){
    const bg = color || '#6b7280';
    const txt = '#fff';
    return `<span style="display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:600;background:${bg};color:${txt};">${text}</span>`;
  }

  function channelBadge(channel){
    const map = {
      facebook: { label: 'Facebook', color: '#1877F2' },
      instagram: { label: 'Instagram', color: '#C13584' },
      whatsapp: { label: 'WhatsApp', color: '#25D366' },
      web: { label: 'Web', color: '#0ea5e9' }
    };
    const cfg = map[channel] || { label: channel || 'قناة', color: '#6b7280' };
    return badge(cfg.label, cfg.color);
  }

  function getStatusStyles(status){
    const hex = STATUS_COLORS[status] || '#6b7280';
    return { hex, text: '#fff', tint: `rgba(${parseInt(hex.slice(1,3),16)}, ${parseInt(hex.slice(3,5),16)}, ${parseInt(hex.slice(5,7),16)}, 0.08)` };
  }

  function renderItems(items, helpers){
    if (!Array.isArray(items) || !items.length) return '<li>لا توجد عناصر محددة</li>';
    return items.map(it => `<li style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid #f1f5f9;">
      <div>
        <div style="font-weight:700;">${helpers.escapeHtml(it.title || 'بند')}</div>
        <div style="font-size:12px;color:#6b7280;">${helpers.escapeHtml(it.note || '')}</div>
      </div>
      <div style="text-align:end;">${Number(it.quantity)||1} × ${helpers.formatCurrency(it.price||0, it.currency||'EGP')}</div>
    </li>`).join('');
  }

  function renderHistory(history, helpers){
    if (!Array.isArray(history) || !history.length) return '<li>لا يوجد سجل تعديلات.</li>';
    return history.slice().reverse().map(h => `<li style="padding:6px 0;border-bottom:1px solid #f1f5f9;display:flex;gap:8px;align-items:center;">${badge((helpers.STATUS_LABELS&&helpers.STATUS_LABELS[h.status])||h.status||'-', STATUS_COLORS[h.status]||'#6b7280')}<span style="color:#6b7280;font-size:12px;">${helpers.formatDate(h.changedAt)}</span><span style="color:#374151;font-size:13px;">${helpers.escapeHtml(h.note||'')}</span></li>`).join('');
  }

  function renderOrderCard(order, state, helpers){
    const styles = getStatusStyles(order.status);
    const statusLabel = (helpers.STATUS_LABELS && helpers.STATUS_LABELS[order.status]) || order.status;
    const itemsHtml = renderItems(order.items, helpers);
    const historyHtml = renderHistory(order.history, helpers);
    return `
      <div class="chat-order-card" data-id="${order._id}" style="border:1px solid rgba(0,0,0,0.05);border-radius:10px;padding:12px;background:${styles.tint};box-shadow:0 4px 18px rgba(0,0,0,0.04);display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <h4 style="margin:0;font-size:1rem;">طلب محادثة #${String(order._id).slice(-6)}</h4>
              ${channelBadge(order.channel)}
              ${badge(statusLabel, styles.hex)}
            </div>
            <p style="margin:4px 0 0;color:#6b7280;font-size:0.9rem;">آخر تحديث: ${helpers.formatDate(order.updatedAt || order.lastModifiedAt || order.createdAt)}</p>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <select data-action="chat-change-status" data-id="${order._id}">
              ${Object.entries(helpers.STATUS_LABELS||{}).map(([value,label]) => `<option value="${value}" ${order.status===value?'selected':''}>${label}</option>`).join('')}
            </select>
            <button class="btn btn-secondary btn-sm" data-action="chat-add-note" data-id="${order._id}"><i class="fas fa-pen"></i> ملاحظة</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;">
          <div>
            <p style="margin:0 0 6px;"><strong>الاسم:</strong> ${helpers.escapeHtml(order.customerName||order.sourceUsername||'غير معروف')}</p>
            <p style="margin:0 0 6px;"><strong>الهاتف:</strong> ${helpers.escapeHtml(order.customerPhone||'')}</p>
            <p style="margin:0 0 6px;"><strong>العنوان:</strong> ${helpers.escapeHtml(order.customerAddress||'')}</p>
            <p style="margin:0 0 6px;"><strong>ملاحظة العميل:</strong> ${helpers.escapeHtml(order.customerNote||'')}</p>
            <p style="margin:0;"><strong>الوصف الحر:</strong> ${helpers.escapeHtml(order.freeText||'')}</p>
          </div>
          <div>
            <h5 style="margin:0 0 6px;">العناصر</h5>
            <ul style="list-style:none;padding:0;margin:0;">${itemsHtml}</ul>
          </div>
        </div>
        <details style="border-top:1px solid #e5e7eb;padding-top:8px;">
          <summary style="cursor:pointer;font-weight:600;"><i class="fas fa-history"></i> سجل التعديلات</summary>
          <ul style="list-style:none;padding:8px 0 0;margin:0;">${historyHtml}</ul>
        </details>
        <div style="display:flex;justify-content:flex-start;align-items:center;gap:8px;margin-top:4px;">
          <button data-action="chat-delete" data-id="${order._id}" title="حذف الطلب" style="border:none;background:transparent;color:#ef4444;cursor:pointer;padding:4px;display:flex;align-items:center;gap:6px;font-size:14px;">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    `;
  }

  function renderPanel(){
    const panel = document.getElementById('chat-orders-panel');
    if (!panel) return;
    const state = module.ctx.state;
    const helpers = module.ctx.helpers;
    const orders = Array.isArray(state.chatOrders) ? state.chatOrders : [];
    const pending = Number(state.chatOrdersCounts?.pending||0);

    panel.innerHTML = `
      <div class="store-card" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px;"><i class="fas fa-comments"></i> طلبات المحادثة</h3>
          ${pending>0 ? `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:#fef2f2;color:#b91c1c;font-weight:700;">${pending} طلب معلق</span>` : '<span style="color:#16a34a;">لا توجد طلبات معلقة</span>'}
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-secondary btn-sm" id="refreshChatOrdersBtn"><i class="fas fa-sync"></i> تحديث</button>
        </div>
      </div>
      <div class="chat-orders-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;">
        ${orders.length ? orders.map(o => renderOrderCard(o, state, helpers)).join('') : '<div class="placeholder"><p>لا توجد طلبات محادثة حالياً.</p></div>'}
      </div>
    `;

    bindEvents(panel);
  }

  function bindEvents(panel){
    panel.querySelector('#refreshChatOrdersBtn')?.addEventListener('click', async () => {
      if (typeof module.ctx.helpers.refreshDashboard === 'function') {
        await module.ctx.helpers.refreshDashboard();
      }
    });

    panel.addEventListener('change', async (e) => {
      const select = e.target.closest('select[data-action="chat-change-status"]');
      if (!select) return;
      const orderId = select.dataset.id;
      const status = select.value;
      await updateOrder(orderId, { status });
    });

    panel.addEventListener('click', async (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const orderId = btn.dataset.id;
      const action = btn.dataset.action;
      if (action === 'chat-add-note') {
        const note = prompt('أدخل ملاحظة للتعديل على الطلب:');
        if (note === null) return;
        await updateOrder(orderId, { note });
      } else if (action === 'chat-delete') {
        const confirmed = confirm('تنبيه: حذف الطلب سيحذف بيانات العميل المرتبطة به. يمكنك الإلغاء واختيار تحويل الحالة إلى ملغاة بدلاً من الحذف. هل تريد متابعة الحذف؟');
        if (!confirmed) {
          const cancelInstead = confirm('هل تريد تحويل حالة الطلب إلى ملغى بدلاً من حذفه؟');
          if (cancelInstead) {
            await updateOrder(orderId, { status: 'cancelled', note: 'تم الإلغاء بدلاً من الحذف' });
          }
          return;
        }
        await deleteOrder(orderId);
      }
    });
  }

  async function updateOrder(id, payload){
    const { state, helpers } = module.ctx;
    try {
      await helpers.handleApiRequest(`/api/chat-orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
        body: JSON.stringify(payload)
      }, null, 'فشل في تحديث طلب المحادثة');
      helpers.showToast('تم تحديث الطلب', 'success');
      if (typeof helpers.refreshDashboard === 'function') {
        await helpers.refreshDashboard();
      }
    } catch (err) {
      helpers.showToast(err.message || 'تعذر تحديث الطلب', 'error');
    }
  }

  async function deleteOrder(id){
    const { state, helpers } = module.ctx;
    try {
      await helpers.handleApiRequest(`/api/chat-orders/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${state.token}` }
      }, null, 'فشل في حذف طلب المحادثة');
      helpers.showToast('تم حذف الطلب', 'success');
      if (typeof helpers.refreshDashboard === 'function') {
        await helpers.refreshDashboard();
      }
    } catch (err) {
      helpers.showToast(err.message || 'تعذر حذف الطلب', 'error');
    }
  }

  module.init = function(ctx){
    if (module._inited) return module;
    module.ctx = ctx || {};
    module._inited = true;
    return module;
  };

  module.renderPanel = renderPanel;

  window.storeDashboard.chatOrders = module;
})();
