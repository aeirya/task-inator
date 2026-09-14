import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import {
  IMPORTANCE_LEVELS,
  REMINDER_MODES,
  TASK_BUCKETS,
  TASK_PROGRESS,
  TASK_STATUSES,
  URGENCY_LEVELS,
} from '../core/task-model.js';

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    notes: text('notes'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('inbox'),
    importance: text('importance', { enum: IMPORTANCE_LEVELS }).notNull().default('normal'),
    urgency: text('urgency', { enum: URGENCY_LEVELS }).notNull().default('normal'),
    startAt: text('start_at'),
    dueAt: text('due_at'),
    remindAt: text('remind_at'),
    bucket: text('bucket', { enum: TASK_BUCKETS }),
    estimatedMinutes: integer('estimated_minutes'),
    progress: text('progress', { enum: TASK_PROGRESS }).notNull().default('not_started'),
    reminderMode: text('reminder_mode', { enum: REMINDER_MODES }),
    snoozeCount: integer('snooze_count').notNull().default(0),
    lastSnoozedAt: text('last_snoozed_at'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    completedAt: text('completed_at'),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('tasks_status_idx').on(table.status),
    index('tasks_bucket_idx').on(table.bucket),
    index('tasks_due_at_idx').on(table.dueAt),
    index('tasks_remind_at_idx').on(table.remindAt),
  ],
);
