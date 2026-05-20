import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function connectDatabase() {
  try {
    await redis.ping();
    console.log('[DB] Connected to Upstash Redis');
  } catch (e) {
    console.error('[DB] Redis connection error:', e.message);
  }
}

export async function registerUser(chatId, groupNumber, subgroup = 0, language = 'ru') {
  const chatIdStr = String(chatId);
  const now = new Date().toISOString();
  
  const existing = await getUser(chatIdStr);
  const created_at = existing ? existing.created_at : now;

  const user = {
    chat_id: chatIdStr,
    group_number: groupNumber,
    subgroup: subgroup,
    language: language,
    notifications_lesson_start: true,
    notifications_break_start: true,
    notifications_break_warning: true,
    notifications_lesson_warning: true,
    created_at: created_at,
    updated_at: now,
  };

  await redis.set(`user:${chatIdStr}`, JSON.stringify(user));
  await redis.sadd("all_users", chatIdStr);
}

export async function getUser(chatId) {
  const data = await redis.get(`user:${String(chatId)}`);
  return data ? JSON.parse(data) : null;
}

export async function isUserRegistered(chatId) {
  return (await redis.exists(`user:${String(chatId)}`)) === 1;
}

export async function updateGroup(chatId, groupNumber, subgroup = 0) {
  const user = await getUser(chatId);
  if (user) {
    user.group_number = groupNumber;
    user.subgroup = subgroup;
    user.updated_at = new Date().toISOString();
    await redis.set(`user:${String(chatId)}`, JSON.stringify(user));
  }
}

export async function updateNotificationSetting(chatId, setting, value) {
  const user = await getUser(chatId);
  if (user) {
    user[`notifications_${setting}`] = value;
    user.updated_at = new Date().toISOString();
    await redis.set(`user:${String(chatId)}`, JSON.stringify(user));
  }
}

export async function getAllUsers() {
  const userIds = await redis.smembers("all_users");
  const users = [];
  for (const id of userIds) {
    const u = await getUser(id);
    if (u) users.push(u);
  }
  return users;
}

export async function getUsersWithNotification(setting) {
  const users = await getAllUsers();
  return users.filter(u => u[`notifications_${setting}`]);
}

export async function getNotificationSettings(chatId) {
  const user = await getUser(chatId);
  if (!user) return { lessonStart: true, breakStart: true, breakWarning: true, lessonWarning: true };
  return {
    lessonStart: !!user.notifications_lesson_start,
    breakStart: !!user.notifications_break_start,
    breakWarning: !!user.notifications_break_warning,
    lessonWarning: !!user.notifications_lesson_warning,
  };
}

export async function logNotification(chatId, type, pairNumber = null) {
  const today = new Date().toISOString().split('T')[0];
  const key = `notif:${chatId}:${type}:${pairNumber}:${today}`;
  await redis.set(key, "1", { ex: 86400 });
}

export async function wasNotificationSent(chatId, type, pairNumber, date) {
  const key = `notif:${chatId}:${type}:${pairNumber}:${date}`;
  return (await redis.exists(key)) === 1;
}

export async function getUserCount() {
  return await redis.scard("all_users");
}

export async function getUsersList() {
  const users = await getAllUsers();
  return users.map(u => ({
    chat_id: u.chat_id,
    group_number: u.group_number,
    subgroup: u.subgroup || 0,
    language: u.language || 'ru',
    created_at: u.created_at,
  }));
}

export async function closeDatabase() {}
