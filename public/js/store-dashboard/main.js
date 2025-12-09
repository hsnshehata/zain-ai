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
		sales: [],
		salesPage: 1,
		salesPageSize: 20,
		catalogSnapshot: [],
		contentEl: null,
		slugManuallyEdited: false,
		currentTab: 'overview',
		customerPage: 1,
		customerPageSize: 10,
		customerSearch: '',
		supplierPage: 1,
		supplierPageSize: 10,
		supplierSearch: '',
	};

// Human-friendly status labels used across modules
const STATUS_LABELS = {
	pending: 'قيد المعالجة',
	confirmed: 'مؤكد',
	shipped: 'تم الشحن',
	delivered: 'تم التسليم',
	cancelled: 'ملغي'
};
	function getContentElement() {
		return document.getElementById('content');
	}

	/* Customers module loader: dynamically load /js/store-dashboard/customers.js and initialize it with helpers */
	function ensureCustomersModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.customers && window.storeDashboard.customers._loaded) {
				return resolve(window.storeDashboard.customers);
			}
			const src = '/js/store-dashboard/customers.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/customers.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.customers ? resolve(window.storeDashboard.customers) : reject(new Error('customers module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load customers module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.customers) {
					resolve(window.storeDashboard.customers);
				} else {
					reject(new Error('customers module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load customers module'));
			document.head.appendChild(script);
		});
	}

	/* Suppliers module loader: dynamically load /js/store-dashboard/suppliers.js and initialize it with helpers */
	function ensureSuppliersModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.suppliers && window.storeDashboard.suppliers._loaded) {
				return resolve(window.storeDashboard.suppliers);
			}
			const src = '/js/store-dashboard/suppliers.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/suppliers.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.suppliers ? resolve(window.storeDashboard.suppliers) : reject(new Error('suppliers module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load suppliers module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.suppliers) {
					resolve(window.storeDashboard.suppliers);
				} else {
					reject(new Error('suppliers module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load suppliers module'));
			document.head.appendChild(script);
		});
	}

	/* Purchases module loader: dynamically load /js/store-dashboard/purchases.js and initialize it with helpers */
	function ensurePurchasesModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.purchases && window.storeDashboard.purchases._loaded) {
				return resolve(window.storeDashboard.purchases);
			}
			const src = '/js/store-dashboard/purchases.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/purchases.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.purchases ? resolve(window.storeDashboard.purchases) : reject(new Error('purchases module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load purchases module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.purchases) {
					resolve(window.storeDashboard.purchases);
				} else {
					reject(new Error('purchases module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load purchases module'));
			document.head.appendChild(script);
		});
	}

	// expose to global loader which may call it before module functions
	window.getContentElement = getContentElement;

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
							<button class="store-tab-btn ${state.currentTab==='suppliers'?'active':''}" data-tab="suppliers"><i class="fas fa-truck"></i> الموردين</button>
							<button class="store-tab-btn ${state.currentTab==='sales'?'active':''}" data-tab="sales"><i class="fas fa-cash-register"></i> المبيعات</button>
							<button class="store-tab-btn ${state.currentTab==='purchases'?'active':''}" data-tab="purchases"><i class="fas fa-box-open"></i> المشتريات</button>
							<button class="store-tab-btn ${state.currentTab==='debts'?'active':''}" data-tab="debts"><i class="fas fa-wallet"></i> إدارة الديون</button>
							<button class="store-tab-btn ${state.currentTab==='reports'?'active':''}" data-tab="reports"><i class="fas fa-chart-line"></i> التقارير</button>
							<button class="store-tab-btn ${state.currentTab==='expenses'?'active':''}" data-tab="expenses"><i class="fas fa-money-bill-wave"></i> المصروفات</button>
							<button class="store-tab-btn ${state.currentTab==='staff'?'active':''}" data-tab="staff"><i class="fas fa-user-tie"></i> الموظفين</button>
					</div>
					<div id="store-overview-panel" class="store-tab-panel ${state.currentTab==='overview'?'active':''}"></div>
					<div id="store-design-panel" class="store-tab-panel ${state.currentTab==='design'?'active':''}"></div>
					<div id="store-catalog-panel" class="store-tab-panel ${state.currentTab==='catalog'?'active':''}"></div>
					<div id="store-orders-panel" class="store-tab-panel ${state.currentTab==='orders'?'active':''}"></div>
					<div id="store-customers-panel" class="store-tab-panel ${state.currentTab==='customers'?'active':''}"></div>
					<div id="store-suppliers-panel" class="store-tab-panel ${state.currentTab==='suppliers'?'active':''}"></div>
					<div id="store-purchases-panel" class="store-tab-panel ${state.currentTab==='purchases'?'active':''}"></div>
					<div id="store-debts-panel" class="store-tab-panel ${state.currentTab==='debts'?'active':''}"></div>
					<div id="store-sales-panel" class="store-tab-panel ${state.currentTab==='sales'?'active':''}"></div>
					<div id="store-reports-panel" class="store-tab-panel ${state.currentTab==='reports'?'active':''}"></div>
					<div id="store-expenses-panel" class="store-tab-panel ${state.currentTab==='expenses'?'active':''}"></div>
					<div id="store-staff-panel" class="store-tab-panel ${state.currentTab==='staff'?'active':''}"></div>
					<div id="store-analytics-panel" class="store-tab-panel"></div>
					<div id="store-settings-panel" class="store-tab-panel ${state.currentTab==='settings'?'active':''}"></div>
				</div>
			</div>
		`;

		// Render panels
		renderOverviewPanel();
		renderDesignPanel();
		renderCatalogPanel();
		renderCustomersPanel();
		renderSuppliersPanel();
		renderSalesPanel();
		renderPurchasesPanel();
		renderDebtsPanel();
		renderOrdersPanel();
		renderAnalyticsPanel();
		renderSettingsPanel();
		renderReportsPanel();
		renderExpensesPanel();
		renderEmployeesPanel();

		// Tab navigation
		state.contentEl.querySelectorAll('.store-tab-btn').forEach((btn) => {
			btn.addEventListener('click', () => {
				const tab = btn.dataset.tab;
				if (!tab || tab === state.currentTab) return;
				state.currentTab = tab;
				renderStoreDashboard();
			});
		});

		// Open / copy
		document.getElementById('copyStoreLinkBtn')?.addEventListener('click', async () => {
			try {
				const link = `${window.location.origin}/store/${state.store?.storeLink||''}`;
				await navigator.clipboard.writeText(link);
				showToast('تم نسخ رابط المتجر إلى الحافظة');
			} catch (e) {
				showToast('تعذر نسخ الرابط تلقائياً، انسخه يدويًا', 'error');
			}
		});
	}

	const escapeHtml = (value = '') => {
		return String(value).replace(/[&<>"]/g, (char) => ({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;'
		})[char] || char);
	};




	const formatNumber = (value) => new Intl.NumberFormat('ar-EG').format(Number(value) || 0);

	const formatCurrency = (amount, currency = 'EGP') => {
		const numericAmount = Number(amount) || 0;
		try {
			return new Intl.NumberFormat('ar-EG', { style: 'currency', currency }).format(numericAmount);
		} catch (err) {
			return `${numericAmount.toFixed(2)} ${currency}`;
		}
	};

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
		requestAnimationFrame(() => toast.classList.add('visible'));
		setTimeout(() => {
			toast.classList.remove('visible');
			setTimeout(() => toast.remove(), 300);
		}, 4000);
	};

	async function handleApiRequest(url, options = {}, body = null, errorMessage = 'فشل في العملية') {
		const opts = Object.assign({}, options || {});
		if (body) opts.body = body;
		try {
			const res = await fetch(url, opts);
			const text = await res.text();
			let data = null;
			try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
			if (!res.ok) {
				const msg = (data && data.message) ? data.message : (typeof data === 'string' && data.length ? data : errorMessage);
				throw new Error(msg || errorMessage);
			}
			return data;
		} catch (err) {
			throw new Error(err.message || errorMessage);
		}
	}

	async function fetchInitialStoreData() {
		if (!state.store || !state.store._id) return;
		const headers = { Authorization: `Bearer ${state.token}` };
		const storeId = state.store._id;
		try {
			const [categories, productsResp, orders, snapshotResp, salesResp] = await Promise.all([
				handleApiRequest(`/api/categories/${storeId}/categories`, { headers }).catch(() => []),
				handleApiRequest(`/api/products/${storeId}/products?limit=${state.productPageSize}&page=${state.productPage}${state.productSearch ? `&search=${encodeURIComponent(state.productSearch)}` : ''}${state.productCategoryFilter !== 'all' ? `&category=${encodeURIComponent(state.productCategoryFilter)}` : ''}`, { headers }).catch(() => ({ products: [], total: 0 })),
				handleApiRequest(`/api/orders/${storeId}/orders`, { headers }).catch(() => []),
				handleApiRequest(`/api/products/${storeId}/products?limit=200`, { headers }).catch(() => ({ products: [], total: 0 })),
				handleApiRequest(`/api/sales/${storeId}/sales?limit=200`, { headers }).catch(() => ({ sales: [], total: 0 })),
			]);

			state.categories = Array.isArray(categories) ? categories : [];
			state.products = Array.isArray(productsResp?.products) ? productsResp.products : [];
			state.productTotal = typeof productsResp?.total === 'number' ? productsResp.total : state.products.length;
			state.orders = Array.isArray(orders) ? orders : [];
			state.sales = Array.isArray(salesResp?.sales) ? salesResp.sales : [];
			state.catalogSnapshot = Array.isArray(snapshotResp?.products) ? snapshotResp.products : [];
			state.analytics = state.analytics || {};
			computeAnalytics();
		} catch (err) {
			console.error('Failed to fetch initial store data:', err);
			throw err;
		}
	}

	function computeAnalytics() {
		// lightweight analytics computation for the dashboard
		const analytics = {};
		analytics.totalRevenue = (state.orders || []).reduce((s, o) => s + (Number(o.totalPrice) || 0), 0);
		analytics.totalOrders = (state.orders || []).length;
		analytics.currency = 'EGP';
		analytics.deliveredOrders = (state.orders || []).filter(o => o.status === 'delivered').length;
		analytics.pendingOrders = (state.orders || []).filter(o => o.status === 'pending').length;
		analytics.confirmedOrders = (state.orders || []).filter(o => o.status === 'confirmed').length;
		analytics.shippedOrders = (state.orders || []).filter(o => o.status === 'shipped').length;
		analytics.cancelledOrders = (state.orders || []).filter(o => o.status === 'cancelled').length;
		// build bestsellers list
		const counts = {};
		// prefer using product.salesCount from snapshot if present
		const snapshot = state.catalogSnapshot || [];
		const hasSalesCount = snapshot.some(p => typeof p.salesCount === 'number' && p.salesCount > 0);
		if (hasSalesCount) {
			analytics.bestsellers = snapshot.slice().sort((a,b)=> (b.salesCount||0) - (a.salesCount||0)).slice(0,6);
		} else {
			// aggregate from orders and sales
			(state.orders || []).forEach(o => {
				(o.products || o.items || []).forEach(it => {
					const pid = it.productId || it._id || it.product || '';
					const q = Number(it.quantity || it.qty || it.count || 0) || 0;
					if (!pid) return;
					counts[pid] = (counts[pid] || 0) + q;
				});
			});
			(state.sales || []).forEach(s => {
				(s.items || s.products || []).forEach(it => {
					const pid = it.productId || it._id || it.product || '';
					const q = Number(it.quantity || it.qty || it.count || it.qtyOrdered || 0) || 0;
					if (!pid) return;
					counts[pid] = (counts[pid] || 0) + q;
				});
			});
			const snapshotMap = (state.catalogSnapshot || []).concat(state.products || []);
			analytics.bestsellers = Object.keys(counts).map(pid => {
				const prod = snapshotMap.find(p => String(p._id) === String(pid)) || { productName: 'غير معروف', price: 0, currency: 'EGP' };
				return Object.assign({}, prod, { _salesQty: counts[pid] });
			}).sort((a,b)=> (b._salesQty||0) - (a._salesQty||0)).slice(0,6);
		}
		analytics.lowStock = (state.catalogSnapshot || []).filter(p => Number(p.stock) <= (p.lowStockThreshold || 0));
		analytics.averageOrderValue = analytics.totalOrders ? (analytics.totalRevenue / analytics.totalOrders) : 0;
		analytics.currentMonthRevenue = analytics.totalRevenue; // simplified
		state.analytics = analytics;
	}

	async function renderOverviewPanel() {
		const overview = document.getElementById('store-overview-panel');
		if (!overview) return;

		try {
			const mod = await ensureOverviewModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { escapeHtml, formatNumber, formatCurrency, formatDate, debounce, renderAnalyticsPanel } });
			}
			if (mod && typeof mod.renderPanel === 'function') mod.renderPanel();
		} catch (err) {
			console.error('Failed to load overview module:', err);
			overview.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة النظرة العامة.</p></div>`;
		}
	}

