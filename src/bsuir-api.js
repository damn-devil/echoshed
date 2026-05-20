import { createBsuirClient } from 'bsuir-iis-api';
import { LESSON_TIMES } from './config.js';

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

function getLessonNumber(timeStr) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const minutes = h * 60 + m;
  
  const ranges = [
    { num: 1, start: 8 * 60, end: 10 * 60 },
    { num: 2, start: 10 * 60, end: 12 * 60 },
    { num: 3, start: 12 * 60, end: 13 * 60 + 30 },
    { num: 4, start: 13 * 60 + 30, end: 16 * 60 },
    { num: 5, start: 16 * 60, end: 17 * 60 + 50 },
    { num: 6, start: 17 * 60 + 50, end: 19 * 60 + 40 },
    { num: 7, start: 19 * 60 + 40, end: 21 * 60 + 30 },
  ];
  
  for (const r of ranges) {
    if (minutes >= r.start && minutes < r.end) return r.num;
  }
  return null;
}

function enrichLesson(rawLesson) {
  const number = getLessonNumber(rawLesson.startLessonTime) || rawLesson.number || 1;
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

function getLessonTypeFull(abbrev) {
  if (!abbrev) return '';
  return LESSON_TYPE_MAP[abbrev] || abbrev;
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
    console.log(`[API] Cache hit for ${cacheKey}`);
    return cached.data;
  }

  try {
    // getGroupBySubgroup часто возвращает пустые данные, поэтому всегда берём полное расписание
    console.log(`[API] Fetching schedule for ${groupNumber}...`);
    const schedule = await client.schedule.getGroup(groupNumber);
    
    console.log(`[API] Response keys:`, Object.keys(schedule || {}));
    console.log(`[API] lessonsByDay exists:`, !!schedule?.lessonsByDay);
    console.log(`[API] lessonsByDay days:`, Object.keys(schedule?.lessonsByDay || {}));
    console.log(`[API] Total lessons:`, schedule?.lessons?.length || 0);
    
    if (schedule?.lessonsByDay) {
      for (const [day, lessons] of Object.entries(schedule.lessonsByDay)) {
        console.log(`[API] ${day}: ${lessons?.length || 0} lessons`);
      }
    }
    
    scheduleCache.set(cacheKey, { data: schedule, timestamp: now });
    return schedule;
  } catch (error) {
    console.error(`[API] Error fetching schedule for ${cacheKey}:`, error.message);
    throw new Error('Не удалось получить расписание. Проверьте номер группы.');
  }
}

function getLessonsForDay(schedule, dayKey, subgroup = 0) {
  const rawLessons = schedule?.lessonsByDay?.[dayKey] || [];
  console.log(`[API] Raw lessons for ${dayKey}:`, rawLessons.length);
  
  if (rawLessons.length > 0) {
    console.log(`[API] First lesson raw keys:`, Object.keys(rawLessons[0]));
    console.log(`[API] First lesson source:`, rawLessons[0].source);
  }
  
  let filtered = rawLessons.filter(l => l.source === 'schedules');
  console.log(`[API] After source filter (schedules):`, filtered.length);
  
  // Если фильтр убрал всё — пробуем без фильтра
  if (filtered.length === 0 && rawLessons.length > 0) {
    console.log(`[API] Source filter removed all lessons, using unfiltered`);
    filtered = rawLessons;
  }
  
  // Фильтрация по подгруппе: показываем уроки для выбранной подгруппы + общие (numSubgroup=0)
  if (subgroup > 0) {
    const beforeSubgroupFilter = filtered.length;
    filtered = filtered.filter(l => {
      const sg = l.numSubgroup || 0;
      return sg === 0 || sg === subgroup;
    });
    console.log(`[API] After subgroup filter (${subgroup}):`, filtered.length, `(was ${beforeSubgroupFilter})`);
  }
  
  const enriched = filtered.map(enrichLesson).sort((a, b) => a.number - b.number);
  console.log(`[API] After enrich:`, enriched.length);
  
  return enriched;
}

