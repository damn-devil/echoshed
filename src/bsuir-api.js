import { createBsuirClient } from 'bsuir-iis-api';
import { LESSON_TIMES } from './config.js';

const client = createBsuirClient({
  cache: { ttlMs: 5 * 60 * 1000, maxEntries: 200 },
  retries: 2,
  timeoutMs: 15000,
});

const scheduleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
let currentWeekCache = { week: null, timestamp: 0 };
const WEEK_CACHE_TTL = 60 * 60 * 1000;

const WEEKDAY_MAP = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

const LESSON_TYPE_MAP = {
  'Лек': 'Лекция',
  'Лаб': 'Лабораторная',
  'Пр': 'Практическая',
  'КП': 'Курсовой проект',
  'КР': 'Контрольная работа',
  'Зач': 'Зачёт',
  'Экз': 'Экзамен',
  'ДКР': 'Домашняя контрольная работа',
};

export function getMinskTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3 * 3600000));
}

async function fetchCurrentWeek() {
  const now = Date.now();
  if (currentWeekCache.week && now - currentWeekCache.timestamp < WEEK_CACHE_TTL) {
    return currentWeekCache.week;
  }

  try {
    const week = await client.schedule.getCurrentWeek();
    currentWeekCache = { week, timestamp: now };
    console.log(`[API] Current week from API: ${week}`);
    return week;
  } catch (error) {
    console.error(`[API] Error getting current week:`, error.message);
    return 1;
  }
}

function isLessonOnCurrentWeek(lesson, currentWeek) {
  if (!lesson.weekNumber) return true;
  if (Array.isArray(lesson.weekNumber)) {
    return lesson.weekNumber.includes(currentWeek);
  }
  return lesson.weekNumber === currentWeek;
}

function getLessonNumber(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const minutes = h * 60 + m;
  
  const ranges = [
    { num: 1, start: 8 * 60 + 30, end: 9 * 60 + 55 },
    { num: 2, start: 10 * 60 + 5, end: 11 * 60 + 30 },
    { num: 3, start: 12 * 60, end: 13 * 60 + 25 },
    { num: 4, start: 13 * 60 + 35, end: 15 * 60 },
    { num: 5, start: 15 * 60 + 10, end: 16 * 60 + 35 },
    { num: 6, start: 16 * 60 + 45, end: 18 * 60 + 10 },
    { num: 7, start: 18 * 60 + 20, end: 19 * 60 + 45 },
  ];
  
  for (const r of ranges) {
    if (minutes >= r.start && minutes < r.end) return r.num;
  }
  return null;
}

function enrichLesson(rawLesson) {
  const number = getLessonNumber(rawLesson.startLessonTime) || rawLesson.number || 1;
  const employee = rawLesson.employees && rawLesson.employees.length > 0
    ? { firstName: rawLesson.employees[0].firstName || '', lastName: rawLesson.employees[0].lastName || '' }
    : null;
  const auditory = rawLesson.auditories && rawLesson.auditories.length > 0 ? rawLesson.auditories[0] : null;

  return {
    number,
    subject: rawLesson.subject || '',
    subjectFullName: rawLesson.subjectFullName || '',
    lessonTypeAbbrev: rawLesson.lessonTypeAbbrev || null,
    employee,
    auditory,
    auditories: rawLesson.auditories || [],
    employees: rawLesson.employees || [],
    day: rawLesson.day || null,
    source: rawLesson.source || 'schedules',
    weekNumber: rawLesson.weekNumber,
    numSubgroup: rawLesson.numSubgroup,
    note: rawLesson.note,
    announcement: rawLesson.announcement,
    dateLesson: rawLesson.dateLesson,
    startLessonTime: rawLesson.startLessonTime,
    endLessonTime: rawLesson.endLessonTime,
  };
}

function getTodayWeekdayKey() {
  const now = getMinskTime();
  return WEEKDAY_MAP[now.getDay()] || null;
}

function getTomorrowWeekdayKey() {
  const now = getMinskTime();
  const day = now.getDay();
  const tomorrowDay = day === 0 ? 1 : day === 6 ? 7 : day + 1;
  return WEEKDAY_MAP[tomorrowDay] || null;
}

function getLessonTypeFull(abbrev) {
  if (!abbrev) return '';
  return LESSON_TYPE_MAP[abbrev] || abbrev;
}

function parseAuditoryInfo(auditoryStr) {
  if (!auditoryStr) return { room: '', building: '' };
  const parts = auditoryStr.split('/');
  if (parts.length >= 2) {
    return { room: parts[1]?.trim() || parts[0].trim(), building: parts[0].trim() };
  }
  return { room: auditoryStr.trim(), building: '' };
}

