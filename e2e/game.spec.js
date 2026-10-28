import { expect, test } from '@playwright/test';
import { createGame } from '../src/game.js';

const storageKey = 'ludo-club-game-v1';

async function setRolls(page, values) {
  await page.addInitScript((rolls) => {
    let index = 0;
    Object.defineProperty(window.crypto, 'getRandomValues', {
      value: (array) => { array[0] = (rolls[index++] ?? 2) - 1; return array; },
    });
  }, values);
}

async function savedGame(page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)), storageKey);
}

async function seedGame(page, game) {
  await page.addInitScript(([key, state]) => localStorage.setItem(key, JSON.stringify(state)), [storageKey, game]);
}

async function waitForCharacters(page) {
  await expect(page.locator('.character-canvas canvas')).toBeVisible();
  // The sprite fallback is removed after the first fully rendered frame.
  await expect(page.locator('.game-piece img')).toHaveCount(0);
}

function captureGame() {
  const initial = createGame();
  return {
    ...initial, phase: 'choose', roll: 2, lastRollBy: 'yellow', legal: [0],
    pieces: { ...initial.pieces, yellow: [1, -1, -1, -1], red: [42, -1, -1, -1] },
  };
}

function winningGame() {
  const initial = createGame();
  return {
    ...initial, current: 'blue', phase: 'choose', roll: 1, lastRollBy: 'blue', legal: [0],
    pieces: { ...initial.pieces, blue: [55, 56, 56, 56] },
  };
}

test('rolls, moves a character, passes turns, and restores a saved game', async ({ page }) => {
  await setRolls(page, [6, 3]);
  await page.goto('/');
  await waitForCharacters(page);
  await expect(page.locator('.game-piece')).toHaveCount(16);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(4);
  await page.getByRole('button', { name: /Yellow character 1, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(0);

  await page.getByRole('button', { name: 'Roll again' }).click();
  await page.getByRole('button', { name: /Yellow character 1, on space/ }).click();
  await expect(page.getByText("Red, it's your turn to roll!")).toBeVisible();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(3);
  await page.reload();
  await expect(page.locator('.turn-card h2')).toContainText('Red');
  await expect(page.locator('.game-piece--yellow.game-piece--track')).toHaveCount(1);
});

test('the 3D view stays playable and shares the same game state', async ({ page }) => {
  await setRolls(page, [6, 6]);
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await page.getByRole('button', { name: /Yellow character 1, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  await page.getByRole('button', { name: '3D view' }).click();
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Roll again' }).click();
  await page.getByRole('button', { name: 'Move Yellow character 2' }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([0, 0, -1, -1]);
  await page.getByRole('button', { name: 'Classic' }).click();
  await expect(page.locator('.game-piece--yellow.game-piece--track')).toHaveCount(2);
});

test('characters can be selected directly on the 3D board', async ({ page }) => {
  const initial = createGame();
  await seedGame(page, { ...initial, phase: 'choose', roll: 6, lastRollBy: 'yellow', legal: [0, 1, 2, 3], sixes: 1 });
  await page.goto('/');
  await page.getByRole('button', { name: '3D view' }).click();
  const canvas = page.locator('.three-board-frame canvas');
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('button', { name: 'Move Yellow character 1' })).toBeVisible();
  // Project the first yard figure through the board's default orthographic camera.
  const box = await canvas.boundingBox();
  const up = 22 / Math.hypot(21, 22);
  const depth = 21 / Math.hypot(21, 22);
  const x = box.x + box.width * (0.5 - 5.75 / 19.6);
  const y = box.y + box.height * (0.5 - (1.2 * up + 5.75 * depth) / 19.6);
  await page.mouse.move(x, y);
  await expect(canvas).toHaveCSS('cursor', 'pointer');
  await page.mouse.click(x, y);
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(0);
});

test('rules and reset dialogs support keyboard focus and cancellation', async ({ page }) => {
  await page.goto('/');
  await waitForCharacters(page);
  const rules = page.getByRole('button', { name: 'How to play' }).first();
  await rules.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Got it, let’s play!' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(rules).toBeFocused();

  const newGame = page.getByRole('button', { name: 'New game' });
  await newGame.click();
  await expect(page.getByRole('button', { name: 'Keep playing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(newGame).toBeFocused();
  await newGame.click();
  await page.getByRole('button', { name: 'Yes, new game' }).click();
  await expect(page.locator('.turn-card h2')).toContainText('Yellow');
});

test('finishing the fourth character shows a winner and allows a rematch', async ({ page }) => {
  await seedGame(page, winningGame());
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: /Blue character 1, on space/ }).click();
  await expect(page.locator('[data-character="blue-0"]')).toHaveAttribute('data-pose', 'dance');
  await expect(page.getByRole('status')).toContainText('Time to celebrate');
  await expect(page.locator('.game-piece[data-pose="sad"]')).toHaveCount(12);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await savedGame(page)).pieces.blue[0]).toBe(55);
  await expect(page.getByRole('dialog').getByText('Blue takes the crown!')).toBeVisible();
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.locator('.turn-card h2')).toContainText('Yellow');
  expect((await savedGame(page)).pieces.blue).toEqual([-1, -1, -1, -1]);
});

test('every character celebrates reaching home, not just the fourth', async ({ page }) => {
  const game = winningGame();
  game.pieces.blue = [55, -1, -1, -1];
  await seedGame(page, game);
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: /Blue character 1, on space/ }).click();
  await expect(page.locator('[data-character="blue-0"]')).toHaveAttribute('data-pose', 'dance');
  await expect(page.getByRole('status')).toContainText('Time to celebrate');
  await expect(page.getByRole('status')).toContainText('Blue made it home! Green is up next.');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await savedGame(page)).pieces.blue[0]).toBe(56);
});

