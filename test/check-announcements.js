import { createBsuirClient } from 'bsuir-iis-api';

const client = createBsuirClient({
  cache: { ttlMs: 1000, maxEntries: 1 },
  retries: 0,
  timeoutMs: 15000,
});

async function checkAnnouncements(groupNumber) {
  const raw = await client.schedule.getGroup(groupNumber, { raw: true });
  
  console.log('📢 ПРОВЕРКА ANNOUNCEMENTS:\n');
  
  for (const [day, lessons] of Object.entries(raw.schedules || {})) {
    const withAnnouncement = lessons.filter(l => l.announcement);
    if (withAnnouncement.length > 0) {
      console.log(`📅 ${day}:`);
      for (const l of withAnnouncement) {
        console.log(`  ⏰ ${l.startLessonTime}-${l.endLessonTime} | ${l.subject || '❓'}`);
        console.log(`  📢 announcement: ${JSON.stringify(l.announcement)}`);
        console.log(`  📝 note: ${l.note || '—'}`);
        console.log('');
      }
    }
  }
}

checkAnnouncements('561404');
