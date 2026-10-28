import { expect, test } from '@playwright/test';
import { createGame, finishFor, rollDice, startFor, trackLengthFor } from '../src/game.js';

const gameKey = 'ludo-club-game-v1';
const choiceKey = 'ludo-club-characters-v1';
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), gameKey);
async function seed(page, game) {
  await page.addInitScript(([key, state]) => localStorage.setItem(key, JSON.stringify(state)), [gameKey, game]);
}
async function rolls(page, values) {
  await page.addInitScript((numbers) => {
    let index = 0;
    Object.defineProperty(window.crypto, 'getRandomValues', {
      value: (array) => { array[0] = (numbers[index++] ?? 2) - 1; return array; },
    });
  }, values);
}
async function withoutWebGL(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
}
async function startMode(page, count) {
  await page.getByRole('button', { name: 'New game' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: `${count} players` }).check({ force: true });
  await dialog.getByRole('button', { name: 'Yes, new game' }).click();
  await expect(page.locator('.board')).toHaveAttribute('data-player-count', String(count));
}
async function expectBoard(page, count, visiblePieces = count * 4) {
  const board = page.locator('.board');
  await expect(board).toHaveAttribute('data-player-count', String(count));
  await expect(board.locator('.game-piece')).toHaveCount(visiblePieces);
  await expect(page.locator('.player-card')).toHaveCount(count);
  await expect(page.locator('.page-heading p')).toContainText(`${count === 4 ? 'Four' : count === 5 ? 'Five' : 'Six'} colors`);
  if (count === 4) {
    await expect(board.locator('.board-home')).toHaveCount(4);
    await expect(board.locator('.radial-board')).toHaveCount(0);
  } else {
    await expect(board.locator('.radial-board [data-yard]')).toHaveCount(count);
    await expect(board.locator('.radial-board [data-track-cell]')).toHaveCount(count * 10);
    await expect(board.locator('.radial-board [data-lane]')).toHaveCount(count * 5);
  }
}

test('five- and six-player boards switch and retain independent team choices', async ({ page }) => {
  test.setTimeout(180_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.character-canvas canvas')).toBeVisible({ timeout: 45_000 });
  await expect(page.locator('.game-piece img')).toHaveCount(0, { timeout: 45_000 });
  await expectBoard(page, 4);

  await page.getByRole('button', { name: 'New game' }).click();
  const selector = page.getByRole('dialog');
  await expect(selector.getByRole('radio', { name: '4 players' })).toBeChecked();
  // Choosing without confirming must not disturb the existing game.
  await selector.getByText('Five-arm board').click();
  await expect(selector.getByRole('radio', { name: '5 players' })).toBeChecked();
  await selector.getByRole('button', { name: 'Keep playing' }).click();
  await expectBoard(page, 4);
  await startMode(page, 5);
  await expectBoard(page, 5);
  await expect(page.locator('.character-fallback-note')).toHaveCount(0);

  await page.getByRole('button', { name: /Choose characters/ }).click();
  let dialog = page.getByRole('dialog');
  await dialog.locator('[data-team="purple"]').click();
  await dialog.getByRole('button', { name: 'Choose Dog for Purple' }).click();
  await dialog.getByRole('button', { name: 'Done, let’s play' }).click();
  await expect(page.locator('.game-piece--purple[data-character-type="dog"]')).toHaveCount(4);
  await startMode(page, 6);
  await expectBoard(page, 6);
  await expect(page.locator('.character-fallback-note')).toHaveCount(0);
  await page.getByRole('button', { name: /Choose characters/ }).click();
  dialog = page.getByRole('dialog');
  await dialog.locator('[data-team="orange"]').click();
  await dialog.getByRole('button', { name: 'Choose Dog for Orange' }).click();
  await dialog.getByRole('button', { name: 'Done, let’s play' }).click();
  await expect(page.locator('.game-piece--purple[data-character-type="dog"]')).toHaveCount(4);
  await expect(page.locator('.game-piece--orange[data-character-type="dog"]')).toHaveCount(4);
  await expect.poll(() => saved(page)).toMatchObject({ playerCount: 6 });
  const choices = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), choiceKey);
  expect(choices).toMatchObject({ purple: 'dog', orange: 'dog' });

  await page.reload();
  await expectBoard(page, 6);
  await expect(page.locator('.game-piece img')).toHaveCount(0, { timeout: 45_000 });
  await expect(page.locator('.game-piece--orange[data-character-type="dog"]')).toHaveCount(4);
  await startMode(page, 4);
  await expectBoard(page, 4);
  await startMode(page, 5);
  await expectBoard(page, 5);
  await expect(page.locator('.game-piece--purple[data-character-type="dog"]')).toHaveCount(4);
  expect(errors).toEqual([]);
});

