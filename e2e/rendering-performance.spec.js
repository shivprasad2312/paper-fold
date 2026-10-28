import { expect, test } from '@playwright/test';
import { createGame, movePiece, rollDice } from '../src/game.js';

const gameKey = 'ludo-club-game-v1';
const frameCount = (page) => page.evaluate(() => window.__renderFrames.completed);
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), gameKey);

test.setTimeout(90_000);

async function openWithWebGL(page, game, reducedMotion) {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: reducedMotion ? 'reduce' : 'no-preference' });
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('ludo-club-screen-v1', 'game');
    const request = window.requestAnimationFrame.bind(window);
    window.__renderFrames = { requested: 0, completed: 0 };
    window.requestAnimationFrame = (callback) => {
      window.__renderFrames.requested++;
      return request((time) => { window.__renderFrames.completed++; callback(time); });
    };
    window.setSimulatedHidden = (hidden) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
  }, { key: gameKey, value: game });
  await page.goto('/');
  await expect(page.locator('.character-canvas canvas')).toBeVisible({ timeout: 40_000 });
  // Static sprites disappear only after an actual WebGL frame has painted.
  await expect(page.locator('.game-piece img')).toHaveCount(0, { timeout: 40_000 });
}

test('a six-player animated board stops requesting frames when hidden or scrolled offscreen', async ({ page }) => {
  await openWithWebGL(page, createGame(6), false);
  let count = await frameCount(page);
  await expect.poll(() => frameCount(page), { timeout: 20_000 }).toBeGreaterThan(count + 1);
  await page.evaluate(() => window.setSimulatedHidden(true));
  await page.waitForTimeout(300);
  count = await frameCount(page);
  await page.waitForTimeout(500);
  expect(await frameCount(page)).toBe(count);
  await page.evaluate(() => window.setSimulatedHidden(false));
  await expect.poll(() => frameCount(page), { timeout: 20_000 }).toBeGreaterThan(count);

  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await expect.poll(() => page.locator('.board-frame').evaluate((board) => board.getBoundingClientRect().bottom)).toBeLessThan(0);
  await page.waitForTimeout(500); // IntersectionObserver reports the board's visibility asynchronously.
  count = await frameCount(page);
  await page.waitForTimeout(500);
  expect(await frameCount(page)).toBe(count);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => frameCount(page), { timeout: 20_000 }).toBeGreaterThan(count);
});

test('reduced-motion WebGL renders on demand when the game changes', async ({ page }) => {
  const game = createGame(4);
  game.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(game, 2), after = movePiece(before, 1);
  await openWithWebGL(page, before, true);
  await page.waitForTimeout(600); // Allow the first resize and React updates to settle.
  let count = await frameCount(page);
  await page.waitForTimeout(500);
  expect(await frameCount(page)).toBe(count);
  await page.locator('[data-character="yellow-1"]').click();
  await expect.poll(() => saved(page)).toEqual(after);
  await expect.poll(() => frameCount(page), { timeout: 20_000 }).toBeGreaterThan(count);
  await page.waitForTimeout(600);
  count = await frameCount(page);
  await page.waitForTimeout(500);
  expect(await frameCount(page)).toBe(count);
});
