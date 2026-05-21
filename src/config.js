export const LESSON_TIMES = [
  { pair: 1, start: '08:30', end: '09:55' },
  { pair: 2, start: '10:05', end: '11:30' },
  { pair: 3, start: '12:00', end: '13:25' },
  { pair: 4, start: '13:35', end: '15:00' },
  { pair: 5, start: '15:10', end: '16:35' },
  { pair: 6, start: '16:45', end: '18:10' },
  { pair: 7, start: '18:20', end: '19:45' },
];

export const BREAK_TIMES = [
  { after: 1, start: '09:55', end: '10:05', duration: 10 },
  { after: 2, start: '11:30', end: '12:00', duration: 30 },
  { after: 3, start: '13:25', end: '13:35', duration: 10 },
  { after: 4, start: '15:00', end: '15:10', duration: 10 },
  { after: 5, start: '16:35', end: '16:45', duration: 10 },
  { after: 6, start: '18:10', end: '18:20', duration: 10 },
];

export const WEEKDAYS_RU = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

export const LESSON_TYPES = {
  'Лек': 'Лекция',
  'Лаб': 'Лабораторная',
  'Пр': 'Практическая',
  'КП': 'Курсовой проект',
  'КР': 'Контрольная работа',
  'Зач': 'Зачёт',
  'Экз': 'Экзамен',
  'ДКР': 'Домашняя контрольная работа',
};

export const DEFAULT_NOTIFICATIONS = {
  lessonStart: true,
  breakStart: true,
  breakWarning: true,
  lessonWarning: true,
};

export const SUBGROUP_OPTIONS = {
  0: 'Общая (без подгрупп)',
  1: 'Подгруппа 1',
  2: 'Подгруппа 2',
};

export const DB_PATH = process.env.DB_PATH || './data/bot.json';
