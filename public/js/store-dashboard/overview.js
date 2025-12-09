(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.overview) return;

    const module = { _loaded: true, _inited: false, ctx: null };

    function renderBestsellerList(products, helpers) {
        if (!products || !products.length) return '<p>لا توجد بيانات حتى الآن. ابدأ بإضافة منتجات وإطلاق حملاتك.</p>';
        return `
            <ul class="bestseller-list">
                ${products.map((product) => {
                    const qty = Number(product._salesQty || product.salesQty || 0) || 0;
                    return `
                        <li>
                            <div>
                                <strong>${helpers.escapeHtml(product.productName)}</strong>
                                <span>${product.category?.name ? helpers.escapeHtml(product.category.name) : 'بدون قسم'}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span class="badge" style="background:#eef2ff;color:#1e3a8a;">تم بيع ${helpers.formatNumber(qty)} قطعة</span>
                                <span>${helpers.formatCurrency(product.price, product.currency)}</span>
                            </div>
                        </li>
                    `;
                }).join('')}
            </ul>
        `;
    }

    function renderLowStockTable(products, helpers) {
        if (!products || !products.length) return '<p>لا يوجد منتجات منخفضة المخزون حالياً.</p>';
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead>
                        <tr>
                            <th>المنتج</th>
                            <th>المخزون الحالي</th>
                            <th>حد التنبيه</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.map((product) => `
                            <tr>
                                <td>${helpers.escapeHtml(product.productName)}</td>
                                <td>${product.stock}</td>
                                <td>${product.lowStockThreshold}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderPanel() {
        const state = module.ctx.state; const helpers = module.ctx.helpers;
        const overview = document.getElementById('store-overview-panel'); if (!overview) return;

        const lowStock = state.analytics?.lowStock || [];
        const bestsellers = state.analytics?.bestsellers || [];
        const zeroStock = (state.catalogSnapshot || []).filter(p => Number(p.stock) <= 0);

        overview.innerHTML = `
            <div class="store-card">
                <h3><i class="fas fa-info-circle"></i> تفاصيل المتجر</h3>
                <div class="store-overview-grid">
                    <div>
                        <p><strong>الوصف التعريفي:</strong> ${state.store.storeDescription ? helpers.escapeHtml(state.store.storeDescription) : 'لم يتم إضافة وصف بعد.'}</p>
                        <p><strong>تفعيل السلة:</strong> ${state.store.adminConfig?.enableCart ? 'مفعل' : 'معطل'}</p>
                        <p><strong>طرق الدفع:</strong> الدفع عند الاستلام، الدفع عبر واتساب</p>
                        <p><strong>تخطيط صفحة المتجر:</strong> ${
                            state.store.adminConfig?.landingLayout === 'layout2' ? 'مودرن' : state.store.adminConfig?.landingLayout === 'layout3' ? 'خيال' : 'كلاسيكي'
                        }</p>
                    </div>
                    <div>
                        <p><strong>معلومات التواصل:</strong></p>
                        <ul class="contact-list">
                            ${state.store.whatsapp ? `<li><i class="fab fa-whatsapp"></i> ${helpers.escapeHtml(state.store.whatsapp)}</li>` : ''}
                            ${state.store.mobilePhone ? `<li><i class="fas fa-phone-alt"></i> ${helpers.escapeHtml(state.store.mobilePhone)}</li>` : ''}
                            ${state.store.email ? `<li><i class="fas fa-envelope"></i> ${helpers.escapeHtml(state.store.email)}</li>` : ''}
                            ${state.store.address ? `<li><i class="fas fa-map-marker-alt"></i> ${helpers.escapeHtml(state.store.address)}</li>` : ''}
                        </ul>
                    </div>
                </div>
            </div>

            <div class="store-card">
                <h3><i class="fas fa-star"></i> المنتجات الأكثر مبيعا</h3>
                ${renderBestsellerList(bestsellers, helpers)}
            </div>

            <div id="overview-analytics-container"></div>

            <div class="store-card">
                <h3><i class="fas fa-exclamation-triangle"></i> تنبيهات المخزون المنخفض</h3>
                ${renderLowStockTable(lowStock, helpers)}
            </div>

            ${zeroStock.length ? `
            <div class="store-card">
                <h3><i class="fas fa-eye-slash"></i> منتجات غير متوفرة (مخفية في المتجر)</h3>
                <div class="table-responsive">
                    <table class="store-table">
                        <thead><tr><th>المنتج</th><th>القسم</th><th>المخزون</th></tr></thead>
                        <tbody>
                            ${zeroStock.map(p => `
                                <tr>
                                    <td>${helpers.escapeHtml(p.productName)}</td>
                                    <td>${p.category?.name ? helpers.escapeHtml(p.category.name) : '-'}</td>
                                    <td>0</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="input-hint" style="margin-block-start:8px;">هذه المنتجات لن تظهر في صفحة المتجر حتى يتم تحديث المخزون.</p>
            </div>` : ''}

            <div class="store-card">
                <h3><i class="fas fa-bullhorn"></i> مميزات النظام المحاسبي المتكامل</h3>
                <div class="store-overview-columns">
                    <div>
                        <p>• مكتبة قوالب احترافية مع معاينة فورية.</p>
                        <p>• إدارة العروض بنسب خصم وتواريخ انتهاء.</p>
                        <p>• إشعارات تلقائية للزبائن عند تحديث حالة الطلب.</p>
                        <p>• تفعيل حملات ترويجية سريعة عبر واتساب.</p>
                    </div>
                    <div>
                        <p>• تقارير دورية للمبيعات والأرباح والخسائر.</p>
                        <p>• دعم فريق العمل بصلاحيات محدودة للموظفين.</p>
                        <p>• حفظ بيانات العملاء مع جلب تلقائي للطلبات التالية.</p>
                        <p>• تصدير البيانات إلى Excel أو PDF بسهولة.</p>
                    </div>
                </div>
            </div>
        `;

        if (helpers && typeof helpers.renderAnalyticsPanel === 'function') {
            helpers.renderAnalyticsPanel('overview-analytics-container');
        }
    }

    module.init = function(ctx) { if (module._inited) return module; module.ctx = ctx || {}; module._inited = true; return module; };
    module.renderPanel = renderPanel;
    module._loaded = true;
    window.storeDashboard.overview = module;
})();