test('a winning character dances in 3D before the winner is announced', async ({ page }) => {
  await seedGame(page, winningGame());
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: '3D view' }).click();
  await expect(page.locator('.three-board-frame canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Move Blue character 1' }).click();
  await expect(page.getByRole('status')).toContainText('Time to celebrate');
  await expect(page.locator('.three-reaction')).toContainText('Blue made it home!');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('dialog').getByText('Blue takes the crown!')).toBeVisible();
});

test('walking follows the route through a corner', async ({ page }) => {
  const initial = createGame();
  const game = {
    ...initial, phase: 'choose', roll: 2, lastRollBy: 'yellow', legal: [0],
    pieces: { ...initial.pieces, yellow: [4, -1, -1, -1] },
  };
  await seedGame(page, game);
  await page.goto('/');
  await waitForCharacters(page);
  const piece = page.locator('[data-character="yellow-0"]');
  await expect(piece).toHaveAttribute('data-heading', '2.356'); // diagonal around the corner
  await piece.click();
  await expect(piece).toHaveAttribute('data-pose', 'walk');
  await expect(page.getByText("Red, it's your turn to roll!")).toBeVisible();
  await expect(piece).toHaveAttribute('data-heading', '3.142'); // now facing up
  expect((await savedGame(page)).pieces.yellow[0]).toBe(6);
});

test('a captured character looks sad and walks back before the move is committed', async ({ page }) => {
  await seedGame(page, captureGame());
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: /Yellow character 1, on space/ }).click();
  const defeated = page.locator('[data-character="red-0"]');
  await expect(defeated).toHaveAttribute('data-pose', 'sad');
  await expect(defeated).toContainText('Oh no!');
  await expect(page.getByRole('status')).toContainText('Red got sent back');
  expect((await savedGame(page)).pieces.red[0]).toBe(42);
  await expect(defeated).toHaveAttribute('data-pose', 'sad-walk');
  await expect(page.getByRole('status')).toContainText('heading sadly back');
  await expect(page.getByRole('status')).toContainText('Yellow made a capture! Red is up next.');
  expect((await savedGame(page)).pieces.red[0]).toBe(-1);
  await expect(defeated).toHaveAttribute('data-pose', 'idle');
});

test('capture reactions also play in 3D and share the result with Classic', async ({ page }) => {
  await seedGame(page, captureGame());
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: '3D view' }).click();
  await expect(page.locator('.three-board-frame canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Move Yellow character 1' }).click();
  await expect(page.getByRole('status')).toContainText('Red got sent back');
  await expect(page.getByRole('status')).toContainText('heading sadly back');
  await expect(page.getByRole('status')).toContainText('Yellow made a capture! Red is up next.');
  await page.getByRole('button', { name: 'Classic' }).click();
  await expect(page.locator('[data-character="red-0"]')).toHaveAttribute('data-pose', 'idle');
  expect((await savedGame(page)).pieces.red[0]).toBe(-1);
});

