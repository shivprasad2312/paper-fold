// Unit tests — camera framing law (Phase G, ADR-045).
//
// The camera used to be "fit the whole board" and nothing else, which is
// trivial enough to check by eye. Phase G introduces a follow window with a
// zoom band, edge clamping, a dead zone and a height compensation, and every
// one of those can go wrong invisibly (drift off the board, zoom into a slit
// on a phone, jitter while standing still). The law is therefore pure maths
// (src/framing.js) and pinned here.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  FRAMING,
  halfHeightFor,
  isFollowBoard,
  focusFor,
  heightCompensation,
  isOccluded,
} from '../../src/framing.js';

// fit half-heights measured from the real projection (see the numbers in the
// ADR): 18x18 -> 10.7 at 16:9, 30x30 -> 17.6
const FIT_18 = 10.7;
const FIT_30 = 17.6;
const ASPECT = 16 / 9;

test('framing: boards at or under the follow span are shown whole', () => {
  assert.equal(isFollowBoard(FRAMING.followSpan), false);
  assert.equal(halfHeightFor({ fitHalfH: 8, aspect: ASPECT, span: 10 }), 8);
  assert.equal(halfHeightFor({ fitHalfH: 8, aspect: ASPECT, span: FRAMING.followSpan }), 8);
});

test('framing: a campaign board zooms in, but never past the fit', () => {
  const h18 = halfHeightFor({ fitHalfH: FIT_18, aspect: ASPECT, span: 18 });
  assert.ok(h18 < FIT_18, 'follow is closer than the whole-board fit');
  assert.ok(h18 >= FRAMING.minHalfH - 1e-9, 'and never closer than the plan-area floor');
  // on an 18x18 board the plan-area floor binds — the zoom fraction does not
  assert.ok(h18 > FIT_18 * FRAMING.zoom, 'the floor, not the fraction, is what binds');
  // a 30x30 board is big enough that the fraction binds
  const h30 = halfHeightFor({ fitHalfH: FIT_30, aspect: ASPECT, span: 30 });
  assert.ok(Math.abs(h30 - FIT_30 * FRAMING.zoom) < 1e-9);
});

test('framing: the window stops growing on the biggest boards', () => {
  const h = halfHeightFor({ fitHalfH: FIT_30, aspect: ASPECT, span: 30 });
  assert.ok(h <= FRAMING.maxHalfH + 1e-9, `half-height ${h} must respect the cap`);
  assert.ok(h > FIT_30 * 0.5, 'a 30x30 finale still shows real context');
});

test('framing: a portrait phone keeps a usable horizontal window', () => {
  const h = halfHeightFor({ fitHalfH: FIT_30, aspect: 0.46, span: 30 });
  assert.ok(h * 0.46 >= FRAMING.minHalfW - 1e-9, 'at least ~9 tiles across');
});

test('framing: the two laws meet without a visible pop', () => {
  const atEdge = halfHeightFor({ fitHalfH: 9.9, aspect: ASPECT, span: FRAMING.followSpan });
  const justOver = halfHeightFor({ fitHalfH: 9.9, aspect: ASPECT, span: FRAMING.followSpan + 1 });
  assert.equal(atEdge, 9.9);
  // a 14x14 board is still close to the fit: the floor binds, not the zoom
  assert.ok(Math.abs(justOver - 9.9) < 3.4);
});

test('framing: the window is clamped to the board', () => {
  // a subject at the far corner of an 18-board: the view may only pan as far
  // as the board edge plus the allowed void
  const f = focusFor({ r: 9, u: 9, spanR: 10.6, spanU: 8.9, halfH: 5.6, aspect: ASPECT });
  assert.ok(Math.abs(f.r) <= 10.6 + FRAMING.edgePad);
  assert.ok(Math.abs(f.u) <= 8.9 + FRAMING.edgePad);
  // a subject inside the window does not move the camera at all
  const g = focusFor({ r: 0.4, u: -0.3, spanR: 10.6, spanU: 8.9, halfH: 8, aspect: ASPECT });
  assert.deepEqual(g, { r: 0, u: 0 });
});

test('framing: the dead zone stops the camera breathing', () => {
  // a board wide enough that the edge clamp does not bind at these offsets
  const base = { spanR: 20, spanU: 12, halfH: 7, aspect: ASPECT };
  const first = focusFor({ ...base, r: 3, u: 0 });
  assert.ok(first.r > 2.9, 'the first move past the zone does pan');
  const still = focusFor({ ...base, r: 3.4, u: 0, prevR: first.r, prevU: first.u });
  assert.deepEqual(still, first, 'sub-zone movement is ignored');
  const moved = focusFor({ ...base, r: first.r + FRAMING.deadZone + 0.2, u: 0, prevR: first.r, prevU: first.u });
  assert.ok(moved.r > first.r, 'a real move does pan');
});

test('framing: the window always contains the subject, even at a board corner', () => {
  // the board clamp is a preference — the cube is the point. Measured on the
  // first build of this law (L60, L166): the cube projected outside the frame
  // at spawn because the camera stopped at the board edge instead of following.
  for (const [spanR, spanU, halfH] of [[10.6, 8.9, 6.6], [16, 13, 8.4], [18, 15, 10.8]]) {
    const halfW = halfH * ASPECT;
    for (const [r, u] of [[0, 0], [spanR, 0], [-spanR, 0], [0, spanU], [spanR, spanU], [-spanR, -spanU]]) {
      const f = focusFor({ r, u, spanR, spanU, halfH, aspect: ASPECT });
      // the subject stays on screen with a small margin; the full
      // keepInside margin is a preference the board-edge padding can absorb
      const insideR = Math.abs(r - f.r) <= halfW - 0.3;
      const insideU = Math.abs(u - f.u) <= halfH - 0.3;
      assert.ok(insideR && insideU, `subject (${r},${u}) outside the window: focus ${JSON.stringify(f)}`);
    }
  }
});

test('framing: a level load snaps instead of dead-zoning', () => {
  const base = { spanR: 16, spanU: 13, halfH: 8.4, aspect: ASPECT };
  // a subject just inside the dead zone: without a snap the camera holds, on
  // a level load it goes straight to the cube
  assert.deepEqual(focusFor({ ...base, r: 0.5, u: 0, prevR: 0, prevU: 0 }), { r: 0, u: 0 });
  const snapped = focusFor({ ...base, r: 0.5, u: 0, prevR: 0, prevU: 0, snap: true });
  assert.ok(Math.abs(snapped.r - 0.5) < 1e-9);
});

test('framing: stale focus from a bigger board is re-clamped', () => {
  const f = focusFor({ r: 0, u: 0, spanR: 10, spanU: 9, halfH: 8, aspect: ASPECT, prevR: 40, prevU: -40 });
  assert.deepEqual(f, { r: 0, u: 0 });
});

test('framing: height compensation lifts the view for a high cube', () => {
  const up = { x: -0.16, y: 0.58, z: -0.80 };
  const c = heightCompensation(2, up);
  // dot(U, up) = |upGround| = hypot(0.16, 0.80) = 0.816 -> 2 * 0.58/0.816
  assert.ok(Math.abs(c - 1.42) < 0.02, `compensation ${c}`);
  assert.equal(heightCompensation(2, { x: 0, y: 1, z: 0 }), 0, 'no ground axis, no shift');
});

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
