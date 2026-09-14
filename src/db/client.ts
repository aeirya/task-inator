import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

export type AppDb = ReturnType<typeof drizzle>;

export function createDb(filename = process.env.DB_FILE_NAME ?? './data/tasks.sqlite') {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });

  const sqlite = new Database(filename);
  sqlite.pragma('foreign_keys = ON');
  if (filename !== ':memory:') sqlite.pragma('journal_mode = WAL');

  // Zero-friction MVP bootstrap. Drizzle Kit remains available for later migrations.
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'inbox',
      importance TEXT NOT NULL DEFAULT 'normal',
      urgency TEXT NOT NULL DEFAULT 'normal',
      start_at TEXT,
      due_at TEXT,
      remind_at TEXT,
      bucket TEXT,
      estimated_minutes INTEGER,
      progress TEXT NOT NULL DEFAULT 'not_started',
      reminder_mode TEXT,
      snooze_count INTEGER NOT NULL DEFAULT 0,
      last_snoozed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      deleted_at TEXT
    );
    CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);
    CREATE INDEX IF NOT EXISTS tasks_bucket_idx ON tasks(bucket);
    CREATE INDEX IF NOT EXISTS tasks_due_at_idx ON tasks(due_at);
    CREATE INDEX IF NOT EXISTS tasks_remind_at_idx ON tasks(remind_at);
  `);

  return {
    db: drizzle(sqlite, { schema }),
    sqlite,
    close: () => sqlite.close(),
  };
}
