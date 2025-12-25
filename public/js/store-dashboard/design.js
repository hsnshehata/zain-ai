(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.design) return; // already loaded

    const module = {
        _loaded: true,
        _inited: false,
        ctx: null,
    };

    function escapeHtml(value = '') {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        })[char] || char);
    }

    function renderPanel() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-design-panel');
        if (!panel) return;

        const layouts = [
            { id: 'layout1', name: 'كلاسيكي', description: 'واجهة بسيطة ثابتة بدون حركات، أبيض + اللون الأساسي.' },
            { id: 'layout2', name: 'مودرن', description: 'شريط علوي كبسولات وعناصر حديثة، بدون أي بنرات متحركة.' },
            { id: 'layout3', name: 'خيال', description: 'بطل (Hero) ثابت بخلفية متدرجة و CTA،  سلايدر متحركة.' },
        ];

        panel.innerHTML = `
            <div class="store-card">
                <h3><i class="fas fa-palette"></i> ألوان الهوية</h3>
                <div class="color-picker-grid">
                    <div class="form-group">
                        <label for="primaryColorInput">اللون الأساسي</label>
                        <input type="color" id="primaryColorInput" value="${state.store.primaryColor || '#00C4B4'}">
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" id="saveColorsBtn"><i class="fas fa-save"></i> حفظ الألوان</button>
                </div>
            </div>

            <div class="store-card">
                <h3><i class="fas fa-layer-group"></i> نماذج تخطيط صفحة المتجر</h3>
                <div class="template-grid">
                    ${layouts.map((layout) => `
                        <div class="template-card ${state.store.adminConfig?.landingLayout === layout.id ? 'active' : ''}" data-layout="${layout.id}">
                            <div class="template-legend">
                                <strong>${layout.name}</strong>
                                <p style="margin:.25rem 0 0;color:#475569;font-size:.9em;">${layout.description}</p>
                            </div>
                            <div class="template-actions" style="display:flex;gap:8px;flex-wrap:wrap;">
                                <button class="btn btn-secondary btn-sm select-layout-btn" data-layout="${layout.id}"><i class="fas fa-check"></i> اختيار هذا النموذج</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>


            <div class="store-card">
                <h3><i class="fas fa-image"></i> البنر الإعلاني أسفل الهيدر</h3>
                <div class="form-grid-two">
                    <div class="form-group">
                        <label class="toggle"><input type="checkbox" id="bannerEnabled" ${state.store.adminConfig?.banner?.enabled ? 'checked' : ''}> <span>تفعيل البنر</span></label>
                    </div>
                    <div class="form-group">
                        <label>صورة البنر</label>
                        <input type="file" id="bannerImageInput" accept="image/*">
                        <small class="input-hint">المقاس الأنسب للبنر: 1088 × 410 بكسل.</small>
                        <div style="margin-block-start:8px;">
                            <img id="bannerPreviewImg" src="${state.store.adminConfig?.banner?.imageUrl || ''}" alt="Banner" style="max-inline-size:100%;border-radius:12px;${state.store.adminConfig?.banner?.imageUrl ? '' : 'display:none;'}">
                        </div>
                    </div>
                </div>
                <div class="form-grid-two">
                    <div class="form-group">
                        <label for="bannerLinkType">نوع الرابط</label>
                        <select id="bannerLinkType">
                            <option value="none" ${state.store.adminConfig?.banner?.linkType==='none'?'selected':''}>بدون</option>
                            <option value="external" ${state.store.adminConfig?.banner?.linkType==='external'?'selected':''}>رابط خارجي</option>
                            <option value="product" ${state.store.adminConfig?.banner?.linkType==='product'?'selected':''}>منتج</option>
                        </select>
                    </div>
                    <div class="form-group" id="bannerExternalGroup" style="${state.store.adminConfig?.banner?.linkType==='external'?'':'display:none;'}">
                        <label for="bannerExternalUrl">الرابط الخارجي</label>
                        <input type="url" id="bannerExternalUrl" placeholder="https://example.com" value="${state.store.adminConfig?.banner?.externalUrl || ''}">
                    </div>
                    <div class="form-group" id="bannerProductGroup" style="${state.store.adminConfig?.banner?.linkType==='product'?'':'display:none;'}">
                        <label for="bannerProductId">اختر المنتج</label>
                        <select id="bannerProductId">
                            <option value="">— اختر —</option>
                            ${(state.catalogSnapshot||[]).map(p=>`<option value="${p._id}" ${String(state.store.adminConfig?.banner?.productId||'')===String(p._id)?'selected':''}>${escapeHtml(p.productName)}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn btn-primary" id="saveBannerBtn"><i class="fas fa-save"></i> حفظ إعدادات البنر</button>
                </div>
            </div>

            <div class="store-card">
                <h3><i class="fas fa-link"></i> زر (قسم) برابط خارجي</h3>
                <div class="form-grid-two">
                    <div class="form-group"><label class="toggle"><input type="checkbox" id="extraSectionEnabled" ${state.store.adminConfig?.extraSection?.enabled?'checked':''}> <span>تفعيل الزر</span></label></div>
                    <div class="form-group"><label for="extraSectionLabel">عنوان الزر</label><input type="text" id="extraSectionLabel" placeholder="مثال: المدونة" value="${escapeHtml(state.store.adminConfig?.extraSection?.label||'')}"></div>
                </div>
                <div class="form-group"><label for="extraSectionUrl">الرابط الخارجي</label><input type="url" id="extraSectionUrl" placeholder="https://example.com" value="${escapeHtml(state.store.adminConfig?.extraSection?.url||'')}"></div>
                <div class="form-actions"><button class="btn btn-primary" id="saveExtraSectionBtn"><i class="fas fa-save"></i> حفظ إعداد الزر</button></div>
            </div>

            <div class="store-card">
                <h3><i class="fas fa-headset"></i> زر الدعم العائم</h3>
                <p class="input-hint">عند التفعيل يتم عرض زر دعم عائم بالصورة الافتراضية، ويحمّل بوت الدردشة للرد على استفسارات العملاء في صفحة المتجر. قبل التفعيل يرجى إضافة قواعد البوت من صفحة القواعد لتجنب الردود غير المرغوب فيها.</p>
                <div class="form-grid-two">
                    <div class="form-group"><label class="toggle"><input type="checkbox" id="supportFloatingEnabled" ${state.store.adminConfig?.supportWidget?.enabled?'checked':''}> <span>تفعيل زر الدعم</span></label></div>
                    <div class="form-group"><label for="supportChatLink">رابط صفحة الدردشة</label><div class="input-with-action"><input type="url" id="supportChatLink" placeholder="https://..." value="${escapeHtml(state.store.adminConfig?.supportWidget?.chatLink||'')}"><button class="btn btn-secondary btn-sm" type="button" id="fetchChatLinkBtn"><i class="fas fa-magic"></i> جلب تلقائي</button></div><small class="input-hint">سيتم استخدام صفحة الدردشة المرتبطة بالبوت الحالي إن وُجدت.</small></div>
                </div>
                <div class="form-actions"><button class="btn btn-primary" id="saveSupportWidgetBtn"><i class="fas fa-save"></i> حفظ الإعداد</button></div>
            </div>
        `;

        bindPanel();
    }

    function bindPanel() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;

        const primaryInput = document.getElementById('primaryColorInput');
        const saveBtn = document.getElementById('saveColorsBtn');
        const preview = document.getElementById('designPreview');
        const layoutButtons = document.querySelectorAll('.select-layout-btn');

        // Banner refs
        const bannerEnabled = document.getElementById('bannerEnabled');
        const bannerImageInput = document.getElementById('bannerImageInput');
        const bannerPreviewImg = document.getElementById('bannerPreviewImg');
        const bannerLinkType = document.getElementById('bannerLinkType');
        const bannerExternalGroup = document.getElementById('bannerExternalGroup');
        const bannerExternalUrl = document.getElementById('bannerExternalUrl');
        const bannerProductGroup = document.getElementById('bannerProductGroup');
        const bannerProductId = document.getElementById('bannerProductId');
        const saveBannerBtn = document.getElementById('saveBannerBtn');

        // Extra section refs
        const extraEnabled = document.getElementById('extraSectionEnabled');
        const extraLabel = document.getElementById('extraSectionLabel');
        const extraUrl = document.getElementById('extraSectionUrl');
        const saveExtraBtn = document.getElementById('saveExtraSectionBtn');

        // Support widget refs
        const supportEnabled = document.getElementById('supportFloatingEnabled');
        const supportChatLink = document.getElementById('supportChatLink');
        const fetchChatLinkBtn = document.getElementById('fetchChatLinkBtn');
        const saveSupportBtn = document.getElementById('saveSupportWidgetBtn');

        const updatePreview = () => {
            // no preview right now
        };

        primaryInput?.addEventListener('input', updatePreview);

        saveBtn?.addEventListener('click', async () => {
            try {
                await helpers.updateStore({
                    primaryColor: primaryInput.value,
                }, 'تم تحديث الألوان بنجاح');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر حفظ الألوان', 'error');
            }
        });

        layoutButtons.forEach((button) => {
            button.addEventListener('click', async () => {
                const layoutId = button.dataset.layout;
                if (preview) {
                    preview.dataset.layout = layoutId;
                    // minimal inline preview update
                }
                document.querySelectorAll('.template-card').forEach(card => {
                    card.classList.toggle('active', card.dataset.layout === layoutId);
                });
                try {
                    await helpers.updateStore({ landingLayout: layoutId }, 'تم تحديث تخطيط صفحة المتجر');
                    try {
                        localStorage.setItem(`store:layout:${state.store._id}`, layoutId);
                        if ('BroadcastChannel' in window) {
                            const ch = new BroadcastChannel('store-layout');
                            ch.postMessage({ storeId: state.store._id, layout: layoutId });
                        }
                    } catch (_) {}
                } catch (err) {
                    helpers.showToast(err.message || 'تعذر تحديث تخطيط صفحة المتجر', 'error');
                }
            });
        });

        bannerLinkType?.addEventListener('change', () => {
            const t = bannerLinkType.value;
            bannerExternalGroup.style.display = t === 'external' ? 'block' : 'none';
            bannerProductGroup.style.display = t === 'product' ? 'block' : 'none';
        });

        bannerImageInput?.addEventListener('change', async () => {
            const file = bannerImageInput.files && bannerImageInput.files[0];
            if (!file) return;
            try {
                const fd = new FormData();
                fd.append('image', file);
                const res = await fetch('/api/upload', { method: 'POST', body: fd });
                if (!res.ok) throw new Error('فشل رفع الصورة');
                const json = await res.json();
                bannerPreviewImg.src = json.imageUrl;
                bannerPreviewImg.style.display = 'block';
                bannerPreviewImg.dataset.url = json.imageUrl;
                helpers.showToast('تم رفع صورة البنر');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر رفع الصورة', 'error');
            }
        });

        saveBannerBtn?.addEventListener('click', async () => {
            const payload = {
                bannerEnabled: !!bannerEnabled?.checked,
                bannerImageUrl: bannerPreviewImg?.dataset?.url || bannerPreviewImg?.src || '',
                bannerLinkType: bannerLinkType?.value || 'none',
                bannerExternalUrl: bannerExternalUrl?.value || '',
                bannerProductId: bannerProductId?.value || ''
            };
            try {
                await helpers.updateStore(payload, 'تم حفظ إعدادات البنر');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر حفظ إعدادات البنر', 'error');
            }
        });

        saveExtraBtn?.addEventListener('click', async () => {
            try {
                await helpers.updateStore({
                    extraSectionEnabled: !!extraEnabled?.checked,
                    extraSectionLabel: (extraLabel?.value || '').trim(),
                    extraSectionUrl: (extraUrl?.value || '').trim()
                }, 'تم حفظ إعداد زر القسم الخارجي');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر حفظ الإعداد', 'error');
            }
        });

        fetchChatLinkBtn?.addEventListener('click', async () => {
            try {
                const data = await helpers.handleApiRequest(`/api/chat-page/bot/${state.selectedBotId}`, { headers: { Authorization: `Bearer ${state.token}` } }, null, 'تعذر جلب رابط صفحة الدردشة');
                supportChatLink.value = data.link || '';
                helpers.showToast('تم جلب الرابط تلقائياً');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر جلب الرابط تلقائياً', 'error');
            }
        });

        saveSupportBtn?.addEventListener('click', async () => {
            try {
                await helpers.updateStore({
                    supportFloatingEnabled: !!supportEnabled?.checked,
                    supportChatLink: (supportChatLink?.value || '').trim()
                }, 'تم حفظ إعداد زر الدعم');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر حفظ الإعداد', 'error');
            }
        });
    }

    module.init = function(ctx) {
        if (module._inited) return module;
        module.ctx = ctx || {};
        module._inited = true;
        return module;
    };

    module.renderPanel = renderPanel;
    module._loaded = true;

    window.storeDashboard.design = module;
})();
