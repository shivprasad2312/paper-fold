import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateOfflineWorker } from '../scripts/offline-build.mjs';
import { createGame, movePiece, rollDice } from '../src/game.js';
import { PENDING_MOVE_KEY } from '../src/gamePersistence.js';

const fixtureCleanups = [];
test.afterEach(async () => { for (const cleanup of fixtureCleanups.splice(0)) await cleanup(); });

const gameKey = 'ludo-club-game-v1';
const saved = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), gameKey);

async function prepareOffline(page) {
  await page.goto('/');
  await expect(page.locator('.offline-status')).toHaveText('Ready to play offline', { timeout: 40_000 });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)), { timeout: 20_000 }).toBe(true);
}

async function chooseSixPlayers(page) {
  await page.locator('.lobby-count-option:has(input[value="6"])').click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const dog = page.getByRole('button', { name: 'Choose Dog for Player 1' });
  await expect.poll(() => dog.locator('img').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  await dog.click();
  await page.getByRole('button', { name: 'Choose Orange for Player 1, swaps with Player 6' }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
}

test('a first online visit prepares all assets; a six-player game works and resumes completely offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, 'getRandomValues', { configurable: true, value(array) { array.fill(5); return array; } });
  });
  await prepareOffline(page);
  const cachedFiles = await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys.find((key) => key.startsWith('ludo-club-precache:')));
    return (await cache.keys()).map((request) => new URL(request.url).pathname);
  });
  expect(cachedFiles).toContain('/index.html');
  expect(cachedFiles).toContain('/assets/characters/dog-orange.webp');
  expect(cachedFiles.some((name) => /ClassicCharacters-.*\.js$/.test(name))).toBe(true);
  expect(cachedFiles.filter((name) => name.includes('/assets/characters/'))).toHaveLength(84);

  await context.setOffline(true);
  await expect(page.locator('.offline-status')).toHaveText('You’re offline · ready to play');
  await page.reload();
  await expect(page.locator('.offline-status')).toHaveText('You’re offline · ready to play');
  await chooseSixPlayers(page);
  // This module is lazy-loaded only after entering gameplay; it must also be cached.
  await expect(page.locator('.character-canvas canvas')).toBeVisible({ timeout: 40_000 });
  await expect(page.locator('.game-piece img')).toHaveCount(0, { timeout: 40_000 });
  await expect(page.locator('.game-piece[data-color="orange"][data-character-type="dog"]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect.poll(async () => (await saved(page)).pieces.yellow[0]).toBe(0);
  await expect(page.getByRole('button', { name: 'Roll again' })).toBeEnabled();
  await page.reload();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  expect((await saved(page)).pieces.yellow[0]).toBe(0);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.offline-status')).toHaveText('You’re offline · ready to play');
  await page.close();
  const reopened = await context.newPage();
  await reopened.goto('/');
  await expect(reopened.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  await reopened.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(reopened.locator('.turn-card h2')).toContainText('Orange');
  expect((await saved(reopened)).pieces.yellow[0]).toBe(0);
});

test('a three-player solo game starts, takes computer turns and resumes entirely offline', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window.crypto, 'getRandomValues', { configurable: true, value(array) { array.fill(0); return array; } });
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
  await prepareOffline(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.offline-status')).toHaveText('You’re offline · ready to play');
  await page.getByRole('button', { name: 'Play with computer' }).click();
  await page.locator('.lobby-count-option:has(input[value="3"])').click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.locator('[data-player-index="2"]')).toContainText('Computer 2');
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('.board--classic')).toBeVisible();
  await page.getByRole('button', { name: 'Roll the dice' }).click();
  await expect.poll(async () => {
    const game = await saved(page);
    return [game.current, game.rollsWithoutSix.yellow, game.rollsWithoutSix.red, game.rollsWithoutSix.blue];
  }).toEqual(['yellow', 1, 1, 1]);
  await expect(page.getByRole('button', { name: 'Roll the dice' })).toBeEnabled();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.saved-game-note')).toContainText('vs computer');
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect(await saved(page)).toMatchObject({ mode: 'computer', playerCount: 3, current: 'yellow' });
  await expect(page.locator('.player-card').nth(2)).toContainText('Computer 2');
});

