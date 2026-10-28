import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS, CHARACTER_BY_ID, DEFAULT_CHARACTERS, normalizeCharacterChoices, characterImage } from './characters.js';

test('the collection includes all requested characters and both activity variants', () => {
  assert.equal(new Set(CHARACTERS.map(({ id }) => id)).size, CHARACTERS.length);
  for (const id of ['grandma', 'grandpa', 'dog', 'cat', 'lion', 'horse', 'elephant', 'parrot', 'skater', 'cyclist']) {
    assert.ok(CHARACTER_BY_ID[id], `missing ${id}`);
  }
  assert.equal(CHARACTERS.filter(({ kind, ride }) => kind === 'child' && !ride).length === 4, true);
});

test('character choices support duplicates and repair invalid or older preferences', () => {
  assert.deepEqual(normalizeCharacterChoices(null), DEFAULT_CHARACTERS);
  assert.deepEqual(normalizeCharacterChoices({ yellow: 'dog', red: 'dog', blue: 'not-a-character', green: null }), {
    yellow: 'dog', red: 'dog', blue: 'tara', green: 'kabir', purple: 'grandpa', orange: 'grandma',
  });
  assert.equal(characterImage('dog', 'red'), '/assets/characters/dog-red.webp');
});

test('every character and team has a packaged fallback portrait', async () => {
  const { stat } = await import('node:fs/promises');
  for (const team of ['purple', 'orange']) {
    assert.ok((await stat(new URL(`../public/assets/${team}-player-cutout.webp`, import.meta.url))).size > 100);
  }
  for (const { id } of CHARACTERS) {
    for (const team of ['yellow', 'red', 'blue', 'green', 'purple', 'orange']) {
      const file = new URL(`../public/assets/characters/${id}-${team}.webp`, import.meta.url);
      assert.ok((await stat(file)).size > 100, `missing portrait: ${id}/${team}`);
    }
  }
});
