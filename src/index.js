import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { connectDatabase, registerUser, getUser, getUserCount, getAllUsers } from './database.js';

dotenv.config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

console.log('=== BOT STARTUP ===');
console.log('Node version:', process.version);
console.log('TELEGRAM_BOT_TOKEN:', TOKEN ? '✅ SET' : '❌ MISSING');
console.log('UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ SET' : '❌ MISSING');
console.log('==================');

// Подключение к БД
await connectDatabase();

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`[CMD] /start from ${chatId}`);
  
  // Проверяем, зарегистрирован ли пользователь
  const existing = await getUser(chatId);
  
  if (existing) {
    await bot.sendMessage(chatId, `👋 С возвращением! Ваша группа: ${existing.group_number}`);
  } else {
    await bot.sendMessage(chatId, 'Добро пожаловать! Введите номер вашей группы (например, 123456):');
    // Сохраняем состояние ожидания ввода группы
    userStates.set(chatId, 'awaiting_group');
  }
});

// Обработка текстовых сообщений (для ввода группы)
const userStates = new Map();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  if (text && text.startsWith('/')) return; // Игнорируем команды
  
  const state = userStates.get(chatId);
  
  if (state === 'awaiting_group' && /^\d{6}$/.test(text)) {
    // Сохраняем группу
    const success = await registerUser(chatId, text, 0, 'ru');
    if (success) {
      await bot.sendMessage(chatId, `✅ Группа ${text} сохранена! Уведомления будут приходить за 5 минут до пар.`);
      userStates.delete(chatId);
      
      // Проверяем количество пользователей
      const count = await getUserCount();
      console.log(`📊 Total users after registration: ${count}`);
    } else {
      await bot.sendMessage(chatId, '❌ Ошибка сохранения. Попробуйте позже.');
    }
  } else if (state === 'awaiting_group') {
    await bot.sendMessage(chatId, '❌ Пожалуйста, введите номер группы в формате 123456 (6 цифр)');
  }
});

// Команда /status (для проверки)
bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const user = await getUser(chatId);
  const total = await getUserCount();
  
  if (user) {
    await bot.sendMessage(chatId, `📊 Статус:\n- Группа: ${user.group_number}\n- Подгруппа: ${user.subgroup}\n- Всего пользователей в боте: ${total}`);
  } else {
    await bot.sendMessage(chatId, '❌ Вы не зарегистрированы. Используйте /start');
  }
});

// Планировщик (проверка каждую минуту)
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const minskTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Minsk' }));
  const minutes = minskTime.getHours() * 60 + minskTime.getMinutes();
  const date = minskTime.toISOString().split('T')[0];
  
  console.log(`[SCHEDULER] Minsk time: ${minskTime.toLocaleTimeString()}, minutes: ${minutes}, date: ${date}`);
  
  const total = await getUserCount();
  console.log(`[SCHEDULER] Total users: ${total}`);
  
  // Здесь будет логика отправки уведомлений
  if (total > 0) {
    const users = await getAllUsers();
    console.log(`[SCHEDULER] Processing ${users.length} users`);
    // Добавьте вашу логику проверки расписания
  }
});

console.log('✅ Bot started successfully');