/* Overview module loader: dynamically load /js/store-dashboard/overview.js and initialize it with helpers */
function ensureOverviewModuleLoaded() {
	return new Promise((resolve, reject) => {
		if (window.storeDashboard && window.storeDashboard.overview && window.storeDashboard.overview._loaded) {
			return resolve(window.storeDashboard.overview);
		}
		const src = '/js/store-dashboard/overview.js';
		const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/overview.js'));
		if (existing) {
			existing.addEventListener('load', () => {
				return window.storeDashboard && window.storeDashboard.overview ? resolve(window.storeDashboard.overview) : reject(new Error('overview module failed to load'));
			});
			existing.addEventListener('error', () => reject(new Error('Failed to load overview module')));
			return;
		}
		const script = document.createElement('script');
		script.src = src;
		script.defer = true;
		script.onload = () => {
			if (window.storeDashboard && window.storeDashboard.overview) {
				resolve(window.storeDashboard.overview);
			} else {
				reject(new Error('overview module did not initialize'));
			}
		};
		script.onerror = () => reject(new Error('Failed to load overview module'));
		document.head.appendChild(script);
	});
}

/* Debts module loader: dynamically load /js/store-dashboard/debts.js and initialize it with helpers */
function ensureDebtsModuleLoaded() {
	return new Promise((resolve, reject) => {
		if (window.storeDashboard && window.storeDashboard.debts && window.storeDashboard.debts._loaded) {
			return resolve(window.storeDashboard.debts);
		}
		const src = '/js/store-dashboard/debts.js';
		const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/debts.js'));
		if (existing) {
			existing.addEventListener('load', () => {
				return window.storeDashboard && window.storeDashboard.debts ? resolve(window.storeDashboard.debts) : reject(new Error('debts module failed to load'));
			});
			existing.addEventListener('error', () => reject(new Error('Failed to load debts module')));
			return;
		}
		const script = document.createElement('script');
		script.src = src;
		script.defer = true;
		script.onload = () => {
			if (window.storeDashboard && window.storeDashboard.debts) {
				resolve(window.storeDashboard.debts);
			} else {
				reject(new Error('debts module did not initialize'));
			}
		};
		script.onerror = () => reject(new Error('Failed to load debts module'));
		document.head.appendChild(script);
	});
}

	/* Sales module loader: dynamically load /js/store-dashboard/sales.js and initialize it with helpers */
	function ensureSalesModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.sales && window.storeDashboard.sales._loaded) {
				return resolve(window.storeDashboard.sales);
			}
			const src = '/js/store-dashboard/sales.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/sales.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.sales ? resolve(window.storeDashboard.sales) : reject(new Error('sales module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load sales module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.sales) {
					resolve(window.storeDashboard.sales);
				} else {
					reject(new Error('sales module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load sales module'));
			document.head.appendChild(script);
		});
	}

	/* Reports module loader: dynamically load /js/store-dashboard/reports.js and initialize it with helpers */
	function ensureReportsModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.reports && window.storeDashboard.reports._loaded) {
				return resolve(window.storeDashboard.reports);
			}
			const src = '/js/store-dashboard/reports.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/reports.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.reports ? resolve(window.storeDashboard.reports) : reject(new Error('reports module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load reports module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.reports) {
					resolve(window.storeDashboard.reports);
				} else {
					reject(new Error('reports module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load reports module'));
			document.head.appendChild(script);
		});
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

	async function renderCustomersPanel() {
		const panel = document.getElementById('store-customers-panel');
		if (!panel) return;

		try {
			const mod = await ensureCustomersModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load customers module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة العملاء.</p></div>`;
		}
	}

	async function renderSuppliersPanel() {
		const panel = document.getElementById('store-suppliers-panel');
		if (!panel) return;

		try {
			const mod = await ensureSuppliersModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load suppliers module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة الموردين.</p></div>`;
		}
	}

	async function renderDebtsPanel() {
		const panel = document.getElementById('store-debts-panel');
		if (!panel) return;

		try {
			const mod = await ensureDebtsModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load debts module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة إدارة الديون.</p></div>`;
		}
	}

	async function renderSalesPanel() {
		const panel = document.getElementById('store-sales-panel');
		if (!panel) return;

		try {
			const mod = await ensureSalesModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load sales module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة المبيعات.</p></div>`;
		}
	}

	async function renderPurchasesPanel() {
		const panel = document.getElementById('store-purchases-panel');
		if (!panel) return;

		try {
			const mod = await ensurePurchasesModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load purchases module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة المشتريات.</p></div>`;
		}
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

	async function renderSettingsPanel() {
		// delegate rendering to settings module
		const panel = document.getElementById('store-settings-panel');
		if (!panel) return;
		try {
			const mod = await ensureSettingsModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, updateStore } });
			}
			if (mod && typeof mod.renderPanel === 'function') mod.renderPanel();
		} catch (err) {
			console.error('Failed to load settings module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة الإعدادات.</p></div>`;
		}
	}

