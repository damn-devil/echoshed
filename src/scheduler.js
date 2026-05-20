import cron from 'node-cron';
import { LESSON_TIMES, BREAK_TIMES } from './config.js';
import { getTodayLessonsSorted, timeToMinutes, parseAuditoryInfo } from './bsuir-api.js';
import {
  getUsersWithNotification,
  getNotificationSettings,
  logNotification,
  wasNotificationSent,
  getAllUsers,
} from './database.js';

const WARNING_MINUTES = 3;

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function formatBreakWarning(breakInfo, currentLesson) {
  return `[ПРЕДУПРЕЖДЕНИЕ О ПЕРЕМЕНЕ]\n\nТЕКУЩАЯ ПАРА ЗАКАНЧИВАЕТСЯ ЧЕРЕЗ ${WARNING_MINUTES} МИН\nДЛИТЕЛЬНОСТЬ ПЕРЕМЕНЫ: ${breakInfo.duration} МИН\nВРЕМЯ ПЕРЕМЕНЫ: ${breakInfo.start} - ${breakInfo.end}`;
}

function formatBreakStart(breakInfo, nextLesson) {
  let text = `[ПЕРЕМЕНА НАЧАЛАСЬ]\n\nДЛИТЕЛЬНОСТЬ ПЕРЕМЕНЫ: ${breakInfo.duration} МИН\nВРЕМЯ ПЕРЕМЕНЫ: ${breakInfo.start} - ${breakInfo.end}`;

  if (nextLesson) {
    const auditoryInfo = parseAuditoryInfo(nextLesson.auditory);
    text += `\n\nСЛЕДУЮЩАЯ ПАРА: ${nextLesson.subject}`;
    if (nextLesson.lessonTypeAbbrev) text += ` (${nextLesson.lessonTypeAbbrev})`;
    if (auditoryInfo.room) {
      text += `\nАУДИТОРИЯ: ${auditoryInfo.room}`;
      if (auditoryInfo.building) text += ` (КОРПУС ${auditoryInfo.building})`;
    }
    if (nextLesson.numSubgroup > 0) text += `\nПОДГРУППА: ${nextLesson.numSubgroup}`;
    const timeInfo = LESSON_TIMES[nextLesson.number - 1];
    if (timeInfo) text += `\nНАЧАЛО: ${timeInfo.start}`;
  }

  return text;
}

function formatLessonWarning(lesson) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `[ПРЕДУПРЕЖДЕНИЕ]\n\nПАРА ${lesson.number} НАЧНЕТСЯ ЧЕРЕЗ ${WARNING_MINUTES} МИН`;
  text += `\nПРЕДМЕТ: ${lesson.subject}`;
  if (lesson.lessonTypeAbbrev) text += ` (${lesson.lessonTypeAbbrev})`;
  if (auditoryInfo.room) {
    text += `\nАУДИТОРИЯ: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (КОРПУС ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\nПОДГРУППА: ${lesson.numSubgroup}`;
  if (timeInfo) text += `\nВРЕМЯ: ${timeInfo.start} - ${timeInfo.end}`;

  return text;
}

function formatLessonStart(lesson) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);
  const teacher = lesson.employee
    ? `${lesson.employee.firstName} ${lesson.employee.lastName}`
    : '';

  let text = `[ПАРА НАЧАЛАСЬ]\n\nПАРА: ${lesson.number}`;
  text += `\nПРЕДМЕТ: ${lesson.subject}`;
  if (lesson.lessonTypeAbbrev) text += ` (${lesson.lessonTypeAbbrev})`;
  if (teacher) text += `\nПРЕПОДАВАТЕЛЬ: ${teacher}`;
  if (auditoryInfo.room) {
    text += `\nАУДИТОРИЯ: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (КОРПУС ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\nПОДГРУППА: ${lesson.numSubgroup}`;
  if (timeInfo) text += `\nВРЕМЯ: ${timeInfo.start} - ${timeInfo.end}`;

  return text;
}

