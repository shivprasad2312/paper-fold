import { TAU, mulberry32, clamp } from './utils.js';

const FONT = `"Trebuchet MS", "Segoe UI", ui-rounded, system-ui, sans-serif`;

export function font(weight, size) {
  return `${weight} ${size}px ${FONT}`;
}

function leafPath(ctx, x, y, len, wid, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.45, -wid, len, 0);
  ctx.quadraticCurveTo(len * 0.45, wid * 0.8, 0, 0);
  ctx.closePath();
  ctx.restore();
}

function drawLeaf(ctx, x, y, len, wid, rot, colors) {
  leafPath(ctx, x, y, len, wid, rot);
  const g = ctx.createLinearGradient(x, y - wid, x + len * 0.7, y + wid);
  g.addColorStop(0, colors.light);
  g.addColorStop(1, colors.dark);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,45,30,0.28)';
  ctx.lineWidth = Math.max(1, len * 0.05);
  ctx.stroke();
  // central vein
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(rot) * len * 0.08, y + Math.sin(rot) * len * 0.08);
  ctx.lineTo(
    x + Math.cos(rot) * len * 0.88,
    y + Math.sin(rot) * len * 0.88
  );
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(0.8, len * 0.035);
  ctx.stroke();
}

/**
 * Pre-render one fruit into a canvas. Sprites are cached so the render loop
 * only ever does a single drawImage per fruit.
 */
/** Silhouette of each fruit, as a radial multiplier on the physics circle. */
function shapeFactor(shape, theta) {
  const sin = Math.sin(theta);
  const cos = Math.cos(theta);
  const top = Math.max(0, -sin);
  const side = Math.abs(cos);
  switch (shape) {
    case 'cherry':
      return 1 - 0.1 * Math.pow(top, 12);
    case 'apple':
      return 1 - 0.13 * Math.pow(top, 14) + 0.025 * Math.pow(sin, 2);
    case 'peach':
      return 1 - 0.075 * Math.pow(top, 8) + 0.035 * Math.pow(Math.max(0, sin), 6);
    case 'pear':
      return (1 + 0.16 * sin) / 1.16;
    case 'lemon':
      return (0.945 + 0.13 * Math.pow(side, 14)) * (1 - 0.03 * sin * sin);
    case 'grape':
      return 1 + 0.02 * Math.cos(theta * 7);
    case 'pineapple':
      return 1 - 0.055 * sin * sin + 0.015 * side;
    default:
      return 1;
  }
}

function topFactor(shape) {
  switch (shape) {
    case 'cherry':
      return 0.9;
    case 'apple':
      return 0.87;
    case 'peach':
      return 0.93;
    case 'pear':
      return 0.8;
    case 'lemon':
      return 0.93;
    default:
      return 0.99;
  }
}