async function getGroupSchedule(groupNumber, subgroup = 0) {
  const cacheKey = subgroup > 0 ? `${groupNumber}_${subgroup}` : groupNumber;
  const now = Date.now();
  const cached = scheduleCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.data;

  try {
    console.log(`[API] Fetching schedule for ${groupNumber}...`);
    const schedule = await client.schedule.getGroup(groupNumber);
    console.log(`[API] lessonsByDay:`, Object.keys(schedule?.lessonsByDay || {}));
    console.log(`[API] Total lessons:`, schedule?.lessons?.length || 0);
    
    scheduleCache.set(cacheKey, { data: schedule, timestamp: now });
    return schedule;
  } catch (error) {
    console.error(`[API] Error for ${cacheKey}:`, error.message);
    throw new Error('Не удалось получить расписание. Проверьте номер группы.');
  }
}

async function getLessonsForDay(schedule, dayKey, subgroup = 0) {
  const currentWeek = await fetchCurrentWeek();
  const rawLessons = schedule?.lessonsByDay?.[dayKey] || [];
  
  let filtered = rawLessons.filter(l => l.source === 'schedules');
  if (filtered.length === 0) filtered = rawLessons;
  
  filtered = filtered.filter(l => isLessonOnCurrentWeek(l, currentWeek));
  
  if (subgroup > 0) {
    filtered = filtered.filter(l => {
      const sg = l.numSubgroup || 0;
      return sg === 0 || sg === subgroup;
    });
  }
  
  return filtered.map(enrichLesson).sort((a, b) => a.number - b.number);
}

export async function getTodayLessonsSorted(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const todayKey = getTodayWeekdayKey();
  if (!todayKey || !schedule?.lessonsByDay?.[todayKey]) return [];
  return getLessonsForDay(schedule, todayKey, subgroup);
}

export async function getTomorrowLessonsSorted(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const tomorrowKey = getTomorrowWeekdayKey();
  if (!tomorrowKey || !schedule?.lessonsByDay?.[tomorrowKey]) return [];
  return getLessonsForDay(schedule, tomorrowKey, subgroup);
}

function formatLessonCompact(lesson) {
  const time = `${lesson.startLessonTime}—${lesson.endLessonTime}`;
  const subject = lesson.subject || '❓';
  const type = lesson.lessonTypeAbbrev ? ` (${lesson.lessonTypeAbbrev})` : '';
  const room = lesson.auditory ? ` | 📍 ${lesson.auditory}` : '';
  const teacher = lesson.employee ? ` | 👤 ${lesson.employee.lastName}` : '';
  const sg = lesson.numSubgroup > 0 ? ` | 👥 п/г ${lesson.numSubgroup}` : '';
  const note = lesson.note ? `\n   📝 ${lesson.note}` : '';

  if (lesson.announcement) {
    return `📢 ${lesson.number})📖 ${subject}${type} | ⏰ ${time}${room}${teacher}${sg}${note}`;
  }
  
  return `${lesson.number})📖 ${subject}${type} | ⏰ ${time}${room}${teacher}${sg}${note}`;
}
function formatLessonFull(lesson) {
  const time = `${lesson.startLessonTime} — ${lesson.endLessonTime}`;
  const subject = lesson.subject || 'НЕ УКАЗАНО';
  const type = getLessonTypeFull(lesson.lessonTypeAbbrev);
  const teacher = lesson.employee ? `${lesson.employee.firstName} ${lesson.employee.lastName}` : 'НЕ УКАЗАНО';
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `📚 Пара ${lesson.number} | ⏰ ${time}\n`;
  text += `📖 ${subject}`;
  if (type) text += `\n📝 Тип: ${type}`;
  text += `\n👤 ${teacher}`;
  if (auditoryInfo.room) {
    text += `\n📍 ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (🏢 ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\n👥 Подгруппа: ${lesson.numSubgroup}`;
  if (lesson.note) text += `\n📝 ${lesson.note}`;
  if (lesson.announcement) text += `\n📢 УВЕДОМЛЕНИЕ`;

  return text;
}

export async function getTodayScheduleText(groupNumber, subgroup = 0) {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);

  if (lessons.length === 0) {
    return `📅 РАСПИСАНИЕ НА СЕГОДНЯ\n\n❌ Занятий нет — выходной день`;
  }

  let text = `📅 РАСПИСАНИЕ НА СЕГОДНЯ${subgroup > 0 ? ` (п/г ${subgroup})` : ''}\n\n`;

  for (let i = 0; i < lessons.length; i++) {
    if (i > 0) text += '─'.repeat(25) + '\n';
    text += formatLessonCompact(lessons[i]) + '\n';
  }

  return text.trim();
}

export async function getTomorrowScheduleText(groupNumber, subgroup = 0) {
  const lessons = await getTomorrowLessonsSorted(groupNumber, subgroup);

  if (lessons.length === 0) {
    return `📅 РАСПИСАНИЕ НА ЗАВТРА\n\n❌ Занятий нет — выходной день`;
  }

  let text = `📅 РАСПИСАНИЕ НА ЗАВТРА${subgroup > 0 ? ` (п/г ${subgroup})` : ''}\n\n`;

  for (let i = 0; i < lessons.length; i++) {
    if (i > 0) text += '─'.repeat(25) + '\n';
    text += formatLessonCompact(lessons[i]) + '\n';
  }

  return text.trim();
}