test('reset cancels a celebration and its pending win', async ({ page }) => {
  await seedGame(page, winningGame());
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: /Blue character 1, on space/ }).click();
  await expect(page.locator('[data-character="blue-0"]')).toHaveAttribute('data-pose', 'dance');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Yes, new game' }).click();
  await page.waitForTimeout(2200); // The cancelled win would have fired by now.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await savedGame(page)).pieces.blue).toEqual([-1, -1, -1, -1]);
  expect((await savedGame(page)).winner).toBe(null);
});

test('reduced-motion players still get a readable celebration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedGame(page, winningGame());
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: /Blue character 1, on space/ }).click();
  await expect(page.getByRole('status')).toContainText('Time to celebrate');
  await expect(page.getByRole('dialog').getByText('Blue takes the crown!')).toBeVisible();
});

test('classic remains playable with static sprites when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : original.call(this, type, ...args);
    };
  });
  await setRolls(page, [6]);
  await page.goto('/');
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await page.getByRole('button', { name: /Yellow character 1, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(0);
  await page.getByRole('button', { name: '3D view' }).click();
  await expect(page.getByText('Your browser couldn’t start the 3D view.')).toBeVisible();
  await page.getByRole('button', { name: 'Return to classic board' }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
});

test('the classic board is visible and usable while graphics are still starting', async ({ page }) => {
  await page.addInitScript(() => {
    const set = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => set(callback, delay === 120 ? 2000 : delay, ...args);
  });
  await page.goto('/');
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
  await waitForCharacters(page);
});

test('a failed character module does not blank the classic game', async ({ page }) => {
  await page.route('**/src/ClassicCharacters.jsx*', (route) => route.abort('failed'));
  await setRolls(page, [6]);
  await page.goto('/');
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await page.getByRole('button', { name: /Yellow character 1, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(0);
});

test('a graphics failure after initialization falls back without losing the game', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      const gl = original.call(this, type, ...args);
      if (type === 'webgl2' && gl && !gl.__testPatched) {
        gl.__testPatched = true;
        const clear = gl.clear;
        let calls = 0;
        gl.clear = function (...values) {
          if (++calls === 3) throw new Error('Simulated GPU failure after startup');
          return clear.apply(this, values);
        };
      }
      return gl;
    };
  });
  await setRolls(page, [6]);
  await page.goto('/');
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.character-canvas canvas')).toHaveCount(0);
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await page.getByRole('button', { name: /Yellow character 1, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(0);
  expect(pageErrors).toEqual([]);
});

test('unavailable browser observers do not break the animated board', async ({ page }) => {
  await page.addInitScript(() => {
    window.IntersectionObserver = class { constructor() { throw new Error('Observer unavailable'); } };
    window.ResizeObserver = class { constructor() { throw new Error('Observer unavailable'); } };
    window.matchMedia = () => { throw new Error('Media queries unavailable'); };
  });
  await page.goto('/');
  await waitForCharacters(page);
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.character-fallback-note')).toHaveCount(0);
});

test('a lost WebGL context restores the playable sprite board', async ({ page }) => {
  await page.goto('/');
  await waitForCharacters(page);
  await page.locator('.character-canvas canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
});

test('a lost 3D context offers a return to the classic board', async ({ page }) => {
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: '3D view' }).click();
  const canvas = page.locator('.three-board-frame canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((element) => element.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.getByText('Your browser couldn’t start the 3D view.')).toBeVisible();
  await page.getByRole('button', { name: 'Return to classic board' }).click();
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
});

test('a failed 3D module offers a return to the classic board', async ({ page }) => {
  await page.route('**/src/ThreeBoard.jsx*', (route) => route.abort('failed'));
  await page.goto('/');
  await waitForCharacters(page);
  await page.getByRole('button', { name: '3D view' }).click();
  await expect(page.getByText('The 3D view couldn’t load, but you can keep playing in Classic.')).toBeVisible();
  await page.getByRole('button', { name: 'Return to classic board' }).click();
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
});

test('a failed entry script shows a useful recovery screen instead of a blank page', async ({ page }) => {
  await page.route('**/src/main.jsx*', (route) => route.abort('failed'));
  await page.goto('/');
  await expect(page.getByText('The game could not load. Check your connection and try again.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reload game' })).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('the board fits and a character can be moved by touch', async ({ page }) => {
    await setRolls(page, [6]);
    await page.goto('/');
    await waitForCharacters(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.getByRole('button', { name: 'Roll the dice' }).tap();
    await page.getByRole('button', { name: /Yellow character 1, in the yard/ }).tap();
    await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
    expect((await savedGame(page)).pieces.yellow[0]).toBe(0);
  });
});
