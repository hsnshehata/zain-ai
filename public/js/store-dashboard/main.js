(() => {
	const state = {
		token: null,
		selectedBotId: null,
		bot: null,
		store: null,
		categories: [],
		products: [],
		productTotal: 0,
		productPage: 1,
		productPageSize: 10,
		productSearch: '',
		productCategoryFilter: 'all',
		orders: [],
		analytics: {},
		catalogSnapshot: [],
		contentEl: null,
		slugManuallyEdited: false,
		currentTab: 'overview',
		// customers panel state
		customerPage: 1,
		customerPageSize: 10,
		customerSearch: '',
	};

	const STATUS_LABELS = {
		pending: 'قيد المعالجة',
		confirmed: 'مؤكد',
		shipped: 'تم الشحن',
		delivered: 'تم التسليم',
		cancelled: 'ملغي',
	};

	function getContentElement() {
		return document.getElementById('content');
	}

	const escapeHtml = (value = '') => {
		return String(value).replace(/[&<>"']/g, (char) => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;',
		})[char]);
	};

	const slugify = (value = '') => {
		return value
			.toLowerCase()
			.trim()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9_-]/g, '');
	};

	const isValidSlug = (value = '') => /^[a-z0-9_-]{4,}$/i.test(value);

	const formatCurrency = (amount, currency = 'EGP') => {
		const numericAmount = Number(amount) || 0;
		try {
			return new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(numericAmount);
		} catch (err) {
			return `${numericAmount.toFixed(2)} ${currency}`;
		}
	};

	const formatNumber = (value) => new Intl.NumberFormat('ar-EG').format(Number(value) || 0);

	const formatDate = (value) => {
		if (!value) return '-';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
	};

	const debounce = (fn, delay = 350) => {
		let timer;
		return (...args) => {
			clearTimeout(timer);
			timer = setTimeout(() => fn(...args), delay);
		};
	};

	const showToast = (message, type = 'success') => {
		const toast = document.createElement('div');
		toast.className = `store-toast store-toast-${type}`;
		toast.textContent = message;
		document.body.appendChild(toast);
		requestAnimationFrame(() => {
			toast.classList.add('visible');
		});
		setTimeout(() => {
			toast.classList.remove('visible');
			setTimeout(() => toast.remove(), 300);
		}, 4000);
	};

	// تعريف لوحة المتجر والتبويبات
	function renderStoreDashboard() {
		if (!state.contentEl) return;
		state.contentEl.innerHTML = `
			<div class="store-manager" dir="rtl">
				<div class="store-manager-header">
					<div class="store-subtitle">رابط المتجر: ${escapeHtml(`${window.location.origin}/store/${state.store?.storeLink||''}`)}</div>
					<div class="toolbar-group">
						<a class="btn btn-secondary btn-sm" id="openStoreBtn" href="${escapeHtml(`/store/${state.store?.storeLink||''}`)}" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> فتح المتجر</a>
						<button class="btn btn-secondary btn-sm" id="copyStoreLinkBtn"><i class="fas fa-link"></i> نسخ الرابط</button>
					</div>
				</div>
				<div class="store-tabs">
					<div class="store-tabs-nav">
						<button class="store-tab-btn ${state.currentTab==='overview'?'active':''}" data-tab="overview"><i class="fas fa-info-circle"></i> نظرة عامة</button>
						<button class="store-tab-btn ${state.currentTab==='settings'?'active':''}" data-tab="settings"><i class="fas fa-cog"></i> الإعدادات</button>
						<button class="store-tab-btn ${state.currentTab==='design'?'active':''}" data-tab="design"><i class="fas fa-palette"></i> التصميم</button>
						<button class="store-tab-btn ${state.currentTab==='catalog'?'active':''}" data-tab="catalog"><i class="fas fa-boxes"></i> الكاتالوج</button>
						<button class="store-tab-btn ${state.currentTab==='orders'?'active':''}" data-tab="orders"><i class="fas fa-clipboard-list"></i> الطلبات</button>
						<button class="store-tab-btn ${state.currentTab==='customers'?'active':''}" data-tab="customers"><i class="fas fa-users"></i> بيانات العملاء</button>
						<button class="store-tab-btn ${state.currentTab==='analytics'?'active':''}" data-tab="analytics"><i class="fas fa-chart-line"></i> التحليلات</button>
					</div>
					<div id="store-overview-panel" class="store-tab-panel ${state.currentTab==='overview'?'active':''}"></div>
					<div id="store-design-panel" class="store-tab-panel ${state.currentTab==='design'?'active':''}"></div>
					<div id="store-catalog-panel" class="store-tab-panel ${state.currentTab==='catalog'?'active':''}"></div>
					<div id="store-orders-panel" class="store-tab-panel ${state.currentTab==='orders'?'active':''}"></div>
					<div id="store-customers-panel" class="store-tab-panel ${state.currentTab==='customers'?'active':''}"></div>
					<div id="store-analytics-panel" class="store-tab-panel ${state.currentTab==='analytics'?'active':''}"></div>
					<div id="store-settings-panel" class="store-tab-panel ${state.currentTab==='settings'?'active':''}"></div>
				</div>
			</div>
		`;

		// رندر البانلز
		renderOverviewPanel();
		renderDesignPanel();
		renderCatalogPanel();
		renderCustomersPanel();
		renderOrdersPanel();
		renderAnalyticsPanel();
		renderSettingsPanel();

		// التنقل بين التبويبات
		state.contentEl.querySelectorAll('.store-tab-btn').forEach((btn) => {
			btn.addEventListener('click', () => {
				const tab = btn.dataset.tab;
				if (!tab || tab === state.currentTab) return;
				state.currentTab = tab;
				renderStoreDashboard();
			});
		});

		// أزرار فتح المتجر ونسخ الرابط
		const openBtn = document.getElementById('openStoreBtn');
		const copyBtn = document.getElementById('copyStoreLinkBtn');
		copyBtn?.addEventListener('click', async () => {
			try {
				const link = `${window.location.origin}/store/${state.store?.storeLink||''}`;
				await navigator.clipboard.writeText(link);
				showToast('تم نسخ رابط المتجر إلى الحافظة');
			} catch (e) {
				showToast('تعذر نسخ الرابط تلقائياً، انسخه يدويًا', 'error');
			}
		});
	}

	async function loadStoreManagerPage() {
		state.token = localStorage.getItem('token');
		state.selectedBotId = localStorage.getItem('selectedBotId');
		state.contentEl = getContentElement();

		if (!state.contentEl) return;

		if (!state.token) {
			state.contentEl.innerHTML = `<div class="placeholder"><h2><i class="fas fa-lock"></i> يرجى تسجيل الدخول</h2><p>تحتاج إلى تسجيل الدخول للوصول لإدارة المتجر.</p></div>`;
			return;
		}

		if (!state.selectedBotId) {
			state.contentEl.innerHTML = `<div class="placeholder"><h2><i class="fas fa-robot"></i> اختر بوتًا أولاً</h2><p>يرجى اختيار بوت من أعلى الصفحة لبدء إدارة المتجر.</p></div>`;
			return;
		}

		state.contentEl.innerHTML = `<div class="store-loading"><div class="loader"></div><p>جاري تحميل لوحة المتجر الذكي...</p></div>`;

		try {
			const headers = { Authorization: `Bearer ${state.token}` };
			state.bot = await handleApiRequest(`/api/bots/${state.selectedBotId}`, { headers }, null, 'فشل في جلب بيانات البوت');

			if (!state.bot.storeId) {
				renderCreateStoreView();
				return;
			}

			state.store = await handleApiRequest(`/api/stores/${state.bot.storeId}`, { headers }, null, 'فشل في جلب بيانات المتجر');

			await fetchInitialStoreData();
			renderStoreDashboard();
		} catch (err) {
			console.error('❌ Failed to load store manager:', err);
			state.contentEl.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>${escapeHtml(err.message || 'حدث خطأ غير متوقع أثناء تحميل بيانات المتجر.')}</p></div>`;
		}
	}

	async function fetchInitialStoreData() {
		if (!state.store || !state.store._id) return;
		const headers = { Authorization: `Bearer ${state.token}` };
		const storeId = state.store._id;

		try {
            const [categories, productsResponse, orders, snapshot] = await Promise.all([
				handleApiRequest(`/api/categories/${storeId}/categories`, { headers }, null, 'فشل في جلب الأقسام').catch(() => []),
				handleApiRequest(`/api/products/${storeId}/products?limit=${state.productPageSize}&page=${state.productPage}${state.productSearch ? `&search=${encodeURIComponent(state.productSearch)}` : ''}${state.productCategoryFilter !== 'all' ? `&category=${encodeURIComponent(state.productCategoryFilter)}` : ''}`, { headers }, null, 'فشل في جلب المنتجات').catch(() => ({ products: [], total: 0 })),
            	handleApiRequest(`/api/orders/${storeId}/orders`, { headers }, null, 'فشل في جلب الطلبات'),
            	handleApiRequest(`/api/products/${storeId}/products?limit=200`, { headers }, null, 'فشل في جلب نظرة عامة على المنتجات').catch(() => ({ products: [], total: 0 })),
			]);

			state.categories = Array.isArray(categories) ? categories : [];
			state.products = Array.isArray(productsResponse?.products) ? productsResponse.products : [];
			state.productTotal = typeof productsResponse?.total === 'number' ? productsResponse.total : state.products.length;
			state.orders = Array.isArray(orders) ? orders : [];
			state.catalogSnapshot = Array.isArray(snapshot?.products) ? snapshot.products : [];
			state.analytics = state.analytics || {};
			computeAnalytics();
			computeAnalytics();
		} catch (err) {
			console.error('❌ Failed to fetch initial store data:', err);
			throw err;
		}
	}

	async function fetchOrdersSafe(storeId, headers) {
		try {
			return await handleApiRequest(`/api/orders/${storeId}/orders`, { headers }, null, 'فشل في جلب الطلبات');
		} catch (err) {
			if (err.status === 403 || err.status === 404) {
				return [];
			}
			throw err;
		}
	}

	function computeAnalytics() {
		const orders = state.orders || [];
		const snapshot = state.catalogSnapshot || [];
		const bestsellers = []; // سنحسبها من الطلبات

		// الحسابات المالية تعتمد فقط على الطلبات المسلّمة
		const delivered = orders.filter(o => o && o.status === 'delivered');
		const totalRevenue = delivered.reduce((sum, order) => sum + (Number(order.totalPrice) || 0), 0);
		const now = new Date();
		const currentMonthRevenue = delivered.reduce((sum, order) => {
			if (!order.createdAt) return sum;
			const date = new Date(order.createdAt);
			if (Number.isNaN(date.getTime())) return sum;
			if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
				return sum + (Number(order.totalPrice) || 0);
			}
			return sum;
		}, 0);

		const statusCounts = orders.reduce((acc, order) => {
			acc[order.status] = (acc[order.status] || 0) + 1;
			return acc;
		}, {});

		const lowStock = snapshot.filter((product) => typeof product.lowStockThreshold === 'number' && product.stock <= product.lowStockThreshold);
		const currency = snapshot[0]?.currency || state.products[0]?.currency || 'EGP';

		// حساب المنتجات الأكثر طلبًا من الطلبات المؤكدة/المشحونة/المسلّمة
		const validStatuses = new Set(['confirmed', 'shipped', 'delivered']);
		const qtyByProduct = new Map();
		for (const order of orders) {
			if (!order || !Array.isArray(order.products)) continue;
			if (order.status && !validStatuses.has(order.status)) continue; // استبعد pending و cancelled
			for (const item of order.products) {
				const pid = String(item.productId || '');
				const q = Number(item.quantity) || 0;
				if (!pid || q <= 0) continue;
				qtyByProduct.set(pid, (qtyByProduct.get(pid) || 0) + q);
			}
		}
		const ranked = Array.from(qtyByProduct.entries()).sort((a,b)=> b[1]-a[1]).slice(0,5);
		const topProducts = ranked.map(([pid, qty]) => {
			const p = snapshot.find(pp => String(pp._id) === String(pid)) || state.products.find(pp => String(pp._id) === String(pid)) || null;
			return p ? {
				_id: p._id,
				productName: p.productName,
				category: p.category ? { name: p.category.name || p.category } : undefined,
				price: p.price,
				currency: p.currency || currency,
				_salesQty: qty,
			} : { _id: pid, productName: `منتج #${pid.slice(-6)}`, price: 0, currency, _salesQty: qty };
		});

		state.analytics = {
			totalRevenue,
			currentMonthRevenue,
			totalOrders: orders.length,
			averageOrderValue: delivered.length ? (totalRevenue / delivered.length) : 0,
			pendingOrders: statusCounts.pending || 0,
			confirmedOrders: statusCounts.confirmed || 0,
			shippedOrders: statusCounts.shipped || 0,
			deliveredOrders: statusCounts.delivered || 0,
			cancelledOrders: statusCounts.cancelled || 0,
			lowStock,
			currency,
			bestsellers: topProducts,
		};
	}

	function renderCustomersTable(customers, total, page, pageSize) {
		if (!customers.length) return '<p>لا يوجد عملاء بعد.</p>';
		const totalPages = Math.max(1, Math.ceil(total / pageSize));
		return `
			<div class="table-responsive">
				<table class="store-table">
					<thead>
						<tr>
							<th>الاسم</th>
							<th>الهاتف</th>
							<th>عدد الطلبات</th>
							<th>إجمالي الإنفاق</th>
							<th>آخر طلب</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						${customers.map(c => `
							<tr data-id="${c._id}">
								<td>${escapeHtml(c.name || '-')}</td>
								<td>${escapeHtml(c.phone)}</td>
								<td>${formatNumber(c.totalOrders || 0)}</td>
								<td>${formatCurrency(c.totalSpent || 0, c.currency || 'EGP')}</td>
								<td>${c.lastOrderAt ? formatDate(c.lastOrderAt) : '-'}</td>
								<td class="table-actions">
									<button class="btn btn-secondary btn-sm" data-action="view-customer"><i class="fas fa-eye"></i></button>
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

	function bindCustomersPanel() {
		const searchInput = document.getElementById('customerSearchInput');
		const refreshBtn = document.getElementById('refreshCustomersBtn');
		searchInput?.addEventListener('input', debounce((e) => {
			loadCustomers(e.target.value.trim(), 1);
		}, 350));
		refreshBtn?.addEventListener('click', () => loadCustomers(searchInput?.value?.trim()||'', 1));
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
	}

	async function openCustomerModal(customerId) {
		const overlay = document.createElement('div');
		overlay.className = 'store-modal';
		overlay.innerHTML = `
			<div class="store-modal-content" dir="rtl">
				<button class="modal-close" type="button"><i class="fas fa-times"></i></button>
				<h3>ملف العميل</h3>
				<div id="customerDetails" style="min-inline-size:300px;min-block-size:120px;"></div>
			</div>`;
		document.body.appendChild(overlay);
		requestAnimationFrame(() => overlay.classList.add('visible'));
		const close = () => { overlay.classList.remove('visible'); setTimeout(()=>overlay.remove(),200); };
		overlay.querySelector('.modal-close')?.addEventListener('click', close);
		overlay.addEventListener('click', (e)=>{ if(e.target===overlay) close(); });

		box.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل ملف العميل...</p></div>';
		try {
			const headers = { Authorization: `Bearer ${state.token}` };
			const data = await handleApiRequest(`/api/customers/${state.store._id}/customers/${customerId}`, { headers }, null, 'فشل في جلب ملف العميل');
			const { customer, orders } = data;
			const total = Number(customer.totalSpent||0);
			box.innerHTML = `
				<div class="customer-meta" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;">
					<div><strong>الاسم:</strong> ${escapeHtml(customer.name||'-')}</div>
					<div><strong>الهاتف:</strong> ${escapeHtml(customer.phone)}</div>
					<div><strong>البريد:</strong> ${escapeHtml(customer.email||'-')}</div>
					<div><strong>العنوان:</strong> ${escapeHtml(customer.address||'-')}</div>
				</div>
				<div class="customer-stats" style="display:flex;gap:12px;margin-block:12px;">
					<div class="badge" style="background:#f1f5f9;color:#0f172a;">الطلبات: ${formatNumber(customer.totalOrders||0)}</div>
					<div class="badge" style="background:#f1f5f9;color:#0f172a;">إجمالي الإنفاق: ${formatCurrency(total, customer.currency||'EGP')}</div>
					<div class="badge" style="background:#f1f5f9;color:#0f172a;">آخر طلب: ${customer.lastOrderAt ? formatDate(customer.lastOrderAt) : '-'}</div>
				</div>
				<div class="table-responsive">
					<table class="store-table">
						<thead><tr><th>رقم الطلب</th><th>التاريخ</th><th>الحالة</th><th>الإجمالي</th></tr></thead>
						<tbody>
							${(orders||[]).map(o => `<tr><td>${escapeHtml(o._id.slice(-6))}</td><td>${formatDate(o.createdAt)}</td><td>${escapeHtml(o.status)}</td><td>${formatCurrency(o.totalPrice, o.currency)}</td></tr>`).join('')}
						</tbody>
					</table>
				</div>
			`;
		} catch (err) {
			box.innerHTML = `<p class="error">${escapeHtml(err.message || 'تعذر تحميل ملف العميل')}</p>`;
		}
	}

	function renderOverviewPanel() {
		const overview = document.getElementById('store-overview-panel');
		if (!overview) return;

		const lowStock = state.analytics.lowStock || [];
		const bestsellers = state.analytics.bestsellers || [];
		const zeroStock = (state.catalogSnapshot || []).filter(p => Number(p.stock) <= 0);

		overview.innerHTML = `
			<div class="store-card">
				<h3><i class="fas fa-info-circle"></i> تفاصيل المتجر</h3>
				<div class="store-overview-grid">
					<div>
						<p><strong>الوصف التعريفي:</strong> ${state.store.storeDescription ? escapeHtml(state.store.storeDescription) : 'لم يتم إضافة وصف بعد.'}</p>
						<p><strong>تفعيل السلة:</strong> ${state.store.adminConfig?.enableCart ? 'مفعل' : 'معطل'}</p>
						<p><strong>طرق الدفع:</strong> الدفع عند الاستلام، الدفع عبر واتساب</p>
						<p><strong>تخطيط صفحة المتجر:</strong> ${
							state.store.adminConfig?.landingLayout === 'layout2' ? 'مودرن' :
							state.store.adminConfig?.landingLayout === 'layout3' ? 'خيال' : 'كلاسيكي'
						}</p>
					</div>
					<div>
						<p><strong>معلومات التواصل:</strong></p>
						<ul class="contact-list">
							${state.store.whatsapp ? `<li><i class="fab fa-whatsapp"></i> ${escapeHtml(state.store.whatsapp)}</li>` : ''}
							${state.store.mobilePhone ? `<li><i class="fas fa-phone-alt"></i> ${escapeHtml(state.store.mobilePhone)}</li>` : ''}
							${state.store.email ? `<li><i class="fas fa-envelope"></i> ${escapeHtml(state.store.email)}</li>` : ''}
							${state.store.address ? `<li><i class="fas fa-map-marker-alt"></i> ${escapeHtml(state.store.address)}</li>` : ''}
						</ul>
					</div>
				</div>
			</div>

			<div class="store-card">
				<h3><i class="fas fa-star"></i> المنتجات الأكثر طلبًا</h3>
				${bestsellers.length ? renderBestsellerList(bestsellers) : '<p>لا توجد بيانات حتى الآن. ابدأ بإضافة منتجات وإطلاق حملاتك.</p>'}
			</div>

			<div class="store-card">
				<h3><i class="fas fa-exclamation-triangle"></i> تنبيهات المخزون المنخفض</h3>
				${lowStock.length ? renderLowStockTable(lowStock) : '<p>لا يوجد منتجات منخفضة المخزون حالياً.</p>'}
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
									<td>${escapeHtml(p.productName)}</td>
									<td>${p.category?.name ? escapeHtml(p.category.name) : '-'}</td>
									<td>0</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
				</div>
				<p class="input-hint" style="margin-top:8px;">هذه المنتجات لن تظهر في صفحة المتجر حتى يتم تحديث المخزون.</p>
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
	}

	function renderBestsellerList(products) {
		return `
			<ul class="bestseller-list">
				${products.map((product) => {
					const qty = Number(product._salesQty || product.salesQty || 0) || 0;
					return `
						<li>
							<div>
								<strong>${escapeHtml(product.productName)}</strong>
								<span>${product.category?.name ? escapeHtml(product.category.name) : 'بدون قسم'}</span>
							</div>
							<div style="display:flex;align-items:center;gap:8px;">
								<span class="badge" style="background:#eef2ff;color:#1e3a8a;">تم بيع ${formatNumber(qty)} قطعة</span>
								<span>${formatCurrency(product.price, product.currency)}</span>
							</div>
						</li>
					`;
				}).join('')}
			</ul>
		`;
	}

	function renderLowStockTable(products) {
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
								<td>${escapeHtml(product.productName)}</td>
								<td>${product.stock}</td>
								<td>${product.lowStockThreshold}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;
	}

	function renderCustomersPanel() {
		const panel = document.getElementById('store-customers-panel');
		if (!panel) return;

		panel.innerHTML = `
			<div class="store-card">
				<h3><i class="fas fa-users"></i> بيانات العملاء</h3>
				<div class="catalog-toolbar">
					<div class="toolbar-group">
						<input type="text" id="customerSearchInput" placeholder="ابحث بالاسم أو الهاتف أو البريد" value="${escapeHtml(state.customerSearch||'')}">
					</div>
					<div class="toolbar-group">
						<button class="btn btn-secondary btn-sm" id="refreshCustomersBtn"><i class="fas fa-sync"></i> تحديث</button>
					</div>
				</div>
				<div id="customersList"><div class="store-loading"><div class="loader"></div><p>تحميل قائمة العملاء...</p></div></div>
			</div>
		`;

		bindCustomersPanel();
		loadCustomers(state.customerSearch||'', state.customerPage||1);
	}

	async function loadCustomers(search = '', page = 1) {
		state.customerSearch = search;
		state.customerPage = page;
		const list = document.getElementById('customersList');
		if (!list) return;
		list.innerHTML = '<div class="store-loading"><div class="loader"></div><p>تحميل...</p></div>';
		try {
			const headers = { Authorization: `Bearer ${state.token}` };
			const url = `/api/customers/${state.store._id}/customers?search=${encodeURIComponent(search||'')}&page=${page}&limit=${state.customerPageSize}`;
			const data = await handleApiRequest(url, { headers }, null, 'فشل في جلب العملاء');
			list.innerHTML = renderCustomersTable(data.customers || [], data.total || 0, page, state.customerPageSize);
			bindCustomersList();
		} catch (err) {
			list.innerHTML = `<p class="error">${escapeHtml(err.message || 'تعذر تحميل العملاء')}</p>`;
		}
	}

	function renderSettingsPanel() {
		const panel = document.getElementById('store-settings-panel');
		if (!panel) return;

		panel.innerHTML = `
			<form id="store-settings-form" class="store-card store-form">
				<h3><i class="fas fa-sliders-h"></i> الإعدادات العامة</h3>
				<div class="form-grid-two">
					<div class="form-group">
						<label for="storeNameInput">اسم المتجر</label>
						<input type="text" id="storeNameInput" name="storeName" value="${escapeHtml(state.store.storeName || '')}" minlength="3" required>
					</div>
					<div class="form-group">
						<label for="storeLinkInput">رابط المتجر</label>
						<div class="input-with-action">
							<input type="text" id="storeLinkInput" name="storeLink" value="${escapeHtml(state.store.storeLink || '')}" pattern="^[a-zA-Z0-9_-]{4,}$" required>
							<button type="button" class="btn btn-secondary btn-sm" id="checkLinkAvailability"><i class="fas fa-check-circle"></i> تحقق</button>
						</div>
						<small class="input-hint">الرابط النهائي: ${escapeHtml(`${window.location.origin}/store/${state.store.storeLink}`)}</small>
						<div class="field-feedback" id="storeLinkFeedback"></div>
					</div>
				</div>

				<div class="form-grid-two">
					<div class="form-group">
						<label for="storeDescriptionInput">وصف المتجر</label>
						<textarea id="storeDescriptionInput" name="storeDescription" rows="3">${escapeHtml(state.store.storeDescription || '')}</textarea>
					</div>
					<div class="form-group">
						<label for="footerTextInput">نص ذيل الصفحة</label>
						<textarea id="footerTextInput" name="footerText" rows="3">${escapeHtml(state.store.footerText || '')}</textarea>
					</div>
				</div>

				<div class="form-grid-two">
					<div class="form-group">
						<label for="whatsappInput">رقم واتساب</label>
						<input type="text" id="whatsappInput" name="whatsapp" value="${escapeHtml(state.store.whatsapp || '')}">
					</div>
					<div class="form-group">
						<label for="mobilePhoneInput">رقم الهاتف المحمول</label>
						<input type="text" id="mobilePhoneInput" name="mobilePhone" value="${escapeHtml(state.store.mobilePhone || '')}">
					</div>
				</div>

				<div class="form-grid-two">
					<div class="form-group">
						<label for="emailInput">البريد الإلكتروني</label>
						<input type="email" id="emailInput" name="email" value="${escapeHtml(state.store.email || '')}">
					</div>
					<div class="form-group">
						<label for="addressInput">العنوان</label>
						<input type="text" id="addressInput" name="address" value="${escapeHtml(state.store.address || '')}">
					</div>
				</div>

				<div class="form-grid-two">
					<div class="form-group">
						<label for="googleMapsInput">رابط خرائط جوجل</label>
						<input type="url" id="googleMapsInput" name="googleMapsLink" value="${escapeHtml(state.store.googleMapsLink || '')}">
					</div>
					<div class="form-group">
						<label for="websiteInput">الموقع الإلكتروني</label>
						<input type="url" id="websiteInput" name="website" value="${escapeHtml(state.store.website || '')}">
					</div>
				</div>

				<div class="form-grid-two">
					<div class="form-group">
						<label for="storeLogoInput">شعار المتجر</label>
						<small class="input-hint">يفضّل رفع الشعار بدون خلفية</small>
						<input type="file" id="storeLogoInput" accept="image/png, image/jpeg, image/gif">
						${state.store.storeLogoUrl ? `
							<div style="display:flex;align-items:center;gap:12px;margin-block-start:8px;">
								<img src="${state.store.storeLogoUrl}" alt="Store Logo" class="preview-thumb" style="max-block-size:64px;border-radius:8px;">
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
					<div class="form-group"><label for="socialLinks.facebook"><i class="fab fa-facebook"></i> Facebook</label><input type="url" name="socialLinks.facebook" id="socialLinks.facebook" value="${escapeHtml(state.store.socialLinks?.facebook||'')}"></div>
					<div class="form-group"><label for="socialLinks.instagram"><i class="fab fa-instagram"></i> Instagram</label><input type="url" name="socialLinks.instagram" id="socialLinks.instagram" value="${escapeHtml(state.store.socialLinks?.instagram||'')}"></div>
					<div class="form-group"><label for="socialLinks.twitter"><i class="fab fa-twitter"></i> Twitter</label><input type="url" name="socialLinks.twitter" id="socialLinks.twitter" value="${escapeHtml(state.store.socialLinks?.twitter||'')}"></div>
					<div class="form-group"><label for="socialLinks.youtube"><i class="fab fa-youtube"></i> YouTube</label><input type="url" name="socialLinks.youtube" id="socialLinks.youtube" value="${escapeHtml(state.store.socialLinks?.youtube||'')}"></div>
					<div class="form-group"><label for="socialLinks.tiktok"><i class="fab fa-tiktok"></i> TikTok</label><input type="url" name="socialLinks.tiktok" id="socialLinks.tiktok" value="${escapeHtml(state.store.socialLinks?.tiktok||'')}"></div>
					<div class="form-group"><label for="socialLinks.linkedin"><i class="fab fa-linkedin"></i> LinkedIn</label><input type="url" name="socialLinks.linkedin" id="socialLinks.linkedin" value="${escapeHtml(state.store.socialLinks?.linkedin||'')}"></div>
				</div>

				<div class="form-actions">
					<button type="submit" class="btn btn-primary"><i class="fas a-save"></i> حفظ التعديلات</button>
				</div>
			</form>
		`;

		bindSettingsForm();
	}

	function bindSettingsForm() {
		const form = document.getElementById('store-settings-form');
		if (!form) return;

		const linkInput = document.getElementById('storeLinkInput');
		const linkFeedback = document.getElementById('storeLinkFeedback');
		const checkBtn = document.getElementById('checkLinkAvailability');
		const removeLogoBtn = document.getElementById('removeLogoBtn');
		removeLogoBtn?.addEventListener('click', async () => {
			try {
				await updateStore({ storeLogoUrl: '' }, 'تم إزالة الشعار');
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
				const { available } = await handleApiRequest(`/api/stores/check-link/${slug}`, {}, null, 'فشل في التحقق من الرابط');
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

			// شعار المتجر: رفع الصورة إن وُجدت ثم تمرير الرابط كـ storeLogoUrl
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
				await updateStore(payload, 'تم حفظ الإعدادات بنجاح');
			} catch (err) {
				linkFeedback.textContent = err.message || 'حدث خطأ أثناء تحديث المتجر.';
				linkFeedback.className = 'field-feedback error';
			}
		});
	}

	function renderDesignPanel() {
		const panel = document.getElementById('store-design-panel');
		if (!panel) return;

		const layouts = [
			{ id: 'layout1', name: 'كلاسيكي', description: 'واجهة بسيطة ثابتة بدون حركات، أبيض + اللون الأساسي.' },
			{ id: 'layout2', name: 'مودرن', description: 'شريط علوي كبسولات وعناصر حديثة، بدون أي بنرات متحركة.' },
			{ id: 'layout3', name: 'خيال', description: 'بطل (Hero) ثابت بخلفية متدرجة وCTA، بدون سلايدر.' },
		];

		const renderLayoutPreviewHTML = (layout) => {
			switch (layout) {
				case 'layout2':
					return `
						<div class="preview-modern" style="display:grid;gap:10px;">
							<div class="preview-headline" style="display:flex;justify-content:space-between;align-items:center;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;">
								<span style="background:var(--primary, #00C4B4);color:#fff;border-radius:999px;padding:4px 10px;">${state.store.storeName || 'متجرك'}</span>
								<button class="btn btn-primary" style="background:var(--primary, #00C4B4);border:none;">تسوق</button>
							</div>
							<div class="preview-capsules" style="display:flex;gap:8px;flex-wrap:wrap;">
								<span style="border:1px solid rgba(37,99,235,.25);color:var(--primary, #00C4B4);background:rgba(37,99,235,.08);border-radius:999px;padding:4px 10px;">الأكثر مبيعًا</span>
								<span style="border:1px solid rgba(37,99,235,.25);color:var(--primary, #00C4B4);background:rgba(37,99,235,.08);border-radius:999px;padding:4px 10px;">وصل حديثًا</span>
								<span style="border:1px solid rgba(37,99,235,.25);color:var(--primary, #00C4B4);background:rgba(37,99,235,.08);border-radius:999px;padding:4px 10px;">خصومات</span>
							</div>
						</div>
					`;
				case 'layout3':
					return `
						<div class="preview-hero" style="background:linear-gradient(135deg,var(--primary, #00C4B4), #22d3ee);color:#fff;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;">
							<span class="badge" style="background:rgba(255,255,255,.2);backdrop-filter:blur(6px);border-radius:999px;padding:4px 10px;align-self:flex-start;">واجهة مميزة</span>
							<h4 style="margin:0;">${escapeHtml(state.store.storeName || '')}</h4>
							<p style="margin:0;opacity:.95;">${escapeHtml(state.store.storeDescription || 'نص تعريفي ثابت بدون حركة')}</p>
							<button class="btn btn-primary" style="background:#fff;color:#0f172a;border:none;inline-size:max-content;">تسوق الآن</button>
						</div>
					`;
				case 'layout1':
				default:
					return `
						<div class="preview-classic" style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:12px;display:grid;grid-template-columns:1.2fr .8fr;gap:10px;align-items:center;">
							<div>
								<h4 style="margin:0 0 6px;">${escapeHtml(state.store.storeName || '')}</h4>
								<p style="margin:0 0 8px;color:#475569;">${escapeHtml(state.store.storeDescription || 'واجهة ثابتة بدون سلايدر')}</p>
								<button class="btn btn-primary" style="background:var(--primary, #00C4B4);border:none;">تسوق الآن</button>
							</div>
							<div style="display:grid;place-items:center;"><div style="inline-size:120px;block-size:80px;border-radius:16px;background:#f1f5f9;"></div></div>
						</div>
					`;
			}
		};

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

		bindDesignPanel();
	}

	function bindDesignPanel() {
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
			// لا توجد معاينة كبيرة حالياً
		};

		primaryInput?.addEventListener('input', updatePreview);

		saveBtn?.addEventListener('click', async () => {
			try {
				await updateStore({
					primaryColor: primaryInput.value,
				}, 'تم تحديث الألوان بنجاح');
			} catch (err) {
				showToast(err.message || 'تعذر حفظ الألوان', 'error');
			}
		});

		// تبديل التخطيط مع معاينة فورية
		layoutButtons.forEach((button) => {
			button.addEventListener('click', async () => {
				const layoutId = button.dataset.layout;
				// تحديث المعاينة والبطاقات فوراً (إن وُجدت معاينة كبيرة)
				if (preview) {
					preview.dataset.layout = layoutId;
					preview.innerHTML = (function(layout){
					switch(layout){
						case 'grid':
							return `
								<div class=\"preview-toolbar\" style=\"display:flex;justify-content:space-between;align-items:center;margin-block-end:12px;\">
									<div style=\"font-weight:700;\">شبكة المنتجات</div>
									<div style=\"display:flex;gap:8px;\">
										<span class=\"badge\" style=\"background:var(--primary);color:#fff;border-radius:999px;padding-inline:10px;padding-block:4px;\">${state.store.storeName || 'متجرك'}</span>
										<button class=\"btn btn-primary\" style=\"background:var(--primary);border:none;\">تسوق</button>
									</div>
								</div>
								<div class=\"preview-grid\" style=\"display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;\">
									${Array.from({length:6}).map(()=> `
										<div class=\"preview-card\" style=\"background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:10px;\">
											<div style=\"inline-size:100%;block-size:72px;background:#f1f5f9;border-radius:8px;margin-block-end:8px;\"></div>
											<div style=\"inline-size:60%;block-size:10px;background:#e2e8f0;border-radius:4px;margin-block-end:6px;\"></div>
											<div style=\"inline-size:40%;block-size:10px;background:#e2e8f0;border-radius:4px;\"></div>
										</div>
									`).join('')}
								</div>
							`;
						case 'carousel':
							return `
								<div class=\"preview-carousel\" style=\"position:relative;overflow:hidden;border-radius:12px;background:linear-gradient(135deg,var(--primary),#0ea5e9);color:#fff;padding:16px;\">
									<div style=\"display:flex;gap:12px;align-items:center;\">
										<div style=\"inline-size:48px;block-size:48px;background:rgba(255,255,255,.25);border-radius:8px;\"></div>
										<div>
											<div style=\"font-weight:800;font-size:16px;\">شرائح ترويجية</div>
											<div style=\"opacity:.9;\">اعرض عروضك بشكل جذاب</div>
										</div>
									</div>
									<div style=\"display:flex;gap:6px;justify-content:center;margin-block-start:12px;\">
										<span style=\"inline-size:8px;block-size:8px;border-radius:999px;background:#fff;opacity:.9;\"></span>
										<span style=\"inline-size:8px;block-size:8px;border-radius:999px;background:#fff;opacity:.5;\"></span>
										<span style=\"inline-size:8px;block-size:8px;border-radius:999px;background:#fff;opacity:.5;\"></span>
									</div>
								</div>
							`;
						default:
							return `
								<div class=\"preview-hero\" style=\"background:linear-gradient(135deg,var(--primary),#22d3ee);color:#fff;border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;\">
									<span class=\"badge\" style=\"background:rgba(255,255,255,.2);backdrop-filter:blur(6px);border-radius:999px;padding-inline:10px;padding-block:4px;align-self:flex-start;\">واجهة كاملة</span>
									<h4 style=\"margin:0;\">${escapeHtml(state.store.storeName || '')}</h4>
									<p style=\"margin:0;opacity:.95;\">${escapeHtml(state.store.storeDescription || 'معاينة لواجهة صفحتك')}<\/p>
									<button class=\"btn btn-primary\" style=\"background:#fff;color:#0f172a;border:none;inline-size:max-content;\">تسوق الآن<\/button>
								<\/div>
							`;
					}
					})(layoutId);
				}
				// تفعيل الكارت المختار
				document.querySelectorAll('.template-card').forEach(card => {
					card.classList.toggle('active', card.dataset.layout === layoutId);
				});
				try {
					await updateStore({ landingLayout: layoutId }, 'تم تحديث تخطيط صفحة المتجر');
					// بث التغيير للألسنة المفتوحة للمتجر (الواجهة العامة)
					try {
						localStorage.setItem(`store:layout:${state.store._id}`, layoutId);
						if ('BroadcastChannel' in window) {
							const ch = new BroadcastChannel('store-layout');
							ch.postMessage({ storeId: state.store._id, layout: layoutId });
						}
					} catch (_) {}
				} catch (err) {
					showToast(err.message || 'تعذر تحديث تخطيط صفحة المتجر', 'error');
				}
			});
		});


		// Banner handlers
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
				showToast('تم رفع صورة البنر');
			} catch (err) {
				showToast(err.message || 'تعذر رفع الصورة', 'error');
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
				await updateStore(payload, 'تم حفظ إعدادات البنر');
			} catch (err) {
				showToast(err.message || 'تعذر حفظ إعدادات البنر', 'error');
			}
		});

		// Extra section
		saveExtraBtn?.addEventListener('click', async () => {
			try {
				await updateStore({
					extraSectionEnabled: !!extraEnabled?.checked,
					extraSectionLabel: (extraLabel?.value || '').trim(),
					extraSectionUrl: (extraUrl?.value || '').trim()
				}, 'تم حفظ إعداد زر القسم الخارجي');
			} catch (err) {
				showToast(err.message || 'تعذر حفظ الإعداد', 'error');
			}
		});

		// Support widget
		fetchChatLinkBtn?.addEventListener('click', async () => {
			try {
				const data = await handleApiRequest(`/api/chat-page/bot/${state.selectedBotId}`, { headers: { Authorization: `Bearer ${state.token}` } }, null, 'تعذر جلب رابط صفحة الدردشة');
				supportChatLink.value = data.link || '';
				showToast('تم جلب الرابط تلقائياً');
			} catch (err) {
				showToast(err.message || 'تعذر جلب الرابط تلقائياً', 'error');
			}
		});

		saveSupportBtn?.addEventListener('click', async () => {
			try {
				await updateStore({
					supportFloatingEnabled: !!supportEnabled?.checked,
					supportChatLink: (supportChatLink?.value || '').trim()
				}, 'تم حفظ إعداد زر الدعم');
			} catch (err) {
				showToast(err.message || 'تعذر حفظ الإعداد', 'error');
			}
		});
	}

	function renderCatalogPanel() {
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
				<div id="categoriesList">${renderCategoriesTable()}</div>
			</div>

			<div class="store-card">
				<h3><i class="fas fa-boxes"></i> إدارة المنتجات</h3>
				<div class="catalog-toolbar">
					<div class="toolbar-group">
						<input type="text" id="productSearchInput" placeholder="بحث عن منتج" value="${escapeHtml(state.productSearch)}">
						<select id="productCategoryFilter">
							<option value="all" ${state.productCategoryFilter === 'all' ? 'selected' : ''}>كل الأقسام</option>
							${state.categories.map((category) => `<option value="${category._id}" ${state.productCategoryFilter === category._id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}
						</select>
					</div>
					<div class="toolbar-group">
						<button class="btn btn-secondary btn-sm" id="refreshProductsBtn"><i class="fas fa-sync"></i> تحديث</button>
						<button class="btn btn-secondary btn-sm" id="exportProductsCsv"><i class="fas fa-file-download"></i> تصدير المنتجات CSV</button>
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
							${renderProductsRows()}
						</tbody>
					</table>
				</div>
				${renderProductsPagination()}
			</div>
		`;

		bindCategoryForm();
		bindProductToolbar();
	}

	function renderCategoriesTable() {
		if (!state.categories.length) {
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
								<td>${escapeHtml(category.name)}</td>
								<td>${escapeHtml(category.description || '-')}</td>
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

	function bindCategoryForm() {
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
				showToast('اسم القسم يجب أن يكون 3 أحرف على الأقل', 'error');
				return;
			}

			try {
				await handleApiRequest(`/api/categories/${state.store._id}/categories`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${state.token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ categoryName, categoryDescription }),
				}, null, 'فشل في إضافة القسم');

				nameInput.value = '';
				descInput.value = '';

				await fetchInitialStoreData();
				renderStoreDashboard();
				showToast('تم إضافة القسم بنجاح');
			} catch (err) {
				showToast(err.message || 'تعذر إضافة القسم', 'error');
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
					await handleApiRequest(`/api/categories/${state.store._id}/categories/${categoryId}`, {
						method: 'PUT',
						headers: {
							Authorization: `Bearer ${state.token}`,
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ categoryName: newName.trim(), categoryDescription: newDescription.trim() }),
					}, null, 'فشل في تحديث القسم');
					await fetchInitialStoreData();
					renderStoreDashboard();
					showToast('تم تحديث القسم', 'success');
				} catch (err) {
					showToast(err.message || 'تعذر تحديث القسم', 'error');
				}
			} else if (action === 'delete-category') {
				if (!confirm('هل أنت متأكد من حذف هذا القسم؟')) return;
				try {
					await handleApiRequest(`/api/categories/${state.store._id}/categories/${categoryId}`, {
						method: 'DELETE',
						headers: { Authorization: `Bearer ${state.token}` },
					}, null, 'فشل في حذف القسم');
					await fetchInitialStoreData();
					renderStoreDashboard();
					showToast('تم حذف القسم', 'success');
				} catch (err) {
					showToast(err.message || 'تعذر حذف القسم', 'error');
				}
			}
		});
	}

	function renderProductsRows() {
		if (!state.products.length) {
			return '<tr><td colspan="7">لم يتم إضافة منتجات بعد.</td></tr>';
		}

		return state.products.map((product) => `
			<tr data-id="${product._id}">
				<td>
					<div class="product-info">
						${product.imageUrl ? `<img src="${product.imageUrl}" alt="${escapeHtml(product.productName)}">` : '<div class="placeholder-img"></div>'}
						<div>
							<strong>${escapeHtml(product.productName)}</strong>
							${product.hasOffer ? '<span class="offer-tag">عرض خاص</span>' : ''}
							${Number(product.stock) === 0 ? '<div class="badge" style="background:#fee2e2;color:#991b1b;margin-top:4px;">غير متوفر — مخفي بالمتجر مؤقتًا</div>' : ''}
						</div>
					</div>
				</td>
				<td>${product.category?.name ? escapeHtml(product.category.name) : '-'}</td>
				<td>${formatCurrency(product.price, product.currency)}</td>
				<td>${product.stock}</td>
				<td>${product.hasOffer ? formatCurrency(product.discountedPrice, product.currency) : '-'}</td>
				<td>${product.salesCount || 0}</td>
				<td class="table-actions">
					<button class="btn btn-secondary btn-sm" data-action="edit-product" data-id="${product._id}"><i class="fas fa-edit"></i></button>
					<button class="btn btn-danger btn-sm" data-action="delete-product" data-id="${product._id}"><i class="fas fa-trash"></i></button>
				</td>
			</tr>
		`).join('');
	}

	function renderProductsPagination() {
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

	function bindProductToolbar() {
		const searchInput = document.getElementById('productSearchInput');
		const filterSelect = document.getElementById('productCategoryFilter');
		const refreshBtn = document.getElementById('refreshProductsBtn');
		const addBtn = document.getElementById('addProductBtn');
		const exportBtn = document.getElementById('exportProductsCsv');
		const tableBody = document.getElementById('productsTableBody');

		if (searchInput) {
			searchInput.addEventListener('input', debounce(async (event) => {
				state.productSearch = event.target.value.trim();
				state.productPage = 1;
				await fetchInitialStoreData();
				renderStoreDashboard();
			}));
		}

		filterSelect?.addEventListener('change', async (event) => {
			state.productCategoryFilter = event.target.value;
			state.productPage = 1;
			await fetchInitialStoreData();
			renderStoreDashboard();
		});

		refreshBtn?.addEventListener('click', async (event) => {
			event.preventDefault();
			await fetchInitialStoreData();
			renderStoreDashboard();
			showToast('تم تحديث قائمة المنتجات');
		});

		exportBtn?.addEventListener('click', async (event) => {
			event.preventDefault();
			const btn = event.currentTarget;
			const original = btn.innerHTML;
			btn.disabled = true;
			btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التصدير...';
			try {
				await exportProductsToCsv();
			} finally {
				btn.disabled = false;
				btn.innerHTML = original;
			}
		});

		addBtn?.addEventListener('click', () => {
			openProductModal('create');
		});

		tableBody?.addEventListener('click', (event) => {
			const button = event.target.closest('button[data-action]');
			if (!button) return;
			const action = button.dataset.action;
			const productId = button.dataset.id;
			const product = state.products.find((item) => item._id === productId) || state.catalogSnapshot.find((item) => item._id === productId);

			if (action === 'edit-product') {
				openProductModal('edit', product);
			} else if (action === 'delete-product') {
				if (!confirm('هل أنت متأكد من حذف المنتج؟')) return;
				deleteProduct(productId);
			}
		});

		document.getElementById('prevProductsPage')?.addEventListener('click', async () => {
			if (state.productPage === 1) return;
			state.productPage -= 1;
			await fetchInitialStoreData();
			renderStoreDashboard();
		});

		document.getElementById('nextProductsPage')?.addEventListener('click', async () => {
			const totalPages = Math.max(1, Math.ceil((state.productTotal || 0) / state.productPageSize));
			if (state.productPage >= totalPages) return;
			state.productPage += 1;
			await fetchInitialStoreData();
			renderStoreDashboard();
		});
	}

	async function deleteProduct(productId) {
		try {
			await handleApiRequest(`/api/products/${state.store._id}/products/${productId}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${state.token}` },
			}, null, 'فشل في حذف المنتج');
			await fetchInitialStoreData();
			renderStoreDashboard();
			showToast('تم حذف المنتج', 'success');
		} catch (err) {
			showToast(err.message || 'تعذر حذف المنتج', 'error');
		}
	}

	function openProductModal(mode, product = null) {
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
							<input type="text" id="productNameInput" name="productName" value="${product ? escapeHtml(product.productName || '') : ''}" required>
						</div>
						<div class="form-group">
							<label for="productCategorySelect">القسم</label>
							<select id="productCategorySelect" name="category">
								<option value="">بدون قسم</option>
								${state.categories.map((category) => `<option value="${category._id}" ${product?.category?._id === category._id || product?.category === category._id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('')}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label for="productDescriptionInput">وصف المنتج</label>
						<textarea id="productDescriptionInput" name="description" rows="3">${product ? escapeHtml(product.description || '') : ''}</textarea>
					</div>

					<div class="form-group">
						<label for="productDetailedDescriptionInput">الوصف التفصيلي</label>
						<textarea id="productDetailedDescriptionInput" name="detailedDescription" rows="5">${product ? escapeHtml(product.detailedDescription || '') : ''}</textarea>
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
						${product?.imageUrl ? `<img src="${product.imageUrl}" alt="${escapeHtml(product.productName)}" class="preview-thumb">` : ''}
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
		overlay.addEventListener('click', (event) => {
			if (event.target === overlay) {
				closeModal();
			}
		});

		bindProductForm(overlay, mode, product, closeModal);
	}

	function bindProductForm(overlay, mode, product, closeModal) {
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

			// remove handlers
			galleryList.querySelectorAll('[data-remove]')?.forEach(btn => {
				btn.addEventListener('click', () => {
					const i = Number(btn.getAttribute('data-remove'));
					images.splice(i, 1);
					renderGallery();
				});
			});

			// drag-n-drop reorder
			let dragIndex = null;
			galleryList.querySelectorAll('.gallery-item')?.forEach(item => {
				item.addEventListener('dragstart', (e) => {
					dragIndex = Number(item.dataset.idx);
					e.dataTransfer.effectAllowed = 'move';
				});
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

		// initial render for existing images
		renderGallery();

		// upload newly selected images immediately and append to list
		galleryInput?.addEventListener('change', async () => {
			if (!galleryInput.files?.length) return;
			for (const file of galleryInput.files) {
				try {
					const fdUp = new FormData();
					fdUp.append('image', file);
					const res = await fetch('/api/upload', { method: 'POST', body: fdUp });
					if (!res.ok) throw new Error('تعذر رفع الصورة');
					const data = await res.json();
					if (data?.imageUrl) {
						images.push(data.imageUrl);
						renderGallery();
					}
				} catch (e) {
					showToast(e.message || 'فشل رفع الصورة', 'error');
				}
			}
			// reset input so same files can be chosen again if needed
			galleryInput.value = '';
		});

		const toggleOfferFields = () => {
			offerFields?.classList.toggle('visible', hasOfferCheckbox.checked);
		};

		hasOfferCheckbox?.addEventListener('change', toggleOfferFields);

		const toggleOptionsFields = () => {
			optionsFields?.classList.toggle('visible', hasOptionsCheckbox.checked);
		};
		hasOptionsCheckbox?.addEventListener('change', toggleOptionsFields);

		// إدارة مجموعات الخيارات
		let optionGroups = Array.isArray(product?.optionGroups) ? product.optionGroups.map(g => ({
			name: g.name || '',
			values: Array.isArray(g.values) ? g.values : [],
			required: !!g.required
		})) : [];

		function renderOptionGroups() {
			if (!optionGroupsList) return;
			optionGroupsList.innerHTML = optionGroups.map((g, idx) => `
				<div class="option-group-item" data-idx="${idx}" style="border:1px solid #e5e7eb;border-radius:10px;padding:10px;margin-block-end:8px;">
					<div class="form-grid-two">
						<div class="form-group">
							<label>اسم المجموعة</label>
							<input type="text" data-field="name" value="${escapeHtml(g.name)}" placeholder="مثال: الألوان">
						</div>
						<div class="form-group">
							<label>القيم (مفصولة بفواصل)</label>
							<input type="text" data-field="values" value="${escapeHtml(g.values.join(', '))}" placeholder="أحمر, أزرق, أخضر">
						</div>
					</div>
					<label class="toggle"><input type="checkbox" data-field="required" ${g.required ? 'checked' : ''}><span>هذه المجموعة مطلوبة</span></label>
					<div class="form-actions" style="display:flex;gap:8px;margin-block-start:8px;">
						<button type="button" class="btn btn-danger btn-sm" data-action="remove"><i class="fas fa-trash"></i> إزالة المجموعة</button>
					</div>
				</div>
			`).join('');

			// ربط الحقول
			optionGroupsList.querySelectorAll('.option-group-item').forEach(item => {
				const idx = Number(item.dataset.idx);
				item.querySelector('[data-field="name"]').addEventListener('input', (e) => { optionGroups[idx].name = e.target.value; });
				item.querySelector('[data-field="values"]').addEventListener('input', (e) => {
					const raw = String(e.target.value || '');
					optionGroups[idx].values = raw.split(/[ ,،;؛\n]+/).map(s => s.trim()).filter(Boolean);
				});
				item.querySelector('[data-field="required"]').addEventListener('change', (e) => { optionGroups[idx].required = e.target.checked; });
				item.querySelector('[data-action="remove"]').addEventListener('click', () => { optionGroups.splice(idx,1); renderOptionGroups(); });
			});
		}

		addOptionGroupBtn?.addEventListener('click', () => {
			optionGroups.push({ name: '', values: [], required: false });
			renderOptionGroups();
		});

		// بدءي
		renderOptionGroups();

		form?.addEventListener('submit', async (event) => {
			event.preventDefault();
			const formData = new FormData();

			formData.append('productName', form.productName.value.trim());
			formData.append('description', form.description.value.trim());
			formData.append('detailedDescription', (form.detailedDescription?.value || '').trim());
			formData.append('price', form.price.value);
			formData.append('currency', form.currency.value);
			formData.append('stock', form.stock.value);
			formData.append('lowStockThreshold', form.lowStockThreshold.value);
			if (form.category.value) {
				formData.append('category', form.category.value);
			}

			if (hasOfferCheckbox.checked) {
				formData.append('hasOffer', 'yes');
				formData.append('originalPrice', form.originalPrice.value);
				formData.append('discountedPrice', form.discountedPrice.value);
			} else {
				formData.append('hasOffer', 'no');
			}

			if (hasOptionsCheckbox.checked) {
				formData.append('optionsEnabled', 'yes');
				// تنظيف المجموعات الفارغة
				const cleaned = optionGroups
					.map(g => ({ name: (g.name||'').trim(), values: (g.values||[]).map(v=>v.trim()).filter(Boolean), required: !!g.required }))
					.filter(g => g.name && g.values.length);
				formData.append('optionGroups', JSON.stringify(cleaned));
			} else {
				formData.append('optionsEnabled', 'no');
			}

			const imageInput = form.image;
			if (imageInput?.files?.length) {
				formData.append('image', imageInput.files[0]);
			}
			if (images.length) {
				formData.append('images', JSON.stringify(images));
			}

			const requestOptions = {
				method: mode === 'create' ? 'POST' : 'PUT',
				headers: {
					Authorization: `Bearer ${state.token}`,
				},
				body: formData,
			};

			const url = mode === 'create'
				? `/api/products/${state.store._id}/products`
				: `/api/products/${state.store._id}/products/${product._id}`;

			try {
				await handleApiRequest(url, requestOptions, null, mode === 'create' ? 'فشل في إضافة المنتج' : 'فشل في تحديث المنتج');
				closeModal();
				await fetchInitialStoreData();
				renderStoreDashboard();
				showToast(mode === 'create' ? 'تم إضافة المنتج بنجاح' : 'تم تحديث المنتج', 'success');
			} catch (err) {
				showToast(err.message || 'تعذر حفظ المنتج', 'error');
			}
		});
	}

	function renderOrdersPanel() {
		const panel = document.getElementById('store-orders-panel');
		if (!panel) return;

		if (!state.orders.length) {
			panel.innerHTML = '<div class="store-card"><p>لا توجد طلبات حالياً.</p></div>';
			return;
		}

		panel.innerHTML = `
			<div class="store-card">
				<div class="orders-toolbar">
					<button class="btn btn-secondary btn-sm" id="refreshOrdersBtn"><i class="fas fa-sync"></i> تحديث</button>
					<button class="btn btn-primary btn-sm" id="exportOrdersCsv"><i class="fas fa-file-export"></i> تصدير CSV</button>
				</div>
				<div class="orders-list">
					${state.orders.map((order) => renderOrderCard(order)).join('')}
				</div>
			</div>
		`;

		bindOrdersPanel();
	}

	function renderOrderCard(order) {
		const total = formatCurrency(order.totalPrice, state.analytics.currency);
		const statusLabel = STATUS_LABELS[order.status] || order.status;
				const items = Array.isArray(order.products)
						? order.products.map((item) => {
								const name = escapeHtml(resolveProductName(item.productId));
								const opts = Array.isArray(item.selectedOptions) && item.selectedOptions.length
									? `<div class="order-item-opts">${item.selectedOptions.map(o => `${escapeHtml(o.name)}: ${escapeHtml(o.value)}`).join(' ، ')}</div>`
									: '';
								return `<li>
									<div>
										<span>${item.quantity} × ${name}</span>
										${opts}
									</div>
									<span>${formatCurrency(item.price, state.analytics.currency)}</span>
								</li>`;
							}).join('')
						: '<li>لا توجد بيانات منتجات</li>';
		const history = Array.isArray(order.history) ? order.history : [];

		return `
			<div class="order-card" data-id="${order._id}">
				<div class="order-card-header">
					<div>
						<h4>#${escapeHtml(order._id.slice(-6))}</h4>
						<p>${formatDate(order.createdAt)}</p>
					</div>
					<div class="order-status">
						<select data-action="change-status" data-id="${order._id}">
							${Object.entries(STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`).join('')}
						</select>
						<span class="status-badge status-${order.status}">${statusLabel}</span>
					</div>
				</div>
				<div class="order-card-body">
					<div class="order-info">
						<p><strong>إجمالي الطلب:</strong> ${total}</p>
						<p><strong>طريقة الدفع:</strong> ${order.paymentMethod === 'whatsapp_confirmation' ? 'التواصل عبر واتساب' : 'الدفع عند الاستلام'}</p>
						${order.customerName ? `<p><strong>العميل:</strong> ${escapeHtml(order.customerName)}</p>` : ''}
						${order.customerWhatsapp ? `<p><strong>واتساب العميل:</strong> ${escapeHtml(order.customerWhatsapp)}</p>` : ''}
						${order.customerEmail ? `<p><strong>البريد:</strong> ${escapeHtml(order.customerEmail)}</p>` : ''}
						${order.customerAddress ? `<p><strong>العنوان:</strong> ${escapeHtml(order.customerAddress)}</p>` : ''}
						${order.customerNote ? `<p><strong>ملاحظات:</strong> ${escapeHtml(order.customerNote)}</p>` : ''}
					</div>
					<div class="order-items">
						<h5>المنتجات</h5>
						<ul>${items}</ul>
					</div>
				</div>
				<details class="order-history">
					<summary><i class="fas fa-history"></i> سجل التغييرات</summary>
					<ul>
						${history.length ? history.map((entry) => `<li><span>${formatDate(entry.changedAt)}</span><span>${STATUS_LABELS[entry.status] || entry.status}</span><span>${escapeHtml(entry.note || '')}</span></li>`).join('') : '<li>لا يوجد تغييرات مسجلة.</li>'}
					</ul>
				</details>
			</div>
		`;
	}

	function resolveProductName(productId) {
		if (!productId) return 'منتج غير معروف';
		const fromCatalog = state.catalogSnapshot.find((product) => String(product._id) === String(productId));
		if (fromCatalog) return fromCatalog.productName;
		const fromPage = state.products.find((product) => String(product._id) === String(productId));
		return fromPage ? fromPage.productName : 'منتج غير معروف';
	}

	function bindOrdersPanel() {
		const panel = document.getElementById('store-orders-panel');
		if (!panel) return;

		panel.addEventListener('change', async (event) => {
			const select = event.target.closest('select[data-action="change-status"]');
			if (!select) return;
			const orderId = select.dataset.id;
			const status = select.value;
			try {
				await handleApiRequest(`/api/orders/${state.store._id}/orders/${orderId}`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${state.token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ status }),
				}, null, 'فشل في تحديث الطلب');
				showToast('تم تحديث حالة الطلب', 'success');
				await fetchInitialStoreData();
				renderStoreDashboard();
			} catch (err) {
				showToast(err.message || 'تعذر تحديث حالة الطلب', 'error');
			}
		});

		document.getElementById('refreshOrdersBtn')?.addEventListener('click', async () => {
			await fetchInitialStoreData();
			renderStoreDashboard();
			showToast('تم تحديث قائمة الطلبات');
		});

		document.getElementById('exportOrdersCsv')?.addEventListener('click', exportOrdersToCsv);
	}

	function exportOrdersToCsv() {
		if (!state.orders.length) {
			showToast('لا توجد طلبات للتصدير', 'info');
			return;
		}
		const headers = ['Order ID', 'Status', 'Total', 'Payment Method', 'Created At'];
		const rows = state.orders.map((order) => [
			order._id,
			STATUS_LABELS[order.status] || order.status,
			Number(order.totalPrice) || 0,
			order.paymentMethod,
			formatDate(order.createdAt),
		]);
		downloadCsv('orders.csv', [headers, ...rows]);
	}

	async function exportProductsToCsv() {
		try {
			const storeId = state.store?._id;
			if (!storeId) throw new Error('معرّف المتجر غير متاح');
			const headersAuth = { Authorization: `Bearer ${state.token}` };
			const pageSize = 500;
			let page = 1;
			let total = 0;
			const allProducts = [];

			// اجلب كل الصفحات لغاية ما نوصل للإجمالي
			while (true) {
				const url = `/api/products/${storeId}/products?limit=${pageSize}&page=${page}`;
				const resp = await handleApiRequest(url, { headers: headersAuth }, null, 'فشل في جلب المنتجات');
				const list = Array.isArray(resp?.products) ? resp.products : [];
				total = Number(resp?.total) || (total || 0);
				allProducts.push(...list);
				if (!resp || !list.length || allProducts.length >= total) break;
				page += 1;
				if (page > 1000) break; // حارس أمان
			}

			if (!allProducts.length) {
				showToast('لا توجد منتجات للتصدير', 'info');
				return;
			}

			const headers = ['Product ID', 'Name', 'Category', 'Price', 'Currency', 'Stock', 'Sales'];
			const rows = allProducts.map((product) => [
				product._id,
				product.productName,
				product.category?.name || '',
				Number(product.price) || 0,
				product.currency,
				product.stock,
				product.salesCount || 0,
			]);
			downloadCsv('products.csv', [headers, ...rows]);
			showToast(`تم تصدير ${formatNumber(allProducts.length)} منتج`, 'success');
		} catch (err) {
			showToast(err.message || 'تعذر تصدير المنتجات', 'error');
		}
	}

	function downloadCsv(filename, rows) {
		const csvContent = rows.map((row) => row.map((cell) => {
			const value = cell === null || cell === undefined ? '' : String(cell).replace(/"/g, '""');
			return `"${value}"`;
		}).join(',')).join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	function renderAnalyticsPanel() {
		const panel = document.getElementById('store-analytics-panel');
		if (!panel) return;

		const metrics = state.analytics || {};

		panel.innerHTML = `
			<div class="store-card analytics-summary">
				<div class="metric">
					<h4>إجمالي المبيعات</h4>
					<p>${formatCurrency(metrics.totalRevenue || 0, metrics.currency)}</p>
				</div>
				<div class="metric">
					<h4>متوسط قيمة الطلب</h4>
					<p>${formatCurrency(metrics.averageOrderValue || 0, metrics.currency)}</p>
				</div>
				<div class="metric">
					<h4>مبيعات هذا الشهر</h4>
					<p>${formatCurrency(metrics.currentMonthRevenue || 0, metrics.currency)}</p>
				</div>
				<div class="metric">
					<h4>الطلبات المكتملة</h4>
					<p>${formatNumber(metrics.deliveredOrders || 0)}</p>
				</div>
			</div>

			<div class="store-card analytics-chart">
				<h3><i class="fas fa-chart-line"></i> حالة الطلبات</h3>
				<div class="status-bar">
					${renderStatusBarSegment('pending', metrics.pendingOrders, metrics.totalOrders)}
					${renderStatusBarSegment('confirmed', metrics.confirmedOrders, metrics.totalOrders)}
					${renderStatusBarSegment('shipped', metrics.shippedOrders, metrics.totalOrders)}
					${renderStatusBarSegment('delivered', metrics.deliveredOrders, metrics.totalOrders)}
					${renderStatusBarSegment('cancelled', metrics.cancelledOrders, metrics.totalOrders)}
				</div>
				<ul class="status-legend">
					<li><span class="status-dot status-pending"></span> معلق (${formatNumber(metrics.pendingOrders || 0)})</li>
					<li><span class="status-dot status-confirmed"></span> مؤكد (${formatNumber(metrics.confirmedOrders || 0)})</li>
					<li><span class="status-dot status-shipped"></span> تم الشحن (${formatNumber(metrics.shippedOrders || 0)})</li>
					<li><span class="status-dot status-delivered"></span> تم التسليم (${formatNumber(metrics.deliveredOrders || 0)})</li>
					<li><span class="status-dot status-cancelled"></span> ملغي (${formatNumber(metrics.cancelledOrders || 0)})</li>
				</ul>
			</div>

			<div class="store-card analytics-downloads">
				<h3><i class="fas fa-file-export"></i> تصدير التقارير</h3>
				<div class="report-actions">
					<button class="btn btn-primary btn-sm" id="exportOrdersDetailed"><i class="fas fa-file-csv"></i> تصدير الطلبات CSV</button>
				</div>
				<p class="input-hint">قم بتحميل بيانات الطلبات لاستخدامها في Excel أو Google Sheets أو أدوات المحاسبة.</p>
			</div>
		`;

		document.getElementById('exportOrdersDetailed')?.addEventListener('click', exportOrdersToCsv);
	}

		function renderStatusBarSegment(status, count = 0, total = 0) {
			const safeTotal = total || 0;
			const percent = safeTotal > 0 ? Math.round((count / safeTotal) * 100) : 0;
			return `<div class="status-segment status-${status}" style="--progress:${percent};">${percent >= 10 ? `${percent}%` : ''}</div>`;
	}

	async function updateStore(payload, successMessage) {
		try {
			state.store = await handleApiRequest(`/api/stores/${state.store._id}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${state.token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			}, null, 'فشل في تحديث بيانات المتجر');
			await fetchInitialStoreData();
			renderStoreDashboard();
			if (successMessage) {
				showToast(successMessage, 'success');
			}
		} catch (err) {
			throw err;
		}
	}

	function renderCreateStoreView() {
		if (!state.contentEl) return;

		state.slugManuallyEdited = false;

		state.contentEl.innerHTML = `
			<div class="store-manager-empty" dir="rtl">
				<div class="floating-welcome">
					<h2>مرحباً بك في نظام المتاجر الذكية من ZainBot</h2>
					<p>ابدأ ببناء متجر احترافي متكامل مع نظام المحاسبات وإدارة الطلبات في دقائق.</p>
					<ul>
						<li>إنشاء صفحة هبوط مخصصة مع ربط مباشر بمتجرك.</li>
						<li>دعم الدفع عند الاستلام أو المتابعة عبر واتساب.</li>
						<li>تحليلات لحظية للمبيعات وحالة المخزون.</li>
					</ul>
				</div>

				<div class="store-card create-store-card">
					<h3><i class="fas fa-store"></i> إنشاء متجرك الأول</h3>
					<form id="createStoreForm">
						<div class="form-grid-two">
							<div class="form-group">
								<label for="newStoreName">اسم المتجر</label>
								<input type="text" id="newStoreName" name="storeName" placeholder="مثال: متجر النيل للأدوات المنزلية" minlength="3" required>
							</div>
							<div class="form-group">
								<label for="newStoreLink">رابط المتجر (إنجليزي فقط)</label>
								<div class="input-with-action">
									<input type="text" id="newStoreLink" name="storeLink" placeholder="مثال: nile-store" pattern="^[a-zA-Z0-9_-]{4,}$" required>
									<button type="button" class="btn btn-secondary btn-sm" id="checkNewStoreLink"><i class="fas fa-check-circle"></i> تحقق</button>
								</div>
								<small class="input-hint">سيظهر الرابط بهذا الشكل: ${escapeHtml(`${window.location.origin}/store/`)}<span id="storeLinkPreview">...</span></small>
								<div class="field-feedback" id="newStoreLinkFeedback"></div>
							</div>
						</div>

						<div class="form-grid-two">
							<div class="form-group">
								<label for="templateSelect">اختيار القالب</label>
								<select id="templateSelect" name="landingLayout">
									<option value="layout1">كلاسيكي</option>
									<option value="layout2">مودرن</option>
									<option value="layout3">خيال</option>
								</select>
							</div>
						</div>

						<div class="form-grid-two">
							<div class="form-group">
								<label for="primaryColorNew">اللون الأساسي</label>
								<input type="color" id="primaryColorNew" name="primaryColor" value="#00C4B4">
							</div>
						</div>

						<div class="form-grid-two">
							<div class="form-group">
								<label for="whatsappNew">رقم واتساب</label>
								<input type="text" id="whatsappNew" name="whatsapp" placeholder="مثال: 201234567890+">
							</div>
						</div>

						<div class="form-group">
							<label class="toggle">
								<input type="checkbox" id="enableCartNew" name="enableCart" checked>
								<span>تفعيل عربة التسوق (يمكن تعطيلها لاحقاً من الإعدادات)</span>
							</label>
						</div>

						<div class="form-actions">
							<button type="submit" class="btn btn-primary"><i class="fas fa-rocket"></i> إنشاء المتجر الآن</button>
						</div>
					</form>
				</div>
			</div>
		`;

		bindCreateStoreForm();
	}

	function bindCreateStoreForm() {
		const form = document.getElementById('createStoreForm');
		if (!form) return;

		const nameInput = document.getElementById('newStoreName');
		const linkInput = document.getElementById('newStoreLink');
		const linkPreview = document.getElementById('storeLinkPreview');
		const feedback = document.getElementById('newStoreLinkFeedback');
		const checkBtn = document.getElementById('checkNewStoreLink');

		const syncSlug = () => {
			if (state.slugManuallyEdited) return;
			const slug = slugify(nameInput.value);
			linkInput.value = slug;
			linkPreview.textContent = slug || '...';
		};

		nameInput?.addEventListener('input', () => {
			syncSlug();
		});

		linkInput?.addEventListener('input', () => {
			state.slugManuallyEdited = true;
			linkPreview.textContent = linkInput.value.trim() || '...';
		});

		checkBtn?.addEventListener('click', async () => {
			const slug = linkInput.value.trim();
			if (!isValidSlug(slug)) {
				feedback.textContent = 'الرابط يجب أن يكون باللغة الإنجليزية وبحد أدنى 4 أحرف.';
				feedback.className = 'field-feedback error';
				return;
			}
			try {
				const { available } = await handleApiRequest(`/api/stores/check-link/${slug}`, {}, null, 'فشل في التحقق من الرابط');
				feedback.textContent = available ? 'الرابط متاح للحجز.' : 'الرابط مستخدم بالفعل.';
				feedback.className = `field-feedback ${available ? 'success' : 'error'}`;
			} catch (err) {
				feedback.textContent = err.message || 'تعذر التحقق حالياً.';
				feedback.className = 'field-feedback error';
			}
		});

		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			const storeName = nameInput.value.trim();
			const storeLink = linkInput.value.trim();

			if (!isValidSlug(storeLink)) {
				feedback.textContent = 'الرابط يجب أن يكون باللغة الإنجليزية وبحد أدنى 4 أحرف.';
				feedback.className = 'field-feedback error';
				return;
			}

			const payload = {
				storeName,
				storeLink,
				primaryColor: form.primaryColor.value,
				whatsapp: form.whatsapp.value.trim(),
				enableCart: form.enableCart.checked,
				landingLayout: form.landingLayout.value,
				selectedBotId: state.selectedBotId,
			};

			try {
				await handleApiRequest('/api/stores', {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${state.token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(payload),
				}, null, 'فشل في إنشاء المتجر');

				showToast('تم إنشاء المتجر بنجاح!');
				await loadStoreManagerPage();
			} catch (err) {
				feedback.textContent = err.message || 'تعذر إنشاء المتجر.';
				feedback.className = 'field-feedback error';
			}
		});
	}

	window.loadStoreManagerPage = loadStoreManagerPage;
})();
