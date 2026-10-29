/* tools/smoke.js — boots the built single-file game inside jsdom to catch
   runtime wiring errors (DOM ids, event handlers, boot order). */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createCanvas } = require('@napi-rs/canvas');

const file = path.resolve(__dirname, '../dist/happy-glass.html');
const html = fs.readFileSync(file, 'utf8');
const errors = [];

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://example.com/',
  beforeParse(window) {
    // give the canvas a real 2D context
    window.HTMLCanvasElement.prototype.getContext = function (type) {
      if (!this.__ctx) {
        const c = createCanvas(this.width || 1280, this.height || 720);
        this.__ctx = c.getContext(type);
        this.__canvas = c;
      }
      return this.__ctx;
    };
    Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { get() { return 1280; } });
    Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientHeight', { get() { return 720; } });
    window.addEventListener('error', (e) => errors.push('window error: ' + (e.error && e.error.stack || e.message)));
    window.onerror = (m, s, l, c, err) => { errors.push('onerror: ' + (err && err.stack || m)); };
  },
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await wait(600);
  const w = dom.window;
  const doc = w.document;
  const report = [];
  const check = (label, cond) => report.push((cond ? 'PASS ' : 'FAIL ') + label);

  check('game booted', !!(w.__HG && w.__HG.Game.renderer));
  check('menu visible', !doc.querySelector('#screen-menu').hidden);
  check('level grid built', doc.querySelectorAll('#level-grid .level-cell').length === w.HG.LEVELS.length);

  // click play
  doc.querySelector('[data-act="play"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(120);
  check('play hides menu', doc.querySelector('#screen-menu').hidden);
  check('scene created', !!w.__HG.Game.scene);
  check('mode is play', w.__HG.Game.mode === 'play');

  // draw a stroke with pointer events on the canvas
  const canvas = doc.querySelector('#stage');
  const Game = w.__HG.Game;
  const ev = (type, x, y) => {
    const e = new w.MouseEvent(type === 'pointermove' ? 'pointermove' : 'pointerdown', { bubbles: true, clientX: x, clientY: y });
    Object.defineProperty(e, 'pointerId', { value: 1 });
    return e;
  };
  Game.levelId = 7;
  Game.startLevel(7);
  await wait(60);
  const toScreen = (wx, wy) => Game.renderer.toScreen(wx, wy);
  const a = toScreen(300, 250), b = toScreen(810, 350);
  canvas.dispatchEvent(ev('pointerdown', a.x, a.y));
  for (let i = 1; i <= 12; i++) {
    const p = toScreen(300 + (810 - 300) * (i / 12), 250 + (350 - 250) * (i / 12));
    const m = new w.MouseEvent('pointermove', { bubbles: true, clientX: p.x, clientY: p.y });
    Object.defineProperty(m, 'pointerId', { value: 1 });
    w.dispatchEvent(m);
  }
  const up = new w.MouseEvent('pointerup', { bubbles: true });
  Object.defineProperty(up, 'pointerId', { value: 1 });
  w.dispatchEvent(up);
  await wait(60);
  check('ink recorded from pointer input', Game.scene.ink.used > 300);
  check('tap opened', Game.scene.state !== 'idle');

  // let the simulation run until the level resolves
  for (let i = 0; i < 300 && Game.scene.state !== 'won' && Game.scene.state !== 'lost'; i++) await wait(16);
  check('level 7 resolves (won=' + Game.scene.state + ')', Game.scene.state === 'won');

  await wait(1200);
  const winShown = !doc.querySelector('#dialog-win').hidden;
  check('win dialog appears', winShown);
  check('stars saved', w.HG.save.stars(7) > 0);
  check('next level unlocked', w.HG.save.unlocked >= 8);

  // restart + fail path
  doc.querySelector('#dialog-win [data-act="replay"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(80);
  check('replay resets scene', Game.scene.state !== 'won');

  // a "floating glass" level: the glass is a dynamic body propped up by ink
  Game.startLevel(26);
  await wait(60);
  const drawStroke = (pts) => {
    const s0 = toScreen(pts[0][0], pts[0][1]);
    canvas.dispatchEvent(ev('pointerdown', s0.x, s0.y));
    for (let i = 1; i < pts.length; i++) {
      const p = toScreen(pts[i][0], pts[i][1]);
      const m = new w.MouseEvent('pointermove', { bubbles: true, clientX: p.x, clientY: p.y });
      Object.defineProperty(m, 'pointerId', { value: 1 });
      w.dispatchEvent(m);
    }
    const up2 = new w.MouseEvent('pointerup', { bubbles: true });
    Object.defineProperty(up2, 'pointerId', { value: 1 });
    w.dispatchEvent(up2);
  };
  drawStroke([[400, 250], [640, 310]]);
  drawStroke([[630, 470], [790, 470]]);
  await wait(60);
  const g26 = Game.scene.glasses[0];
  check('floating glass is dynamic', g26.dynamic && !!g26.body);
  const y0 = g26.cy;
  for (let i = 0; i < 420 && Game.scene.state !== 'won'; i++) await wait(16);
  check('dynamic glass level resolves (won=' + Game.scene.state + ')', Game.scene.state === 'won');
  check('dynamic glass stayed supported', Math.abs(Game.scene.glasses[0].cy - y0) < 40);
  check('dynamic glass got filled', Game.scene.glasses[0].fill > 0.5);

  console.log(report.join('\n'));
  if (errors.length) {
    console.log('\nRUNTIME ERRORS:\n' + errors.join('\n'));
  } else {
    console.log('\nno runtime errors');
  }
  dom.window.close();
  process.exit(report.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
