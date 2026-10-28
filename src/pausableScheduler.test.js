import test from 'node:test';
import assert from 'node:assert/strict';
import { createPausableScheduler } from './pausableScheduler.js';

function fakeClock() {
  let time = 0, nextId = 0;
  const timers = new Map();
  return {
    now: () => time,
    setTimer(callback, delay) { const id = ++nextId; timers.set(id, { callback, due: time + delay }); return id; },
    clearTimer(id) { timers.delete(id); },
    advance(amount) {
      const end = time + amount;
      while (true) {
        const next = [...timers.entries()].filter(([, timer]) => timer.due <= end).sort((a, b) => a[1].due - b[1].due)[0];
        if (!next) break;
        time = next[1].due;
        timers.delete(next[0]);
        next[1].callback();
      }
      time = end;
    },
  };
}

test('pausing preserves the remaining time for each animation step', () => {
  const clock = fakeClock(), calls = [];
  const scheduler = createPausableScheduler(clock);
  scheduler.schedule(() => calls.push('first'), 100);
  scheduler.schedule(() => calls.push('second'), 250);
  clock.advance(40);
  scheduler.pause();
  scheduler.pause();
  clock.advance(10_000);
  assert.deepEqual(calls, []);
  scheduler.resume();
  clock.advance(59);
  assert.deepEqual(calls, []);
  clock.advance(1);
  assert.deepEqual(calls, ['first']);
  clock.advance(150);
  assert.deepEqual(calls, ['first', 'second']);
});

test('an individual waiting action can be cancelled without cancelling animations', () => {
  const clock = fakeClock(), calls = [];
  const scheduler = createPausableScheduler(clock);
  const cancel = scheduler.schedule(() => calls.push('cancelled'), 20);
  scheduler.schedule(() => calls.push('other'), 25);
  clock.advance(5);
  scheduler.pause();
  cancel();
  cancel();
  scheduler.resume();
  clock.advance(25);
  assert.deepEqual(calls, ['other']);
});

test('steps scheduled while paused wait, and clearing cancels them permanently', () => {
  const clock = fakeClock(), calls = [];
  const scheduler = createPausableScheduler(clock);
  scheduler.pause();
  scheduler.schedule(() => calls.push('cancelled'), 20);
  clock.advance(100);
  scheduler.clear();
  scheduler.schedule(() => {
    calls.push('start');
    scheduler.schedule(() => calls.push('next'), 10);
  }, 20);
  scheduler.resume();
  clock.advance(30);
  assert.deepEqual(calls, ['start', 'next']);
  scheduler.clear();
  scheduler.resume();
  clock.advance(1000);
  assert.deepEqual(calls, ['start', 'next']);
});
