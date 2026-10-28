import { expect, test } from '@playwright/test';
import { createGame, finishFor } from '../src/game.js';

const storageKey = 'ludo-club-game-v1';
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);

async function prepare(page, game, bytes = [0]) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(([key, initial, values]) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial));
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
    let index = 0;
    Object.defineProperty(window.crypto, 'getRandomValues', {
      configurable: true,
      value: (array) => { array[0] = values[Math.min(index++, values.length - 1)]; return array; },
    });
  }, [storageKey, game, bytes]);
  await page.goto('/');
  await expect(page.locator('.character-fallback-note')).toBeVisible();
}

for (const [count, color] of [[4, 'green'], [5, 'purple'], [6, 'orange']]) {
  test(`${count}-player opening roll is guaranteed after nine misses and survives reload`, async ({ page }) => {
    const game = createGame(count);
    game.current = color;
    game.rollsWithoutSix[color] = 9;
    game.rollsWithoutSix.yellow = 3;
    // A zero byte would give a 1 under the ordinary distribution.
    await prepare(page, game, [0]);
    await page.getByRole('button', { name: 'Roll the dice' }).click();
    await expect.poll(async () => (await saved(page)).pieces[color][0]).toBe(0);
    const result = await saved(page);
    expect(result.current).toBe(color);
    expect(result.roll).toBe(6);
    expect(result.rollsWithoutSix[color]).toBe(0);
    expect(result.rollsWithoutSix.yellow).toBe(3);
    await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
    await page.reload();
    await expect(page.locator('.board')).toHaveAttribute('data-player-count', String(count));
    await expect.poll(async () => (await saved(page)).pieces[color][0]).toBe(0);
    expect((await saved(page)).rollsWithoutSix[color]).toBe(0);
  });
}

test('the increased chance starts after six failed turns, without affecting other players', async ({ page }) => {
  const game = createGame(5);
  game.current = 'purple';
  game.rollsWithoutSix.purple = 6;
  game.rollsWithoutSix.red = 4;
  // In a normal roll byte 2 would be 3; it is one of the boosted six buckets.
  await prepare(page, game, [2]);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect.poll(async () => (await saved(page)).pieces.purple[0]).toBe(0);
  const result = await saved(page);
  expect(result.roll).toBe(6);
  expect(result.rollsWithoutSix.purple).toBe(0);
  expect(result.rollsWithoutSix.red).toBe(4);
});

test('a player with a character out uses ordinary odds despite many rolls without a six', async ({ page }) => {
  const game = createGame(6);
  game.current = 'orange';
  game.pieces.orange = [0, -1, -1, -1];
  game.rollsWithoutSix.orange = 9;
  await prepare(page, game, [0]);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect.poll(async () => (await saved(page)).pieces.orange[0]).toBe(1);
  const result = await saved(page);
  expect(result.roll).toBe(1);
  expect(result.current).toBe('yellow');
  expect(result.rollsWithoutSix.orange).toBe(10);
});

test('four consecutive playable sixes all let the same player roll again', async ({ page }) => {
  const game = createGame(6);
  game.current = 'orange';
  game.pieces.orange = [0, -1, -1, -1];
  await prepare(page, game, [5]);
  for (let streak = 1; streak <= 4; streak += 1) {
    await page.getByRole('button', { name: streak === 1 ? 'Roll the dice' : 'Roll again' }).click();
    await expect(page.locator('.game-piece.is-selectable')).toHaveCount(4);
    await page.locator('[data-character="orange-0"]').click();
    await expect.poll(async () => (await saved(page)).pieces.orange[0]).toBe(streak * 6);
    expect((await saved(page)).current).toBe('orange');
    expect((await saved(page)).sixes).toBe(streak);
    await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
    if (streak === 3) {
      await page.reload();
      await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
      expect((await saved(page)).sixes).toBe(3);
    }
  }
});

test('unplayable sixes still give another roll and a long streak survives reload', async ({ page }) => {
  const game = createGame(4), finish = finishFor(4);
  game.pieces.yellow = [finish - 1, finish, finish, finish];
  await prepare(page, game, [5]);
  for (let streak = 1; streak <= 4; streak += 1) {
    await page.getByRole('button', { name: streak === 1 ? 'Roll the dice' : 'Roll again' }).click();
    await expect.poll(async () => (await saved(page)).sixes).toBe(streak);
    expect((await saved(page)).current).toBe('yellow');
    await expect(page.getByRole('status')).toContainText('another roll');
  }
  await page.reload();
  expect((await saved(page)).sixes).toBe(4);
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  await page.evaluate(() => Object.defineProperty(window.crypto, 'getRandomValues', {
    configurable: true, value: (array) => { array[0] = 0; return array; },
  }));
  await page.getByRole('button', { name: 'Roll again' }).click();
  await expect(page.getByRole('dialog')).toContainText('Yellow takes the crown!');
});

test('the rules no longer mention a consecutive-six penalty', async ({ page }) => {
  await prepare(page, createGame(), [0]);
  await page.getByRole('button', { name: 'How to play' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('A 6 earns another roll.');
  await expect(dialog).not.toContainText(/three sixes|fair start|guarantee|assistance/i);
});

test('each player’s missed turns are counted separately and survive a reload before the tenth turn', async ({ page }) => {
  test.setTimeout(90_000);
  // Byte 6 produces non-six results in all non-guaranteed distributions.
  await prepare(page, createGame(4), [6]);
  const colors = ['yellow', 'red', 'blue', 'green'];
  for (let attempt = 1; attempt <= 9; attempt += 1) {
    for (let i = 0; i < colors.length; i += 1) {
      const color = colors[i];
      await expect(page.locator('.turn-card h2')).toContainText(color[0].toUpperCase() + color.slice(1));
      await page.getByRole('button', { name: 'Roll the dice' }).click();
      await expect.poll(async () => (await saved(page)).rollsWithoutSix[color]).toBe(attempt);
      expect((await saved(page)).current).toBe(colors[(i + 1) % colors.length]);
    }
  }
  expect((await saved(page)).rollsWithoutSix).toEqual({ yellow: 9, red: 9, blue: 9, green: 9 });
  await page.reload();
  await expect(page.locator('.turn-card h2')).toContainText('Yellow');
  expect((await saved(page)).rollsWithoutSix).toEqual({ yellow: 9, red: 9, blue: 9, green: 9 });
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect.poll(async () => (await saved(page)).pieces.yellow[0]).toBe(0);
  expect((await saved(page)).rollsWithoutSix).toEqual({ yellow: 0, red: 9, blue: 9, green: 9 });
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Yes, new game' }).click();
  await expect.poll(async () => (await saved(page)).rollsWithoutSix).toEqual({ yellow: 0, red: 0, blue: 0, green: 0 });
});
