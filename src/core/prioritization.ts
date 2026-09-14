import type { FocusResult, Task } from './task-model.js';
import { endOfLocalDay, endOfLocalWeek, isSameLocalDay } from './date.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function active(task: Task): boolean {
  return !task.deletedAt && task.status !== 'done' && task.status !== 'cancelled';
}

function currentlyVisible(task: Task, now: Date): boolean {
  if (!active(task)) return false;
  return !task.remindAt || new Date(task.remindAt).getTime() <= now.getTime();
}

export function priorityScore(task: Task, now = new Date()): number {
  let score = 0;
  const nowMs = now.getTime();

  if (task.dueAt) {
    const untilDue = new Date(task.dueAt).getTime() - nowMs;
    if (untilDue < 0) score += 100;
    else if (untilDue <= DAY) score += 35;
    else if (untilDue <= 3 * DAY) score += 20;
    else if (untilDue <= 7 * DAY) score += 10;
  }

  if (task.urgency === 'urgent') score += 40;
  if (task.importance === 'important') score += 30;
  if (task.progress === 'not_started' && (task.importance === 'important' || task.urgency === 'urgent')) score += 6;
  if (task.progress === 'started') score += 3;
  score += Math.min(task.snoozeCount * 2, 12);

  if (task.startAt) {
    const untilStart = new Date(task.startAt).getTime() - nowMs;
    if (untilStart <= 0) score += 8;
    else if (untilStart <= 2 * DAY) score += 4;
  }

  return score;
}

function sortByPriority(tasks: Task[], now: Date): Task[] {
  return [...tasks].sort((a, b) => {
    const diff = priorityScore(b, now) - priorityScore(a, now);
    if (diff !== 0) return diff;
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function getFocus(tasks: Task[], now = new Date()): FocusResult {
  const visible = tasks.filter((task) => currentlyVisible(task, now));
  const claimed = new Set<string>();

  const critical = sortByPriority(
    visible.filter((task) => {
      const overdue = !!task.dueAt && new Date(task.dueAt).getTime() < now.getTime();
      return task.status !== 'waiting' && (overdue || task.urgency === 'urgent');
    }),
    now,
  ).slice(0, 4);
  critical.forEach((task) => claimed.add(task.id));

  const todayEnd = endOfLocalDay(now).getTime();
  const today = sortByPriority(
    visible.filter((task) => {
      if (claimed.has(task.id) || task.status === 'waiting') return false;
      const dueToday = !!task.dueAt && new Date(task.dueAt).getTime() <= todayEnd;
      const startsToday = !!task.startAt && isSameLocalDay(task.startAt, now);
      const remindsToday = !!task.remindAt && isSameLocalDay(task.remindAt, now);
      return task.bucket === 'today' || dueToday || startsToday || remindsToday;
    }),
    now,
  ).slice(0, 5);
  today.forEach((task) => claimed.add(task.id));

  const weekEnd = endOfLocalWeek(now).getTime();
  const should_start = sortByPriority(
    visible.filter((task) => {
      if (claimed.has(task.id) || task.status === 'waiting' || task.importance !== 'important') return false;
      const dueSoon = !!task.dueAt && new Date(task.dueAt).getTime() <= weekEnd;
      const actionable = !task.startAt || new Date(task.startAt).getTime() <= now.getTime() + 2 * DAY;
      return actionable && (dueSoon || task.bucket === 'this_week' || task.progress === 'not_started');
    }),
    now,
  ).slice(0, 4);
  should_start.forEach((task) => claimed.add(task.id));

  const waiting = sortByPriority(
    visible.filter((task) => task.status === 'waiting' && !claimed.has(task.id)),
    now,
  ).slice(0, 4);

  return { critical, today, should_start, waiting };
}
