import { TaskService } from '../src/core/task-service.js';
import { createDb } from '../src/db/client.js';
import { TaskRepository } from '../src/db/task-repository.js';

export function testService() {
  const connection = createDb(':memory:');
  return {
    service: new TaskService(new TaskRepository(connection.db)),
    close: connection.close,
  };
}
