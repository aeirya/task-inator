import { TaskService } from '../core/task-service.js';
import { createDb } from './client.js';
import { TaskRepository } from './task-repository.js';

const { db, close } = createDb();
const service = new TaskService(new TaskRepository(db));
const existing = service.listTasks();

if (existing.length > 0) {
  console.error(`Database already has ${existing.length} task(s); seed skipped.`);
  close();
  process.exit(0);
}

service.createTask({
  title: 'Reply to Person A',
  status: 'active',
  importance: 'important',
  urgency: 'urgent',
  bucket: 'today',
  reminderMode: 'persistent',
  remindAt: 'today',
});

service.createTask({
  title: 'Reply to Person B',
  status: 'active',
  importance: 'important',
  bucket: 'today',
});

service.createTask({
  title: 'Complete university unit selection',
  status: 'active',
  importance: 'important',
  urgency: 'urgent',
  bucket: 'this_week',
  dueAt: 'end of week',
  progress: 'started',
  estimatedMinutes: 120,
  reminderMode: 'escalating',
});

service.createTask({
  title: 'Check university schedule',
  status: 'active',
  importance: 'important',
  urgency: 'normal',
  bucket: 'this_week',
});

console.error('Seeded 4 development tasks.');
close();
