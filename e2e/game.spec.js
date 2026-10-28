import { expect, test } from '@playwright/test';
import { openGame } from './helpers.js';
import { createGame } from '../src/game.js';

const storageKey = 'ludo-club-game-v1';
const characterStorageKey = 'ludo-club-characters-v1';

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

async function seedChoices(page, choices) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, JSON.stringify(value)), [characterStorageKey, choices]);
}

async function waitForCharacters(page) {
  await expect(page.locator('.character-canvas canvas')).toBeVisible();
  // The sprite fallback is removed after the first fully rendered frame.
  await expect(page.locator('.game-piece img')).toHaveCount(0);
}

function captureGame() {
  const initial = createGame();
  return {
    ...initial, phase: 'choose', roll: 2, lastRollBy: 'yellow', legal: [0, 1],
    pieces: { ...initial.pieces, yellow: [1, 12, -1, -1], red: [42, -1, -1, -1] },
  };
}

function winningGame() {
  const initial = createGame();
  return {
    ...initial, current: 'blue',
    pieces: { ...initial.pieces, blue: [55, 56, 56, 56] },
  };
}

test('rolls, moves a character, passes turns, and restores a saved game', async ({ page }) => {
  await setRolls(page, [6, 6, 3]);
  await openGame(page);
  await waitForCharacters(page);
  await expect(page.locator('.game-piece')).toHaveCount(16);
  await expect(page.locator('.piece-team-marker')).toHaveCount(0);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([0, -1, -1, -1]);

  // A six with one piece already out always asks the player to choose.
  await page.getByRole('button', { name: 'Roll again' }).click();
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(4);
  expect((await savedGame(page)).pieces.yellow).toEqual([0, -1, -1, -1]);
  await page.getByRole('button', { name: /Yellow character 1, on space/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([6, -1, -1, -1]);
  await page.getByRole('button', { name: 'Roll again' }).click();
  await expect(page.getByText("Red, it's your turn to roll!")).toBeVisible();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(9);
  await page.reload();
  await expect(page.locator('.turn-card h2')).toContainText('Red');
  await expect(page.locator('.game-piece--yellow.game-piece--track')).toHaveCount(1);
});

test('a six with one active character allows bringing out another instead', async ({ page }) => {
  const initial = createGame();
  await seedGame(page, { ...initial, pieces: { ...initial.pieces, yellow: [0, -1, -1, -1] } });
  await setRolls(page, [6]);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(4);
  expect((await savedGame(page)).pieces.yellow).toEqual([0, -1, -1, -1]);
  await page.getByRole('button', { name: /Yellow character 2, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([0, 0, -1, -1]);
});

test('even a sole legal character waits for selection on a six', async ({ page }) => {
  const initial = createGame();
  await seedGame(page, { ...initial, pieces: { ...initial.pieces, yellow: [3, 56, 56, 56] } });
  await setRolls(page, [6]);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  const piece = page.locator('[data-character="yellow-0"]');
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(1);
  await expect(piece).toHaveAttribute('data-progress', '3');
  expect((await savedGame(page)).pieces.yellow).toEqual([3, 56, 56, 56]);
  await piece.click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([9, 56, 56, 56]);
});

test('multiple active characters require a choice and show a smaller halo around the head', async ({ page }) => {
  const initial = createGame();
  await seedGame(page, { ...initial, pieces: { ...initial.pieces, yellow: [0, 5, -1, -1] } });
  await setRolls(page, [6]);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(4);
  const piece = page.locator('[data-character="yellow-0"]');
  const halo = await piece.locator('.piece-highlight').evaluate((element) => {
    const ring = element.getBoundingClientRect(), parent = element.parentElement.getBoundingClientRect();
    return { width: ring.width / parent.width, height: ring.height / parent.height, top: (ring.top - parent.top) / parent.height };
  });
  expect(halo.width).toBeCloseTo(0.735, 2);
  expect(halo.height).toBeCloseTo(0.225, 2);
  expect(halo.top).toBeCloseTo(-0.18, 2);
  // A player may still choose to bring out a yard piece after a six.
  await page.getByRole('button', { name: /Yellow character 3, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([0, 5, 0, -1]);
});

test('a six never auto-releases a yard piece while an unmovable character is on the board', async ({ page }) => {
  const initial = createGame();
  await seedGame(page, { ...initial, pieces: { ...initial.pieces, yellow: [55, -1, -1, -1] } });
  await setRolls(page, [6]);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.locator('.game-piece.is-selectable')).toHaveCount(3);
  expect((await savedGame(page)).pieces.yellow).toEqual([55, -1, -1, -1]);
  await page.getByRole('button', { name: /Yellow character 2, in the yard/ }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([55, 0, -1, -1]);
});

test('an automatic move resumes from a saved rolled state', async ({ page }) => {
  const initial = createGame();
  await seedGame(page, { ...initial, phase: 'choose', roll: 6, lastRollBy: 'yellow', sixes: 1, legal: [0, 1, 2, 3] });
  await openGame(page);
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow).toEqual([0, -1, -1, -1]);
});

test('each team chooses independently, including the same character, without resetting the game', async ({ page }) => {
  const original = captureGame();
  await seedGame(page, original);
  await openGame(page);
  await waitForCharacters(page);
  await expect(page.getByRole('button', { name: '3D view' })).toHaveCount(0);
  const open = page.getByRole('button', { name: /Choose characters/ });
  await open.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-team="yellow"]')).toBeFocused();
  await dialog.getByRole('button', { name: 'Choose Dog for Yellow' }).click();
  await dialog.locator('[data-team="red"]').click();
  await dialog.getByRole('button', { name: 'Choose Dog for Red' }).click();
  await dialog.locator('[data-team="blue"]').click();
  await dialog.getByRole('button', { name: 'Choose Elephant for Blue' }).click();
  await dialog.locator('[data-team="green"]').click();
  await dialog.getByRole('button', { name: 'Choose Grandma for Green' }).click();
  await expect(dialog.getByRole('button', { name: 'Choose Grandma for Green' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Done, let’s play' }).click();
  await expect(open).toBeFocused();
  await expect(page.locator('.game-piece--yellow[data-character-type="dog"]')).toHaveCount(4);
  await expect(page.locator('.game-piece--red[data-character-type="dog"]')).toHaveCount(4);
  await expect(page.locator('.game-piece--blue[data-character-type="elephant"]')).toHaveCount(4);
  await expect(page.locator('.game-piece--green[data-character-type="grandma"]')).toHaveCount(4);
  expect(await savedGame(page)).toEqual(original);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), characterStorageKey)).toEqual({ yellow: 'dog', red: 'dog', blue: 'elephant', green: 'grandma', purple: 'grandpa', orange: 'grandma' });
  await expect(page.locator('.character-canvas canvas')).toBeVisible();
  await expect(page.locator('.character-fallback-note')).toHaveCount(0);
  await page.reload();
  await waitForCharacters(page);
  await expect(page.locator('.game-piece--red[data-character-type="dog"]')).toHaveCount(4);
  await expect(page.locator('.game-piece--green[data-character-type="grandma"]')).toHaveCount(4);
  expect(await savedGame(page)).toEqual(original);
  await open.click();
  await expect(page.getByRole('button', { name: 'Choose Dog for Yellow' })).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Yes, new game' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('.game-piece--yellow[data-character-type="dog"]')).toHaveCount(4);
  expect((await savedGame(page)).pieces.yellow).toEqual([-1, -1, -1, -1]);
});

test('every roster choice has an available team-colored static image', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : original.call(this, type, ...args);
    };
  });
  await openGame(page);
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: /Choose characters/ }).click();
  const dialog = page.getByRole('dialog');
  const roster = ['Aarav', 'Diya', 'Tara', 'Kabir', 'Grandma', 'Grandpa', 'Skater', 'Cyclist', 'Dog', 'Cat', 'Lion', 'Horse', 'Elephant', 'Parrot'];
  for (const name of roster) {
    const option = dialog.getByRole('button', { name: `Choose ${name} for Yellow` });
    await option.click();
    await expect(option).toHaveAttribute('aria-pressed', 'true');
    const image = option.locator('img');
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
    await expect(image).toHaveAttribute('src', new RegExp(`/characters/${name.toLowerCase()}-yellow\\.webp$`));
  }
  await dialog.getByRole('button', { name: 'Done, let’s play' }).click();
  await expect(page.locator('.game-piece--yellow[data-character-type="parrot"] img')).toHaveCount(4);
  await expect(page.locator('.game-piece--yellow img').first()).toHaveAttribute('src', /parrot-yellow\.webp$/);
});

