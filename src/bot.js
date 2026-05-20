import TelegramBot from 'node-telegram-bot-api';
import {
  getTodayScheduleText,
  getTomorrowScheduleText,
  getWeekScheduleText,
  getNextLessonInfo,
  getCurrentLessonInfo,
  validateGroup,
  searchGroup,
} from './bsuir-api.js';
import {
  registerUser,
  getUser,
  isUserRegistered,
  updateGroup,
  updateNotificationSetting,
  updateLanguage,
  getNotificationSettings,
  getUserCount,
  getUserLanguage,
  getUsersList,
} from './database.js';
import { t, getMainMenuKeyboard } from './translations.js';

export function createBot(token) {
  const bot = new TelegramBot(token, { polling: true });

  function getMenu(chatId) {
    const lang = getUserLanguage(chatId);
    return getMainMenuKeyboard(lang);
  }

  async function safeAnswerCallback(id, options = {}) {
    try {
      await bot.answerCallbackQuery(id, options);
    } catch (err) {
      // Игнорируем ошибки "query is too old" или "query_id_invalid"
      if (!err.response?.description?.includes('query')) {
        console.error('Callback answer error:', err.message);
      }
    }
  }

  async function safeEditMessage(method, chatId, messageId, ...args) {
    try {
      await bot[method](chatId, messageId, ...args);
    } catch (err) {
      if (!err.response?.description?.includes('message is not modified') &&
          !err.response?.description?.includes('message to edit not found')) {
        console.error('Edit message error:', err.message);
      }
    }
  }

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);

    if (isUserRegistered(chatId)) {
      const user = getUser(chatId);
      const subgroupText = user.subgroup > 0 ? user.subgroup : '0';
      await bot.sendMessage(chatId, t('registered', lang, { group: user.group_number, subgroup: subgroupText }), {
        reply_markup: getMenu(chatId),
      });
    } else {
      await bot.sendMessage(chatId, t('welcome', lang));
    }
  });

  bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    await bot.sendMessage(chatId, t('help', lang), { reply_markup: getMenu(chatId) });
  });

  bot.onText(/\/today/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    if (!isUserRegistered(chatId)) {
      await bot.sendMessage(chatId, t('not_registered', lang), { reply_markup: getMenu(chatId) });
      return;
    }
    const user = getUser(chatId);
    try {
      const schedule = await getTodayScheduleText(user.group_number, user.subgroup || 0, lang);
      await bot.sendMessage(chatId, schedule, { reply_markup: getMenu(chatId) });
    } catch (error) {
      await bot.sendMessage(chatId, t('fetch_failed', lang, { error: error.message }), { reply_markup: getMenu(chatId) });
    }
  });

  bot.onText(/\/tomorrow/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    if (!isUserRegistered(chatId)) {
      await bot.sendMessage(chatId, t('not_registered', lang), { reply_markup: getMenu(chatId) });
      return;
    }
    const user = getUser(chatId);
    try {
      const schedule = await getTomorrowScheduleText(user.group_number, user.subgroup || 0, lang);
      await bot.sendMessage(chatId, schedule, { reply_markup: getMenu(chatId) });
    } catch (error) {
      await bot.sendMessage(chatId, t('fetch_failed', lang, { error: error.message }), { reply_markup: getMenu(chatId) });
    }
  });

  bot.onText(/\/week/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    if (!isUserRegistered(chatId)) {
      await bot.sendMessage(chatId, t('not_registered', lang), { reply_markup: getMenu(chatId) });
      return;
    }
    const user = getUser(chatId);
    try {
      const schedule = await getWeekScheduleText(user.group_number, user.subgroup || 0, lang);
      await bot.sendMessage(chatId, schedule, { reply_markup: getMenu(chatId) });
    } catch (error) {
      await bot.sendMessage(chatId, t('fetch_failed', lang, { error: error.message }), { reply_markup: getMenu(chatId) });
    }
  });

  bot.onText(/\/next/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    if (!isUserRegistered(chatId)) {
      await bot.sendMessage(chatId, t('not_registered', lang), { reply_markup: getMenu(chatId) });
      return;
    }
    const user = getUser(chatId);
    try {
      const info = await getNextLessonInfo(user.group_number, user.subgroup || 0, lang);
      await bot.sendMessage(chatId, info.message, { reply_markup: getMenu(chatId) });
    } catch (error) {
      await bot.sendMessage(chatId, t('fetch_failed', lang, { error: error.message }), { reply_markup: getMenu(chatId) });
    }
  });

  bot.onText(/\/now/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    if (!isUserRegistered(chatId)) {
      await bot.sendMessage(chatId, t('not_registered', lang), { reply_markup: getMenu(chatId) });
      return;
    }
    const user = getUser(chatId);
    try {
      const info = await getCurrentLessonInfo(user.group_number, user.subgroup || 0, lang);
      await bot.sendMessage(chatId, info.message, { reply_markup: getMenu(chatId) });
    } catch (error) {
      await bot.sendMessage(chatId, t('fetch_failed', lang, { error: error.message }), { reply_markup: getMenu(chatId) });
    }
  });

  bot.onText(/\/settings/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    if (!isUserRegistered(chatId)) {
      await bot.sendMessage(chatId, t('not_registered', lang), { reply_markup: getMenu(chatId) });
      return;
    }
    await sendSettingsMessage(bot, chatId, lang);
  });

  bot.onText(/\/group/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    if (!isUserRegistered(chatId)) {
      await bot.sendMessage(chatId, t('not_registered', lang), { reply_markup: getMenu(chatId) });
      return;
    }
    await bot.sendMessage(chatId, t('send_new_group', lang));
  });

  bot.onText(/\/lang/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    await bot.sendMessage(chatId, t('lang_select', lang), {
      reply_markup: {
        inline_keyboard: [
          [
            { text: t('lang_ru', lang), callback_data: 'lang_ru' },
            { text: t('lang_en', lang), callback_data: 'lang_en' },
          ],
        ],
      },
    });
  });

  bot.onText(/\/schedule/, async (msg) => {
    const chatId = msg.chat.id;
    const lang = getUserLanguage(chatId);
    await bot.sendMessage(chatId, t('schedule_times', lang), { reply_markup: getMenu(chatId) });
  });

  bot.onText(/\/users/, async (msg) => {
    if (msg.from.id !== parseInt(process.env.ADMIN_ID || '0')) {
      await bot.sendMessage(msg.chat.id, 'ACCESS DENIED');
      return;
    }
    const users = getUsersList();
    const count = users.length;
    let list = users.map((u, i) => {
      const sg = u.subgroup > 0 ? u.subgroup : '0';
      return `${i + 1}. [${u.group_number}] SG:${sg} LANG:${u.language} ID:${u.chat_id}`;
    }).join('\n');
    await bot.sendMessage(msg.chat.id, t('users_list', 'ru', { count, list }), { reply_markup: getMenu(msg.chat.id) });
  });

  bot.onText(/\/stats/, async (msg) => {
    if (msg.from.id !== parseInt(process.env.ADMIN_ID || '0')) {
      await bot.sendMessage(msg.chat.id, 'ACCESS DENIED');
      return;
    }
    const count = getUserCount();
    const lang = getUserLanguage(msg.chat.id);
    await bot.sendMessage(msg.chat.id, t('stats', lang, { count }), { reply_markup: getMenu(msg.chat.id) });
  });

  async function sendSettingsMessage(bot, chatId, lang) {
    const settings = getNotificationSettings(chatId);
    await bot.sendMessage(chatId, t('notification_settings', lang), {
      reply_markup: {
        inline_keyboard: [
          [{ text: settings.lessonStart ? t('lesson_start_on', lang) : t('lesson_start_off', lang), callback_data: 'toggle_lesson_start' }],
          [{ text: settings.lessonWarning ? t('lesson_warning_on', lang) : t('lesson_warning_off', lang), callback_data: 'toggle_lesson_warning' }],
          [{ text: settings.breakStart ? t('break_start_on', lang) : t('break_start_off', lang), callback_data: 'toggle_break_start' }],
          [{ text: settings.breakWarning ? t('break_warning_on', lang) : t('break_warning_off', lang), callback_data: 'toggle_break_warning' }],
        ],
      },
    });
  }

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const lang = getUserLanguage(chatId);
    const msgId = callbackQuery.message.message_id;

    if (data.startsWith('lang_')) {
      const newLang = data.replace('lang_', '');
      updateLanguage(chatId, newLang);
      const msg = newLang === 'ru' ? t('lang_changed', 'ru') : t('lang_changed_en', 'en');
      await safeEditMessage('editMessageText', chatId, msgId, msg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: newLang === 'ru' ? '[x] Русский' : '[ ] Русский', callback_data: 'noop_ru' },
             { text: newLang === 'en' ? '[x] English' : '[ ] English', callback_data: 'noop_en' }],
          ],
        },
      });
      await safeAnswerCallback(callbackQuery.id, { text: msg });
      return;
    }

    if (data.startsWith('noop_')) {
      await safeAnswerCallback(callbackQuery.id);
      return;
    }

    if (data === 'change_group') {
      await bot.sendMessage(chatId, t('send_new_group', lang));
      await safeAnswerCallback(callbackQuery.id);
      return;
    }

    if (data === 'change_lang') {
      await bot.sendMessage(chatId, t('lang_select', lang), {
        reply_markup: {
          inline_keyboard: [
            [{ text: t('lang_ru', lang), callback_data: 'lang_ru' }, { text: t('lang_en', lang), callback_data: 'lang_en' }],
          ],
        },
      });
      await safeAnswerCallback(callbackQuery.id);
      return;
    }

    if (data === 'help') {
      await bot.sendMessage(chatId, t('help', lang), { reply_markup: getMenu(chatId) });
      await safeAnswerCallback(callbackQuery.id);
      return;
    }

    if (data.startsWith('subgroup_')) {
      const parts = data.split('_');
      const subgroup = parseInt(parts[1]);
      const groupName = parts.slice(2).join('_');

      const isValid = await validateGroup(groupName);
      if (!isValid) {
        await safeAnswerCallback(callbackQuery.id, { text: t('error_group_not_found', lang) });
        return;
      }

      registerUser(chatId, groupName, subgroup, lang);
      const subgroupText = subgroup > 0 ? subgroup : '0';

      await safeEditMessage('editMessageText', chatId, msgId, t('registered', lang, { group: groupName, subgroup: subgroupText }), {
        reply_markup: getMenu(chatId),
      });
      await safeAnswerCallback(callbackQuery.id, { text: t('done', lang) });
      return;
    }

    switch (data) {
      case 'today':
      case 'tomorrow':
      case 'week':
      case 'next':
      case 'now': {
        if (!isUserRegistered(chatId)) {
          await safeAnswerCallback(callbackQuery.id, { text: t('not_registered', lang) });
          return;
        }
        const user = getUser(chatId);
        const sub = user.subgroup || 0;
        let result;
        try {
          if (data === 'today') result = await getTodayScheduleText(user.group_number, sub, lang);
          else if (data === 'tomorrow') result = await getTomorrowScheduleText(user.group_number, sub, lang);
          else if (data === 'week') result = await getWeekScheduleText(user.group_number, sub, lang);
          else if (data === 'next') result = (await getNextLessonInfo(user.group_number, sub, lang)).message;
          else result = (await getCurrentLessonInfo(user.group_number, sub, lang)).message;
          await bot.sendMessage(chatId, result, { reply_markup: getMenu(chatId) });
        } catch (error) {
          await bot.sendMessage(chatId, t('fetch_failed', lang, { error: error.message }), { reply_markup: getMenu(chatId) });
        }
        await safeAnswerCallback(callbackQuery.id);
        break;
      }

      case 'settings': {
        if (!isUserRegistered(chatId)) {
          await safeAnswerCallback(callbackQuery.id, { text: t('not_registered', lang) });
          return;
        }
        await safeEditMessage('editMessageText', chatId, msgId, t('notification_settings', lang), {
          reply_markup: {
            inline_keyboard: [
              [{ text: getNotificationSettings(chatId).lessonStart ? t('lesson_start_on', lang) : t('lesson_start_off', lang), callback_data: 'toggle_lesson_start' }],
              [{ text: getNotificationSettings(chatId).lessonWarning ? t('lesson_warning_on', lang) : t('lesson_warning_off', lang), callback_data: 'toggle_lesson_warning' }],
              [{ text: getNotificationSettings(chatId).breakStart ? t('break_start_on', lang) : t('break_start_off', lang), callback_data: 'toggle_break_start' }],
              [{ text: getNotificationSettings(chatId).breakWarning ? t('break_warning_on', lang) : t('break_warning_off', lang), callback_data: 'toggle_break_warning' }],
            ],
          },
        });
        await safeAnswerCallback(callbackQuery.id);
        break;
      }

      case 'toggle_lesson_start':
      case 'toggle_lesson_warning':
      case 'toggle_break_start':
      case 'toggle_break_warning': {
        const settingKey = data.replace('toggle_', '');
        const settings = getNotificationSettings(chatId);
        updateNotificationSetting(chatId, settingKey, !settings[settingKey]);
        const newSettings = getNotificationSettings(chatId);
        const state = newSettings[settingKey] ? t('enabled', lang) : t('disabled', lang);

        await safeEditMessage('editMessageReplyMarkup', chatId, msgId, {
          inline_keyboard: [
            [{ text: newSettings.lessonStart ? t('lesson_start_on', lang) : t('lesson_start_off', lang), callback_data: 'toggle_lesson_start' }],
            [{ text: newSettings.lessonWarning ? t('lesson_warning_on', lang) : t('lesson_warning_off', lang), callback_data: 'toggle_lesson_warning' }],
            [{ text: newSettings.breakStart ? t('break_start_on', lang) : t('break_start_off', lang), callback_data: 'toggle_break_start' }],
            [{ text: newSettings.breakWarning ? t('break_warning_on', lang) : t('break_warning_off', lang), callback_data: 'toggle_break_warning' }],
          ],
        });
        await safeAnswerCallback(callbackQuery.id, { text: state });
        break;
      }
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const lang = getUserLanguage(chatId);

    if (!text || text.startsWith('/')) return;

    const groupPattern = /^\d{4,6}$/;

    if (groupPattern.test(text.trim())) {
      const groupNumber = text.trim();
      const isValid = await validateGroup(groupNumber);

      if (isValid) {
        await bot.sendMessage(chatId, t('group_found', lang, { group: groupNumber }), {
          reply_markup: {
            inline_keyboard: [
              [{ text: t('select_subgroup_1', lang), callback_data: `subgroup_1_${groupNumber}` },
               { text: t('select_subgroup_2', lang), callback_data: `subgroup_2_${groupNumber}` }],
              [{ text: t('select_subgroup_0', lang), callback_data: `subgroup_0_${groupNumber}` }],
            ],
          },
        });
      } else {
        await bot.sendMessage(chatId, t('group_not_found', lang, { group: groupNumber }));
      }
      return;
    }

    if (!isUserRegistered(chatId)) {
      const results = await searchGroup(text);
      if (results.length > 0) {
        const keyboard = results.map(r => [
          { text: r.name + (r.faculty ? ` (${r.faculty})` : ''), callback_data: `subgroup_0_${r.name}` },
        ]);
        await bot.sendMessage(chatId, t('groups_found', lang), { reply_markup: { inline_keyboard: keyboard } });
      } else {
        await bot.sendMessage(chatId, t('group_not_found_search', lang));
      }
      return;
    }
  });

  return bot;
}
