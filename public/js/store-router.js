// public/js/store-router.js
// توجيه صفحة المتجر القديمة تلقائيًا لصفحة الهبوط الجديدة مؤقتًا
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    try {
      const parts = location.pathname.split('/').filter(Boolean);
      const storeIndex = parts.indexOf('store');
      if (storeIndex !== -1 && parts[storeIndex+1]){
        const storeLink = decodeURIComponent(parts[storeIndex+1]);
        // لو أنا على /store/:storeLink مباشرة، حولني لصفحة الهبوط
        if (!parts[storeIndex+2]) {
          const target = `/store/${encodeURIComponent(storeLink)}/landing`;
          console.log('[Store Router] تحويل تلقائي إلى صفحة الهبوط:', target);
          location.replace(target);
        }
      }
    } catch(e){
      console.error('[Store Router] خطأ أثناء التحويل:', e);
    }
  });
})();
