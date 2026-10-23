// ─────────────────────────────────────────────────────────────
// Canvas renderer: shape-aware wooden board, realistic twisted
// cotton ropes with over/under weave at crossings, pegs, holes.
// ─────────────────────────────────────────────────────────────

import { Slots, RopeDef, Hint, Crossing, Pt } from './engine';
import { ShapeKind, shapePolyline, scalePolyline } from './shapes';

export interface PegAnim {
  from: number;
  to: number;
  start: number;
  dur: number;
}

export interface Scene {
  size: number;
  shape: ShapeKind;
  points: Pt[];
  slots: Slots;
  ropes: RopeDef[];
  crossings: Crossing[];
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

function withAlpha(rgb: string, a: number): string {
  const m = rgb.match(/\d+/g)!;
  return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
}

function hash01(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── geometry ─────────────────────────────────────────────────

interface Geom {
  cx: number;
  cy: number;
  outerR: number;
  innerFactor: number;
  pegR: number;
  ropeW: number;
}

function geom(size: number): Geom {
  return {
    cx: size / 2,
    cy: size / 2,
    outerR: size * 0.43,
    innerFactor: 0.59,
    pegR: size * 0.05,
    ropeW: size * 0.026,
  };
}

function slotXY(i: number, points: Pt[], g: Geom): Pt {
  const p = points[i];
  return { x: g.cx + p.x * g.outerR, y: g.cy + p.y * g.outerR };
}

/** Hit test: returns slot index within tap range, or -1. */
export function hitSlot(x: number, y: number, points: Pt[], size: number): number {
  const g = geom(size);
  const limit = g.pegR * 1.3;
  let best = -1;
  let bestD = limit;
  for (let i = 0; i < points.length; i++) {
    const p = slotXY(i, points, g);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function tracePolyline(ctx: CanvasRenderingContext2D, line: Pt[], g: Geom) {
  ctx.beginPath();
  line.forEach((p, i) => {
    const x = g.cx + p.x * g.outerR;
    const y = g.cy + p.y * g.outerR;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

// ── board ────────────────────────────────────────────────────

function drawBoard(ctx: CanvasRenderingContext2D, g: Geom, shape: ShapeKind, time: number, won: boolean) {
  const outer = shapePolyline(shape);
  const inner = scalePolyline(outer, g.innerFactor);
  const { cx, cy, outerR } = g;

  // annulus path (outer shape with inner cutout — linen shows through)
  const annulus = () => {
    tracePolyline(ctx, outer, g);
    tracePolyline(ctx, inner, g);
  };

  // soft drop shadow
  ctx.save();
  ctx.shadowColor = 'rgba(60,38,18,0.4)';
  ctx.shadowBlur = outerR * 0.12;
  ctx.shadowOffsetY = outerR * 0.05;
  ctx.fillStyle = 'rgba(60,38,18,0.5)';
  tracePolyline(ctx, outer, g);
  ctx.fill();
  ctx.restore();

  // wood fill
  const wood = ctx.createRadialGradient(
    cx - outerR * 0.35,
    cy - outerR * 0.4,
    outerR * 0.1,
    cx,
    cy,
    outerR * 1.25,
  );
  wood.addColorStop(0, '#f2d6ab');
  wood.addColorStop(0.55, '#ddb27c');
  wood.addColorStop(1, '#bd8750');
  ctx.save();
  ctx.fillStyle = wood;
  ctx.beginPath();
  annulus();
  ctx.fill('evenodd');

  // grain — short tangent strokes inside the frame band
  ctx.clip('evenodd');
  ctx.lineCap = 'round';
  for (let i = 0; i < 95; i++) {
    const idx = Math.floor(hash01(i * 3.1) * outer.length);
    const f = 0.63 + hash01(i * 7.7) * 0.35;
    const p = outer[idx];
    const q = outer[(idx + 2) % outer.length];
    const tx = q.x - p.x;
    const ty = q.y - p.y;
    const x = cx + p.x * outerR * f;
    const y = cy + p.y * outerR * f;
    const len = outerR * (0.03 + hash01(i * 11.3) * 0.05);
    ctx.strokeStyle = `rgba(110,70,32,${0.04 + (i % 5) * 0.012})`;
    ctx.lineWidth = 1 + (i % 3) * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + tx * len * 4, y + ty * len * 4);
    ctx.stroke();
  }
  ctx.restore();

  // rims
  ctx.lineWidth = outerR * 0.018;
  ctx.strokeStyle = 'rgba(122,76,34,0.55)';
  tracePolyline(ctx, outer, g);
  ctx.stroke();
  ctx.lineWidth = outerR * 0.012;
  ctx.strokeStyle = 'rgba(90,56,26,0.6)';
  tracePolyline(ctx, inner, g);
  ctx.stroke();

  // recessed inner edge shadow
  ctx.save();
  ctx.strokeStyle = 'rgba(40,24,10,0.5)';
  ctx.lineWidth = outerR * 0.035;
  ctx.shadowColor = 'rgba(40,24,10,0.55)';
  ctx.shadowBlur = outerR * 0.05;
  tracePolyline(ctx, inner, g);
  ctx.stroke();
  ctx.restore();

  // win celebration ring
  if (won) {
    const pulse = 0.5 + 0.5 * Math.sin(time / 380);
    ctx.strokeStyle = `rgba(232,195,58,${0.35 + pulse * 0.4})`;
    ctx.lineWidth = outerR * 0.012;
    tracePolyline(ctx, scalePolyline(outer, 0.97 - pulse * 0.02), g);
    ctx.stroke();
  }
}

// ── holes & crosshair ────────────────────────────────────────

type HoleGlow = 'none' | 'selectable' | 'hint';

function drawEmptyHole(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, glow: HoleGlow, time: number) {
  const grad = ctx.createRadialGradient(x - r * 0.15, y - r * 0.2, r * 0.1, x, y, r);
  grad.addColorStop(0, '#241709');
  grad.addColorStop(0.65, '#432c14');
  grad.addColorStop(0.92, '#6e4a26');
  grad.addColorStop(1, '#8a5f33');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();

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
  const tick = r * 0.5;
  const gap = r * 0.28;
  const dirs: [number, number][] = [
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

// ── realistic twisted cotton rope ────────────────────────────

function drawRope(
  ctx: CanvasRenderingContext2D,
  p1: Pt,
  p2: Pt,
  color: string,
  w: number,
  highlight: boolean,
) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy) || 1;
  const angle = Math.atan2(dy, dx);
  const hw = w / 2;

  ctx.save();
  ctx.translate(p1.x, p1.y);
  ctx.rotate(angle);
  ctx.lineCap = 'round';

  ctx.strokeStyle = 'rgba(58,38,18,0.35)';
  ctx.lineWidth = w * 1.12;
  ctx.beginPath();
  ctx.moveTo(0, w * 0.2);
  ctx.lineTo(len, w * 0.2);
  ctx.stroke();

  if (highlight) {
    ctx.shadowColor = 'rgba(232,195,58,0.9)';
    ctx.shadowBlur = w * 1.1;
  }
  ctx.strokeStyle = withAlpha(shade(color, 0.32), 0.35);
  ctx.lineWidth = w * 1.1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();
  ctx.shadowBlur = 0;

  const hairCount = Math.floor(len / (w * 0.9));
  for (let i = 0; i < hairCount; i++) {
    const seed = i * 17 + 3;
    const hx = hash01(seed) * len;
    const side = hash01(seed + 2) > 0.5 ? 1 : -1;
    const hy = side * hw * (0.8 + hash01(seed + 4) * 0.25);
    const hlen = w * (0.1 + hash01(seed + 6) * 0.16);
    const ha = side * (Math.PI / 2 + (hash01(seed + 8) - 0.5) * 0.9);
    ctx.strokeStyle = withAlpha(shade(color, 0.4), 0.18 + hash01(seed + 1) * 0.12);
    ctx.lineWidth = Math.max(1, w * 0.028);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(ha) * hlen, hy + Math.sin(ha) * hlen);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(0, -hw);
  ctx.lineTo(len, -hw);
  ctx.arc(len, 0, hw, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(0, hw);
  ctx.arc(0, 0, hw, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.clip();

  const cyl = ctx.createLinearGradient(0, -hw, 0, hw);
  cyl.addColorStop(0, shade(color, -0.22));
  cyl.addColorStop(0.28, shade(color, 0.05));
  cyl.addColorStop(0.5, shade(color, 0.26));
  cyl.addColorStop(0.72, shade(color, 0.02));
  cyl.addColorStop(1, shade(color, -0.24));
  ctx.fillStyle = cyl;
  ctx.fillRect(-w, -w, len + 2 * w, 2 * w);

  const spacing = w * 0.82;
  const ribRun = w * 0.66;
  let k = 0;
  let x = -w;
  while (x < len + w) {
    const jitter = (hash01(k * 7 + 1) - 0.5) * w * 0.12;
    const gx = x + jitter;

    ctx.strokeStyle = withAlpha(shade(color, -0.24), 0.7);
    ctx.lineWidth = w * 0.24;
    ctx.beginPath();
    ctx.moveTo(gx, -hw * 1.2);
    ctx.lineTo(gx + ribRun, hw * 1.2);
    ctx.stroke();

    ctx.strokeStyle = withAlpha(shade(color, 0.38), 0.85);
    ctx.lineWidth = w * 0.14;
    ctx.beginPath();
    ctx.moveTo(gx + w * 0.26, -hw * 1.2);
    ctx.lineTo(gx + ribRun + w * 0.26, hw * 1.2);
    ctx.stroke();

    ctx.strokeStyle = withAlpha(shade(color, 0.12), 0.5);
    ctx.lineWidth = w * 0.08;
    ctx.beginPath();
    ctx.moveTo(gx + w * 0.46, -hw * 1.2);
    ctx.lineTo(gx + ribRun + w * 0.46, hw * 1.2);
    ctx.stroke();

    x += spacing;
    k++;
  }

  const fiberCount = Math.floor(len / (w * 0.32));
  for (let i = 0; i < fiberCount; i++) {
    const seed = i + k * 31;
    const fx = hash01(seed) * len;
    const fy = (hash01(seed + 99) - 0.5) * w * 0.82;
    const flen = w * (0.12 + hash01(seed + 7) * 0.22);
    const fa = (hash01(seed + 3) - 0.5) * 0.5;
    const light = hash01(seed + 5) > 0.5;
    ctx.strokeStyle = withAlpha(
      light ? shade(color, 0.45) : shade(color, -0.3),
      0.1 + hash01(seed + 1) * 0.08,
    );
    ctx.lineWidth = Math.max(1, w * 0.03);
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(fa) * flen, fy + Math.sin(fa) * flen);
    ctx.stroke();
  }

  ctx.strokeStyle = withAlpha(shade(color, 0.5), 0.55);
  ctx.lineWidth = w * 0.1;
  ctx.beginPath();
  ctx.moveTo(0, -hw * 0.32);
  ctx.lineTo(len, -hw * 0.32);
  ctx.stroke();
  ctx.strokeStyle = withAlpha(shade(color, -0.3), 0.5);
  ctx.lineWidth = w * 0.08;
  ctx.beginPath();
  ctx.moveTo(0, hw * 0.82);
  ctx.lineTo(len, hw * 0.82);
  ctx.stroke();

  ctx.restore();
}

// ── pegs ─────────────────────────────────────────────────────

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

  ctx.lineWidth = r * 0.1;
  ctx.strokeStyle = 'rgba(110,68,28,0.65)';
  ctx.beginPath();
  ctx.arc(x, y, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();

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

  let animT = 1;
  if (s.anim) animT = Math.min(1, (s.time - s.anim.start) / s.anim.dur);
  const animActive = s.anim !== null && animT < 1;
  const eased = easeInOutCubic(animT);

  const xy = (slot: number): Pt => {
    const base = slotXY(slot, s.points, g);
    if (s.anim && animActive && slot === s.anim.to) {
      const a = slotXY(s.anim.from, s.points, g);
      return { x: a.x + (base.x - a.x) * eased, y: a.y + (base.y - a.y) * eased };
    }
    return base;
  };

  drawBoard(ctx, g, s.shape, s.time, s.won);

  // empty holes
  for (let i = 0; i < s.slots.length; i++) {
    if (s.slots[i] !== null) continue;
    const p = slotXY(i, s.points, g);
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

  // endpoint lookup for weave bridges
  const endOf = new Map<number, [Pt, Pt]>();
  s.ropes.forEach((_, id) => {
    let a = -1;
    let b = -1;
    for (let i = 0; i < s.slots.length; i++) {
      if (s.slots[i] === id) {
        if (a === -1) a = i;
        else b = i;
      }
    }
    if (a >= 0 && b >= 0) endOf.set(id, [xy(a), xy(b)]);
  });

  // pass 1: every rope drawn underneath (hint rope glows)
  const hintRope = s.hint !== null ? s.slots[s.hint.from] : null;
  s.ropes.forEach((rope, id) => {
    const ep = endOf.get(id);
    if (!ep) return;
    drawRope(ctx, ep[0], ep[1], rope.color, g.ropeW, id === hintRope);
  });

  // pass 2: over/under weave — under-rope gap shading then the over bridge
  for (const c of s.crossings) {
    const overEp = endOf.get(c.over);
    if (!overEp) continue;
    const [a, b] = overEp;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const half = g.ropeW * 1.25;

    // dark gap on the under rope
    ctx.save();
    ctx.fillStyle = 'rgba(48,30,14,0.45)';
    ctx.beginPath();
    ctx.ellipse(c.point.x, c.point.y, g.ropeW * 1.05, g.ropeW * 0.72, Math.atan2(uy, ux), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // over rope bridge with full twisted texture
    const pA = { x: c.point.x - ux * half, y: c.point.y - uy * half };
    const pB = { x: c.point.x + ux * half, y: c.point.y + uy * half };
    drawRope(ctx, pA, pB, s.ropes[c.over].color, g.ropeW, c.over === hintRope);
  }

  // pegs
  for (let i = 0; i < s.slots.length; i++) {
    if (s.slots[i] === null) continue;
    if (animActive && s.anim!.to === i) continue;
    const p = slotXY(i, s.points, g);
    const state =
      s.selected === i ? 'selected' : s.hint?.from === i ? 'hint' : 'normal';
    drawPeg(ctx, p.x, p.y, g.pegR, state, s.time);
  }

  if (s.anim && animActive) {
    const p = xy(s.anim.to);
    drawPeg(ctx, p.x, p.y, g.pegR, 'moving', s.time);
  }
}
