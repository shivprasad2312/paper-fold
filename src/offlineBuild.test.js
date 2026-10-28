import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { generateOfflineWorker } from '../scripts/offline-build.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ludo-offline-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'assets', 'characters'), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<!doctype html>');
  await writeFile(path.join(root, 'assets', 'lazy.js'), 'export default 1');
  await writeFile(path.join(root, 'assets', 'characters', 'dog-blue.webp'), 'image');
  return root;
}

test('the offline build includes all emitted assets and is deterministic', async (t) => {
  const root = await fixture(t);
  const first = await generateOfflineWorker(root);
  assert.deepEqual(first.assets, ['./assets/characters/dog-blue.webp', './assets/lazy.js', './index.html']);
  const worker = await readFile(path.join(root, 'sw.js'), 'utf8');
  assert.ok(worker.includes(JSON.stringify(first.version)));
  assert.ok(worker.includes(JSON.stringify(first.assets)));
  assert.ok(!worker.includes('__OFFLINE_VERSION__'));
  assert.deepEqual(await generateOfflineWorker(root), first); // sw.js is not included in its own manifest.
});

test('changing, adding or removing an asset changes the cache version', async (t) => {
  const root = await fixture(t);
  const first = await generateOfflineWorker(root);
  await writeFile(path.join(root, 'assets', 'lazy.js'), 'export default 2');
  const changed = await generateOfflineWorker(root);
  assert.notEqual(changed.version, first.version);
  await writeFile(path.join(root, 'assets', 'new.css'), 'body{}');
  const added = await generateOfflineWorker(root);
  assert.notEqual(added.version, changed.version);
  await rm(path.join(root, 'assets', 'new.css'));
  assert.equal((await generateOfflineWorker(root)).version, changed.version);
});

test('an incomplete build or invalid worker template fails rather than creating a partial cache', async (t) => {
  const root = await fixture(t);
  await rm(path.join(root, 'index.html'));
  await assert.rejects(generateOfflineWorker(root), /requires index.html/);
  await writeFile(path.join(root, 'index.html'), 'hello');
  const template = path.join(root, 'bad-template.txt');
  await writeFile(template, 'const version = __OFFLINE_VERSION__;');
  await assert.rejects(generateOfflineWorker(root, template), /missing a build placeholder/);
});