export async function getTodayLessonsSorted(groupNumber, subgroup = 0) {
  console.log(`[API] getTodayLessonsSorted called for ${groupNumber} subgroup ${subgroup}`);
  
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const todayKey = getTodayWeekdayKey();
  
  console.log(`[API] Today weekday key: ${todayKey}`);
  
  if (!todayKey) {
    console.log(`[API] No weekday key for today (Sunday?)`);
    return [];
  }

  if (!schedule?.lessonsByDay?.[todayKey]) {
    console.log(`[API] No lessonsByDay[${todayKey}] - returning empty`);
    return [];
  }

  const lessons = getLessonsForDay(schedule, todayKey, subgroup);
  console.log(`[API] Final lessons for today:`, lessons.length);
  
  return lessons;
}

export async function getTomorrowLessonsSorted(groupNumber, subgroup = 0) {
  const schedule = await getGroupSchedule(groupNumber, subgroup);
  const tomorrowKey = getTomorrowWeekdayKey();
  
  console.log(`[API] Tomorrow weekday key: ${tomorrowKey}`);
  
  if (!tomorrowKey) {
    console.log(`[API] No weekday key for tomorrow`);
    return [];
  }

  if (!schedule?.lessonsByDay?.[tomorrowKey]) {
    console.log(`[API] No lessonsByDay[${tomorrowKey}] - returning empty`);
    return [];
  }

  const lessons = getLessonsForDay(schedule, tomorrowKey, subgroup);
  console.log(`[API] Final lessons for tomorrow:`, lessons.length);
  
  return lessons;
}

export async function getTodayScheduleText(groupNumber, subgroup = 0) {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);

  if (lessons.length === 0) {
    return `[РАСПИСАНИЕ НА СЕГОДНЯ]\n\nЗАНЯТИЙ НЕТ - ВЫХОДНОЙ ДЕНЬ`;
  }

  let text = subgroup > 0 ? `[РАСПИСАНИЕ НА СЕГОДНЯ] (ПОДГРУППА ${subgroup})` : `[РАСПИСАНИЕ НА СЕГОДНЯ]`;
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
    return `[РАСПИСАНИЕ НА ЗАВТРА]\n\nЗАНЯТИЙ НЕТ - ВЫХОДНОЙ ДЕНЬ`;
  }

  let text = subgroup > 0 ? `[РАСПИСАНИЕ НА ЗАВТРА] (ПОДГРУППА ${subgroup})` : `[РАСПИСАНИЕ НА ЗАВТРА]`;
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

  let text = subgroup > 0 ? `[РАСПИСАНИЕ НА НЕДЕЛЮ] (ПОДГРУППА ${subgroup})` : `[РАСПИСАНИЕ НА НЕДЕЛЮ]`;
  text += '\n';
  text += '─'.repeat(30) + '\n';

  let hasLessons = false;

  for (const dayKey of weekdayOrder) {
    const lessons = getLessonsForDay(schedule, dayKey, subgroup);

    if (lessons.length === 0) continue;

    hasLessons = true;
    text += `\n[${dayKey.toUpperCase()}]\n`;
    text += '─'.repeat(20) + '\n';

    for (const lesson of lessons) {
      text += formatLessonFull(lesson) + '\n\n';
    }
  }

  if (!hasLessons) {
    text += `\n\nНЕТ ЗАНЯТИЙ НА ЭТОЙ НЕДЕЛЕ`;
  }

  return text.trim();
}

