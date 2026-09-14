import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { TaskService } from '../core/task-service.js';
import { createDb } from '../db/client.js';
import { TaskRepository } from '../db/task-repository.js';
import { registerTaskTools } from './tools.js';

function buildServer(): McpServer {
  const { db } = createDb();
  const service = new TaskService(new TaskRepository(db));

  const server = new McpServer(
    { name: 'task-inator', version: '0.1.0' },
    {
      instructions: [
        'Capture first; metadata is optional.',
        'Keep dueAt (real deadline), startAt (actionable time), and remindAt (resurface time) distinct.',
        'Use snooze_task to postpone resurfacing without moving the actual deadline.',
        'Use start_task for multi-session work instead of completing it prematurely.',
      ].join(' '),
    },
  );

  registerTaskTools(server, service);
  return server;
}

void serveStdio(buildServer);
