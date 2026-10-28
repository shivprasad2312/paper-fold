// A small timer queue for game animations. Browsers can throttle background
// tabs for minutes; keeping the remaining delay avoids fast-forwarding turns
// or compressing a capture animation when the player comes back.
export function createPausableScheduler({
  now = () => globalThis.performance.now(),
  setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimer = (timer) => globalThis.clearTimeout(timer),
} = {}) {
  const tasks = new Set();
  let paused = false;

  const arm = (task) => {
    task.started = now();
    task.timer = setTimer(() => {
      if (paused || !tasks.has(task)) return;
      tasks.delete(task);
      task.timer = null;
      task.callback();
    }, task.remaining);
  };

  return {
    schedule(callback, delay = 0) {
      const task = { callback, remaining: Math.max(0, delay), started: 0, timer: null };
      tasks.add(task);
      if (!paused) arm(task);
      return () => {
        if (!tasks.delete(task)) return;
        if (task.timer !== null) clearTimer(task.timer);
        task.timer = null;
      };
    },
    pause() {
      if (paused) return;
      paused = true;
      const time = now();
      for (const task of tasks) {
        if (task.timer !== null) {
          clearTimer(task.timer);
          task.timer = null;
          task.remaining = Math.max(0, task.remaining - (time - task.started));
        }
      }
    },
    resume() {
      if (!paused) return;
      paused = false;
      for (const task of tasks) arm(task);
    },
    clear() {
      for (const task of tasks) if (task.timer !== null) clearTimer(task.timer);
      tasks.clear();
    },
    get paused() { return paused; },
  };
}
