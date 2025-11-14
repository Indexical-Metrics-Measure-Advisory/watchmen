import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'on',
    trace: 'off',
  },
  webServer: {
    command: 'npm run dev',
    port: 8080,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});