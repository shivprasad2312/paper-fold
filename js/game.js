/* ==========================================================================
   game.js — the conductor: fixed-step loop, input, level flow, star scoring.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;
  const M = HG.M;

  const STEP = 1000 / 60;
  const MAX_STEPS = 4;

  const Game = {
    levelId: 1,
    level: null,
    scene: null,
    renderer: null,
    mode: 'menu',              // menu | play
    pointer: { active: false, id: null, world: null, blocked: false },
    acc: 0,
    lastTime: 0,
    running: false,
    _resultTimers: [],

    init() {
      this.canvas = HG.dom('#stage');
      this.renderer = new HG.Renderer(this.canvas);
      HG.UI.init(this);
      this.bindInput();
      this.startLevel(1, { silentScreen: true });
      this.lastTime = performance.now();
      this.running = true;
      requestAnimationFrame(this.loop.bind(this));
      global.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) HG.Sfx.setPour(0);
        this.lastTime = performance.now();
      });
    },

    resize() {
      this.renderer.resize();
    },

    // ------------------------------------------------------------- level flow
    startLevel(id, opts) {
      opts = opts || {};
      this.clearTimers();
      const prev = this.scene;
      this.levelId = M.clamp(id, 1, HG.LEVELS.length);
      this.level = HG.levelById(this.levelId);
      this.scene = new HG.Scene(this.level);
      if (prev) prev.destroy();
      HG.UI.hideDialogs();
      HG.Sfx.setPour(0);
      this.pointer.active = false;
      this.pointer.id = null;
      this.pointer.world = null;
      this.acc = 0;

      this.scene.onWin = () => this.onWin();
      this.scene.onLose = () => this.onLose();

      this.paused = false;
      if (!opts.silentScreen) {
        this.mode = 'play';
        HG.UI.hide();
      } else {
        this.mode = 'menu';
      }
      if (HG.UI.buildLevelGrid) HG.UI.buildLevelGrid();
    },

    toMenu() {
      this.mode = 'menu';
      this.paused = false;
      this.pointer.active = false;
      HG.Sfx.setPour(0);
    },

    restart() {
      this.startLevel(this.levelId);
    },

    clearTimers() {
      this._resultTimers.forEach((t) => clearTimeout(t));
      this._resultTimers.length = 0;
    },

    onWin() {
      const scene = this.scene;
      HG.Sfx.setPour(0);
      HG.Sfx.win();
      const stars = HG.starCount(scene.ink.used, scene.ink.budget);
      HG.save.setStars(this.levelId, stars);
      if (this.levelId + 1 <= HG.LEVELS.length) {
        HG.save.unlocked = Math.max(HG.save.unlocked, this.levelId + 1);
      }
      HG.UI.refreshHomeStats();
      const isLast = this.levelId >= HG.LEVELS.length;
      const t = setTimeout(() => {
        if (this.scene !== scene) return;
        HG.UI.showWin(stars, this.level.name, isLast);
        for (let i = 0; i < stars; i++) {
          const tt = setTimeout(() => HG.Sfx.star(i), 180 + i * 160);
          this._resultTimers.push(tt);
        }
      }, 950);
      this._resultTimers.push(t);
    },

    onLose() {
      const scene = this.scene;
      HG.Sfx.setPour(0);
      HG.Sfx.fail();
      let reason = 'Not enough water';
      let tip = this.level.tip || 'Try a different path.';
      let total = 0, inside = 0;
      scene.glasses.forEach((g) => { total += g.need; inside += Math.min(g.fillSmooth, g.need); });
      if (scene.water.particles.length < 2 && inside < total) {
        reason = 'The water is all gone';
        tip = 'Every drop fell away. Catch the stream earlier.';
      } else if (inside > total * 0.5) {
        reason = 'So close!';
        tip = 'The glass almost filled — widen your funnel a little.';
      }
      const t = setTimeout(() => {
        if (this.scene !== scene) return;
        HG.UI.showFail(reason, tip);
      }, 800);
      this._resultTimers.push(t);
    },

    // ------------------------------------------------------------------ input
    bindInput() {
      const c = this.canvas;
      const down = (e) => this.onDown(e);
      const move = (e) => this.onMove(e);
      const up = (e) => this.onUp(e);
      c.addEventListener('pointerdown', down, { passive: false });
      global.addEventListener('pointermove', move, { passive: false });
      global.addEventListener('pointerup', up, { passive: false });
      global.addEventListener('pointercancel', up, { passive: false });
      c.addEventListener('contextmenu', (e) => e.preventDefault());

      global.addEventListener('keydown', (e) => {
        if (e.key === 'r' || e.key === 'R') { if (this.mode === 'play') this.restart(); }
        if (e.key === 'Escape') {
          if (this.mode === 'play') {
            HG.UI.buildLevelGrid();
            HG.UI.show('levels');
            this.toMenu();
          }
        }
        if (e.key === 'e' || e.key === 'E') { if (this.mode === 'play') this.restart(); }
      });

      // first gesture unlocks audio on iOS
      const unlock = () => {
        HG.Sfx.ensure();
        global.removeEventListener('pointerdown', unlock);
      };
      global.addEventListener('pointerdown', unlock);
    },

    hudHit(x, y) {
      const btns = this.renderer.buttons || [];
      for (const b of btns) {
        if (M.dist(x, y, b.x, b.y) <= b.r + 4) return b.id;
      }
      return null;
    },

    onDown(e) {
      if (e.button != null && e.button > 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (this.mode !== 'play') return;

      const hit = this.hudHit(px, py);
      if (hit) {
        e.preventDefault();
        HG.Sfx.click();
        if (hit === 'help') {
          HG.UI.show('how');
        } else if (hit === 'restart') this.restart();
        else if (hit === 'sound') {
          HG.Sfx.setEnabled(HG.Sfx.muted);
          HG.UI.setSoundLabel();
        } else if (hit === 'home') {
          HG.UI.buildLevelGrid();
          HG.UI.show('levels');
          this.toMenu();
        }
        return;
      }

      if (this.scene.state === 'won' || this.scene.state === 'lost') return;
      if (this.scene.inkRemaining() <= 0) return;

      const w = this.renderer.toWorld(px, py);
      if (w.x < 4 || w.x > HG.W - 4 || w.y < 4 || w.y > HG.H - 4) return;
      if (this.scene.inkPointBlocked(w.x, w.y)) {
        this.pointer.blocked = true;
        this.pointer.world = w;
        return;
      }
      e.preventDefault();
      this.pointer.blocked = false;
      this.pointer.active = true;
      this.pointer.id = e.pointerId;
      this.pointer.world = w;
      if (this.scene.beginInk(w.x, w.y)) {
        HG.Sfx.ensure();
        if (this.scene.state === 'idle') this.scene.start();
        HG.Sfx.draw();
      }
    },

    onMove(e) {
      if (this.mode !== 'play' || !this.pointer.active) return;
      if (this.pointer.id != null && e.pointerId !== this.pointer.id) return;
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const w = this.renderer.toWorld(px, py);
      this.pointer.world = w;
      const cx = M.clamp(w.x, 6, HG.W - 6);
      const cy = M.clamp(w.y, 6, HG.H - 6);
      if (this.scene.inkPointBlocked(cx, cy)) return;
      if (this.scene.addInkPoint(cx, cy)) HG.Sfx.draw();
      if (e.cancelable) e.preventDefault();
    },

    onUp(e) {
      if (!this.pointer.active) return;
      if (this.pointer.id != null && e.pointerId !== this.pointer.id) return;
      this.pointer.active = false;
      this.pointer.id = null;
      if (this.scene) this.scene.endInk();
    },

    // ------------------------------------------------------------------- loop
    loop(now) {
      if (!this.running) return;
      const dt = Math.min(60, now - this.lastTime || STEP);
      this.lastTime = now;

      if (this.scene) {
        if (this.mode === 'play' && !this.paused) {
          this.acc += dt;
          let steps = 0;
          while (this.acc >= STEP && steps < MAX_STEPS) {
            this.scene.step(STEP);
            this.scene.physics(STEP);
            this.acc -= STEP;
            steps++;
          }
          if (steps === MAX_STEPS) this.acc = 0;
        } else {
          // gentle idle animation only
          this.acc = 0;
        }
        // water sound follows how much is falling
        if (HG.Sfx.ctx) {
          const flow = this.mode === 'play' && !this.paused && this.scene.pouringNow ? 1 : 0;
          HG.Sfx.setPour(flow);
        }
      }

      this.renderer.draw(this, dt);
      requestAnimationFrame(this.loop.bind(this));
    },
  };

  global.HG.Game = Game;
  global.__HG = { HG, Game };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Game.init());
  } else {
    Game.init();
  }
})(window);
