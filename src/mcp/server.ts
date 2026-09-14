import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { createApp } from '../app.js';

const app = createApp();

process.once('SIGINT', () => {
  app.close();
  process.exit(0);
});

process.once('SIGTERM', () => {
  app.close();
  process.exit(0);
});

void serveStdio(app.buildMcpServer);