test('every roster choice can rebuild the animated board', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: /Choose characters/ }).click();
  const dialog = page.getByRole('dialog');
  const roster = ['Aarav', 'Diya', 'Tara', 'Kabir', 'Grandma', 'Grandpa', 'Skater', 'Cyclist', 'Dog', 'Cat', 'Lion', 'Horse', 'Elephant', 'Parrot'];
  for (const name of roster) {
    await dialog.getByRole('button', { name: `Choose ${name} for Yellow` }).click();
    await expect(page.locator(`.game-piece--yellow[data-character-type="${name.toLowerCase()}"]`)).toHaveCount(4);
    // Let the renderer consume the new rigs and draw a frame before moving on.
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await expect(page.locator('.character-fallback-note')).toHaveCount(0);
  }
  await expect(page.locator('.character-canvas canvas')).toBeVisible();
  expect(errors).toEqual([]);
});

test('skater and animal pieces use the normal capture and reaction timeline', async ({ page }) => {
  await seedGame(page, captureGame());
  await seedChoices(page, { yellow: 'skater', red: 'elephant', blue: 'cyclist', green: 'grandpa' });
  await openGame(page);
  await waitForCharacters(page);
  const skater = page.locator('[data-character="yellow-0"]');
  const elephant = page.locator('[data-character="red-0"]');
  await expect(skater).toHaveAttribute('data-character-type', 'skater');
  await expect(elephant).toHaveAttribute('data-character-type', 'elephant');
  await skater.click();
  await expect(skater).toHaveAttribute('data-pose', 'walk');
  await expect(elephant).toHaveAttribute('data-pose', 'sad');
  await expect(elephant).toHaveAttribute('data-pose', 'sad-walk');
  await expect(page.getByRole('status')).toContainText('Yellow made a capture! Red is up next.');
  expect((await savedGame(page)).pieces.red[0]).toBe(-1);
});

