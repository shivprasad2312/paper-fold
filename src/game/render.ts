// ─────────────────────────────────────────────────────────────
// Canvas renderer: wooden ring board, ropes, pegs, animations
// ─────────────────────────────────────────────────────────────

import { Slots, RopeDef, slotPos, Hint } from './engine';

export interface PegAnim {
  from: number;
  to: number;
  start: number;
  dur: number;
}

export interface Scene {
  size: number;
  total: number;
  slots: Slots;
  ropes: RopeDef[];
  selected: number | null;
  hint: Hint | null;
  anim: PegAnim | null;
  won: boolean;
  time: number;
}

// ── color utils ──────────────────────────────────────────────

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── geometry ─────────────────────────────────────────────────

interface Geom {
  cx: number;
  cy: number;
  outerR: number;
  innerR: number;
  ringR: number;
  pegR: number;
  ropeW: number;
}

function geom(size: number): Geom {
  return {
    cx: size / 2,
    cy: size / 2,
    outerR: size * 0.455,
    innerR: size * 0.268,
    ringR: size * 0.365,
    pegR: size * 0.052,
    ropeW: size * 0.027,
  };
}

export function slotXY(i: number, total: number, g: Geom): { x: number; y: number } {
  const p = slotPos(i, total);
  return { x: g.cx + p.x * g.ringR, y: g.cy + p.y * g.ringR };
}

