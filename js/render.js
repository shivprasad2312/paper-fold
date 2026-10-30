/* ==========================================================================
   render.js — everything you see. Flat pastel shapes, thick ink outlines,
   a paper grid and a wooden HUD, drawn straight onto one canvas.
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;
  const M = HG.M;
  const C = HG.C;

  const HUD_H = 58;

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dpr = 1;
      this.cw = 800;
      this.ch = 600;
      this.scale = 1;
      this.tx = 0;
      this.ty = 0;
      this.t = 0;
      this.buttons = [];
      this.resize();
    }

    resize() {
      const dpr = Math.min(2.5, global.devicePixelRatio || 1);
      const cw = this.canvas.clientWidth || global.innerWidth;
      const ch = this.canvas.clientHeight || global.innerHeight;
      this.dpr = dpr;
      this.cw = cw;
      this.ch = ch;
      this.canvas.width = Math.round(cw * dpr);
      this.canvas.height = Math.round(ch * dpr);
      this.scale = Math.min(cw / HG.W, ch / HG.H);
      this.tx = (cw - HG.W * this.scale) / 2;
      this.ty = (ch - HG.H * this.scale) / 2;
      this.hudScale = M.clamp(Math.min(cw / 560, ch / 460), 0.66, 1.12);
    }

    toWorld(px, py) {
      return { x: (px - this.tx) / this.scale, y: (py - this.ty) / this.scale };
    }
    toScreen(wx, wy) {
      return { x: wx * this.scale + this.tx, y: wy * this.scale + this.ty };
    }

    // ==================================================================== main
    draw(game, dt) {
      const ctx = this.ctx;
      this.t += dt;
      const scene = game.scene;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, this.cw, this.ch);
      const theme = HG.themeFor(scene ? scene.level : null);
      this.theme = theme;
      this.drawPaper(ctx, theme);

      ctx.save();
      ctx.translate(this.tx, this.ty);
      ctx.scale(this.scale, this.scale);
      if (scene) {
        ctx.save();
        if (scene.shake > 0.01) {
          ctx.translate(M.rand(-1, 1) * scene.shake * 6, M.rand(-1, 1) * scene.shake * 6);
        }
        this.drawScene(ctx, game, scene, dt);
        ctx.restore();
      }
      ctx.restore();

      if (scene) this.drawHUD(ctx, game, scene);
      this.drawOverlays(ctx, game, scene);
    }

    // ------------------------------------------------------------ background
    drawPaper(ctx, theme) {
      const th = theme || HG.THEMES[0];
      ctx.fillStyle = th.paper;
      ctx.fillRect(0, 0, this.cw, this.ch);
      const s = 34 * this.scale;
      const offX = this.tx % s;
      const offY = this.ty % s;
      ctx.lineWidth = 1;
      ctx.strokeStyle = th.gridSmall;
      ctx.beginPath();
      for (let x = offX; x < this.cw; x += s) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, this.ch);
      }
      for (let y = offY; y < this.ch; y += s) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(this.cw, Math.round(y) + 0.5);
      }
      ctx.stroke();
      // heavier grid every 5 cells
      const b = s * 5;
      ctx.strokeStyle = th.gridBig;
      ctx.beginPath();
      for (let x = this.tx % b; x < this.cw; x += b) {
        ctx.moveTo(Math.round(x) + 0.5, 0);
        ctx.lineTo(Math.round(x) + 0.5, this.ch);
      }
      for (let y = this.ty % b; y < this.ch; y += b) {
        ctx.moveTo(0, Math.round(y) + 0.5);
        ctx.lineTo(this.cw, Math.round(y) + 0.5);
      }
      ctx.stroke();
    }

    // ------------------------------------------------------------ scene order
    drawScene(ctx, game, scene, dt) {
      // drop shadows for everything floating
      scene.fans.forEach((f) => this.drawFan(ctx, f, dt));
      scene.hots.forEach((h) => this.drawHot(ctx, h, dt));

      (scene.pins || []).forEach((p) => this.drawPin(ctx, p));
      scene.platforms.forEach((p) => this.drawPlatform(ctx, p));
      scene.crates.forEach((c) => this.drawCrate(ctx, c));
      scene.seesaws.forEach((s) => this.drawSeesaw(ctx, s));
      scene.movers.forEach((m) => this.drawMover(ctx, m));
      scene.spinners.forEach((s) => this.drawSpinner(ctx, s, dt));

      // glasses (back) — dynamic glasses are drawn in their own space so they
      // can fall, tip and slide around like real objects
      scene.glasses.forEach((g) => {
        this.beginGlass(ctx, g);
        this.drawGlassBack(ctx, g, dt);
        ctx.restore();
      });

      // ink
      this.drawInk(ctx, scene);

      // water
      this.drawWater(ctx, scene);

      // glass fronts
      scene.glasses.forEach((g) => {
        this.beginGlass(ctx, g);
        this.drawGlassFront(ctx, g, dt);
        ctx.restore();
      });

      // taps + particles on top
      scene.faucets.forEach((f) => this.drawFaucet(ctx, f, dt));
      this.drawEvap(ctx, scene);

      // level hint arrow while idle
      if (scene.state === 'idle') this.drawStartHint(ctx, scene);
      this.drawTip(ctx, scene);
    }

    // ------------------------------------------------------------- platforms
    outline(ctx, w) {
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = w || 3.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    shade(kind) {
      switch (kind) {
        case 'metal': return { fill: C.metal, light: C.metalLight, dark: C.metalDark };
        case 'stone': return { fill: C.stone, light: '#d2ccbe', dark: C.stoneDark };
        case 'sand': return { fill: C.sand, light: '#faecc9', dark: C.sandDark };
        case 'teal': return { fill: '#4f9aa2', light: '#6fb3b8', dark: '#37767d' };
        case 'ice': return { fill: '#d9f2fb', light: '#f2fbff', dark: '#a9d7e8' };
        default: return { fill: C.wood, light: C.woodLight, dark: C.woodDark };
      }
    }

    drawPlatform(ctx, p) {
      if (p.poly) return this.drawPoly(ctx, p);
      const d = p.def, s = this.shade(d.coaster ? (this.theme && this.theme.coast) || d.kind : d.kind);
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle || 0);
      this.popShadow(ctx, d.w, d.h);
      const r = Math.min(8, d.h / 2);
      HG.roundRectPath(ctx, -d.w / 2, -d.h / 2, d.w, d.h, r);
      const grd = ctx.createLinearGradient(0, -d.h / 2, 0, d.h / 2);
      grd.addColorStop(0, s.light);
      grd.addColorStop(0.45, s.fill);
      grd.addColorStop(1, s.dark);
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.2);
      // plank / rivet details
      ctx.save();
      ctx.clip();
      ctx.strokeStyle = 'rgba(45,59,71,.18)';
      ctx.lineWidth = 2;
      if (d.kind === 'metal') {
        for (let x = -d.w / 2 + 18; x < d.w / 2; x += 34) {
          ctx.beginPath();
          ctx.arc(x, 0, 2.6, 0, HG.TAU);
          ctx.stroke();
        }
      } else if (d.kind === 'wood' || d.kind === 'sand') {
        for (let x = -d.w / 2 + 46; x < d.w / 2 - 12; x += 46) {
          ctx.beginPath();
          ctx.moveTo(x, -d.h / 2 + 3);
          ctx.lineTo(x, d.h / 2 - 3);
          ctx.stroke();
        }
      }
      ctx.restore();
      // top highlight
      ctx.beginPath();
      ctx.moveTo(-d.w / 2 + 6, -d.h / 2 + 4);
      ctx.lineTo(d.w / 2 - 6, -d.h / 2 + 4);
      ctx.strokeStyle = 'rgba(255,255,255,.42)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }

    // big free-form slabs (ramps, wedges, trapezoids)
    drawPoly(ctx, p) {
      const verts = p.poly;
      const s = this.shade(p.kind);
      ctx.save();
      ctx.beginPath();
      verts.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
      ctx.closePath();
      ctx.save();
      ctx.shadowColor = 'rgba(45,59,71,.18)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = s.fill;
      ctx.fill();
      ctx.restore();
      // vertical gradient inside the shape
      ctx.save();
      ctx.clip();
      let top = Infinity, bot = -Infinity;
      verts.forEach((v) => { top = Math.min(top, v.y); bot = Math.max(bot, v.y); });
      const grd = ctx.createLinearGradient(0, top, 0, bot);
      grd.addColorStop(0, s.light);
      grd.addColorStop(0.55, s.fill);
      grd.addColorStop(1, s.dark);
      ctx.fillStyle = grd;
      ctx.fillRect(0, top, HG.W, bot - top);
      ctx.restore();
      ctx.beginPath();
      verts.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y)));
      ctx.closePath();
      this.outline(ctx, 3.4);
      ctx.restore();
    }

    // a small tack pressed into the paper
    drawPin(ctx, p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.ellipse(2, 4, p.r * 0.9, p.r * 0.45, 0, 0, HG.TAU);
      ctx.fillStyle = 'rgba(45,59,71,.14)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, HG.TAU);
      const g = ctx.createRadialGradient(-p.r * 0.35, -p.r * 0.4, 1, 0, 0, p.r);
      g.addColorStop(0, '#fdf3d9');
      g.addColorStop(0.55, '#e8c98a');
      g.addColorStop(1, '#c39b4f');
      ctx.fillStyle = g;
      ctx.fill();
      this.outline(ctx, 2.6);
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.28, 0, HG.TAU);
      ctx.fillStyle = 'rgba(45,59,71,.5)';
      ctx.fill();
      ctx.restore();
    }

    drawCrate(ctx, c) {
      const d = c.def, s = this.shade(c.kind);
      const sz = d.size;
      ctx.save();
      ctx.translate(c.body.position.x, c.body.position.y);
      if (c.body.angle) ctx.rotate(c.body.angle);
      HG.roundRectPath(ctx, -sz / 2, -sz / 2, sz, sz, 7);
      const grd = ctx.createLinearGradient(0, -sz / 2, 0, sz / 2);
      grd.addColorStop(0, s.light);
      grd.addColorStop(0.5, s.fill);
      grd.addColorStop(1, s.dark);
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.4);
      HG.roundRectPath(ctx, -sz / 2 + 7, -sz / 2 + 7, sz - 14, sz - 14, 4);
      ctx.strokeStyle = 'rgba(45,59,71,.3)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      if (c.kind === 'wood') {
        ctx.beginPath();
        ctx.moveTo(-sz / 2 + 7, -sz / 2 + 7);
        ctx.lineTo(sz / 2 - 7, sz / 2 - 7);
        ctx.moveTo(sz / 2 - 7, -sz / 2 + 7);
        ctx.lineTo(-sz / 2 + 7, sz / 2 - 7);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawSpinner(ctx, s) {
      const b = s.body, d = s.def;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      this.popShadow(ctx, d.w, d.h);
      HG.roundRectPath(ctx, -d.w / 2, -d.h / 2, d.w, d.h, d.h / 2);
      const grd = ctx.createLinearGradient(0, -d.h / 2, 0, d.h / 2);
      grd.addColorStop(0, '#cfdae2');
      grd.addColorStop(0.5, C.metal);
      grd.addColorStop(1, C.metalDark);
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.2);
      ctx.strokeStyle = 'rgba(45,59,71,.28)';
      ctx.lineWidth = 2;
      for (let x = -d.w / 2 + 20; x < d.w / 2 - 6; x += 30) {
        ctx.beginPath();
        ctx.arc(x, 0, 2.4, 0, HG.TAU);
        ctx.stroke();
      }
      ctx.restore();
      // hub
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, HG.TAU);
      ctx.fillStyle = '#e9e4d8';
      ctx.fill();
      this.outline(ctx, 3);
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, HG.TAU);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.restore();
    }

    drawSeesaw(ctx, s) {
      const b = s.body, d = s.def;
      // fulcrum
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(d.x - 26, d.y + 2);
      ctx.lineTo(d.x + 26, d.y + 2);
      ctx.lineTo(d.x, d.y + 54);
      ctx.closePath();
      ctx.fillStyle = '#cdd5cf';
      ctx.fill();
      this.outline(ctx, 3);
      ctx.restore();

      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      ctx.rotate(b.angle);
      this.popShadow(ctx, d.w, d.h);
      HG.roundRectPath(ctx, -d.w / 2, -d.h / 2, d.w, d.h, 6);
      const grd = ctx.createLinearGradient(0, -d.h / 2, 0, d.h / 2);
      grd.addColorStop(0, C.woodLight);
      grd.addColorStop(1, C.woodDark);
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.2);
      ctx.beginPath();
      ctx.moveTo(-d.w / 2 + 10, 0);
      ctx.lineTo(d.w / 2 - 10, 0);
      ctx.strokeStyle = 'rgba(45,59,71,.25)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    drawMover(ctx, m) {
      const b = m.body, d = m.def;
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      this.popShadow(ctx, d.w, d.h);
      HG.roundRectPath(ctx, -d.w / 2, -d.h / 2, d.w, d.h, 7);
      const grd = ctx.createLinearGradient(0, -d.h / 2, 0, d.h / 2);
      grd.addColorStop(0, '#e6ecf0');
      grd.addColorStop(1, C.metalDark);
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.2);
      ctx.strokeStyle = 'rgba(45,59,71,.3)';
      ctx.lineWidth = 2;
      for (let x = -d.w / 2 + 16; x < d.w / 2; x += 26) {
        ctx.beginPath();
        ctx.moveTo(x, -d.h / 2 + 5);
        ctx.lineTo(x, d.h / 2 - 5);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawHot(ctx, h, dt) {
      ctx.save();
      ctx.translate(h.x, h.y);
      ctx.rotate(h.angle || 0);
      const pulse = 0.5 + Math.sin(this.t * 0.004) * 0.5;
      // glow
      ctx.save();
      ctx.globalAlpha = 0.35 + pulse * 0.2;
      const g = ctx.createLinearGradient(0, -h.h / 2 - 26, 0, h.h / 2 + 16);
      g.addColorStop(0, 'rgba(255,190,140,0)');
      g.addColorStop(0.6, 'rgba(255,170,120,.7)');
      g.addColorStop(1, 'rgba(255,140,110,.85)');
      ctx.fillStyle = g;
      HG.roundRectPath(ctx, -h.w / 2, -h.h / 2 - 26, h.w, h.h + 42, 20);
      ctx.fill();
      ctx.restore();

      HG.roundRectPath(ctx, -h.w / 2, -h.h / 2, h.w, h.h, h.h / 2);
      const grd = ctx.createLinearGradient(0, -h.h / 2, 0, h.h / 2);
      grd.addColorStop(0, '#ffb08e');
      grd.addColorStop(1, '#e2654f');
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3);
      // heat squiggles
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 2.6;
      for (let i = -1; i <= 1; i++) {
        const x0 = i * (h.w / 4);
        ctx.beginPath();
        ctx.moveTo(x0 - 10, 4);
        ctx.quadraticCurveTo(x0 - 2, -4 - pulse * 2, x0 + 4, 2);
        ctx.quadraticCurveTo(x0 + 9, 7, x0 + 13, 0);
        ctx.stroke();
      }
      ctx.restore();
    }

    drawFan(ctx, f, dt) {
      if (f.style === 'blower') return this.drawBlower(ctx, f, dt);
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle || 0);
      // nozzle box
      this.popShadow(ctx, f.w, f.h);
      HG.roundRectPath(ctx, -f.w / 2, -f.h / 2, f.w, f.h, 10);
      const grd = ctx.createLinearGradient(-f.w / 2, 0, f.w / 2, 0);
      grd.addColorStop(0, '#cdd9e0');
      grd.addColorStop(1, C.metalDark);
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.2);
      ctx.beginPath();
      ctx.arc(0, 0, f.w * 0.28, 0, HG.TAU);
      ctx.fillStyle = '#87a0b1';
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();
      // animated chevrons blowing air
      ctx.save();
      ctx.scale(f.dir, 1);
      const t = (this.t * 0.0015) % 1;
      ctx.strokeStyle = 'rgba(120,170,200,.8)';
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const k = (t + i / 3) % 1;
        const x = f.w / 2 + 12 + k * 62;
        const a = 0.85 * (1 - k);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.moveTo(x, -16);
        ctx.lineTo(x + 14, 0);
        ctx.lineTo(x, 16);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }

    // a heavy grey box with an arrow — blows the stream sideways
    drawBlower(ctx, f, dt) {
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle || 0);
      const w = f.w, h = f.h;
      ctx.save();
      ctx.shadowColor = 'rgba(45,59,71,.2)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
      HG.roundRectPath(ctx, -w / 2, -h / 2, w, h, 8);
      ctx.fillStyle = '#9fb0bd';
      ctx.fill();
      ctx.restore();
      const grd = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
      grd.addColorStop(0, '#cfdae2');
      grd.addColorStop(0.45, '#a8b8c4');
      grd.addColorStop(1, '#7f909f');
      HG.roundRectPath(ctx, -w / 2, -h / 2, w, h, 8);
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.4);

      // nozzle end (the side the air leaves from)
      const nz = (w / 2) * f.dir;
      ctx.beginPath();
      HG.roundRectPath(ctx, nz - (f.dir > 0 ? 12 : 0) - (f.dir < 0 ? 0 : 0), -h / 2 - 6, 12 * 1, h + 12, 4);
      ctx.fillStyle = '#8ea0ae';
      ctx.fill();
      this.outline(ctx, 2.8);

      // arrow inside, pointing the way the wind blows
      ctx.save();
      ctx.scale(f.dir, 1);
      const pulse = 0.5 + 0.5 * Math.sin(this.t * 0.004);
      ctx.globalAlpha = 0.55 + pulse * 0.45;
      ctx.beginPath();
      ctx.moveTo(-w * 0.16, 0);
      ctx.lineTo(w * 0.02, -h * 0.22);
      ctx.lineTo(w * 0.02, -h * 0.09);
      ctx.lineTo(w * 0.2, -h * 0.09);
      ctx.lineTo(w * 0.2, h * 0.09);
      ctx.lineTo(w * 0.02, h * 0.09);
      ctx.lineTo(w * 0.02, h * 0.22);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      this.outline(ctx, 2.6);
      ctx.restore();

      // drifting air lines
      ctx.save();
      ctx.scale(f.dir, 1);
      ctx.strokeStyle = 'rgba(160,200,220,.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const k = ((this.t * 0.0016) + i / 3) % 1;
        ctx.globalAlpha = 0.75 * (1 - k);
        const x0 = w / 2 + 10 + k * 70;
        const y0 = (i - 1) * h * 0.28;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + 22, y0);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();
    }

    // ------------------------------------------------------------------ glass
    glassPath(ctx, g, inset) {
      const i = inset || 0;
      const tl = { x: g.x - g.topHalf + i, y: g.top + i };
      const tr = { x: g.x + g.topHalf - i, y: g.top + i };
      const bl = { x: g.x - g.botHalf + i * 0.7, y: g.bottom - i };
      const br = { x: g.x + g.botHalf - i * 0.7, y: g.bottom - i };
      const r = 9;
      ctx.beginPath();
      ctx.moveTo(tl.x, tl.y);
      ctx.lineTo(tr.x, tr.y);
      ctx.lineTo(br.x, br.y - r);
      ctx.quadraticCurveTo(br.x, br.y, br.x - r, br.y);
      ctx.lineTo(bl.x + r, bl.y);
      ctx.quadraticCurveTo(bl.x, bl.y, bl.x, bl.y - r);
      ctx.closePath();
    }

    beginGlass(ctx, g) {
      ctx.save();
      if (g.dynamic || g.tilt) {
        g.syncXf();
        ctx.translate(g.cx, g.cy);
        ctx.rotate(g.angle);
        ctx.translate(-g.x, -g.y);
      }
    }

    drawGlassBack(ctx, g, dt) {
      const bob = Math.sin(this.t * 0.0018 + g.x) * 1.2;
      g._bob = bob;
      ctx.save();
      ctx.translate(0, bob);

      // soft ground shadow
      ctx.save();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = C.ink;
      ctx.beginPath();
      ctx.ellipse(g.x, g.bottom + 16, g.topHalf * 0.95, 9, 0, 0, HG.TAU);
      ctx.fill();
      ctx.restore();

      // glass body
      this.glassPath(ctx, g, 0);
      const grd = ctx.createLinearGradient(g.x - g.topHalf, g.top, g.x + g.topHalf, g.bottom);
      grd.addColorStop(0, 'rgba(255,255,255,.92)');
      grd.addColorStop(0.45, 'rgba(235,248,255,.72)');
      grd.addColorStop(1, 'rgba(214,238,250,.6)');
      ctx.fillStyle = grd;
      ctx.fill();
      // inner tint
      ctx.save();
      this.glassPath(ctx, g, g.wall * 0.75);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillRect(g.x - g.topHalf, g.top, g.topHalf * 2, g.h);
      if (g.glow > 0.02) {
        const gg = ctx.createRadialGradient(g.x, g.bottom - 20, 8, g.x, g.bottom - 20, g.h);
        gg.addColorStop(0, 'rgba(168,214,65,' + 0.35 * g.glow + ')');
        gg.addColorStop(1, 'rgba(168,214,65,0)');
        ctx.fillStyle = gg;
        ctx.fillRect(g.x - g.topHalf, g.top, g.topHalf * 2, g.h);
      }
      ctx.restore();

      // dotted fill line
      const yNeed = g.needY();
      ctx.save();
      ctx.strokeStyle = g.satisfied ? 'rgba(120,175,40,.9)' : 'rgba(45,59,71,.42)';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([7, 6]);
      ctx.beginPath();
      ctx.moveTo(g.x - g.innerHalf(yNeed) + 2, yNeed);
      ctx.lineTo(g.x + g.innerHalf(yNeed) - 2, yNeed);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    drawGlassFront(ctx, g, dt) {
      ctx.save();
      ctx.translate(0, g._bob || 0);
      const wob = Math.sin(this.t * 0.02) * g.wobble * 1.1;
      ctx.translate(wob, 0);

      // waterline gloss if there is water
      if (g.fillSmooth > 0.02) {
        // find the top of the water inside the glass from the particles
        let topY = null;
        ctx.save();
        this.glassPath(ctx, g, g.wall * 0.6);
        ctx.clip();
        const surf = g.surfaceY;
        if (surf != null) {
          const gl = ctx.createLinearGradient(0, surf, 0, surf + 26);
          gl.addColorStop(0, 'rgba(255,255,255,.55)');
          gl.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = gl;
          ctx.fillRect(g.x - g.topHalf, surf - 6, g.topHalf * 2, 32);
          ctx.beginPath();
          ctx.moveTo(g.x - g.topHalf, surf);
          for (let x = -g.topHalf; x <= g.topHalf; x += 8) {
            ctx.lineTo(g.x + x, surf + Math.sin((x + this.t * 0.06) * 0.08) * 1.6);
          }
          ctx.strokeStyle = 'rgba(255,255,255,.75)';
          ctx.lineWidth = 2.6;
          ctx.stroke();
        }
        ctx.restore();
      }

      // outline + rim
      this.glassPath(ctx, g, 0);
      this.outline(ctx, 4);
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x - g.topHalf + 7, g.top + 12);
      ctx.lineTo(g.x - g.botHalf + 9, g.bottom - 16);
      ctx.stroke();
      ctx.restore();

      // rim lips
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(g.x - g.topHalf - 7, g.top + 1);
      ctx.lineTo(g.x - g.topHalf + 9, g.top);
      ctx.moveTo(g.x + g.topHalf + 7, g.top + 1);
      ctx.lineTo(g.x + g.topHalf - 9, g.top);
      ctx.stroke();
      ctx.restore();

      this.drawFace(ctx, g);
      ctx.restore();
    }

    drawFace(ctx, g) {
      const fill = M.clamp(g.fillSmooth, 0, 1);
      const happy = g.satisfied;
      const cx = g.x;
      const cy = g.bottom - g.h * 0.34;
      const eyeY = cy - 4;
      const spread = g.w * 0.16;
      const blink = Math.sin(this.t * 0.0016 + g.x * 0.7) > 0.985;
      const eyeR = Math.max(3.4, g.w * 0.052);

      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.fillStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';

      if (blink && !happy) {
        [-1, 1].forEach((s) => {
          ctx.beginPath();
          ctx.moveTo(cx + s * spread - 5, eyeY);
          ctx.lineTo(cx + s * spread + 5, eyeY);
          ctx.stroke();
        });
      } else {
        [-1, 1].forEach((s) => {
          ctx.beginPath();
          ctx.arc(cx + s * spread, eyeY, eyeR, 0, HG.TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx + s * spread - eyeR * 0.3, eyeY - eyeR * 0.35, eyeR * 0.34, 0, HG.TAU);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          ctx.fillStyle = C.ink;
        });
      }

      // mouth
      const mouthY = cy + g.h * 0.13;
      const mouthW = g.w * 0.26;
      const smile = M.clamp(fill * 1.5 + (happy ? 0.6 : 0), -1, 1);
      ctx.beginPath();
      if (smile > 0.06) {
        ctx.moveTo(cx - mouthW / 2, mouthY - smile * 2);
        ctx.quadraticCurveTo(cx, mouthY + smile * 11, cx + mouthW / 2, mouthY - smile * 2);
      } else if (smile < -0.06) {
        ctx.moveTo(cx - mouthW / 2, mouthY + 4);
        ctx.quadraticCurveTo(cx, mouthY - 5 + smile * 2, cx + mouthW / 2, mouthY + 4);
      } else {
        ctx.moveTo(cx - mouthW / 2, mouthY + 1);
        ctx.lineTo(cx + mouthW / 2, mouthY + 1);
      }
      ctx.stroke();
      ctx.restore();

      if (happy) {
        // sparkles around a happy glass
        const n = 5;
        for (let i = 0; i < n; i++) {
          const a = this.t * 0.0022 + (i / n) * HG.TAU;
          const rx = g.topHalf + 30, ry = g.h * 0.42;
          const x = cx + Math.cos(a) * rx;
          const y = cy + Math.sin(a) * ry;
          const tw = 0.6 + 0.4 * Math.sin(this.t * 0.005 + i * 1.7);
          this.sparkle(ctx, x, y, (5 + Math.sin(this.t * 0.006 + i) * 1.8) * tw, '#ffd447');
        }
      }
    }

    sparkle(ctx, x, y, r, color) {
      ctx.save();
      ctx.translate(x, y);
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.quadraticCurveTo(r * 0.22, -r * 0.22, r, 0);
      ctx.quadraticCurveTo(r * 0.22, r * 0.22, 0, r);
      ctx.quadraticCurveTo(-r * 0.22, r * 0.22, -r, 0);
      ctx.quadraticCurveTo(-r * 0.22, -r * 0.22, 0, -r);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------------- ink
    // The drawn line is exactly what the reference draws: one clean, thin,
    // near-black stroke from the pen. No nails, no studs, no shine — the player
    // drew a line, so the game shows a line. Where that line is held is a
    // physics question, not a decoration.
    drawInk(ctx, scene) {
      const segs = scene.inkWorldSegments();
      if (!segs.length) return;
      const W = HG.Scene.INK_W;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // the faintest drop shadow, so the wire still reads on a pale prop
      ctx.strokeStyle = 'rgba(45,59,71,.10)';
      ctx.lineWidth = W;
      ctx.beginPath();
      segs.forEach((s) => {
        ctx.moveTo(s.x1 + 0.6, s.y1 + 1);
        ctx.lineTo(s.x2 + 0.6, s.y2 + 1);
      });
      ctx.stroke();
      // body
      ctx.strokeStyle = C.stroke;
      ctx.lineWidth = W;
      ctx.beginPath();
      segs.forEach((s) => {
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
      });
      ctx.stroke();
      ctx.restore();
    }

    // ------------------------------------------------------------------ water
    drawWater(ctx, scene) {
      const ps = scene.water.particles;
      if (!ps.length) return;
      const R = HG.Water.R;
      // pass 1 — darker silhouette (reads as the rim of the liquid)
      ctx.beginPath();
      for (let i = 0; i < ps.length; i++) {
        const b = ps[i].body;
        ctx.moveTo(b.position.x + R + 1.5, b.position.y);
        ctx.arc(b.position.x, b.position.y, R + 1.5, 0, HG.TAU);
      }
      ctx.fillStyle = C.waterDeep;
      ctx.fill();
      // pass 2 — the liquid itself
      ctx.beginPath();
      for (let i = 0; i < ps.length; i++) {
        const b = ps[i].body;
        ctx.moveTo(b.position.x + R + 0.4, b.position.y);
        ctx.arc(b.position.x, b.position.y, R + 0.4, 0, HG.TAU);
      }
      ctx.fillStyle = C.water;
      ctx.fill();
      // pass 3 — highlights only where the surface is exposed (looks wet).
      // A coarse height grid keeps this O(n) instead of O(n^2).
      const CELL = 26;
      const cols = Math.ceil(HG.W / CELL) + 2;
      const rows = Math.ceil(HG.H / CELL) + 2;
      if (!this._topGrid || this._topGrid.length < cols * rows) {
        this._topGrid = new Float32Array(cols * rows);
      }
      const grid = this._topGrid;
      grid.fill(0);
      const cellOf = (p) => {
        const cx = M.clamp((p.x / CELL) | 0, 0, cols - 1);
        const cy = M.clamp((p.y / CELL) | 0, 0, rows - 1);
        return { cx, cy, i: cy * cols + cx };
      };
      for (let i = 0; i < ps.length; i++) {
        const { cx, cy, i: gi } = cellOf(ps[i].body.position);
        // store the highest (smallest y) droplet per cell
        if (grid[gi] === 0 || ps[i].body.position.y < grid[gi]) grid[gi] = ps[i].body.position.y;
        void cx; void cy;
      }
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < ps.length; i++) {
        const b = ps[i].body;
        const { cx, cy } = cellOf(b.position);
        let exposed = true;
        for (let gx = cx - 1; gx <= cx + 1 && exposed; gx++) {
          for (let gy = cy - 1; gy <= cy + 1; gy++) {
            const top = grid[gy * cols + gx];
            if (top !== 0 && top < b.position.y - R * 0.75) { exposed = false; break; }
          }
        }
        if (!exposed) continue;
        ctx.beginPath();
        ctx.arc(b.position.x - 1.2, b.position.y - 2.4, Math.min(2.6, R * 0.34), 0, HG.TAU);
        ctx.fill();
      }

      // splash droplets
      const sp = scene.water.splashes;
      if (sp.length) {
        ctx.save();
        ctx.fillStyle = C.waterDeep;
        for (const s of sp) {
          ctx.globalAlpha = Math.max(0, s.life) * 0.85;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, HG.TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawEvap(ctx, scene) {
      if (!scene.evapPuffs.length) return;
      ctx.save();
      for (const p of scene.evapPuffs) {
        ctx.globalAlpha = Math.max(0, p.life) * 0.55;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (2 - p.life), 0, HG.TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // ------------------------------------------------------------------- taps
    drawFaucet(ctx, f, dt) {
      const x = f.x, y = f.y;
      const active = f.remaining > 0 && f.flow;
      ctx.save();
      // base plate
      this.popShadow(ctx, 88, 16);
      HG.roundRectPath(ctx, x - 44, y - 12, 88, 16, 7);
      ctx.fillStyle = '#dfe3e5';
      ctx.fill();
      this.outline(ctx, 3.2);
      ctx.save();
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(x - 44, y - 12, 88, 5);
      ctx.restore();

      // body
      const bob = active ? Math.sin(this.t * 0.012) * 0.8 : 0;
      this.popShadow(ctx, 62, 56);
      HG.roundRectPath(ctx, x - 31, y - 78 + bob, 62, 62, 10);
      const grd = ctx.createLinearGradient(x - 31, 0, x + 31, 0);
      grd.addColorStop(0, '#e6ebee');
      grd.addColorStop(0.5, '#c9d2d8');
      grd.addColorStop(1, '#a4b0b9');
      ctx.fillStyle = grd;
      ctx.fill();
      this.outline(ctx, 3.4);

      // down arrow
      ctx.save();
      ctx.translate(x, y - 47 + bob);
      ctx.beginPath();
      ctx.moveTo(0, 13);
      ctx.lineTo(-11, -1);
      ctx.lineTo(-4.5, -1);
      ctx.lineTo(-4.5, -14);
      ctx.lineTo(4.5, -14);
      ctx.lineTo(4.5, -1);
      ctx.lineTo(11, -1);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      this.outline(ctx, 2.6);
      ctx.restore();

      // nozzle opening
      HG.roundRectPath(ctx, x - 13, y - 20, 26, 10, 4);
      ctx.fillStyle = '#8f9ca6';
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // pouring drip
      if (active) {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = C.waterDeep;
        const t = (this.t * 0.02) % 1;
        ctx.beginPath();
        ctx.arc(x + Math.sin(this.t * 0.01) * 3, y - 4 + t * 10, 3.2, 0, HG.TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (f.remaining <= 0) {
        // empty: little "x" or nothing
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = '#8f9ca6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x - 22, y - 60, 4, 0, HG.TAU);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    popShadow(ctx, w, h) {
      ctx.save();
      ctx.shadowColor = 'rgba(45,59,71,.18)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = 'rgba(0,0,0,0)';
      HG.roundRectPath(ctx, -w / 2, -h / 2, w, h, 8);
      ctx.fill();
      ctx.restore();
    }

    // A short caption with the level's tip, visible for the first few seconds
    // (and again whenever the tap is still closed).
    drawTip(ctx, scene) {
      const tip = scene.level && scene.level.tip;
      if (!tip) return;
      const t = scene.time;
      let alpha = 0;
      if (scene.state === 'idle') alpha = 0.9;
      else if (t < 5200) alpha = 0.9 * Math.min(1, (5200 - t) / 900) * Math.min(1, t / 400);
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = '500 19px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(tip).width + 44;
      const x = HG.W / 2, y = HG.H - 54;
      HG.roundRectPath(ctx, x - w / 2, y - 22, w + 8, 44, 22);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(45,59,71,.28)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = C.inkSoft;
      ctx.fillText(tip, x, y + 1);
      ctx.restore();
    }

    drawStartHint(ctx, scene) {
      const f = scene.faucets[0];
      if (!f) return;
      const pulse = (Math.sin(this.t * 0.004) + 1) / 2;
      ctx.save();
      ctx.globalAlpha = 0.45 + pulse * 0.4;
      ctx.fillStyle = C.inkSoft;
      ctx.font = '600 17px Fredoka, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('draw, then lift your pencil to start the tap', f.x, f.y + 46);
      ctx.restore();
    }

    // ===================================================================== HUD
    drawHUD(ctx, game, scene) {
      const k = this.hudScale;
      const barW = 300 * k;
      const barH = 56 * k;
      const x = this.cw / 2 - barW / 2;
      const y = 10 * k;
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);

      // wooden bar
      ctx.save();
      ctx.shadowColor = 'rgba(45,59,71,.22)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      HG.roundRectPath(ctx, 0, 0, 300, 56, 14);
      const g = ctx.createLinearGradient(0, 0, 0, 56);
      g.addColorStop(0, '#f0d9b8');
      g.addColorStop(0.5, '#e3c49b');
      g.addColorStop(1, '#d3ac7c');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      HG.roundRectPath(ctx, 0, 0, 300, 56, 14);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3.2;
      ctx.stroke();
      // grain
      ctx.save();
      HG.roundRectPath(ctx, 0, 0, 300, 56, 14);
      ctx.clip();
      ctx.strokeStyle = 'rgba(140,100,60,.18)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(6, 12 + i * 12);
        ctx.bezierCurveTo(90, 8 + i * 12, 200, 20 + i * 12, 294, 12 + i * 12);
        ctx.stroke();
      }
      ctx.restore();

      this.buttons = [];

      // ---- level dial
      const dial = { x: 34, y: 28, r: 21 };
      ctx.save();
      ctx.beginPath();
      ctx.arc(dial.x, dial.y, dial.r, 0, HG.TAU);
      ctx.fillStyle = '#fdf7ec';
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 3;
      ctx.stroke();
      // progress arc (stars earned in this level's ink)
      const left = scene ? M.clamp(scene.inkRemaining() / scene.ink.budget, 0, 1) : 1;
      ctx.beginPath();
      ctx.arc(dial.x, dial.y, dial.r - 4.5, -Math.PI * 0.85, -Math.PI * 0.85 + HG.TAU * 0.85 * left);
      ctx.strokeStyle = left > 0.66 ? '#8ec33a' : left > 0.33 ? '#e9b93c' : '#e07a63';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 16px Fredoka, sans-serif';
      ctx.fillText(String(game.levelId), dial.x, dial.y - 1);
      ctx.font = '500 7.5px Fredoka, sans-serif';
      ctx.fillText('LEVEL', dial.x, dial.y + 11);
      ctx.restore();

      // ---- buttons
      const items = [
        { id: 'restart', x: 100, icon: 'restart' },
        { id: 'help', x: 152, icon: 'help' },
        { id: 'home', x: 204, icon: 'home' },
        { id: 'sound', x: 256, icon: HG.Sfx && HG.Sfx.muted ? 'soundoff' : 'sound' },
      ];
      items.forEach((it) => {
        const cy = 28;
        this.buttons.push({ id: it.id, x: x + it.x * k, y: y + cy * k, r: 19 * k });
        ctx.save();
        ctx.beginPath();
        ctx.arc(it.x, cy, 18, 0, HG.TAU);
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.fill();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 2.6;
        ctx.stroke();
        this.drawIcon(ctx, it.icon, it.x, cy);
        ctx.restore();
      });

      // ---- ink meter
      const mx = 46, my = 72, mw = 208, mh = 15;
      const used = scene ? M.clamp(scene.ink.used / scene.ink.budget, 0, 1) : 0;
      ctx.save();
      HG.roundRectPath(ctx, mx, my, mw, mh, 7);
      ctx.fillStyle = '#efece2';
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2.6;
      ctx.stroke();
      ctx.save();
      HG.roundRectPath(ctx, mx + 2, my + 2, mw - 4, mh - 4, 5);
      ctx.clip();
      const fillW = (mw - 4) * (1 - used);
      const gg = ctx.createLinearGradient(0, my, 0, my + mh);
      gg.addColorStop(0, '#b6e05a');
      gg.addColorStop(0.5, '#a8d641');
      gg.addColorStop(1, '#8dbc2c');
      ctx.fillStyle = gg;
      ctx.fillRect(mx + 2, my + 2, fillW, mh - 4);
      ctx.fillStyle = 'rgba(255,255,255,.45)';
      ctx.fillRect(mx + 2, my + 3, fillW, 3);
      ctx.restore();
      // segment dividers
      [1 / 3, 2 / 3].forEach((f) => {
        const dx = mx + 2 + (mw - 4) * (1 - f);
        ctx.beginPath();
        ctx.moveTo(dx, my + 1);
        ctx.lineTo(dx, my + mh - 1);
        ctx.strokeStyle = 'rgba(45,59,71,.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
      // star markers under the bar
      const starsLeft = left > 0.66 ? 3 : left > 0.33 ? 2 : 1;
      [1 / 3, 2 / 3].forEach((f, i) => {
        const sx = mx + 2 + (mw - 4) * (1 - f);
        const filled = starsLeft >= 3 - i;
        ctx.save();
        ctx.translate(sx, my + mh + 11);
        ctx.scale(0.72, 0.72);
        ctx.beginPath();
        ctx.moveTo(0, -11);
        for (let p = 1; p <= 10; p++) {
          const a = -Math.PI / 2 + (p * Math.PI) / 5;
          const rr = p % 2 ? 11 : 4.6;
          ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = filled ? C.star : '#fffdf6';
        ctx.fill();
        ctx.strokeStyle = filled ? C.starDark : 'rgba(45,59,71,.4)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();

      ctx.restore();

      // level name, bottom-left, very subtle
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = C.inkSoft;
      ctx.font = '500 ' + Math.round(13 * this.hudScale) + 'px Fredoka, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText((game.levelId < 10 ? '0' : '') + game.levelId + ' · ' + game.level.name,
        14 * this.hudScale, this.ch - 14 * this.hudScale);
      ctx.restore();
    }

    drawIcon(ctx, name, x, y) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = C.ink;
      ctx.fillStyle = C.ink;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (name === 'eraser') {
        ctx.save();
        ctx.rotate(-0.5);
        HG.roundRectPath(ctx, -9, -6, 18, 12, 3);
        ctx.fillStyle = '#f6f2e6';
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-1, -6);
        ctx.lineTo(-1, 6);
        ctx.stroke();
        ctx.fillStyle = '#9fb0bd';
        ctx.fillRect(-9, -6, 8, 12);
        ctx.restore();
      } else if (name === 'restart') {
        ctx.beginPath();
        ctx.arc(0, 0, 9, -Math.PI * 0.35, Math.PI * 1.15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-2, -12);
        ctx.lineTo(-8, -8.5);
        ctx.lineTo(-2.5, -4.5);
        ctx.closePath();
        ctx.fill();
      } else if (name === 'help') {
        ctx.beginPath();
        ctx.arc(0, -1, 8.4, 0, HG.TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -4.4, 3.4, Math.PI * 1.08, Math.PI * 2.1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, -1);
        ctx.lineTo(0, 2.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 6, 1.3, 0, HG.TAU);
        ctx.fill();
      } else if (name === 'home') {
        ctx.beginPath();
        ctx.moveTo(-10, 1);
        ctx.lineTo(0, -10);
        ctx.lineTo(10, 1);
        ctx.stroke();
        HG.roundRectPath(ctx, -7, 0, 14, 10, 2);
        ctx.stroke();
      } else if (name === 'sound' || name === 'soundoff') {
        ctx.beginPath();
        ctx.moveTo(-10, -4);
        ctx.lineTo(-5, -4);
        ctx.lineTo(1, -9);
        ctx.lineTo(1, 9);
        ctx.lineTo(-5, 4);
        ctx.lineTo(-10, 4);
        ctx.closePath();
        ctx.fill();
        if (name === 'sound') {
          ctx.beginPath();
          ctx.arc(1, 0, 5, -0.8, 0.8);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(1, 0, 9, -0.8, 0.8);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(4, -5);
          ctx.lineTo(11, 5);
          ctx.moveTo(11, -5);
          ctx.lineTo(4, 5);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // ------------------------------------------------------------- overlays
    drawOverlays(ctx, game, scene) {
      if (!scene) return;
      // win flash
      if (scene.state === 'won') {
        const k = M.clamp(scene.winTimer / 0.5, 0, 1);
        ctx.save();
        ctx.globalAlpha = 0.25 * (1 - k);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, this.cw, this.ch);
        ctx.restore();
      }
      // cursor / pencil preview while drawing
      if (game.pointer && game.pointer.active && game.pointer.world && !game.pointer.blocked) {
        const p = this.toScreen(game.pointer.world.x, game.pointer.world.y);
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, HG.TAU);
        ctx.fillStyle = 'rgba(45,59,71,.35)';
        ctx.fill();
        ctx.restore();
      }
      // "no ink" flash
      if (scene.ink.active && scene.inkRemaining() <= 0.5) {
        ctx.save();
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = '#e07a63';
        ctx.font = '600 16px Fredoka, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('out of ink!', this.cw / 2, 120 * this.hudScale);
        ctx.restore();
      }
    }
  }

  HG.Renderer = Renderer;
  HG.HUD_H = HUD_H;
})(window);
