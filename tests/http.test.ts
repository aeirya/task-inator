import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTaskHttpServer } from '../src/http/app.js';

const token = 'test-token-that-is-long-enough-123456';
const server = createTaskHttpServer(token);
let baseUrl: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

describe('HTTP server', () => {
  it('exposes health without authentication', async () => {
    const response = await fetch(`${baseUrl}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('rejects unauthenticated API calls', async () => {
    const response = await fetch(`${baseUrl}/api/focus`);
    expect(response.status).toBe(401);
  });

  it('creates and resurfaces a task through the API', async () => {
    const headers = {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    };
    const created = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'Reply to John', urgency: 'urgent', bucket: 'today' }),
    });
    expect(created.status).toBe(201);

    const focus = await fetch(`${baseUrl}/api/focus`, { headers });
    expect(focus.status).toBe(200);
    const body = await focus.json() as { critical: Array<{ title: string }> };
    expect(body.critical.some((task) => task.title === 'Reply to John')).toBe(true);
  });
});
