import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
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

const nullableDate = z.string().nullable().optional().describe('ISO timestamp or natural-language date such as "tomorrow morning"');

const taskFields = {
  notes: z.string().nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  importance: z.enum(IMPORTANCE_LEVELS).optional(),
  urgency: z.enum(URGENCY_LEVELS).optional(),
  startAt: nullableDate,
  dueAt: nullableDate,
  remindAt: nullableDate,
  bucket: z.enum(TASK_BUCKETS).nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  progress: z.enum(TASK_PROGRESS).optional(),
  reminderMode: z.enum(REMINDER_MODES).nullable().optional(),
};

function result(data: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

export function registerTaskTools(server: McpServer, service: TaskService): void {
  server.registerTool(
    'create_task',
    {
      description: 'Capture a task immediately. Only title is required; all classification is optional.',
      inputSchema: z.object({
        title: z.string().min(1),
        ...taskFields,
      }),
      annotations: { title: 'Create task', destructiveHint: false, idempotentHint: false },
    },
    async (input) => result({ task: service.createTask(input) }),
  );

  server.registerTool(
    'list_tasks',
    {
      description: 'List tasks with optional filters or a useful predefined view.',
      inputSchema: z.object({
        status: z.enum(TASK_STATUSES).optional(),
        bucket: z.enum(TASK_BUCKETS).optional(),
        importance: z.enum(IMPORTANCE_LEVELS).optional(),
        urgency: z.enum(URGENCY_LEVELS).optional(),
        dueBefore: z.string().optional(),
        dueAfter: z.string().optional(),
        view: z.enum(TASK_VIEWS).optional(),
      }),
      annotations: { title: 'List tasks', readOnlyHint: true },
    },
    async (input) => result({ tasks: service.listTasks(input) }),
  );

  server.registerTool(
    'get_task',
    {
      description: 'Get one task by id.',
      inputSchema: z.object({ task_id: z.string().min(1) }),
      annotations: { title: 'Get task', readOnlyHint: true },
    },
    async ({ task_id }) => result({ task: service.getTask(task_id) }),
  );

  server.registerTool(
    'update_task',
    {
      description: 'Update any editable task fields. Pass null for optional values you want to clear.',
      inputSchema: z.object({ task_id: z.string().min(1), title: z.string().min(1).optional(), ...taskFields }),
      annotations: { title: 'Update task', destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id, ...patch }) => result({ task: service.updateTask(task_id, patch) }),
  );

  server.registerTool(
    'start_task',
    {
      description: 'Mark a task as started without completing it.',
      inputSchema: z.object({ task_id: z.string().min(1) }),
      annotations: { title: 'Start task', destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id }) => result({ task: service.startTask(task_id) }),
  );

  server.registerTool(
    'complete_task',
    {
      description: 'Mark a task completed and record completedAt.',
      inputSchema: z.object({ task_id: z.string().min(1) }),
      annotations: { title: 'Complete task', destructiveHint: false, idempotentHint: true },
    },
    async ({ task_id }) => result({ task: service.completeTask(task_id) }),
  );

  server.registerTool(
    'snooze_task',
    {
      description: 'Move remindAt forward without changing startAt or dueAt. Accepts natural language such as "30 minutes", "tomorrow morning", "this weekend", or "next week".',
      inputSchema: z.object({
        task_id: z.string().min(1),
        until: z.string().min(1),
      }),
      annotations: { title: 'Snooze task', destructiveHint: false, idempotentHint: false },
    },
    async ({ task_id, until }) => result({ task: service.snoozeTask(task_id, until) }),
  );

  server.registerTool(
    'get_focus',
    {
      description: 'Return a small prioritized set for now: critical, today, important work that should start, and waiting tasks.',
      inputSchema: z.object({}),
      annotations: { title: 'Get focus', readOnlyHint: true },
    },
    async () => result(service.getFocus()),
  );
}
