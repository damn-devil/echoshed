export const LESSON_TIMES = [
  { pair: 1, start: '08:30', end: '10:05' },
  { pair: 2, start: '10:20', end: '11:55' },
  { pair: 3, start: '12:30', end: '14:05' },
  { pair: 4, start: '14:20', end: '15:55' },
  { pair: 5, start: '16:10', end: '17:45' },
  { pair: 6, start: '18:00', end: '19:35' },
  { pair: 7, start: '19:50', end: '21:25' },
];

export const BREAK_TIMES = [
  { after: 1, start: '10:05', end: '10:20', duration: 15 },
  { after: 2, start: '11:55', end: '12:30', duration: 35 },
  { after: 3, start: '14:05', end: '14:20', duration: 15 },
  { after: 4, start: '15:55', end: '16:10', duration: 15 },
  { after: 5, start: '17:45', end: '18:00', duration: 15 },
  { after: 6, start: '19:35', end: '19:50', duration: 15 },
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
