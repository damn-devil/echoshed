import cron from 'node-cron';
import { getTodayLessonsSorted } from './bsuir-api.js';
import {
  logNotification,
  wasNotificationSent,
  getAllUsers,
} from './database.js';

const sentToday = new Set();

function getMinskTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3 * 3600000));
}

function getCurrentTimeMinutes() {
  const now = getMinskTime();
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
  const time = `${lesson.startLessonTime}—${lesson.endLessonTime}`;
  const subject = lesson.subject || '❓';
  const type = lesson.lessonTypeAbbrev ? ` (${lesson.lessonTypeAbbrev})` : '';
  const room = lesson.auditory ? ` | 📍 ${lesson.auditory}` : '';
  const teacher = lesson.employee ? ` | 👤 ${lesson.employee.lastName}` : '';
  const sg = lesson.numSubgroup > 0 ? ` | 👥 п/г ${lesson.numSubgroup}` : '';
  const note = lesson.note ? `\n   📝 ${lesson.note}` : '';

  if (lesson.announcement) {
    return `📢 ${lesson.number}) ${subject}${type} | ⏰ ${time}${room}${teacher}${sg}${note}`;
  }
  
  return `${lesson.number}) 📖 ${subject}${type} | ⏰ ${time}${room}${teacher}${sg}${note}`;
}
function formatDaySchedule(lessons) {
  let text = '';
  for (let i = 0; i < lessons.length; i++) {
    if (i > 0) text += '─'.repeat(25) + '\n';
    text += formatLessonCard(lessons[i]) + '\n';
  }
  return text.trim();
}

const MORNING_MESSAGES = [
  `☀️ Доброе утро!\n\nВот твои пары на сегодня:\n\n{schedule}`,
  `🌅 Просыпайся! Через 30 мин начинаем:\n\n{schedule}`,
  `⏰ Доброе утро! Расписание на сегодня:\n\n{schedule}`,
  `🌞 Утро! Сегодня у тебя {count} пар(ы):\n\n{schedule}`,
  `☕ С добрым утром! План на день:\n\n{schedule}`,
];

const LESSON_START_MESSAGES = [
  `🔔 Пара началась!\n{lesson}`,
  `📢 Начинаем!\n{lesson}`,
  `🚀 Поехали!\n{lesson}`,
  `⚡ Время учиться!\n{lesson}`,
  `📚 Пара началась!\n{lesson}`,
];

const MINIBREAK_START_MESSAGES = [
  `☕ Пятиминутка началась!\nПара {number} — {subject}\nОтдохни 5 мин ⏱`,
  `😌 Отдыхай 5 минут!\n{subject}\n⏱ Пятиминутка`,
  `💪 Держись! Пятиминутка\n{subject}`,
  `🧘 5 мин отдыха!\n{subject}`,
  `⏸️ Мини-перерыв!\n{subject}`,
];

const MINIBREAK_END_MESSAGES = [
  `⏰ Пятиминутка закончилась!\n{subject}\n⏱ До конца: {left} мин`,
  `🔙 Возвращаемся!\n{subject}\n⏱ До конца: {left} мин`,
  `😤 Отдых окончен!\n{subject}\n⏱ Осталось: {left} мин`,
  `⚡ Снова в бой!\n{subject}\n⏱ До конца: {left} мин`,
];

const LESSON_END_MESSAGES = [
  `✅ Пара {number} закончилась!\n⏱ Перемена: {breakStart}—{breakEnd} ({breakDuration} мин)\n\n➡️ Следующая:\n{next}`,
  `🎉 Пара {number} — всё!\n⏱ Перемена: {breakStart}—{breakEnd} ({breakDuration} мин)\n\n➡️ Дальше:\n{next}`,
  `🏁 Пара {number} завершена!\n⏱ Перемена: {breakStart}—{breakEnd} ({breakDuration} мин)\n\n➡️ Следующая:\n{next}`,
  `💨 Отпустили!\n⏱ Перемена: {breakStart}—{breakEnd} ({breakDuration} мин)\n\n➡️ Потом:\n{next}`,
];