/** Hit test: returns slot index within tap range, or -1. */
export function hitSlot(x: number, y: number, total: number, size: number): number {
  const g = geom(size);
  const limit = g.pegR * 1.25;
  let best = -1;
  let bestD = limit;
  for (let i = 0; i < total; i++) {
    const p = slotXY(i, total, g);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

// ── drawing pieces ───────────────────────────────────────────

function drawBoard(ctx: CanvasRenderingContext2D, g: Geom, time: number, won: boolean) {
  const { cx, cy, outerR, innerR } = g;

  // soft drop shadow under the board
  ctx.save();
  const sh = ctx.createRadialGradient(cx, cy + outerR * 0.08, outerR * 0.5, cx, cy + outerR * 0.1, outerR * 1.12);
  sh.addColorStop(0, 'rgba(60,38,18,0.35)');
  sh.addColorStop(1, 'rgba(60,38,18,0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(cx, cy + outerR * 0.06, outerR * 1.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // wooden annulus (center stays transparent so the linen shows through)
  const wood = ctx.createRadialGradient(
    cx - outerR * 0.35,
    cy - outerR * 0.4,
    outerR * 0.1,
    cx,
    cy,
    outerR,
  );
  wood.addColorStop(0, '#f2d6ab');
  wood.addColorStop(0.55, '#ddb27c');
  wood.addColorStop(1, '#bd8750');
  ctx.fillStyle = wood;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.fill('evenodd');

  // wood grain — deterministic wavy annular strokes
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
  ctx.clip('evenodd');
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const seed = i * 137.508;
    const r = innerR + ((i * 37.7) % (outerR - innerR));
    const alpha = 0.035 + (i % 5) * 0.012;
    ctx.strokeStyle = `rgba(110,70,32,${alpha})`;
    ctx.lineWidth = 1 + (i % 3) * 0.7;
    ctx.beginPath();
    const startA = (seed % 360) * 0.01745;
    const len = 0.6 + (i % 7) * 0.28;
    for (let s = 0; s <= 24; s++) {
      const a = startA + (s / 24) * len;
      const wob = Math.sin(a * 5 + i) * 2.2 + Math.sin(a * 11 + i * 1.7) * 1.1;
      const rr = r + wob;
      const x = cx + Math.cos(a) * rr;
      const y = cy + Math.sin(a) * rr;
      if (s === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // outer rim
  ctx.lineWidth = g.outerR * 0.018;
  ctx.strokeStyle = 'rgba(122,76,34,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = g.outerR * 0.008;
  ctx.strokeStyle = 'rgba(255,240,214,0.5)';
  ctx.beginPath();
  ctx.arc(cx, cy, outerR - g.outerR * 0.028, 0, Math.PI * 2);
  ctx.stroke();

  // inner hole with recessed shadow (center stays transparent → linen shows through)
  const hole = ctx.createRadialGradient(cx, cy, innerR * 0.55, cx, cy, innerR);
  hole.addColorStop(0, 'rgba(70,45,20,0)');
  hole.addColorStop(0.82, 'rgba(70,45,20,0.12)');
  hole.addColorStop(0.95, 'rgba(52,32,14,0.55)');
  hole.addColorStop(1, 'rgba(40,24,10,0.75)');
  ctx.fillStyle = hole;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = g.innerR * 0.03;
  ctx.strokeStyle = 'rgba(90,56,26,0.6)';
  ctx.beginPath();
  ctx.arc(cx, cy, innerR - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // win celebration ring
  if (won) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 380);
    ctx.strokeStyle = `rgba(232,195,58,${0.35 + pulse * 0.4})`;
    ctx.lineWidth = g.outerR * 0.012;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR * (0.97 - pulse * 0.02), 0, Math.PI * 2);
    ctx.stroke();
  }
}

type HoleGlow = 'none' | 'selectable' | 'hint';

function drawEmptyHole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  glow: HoleGlow,
  time: number,
) {
  // recessed dark hole
  const grad = ctx.createRadialGradient(x - r * 0.15, y - r * 0.2, r * 0.1, x, y, r);
  grad.addColorStop(0, '#241709');
  grad.addColorStop(0.65, '#432c14');
  grad.addColorStop(0.92, '#6e4a26');
  grad.addColorStop(1, '#8a5f33');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

  // rim light, top-left
  ctx.lineWidth = r * 0.12;
  ctx.strokeStyle = 'rgba(255,232,196,0.4)';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, Math.PI * 0.95, Math.PI * 1.55);
  ctx.stroke();

  if (glow !== 'none') {
    const pulse = 0.5 + 0.5 * Math.sin(time / 240);
    ctx.strokeStyle =
      glow === 'hint'
        ? `rgba(93,224,108,${0.55 + pulse * 0.4})`
        : `rgba(255,240,214,${0.45 + pulse * 0.35})`;
    ctx.lineWidth = r * 0.11;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.18 + pulse * r * 0.12, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawCrosshair(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  const pulse = 0.5 + 0.5 * Math.sin(time / 200);
  const R = r * 1.35 + pulse * r * 0.18;
  ctx.save();
  ctx.strokeStyle = '#5de06c';
  ctx.lineWidth = r * 0.1;
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(93,224,108,0.8)';
  ctx.shadowBlur = r * 0.35;
  // four ticks
  const tick = r * 0.5;
  const gap = r * 0.28;
  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];
  for (const [dx, dy] of dirs) {
    ctx.beginPath();
    ctx.moveTo(x + dx * (R - gap), y + dy * (R - gap));
    ctx.lineTo(x + dx * (R - gap - tick), y + dy * (R - gap - tick));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y, R - gap - tick - r * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRope(
  ctx: CanvasRenderingContext2D,
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  color: string,
  w: number,
  highlight: boolean,
) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  // drop shadow
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(58,38,18,0.32)';
  ctx.lineWidth = w + w * 0.18;
  ctx.beginPath();
  ctx.moveTo(p1.x + w * 0.12, p1.y + w * 0.22);
  ctx.lineTo(p2.x + w * 0.12, p2.y + w * 0.22);
  ctx.stroke();
  ctx.restore();

  if (highlight) {
    ctx.save();
    ctx.shadowColor = 'rgba(232,195,58,0.9)';
    ctx.shadowBlur = w * 1.1;
  }

  // base strand
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // twisted fiber strands (two offset dashed strokes, opposite phase)
  const off = w * 0.24;
  const dash = [w * 0.55, w * 0.55];
  for (const side of [-1, 1]) {
    ctx.strokeStyle = shade(color, side > 0 ? 0.22 : -0.18);
    ctx.lineWidth = w * 0.17;
    ctx.setLineDash(dash);
    ctx.lineDashOffset = side > 0 ? 0 : w * 0.55;
    ctx.beginPath();
    ctx.moveTo(p1.x + nx * off * side, p1.y + ny * off * side);
    ctx.lineTo(p2.x + nx * off * side, p2.y + ny * off * side);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // soft center highlight
  ctx.strokeStyle = shade(color, 0.3);
  ctx.lineWidth = w * 0.08;
  ctx.beginPath();
  ctx.moveTo(p1.x - nx * off * 0.4, p1.y - ny * off * 0.4);
  ctx.lineTo(p2.x - nx * off * 0.4, p2.y - ny * off * 0.4);
  ctx.stroke();

  if (highlight) ctx.restore();
}

function drawPeg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  state: 'normal' | 'selected' | 'hint' | 'moving',
  time: number,
) {
  ctx.save();

  if (state === 'selected' || state === 'moving') {
    r *= 1.1;
    ctx.shadowColor = 'rgba(70,44,16,0.5)';
    ctx.shadowBlur = r * 0.55;
    ctx.shadowOffsetY = r * 0.22;
  } else {
    ctx.shadowColor = 'rgba(70,44,16,0.35)';
    ctx.shadowBlur = r * 0.3;
    ctx.shadowOffsetY = r * 0.14;
  }

  const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.12, x, y, r);
  grad.addColorStop(0, '#f4d49e');
  grad.addColorStop(0.55, '#cf9458');
  grad.addColorStop(1, '#96602c');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // rim
  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = 'rgba(110,68,28,0.65)';
  ctx.beginPath();
  ctx.arc(x, y, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

  // glossy cap
  const cap = ctx.createRadialGradient(x - r * 0.32, y - r * 0.38, r * 0.05, x - r * 0.2, y - r * 0.3, r * 0.7);
  cap.addColorStop(0, 'rgba(255,244,222,0.75)');
  cap.addColorStop(1, 'rgba(255,244,222,0)');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.fill();

  if (state === 'selected') {
    ctx.strokeStyle = 'rgba(232,195,58,0.95)';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.18, 0, Math.PI * 2);
    ctx.stroke();
  } else if (state === 'hint') {
    const pulse = 0.5 + 0.5 * Math.sin(time / 220);
    ctx.strokeStyle = `rgba(93,224,108,${0.6 + pulse * 0.4})`;
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(x, y, r * (1.16 + pulse * 0.08), 0, Math.PI * 2);
    ctx.stroke();
  }
}

// ── main scene ───────────────────────────────────────────────

export function drawScene(ctx: CanvasRenderingContext2D, s: Scene) {
  const g = geom(s.size);
  ctx.clearRect(0, 0, s.size, s.size);

  // animation progress
  let animT = 1;
  if (s.anim) {
    animT = Math.min(1, (s.time - s.anim.start) / s.anim.dur);
  }
  const animActive = s.anim !== null && animT < 1;
  const eased = easeInOutCubic(animT);

  const xy = (slot: number) => {
    const base = slotXY(slot, s.total, g);
    if (s.anim && animActive && slot === s.anim.to) {
      const a = slotXY(s.anim.from, s.total, g);
      return { x: a.x + (base.x - a.x) * eased, y: a.y + (base.y - a.y) * eased };
    }
    return base;
  };

  drawBoard(ctx, g, s.time, s.won);

  // empty holes
  for (let i = 0; i < s.total; i++) {
    if (s.slots[i] !== null) continue;
    const p = slotXY(i, s.total, g);
    const isHintTarget = s.hint?.to === i;
    const selectable = s.selected !== null && !isHintTarget;
    drawEmptyHole(
      ctx,
      p.x,
      p.y,
      g.pegR * 0.98,
      isHintTarget ? 'hint' : selectable ? 'selectable' : 'none',
      s.time,
    );
    if (isHintTarget) drawCrosshair(ctx, p.x, p.y, g.pegR, s.time);
  }

  // ropes (under pegs)
  s.ropes.forEach((rope, id) => {
    let a = -1;
    let b = -1;
    for (let i = 0; i < s.slots.length; i++) {
      if (s.slots[i] === id) {
        if (a === -1) a = i;
        else b = i;
      }
    }
    if (a === -1 || b === -1) return;
    const p1 = xy(a);
    const p2 = xy(b);
    const involvesHint =
      s.hint !== null && (s.hint.from === a || s.hint.from === b || s.hint.to === a || s.hint.to === b);
    drawRope(ctx, p1, p2, rope.color, g.ropeW, involvesHint);
  });

  // pegs
  for (let i = 0; i < s.total; i++) {
    if (s.slots[i] === null) continue;
    if (animActive && s.anim!.to === i) continue; // moving peg drawn separately
    const p = slotXY(i, s.total, g);
    const state =
      s.selected === i ? 'selected' : s.hint?.from === i ? 'hint' : 'normal';
    drawPeg(ctx, p.x, p.y, g.pegR, state, s.time);
  }

  // moving peg on top
  if (s.anim && animActive) {
    const p = xy(s.anim.to);
    drawPeg(ctx, p.x, p.y, g.pegR, 'moving', s.time);
  }
}
