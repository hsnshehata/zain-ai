(function(){
	window.storeDashboard = window.storeDashboard || {};
	window.storeDashboard.reports = { _loaded: true };

	let _state = null;
	let _helpers = null;

	function init(ctx) {
		_state = ctx.state;
		_helpers = ctx.helpers || {};
		window.storeDashboard.reports._inited = true;
	}

	function renderPanel() {
		const panel = document.getElementById('store-reports-panel');
		if (!panel) return;

		panel.innerHTML = `
			<div class="store-card">
				<h3><i class="fas fa-chart-line"></i> التقارير</h3>
				<div class="reports-nav" style="display:flex;gap:8px;flex-wrap:wrap;">
					<button class="btn btn-outline" data-report="inventory">تقارير المخزون والمنتجات</button>
					<button class="btn btn-outline" data-report="customers">تقارير العملاء والديون</button>
					<button class="btn btn-outline" data-report="suppliers">تقارير الموردين والمشتريات</button>
					<button class="btn btn-outline" data-report="pnl">تقارير الأرباح والخسائر</button>
					<button class="btn btn-outline" data-report="employees">تقارير الموظفين</button>
				</div>
				<div style="margin-block-start:12px;color:#6b7280;font-size:0.95em;">اختر تقريرًا لعرض تفاصيله، كل تقرير له تصدير وطباعة خاصة به.</div>
			</div>

			<div id="reportControls" class="store-card" style="margin-block-start:12px;display:none;"></div>
			<div id="reportContent" class="store-card" style="margin-block-start:12px;">اختر تقريرًا من الأعلى للبدء.</div>
		`;

		// bind nav
		panel.querySelectorAll('.reports-nav button').forEach(btn => {
			btn.addEventListener('click', () => {
				const type = btn.dataset.report;
				panel.querySelectorAll('.reports-nav button').forEach(b=>b.classList.remove('active'));
				btn.classList.add('active');
				showReport(type);
			});
		});

		// default: inventory
		const first = panel.querySelector('.reports-nav button');
		if (first) { first.click(); }
	}

	// cache fetched data to avoid refetching for each report
	const _dataCache = { ts: 0, data: null };

	async function fetchAllData(storeId, headers) {
		const now = Date.now();
		if (_dataCache.data && (now - _dataCache.ts) < 30*1000) return _dataCache.data;
			const [ordersResp, salesResp, productsResp, customersResp, suppliersResp, expensesResp, usersResp] = await Promise.all([
			_helpers.handleApiRequest(`/api/orders/${storeId}/orders`, { headers }).catch(()=>[]),
			_helpers.handleApiRequest(`/api/sales/${storeId}/sales?limit=200`, { headers }).catch(()=>({ sales: [] })),
			_helpers.handleApiRequest(`/api/products/${storeId}/products?limit=200`, { headers }).catch(()=>({ products: [] })),
			_helpers.handleApiRequest(`/api/customers/${storeId}/customers?limit=200`, { headers }).catch(()=>({ customers: [] })),
					_helpers.handleApiRequest(`/api/suppliers/${storeId}/suppliers?limit=200`, { headers }).catch(()=>({ suppliers: [] })),
					_helpers.handleApiRequest(`/api/expenses/${storeId}/expenses?limit=500`, { headers }).catch(()=>({ expenses: [] })),
					_helpers.handleApiRequest(`/api/users/${storeId}/users?limit=500`, { headers }).catch(()=>({ users: [] })),
		]);

		const orders = Array.isArray(ordersResp) ? ordersResp : (ordersResp.orders || []);
		const sales = Array.isArray(salesResp.sales) ? salesResp.sales : (salesResp.sales || []);
		const products = Array.isArray(productsResp.products) ? productsResp.products : (productsResp.products || []);
		const customers = Array.isArray(customersResp.customers) ? customersResp.customers : (customersResp.customers || []);
		const suppliers = Array.isArray(suppliersResp.suppliers) ? suppliersResp.suppliers : (suppliersResp.suppliers || []);
		const expenses = Array.isArray(expensesResp.expenses) ? expensesResp.expenses : (expensesResp.expenses || []);
		const users = Array.isArray(usersResp.users) ? usersResp.users : (usersResp.users || []);

		// fetch invoices per-supplier (limit first 50)
		let purchases = [];
		if (suppliers.length > 0) {
			const toFetch = suppliers.slice(0,50);
			const invoicesResponses = await Promise.all(toFetch.map(sp => {
				return _helpers.handleApiRequest(`/api/suppliers/${storeId}/suppliers/${sp._id}/invoices`, { headers }).catch(()=>({ invoices: [] }));
			}));
			invoicesResponses.forEach(r => {
				if (Array.isArray(r.invoices)) purchases = purchases.concat(r.invoices);
			});
		}

		_dataCache.ts = now;
		_dataCache.data = { orders, sales, products, customers, suppliers, purchases, expenses, users };
		return _dataCache.data;
	}

	async function showReport(type) {
		const storeId = _state.store?._id;
		const headers = { Authorization: `Bearer ${_state.token}` };
		const controls = document.getElementById('reportControls');
		const content = document.getElementById('reportContent');
		if (!content || !controls) return;
		controls.style.display = 'block';
		controls.innerHTML = `
			<div class="form-grid-three">
				<div class="form-group"><label>من</label><input type="date" id="rFrom"></div>
				<div class="form-group"><label>إلى</label><input type="date" id="rTo"></div>
				<div class="form-group"><label>دقة الفترة</label><select id="rGran"><option value="daily">يومي</option><option value="weekly">أسبوعي</option><option value="monthly" selected>شهري</option><option value="yearly">سنوي</option></select></div>
			</div>
			<div style="display:flex;gap:8px;align-items:center;margin-block-start:8px;">
				<button class="btn btn-primary" id="rRunBtn">تشغيل</button>
				<button class="btn btn-secondary" id="rExportBtn">تصدير CSV</button>
				<button class="btn btn-secondary" id="rPrintBtn">طباعة</button>
				<div style="margin-inline-start:auto;color:#6b7280;font-size:0.95em;">التقرير: ${_helpers.escapeHtml(type)}</div>
			</div>
		`;

		// sensible defaults
		const toInput = document.getElementById('rTo');
		const fromInput = document.getElementById('rFrom');
		if (toInput && fromInput) {
			const to = new Date();
			const from = new Date();
			from.setDate(from.getDate() - 30);
			toInput.value = to.toISOString().slice(0,10);
			fromInput.value = from.toISOString().slice(0,10);
		}

		// ensure date inputs have a visible single icon element and proper ordering
		(function attachDateIcons(){
			const groups = controls.querySelectorAll('.form-group');
			groups.forEach(g => {
				const input = g.querySelector('input[type="date"]');
				if (!input) return;
				// avoid duplicating icon
				if (g.querySelector('.date-icon')) return;
				const icon = document.createElement('span');
				icon.className = 'date-icon';
				icon.setAttribute('aria-hidden','true');
				icon.addEventListener('click', ()=> input.showPicker ? input.showPicker() : input.focus());
				g.appendChild(icon);
			});
		})();

		document.getElementById('rRunBtn')?.addEventListener('click', async () => {
			content.innerHTML = '<div class="store-loading"><div class="loader"></div><p>جارٍ تجهيز التقرير...</p></div>';
			const data = await fetchAllData(storeId, headers);
			const from = parseDateInput(document.getElementById('rFrom')?.value);
			const to = parseDateInput(document.getElementById('rTo')?.value);
			const gran = document.getElementById('rGran')?.value || 'monthly';
			if (type === 'inventory') renderInventoryReport(content, data, { from, to, gran });
			if (type === 'customers') renderCustomersReport(content, data, { from, to, gran });
			if (type === 'suppliers') renderSuppliersReport(content, data, { from, to, gran });
			if (type === 'pnl') renderPnlReport(content, data, { from, to, gran });
			if (type === 'employees') renderEmployeesReport(content, data, { from, to, gran });
		});

		document.getElementById('rExportBtn')?.addEventListener('click', () => {
			const last = window.storeDashboard.reports._lastByType && window.storeDashboard.reports._lastByType[type];
			if (!last) return _helpers.showToast('شغّل التقرير أولاً قبل التصدير','error');
			exportCsvFor(last.csvRows, `report_${type}.csv`);
		});

		document.getElementById('rPrintBtn')?.addEventListener('click', () => {
			const last = window.storeDashboard.reports._lastByType && window.storeDashboard.reports._lastByType[type];
			if (!last) return _helpers.showToast('شغّل التقرير أولاً قبل الطباعة','error');
			printHtml(last.printHtml || `<pre>${_helpers.escapeHtml(JSON.stringify(last.data||{},null,2))}</pre>`, `تقرير ${type}`);
		});
	}

	function exportCsvFor(rows, filename) {
		if (!Array.isArray(rows) || !rows.length) return _helpers.showToast('لا توجد بيانات للتصدير','error');
		const csv = rows.map(r => r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
	}

	function printHtml(html, title) {
		const w = window.open('', '_blank');
		w.document.write(`<html><head><meta charset='utf-8'><title>${_helpers.escapeHtml(title||'تقرير')}</title><style>body{font-family:Arial,Helvetica,sans-serif;direction:rtl}table{border-collapse:collapse;inline-size:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6}</style></head><body>` + html + '</body></html>');
		w.document.close(); w.focus(); setTimeout(()=> w.print(), 500);
	}

	function renderInventoryReport(container, data, opts) {
		const { products } = data;
		const lowStock = products.filter(p => Number(p.stock) <= (Number(p.lowStockThreshold)||0));
		const totalStockValue = products.reduce((s,p)=> s + ((Number(p.stock)||0) * (Number(p.costPrice)||Number(p.price)||0)),0);
		const html = `
			<h4>تقارير المخزون والمنتجات</h4>
			<p>عدد المنتجات: <strong>${_helpers.formatNumber(products.length)}</strong></p>
			<p>قيمة المخزون التقديرية: <strong>${_helpers.formatCurrency(totalStockValue,'EGP')}</strong></p>
			<p>منتجات منخفضة المخزون: <strong>${_helpers.formatNumber(lowStock.length)}</strong></p>
			${renderTopTable(products.slice(0,20).map(p=>({ product: p, qty: Number(p.stock)||0 }),'qty'))}
		`;
		container.innerHTML = html;
		// prepare export/print payload
		const csvRows = [['المنتج','المخزون','سعر التكلفة','السعر']].concat(products.map(p=>[p.productName||p.name||'غير معروف', p.stock||0, p.costPrice||0, p.price||0]));
		window.storeDashboard.reports._lastByType = window.storeDashboard.reports._lastByType || {};
		window.storeDashboard.reports._lastByType.inventory = { csvRows, printHtml: html, data: { products } };
	}

	function renderCustomersReport(container, data, opts) {
		const { customers } = data;
		const totalReceivables = customers.reduce((s,c)=> s + (Number(c.balance)||0), 0);
		const html = `
			<h4>تقارير العملاء والديون</h4>
			<p>عدد العملاء: <strong>${_helpers.formatNumber(customers.length)}</strong></p>
			<p>إجمالي المتبقيات (ذمم العملاء): <strong>${_helpers.formatCurrency(totalReceivables,'EGP')}</strong></p>
			<div class="table-responsive"><table class="store-table"><thead><tr><th>العميل</th><th>الرصيد</th></tr></thead><tbody>${customers.map(c=>`<tr><td>${_helpers.escapeHtml(c.name||c.fullName||'غير معروف')}</td><td>${_helpers.formatCurrency(c.balance||0,'EGP')}</td></tr>`).join('')}</tbody></table></div>
		`;
		container.innerHTML = html;
		const csvRows = [['العميل','الرصيد']].concat(customers.map(c=>[c.name||c.fullName||'غير معروف', c.balance||0]));
		window.storeDashboard.reports._lastByType = window.storeDashboard.reports._lastByType || {};
		window.storeDashboard.reports._lastByType.customers = { csvRows, printHtml: html, data: { customers } };
	}

	function renderSuppliersReport(container, data, opts) {
		const { suppliers, purchases } = data;
		const totalPurchases = purchases.reduce((s,p)=> s + (Number(p.total)||0), 0);
		let totalSuppliersPayable = suppliers.reduce((s,sp)=> s + (Number(sp.balance)||0), 0);
		if (!totalSuppliersPayable && purchases.length>0) totalSuppliersPayable = purchases.reduce((s,p)=> s + (Number(p.total||0) - Number(p.paid||0)), 0);
		const html = `
			<h4>تقارير الموردين والمشتريات</h4>
			<p>عدد الموردين: <strong>${_helpers.formatNumber(suppliers.length)}</strong></p>
			<p>إجمالي المشتريات: <strong>${_helpers.formatCurrency(totalPurchases,'EGP')}</strong></p>
			<p>إجمالي مستحقات الموردين: <strong>${_helpers.formatCurrency(totalSuppliersPayable,'EGP')}</strong></p>
			<div class="table-responsive"><table class="store-table"><thead><tr><th>المورد</th><th>الرصيد</th></tr></thead><tbody>${suppliers.map(s=>`<tr><td>${_helpers.escapeHtml(s.name||'غير معروف')}</td><td>${_helpers.formatCurrency(s.balance||0,'EGP')}</td></tr>`).join('')}</tbody></table></div>
		`;
		container.innerHTML = html;
		const csvRows = [['المورد','الرصيد']].concat(suppliers.map(s=>[s.name||'غير معروف', s.balance||0]));
		window.storeDashboard.reports._lastByType = window.storeDashboard.reports._lastByType || {};
		window.storeDashboard.reports._lastByType.suppliers = { csvRows, printHtml: html, data: { suppliers, purchases } };
	}

	function renderPnlReport(container, data, opts) {
		const { orders, sales, products, purchases } = data;
			const { expenses } = data;
		const from = opts.from; const to = opts.to;
		const ordersInRange = orders.filter(o=> inRange(o.createdAt||o.date||o.created, from, to));
		const salesInRange = sales.filter(s=> inRange(s.createdAt||s.date||s.created, from, to));
		const purchasesInRange = purchases.filter(p=> inRange(p.createdAt||p.date||p.createdAt, from, to));
		const totalRevenue = ordersInRange.reduce((s,o)=> s + (Number(o.totalPrice)||0),0) + salesInRange.reduce((s,o)=> s + (Number(o.totalAmount)||0) + (Number(o.totalPrice)||0),0);
		const totalPurchases = purchasesInRange.reduce((s,p)=> s + (Number(p.total)||0),0);
		let qtyByProduct = {};
		ordersInRange.forEach(o=> (o.products||o.items||[]).forEach(it=> { const pid = it.productId||it._id||it.product||''; qtyByProduct[pid]=(qtyByProduct[pid]||0)+(Number(it.quantity||it.qty||it.count||0)||0); }));
		salesInRange.forEach(s=> (s.items||s.products||[]).forEach(it=> { const pid = it.productId||it._id||it.product||''; qtyByProduct[pid]=(qtyByProduct[pid]||0)+(Number(it.quantity||it.qty||it.count||0)||0); }));
		let estimatedCOGS = 0; Object.keys(qtyByProduct).forEach(pid=> { const prod = products.find(p=>String(p._id)===String(pid))||{}; estimatedCOGS += (Number(prod.costPrice)||0) * (qtyByProduct[pid]||0); });
		const grossProfit = totalRevenue - estimatedCOGS;
		// include operating expenses (type === 'expense') in P&L
		const expensesInRange = Array.isArray(expenses) ? expenses.filter(p=> inRange(p.createdAt||p.date||p.created, from, to)) : [];
		const totalExpenses = expensesInRange.reduce((s,p)=> s + (Number(p.amount)||0), 0);
		const netProfit = grossProfit - totalExpenses;
		const html = `
			<h4>تقرير الأرباح والخسائر</h4>
			<p>إجمالي الإيرادات: <strong>${_helpers.formatCurrency(totalRevenue,'EGP')}</strong></p>
			<p>إجمالي المشتريات: <strong>${_helpers.formatCurrency(totalPurchases,'EGP')}</strong></p>
			<p>تقدير تكلفة البضاعة المباعة: <strong>${_helpers.formatCurrency(estimatedCOGS,'EGP')}</strong></p>
			<p>الربح الإجمالي: <strong>${_helpers.formatCurrency(grossProfit,'EGP')}</strong></p>

			<p>إجمالي المصروفات التشغيلية: <strong>${_helpers.formatCurrency(totalExpenses,'EGP')}</strong></p>
			<p>صافي الربح بعد المصروفات: <strong>${_helpers.formatCurrency(netProfit,'EGP')}</strong></p>
		`;
		container.innerHTML = html;
		const csvRows = [['المؤشر','القيمة'], ['إجمالي الإيرادات', totalRevenue], ['إجمالي المشتريات', totalPurchases], ['تقدير COGS', estimatedCOGS], ['الربح الإجمالي', grossProfit]];
		csvRows.push(['إجمالي المصروفات', totalExpenses]);
		csvRows.push(['صافي الربح', netProfit]);
		window.storeDashboard.reports._lastByType = window.storeDashboard.reports._lastByType || {};
		window.storeDashboard.reports._lastByType.pnl = { csvRows, printHtml: html, data: { totalRevenue, totalPurchases, estimatedCOGS, grossProfit } };
	}

	function parseDateInput(v) {
		if (!v) return null;
		const d = new Date(v+'T00:00:00');
		if (Number.isNaN(d.getTime())) return null;
		return d;
	}

	function inRange(date, from, to) {
		if (!date) return false;
		const t = new Date(date).getTime();
		if (from && t < from.getTime()) return false;
		if (to && t > to.getTime() + 24*60*60*1000 - 1) return false; // inclusive end
		return true;
	}

	function groupByPeriod(items, getTime, granularity, from, to) {
		// returns array of { label, ts, value }
		const map = {};
		items.forEach(it => {
			const time = getTime(it);
			if (!time) return;
			if (!inRange(time, from, to)) return;
			let key;
			switch (granularity) {
				case 'daily':
					key = new Date(time).toISOString().slice(0,10);
					break;
				case 'weekly': {
					const d = new Date(time);
					const year = d.getFullYear();
					const w = getWeekNumber(d);
					key = `${year}-W${String(w).padStart(2,'0')}`;
					break;
				}
				case 'monthly': {
					const d = new Date(time);
					key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
					break;
				}
				case 'yearly': {
					const d = new Date(time);
					key = `${d.getFullYear()}`;
					break;
				}
				default:
					key = new Date(time).toISOString().slice(0,10);
		}
			map[key] = map[key] || { key, label: key, value: 0 };
			map[key].value += 1;
		});
		return Object.keys(map).sort().map(k => map[k]);
	}

	function getWeekNumber(d) {
		const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
		const dayNum = date.getUTCDay() || 7;
		date.setUTCDate(date.getUTCDate() + 4 - dayNum);
		const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
		const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1)/7);
		return weekNo;
	}

	async function runReports() {
		const from = parseDateInput(document.getElementById('reportFrom')?.value);
		const to = parseDateInput(document.getElementById('reportTo')?.value);
		const gran = document.getElementById('reportGranularity')?.value || 'monthly';
		const panel = document.getElementById('reportsResults');
		if (!panel) return;
		panel.innerHTML = '<div class="store-loading"><div class="loader"></div><p>جارٍ تجهيز التقرير...</p></div>';

		try {
			const storeId = _state.store?._id;
			const headers = { Authorization: `Bearer ${_state.token}` };
			// fetch available data in parallel; fallback to empty
			const [ordersResp, salesResp, productsResp, customersResp, suppliersResp] = await Promise.all([
				_helpers.handleApiRequest(`/api/orders/${storeId}/orders`, { headers }).catch(()=>[]),
				_helpers.handleApiRequest(`/api/sales/${storeId}/sales?limit=200`, { headers }).catch(()=>({ sales: [] })),
				_helpers.handleApiRequest(`/api/products/${storeId}/products?limit=200`, { headers }).catch(()=>({ products: [] })),
				_helpers.handleApiRequest(`/api/customers/${storeId}/customers?limit=200`, { headers }).catch(()=>({ customers: [] })),
				_helpers.handleApiRequest(`/api/suppliers/${storeId}/suppliers?limit=200`, { headers }).catch(()=>({ suppliers: [] })),
			]);

			const orders = Array.isArray(ordersResp) ? ordersResp : (ordersResp.orders || []);
			const sales = Array.isArray(salesResp.sales) ? salesResp.sales : (salesResp.sales || []);
			const products = Array.isArray(productsResp.products) ? productsResp.products : (productsResp.products || []);
			const customers = Array.isArray(customersResp.customers) ? customersResp.customers : (customersResp.customers || []);
			const suppliers = Array.isArray(suppliersResp.suppliers) ? suppliersResp.suppliers : (suppliersResp.suppliers || []);

			// fetch invoices per-supplier (route requires supplierId). Limit parallel requests to first 50 suppliers to avoid overload.
			let purchases = [];
			if (suppliers.length > 0) {
				const toFetch = suppliers.slice(0,50);
				const invoicesResponses = await Promise.all(toFetch.map(sp => {
					return _helpers.handleApiRequest(`/api/suppliers/${storeId}/suppliers/${sp._id}/invoices`, { headers }).catch(()=>({ invoices: [] }));
				}));
				invoicesResponses.forEach(r => {
					if (Array.isArray(r.invoices)) purchases = purchases.concat(r.invoices);
				});
			}

			// filter by date range
			const ordersInRange = orders.filter(o => inRange(o.createdAt || o.date || o._created || o.created, from, to));
			const salesInRange = sales.filter(s => inRange(s.createdAt || s.date || s._created || s.created, from, to));
			const purchasesInRange = purchases.filter(p => inRange(p.createdAt || p.date || p._created || p.createdAt, from, to));

			// Sales report metrics
			const totalOrders = ordersInRange.length;
			const totalSalesRecords = salesInRange.length;
			const totalRevenueOrders = ordersInRange.reduce((s,o)=> s + (Number(o.totalPrice)||0), 0);
			const totalRevenueSales = salesInRange.reduce((s,o)=> s + (Number(o.totalAmount)||0) + (Number(o.totalPrice)||0), 0);
			const totalRevenue = totalRevenueOrders + totalRevenueSales;
			// items sold quantities
			let totalItemsSold = 0;
			const qtyByProduct = {};
			const revenueByProduct = {};
			[...ordersInRange].forEach(o => {
				const items = o.products || o.items || [];
				items.forEach(it=>{
					const pid = it.productId || it._id || it.product || '';
					const q = Number(it.quantity || it.qty || it.count || 0) || 0;
					const price = Number(it.price || it.unitPrice || it.salePrice || it.pricePerUnit || 0) || 0;
					totalItemsSold += q;
					qtyByProduct[pid] = (qtyByProduct[pid]||0) + q;
					revenueByProduct[pid] = (revenueByProduct[pid]||0) + (q * price);
				});
			});
			[...salesInRange].forEach(s => {
				const items = s.items || s.products || [];
				items.forEach(it=>{
					const pid = it.productId || it._id || it.product || '';
					const q = Number(it.quantity || it.qty || it.count || it.qtyOrdered || 0) || 0;
					const price = Number(it.price || it.unitPrice || it.salePrice || it.pricePerUnit || it.total || 0) || 0;
					totalItemsSold += q;
					qtyByProduct[pid] = (qtyByProduct[pid]||0) + q;
					revenueByProduct[pid] = (revenueByProduct[pid]||0) + (q * price);
				});
			});

			// Inventory report
			const lowStockList = products.filter(p => Number(p.stock) <= (Number(p.lowStockThreshold)||0));
			const totalStockValue = products.reduce((s,p) => s + ((Number(p.stock)||0) * (Number(p.costPrice)||Number(p.price)||0)), 0);

			// Customers and debts
			const totalReceivables = customers.reduce((s,c)=> s + (Number(c.balance)||0), 0);
			let totalSuppliersPayable = suppliers.reduce((s,sp)=> s + (Number(sp.balance)||0), 0);
			// fallback: if supplier balances are zero but invoices exist, compute unpaid from invoices
			if (!totalSuppliersPayable && purchasesInRange.length > 0) {
				totalSuppliersPayable = purchasesInRange.reduce((s,p)=> s + (Number(p.total||0) - Number(p.paid||0)), 0);
			}

			// Purchases totals (use PurchaseInvoice.total)
			const totalPurchases = purchasesInRange.reduce((s,p)=> s + (Number(p.total)||0), 0);

			// Profit & Loss (simple): revenue - cost of goods sold
			// estimate COGS by summing product.costPrice * qty sold when possible
			let estimatedCOGS = 0;
			Object.keys(qtyByProduct).forEach(pid => {
				const qty = qtyByProduct[pid]||0;
				const prod = (products.find(p => String(p._id) === String(pid)) || {});
				const cost = Number(prod.costPrice) || 0;
				estimatedCOGS += qty * cost;
			});
			const grossProfit = totalRevenue - estimatedCOGS;

			// top sellers
			const productMap = {};
			products.forEach(p=> productMap[String(p._id)] = p);
			const topByQty = Object.keys(qtyByProduct).map(pid=> ({ product: productMap[pid]||{productName:'غير معروف'}, qty: qtyByProduct[pid]||0, revenue: revenueByProduct[pid]||0 })).sort((a,b)=> b.qty - a.qty).slice(0,10);
			const topByRevenue = Object.keys(revenueByProduct).map(pid=> ({ product: productMap[pid]||{productName:'غير معروف'}, revenue: revenueByProduct[pid]||0, qty: qtyByProduct[pid]||0 })).sort((a,b)=> b.revenue - a.revenue).slice(0,10);

			// time series: orders count and revenue per period
			const orderSeries = {};
			const revenueSeries = {};
			function addSeriesItem(key, revenue) {
				orderSeries[key] = (orderSeries[key]||0) + 1;
				revenueSeries[key] = (revenueSeries[key]||0) + (Number(revenue)||0);
			}
			[...ordersInRange].forEach(o=>{
				const key = periodKey(o.createdAt||o.date||o.created, gran, from);
				if (!key) return;
				addSeriesItem(key, o.totalPrice||0);
			});
			[...salesInRange].forEach(s=>{
				const key = periodKey(s.createdAt||s.date||s.created, gran, from);
				if (!key) return;
				addSeriesItem(key, s.totalAmount||s.totalPrice||0);
			});

			const seriesKeys = Object.keys(orderSeries).sort();
			const seriesRows = seriesKeys.map(k => ({ period: k, orders: orderSeries[k]||0, revenue: revenueSeries[k]||0 }));

			// render results
			panel.innerHTML = `
				<div class="reports-grid">
					<div class="report-card">
						<h4>المبيعات</h4>
						<p>إجمالي الطلبات: <strong>${_helpers.formatNumber(totalOrders)}</strong></p>
						<p>سجلات مبيعات مباشرة: <strong>${_helpers.formatNumber(totalSalesRecords)}</strong></p>
						<p>إجمالي الإيرادات: <strong>${_helpers.formatCurrency(totalRevenue, 'EGP')}</strong></p>
						<p>متوسط قيمة الطلب: <strong>${_helpers.formatCurrency(totalOrders? (totalRevenue/totalOrders) : 0, 'EGP')}</strong></p>
						<p>إجمالي القطع المباعة: <strong>${_helpers.formatNumber(totalItemsSold)}</strong></p>
					</div>

					<div class="report-card">
						<h4>المخزون</h4>
						<p>عدد المنتجات: <strong>${_helpers.formatNumber(products.length)}</strong></p>
						<p>قيمة المخزون التقديرية: <strong>${_helpers.formatCurrency(totalStockValue,'EGP')}</strong></p>
						<p>منتجات منخفضة المخزون: <strong>${_helpers.formatNumber(lowStockList.length)}</strong></p>
					</div>

					<div class="report-card">
						<h4>العملاء والديون</h4>
						<p>عدد العملاء: <strong>${_helpers.formatNumber(customers.length)}</strong></p>
						<p>إجمالي المتبقيات (ذمم العملاء): <strong>${_helpers.formatCurrency(totalReceivables,'EGP')}</strong></p>
					</div>

					<div class="report-card">
						<h4>الموردين والمشتريات</h4>
						<p>عدد الموردين: <strong>${_helpers.formatNumber(suppliers.length)}</strong></p>
						<p>إجمالي المشتريات: <strong>${_helpers.formatCurrency(totalPurchases,'EGP')}</strong></p>
						<p>إجمالي مستحقات الموردين: <strong>${_helpers.formatCurrency(totalSuppliersPayable,'EGP')}</strong></p>
					</div>

					<div class="report-card">
						<h4>الأرباح والخسائر</h4>
						<p>تقدير تكلفة البضائع المباعة: <strong>${_helpers.formatCurrency(estimatedCOGS,'EGP')}</strong></p>
						<p>الربح الإجمالي: <strong>${_helpers.formatCurrency(grossProfit,'EGP')}</strong></p>
					</div>

					<div class="report-card" style="grid-column:1/-1;">
						<h4>أعلى المنتجات مبيعًا (كمية)</h4>
						${renderTopTable(topByQty, 'qty')}
					</div>

					<div class="report-card" style="grid-column:1/-1;">
						<h4>أعلى المنتجات مبيعًا (إيراد)</h4>
						${renderTopTable(topByRevenue, 'revenue')}
					</div>

					<div class="report-card" style="grid-column:1/-1;">
						<h4>السلاسل الزمنية (${gran})</h4>
						${renderSeriesTable(seriesRows)}
					</div>
				</div>
			`;

			// store last computed report in module for export
			window.storeDashboard.reports._last = {
				from, to, gran, totalOrders, totalRevenue, totalItemsSold, lowStockList, totalStockValue, totalReceivables, totalSuppliersPayable, totalPurchases, estimatedCOGS, grossProfit, topByQty, topByRevenue, seriesRows
			};

		} catch (err) {
			console.error('Error building reports:', err);
			panel.innerHTML = `<div class="placeholder error"><h3>تعذّر إنشاء التقرير</h3><p>${_helpers.escapeHtml(err.message || String(err))}</p></div>`;
		}
	}

	function renderTopTable(list, valueKey) {
		return `
			<div class="table-responsive">
				<table class="store-table">
					<thead><tr><th>المنتج</th><th>${valueKey === 'qty' ? 'الكمية' : 'الإيراد'}</th></tr></thead>
					<tbody>
						${list.map(row => `
							<tr>
								<td>${_helpers.escapeHtml(row.product.productName || row.product.name || 'غير معروف')}</td>
								<td>${valueKey === 'qty' ? _helpers.formatNumber(row.qty) : _helpers.formatCurrency(row.revenue,'EGP')}</td>
							</tr>
						`).join('')}
					</tbody>
				</table>
			</div>
		`;
	}

	function renderSeriesTable(rows) {
		return `
			<div class="table-responsive">
				<table class="store-table">
					<thead><tr><th>الفترة</th><th>الطلبات</th><th>الإيراد</th></tr></thead>
					<tbody>
						${rows.map(r=>`<tr><td>${_helpers.escapeHtml(String(r.period))}</td><td>${_helpers.formatNumber(r.orders)}</td><td>${_helpers.formatCurrency(r.revenue,'EGP')}</td></tr>`).join('')}
					</tbody>
				</table>
			</div>
		`;
	}

	function periodKey(time, gran, from) {
		if (!time) return null;
		const d = new Date(time);
		switch (gran) {
			case 'daily': return d.toISOString().slice(0,10);
			case 'weekly': return `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2,'0')}`;
			case 'monthly': return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
			case 'yearly': return `${d.getFullYear()}`;
			default: return d.toISOString().slice(0,10);
		}
	}

	function exportCsv() {
		const last = window.storeDashboard.reports._last;
		if (!last) return _helpers.showToast('شغل التقرير أولاً قبل التصدير', 'error');
		// build a CSV with summary + series
		let rows = [];
		rows.push(['تقرير من', last.from ? last.from.toISOString().slice(0,10) : '']);
		rows.push(['إلى', last.to ? last.to.toISOString().slice(0,10) : '']);
		rows.push([]);
		rows.push(['المؤشر','القيمة']);
		rows.push(['إجمالي الطلبات', last.totalOrders]);
		rows.push(['إجمالي الإيرادات', last.totalRevenue]);
		rows.push(['إجمالي القطع المباعة', last.totalItemsSold]);
		rows.push(['قيمة المخزون التقديرية', last.totalStockValue]);
		rows.push(['تقدير تكلفة البضاعة المباعة', last.estimatedCOGS]);
		rows.push(['الربح الإجمالي', last.grossProfit]);
		rows.push([]);
		rows.push(['أعلى المنتجات مبيعًا (كمية)']);
		rows.push(['المنتج','الكمية']);
		last.topByQty.forEach(r=> rows.push([r.product.productName||r.product.name||'غير معروف', r.qty]));
		rows.push([]);
		rows.push(['أعلى المنتجات مبيعًا (إيراد)']);
		rows.push(['المنتج','الإيراد']);
		last.topByRevenue.forEach(r=> rows.push([r.product.productName||r.product.name||'غير معروف', r.revenue]));
		rows.push([]);
		rows.push(['السلاسل الزمنية']);
		rows.push(['الفترة','الطلبات','الإيراد']);
		last.seriesRows.forEach(r=> rows.push([r.period, r.orders, r.revenue]));

		const csv = rows.map(r => r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `report_${(last.from? last.from.toISOString().slice(0,10):'')}_${(last.to? last.to.toISOString().slice(0,10):'')}.csv`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}

	function printReport() {
		const last = window.storeDashboard.reports._last;
		if (!last) return _helpers.showToast('شغل التقرير أولاً قبل الطباعة', 'error');
		let html = `<html><head><meta charset="utf-8"><title>تقرير</title><style>body{font-family:Arial,Helvetica,sans-serif;direction:rtl}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px}th{background:#f3f4f6}</style></head><body>`;
		html += `<h2>تقرير من ${last.from? last.from.toISOString().slice(0,10):''} إلى ${last.to? last.to.toISOString().slice(0,10):''}</h2>`;
		html += `<h3>مؤشرات عامة</h3><table><tbody>`;
		html += `<tr><th>المؤشر</th><th>القيمة</th></tr>`;
		html += `<tr><td>إجمالي الطلبات</td><td>${_helpers.formatNumber(last.totalOrders)}</td></tr>`;
		html += `<tr><td>إجمالي الإيرادات</td><td>${_helpers.formatCurrency(last.totalRevenue,'EGP')}</td></tr>`;
		html += `<tr><td>إجمالي القطع المباعة</td><td>${_helpers.formatNumber(last.totalItemsSold)}</td></tr>`;
		html += `<tr><td>قيمة المخزون</td><td>${_helpers.formatCurrency(last.totalStockValue,'EGP')}</td></tr>`;
		html += `<tr><td>تقدير تكلفة البضاعة المباعة</td><td>${_helpers.formatCurrency(last.estimatedCOGS,'EGP')}</td></tr>`;
		html += `<tr><td>الربح الإجمالي</td><td>${_helpers.formatCurrency(last.grossProfit,'EGP')}</td></tr>`;
		html += `</tbody></table>`;
		// top by qty
		html += `<h3>أعلى المنتجات مبيعًا (كمية)</h3><table><thead><tr><th>المنتج</th><th>الكمية</th></tr></thead><tbody>`;
		last.topByQty.forEach(r=> html += `<tr><td>${_helpers.escapeHtml(r.product.productName||r.product.name||'غير معروف')}</td><td>${_helpers.formatNumber(r.qty)}</td></tr>`);
		html += `</tbody></table>`;
		// time series
		html += `<h3>السلاسل الزمنية</h3><table><thead><tr><th>الفترة</th><th>الطلبات</th><th>الإيراد</th></tr></thead><tbody>`;
		last.seriesRows.forEach(r=> html += `<tr><td>${_helpers.escapeHtml(r.period)}</td><td>${_helpers.formatNumber(r.orders)}</td><td>${_helpers.formatCurrency(r.revenue,'EGP')}</td></tr>`);
		html += `</tbody></table>`;
		html += `</body></html>`;
		const w = window.open('', '_blank');
		w.document.write(html);
		w.document.close();
		w.focus();
		setTimeout(()=> w.print(), 500);
	}

	// expose

function renderEmployeesReport(container, data, opts) {
	const { users, expenses } = data;
	const from = opts.from; const to = opts.to;
	// compute per-employee sums
	const rows = (users||[]).map(u=>{
		const salary = Number(u.salary||0);
		const advances = (expenses||[]).filter(e=> String(e.employeeId||'')===String(u._id) && e.type==='advance' && inRange(e.createdAt||e.date||e.created, from, to)).reduce((s,x)=> s + (Number(x.amount)||0), 0);
		const deductions = (expenses||[]).filter(e=> String(e.employeeId||'')===String(u._id) && e.type==='deduction' && inRange(e.createdAt||e.date||e.created, from, to)).reduce((s,x)=> s + (Number(x.amount)||0), 0);
		const remaining = salary - advances - deductions;
		return { id: u._id, name: u.name||u.username||u.email||'غير معروف', salary, advances, deductions, remaining };
	});
	const html = `
		<h4>تقارير الموظفين</h4>
		<p>عدد الموظفين: <strong>${_helpers.formatNumber(rows.length)}</strong></p>
		<div class="table-responsive"><table class="store-table"><thead><tr><th>الموظف</th><th>الراتب</th><th>إجمالي السلف</th><th>إجمالي الخصومات</th><th>المتبقي</th></tr></thead><tbody>
		${rows.map(r=>`<tr><td>${_helpers.escapeHtml(r.name)}</td><td>${_helpers.formatCurrency(r.salary,'EGP')}</td><td>${_helpers.formatCurrency(r.advances,'EGP')}</td><td>${_helpers.formatCurrency(r.deductions,'EGP')}</td><td>${_helpers.formatCurrency(r.remaining,'EGP')}</td></tr>`).join('')}
		</tbody></table></div>
	`;
	container.innerHTML = html;
	const csvRows = [['الموظف','الراتب','إجمالي السلف','إجمالي الخصومات','المتبقي']].concat(rows.map(r=>[r.name, r.salary, r.advances, r.deductions, r.remaining]));
	window.storeDashboard.reports._lastByType = window.storeDashboard.reports._lastByType || {};
	window.storeDashboard.reports._lastByType.employees = { csvRows, printHtml: html, data: { rows } };
}

	window.storeDashboard.reports.init = init;
	window.storeDashboard.reports.renderPanel = renderPanel;

})();
