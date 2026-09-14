import { randomUUID } from 'node:crypto';
import type {
  CreateTaskInput,
  FocusResult,
  ListTaskFilters,
  Task,
  UpdateTaskInput,
} from './task-model.js';
import { endOfLocalDay, endOfLocalWeek, isSameLocalDay, isTomorrow, parseDateInput } from './date.js';
import { getFocus } from './prioritization.js';
import { TaskRepository } from '../db/task-repository.js';

function requireTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Task title cannot be empty');
  return trimmed;
}

function maybeDate(value: string | Date | null | undefined, now: Date): string | null | undefined {
  if (value === undefined) return undefined;
  return parseDateInput(value, now);
}

export class TaskService {
  constructor(private readonly repo: TaskRepository) {}

  createTask(input: CreateTaskInput, now = new Date()): Task {
    const timestamp = now.toISOString();
    const task: Task = {
      id: randomUUID(),
      title: requireTitle(input.title),
      notes: input.notes ?? null,
      status: input.status ?? 'inbox',
      importance: input.importance ?? 'normal',
      urgency: input.urgency ?? 'normal',
      startAt: parseDateInput(input.startAt, now),
      dueAt: parseDateInput(input.dueAt, now),
      remindAt: parseDateInput(input.remindAt, now),
      bucket: input.bucket ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      progress: input.progress ?? 'not_started',
      reminderMode: input.reminderMode ?? null,
      snoozeCount: 0,
      lastSnoozedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
      completedAt: input.status === 'done' ? timestamp : null,
      deletedAt: null,
    };
    return this.repo.create(task);
  }

  getTask(id: string): Task {
    const task = this.repo.get(id);
    if (!task) throw new Error(`Task not found: ${id}`);
    return task;
  }

  listTasks(filters: ListTaskFilters = {}, now = new Date()): Task[] {
    let result = this.repo.list().filter((task) => task.status !== 'cancelled');

    if (filters.status) result = result.filter((task) => task.status === filters.status);
    if (filters.bucket) result = result.filter((task) => task.bucket === filters.bucket);
    if (filters.importance) result = result.filter((task) => task.importance === filters.importance);
    if (filters.urgency) result = result.filter((task) => task.urgency === filters.urgency);

    const dueBefore = filters.dueBefore ? parseDateInput(filters.dueBefore, now) : null;
    const dueAfter = filters.dueAfter ? parseDateInput(filters.dueAfter, now) : null;
    if (dueBefore) result = result.filter((task) => !!task.dueAt && task.dueAt <= dueBefore);
    if (dueAfter) result = result.filter((task) => !!task.dueAt && task.dueAt >= dueAfter);

    if (filters.view) {
      result = result.filter((task) => {
        switch (filters.view) {
          case 'today':
            return task.bucket === 'today'
              || isSameLocalDay(task.startAt, now)
              || isSameLocalDay(task.dueAt, now)
              || isSameLocalDay(task.remindAt, now);
          case 'tomorrow':
            return task.bucket === 'tomorrow'
              || isTomorrow(task.startAt, now)
              || isTomorrow(task.dueAt, now)
              || isTomorrow(task.remindAt, now);
          case 'this_week': {
            const weekEnd = endOfLocalWeek(now).getTime();
            return task.bucket === 'this_week'
              || (!!task.dueAt && new Date(task.dueAt).getTime() <= weekEnd && new Date(task.dueAt).getTime() >= now.getTime());
          }
          case 'urgent': return task.urgency === 'urgent';
          case 'important': return task.importance === 'important';
          case 'overdue': return !!task.dueAt && new Date(task.dueAt).getTime() < now.getTime() && task.status !== 'done';
          case 'inbox': return task.status === 'inbox';
        }
      });
    }

    const todayEnd = endOfLocalDay(now).getTime();
    return result.sort((a, b) => {
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
      const aOverdue = aDue < now.getTime();
      const bOverdue = bDue < now.getTime();
      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
      const aToday = aDue <= todayEnd;
      const bToday = bDue <= todayEnd;
      if (aToday !== bToday) return aToday ? -1 : 1;
      return aDue - bDue || a.createdAt.localeCompare(b.createdAt);
    });
  }

  updateTask(id: string, input: UpdateTaskInput, now = new Date()): Task {
    const current = this.getTask(id);
    const patch: Partial<Task> = { updatedAt: now.toISOString() };

    if (input.title !== undefined) patch.title = requireTitle(input.title);
    if (input.notes !== undefined) patch.notes = input.notes;
    if (input.status !== undefined) patch.status = input.status;
    if (input.importance !== undefined) patch.importance = input.importance;
    if (input.urgency !== undefined) patch.urgency = input.urgency;
    if (input.bucket !== undefined) patch.bucket = input.bucket;
    if (input.estimatedMinutes !== undefined) patch.estimatedMinutes = input.estimatedMinutes;
    if (input.progress !== undefined) patch.progress = input.progress;
    if (input.reminderMode !== undefined) patch.reminderMode = input.reminderMode;

    const startAt = maybeDate(input.startAt, now);
    const dueAt = maybeDate(input.dueAt, now);
    const remindAt = maybeDate(input.remindAt, now);
    if (startAt !== undefined) patch.startAt = startAt;
    if (dueAt !== undefined) patch.dueAt = dueAt;
    if (remindAt !== undefined) patch.remindAt = remindAt;

    if (input.status === 'done' && current.status !== 'done') patch.completedAt = now.toISOString();
    if (input.status !== undefined && input.status !== 'done' && current.status === 'done') patch.completedAt = null;

    return this.repo.update(id, patch) ?? this.getTask(id);
  }

  startTask(id: string, now = new Date()): Task {
    const task = this.getTask(id);
    if (task.status === 'done' || task.status === 'cancelled') throw new Error('Cannot start a completed or cancelled task');
    return this.repo.update(id, {
      status: 'active',
      progress: task.progress === 'almost_done' ? 'almost_done' : 'started',
      updatedAt: now.toISOString(),
    })!;
  }

  completeTask(id: string, now = new Date()): Task {
    this.getTask(id);
    const timestamp = now.toISOString();
    return this.repo.update(id, {
      status: 'done',
      completedAt: timestamp,
      updatedAt: timestamp,
    })!;
  }

  snoozeTask(id: string, until: string | Date, now = new Date()): Task {
    const task = this.getTask(id);
    const remindAt = parseDateInput(until, now);
    if (!remindAt || new Date(remindAt).getTime() <= now.getTime()) {
      throw new Error('Snooze time must be in the future');
    }
    return this.repo.update(id, {
      remindAt,
      snoozeCount: task.snoozeCount + 1,
      lastSnoozedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    })!;
  }

  getFocus(now = new Date()): FocusResult {
    return getFocus(this.repo.list(), now);
  }
}
