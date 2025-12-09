(function(){
	window.storeDashboard = window.storeDashboard || {};
	window.storeDashboard.employees = { _loaded: true };

	let _state, _helpers;
	function init(ctx){ _state = ctx.state; _helpers = ctx.helpers || {}; window.storeDashboard.employees._inited = true; }

	function renderPanel(){
		const panel = document.getElementById('store-staff-panel'); if(!panel) return;
		panel.innerHTML = `
			<div class="store-card">
				<h3><i class="fas fa-user-tie"></i> الموظفين</h3>
				<div style="display:flex;gap:8px;flex-wrap:wrap;">
					<button class="btn btn-primary" id="newStaffBtn">انشاء موظف جديد</button>
					<input id="staffSearch" placeholder="ابحث عن موظف" style="inline-size:220px;">
				</div>
			</div>
			<div id="staffList" class="store-card" style="margin-block-start:12px;"></div>
		`;
		document.getElementById('newStaffBtn')?.addEventListener('click', ()=> openNewStaffModal());
		document.getElementById('staffSearch')?.addEventListener('input', _helpers.debounce(()=> loadStaff(),350));
		loadStaff();
	}

	async function loadStaff(){
		const list = document.getElementById('staffList'); if(!list) return;
		list.innerHTML = '<div class="store-loading"><div class="loader"></div><p>جارٍ تحميل الموظفين...</p></div>';
		try{
			const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}` };
			const q = document.getElementById('staffSearch')?.value || '';
			const resp = await _helpers.handleApiRequest(`/api/users/${storeId}/users?search=${encodeURIComponent(q)}&limit=50`, { headers }).catch(()=>({ users: [] }));
			const users = Array.isArray(resp.users) ? resp.users : (resp.users || []);
			list.innerHTML = users.map(u => `
				<div class="employee-card">
					<div style="display:flex;justify-content:space-between;align-items:center;">
						<div>
							<strong>${_helpers.escapeHtml(u.name || u.username || 'اسم غير معروف')}</strong>
							<div class="muted">${_helpers.escapeHtml(u.username||'')}</div>
						</div>
						<div style="text-align:end;">
							<div>${_helpers.formatNumber(u.salary||0)} ج.م.</div>
							<button class="btn btn-secondary btn-sm" data-id="${u._id}" onclick="(function(){ window.storeDashboard.employees.openEdit('${u._id}'); })()">تعديل</button>
						</div>
					</div>
				</div>
			`).join('') || '<p>لا يوجد موظفين.</p>';
		}catch(err){ console.error(err); list.innerHTML = `<p class="error">${_helpers.escapeHtml(err.message||'تعذر تحميل الموظفين')}</p>`; }
	}

	function openNewStaffModal(){
		const modal = document.createElement('div'); modal.className='modal';
		modal.innerHTML = `
			<div class="modal-content">
				<h3>انشاء موظف جديد</h3>
				<div class="form-group"><label>اسم الموظف (عربي)</label><input id="empName"></div>
				<div class="form-group"><label>اسم الدخول (انجليزي)</label><input id="empUsername"></div>
				<div class="form-group"><label>كلمة السر</label><input id="empPassword" type="password"></div>
				<div class="form-group"><label>هاتف</label><input id="empPhone"></div>
				<div class="form-group"><label>صورة بطاقة الموظف (اختياري)</label><input id="empIdImage" type="file" accept="image/*"></div>
				<div class="form-group"><label>الراتب</label><input id="empSalary" type="number"></div>
				<div class="form-group"><label>الصلاحيات</label><div><label><input type="checkbox" id="permAdmin"> أدمن</label></div><div style="margin-block-start:6px;">الصفحات:<div id="permPages"></div></div></div>
				<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-secondary" id="empCancel">إلغاء</button><button class="btn btn-primary" id="empSave">حفظ</button></div>
			</div>
		`;
		document.body.appendChild(modal);
		// render pages checklist
		const pages = ['الإعدادات','التصميم','الكاتالوج','الطلبات','بيانات العملاء','الموردين','المشتريات','إدارة الديون','المبيعات','التقارير','المصروفات','الموظفين'];
		const permPages = document.getElementById('permPages');
		pages.forEach(p=>{ const id = 'pp_'+p.replace(/\s+/g,'_'); const el = document.createElement('label'); el.innerHTML = `<input type="checkbox" data-page="${_helpers.escapeHtml(p)}"> ${_helpers.escapeHtml(p)}`; permPages.appendChild(el); });
		// when admin checkbox is checked, hide page-level checkboxes and mark admin true
		const adminChk = document.getElementById('permAdmin');
		function togglePermPages(){ if (adminChk.checked){ permPages.style.display = 'none'; } else { permPages.style.display = ''; } }
		adminChk.addEventListener('change', togglePermPages); togglePermPages();
		document.getElementById('empCancel')?.addEventListener('click', ()=> modal.remove());
		document.getElementById('empSave')?.addEventListener('click', async ()=>{
			const name = document.getElementById('empName')?.value; const username = document.getElementById('empUsername')?.value; const password = document.getElementById('empPassword')?.value; const phone = document.getElementById('empPhone')?.value; const salary = Number(document.getElementById('empSalary')?.value||0);
			if(!name||!username||!password) return _helpers.showToast('ادخل الاسم واسم الدخول وكلمة السر','error');
			const perms = adminChk.checked ? [] : Array.from(permPages.querySelectorAll('input[type=checkbox]')).filter(i=>i.checked).map(i=>i.dataset.page);
			try{
				const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}` };
				const form = new FormData(); form.append('name', name); form.append('username', username); form.append('password', password); form.append('phone', phone||''); form.append('salary', salary); form.append('permissions', JSON.stringify({ admin: document.getElementById('permAdmin')?.checked, pages: perms }));
				const fileInput = document.getElementById('empIdImage'); if(fileInput && fileInput.files && fileInput.files[0]) form.append('idImage', fileInput.files[0]);
				await _helpers.handleApiRequest(`/api/users/${storeId}/users`, { method:'POST', headers: { Authorization: `Bearer ${_state.token}` } }, form);
				modal.remove(); loadStaff(); _helpers.showToast('تم انشاء الموظف');
			}catch(err){ console.error(err); _helpers.showToast(err.message||'فشل الإنشاء','error'); }
		});
	}

	window.storeDashboard.employees.openEdit = async function(id){
		// open edit modal (simplified)
		const storeId = _state.store?._id; const headers = { Authorization: `Bearer ${_state.token}` };
		try{
			const resp = await _helpers.handleApiRequest(`/api/users/${storeId}/users/${id}`, { headers }).catch(()=>({ user: null }));
			const u = resp.user;
			const modal = document.createElement('div'); modal.className='modal';
			modal.innerHTML = `
				<div class="modal-content">
					<h3>تعديل الموظف</h3>
					<div class="form-group"><label>الاسم</label><input id="empNameEdit" value="${_helpers.escapeHtml(u.name||'')}"></div>
					<div class="form-group"><label>الهاتف</label><input id="empPhoneEdit" value="${_helpers.escapeHtml(u.phone||'')}"></div>
					<div class="form-group"><label>الراتب</label><input id="empSalaryEdit" type="number" value="${_helpers.escapeHtml(u.salary||0)}"></div>
					<div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-secondary" id="empCancelEdit">إلغاء</button><button class="btn btn-primary" id="empSaveEdit">حفظ</button></div>
				</div>
			`;
			document.body.appendChild(modal);
			document.getElementById('empCancelEdit')?.addEventListener('click', ()=> modal.remove());
			document.getElementById('empSaveEdit')?.addEventListener('click', async ()=>{
				const name = document.getElementById('empNameEdit')?.value; const phone = document.getElementById('empPhoneEdit')?.value; const salary = Number(document.getElementById('empSalaryEdit')?.value||0);
				try{
					await _helpers.handleApiRequest(`/api/users/${storeId}/users/${id}`, { method:'PUT', headers: { Authorization: `Bearer ${_state.token}`, 'Content-Type':'application/json' } }, JSON.stringify({ name, phone, salary }));
					modal.remove(); loadStaff(); _helpers.showToast('تم الحفظ');
				}catch(e){ console.error(e); _helpers.showToast(e.message||'خطأ','error'); }
			});
		}catch(e){ console.error(e); _helpers.showToast('تعذّر جلب بيانات الموظف','error'); }
	}

	window.storeDashboard.employees.init = init;
	window.storeDashboard.employees.renderPanel = renderPanel;
})();
