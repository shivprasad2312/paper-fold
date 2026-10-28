import { expect, test } from '@playwright/test';
import { createGame, movePiece, rollDice } from '../src/game.js';

const gameKey = 'ludo-club-game-v1';
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), gameKey);

test.use({ hasTouch: true, isMobile: true });

async function openPosition(page, game, viewport) {
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    sessionStorage.setItem('ludo-club-screen-v1', 'game');
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  }, { key: gameKey, value: game });
  await page.goto('/');
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
}

const sizes = [
  { name: 'portrait phone', viewport: { width: 320, height: 568 } },
  { name: 'landscape phone', viewport: { width: 568, height: 320 } },
];
for (const count of [2, 3, 4, 5, 6]) {
  for (const { name, viewport } of sizes) {
    test(`${count} players: ${name} keeps the board and turn control visible and offers reliable touch choices`, async ({ page }) => {
      const initial = createGame(count);
      initial.pieces.yellow = [8, 8, 8, 8];
      const before = rollDice(initial, 2), after = movePiece(before, 3);
      await openPosition(page, before, viewport);
      const board = page.locator('.board-frame');
      const boardRect = await board.boundingBox();
      expect(boardRect.x).toBeGreaterThanOrEqual(0);
      expect(boardRect.y).toBeGreaterThanOrEqual(0);
      expect(boardRect.x + boardRect.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(boardRect.y + boardRect.height).toBeLessThanOrEqual(viewport.height + 1);
      expect(boardRect.width).toBeGreaterThanOrEqual(Math.min(viewport.width - 30, viewport.height - 66));
      const choose = page.getByRole('button', { name: 'Choose a character', exact: true });
      await expect(choose).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole('img', { name: 'Last roll: 2' })).toBeVisible();
      await expect(page.locator('.piece-choice-number')).toHaveCount(4);
      expect(await page.locator('.piece-choice-number').allTextContents()).toEqual(['1', '2', '3', '4']);
      const markerRects = await page.locator('.piece-choice-number').evaluateAll((items) => items.map((item) => {
        const { x, width } = item.getBoundingClientRect(); return { x, width };
      }));
      for (let i = 1; i < markerRects.length; i++) {
        expect(markerRects[i].x - markerRects[i - 1].x).toBeGreaterThanOrEqual(markerRects[i - 1].width - 1);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const group = page.getByRole('group', { name: 'Choose a stacked character to move' });
      await expect(group.getByRole('button')).toHaveCount(4);
      for (const button of await group.getByRole('button').all()) {
        const rect = await button.boundingBox();
        expect(rect.width).toBeGreaterThanOrEqual(48);
        expect(rect.height).toBeGreaterThanOrEqual(48);
      }
      // This turn control also takes keyboard and screen-reader users to the
      // larger numbered choices; it does not roll again.
      await choose.tap();
      const first = group.getByRole('button', { name: 'Move Yellow character 1' });
      await expect(first).toBeFocused();
      const fourth = group.getByRole('button', { name: 'Move Yellow character 4' });
      await fourth.tap();
      await expect.poll(() => saved(page)).toEqual(after);
    });
  }
}

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
  test(`six-player game fits a ${viewport.width}×${viewport.height} phone/tablet viewport`, async ({ page }) => {
    const game = createGame(6);
    game.pieces.yellow = [1, 8, -1, -1];
    await openPosition(page, rollDice(game, 2), viewport);
    const board = await page.locator('.board-frame').boundingBox();
    expect(board.y + board.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(page.getByRole('button', { name: 'Choose a character', exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('img', { name: 'Last roll: 2' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    const picker = page.getByRole('button', { name: 'Choose characters', exact: true });
    await picker.tap();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).tap();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });
}

test('rotation during a move preserves the selection and completes it once', async ({ page }) => {
  const game = createGame(5);
  game.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(game, 2), after = movePiece(before, 1);
  await openPosition(page, before, { width: 320, height: 568 });
  await page.getByRole('button', { name: 'Move Yellow character 2' }).tap();
  await page.setViewportSize({ width: 568, height: 320 });
  await expect.poll(() => saved(page)).toEqual(after);
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
  const board = await page.locator('.board-frame').boundingBox();
  expect(board.y + board.height).toBeLessThanOrEqual(321);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(568);
});
