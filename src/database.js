import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = join(__dirname, '..', 'data', 'bot.json');

function ensureDataFile() {
  if (!existsSync(DATA_FILE)) {
    writeFileSync(DATA_FILE, JSON.stringify({ users: {}, notificationLog: [] }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  return JSON.parse(readFileSync(DATA_FILE, 'utf-8'));
}

function writeData(data) {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function connectDatabase() {
  ensureDataFile();
  console.log('[DB] Local file storage ready');
}

export async function registerUser(chatId, groupNumber, subgroup = 0, language = 'ru', username = null) {
  const data = readData();
  const chatIdStr = String(chatId);
  const now = new Date().toISOString();
  const exists = data.users[chatIdStr];

  data.users[chatIdStr] = {
    chat_id: chatIdStr,
    group_number: groupNumber,
    subgroup: subgroup,
    language: language,
    username: username,
    notifications_lesson_start: true,
    notifications_break_start: true,
    notifications_break_warning: true,
    notifications_lesson_warning: true,
    created_at: exists ? data.users[chatIdStr].created_at : now,
    updated_at: now,
  };

  writeData(data);
}

export async function getUser(chatId) {
  const data = readData();
  return data.users[String(chatId)] || null;
}

export async function isUserRegistered(chatId) {
  const data = readData();
  return !!data.users[String(chatId)];
}

export async function getUserCount() {
  const data = readData();
  return Object.keys(data.users).length;
}

export async function getUsersList() {
  const data = readData();
  return Object.values(data.users).map(u => ({
    chat_id: u.chat_id,
    group_number: u.group_number,
    subgroup: u.subgroup || 0,
    language: u.language || 'ru',
    username: u.username || null,
    created_at: u.created_at || '',
  }));
}

export async function logNotification(chatId, type, pairNumber) {
  const data = readData();
  data.notificationLog.push({
    chat_id: String(chatId),
    type,
    pair_number: pairNumber,
    timestamp: new Date().toISOString(),
  });
  // Оставляем только последние 1000 записей
  if (data.notificationLog.length > 1000) {
    data.notificationLog = data.notificationLog.slice(-1000);
  }
  writeData(data);
}

export async function wasNotificationSent(chatId, type, pairNumber, date) {
  const data = readData();
  return data.notificationLog.some(
    log => log.chat_id === String(chatId) &&
           log.type === type &&
           log.pair_number === pairNumber &&
           log.timestamp.startsWith(date)
  );
}

export async function getAllUsers() {
  const data = readData();
  return Object.values(data.users)
    .filter(u => u.notifications_lesson_start !== false)
    .map(u => ({
      chat_id: u.chat_id,
      group_number: u.group_number,
      subgroup: u.subgroup || 0,
    }));
}

export async function closeDatabase() {}
