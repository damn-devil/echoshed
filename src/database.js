import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function connectDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        chat_id TEXT PRIMARY KEY,
        group_number TEXT,
        subgroup INT DEFAULT 0,
        language TEXT DEFAULT 'ru',
        username TEXT,
        notifications_lesson_start BOOLEAN DEFAULT true,
        notifications_break_start BOOLEAN DEFAULT true,
        notifications_break_warning BOOLEAN DEFAULT true,
        notifications_lesson_warning BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id SERIAL PRIMARY KEY,
        chat_id TEXT,
        type TEXT,
        pair_number INT,
        date DATE,
        timestamp TIMESTAMP DEFAULT NOW(),
        UNIQUE(chat_id, type, pair_number, date)
      );
    `);
    console.log('[DB] Tables created/verified');
  } finally {
    client.release();
  }
  console.log('[DB] Supabase (PostgreSQL) connected');
}

export async function registerUser(chatId, groupNumber, subgroup = 0, language = 'ru', username = null) {
  const chatIdStr = String(chatId);
  await pool.query(
    `INSERT INTO users (chat_id, group_number, subgroup, language, username, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (chat_id) DO UPDATE SET
       group_number = EXCLUDED.group_number,
       subgroup = EXCLUDED.subgroup,
       language = EXCLUDED.language,
       username = EXCLUDED.username,
       updated_at = NOW()`,
    [chatIdStr, groupNumber, subgroup, language, username]
  );
}

export async function getUser(chatId) {
  const res = await pool.query('SELECT * FROM users WHERE chat_id = $1', [String(chatId)]);
  return res.rows[0] || null;
}

export async function isUserRegistered(chatId) {
  const res = await pool.query('SELECT 1 FROM users WHERE chat_id = $1', [String(chatId)]);
  return res.rows.length > 0;
}

export async function getUserCount() {
  const res = await pool.query('SELECT COUNT(*) FROM users');
  return parseInt(res.rows[0].count);
}

export async function getUsersList() {
  const res = await pool.query('SELECT chat_id, group_number, subgroup, language, created_at, username FROM users ORDER BY created_at DESC');
  return res.rows;
}

export async function logNotification(chatId, type, pairNumber) {
  const today = new Date().toISOString().split('T')[0];
  await pool.query(
    `INSERT INTO notification_logs (chat_id, type, pair_number, date, timestamp)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (chat_id, type, pair_number, date) DO UPDATE SET timestamp = NOW()`,
    [String(chatId), type, pairNumber, today]
  );
}

export async function wasNotificationSent(chatId, type, pairNumber, date) {
  const res = await pool.query(
    'SELECT 1 FROM notification_logs WHERE chat_id = $1 AND type = $2 AND pair_number = $3 AND date = $4',
    [String(chatId), type, pairNumber, date]
  );
  return res.rows.length > 0;
}

export async function getAllUsers() {
  const res = await pool.query(
    'SELECT chat_id, group_number, subgroup FROM users WHERE notifications_lesson_start IS NOT FALSE'
  );
  return res.rows;
}

export async function closeDatabase() {
  await pool.end();
}