function traceShape(ctx, shape, cx, cy, radius, wobble = 0, seed = 0) {
  const random = mulberry32(seed);
  const steps = Math.max(48, Math.round(radius * 1.6));
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * TAU;
    const f =
      shapeFactor(shape, a) *
      (1 + (wobble ? (random() - 0.5) * wobble + Math.sin(a * 7) * wobble * 0.4 : 0));
    const px = cx + Math.cos(a) * radius * f;
    const py = cy + Math.sin(a) * radius * f;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function makeFruitSprite(fruit, resolution = 2) {
  const r = fruit.r;
  const shape = fruit.shape || 'circle';
  const pad = Math.ceil(r * 0.72) + 14;
  const size = Math.ceil((r + pad) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * resolution);
  canvas.height = Math.round(size * resolution);
  const ctx = canvas.getContext('2d');
  ctx.scale(resolution, resolution);
  const cx = size / 2;
  const cy = size / 2;
  const random = mulberry32(hashString(fruit.key));
  const top = topFactor(shape);

  // ---- soft contact shadow -------------------------------------------------
  ctx.save();
  ctx.translate(cx + r * 0.08, cy + r * 0.26);
  ctx.scale(1, 0.74);
  const sh = ctx.createRadialGradient(0, 0, r * 0.42, 0, 0, r * 1.14);
  sh.addColorStop(0, 'rgba(96, 66, 42, 0.2)');
  sh.addColorStop(0.8, 'rgba(96, 66, 42, 0.07)');
  sh.addColorStop(1, 'rgba(96, 66, 42, 0)');
  ctx.fillStyle = sh;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.14, 0, TAU);
  ctx.fill();
  ctx.restore();

  // ---- stems / crowns behind the body -------------------------------------
  if (fruit.deco === 'stem' || shape === 'cherry' || shape === 'apple') {
    const stemTop = cy - r * top * 1.1;
    ctx.save();
    ctx.strokeStyle = '#8a5a34';
    ctx.lineWidth = Math.max(2, r * 0.082);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.04, cy - r * top * 0.96);
    ctx.quadraticCurveTo(cx + r * 0.2, stemTop + r * 0.08, cx + r * 0.09, stemTop - r * 0.16);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = Math.max(1, r * 0.026);
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.02, cy - r * top * 0.98);
    ctx.quadraticCurveTo(cx + r * 0.17, stemTop + r * 0.1, cx + r * 0.06, stemTop - r * 0.15);
    ctx.stroke();
    ctx.restore();
  }

  if (fruit.deco === 'crown') {
    const leaves = [-1.15, -0.72, -0.3, 0.14, 0.58, 0.95];
    leaves.forEach((a, i) => {
      drawLeaf(
        ctx,
        cx + r * 0.02,
        cy - r * top * 0.92,
        r * (0.5 + (Math.abs(a) < 0.4 ? 0.28 : i % 2 ? 0.02 : 0.12)),
        r * 0.135,
        -Math.PI / 2 + a * 0.7,
        { light: i % 2 ? '#9cbe68' : '#86a955', dark: '#4b6c32' }
      );
    });
  }

  // ---- layered paper backing (offset like a hand-cut layer) ---------------
  ctx.save();
  ctx.translate(cx + r * 0.012, cy + r * 0.02);
  ctx.rotate(0.04);
  traceShape(ctx, shape, 0, 0, r * 1.045, 0.018, hashString(fruit.key) + 7);
  const back = ctx.createLinearGradient(-r, -r, r, r);
  back.addColorStop(0, '#fffdf6');
  back.addColorStop(0.6, '#fdf5e4');
  back.addColorStop(1, '#f0e2c9');
  ctx.fillStyle = back;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150, 118, 82, 0.32)';
  ctx.lineWidth = Math.max(0.9, r * 0.026);
  ctx.stroke();
  ctx.restore();

  // ---- coloured body ------------------------------------------------------
  const bodyR = r * 0.958;
  const gradient = ctx.createLinearGradient(
    cx - r * 0.6,
    cy - r * 0.72,
    cx + r * 0.62,
    cy + r * 0.78
  );
  gradient.addColorStop(0, fruit.light);
  gradient.addColorStop(0.44, fruit.base);
  gradient.addColorStop(1, fruit.dark);

  ctx.save();
  traceShape(ctx, shape, cx, cy, bodyR);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.clip();

  // matte light from the top-left
  const hi = ctx.createRadialGradient(
    cx - r * 0.34,
    cy - r * 0.4,
    r * 0.06,
    cx - r * 0.34,
    cy - r * 0.4,
    r * 1.1
  );
  hi.addColorStop(0, 'rgba(255,255,255,0.3)');
  hi.addColorStop(0.42, 'rgba(255,255,255,0.09)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  const shadeG = ctx.createRadialGradient(
    cx + r * 0.52,
    cy + r * 0.58,
    r * 0.1,
    cx + r * 0.52,
    cy + r * 0.58,
    r * 1.14
  );
  shadeG.addColorStop(0, 'rgba(62,34,26,0.23)');
  shadeG.addColorStop(1, 'rgba(62,34,26,0)');
  ctx.fillStyle = shadeG;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  drawDeco(ctx, fruit, cx, cy, r, random);
  if (fruit.skin) drawDeco(ctx, { ...fruit, deco: fruit.skin }, cx, cy, r, random);
  if (fruit.blush) drawDeco(ctx, { ...fruit, deco: fruit.blush }, cx, cy, r, random);

  // paper grain
  for (let i = 0; i < 30; i++) {
    const a = random() * TAU;
    const d = Math.sqrt(random()) * r;
    const len = r * (0.06 + random() * 0.14);
    ctx.strokeStyle =
      random() > 0.45 ? 'rgba(255,255,255,0.15)' : 'rgba(70,50,30,0.085)';
    ctx.lineWidth = Math.max(0.5, r * 0.011);
    ctx.beginPath();
    const px = cx + Math.cos(a) * d;
    const py = cy + Math.sin(a) * d;
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(a + 1.4) * len, py + Math.sin(a + 1.4) * len);
    ctx.stroke();
  }

  // inset fold shadow
  const inner = ctx.createRadialGradient(cx, cy, bodyR * 0.74, cx, cy, bodyR * 1.02);
  inner.addColorStop(0, 'rgba(70,44,26,0)');
  inner.addColorStop(1, 'rgba(70,44,26,0.19)');
  ctx.fillStyle = inner;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();

  // crease where the colour meets the card stock
  traceShape(ctx, shape, cx, cy, bodyR);
  ctx.strokeStyle = 'rgba(58, 36, 26, 0.28)';
  ctx.lineWidth = Math.max(0.9, r * 0.021);
  ctx.stroke();

  // matte sheen
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.32, cy - r * 0.42, r * 0.25, r * 0.14, -0.62, 0, TAU);
  ctx.fillStyle = 'rgba(255, 253, 244, 0.24)';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.3, cy + r * 0.34, r * 0.15, r * 0.085, -0.5, 0, TAU);
  ctx.fillStyle = 'rgba(255, 253, 244, 0.09)';
  ctx.fill();
  ctx.restore();

  // ---- leaf tucked under the stem -----------------------------------------
  if (['stem', 'peach', 'speckle', 'kiwi', 'apple'].includes(fruit.deco)) {
    drawLeaf(
      ctx,
      cx + r * 0.13,
      cy - r * top * 0.95,
      r * 0.44,
      r * 0.15,
      -0.5,
      { light: '#aecb7a', dark: '#61863c' }
    );
  }

  return { canvas, size, pad, resolution };
}

