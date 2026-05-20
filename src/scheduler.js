import cron from 'node-cron';
import { getTodayLessonsSorted } from './bsuir-api.js';
import {
  logNotification,
  wasNotificationSent,
  getAllUsers,
} from './database.js';

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatLessonCard(lesson) {
  let text = `📚 ПАРА ${lesson.number}\n`;
  text += `📖 ${lesson.subject}`;
  if (lesson.lessonTypeAbbrev) text += ` (${lesson.lessonTypeAbbrev})`;
  text += `\n⏰ ${lesson.startLessonTime} — ${lesson.endLessonTime}`;
  if (lesson.employee) text += `\n👤 ${lesson.employee.firstName} ${lesson.employee.lastName}`;
  if (lesson.auditory) text += `\n📍 ${lesson.auditory}`;
  return text;
}

const MORNING_MESSAGES = [
  `☀️ ДОБРОЕ УТРО!\n\nПервая пара начнётся через 30 минут:\n\n{lesson}`,
  `🌅 Просыпайся! Через 30 минут первая пара:\n\n{lesson}`,
  `⏰ Доброе утро! Не забудь — через 30 минут пара:\n\n{lesson}`,
  `🌞 Утро! Первая пара уже через 30 минут:\n\n{lesson}`,
  `☕ С добрым утром! Через 30 минут начинаем:\n\n{lesson}`,
  `🎒 Доброе утро! Собирайся — через 30 минут пара:\n\n{lesson}`,
];

const LESSON_START_MESSAGES = [
  `🔔 ПАРА НАЧАЛАСЬ!\n\n{lesson}`,
  `📢 Начинаем!\n\n{lesson}`,
  `🚀 Поехали! Пара началась:\n\n{lesson}`,
  `⚡ Время учиться! Пара началась:\n\n{lesson}`,
  `📚 Пара началась, не опаздывай!\n\n{lesson}`,
  `🎯 Начинаем пару:\n\n{lesson}`,
];

const MINIBREAK_START_MESSAGES = [
  `☕ ПЯТИМИНУТКА НАЧАЛАСЬ!\n\nПара {number} — {subject}\nОтдохни 5 минут ⏱`,
  `😌 Отдыхай 5 минут!\n\nПара {number} — {subject}\n⏱ Пятиминутка началась`,
  `💪 Держись! Пятиминутка началась\n\nПара {number} — {subject}`,
  `🧘 5 минут отдыха!\n\nПара {number} — {subject}\nПереведи дух`,
  `⏸️ Мини-перерыв!\n\nПара {number} — {subject}\n5 минут свободы`,
  `🎉 Пятиминутка!\n\nПара {number} — {subject}\nОтдохни немного`,
];

const MINIBREAK_END_MESSAGES = [
  `⏰ ПЯТИМИНУТКА ЗАКОНЧИЛАСЬ!\n\nПара {number} продолжается:\n{subject}\n⏱ Осталось до конца: {left} мин`,
  `🔙 Возвращаемся к работе!\n\nПара {number} — {subject}\n⏱ До конца: {left} мин`,
  `😤 Отдых окончен!\n\nПара {number} — {subject}\n⏱ Осталось: {left} мин`,
  `⚡ Снова в бой!\n\nПара {number} — {subject}\n⏱ До конца: {left} мин`,
  `📝 Продолжаем пару!\n\n{subject}\n⏱ Осталось: {left} мин`,
  `🎓 Пятиминутка закончилась\n\nПара {number} — {subject}\n⏱ До конца: {left} мин`,
];

const LESSON_END_MESSAGES = [
  `✅ ПАРА {number} ЗАКОНЧИЛАСЬ!\n⏱ Перемена: {breakStart} — {breakEnd} ({breakDuration} мин)\n\n➡️ СЛЕДУЮЩАЯ ПАРА:\n{next}`,
  `🎉 Пара {number} — всё!\n⏱ Перемена: {breakStart} — {breakEnd} ({breakDuration} мин)\n\n➡️ Дальше:\n{next}`,
  `🏁 Пара {number} завершена!\n⏱ Перемена: {breakStart} — {breakEnd} ({breakDuration} мин)\n\n➡️ Следующая:\n{next}`,
  `💨 Отпустили!\n⏱ Перемена: {breakStart} — {breakEnd} ({breakDuration} мин)\n\n➡️ Потом:\n{next}`,
  `📚 Пара {number} закончилась!\n⏱ Перемена: {breakStart} — {breakEnd} ({breakDuration} мин)\n\n➡️ Далее:\n{next}`,
  `✨ Готово! Пара {number} позади\n⏱ Перемена: {breakStart} — {breakEnd} ({breakDuration} мин)\n\n➡️ Следующая:\n{next}`,
];

const DAY_COMPLETE_MESSAGES = [
  `🎉 ВСЕ ПАРЫ НА СЕГОДНЯ ЗАКОНЧИЛИСЬ!\n\nПоследняя пара: {subject}\nОтдыхай! 😊`,
  `🏁 День окончен!\n\nПоследняя пара: {subject}\nТы свободен! 🎊`,
  `🎊 Ура, пары закончились!\n\nПоследняя: {subject}\nВремя отдыхать! 🛋️`,
  `🌟 День завершён!\n\nПоследняя пара: {subject}\nМолодец, так держать! 💪`,
  `🎯 Все цели на сегодня достигнуты!\n\nПоследняя пара: {subject}\nОтдыхай! 🌙`,
  `🍕 Пары закончились!\n\nПоследняя: {subject}\nВремя для себя! 🎮`,
];

