// public/js/analytics.js (Updated for unified error handling and CSS loading)

document.addEventListener('DOMContentLoaded', () => {
  async function loadAnalyticsPage() {
    console.log('Starting loadAnalyticsPage');
    // إضافة analytics.css ديناميكيًا
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/css/analytics.css";
    document.head.appendChild(link);
    console.log('Analytics CSS loaded');

    const content = document.getElementById('content');
    const token = localStorage.getItem("token");
    const selectedBotId = localStorage.getItem("selectedBotId");

    console.log('loadAnalyticsPage: selectedBotId:', selectedBotId);
    console.log('loadAnalyticsPage: token:', token);

    if (!content) {
      console.error('Content element not found in DOM');
      return;
    }

    if (!selectedBotId) {
      content.innerHTML = `
        <h2>التحليلات</h2>
        <p style="color: red;">يرجى اختيار بوت من لوحة التحكم أولاً.</p>
      `;
      return;
    }

    if (!token) {
      content.innerHTML = `
        <h2>التحليلات</h2>
        <p style="color: red;">الرجاء تسجيل الدخول لعرض التحليلات.</p>
      `;
      return;
    }

    content.innerHTML = `
      <h2>التحليلات</h2>
      <div class="analytics-container">
        <div class="filter-group">
          <div class="form-group">
            <label>فلترة البيانات حسب الفترة:</label>
            <div class="date-filter">
              <input type="date" id="startDateFilter" placeholder="من تاريخ" />
              <input type="date" id="endDateFilter" placeholder="إلى تاريخ" />
              <button id="applyFilterBtn">تطبيق الفلتر</button>
            </div>
          </div>
        </div>
        <div id="analyticsContent">
          <div id="messagesAnalytics">
            <h3>إحصائيات الرسائل</h3>
            <div id="messagesByChannel">
              <h4>توزيع الرسائل حسب القناة</h4>
              <div class="section-spinner" id="messagesByChannelSpinner">
                <div class="loader"></div>
              </div>
              <div id="messagesByChannelStats" class="stats-text" style="display: none;"></div>
              <div id="messagesByChannelError" class="error-message" style="display: none;"></div>
            </div>
            <div id="dailyMessages">
              <h4>معدل الرسائل يوميًا</h4>
              <div class="section-spinner" id="dailyMessagesSpinner">
                <div class="loader"></div>
              </div>
              <div id="dailyMessagesStats" class="stats-text" style="display: none;"></div>
              <div id="dailyMessagesError" class="error-message" style="display: none;"></div>
            </div>
          </div>
          <div id="feedbackAnalytics">
            <h3>إحصائيات التقييمات</h3>
            <div id="feedbackRatio">
              <h4>نسبة التقييمات الإيجابية مقابل السلبية</h4>
              <div class="section-spinner" id="feedbackRatioSpinner">
                <div class="loader"></div>
              </div>
              <div id="feedbackRatioStats" class="stats-text" style="display: none;"></div>
              <div id="feedbackRatioError" class="error-message" style="display: none;"></div>
            </div>
          </div>
          <div id="rulesAnalytics">
            <h3>إحصائيات القواعد</h3>
            <div id="rulesType">
              <h4>توزيع أنواع القواعد</h4>
              <div class="section-spinner" id="rulesTypeSpinner">
                <div class="loader"></div>
              </div>
              <div id="rulesTypeStats" class="stats-text" style="display: none;"></div>
              <div id="rulesTypeError" class="error-message" style="display: none;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    console.log('Analytics HTML content loaded');

    const analyticsContent = document.getElementById('analyticsContent');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');

    if (!analyticsContent || !startDateFilter || !endDateFilter || !applyFilterBtn) {
      console.error('One or more required elements for analytics page are missing in the DOM');
      content.innerHTML = `
        <h2>التحليلات</h2>
        <p style="color: red;">خطأ: بعض العناصر المطلوبة غير موجودة. حاول تحديث الصفحة.</p>
      `;
      return;
    }

    // جلب البيانات بشكل متتالي (Lazy Loading)
    console.log('Starting to load analytics data');
    await loadMessagesAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
    await loadFeedbackAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
    await loadRulesAnalytics(selectedBotId, token);

    // إعادة جلب البيانات عند تطبيق الفلتر
    applyFilterBtn.addEventListener('click', async () => {
      console.log('Applying filter with startDate:', startDateFilter.value, 'and endDate:', endDateFilter.value);
      await loadMessagesAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
      await loadFeedbackAnalytics(selectedBotId, token, startDateFilter.value, endDateFilter.value);
      await loadRulesAnalytics(selectedBotId, token);
    });

    async function loadMessagesAnalytics(botId, token, startDate, endDate) {
      console.log('Loading messages analytics for botId:', botId);
      try {
        // 1. توزيع الرسائل حسب القناة
        const messagesByChannelSpinner = document.getElementById('messagesByChannelSpinner');
        const messagesByChannelStats = document.getElementById('messagesByChannelStats');
        const messagesByChannelError = document.getElementById('messagesByChannelError');

        if (!messagesByChannelSpinner || !messagesByChannelStats || !messagesByChannelError) {
          console.error('Messages analytics elements missing');
          throw new Error('عناصر إحصائيات الرسائل غير موجودة');
        }

        const channels = ['facebook', 'web', 'instagram', 'whatsapp'];
        const messagesByChannelData = {
          facebook: { userMessages: 0, botMessages: 0 },
          web: { userMessages: 0, botMessages: 0 },
          instagram: { userMessages: 0, botMessages: 0 },
          whatsapp: { userMessages: 0, botMessages: 0 }
        };

        for (const channel of channels) {
          const query = new URLSearchParams({
            type: channel,
            page: 1,
            limit: 1000,
            ...(startDate && { startDate }),
            ...(endDate && { endDate }),
          });
          console.log(`Fetching messages for channel ${channel} with query: ${query.toString()}`);
          const response = await handleApiRequest(`/api/messages/${botId}?${query}`, {
            headers: { Authorization: `Bearer ${token}` },
          }, messagesByChannelError, `فشل في جلب رسائل ${channel}`);

          const conversations = response.conversations || [];

          let userMessageCount = 0;
          let botMessageCount = 0;
          conversations.forEach(conv => {
            userMessageCount += conv.messages.filter(msg => msg.role === 'user').length;
            botMessageCount += conv.messages.filter(msg => msg.role === 'assistant').length;
          });
          messagesByChannelData[channel].userMessages = userMessageCount;
          messagesByChannelData[channel].botMessages = botMessageCount;
          console.log(`Messages for ${channel}: user=${userMessageCount}, bot=${botMessageCount}`);
        }

        const totalUserMessages = messagesByChannelData.facebook.userMessages + messagesByChannelData.web.userMessages + messagesByChannelData.instagram.userMessages + messagesByChannelData.whatsapp.userMessages;
        const totalBotMessages = messagesByChannelData.facebook.botMessages + messagesByChannelData.web.botMessages + messagesByChannelData.instagram.botMessages + messagesByChannelData.whatsapp.botMessages;
        const totalMessages = totalUserMessages + totalBotMessages;

        messagesByChannelStats.innerHTML = `
          <ul>
            <li>إجمالي الرسائل: ${totalMessages}</li>
            <li>إجمالي رسائل المستخدمين: ${totalUserMessages}</li>
            <li>إجمالي ردود البوت: ${totalBotMessages}</li>
            <li>رسائل فيسبوك:
              <ul>
                <li>رسائل المستخدمين: ${messagesByChannelData.facebook.userMessages}</li>
                <li>ردود البوت: ${messagesByChannelData.facebook.botMessages}</li>
                <li>الإجمالي: ${messagesByChannelData.facebook.userMessages + messagesByChannelData.facebook.botMessages}</li>
              </ul>
            </li>
            <li>رسائل الويب:
              <ul>
                <li>رسائل المستخدمين: ${messagesByChannelData.web.userMessages}</li>
                <li>ردود البوت: ${messagesByChannelData.web.botMessages}</li>
                <li>الإجمالي: ${messagesByChannelData.web.userMessages + messagesByChannelData.web.botMessages}</li>
              </ul>
            </li>
            <li>رسائل إنستجرام:
              <ul>
                <li>رسائل المستخدمين: ${messagesByChannelData.instagram.userMessages}</li>
                <li>ردود البوت: ${messagesByChannelData.instagram.botMessages}</li>
                <li>الإجمالي: ${messagesByChannelData.instagram.userMessages + messagesByChannelData.instagram.botMessages}</li>
              </ul>
            </li>
            <li>رسائل واتساب:
              <ul>
                <li>رسائل المستخدمين: ${messagesByChannelData.whatsapp.userMessages}</li>
                <li>ردود البوت: ${messagesByChannelData.whatsapp.botMessages}</li>
                <li>الإجمالي: ${messagesByChannelData.whatsapp.userMessages + messagesByChannelData.whatsapp.botMessages}</li>
              </ul>
            </li>
          </ul>
        `;

        messagesByChannelSpinner.style.display = 'none';
        messagesByChannelStats.style.display = 'block';
        messagesByChannelError.style.display = 'none';

        const dailyMessagesSpinner = document.getElementById('dailyMessagesSpinner');
        const dailyMessagesStats = document.getElementById('dailyMessagesStats');
        const dailyMessagesError = document.getElementById('dailyMessagesError');

        if (!dailyMessagesSpinner || !dailyMessagesStats || !dailyMessagesError) {
          console.error('Daily messages analytics elements missing');
          throw new Error('عناصر معدل الرسائل يوميًا غير موجودة');
        }

        const dailyQuery = new URLSearchParams({
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });
        console.log(`Fetching daily messages with query: ${dailyQuery.toString()}`);
        const dailyData = await handleApiRequest(`/api/messages/daily/${botId}?${dailyQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, dailyMessagesError, 'فشل في جلب معدل الرسائل يوميًا');

        let filteredData = dailyData;
        if (!startDate && !endDate) {
          filteredData = dailyData.slice(-20);
        }

        let dailyStatsHTML = '<ul>';
        filteredData.forEach(item => {
          const date = new Date(item.date).toLocaleDateString("ar-EG");
          dailyStatsHTML += `<li>${date}: ${item.count} رسالة</li>`;
        });
        dailyStatsHTML += '</ul>';

        const totalDailyMessages = filteredData.reduce((sum, item) => sum + item.count, 0);
        dailyStatsHTML = `
          <p>إجمالي الرسائل في الفترة: ${totalDailyMessages}</p>
          ${dailyStatsHTML}
        `;

        dailyMessagesStats.innerHTML = dailyStatsHTML;

        dailyMessagesSpinner.style.display = 'none';
        dailyMessagesStats.style.display = 'block';
        dailyMessagesError.style.display = 'none';

      } catch (err) {
        console.error('Error in loadMessagesAnalytics:', err);
        document.getElementById('messagesByChannelSpinner').style.display = 'none';
        document.getElementById('dailyMessagesSpinner').style.display = 'none';
        const messagesByChannelError = document.getElementById('messagesByChannelError');
        if (messagesByChannelError) {
          messagesByChannelError.textContent = err.message || 'فشل في تحميل إحصائيات الرسائل';
          messagesByChannelError.style.display = 'block';
        }
      }
    }

    async function loadFeedbackAnalytics(botId, token, startDate, endDate) {
      console.log('Loading feedback analytics for botId:', botId);
      try {
        const feedbackRatioSpinner = document.getElementById('feedbackRatioSpinner');
        const feedbackRatioStats = document.getElementById('feedbackRatioStats');
        const feedbackRatioError = document.getElementById('feedbackRatioError');

        if (!feedbackRatioSpinner || !feedbackRatioStats || !feedbackRatioError) {
          console.error('Feedback analytics elements missing');
          throw new Error('عناصر إحصائيات التقييمات غير موجودة');
        }

        const feedbackQuery = new URLSearchParams({
          ...(startDate && { startDate }),
          ...(endDate && { endDate }),
        });
        console.log(`Fetching feedback with query: ${feedbackQuery.toString()}`);
        const feedbackData = await handleApiRequest(`/api/bots/${botId}/feedback?${feedbackQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, feedbackRatioError, 'فشل في جلب التقييمات');

        let positiveCount = 0;
        let negativeCount = 0;
        const feedbackByChannel = {
          facebook: { positive: 0, negative: 0 },
          web: { positive: 0, negative: 0 },
          instagram: { positive: 0, negative: 0 },
          whatsapp: { positive: 0, negative: 0 },
          unknown: { positive: 0, negative: 0 }
        };

        for (const feedback of feedbackData) {
          let channel = 'unknown';

          // Determine channel based on userId prefix
          let inferredChannel = 'unknown';
          if (feedback.userId.startsWith('web_') || feedback.userId === 'anonymous') {
            inferredChannel = 'web';
          } else if (feedback.userId.startsWith('instagram_')) {
            inferredChannel = 'instagram';
          } else if (feedback.userId.startsWith('whatsapp_')) {
            inferredChannel = 'whatsapp';
          } else {
            inferredChannel = 'facebook';
          }

          // Try to fetch conversation only if needed
          let conversation = null;
          if (inferredChannel !== 'unknown') {
            const query = new URLSearchParams({
              type: inferredChannel,
              userId: feedback.userId,
              page: 1,
              limit: 1
            });
            console.log(`Fetching conversation for userId: ${feedback.userId} with type: ${inferredChannel}`);
            conversation = await handleApiRequest(`/api/messages/${botId}?${query}`, {
              headers: { Authorization: `Bearer ${token}` },
            }, null, null, true).catch(err => {
              console.warn(`Failed to fetch conversation for userId: ${feedback.userId}, error: ${err.message}`);
              return null;
            });
          }

          if (conversation && conversation.conversations && conversation.conversations.length > 0) {
            channel = conversation.conversations[0].channel || inferredChannel;
          } else {
            channel = inferredChannel;
          }

          // Ensure channel exists in feedbackByChannel
          if (!feedbackByChannel[channel]) {
            feedbackByChannel[channel] = { positive: 0, negative: 0 };
            console.log(`Added new channel to feedbackByChannel: ${channel}`);
          }

          if (feedback.feedback === 'positive') {
            positiveCount++;
            feedbackByChannel[channel].positive++;
          } else if (feedback.feedback === 'negative') {
            negativeCount++;
            feedbackByChannel[channel].negative++;
          }
        }

        const totalFeedback = positiveCount + negativeCount;
        const positivePercentage = totalFeedback > 0 ? ((positiveCount / totalFeedback) * 100).toFixed(1) : 0;
        const negativePercentage = totalFeedback > 0 ? ((negativeCount / totalFeedback) * 100).toFixed(1) : 0;

        let feedbackStatsHTML = `
          <ul>
            <li>إجمالي التقييمات: ${totalFeedback}</li>
            <li>التقييمات الإيجابية: ${positiveCount} (${positivePercentage}%)</li>
            <li>التقييمات السلبية: ${negativeCount} (${negativePercentage}%)</li>
        `;

        for (const [channel, counts] of Object.entries(feedbackByChannel)) {
          const channelName = {
            facebook: 'فيسبوك',
            web: 'الويب',
            instagram: 'إنستجرام',
            whatsapp: 'واتساب',
            unknown: 'غير معروف'
          }[channel] || channel;
          feedbackStatsHTML += `
            <li>${channelName}:
              <ul>
                <li>إيجابية: ${counts.positive}</li>
                <li>سلبية: ${counts.negative}</li>
                <li>الإجمالي: ${counts.positive + counts.negative}</li>
              </ul>
            </li>
          `;
        }
        feedbackStatsHTML += '</ul>';

        feedbackRatioStats.innerHTML = feedbackStatsHTML;

        feedbackRatioSpinner.style.display = 'none';
        feedbackRatioStats.style.display = 'block';
        feedbackRatioError.style.display = 'none';

      } catch (err) {
        console.error('Error in loadFeedbackAnalytics:', err);
        document.getElementById('feedbackRatioSpinner').style.display = 'none';
        const feedbackRatioError = document.getElementById('feedbackRatioError');
        if (feedbackRatioError) {
          feedbackRatioError.textContent = err.message || 'فشل في تحميل إحصائيات التقييمات';
          feedbackRatioError.style.display = 'block';
        }
      }
    }

    async function loadRulesAnalytics(botId, token) {
      console.log('Loading rules analytics for botId:', botId);
      try {
        const rulesTypeSpinner = document.getElementById('rulesTypeSpinner');
        const rulesTypeStats = document.getElementById('rulesTypeStats');
        const rulesTypeError = document.getElementById('rulesTypeError');

        if (!rulesTypeSpinner || !rulesTypeStats || !rulesTypeError) {
          console.error('Rules analytics elements missing');
          throw new Error('عناصر إحصائيات القواعد غير موجودة');
        }

        const rulesQuery = new URLSearchParams({ botId });
        console.log(`Fetching rules with query: ${rulesQuery.toString()}`);
        const rulesData = await handleApiRequest(`/api/rules?${rulesQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        }, rulesTypeError, 'فشل في جلب القواعد');

        const rulesTypesCount = {
          general: 0,
          products: 0,
          qa: 0,
          channels: 0,
          api: 0
        };

        const rulesByChannel = {
          facebook: { channels: 0 },
          web: { channels: 0 },
          instagram: { channels: 0 },
          whatsapp: { channels: 0 },
          other: { channels: 0 }
        };

        rulesData.rules.forEach(rule => {
          if (rule.type === 'global') return;

          if (rulesTypesCount[rule.type] !== undefined) {
            rulesTypesCount[rule.type]++;
          }

          if (rule.type === 'channels') {
            let channel = 'other';
            if (rule.content?.platform) {
              if (rule.content.platform.toLowerCase().includes('facebook')) {
                channel = 'facebook';
              } else if (rule.content.platform.toLowerCase().includes('instagram')) {
                channel = 'instagram';
              } else if (rule.content.platform.toLowerCase().includes('web')) {
                channel = 'web';
              } else if (rule.content.platform.toLowerCase().includes('whatsapp')) {
                channel = 'whatsapp';
              }
            }
            rulesByChannel[channel].channels++;
          }
        });

        const totalRules = Object.values(rulesTypesCount).reduce((sum, count) => sum + count, 0);
        const generalPercentage = totalRules > 0 ? ((rulesTypesCount.general / totalRules) * 100).toFixed(1) : 0;
        const productsPercentage = totalRules > 0 ? ((rulesTypesCount.products / totalRules) * 100).toFixed(1) : 0;
        const qaPercentage = totalRules > 0 ? ((rulesTypesCount.qa / totalRules) * 100).toFixed(1) : 0;
        const channelsPercentage = totalRules > 0 ? ((rulesTypesCount.channels / totalRules) * 100).toFixed(1) : 0;
        const apiPercentage = totalRules > 0 ? ((rulesTypesCount.api / totalRules) * 100).toFixed(1) : 0;

        rulesTypeStats.innerHTML = `
          <p>إجمالي القواعد: ${totalRules}</p>
          <p>قواعد عامة: ${rulesTypesCount.general} (${generalPercentage}%)</p>
          <p>قواعد أسعار: ${rulesTypesCount.products} (${productsPercentage}%)</p>
          <p>قواعد سؤال وجواب: ${rulesTypesCount.qa} (${qaPercentage}%)</p>
          <p>قواعد قنوات التواصل: ${rulesTypesCount.channels} (${channelsPercentage}%)</p>
          <p>قواعد API: ${rulesTypesCount.api} (${apiPercentage}%)</p>
          <p>قواعد قنوات التواصل:</p>
          <ul>
            <li>فيسبوك: ${rulesByChannel.facebook.channels}</li>
            <li>إنستجرام: ${rulesByChannel.instagram.channels}</li>
            <li>ويب: ${rulesByChannel.web.channels}</li>
            <li>واتساب: ${rulesByChannel.whatsapp.channels}</li>
            <li>أخرى: ${rulesByChannel.other.channels}</li>
          </ul>
        `;

        rulesTypeStats.style.display = 'block';
        rulesTypeSpinner.style.display = 'none';
        rulesTypeError.style.display = 'none';

      } catch (err) {
        console.error('Error in loadRulesAnalytics:', err);
        document.getElementById('rulesTypeSpinner').style.display = 'none';
        const rulesTypeError = document.getElementById('rulesTypeError');
        if (rulesTypeError) {
          rulesTypeError.textContent = err.message || 'فشل في تحميل إحصائيات القواعد';
          rulesTypeError.style.display = 'block';
        }
      }
    }

    // دالة مساعدة للتعامل مع طلبات API مع دعم الطلبات الصامتة
    async function handleApiRequest(url, options, errorElement, defaultErrorMessage, silent = false) {
      console.log('handleApiRequest called for URL:', url);
      try {
        const response = await fetch(url, options);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || defaultErrorMessage || 'خطأ غير معروف');
        }
        return await response.json();
      } catch (err) {
        console.error(`Error in API request to ${url}:`, err);
        if (!silent && errorElement) {
          errorElement.textContent = err.message || defaultErrorMessage;
          errorElement.style.display = "block";
        }
        throw err;
      }
    }
  }

  window.loadAnalyticsPage = loadAnalyticsPage;
});
