
(function(){
	window.storeDashboard = window.storeDashboard || {};
	window.storeDashboard.expenses = { _loaded: true };

	let _state, _helpers;
	let _prefetchedEmployees = []; // cache for modal dropdown
	function init(ctx){
		_state = ctx.state; _helpers = ctx.helpers || {}; window.storeDashboard.expenses._inited = true;
		// inject small input style for consistent look in this panel
		if (!document.getElementById('sd-expenses-style')){
			const s = document.createElement('style'); s.id = 'sd-expenses-style'; s.innerHTML = `
						.sd-input{ padding:8px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; background:#fff; }
						.expense-card .muted{ color:#6b7280; font-size:12px; }
						.dlist-item{ padding:6px 8px; cursor:pointer; }
						.dlist-item:hover{ background:#f3f4f6; }
						.expense-card{ box-shadow:0 1px 2px rgba(0,0,0,0.04); box-sizing:border-box; overflow:hidden; }
						.expense-badge{ display:inline-block; padding:4px 8px; border-radius:999px; font-size:12px; margin-inline-start:8px; white-space:nowrap; }
						.badge-expense{ background:#eef2ff; color:#1e3a8a; }
						.badge-advance{ background:#fff7ed; color:#92400e; }
						.badge-deduction{ background:#fee2e2; color:#991b1b; }
						.modal-content h3{ margin:0 0 8px 0; font-size:18px; display:flex;align-items:center;gap:8px; }
						/* header emoji handled inline in template; removed pseudo-element */
						.modal .form-group label{ display:block; margin-block-end:6px; font-weight:600; }
						/* expenses grid cards */
						.expenses-grid{ display:flex; flex-wrap:wrap; gap:10px }
						.expenses-grid .expense-card{ inline-size:240px; min-inline-size:220px; padding:10px; display:flex; flex-direction:column; gap:6px; align-items:flex-start }
						.expense-card .card-actions{ display:flex; gap:8px; margin-block-start:8px; inline-size:100%; justify-content:center; align-items:center; box-sizing:border-box; }
						.expense-card .card-actions .left{ display:flex; gap:6px; align-items:center }
						.expense-card .action-btn{ inline-size:26px; block-size:26px; padding:0; font-size:11px; display:grid; place-items:center; border-radius:6px }
						.expense-card .action-btn i{ font-size:11px }
						#newExpenseBtn i.fa-plus{ transform:translateY(-1px) }
			`; document.head.appendChild(s);
		}
	}

	function renderPanel(){
		const panel = document.getElementById('store-expenses-panel'); if(!panel) return;
		panel.innerHTML = `
			<div class="store-card">
				<h3><i class="fas fa-money-bill-wave"></i> المصروفات والسلف والخصومات</h3>
				<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
						<button class="btn btn-primary" id="newExpenseBtn"><i class="fas fa-plus" style="margin-inline-end:6px"></i>سجل حركة جديدة</button>
						<button class="btn btn-outline" id="printFilteredBtn">طباعة النتائج</button>
					<div style="display:flex;gap:8px;align-items:center;margin-inline-start:auto;">
						<select id="filterType" class="sd-input"><option value="all">الكل</option><option value="expense">مصروف</option><option value="advance">سلفة</option><option value="deduction">خصم</option></select>
						<input type="date" id="filterFrom" class="sd-input" />
						<input type="date" id="filterTo" class="sd-input" />
						<select id="filterEmployee" class="sd-input" style="inline-size:180px; display:none;"><option value="">كل الموظفين</option></select>
						<button class="btn btn-outline" id="applyFiltersBtn">تطبيق</button>
					</div>
				</div>
			</div>
			<div id="expensesList" class="store-card" style="margin-block-start:12px;"></div>
		`;

		// sensible defaults: last 30 days
		const to = new Date(); const from = new Date(); from.setDate(from.getDate()-30);
		document.getElementById('filterTo').value = to.toISOString().slice(0,10);
		document.getElementById('filterFrom').value = from.toISOString().slice(0,10);

		document.getElementById('newExpenseBtn')?.addEventListener('click', ()=> openExpenseModal());
		document.getElementById('applyFiltersBtn')?.addEventListener('click', ()=> loadExpenses());

		// toggle filter fields depending on selected type
		const filterType = document.getElementById('filterType');
		const filterEmployee = document.getElementById('filterEmployee');
		function toggleFilterFields(){
			const t = filterType.value;
			// only show employee filter for advances/ deductions
			if (t === 'advance' || t === 'deduction') { filterEmployee.style.display = ''; }
			else { filterEmployee.style.display = 'none'; }
		}
		filterType.addEventListener('change', toggleFilterFields);
		// populate filter select once (allow manual refresh via opening the modal)
		loadEmployeesForAutocomplete('');
		toggleFilterFields();
		
		// bind print button
		document.getElementById('printFilteredBtn')?.addEventListener('click', () => printFilteredExpenses());
		loadExpenses();
	}

	async function loadEmployeesForAutocomplete(q){
		try{
			const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}` };
			const search = q ? `&search=${encodeURIComponent(q)}` : '';
			const resp = await _helpers.handleApiRequest(`/api/users/${storeId}/users?limit=500${search}`, { headers }).catch(()=>({ users: [] }));
			const users = Array.isArray(resp.users) ? resp.users : (resp.users || []);
			// populate filter select
			const fsel = document.getElementById('filterEmployee'); if (fsel){
				const opts = [`<option value="">كل الموظفين</option>`].concat(users.map(u=>`<option value="${_helpers.escapeHtml(u._id)}">${_helpers.escapeHtml(u.name||u.username||u.email)}</option>`));
				fsel.innerHTML = opts.join('');
			}
			return users;
		}catch(e){ console.error(e); return []; }
	}

	function showDatalistFor(inputId, items){
		const input = document.getElementById(inputId);
		// if input not present, remove any old datalist and return
		if (!input){ const old = document.getElementById(inputId+'-datalist'); if (old) old.remove(); return; }
		let dl = document.getElementById(inputId+'-datalist');
		if (!dl){
			dl = document.createElement('div'); dl.id = inputId+'-datalist'; dl.style.position='absolute'; dl.style.background='#fff'; dl.style.border='1px solid #ddd'; dl.style.zIndex=1200; dl.style.boxShadow='0 4px 8px rgba(0,0,0,0.06)'; dl.style.maxHeight='240px'; dl.style.overflow='auto'; document.body.appendChild(dl);
		}
		const rect = input.getBoundingClientRect(); dl.style.left = (rect.left + window.scrollX) + 'px'; dl.style.top = (rect.bottom + window.scrollY) + 'px'; dl.style.minInlineSize = rect.width + 'px'; dl.style.display = 'block';
		if (!items || !items.length){ dl.innerHTML = `<div class="dlist-item disabled">لا يوجد موظفين مسجلين</div>`; return; }
		dl.innerHTML = items.map(i=>{
			const parts = i.split('::'); return `<div class="dlist-item" data-val="${_helpers.escapeHtml(parts[0])}">${_helpers.escapeHtml(parts[1])}</div>`;
		}).join('');
		dl.querySelectorAll('.dlist-item').forEach(el=> el.addEventListener('click', (ev)=>{ ev.stopPropagation(); input.value = el.textContent; input.dataset.selected = el.getAttribute('data-val')||el.dataset.val; dl.remove(); }));
		// close when clicking outside
		function _c(e){ if(!dl.contains(e.target) && e.target !== input){ dl.remove(); document.removeEventListener('click', _c); } }
		document.addEventListener('click', _c);
	}

	async function loadExpenses(){
		const list = document.getElementById('expensesList'); if(!list) return;
		list.innerHTML = '<div class="store-loading"><div class="loader"></div><p>جارٍ تحميل المعاملات...</p></div>';
		try{
			const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}` };
			const type = document.getElementById('filterType')?.value || 'all';
			const from = document.getElementById('filterFrom')?.value; const to = document.getElementById('filterTo')?.value;
			const empInput = document.getElementById('filterEmployee'); const empSelected = empInput?.value || '';
			let q = `?limit=200`;
			if (type && type !== 'all') q += `&type=${encodeURIComponent(type)}`;
			const resp = await _helpers.handleApiRequest(`/api/expenses/${storeId}/expenses${q}`, { headers }).catch(()=>({ expenses: [] }));
			let expenses = Array.isArray(resp.expenses) ? resp.expenses : [];
			// filter by date/payee/employee locally
			const fromT = parseDateInput(from); const toT = parseDateInput(to);
			expenses = expenses.filter(e => inRange(e.createdAt||e.date, fromT, toT));
			if (empSelected) expenses = expenses.filter(e => String(e.employeeId||'') === String(empSelected));

				    if (!expenses.length) { list.innerHTML = '<p>لا توجد معاملات.</p>'; return; }

				    // render as small cards grid
				    list.innerHTML = `<div class="expenses-grid">${expenses.map(e=> renderExpenseCard(e)).join('')}</div>`;

				    // bind edit/delete actions
				    bindExpenseCardActions(expenses);

		}catch(err){ console.error(err); list.innerHTML = `<p class="error">${_helpers.escapeHtml(err.message||'تعذر تحميل المعاملات')}</p>`; }
	}

	function attachPayeeSuggestions(inputId, items){
		const input = document.getElementById(inputId); if(!input) return;
		let dl = document.getElementById(inputId+'-payees');
		if (!dl){ dl = document.createElement('div'); dl.id = inputId+'-payees'; dl.style.position='absolute'; dl.style.background='#fff'; dl.style.border='1px solid #ddd'; dl.style.zIndex=1200; document.body.appendChild(dl); }
		const rect = input.getBoundingClientRect(); dl.style.left = rect.left+'px'; dl.style.top = (rect.bottom+window.scrollY)+'px'; dl.style.minInlineSize = rect.width+'px';
		dl.innerHTML = items.map(i=>`<div class="dlist-item">${_helpers.escapeHtml(i)}</div>`).join('');
		dl.querySelectorAll('.dlist-item').forEach(el=> el.addEventListener('click', ()=>{ input.value = el.textContent; dl.innerHTML=''; }));
		document.addEventListener('click', function _c(e){ if(!dl.contains(e.target) && e.target !== input){ dl.innerHTML=''; document.removeEventListener('click', _c); } });
	}

	function renderExpenseCard(e){
			const typeLabel = e.type === 'advance' ? 'سلفة' : (e.type === 'deduction' ? 'خصم' : 'مصروف');
			const payee = e.payee || (e.employeeName || '—');
			return `
					<div class="expense-card" data-id="${_helpers.escapeHtml(e._id)}" style="border:1px solid #e5e7eb;border-radius:8px;">
						<div style="display:flex;gap:8px;align-items:center;inline-size:100%">
							<div style="font-size:18px;flex:0 0 26px">${ e.type === 'advance' ? '👤' : (e.type === 'deduction' ? '⚠️' : '💸') }</div>
							<div style="min-inline-size:0;display:flex;flex-direction:column;gap:4px;inline-size:100%">
								<div style="display:flex;gap:8px;align-items:center;inline-size:100%">
									<div style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_helpers.escapeHtml(payee)}</div>
									<div class="expense-badge ${ e.type==='advance' ? 'badge-advance' : (e.type==='deduction' ? 'badge-deduction' : 'badge-expense') }">${typeLabel}</div>
								</div>
								<div class="muted">${_helpers.formatDate(e.createdAt||e.date)}</div>
								${ (e.type !== 'advance' && e.reason) ? `<div style="margin-block-start:6px;">${_helpers.escapeHtml(e.reason||'')}</div>` : '' }
							</div>
						</div>
						<div style="inline-size:100%;margin-block-start:8px;display:flex;flex-direction:column;align-items:center;gap:8px">
							<div style="font-weight:700;font-size:1rem;text-align:center">${_helpers.formatCurrency(e.amount||0,'EGP')}</div>
							<div class="card-actions">
								<div class="left">
									<button class="btn btn-sm btn-danger action-btn expense-delete" data-id="${_helpers.escapeHtml(e._id)}" title="حذف" aria-label="حذف"><i class="fas fa-trash"></i></button>
									<button class="btn btn-sm btn-outline action-btn expense-edit" data-id="${_helpers.escapeHtml(e._id)}" title="تعديل" aria-label="تعديل"><i class="fas fa-pen"></i></button>
								</div>
							</div>
						</div>
					</div>
			`;
	}

	function parseDateInput(v) { if (!v) return null; const d = new Date(v+'T00:00:00'); if (Number.isNaN(d.getTime())) return null; return d; }
	function inRange(date, from, to){ if(!date) return false; const t = new Date(date).getTime(); if(from && t < from.getTime()) return false; if(to && t > to.getTime()+24*60*60*1000-1) return false; return true; }

	function openExpenseModal(existing){
		// existing: optional expense object to edit
		const modal = document.createElement('div'); modal.className='modal';
		modal.innerHTML = `
			<div class="modal-content">
				<h3>💳 سجل حركة جديدة</h3>
				<div class="form-group"><label>نوع الحركة</label><select id="expenseType" class="sd-input"><option value="expense">مصروف</option><option value="advance">سلفة</option><option value="deduction">خصم</option></select></div>
				<div class="form-group" id="payeeGroup"><label>جهة الصرف</label><input id="expensePayee" class="sd-input" placeholder="اكتب جهة الصرف"></div>
				<div class="form-group" id="employeePickerGroup" style="display:none;">
					<label>اختَر موظف</label>
					<div style="display:flex;gap:6px;align-items:center;">
						<select id="expenseEmployeeSelect" class="sd-input" style="inline-size:100%"><option value="">اختر موظف</option></select>
					</div>
				</div>
				<div class="form-group"><label>المبلغ</label><input id="expenseAmount" class="sd-input" type="number" step="0.01"></div>
				<div class="form-group" id="reasonGroup"><label>السبب</label><input id="expenseReason" class="sd-input"></div>
				<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-secondary" id="expenseCancel">إلغاء</button><button class="btn btn-primary" id="expenseSave">حفظ</button></div>
			</div>
		`;
		document.body.appendChild(modal);

		const typeSel = document.getElementById('expenseType'); const empGroup = document.getElementById('employeePickerGroup'); const payeeGroup = document.getElementById('payeeGroup');
		function toggleModalFields(){ 
			if (typeSel.value==='advance' || typeSel.value==='deduction'){ 
				empGroup.style.display='block'; payeeGroup.style.display='none'; 
			} else { 
				empGroup.style.display='none'; payeeGroup.style.display='block'; 
			}
			// hide reason input for advances (سلفة)
			const reasonGroup = document.getElementById('reasonGroup'); if (reasonGroup){ if (typeSel.value === 'advance') reasonGroup.style.display = 'none'; else reasonGroup.style.display = 'block'; }
		}
		typeSel.addEventListener('change', toggleModalFields);
		toggleModalFields();

		// employee select and prefetch
		const empSelect = document.getElementById('expenseEmployeeSelect');
		async function prefetchEmployeesForModal(){
			try{
				const storeId = _state.store?._id; if(!storeId) return;
				const headers = { Authorization: `Bearer ${_state.token}` };
				const resp = await _helpers.handleApiRequest(`/api/users/${storeId}/users?limit=500`, { headers }).catch(()=>({ users: [] }));
				const users = Array.isArray(resp.users) ? resp.users : [];
				_prefetchedEmployees = users.map(u=> ({ id: u._id, label: u.name||u.username||u.email }));
				if (empSelect){
					const opts = [`<option value="">اختر موظف</option>`].concat(_prefetchedEmployees.map(u=>`<option value="${_helpers.escapeHtml(u.id)}">${_helpers.escapeHtml(u.label)}</option>`));
					empSelect.innerHTML = opts.join('');
				}
				// also update filter select if present
				const fsel = document.getElementById('filterEmployee'); if (fsel){ const fopts = [`<option value="">كل الموظفين</option>`].concat(_prefetchedEmployees.map(u=>`<option value="${_helpers.escapeHtml(u.id)}">${_helpers.escapeHtml(u.label)}</option>`)); fsel.innerHTML = fopts.join(''); }
			}catch(e){ console.error(e); }
		}
		// prefetch immediately so selection is ready
		prefetchEmployeesForModal().catch(()=>{});

		// if editing existing, prefill
		if (existing && existing._id) {
			document.getElementById('expenseType').value = existing.type || 'expense';
			if (existing.type === 'advance' || existing.type === 'deduction') {
				document.getElementById('expenseEmployeeSelect').value = existing.employeeId || '';
				// hide payee
				document.getElementById('payeeGroup').style.display = 'none';
				document.getElementById('employeePickerGroup').style.display = 'block';
			} else {
				document.getElementById('expensePayee').value = existing.payee || '';
			}
			document.getElementById('expenseAmount').value = existing.amount || '';
			document.getElementById('expenseReason').value = existing.reason || '';
		}

				document.getElementById('expenseCancel')?.addEventListener('click', ()=> modal.remove());
				document.getElementById('expenseSave')?.addEventListener('click', async ()=>{
					const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}`, 'Content-Type':'application/json' };
					const type = document.getElementById('expenseType').value;
					const payeeInput = document.getElementById('expensePayee'); const payee = payeeInput?.value || '';
					const empSelectEl = document.getElementById('expenseEmployeeSelect'); const employeeId = empSelectEl?.value || null;
					const employeeName = empSelectEl?.selectedOptions?.[0]?.text || '';
					const amount = Number(document.getElementById('expenseAmount').value||0);
					const reason = document.getElementById('expenseReason')?.value||'';
					// validation per type
					if (!amount) return _helpers.showToast('ادخل المبلغ الصحيح','error');
					if (type === 'expense'){
						if (!payee) return _helpers.showToast('ادخل جهة الصرف والمبلغ','error');
					} else {
						// advance/deduction require a registered employee selection
						if (!employeeId){ _helpers.showToast('من فضلك اختر موظفًا مسجّلًا من القائمة','error'); return; }
					}
					// build payload
					try{
						const payload = { type, employeeId: employeeId || undefined, amount };
						if (employeeId) payload.payee = employeeName;
						else payload.payee = payee;
						if (type !== 'advance' && reason) payload.reason = reason;
						if (existing && existing._id) {
							// update
							await _helpers.handleApiRequest(`/api/expenses/${storeId}/expenses/${existing._id}`, { method:'PUT', headers }, JSON.stringify(payload));
							_helpers.showToast('تم تحديث المعاملة');
						} else {
							await _helpers.handleApiRequest(`/api/expenses/${storeId}/expenses`, { method:'POST', headers }, JSON.stringify(payload));
							_helpers.showToast('تم حفظ المعاملة');
						}
						modal.remove(); loadExpenses();
					}catch(e){ console.error(e); _helpers.showToast(e.message||'فشل الحفظ','error'); }
				});
	}

// bind actions on rendered expense cards (edit/delete/print per item)
function bindExpenseCardActions(expenses){
	const grid = document.querySelector('#expensesList .expenses-grid'); if(!grid) return;
	grid.querySelectorAll('.expense-edit')?.forEach(btn=> btn.addEventListener('click', async (ev)=>{
		const id = btn.getAttribute('data-id');
		const exp = (expenses || []).find(x=> String(x._id) === String(id));
		if (exp) openExpenseModal(exp);
	}));
	grid.querySelectorAll('.expense-delete')?.forEach(btn=> btn.addEventListener('click', async (ev)=>{
		const id = btn.getAttribute('data-id');
		if (!confirm('تأكيد حذف المعاملة؟')) return;
		try{
			const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}` };
			await _helpers.handleApiRequest(`/api/expenses/${storeId}/expenses/${id}`, { method:'DELETE', headers });
			_helpers.showToast('تم حذف المعاملة'); loadExpenses();
		}catch(e){ console.error(e); _helpers.showToast(e.message||'فشل الحذف','error'); }
	}));
	grid.querySelectorAll('.expense-print-item')?.forEach(btn=> btn.addEventListener('click', async (ev)=>{
		const id = btn.getAttribute('data-id');
		const exp = (expenses || []).find(x=> String(x._id) === String(id));
		if (!exp) return;
		try{
			const w = window.open('', '_blank'); if(!w) return _helpers.showToast('تعذر فتح نافذة الطباعة','error');
			const html = `<html><head><meta charset="utf-8"><title>معاملة ${_helpers.escapeHtml(String(exp._id).slice(-6))}</title><style>body{font-family:Arial;padding:16px}table{inline-size:100%;border-collapse:collapse}td,th{border:1px solid #ddd;padding:8px;text-align:end}</style></head><body><h2>معاملة</h2><p>الجهة: ${_helpers.escapeHtml(exp.payee||exp.employeeName||'—')}</p><p>التاريخ: ${_helpers.formatDate(exp.createdAt||exp.date)}</p><p>الوصف: ${_helpers.escapeHtml(exp.reason||'')}</p><p>المبلغ: ${_helpers.formatCurrency(exp.amount||0,'EGP')}</p></body></html>`;
			w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),200);
		}catch(e){ console.error(e); }
	}));
}

