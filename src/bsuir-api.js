import { createBsuirClient, normalizeSchedule } from 'bsuir-iis-api';
import { LESSON_TIMES, LESSON_TYPES } from './config.js';

const client = createBsuirClient({
  cache: { ttlMs: 5 * 60 * 1000, maxEntries: 200 },
  retries: 2,
  timeoutMs: 15000,
});

const scheduleCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const WEEKDAY_MAP = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
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

function getTodayWeekday() {
  const day = new Date().getDay();
  return WEEKDAY_MAP[day] || null;
}

function getTomorrowWeekday() {
  const day = new Date().getDay();
  const tomorrowDay = day === 0 ? 1 : day === 6 ? 7 : day + 1;
  return WEEKDAY_MAP[tomorrowDay] || null;
}

function getLessonTypeFull(abbrev) {
  if (!abbrev) return '';
  return LESSON_TYPES[abbrev] || abbrev;
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
    throw new Error('Не удалось получить расписание. Проверьте номер группы и подгруппу.');
  }
}

export async function getTodayLessonsSorted(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const todayName = getTodayWeekday();
  if (!todayName || !schedule.lessonsByDay[todayName]) return [];

  const lessons = schedule.lessonsByDay[todayName]
    .filter(l => l.source === 'schedules')
    .map(enrichLesson)
    .sort((a, b) => a.number - b.number);

  return lessons;
}

export async function getTomorrowLessonsSorted(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const tomorrowName = getTomorrowWeekday();
  if (!tomorrowName || !schedule.lessonsByDay[tomorrowName]) return [];

  const lessons = schedule.lessonsByDay[tomorrowName]
    .filter(l => l.source === 'schedules')
    .map(enrichLesson)
    .sort((a, b) => a.number - b.number);

  return lessons;
}

export async function getTodayScheduleText(groupNumber, subgroup = 0) {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);

  if (lessons.length === 0) {
    return '[TODAY SCHEDULE]\n\nNO LESSONS';
  }

  let text = '[TODAY SCHEDULE]';
  if (subgroup > 0) text += ` (SUBGROUP ${subgroup})`;
  text += '\n';
  text += '─'.repeat(30) + '\n\n';

  for (const lesson of lessons) {
    text += formatLessonFull(lesson) + '\n\n';
  }

  return text.trim();
}

export async function getTomorrowScheduleText(groupNumber, subgroup = 0) {
  const lessons = await getTomorrowLessonsSorted(groupNumber, subgroup);

  if (lessons.length === 0) {
    return '[TOMORROW SCHEDULE]\n\nNO LESSONS';
  }

  let text = '[TOMORROW SCHEDULE]';
  if (subgroup > 0) text += ` (SUBGROUP ${subgroup})`;
  text += '\n';
  text += '─'.repeat(30) + '\n\n';

  for (const lesson of lessons) {
    text += formatLessonFull(lesson) + '\n\n';
  }

  return text.trim();
}

export async function getWeekScheduleText(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const weekdayOrder = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  let text = '[WEEK SCHEDULE]';
  if (subgroup > 0) text += ` (SUBGROUP ${subgroup})`;
  text += '\n';
  text += '─'.repeat(30) + '\n';

  for (const dayName of weekdayOrder) {
    const rawLessons = schedule.lessonsByDay[dayName];
    if (!rawLessons || rawLessons.length === 0) continue;

    const lessons = rawLessons
      .filter(l => l.source === 'schedules')
      .map(enrichLesson)
      .sort((a, b) => a.number - b.number);

    if (lessons.length === 0) continue;

    text += `\n[${dayName.toUpperCase()}]\n`;
    text += '─'.repeat(20) + '\n';

    for (const lesson of lessons) {
      text += formatLessonFull(lesson) + '\n\n';
    }
  }

  return text.trim();
}

export async function getNextLessonInfo(groupNumber, subgroup = 0) {
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
        message: `[NEXT LESSON]\n${'─'.repeat(30)}\n\n${formatLessonShort(lesson)}\n\nSTART: ${timeInfo.start} (IN ${timeUntil})`,
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
      message: `[NO MORE LESSONS TODAY]\n\nFIRST LESSON TOMORROW:\n${formatLessonShort(firstLesson)}\nSTART: ${timeInfo?.start || '??:??'}`,
    };
  }

  return {
    isGoingNow: false,
    isNext: false,
    message: '[NO LESSONS TODAY OR TOMORROW]',
  };
}

export async function getCurrentLessonInfo(groupNumber, subgroup = 0) {
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
        message: `[CURRENT LESSON]\n${'─'.repeat(30)}\n\n${formatLessonFull(lesson)}\n\nREMAINING: ${minutesLeft}M`,
      };
    }
  }

  return {
    isGoingNow: false,
    message: '[NO ACTIVE LESSON]',
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

function formatLessonShort(lesson) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const timeStr = timeInfo ? `${timeInfo.start} - ${timeInfo.end}` : '??:?? - ??:??';
  const subject = lesson.subject || 'SUBJECT NOT SET';
  const type = getLessonTypeFull(lesson.lessonTypeAbbrev);
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `LESSON: ${lesson.number} | TIME: ${timeStr}\n`;
  text += `SUBJECT: ${subject}`;
  if (type) text += ` (${type})`;
  if (lesson.employee) text += `\nTEACHER: ${lesson.employee.firstName} ${lesson.employee.lastName}`;
  if (auditoryInfo.room) {
    text += `\nROOM: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (BLDG ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\nSUBGROUP: ${lesson.numSubgroup}`;

  return text;
}

function formatLessonFull(lesson) {
  const timeInfo = LESSON_TIMES[lesson.number - 1];
  const timeStr = timeInfo ? `${timeInfo.start} - ${timeInfo.end}` : '??:?? - ??:??';
  const subject = lesson.subject || 'SUBJECT NOT SET';
  const type = getLessonTypeFull(lesson.lessonTypeAbbrev);
  const teacher = lesson.employee
    ? `${lesson.employee.firstName} ${lesson.employee.lastName}`
    : 'TEACHER NOT SET';
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `LESSON: ${lesson.number} | TIME: ${timeStr}\n`;
  text += `SUBJECT: ${subject}`;
  if (type) text += `\nTYPE: ${type}`;
  text += `\nTEACHER: ${teacher}`;
  if (auditoryInfo.room) {
    text += `\nROOM: ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (BLDG ${auditoryInfo.building})`;
  } else {
    text += `\nROOM: NOT SET`;
  }
  if (lesson.numSubgroup > 0) text += `\nSUBGROUP: ${lesson.numSubgroup}`;

  return text;
}

export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export { parseAuditoryInfo };