test('an interrupted computer move is recovered exactly once while offline', async ({ page, context }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
  await prepareOffline(page);
  const game = createGame(2, undefined, 'computer');
  game.current = 'blue';
  game.pieces.blue = [1, 12, -1, -1];
  const before = rollDice(game, 2);
  await context.setOffline(true);
  await page.evaluate(({ gameKey, before }) => {
    localStorage.setItem(gameKey, JSON.stringify(before));
    sessionStorage.setItem('ludo-club-screen-v1', 'game');
  }, { gameKey, before });
  await page.reload();
  const journal = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), PENDING_MOVE_KEY);
  await expect.poll(journal).not.toBeNull();
  const pending = await journal(), after = movePiece(before, pending.index);
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(after);
  expect(await journal()).toBeNull();
  await page.reload();
  expect(await saved(page)).toEqual(after);
  expect(after.mode).toBe('computer');
});

test('the offline cache also supports the static fallback when WebGL is unavailable', async ({ page, context }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
  await prepareOffline(page);
  await context.setOffline(true);
  await page.reload();
  await chooseSixPlayers(page);
  await expect(page.locator('.character-fallback-note')).toBeVisible();
  await expect(page.locator('.game-piece img')).toHaveCount(24);
  await expect.poll(() => page.locator('.game-piece img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
});

test('when browser storage is blocked the game stays playable and clearly warns that progress cannot be saved', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  });
  await prepareOffline(page);
  await expect(page.getByRole('alert')).toContainText('Game saving is unavailable');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  await expect(page.getByText('Game in progress')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeDisabled();
});

test('a browser that blocks service workers still opens the online game', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, get() { throw new Error('Blocked'); } });
  });
  await page.goto('/');
  await expect(page.locator('.offline-status')).toHaveText('Offline play is not ready in this browser.');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
});

async function createVersionServer() {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ludo-offline-e2e-'));
  const v1 = path.join(directory, 'v1'), v2 = path.join(directory, 'v2');
  await cp(path.resolve('dist'), v1, { recursive: true });
  await cp(v1, v2, { recursive: true });
  let current = v1;
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      const relative = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
      const file = path.resolve(current, relative);
      if (!file.startsWith(`${current}${path.sep}`)) throw new Error('invalid path');
      const content = await readFile(file);
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(content);
    } catch {
      response.writeHead(404, { 'Cache-Control': 'no-store' });
      response.end('not found');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  fixtureCleanups.push(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(directory, { recursive: true, force: true });
  });
  return { v1, v2, setVersion: (dir) => { current = dir; }, origin: `http://127.0.0.1:${server.address().port}` };
}

test('an incomplete precache never claims to be offline-ready and does not stop online play', async ({ page }) => {
  const server = await createVersionServer();
  await rm(path.join(server.v1, 'assets', 'characters', 'lion-purple.webp'));
  await page.goto(server.origin);
  await expect(page.locator('.offline-status')).toHaveText('Offline play is not ready in this browser.', { timeout: 40_000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
});

test('a complete update waits for game tabs to close and keeps saves across versions', async ({ page, context }) => {
  const server = await createVersionServer();
  const index = path.join(server.v2, 'index.html');
  await writeFile(index, (await readFile(index, 'utf8')).replace('</head>', '<meta name="test-version" content="two"></head>'));
  await generateOfflineWorker(server.v2);

  await page.goto(server.origin);
  await expect(page.locator('.offline-status')).toHaveText('Ready to play offline', { timeout: 40_000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  const before = await saved(page);
  server.setVersion(server.v2);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).waiting?.state), { timeout: 40_000 }).toBe('installed');
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.locator('.offline-status')).toContainText('Update ready');
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('meta[name="test-version"]')).toHaveCount(0); // The current release stays internally consistent.
  expect(await saved(page)).toEqual(before);
  await context.setOffline(false);
  await page.close();
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Let the waiting worker activate after its last client closes.
  const reopened = await context.newPage();
  await reopened.goto(server.origin);
  await expect(reopened.locator('meta[name="test-version"]')).toHaveAttribute('content', 'two');
  await expect(reopened.getByRole('button', { name: 'Resume', exact: true })).toBeEnabled();
  expect(await saved(reopened)).toEqual(before);
  const cacheCount = await reopened.evaluate(async () => (await caches.keys()).filter((key) => key.startsWith('ludo-club-precache:')).length);
  expect(cacheCount).toBe(1);
});

