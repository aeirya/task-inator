import { timingSafeEqual } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { toNodeHandler } from '@modelcontextprotocol/node';
import * as z from 'zod/v4';
import { createApp } from '../app.js';
import {
  IMPORTANCE_LEVELS,
  REMINDER_MODES,
  TASK_BUCKETS,
  TASK_PROGRESS,
  TASK_STATUSES,
  TASK_VIEWS,
  URGENCY_LEVELS,
} from '../core/task-model.js';
import type { TaskService } from '../core/task-service.js';

const MAX_BODY_BYTES = 64 * 1024;

const optionalTaskFields = {
  notes: z.string().nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  importance: z.enum(IMPORTANCE_LEVELS).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  startAt: z.string().nullable().optional(),
  dueAt: z.string().nullable().optional(),
  remindAt: z.string().nullable().optional(),
  bucket: z.enum(TASK_BUCKETS).nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  progress: z.enum(TASK_PROGRESS).optional(),
  reminderMode: z.enum(REMINDER_MODES).nullable().optional(),
};

const createTaskSchema = z.object({ title: z.string().min(1), ...optionalTaskFields });
const updateTaskSchema = z.object({ title: z.string().min(1).optional(), ...optionalTaskFields });
const snoozeSchema = z.object({ until: z.string().min(1) });
const listSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  bucket: z.enum(TASK_BUCKETS).optional(),
  importance: z.enum(IMPORTANCE_LEVELS).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  view: z.enum(TASK_VIEWS).optional(),
});

function json(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
    'cache-control': 'no-store',
  });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function authorized(req: IncomingMessage, token: string): boolean {
  const actual = Buffer.from(req.headers.authorization ?? '');
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function taskId(pathname: string): string | null {
  const raw = pathname.match(/^\/api\/tasks\/([^/]+)$/)?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

function actionTaskId(pathname: string, action: 'start' | 'complete' | 'snooze'): string | null {
  const raw = pathname.match(new RegExp(`^/api/tasks/([^/]+)/${action}$`))?.[1];
  return raw ? decodeURIComponent(raw) : null;
}

async function handleApi(req: IncomingMessage, res: ServerResponse, url: URL, service: TaskService): Promise<void> {
  if (req.method === 'GET' && url.pathname === '/api/focus') {
    json(res, 200, service.getFocus());
    return;
  }

  if (url.pathname === '/api/tasks' && req.method === 'GET') {
    const filters = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
    json(res, 200, { tasks: service.listTasks(filters) });
    return;
  }

  if (url.pathname === '/api/tasks' && req.method === 'POST') {
    const input = createTaskSchema.parse(await readJson(req));
    json(res, 201, { task: service.createTask(input) });
    return;
  }

  const id = taskId(url.pathname);
  if (id && req.method === 'GET') {
    json(res, 200, { task: service.getTask(id) });
    return;
  }
  if (id && req.method === 'PATCH') {
    const patch = updateTaskSchema.parse(await readJson(req));
    json(res, 200, { task: service.updateTask(id, patch) });
    return;
  }

  const startId = actionTaskId(url.pathname, 'start');
  if (startId && req.method === 'POST') {
    json(res, 200, { task: service.startTask(startId) });
    return;
  }

  const completeId = actionTaskId(url.pathname, 'complete');
  if (completeId && req.method === 'POST') {
    json(res, 200, { task: service.completeTask(completeId) });
    return;
  }

  const snoozeId = actionTaskId(url.pathname, 'snooze');
  if (snoozeId && req.method === 'POST') {
    const { until } = snoozeSchema.parse(await readJson(req));
    json(res, 200, { task: service.snoozeTask(snoozeId, until) });
    return;
  }

  json(res, 404, { error: 'not_found' });
}

export function createTaskHttpServer(token = process.env.TASK_INATOR_TOKEN) {
  if (!token || token.length < 24) {
    throw new Error('TASK_INATOR_TOKEN must be set to a random value of at least 24 characters');
  }

  const app = createApp();
  const mcp = createMcpHandler(app.buildMcpServer);
  const mcpNodeHandler = toNodeHandler(mcp);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/healthz') {
      json(res, 200, { ok: true });
      return;
    }

    if (url.pathname !== '/mcp' && !url.pathname.startsWith('/api/')) {
      json(res, 404, { error: 'not_found' });
      return;
    }

    if (!authorized(req, token)) {
      res.setHeader('www-authenticate', 'Bearer');
      json(res, 401, { error: 'unauthorized' });
      return;
    }

    if (url.pathname === '/mcp') {
      await mcpNodeHandler(req, res);
      return;
    }

    try {
      await handleApi(req, res, url, app.service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        json(res, 400, { error: 'invalid_request', issues: error.issues });
        return;
      }
      const message = error instanceof Error ? error.message : 'Unknown error';
      json(res, message.startsWith('Task not found:') ? 404 : 400, { error: message });
    }
  });

  server.on('close', () => {
    void mcp.close().finally(app.close);
  });

  return server;
}
