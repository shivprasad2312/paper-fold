import { expect, test } from '@playwright/test';
import { colorsFor, createGame, finishFor, rollDice } from '../src/game.js';

const gameKey = 'ludo-club-game-v1';
const characterKey = 'ludo-club-characters-v1';

async function withoutWebGL(page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
}

async function seedGame(page, game) {
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value));
  }, { key: gameKey, value: game });
}

async function fixedRolls(page, values) {
  await page.addInitScript((rolls) => {
    let index = 0;
    window.crypto.getRandomValues = (array) => { array[0] = rolls[Math.min(index++, rolls.length - 1)] - 1; return array; };
  }, values);
}

async function selectCount(page, count) {
  await page.locator(`.lobby-count-option:has(input[value="${count}"])`).click();
  await expect(page.getByRole('radio', { name: `${count} players` })).toBeChecked();
}

async function savedGame(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), gameKey);
}

async function noHorizontalOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}

test('home offers every player count and setup is a non-destructive draft', async ({ page }) => {
  await withoutWebGL(page);
  await page.goto('/');
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await expect(page.locator('[data-screen-title]')).toBeFocused();
  expect(await page.locator('[data-screen-title]').evaluate((title) => getComputedStyle(title).outlineStyle)).toBe('none');
  await expect(page.getByRole('radio')).toHaveCount(5);
  for (const count of [2, 3, 4, 5, 6]) await expect(page.getByRole('radio', { name: `${count} players` })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled();
  expect(await savedGame(page)).toBeNull();
  await selectCount(page, 3);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('[data-screen="setup"]')).toBeVisible();
  await expect(page.locator('[data-screen-title]')).toBeFocused();
  await expect(page.locator('.crew-card')).toHaveCount(3);
  await page.getByRole('button', { name: 'Choose Dog for Player 1' }).click();
  expect(await savedGame(page)).toBeNull();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Dog for Player 1' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await expect.poll(() => savedGame(page)).toMatchObject({ playerCount: 3, current: 'yellow' });
});

test('saved games survive changing a draft, returning home and resuming', async ({ page }) => {
  await withoutWebGL(page);
  const original = createGame(4);
  original.pieces.yellow[0] = 17;
  original.pieces.blue[2] = 12;
  original.current = 'red';
  await seedGame(page, original);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  await selectCount(page, 6);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Dog for Player 1' }).click();
  await page.getByRole('button', { name: 'Choose Purple for Player 1, swaps with Player 5' }).click();
  expect(await savedGame(page)).toEqual(original);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.turn-card h2')).toContainText('Red');
  await expect(page.locator('.player-card')).toHaveCount(4);
  expect(await savedGame(page)).toEqual(original);
  await page.reload();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  expect(await savedGame(page)).toEqual(original);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('[data-screen="home"]')).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.turn-card h2')).toContainText('Red');
  expect(await savedGame(page)).toEqual(original);
});