/* Settings module loader: dynamically load /js/store-dashboard/settings.js and initialize it with helpers */
function ensureSettingsModuleLoaded() {
	return new Promise((resolve, reject) => {
		if (window.storeDashboard && window.storeDashboard.settings && window.storeDashboard.settings._loaded) {
			return resolve(window.storeDashboard.settings);
		}
		const src = '/js/store-dashboard/settings.js';
		const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/settings.js'));
		if (existing) {
			existing.addEventListener('load', () => {
				return window.storeDashboard && window.storeDashboard.settings ? resolve(window.storeDashboard.settings) : reject(new Error('settings module failed to load'));
			});
			existing.addEventListener('error', () => reject(new Error('Failed to load settings module')));
			return;
		}
		const script = document.createElement('script');
		script.src = src;
		script.defer = true;
		script.onload = () => {
			if (window.storeDashboard && window.storeDashboard.settings) {
				resolve(window.storeDashboard.settings);
			} else {
				reject(new Error('settings module did not initialize'));
			}
		};
		script.onerror = () => reject(new Error('Failed to load settings module'));
		document.head.appendChild(script);
	});
}

async function renderExpensesPanel() {
	const panel = document.getElementById('store-expenses-panel');
	if (!panel) return;
	try {
		const mod = await ensureExpensesModuleLoaded();
		if (mod && typeof mod.init === 'function' && !mod._inited) {
			mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce } });
		}
		if (mod && typeof mod.renderPanel === 'function') {
			mod.renderPanel();
		}
	} catch (err) {
		console.error('Failed to load expenses module:', err);
		panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة المصروفات.</p></div>`;
	}
}

async function renderEmployeesPanel() {
	const panel = document.getElementById('store-staff-panel');
	if (!panel) return;
	try {
		const mod = await ensureEmployeesModuleLoaded();
		if (mod && typeof mod.init === 'function' && !mod._inited) {
			mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce } });
		}
		if (mod && typeof mod.renderPanel === 'function') {
			mod.renderPanel();
		}
	} catch (err) {
		console.error('Failed to load employees module:', err);
		panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة الموظفين.</p></div>`;
	}
}

