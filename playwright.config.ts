import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.BASE ?? 'http://localhost:5173',
    ...devices['iPhone 13'],
    browserName: 'chromium', // WebKit is not installed in this environment; real-device iOS checks are manual
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run db:migrate:local && npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173/api/health',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