test('a legacy save with no player count resumes on the unchanged classic board', async ({ page }) => {
  await withoutWebGL(page);
  const legacy = createGame();
  delete legacy.playerCount;
  delete legacy.rollsWithoutSix;
  legacy.current = 'blue';
  legacy.pieces.blue = [15, -1, 51, 56];
  await seed(page, legacy);
  await page.goto('/');
  await expectBoard(page, 4, 15);
  await expect(page.locator('.turn-card h2')).toContainText('Blue');
  await expect(page.locator('[data-character="blue-0"]')).toHaveAttribute('data-progress', '15');
  await expect(page.locator('.player-card--blue')).toContainText('1/4 home');
  await page.reload();
  expect((await saved(page)).pieces.blue).toEqual([15, -1, 51, 56]);
  await expectBoard(page, 4, 15);
});

test('a fifth-team capture walks backward along every square of its own path', async ({ page }) => {
  test.setTimeout(60_000);
  await withoutWebGL(page);
  const initial = createGame(5), length = trackLengthFor(5);
  const target = (startFor('yellow', 5) + 2) % length;
  const purpleProgress = (target - startFor('purple', 5) + length) % length;
  const game = { ...initial, phase: 'choose', roll: 1, lastRollBy: 'yellow', legal: [0, 1],
    pieces: { ...initial.pieces, yellow: [1, 12, -1, -1], purple: [purpleProgress, -1, -1, -1] } };
  await seed(page, game);
  await page.goto('/');
  const victim = page.locator('[data-character="purple-0"]');
  await expect(page.locator('.character-fallback-note')).toBeVisible();
  await victim.evaluate((element) => {
    window.returnTrace = [];
    const observer = new MutationObserver(() => {
      if (element.dataset.pose === 'sad-walk') window.returnTrace.push(Number(element.dataset.progress));
    });
    observer.observe(element, { attributes: true, attributeFilter: ['data-progress', 'data-pose'] });
  });
  await page.locator('[data-character="yellow-0"]').click();
  await expect(victim).toHaveAttribute('data-pose', 'sad');
  await expect(victim).toHaveAttribute('data-pose', 'sad-walk');
  await expect(page.getByRole('status')).toContainText('Purple is heading sadly back');
  await expect.poll(async () => (await saved(page)).pieces.purple[0], { timeout: 15_000 }).toBe(-1);
  const trace = await page.evaluate(() => window.returnTrace);
  for (let progress = purpleProgress - 1; progress >= -1; progress -= 1) expect(trace).toContain(progress);
  expect((await saved(page)).current).toBe('red');
});

for (const [count, color] of [[5, 'purple'], [6, 'orange']]) {
  test(`${count}-player ${color} celebrates a win and a rematch retains the mode`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await withoutWebGL(page);
    const game = createGame(count), finish = finishFor(count);
    game.current = color;
    game.pieces[color] = [finish - 1, finish, finish, finish];
    await seed(page, game);
    await rolls(page, [1]);
    await page.goto('/');
    await expectBoard(page, count, count * 4 - 3);
    await expect(page.locator(`.player-card--${color}`)).toContainText('3/4 home');
    await page.getByRole('button', { name: 'Roll the dice' }).click();
    await expect(page.locator(`[data-character="${color}-0"]`)).toHaveAttribute('data-pose', 'dance');
    await expect(page.getByRole('dialog')).toContainText(`${color === 'purple' ? 'Purple' : 'Orange'} takes the crown!`);
    expect((await saved(page)).pieces[color][0]).toBe(finish);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expectBoard(page, count);
    await expect.poll(() => saved(page)).toMatchObject({ playerCount: count, current: 'yellow' });
  });
}

