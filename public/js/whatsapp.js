// public/js/whatsapp.js

document.addEventListener("DOMContentLoaded", () => {
  async function loadWhatsAppPage() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/facebook.css";
    document.head.appendChild(link);
    const content = document.getElementById("content");
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");

    if (!selectedBotId) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
          <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض إعدادات واتساب.</p>
        </div>
      `;
      return;
    }

    if (!token) {
      content.innerHTML = `
        <div class="placeholder error">
          <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
          <p>يرجى تسجيل الدخول لعرض إعدادات واتساب.</p>
        </div>
      `;
      return;
    }

    // Main structure for the WhatsApp settings page
    content.innerHTML = `
      <div class="page-header">
        <h2><i class="fab fa-whatsapp"></i> إعدادات ربط واتساب</h2>
        <div id="instructionsContainer" class="instructions-container">
          <h3>📋 خطوات بسيطة لربط حسابك على واتساب</h3>
          <p>عشان تقدر تربط حسابك بالبوت بنجاح، اتأكد من الخطوات دي:</p>
          <ul>
            <li>
              <strong>تحميل تطبيق سطح المكتب:</strong> لازم تحمل تطبيق زين بوت لسطح المكتب عشان تقدر تربط حسابك على واتساب.
              <br>
              <span style="display: block; margin-top: 5px;">
                <a href="[GOOGLE_DRIVE_LINK]" target="_blank" class="btn btn-primary" style="margin-top: 10px; color: #000000;">
                  <i class="fas fa-download"></i> تحميل تطبيق زين بوت لسطح المكتب
                </a>
              </span>
            </li>
            <li>
              <strong>تسجيل الدخول:</strong> افتح التطبيق وسجل دخول بنفس اسم المستخدم وكلمة المرور اللي بتستخدمها هنا.
            </li>
            <li>
              <strong>ربط الحساب:</strong>  في التطبيق، امسح الـ QR Code اللي هيظهرلك باستخدام تطبيق واتساب على موبايلك.
            </li>
            <li>
              <strong>التواصل معانا:</strong> لو واجهت أي مشكلة أثناء الربط، تواصل معانا على واتساب على الرقم 
              <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.
            </li>
          </ul>
        </div>
      </div>

      <div id="errorMessage" class="error-message" style="display: none;"></div>
    `;

    const errorMessage = document.getElementById("errorMessage");
  }

  // Make loadWhatsAppPage globally accessible
  window.loadWhatsAppPage = loadWhatsAppPage;

  // Ensure the function is available even if called early
  if (window.loadWhatsAppPage) {
    console.log('✅ loadWhatsAppPage is defined and ready');
  } else {
    console.error('❌ loadWhatsAppPage is not defined');
  }
});
