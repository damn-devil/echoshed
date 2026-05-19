import 'dotenv/config';
import { createBot } from './bot.js';
import { startNotificationScheduler } from './scheduler.js';
import { closeDatabase } from './database.js';
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

// Ловим все ошибки, чтобы процесс не падал молча
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

server.listen(port, '0.0.0.0', () => {
  console.log(`HTTP server listening on 0.0.0.0:${port}`);
  
  try {
    console.log('Initializing bot...');
    const bot = createBot(token);
    console.log('Bot initialized.');
    
    console.log('Starting scheduler...');
    startNotificationScheduler(bot);
    console.log('Scheduler started.');
    
    console.log('Bot is running!');
  } catch (error) {
    console.error('Failed to start bot:', error);
  }
});
