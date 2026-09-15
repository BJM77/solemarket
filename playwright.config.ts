import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:9007',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI ? {
    command: 'npm run start -- --port 9007',
    url: 'http://localhost:9007',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  } : {
    command: 'npm run dev',
    url: 'http://localhost:9007',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
