import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set!');
  process.exit(1);
}

export async function connectDatabase() {
  await redis.ping();
  console.log('[DB] Redis connected');
}

export async function registerUser(chatId, groupNumber, subgroup = 0, language = 'ru', username = null) {
  const key = `user:${chatId}`;
  const exists = await redis.exists(key);
  const data = {
    chat_id: String(chatId),
    group_number: groupNumber,
    subgroup: subgroup,
    language: language,
    username: username,
    notifications_lesson_start: true,
    notifications_break_start: true,
    notifications_break_warning: true,
    notifications_lesson_warning: true,
  };
  await redis.hset(key, data);
  if (!exists) {
    await redis.sadd('users:all', String(chatId));
  }
}

export async function getUser(chatId) {
  const data = await redis.hgetall(`user:${chatId}`);
  if (!data || Object.keys(data).length === 0) return null;
  return {
    chat_id: data.chat_id,
    group_number: data.group_number,
    subgroup: parseInt(data.subgroup) || 0,
    language: data.language || 'ru',
    username: data.username || null,
  };
}

export async function isUserRegistered(chatId) {
  return await redis.exists(`user:${chatId}`);
}

export async function getUserCount() {
  return await redis.scard('users:all');
}

export async function getUsersList() {
  const chatIds = await redis.smembers('users:all');
  const users = [];
  for (const id of chatIds) {
    const data = await redis.hgetall(`user:${id}`);
    if (data && Object.keys(data).length > 0) {
      users.push({
        chat_id: data.chat_id,
        group_number: data.group_number,
        subgroup: parseInt(data.subgroup) || 0,
        language: data.language || 'ru',
        username: data.username || null,
        created_at: data.created_at || '',
      });
    }
  }
  return users;
}

export async function logNotification(chatId, type, pairNumber) {
  const today = new Date().toISOString().split('T')[0];
  const key = `notif:${chatId}:${type}:${pairNumber}:${today}`;
  await redis.set(key, '1', { ex: 86400 });
}

export async function wasNotificationSent(chatId, type, pairNumber, date) {
  const key = `notif:${chatId}:${type}:${pairNumber}:${date}`;
  return await redis.exists(key);
}

export async function getAllUsers() {
  const chatIds = await redis.smembers('users:all');
  const users = [];
  for (const id of chatIds) {
    const data = await redis.hgetall(`user:${id}`);
    if (data && Object.keys(data).length > 0) {
      const hasNotifs = data.notifications_lesson_start !== 'false';
      if (hasNotifs) {
        users.push({
          chat_id: data.chat_id,
          group_number: data.group_number,
          subgroup: parseInt(data.subgroup) || 0,
        });
      }
    }
  }
  return users;
}

export async function closeDatabase() {}
