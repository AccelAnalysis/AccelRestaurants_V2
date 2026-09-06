import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export default defineConfig({
  testDir: '.', testMatch: 'hig.spec.mjs', timeout: 30000, retries: 0, workers: 2,
  reporter: [['list'], ['html', { outputFolder: 'report', open: 'never' }]], outputDir: 'results',
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium', viewport: { width: 1440, height: 1000 }, ...(process.env.HIG_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.HIG_CHROMIUM_PATH } } : {}) } },
    { name: 'phone-chromium', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, hasTouch: true, ...(process.env.HIG_CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.HIG_CHROMIUM_PATH } } : {}) } },
    { name: 'tablet-webkit', use: { browserName: 'webkit', viewport: { width: 834, height: 1194 }, hasTouch: true } },
  ],
  webServer: { command: 'node node_modules/vite/bin/vite.js --config tests/hig/vite.config.mjs', cwd: root, url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 60000 },
});