test('a cyclist celebrates at the finish using the normal rules', async ({ page }) => {
  await seedGame(page, winningGame());
  await setRolls(page, [1]);
  await seedChoices(page, { yellow: 'dog', red: 'lion', blue: 'cyclist', green: 'grandma' });
  await openGame(page);
  await waitForCharacters(page);
  const cyclist = page.locator('[data-character="blue-0"]');
  await expect(cyclist).toHaveAttribute('data-character-type', 'cyclist');
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(cyclist).toHaveAttribute('data-pose', 'dance');
  await expect(page.getByRole('dialog').getByText('Blue takes the crown!')).toBeVisible();
  expect((await savedGame(page)).pieces.blue[0]).toBe(56);
});

test('rules and reset dialogs support keyboard focus and cancellation', async ({ page }) => {
  await openGame(page);
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
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('.turn-card h2')).toContainText('Yellow');
});

test('finishing the fourth character shows a winner and allows a rematch', async ({ page }) => {
  await seedGame(page, winningGame());
  await setRolls(page, [1]);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
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
  game.pieces.blue = [55, 1, -1, -1];
  await setRolls(page, [1]);
  await seedGame(page, game);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await page.getByRole('button', { name: /Blue character 1, on space/ }).click();
  await expect(page.locator('[data-character="blue-0"]')).toHaveAttribute('data-pose', 'dance');
  await expect(page.getByRole('status')).toContainText('Time to celebrate');
  await expect(page.getByRole('status')).toContainText('Blue made it home! Green is up next.');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await savedGame(page)).pieces.blue[0]).toBe(56);
});

test('walking follows the route through a corner', async ({ page }) => {
  const initial = createGame();
  const game = {
    ...initial, phase: 'choose', roll: 2, lastRollBy: 'yellow', legal: [0, 1],
    pieces: { ...initial.pieces, yellow: [4, 15, -1, -1] },
  };
  await seedGame(page, game);
  await openGame(page);
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
  await openGame(page);
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

test('captured pieces follow their own route backwards, including multiple captures', async ({ page }) => {
  const initial = createGame();
  const game = { ...initial, phase: 'choose', roll: 1, lastRollBy: 'yellow', legal: [0, 1],
    pieces: { ...initial.pieces, yellow: [14, 2, -1, -1], red: [2, -1, -1, -1], blue: [41, -1, -1, -1] } };
  await seedGame(page, game);
  // Test DOM waypoints without software WebGL slowing individual frames.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : original.call(this, type, ...args);
    };
  });
  await openGame(page);
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await page.evaluate(() => {
    window.returnSteps = { red: [], blue: [] };
    for (const color of ['red', 'blue']) {
      const element = document.querySelector(`[data-character="${color}-0"]`);
      new MutationObserver(() => {
        if (element.dataset.pose !== 'sad-walk') return;
        const progress = Number(element.dataset.progress);
        const steps = window.returnSteps[color];
        if (steps[steps.length - 1] !== progress) steps.push(progress);
      }).observe(element, { attributes: true, attributeFilter: ['data-progress', 'data-pose'] });
    }
  });
  await page.locator('[data-character="yellow-0"]').click();
  await expect(page.locator('[data-character="red-0"]')).toHaveAttribute('data-pose', 'sad');
  await expect(page.getByRole('status')).toContainText('heading sadly back');
  expect((await savedGame(page)).pieces.red[0]).toBe(2); // Commit after both returns.
  await expect(page.getByRole('status')).toContainText('Yellow made a capture! Red is up next.', { timeout: 15_000 });
  const steps = await page.evaluate(() => window.returnSteps);
  expect(steps.red).toEqual([1, 0, -1]);
  expect(steps.blue).toEqual(Array.from({ length: 41 }, (_, index) => 40 - index).concat(-1));
  expect((await savedGame(page)).pieces.red[0]).toBe(-1);
  expect((await savedGame(page)).pieces.blue[0]).toBe(-1);
});