function drawDeco(ctx, fruit, cx, cy, r, random) {
  switch (fruit.deco) {
    case 'stripes': {
      ctx.strokeStyle = 'rgba(38, 74, 42, 0.55)';
      ctx.lineWidth = r * 0.15;
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * r * 0.44;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.16, cy - r);
        ctx.quadraticCurveTo(x + r * 0.2, cy, x - r * 0.16, cy + r);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = r * 0.04;
      for (let i = -2; i <= 2; i++) {
        const x = cx + i * r * 0.44 - r * 0.09;
        ctx.beginPath();
        ctx.moveTo(x - r * 0.16, cy - r);
        ctx.quadraticCurveTo(x + r * 0.2, cy, x - r * 0.16, cy + r);
        ctx.stroke();
      }
      break;
    }
    case 'net': {
      ctx.strokeStyle = 'rgba(255,255,255,0.42)';
      ctx.lineWidth = r * 0.022;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - r, cy + i * r * 0.3);
        ctx.quadraticCurveTo(cx, cy + i * r * 0.3 + r * 0.22, cx + r, cy + i * r * 0.3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + i * r * 0.3, cy - r);
        ctx.quadraticCurveTo(cx + i * r * 0.3, cy, cx + i * r * 0.3, cy + r);
        ctx.stroke();
      }
      break;
    }
    case 'blush': {
      // soft rosy cheekbands, like pounced chalk on paper
      const cheeks = [
        [-0.42, -0.08, 0.42, 0.3],
        [0.44, 0.04, 0.36, 0.26],
      ];
      cheeks.forEach(([dx, dy, rw, rh]) => {
        const g = ctx.createRadialGradient(
          cx + dx * r,
          cy + dy * r,
          r * 0.02,
          cx + dx * r,
          cy + dy * r,
          r * rw
        );
        g.addColorStop(0, 'rgba(255, 196, 150, 0.34)');
        g.addColorStop(1, 'rgba(255, 196, 150, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(cx + dx * r, cy + dy * r, r * rw, r * rh, 0.2, 0, TAU);
        ctx.fill();
      });
      break;
    }
    case 'crosshatch': {
      ctx.save();
      ctx.strokeStyle = 'rgba(150, 104, 28, 0.34)';
      ctx.lineWidth = Math.max(0.9, r * 0.028);
      const step = r * 0.26;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - r + i * step, cy - r);
        ctx.lineTo(cx - r + i * step + r * 2, cy + r);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - r + i * step, cy + r);
        ctx.lineTo(cx - r + i * step + r * 2, cy - r);
        ctx.stroke();
      }
      // little studs at the crossings
      ctx.fillStyle = 'rgba(255, 226, 158, 0.42)';
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
          const px = cx - r + col * step * 1.35 + (row % 2 ? step * 0.68 : 0);
          const py = cy - r * 0.9 + row * step * 1.05;
          if (Math.hypot(px - cx, py - cy) > r * 0.93) continue;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(0.8, r * 0.028), 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
      break;
    }
    case 'peach': {
      const crease = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
      crease.addColorStop(0, 'rgba(160,60,60,0)');
      crease.addColorStop(0.4, 'rgba(160,60,60,0.28)');
      crease.addColorStop(1, 'rgba(160,60,60,0)');
      ctx.strokeStyle = crease;
      ctx.lineWidth = r * 0.09;
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.06, cy - r);
      ctx.quadraticCurveTo(cx + r * 0.22, cy, cx - r * 0.04, cy + r);
      ctx.stroke();
      break;
    }
    case 'kiwi': {
      ctx.beginPath();
      ctx.arc(cx + r * 0.06, cy + r * 0.05, r * 0.62, 0, TAU);
      const g = ctx.createRadialGradient(
        cx + r * 0.06,
        cy + r * 0.05,
        r * 0.05,
        cx + r * 0.06,
        cy + r * 0.05,
        r * 0.62
      );
      g.addColorStop(0, '#f3f5d8');
      g.addColorStop(0.55, '#dfeab0');
      g.addColorStop(1, '#c2d78b');
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = r * 0.03;
      ctx.stroke();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + 0.2;
        const d = r * 0.34 + (i % 3) * r * 0.075;
        ctx.beginPath();
        ctx.ellipse(
          cx + r * 0.06 + Math.cos(a) * d,
          cy + r * 0.05 + Math.sin(a) * d,
          r * 0.026,
          r * 0.05,
          a,
          0,
          TAU
        );
        ctx.fillStyle = 'rgba(48, 52, 28, 0.75)';
        ctx.fill();
      }
      break;
    }
    case 'grapes': {
      const bunch = [
        [-0.36, -0.26, 0.3],
        [0.02, -0.44, 0.27],
        [0.3, -0.08, 0.23],
        [-0.12, 0.3, 0.24],
        [0.45, 0.34, 0.19],
      ];
      bunch.forEach(([dx, dy, rr]) => {
        ctx.beginPath();
        ctx.arc(cx + dx * r, cy + dy * r, r * rr, 0, TAU);
        const g = ctx.createRadialGradient(
          cx + dx * r - r * 0.1,
          cy + dy * r - r * 0.1,
          r * 0.03,
          cx + dx * r,
          cy + dy * r,
          r * rr
        );
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
        g.addColorStop(1, 'rgba(60,30,90,0.3)');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(70,40,100,0.3)';
        ctx.lineWidth = r * 0.02;
        ctx.stroke();
      });
      break;
    }
    case 'speckle':
    case 'stem':
    case 'peach-freckle':
    default: {
      if (fruit.deco === 'speckle' || fruit.deco === 'stem') {
        ctx.fillStyle = 'rgba(80, 60, 30, 0.16)';
        for (let i = 0; i < 26; i++) {
          const a = random() * TAU;
          const d = Math.sqrt(random()) * r * 0.92;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, r * 0.022, 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
  }
}

function mix(a, b, t) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Warm, grainy sheet of paper for the page background. */
export function drawPageTexture(ctx, w, h, resolution = 1) {
  ctx.save();
  ctx.scale(resolution, resolution);
  ctx.fillStyle = '#f6ecdc';
  ctx.fillRect(0, 0, w, h);

  const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.85);
  g.addColorStop(0, 'rgba(255, 253, 245, 0.85)');
  g.addColorStop(0.55, 'rgba(250, 238, 218, 0.2)');
  g.addColorStop(1, 'rgba(216, 190, 158, 0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const random = mulberry32(7);
  // fibres
  for (let i = 0; i < 900; i++) {
    const x = random() * w;
    const y = random() * h;
    const len = 2 + random() * 12;
    const a = random() * TAU;
    ctx.strokeStyle =
      random() > 0.5 ? 'rgba(255,255,255,0.22)' : 'rgba(160,130,100,0.07)';
    ctx.lineWidth = 0.6 + random() * 0.7;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // grain
  for (let i = 0; i < 2600; i++) {
    const x = random() * w;
    const y = random() * h;
    ctx.fillStyle =
      random() > 0.5
        ? `rgba(255,255,255,${0.04 + random() * 0.07})`
        : `rgba(140,110,80,${0.02 + random() * 0.04})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }
  ctx.restore();
}

/** Card stock with a torn top edge — used for the header strip. */
export function drawTornStrip(ctx, x, y, w, h, color, seed = 3) {
  const random = mulberry32(seed);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + 10);
  const steps = Math.max(8, Math.round(w / 26));
  for (let i = 0; i <= steps; i++) {
    const px = x + (i / steps) * w;
    const py = y + Math.sin(i * 2.1) * 2.4 + random() * 5;
    ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, color);
  g.addColorStop(1, shade(color, -0.06));
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(110, 80, 50, 0.22)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.restore();
}

export function shade(hex, amount) {
  const [r, g, b] = parseHex(hex);
  const m = (v) =>
    clamp(Math.round(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount)), 0, 255);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

/** Wobbly hand-cut rectangle path (in place, no fill). */
export function paperRect(ctx, x, y, w, h, radius, seed = 1) {
  const random = mulberry32(seed);
  const rings = [
    [x + radius, y, w - radius * 2],
    [x + w, y + radius, h - radius * 2],
  ];
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.quadraticCurveTo(x + w / 2, y - 1 + random() * 2, x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.quadraticCurveTo(x + w + 1 - random() * 2, y + h / 2, x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.quadraticCurveTo(x + w / 2, y + h + 1 - random() * 2, x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.quadraticCurveTo(x - 1 + random() * 2, y + h / 2, x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  void rings;
}
