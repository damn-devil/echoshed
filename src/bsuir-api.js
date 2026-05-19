import { createBsuirClient, normalizeSchedule } from 'bsuir-iis-api';
import { LESSON_TIMES } from './config.js';
import { t, LESSON_TYPE_KEYS, WEEKDAY_KEYS } from './translations.js';

const client = createBsuirClient({
  cache: { ttlMs: 5 * 60 * 1000, maxEntries: 200 },
  retries: 2,
  timeoutMs: 15000,
});

const scheduleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const WEEKDAY_MAP = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

function getLessonNumber(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const minutes = h * 60 + m;
  for (let i = 0; i < LESSON_TIMES.length; i++) {
    const [sh, sm] = LESSON_TIMES[i].start.split(':').map(Number);
    if (minutes === sh * 60 + sm) return i + 1;
  }
  for (let i = 0; i < LESSON_TIMES.length; i++) {
    const [sh, sm] = LESSON_TIMES[i].start.split(':').map(Number);
    const [eh, em] = LESSON_TIMES[i].end.split(':').map(Number);
    if (minutes >= sh * 60 + sm && minutes < eh * 60 + em) return i + 1;
  }
  return null;
}

function enrichLesson(rawLesson) {
  const number = getLessonNumber(rawLesson.startLessonTime) || 1;
  const employee = rawLesson.employees && rawLesson.employees.length > 0
    ? {
        firstName: rawLesson.employees[0].firstName || '',
        lastName: rawLesson.employees[0].lastName || '',
      }
    : null;
  const auditory = rawLesson.auditories && rawLesson.auditories.length > 0
    ? rawLesson.auditories[0]
    : null;

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
    dateLesson: rawLesson.dateLesson,
    startLessonTime: rawLesson.startLessonTime,
    endLessonTime: rawLesson.endLessonTime,
  };
}

function getTodayWeekdayKey() {
  const day = new Date().getDay();
  return WEEKDAY_MAP[day] || null;
}

function getTomorrowWeekdayKey() {
  const day = new Date().getDay();
  const tomorrowDay = day === 0 ? 1 : day === 6 ? 7 : day + 1;
  return WEEKDAY_MAP[tomorrowDay] || null;
}

function getLessonTypeFull(abbrev, lang) {
  if (!abbrev) return '';
  const key = LESSON_TYPE_KEYS[abbrev];
  return key ? t(key, lang) : abbrev;
}

function parseAuditoryInfo(auditoryStr) {
  if (!auditoryStr) return { room: '', building: '' };

  const parts = auditoryStr.split('/');
  if (parts.length >= 2) {
    return {
      room: parts[1]?.trim() || parts[0].trim(),
      building: parts[0].trim(),
    };
  }

  return { room: auditoryStr.trim(), building: '' };
}

async function getGroupSchedule(groupNumber, subgroup = 0) {
  const cacheKey = subgroup > 0 ? `${groupNumber}_${subgroup}` : groupNumber;
  const now = Date.now();
  const cached = scheduleCache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    let raw;
    if (subgroup > 0) {
      raw = await client.schedule.getGroupBySubgroup(groupNumber, subgroup, { raw: true });
    } else {
      raw = await client.schedule.getGroup(groupNumber, { raw: true });
    }
    const schedule = normalizeSchedule(raw);
    scheduleCache.set(cacheKey, { data: schedule, timestamp: now });
    return schedule;
  } catch (error) {
    console.error(`Error fetching schedule for group ${groupNumber} subgroup ${subgroup}:`, error.message);
    throw new Error('Failed to fetch schedule. Check group number.');
  }
}

export async function getTodayLessonsSorted(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const todayKey = getTodayWeekdayKey();
  if (!todayKey || !schedule.lessonsByDay[todayKey]) return [];

  const lessons = schedule.lessonsByDay[todayKey]
    .filter(l => l.source === 'schedules')
    .map(enrichLesson)
    .sort((a, b) => a.number - b.number);

  return lessons;
}

