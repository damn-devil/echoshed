import { createBsuirClient } from 'bsuir-iis-api';
import { getTodayLessonsSorted, getCurrentWeek } from '../src/bsuir-api.js';

const groupNumber = '561404';

console.log('📅 ПРОВЕРКА НЕДЕЛЬ С API getCurrentWeek()\n');

const currentWeek = await getCurrentWeek();
console.log(`🔢 Текущая неделя из API: ${currentWeek}\n`);

const lessons = await getTodayLessonsSorted(groupNumber);

console.log(`📋 ЗАНЯТИЯ НА СЕГОДНЯ (неделя ${currentWeek}):\n`);

for (const lesson of lessons) {
  const weeks = lesson.weekNumber || 'все';
  const matches = lesson.weekNumber ? lesson.weekNumber.includes(currentWeek) : true;
  const status = matches ? '✅' : '❌';
  
  console.log(`${status} ${lesson.startLessonTime}-${lesson.endLessonTime} | ${lesson.subject}`);
  console.log(`   Недели: ${weeks} | ${matches ? 'показываем' : 'скрываем'}`);
  if (lesson.note) console.log(`   📝 ${lesson.note}`);
  console.log();
}
