import TelegramBot from 'node-telegram-bot-api';
import {
  getTodayScheduleText,
  getTomorrowScheduleText,
  getWeekScheduleText,
  getNextLessonInfo,
  getCurrentLessonInfo,
  getExamsText,
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
  'экзамены': 'exams',
  'exam': 'exams',
};

const pendingGroup = new Map();

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
        case 'exams':
          result = await getExamsText(group);
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
/exams или "экзамены" — Экзамены и консультации
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

    if (await isUserRegistered(chatId)) {
      const user = await getUser(chatId);
      const subgroupText = user.subgroup > 0 ? user.subgroup : 'все';
      await bot.sendMessage(chatId, `✅ ВЫ УЖЕ ЗАРЕГИСТРИРОВАНЫ

📚 Группа: ${user.group_number}
👥 Подгруппа: ${subgroupText}
🔔 Уведомления: ВКЛ`);
    } else {
      await bot.sendMessage(chatId, `🤖 BSUIR Schedule Bot

📋 Функционал:
├─ 🔔 Авто-уведомления о начале пар
├─ ⏰ Напоминания о переменах
├─ 📍 Аудитории и преподаватели
└─ 👥 Фильтрация по подгруппам

📝 Введите номер группы для регистрации:`);
    }
  });

  bot.onText(/\/users/, async (msg) => {
    if (msg.from.id !== parseInt(process.env.ADMIN_ID || '0')) {
      await bot.sendMessage(msg.chat.id, '🔒 ACCESS DENIED');
      return;
    }
    const users = await getUsersList();
    const count = users.length;
    let list = users.map((u, i) => {
      const sg = u.subgroup > 0 ? u.subgroup : 'все';
      const nick = u.username ? `@${u.username}` : '—';
      return `${i + 1}. [${u.group_number}] Подгруппа: ${sg} | ${nick} | ID: ${u.chat_id}`;
    }).join('\n');
    await bot.sendMessage(msg.chat.id, `👥 Пользователи (${count}):\n${list}`);
  });

  bot.onText(/\/stats/, async (msg) => {
    if (msg.from.id !== parseInt(process.env.ADMIN_ID || '0')) {
      await bot.sendMessage(msg.chat.id, '🔒 ACCESS DENIED');
      return;
    }
    const count = await getUserCount();
    await bot.sendMessage(msg.chat.id, `📊 Статистика:\n👤 Пользователей: ${count}`);
  });

  bot.on('callback_query', async (callbackQuery) => {
    await bot.answerCallbackQuery(callbackQuery.id);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return;

    // Проверяем, ждёт ли пользователь ввода подгруппы
    if (pendingGroup.has(chatId)) {
      const groupNumber = pendingGroup.get(chatId);
      const subInput = text.trim();

      if (subInput === '0' || subInput === '1' || subInput === '2') {
        const subgroup = parseInt(subInput);
        await registerUser(chatId, groupNumber, subgroup, 'ru', msg.from.username || null);
        pendingGroup.delete(chatId);

        const sgText = subgroup === 0 ? 'все' : subgroup;
        await bot.sendMessage(chatId, `✅ Всё готово!

📚 Группа: ${groupNumber}
👥 Подгруппа: ${sgText}
🔔 Уведомления: ВКЛ

Используй команды для просмотра расписания:`);
      } else {
        await bot.sendMessage(chatId, '❌ Введите 0, 1 или 2:\n\n0 — все подгруппы\n1 — подгруппа 1\n2 — подгруппа 2');
      }
      return;
    }

    // Текстовая команда
    const cmdFromText = resolveCommand(text);
    if (cmdFromText) {
      if (await isUserRegistered(chatId)) {
        const user = await getUser(chatId);
        await handleCommand(chatId, cmdFromText, user);
      } else {
        await bot.sendMessage(chatId, '⚠️ Вы не зарегистрированы\nВведите номер группы:');
      }
      return;
    }

    // Команды со слэшем
    if (text.startsWith('/')) {
      const cmd = text.split('@')[0].substring(1);
      if (['today', 'tomorrow', 'week', 'next', 'now', 'group', 'help', 'schedule', 'exams'].includes(cmd)) {
        if (cmd === 'group') {
          pendingGroup.clear();
          await bot.sendMessage(chatId, '📝 Введите номер группы:');
          return;
        }
        if (await isUserRegistered(chatId)) {
          const user = await getUser(chatId);
          await handleCommand(chatId, cmd, user);
        } else {
          await bot.sendMessage(chatId, '⚠️ Вы не зарегистрированы\nВведите номер группы:');
        }
        return;
      }
      return;
    }

    // Номер группы (4-6 цифр)
    const groupPattern = /^\d{4,6}$/;
    if (groupPattern.test(text.trim())) {
      const groupNumber = text.trim();
      const isValid = await validateGroup(groupNumber);

      if (isValid) {
        pendingGroup.set(chatId, groupNumber);
        await bot.sendMessage(chatId, `✅ Группа ${groupNumber} найдена!

👥 Введите номер подгруппы:

0 — все подгруппы (общее расписание)
1 — подгруппа 1
2 — подгруппа 2`);
      } else {
        await bot.sendMessage(chatId, `❌ Группа ${groupNumber} не найдена\nПроверьте номер и попробуйте снова`);
      }
      return;
    }

    // Поиск группы по названию (только для незарегистрированных)
    if (!await isUserRegistered(chatId)) {
      const results = await searchGroup(text);
      if (results.length > 0) {
        const list = results.map((r, i) => `${i + 1}. ${r.name}${r.faculty ? ` (${r.faculty})` : ''}`).join('\n');
        await bot.sendMessage(chatId, `🔍 Найдены группы:\n\n${list}\n\nВведите номер нужной группы:`);
      } else {
        await bot.sendMessage(chatId, '❌ Группа не найдена. Введите номер группы или попробуйте другое название.');
      }
      return;
    }

    // Зарегистрированный пользователь отправил непонятный текст
    await bot.sendMessage(chatId, '❓ Неизвестная команда. Напишите "помощь" для списка команд.');
  });

  return bot;
}
