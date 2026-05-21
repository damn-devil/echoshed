import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGODB_URI is not set!');
  process.exit(1);
}

let db;
let usersCollection;
let logsCollection;

export async function connectDatabase() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db('bsuir_bot');
  usersCollection = db.collection('users');
  logsCollection = db.collection('notification_logs');
  
  await usersCollection.createIndex({ chat_id: 1 }, { unique: true });
  await logsCollection.createIndex({ chat_id: 1, notification_type: 1, sent_at: 1 });
  
  console.log('[DB] Connected to MongoDB');
}

export async function registerUser(chatId, groupNumber, subgroup = 0, language = 'ru', username = null) {
  const chatIdStr = String(chatId);
  const now = new Date().toISOString();

  await usersCollection.updateOne(
    { chat_id: chatIdStr },
    {
      $set: {
        group_number: groupNumber,
        subgroup: subgroup,
        language: language,
        updated_at: now,
        username: username,
      },
      $setOnInsert: {
        chat_id: chatIdStr,
        notifications_lesson_start: true,
        notifications_break_start: true,
        notifications_break_warning: true,
        notifications_lesson_warning: true,
        created_at: now,
      },
    },
    { upsert: true }
  );
}

export async function getUser(chatId) {
  return await usersCollection.findOne({ chat_id: String(chatId) });
}

export async function isUserRegistered(chatId) {
  const count = await usersCollection.countDocuments({ chat_id: String(chatId) });
  return count > 0;
}

export async function updateGroup(chatId, groupNumber, subgroup = 0) {
  await usersCollection.updateOne(
    { chat_id: String(chatId) },
    { $set: { group_number: groupNumber, subgroup: subgroup, updated_at: new Date().toISOString() } }
  );
}

export async function updateNotificationSetting(chatId, setting, value) {
  await usersCollection.updateOne(
    { chat_id: String(chatId) },
    { $set: { [`notifications_${setting}`]: value, updated_at: new Date().toISOString() } }
  );
}

export async function getAllUsers() {
  return await usersCollection.find({}).toArray();
}

export async function getUsersWithNotification(setting) {
  return await usersCollection.find({ [`notifications_${setting}`]: true }).toArray();
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
  await logsCollection.insertOne({
    chat_id: String(chatId),
    notification_type: type,
    pair_number: pairNumber,
    sent_at: new Date().toISOString(),
  });

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  await logsCollection.deleteMany({ sent_at: { $lt: weekAgo.toISOString() } });
}

export async function wasNotificationSent(chatId, type, pairNumber, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const count = await logsCollection.countDocuments({
    chat_id: String(chatId),
    notification_type: type,
    pair_number: pairNumber,
    sent_at: { $gte: startOfDay.toISOString(), $lte: endOfDay.toISOString() },
  });
  return count > 0;
}

export async function getUserCount() {
  return await usersCollection.countDocuments();
}

export async function getUsersList() {
  return await usersCollection.find({}, {
    projection: { chat_id: 1, group_number: 1, subgroup: 1, language: 1, created_at: 1, username: 1 }
  }).toArray();
}

export async function closeDatabase() {}
