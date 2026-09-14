import { and, eq, isNull } from 'drizzle-orm';
import type { Task } from '../core/task-model.js';
import type { AppDb } from './client.js';
import { tasks } from './schema.js';

export class TaskRepository {
  constructor(private readonly db: AppDb) {}

  create(task: Task): Task {
    this.db.insert(tasks).values(task).run();
    return task;
  }

  get(id: string): Task | null {
    return this.db.select().from(tasks)
      .where(and(eq(tasks.id, id), isNull(tasks.deletedAt)))
      .get() ?? null;
  }

  list(): Task[] {
    return this.db.select().from(tasks).where(isNull(tasks.deletedAt)).all();
  }

  update(id: string, patch: Partial<Task>): Task | null {
    this.db.update(tasks).set(patch).where(and(eq(tasks.id, id), isNull(tasks.deletedAt))).run();
    return this.get(id);
  }
}