/* Expenses module loader: dynamically load /js/store-dashboard/expenses.js and initialize it with helpers */
function ensureExpensesModuleLoaded() {
	return new Promise((resolve, reject) => {
		if (window.storeDashboard && window.storeDashboard.expenses && window.storeDashboard.expenses._loaded) {
			return resolve(window.storeDashboard.expenses);
		}
		const src = '/js/store-dashboard/expenses.js';
		const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/expenses.js'));
		if (existing) {
			existing.addEventListener('load', () => {
				return window.storeDashboard && window.storeDashboard.expenses ? resolve(window.storeDashboard.expenses) : reject(new Error('expenses module failed to load'));
			});
			existing.addEventListener('error', () => reject(new Error('Failed to load expenses module')));
			return;
		}
		const script = document.createElement('script');
		script.src = src;
		script.defer = true;
		script.onload = () => {
			if (window.storeDashboard && window.storeDashboard.expenses) {
				resolve(window.storeDashboard.expenses);
			} else {
				reject(new Error('expenses module did not initialize'));
			}
		};
		script.onerror = () => reject(new Error('Failed to load expenses module'));
		document.head.appendChild(script);
	});
}

/* Staff/Employees module loader: dynamically load /js/store-dashboard/employees.js and initialize it with helpers */
function ensureEmployeesModuleLoaded() {
	return new Promise((resolve, reject) => {
		if (window.storeDashboard && window.storeDashboard.employees && window.storeDashboard.employees._loaded) {
			return resolve(window.storeDashboard.employees);
		}
		const src = '/js/store-dashboard/employees.js';
		const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/employees.js'));
		if (existing) {
			existing.addEventListener('load', () => {
				return window.storeDashboard && window.storeDashboard.employees ? resolve(window.storeDashboard.employees) : reject(new Error('employees module failed to load'));
			});
			existing.addEventListener('error', () => reject(new Error('Failed to load employees module')));
			return;
		}
		const script = document.createElement('script');
		script.src = src;
		script.defer = true;
		script.onload = () => {
			if (window.storeDashboard && window.storeDashboard.employees) {
				resolve(window.storeDashboard.employees);
			} else {
				reject(new Error('employees module did not initialize'));
			}
		};
		script.onerror = () => reject(new Error('Failed to load employees module'));
		document.head.appendChild(script);
	});
}

