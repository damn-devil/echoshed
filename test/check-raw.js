import { createBsuirClient } from 'bsuir-iis-api';

const client = createBsuirClient({
  cache: { ttlMs: 1000, maxEntries: 1 },
  retries: 0,
  timeoutMs: 15000,
});

async function checkRaw(groupNumber) {
  console.log(`🔍 СЫРЫЕ ДАННЫЕ ДЛЯ ГРУППЫ: ${groupNumber}\n`);

  const raw = await client.schedule.getGroup(groupNumber, { raw: true });
  const todayKey = new Date().toLocaleString('en-US', { timeZone: 'Europe/Minsk', weekday: 'long' });
  
  // Map English weekday to Russian
  const dayMap = {
    'Monday': 'Понедельник', 'Tuesday': 'Вторник', 'Wednesday': 'Среда',
    'Thursday': 'Четверг', 'Friday': 'Пятница', 'Saturday': 'Суббота'
  };
  const ruDay = dayMap[todayKey] || todayKey;
  
  console.log(`📅 СЕГОДНЯ: ${ruDay}`);
  console.log(`📦 Дней в schedules: ${Object.keys(raw.schedules || {}).length}`);
  
  const todayLessons = raw.schedules?.[ruDay] || [];
  console.log(`📋 Занятий сегодня: ${todayLessons.length}\n`);

  for (const l of todayLessons) {
    console.log(`⏰ ${l.startLessonTime}-${l.endLessonTime} | ${l.subject || '❓'}`);
    console.log(`   📝 Тип: ${l.lessonTypeAbbrev || '—'}`);
    console.log(`   📍 ${l.auditories?.join(', ') || '—'}`);
    
    // Проверяем studentGroups
    if (l.studentGroups && l.studentGroups.length > 0) {
      const groupNames = l.studentGroups.map(g => g.name).join(', ');
      console.log(`   👥 Группы: ${groupNames}`);
    } else {
      console.log(`   👥 Группы: не указаны`);
    }
    console.log('');
  }
}

checkRaw('561404');
