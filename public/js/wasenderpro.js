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
      <p>Wasender Pro هو الحل الأمثل للتسويق عبر واتساب! سواء كنت صاحب بيزنس صغير أو شركة كبيرة، التطبيق ده بيقدملك أدوات قوية لإدارة حملاتك التسويقية بسهولة وسرعة. من إرسال رسايل لملايين الأرقام لحد سحب بيانات العملاء من جوجل مابس ومواقع التواصل، Wasender Pro هيساعدك توصل لجمهورك بكفاءة وتجنب الحظر. التطبيق مجاني تمامًا مع اشتراكك في زين بوت!</p>
    </div>

    <div class="instructions-container">
      <h3>🚀 مميزات Wasender Pro</h3>
      <ul>
        <li><strong>حملات تسويقية ضخمة:</strong> ابعت رسايل تسويقية لملايين الأرقام في ثواني باستخدام قوايم أرقام جاهزة أو ملفات Excel. التطبيق بيدعم إرسال رسايل نصية، صور، فيديوهات، وملفات بسرعة عالية.</li>
        <li><strong>سحب بيانات العملاء:</strong> اسحب بيانات العملاء زي الأرقام والإيميلات من مواقع التواصل الاجتماعي (فيسبوك، إنستجرام) أو من خريطة جوجل بسهولة. استهدف جمهورك بدقة بناءً على الموقع أو الاهتمامات.</li>
        <li><strong>شات بوت ذكي:</strong> اعمل شات بوت عادي يرد تلقائيًا على استفسارات العملاء بناءً على كلمات مفتاحية، عشان توفر وقتك وتحسن تجربة العميل.</li>
        <li><strong>استخراج أرقام المجموعات:</strong> اسحب أرقام أعضاء أي مجموعة واتساب بضغطة زر، سواء كنت عضو في المجموعة أو لأ. مثالي لتوسيع قاعدة عملاءك.</li>
        <li><strong>استخراج أرقام الدردشات:</strong> اجمع أرقام كل الدردشات الموجودة في واتساب بتاعك، حتى لو مش محفوظة في جهات الاتصال.</li>
        <li><strong>فلترة أرقام واتساب:</strong> استخدم أدوات فلترة قوية عشان تتأكد إن الأرقام اللي بتبعتلها فعّالة على واتساب، وفر وقتك وجهدك.</li>
        <li><strong>أدوات فك الحظر:</strong> استفيد من أدوات ذكية لتجنب الحظر زي الإرسال بتأخير (20-30 ثانية بين كل رسالة)، تحديد عدد الرسايل في الساعة (200-300 رسالة)، وإضافة أرقام عائلية في القوايم.</li>
        <li><strong>سحب وتحويل الأرقام:</strong> حول الأرقام من صيغة لصيغة (زي من نص لـ CSV) واسحب أرقام من مواقع أو مجموعات بسهولة لتنظيم حملاتك.</li>
        <li><strong>جدولة الرسايل:</strong> خطط لحملاتك مسبقًا وحدد مواعيد الإرسال عشان توصل للعملاء في الوقت المظبوط.</li>
        <li><strong>تقارير مفصلة:</strong> تابع أداء حملاتك مع تقارير توضح الرسايل المبعتة والفاشلة، عشان تعرف إزاي تحسن استراتيجيتك.</li>
        <li><strong>دعم فني 24/7:</strong> لو واجهت أي مشكلة، فريقنا جاهز يساعدك على واتساب <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.</li>
      </ul>
    </div>

    <div class="instructions-container">
      <h3>📥 تحميل التطبيق</h3>
      <p>حمل Wasender Pro دلوقتي وابدأ تستفيد من كل المميزات القوية دي مع اشتراكك في زين بوت!</p>
      <a href="https://drive.google.com/file/d/1p3YvpRkAoBQFilhPnc5tV7fAbxwWIaMK/view?usp=drive_link" target="_blank" class="btn btn-primary" style="margin-top: 10px;">
        <i class="fas fa-download"></i> تحميل Wasender Pro
      </a>
    </div>

    <div class="instructions-container">
      <h3>🔑 طريقة تفعيل الاشتراك</h3>
      <p>اتبع الخطوات دي عشان تفعّل اشتراكك في Wasender Pro بسهولة:</p>
      <ul>
        <li><strong>تثبيت التطبيق:</strong> حمل التطبيق من الرابط أعلاه، فك الضغط عن الملف، وسطّبه زي أي برنامج عادي.</li>
        <li><strong>فتح التطبيق:</strong> لما تفتح البرنامج، هيطلب منك مفتاح تشغيل، وهيظهرلك سيريال الجهاز الخاص بيك.</li>
        <li><strong>إرسال السيريال:</strong> ابعتلنا سيريال الجهاز مع اسم حسابك على موقع زين بوت على واتساب <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.</li>
        <li><strong>استلام المفتاح:</strong> هنبعتلك مفتاح تشغيل مجاني لمدة شهر لأول مرة، أو مفتاح تشغيل يغطي كل مدة اشتراكك في زين بوت.</li>
        <li><strong>التواصل معانا:</strong> لو واجهت أي مشكلة، كلمنا على <a href="https://wa.me/01279425543" target="_blank">01279425543</a>.</li>
      </ul>
    </div>

    <div class="instructions-container">
      <h3>🎥 فيديو شرح Wasender Pro</h3>
      <p>اتفرج على الفيديو ده عشان تتعرف أكتر على إزاي تستخدم Wasender Pro وتستفيد من كل إمكانياته:</p>
      <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
        <iframe src="https://www.youtube.com/embed/19evcbL56Wc" 
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
