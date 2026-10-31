/* smoke-test.mjs -- run game.js against a fake DOM.
 *
 *   node happy-glass/smoke-test.mjs
 *
 * Not a rendering test: it proves the module loads, the loop runs, a drag turns
 * into an ink stroke, the ink meter drains and the physics advances without
 * throwing. Cheap way to catch typos without a browser.
 */
const listeners = new Map();
let rafCallback = null;

const stub = () => new Proxy(function () {}, {
  get: (t, k) => (k === Symbol.toPrimitive ? undefined : stub()),
  apply: () => stub(),
  set: () => true,
});

function makeCanvas() {
  return {
    width: 720, height: 1080, style: {},
    getContext: () => stub(),
    addEventListener: (type, fn) => listeners.set(type, fn),
    setPointerCapture: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 720, height: 1080 }),
  };
}

const els = new Map();
function makeEl(id) {
  const el = {
    id, textContent: "", innerHTML: "", style: {}, className: "",
    classList: { add() {}, remove() {}, toggle() {} },
    appendChild() {}, addEventListener: (t, fn) => listeners.set(id + ":" + t, fn),
  };
  return el;
}

globalThis.document = {
  querySelector: () => ({
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 900, height: 1000 }),
  }),
  getElementById: (id) => {
    if (id === "game") return (els.get(id) || els.set(id, makeCanvas()).get(id));
    if (!els.has(id)) els.set(id, makeEl(id));
    return els.get(id);
  },
  createElement: () => makeCanvas(),
};
globalThis.window = { devicePixelRatio: 2, addEventListener: () => {} };
globalThis.requestAnimationFrame = (cb) => { rafCallback = cb; return 1; };

await import("./game.js");

if (!rafCallback) { console.error("FAIL: no animation frame scheduled"); process.exit(1); }

// run a second of frames
let t = 0;
for (let i = 0; i < 60; i++) { t += 16.7; rafCallback(t); }

const inkBefore = globalThis.document.getElementById("inkText").textContent;

// drag a line across the field
const down = listeners.get("pointerdown");
const move = listeners.get("pointermove");
const up = listeners.get("pointerup");
if (!down || !move || !up) { console.error("FAIL: pointer handlers not registered"); process.exit(1); }

down({ clientX: 300, clientY: 300, pointerId: 1 });
for (let i = 1; i <= 20; i++) {
  move({ clientX: 300 + i * 8, clientY: 300 + i * 2, pointerId: 1 });
}
up({ pointerId: 1 });

const inkAfter = globalThis.document.getElementById("inkText").textContent;

for (let i = 0; i < 300; i++) { t += 16.7; rafCallback(t); }

const fill = globalThis.document.getElementById("progressFill").style.width;
const ink = globalThis.document.getElementById("inkText").textContent;

console.log(`ink before drag : ${inkBefore}`);
console.log(`ink after drag  : ${inkAfter}`);
console.log(`ink after 5s    : ${ink}`);
console.log(`fill bar        : ${fill || "0%"}`);

const ok = inkBefore !== inkAfter && inkBefore !== ink;
console.log(ok ? "\nok - module loads, loop runs, ink is consumed, no exceptions"
               : "\nFAIL - ink never changed");
process.exit(ok ? 0 : 1);
