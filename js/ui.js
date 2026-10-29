/* ==========================================================================
   ui.js — the DOM layer: menu, level select, how-to-play, result dialogs.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;
  const M = HG.M;

  const UI = {
    game: null,
    current: 'menu',

    init(game) {
      this.game = game;
      this.screens = {
        menu: HG.dom('#screen-menu'),
        levels: HG.dom('#screen-levels'),
        how: HG.dom('#screen-how'),
      };
      this.winDialog = HG.dom('#dialog-win');
      this.failDialog = HG.dom('#dialog-fail');
      this.levelGrid = HG.dom('#level-grid');

      HG.domAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const act = btn.getAttribute('data-act');
          HG.Sfx.click();
          this.action(act);
        });
      });

      this.buildLevelGrid();
      this.refreshHomeStats();
      this.setSoundLabel();
      this.show('menu');
      this.watchOrientation();
    },

    action(act) {
      const g = this.game;
      switch (act) {
        case 'play': {
          const id = Math.min(HG.save.unlocked, HG.LEVELS.length);
          g.startLevel(id);
          break;
        }
        case 'levels':
          this.buildLevelGrid();
          this.show('levels');
          break;
        case 'how':
          this.show('how');
          break;
        case 'back-home':
          this.buildLevelGrid();
          this.show('menu');
          g.toMenu();
          break;
        case 'how-back':
          if (g.mode === 'play' && g.levelId) this.hide();
          else { this.buildLevelGrid(); this.show('menu'); g.toMenu(); }
          break;
        case 'home':
          this.hideDialogs();
          this.buildLevelGrid();
          this.show('levels');
          g.toMenu();
          break;
        case 'next': {
          this.hideDialogs();
          const next = Math.min(g.levelId + 1, HG.LEVELS.length);
          g.startLevel(next);
          break;
        }
        case 'replay':
          this.hideDialogs();
          g.startLevel(g.levelId);
          break;
        case 'sound':
          HG.Sfx.setEnabled(HG.Sfx.muted);
          this.setSoundLabel();
          break;
      }
    },

    setSoundLabel() {
      const btn = HG.dom('[data-act="sound"]');
      if (!btn) return;
      btn.classList.toggle('is-off', HG.Sfx.muted);
      const lbl = HG.dom('.lbl-sound', btn);
      if (lbl) lbl.textContent = HG.Sfx.muted ? 'Sound off' : 'Sound on';
    },

    // ------------------------------------------------------------- screens
    show(name) {
      this.current = name;
      if (this.game && this.game.mode === 'play') this.game.paused = true;
      Object.keys(this.screens).forEach((k) => {
        this.screens[k].hidden = k !== name;
      });
      if (name !== 'level') {
        // nothing else to do; canvas keeps rendering the level behind blur
      }
      document.body.classList.toggle('in-menu', name !== null);
    },

    hide() {
      Object.keys(this.screens).forEach((k) => (this.screens[k].hidden = true));
      if (this.game) this.game.paused = false;
    },

    buildLevelGrid() {
      if (!this.levelGrid) return;
      const unlocked = HG.save.unlocked;
      let html = '';
      HG.LEVELS.forEach((lv) => {
        const stars = HG.save.stars(lv.id);
        const locked = lv.id > unlocked;
        const cls = ['level-cell'];
        if (locked) cls.push('is-locked');
        else if (stars > 0) cls.push('is-done');
        if (lv.id === this.game.levelId) cls.push('is-current');
        html += '<button class="' + cls.join(' ') + '" data-level="' + lv.id + '"' +
          (locked ? ' disabled aria-disabled="true"' : '') + '>';
        if (locked) {
          html += '<span class="lock">🔒</span>';
        } else {
          html += '<span class="num">' + lv.id + '</span>';
          html += '<span class="mini-stars">';
          for (let i = 0; i < 3; i++) html += HG.starSVG(i < stars, i < stars ? '' : 'dim');
          html += '</span>';
        }
        html += '</button>';
      });
      this.levelGrid.innerHTML = html;
      HG.domAll('.level-cell', this.levelGrid).forEach((cell) => {
        cell.addEventListener('click', () => {
          const id = parseInt(cell.getAttribute('data-level'), 10);
          if (id > HG.save.unlocked) return;
          HG.Sfx.click();
          this.game.startLevel(id);
        });
      });
    },

    refreshHomeStats() {
      const solved = HG.dom('#home-solved');
      const total = HG.dom('#home-total');
      const stars = HG.dom('#home-stars');
      if (solved) solved.textContent = HG.save.solvedCount();
      if (total) total.textContent = HG.LEVELS.length;
      if (stars) stars.textContent = HG.save.totalStars();
    },

    // -------------------------------------------------------------- dialogs
    showWin(stars, levelName, isLast) {
      const box = HG.dom('#win-stars');
      box.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const span = document.createElement('span');
        span.innerHTML = HG.starSVG(i < stars);
        const svg = span.firstChild;
        if (i < stars) {
          svg.classList.add('pop');
          svg.style.animationDelay = 0.12 + i * 0.16 + 's';
        } else {
          svg.classList.add('dim');
        }
        box.appendChild(svg);
      }
      HG.dom('#win-title').textContent = isLast ? 'All levels clear!' : 'Happy glass!';
      const quips = {
        3: 'Perfect pour — barely any ink used.',
        2: 'Nicely done. A shorter line would earn all three stars.',
        1: 'Filled! Try again with less ink for more stars.',
      };
      HG.dom('#win-sub').textContent = isLast
        ? 'You beat every level. Replay any of them to hunt for three stars.'
        : quips[stars] || quips[1];
      const nextBtn = HG.dom('[data-act="next"]', this.winDialog);
      if (nextBtn) nextBtn.textContent = isLast ? 'Back to levels' : 'Next level';
      if (nextBtn) nextBtn.setAttribute('data-act', isLast ? 'home' : 'next');
      this.winDialog.hidden = false;
    },

    showFail(reason, tip) {
      HG.dom('#fail-title').textContent = reason || 'Not enough water';
      HG.dom('#fail-sub').textContent = tip || 'The glass is still thirsty. Try a different path.';
      this.failDialog.hidden = false;
    },

    hideDialogs() {
      this.winDialog.hidden = true;
      this.failDialog.hidden = true;
    },

    // On phones held upright the level gets very small, so nudge the player.
    watchOrientation() {
      const check = () => {
        const w = global.innerWidth, hh = global.innerHeight;
        document.body.classList.toggle('too-narrow', hh > w * 1.55);
      };
      global.addEventListener('resize', check);
      global.addEventListener('orientationchange', check);
      check();
    },
  };

  HG.UI = UI;
})(window);
