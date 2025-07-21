const cron = require('node-cron');
const IssueSummary = require('../models/IssueSummary');
const GramSabha = require('../models/gramSabha');
const axios = require('axios');

const TRANSLATE_API_URL = process.env.VIDEO_MOM_BACKEND_URL || 'http://localhost:8000';
const AGENDA_CRON_SCHEDULE = process.env.AGENDA_TRANSLATION_CRON || '*/15 * * * *'; // Fallback: every 15 min
const supportedLanguages = ['en', 'hi', 'hindi'];

async function fetchTranslationResult(resultUrl, maxAttempts = 10, interval = 1000) {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const res = await axios.get(`${TRANSLATE_API_URL}${resultUrl}`);
    if (res.data?.translated_text) return res.data.translated_text;
    await new Promise(resolve => setTimeout(resolve, interval));
    attempts++;
  }
  return '';
}

async function translateText(text, target_language) {
  if (typeof text !== 'string') {
    return '';
  }

  const res = await axios.post(`${TRANSLATE_API_URL}/translate`, {
    text,
    target_language,
  });

  if (res.data?.result_url) {
    return await fetchTranslationResult(res.data.result_url);
  }

  return '';
}

const agendaTranslationCron = cron.schedule(AGENDA_CRON_SCHEDULE, async () => {
  try {
    // --- Translate IssueSummary.agendaItems ---
    const summaries = await IssueSummary.find({});
    for (const summary of summaries) {
      let updated = false;

      for (const item of summary.agendaItems) {
        let titleObj = item.title instanceof Map ? Object.fromEntries(item.title) : item.title || {};
        let descObj = item.description instanceof Map ? Object.fromEntries(item.description) : item.description || {};

        const originalTitleLang = Object.keys(titleObj)[0];
        for (const lang of supportedLanguages) {
          if (!titleObj[lang] && titleObj[originalTitleLang]) {
            const translated = await translateText(titleObj[originalTitleLang], lang);
            if (translated?.trim()) {
              titleObj[lang] = translated;
              updated = true;
            }
          }
        }

        const originalDescLang = Object.keys(descObj)[0];
        for (const lang of supportedLanguages) {
          if (!descObj[lang] && descObj[originalDescLang]) {
            const translated = await translateText(descObj[originalDescLang], lang);
            if (translated?.trim()) {
              descObj[lang] = translated;
              updated = true;
            }
          }
        }

        item.title = titleObj;
        item.description = descObj;
      }

      if (updated) {
        await summary.save();
      }
    }

    // --- Translate GramSabha.agenda ---
    const meetings = await GramSabha.find({ dateTime: { $gte: new Date() } });

    for (const meeting of meetings) {
      let updated = false;

      for (const item of meeting.agenda || []) {
        if (!item.createdByType) item.createdByType = 'SYSTEM';
        if (item.createdByType === 'USER' && !item.createdByUserId) item.createdByUserId = null;

        let titleObj = item.title instanceof Map ? Object.fromEntries(item.title) : item.title || {};
        let descObj = item.description instanceof Map ? Object.fromEntries(item.description) : item.description || {};

        const originalTitleLang = Object.keys(titleObj)[0];
        for (const lang of supportedLanguages) {
          if (!titleObj[lang] && titleObj[originalTitleLang]) {
            const translated = await translateText(titleObj[originalTitleLang], lang);
            if (translated?.trim()) {
              titleObj[lang] = translated;
              updated = true;
            }
          }
        }

        const originalDescLang = Object.keys(descObj)[0];
        for (const lang of supportedLanguages) {
          if (!descObj[lang] && descObj[originalDescLang]) {
            const translated = await translateText(descObj[originalDescLang], lang);
            if (translated?.trim()) {
              descObj[lang] = translated;
              updated = true;
            }
          }
        }

        item.title = titleObj;
        item.description = descObj;
      }

      if (updated) {
        await meeting.save();
      }
    }
  } catch (error) {
  }
});

module.exports = {
  agendaTranslationCron
};