test('characters can be shared and occupied colors swap throughout a two-player game', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withoutWebGL(page);
  await fixedRolls(page, [6, 1]);
  await page.goto('/');
  await selectCount(page, 2);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const swatches = await page.locator('.color-option-swatch').evaluateAll((items) => items.map((item) => getComputedStyle(item).backgroundColor));
  expect(new Set(swatches).size).toBe(6);
  await page.getByRole('button', { name: 'Choose Dog for Player 1' }).click();
  await page.getByRole('button', { name: 'Choose Purple for Player 1' }).click();
  await page.locator('[data-player-index="1"]').click();
  await page.getByRole('button', { name: 'Choose Dog for Player 2' }).click();
  await page.getByRole('button', { name: 'Choose Purple for Player 2, swaps with Player 1' }).click();
  await expect(page.locator('[data-player-index="0"]')).toContainText('Red');
  await expect(page.locator('[data-player-index="1"]')).toContainText('Purple');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('.game-piece[data-color="red"][data-character-type="dog"]')).toHaveCount(4);
  await expect(page.locator('.game-piece[data-color="purple"][data-character-type="dog"]')).toHaveCount(4);
  await expect(page.locator('[data-home-seat="yellow"]')).toHaveAttribute('data-home-color', 'red');
  await expect(page.locator('[data-home-seat="blue"]')).toHaveAttribute('data-home-color', 'purple');
  await expect(page.locator('.board-home--empty')).toHaveCount(2);
  await expect.poll(() => savedGame(page)).toMatchObject({ playerCount: 2, teamColors: { yellow: 'red', blue: 'purple' } });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), characterKey)).toMatchObject({ yellow: 'dog', blue: 'dog' });
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect.poll(async () => (await savedGame(page)).pieces.yellow[0]).toBe(0);
  await page.getByRole('button', { name: 'Roll again' }).click();
  await expect.poll(async () => (await savedGame(page)).pieces.yellow[0]).toBe(1);
  await expect(page.locator('.turn-card h2')).toContainText('Purple');
  expect((await savedGame(page)).current).toBe('blue');
});

for (const count of [2, 3, 4, 5, 6]) {
  test(`${count} players start with custom colors and take real turns`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await withoutWebGL(page);
    await fixedRolls(page, [1]);
    await page.goto('/');
    await selectCount(page, count);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const orange = page.getByRole('button', { name: count === 6 ? 'Choose Orange for Player 1, swaps with Player 6' : 'Choose Orange for Player 1' });
    await orange.click();
    await page.getByRole('button', { name: 'Start game' }).click();
    await expect(page.locator('.player-card')).toHaveCount(count);
    await expect(page.locator('.game-piece')).toHaveCount(count * 4);
    await expect(page.locator('.game-piece[data-color="orange"]')).toHaveCount(4);
    await expect(page.locator('.turn-card h2')).toContainText('Orange');
    if (count <= 4) {
      await expect(page.locator('[data-home-seat="yellow"]')).toHaveAttribute('data-home-color', 'orange');
      await expect(page.locator('.board-home--empty')).toHaveCount(4 - count);
    } else {
      await expect(page.locator('[data-yard="yellow"]')).toContainText('ORANGE');
      await expect(page.locator('[data-lane="yellow"] rect').first()).toHaveAttribute('fill', '#efa65f');
    }
    await page.getByRole('button', { name: 'Roll the dice' }).click();
    await expect.poll(async () => (await savedGame(page)).current).toBe(colorsFor(count)[1]);
    expect((await savedGame(page)).teamColors.yellow).toBe('orange');
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.locator('.game-piece[data-color="orange"]')).toHaveCount(4);
    expect((await savedGame(page)).current).toBe(colorsFor(count)[1]);
  });
}

test('leaving during an automatic move cancels the animation and resumes it once', async ({ page }) => {
  await withoutWebGL(page);
  const rolled = rollDice(createGame(2, { yellow: 'orange', blue: 'purple' }), 6);
  await seedGame(page, rolled);
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('[data-character="yellow-0"]')).toHaveAttribute('data-pose', 'walk');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(await savedGame(page)).toEqual(rolled);
  await page.waitForTimeout(900);
  expect(await savedGame(page)).toEqual(rolled);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect.poll(async () => (await savedGame(page)).pieces.yellow[0]).toBe(0);
  expect((await savedGame(page)).phase).toBe('roll');
  expect((await savedGame(page)).teamColors).toEqual({ yellow: 'orange', blue: 'purple' });
});

test('resuming a finished game focuses the winner dialog and rematch keeps colors', async ({ page }) => {
  await withoutWebGL(page);
  const game = createGame(2, { yellow: 'purple', blue: 'orange' });
  game.pieces.yellow = Array(4).fill(finishFor(2));
  game.phase = 'won';
  game.winner = 'yellow';
  await seedGame(page, game);
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Purple takes the crown!');
  await expect(dialog.getByRole('button', { name: 'Play again' })).toBeFocused();
  await dialog.getByRole('button', { name: 'Play again' }).click();
  await expect.poll(() => savedGame(page)).toMatchObject({ playerCount: 2, phase: 'roll', teamColors: { yellow: 'purple', blue: 'orange' } });
});

