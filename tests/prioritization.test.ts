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

describe('getFocus', () => {
  it('puts an overdue urgent important task first', () => {
    const service = setup();
    const overdue = service.createTask({
      title: 'Overdue critical', status: 'active', importance: 'important', urgency: 'urgent', dueAt: '2026-09-13T09:00:00+02:00',
    }, NOW);
    service.createTask({ title: 'Urgent but later', status: 'active', urgency: 'urgent', dueAt: '2026-09-15T18:00:00+02:00' }, NOW);

    expect(service.getFocus(NOW).critical[0]?.id).toBe(overdue.id);
  });

  it('protects important non-urgent work due this week', () => {
    const service = setup();
    const important = service.createTask({
      title: 'Unit selection', status: 'active', importance: 'important', urgency: 'normal', dueAt: '2026-09-18T17:00:00+02:00',
    }, NOW);

    expect(service.getFocus(NOW).should_start.map((task) => task.id)).toContain(important.id);
  });

  it('hides a task snoozed until tomorrow from NOW', () => {
    const service = setup();
    const task = service.createTask({
      title: 'Reply later', status: 'active', importance: 'important', urgency: 'urgent', remindAt: '2026-09-14T09:00:00+02:00',
    }, NOW);
    service.snoozeTask(task.id, 'tomorrow morning', NOW);

    const focus = service.getFocus(NOW);
    const visibleIds = [...focus.critical, ...focus.today, ...focus.should_start, ...focus.waiting].map((item) => item.id);
    expect(visibleIds).not.toContain(task.id);
  });

  it('keeps a started multi-session task active', () => {
    const service = setup();
    const task = service.createTask({ title: 'Long task', status: 'active', importance: 'important' }, NOW);
    const started = service.startTask(task.id, NOW);

    expect(started.progress).toBe('started');
    expect(started.status).toBe('active');
    expect(service.getTask(task.id).status).not.toBe('done');
  });

  it('removes completed work from focus', () => {
    const service = setup();
    const task = service.createTask({ title: 'Finish me', status: 'active', urgency: 'urgent', bucket: 'today' }, NOW);
    service.completeTask(task.id, NOW);

    const focus = service.getFocus(NOW);
    expect(JSON.stringify(focus)).not.toContain(task.id);
  });
});
