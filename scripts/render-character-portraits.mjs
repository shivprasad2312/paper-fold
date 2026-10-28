import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { CHARACTERS } from '../src/characters.js';
import { ALL_COLORS } from '../src/game.js';

const teams = process.argv.slice(2);
if (teams.some((team) => !ALL_COLORS.includes(team))) throw new Error('Unknown team color');
const colors = teams.length ? teams : ALL_COLORS;

// Requires the Playwright Chromium browser; use PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
// to opt into a system browser. Nothing in the running game depends on this tool.
const server = await createServer({ logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  const { port } = server.httpServer.address();
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: ['--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/scripts/character-portraits.html`);
  await page.waitForFunction(() => window.portraitReady);
  await mkdir('public/assets/characters', { recursive: true });
  for (const { id } of CHARACTERS) {
    for (const color of colors) {
      const data = await page.evaluate(([character, team]) => window.renderPortrait(character, team), [id, color]);
      const image = Buffer.from(data.split(',')[1], 'base64');
      await writeFile(`public/assets/characters/${id}-${color}.webp`, image);
      // The added teams also need an independent fallback if a portrait fails.
      if ((color === 'purple' && id === 'grandpa') || (color === 'orange' && id === 'grandma')) {
        await writeFile(`public/assets/${color}-player-cutout.webp`, image);
      }
    }
    console.log(`Rendered ${id}`);
  }
} finally {
  await browser?.close();
  await server.close();
}
