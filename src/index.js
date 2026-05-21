import 'dotenv/config';
import { createBot } from './bot.js';
import { startNotificationScheduler } from './scheduler.js';
import { startExamNotifier } from './exam-notifier.js';
import { connectDatabase, closeDatabase } from './database.js';
import http from 'http';

const token = process.env.TELEGRAM_BOT_TOKEN;
const port = process.env.PORT || 3000;

console.log('--- STARTUP ---');
console.log('PORT:', port);
console.log('TOKEN_EXISTS:', !!token);

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is missing!');
  process.exit(1);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
});

server.listen(port, '0.0.0.0', async () => {
  console.log(`HTTP server listening on 0.0.0.0:${port}`);
  
  try {
    await connectDatabase();
    console.log('[DB] Database connected');
    
    const bot = createBot(token);
    console.log('Bot initialized.');
    
    startNotificationScheduler(bot);
    console.log('Scheduler started.');
    
    startExamNotifier(bot);
    console.log('Exam notifier started.');
    
    console.log('Bot is running!');
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  await closeDatabase();
  process.exit(0);
});
