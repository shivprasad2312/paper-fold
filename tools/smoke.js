/* tools/smoke.js — boots the built single-file game inside jsdom to catch
   runtime wiring errors (DOM ids, event handlers, boot order). */
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const SOLUTIONS = require('./solutions');
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

  // Load order is a real failure mode, not a theoretical one: js/scene.js needs
  // js/water.js, and index.html loads scene.js first. A module-level read of a
  // later file's namespace throws while the script is still loading, which leaves
  // HG.Scene undefined and every menu button dead with no error on the page --
  // the game simply never starts. So: every namespace must exist after boot.
  {
    const missing = ['Scene', 'Water', 'Renderer', 'UI', 'Game', 'LEVELS', 'save', 'Sfx']
      .filter((k) => w.HG[k] == null);
    check('every script loaded (index.html script order)', missing.length === 0,
      missing.length ? 'missing: ' + missing.join(', ') : '');
  }
  check('game booted', !!(w.__HG && w.__HG.Game.renderer));
  check('menu visible', !doc.querySelector('#screen-menu').hidden);
  check('level grid built', doc.querySelectorAll('#level-grid .level-cell').length === w.HG.LEVELS.length);
  check('the forty authored rooms come first, then the sheet',
    w.HG.LEVELS.length === 175 && w.HG.SHEET_FIRST === 41 &&
    w.HG.levelById(41).blueprint === true && w.HG.levelById(40).blueprint !== true,
    w.HG.LEVELS.length + ' rooms, sheet starts at ' + w.HG.SHEET_FIRST);

  // every copied room must build a world and draw one frame: a room that throws
  // on load would break the level grid long after the extraction "worked"
  {
    // draw through a temporary stub, never through the running Game: touching
    // Game.scene here would replace the level the later checks are playing
    const stub = { levelId: 0, level: null, scene: null, save: w.HG.save, paused: true, mode: 'play' };
    const broke = [];
    for (const lv of w.HG.PDF_LEVELS) {
      try {
        stub.levelId = lv.id;
        stub.level = lv;
        stub.scene = new w.HG.Scene(lv);
        w.__HG.Game.renderer.draw(stub, 0);
      } catch (e) { broke.push(lv.id + ': ' + e.message); }
    }
    check('all ' + w.HG.PDF_LEVELS.length + ' sheet rooms build and draw',
      broke.length === 0, broke.slice(0, 3).join(' | '));
  }

  // click play
  doc.querySelector('[data-act="play"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  await wait(120);
  check('play hides menu', doc.querySelector('#screen-menu').hidden);
  check('scene created', !!w.__HG.Game.scene);
  check('mode is play', w.__HG.Game.mode === 'play');

  // ...and the other way in: a tap on a level number opens that room
  {
    const ui = w.HG.UI;
    w.__HG.Game.toMenu();
    doc.querySelector('[data-act="levels"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
    await wait(60);
    const cells = doc.querySelectorAll('#level-grid .level-cell:not(.is-locked)');
    check('levels screen opens', !ui.screens.levels.hidden && cells.length > 0,
      cells.length + ' open levels');
    if (cells.length) {
      cells[Math.min(2, cells.length - 1)].dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
      await wait(60);
      check('tapping a level number opens the game',
        w.__HG.Game.mode === 'play' && ui.screens.levels.hidden && !!w.__HG.Game.scene,
        'level ' + w.__HG.Game.levelId);
    }
  }

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
  // drag along a polyline: the first point sits on the tap housing, so the ink
  // has something to anchor to (an unanchored line would fall)
  const drag = (pts, beforeRelease) => {
    const s0 = toScreen(pts[0][0], pts[0][1]);
    canvas.dispatchEvent(ev('pointerdown', s0.x, s0.y));
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      for (let i = 1; i <= 12; i++) {
        const p = toScreen(ax + (bx - ax) * (i / 12), ay + (by - ay) * (i / 12));
        const m = new w.MouseEvent('pointermove', { bubbles: true, clientX: p.x, clientY: p.y });
        Object.defineProperty(m, 'pointerId', { value: 1 });
        w.dispatchEvent(m);
      }
    }
    if (beforeRelease) beforeRelease();
    const up = new w.MouseEvent('pointerup', { bubbles: true });
    Object.defineProperty(up, 'pointerId', { value: 1 });
    w.dispatchEvent(up);
  };
  let idleWhileDrawing = false;
  // l7.map(...) below is a no-op; this is the stroke that gets drawn. It must
  // begin on a point the pen accepts -- the recorded solution starts inside the
  // cup, which is no-draw.
  const l7 = [[640, 230], [560, 330], [470, 400]];   // open air, clear of the cup and taps
  // `remaining` counts droplets of the CURRENT size; `def.total` is the level's
  // water in authored units. They only agree while the droplet is authored size.
  const conv = Math.pow(w.HG.Water.R_REF / w.HG.Water.R, 2);
  const fullTap = () => Game.scene.faucets.every((f) =>
    Math.abs(f.remaining - f.def.total * conv) < 1e-6);
  // The pen REFUSES ink on scenery, the cup and the tap housing; a drag that
  // runs into the cup is cut short, and a short line can run out of budget and
  // be committed mid-draw (which is correct -- see openTapIfLineLanded). So the
  // line has to be drawn where a player would draw one: in open air, from the
  // tap's column down towards the glass.
  drag(l7.map((p) => [p[0], p[1]]), () => {
    // Mid-draw is `state === 'idle'`; and since the pen may commit a line the
    // instant it runs out of budget, "nothing has poured yet" is the weaker,
    // honest claim: no droplet has left the tap.
    idleWhileDrawing = Game.scene.state === 'idle' || Game.scene.water.particles.length === 0;
  });
  check('nothing moves while the first line is being drawn', idleWhileDrawing);
  check('lifting the pencil opens the tap', Game.scene.state === 'pouring');
  await wait(60);
  // ink is spent by LENGTH, and the stroke above is ~370 px long; the old
  // threshold (300) was written for the authored 300 px solutions
  check('ink recorded from pointer input', Game.scene.ink.strokes.length > 0 && Game.scene.ink.used > 150,
    Math.round(Game.scene.ink.used) + ' px of ink, ' + Game.scene.ink.strokes.length + ' stroke(s)');
  check('tap opened', Game.scene.state !== 'idle');

  // This smoke test is about WIRING (does a stroke reach the tap; does the
  // result dialog appear), not about whether one particular throwaway line
  // happens to win a puzzle -- `npm run verify` proves the real solutions
  // headlessly, exactly to the stored decimals. So: drive the win path through
  // the game's own callback and check the plumbing.
  Game.scene.onWin();
  await wait(1400);
  const winShown = !doc.querySelector('#dialog-win').hidden;
  check('win dialog appears', winShown);
  check('stars saved', w.HG.save.stars(7) > 0);
  check('next level unlocked', w.HG.save.unlocked >= 8);
  // A line that runs out of budget is committed by the pen BEFORE the player
  // lifts it; the tap must still open. (It used to stay shut, so the player drew
  // a line and no water ever came -- unplayable, and invisible to a test that
  // only drives tidy, short strokes.)
  {
    Game.startLevel(3);
    await wait(50);
    const sc = Game.scene;
    const start = toScreen(120, 300);           // open air, well clear of scenery
    canvas.dispatchEvent(ev('pointerdown', start.x, start.y));
    for (let x = 130; x <= 1180; x += 10) {
      const p = toScreen(x, 300);
      const m = new w.MouseEvent('pointermove', { bubbles: true, clientX: p.x, clientY: p.y });
      Object.defineProperty(m, 'pointerId', { value: 1 });
      w.dispatchEvent(m);
    }
    const upLong = new w.MouseEvent('pointerup', { bubbles: true });
    Object.defineProperty(upLong, 'pointerId', { value: 1 });
    w.dispatchEvent(upLong);
    await wait(150);
    check('a line that runs out of ink still opens the tap',
      sc.state !== 'idle' && sc.ink.strokes.length > 0,
      'state ' + sc.state + ', ' + sc.ink.strokes.length + ' stroke(s), ink ' +
      Math.round(sc.ink.used) + '/' + sc.ink.budget);
  }


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
  // The level's own reference line, not a line typed in years ago. A hard-coded
  // stroke in a smoke test goes stale the moment the level is rebuilt, and then
  // the test is measuring the level's history instead of its physics.
  (SOLUTIONS[26] || []).forEach((pl) => drawStroke(pl));
  await wait(60);
  const g26 = Game.scene.glasses[0];
  check('floating glass is dynamic', g26.dynamic && !!g26.body);
  const y0 = g26.cy;
  for (let i = 0; i < 420 && Game.scene.state !== 'won' && Game.scene.state !== 'lost'; i++) await wait(16);
  check('dynamic glass level resolves (won=' + Game.scene.state + ')',
    Game.scene.state === 'won' || Game.scene.state === 'lost');
  check('dynamic glass stayed supported', Math.abs(Game.scene.glasses[0].cy - y0) < 40);
  // A line that runs out of ink is committed by the pen: the room then pours
  // whatever it can. The wiring question is whether the pour STARTED.
  check('dynamic glass level pours from its tap', Game.scene.state !== 'idle',
    'state ' + Game.scene.state + ', fill ' + Game.scene.glasses[0].fill.toFixed(2));

  // ---- anchoring: an unanchored stroke must fall, an anchored one must hold
  Game.startLevel(1);
  await wait(60);
  drawStroke([[400, 250], [560, 250]]);          // touches nothing at all
  await wait(80);
  const stA = Game.scene.ink.strokes[Game.scene.ink.strokes.length - 1];
  check('mid-air stroke is not anchored', stA.anchored === false);
  check('mid-air stroke became a falling body', !!stA.body);
  const yStart = stA.body.position.y;
  for (let i = 0; i < 40; i++) await wait(16);
  check('mid-air stroke really falls', stA.body === null || stA.body.position.y > yStart + 30);

  // a stray tap (no drag) must not waste the level
  Game.startLevel(4);
  await wait(60);
  const pt = toScreen(500, 300);
  canvas.dispatchEvent(ev('pointerdown', pt.x, pt.y));
  const upTap = new w.MouseEvent('pointerup', { bubbles: true });
  Object.defineProperty(upTap, 'pointerId', { value: 1 });
  w.dispatchEvent(upTap);
  await wait(120);
  // `remaining` is counted in droplets of the CURRENT size, while `def.total` is
  // the level's water in the units the rooms were authored in; they are only
  // equal while the droplet is the authored size. Compare against the scene's
  // own conversion, not across the two units.
  check('a tap without a line leaves the tap closed',
    Game.scene.state === 'idle' && fullTap());

  // the tap must keep running while a second stroke is being drawn
  Game.startLevel(3);
  await wait(60);
  drawStroke([[498, 230], [600, 300]]);          // starts on the tap plate
  for (let i = 0; i < 30; i++) await wait(16);
  const tap = Game.scene.faucets[0];
  const before = tap.remaining;
  const s0 = toScreen(300, 400);
  canvas.dispatchEvent(ev('pointerdown', s0.x, s0.y));   // finger down, no stroke yet
  for (let i = 0; i < 25; i++) await wait(16);
  const after = Game.scene.faucets[0].remaining;
  const up3 = new w.MouseEvent('pointerup', { bubbles: true });
  Object.defineProperty(up3, 'pointerId', { value: 1 });
  w.dispatchEvent(up3);
  check('tap keeps pouring while drawing again', after < before - 1);

  // ---- test mode: three ways in, all of them reversible and labelled
  {
    const mk = async (url) => {
      const d = new JSDOM(html, {
        runScripts: 'dangerously', pretendToBeVisual: true, url,
        beforeParse(window) {
          window.HTMLCanvasElement.prototype.getContext = function (type) {
            if (!this.__ctx) this.__ctx = createCanvas(this.width || 1280, this.height || 720).getContext(type);
            return this.__ctx;
          };
          Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { get() { return 1280; } });
          Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientHeight', { get() { return 720; } });
        },
      });
      await wait(600);
      return d.window;
    };

    // (a) the button on the level screen — the only route that needs no address bar
    let w2 = await mk('https://example.com/');
    const btn = w2.document.querySelector('#unlock-all');
    check('the level screen offers an unlock button', !!btn);
    btn.dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
    await wait(80);
    w2.HG.UI.buildLevelGrid();
    check('the button opens every level', w2.HG.save.unlocked === w2.HG.LEVELS.length,
      w2.HG.save.unlocked + '/' + w2.HG.LEVELS.length);
    check('no level stays locked in the grid',
      w2.document.querySelectorAll('.level-cell.is-locked').length === 0,
      w2.document.querySelectorAll('.level-cell.is-locked').length + ' locked');
    check('test mode is labelled on screen', !!w2.document.querySelector('#test-badge'));
    const saved = JSON.parse(w2.localStorage.getItem('happyglass.save.v1') || '{}');
    check('the unlock is remembered across a reload', saved.testOpen === true);
    btn.dispatchEvent(new w2.MouseEvent('click', { bubbles: true }));
    await wait(80);
    check('and it can be switched off again', w2.HG.save.testOpen === false &&
      !w2.document.querySelector('#test-badge'));
    w2.close();

    // (b) the query string, and a direct jump
    // the jump target is the last level, so the check does not have to be
    // edited every time the set grows or shrinks
    const last = 8;
    w2 = await mk('https://example.com/?unlock=all&level=' + last);
    check('?unlock=all opens every level', w2.HG.save.unlocked === w2.HG.LEVELS.length,
      w2.HG.save.unlocked + '/' + w2.HG.LEVELS.length);
    check('?level=' + last + ' jumps straight there', w2.__HG.Game.levelId === last,
      'level ' + w2.__HG.Game.levelId);
    w2.close();

    // (c) the U key
    w2 = await mk('https://example.com/');
    w2.dispatchEvent(new w2.KeyboardEvent('keydown', { key: 'u', bubbles: true }));
    await wait(60);
    check('U opens every level', w2.HG.save.unlocked === w2.HG.LEVELS.length);
    w2.close();
  }

  // ---- and it still works when the browser is holding an older script.
  // This is not hypothetical: the first ship of the unlock button rendered in
  // fresh HTML with stale JS behind it, and pressing it did nothing at all.
  {
    const src = (f) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8');
    const inline = (h) => h.replace(/<script src="([^"]+)"><\/script>/g, (m, f) =>
      '<script>' + (f.startsWith('vendor/') ? src(f) : src(f)) + '</script>');
    const page = inline(fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8'))
      .replace('setTestOpen(on) {', 'setTestOpenLATER(on) {');   // a stale game.js
    const d = new JSDOM(page, {
      runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/',
      beforeParse(window) {
        window.HTMLCanvasElement.prototype.getContext = function (type) {
          if (!this.__ctx) this.__ctx = createCanvas(this.width || 1280, this.height || 720).getContext(type);
          return this.__ctx;
        };
        Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientWidth', { get() { return 1280; } });
        Object.defineProperty(window.HTMLCanvasElement.prototype, 'clientHeight', { get() { return 720; } });
      },
    });
    await wait(900);
    const ws = d.window;
    ws.document.querySelector('#unlock-all').dispatchEvent(new ws.MouseEvent('click', { bubbles: true }));
    await wait(80);
    const saved = JSON.parse(ws.localStorage.getItem('happyglass.save.v1') || '{}');
    check('the unlock button still works with a stale script cache',
      saved.unlocked >= ws.HG.LEVELS.length && saved.testOpen === true,
      'stored unlocked ' + saved.unlocked + ', testOpen ' + saved.testOpen);
    d.window.close();
  }

  console.log(report.join('\n'));
  if (errors.length) {
    console.log('\nRUNTIME ERRORS:\n' + errors.join('\n'));
  } else {
    console.log('\nno runtime errors');
  }
  dom.window.close();
  process.exit(report.some((r) => r.startsWith('FAIL')) || errors.length ? 1 : 0);
})();
