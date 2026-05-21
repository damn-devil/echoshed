import { createBsuirClient } from 'bsuir-iis-api';

const client = createBsuirClient({
  cache: { ttlMs: 1000, maxEntries: 1 },
  retries: 0,
  timeoutMs: 15000,
});

async function checkDetails(groupNumber) {
  const raw = await client.schedule.getGroup(groupNumber, { raw: true });
  const todayLessons = raw.schedules?.['Четверг'] || [];

  console.log('🔍 ДЕТАЛИ ВСЕХ ЗАНЯТИЙ НА СЕГОДНЯ:\n');

  for (const l of todayLessons) {
    console.log(`⏰ ${l.startLessonTime}-${l.endLessonTime} | ${l.subject || '❓ БЕЗ НАЗВАНИЯ'}`);
    console.log(`   📝 Тип: ${l.lessonTypeAbbrev || '—'}`);
    console.log(`   📍 ${l.auditories?.join(', ') || '—'}`);
    console.log(`   👤 ${l.employees?.map(e => `${e.firstName} ${e.lastName}`).join(', ') || '—'}`);
    console.log(`   📝 Note: ${l.note || '—'}`);
    console.log(`   📢 Announcement: ${l.announcement || '—'}`);
    console.log(`   🔗 Split: ${l.split || '—'}`);
    console.log('');
  }
}

checkDetails('561404');