function formatNextAfterEnd(lesson) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `⏭️ СЛЕДУЮЩАЯ ПАРА\n`;
  text += `──────────────────────────────\n\n`;
  text += `ПАРА: ${lesson.number}\n`;
  text += `ПРЕДМЕТ: ${lesson.subject}`;
  if (lesson.lessonTypeAbbrev) text += ` (${lesson.lessonTypeAbbrev})`;
  if (lesson.employee) text += `\nПРЕПОДАВАТЕЛЬ: ${lesson.employee.firstName} ${lesson.employee.lastName}`;
  if (auditoryInfo.room) {
    text += `\nАУДИТОРИЯ: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (КОРПУС ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\nПОДГРУППА: ${lesson.numSubgroup}`;
  if (timeInfo) text += `\nНАЧАЛО: ${timeInfo.start}`;

  return text;
}

function formatLastLessonEnd(lastLesson) {
  return `[ДЕНЬ ЗАВЕРШЕН]\n\nПОСЛЕДНЯЯ ПАРА ЗАВЕРШИЛАСЬ: ${lastLesson.subject}\nСТАТУС: СВОБОДЕН`;
}

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
        const subgroup = user.subgroup || 0;
        const settings = getNotificationSettings(chatId);
        const lessons = await getLessonsForUser(user);

        if (lessons.length === 0) continue;

        const lessonNumbers = lessons.map(l => l.number);
        const maxPairNum = Math.max(...lessonNumbers);
        const lessonByNum = {};
        for (const l of lessons) {
          lessonByNum[l.number] = l;
        }

        for (const lesson of lessons) {
          const timeInfo = LESSON_TIMES[lesson.number - 1];
          if (!timeInfo) continue;

          const startMin = timeToMinutes(timeInfo.start);
          const endMin = timeToMinutes(timeInfo.end);

          if (settings.lessonWarning && currentMinutes === startMin - WARNING_MINUTES) {
            const key = `lesson_warning_${lesson.number}`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              bot.sendMessage(chatId, formatLessonWarning(lesson)).catch(() => {});
              logNotification(chatId, key, lesson.number);
            }
          }

          if (settings.lessonStart && currentMinutes === startMin) {
            const key = `lesson_start_${lesson.number}`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              bot.sendMessage(chatId, formatLessonStart(lesson)).catch(() => {});
              logNotification(chatId, key, lesson.number);
            }
          }

          if (currentMinutes === endMin) {
            const nextLesson = lessonByNum[lesson.number + 1];
            if (nextLesson) {
              const key = `next_after_end_${lesson.number}`;
              if (!wasNotificationSent(chatId, key, lesson.number, today)) {
                bot.sendMessage(chatId, formatNextAfterEnd(nextLesson)).catch(() => {});
                logNotification(chatId, key, lesson.number);
              }
            }
          }

          if (settings.breakWarning && currentMinutes === endMin - WARNING_MINUTES) {
            const breakInfo = BREAK_TIMES.find(b => b.after === lesson.number);
            if (breakInfo) {
              const key = `break_warning_${lesson.number}`;
              if (!wasNotificationSent(chatId, key, lesson.number, today)) {
                bot.sendMessage(chatId, formatBreakWarning(breakInfo, lesson)).catch(() => {});
                logNotification(chatId, key, lesson.number);
              }
            }
          }
        }

        for (const breakInfo of BREAK_TIMES) {
          const breakStartMin = timeToMinutes(breakInfo.start);

          if (settings.breakStart && currentMinutes === breakStartMin) {
            const nextLesson = lessonByNum[breakInfo.after + 1];
            const key = `break_start_${breakInfo.after}`;
            if (!wasNotificationSent(chatId, key, breakInfo.after, today)) {
              bot.sendMessage(chatId, formatBreakStart(breakInfo, nextLesson)).catch(() => {});
              logNotification(chatId, key, breakInfo.after);
            }
          }
        }

        const lastLesson = lessonByNum[maxPairNum];
        if (lastLesson) {
          const lastEndTime = timeToMinutes(LESSON_TIMES[maxPairNum - 1].end);
          if (currentMinutes === lastEndTime) {
            const key = `last_lesson_end`;
            if (!wasNotificationSent(chatId, key, maxPairNum, today)) {
              bot.sendMessage(chatId, formatLastLessonEnd(lastLesson)).catch(() => {});
              logNotification(chatId, key, maxPairNum);
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
