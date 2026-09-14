import { defineConfig } from 'vitest/config';

process.env.TZ = 'Europe/Rome';

export default defineConfig({
  test: {
    environment: 'node',
    sequence: { concurrent: false },
  },
});