export async function getNextLessonInfo(groupNumber, subgroup = 0) {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const lesson of lessons) {
    const [startH, startM] = lesson.startLessonTime.split(':').map(Number);
    const startMin = startH * 60 + startM;

    if (currentTime < startMin) {
      const minutesUntil = startMin - currentTime;
      let timeUntil;
      if (minutesUntil >= 60) {
        const hours = Math.floor(minutesUntil / 60);
        const mins = minutesUntil % 60;
        timeUntil = mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
      } else {
        timeUntil = `${minutesUntil}м`;
      }

      return {
        isGoingNow: false,
        isNext: true,
        message: `[СЛЕДУЮЩАЯ ПАРА]\n${'─'.repeat(30)}\n\n${formatLessonShort(lesson)}\n\nНАЧАЛО: ${lesson.startLessonTime} (ЧЕРЕЗ ${timeUntil})`,
      };
    }
  }

  const tomorrowLessons = await getTomorrowLessonsSorted(groupNumber, subgroup);
  if (tomorrowLessons.length > 0) {
    const firstLesson = tomorrowLessons[0];
    return {
      isGoingNow: false,
      isNext: false,
      message: `[БОЛЬШЕ ПАР СЕГОДНЯ НЕТ]\n\nПЕРВАЯ ПАРА ЗАВТРА:\n${formatLessonShort(firstLesson)}\nНАЧАЛО: ${firstLesson.startLessonTime || '??:??'}`,
    };
  }

  return {
    isGoingNow: false,
    isNext: false,
    message: `[НЕТ ПАР СЕГОДНЯ И ЗАВТРА]`,
  };
}

export async function getCurrentLessonInfo(groupNumber, subgroup = 0) {
  const lessons = await getTodayLessonsSorted(groupNumber, subgroup);
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const lesson of lessons) {
    const [startH, startM] = lesson.startLessonTime.split(':').map(Number);
    const [endH, endM] = lesson.endLessonTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (currentTime >= startMin && currentTime < endMin) {
      const minutesLeft = endMin - currentTime;
      return {
        isGoingNow: true,
        message: `[ТЕКУЩАЯ ПАРА]\n${'─'.repeat(30)}\n\n${formatLessonFull(lesson)}\n\nОСТАЛОСЬ: ${minutesLeft}м`,
      };
    }
  }

  return {
    isGoingNow: false,
    message: `[НЕТ АКТИВНОЙ ПАРЫ]`,
  };
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
  const timeStr = lesson.startLessonTime && lesson.endLessonTime
    ? `${lesson.startLessonTime} — ${lesson.endLessonTime}`
    : '??:?? — ??:??';
  const subject = lesson.subject || 'НЕ УКАЗАНО';
  const type = getLessonTypeFull(lesson.lessonTypeAbbrev);
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `📚 Пара ${lesson.number} | ⏰ ${timeStr}\n`;
  text += `📖 ${subject}`;
  if (type) text += ` (${type})`;
  if (lesson.employee) text += `\n👤 ${lesson.employee.firstName} ${lesson.employee.lastName}`;
  if (auditoryInfo.room) {
    text += `\n📍 ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (🏢 ${auditoryInfo.building})`;
  }
  if (lesson.numSubgroup > 0) text += `\n👥 Подгруппа: ${lesson.numSubgroup}`;

  return text;
}

function formatLessonFull(lesson) {
  const timeStr = lesson.startLessonTime && lesson.endLessonTime
    ? `${lesson.startLessonTime} — ${lesson.endLessonTime}`
    : '??:?? — ??:??';
  const subject = lesson.subject || 'НЕ УКАЗАНО';
  const type = getLessonTypeFull(lesson.lessonTypeAbbrev);
  const teacher = lesson.employee
    ? `${lesson.employee.firstName} ${lesson.employee.lastName}`
    : 'НЕ УКАЗАНО';
  const auditoryInfo = parseAuditoryInfo(lesson.auditory);

  let text = `📚 Пара ${lesson.number} | ⏰ ${timeStr}\n`;
  text += `📖 ${subject}`;
  if (type) text += `\n📝 Тип: ${type}`;
  text += `\n👤 ${teacher}`;
  if (auditoryInfo.room) {
    text += `\n📍 ${auditoryInfo.room}`;
    if (auditoryInfo.building) text += ` (🏢 ${auditoryInfo.building})`;
  } else {
    text += `\n📍 Аудитория не указана`;
  }
  if (lesson.numSubgroup > 0) text += `\n👥 Подгруппа: ${lesson.numSubgroup}`;

  return text;
}

export function timeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

export { parseAuditoryInfo };