const DAY_COMPLETE_MESSAGES = [
  `🎉 Все пары на сегодня закончились!\nПоследняя: {subject}\nОтдыхай! 😊`,
  `🏁 День окончен!\nПоследняя: {subject}\nТы свободен! 🎊`,
  `🎊 Ура, пары закончились!\nПоследняя: {subject}\nВремя отдыхать! 🛋️`,
  `🌟 День завершён!\nПоследняя: {subject}\nМолодец! 💪`,
  `🍕 Пары закончились!\nПоследняя: {subject}\nВремя для себя! 🎮`,
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

    if (cached && ts && now - ts < CACHE_TTL) return cached;

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
    const minskNow = getMinskTime();
    const currentMinutes = getCurrentTimeMinutes();
    const today = minskNow.toISOString().split('T')[0];

    console.log(`[SCHEDULER] Minsk: ${minskNow.toTimeString().slice(0,5)}, min: ${currentMinutes}`);

    const allUsers = await getAllUsers();
    console.log(`[SCHEDULER] Users: ${allUsers.length}`);

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

        const sendNotif = async (key, pairNum, msg) => {
          const dedupKey = `${chatId}:${key}:${pairNum}:${today}`;
          if (sentToday.has(dedupKey)) return;
          if (await wasNotificationSent(chatId, key, pairNum, today)) return;
          
          sentToday.add(dedupKey);
          bot.sendMessage(chatId, msg).catch(() => {});
          await logNotification(chatId, key, pairNum);
          console.log(`[NOTIF] ${key} → ${chatId}`);
        };

        const isTime = (eventTime) => currentMinutes >= eventTime && currentMinutes < eventTime + 2;

        for (const lesson of lessons) {
          const startTime = timeToMinutes(lesson.startLessonTime);
          const endTime = timeToMinutes(lesson.endLessonTime);
          const nextLesson = lessonByNum[lesson.number + 1];
          const isLast = lesson.number === maxPairNum;

          if (lesson.number === 1 && isTime(startTime - 30)) {
            const scheduleText = formatDaySchedule(lessons);
            const msg = random(MORNING_MESSAGES)
              .replace('{schedule}', scheduleText)
              .replace('{count}', lessons.length);
            await sendNotif('morning_reminder', 0, msg);
          }

          if (isTime(startTime)) {
            await sendNotif(`lesson_start_${lesson.number}`, lesson.number,
              random(LESSON_START_MESSAGES).replace('{lesson}', formatLessonCard(lesson)));
          }

          if (isTime(startTime + 40)) {
            await sendNotif(`minibreak_start_${lesson.number}`, lesson.number,
              random(MINIBREAK_START_MESSAGES)
                .replace('{number}', lesson.number)
                .replace('{subject}', lesson.subject));
          }

          if (isTime(startTime + 45)) {
            const left = Math.max(0, endTime - currentMinutes);
            await sendNotif(`minibreak_end_${lesson.number}`, lesson.number,
              random(MINIBREAK_END_MESSAGES)
                .replace('{number}', lesson.number)
                .replace('{subject}', lesson.subject)
                .replace('{left}', left));
          }

          if (nextLesson && isTime(endTime)) {
            const breakStart = lesson.endLessonTime;
            const breakEnd = nextLesson.startLessonTime;
            const breakDuration = timeToMinutes(breakEnd) - timeToMinutes(breakStart);
            await sendNotif(`lesson_end_${lesson.number}`, lesson.number,
              random(LESSON_END_MESSAGES)
                .replace('{number}', lesson.number)
                .replace('{breakStart}', breakStart)
                .replace('{breakEnd}', breakEnd)
                .replace('{breakDuration}', breakDuration)
                .replace('{next}', formatLessonCard(nextLesson)));
          }

          if (isLast && isTime(endTime)) {
            await sendNotif('day_complete', lesson.number,
              random(DAY_COMPLETE_MESSAGES).replace('{subject}', lesson.subject));
          }
        }

      } catch (error) {
        console.error(`Error for user ${user.chat_id}:`, error.message);
      }
    }
  });

  console.log('Notification scheduler started');
}
