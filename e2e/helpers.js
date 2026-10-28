import { expect } from '@playwright/test';

// Existing game tests exercise the gameplay screen, reached through the same
// lobby/setup flow as a player. A seeded save is continued with Resume.
export async function openGame(page) {
  await page.goto('/');
  if (await page.locator('[data-screen="game"]').isVisible()) return;
  const resume = page.getByRole('button', { name: 'Resume', exact: true });
  await expect(resume).toBeVisible();
  if (await resume.isEnabled()) {
    await resume.click();
  } else {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.getByRole('button', { name: 'Start game' }).click();
  }
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
}