// print filtered expenses (re-fetch with current filters and open print view)
async function printFilteredExpenses(){
	try{
		const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}` };
		const type = document.getElementById('filterType')?.value || 'all';
		let q = `?limit=1000`;
		if (type && type !== 'all') q += `&type=${encodeURIComponent(type)}`;
		const resp = await _helpers.handleApiRequest(`/api/expenses/${storeId}/expenses${q}`, { headers }).catch(()=>({ expenses: [] }));
		let expenses = Array.isArray(resp.expenses) ? resp.expenses : [];
		const from = document.getElementById('filterFrom')?.value; const to = document.getElementById('filterTo')?.value; const empSelected = document.getElementById('filterEmployee')?.value || '';
		const fromT = parseDateInput(from); const toT = parseDateInput(to);
		expenses = expenses.filter(e => inRange(e.createdAt||e.date, fromT, toT));
		if (empSelected) expenses = expenses.filter(e => String(e.employeeId||'') === String(empSelected));
		const rows = expenses.map(e=> `<tr><td>${_helpers.escapeHtml(e.payee||e.employeeName||'—')}</td><td>${_helpers.formatDate(e.createdAt||e.date)}</td><td>${_helpers.formatCurrency(e.amount||0,'EGP')}</td><td>${_helpers.escapeHtml(e.reason||'')}</td></tr>`).join('');
		const html = `<!doctype html><html><head><meta charset="utf-8"><title>طباعة معاملات</title><style>body{font-family:Arial;padding:16px}table{inline-size:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:end}</style></head><body><h2>قائمة المعاملات</h2><table><thead><tr><th>الجهة</th><th>التاريخ</th><th>المبلغ</th><th>السبب</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
		const w = window.open('', '_blank'); if(!w) return _helpers.showToast('تعذر فتح نافذة الطباعة','error');
		w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
	}catch(e){ console.error(e); _helpers.showToast(e.message||'فشل طباعة النتائج','error'); }
}

	// expose
	window.storeDashboard.expenses.init = init;
	window.storeDashboard.expenses.renderPanel = renderPanel;

})();
