import { createBsuirClient } from 'bsuir-iis-api';

const client = createBsuirClient({
  cache: { ttlMs: 1000, maxEntries: 1 },
  retries: 0,
  timeoutMs: 15000,
});

const WEEKDAY_MAP = {
  1: 'Понедельник',
  2: 'Вторник',
  3: 'Среда',
  4: 'Четверг',
  5: 'Пятница',
  6: 'Суббота',
};

function getTodayWeekdayKey() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const minsk = new Date(utc + (3 * 3600000));
  return WEEKDAY_MAP[minsk.getDay()] || null;
}

async function checkGroup(groupNumber) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`🔍 ПРОВЕРКА ГРУППЫ: ${groupNumber}`);
  console.log(`${'═'.repeat(50)}\n`);

  try {
    const schedule = await client.schedule.getGroup(groupNumber);
    const todayKey = getTodayWeekdayKey();
    
    console.log(`📅 СЕГОДНЯ: ${todayKey}\n`);
    
    const todayLessons = schedule.lessonsByDay?.[todayKey] || [];
    
    console.log(`📋 ВСЕ ЗАНЯТИЯ НА СЕГОДНЯ (${todayLessons.length}):`);
    console.log('─'.repeat(50));
    
    for (const l of todayLessons) {
      const sg = l.numSubgroup ? `👥 п/г ${l.numSubgroup}` : '👥 общая';
      const type = l.lessonTypeAbbrev || '—';
      const subject = l.subject || '❓ БЕЗ НАЗВАНИЯ';
      
      console.log(`⏰ ${l.startLessonTime}-${l.endLessonTime} | ${subject}`);
      console.log(`   📝 Тип: ${type} | ${sg}`);
      if (l.auditories?.length) console.log(`   📍 ${l.auditories.join(', ')}`);
      if (l.employees?.length) console.log(`   👤 ${l.employees.map(e => `${e.firstName} ${e.lastName}`).join(', ')}`);
      console.log('');
    }

    console.log(`\n🎓 ЭКЗАМЕНЫ И КОНСУЛЬТАЦИИ (${(schedule.exams || []).length}):`);
    console.log('─'.repeat(50));
    for (const e of schedule.exams || []) {
      console.log(`📝 ${e.subject} | ${e.lessonTypeAbbrev || 'экзамен'}`);
      if (e.startLessonTime) console.log(`   ⏰ ${e.startLessonTime}`);
      if (e.auditories?.length) console.log(`   📍 ${e.auditories.join(', ')}`);
      console.log('');
    }

  } catch (error) {
    console.error(`❌ Ошибка: ${error.message}`);
  }
}

const groups = process.argv.slice(2);
if (groups.length === 0) {
  console.log('Использование: node test/check-schedule.js <номер_группы>');
  process.exit(0);
}

for (const group of groups) {
  await checkGroup(group);
}
