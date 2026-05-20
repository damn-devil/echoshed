import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export async function connectDatabase() {
  try {
    await redis.set("_test_connection", "ok", { ex: 5 });
    const test = await redis.get("_test_connection");
    if (test === "ok") {
      console.log('[DB] ✅ Connected to Upstash Redis');
      return true;
    }
    console.error('[DB] ❌ Connection test failed');
    return false;
  } catch (e) {
    console.error('[DB] ❌ Redis connection error:', e.message);
    console.error('[DB] Check UPSTASH_REDIS_REST_URL and TOKEN env vars');
    return false;
  }
}

export async function registerUser(chatId, groupNumber, subgroup = 0, language = 'ru') {
  try {
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
    
    console.log(`[DB] ✅ User ${chatIdStr} registered with group ${groupNumber}`);
    return true;
  } catch (error) {
    console.error('[DB] ❌ registerUser error:', error);
    return false;
  }
}

export async function getUser(chatId) {
  try {
    const data = await redis.get(`user:${String(chatId)}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[DB] ❌ getUser error:', error);
    return null;
  }
}

export async function isUserRegistered(chatId) {
  try {
    return (await redis.exists(`user:${String(chatId)}`)) === 1;
  } catch {
    return false;
  }
}

export async function updateGroup(chatId, groupNumber, subgroup = 0) {
  const user = await getUser(chatId);
  if (user) {
    user.group_number = groupNumber;
    user.subgroup = subgroup;
    user.updated_at = new Date().toISOString();
    await redis.set(`user:${String(chatId)}`, JSON.stringify(user));
    console.log(`[DB] ✅ User ${chatId} updated to group ${groupNumber}`);
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
  try {
    const userIds = await redis.smembers("all_users");
    const users = [];
    for (const id of userIds) {
      const u = await getUser(id);
      if (u) users.push(u);
    }
    console.log(`[DB] 📊 Total users in DB: ${users.length}`);
    return users;
  } catch (error) {
    console.error('[DB] ❌ getAllUsers error:', error);
    return [];
  }
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
  const key = `notif:${chatId}:${type}:${pairNumber || 'none'}:${today}`;
  await redis.set(key, "1", { ex: 86400 });
}

export async function wasNotificationSent(chatId, type, pairNumber, date) {
  const key = `notif:${chatId}:${type}:${pairNumber}:${date}`;
  return (await redis.exists(key)) === 1;
}

export async function getUserCount() {
  try {
    return await redis.scard("all_users");
  } catch {
    return 0;
  }
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

export async function closeDatabase() {
  console.log('[DB] Connection closed');
}