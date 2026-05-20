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

    not_registered: `NOT REGISTERED
ACTION: SEND GROUP NUMBER`,

    send_group: `SEND GROUP NUMBER:`,
    send_new_group: `SEND NEW GROUP NUMBER:`,

    group_found: `[ПОДГРУППА]

GROUP FOUND: {group}
SELECT SUBGROUP:`,

    group_not_found: `[ОШИБКА ГРУППЫ]

ERROR: GROUP {group} NOT FOUND
ACTION: VERIFY NUMBER AND RETRY
FORMAT: XXXXXX (6 DIGITS)`,

    groups_found: `GROUPS FOUND:

SELECT YOUR GROUP:`,

    group_not_found_search: `GROUP NOT FOUND. SEND GROUP NUMBER OR TRY ANOTHER NAME.`,

    select_subgroup_1: `👥 [1] ПОДГРУППА 1`,
    select_subgroup_2: `👥 [2] ПОДГРУППА 2`,
    select_subgroup_0: `📋 [0] ОБЩАЯ`,

    done: `✅ DONE`,
    error_send_again: `ERROR: SEND GROUP NUMBER AGAIN`,
    error_group_not_found: `GROUP NOT FOUND`,

    notification_settings: `NOTIFICATION SETTINGS:`,

    lesson_start_on: `✅ [ON] НАЧАЛО ПАРЫ`,
    lesson_start_off: `❌ [OFF] НАЧАЛО ПАРЫ`,
    lesson_warning_on: `✅ [ON] ЗА 3 МИН ДО ПАРЫ`,
    lesson_warning_off: `❌ [OFF] ЗА 3 МИН ДО ПАРЫ`,
    break_start_on: `✅ [ON] НАЧАЛО ПЕРЕМЕНЫ`,
    break_start_off: `❌ [OFF] НАЧАЛО ПЕРЕМЕНЫ`,
    break_warning_on: `✅ [ON] ЗА 3 МИН ДО ПЕРЕМЕНЫ`,
    break_warning_off: `❌ [OFF] ЗА 3 МИН ДО ПЕРЕМЕНЫ`,

    enabled: `ENABLED`,
    disabled: `DISABLED`,

    lang_select: `SELECT LANGUAGE / ВЫБЕРИТЕ ЯЗЫК:`,
    lang_ru: `🇷🇺 [RU] Русский`,
    lang_en: `🇬🇧 [EN] English`,
    lang_changed: `LANGUAGE CHANGED TO RUSSIAN`,
    lang_changed_en: `LANGUAGE CHANGED TO ENGLISH`,

    fetch_failed: `FETCH FAILED
ERROR: {error}`,

    stats: `STATISTICS:
USERS: {count}`,

    users_list: `REGISTERED USERS ({count}):
{list}`,

    menu_today: `[TODAY]`,
    menu_tomorrow: `[TOMORROW]`,
    menu_week: `[WEEK]`,
    menu_next: `[NEXT]`,
    menu_now: `[NOW]`,
    menu_settings: `[SETTINGS]`,
    menu_group: `[GROUP]`,
    menu_lang: `[LANG]`,
    menu_help: `[HELP]`,

    today_schedule: `[TODAY SCHEDULE]`,
    today_schedule_sub: `[TODAY SCHEDULE] (SUBGROUP {subgroup})`,
    no_lessons_today: `[TODAY SCHEDULE]

NO LESSONS - REST DAY`,

    tomorrow_schedule: `[TOMORROW SCHEDULE]`,
    tomorrow_schedule_sub: `[TOMORROW SCHEDULE] (SUBGROUP {subgroup})`,
    no_lessons_tomorrow: `[TOMORROW SCHEDULE]

NO LESSONS - REST DAY`,

    week_schedule: `[WEEK SCHEDULE]`,
    week_schedule_sub: `[WEEK SCHEDULE] (SUBGROUP {subgroup})`,
    no_lessons_week: `[WEEK SCHEDULE]

NO LESSONS THIS WEEK`,

    next_lesson: `[NEXT LESSON]`,
    no_more_today: `[NO MORE LESSONS TODAY]`,
    first_tomorrow: `FIRST LESSON TOMORROW:`,
    no_lessons_today_tomorrow: `[NO LESSONS TODAY OR TOMORROW]`,

    current_lesson: `[CURRENT LESSON]`,
    no_active_lesson: `[NO ACTIVE LESSON]`,

    lesson: `LESSON`,
    subject: `SUBJECT`,
    type: `TYPE`,
    teacher: `TEACHER`,
    room: `ROOM`,
    bldg: `BLDG`,
    subgroup: `SUBGROUP`,
    time: `TIME`,
    start: `START`,
    in: `IN`,
    remaining: `REMAINING`,
    not_set: `NOT SET`,

    break_warning: `[BREAK WARNING]

CURRENT LESSON ENDING IN {min} MIN
BREAK DURATION: {duration} MIN
BREAK TIME: {start} - {end}`,

    break_started: `[BREAK STARTED]

BREAK DURATION: {duration} MIN
BREAK TIME: {start} - {end}`,

    next_lesson_label: `NEXT LESSON`,

    lesson_warning: `[LESSON WARNING]

LESSON {num} STARTS IN {min} MIN`,

    lesson_started: `[LESSON STARTED]

LESSON: {num}`,

    day_complete: `[DAY COMPLETE]

LAST LESSON ENDED: {subject}
STATUS: FREE`,

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

  en: {
    welcome: `$ BSUIR_BOT_SYSTEM v1.0
> INITIALIZING...
> TOKEN_CHECK: OK
> DATABASE_CONNECTION: ACTIVE
> API_ENDPOINT: bsuir-api.by
> POLLING: ENABLED
> BOT_STATUS: ONLINE
> WAITING_FOR_INPUT...
FEATURES:
├─ AUTO LESSON START NOTIFICATIONS
├─ AUTO BREAK NOTIFICATIONS
├─ 3 MINUTE WARNINGS
├─ ROOM AND BUILDING INFO
└─ AUTOMATIC SUBGROUP FILTERING
REQUEST: ENTER GROUP NUMBER TO REGISTER`,

    registered: `[AFTER REGISTRATION]

STATUS: REGISTERED
GROUP: {group}
SUBGROUP: {subgroup}
NOTIFICATIONS: ACTIVE
COMMANDS: READY`,

    help: `COMMANDS:
/start - REGISTRATION
/today - TODAY SCHEDULE
/tomorrow - TOMORROW SCHEDULE
/week - WEEK SCHEDULE
/next - NEXT LESSON
/now - CURRENT LESSON
/settings - NOTIFICATION SETTINGS
/group - CHANGE GROUP
/lang - LANGUAGE / ЯЗЫК
/schedule - LESSON TIMES
/users - STATISTICS (ADMIN)
/help - THIS MESSAGE`,

    schedule_times: `LESSON TIMES:
1: 08:30 - 10:05
2: 10:20 - 11:55
3: 12:30 - 14:05
4: 14:20 - 15:55
5: 16:10 - 17:45
6: 18:00 - 19:35
7: 19:50 - 21:25`,

    not_registered: `NOT REGISTERED
ACTION: SEND GROUP NUMBER`,

    send_group: `SEND GROUP NUMBER:`,
    send_new_group: `SEND NEW GROUP NUMBER:`,

    group_found: `[SUBGROUP]

GROUP FOUND: {group}
SELECT SUBGROUP:`,

    group_not_found: `[GROUP ERROR]

ERROR: GROUP {group} NOT FOUND
ACTION: VERIFY NUMBER AND RETRY
FORMAT: XXXXXX (6 DIGITS)`,

    groups_found: `GROUPS FOUND:

SELECT YOUR GROUP:`,

    group_not_found_search: `GROUP NOT FOUND. SEND GROUP NUMBER OR TRY ANOTHER NAME.`,

    select_subgroup_1: `👥 [1] SUBGROUP 1`,
    select_subgroup_2: `👥 [2] SUBGROUP 2`,
    select_subgroup_0: `📋 [0] GENERAL`,

    done: `✅ DONE`,
    error_send_again: `ERROR: SEND GROUP NUMBER AGAIN`,
    error_group_not_found: `GROUP NOT FOUND`,

    notification_settings: `NOTIFICATION SETTINGS:`,

    lesson_start_on: `✅ [ON] LESSON START`,
    lesson_start_off: `❌ [OFF] LESSON START`,
    lesson_warning_on: `✅ [ON] 3 MIN BEFORE LESSON`,
    lesson_warning_off: `❌ [OFF] 3 MIN BEFORE LESSON`,
    break_start_on: `✅ [ON] BREAK START`,
    break_start_off: `❌ [OFF] BREAK START`,
    break_warning_on: `✅ [ON] 3 MIN BEFORE BREAK`,
    break_warning_off: `❌ [OFF] 3 MIN BEFORE BREAK`,

    enabled: `ENABLED`,
    disabled: `DISABLED`,

    lang_select: `SELECT LANGUAGE / ВЫБЕРИТЕ ЯЗЫК:`,
    lang_ru: `🇷🇺 [RU] Русский`,
    lang_en: `🇬🇧 [EN] English`,
    lang_changed: `LANGUAGE CHANGED TO RUSSIAN`,
    lang_changed_en: `LANGUAGE CHANGED TO ENGLISH`,

    fetch_failed: `FETCH FAILED
ERROR: {error}`,

    stats: `STATISTICS:
USERS: {count}`,

    users_list: `REGISTERED USERS ({count}):
{list}`,

    menu_today: `[TODAY]`,
    menu_tomorrow: `[TOMORROW]`,
    menu_week: `[WEEK]`,
    menu_next: `[NEXT]`,
    menu_now: `[NOW]`,
    menu_settings: `[SETTINGS]`,
    menu_group: `[GROUP]`,
    menu_lang: `[LANG]`,
    menu_help: `[HELP]`,

    today_schedule: `[TODAY SCHEDULE]`,
    today_schedule_sub: `[TODAY SCHEDULE] (SUBGROUP {subgroup})`,
    no_lessons_today: `[TODAY SCHEDULE]

NO LESSONS - REST DAY`,

    tomorrow_schedule: `[TOMORROW SCHEDULE]`,
    tomorrow_schedule_sub: `[TOMORROW SCHEDULE] (SUBGROUP {subgroup})`,
    no_lessons_tomorrow: `[TOMORROW SCHEDULE]

NO LESSONS - REST DAY`,

    week_schedule: `[WEEK SCHEDULE]`,
    week_schedule_sub: `[WEEK SCHEDULE] (SUBGROUP {subgroup})`,
    no_lessons_week: `[WEEK SCHEDULE]

NO LESSONS THIS WEEK`,

    next_lesson: `[NEXT LESSON]`,
    no_more_today: `[NO MORE LESSONS TODAY]`,
    first_tomorrow: `FIRST LESSON TOMORROW:`,
    no_lessons_today_tomorrow: `[NO LESSONS TODAY OR TOMORROW]`,

    current_lesson: `[CURRENT LESSON]`,
    no_active_lesson: `[NO ACTIVE LESSON]`,

    lesson: `LESSON`,
    subject: `SUBJECT`,
    type: `TYPE`,
    teacher: `TEACHER`,
    room: `ROOM`,
    bldg: `BLDG`,
    subgroup: `SUBGROUP`,
    time: `TIME`,
    start: `START`,
    in: `IN`,
    remaining: `REMAINING`,
    not_set: `NOT SET`,

    break_warning: `[BREAK WARNING]

CURRENT LESSON ENDING IN {min} MIN
BREAK DURATION: {duration} MIN
BREAK TIME: {start} - {end}`,

    break_started: `[BREAK STARTED]

BREAK DURATION: {duration} MIN
BREAK TIME: {start} - {end}`,

    next_lesson_label: `NEXT LESSON`,

    lesson_warning: `[LESSON WARNING]

LESSON {num} STARTS IN {min} MIN`,

    lesson_started: `[LESSON STARTED]

LESSON: {num}`,

    day_complete: `[DAY COMPLETE]

LAST LESSON ENDED: {subject}
STATUS: FREE`,

    monday: `Monday`,
    tuesday: `Tuesday`,
    wednesday: `Wednesday`,
    thursday: `Thursday`,
    friday: `Friday`,
    saturday: `Saturday`,

    lecture: `Lecture`,
    lab: `Laboratory`,
    practice: `Practice`,
    course_project: `Course Project`,
    test: `Test`,
    pass: `Pass`,
    exam: `Exam`,
    home_test: `Home Test`,
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
