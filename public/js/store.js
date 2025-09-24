// /public/js/store.js

document.addEventListener('DOMContentLoaded', () => {
  const createStoreBtn = document.getElementById('createStoreBtn');
  if (!createStoreBtn) return;

  createStoreBtn.addEventListener('click', async () => {
    createStoreBtn.disabled = true;
    createStoreBtn.textContent = 'جارٍ إنشاء المتجر...';

    try {
      const response = await fetch('/api/stores', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})  // لا ترسل بيانات لتستخدم الافتراضية في الباكند
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'فشل في إنشاء المتجر');

      alert(data.message);

      // توجه المستخدم لصفحة لوحة التحكم للمتجر بعد الإنشاء
      window.location.href = `/store-manager?storeId=${data.store._id}`;

    } catch (err) {
      alert('خطأ: ' + err.message);
    } finally {
      createStoreBtn.disabled = false;
      createStoreBtn.textContent = 'إنشاء المتجر';
    }
  });
});