test('reset cancels a celebration and its pending win', async ({ page }) => {
  await seedGame(page, winningGame());
  await setRolls(page, [1]);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.locator('[data-character="blue-0"]')).toHaveAttribute('data-pose', 'dance');
  await page.getByRole('button', { name: 'New game' }).click();
  await page.getByRole('button', { name: 'Yes, new game' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await page.waitForTimeout(2200); // The cancelled win would have fired by now.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await savedGame(page)).pieces.blue).toEqual([-1, -1, -1, -1]);
  expect((await savedGame(page)).winner).toBe(null);
});

test('reduced-motion players still get a readable celebration', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedGame(page, winningGame());
  await setRolls(page, [1]);
  await openGame(page);
  await waitForCharacters(page);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
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
  await openGame(page);
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await page.getByRole('button', { name: /Choose characters/ }).click();
  await page.getByRole('button', { name: 'Choose Cat for Yellow' }).click();
  await page.getByRole('button', { name: 'Done, let’s play' }).click();
  await expect(page.locator('.game-piece--yellow img').first()).toHaveAttribute('src', /cat-yellow\.webp$/);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  expect((await savedGame(page)).pieces.yellow[0]).toBe(0);
});

test('missing character images fall back without retrying forever', async ({ page }) => {
  let requests = 0;
  await page.route('**/assets/characters/**', (route) => { requests += 1; return route.abort('failed'); });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl' ? null : original.call(this, type, ...args);
    };
  });
  await openGame(page);
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  const image = page.locator('.game-piece--yellow img').first();
  await expect(image).toHaveAttribute('src', '/assets/yellow-player-cutout.webp');
  await expect(image).toHaveJSProperty('complete', true);
  expect(await image.evaluate((element) => element.naturalWidth)).toBeGreaterThan(0);
  const count = requests;
  await page.waitForTimeout(500);
  expect(requests).toBe(count);
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
});

test('the classic board is visible and usable while graphics are still starting', async ({ page }) => {
  await page.addInitScript(() => {
    const set = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => set(callback, delay === 120 ? 2000 : delay, ...args);
  });
  await openGame(page);
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
  await waitForCharacters(page);
});

test('a failed character module does not blank the classic game', async ({ page }) => {
  await page.route('**/src/ClassicCharacters.jsx*', (route) => route.abort('failed'));
  await setRolls(page, [6]);
  await openGame(page);
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
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
  await openGame(page);
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.character-canvas canvas')).toHaveCount(0);
  await expect(page.locator('.game-piece img')).toHaveCount(16);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
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
  await openGame(page);
  await waitForCharacters(page);
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.character-fallback-note')).toHaveCount(0);
});

test('a lost WebGL context restores the playable sprite board', async ({ page }) => {
  await openGame(page);
  await waitForCharacters(page);
  await page.locator('.character-canvas canvas').evaluate((canvas) => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.getByText('Character animation unavailable.', { exact: false })).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(16);
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
    await openGame(page);
    await waitForCharacters(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.getByRole('button', { name: /Choose characters/ }).tap();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Animals', exact: true }).tap();
    await dialog.getByRole('button', { name: 'Choose Parrot for Yellow' }).tap();
    await dialog.getByRole('button', { name: 'Done, let’s play' }).tap();
    await expect(page.locator('.game-piece--yellow[data-character-type="parrot"]')).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await page.getByRole('button', { name: 'Roll the dice' }).tap();
    await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
    expect((await savedGame(page)).pieces.yellow[0]).toBe(0);
  });
});
