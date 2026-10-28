import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrameLoop } from './frameLoop.js';

function fakeFrames() {
  let nextId = 0;
  const queued = new Map();
  return {
    requestFrame(callback) { const id = ++nextId; queued.set(id, callback); return id; },
    cancelFrame(id) { queued.delete(id); },
    tick(time) { const current = [...queued.values()]; queued.clear(); current.forEach((callback) => callback(time)); },
    get count() { return queued.size; },
  };
}

test('a visible animated board renders continuously and stops when hidden', () => {
  const frames = fakeFrames(), rendered = [];
  const loop = createFrameLoop({ ...frames, render: (time, delta) => rendered.push([time, delta]) });
  loop.invalidate();
  loop.invalidate();
  assert.equal(frames.count, 1);
  frames.tick(100);
  frames.tick(116);
  assert.deepEqual(rendered, [[100, 0], [116, 0.016]]);
  assert.equal(frames.count, 1);
  loop.setActive(false);
  assert.equal(frames.count, 0);
  frames.tick(1000);
  assert.equal(rendered.length, 2);
  loop.setActive(true);
  frames.tick(1016);
  assert.deepEqual(rendered[2], [1016, 0]);
  loop.dispose();
  assert.equal(frames.count, 0);
  loop.invalidate();
  assert.equal(frames.count, 0);
});

test('reduced motion renders only on state, size, or visibility changes', () => {
  const frames = fakeFrames(), rendered = [];
  const loop = createFrameLoop({ ...frames, continuous: false, render: (time) => rendered.push(time) });
  loop.invalidate();
  frames.tick(1);
  assert.equal(frames.count, 0);
  loop.invalidate();
  loop.invalidate();
  frames.tick(2);
  assert.deepEqual(rendered, [1, 2]);
  loop.setActive(false);
  loop.invalidate();
  assert.equal(frames.count, 0);
  loop.setActive(true);
  frames.tick(3);
  assert.deepEqual(rendered, [1, 2, 3]);
  loop.setContinuous(true);
  frames.tick(4);
  assert.equal(frames.count, 1);
  loop.setContinuous(false);
  frames.tick(5);
  assert.equal(frames.count, 0);
});
