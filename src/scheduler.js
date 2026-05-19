import cron from 'node-cron';
import { LESSON_TIMES, BREAK_TIMES } from './config.js';
import { getTodayLessonsSorted, timeToMinutes, parseAuditoryInfo } from './bsuir-api.js';
import {
  getUsersWithNotification,
  getNotificationSettings,
  logNotification,
  wasNotificationSent,
  getAllUsers,
  getUserLanguage,
} from './database.js';
import { t } from './translations.js';

const WARNING_MINUTES = 3;

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function formatBreakWarning(breakInfo, currentLesson, lang) {
  return t('break_warning', lang, {
    min: WARNING_MINUTES,
    duration: breakInfo.duration,
    start: breakInfo.start,
    end: breakInfo.end,
  });
}

function formatBreakStart(breakInfo, nextLesson, lang) {
  let text = t('break_started', lang, {
    duration: breakInfo.duration,
    start: breakInfo.start,
    end: breakInfo.end,
  });

  if (nextLesson) {
    const auditoryInfo = parseAuditoryInfo(nextLesson.auditory);
    text += `\n\n${t('next_lesson_label', lang)}: ${nextLesson.subject}`;
    if (nextLesson.lessonTypeAbbrev) text += ` (${nextLesson.lessonTypeAbbrev})`;
    if (auditoryInfo.room) {
      text += `\n${t('room', lang)}: ${auditoryInfo.room}`;
      if (auditoryInfo.building) text += ` (${t('bldg', lang)} ${auditoryInfo.building})`;
    }
    if (nextLesson.numSubgroup > 0) text += `\n${t('subgroup', lang)}: ${nextLesson.numSubgroup}`;
    const timeInfo = LESSON_TIMES[nextLesson.number - 1];
    if (timeInfo) text += `\n${t('start', lang)}: ${timeInfo.start}`;
  }

  return text;
}

function formatLessonWarning(lesson, lang) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = t('lesson_warning', lang, { num: lesson.number, min: WARNING_MINUTES });
  text += `\n${t('subject', lang)}: ${lesson.subject}`;
  if (lesson.lessonTypeAbbrev) text += ` (${lesson.lessonTypeAbbrev})`;
  if (auditoryInfo.room) {
    text += `\n${t('room', lang)}: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (${t('bldg', lang)} ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\n${t('subgroup', lang)}: ${lesson.numSubgroup}`;
  if (timeInfo) text += `\n${t('time', lang)}: ${timeInfo.start} - ${timeInfo.end}`;

  return text;
}

function formatLessonStart(lesson, lang) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);
  const teacher = lesson.employee
    ? `${lesson.employee.firstName} ${lesson.employee.lastName}`
    : '';

  let text = t('lesson_started', lang, { num: lesson.number });
  text += `\n${t('subject', lang)}: ${lesson.subject}`;
  if (lesson.lessonTypeAbbrev) text += ` (${lesson.lessonTypeAbbrev})`;
  if (teacher) text += `\n${t('teacher', lang)}: ${teacher}`;
  if (auditoryInfo.room) {
    text += `\n${t('room', lang)}: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (${t('bldg', lang)} ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\n${t('subgroup', lang)}: ${lesson.numSubgroup}`;
  if (timeInfo) text += `\n${t('time', lang)}: ${timeInfo.start} - ${timeInfo.end}`;

  return text;
}

function formatLastLessonEnd(lastLesson, lang) {
  return t('day_complete', lang, { subject: lastLesson.subject });
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
        const lang = getUserLanguage(chatId);
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
              bot.sendMessage(chatId, formatLessonWarning(lesson, lang)).catch(() => {});
              logNotification(chatId, key, lesson.number);
            }
          }

          if (settings.lessonStart && currentMinutes === startMin) {
            const key = `lesson_start_${lesson.number}`;
            if (!wasNotificationSent(chatId, key, lesson.number, today)) {
              bot.sendMessage(chatId, formatLessonStart(lesson, lang)).catch(() => {});
              logNotification(chatId, key, lesson.number);
            }
          }

          if (settings.breakWarning && currentMinutes === endMin - WARNING_MINUTES) {
            const breakInfo = BREAK_TIMES.find(b => b.after === lesson.number);
            if (breakInfo) {
              const key = `break_warning_${lesson.number}`;
              if (!wasNotificationSent(chatId, key, lesson.number, today)) {
                bot.sendMessage(chatId, formatBreakWarning(breakInfo, lesson, lang)).catch(() => {});
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
              bot.sendMessage(chatId, formatBreakStart(breakInfo, nextLesson, lang)).catch(() => {});
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
              bot.sendMessage(chatId, formatLastLessonEnd(lastLesson, lang)).catch(() => {});
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
