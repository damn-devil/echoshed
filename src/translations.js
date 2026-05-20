const translations = {
  ru: {
    welcome: `$ BSUIR_BOT_SYSTEM v1.0
> INITIALIZING...
> TOKEN_CHECK: OK
> DATABASE_CONNECTION: ACTIVE
> API_ENDPOINT: bsuir-api.by
> POLLING: ENABLED
> BOT_STATUS: ONLINE
> WAITING_FOR_INPUT...
ФУНКЦИОНАЛ:
├─ АВТО-УВЕДОМЛЕНИЯ О НАЧАЛЕ ПАР
├─ АВТО-УВЕДОМЛЕНИЯ О ПЕРЕМЕНАХ
├─ ПРЕДУПРЕЖДЕНИЕ ЗА 3 МИНУТЫ
├─ УКАЗАНИЕ АУДИТОРИИ И КОРПУСА
└─ АВТОМАТИЧЕСКАЯ ФИЛЬТРАЦИЯ ПОДГРУПП 
ЗАПРОС: ВВЕДИТЕ НОМЕР ГРУППЫ ДЛЯ РЕГИСТРАЦИИ`,

    registered: `[ПОСЛЕ РЕГИСТРАЦИИ]

STATUS: REGISTERED
GROUP: {group}
SUBGROUP: {subgroup}
NOTIFICATIONS: ACTIVE
COMMANDS: READY`,

    help: `COMMANDS:
/start - РЕГИСТРАЦИЯ
/today - РАСПИСАНИЕ НА СЕГОДНЯ
/tomorrow - РАСПИСАНИЕ НА ЗАВТРА
/week - РАСПИСАНИЕ НА НЕДЕЛЮ
/next - СЛЕДУЮЩАЯ ПАРА
/now - ТЕКУЩАЯ ПАРА
/settings - НАСТРОЙКИ УВЕДОМЛЕНИЙ
/group - СМЕНИТЬ ГРУППУ
/lang - ЯЗЫК / LANGUAGE
/schedule - ВРЕМЯ ПАР
/users - СТАТИСТИКА (АДМИН)
/help - ЭТА СПРАВКА`,

    schedule_times: `LESSON TIMES:
1: 08:30 - 10:05
2: 10:20 - 11:55
3: 12:30 - 14:05
4: 14:20 - 15:55
5: 16:10 - 17:45
6: 18:00 - 19:35
7: 19:50 - 21:25`,

    not_registered: `НЕ ЗАРЕГИСТРИРОВАН
ДЕЙСТВИЕ: ОТПРАВЬТЕ НОМЕР ГРУППЫ`,

    send_group: `ОТПРАВЬТЕ НОМЕР ГРУППЫ:`,
    send_new_group: `ОТПРАВЬТЕ НОВЫЙ НОМЕР ГРУППЫ:`,


    group_found: `[ПОДГРУППА]

ГРУППА НАЙДЕНА: {group}
ВЫБЕРИТЕ ПОДГРУППУ:`,


    group_not_found: `[ОШИБКА ГРУППЫ]

ОШИБКА: ГРУППА {group} НЕ НАЙДЕНА
ДЕЙСТВИЕ: ПРОВЕРЬТЕ НОМЕР И ПОВТОРИТЕ ПОПЫТКУ
ФОРМАТ: XXXXXX (6 ЦИФР)`,

    groups_found: `НАЙДЕНЫ ГРУППЫ:

ВЫБЕРИТЕ СВОЮ ГРУППУ:`,


    group_not_found_search: `ГРУППА НЕ НАЙДЕНА. ОТПРАВЬТЕ НОМЕР ГРУППЫ ИЛИ ПОПРОБУЙТЕ ДРУГОЕ НАЗВАНИЕ.`,


    select_subgroup_1: `👥 Подгруппа 1`,
    select_subgroup_2: `👥 Подгруппа 2`,
    select_subgroup_0: `📋 Общая (все потоки)`,

    done: `✅ Готово`,
    error_send_again: `❌ Ошибка: отправь номер группы заново`,
    error_group_not_found: `❌ Группа не найдена`,


    notification_settings: `⚙️ Настройки уведомлений:`,


    lesson_start_on: `✅ Начало пары`,
    lesson_start_off: `⬜ Начало пары`,
    lesson_warning_on: `✅ Предупреждение за 3 мин`,
    lesson_warning_off: `⬜ Предупреждение за 3 мин`,
    break_start_on: `✅ Начало перемены`,
    break_start_off: `⬜ Начало перемены`,
    break_warning_on: `✅ Предупреждение о перемене`,
    break_warning_off: `⬜ Предупреждение о перемене`,


    enabled: `ВКЛЮЧЕНО`,
    disabled: `ОТКЛЮЧЕНО`,


    lang_select: `ВЫБЕРИТЕ ЯЗЫК:`,
    lang_ru: `🇷🇺 Русский`,
    lang_changed: `ЯЗЫК ИЗМЕНЕН НА РУССКИЙ`,


    fetch_failed: `ОШИБКА ЗАПРОСА
ОШИБКА: {error}`,


    stats: `СТАТИСТИКА:
ПОЛЬЗОВАТЕЛИ: {count}`,


    users_list: `ЗАРЕГИСТРИРОВАННЫЕ ПОЛЬЗОВАТЕЛИ ({count}):
{list}`,


    menu_today: `[SEGODNIA]`,
    menu_tomorrow: `[ZAVTRA]`,
    menu_week: `[NEDSELIA]`,
    menu_next: `[SLEDUЩAЯ]`,
    menu_now: `[TEKUЩAЯ]`,
    menu_settings: `[NASTROЙKI]`,
    menu_group: `[SMENITЬ GRUPPU]`,
    menu_lang: `[YAЗЫK]`,
    menu_help: `[POMOSHЩ]`,


    today_schedule: `[RASPISАНИЕ SEGODNIA]`,
    today_schedule_sub: `[RASPISАНИЕ SEGODNIA] (PODGRUPPA {subgroup})`,
    no_lessons_today: `[RASPISАНИЕ SEGODNIA]

NET PAR - VKHODNOЙ DEN`,


    tomorrow_schedule: `[RASPISАНИЕ ZAVTRA]`,
    tomorrow_schedule_sub: `[RASPISАНИЕ ZAVTRA] (PODGRUPPA {subgroup})`,
    no_lessons_tomorrow: `[RASPISАНИЕ ZAVTRA]

NET PAR - VKHODNOЙ DEN`,


    week_schedule: `[RASPISАНИЕ НА NEDSELIA]`,
    week_schedule_sub: `[RASPISАНИЕ НА NEDSELIA] (PODGRUPPA {subgroup})`,
    no_lessons_week: `[RASPISАНИЕ НА NEDSELIA]

NET PAR ÉТОЙ NEDSELII`,


    next_lesson: `[SLEDUЩAЯ PARA]`,
    no_more_today: `[BOLЩE NET PAR SEGODNIA]`,
    first_tomorrow: `PЕРВАЯ PARA ZAVTRA:`,
    no_lessons_today_tomorrow: `[NET PAR NI SEGODNIA NI ZAVTRA]`,


    current_lesson: `[TEKUЩAЯ PARA]`,
    no_active_lesson: `[NET AKTIVNOЙ PARI]`,


    lesson: `PARA`,
    subject: `PREDMET`,
    type: `TIP`,
    teacher: `PREPODAVATELЬ`,
    room: `AUDITORИЯ`,
    bldg: `KORPUS`,
    subgroup: `PODGRUPPA`,
    time: `VREMYA`,
    start: `NACHALO`,
    in: `ЧЕРЕЗ`,
    remaining: `OSTALOSЬ`,
    not_set: `NET USTАНОВLENO`,


    break_warning: `[PREDUпрежDENIE O ПЕРЕМЕНЕ]

TEKUЩAЯ PARA OKONЧAЕТСЯ ЧЕРЕЗ {min} MIN
TRITELЬNOSTЬ PEREMENY: {duration} MIN
PEREMENЯ: {start} - {end}`,


    break_started: `[PEREMENЯ НАCHAЛAСЬ]

TRITELЬNOSTЬ PEREMENY: {duration} MIN
PEREMENЯ: {start} - {end}`,


    next_lesson_label: `SLEDUЩAЯ PARA`,


    lesson_warning: `[PREDUпрежDENIE O PARЕ]

PARA {num} NACHAETСЯ ЧЕРЕЗ {min} MIN`,


    lesson_started: `[PARA NACHAЛАСЬ]

PARA: {num}`,


    day_complete: `[DEN ZAKONЧEN]

POSLEDNЯЯ PARA OKONЧAЛASʹ: {subject}
STATUS: SVOBODEN`,


    monday: `Понедельник`,
    tuesday: `Вторник`,
    wednesday: `Среда`,
    thursday: `Четверг`,
    friday: `Пятница`,
    saturday: `Суббота`,


    lecture: `Лекция`,
    lab: `Лабораторная`,
    practice: `Практическая`,
    course_project: `Курсовой проект`,
    test: `Контрольная работа`,
    pass: `Зачёт`,
    exam: `Экзамен`,
    home_test: `Домашняя контрольная работа`,
  },
};

export function t(key, lang = 'ru', params = {}) {
  let text = translations[lang]?.[key] || translations.ru[key] || key;
  for (const [k, v] of Object.entries(params)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

export function getMainMenuKeyboard(lang = 'ru') {
  return {
    keyboard: [
      [
        { text: t('menu_today', lang) },
        { text: t('menu_tomorrow', lang) },
        { text: t('menu_week', lang) },
      ],
      [
        { text: t('menu_next', lang) },
        { text: t('menu_now', lang) },
      ],
      [
        { text: t('menu_settings', lang) },
        { text: t('menu_group', lang) },
        { text: t('menu_lang', lang) },
      ],
      [
        { text: t('menu_help', lang) },
      ],
    ],
    resize_keyboard: true,
  };
}

export const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const LESSON_TYPE_KEYS = {
  'Лек': 'lecture',
  'Лаб': 'lab',
  'Пр': 'practice',
  'КП': 'course_project',
  'КР': 'test',
  'Зач': 'pass',
  'Экз': 'exam',
  'ДКР': 'home_test',
};
