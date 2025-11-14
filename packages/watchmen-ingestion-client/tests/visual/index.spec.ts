import { test, expect } from '@playwright/test';

test.describe('Index page visual', () => {
  test('renders without style conflicts', async ({ page }) => {
    await page.goto('/');
    // Capture either loading or dashboard content for regression
    const container = page.locator('#root');
    await expect(container).toHaveScreenshot('index.png');
  });
});