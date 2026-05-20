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
  getUserCount,
  getUsersList,
} from './database.js';
import { LESSON_TIMES, BREAK_TIMES } from './config.js';

const TEXT_COMMANDS = {
  'сегодня': 'today',
  'завтра': 'tomorrow',
  'неделя': 'week',
  'неделю': 'week',
  'следующая': 'next',
  'след': 'next',
  'сейчас': 'now',
  'текущая': 'now',
  'помощь': 'help',
  'help': 'help',
  'расписание': 'schedule',
  'время': 'schedule',
  'пары': 'schedule',
};

export function createBot(token) {
  const bot = new TelegramBot(token, { polling: true });

  async function safeAnswerCallback(id, options = {}) {
    try {
      await bot.answerCallbackQuery(id, options);
    } catch (err) {
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

  async function handleCommand(chatId, cmd, user) {
    try {
      const sub = user?.subgroup || 0;
      const group = user?.group_number;
      let result;

      switch (cmd) {
        case 'today':
          result = await getTodayScheduleText(group, sub);
          break;
        case 'tomorrow':
          result = await getTomorrowScheduleText(group, sub);
          break;
        case 'week':
          result = await getWeekScheduleText(group, sub);
          break;
        case 'next':
          result = (await getNextLessonInfo(group, sub)).message;
          break;
        case 'now':
          result = (await getCurrentLessonInfo(group, sub)).message;
          break;
        case 'schedule': {
          let text = '⏰ ВРЕМЯ ПАР:\n';
          text += '─'.repeat(30) + '\n';
          for (const l of LESSON_TIMES) {
            text += `${l.pair}. ${l.start} — ${l.end}\n`;
          }
          text += '\n⏱ ПЕРЕМЕНЫ:\n';
          text += '─'.repeat(30) + '\n';
          for (const b of BREAK_TIMES) {
            text += `После ${b.after}-й: ${b.start} — ${b.end} (${b.duration} мин)\n`;
          }
          result = text.trim();
          break;
        }
        case 'help':
          await bot.sendMessage(chatId, `📋 КОМАНДЫ:

/start — Регистрация
/today или "сегодня" — Расписание на сегодня
/tomorrow или "завтра" — Расписание на завтра
/week или "неделя" — Расписание на неделю
/next или "следующая" — Следующая пара
/now или "сейчас" — Текущая пара
/schedule или "время" — Время пар
/group или "сменить" — Сменить группу
/users — Статистика (админ)
/help или "помощь" — Эта справка`);
          return;
        default:
          return;
      }
      await bot.sendMessage(chatId, result);
    } catch (error) {
      await bot.sendMessage(chatId, `❌ ОШИБКА ПОЛУЧЕНИЯ ДАННЫХ\nERROR: ${error.message}`);
    }
  }

  function resolveCommand(text) {
    const lower = text.toLowerCase().trim().replace(/[\/]/g, '');
    return TEXT_COMMANDS[lower] || null;
  }

  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    if (isUserRegistered(chatId)) {
      const user = getUser(chatId);
      const subgroupText = user.subgroup > 0 ? user.subgroup : '0';
      await bot.sendMessage(chatId, `[ПОСЛЕ РЕГИСТРАЦИИ]

STATUS: REGISTERED
GROUP: ${user.group_number}
SUBGROUP: ${subgroupText}
УВЕДОМЛЕНИЯ: ВКЛ
КОМАНДЫ: ГОТОВЫ`);
    } else {
      await bot.sendMessage(chatId, `$ BSUIR_BOT_SYSTEM v1.0
> INITIALIZING...
> TOKEN_CHECK: OK
> DATABASE_CONNECTION: ACTIVE
> API_ENDPOINT: bsuir-api.by
> POLLING: ENABLED
> BOT_STATUS: ONLINE
> WAITING_FOR_INPUT...
ФУНКЦИОНАЛ:
├─ АВТО-УВЕДОМЛЕНИЯ О НАЧАЛЕ ПАР
├─ АВТО-УВЕДОМЛЕНИЯ О ПЕРЕМЕНАХ
├─ ПРЕДУПРЕЖДЕНИЕ ЗА 5 МИНУТ
├─ УКАЗАНИЕ АУДИТОРИИ И КОРПУСА
└─ АВТОМАТИЧЕСКАЯ ФИЛЬТРАЦИЯ ПОДГРУПП 
ЗАПРОС: ВВЕДИТЕ НОМЕР ГРУППЫ ДЛЯ РЕГИСТРАЦИИ`);
    }
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
      return `${i + 1}. [${u.group_number}] SG:${sg} ID:${u.chat_id}`;
    }).join('\n');
    await bot.sendMessage(msg.chat.id, `ЗАРЕГИСТРИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ (${count}):\n${list}`);
  });

  bot.onText(/\/stats/, async (msg) => {
    if (msg.from.id !== parseInt(process.env.ADMIN_ID || '0')) {
      await bot.sendMessage(msg.chat.id, 'ACCESS DENIED');
      return;
    }
    const count = getUserCount();
    await bot.sendMessage(msg.chat.id, `СТАТИСТИКА:\nПОЛЬЗОВАТЕЛЕЙ: ${count}`);
  });

  bot.on('callback_query', async (callbackQuery) => {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const msgId = callbackQuery.message.message_id;

    console.log(`Callback received: ${data}`);

    if (data.startsWith('subgroup_')) {
      const parts = data.split('_');
      const subgroup = parseInt(parts[1]);
      const groupName = parts.slice(2).join('_');

      const isValid = await validateGroup(groupName);
      if (!isValid) {
        await safeAnswerCallback(callbackQuery.id, { text: '❌ Группа не найдена' });
        return;
      }

      registerUser(chatId, groupName, subgroup);
      const user = getUser(chatId);
      const subgroupText = user.subgroup > 0 ? user.subgroup : '0';

      await safeEditMessage('editMessageText', chatId, msgId, `[ПОСЛЕ РЕГИСТРАЦИИ]

STATUS: REGISTERED
GROUP: ${groupName}
SUBGROUP: ${subgroupText}
УВЕДОМЛЕНИЯ: ВКЛ
КОМАНДЫ: ГОТОВЫ`);
      await safeAnswerCallback(callbackQuery.id, { text: '✅ Готово' });
      return;
    }

    await safeAnswerCallback(callbackQuery.id);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // Текстовая команда
    const cmdFromText = resolveCommand(text);
    if (cmdFromText) {
      if (isUserRegistered(chatId)) {
        const user = getUser(chatId);
        await handleCommand(chatId, cmdFromText, user);
      } else {
        await bot.sendMessage(chatId, 'ВЫ НЕ ЗАРЕГИСТРИРОВАНЫ\nОТПРАВЬТЕ НОМЕР ГРУППЫ ДЛЯ РЕГИСТРАЦИИ');
      }
      return;
    }

    // Команды со слэшем
    if (text.startsWith('/')) {
      const cmd = text.split('@')[0].substring(1);
      if (['today', 'tomorrow', 'week', 'next', 'now', 'group', 'help', 'schedule'].includes(cmd)) {
        if (isUserRegistered(chatId)) {
          const user = getUser(chatId);
          await handleCommand(chatId, cmd, user);
        } else {
          await bot.sendMessage(chatId, 'ВЫ НЕ ЗАРЕГИСТРИРОВАНЫ\nОТПРАВЬТЕ НОМЕР ГРУППЫ ДЛЯ РЕГИСТРАЦИИ');
        }
        return;
      }
      return;
    }

    // Номер группы
    const groupPattern = /^\d{4,6}$/;
    if (groupPattern.test(text.trim())) {
      const groupNumber = text.trim();
      const isValid = await validateGroup(groupNumber);

      if (isValid) {
        await bot.sendMessage(chatId, `[ПОДГРУППА]\n\nГРУППА НАЙДЕНА: ${groupNumber}\nВЫБЕРИТЕ ПОДГРУППУ:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '👥 Подгруппа 1', callback_data: `subgroup_1_${groupNumber}` },
               { text: '👥 Подгруппа 2', callback_data: `subgroup_2_${groupNumber}` }],
              [{ text: '📋 Общая (все потоки)', callback_data: `subgroup_0_${groupNumber}` }],
            ],
          },
        });
      } else {
        await bot.sendMessage(chatId, `[ОШИБКА ГРУППЫ]\n\nERROR: ГРУППА ${groupNumber} НЕ НАЙДЕНА\nПРОВЕРЬТЕ НОМЕР И ПОВТОРИТЕ\nФОРМАТ: XXXXXX (6 ЦИФР)`);
      }
      return;
    }

    // Поиск группы по названию (только для незарегистрированных)
    if (!isUserRegistered(chatId)) {
      const results = await searchGroup(text);
      if (results.length > 0) {
        const keyboard = results.map(r => [
          { text: r.name + (r.faculty ? ` (${r.faculty})` : ''), callback_data: `subgroup_0_${r.name}` },
        ]);
        await bot.sendMessage(chatId, 'ГРУППЫ НАЙДЕНЫ:\n\nВЫБЕРИТЕ СВОЮ ГРУППУ:', { reply_markup: { inline_keyboard: keyboard } });
      } else {
        await bot.sendMessage(chatId, 'ГРУППА НЕ НАЙДЕНА. ОТПРАВЬТЕ НОМЕР ГРУППЫ ИЛИ ПОПРОБУЙТЕ ДРУГОЕ НАЗВАНИЕ.');
      }
      return;
    }

    // Зарегистрированный пользователь отправил непонятный текст
    await bot.sendMessage(chatId, 'Неизвестная команда. Напишите "помощь" для списка команд.');
  });

  return bot;
}
