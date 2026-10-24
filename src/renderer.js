import { FRUITS } from './fruits.js';
import { WORLD } from './game.js';
import { TAU, clamp, easeOutCubic, mulberry32, hexA, roundRect } from './utils.js';
import { makeFruitSprite, drawBuddyFace, drawPageTexture, drawTornStrip, font } from './art.js';

const RATIO = WORLD.width / WORLD.height;
const DANGER_COLOR = '#e979a8';

/**
 * All world coordinates map onto the jar's *well* (the inner play area).
 * The paper sleeve is drawn outward from that rectangle, so fruit is never
 * hidden behind the frame.
 */
export class Renderer {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.ctx = canvas.getContext('2d');
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.w = 0;
    this.h = 0;
    this.page = null;
    this.sprites = FRUITS.map((f) => makeFruitSprite(f, 2, false));
    this.shake = 0;
    this.time = 0;
    this.aim = WORLD.width / 2;
    this.showAim = false;
    this.resize();
  }

  bump(amount) {
    this.shake = Math.min(13, this.shake + amount);
  }

  faceMood(seed = 0) {
    const phase = ((this.time / 1000 + seed * 0.371) % 6.2 + 6.2) % 6.2;
    const look = phase < 1.05 ? -1 : phase > 2.05 && phase < 3.1 ? 1 : 0;
    const blink = (phase > 4.55 && phase < 4.72) || (phase > 4.92 && phase < 5.08);
    return { look, blink };
  }

  drawBuddy(ctx, tier, x, y, size, angle = 0, seed = 0, lookOverride = null, blinkOverride = null, squish = 0) {
    const sprite = this.sprites[tier];
    const buddy = FRUITS[tier];
    const radius = buddy.r * (size / sprite.size);
    const mood = this.faceMood(seed);
    const look = lookOverride === null ? mood.look : lookOverride;
    const blink = blinkOverride === null ? mood.blink : blinkOverride;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(1 + squish * 0.08, 1 - squish * 0.055);
    ctx.drawImage(sprite.canvas, -size / 2, -size / 2, size, size);
    // The sprite body's center sits just below the image center.
    ctx.translate(0, radius * 0.04);
    drawBuddyFace(ctx, buddy, radius, look, blink);
    ctx.restore();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(280, rect.width);
    const h = Math.max(420, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.w = w;
    this.h = h;

    const headerH = clamp(w * 0.255, 90, 122);
    const hudH = h < 640 ? 54 : 66;
    const goalH = clamp(w * 0.115, 40, 54);
    const top = headerH;
    const bottom = h - hudH - goalH;

    const border = clamp(w * 0.024, 8, 14);
    const maxWellW = w - 28 - border * 2;
    const maxWellH = (bottom - top) * 0.97 - border * 2.4;
    const wellH = Math.min(maxWellH, maxWellW / RATIO);
    const wellW = wellH * RATIO;

    const wellX = (w - wellW) / 2;
    const wellY = top + (bottom - top - (wellH + border * 2.4)) / 2 + border;

    this.well = { x: wellX, y: wellY, w: wellW, h: wellH, k: wellW / WORLD.width };
    this.jar = {
      x: wellX - border,
      y: wellY - border,
      w: wellW + border * 2,
      h: wellH + border * 2.4,
      border,
      radius: clamp(wellW * 0.075, 16, 34),
    };
    this.headerH = headerH;
    this.goalY = h - hudH - goalH;
    this.goalH = goalH;

    this.page = document.createElement('canvas');
    this.page.width = this.canvas.width;
    this.page.height = this.canvas.height;
    drawPageTexture(this.page.getContext('2d'), w, h, this.dpr);
  }

  toScreen(x, y) {
    const { x: wx, y: wy, k } = this.well;
    return { x: wx + x * k, y: wy + y * k };
  }

  toWorld(sx, sy) {
    const { x: wx, y: wy, k } = this.well;
    return { x: (sx - wx) / k, y: (sy - wy) / k };
  }

  setAim(worldX) {
    this.aim = clamp(worldX, 0, WORLD.width);
    this.showAim = true;
  }

  setShowAim(v) {
    this.showAim = v;
  }

  render(dt) {
    const ctx = this.ctx;
    this.time += dt;
    this.shake *= Math.pow(0.88, dt / 16.67);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.drawImage(this.page, 0, 0, this.w, this.h);

    this.drawHeader(ctx);

    const sx = Math.sin(this.time / 17) * this.shake * 0.5;
    const sy = Math.cos(this.time / 13) * this.shake * 0.38;
    ctx.save();
    ctx.translate(sx, sy);

    this.drawJar(ctx);
    this.drawDangerLine(ctx);
    this.drawAim(ctx);
    this.drawFruits(ctx);
    this.drawPending(ctx);
    this.drawEffects(ctx);
    this.drawPreview(ctx);
    this.drawJarFront(ctx);

    ctx.restore();
    this.drawGoalStrip(ctx);
  }

  // ── header ────────────────────────────────────────────────────────────────
  drawHeader(ctx) {
    const w = this.w;
    const pad = clamp(w * 0.035, 12, 20);
    const gap = 10;
    const nextW = clamp(w * 0.255, 92, 128);
    const scoreW = w - pad * 2 - gap - nextW;
    const cardH = clamp(this.headerH * 0.66, 58, 84);
    const cardY = this.headerH - cardH - 4;

    // little toy-logo pill
    const tw = Math.min(w * 0.46, 190);
    const ty = clamp(this.headerH * 0.2, 15, 21);
    ctx.save();
    ctx.shadowColor = 'rgba(111,82,150,.2)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    roundRect(ctx, w / 2 - tw / 2, ty - 10, tw, 21, 11);
    const logo = ctx.createLinearGradient(0, ty - 10, 0, ty + 11);
    logo.addColorStop(0, '#d9c6fa');
    logo.addColorStop(1, '#bda3ee');
    ctx.fillStyle = logo;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.font = font(800, clamp(w * 0.027, 9.5, 11.5));
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '2.1px';
    ctx.fillText('FLUFFY MERGE', w / 2, ty + 0.5);
    ctx.letterSpacing = '0px';
    ctx.restore();

    // ── score card ──
    drawTornStrip(ctx, pad, cardY, scoreW, cardH, '#fffdf6', 11);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '1.8px';
    ctx.font = font(700, 8.6);
    ctx.fillStyle = '#8e7aa9';
    ctx.fillText('SCORE', pad + 13, cardY + 15);
    ctx.letterSpacing = '0px';

    const scoreText = formatScore(this.game.score);
    let scoreSize = clamp(scoreW * 0.26, 20, 32);
    ctx.font = font(700, scoreSize);
    const maxWidth = scoreW - 26;
    while (ctx.measureText(scoreText).width > maxWidth && scoreSize > 14) {
      scoreSize -= 1;
      ctx.font = font(700, scoreSize);
    }
    ctx.fillStyle = '#453452';
    ctx.fillText(scoreText, pad + 12, cardY + cardH * 0.68);

    const bestLabel = `BEST ${formatScore(Math.max(this.game.best, this.game.score))}`;
    ctx.font = font(700, 8.2);
    const bw = ctx.measureText(bestLabel).width + 14;
    const bh = 15;
    ctx.fillStyle = 'rgba(224, 210, 249, 0.82)';
    roundRect(ctx, pad + scoreW - bw - 7, cardY + cardH - bh - 6, bw, bh, 7.5);
    ctx.fill();
    ctx.fillStyle = '#75608f';
    ctx.letterSpacing = '0.5px';
    ctx.fillText(bestLabel, pad + scoreW - bw, cardY + cardH - bh + 3.6);
    ctx.letterSpacing = '0px';

    // ── next card ──
    const nx = w - pad - nextW;
    drawTornStrip(ctx, nx, cardY, nextW, cardH, '#fffdf6', 23);
    ctx.letterSpacing = '1.8px';
    ctx.font = font(700, 8.6);
    ctx.fillStyle = '#8e7aa9';
    ctx.fillText('NEXT PAL', nx + 13, cardY + 15);
    ctx.letterSpacing = '0px';

    const nextFruit = FRUITS[this.game.nextTier];
    const art = Math.min(cardH * 0.72, nextW * 0.5);
    const bob = Math.sin(this.time / 260) * 1.3;
    this.drawBuddy(
      ctx,
      this.game.nextTier,
      nx + nextW - 10 - art / 2,
      cardY + cardH * 0.54 + bob,
      art,
      Math.sin(this.time / 700) * 0.07,
      this.game.nextTier + 29
    );

    ctx.font = font(700, clamp(cardH * 0.14, 8, 9.4));
    ctx.fillStyle = '#75608f';
    ctx.letterSpacing = '0.7px';
    ctx.fillText(nextFruit.name.toUpperCase(), nx + 13, cardY + cardH - 9);
    ctx.letterSpacing = '0px';
  }

  // ── jar ───────────────────────────────────────────────────────────────────
  drawJar(ctx) {
    const { x, y, w, h, border, radius } = this.jar;
    const well = this.well;

    // desk shadow
    ctx.save();
    ctx.translate(x + w / 2, y + h + 12);
    ctx.scale(1, 0.15);
    const g = ctx.createRadialGradient(0, 0, w * 0.1, 0, 0, w * 0.8);
    g.addColorStop(0, 'rgba(98, 70, 42, 0.34)');
    g.addColorStop(1, 'rgba(98, 70, 42, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, w * 0.8, 0, TAU);
    ctx.fill();
    ctx.restore();

    // softly rounded acrylic cuddle jar
    ctx.save();
    ctx.shadowColor = 'rgba(88, 65, 116, 0.3)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 13;
    roundRect(ctx, x, y, w, h, radius);
    const sleeve = ctx.createLinearGradient(x, y, x + w, y + h);
    sleeve.addColorStop(0, '#fffaff');
    sleeve.addColorStop(0.42, '#eee4ff');
    sleeve.addColorStop(1, '#cbb8ed');
    ctx.fillStyle = sleeve;
    ctx.fill();
    ctx.restore();

    // glossy rim and inner edge
    ctx.save();
    roundRect(ctx, x + 0.6, y + 0.6, w - 1.2, h - 1.2, radius);
    ctx.strokeStyle = 'rgba(151, 125, 188, 0.68)';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    // luminous clear play well
    const ix = well.x;
    const iy = well.y;
    const iw = well.w;
    const ih = well.h;
    const ir = Math.max(7, radius * 0.5);

    roundRect(ctx, ix, iy, iw, ih, ir);
    const interior = ctx.createLinearGradient(ix, iy, ix, iy + ih);
    interior.addColorStop(0, '#e4dcfa');
    interior.addColorStop(0.35, '#faf5ff');
    interior.addColorStop(1, '#e8f1ff');
    ctx.fillStyle = interior;
    ctx.fill();

    // subtle lavender cloud tint inside the well
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, ir);
    ctx.clip();
    const random = mulberry32(5);
    for (let i = 0; i < 7; i++) {
      const cxp = ix + random() * iw;
      const cyp = iy + random() * ih;
      const rr = 40 + random() * 70;
      ctx.fillStyle = `rgba(161, 134, 195, ${0.012 + random() * 0.015})`;
      ctx.beginPath();
      ctx.ellipse(cxp, cyp, rr, rr * (0.5 + random() * 0.5), random() * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, ir);
    ctx.strokeStyle = 'rgba(157, 128, 192, 0.52)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // vertical shading down the walls
    const side = ctx.createLinearGradient(ix, 0, ix + iw, 0);
    side.addColorStop(0, 'rgba(93, 70, 128, 0.14)');
    side.addColorStop(0.07, 'rgba(93, 70, 128, 0)');
    side.addColorStop(0.93, 'rgba(93, 70, 128, 0)');
    side.addColorStop(1, 'rgba(93, 70, 128, 0.14)');
    ctx.fillStyle = side;
    roundRect(ctx, ix, iy, iw, ih, ir);
    ctx.fill();

    void border;
  }

  drawJarFront(ctx) {
    const { x, y, w, h, radius, border } = this.jar;
    const ix = this.well.x;
    const iy = this.well.y;
    const iw = this.well.w;
    const ih = this.well.h;
    const ir = Math.max(7, radius * 0.5);

    // inner shadow: fruit sinks into the well
    ctx.save();
    roundRect(ctx, ix, iy, iw, ih, ir);
    ctx.clip();
    const lip = ctx.createLinearGradient(0, iy, 0, iy + border * 3);
    lip.addColorStop(0, 'rgba(96, 66, 36, 0.28)');
    lip.addColorStop(0.55, 'rgba(96, 66, 36, 0.06)');
    lip.addColorStop(1, 'rgba(96, 66, 36, 0)');
    ctx.fillStyle = lip;
    ctx.fillRect(ix, iy, iw, border * 3);
    const foot = ctx.createLinearGradient(0, iy + ih - border * 2.2, 0, iy + ih);
    foot.addColorStop(0, 'rgba(96, 66, 36, 0)');
    foot.addColorStop(1, 'rgba(96, 66, 36, 0.18)');
    ctx.fillStyle = foot;
    ctx.fillRect(ix, iy + ih - border * 2.2, iw, border * 2.2);

    // soft glare bands, low key
    const glare = ctx.createLinearGradient(ix, iy, ix + iw * 0.55, iy + ih * 0.7);
    glare.addColorStop(0, 'rgba(255,255,255,0.2)');
    glare.addColorStop(0.3, 'rgba(255,255,255,0.03)');
    glare.addColorStop(0.65, 'rgba(255,255,255,0)');
    ctx.fillStyle = glare;
    ctx.fillRect(ix, iy, iw, ih);
    ctx.beginPath();
    ctx.ellipse(ix + iw * 0.135, iy + ih * 0.28, iw * 0.02, ih * 0.2, 0.02, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ix + iw * 0.9, iy + ih * 0.34, iw * 0.011, ih * 0.16, -0.02, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fill();
    ctx.restore();

    // top rim, bright strip of card
    ctx.save();
    roundRect(ctx, x, y, w, h, radius);
    ctx.clip();
    const rim = ctx.createLinearGradient(0, y, 0, y + border * 1.3);
    rim.addColorStop(0, 'rgba(255, 253, 255, 1)');
    rim.addColorStop(1, 'rgba(239, 227, 255, 0.92)');
    ctx.fillStyle = rim;
    ctx.fillRect(x, y, w, border * 1.3);
    ctx.strokeStyle = 'rgba(159, 129, 194, 0.48)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + border * 1.3);
    ctx.lineTo(x + w, y + border * 1.3);
    ctx.stroke();
    ctx.restore();
  }

  drawDangerLine(ctx) {
    const { k } = this.well;
    const ix = this.well.x;
    const iw = this.well.w;
    const lineY = this.well.y + WORLD.dangerLine * k;
    const danger = this.game.dangerLevel();
    const pulse = 0.5 + 0.5 * Math.sin(this.time / 210);
    const alpha = 0.4 + danger * 0.45 + pulse * danger * 0.12;

    ctx.save();
    const ir = Math.max(7, this.jar.radius * 0.5);
    roundRect(ctx, ix, this.well.y, iw, this.well.h, ir);
    ctx.clip();

    if (danger > 0.02) {
      const glow = ctx.createLinearGradient(0, lineY - 100 * k, 0, lineY + 34 * k);
      glow.addColorStop(0, `rgba(189, 83, 68, ${0.22 * danger})`);
      glow.addColorStop(1, 'rgba(189, 83, 68, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(ix, lineY - 100 * k, iw, 140 * k);
    }

    ctx.setLineDash([7, 6]);
    ctx.lineDashOffset = -this.time / 46;
    ctx.strokeStyle = hexA(DANGER_COLOR, alpha);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let px = ix + 6; px <= ix + iw - 6; px += 9) {
      const y = lineY + Math.sin((px + this.time / 30) / 22) * 1.2;
      if (px === ix + 6) ctx.moveTo(px, y);
      else ctx.lineTo(px, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();

    // flag sits on the inner edge so it never touches the sleeve
    const flagW = 48;
    const flagH = 13;
    const fx = ix + iw - flagW - 7;
    ctx.save();
    ctx.fillStyle = hexA(DANGER_COLOR, 0.16 + danger * 0.3);
    roundRect(ctx, fx, lineY - flagH / 2, flagW, flagH, 3);
    ctx.fill();
    ctx.font = font(700, 7.6);
    ctx.fillStyle = hexA(DANGER_COLOR, 0.85);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = '0.8px';
    ctx.fillText('CLOUD LINE', fx + flagW / 2, lineY + 0.5);
    ctx.letterSpacing = '0px';
    ctx.restore();
  }

  drawAim(ctx) {
    if (!this.showAim || this.game.over) return;
    const { k } = this.well;
    const tier = this.game.nextTier;
    const r = FRUITS[tier].r;
    const x = this.game.clampAim(this.aim, tier);

    let landing = WORLD.height - r;
    for (const fruit of this.game.fruits) {
      const fr = FRUITS[fruit.tier].r;
      const dx = Math.abs(fruit.body.position.x - x);
      if (dx < fr + r * 0.55) {
        landing = Math.min(landing, fruit.body.position.y - fr - r);
      }
    }
    landing = clamp(landing, WORLD.spawnY + r, WORLD.height);

    const start = this.toScreen(x, WORLD.spawnY);
    const end = this.toScreen(x, landing);
    const grad = ctx.createLinearGradient(0, start.y, 0, end.y);
    grad.addColorStop(0, 'rgba(118, 91, 151, 0.38)');
    grad.addColorStop(1, 'rgba(118, 91, 151, 0.08)');
    ctx.save();
    ctx.setLineDash([4, 7]);
    ctx.lineDashOffset = -this.time / 70;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.translate(end.x, end.y + r * k * 0.72);
    ctx.scale(1, 0.34);
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = this.time / 60;
    ctx.beginPath();
    ctx.arc(0, 0, r * k * 0.82, 0, TAU);
    ctx.strokeStyle = 'rgba(112, 82, 150, 0.4)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  drawFruits(ctx) {
    const { k } = this.well;
    const ix = this.well.x;
    const iy = this.well.y;
    const iw = this.well.w;
    const ih = this.well.h;
    const rr = Math.max(7, this.jar.radius * 0.5);

    ctx.save();
    // clip sides and floor only — fruit may peek out of the mouth
    ctx.beginPath();
    ctx.moveTo(ix, iy - 4000);
    ctx.lineTo(ix + iw, iy - 4000);
    ctx.lineTo(ix + iw, iy + ih - rr);
    ctx.quadraticCurveTo(ix + iw, iy + ih, ix + iw - rr, iy + ih);
    ctx.lineTo(ix + rr, iy + ih);
    ctx.quadraticCurveTo(ix, iy + ih, ix, iy + ih - rr);
    ctx.closePath();
    ctx.clip();

    for (const fruit of this.game.fruits) {
      const sprite = this.sprites[fruit.tier];
      const p = this.toScreen(fruit.body.position.x, fruit.body.position.y);
      const popT = clamp(1 - fruit.pop, 0, 1);
      const popScale = fruit.pop > 0 ? 0.45 + 0.55 * easeOutBack(popT) : 1;
      const size = sprite.size * k * popScale;
      const aimLook = this.showAim ? clamp((this.aim - fruit.body.position.x) / 48, -1, 1) : null;
      const age = this.game.now - fruit.bornAt;
      const landingSquish = fruit.spawn && age >= 0 && age < 300
        ? Math.sin((age / 300) * Math.PI) * Math.exp(-age / 230)
        : 0;
      const nearbyMerge = this.game.effects.some((effect) => {
        if (effect.kind !== 'merge' || effect.t > 230) return false;
        const dx = fruit.body.position.x - effect.x;
        const dy = fruit.body.position.y - effect.y;
        return dx * dx + dy * dy < Math.pow(FRUITS[effect.tier].r * 2.8, 2);
      });
      this.drawBuddy(ctx, fruit.tier, p.x, p.y, size, fruit.body.angle, fruit.id, aimLook, nearbyMerge ? true : null, landingSquish);
    }
    ctx.restore();
  }

  drawPending(ctx) {
    const { k } = this.well;
    for (const item of this.game.pending) {
      const progress = clamp(item.t / item.dur, 0, 1);
      const p = this.toScreen(item.x, item.y);
      const sprite = this.sprites[item.tier - 1];
      const size = sprite.size * k * (1 - progress * 0.5);
      ctx.save();
      ctx.globalAlpha = 1 - progress * 0.75;
      this.drawBuddy(ctx, item.tier - 1, p.x, p.y, size, progress * 0.5, item.tier + 37);
      ctx.restore();
    }
  }

  drawPreview(ctx) {
    if (this.game.over) return;
    const { k } = this.well;
    const tier = this.game.nextTier;
    const fruit = FRUITS[tier];
    const x = this.game.clampAim(this.aim, tier);
    const bob = Math.sin(this.time / 300) * 2;
    const p = this.toScreen(x, WORLD.spawnY);
    const sprite = this.sprites[tier];
    const size = sprite.size * k;

    // thread from above the jar mouth
    const top = { x: p.x, y: this.well.y - this.jar.border * 0.6 };
    ctx.save();
    ctx.strokeStyle = 'rgba(126, 96, 162, 0.4)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(p.x, p.y - fruit.r * k + bob);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(top.x, top.y + 1.5, 2.4, 0, TAU);
    ctx.fillStyle = 'rgba(126, 96, 162, 0.48)';
    ctx.fill();

    ctx.globalAlpha = this.game.canDrop() ? 1 : 0.55;
    this.drawBuddy(ctx, tier, p.x, p.y + bob, size, Math.sin(this.time / 520) * 0.05, tier + 53);
    ctx.restore();
  }

  drawGoalStrip(ctx) {
    const w = this.w;
    const pad = clamp(w * 0.055, 16, 32);
    const stripW = w - pad * 2;
    const h = this.goalH * 0.82;
    const x = pad;
    const y = this.goalY + (this.goalH - h) / 2 - 3;
    const count = FRUITS.length;
    const slot = stripW / count;
    const topTier = this.game.topTier;
    const maxR = FRUITS[count - 1].r;

    const shelf = ctx.createLinearGradient(0, y + h, 0, y + h + 12);
    shelf.addColorStop(0, 'rgba(112, 82, 150, 0.14)');
    shelf.addColorStop(1, 'rgba(112, 82, 150, 0)');
    ctx.fillStyle = shelf;
    ctx.fillRect(x + 10, y + h, stripW - 20, 12);

    ctx.save();
    ctx.strokeStyle = 'rgba(176, 152, 203, 0.68)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.moveTo(x + 4, y + h);
    ctx.lineTo(x + stripW - 4, y + h);
    ctx.stroke();
    ctx.restore();

    for (let i = 0; i < count; i++) {
      const size = h * (0.66 + (FRUITS[i].r / maxR) * 0.34);
      const cx = x + slot * (i + 0.5);
      const cy = y + h - size * 0.47;
      const reached = i <= topTier;
      ctx.save();
      ctx.translate(cx, cy);
      if (!reached) {
        ctx.fillStyle = 'rgba(255, 252, 244, 0.6)';
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.42, 0, TAU);
        ctx.fill();
        ctx.setLineDash([2, 3]);
        ctx.strokeStyle = 'rgba(156, 130, 183, 0.7)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 0.34;
      }
      this.drawBuddy(ctx, i, 0, 0, size, 0, i + 79);
      ctx.restore();
    }
  }

  drawEffects(ctx) {
    const { k } = this.well;
    for (const fx of this.game.effects) {
      const t = clamp(fx.t / fx.dur, 0, 1);
      const p = this.toScreen(fx.x, fx.y);
      if (fx.kind === 'merge') {
        const fruit = FRUITS[fx.tier];
        const rad = fruit.r * k;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.78;
        ctx.strokeStyle = fruit.light;
        ctx.lineWidth = clamp(rad * 0.18, 2.6, 9) * (1 - t) + 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, rad * (0.7 + easeOutCubic(t) * 1.5), 0, TAU);
        ctx.stroke();
        ctx.restore();

        const random = mulberry32(fx.seed || 1);
        const bits = fx.tier >= 8 ? 22 : 15;
        for (let i = 0; i < bits; i++) {
          const angle = (i / bits) * TAU + random() * 0.7;
          const dist = rad * (1.1 + random() * 1.4) * easeOutCubic(t);
          const size = clamp(rad * 0.17, 3, 11) * (1 - t * 0.6);
          ctx.save();
          ctx.translate(
            p.x + Math.cos(angle) * dist,
            p.y + Math.sin(angle) * dist * 0.85 + t * t * rad
          );
          ctx.rotate(angle + t * 4);
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = [fruit.base, fruit.light, '#fff8ec'][i % 3];
          roundRect(ctx, -size / 2, -size / 2, size, size * (0.6 + random() * 0.8), 1.4);
          ctx.fill();
          ctx.restore();
        }

        if (fx.points) {
          ctx.save();
          ctx.globalAlpha = 1 - Math.pow(t, 2);
          ctx.font = font(700, clamp(rad * 0.54, 16, 28));
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fffdf6';
          ctx.strokeStyle = 'rgba(94, 66, 44, 0.6)';
          ctx.lineWidth = 3;
          const ty = p.y - rad * 0.6 - t * 38;
          ctx.strokeText(`+${fx.points}`, p.x, ty);
          ctx.fillText(`+${fx.points}`, p.x, ty);
          ctx.restore();
        }
        if (fx.combo >= 3) {
          ctx.save();
          ctx.globalAlpha = (1 - t) * clamp(1.3 - t, 0, 1);
          ctx.translate(p.x, p.y - rad * 1.2 - t * 26);
          ctx.rotate(-0.05);
          const label = `COMBO x${Math.min(fx.combo, 8)}`;
          ctx.font = font(800, clamp(rad * 0.44, 12, 20));
          const tw2 = ctx.measureText(label).width + 16;
          ctx.fillStyle = 'rgba(189, 83, 68, 0.94)';
          roundRect(ctx, -tw2 / 2, -12, tw2, 21, 4);
          ctx.fill();
          ctx.fillStyle = '#fff7ee';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, 0, -1);
          ctx.restore();
        }
      } else if (fx.kind === 'confetti') {
        const random = mulberry32(fx.seed || 9);
        ctx.save();
        for (let i = 0; i < 46; i++) {
          const startX = random() * this.w;
          const drift = (random() - 0.5) * 150;
          const delay = random() * 0.35;
          const tt = clamp((t - delay) / (1 - delay), 0, 1);
          const y = -20 + tt * (this.h + 60);
          const xPos = startX + drift * tt;
          const s = 4 + random() * 6;
          ctx.save();
          ctx.translate(xPos, y);
          ctx.rotate(tt * 9 + i);
          ctx.globalAlpha = 1 - Math.pow(tt, 3.4);
          ctx.fillStyle = [FRUITS[i % 11].base, FRUITS[(i * 3) % 11].light, '#fff5e4'][
            i % 3
          ];
          roundRect(ctx, -s / 2, -s / 4, s, s * 0.55, 1.5);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      void k;
    }
  }
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function formatScore(n) {
  return Number(n || 0).toLocaleString('en-US');
}
