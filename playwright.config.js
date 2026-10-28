import { defineConfig } from '@playwright/test';

// The optional executable override is useful in environments with a preinstalled
// headless Chromium; ordinary local runs use Playwright's installed browser.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    browserName: 'chromium',
    launchOptions: executablePath ? {
      executablePath,
      args: ['--no-sandbox', '--in-process-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    } : {},
  },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