async function renderReportsPanel() {
	const panel = document.getElementById('store-reports-panel');
	if (!panel) return;
	try {
		const mod = await ensureReportsModuleLoaded();
		if (mod && typeof mod.init === 'function' && !mod._inited) {
			mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce } });
		}
		if (mod && typeof mod.renderPanel === 'function') {
			mod.renderPanel();
		}
	} catch (err) {
		console.error('Failed to load reports module:', err);
		panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة التقارير.</p></div>`;
	}
}



	function renderDesignPanel() {
		const panel = document.getElementById('store-design-panel');
		if (!panel) return;

		const layouts = [
			{ id: 'layout1', name: 'كلاسيكي', description: 'واجهة بسيطة ثابتة بدون حركات، أبيض + اللون الأساسي.' },
			{ id: 'layout2', name: 'مودرن', description: 'شريط علوي كبسولات وعناصر حديثة، بدون أي بنرات متحركة.' },
			{ id: 'layout3', name: 'خيال', description: 'بطل (Hero) ثابت بخلفية متدرجة و CTA،  سلايدر متحركة.' },
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

	async function renderCatalogPanel() {
	async function renderDesignPanel() {
		const panel = document.getElementById('store-design-panel');
		if (!panel) return;
		try {
			const mod = await ensureDesignModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS, updateStore, refreshDashboard: async () => { await fetchInitialStoreData(); renderStoreDashboard(); } } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load design module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة التصميم.</p></div>`;
		}
	}

	function ensureDesignModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.design && window.storeDashboard.design._loaded) {
				return resolve(window.storeDashboard.design);
			}
			const src = '/js/store-dashboard/design.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/design.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.design ? resolve(window.storeDashboard.design) : reject(new Error('design module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load design module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.design) {
					resolve(window.storeDashboard.design);
				} else {
					reject(new Error('design module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load design module'));
			document.head.appendChild(script);
		});
	}
		// Delegate catalog rendering to the separate module (loaded dynamically)
		const panel = document.getElementById('store-catalog-panel');
		if (!panel) return;
		try {
			const mod = await ensureCatalogModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS, downloadCsv, refreshDashboard: async () => { await fetchInitialStoreData(); renderStoreDashboard(); } } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load catalog module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة الكتالوج.</p></div>`;
		}
	}

	/* Catalog module loader: dynamically load /js/store-dashboard/catalog.js and initialize it with helpers */
	function ensureCatalogModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.catalog && window.storeDashboard.catalog._loaded) {
				return resolve(window.storeDashboard.catalog);
			}
			const src = '/js/store-dashboard/catalog.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/catalog.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.catalog ? resolve(window.storeDashboard.catalog) : reject(new Error('catalog module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load catalog module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.catalog) {
					resolve(window.storeDashboard.catalog);
				} else {
					reject(new Error('catalog module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load catalog module'));
			document.head.appendChild(script);
		});
	}

	async function exportProductsToCsv() {
		try {
			const mod = await ensureCatalogModuleLoaded();
			if (mod && typeof mod.exportProductsToCsv === 'function') {
				if (!mod._inited && typeof mod.init === 'function') {
					mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS, downloadCsv, refreshDashboard: async () => { await fetchInitialStoreData(); renderStoreDashboard(); } } });
				}
				mod.exportProductsToCsv();
			}
		} catch (err) {
			console.error('Failed to export products via module:', err);
			showToast('تعذر تصدير المنتجات', 'error');
		}
	}

	/* Orders module loader: dynamically load /js/store-dashboard/orders.js and initialize it with helpers */
	function ensureOrdersModuleLoaded() {
		return new Promise((resolve, reject) => {
			if (window.storeDashboard && window.storeDashboard.orders && window.storeDashboard.orders._loaded) {
				return resolve(window.storeDashboard.orders);
			}
			const src = '/js/store-dashboard/orders.js';
			const existing = Array.from(document.scripts).find(s => s.src && s.src.endsWith('store-dashboard/orders.js'));
			if (existing) {
				existing.addEventListener('load', () => {
					return window.storeDashboard && window.storeDashboard.orders ? resolve(window.storeDashboard.orders) : reject(new Error('orders module failed to load'));
				});
				existing.addEventListener('error', () => reject(new Error('Failed to load orders module')));
				return;
			}
			const script = document.createElement('script');
			script.src = src;
			script.defer = true;
			script.onload = () => {
				if (window.storeDashboard && window.storeDashboard.orders) {
					resolve(window.storeDashboard.orders);
				} else {
					reject(new Error('orders module did not initialize'));
				}
			};
			script.onerror = () => reject(new Error('Failed to load orders module'));
			document.head.appendChild(script);
		});
	}

	async function renderOrdersPanel() {
		const panel = document.getElementById('store-orders-panel');
		if (!panel) return;
		try {
			const mod = await ensureOrdersModuleLoaded();
			if (mod && typeof mod.init === 'function' && !mod._inited) {
				mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS, downloadCsv, refreshDashboard: async () => { await fetchInitialStoreData(); renderStoreDashboard(); } } });
			}
			if (mod && typeof mod.renderPanel === 'function') {
				mod.renderPanel();
			}
		} catch (err) {
			console.error('Failed to load orders module:', err);
			panel.innerHTML = `<div class="placeholder error"><h2><i class="fas fa-exclamation-triangle"></i> خطأ</h2><p>تعذّر تحميل وحدة الطلبات.</p></div>`;
		}
	}

	async function exportOrdersToCsv() {
		try {
			const mod = await ensureOrdersModuleLoaded();
			if (mod && typeof mod.exportOrdersToCsv === 'function') {
				// ensure inited
				if (!mod._inited && typeof mod.init === 'function') {
					mod.init({ state, helpers: { handleApiRequest, showToast, escapeHtml, formatNumber, formatCurrency, formatDate, debounce, STATUS_LABELS, downloadCsv, refreshDashboard: async () => { await fetchInitialStoreData(); renderStoreDashboard(); } } });
				}
				mod.exportOrdersToCsv();
			}
		} catch (err) {
			console.error('Failed to export orders via module:', err);
			showToast('تعذر تصدير الطلبات', 'error');
		}
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

	function renderAnalyticsPanel(targetId) {
		const panel = targetId ? document.getElementById(targetId) : document.getElementById('store-analytics-panel');
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


		`;


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
						<li>منفذ مبيعات متكامل نقط مبيعات متعدده بحسابات مختلفة الصلاحيات.</li>
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

				if (!state.bot?.storeId) {
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

	window.loadStoreManagerPage = loadStoreManagerPage;
})();

