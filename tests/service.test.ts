import { afterEach, describe, expect, it } from 'vitest';
import { testService } from './helpers.js';

const NOW = new Date('2026-09-14T10:00:00+02:00');
let closeCurrent: (() => void) | undefined;
afterEach(() => closeCurrent?.());

function setup() {
  const test = testService();
  closeCurrent = test.close;
  return test.service;
}

describe('TaskService', () => {
  it('creates with only a title', () => {
    const service = setup();
    const task = service.createTask({ title: 'Capture this' }, NOW);
    expect(task.status).toBe('inbox');
    expect(task.importance).toBe('normal');
    expect(task.urgency).toBe('normal');
  });

  it('snoozes without changing the deadline', () => {
    const service = setup();
    const task = service.createTask({ title: 'Submit form', dueAt: '2026-09-18T17:00:00+02:00' }, NOW);
    const snoozed = service.snoozeTask(task.id, 'tomorrow morning', NOW);
    expect(snoozed.dueAt).toBe(task.dueAt);
    expect(snoozed.remindAt).not.toBe(task.remindAt);
    expect(snoozed.snoozeCount).toBe(1);
  });

  it('supports useful predefined views', () => {
    const service = setup();
    service.createTask({ title: 'Urgent item', urgency: 'urgent' }, NOW);
    service.createTask({ title: 'Normal item' }, NOW);
    expect(service.listTasks({ view: 'urgent' }, NOW).map((task) => task.title)).toEqual(['Urgent item']);
  });
});