export async function getTomorrowLessonsSorted(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const tomorrowKey = getTomorrowWeekdayKey();
  if (!tomorrowKey || !schedule.lessonsByDay[tomorrowKey]) return [];

  const lessons = schedule.lessonsByDay[tomorrowKey]
    .filter(l => l.source === 'schedules')
    .map(enrichLesson)
    .sort((a, b) => a.number - b.number);

  return lessons;
}

export async function getTodayScheduleText(groupNumber, subgroup = 0, lang = 'ru') {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);

  if (lessons.length === 0) {
    return t('no_lessons_today', lang);
  }

  let text = subgroup > 0 ? t('today_schedule_sub', lang, { subgroup }) : t('today_schedule', lang);
  text += '\n';
  text += '─'.repeat(30) + '\n\n';

  for (const lesson of lessons) {
    text += formatLessonFull(lesson, lang) + '\n\n';
  }

  return text.trim();
}

export async function getTomorrowScheduleText(groupNumber, subgroup = 0, lang = 'ru') {
  const lessons = await getTomorrowLessonsSorted(groupNumber, subgroup);

  if (lessons.length === 0) {
    return t('no_lessons_tomorrow', lang);
  }

  let text = subgroup > 0 ? t('tomorrow_schedule_sub', lang, { subgroup }) : t('tomorrow_schedule', lang);
  text += '\n';
  text += '─'.repeat(30) + '\n\n';

  for (const lesson of lessons) {
    text += formatLessonFull(lesson, lang) + '\n\n';
  }

  return text.trim();
}

export async function getWeekScheduleText(groupNumber, subgroup = 0, lang = 'ru') {
  const schedule = await getGroupSchedule(groupNumber, subgroup);

  let text = subgroup > 0 ? t('week_schedule_sub', lang, { subgroup }) : t('week_schedule', lang);
  text += '\n';
  text += '─'.repeat(30) + '\n';

  let hasLessons = false;

  for (const dayKey of WEEKDAY_KEYS) {
    const rawLessons = schedule.lessonsByDay[dayKey];
    if (!rawLessons || rawLessons.length === 0) continue;

    const lessons = rawLessons
      .filter(l => l.source === 'schedules')
      .map(enrichLesson)
      .sort((a, b) => a.number - b.number);

    if (lessons.length === 0) continue;

    hasLessons = true;
    text += `\n[${t(dayKey, lang).toUpperCase()}]\n`;
    text += '─'.repeat(20) + '\n';

    for (const lesson of lessons) {
      text += formatLessonFull(lesson, lang) + '\n\n';
    }
  }

  if (!hasLessons) {
    text += `\n${t('no_lessons_week', lang)}`;
  }

  return text.trim();
}

export async function getNextLessonInfo(groupNumber, subgroup = 0, lang = 'ru') {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const lesson of lessons) {
    const timeInfo = LESSON_TIMES[lesson.number - 1];
    if (!timeInfo) continue;

    const [startH, startM] = timeInfo.start.split(':').map(Number);
    const startMin = startH * 60 + startM;

    if (currentTime < startMin) {
      const minutesUntil = startMin - currentTime;
      let timeUntil;
      if (minutesUntil >= 60) {
        const hours = Math.floor(minutesUntil / 60);
        const mins = minutesUntil % 60;
        timeUntil = mins > 0 ? `${hours}H ${mins}M` : `${hours}H`;
      } else {
        timeUntil = `${minutesUntil}M`;
      }

      return {
        isGoingNow: false,
        isNext: true,
        message: `${t('next_lesson', lang)}\n${'─'.repeat(30)}\n\n${formatLessonShort(lesson, lang)}\n\n${t('start', lang)}: ${timeInfo.start} (${t('in', lang)} ${timeUntil})`,
      };
    }
  }

  const tomorrowLessons = await getTomorrowLessonsSorted(groupNumber, subgroup);
  if (tomorrowLessons.length > 0) {
    const firstLesson = tomorrowLessons[0];
    const timeInfo = LESSON_TIMES[firstLesson.number - 1];
    return {
      isGoingNow: false,
      isNext: false,
      message: `${t('no_more_today', lang)}\n\n${t('first_tomorrow', lang)}\n${formatLessonShort(firstLesson, lang)}\n${t('start', lang)}: ${timeInfo?.start || '??:??'}`,
    };
  }

  return {
    isGoingNow: false,
    isNext: false,
    message: t('no_lessons_today_tomorrow', lang),
  };
}

