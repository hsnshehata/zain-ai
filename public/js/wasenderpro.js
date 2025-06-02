// public/js/wasenderpro.js

async function loadWasenderProPage() {
  // Load CSS
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/css/facebook.css";
  document.head.appendChild(link);

  // Get content element
  const content = document.getElementById("content");
  const token = localStorage.getItem("token");
  const selectedBotId = localStorage.getItem("selectedBotId");

  // Check for token
  if (!token) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> تسجيل الدخول مطلوب</h2>
        <p>يرجى تسجيل الدخول لعرض تفاصيل Wasender Pro.</p>
      </div>
    `;
    return;
  }

  // Check for selected bot
  if (!selectedBotId) {
    content.innerHTML = `
      <div class="placeholder error">
        <h2><i class="fas fa-exclamation-triangle"></i> لم يتم اختيار بوت</h2>
        <p>يرجى اختيار بوت من القائمة العلوية أولاً لعرض تفاصيل Wasender Pro.</p>
      </div>
    `;
    return;
  }

  // Main structure for the Wasender Pro page
  content.innerHTML = `
    <div class="page-header">
      <h2><i class="fas fa-bolt"></i> Wasender Pro</h2>
    </div>

    <div class="instructions-container">
      <h3>📢 مقدمة عن Wasender Pro</h3>
      <p>Wasender Pro هو تطبيق قوي مصمم لتحسين تجربة إدارة الرسائل على واتساب، مع أدوات متطورة تساعدك تبعت رسايل بسرعة وكفاءة، وكمان بيوفرلك تحليلات دقيقة لأداء حملاتك. التطبيق مجاني تمامًا طوال فترة اشتراكك في زين بوت!</p>
    </div>

    <div class="instructions-container">
      <h3>🚀 مميزات Wasender Pro</h3>
      <ul>
        <li><strong>إرسال رسائل جماعية:</strong> بعت رسائل لأعداد كبيرة من العملاء في ثواني.</li>
        <li><strong>جدولة الرسائل:</strong> حدد مواعيد إرسال الرسائل تلقائيًا عشان توفر وقتك.</li>
        <li><strong>تحليلات متقدمة:</strong> تابع أداء رسائلك مع تقارير دقيقة وسهلة الفهم.</li>
        <li><strong>واجهة سهلة:</strong> تصميم بسيط يناسب المبتدئين والمحترفين.</li>
        <li><strong>دعم فني مستمر:</strong> فريقنا جاهز يساعدك في أي وقت على <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.</li>
      </ul>
    </div>

    <div class="instructions-container">
      <h3>📥 تحميل التطبيق</h3>
      <p>حمل تطبيق Wasender Pro دلوقتي واستمتع بكل المميزات المجانية مع اشتراكك في زين بوت.</p>
      <a href="https://drive.google.com/file/d/1p3YvpRkAoBQFilhPnc5tV7fAbxwWIaMK/view?usp=drive_link" target="_blank" class="btn btn-primary" style="margin-top: 10px;">
        <i class="fas fa-download"></i> تحميل Wasender Pro
      </a>
    </div>

    <div class="instructions-container">
      <h3>🔑 طريقة تفعيل الاشتراك</h3>
      <p>اتبع الخطوات دي عشان تفعل اشتراكك في Wasender Pro بسهولة:</p>
      <ul>
        <li><strong>تثبيت التطبيق:</strong> حمل التطبيق من الرابط أعلاه، وفك الضغط عن الملف، وسطب البرنامج زي أي برنامج عادي.</li>
        <li><strong>فتح التطبيق:</strong> لما تفتح البرنامج، هيطلب منك مفتاح تشغيل، وهيظهرلك سيريال الجهاز الخاص بيك.</li>
        <li><strong>إرسال السيريال:</strong> ابعتلنا سيريال الجهاز مع اسم حسابك على موقع زين بوت على واتساب <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.</li>
        <li><strong>استلام المفتاح:</strong> هنبعتلك مفتاح تشغيل مجاني لمدة شهر لأول مرة، أو مفتاح تشغيل يغطي كل مدة اشتراكك في زين بوت.</li>
        <li><strong>التواصل معانا:</strong> لو واجهت أي مشكلة، كلمنا على <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.</li>
      </ul>
    </div>

    <div class="instructions-container">
      <h3>🎥 فيديو شرح Wasender Pro</h3>
      <p>اتفرج على الفيديو ده عشان تتعرف أكتر على إزاي تستخدم Wasender Pro بكفاءة:</p>
      <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
        <iframe src="https://www.youtube.com/embed/fkL9HozuajI" 
                style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen></iframe>
      </div>
    </div>

    <div id="errorMessage" class="error-message" style="display: none;"></div>
  `;

  const errorMessage = document.getElementById("errorMessage");
}

// Make loadWasenderProPage globally accessible
window.loadWasenderProPage = loadWasenderProPage;

// Ensure the function is available even if called early
if (window.loadWasenderProPage) {
  console.log('✅ loadWasenderProPage is defined and ready');
} else {
  console.error('❌ loadWasenderProPage is not defined');
}