test('an offline move interrupted by a reload is recovered once', async ({ page, context }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
  await prepareOffline(page);
  const game = createGame(5);
  game.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(game, 2), after = movePiece(before, 1);
  await context.setOffline(true);
  await page.evaluate(({ gameKey, before }) => {
    localStorage.setItem(gameKey, JSON.stringify(before));
    sessionStorage.setItem('ludo-club-screen-v1', 'game');
  }, { gameKey, before });
  await page.reload();
  await page.locator('[data-character="yellow-1"]').click();
  await expect(page.locator('[data-character="yellow-1"]')).toHaveAttribute('data-pose', 'walk');
  await page.reload();
  await expect.poll(() => saved(page)).toEqual(after);
  await page.reload();
  expect(await saved(page)).toEqual(after);
});

test('evicted cached assets are detected offline and repaired after reconnecting', async ({ page, context }) => {
  await prepareOffline(page);
  await context.setOffline(true);
  await page.evaluate(async () => {
    const key = (await caches.keys()).find((name) => name.startsWith('ludo-club-precache:'));
    await (await caches.open(key)).delete('/assets/characters/lion-purple.webp');
    window.dispatchEvent(new Event('offline'));
  });
  await expect(page.locator('.offline-status')).toHaveText('Offline play is not ready in this browser.');
  await context.setOffline(false);
  await expect(page.locator('.offline-status')).toHaveText('Ready to play offline', { timeout: 40_000 });
  expect(await page.evaluate(async () => {
    const key = (await caches.keys()).find((name) => name.startsWith('ludo-club-precache:'));
    return Boolean(await (await caches.open(key)).match('/assets/characters/lion-purple.webp', { ignoreVary: true }));
  })).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.offline-status')).toHaveText('You’re offline · ready to play');
});

test('a failed update leaves the previous offline release and save intact', async ({ page, context }) => {
  const server = await createVersionServer();
  const index = path.join(server.v2, 'index.html');
  await writeFile(index, (await readFile(index, 'utf8')).replace('</head>', '<meta name="test-version" content="broken"></head>'));
  await generateOfflineWorker(server.v2);
  await rm(path.join(server.v2, 'assets', 'characters', 'lion-purple.webp'));
  await page.goto(server.origin);
  await expect(page.locator('.offline-status')).toHaveText('Ready to play offline', { timeout: 40_000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Start game' }).click();
  const before = await saved(page);
  server.setVersion(server.v2);
  const result = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const failed = new Promise((resolve) => registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing.addEventListener('statechange', () => { if (installing.state === 'redundant') resolve('failed'); });
    }, { once: true }));
    await registration.update();
    return failed;
  });
  expect(result).toBe('failed');
  expect(await page.evaluate(async () => (await caches.keys()).filter((key) => key.startsWith('ludo-club-precache:')).length)).toBe(1);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('[data-screen="game"]')).toBeVisible();
  await expect(page.locator('meta[name="test-version"]')).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
});

test('a journal write failure is surfaced even if ordinary game saves still work', async ({ page, context }) => {
  await page.addInitScript(() => {
    const save = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'ludo-club-pending-move-v1') throw new Error('Quota exceeded');
      return save.call(this, key, value);
    };
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return ['webgl', 'webgl2', 'experimental-webgl'].includes(type) ? null : original.call(this, type, ...args);
    };
  });
  await prepareOffline(page);
  const game = createGame(4);
  game.pieces.yellow = [1, 8, -1, -1];
  const before = rollDice(game, 2), after = movePiece(before, 0);
  await context.setOffline(true);
  await page.evaluate(({ gameKey, before }) => {
    localStorage.setItem(gameKey, JSON.stringify(before));
    sessionStorage.setItem('ludo-club-screen-v1', 'game');
  }, { gameKey, before });
  await page.reload();
  await page.locator('[data-character="yellow-0"]').click();
  await expect(page.getByRole('alert')).toContainText('Game saving is unavailable');
  await expect.poll(() => saved(page)).toEqual(after);
});