export function startNotificationScheduler(bot) {
  const scheduleCache = new Map();
  const cacheTimestamps = new Map();
  const CACHE_TTL = 4 * 60 * 1000;

  async function getLessonsForUser(user) {
    const cacheKey = `${user.group_number}_${user.subgroup || 0}`;
    const now = Date.now();
    const cached = scheduleCache.get(cacheKey);
    const ts = cacheTimestamps.get(cacheKey);

    if (cached && ts && now - ts < CACHE_TTL) {
      return cached;
    }

    try {
      const lessons = await getTodayLessonsSorted(user.group_number, user.subgroup || 0);
      scheduleCache.set(cacheKey, lessons);
      cacheTimestamps.set(cacheKey, now);
      return lessons;
    } catch (error) {
      console.error(`Error getting lessons for ${cacheKey}:`, error.message);
      return [];
    }
  }

  cron.schedule('* * * * *', async () => {
    const currentMinutes = getCurrentTimeMinutes();
    const today = new Date().toISOString().split('T')[0];

    const allUsers = getAllUsers();

    for (const user of allUsers) {
      try {
        const chatId = user.chat_id;
        const lessons = await getLessonsForUser(user);

        if (lessons.length === 0) continue;

        const maxPairNum = Math.max(...lessons.map(l => l.number));
        const lessonByNum = {};
        for (const l of lessons) {
          if (!lessonByNum[l.number]) lessonByNum[l.number] = l;
        }

        for (const lesson of lessons) {
          const startTime = timeToMinutes(lesson.startLessonTime);
          const endTime = timeToMinutes(lesson.endLessonTime);
          const nextLesson = lessonByNum[lesson.number + 1];
          const isLast = lesson.number === maxPairNum;

          // 1. Утро — за 30 мин до первой пары
          if (lesson.number === 1) {
            const morningTime = startTime - 30;
            if (currentMinutes === morningTime) {
              const key = `morning_reminder`;
              if (!wasNotificationSent(chatId, key, 0, today)) {
                const msg = random(MORNING_MESSAGES).replace('{lesson}', formatLessonCard(lesson));
                bot.sendMessage(chatId, msg).catch(() => {});
                logNotification(chatId, key, 0);
                console.log(`[NOTIF] Morning → ${chatId}`);
              }
            }
          }

          // 2. Начало пары
          if (currentMinutes === startTime) {
            const key = `lesson_start_${lesson.number}`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              const msg = random(LESSON_START_MESSAGES).replace('{lesson}', formatLessonCard(lesson));
              bot.sendMessage(chatId, msg).catch(() => {});
              logNotification(chatId, key, lesson.number);
              console.log(`[NOTIF] Start lesson ${lesson.number} → ${chatId}`);
            }
          }

          // 3. Начало пятиминутки — через 40 мин после начала
          const miniBreakStart = startTime + 40;
          if (currentMinutes === miniBreakStart) {
            const key = `minibreak_start_${lesson.number}`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              const msg = random(MINIBREAK_START_MESSAGES)
                .replace('{number}', lesson.number)
                .replace('{subject}', lesson.subject);
              bot.sendMessage(chatId, msg).catch(() => {});
              logNotification(chatId, key, lesson.number);
              console.log(`[NOTIF] Minibreak start lesson ${lesson.number} → ${chatId}`);
            }
          }

          // 4. Конец пятиминутки — через 45 мин после начала
          const miniBreakEnd = startTime + 45;
          if (currentMinutes === miniBreakEnd) {
            const key = `minibreak_end_${lesson.number}`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              const left = endTime - currentMinutes;
              const msg = random(MINIBREAK_END_MESSAGES)
                .replace('{number}', lesson.number)
                .replace('{subject}', lesson.subject)
                .replace('{left}', left);
              bot.sendMessage(chatId, msg).catch(() => {});
              logNotification(chatId, key, lesson.number);
              console.log(`[NOTIF] Minibreak end lesson ${lesson.number} → ${chatId}`);
            }
          }

          // 5. Конец пары + следующая пара
          if (currentMinutes === endTime && nextLesson) {
            const key = `lesson_end_${lesson.number}`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              const breakStart = lesson.endLessonTime;
              const breakEnd = nextLesson.startLessonTime;
              const breakDuration = timeToMinutes(breakEnd) - timeToMinutes(breakStart);
              const msg = random(LESSON_END_MESSAGES)
                .replace('{number}', lesson.number)
                .replace('{breakStart}', breakStart)
                .replace('{breakEnd}', breakEnd)
                .replace('{breakDuration}', breakDuration)
                .replace('{next}', formatLessonCard(nextLesson));
              bot.sendMessage(chatId, msg).catch(() => {});
              logNotification(chatId, key, lesson.number);
              console.log(`[NOTIF] End lesson ${lesson.number} + next → ${chatId}`);
            }
          }

          // 6. Последняя пара закончилась — день завершён
          if (currentMinutes === endTime && isLast) {
            const key = `day_complete`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              const msg = random(DAY_COMPLETE_MESSAGES).replace('{subject}', lesson.subject);
              bot.sendMessage(chatId, msg).catch(() => {});
              logNotification(chatId, key, lesson.number);
              console.log(`[NOTIF] Day complete → ${chatId}`);
            }
          }

        }

      } catch (error) {
        console.error(`Error sending notifications to ${user.chat_id}:`, error.message);
      }
    }

    if (currentMinutes === 0) {
      scheduleCache.clear();
      cacheTimestamps.clear();
    }
  });

  console.log('Notification scheduler started');
}
