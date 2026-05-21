import cron from 'node-cron';
import { getMinskTime } from './bsuir-api.js';
import {
  logNotification,
  wasNotificationSent,
  getAllUsers,
} from './database.js';
import { createBsuirClient } from 'bsuir-iis-api';

const sentExams = new Set();

const client = createBsuirClient({
  cache: { ttlMs: 10 * 60 * 1000, maxEntries: 100 },
  retries: 2,
  timeoutMs: 15000,
});

const examCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

async function getExamsForGroup(groupNumber) {
  const now = Date.now();
  const cached = examCache.get(groupNumber);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.data;

  try {
    const exams = await client.schedule.getGroupExams(groupNumber);
    const result = Array.isArray(exams) ? exams : [];
    examCache.set(groupNumber, { data: result, timestamp: now });
    return result;
  } catch (error) {
    console.error(`[EXAM] Error for ${groupNumber}:`, error.message);
    return [];
  }
}

function getTomorrowDate() {
  const now = getMinskTime();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const year = tomorrow.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatExamCard(exam) {
  const subject = exam.subject || '❓';
  const type = exam.lessonTypeAbbrev === 'Экзамен' || exam.lessonTypeAbbrev === 'Экз' ? '📝 Экзамен' : '💬 Консультация';
  const time = exam.startLessonTime ? `⏰ ${exam.startLessonTime}` : '';
  const room = exam.auditories?.[0] ? `📍 ${exam.auditories[0]}` : '';
  const teacher = exam.employees?.[0]
    ? `👤 ${exam.employees[0].lastName}`
    : '';

  return `${type}: ${subject}\n${time}${time && room ? ' | ' : ''}${room}\n${teacher}`.trim();
}

export function startExamNotifier(bot) {
  cron.schedule('0 10-22 * * *', async () => {
    const tomorrowDate = getTomorrowDate();
    const today = new Date().toISOString().split('T')[0];

    console.log(`[EXAM] Checking exams for tomorrow: ${tomorrowDate}`);

    const allUsers = await getAllUsers();

    for (const user of allUsers) {
      try {
        const chatId = user.chat_id;
        const exams = await getExamsForGroup(user.group_number);

        const tomorrowExams = exams.filter(exam => {
          const examDate = exam.dateLesson;
          if (!examDate) return false;
          return examDate === tomorrowDate;
        });

        if (tomorrowExams.length === 0) continue;

        const cacheKey = `exam_${tomorrowDate}`;
        const dedupKey = `${chatId}:${cacheKey}:${today}`;
        if (sentExams.has(dedupKey)) continue;
        if (await wasNotificationSent(chatId, cacheKey, 0, today)) continue;

        sentExams.add(dedupKey);

        let message = `📢 ЗАВТРА ЭКЗАМЕНЫ/КОНСУЛЬТАЦИИ:\n\n`;
        for (const exam of tomorrowExams) {
          message += formatExamCard(exam) + '\n\n';
        }

        bot.sendMessage(chatId, message.trim()).catch(() => {});
        await logNotification(chatId, cacheKey, 0);
        console.log(`[EXAM] Notified ${chatId} about ${tomorrowExams.length} exam(s)`);

      } catch (error) {
        console.error(`[EXAM] Error for user ${user.chat_id}:`, error.message);
      }
    }
  });

  console.log('Exam notifier started');
}
