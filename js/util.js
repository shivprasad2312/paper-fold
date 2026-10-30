/* ==========================================================================
   util.js — tiny helpers, palette, save data
   ========================================================================== */
(function (global) {
  'use strict';

  const HG = global.HG || (global.HG = {});

  // World is a fixed 1280x720 stage; the camera fits it inside the canvas.
  HG.W = 1280;
  HG.H = 720;
  HG.TAU = Math.PI * 2;

  // Collision groups. Water and drawn ink are deliberately in different worlds:
  // Matter resolves contacts for *both* bodies, and a continuously landing stream
  // would rock a hanging wire. Water is stopped by ink in Scene.resolveWaterInk()
  // instead, which only ever moves the droplet.
  HG.CAT_INK = 0x0002;
  HG.CAT_WATER = 0x0004;
  HG.MASK_INK = 0xffff & ~HG.CAT_WATER;
  HG.MASK_WATER = 0xffff & ~HG.CAT_INK;

  const M = (HG.M = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    dist: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
    dist2: (x1, y1, x2, y2) => {
      const dx = x2 - x1, dy = y2 - y1;
      return dx * dx + dy * dy;
    },
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: (arr) => arr[(Math.random() * arr.length) | 0],
    smoothstep: (t) => t * t * (3 - 2 * t),
    // approach a target smoothly, frame-rate independent
    approach: (cur, target, rate, dt) => cur + (target - cur) * (1 - Math.exp(-rate * dt)),
    easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  });

  // Per-level themes: every level gets its own paper colour, grid ink, accent
  // and default scenery material, so no two levels look alike. `theme` in a
  // level definition is optional — by default the theme cycles per chapter.
  HG.THEMES = [
    { name: 'sketch',  paper: '#f6f5ef', gridSmall: '#e7e6dd', gridBig: '#dedcd1', accent: '#4aa3d8', coast: 'wood' },
    { name: 'blueprint', paper: '#eef4f8', gridSmall: '#dbe7ef', gridBig: '#c8dbe8', accent: '#2f7fb5', coast: 'metal' },
    { name: 'mint',    paper: '#f1f7f2', gridSmall: '#dfece2', gridBig: '#cfe3d5', accent: '#3f9d7a', coast: 'stone' },
    { name: 'sunset',  paper: '#fdf4ec', gridSmall: '#f3e4d4', gridBig: '#eed7c1', accent: '#e08a4a', coast: 'sand' },
    { name: 'dusk',    paper: '#f3f2f8', gridSmall: '#e4e2ee', gridBig: '#d5d2e2', accent: '#6f6fc4', coast: 'wood' },
    { name: 'parchment', paper: '#faf6e9', gridSmall: '#efe7d0', gridBig: '#e6dab9', accent: '#b98b3a', coast: 'stone' },
  ];
  HG.themeFor = function (level) {
    const list = HG.THEMES;
    if (level && typeof level.theme === 'number') return list[level.theme % list.length];
    const id = (level && level.id) || 1;
    return list[(id - 1) % list.length];
  };

  HG.C = {
    ink: '#2d3b47',
    inkSoft: '#5d6b77',
    paper: '#f6f5ef',
    gridSmall: '#e7e6dd',
    gridBig: '#dedcd1',
    stroke: '#33434f',        // player drawn ink line
    strokeEdge: '#22303a',
    water: '#8fd3f4',
    waterMid: '#6cc5ef',
    waterDeep: '#4bb2e6',
    waterEdge: '#3d9ed3',
    glass: '#ffffff',
    glassShade: '#d9ecf6',
    glassEdge: '#33434f',
    wood: '#cfa06a',
    woodDark: '#ac7e4c',
    woodLight: '#e2bb8d',
    metal: '#9fb0bd',
    metalDark: '#75879a',
    metalLight: '#c8d4dd',
    stone: '#b9b3a5',
    stoneDark: '#948d7e',
    sand: '#f0d9a8',
    sandDark: '#d3b478',
    hot: '#f0846c',
    hotGlow: '#ffc9a8',
    teal: '#3d8f96',
    green: '#a8d641',
    star: '#ffd447',
    starDark: '#e3a91f',
    red: '#ef7a63',
  };

  // ---------------------------------------------------------------- save data
  const KEY = 'happyglass.save.v1';
  const DEFAULT_SAVE = { stars: {}, unlocked: 1, sound: true };

  HG.save = (function () {
    let data = Object.assign({}, DEFAULT_SAVE, { stars: {} });
    try {
      const raw = global.localStorage && global.localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          data.stars = parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {};
          data.unlocked = Math.max(1, parsed.unlocked | 0 || 1);
          data.sound = parsed.sound !== false;
        }
      }
    } catch (e) { /* private mode / disabled storage */ }

    let flushTimer = 0;
    function flush() {
      clearTimeout(flushTimer);
      flushTimer = 0;
      try {
        global.localStorage && global.localStorage.setItem(KEY, JSON.stringify(data));
      } catch (e) { /* ignore */ }
    }
    return {
      get unlocked() { return data.unlocked; },
      set unlocked(v) { data.unlocked = Math.max(1, v | 0); flush(); },
      get sound() { return data.sound; },
      set sound(v) { data.sound = !!v; flush(); },
      stars(id) { return data.stars[id] | 0; },
      setStars(id, n) { data.stars[id] = Math.max(data.stars[id] | 0, n | 0); flush(); },
      totalStars() {
        let t = 0;
        for (const k in data.stars) t += data.stars[k] | 0;
        return t;
      },
      solvedCount() {
        let t = 0;
        for (const k in data.stars) if (data.stars[k] > 0) t++;
        return t;
      },
      reset() { data = { stars: {}, unlocked: 1, sound: data.sound }; flush(); },
    };
  })();

  // Stars are earned by ink economy, exactly like the original: the meter is
  // split into three blocks and every block you eat costs you one star.
  HG.starCount = function (used, budget) {
    const left = 1 - used / budget;
    if (left > 0.66) return 3;
    if (left > 0.33) return 2;
    return 1;
  };

  // ------------------------------------------------------------- svg snippets
  HG.starPath = 'M12 2.2l2.9 6.05 6.65.9-4.85 4.6 1.2 6.6L12 17.2l-5.9 3.15 1.2-6.6L2.45 9.15l6.65-.9z';

  HG.starSVG = function (filled, cls) {
    return (
      '<svg viewBox="0 0 24 24" class="' + (cls || '') + '" aria-hidden="true">' +
      '<path d="' + HG.starPath + '" fill="' + (filled ? HG.C.star : '#ffffff') +
      '" stroke="' + (filled ? HG.C.starDark : '#b9bfc4') + '" stroke-width="1.8" stroke-linejoin="round"/>' +
      '</svg>'
    );
  };

  // --------------------------------------------------------- canvas path util
  HG.roundRectPath = function (ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  };

  HG.dom = (sel, root) => (root || document).querySelector(sel);
  HG.domAll = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
})(window);