test('the move chooser provides 48-pixel targets for every legal piece on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await withoutWebGL(page);
  const game = createGame(2, { yellow: 'purple', blue: 'orange' });
  game.pieces.yellow[0] = 0;
  await seedGame(page, game);
  await fixedRolls(page, [6]);
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  const group = page.getByRole('group', { name: 'Choose a character to move' });
  await expect(group.getByRole('button')).toHaveCount(4);
  for (const button of await group.getByRole('button').all()) {
    const rect = await button.boundingBox();
    expect(rect.width).toBeGreaterThanOrEqual(48);
    expect(rect.height).toBeGreaterThanOrEqual(48);
  }
  await group.getByRole('button', { name: 'Move Purple character 4' }).click();
  await expect.poll(async () => (await savedGame(page)).pieces.yellow[3]).toBe(0);
});

test('returning from play starts a fresh setup based on the latest in-game character', async ({ page }) => {
  await withoutWebGL(page);
  await seedGame(page, createGame(4));
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Dog for Player 1' }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: /Choose characters/ }).click();
  await page.getByRole('button', { name: 'Animals', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Cat for Yellow' }).click();
  await page.getByRole('button', { name: 'Done, let’s play' }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: 'Yes, new game' }).click();
  await expect(page.getByRole('button', { name: 'Choose Cat for Player 1' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Choose Cat for Player 1' })).toHaveAttribute('aria-pressed', 'true');
});

test('keyboard users can select a player count and navigate between screens', async ({ page }) => {
  await withoutWebGL(page);
  await page.goto('/');
  const four = page.getByRole('radio', { name: '4 players' });
  await four.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: '5 players' })).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-screen-title]')).toBeFocused();
  await page.getByRole('button', { name: 'Back', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-screen="home"] [data-screen-title]')).toBeFocused();
});

for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [1024, 768]]) {
  test(`lobby, setup and game fit a ${width}×${height} viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await withoutWebGL(page);
    await page.goto('/');
    await noHorizontalOverflow(page);
    await selectCount(page, 6);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await noHorizontalOverflow(page);
    await expect(page.locator('.crew-card')).toHaveCount(6);
    await expect(page.locator('.color-option')).toHaveCount(6);
    await page.getByRole('button', { name: 'Choose Orange for Player 1, swaps with Player 6' }).click();
    await page.getByRole('button', { name: 'Start game' }).click();
    await noHorizontalOverflow(page);
    await expect(page.locator('.game-piece')).toHaveCount(24);
    for (const name of ['Home', 'Roll the dice', 'New game']) {
      const rect = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(rect.width, name).toBeGreaterThanOrEqual(48);
      expect(rect.height, name).toBeGreaterThanOrEqual(48);
    }
  });
}

test('WebGL figures and radial board use the chosen team colors', async ({ page }) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await selectCount(page, 5);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Choose Dog for Player 1' }).click();
  await page.getByRole('button', { name: 'Choose Purple for Player 1, swaps with Player 5' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('.character-canvas canvas')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('.game-piece img')).toHaveCount(0, { timeout: 90_000 });
  await expect(page.locator('.character-fallback-note')).toHaveCount(0);
  await expect(page.locator('.game-piece[data-color="purple"][data-character-type="dog"]')).toHaveCount(4);
  await expect(page.locator('[data-yard="yellow"]')).toContainText('PURPLE');
  await expect(page.locator('[data-lane="yellow"] rect').first()).toHaveAttribute('fill', '#ad8cd9');
  await expect.poll(() => savedGame(page)).toMatchObject({ playerCount: 5, teamColors: { yellow: 'purple', purple: 'yellow' } });
});
