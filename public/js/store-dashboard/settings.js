(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.settings) return;

    const module = {
        _loaded: true,
        _inited: false,
        ctx: null,
    };

    const defaultEscape = (v='') => String(v).replace(/[&<>\"]/g, (c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]||c));

    function isValidSlug(slug) {
        return /^[A-Za-z0-9_-]{4,}$/.test(slug);
    }

    function renderPanel() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-settings-panel');
        if (!panel) return;

        panel.innerHTML = `
            <form id="store-settings-form" class="store-card store-form">
                <h3><i class="fas fa-sliders-h"></i> الإعدادات العامة</h3>
                <div class="form-grid-two">
                    <div class="form-group">
                        <label for="storeNameInput">اسم المتجر</label>
                        <input type="text" id="storeNameInput" name="storeName" value="${helpers.escapeHtml(state.store.storeName || '')}" minlength="3" required>
                    </div>
                    <div class="form-group">
                        <label for="storeLinkInput">رابط المتجر</label>
                        <div class="input-with-action">
                            <input type="text" id="storeLinkInput" name="storeLink" value="${helpers.escapeHtml(state.store.storeLink || '')}" pattern="^[a-zA-Z0-9_-]{4,}$" required>
                            <button type="button" class="btn btn-secondary btn-sm" id="checkLinkAvailability"><i class="fas fa-check-circle"></i> تحقق</button>
                        </div>
                        <small class="input-hint">الرابط النهائي: ${helpers.escapeHtml(`${window.location.origin}/store/${state.store.storeLink}`)}</small>
                        <div class="field-feedback" id="storeLinkFeedback"></div>
                    </div>
                </div>

                <div class="form-grid-two">
                    <div class="form-group">
                        <label for="storeDescriptionInput">وصف المتجر</label>
                        <textarea id="storeDescriptionInput" name="storeDescription" rows="3">${helpers.escapeHtml(state.store.storeDescription || '')}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="footerTextInput">نص ذيل الصفحة</label>
                        <textarea id="footerTextInput" name="footerText" rows="3">${helpers.escapeHtml(state.store.footerText || '')}</textarea>
                    </div>
                </div>

                <div class="form-grid-two">
                    <div class="form-group">
                        <label for="whatsappInput">رقم واتساب</label>
                        <input type="text" id="whatsappInput" name="whatsapp" value="${helpers.escapeHtml(state.store.whatsapp || '')}">
                    </div>
                    <div class="form-group">
                        <label for="mobilePhoneInput">رقم الهاتف المحمول</label>
                        <input type="text" id="mobilePhoneInput" name="mobilePhone" value="${helpers.escapeHtml(state.store.mobilePhone || '')}">
                    </div>
                </div>

                <div class="form-grid-two">
                    <div class="form-group">
                        <label for="emailInput">البريد الإلكتروني</label>
                        <input type="email" id="emailInput" name="email" value="${helpers.escapeHtml(state.store.email || '')}">
                    </div>
                    <div class="form-group">
                        <label for="addressInput">العنوان</label>
                        <input type="text" id="addressInput" name="address" value="${helpers.escapeHtml(state.store.address || '')}">
                    </div>
                </div>

                <div class="form-grid-two">
                    <div class="form-group">
                        <label for="googleMapsInput">رابط خرائط جوجل</label>
                        <input type="url" id="googleMapsInput" name="googleMapsLink" value="${helpers.escapeHtml(state.store.googleMapsLink || '')}">
                    </div>
                    <div class="form-group">
                        <label for="websiteInput">الموقع الإلكتروني</label>
                        <input type="url" id="websiteInput" name="website" value="${helpers.escapeHtml(state.store.website || '')}">
                    </div>
                </div>

                <div class="form-grid-two">
                    <div class="form-group">
                        <label for="storeLogoInput">شعار المتجر</label>
                        <small class="input-hint">يفضّل رفع الشعار بدون خلفية</small>
                        <input type="file" id="storeLogoInput" accept="image/png, image/jpeg, image/gif">
                        ${state.store.storeLogoUrl ? `
                            <div style="display:flex;align-items:center;gap:12px;margin-block-start:8px;">
                                <img src="${helpers.escapeHtml(state.store.storeLogoUrl)}" alt="Store Logo" class="preview-thumb" style="max-block-size:64px;border-radius:8px;">
                                <button type="button" class="btn btn-danger btn-sm" id="removeLogoBtn"><i class="fas fa-trash"></i> إزالة الشعار</button>
                            </div>
                        ` : '<small class="input-hint">أرفع صورة شعار بصيغة PNG أو JPG</small>'}
                    </div>
                    <div class="form-group">
                        <label class="toggle">
                            <input type="checkbox" id="enableCartToggle" ${state.store.adminConfig?.enableCart ? 'checked' : ''}>
                            <span>تفعيل عربة التسوق</span>
                        </label>
                        <small class="input-hint">عند التعطيل سيتم توجيه العملاء لإكمال الدفع عبر واتساب فقط.</small>
                    </div>
                </div>

                <div class="store-divider"></div>
                <h3><i class="fas fa-hashtag"></i> روابط التواصل الاجتماعي</h3>
                <div class="form-grid-two">
                    <div class="form-group"><label for="socialLinks.facebook"><i class="fab fa-facebook"></i> Facebook</label><input type="url" name="socialLinks.facebook" id="socialLinks.facebook" value="${helpers.escapeHtml(state.store.socialLinks?.facebook||'')}"></div>
                    <div class="form-group"><label for="socialLinks.instagram"><i class="fab fa-instagram"></i> Instagram</label><input type="url" name="socialLinks.instagram" id="socialLinks.instagram" value="${helpers.escapeHtml(state.store.socialLinks?.instagram||'')}"></div>
                    <div class="form-group"><label for="socialLinks.twitter"><i class="fab fa-twitter"></i> Twitter</label><input type="url" name="socialLinks.twitter" id="socialLinks.twitter" value="${helpers.escapeHtml(state.store.socialLinks?.twitter||'')}"></div>
                    <div class="form-group"><label for="socialLinks.youtube"><i class="fab fa-youtube"></i> YouTube</label><input type="url" name="socialLinks.youtube" id="socialLinks.youtube" value="${helpers.escapeHtml(state.store.socialLinks?.youtube||'')}"></div>
                    <div class="form-group"><label for="socialLinks.tiktok"><i class="fab fa-tiktok"></i> TikTok</label><input type="url" name="socialLinks.tiktok" id="socialLinks.tiktok" value="${helpers.escapeHtml(state.store.socialLinks?.tiktok||'')}"></div>
                    <div class="form-group"><label for="socialLinks.linkedin"><i class="fab fa-linkedin"></i> LinkedIn</label><input type="url" name="socialLinks.linkedin" id="socialLinks.linkedin" value="${helpers.escapeHtml(state.store.socialLinks?.linkedin||'')}"></div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="btn btn-primary"><i class="fas a-save"></i> حفظ التعديلات</button>
                </div>
            </form>
        `;

        bindSettingsForm();
    }

    function bindSettingsForm() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const form = document.getElementById('store-settings-form');
        if (!form) return;

        const linkInput = document.getElementById('storeLinkInput');
        const linkFeedback = document.getElementById('storeLinkFeedback');
        const checkBtn = document.getElementById('checkLinkAvailability');
        const removeLogoBtn = document.getElementById('removeLogoBtn');

        removeLogoBtn?.addEventListener('click', async () => {
            try {
                await helpers.updateStore({ storeLogoUrl: '' }, 'تم إزالة الشعار');
            } catch (err) {
                linkFeedback.textContent = err.message || 'تعذر إزالة الشعار.';
                linkFeedback.className = 'field-feedback error';
            }
        });

        checkBtn?.addEventListener('click', async () => {
            const slug = linkInput.value.trim();
            if (!isValidSlug(slug)) {
                linkFeedback.textContent = 'الرابط يجب أن يكون باللغة الإنجليزية وبحد أدنى 4 أحرف ويحتوي على حروف أو أرقام أو - أو _.';
                linkFeedback.className = 'field-feedback error';
                return;
            }
            try {
                const { available } = await helpers.handleApiRequest(`/api/stores/check-link/${slug}`, {}, null, 'فشل في التحقق من الرابط');
                if (slug === state.store.storeLink) {
                    linkFeedback.textContent = 'هذا هو رابطك الحالي.';
                    linkFeedback.className = 'field-feedback info';
                } else if (available) {
                    linkFeedback.textContent = 'الرابط متاح للحجز.';
                    linkFeedback.className = 'field-feedback success';
                } else {
                    linkFeedback.textContent = 'الرابط مستخدم بالفعل.';
                    linkFeedback.className = 'field-feedback error';
                }
            } catch (err) {
                linkFeedback.textContent = err.message || 'تعذر التحقق من الرابط الآن.';
                linkFeedback.className = 'field-feedback error';
            }
        });

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const payload = {};

            formData.forEach((value, key) => {
                payload[key] = value && typeof value === 'string' ? value.trim() : value;
            });

            payload.enableCart = document.getElementById('enableCartToggle')?.checked;

            const logoInput = document.getElementById('storeLogoInput');
            if (logoInput?.files?.length) {
                try {
                    const fd = new FormData();
                    fd.append('image', logoInput.files[0]);
                    const res = await fetch('/api/upload', { method: 'POST', body: fd });
                    if (!res.ok) throw new Error('تعذر رفع الشعار');
                    const up = await res.json();
                    if (up?.imageUrl) payload.storeLogoUrl = up.imageUrl;
                } catch (e) {
                    linkFeedback.textContent = e.message || 'تعذر رفع الشعار';
                    linkFeedback.className = 'field-feedback error';
                    return;
                }
            }

            if (payload.storeLink && !isValidSlug(payload.storeLink)) {
                linkFeedback.textContent = 'الرابط يجب أن يكون باللغة الإنجليزية وبحد أدنى 4 أحرف.';
                linkFeedback.className = 'field-feedback error';
                return;
            }

            try {
                await helpers.updateStore(payload, 'تم حفظ الإعدادات بنجاح');
            } catch (err) {
                linkFeedback.textContent = err.message || 'حدث خطأ أثناء تحديث المتجر.';
                linkFeedback.className = 'field-feedback error';
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
    window.storeDashboard.settings = module;
})();
