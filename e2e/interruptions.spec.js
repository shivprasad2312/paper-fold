import { expect, test } from '@playwright/test';
import { createGame, finishFor, movePiece, rollDice } from '../src/game.js';
import { PENDING_MOVE_KEY } from '../src/gamePersistence.js';

const gameKey = 'ludo-club-game-v1';
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), gameKey);
const journal = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), PENDING_MOVE_KEY);

async function prepare(page, game, rolls = [6]) {
  await page.addInitScript(({ gameKey, game, rolls }) => {
    if (!localStorage.getItem(gameKey)) localStorage.setItem(gameKey, JSON.stringify(game));
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
    let index = 0;
    Object.defineProperty(window.crypto, 'getRandomValues', { configurable: true, value(array) {
      array[0] = (rolls[Math.min(index++, rolls.length - 1)] || 1) - 1;
      return array;
    } });
    window.setSimulatedHidden = (hidden) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
  }, { gameKey, game, rolls });
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
}

test('a roll is saved immediately and waits for the player to return from the background', async ({ page }) => {
  await prepare(page, createGame(2), [6]);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await page.evaluate(() => window.setSimulatedHidden(true));
  expect(await saved(page)).toMatchObject({ current: 'yellow', roll: 6, phase: 'choose', pieces: { yellow: [-1, -1, -1, -1] } });
  await page.waitForTimeout(1000);
  expect((await saved(page)).pieces.yellow[0]).toBe(-1);
  await expect(page.getByRole('button', { name: 'Rolling...' })).toBeDisabled();
  await page.evaluate(() => window.setSimulatedHidden(false));
  await expect.poll(async () => (await saved(page)).pieces.yellow[0]).toBe(0);
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await saved(page)).sixes).toBe(1);
  expect(await journal(page)).toBeNull();
});

test('refreshing while the dice spin preserves the result and applies the automatic move once', async ({ page }) => {
  await prepare(page, createGame(3), [6]);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  expect(await saved(page)).toMatchObject({ phase: 'choose', roll: 6 });
  await page.reload();
  await expect.poll(async () => (await saved(page)).pieces.yellow[0]).toBe(0);
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  await page.reload();
  expect((await saved(page)).pieces.yellow).toEqual([0, -1, -1, -1]);
  expect((await saved(page)).sixes).toBe(1);
});

test('a manually chosen move survives a refresh and is not repeated', async ({ page }) => {
  const game = createGame(4);
  game.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(game, 2), after = movePiece(before, 1);
  await prepare(page, before);
  await page.locator('[data-character="yellow-1"]').click();
  await expect(page.locator('[data-character="yellow-1"]')).toHaveAttribute('data-pose', 'walk');
  expect(await journal(page)).toMatchObject({ before, index: 1 });
  expect(await saved(page)).toEqual(before); // The visible animation has not committed yet.
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(after);
  expect(await journal(page)).toBeNull();
  await page.reload();
  expect(await saved(page)).toEqual(after);
});

test('a pending manual choice resumes after going home without changing the existing save', async ({ page }) => {
  const game = createGame(4);
  game.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(game, 2), after = movePiece(before, 1);
  await prepare(page, before);
  await page.locator('[data-character="yellow-1"]').click();
  await expect(page.locator('[data-character="yellow-1"]')).toHaveAttribute('data-pose', 'walk');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(await saved(page)).toEqual(before);
  expect(await journal(page)).toMatchObject({ index: 1 });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => saved(page)).toEqual(after);
  expect(await journal(page)).toBeNull();
});

test('a capture pauses while backgrounded and finishes its backward walk after return', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = createGame();
  const game = { ...initial, phase: 'choose', roll: 2, lastRollBy: 'yellow', legal: [0, 1],
    pieces: { ...initial.pieces, yellow: [1, 12, -1, -1], red: [42, -1, -1, -1] } };
  await prepare(page, game);
  await page.locator('[data-character="yellow-0"]').click();
  const victim = page.locator('[data-character="red-0"]');
  await expect(victim).toHaveAttribute('data-pose', 'sad-walk');
  await page.evaluate(() => window.setSimulatedHidden(true));
  const progress = await victim.getAttribute('data-progress');
  await page.waitForTimeout(400);
  await expect(victim).toHaveAttribute('data-progress', progress);
  expect((await saved(page)).pieces.red[0]).toBe(42);
  await page.evaluate(() => window.setSimulatedHidden(false));
  await expect.poll(async () => (await saved(page)).pieces.red[0], { timeout: 15_000 }).toBe(-1);
  expect((await saved(page)).pieces.yellow[0]).toBe(3);
  expect(await journal(page)).toBeNull();
});

test('pagehide and pageshow pause and resume a selected move without duplicating it', async ({ page }) => {
  const initial = createGame(5);
  initial.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(initial, 2), after = movePiece(before, 0);
  await prepare(page, before);
  await page.locator('[data-character="yellow-0"]').click();
  await expect(page.locator('[data-character="yellow-0"]')).toHaveAttribute('data-pose', 'walk');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.waitForTimeout(1000);
  expect(await saved(page)).toEqual(before);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(() => saved(page)).toEqual(after);
});

test('refreshing during a capture return recovers both the move and the captured character exactly once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = createGame();
  const before = { ...initial, phase: 'choose', roll: 2, lastRollBy: 'yellow', legal: [0, 1],
    pieces: { ...initial.pieces, yellow: [1, 12, -1, -1], red: [42, -1, -1, -1] } };
  const after = movePiece(before, 0);
  await prepare(page, before);
  await page.locator('[data-character="yellow-0"]').click();
  await expect(page.locator('[data-character="red-0"]')).toHaveAttribute('data-pose', 'sad-walk');
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(after);
  expect(after.pieces.yellow[0]).toBe(3);
  expect(after.pieces.red[0]).toBe(-1);
  expect(await journal(page)).toBeNull();
  await page.reload();
  expect(await saved(page)).toEqual(after);
});

test('refreshing during the winning celebration restores the winner without replaying the move', async ({ page }) => {
  const initial = createGame(6), finish = finishFor(6);
  initial.pieces.yellow = [finish - 6, finish, finish, finish];
  const before = rollDice(initial, 6), after = movePiece(before, 0);
  await prepare(page, before);
  await page.locator('[data-character="yellow-0"]').click();
  await expect(page.locator('[data-character="yellow-0"]')).toHaveAttribute('data-pose', 'dance');
  expect(await journal(page)).toMatchObject({ index: 0 });
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(after);
  await expect(page.getByRole('dialog')).toContainText('Yellow takes the crown!');
  expect(await journal(page)).toBeNull();
  await page.reload();
  expect(await saved(page)).toEqual(after);
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('starting a new game intentionally discards an interrupted selection', async ({ page }) => {
  const initial = createGame(4);
  initial.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(initial, 2);
  await prepare(page, before);
  await page.locator('[data-character="yellow-1"]').click();
  await expect(page.locator('[data-character="yellow-1"]')).toHaveAttribute('data-pose', 'walk');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(await journal(page)).toMatchObject({ index: 1 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect.poll(async () => (await saved(page)).pieces.yellow).toEqual([-1, -1, -1, -1]);
  expect(await journal(page)).toBeNull();
  await page.reload();
  expect((await saved(page)).pieces.yellow).toEqual([-1, -1, -1, -1]);
});
