import http from 'http';
import app from './app';
import { connectDatabase } from './config/database';
import { initSocket } from './sockets/socketManager';
import { env } from './config/env';

const server = http.createServer(app);
initSocket(server);

const start = async () => {
  await connectDatabase();
  server.listen(env.PORT, () => {
    console.log(`🚀 CampusPrint server running on port ${env.PORT}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`📱 Client URL: ${env.CLIENT_URL}`);
  });
};

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
