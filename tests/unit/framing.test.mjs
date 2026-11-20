// ---------------------------------------------------------------------------
// Unit tests — the camera's pure helper (src/framing.js)
//
// The camera has one law: fit the WHOLE board, move only by the clamped
// parallax in src/stage.js. Nothing in that law is a decision this repo can
// only check by looking at it, so there is nothing to pin here.
//
// What is pinned is the occlusion ray behind the cube ghost: a close-range
// test against the level's own height map. It is pure math, and the failure
// mode it guards (the ghost showing through open air, or never showing at
// all) is expensive to catch by eye.
// ---------------------------------------------------------------------------
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isOccluded } from '../../src/framing.js';

test('framing: occlusion is a ray against the level height map', () => {
  const cube = { x: 0, y: 1, z: 0 };
  // the real camera sits ~80 units away at 54 degrees; occlusion is therefore
  // a CLOSE-range test — a wall two tiles in front blocks, the same wall ten
  // tiles away is passed well above
  const cam = { x: 6, y: 65, z: 46 };
  const wall = (x, z) => (z === 1 ? 4 : -Infinity);
  assert.equal(isOccluded({ from: cube, to: cam, heightAt: wall }), true);
  const farWall = (x, z) => (z === 12 ? 4 : -Infinity);
  assert.equal(isOccluded({ from: cube, to: cam, heightAt: farWall }), false);
  assert.equal(isOccluded({ from: cube, to: cam, heightAt: wall }), true);
  // the same ray with no geometry is clear
  assert.equal(isOccluded({ from: cube, to: cam, heightAt: () => -Infinity }), false);
  // a slab the cube is standing ON must never count as an occluder
  const ownTile = (x, z) => (Math.abs(x) <= 1 && Math.abs(z) <= 1 ? 1 : -Infinity);
  assert.equal(isOccluded({ from: cube, to: cam, heightAt: ownTile }), false);
  // a low block the ray passes ABOVE does not occlude
  const low = (x, z) => (z === 1 ? 0.5 : -Infinity);
  assert.equal(isOccluded({ from: cube, to: cam, heightAt: low }), false);
});
