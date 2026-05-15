import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv();

export default defineConfig({
  testDir: './tests/e2e',
  retries: 0,
  workers: 1,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev:all',
    url: 'http://localhost:5174/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env as Record<string, string>,
    },
  },
});
