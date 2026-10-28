import { expect, test } from '@playwright/test';
import { colorsFor, createGame, finishFor, movePiece, rollDice } from '../src/game.js';
import { PENDING_MOVE_KEY } from '../src/gamePersistence.js';

const gameKey = 'ludo-club-game-v1';
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), gameKey);
const journal = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), PENDING_MOVE_KEY);

async function configure(page, { game, rolls = [1] } = {}) {
  await page.addInitScript(({ gameKey, game, rolls }) => {
    if (game && !localStorage.getItem(gameKey)) localStorage.setItem(gameKey, JSON.stringify(game));
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
    let index = 0;
    Object.defineProperty(window.crypto, 'getRandomValues', { configurable: true, value(array) {
      array[0] = rolls[Math.min(index++, rolls.length - 1)] - 1;
      return array;
    } });
    const setItem = Storage.prototype.setItem;
    window.gameWrites = [];
    Storage.prototype.setItem = function (key, value) {
      if (key === gameKey) window.gameWrites.push(JSON.parse(value));
      return setItem.call(this, key, value);
    };
    window.setSimulatedHidden = (hidden) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
      document.dispatchEvent(new Event('visibilitychange'));
    };
  }, { gameKey, game, rolls });
}

async function resume(page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
}

for (const count of [2, 3, 4]) {
  test(`${count}-player solo setup uses the Classic board and all computer seats take a turn`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await configure(page);
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Play with friends' })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Play with computer' }).click();
    await expect(page.getByRole('radio')).toHaveCount(3);
    await expect(page.getByRole('radio', { name: '5 players' })).toHaveCount(0);
    await page.locator(`.lobby-count-option:has(input[value="${count}"])`).click();
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.locator('.crew-card')).toHaveCount(count);
    await expect(page.locator('[data-player-index="0"]')).toContainText('You');
    for (let i = 1; i < count; i++) await expect(page.locator(`[data-player-index="${i}"]`)).toContainText(`Computer ${i}`);
    await page.getByRole('button', { name: 'Choose Dog for You' }).click();
    await page.locator('[data-player-index="1"]').click();
    await page.getByRole('button', { name: 'Choose Dog for Computer 1' }).click();
    await page.getByRole('button', { name: 'Choose Purple for Computer 1' }).click();
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.locator('.board--classic')).toBeVisible();
    await expect(page.locator('.player-card')).toHaveCount(count);
    await expect(page.locator('.player-card').first()).toContainText('You');
    await expect(page.locator('.player-card').nth(1)).toContainText('Computer 1');
    await expect(page.locator('.game-piece[data-character-type="dog"]')).toHaveCount(8);
    expect(await saved(page)).toMatchObject({ mode: 'computer', playerCount: count });
    await page.getByRole('button', { name: 'Roll the dice' }).click();
    // Everyone rolls a one, so their unopened yards pass back to the human.
    await expect.poll(async () => {
      const state = await saved(page);
      return colorsFor(count).map((seat) => state.rollsWithoutSix[seat]);
    }).toEqual(Array(count).fill(1));
    await expect(page.locator('.turn-card h2')).toContainText('Yellow');
    await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await expect(page.locator('.saved-game-note')).toContainText('vs computer');
    await page.reload();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.locator('.player-card').nth(1)).toContainText('Computer 1');
    expect((await saved(page)).mode).toBe('computer');
  });
}

test('mode switching keeps local play for five and six while solo stays on two to four', async ({ page }) => {
  await configure(page);
  await page.goto('/');
  await page.locator('.lobby-count-option:has(input[value="6"])').click();
  await page.getByRole('button', { name: 'Play with computer' }).click();
  await expect(page.getByRole('radio', { name: '4 players' })).toBeChecked();
  await expect(page.getByRole('radio')).toHaveCount(3);
  await page.getByRole('button', { name: 'Play with friends' }).click();
  await expect(page.getByRole('radio')).toHaveCount(5);
  await expect(page.getByRole('radio', { name: '6 players' })).toBeVisible();
});

test('a computer makes a strategic capture and humans cannot choose its pieces', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const initial = createGame(2, undefined, 'computer');
  initial.current = 'blue';
  initial.pieces.blue = [2, 8, -1, -1];
  initial.pieces.yellow = [30, -1, -1, -1];
  const before = rollDice(initial, 2), after = movePiece(before, 0);
  await configure(page, { game: before });
  await resume(page);
  await expect(page.locator('.roll-button')).toBeDisabled();
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(0);
  await expect(page.locator('#move-choices')).toHaveCount(0);
  await expect.poll(() => journal(page)).toMatchObject({ before, index: 0 });
  await expect.poll(() => saved(page), { timeout: 15_000 }).toEqual(after);
  expect(after.pieces.yellow[0]).toBe(-1);
  expect(await journal(page)).toBeNull();
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
});

test('a computer gets four consecutive sixes and plays every extra roll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  await configure(page, { game, rolls: [6, 6, 6, 6, 1] });
  await resume(page);
  await expect.poll(async () => (await saved(page)).current, { timeout: 20_000 }).toBe('yellow');
  const writes = await page.evaluate(() => window.gameWrites);
  expect(writes.some((state) => state.current === 'blue' && state.sixes >= 4)).toBe(true);
  expect(writes.filter((state) => state.lastRollBy === 'blue' && state.roll === 6).length).toBeGreaterThanOrEqual(4);
  expect((await saved(page)).pieces.blue.some((piece) => piece >= 0)).toBe(true);
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
});

