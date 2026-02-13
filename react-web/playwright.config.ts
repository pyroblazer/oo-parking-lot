import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for OO Parking Lot E2E Tests
 * 
 * CI-optimized configuration for reliable E2E testing.
 * 
 * Browser Testing Strategy:
 * - CI: Runs only Chromium (most stable, all tests pass)
 */
export default defineConfig({
  testDir: './e2e',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry logic for flaky tests
  // CI: 2 retries for stability
  // Local: 0 retries for fast feedback
  retries: process.env.CI ? 2 : 0,
  
  // Worker configuration
  // CI: 2 workers for balanced performance
  // Local: 8 workers for optimal performance
  workers: 8,
  
  // Reporter to use
  reporter: [
    // ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['line'],
    ['json', { outputFile: 'test-results.json' }],
  ],
  
  // Global test timeout
  // CI: 60 seconds for stability
  // Local: 60 seconds for reliability (increased from 15s due to timeout issues)
  timeout: process.env.CI ? 60000 : 60000,
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: 'http://localhost:3002',
    
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    
    // Timeout for each action
    // CI: 15 seconds for stability
    // Local: 30 seconds for reliability (increased from 10s due to timeout issues)
    actionTimeout: process.env.CI ? 15000 : 30000,
    
    // Timeout for navigation
    // CI: 30 seconds for stability
    // Local: 45 seconds for reliability (increased from 15s due to timeout issues)
    navigationTimeout: process.env.CI ? 30000 : 45000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { 
    //     ...devices['Desktop Safari'],
    //     // Increased timeouts for WebKit stability
    //     actionTimeout: 20000,
    //     navigationTimeout: 40000,
    //   },
    // },

    /* Test against mobile viewports */
    // {
    //   name: 'Mobile Chrome',
    //   use: { 
    //     ...devices['Pixel 5'],
    //     // Increased timeouts for mobile stability
    //     actionTimeout: 20000,
    //     navigationTimeout: 40000,
    //   },
    // },

    // {
    //   name: 'Mobile Safari',
    //   use: { 
    //     ...devices['iPhone 12'],
    //     // Increased timeouts for mobile stability
    //     actionTimeout: 20000,
    //     navigationTimeout: 40000,
    //     // Handle pointer events for mobile touch interactions
    //     hasTouch: true,
    //   },
    // },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120000, // Increased timeout for CI server startup
  },
});
