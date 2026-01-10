(function(){
    window.storeDashboard = window.storeDashboard || {};
    if (window.storeDashboard.catalog) return;

    const module = {
        _loaded: true,
        _inited: false,
        ctx: null,
    };

    function renderCategoriesTable(state, helpers) {
        if (!Array.isArray(state.categories) || !state.categories.length) {
            return '<p>لم يتم إضافة أقسام بعد.</p>';
        }
        return `
            <div class="table-responsive">
                <table class="store-table">
                    <thead>
                        <tr>
                            <th>الاسم</th>
                            <th>الوصف</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.categories.map((category) => `
                            <tr data-id="${category._id}">
                                <td>${helpers.escapeHtml(category.name)}</td>
                                <td>${helpers.escapeHtml(category.description || '-')}</td>
                                <td class="table-actions">
                                    <button class="btn btn-secondary btn-sm" data-action="edit-category" data-id="${category._id}"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-danger btn-sm" data-action="delete-category" data-id="${category._id}"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function renderProductsRows(state, helpers) {
        if (!Array.isArray(state.products) || !state.products.length) {
            return '<tr><td colspan="7">لم يتم إضافة منتجات بعد.</td></tr>';
        }

        return state.products.map((product) => `
            <tr data-id="${product._id}">
                <td>
                    <div class="product-info">
                        ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${helpers.escapeHtml(product.productName)}">` : '<div class="placeholder-img"></div>'}
                        <div>
                            <strong>${helpers.escapeHtml(product.productName)}</strong>
                            ${product.hasOffer ? '<span class="offer-tag">عرض خاص</span>' : ''}
                            ${Number(product.stock) === 0 ? '<div class="badge" style="background:#fee2e2;color:#991b1b;margin-block-start:4px;">غير متوفر — مخفي بالمتجر مؤقتًا</div>' : ''}
                        </div>
                    </div>

                </td>
                <td>${product.category?.name ? helpers.escapeHtml(product.category.name) : '-'}</td>
                <td>${helpers.formatCurrency(product.price, product.currency)}</td>
                <td>${product.stock}</td>
                <td>${product.hasOffer ? helpers.formatCurrency(product.discountedPrice, product.currency) : '-'}</td>
                <td>${product.salesCount || 0}</td>
                <td class="table-actions">
                    <button class="btn btn-secondary btn-sm" data-action="edit-product" data-id="${product._id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-secondary btn-sm" data-action="show-barcodes" data-id="${product._id}" title="عرض أكواد المنتج"><i class="fas fa-barcode"></i></button>
                    <button class="btn btn-danger btn-sm" data-action="delete-product" data-id="${product._id}"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    function renderProductsPagination(state) {
        const totalPages = Math.max(1, Math.ceil((state.productTotal || 0) / state.productPageSize));
        if (totalPages <= 1) return '';
        return `
            <div class="pagination-controls">
                <button class="btn btn-secondary btn-sm" id="prevProductsPage" ${state.productPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>
                <span>صفحة ${state.productPage} من ${totalPages}</span>
                <button class="btn btn-secondary btn-sm" id="nextProductsPage" ${state.productPage >= totalPages ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>
            </div>
        `;
    }

    async function bindCategoryForm(state, helpers) {
        const form = document.getElementById('categoryForm');
        const list = document.getElementById('categoriesList');
        if (!form || !list) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const nameInput = document.getElementById('categoryNameInput');
            const descInput = document.getElementById('categoryDescriptionInput');
            const categoryName = nameInput.value.trim();
            const categoryDescription = descInput.value.trim();

            if (categoryName.length < 3) {
                helpers.showToast('اسم القسم يجب أن يكون 3 أحرف على الأقل', 'error');
                return;
            }

            try {
                await helpers.handleApiRequest(`/api/categories/${state.store._id}/categories`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ categoryName, categoryDescription }),
                }, null, 'فشل في إضافة القسم');

                nameInput.value = '';
                descInput.value = '';

                if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
                helpers.showToast('تم إضافة القسم بنجاح');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر إضافة القسم', 'error');
            }
        });

        list.addEventListener('click', async (event) => {
            const button = event.target.closest('button[data-action]');
            if (!button) return;
            const action = button.dataset.action;
            const categoryId = button.dataset.id;

            if (action === 'edit-category') {
                const category = state.categories.find((item) => item._id === categoryId);
                if (!category) return;
                const newName = prompt('اسم القسم الجديد:', category.name);
                if (!newName || newName.trim().length < 3) return;
                const newDescription = prompt('وصف القسم:', category.description || '') || '';
                try {
                    await helpers.handleApiRequest(`/api/categories/${state.store._id}/categories/${categoryId}`, {
                        method: 'PUT',
                        headers: { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ categoryName: newName.trim(), categoryDescription: newDescription.trim() }),
                    }, null, 'فشل في تحديث القسم');
                    if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
                    helpers.showToast('تم تحديث القسم', 'success');
                } catch (err) {
                    helpers.showToast(err.message || 'تعذر تحديث القسم', 'error');
                }
            } else if (action === 'delete-category') {
                if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
                try {
                    await helpers.handleApiRequest(`/api/categories/${state.store._id}/categories/${categoryId}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${state.token}` },
                    }, null, 'فشل في حذف القسم');
                    if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
                    helpers.showToast('تم حذف القسم', 'success');
                } catch (err) {
                    helpers.showToast(err.message || 'تعذر حذف القسم', 'error');
                }
            }
        });
    }

    function openProductModal(state, helpers, mode, product = null) {
        const overlay = document.createElement('div');
        overlay.className = 'store-modal';

        overlay.innerHTML = `
            <div class="store-modal-content" dir="rtl">
                <button class="modal-close" type="button"><i class="fas fa-times"></i></button>
                <h3>${mode === 'create' ? 'إضافة منتج جديد' : 'تعديل المنتج'}</h3>
                <form id="productForm" enctype="multipart/form-data">
                    <div class="form-grid-two">
                        <div class="form-group">
                            <label for="productNameInput">اسم المنتج</label>
                            <input type="text" id="productNameInput" name="productName" value="${product ? helpers.escapeHtml(product.productName || '') : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="productCategorySelect">القسم</label>
                            <select id="productCategorySelect" name="category">
                                <option value="">بدون قسم</option>
                                ${state.categories.map((category) => `<option value="${category._id}" ${product?.category?._id === category._id || product?.category === category._id ? 'selected' : ''}>${helpers.escapeHtml(category.name)}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="productDescriptionInput">وصف المنتج</label>
                        <textarea id="productDescriptionInput" name="description" rows="3">${product ? helpers.escapeHtml(product.description || '') : ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label for="productDetailedDescriptionInput">الوصف التفصيلي</label>
                        <textarea id="productDetailedDescriptionInput" name="detailedDescription" rows="5">${product ? helpers.escapeHtml(product.detailedDescription || '') : ''}</textarea>
                    </div>

                    <div class="form-grid-two">
                        <div class="form-group">
                            <label for="productPriceInput">السعر</label>
                            <input type="number" id="productPriceInput" name="price" step="0.01" min="0" value="${product ? product.price : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="productCurrencySelect">العملة</label>
                            <select id="productCurrencySelect" name="currency">
                                ${['EGP', 'USD', 'SAR'].map((currency) => `<option value="${currency}" ${product?.currency === currency ? 'selected' : ''}>${currency}</option>`).join('')}
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="productCostPriceInput">سعر التكلفة <small style="display:block;color:#6b7280;font-size:.9em;">سري — لا يظهر إلا في لوحة التحكم</small></label>
                        <input type="number" id="productCostPriceInput" name="costPrice" step="0.01" min="0" value="${product ? (product.costPrice || '') : ''}">
                    </div>

                    <div class="form-grid-two">
                        <div class="form-group">
                            <label for="productStockInput">المخزون</label>
                            <input type="number" id="productStockInput" name="stock" min="0" value="${product ? product.stock : ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="productThresholdInput">حد التنبيه للمخزون</label>
                            <input type="number" id="productThresholdInput" name="lowStockThreshold" min="0" value="${product ? product.lowStockThreshold : 10}">
                        </div>
                    </div>

                    <div class="form-group offer-group">
                        <label class="toggle">
                            <input type="checkbox" id="productHasOffer" ${product?.hasOffer ? 'checked' : ''}>
                            <span>تفعيل عرض ترويجي</span>
                        </label>
                        <div class="offer-fields ${product?.hasOffer ? 'visible' : ''}" id="offerFields">
                            <div class="form-grid-two">
                                <div class="form-group">
                                    <label for="originalPriceInput">السعر الأصلي</label>
                                    <input type="number" id="originalPriceInput" name="originalPrice" step="0.01" min="0" value="${product?.originalPrice || ''}">
                                </div>
                                <div class="form-group">
                                    <label for="discountedPriceInput">السعر بعد الخصم</label>
                                    <input type="number" id="discountedPriceInput" name="discountedPrice" step="0.01" min="0" value="${product?.discountedPrice || ''}">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="form-group options-group">
                        <label class="toggle">
                            <input type="checkbox" id="productHasOptions" ${product?.optionsEnabled ? 'checked' : ''}>
                            <span>تفعيل خيارات للمنتج (مقاسات، ألوان، خامة)</span>
                        </label>
                        <div class="options-fields ${product?.optionsEnabled ? 'visible' : ''}" id="optionsFields" style="margin-block-start:8px;">
                            <div id="optionGroupsList"></div>
                            <button type="button" class="btn btn-secondary btn-sm" id="addOptionGroupBtn"><i class="fas fa-plus"></i> إضافة مجموعة خيارات</button>
                            <small class="input-hint">يمكن إضافة أكثر من مجموعة (مثال: مجموعة الألوان، مجموعة المقاسات). أدخل قيم المجموعة مفصولة بفواصل.</small>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="productImageInput">صورة المنتج</label>
                        <input type="file" id="productImageInput" name="image" accept="image/png, image/jpeg">
                        ${product?.imageUrl ? `<img src="${product.imageUrl}" alt="${helpers.escapeHtml(product.productName)}" class="preview-thumb">` : ''}
                    </div>

                    <div class="form-group">
                        <label for="productGalleryInput">صور إضافية للمنتج (سحب للإعادة الترتيب)</label>
                        <input type="file" id="productGalleryInput" accept="image/png, image/jpeg, image/gif" multiple>
                        <div id="galleryList" class="gallery-previews" style="display:flex;gap:8px;flex-wrap:wrap;margin-block-start:8px;"></div>
                        <small class="input-hint">رتّب الصور بالسحب والإفلات. أول صورة ستكون الرئيسية في التفاصيل.</small>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> ${mode === 'create' ? 'حفظ المنتج' : 'تحديث المنتج'}</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const closeModal = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 200);
        };

        overlay.querySelector('.modal-close')?.addEventListener('click', closeModal);
        overlay.addEventListener('click', (event) => { if (event.target === overlay) closeModal(); });

        bindProductForm(state, helpers, overlay, mode, product, closeModal);
    }

    function bindProductForm(state, helpers, overlay, mode, product, closeModal) {
        const form = overlay.querySelector('#productForm');
        const hasOfferCheckbox = overlay.querySelector('#productHasOffer');
        const offerFields = overlay.querySelector('#offerFields');
        const hasOptionsCheckbox = overlay.querySelector('#productHasOptions');
        const optionsFields = overlay.querySelector('#optionsFields');
        const optionGroupsList = overlay.querySelector('#optionGroupsList');
        const addOptionGroupBtn = overlay.querySelector('#addOptionGroupBtn');
        const galleryInput = overlay.querySelector('#productGalleryInput');
        const galleryList = overlay.querySelector('#galleryList');
        let images = Array.isArray(product?.images) ? [...product.images] : [];

        const renderGallery = () => {
            if (!galleryList) return;
            galleryList.innerHTML = images.map((url, idx) => `
                <div class="gallery-item" draggable="true" data-idx="${idx}" style="position:relative;cursor:grab;border:1px solid #e5e7eb;border-radius:8px;padding:4px;display:flex;align-items:center;justify-content:center;background:#fff;">
                    <img src="${url}" style="inline-size:64px;block-size:64px;object-fit:cover;border-radius:6px;">
                    <button type="button" class="btn btn-danger btn-sm" data-remove="${idx}" style="position:absolute;inset-inline-end:2px;inset-block-start:2px;padding:2px 6px;"><i class="fas fa-times"></i></button>
                </div>
            `).join('');

            galleryList.querySelectorAll('[data-remove]')?.forEach(btn => {
                btn.addEventListener('click', () => { const i = Number(btn.getAttribute('data-remove')); images.splice(i, 1); renderGallery(); });
            });

            let dragIndex = null;
            galleryList.querySelectorAll('.gallery-item')?.forEach(item => {
                item.addEventListener('dragstart', (e) => { dragIndex = Number(item.dataset.idx); e.dataTransfer.effectAllowed = 'move'; });
                item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const dropIndex = Number(item.dataset.idx);
                    if (dragIndex === null || dropIndex === dragIndex) return;
                    const moved = images.splice(dragIndex, 1)[0];
                    images.splice(dropIndex, 0, moved);
                    renderGallery();
                });
            });
        };

        renderGallery();

        galleryInput?.addEventListener('change', async () => {
            if (!galleryInput.files?.length) return;
            for (const file of galleryInput.files) {
                try {
                    const fdUp = new FormData();
                    fdUp.append('image', file);
                    const res = await fetch('/api/upload', { method: 'POST', body: fdUp });
                    if (!res.ok) throw new Error('تعذر رفع الصورة');
                    const data = await res.json();
                    if (data?.imageUrl) { images.push(data.imageUrl); renderGallery(); }
                } catch (e) { helpers.showToast(e.message || 'فشل رفع الصورة', 'error'); }
            }
            galleryInput.value = '';
        });

        const toggleOfferFields = () => { offerFields?.classList.toggle('visible', hasOfferCheckbox.checked); };
        hasOfferCheckbox?.addEventListener('change', toggleOfferFields);

        const toggleOptionsFields = () => { optionsFields?.classList.toggle('visible', hasOptionsCheckbox.checked); };
        hasOptionsCheckbox?.addEventListener('change', toggleOptionsFields);

        let optionGroups = Array.isArray(product?.optionGroups) ? product.optionGroups.map(g => ({ name: g.name || '', values: Array.isArray(g.values) ? g.values : [], required: !!g.required })) : [];

        function renderOptionGroups() {
            if (!optionGroupsList) return;
            optionGroupsList.innerHTML = optionGroups.map((g, idx) => `
                <div class="option-group-item" data-idx="${idx}" style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-block-end:8px;">
                    <div class="form-grid-two">
                        <div class="form-group">
                            <label>اسم المجموعة</label>
                            <input type="text" data-field="name" value="${helpers.escapeHtml(g.name)}" placeholder="مثال: الألوان">
                        </div>
                        <div class="form-group">
                            <label>القيم (مفصولة بفواصل)</label>
                            <input type="text" data-field="values" value="${helpers.escapeHtml(g.values.join(', '))}" placeholder="أحمر, أزرق, أخضر">
                        </div>
                    </div>
                    <label class="toggle"><input type="checkbox" data-field="required" ${g.required ? 'checked' : ''}><span>هذه المجموعة مطلوبة</span></label>
                    <div class="form-actions" style="display:flex;gap:8px;margin-block-start:8px;">
                        <button type="button" class="btn btn-danger btn-sm" data-action="remove"><i class="fas fa-trash"></i> إزالة المجموعة</button>
                    </div>
                </div>
            `).join('');

            optionGroupsList.querySelectorAll('.option-group-item').forEach(item => {
                const idx = Number(item.dataset.idx);
                item.querySelector('[data-field="name"]').addEventListener('input', (e) => { optionGroups[idx].name = e.target.value; });
                item.querySelector('[data-field="values"]').addEventListener('input', (e) => { const raw = String(e.target.value || ''); optionGroups[idx].values = raw.split(/[ ,،;؛\n]+/).map(s => s.trim()).filter(Boolean); });
                item.querySelector('[data-field="required"]').addEventListener('change', (e) => { optionGroups[idx].required = e.target.checked; });
                item.querySelector('[data-action="remove"]').addEventListener('click', () => { optionGroups.splice(idx,1); renderOptionGroups(); });
            });
        }

        addOptionGroupBtn?.addEventListener('click', () => { optionGroups.push({ name: '', values: [], required: false }); renderOptionGroups(); });
        renderOptionGroups();

        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const formData = new FormData();

            formData.append('productName', form.productName.value.trim());
            formData.append('description', form.description.value.trim());
            formData.append('detailedDescription', (form.detailedDescription?.value || '').trim());
            formData.append('price', form.price.value);
            if (form.costPrice !== undefined) formData.append('costPrice', form.costPrice.value);
            formData.append('currency', form.currency.value);
            formData.append('stock', form.stock.value);
            formData.append('lowStockThreshold', form.lowStockThreshold.value);
            if (form.category.value) formData.append('category', form.category.value);

            if (hasOfferCheckbox.checked) {
                formData.append('hasOffer', 'yes');
                formData.append('originalPrice', form.originalPrice.value);
                formData.append('discountedPrice', form.discountedPrice.value);
            } else { formData.append('hasOffer', 'no'); }

            if (hasOptionsCheckbox.checked) {
                formData.append('optionsEnabled', 'yes');
                const cleaned = optionGroups.map(g => ({ name: (g.name||'').trim(), values: (g.values||[]).map(v=>v.trim()).filter(Boolean), required: !!g.required })).filter(g => g.name && g.values.length);
                formData.append('optionGroups', JSON.stringify(cleaned));
            } else { formData.append('optionsEnabled', 'no'); }

            const imageInput = form.image;
            if (imageInput?.files?.length) formData.append('image', imageInput.files[0]);
            if (images.length) formData.append('images', JSON.stringify(images));

            const requestOptions = { method: mode === 'create' ? 'POST' : 'PUT', headers: { Authorization: `Bearer ${state.token}` }, body: formData };
            const url = mode === 'create' ? `/api/products/${state.store._id}/products` : `/api/products/${state.store._id}/products/${product._id}`;
            try {
                await helpers.handleApiRequest(url, requestOptions, null, mode === 'create' ? 'فشل في إضافة المنتج' : 'فشل في تحديث المنتج');
                closeModal();
                if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
                helpers.showToast(mode === 'create' ? 'تم إضافة المنتج بنجاح' : 'تم تحديث المنتج', 'success');
            } catch (err) {
                helpers.showToast(err.message || 'تعذر حفظ المنتج', 'error');
            }
        });
    }

    function bindProductToolbar(state, helpers) {
        const searchInput = document.getElementById('productSearchInput');
        const filterSelect = document.getElementById('productCategoryFilter');
        const refreshBtn = document.getElementById('refreshProductsBtn');
        const addBtn = document.getElementById('addProductBtn');
        const tableBody = document.getElementById('productsTableBody');

        if (searchInput) {
            searchInput.addEventListener('input', helpers.debounce(async (event) => {
                state.productSearch = event.target.value.trim();
                state.productPage = 1;
                if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
            }, 350));
        }

        filterSelect?.addEventListener('change', async (event) => { state.productCategoryFilter = event.target.value; state.productPage = 1; if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard(); });

        refreshBtn?.addEventListener('click', async (event) => { event.preventDefault(); if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard(); helpers.showToast('تم تحديث قائمة المنتجات'); });

        addBtn?.addEventListener('click', () => { openProductModal(state, helpers, 'create'); });

        const importBtn = document.getElementById('importProductsBtn');
        const exportAllBtn = document.getElementById('exportProductsAllBtn');
        const purgeAllBtn = document.getElementById('purgeAllBtn');

        importBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            await importProductsAndCategories(state, helpers);
        });

        exportAllBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            await exportProductsAndCategories(state, helpers);
        });

        purgeAllBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            await deleteAllProductsAndCategories(state, helpers);
        });

        tableBody?.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-action]'); if (!button) return; const action = button.dataset.action; const productId = button.dataset.id; const product = state.products.find((item) => item._id === productId) || state.catalogSnapshot.find((item) => item._id === productId);
            if (action === 'edit-product') {
                openProductModal(state, helpers, 'edit', product);
            } else if (action === 'delete-product') {
                if (!confirm('هل أنت متأكد من حذف المنتج؟')) return;
                deleteProduct(state, helpers, productId);
            } else if (action === 'show-barcodes') {
                openProductBarcodesModal(state, helpers, product);
            }
        });

        document.getElementById('prevProductsPage')?.addEventListener('click', async () => { if (state.productPage === 1) return; state.productPage -= 1; if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard(); });
        document.getElementById('nextProductsPage')?.addEventListener('click', async () => { const totalPages = Math.max(1, Math.ceil((state.productTotal || 0) / state.productPageSize)); if (state.productPage >= totalPages) return; state.productPage += 1; if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard(); });
    }

    async function deleteProduct(state, helpers, productId) {
        try {
            await helpers.handleApiRequest(`/api/products/${state.store._id}/products/${productId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } }, null, 'فشل في حذف المنتج');
            if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
            helpers.showToast('تم حذف المنتج', 'success');
        } catch (err) {
            helpers.showToast(err.message || 'تعذر حذف المنتج', 'error');
        }
    }

    async function exportProductsToCsv(state, helpers) {
        try {
            const storeId = state.store?._id;
            if (!storeId) throw new Error('معرّف المتجر غير متاح');
            const headersAuth = { Authorization: `Bearer ${state.token}` };
            const pageSize = 500;
            let page = 1;
            let total = 0;
            const allProducts = [];

            while (true) {
                const url = `/api/products/${storeId}/products?limit=${pageSize}&page=${page}`;
                const resp = await helpers.handleApiRequest(url, { headers: headersAuth }, null, 'فشل في جلب المنتجات');
                const list = Array.isArray(resp?.products) ? resp.products : [];
                total = Number(resp?.total) || (total || 0);
                allProducts.push(...list);
                if (!resp || !list.length || allProducts.length >= total) break;
                page += 1;
                if (page > 1000) break;
            }

            if (!allProducts.length) { helpers.showToast('لا توجد منتجات للتصدير', 'info'); return; }

            const headers = ['Product ID', 'Name', 'Category', 'Price', 'Currency', 'Stock', 'Sales', 'Barcode', 'Generated Codes', 'Primary Image', 'Images'];
            const rows = allProducts.map((product) => {
                const primary = product.imageUrl || (Array.isArray(product.images) && product.images.length ? product.images[0] : '');
                let imagesArr = Array.isArray(product.images) ? [...product.images] : (product.images ? String(product.images).split(',').map(s=>s.trim()).filter(Boolean) : []);
                if (primary) {
                    // ensure primary is first in images array
                    imagesArr = imagesArr.filter(i => i !== primary);
                    imagesArr.unshift(primary);
                }
                return [
                    product._id,
                    product.productName,
                    product.category?.name || '' ,
                    Number(product.price) || 0,
                    product.currency,
                    product.stock,
                    product.salesCount || 0,
                    product.barcode || '',
                    Array.isArray(product.generatedCodes) ? product.generatedCodes.join(';') : (product.generatedCodes || ''),
                    primary || '',
                    imagesArr.join(';')
                ];
            });
            if (typeof helpers.downloadCsv === 'function') helpers.downloadCsv('products.csv', [headers, ...rows]);
            helpers.showToast(`تم تصدير ${helpers.formatNumber(allProducts.length)} منتج`, 'success');
        } catch (err) {
            helpers.showToast(err.message || 'تعذر تصدير المنتجات', 'error');
        }
    }

    // حذف كل المنتجات وكل الأقسام دفعة واحدة (بحذر شديد)
    async function deleteAllProductsAndCategories(state, helpers) {
        try {
            const storeId = state.store?._id;
            if (!storeId) throw new Error('معرّف المتجر غير متاح');
            const headersAuth = { Authorization: `Bearer ${state.token}` };

            const step1 = window.prompt('تحذير: سيتم حذف كل المنتجات وكل الأقسام. اكتب "DELETE ALL" للتأكيد الأول.');
            if (step1 !== 'DELETE ALL') return;
            const step2 = window.prompt('تأكيد أخير: اكتب "تأكيد" للحذف النهائي.');
            if (step2 !== 'تأكيد') return;

            helpers.showToast('جارٍ حذف المنتجات... قد يستغرق بعض الوقت', 'info');

            // اجلب كل المنتجات (تصفح بالصفحات) ثم احذفها
            const pageSize = 500;
            let page = 1;
            let total = 0;
            const allProducts = [];
            while (true) {
                const url = `/api/products/${storeId}/products?limit=${pageSize}&page=${page}`;
                const resp = await helpers.handleApiRequest(url, { headers: headersAuth }, null, 'فشل في جلب المنتجات');
                const list = Array.isArray(resp?.products) ? resp.products : [];
                total = Number(resp?.total) || total;
                allProducts.push(...list);
                if (!list.length || allProducts.length >= total) break;
                page += 1;
                if (page > 1000) break;
            }

            for (const prod of allProducts) {
                try {
                    await helpers.handleApiRequest(`/api/products/${storeId}/products/${prod._id}`, { method: 'DELETE', headers: headersAuth }, null, `فشل في حذف المنتج ${prod.productName || prod.name || ''}`);
                } catch (err) {
                    console.warn('تعذر حذف منتج', prod?._id, err.message);
                }
            }

            helpers.showToast('جارٍ حذف الأقسام...', 'info');
            // احذف الأقسام الحالية
            const categories = Array.isArray(state.categories) ? state.categories : [];
            for (const cat of categories) {
                try {
                    await helpers.handleApiRequest(`/api/categories/${storeId}/categories/${cat._id}`, { method: 'DELETE', headers: headersAuth }, null, `فشل في حذف القسم ${cat.name || ''}`);
                } catch (err) {
                    console.warn('تعذر حذف قسم', cat?._id, err.message);
                }
            }

            if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
            helpers.showToast('تم حذف كل المنتجات والأقسام', 'success');
        } catch (err) {
            helpers.showToast(err.message || 'فشل في تنفيذ الحذف الشامل', 'error');
        }
    }

// Helper: download image blob and trigger browser download
function downloadImageToFile(url, filename) {
    return fetch(url).then(res => {
        if (!res.ok) throw new Error('فشل تحميل الصورة');
        return res.blob();
    }).then(blob => {
        const link = document.createElement('a');
        const objUrl = URL.createObjectURL(blob);
        link.href = objUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
    });
}

// Export both products and categories as a single JSON file
async function exportProductsAndCategories(state, helpers) {
    try {
        const storeId = state.store?._id;
        if (!storeId) throw new Error('معرّف المتجر غير متاح');
        const headersAuth = { Authorization: `Bearer ${state.token}` };

        // categories: prefer using current state if available
        let categories = Array.isArray(state.categories) ? state.categories : [];
        if (!categories.length) {
            const resp = await helpers.handleApiRequest(`/api/categories/${storeId}/categories`, { headers: headersAuth }, null, 'فشل في جلب الأقسام');
            categories = Array.isArray(resp?.categories) ? resp.categories : resp || [];
        }

        // products: paginate like CSV export
        const pageSize = 500;
        let page = 1;
        let total = 0;
        const allProducts = [];
        while (true) {
            const url = `/api/products/${storeId}/products?limit=${pageSize}&page=${page}`;
            const resp = await helpers.handleApiRequest(url, { headers: headersAuth }, null, 'فشل في جلب المنتجات');
            const list = Array.isArray(resp?.products) ? resp.products : [];
            total = Number(resp?.total) || (total || 0);
            allProducts.push(...list);
            if (!resp || !list.length || allProducts.length >= total) break;
            page += 1;
            if (page > 1000) break;
        }

        // ensure primary image is explicit and images array starts with it
        const productsWithPrimary = allProducts.map(product => {
            const primary = product.imageUrl || (Array.isArray(product.images) && product.images.length ? product.images[0] : '');
            let imagesArr = Array.isArray(product.images) ? [...product.images] : (product.images ? String(product.images).split(',').map(s=>s.trim()).filter(Boolean) : []);
            if (primary) {
                imagesArr = imagesArr.filter(i => i !== primary);
                imagesArr.unshift(primary);
            }
            return Object.assign({}, product, { primaryImage: primary || '', images: imagesArr });
        });

        const payload = { exportedAt: new Date().toISOString(), categories, products: productsWithPrimary };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const name = `products_export_${(new Date()).toISOString().replace(/[:.]/g,'-')}.json`;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        helpers.showToast(`تم تصدير ${helpers.formatNumber(allProducts.length)} منتج و ${helpers.formatNumber(categories.length)} قسم`, 'success');
    } catch (err) {
        helpers.showToast(err.message || 'فشل في تصدير المنتجات والأقسام', 'error');
    }
}

// Import categories and products from previously exported JSON file
async function importProductsAndCategories(state, helpers) {
    try {
        const storeId = state.store?._id;
        if (!storeId) throw new Error('معرّف المتجر غير متاح');

        // prompt file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.click();
        const file = await new Promise((resolve) => { input.onchange = () => resolve(input.files?.[0]); });
        if (!file) return;
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data || !Array.isArray(data.products) || !Array.isArray(data.categories)) throw new Error('ملف الاستيراد غير صالح');

        const headersAuth = { Authorization: `Bearer ${state.token}`, 'Content-Type': 'application/json' };

        // let user choose how to merge imported products
        const choice = window.prompt('اختر وضع الاستيراد:\n1) الاحتفاظ بالمنتجات الحالية وإضافة الجديدة بجوارها\n2) مسح كل المنتجات الحالية واستبدالها بما في الملف\nأدخل 1 أو 2', '1');
        if (choice === null) return; // user cancelled
        const importMode = String(choice).trim() === '2' ? 'replace' : 'append';

        if (importMode === 'replace') {
            helpers.showToast('جارٍ حذف المنتجات السابقة قبل الاستيراد...', 'info');
            const existingProducts = [];
            const pageSize = 500;
            let page = 1;
            while (true) {
                const url = `/api/products/${storeId}/products?limit=${pageSize}&page=${page}`;
                const resp = await helpers.handleApiRequest(url, { headers: headersAuth }, null, 'فشل في جلب المنتجات الحالية للمسح');
                const list = Array.isArray(resp?.products) ? resp.products : [];
                existingProducts.push(...list);
                const total = Number(resp?.total) || 0;
                if (!list.length || existingProducts.length >= total) break;
                page += 1;
                if (page > 1000) break;
            }

            for (const prod of existingProducts) {
                try {
                    await helpers.handleApiRequest(`/api/products/${storeId}/products/${prod._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${state.token}` } }, null, `فشل في حذف المنتج ${prod.productName || prod.name || ''}`);
                } catch (e) {
                    console.warn('Failed to delete product before import', prod?._id, e.message);
                }
            }
        }

        // Build existing categories map by name
        const existingCategories = {};
        (Array.isArray(state.categories) ? state.categories : []).forEach(c => { if (c && c.name) existingCategories[String(c.name).trim()] = c._id; });

        // Create missing categories
        const createdCategories = {};
        for (const cat of data.categories) {
            const name = (cat.name || cat.categoryName || '').trim();
            if (!name) continue;
            if (existingCategories[name]) { createdCategories[name] = existingCategories[name]; continue; }
            // create category
            try {
                const body = JSON.stringify({ categoryName: name, categoryDescription: cat.description || cat.categoryDescription || '' });
                const resp = await helpers.handleApiRequest(`/api/categories/${storeId}/categories`, { method: 'POST', headers: headersAuth, body }, null, `فشل في إنشاء القسم ${name}`);
                const newCat = resp;
                if (newCat && newCat._id) {
                    createdCategories[name] = newCat._id;
                }
            } catch (e) {
                console.warn('Failed to create category', name, e.message);
            }
        }

        // Merge maps: prefer existingCategories, then createdCategories
        const nameToId = Object.assign({}, createdCategories);
        Object.keys(existingCategories).forEach(k => { nameToId[k] = existingCategories[k]; });

        // Create products
        let imported = 0;
        for (const p of data.products) {
            try {
                const catName = p.category?.name || p.categoryName || p.category || '';
                const mappedCatId = nameToId[String(catName).trim()] || null;
                const productPayload = {
                    productName: p.productName || p.name || 'Untitled',
                    description: p.description || p.desc || '',
                    detailedDescription: p.detailedDescription || p.longDescription || '',
                    price: p.price || p.price || 0,
                    currency: p.currency || 'EGP',
                    stock: p.stock != null ? p.stock : 0,
                    lowStockThreshold: p.lowStockThreshold != null ? p.lowStockThreshold : 10,
                    hasOffer: p.hasOffer ? 'yes' : 'no',
                    originalPrice: p.originalPrice,
                    discountedPrice: p.discountedPrice,
                    optionsEnabled: p.optionsEnabled ? 'yes' : 'no',
                    optionGroups: p.optionGroups || p.options || [],
                    images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
                    primaryImage: p.primaryImage || p.imageUrl || (Array.isArray(p.images) && p.images.length ? p.images[0] : ''),
                    imageUrl: p.primaryImage || p.imageUrl || (Array.isArray(p.images) && p.images.length ? p.images[0] : ''),
                    category: mappedCatId,
                    costPrice: p.costPrice != null ? p.costPrice : undefined,
                    barcode: p.barcode || undefined,
                    generatedCodes: p.generatedCodes || undefined
                };

                await helpers.handleApiRequest(`/api/products/${storeId}/products`, { method: 'POST', headers: headersAuth, body: JSON.stringify(productPayload) }, null, `فشل في إنشاء المنتج ${productPayload.productName}`);
                imported += 1;
            } catch (e) {
                console.warn('Failed to import product', p?.productName || p?.name, e.message);
            }
        }

        if (typeof helpers.refreshDashboard === 'function') await helpers.refreshDashboard();
        helpers.showToast(`تم استيراد ${imported} منتج (${importMode === 'replace' ? 'تم استبدال المنتجات السابقة' : 'تمت إضافتها بجوار المنتجات الحالية'})` , 'success');
    } catch (err) {
        helpers.showToast(err.message || 'فشل في استيراد الملف', 'error');
    }
}

// Modal to show barcodes and QR codes for a product and allow downloading
function openProductBarcodesModal(state, helpers, product) {
    if (!product) return helpers.showToast('المنتج غير موجود', 'error');
    const overlay = document.createElement('div');
    overlay.className = 'store-modal';
    const codes = Array.isArray(product.generatedCodes) && product.generatedCodes.length ? product.generatedCodes : (product.barcode ? [product.barcode] : []);

    overlay.innerHTML = `
        <div class="store-modal-content" dir="rtl">
            <button class="modal-close" type="button"><i class="fas fa-times"></i></button>
            <h3>أكواد المنتج: ${helpers.escapeHtml(product.productName || '')}</h3>
            <div id="barcodesList" style="display:flex;flex-direction:column;gap:16px;">
                ${codes.map((c, idx) => `
                    <div class="barcode-block" data-idx="${idx}" style="border:1px solid #e5e7eb;padding:12px;border-radius:8px;background:#fff;">
                        <div style="display:flex;gap:12px;align-items:center;justify-content:space-between;">
                            <div style="flex:1;">
                                <div style="font-weight:600;margin-block-end:8px;">${helpers.escapeHtml(c)}</div>
                                <div style="display:flex;gap:12px;align-items:center;">
                                    <div style="text-align:center;">
                                        <img src="https://api-bwipjs.metafloor.com/?bcid=code128&text=${encodeURIComponent(c)}&includetext" alt="barcode-${idx}" style="max-inline-size:220px;">
                                        <div style="font-size:.85em;color:#6b7280;margin-block-start:6px;">باركود</div>
                                    </div>
                                    <div style="text-align:center;">
                                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(c)}" alt="qrcode-${idx}" style="inline-size:120px;block-size:120px;">
                                        <div style="font-size:.85em;color:#6b7280;margin-block-start:6px;">رمز QR</div>
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:8px;min-inline-size:160px;align-items:flex-end;">
                                <button class="btn btn-secondary btn-sm" data-download-type="barcode" data-idx="${idx}">تحميل صورة الباركود</button>
                                <button class="btn btn-secondary btn-sm" data-download-type="qrcode" data-idx="${idx}">تحميل صورة الـQR</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    const closeModal = () => { overlay.classList.remove('visible'); setTimeout(() => overlay.remove(), 200); };
    overlay.querySelector('.modal-close')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

    overlay.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-download-type]'); if (!btn) return; const type = btn.getAttribute('data-download-type'); const idx = Number(btn.getAttribute('data-idx'));
        const code = codes[idx]; if (!code) return helpers.showToast('الكود غير موجود', 'error');
        try {
            if (type === 'barcode') {
                const url = `https://api-bwipjs.metafloor.com/?bcid=code128&text=${encodeURIComponent(code)}&includetext`;
                await downloadImageToFile(url, `${product.productName || 'code'}_${idx}_barcode.png`);
            } else if (type === 'qrcode') {
                const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(code)}`;
                await downloadImageToFile(url, `${product.productName || 'code'}_${idx}_qrcode.png`);
            }
        } catch (err) {
            helpers.showToast(err.message || 'فشل في تحميل الصورة', 'error');
        }
    });
}

    function renderPanel() {
        const state = module.ctx.state;
        const helpers = module.ctx.helpers;
        const panel = document.getElementById('store-catalog-panel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="store-card">
                <h3><i class="fas fa-folder-tree"></i> إدارة الأقسام</h3>
                <form id="categoryForm" class="inline-form">
                    <input type="text" id="categoryNameInput" placeholder="اسم القسم" minlength="3" required>
                    <input type="text" id="categoryDescriptionInput" placeholder="وصف مختصر (اختياري)">
                    <button type="submit" class="btn btn-primary btn-sm"><i class="fas fa-plus"></i> إضافة</button>
                </form>
                <div id="categoriesList">${renderCategoriesTable(state, helpers)}</div>
            </div>

            <div class="store-card">
                <h3><i class="fas fa-boxes"></i> إدارة المنتجات</h3>
                <div class="catalog-toolbar">
                    <div class="toolbar-group">
                        <input type="text" id="productSearchInput" placeholder="بحث عن منتج" value="${helpers.escapeHtml(state.productSearch)}">
                        <select id="productCategoryFilter">
                            <option value="all" ${state.productCategoryFilter === 'all' ? 'selected' : ''}>كل الأقسام</option>
                            ${state.categories.map((category) => `<option value="${category._id}" ${state.productCategoryFilter === category._id ? 'selected' : ''}>${helpers.escapeHtml(category.name)}</option>`).join('')}
                        </select>
                    </div>
                    <div class="toolbar-group">
                        <button class="btn btn-secondary btn-sm" id="refreshProductsBtn"><i class="fas fa-sync"></i> تحديث</button>
                        <button class="btn btn-secondary btn-sm" id="importProductsBtn"><i class="fas fa-file-import"></i> استيراد منتجات</button>
                        <button class="btn btn-secondary btn-sm" id="exportProductsAllBtn"><i class="fas fa-file-export"></i> تصدير ♥</button>
                        <button class="btn btn-danger btn-sm" id="purgeAllBtn" title="حذف كل المنتجات والأقسام"><i class="fas fa-trash"></i> حذف الكل</button>
                        <button class="btn btn-primary" id="addProductBtn"><i class="fas fa-plus"></i> إضافة منتج</button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="store-table">
                        <thead>
                            <tr>
                                <th>المنتج</th>
                                <th>القسم</th>
                                <th>السعر</th>
                                <th>المخزون</th>
                                <th>السعر بعد الخصم</th>
                                <th>المبيعات</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody id="productsTableBody">
                            ${renderProductsRows(state, helpers)}
                        </tbody>
                    </table>
                </div>
                ${renderProductsPagination(state)}
            </div>
        `;

        bindCategoryForm(state, helpers);
        bindProductToolbar(state, helpers);
    }

    module.init = function(ctx) {
        if (module._inited) return module;
        module.ctx = ctx || {};
        module._inited = true;
        return module;
    };

    module.renderPanel = renderPanel;
    module.exportProductsToCsv = function() { const s = module.ctx.state; const h = module.ctx.helpers; return exportProductsToCsv(s, h); };

    window.storeDashboard.catalog = module;
})();
