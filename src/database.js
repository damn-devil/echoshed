import fs from 'fs';
import path from 'path';
import { DB_PATH, DEFAULT_NOTIFICATIONS } from './config.js';

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dataPath = DB_PATH.replace('.db', '.json');

function loadData() {
  try {
    const raw = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { users: {}, notificationLog: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

let data = loadData();

function persist() {
  saveData(data);
}

export function registerUser(chatId, groupNumber, subgroup = 0, language = 'ru') {
  const chatIdStr = String(chatId);
  const now = new Date().toISOString();

  if (data.users[chatIdStr]) {
    data.users[chatIdStr].group_number = groupNumber;
    data.users[chatIdStr].subgroup = subgroup;
    data.users[chatIdStr].language = language;
    data.users[chatIdStr].updated_at = now;
  } else {
    data.users[chatIdStr] = {
      chat_id: chatId,
      group_number: groupNumber,
      subgroup: subgroup,
      language: language,
      notifications_lesson_start: true,
      notifications_break_start: true,
      notifications_break_warning: true,
      notifications_lesson_warning: true,
      created_at: now,
      updated_at: now,
    };
  }
  persist();
}

export function getUser(chatId) {
  return data.users[String(chatId)] || null;
}

export function isUserRegistered(chatId) {
  return !!data.users[String(chatId)];
}

export function updateGroup(chatId, groupNumber, subgroup = 0) {
  const user = getUser(chatId);
  if (user) {
    user.group_number = groupNumber;
    user.subgroup = subgroup;
    user.updated_at = new Date().toISOString();
    persist();
  }
}

export function updateNotificationSetting(chatId, setting, value) {
  const user = getUser(chatId);
  if (user) {
    user[`notifications_${setting}`] = value;
    user.updated_at = new Date().toISOString();
    persist();
  }
}

export function getAllUsers() {
  return Object.values(data.users);
}

export function getUsersWithNotification(setting) {
  return Object.values(data.users).filter(u => u[`notifications_${setting}`]);
}

export function getNotificationSettings(chatId) {
  const user = getUser(chatId);
  if (!user) return DEFAULT_NOTIFICATIONS;
  return {
    lessonStart: !!user.notifications_lesson_start,
    breakStart: !!user.notifications_break_start,
    breakWarning: !!user.notifications_break_warning,
    lessonWarning: !!user.notifications_lesson_warning,
  };
}

export function logNotification(chatId, type, pairNumber = null) {
  data.notificationLog.push({
    chat_id: chatId,
    notification_type: type,
    pair_number: pairNumber,
    sent_at: new Date().toISOString(),
  });

  if (data.notificationLog.length > 10000) {
    data.notificationLog = data.notificationLog.slice(-5000);
  }

  persist();
}

export function wasNotificationSent(chatId, type, pairNumber, date) {
  const targetDate = new Date(date).toDateString();
  return data.notificationLog.some(log => {
    if (log.chat_id !== chatId || log.notification_type !== type || log.pair_number !== pairNumber) {
      return false;
    }
    return new Date(log.sent_at).toDateString() === targetDate;
  });
}

export function getUserCount() {
  return Object.keys(data.users).length;
}

export function getUsersList() {
  return Object.values(data.users).map(u => ({
    chat_id: u.chat_id,
    group_number: u.group_number,
    subgroup: u.subgroup || 0,
    language: u.language || 'ru',
    created_at: u.created_at,
  }));
}

export function closeDatabase() {
  persist();
}
