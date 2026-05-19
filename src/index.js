import 'dotenv/config';
import { createBot } from './bot.js';
import { startNotificationScheduler } from './scheduler.js';
import { closeDatabase } from './database.js';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Error: Set TELEGRAM_BOT_TOKEN environment variable');
  console.error('Example: TELEGRAM_BOT_TOKEN=your_token_here npm start');
  process.exit(1);
}

console.log('Starting BSUIR Schedule Bot...');

const bot = createBot(token);

startNotificationScheduler(bot);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  bot.stopPolling();
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  bot.stopPolling();
  closeDatabase();
  process.exit(0);
});

console.log('Bot is running!');