export async function getCurrentLessonInfo(groupNumber, subgroup = 0, lang = 'ru') {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const lesson of lessons) {
    const timeInfo = LESSON_TIMES[lesson.number - 1];
    if (!timeInfo) continue;

    const [startH, startM] = timeInfo.start.split(':').map(Number);
    const [endH, endM] = timeInfo.end.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (currentTime >= startMin && currentTime < endMin) {
      const minutesLeft = endMin - currentTime;
      return {
        isGoingNow: true,
        message: `${t('current_lesson', lang)}\n${'─'.repeat(30)}\n\n${formatLessonFull(lesson, lang)}\n\n${t('remaining', lang)}: ${minutesLeft}M`,
      };
    }
  }

  return {
    isGoingNow: false,
    message: t('no_active_lesson', lang),
  };
}

export async function validateGroup(groupNumber) {
  try {
    const schedule = await getGroupSchedule(groupNumber);
    return schedule && schedule.lessons !== undefined;
  } catch {
    return false;
  }
}

export async function searchGroup(query) {
  try {
    const groups = await client.groups.listAll();
    const filtered = groups.filter(g =>
      g.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);

    return filtered.map(g => ({
      name: g.name,
      faculty: g.faculty?.name || '',
    }));
  } catch (error) {
    console.error('Error searching groups:', error.message);
    return [];
  }
}

function formatLessonShort(lesson, lang) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const timeStr = timeInfo ? `${timeInfo.start} - ${timeInfo.end}` : '??:?? - ??:??';
  const subject = lesson.subject || t('not_set', lang);
  const type = getLessonTypeFull(lesson.lessonTypeAbbrev, lang);
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `${t('lesson', lang)}: ${lesson.number} | ${t('time', lang)}: ${timeStr}\n`;
  text += `${t('subject', lang)}: ${subject}`;
  if (type) text += ` (${type})`;
  if (lesson.employee) text += `\n${t('teacher', lang)}: ${lesson.employee.firstName} ${lesson.employee.lastName}`;
  if (auditoryInfo.room) {
    text += `\n${t('room', lang)}: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (${t('bldg', lang)} ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\n${t('subgroup', lang)}: ${lesson.numSubgroup}`;

  return text;
}

function formatLessonFull(lesson, lang) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const timeStr = timeInfo ? `${timeInfo.start} - ${timeInfo.end}` : '??:?? - ??:??';
  const subject = lesson.subject || t('not_set', lang);
  const type = getLessonTypeFull(lesson.lessonTypeAbbrev, lang);
  const teacher = lesson.employee
    ? `${lesson.employee.firstName} ${lesson.employee.lastName}`
    : t('not_set', lang);
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `${t('lesson', lang)}: ${lesson.number} | ${t('time', lang)}: ${timeStr}\n`;
  text += `${t('subject', lang)}: ${subject}`;
  if (type) text += `\n${t('type', lang)}: ${type}`;
  text += `\n${t('teacher', lang)}: ${teacher}`;
  if (auditoryInfo.room) {
    text += `\n${t('room', lang)}: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (${t('bldg', lang)} ${auditoryInfo.building})`;
  } else {
    text += `\n${t('room', lang)}: ${t('not_set', lang)}`;
  }
  if (lesson.numSubgroup > 0) text += `\n${t('subgroup', lang)}: ${lesson.numSubgroup}`;

  return text;
}

export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export { parseAuditoryInfo };
