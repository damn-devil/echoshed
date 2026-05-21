import { createBsuirClient } from 'bsuir-iis-api';
import { getMinskTime } from '../src/bsuir-api.js';

const groupNumber = '561404';

function getTomorrowDate() {
  const now = getMinskTime();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const year = tomorrow.getFullYear();
  return `${day}.${month}.${year}`;
}

const client = createBsuirClient({ timeoutMs: 10000 });
const exams = await client.schedule.getGroupExams(groupNumber);

console.log(`📅 ЭКЗАМЕНЫ ГРУППЫ ${groupNumber}\n`);
console.log(`📆 Завтра: ${getTomorrowDate()}\n`);

const tomorrowExams = exams.filter(exam => exam.dateLesson === getTomorrowDate());

if (tomorrowExams.length === 0) {
  console.log('❌ Завтра экзаменов нет');
} else {
  console.log(`✅ Найдено ${tomorrowExams.length} экзамен(ов) на завтра:\n`);
  for (const exam of tomorrowExams) {
    console.log(`${exam.lessonTypeAbbrev === 'Экз' ? '📝' : '💬'} ${exam.subject}`);
    console.log(`   ⏰ ${exam.startLessonTime}-${exam.endLessonTime}`);
    console.log(`   📍 ${exam.auditories?.[0] || '—'}`);
    console.log(`   👤 ${exam.employees?.[0]?.lastName || '—'}`);
    console.log();
  }
}

console.log('📋 ВСЕ ЭКЗАМЕНЫ:');
for (const exam of exams) {
  console.log(`${exam.dateLesson} | ${exam.lessonTypeAbbrev} | ${exam.subject} | ${exam.auditories?.[0]}`);
}
