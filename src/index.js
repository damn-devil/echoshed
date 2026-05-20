import 'dotenv/config';
import { createBot } from './bot.js';
import { startNotificationScheduler } from './scheduler.js';
import { connectDatabase, closeDatabase } from './database.js';
import http from 'http';

const token = process.env.TELEGRAM_BOT_TOKEN;
const port = process.env.PORT || 3000;

console.log('--- STARTUP ---');
console.log('PORT:', port);
console.log('TOKEN_EXISTS:', !!token);
console.log('REDIS_URL_SET:', !!process.env.UPSTASH_REDIS_REST_URL);

if (!token) {
  console.error('Error: TELEGRAM_BOT_TOKEN is missing!');
  process.exit(1);
}

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('Error: Upstash Redis credentials are missing!');
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
    console.log('Connecting to Redis...');
    await connectDatabase();
    console.log('[DB] Database connected');
    
    console.log('Initializing bot...');
    const bot = createBot(token);
    console.log('Bot initialized.');
    
    console.log('Starting scheduler...');
    startNotificationScheduler(bot);
    console.log('Scheduler started.');
    
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