test('computer actions wait behind a dialog and while the page is hidden or suspended', async ({ page }) => {
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  await configure(page, { game });
  await resume(page);
  await page.locator('.main-nav').getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('dialog')).toContainText('computer takes its turns automatically');
  await page.waitForTimeout(900);
  expect(await saved(page)).toEqual(game);
  await page.evaluate(() => window.setSimulatedHidden(true));
  await page.getByRole('button', { name: 'Got it, let’s play!' }).click();
  await page.waitForTimeout(900);
  expect(await saved(page)).toEqual(game);
  await page.evaluate(() => window.setSimulatedHidden(false));
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await page.waitForTimeout(900);
  expect(await saved(page)).toEqual(game);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect.poll(async () => (await saved(page)).current).toBe('yellow');
  expect((await saved(page)).rollsWithoutSix.blue).toBe(1);
});

test('home cancels a waiting computer and resume continues it once', async ({ page }) => {
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  await configure(page, { game });
  await resume(page);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.waitForTimeout(900);
  expect(await saved(page)).toEqual(game);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(async () => (await saved(page)).current).toBe('yellow');
  expect((await saved(page)).rollsWithoutSix.blue).toBe(1);
  await page.waitForTimeout(900);
  expect((await saved(page)).rollsWithoutSix.blue).toBe(1);
});

test('a journaled computer move survives home/resume and refresh without being duplicated', async ({ page }) => {
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  game.pieces.blue = [1, 12, -1, -1];
  const before = rollDice(game, 2);
  await configure(page, { game: before });
  await resume(page);
  await expect.poll(() => journal(page)).not.toBeNull();
  const pending = await journal(page);
  const after = movePiece(before, pending.index);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(await saved(page)).toEqual(before);
  expect(await journal(page)).toEqual(pending);
  await page.waitForTimeout(900);
  expect(await saved(page)).toEqual(before);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(() => saved(page)).toEqual(after);
  expect(await journal(page)).toBeNull();
  await page.reload();
  expect(await saved(page)).toEqual(after);
});

test('refresh during a computer move recovers the journal once and keeps solo mode', async ({ page }) => {
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  game.pieces.blue = [1, 12, -1, -1];
  const before = rollDice(game, 2);
  await configure(page, { game: before });
  await resume(page);
  await expect.poll(() => journal(page)).not.toBeNull();
  const pending = await journal(page), after = movePiece(before, pending.index);
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(after);
  expect(await journal(page)).toBeNull();
  await page.reload();
  expect(await saved(page)).toEqual(after);
  await expect(page.locator('.player-card').nth(1)).toContainText('Computer 1');
});

test('new games keep the solo mode and restrict computer games to the classic board', async ({ page }) => {
  const game = createGame(2, undefined, 'computer');
  await configure(page, { game });
  await resume(page);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('radio')).toHaveCount(3);
  await page.locator('.player-count-option:has(input[value="3"])').click();
  await page.getByRole('button', { name: 'Yes, new game' }).click();
  await expect(page.locator('[data-player-index="2"]')).toContainText('Computer 2');
  await page.getByRole('button', { name: 'Start game' }).click();
  expect(await saved(page)).toMatchObject({ mode: 'computer', playerCount: 3 });
});

test('a solo rematch keeps the computer opponent and colors', async ({ page }) => {
  const game = createGame(2, { yellow: 'orange', blue: 'purple' }, 'computer');
  game.current = 'blue';
  game.winner = 'blue';
  game.phase = 'won';
  game.pieces.blue = Array(4).fill(finishFor(2));
  await configure(page, { game });
  await resume(page);
  await expect(page.getByRole('dialog')).toContainText('Purple computer takes the crown!');
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect.poll(() => saved(page)).toMatchObject({ mode: 'computer', playerCount: 2, phase: 'roll', teamColors: { yellow: 'orange', blue: 'purple' } });
  await expect(page.locator('.player-card').nth(1)).toContainText('Computer 1');
});

test('a restored automatic computer move waits until a hidden page becomes visible', async ({ page }) => {
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  const before = rollDice(game, 6);
  await configure(page, { game: before, rolls: [1] });
  await page.goto('/');
  await page.evaluate(() => window.setSimulatedHidden(true));
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForTimeout(800);
  expect(await saved(page)).toEqual(before);
  expect(await journal(page)).toBeNull();
  await page.evaluate(() => window.setSimulatedHidden(false));
  await expect.poll(async () => (await saved(page)).pieces.blue[0]).toBeGreaterThanOrEqual(0);
});

test('a computer can bring its last character home and win', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  game.pieces.blue = [finishFor(2) - 2, finishFor(2), finishFor(2), finishFor(2)];
  const before = rollDice(game, 2);
  await configure(page, { game: before });
  await resume(page);
  await expect(page.getByRole('dialog')).toContainText('Blue computer takes the crown!');
  expect(await saved(page)).toMatchObject({ mode: 'computer', phase: 'won', winner: 'blue' });
});
