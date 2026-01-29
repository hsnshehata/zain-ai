(function(){
  window.storeDashboard = window.storeDashboard || {};
  if (window.storeDashboard.chatCustomers) return;

  const module = { _loaded: true, _inited: false, ctx: null };

  const CHANNEL_COLORS = {
    facebook: '#1877F2',
    instagram: '#C13584',
    whatsapp: '#25D366',
    web: '#0ea5e9'
  };

  function badge(text, color){
    return `<span style="display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700;background:${color||'#6b7280'};color:#fff;">${text}</span>`;
  }

  function channelBadge(channel){
    const map = {
      facebook: { label: 'Facebook', color: CHANNEL_COLORS.facebook },
      instagram: { label: 'Instagram', color: CHANNEL_COLORS.instagram },
      whatsapp: { label: 'WhatsApp', color: CHANNEL_COLORS.whatsapp },
      web: { label: 'Web', color: CHANNEL_COLORS.web },
    };
    const cfg = map[channel] || { label: channel || 'قناة', color: '#6b7280' };
    return badge(cfg.label, cfg.color);
  }

  function renderCustomerCard(customer, helpers){
    const lastOrderAt = helpers.formatDate(customer.lastOrderAt || customer.updatedAt);
    const lastMessageAt = helpers.formatDate(customer.lastMessageAt || customer.updatedAt);
    const name = helpers.escapeHtml(customer.name || customer.sourceUsername || 'عميل');
    const phone = helpers.escapeHtml(customer.phone || '');
    const address = helpers.escapeHtml(customer.address || '');
    const convId = helpers.escapeHtml(customer.conversationId || '');
    const userId = helpers.escapeHtml(customer.sourceUserId || '');

    return `
      <div class="chat-customer-card" style="border:1px solid rgba(0,0,0,0.05);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,0.04);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <h4 style="margin:0;font-size:1rem;">${name}</h4>
            ${channelBadge(customer.channel)}
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" data-action="open-conversation" data-conv="${convId}" data-user="${userId}"><i class="fas fa-comments"></i> فتح المحادثة</button>
            ${phone ? `<button class="btn btn-outline btn-sm" data-action="copy-phone" data-phone="${phone}"><i class="fas fa-copy"></i> نسخ الهاتف</button>` : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">
          <div>
            <p style="margin:0 0 6px;"><strong>الهاتف:</strong> ${phone || '—'}</p>
            <p style="margin:0 0 6px;"><strong>العنوان:</strong> ${address || '—'}</p>
            <p style="margin:0 0 6px;"><strong>اسم المستخدم:</strong> ${helpers.escapeHtml(customer.sourceUsername || '—')}</p>
          </div>
          <div>
            <p style="margin:0 0 6px;"><strong>آخر طلب:</strong> ${lastOrderAt || '—'}</p>
            <p style="margin:0 0 6px;"><strong>آخر رسالة:</strong> ${lastMessageAt || '—'}</p>
            <p style="margin:0 0 6px;"><strong>معرف المحادثة:</strong> ${convId || '—'}</p>
          </div>
        </div>
      </div>
    `;
  }

  function renderPanel(){
    const panel = document.getElementById('chat-customers-panel');
    if (!panel) return;
    const state = module.ctx.state;
    const helpers = module.ctx.helpers;
    const customers = Array.isArray(state.chatCustomers) ? state.chatCustomers : [];

    panel.innerHTML = `
      <div class="store-card" style="margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px;"><i class="fas fa-user"></i> بيانات العملاء</h3>
          ${customers.length ? `<span style="color:#6b7280;">${customers.length} عميل</span>` : '<span style="color:#ef4444;">لا توجد بيانات بعد</span>'}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-secondary btn-sm" id="refreshChatCustomersBtn"><i class="fas fa-sync"></i> تحديث</button>
        </div>
      </div>
      <div class="chat-customers-list" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;">
        ${customers.length ? customers.map(c => renderCustomerCard(c, helpers)).join('') : '<div class="placeholder"><p>لا توجد بيانات عملاء من المحادثات حتى الآن.</p></div>'}
      </div>
    `;

    bindEvents(panel);
  }

  function bindEvents(panel){
    panel.querySelector('#refreshChatCustomersBtn')?.addEventListener('click', async () => {
      if (typeof module.ctx.helpers.refreshDashboard === 'function') {
        await module.ctx.helpers.refreshDashboard();
      }
    });

    panel.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'copy-phone') {
        const phone = btn.dataset.phone;
        if (phone && navigator.clipboard) {
          navigator.clipboard.writeText(phone).then(() => {
            module.ctx.helpers.showToast('تم نسخ الهاتف', 'success');
          }).catch(() => module.ctx.helpers.showToast('تعذر نسخ الهاتف', 'error'));
        }
      } else if (action === 'open-conversation') {
        const convId = btn.dataset.conv;
        const userId = btn.dataset.user;
        if (convId) {
          try {
            localStorage.setItem('openConversationId', convId);
            if (userId) localStorage.setItem('openConversationUserId', userId);
          } catch(_) {}
          const messagesNav = document.querySelector('.nav-item[data-page="messages"]');
          if (messagesNav) messagesNav.click();
          else window.location.hash = '#messages';
        }
      }
    });
  }

  module.init = function(ctx){
    if (module._inited) return module;
    module.ctx = ctx || {};
    module._inited = true;
    return module;
  };

  module.renderPanel = renderPanel;

  window.storeDashboard.chatCustomers = module;
})();