export async function getWeekScheduleText(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const weekdayOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  let text = `📅 РАСПИСАНИЕ НА НЕДЕЛЮ${subgroup > 0 ? ` (п/г ${subgroup})` : ''}\n\n`;

  let hasLessons = false;

  for (const dayKey of weekdayOrder) {
    const lessons = await getLessonsForDay(schedule, dayKey, subgroup);
    if (lessons.length === 0) continue;

    hasLessons = true;
    text += `📌 ${dayKey.toUpperCase()}\n`;

    for (let i = 0; i < lessons.length; i++) {
      if (i > 0) text += '─'.repeat(25) + '\n';
      text += formatLessonCompact(lessons[i]) + '\n';
    }

    text += '\n';
  }

  if (!hasLessons) {
    text += `❌ Нет занятий на этой неделе`;
  }

  return text.trim();
}
export async function getExamsText(groupNumber) {
  const exams = await client.schedule.getGroupExams(groupNumber);
  const examList = Array.isArray(exams) ? exams : [];

  if (examList.length === 0) {
    return `📅 ЭКЗАМЕНЫ\n\n❌ Экзамены ещё не объявлены`;
  }

  // Группируем по предмету
  const bySubject = {};
  for (const exam of examList) {
    const key = exam.subject || '❓';
    if (!bySubject[key]) bySubject[key] = [];
    bySubject[key].push(exam);
  }

  let text = `📅 ЭКЗАМЕНЫ И КОНСУЛЬТАЦИИ\n\n`;

  for (const [subject, items] of Object.entries(bySubject)) {
    text += `📖 ${subject}\n`;
    for (const item of items) {
      const type = item.lessonTypeAbbrev === 'Экзамен' || item.lessonTypeAbbrev === 'Экз' ? '📝 Экзамен' : '💬 Консультация';
      const date = item.dateLesson || '—';
      const time = item.startLessonTime ? `${item.startLessonTime}—${item.endLessonTime}` : '';
      const room = item.auditories?.[0] || '';
      const teacher = item.employees?.[0]?.lastName || '';

      text += `   ${type} | 📅 ${date}`;
      if (time) text += ` | ⏰ ${time}`;
      if (room) text += ` | 📍 ${room}`;
      if (teacher) text += ` | 👤 ${teacher}`;
      text += '\n';
    }
    text += '\n';
  }

  return text.trim();
}

export async function getNextLessonInfo(groupNumber, subgroup = 0) {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);
  const now = getMinskTime();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const lesson of lessons) {
    const startTime = timeToMinutes(lesson.startLessonTime);
    if (currentTime < startTime) {
      const minutesUntil = startTime - currentTime;
      let timeUntil = minutesUntil >= 60
        ? `${Math.floor(minutesUntil / 60)}ч ${minutesUntil % 60}м`
        : `${minutesUntil}м`;

      return {
        isGoingNow: false,
        isNext: true,
        message: `➡️ СЛЕДУЮЩАЯ ПАРА\n${'─'.repeat(30)}\n${formatLessonCompact(lesson)}\n\n⏰ Начало: ${lesson.startLessonTime} (через ${timeUntil})`,
      };
    }
  }

  const tomorrowLessons = await getTomorrowLessonsSorted(groupNumber, subgroup);
  if (tomorrowLessons.length > 0) {
    return {
      isGoingNow: false,
      isNext: false,
      message: `⏹ Больше пар сегодня нет\n\n➡️ Первая пара завтра:\n${formatLessonCompact(tomorrowLessons[0])}\n⏰ Начало: ${tomorrowLessons[0].startLessonTime}`,
    };
  }

  return { isGoingNow: false, isNext: false, message: `❌ Нет пар сегодня и завтра` };
}

export async function getCurrentLessonInfo(groupNumber, subgroup = 0) {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);
  const now = getMinskTime();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const lesson of lessons) {
    const start = timeToMinutes(lesson.startLessonTime);
    const end = timeToMinutes(lesson.endLessonTime);

    if (currentTime >= start && currentTime < end) {
      const minutesLeft = end - currentTime;
      return {
        isGoingNow: true,
        message: `🔴 ТЕКУЩАЯ ПАРА\n${'─'.repeat(30)}\n${formatLessonCompact(lesson)}\n\n⏱ Осталось: ${minutesLeft} мин`,
      };
    }
  }

  return { isGoingNow: false, message: `⏹ Нет активной пары` };
}

export async function validateGroup(groupNumber) {
  try {
    const schedule = await getGroupSchedule(groupNumber);
    return schedule && (schedule.lessons?.length > 0 || Object.keys(schedule.lessonsByDay || {}).length > 0);
  } catch {
    return false;
  }
}

export async function searchGroup(query) {
  try {
    const groups = await client.groups.listAll();
    return groups.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 10).map(g => ({ name: g.name, faculty: g.faculty?.name || '' }));
  } catch (error) {
    console.error('Error searching groups:', error.message);
    return [];
  }
}

export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export { parseAuditoryInfo, fetchCurrentWeek as getCurrentWeek };
