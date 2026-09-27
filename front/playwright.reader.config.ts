import { defineConfig, devices } from '@playwright/test'
import base from './playwright.config'
export default defineConfig({
  ...base,
  testMatch: 'reader.spec.ts',
  testIgnore: [],
  timeout: 45_000,
  expect: { timeout: 15_000 },
  workers: 2,
  use: { ...base.use, trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
})