test('six-player mobile fallback supports six choices and accessible stacked moves', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 850 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withoutWebGL(page);
  const game = createGame(6);
  game.current = 'orange';
  game.pieces.orange = [0, -1, -1, -1];
  await seed(page, game);
  await rolls(page, [6]);
  await page.goto('/');
  await expectBoard(page, 6);
  await expect(page.locator('.character-fallback-note')).toBeVisible();
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(4);
  expect((await saved(page)).pieces.orange).toEqual([0, -1, -1, -1]);
  // A six with a piece already out still waits for the player's choice.
  await page.getByRole('button', { name: /Orange character 2, in the yard/ }).click();
  await expect.poll(async () => (await saved(page)).pieces.orange).toEqual([0, 0, -1, -1]);
  await page.reload();
  await expectBoard(page, 6);
  await page.getByRole('button', { name: /Choose characters/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('[data-team="orange"]').click();
  await dialog.getByRole('button', { name: 'Choose Elephant for Orange' }).click();
  const portrait = dialog.getByRole('button', { name: 'Choose Elephant for Orange' }).locator('img');
  await expect(portrait).toHaveJSProperty('complete', true);
  expect(await portrait.evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
  await dialog.getByRole('button', { name: 'Done, let’s play' }).click();
  await expect(page.locator('.game-piece--orange img')).toHaveCount(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('stacked pieces have a keyboard-accessible alternative for choosing a move', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withoutWebGL(page);
  const game = createGame(6);
  game.current = 'orange';
  game.pieces.orange = [0, 0, 8, -1];
  await seed(page, rollDice(game, 6));
  await page.goto('/');
  const choices = page.getByRole('group', { name: 'Choose a stacked character to move' });
  await expect(choices).toBeVisible();
  await choices.getByRole('button', { name: 'Move Orange character 2' }).click();
  await expect.poll(async () => (await saved(page)).pieces.orange[1]).toBe(6);
  expect((await saved(page)).playerCount).toBe(6);
});

test('extra-team portraits recover to team-colored cutouts when an image fails', async ({ page }) => {
  await withoutWebGL(page);
  await seed(page, createGame(6));
  await page.route('**/assets/characters/grandpa-purple.webp', (route) => route.abort());
  await page.route('**/assets/characters/grandma-orange.webp', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.character-fallback-note')).toBeVisible();
  for (const color of ['purple', 'orange']) {
    const image = page.locator(`.game-piece--${color} img`).first();
    await expect(image).toHaveAttribute('src', `/assets/${color}-player-cutout.webp`);
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
  }
});

test('a six-player capture can retrace a path longer than the classic track', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withoutWebGL(page);
  const initial = createGame(6);
  // Orange progress 57 and yellow progress 47 meet on an unsafe track cell.
  const game = { ...initial, phase: 'choose', roll: 1, lastRollBy: 'yellow', legal: [0, 1],
    pieces: { ...initial.pieces, yellow: [46, 2, -1, -1], orange: [57, -1, -1, -1] } };
  await seed(page, game);
  await page.goto('/');
  const victim = page.locator('[data-character="orange-0"]');
  await victim.evaluate((element) => {
    window.longReturn = [];
    new MutationObserver(() => {
      if (element.dataset.pose === 'sad-walk') window.longReturn.push(Number(element.dataset.progress));
    }).observe(element, { attributes: true, attributeFilter: ['data-progress', 'data-pose'] });
  });
  await page.locator('[data-character="yellow-0"]').click();
  await expect.poll(async () => (await saved(page)).pieces.orange[0], { timeout: 12_000 }).toBe(-1);
  const trace = await page.evaluate(() => window.longReturn);
  expect(trace[0]).toBeGreaterThan(50);
  expect(trace.at(-1)).toBe(-1);
  expect(trace.every((value, index) => index === 0 || value < trace[index - 1])).toBe(true);
});

test('an automatic six resumes after reloading a six-player rolled state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withoutWebGL(page);
  const game = createGame(6);
  game.current = 'orange';
  game.pieces.orange = [finishFor(6), -1, -1, -1];
  await seed(page, rollDice(game, 6));
  await page.goto('/');
  await expect.poll(async () => (await saved(page)).pieces.orange).toEqual([finishFor(6), 0, -1, -1]);
  await expect(page.locator('.turn-card h2')).toContainText('Orange');
  await expect(page.locator('[data-character="orange-1"]')).toHaveAttribute('data-progress', '0');
});

test('the player-count selector is usable with the keyboard', async ({ page }) => {
  await withoutWebGL(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'New game' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('radio', { name: '4 players' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('radio', { name: '5 players' })).toBeChecked();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Yes, new game' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expectBoard(page, 5);
});
