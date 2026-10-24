import { TAU, mulberry32, clamp, roundRect } from './utils.js';

const FONT = '"Trebuchet MS", "Segoe UI", ui-rounded, system-ui, sans-serif';
export const font = (weight, size) => `${weight} ${size}px ${FONT}`;

const hash = (text) => {
  let h = 2166136261;
  for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
  return h >>> 0;
};

function ellipse(ctx, x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function roundedTriangle(ctx, x, y, size, color, inner) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-size * 0.55, size * 0.48);
  ctx.quadraticCurveTo(-size * 0.58, -size * 0.18, -size * 0.05, -size * 0.58);
  ctx.quadraticCurveTo(0, -size * 0.66, size * 0.1, -size * 0.52);
  ctx.quadraticCurveTo(size * 0.58, -size * 0.14, size * 0.55, size * 0.48);
  ctx.closePath();
  ctx.fill();
  if (inner) {
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.03, size * 0.24, size * 0.32, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawEars(ctx, buddy, cx, cy, r) {
  const s = buddy.species;
  const fur = buddy.base;
  const inner = buddy.accent;
  if (s === 'bunny' || s === 'unicorn') {
    ellipse(ctx, cx - r * 0.34, cy - r * 0.72, r * 0.19, r * 0.48, fur);
    ellipse(ctx, cx + r * 0.34, cy - r * 0.72, r * 0.19, r * 0.48, fur);
    ellipse(ctx, cx - r * 0.34, cy - r * 0.74, r * 0.09, r * 0.3, inner);
    ellipse(ctx, cx + r * 0.34, cy - r * 0.74, r * 0.09, r * 0.3, inner);
  } else if (s === 'cat' || s === 'fox' || s === 'dragon') {
    roundedTriangle(ctx, cx - r * 0.48, cy - r * 0.57, r * 0.64, fur, inner);
    roundedTriangle(ctx, cx + r * 0.48, cy - r * 0.57, r * 0.64, fur, inner);
  } else if (s === 'bear' || s === 'panda') {
    ellipse(ctx, cx - r * 0.55, cy - r * 0.46, r * 0.27, r * 0.29, s === 'panda' ? '#35313d' : fur);
    ellipse(ctx, cx + r * 0.55, cy - r * 0.46, r * 0.27, r * 0.29, s === 'panda' ? '#35313d' : fur);
    if (s === 'bear') {
      ellipse(ctx, cx - r * 0.55, cy - r * 0.46, r * 0.13, r * 0.15, inner);
      ellipse(ctx, cx + r * 0.55, cy - r * 0.46, r * 0.13, r * 0.15, inner);
    }
  } else if (s === 'owl') {
    ellipse(ctx, cx - r * 0.48, cy - r * 0.62, r * 0.2, r * 0.23, fur);
    ellipse(ctx, cx + r * 0.48, cy - r * 0.62, r * 0.2, r * 0.23, fur);
  } else if (s === 'lamb') {
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      ellipse(ctx, cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.53, r * 0.22, r * 0.22, buddy.light);
    }
  }
}

function drawFuzz(ctx, buddy, cx, cy, rx, ry, r, random) {
  // Soft outer halo and fine flyaway fibers make the sprite read as plush.
  ctx.save();
  ctx.strokeStyle = buddy.fur;
  ctx.lineCap = 'round';
  const strands = Math.round(140 + r * 2.5);
  for (let i = 0; i < strands; i++) {
    const a = random() * TAU;
    const ex = cx + Math.cos(a) * rx;
    const ey = cy + Math.sin(a) * ry;
    const len = r * (0.025 + random() * 0.065);
    ctx.globalAlpha = 0.22 + random() * 0.38;
    ctx.lineWidth = Math.max(0.65, r * (0.012 + random() * 0.018));
    ctx.beginPath();
    ctx.moveTo(ex - Math.cos(a) * len * 0.35, ey - Math.sin(a) * len * 0.35);
    ctx.lineTo(ex + Math.cos(a) * len, ey + Math.sin(a) * len);
    ctx.stroke();
  }
  ctx.restore();

  // Brushed fibers inside the plush, clipped to the body oval.
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.98, ry * 0.98, 0, 0, TAU);
  ctx.clip();
  for (let i = 0; i < Math.round(90 + r * 2); i++) {
    const x = cx + (random() * 2 - 1) * rx * 0.91;
    const y = cy + (random() * 2 - 1) * ry * 0.91;
    const len = r * (0.025 + random() * 0.09);
    ctx.globalAlpha = 0.12 + random() * 0.2;
    ctx.strokeStyle = random() > 0.48 ? '#fffefb' : buddy.dark;
    ctx.lineWidth = Math.max(0.55, r * 0.013);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (random() - 0.5) * len, y - len * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

/** Draw a separate expressive face layer so game sprites can blink and glance. */
export function drawBuddyFace(ctx, buddy, r, look = 0, closed = false) {
  const faceY = -r * 0.12;
  const eyeR = Math.max(1.35, r * 0.105);
  const eyeX = r * 0.28;
  const blush = `${buddy.accent}aa`;
  ellipse(ctx, -r * 0.48, faceY + r * 0.24, r * 0.14, r * 0.09, blush);
  ellipse(ctx, r * 0.48, faceY + r * 0.24, r * 0.14, r * 0.09, blush);

  if (closed) {
    ctx.strokeStyle = '#594454';
    ctx.lineWidth = Math.max(0.9, r * 0.065);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    [-1, 1].forEach((side) => {
      const x = side * eyeX;
      ctx.beginPath();
      ctx.moveTo(x - eyeR * 1.15, faceY + eyeR * 0.18);
      ctx.quadraticCurveTo(x, faceY - eyeR * 0.95, x + eyeR * 1.15, faceY + eyeR * 0.18);
      ctx.stroke();
    });
  } else {
    [-1, 1].forEach((side) => {
      const x = side * eyeX;
      // Warm ivory eye whites make the tiny moving pupils easy to read.
      ellipse(ctx, x, faceY, eyeR * 1.28, eyeR * 1.5, '#fff9ff');
      const pupilX = x + look * eyeR * 0.52;
      ellipse(ctx, pupilX, faceY + eyeR * 0.1, eyeR * 0.76, eyeR * 0.92, '#342a3c');
      ellipse(ctx, pupilX - eyeR * 0.19, faceY - eyeR * 0.28, eyeR * 0.25, eyeR * 0.25, '#fff');
    });
  }

  // Tiny beak or nose, plus a little curved smile.
  if (buddy.species === 'chick' || buddy.species === 'penguin' || buddy.species === 'owl') {
    ctx.fillStyle = buddy.accent;
    ctx.beginPath();
    ctx.moveTo(0, faceY + r * 0.11);
    ctx.lineTo(-r * 0.1, faceY + r * 0.23);
    ctx.quadraticCurveTo(0, faceY + r * 0.32, r * 0.1, faceY + r * 0.23);
    ctx.closePath();
    ctx.fill();
  } else {
    ellipse(ctx, 0, faceY + r * 0.14, Math.max(1, r * 0.07), Math.max(0.9, r * 0.055), buddy.species === 'fox' ? '#60403a' : buddy.accent);
  }
  ctx.strokeStyle = '#5a4050';
  ctx.lineWidth = Math.max(0.65, r * 0.035);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, faceY + r * 0.18);
  ctx.quadraticCurveTo(-r * 0.035, faceY + r * 0.28, -r * 0.1, faceY + r * 0.27);
  ctx.moveTo(0, faceY + r * 0.18);
  ctx.quadraticCurveTo(r * 0.035, faceY + r * 0.28, r * 0.1, faceY + r * 0.27);
  ctx.stroke();
}

/** Render one soft, fuzzy companion into a cached canvas sprite. */
export function makeFruitSprite(buddy, resolution = 2, withFace = true) {
  const r = buddy.r;
  const pad = Math.ceil(r * 0.82) + 10;
  const size = Math.ceil((r + pad) * 2);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size * resolution);
  canvas.height = Math.round(size * resolution);
  const ctx = canvas.getContext('2d');
  ctx.scale(resolution, resolution);
  const cx = size / 2;
  const cy = size / 2 + r * 0.04;
  const random = mulberry32(hash(buddy.key));
  const rx = r * (buddy.species === 'penguin' ? 0.79 : 0.88);
  const ry = r * (buddy.species === 'penguin' ? 0.96 : 0.84);

  // Grounding shadow beneath the toy.
  ctx.save();
  ctx.translate(cx, cy + ry * 0.9);
  ctx.scale(1, 0.23);
  const shadow = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.25);
  shadow.addColorStop(0, 'rgba(59,48,77,.22)');
  shadow.addColorStop(1, 'rgba(59,48,77,0)');
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.25, 0, TAU);
  ctx.fill();
  ctx.restore();

  // Ears, horns, wings and tufts sit behind the plush body.
  drawEars(ctx, buddy, cx, cy, r);
  if (buddy.species === 'unicorn') {
    ctx.fillStyle = '#ffd56f';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.11);
    ctx.lineTo(cx - r * 0.13, cy - r * 0.73);
    ctx.lineTo(cx + r * 0.13, cy - r * 0.73);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e5a74b';
    ctx.lineWidth = Math.max(0.7, r * 0.025);
    ctx.stroke();
  }
  if (buddy.species === 'penguin') {
    ellipse(ctx, cx - rx * 0.86, cy + r * 0.12, r * 0.24, r * 0.43, buddy.dark);
    ellipse(ctx, cx + rx * 0.86, cy + r * 0.12, r * 0.24, r * 0.43, buddy.dark);
  }

  // Plush body: softly shaded, fuzzy edge, no hard paper outline.
  const body = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.46, r * 0.05, cx, cy, r * 1.22);
  body.addColorStop(0, buddy.light);
  body.addColorStop(0.58, buddy.base);
  body.addColorStop(1, buddy.dark);
  ellipse(ctx, cx, cy, rx, ry, body);
  drawFuzz(ctx, buddy, cx, cy, rx, ry, r, random);

  // Character-specific belly/chest bib.
  if (['penguin', 'chick', 'dragon', 'bear', 'panda'].includes(buddy.species)) {
    ellipse(ctx, cx, cy + r * 0.35, rx * 0.57, ry * 0.47, buddy.belly);
  }
  if (buddy.species === 'fox') {
    ellipse(ctx, cx, cy + r * 0.35, rx * 0.63, ry * 0.42, buddy.belly);
    ellipse(ctx, cx, cy + r * 0.01, r * 0.42, r * 0.25, buddy.belly);
  }
  if (buddy.species === 'panda') {
    ellipse(ctx, cx - r * 0.31, cy - r * 0.08, r * 0.2, r * 0.26, buddy.accent);
    ellipse(ctx, cx + r * 0.31, cy - r * 0.08, r * 0.2, r * 0.26, buddy.accent);
  }
  if (buddy.species === 'owl') {
    ellipse(ctx, cx - r * 0.24, cy + r * 0.32, r * 0.25, r * 0.33, buddy.belly);
    ellipse(ctx, cx + r * 0.24, cy + r * 0.32, r * 0.25, r * 0.33, buddy.belly);
  }
  if (buddy.species === 'lamb') {
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      ellipse(ctx, cx + Math.cos(a) * r * 0.68, cy + Math.sin(a) * r * 0.58, r * 0.25, r * 0.25, buddy.light);
    }
  }

  // Tiny paws and feet.
  ellipse(ctx, cx - r * 0.34, cy + r * 0.64, r * 0.2, r * 0.17, buddy.light);
  ellipse(ctx, cx + r * 0.34, cy + r * 0.64, r * 0.2, r * 0.17, buddy.light);
  if (buddy.species === 'chick' || buddy.species === 'penguin') {
    ellipse(ctx, cx - r * 0.23, cy + r * 0.77, r * 0.22, r * 0.1, buddy.accent);
    ellipse(ctx, cx + r * 0.23, cy + r * 0.77, r * 0.22, r * 0.1, buddy.accent);
  }

  // Higher tiers earn a tiny accessory so progression reads at a glance.
  if (buddy.species === 'lamb' || buddy.species === 'unicorn') {
    for (let i = -1; i <= 1; i++) {
      ellipse(ctx, cx + i * r * 0.18, cy - r * 0.68, r * 0.075, r * 0.075, ['#ffd16b', '#ff9fbd', '#9fe1cf'][i + 1]);
    }
  }
  if (buddy.species === 'dragon') {
    ellipse(ctx, cx, cy - r * 0.78, r * 0.11, r * 0.15, buddy.accent);
  }
  if (buddy.species === 'unicorn') {
    ellipse(ctx, cx + r * 0.48, cy - r * 0.69, r * 0.18, r * 0.13, '#fb91c8');
  }

  if (withFace) {
    ctx.save();
    ctx.translate(cx, cy);
    drawBuddyFace(ctx, buddy, r);
    ctx.restore();
  }

  return { canvas, size, pad, resolution };
}

/** Soft pastel playroom backdrop: clean gradients, floating dots and sparkles. */
export function drawPageTexture(ctx, w, h, resolution = 1) {
  ctx.save();
  ctx.scale(resolution, resolution);
  ctx.fillStyle = '#f5efff';
  ctx.fillRect(0, 0, w, h);
  const wash = ctx.createRadialGradient(w * 0.48, h * 0.24, 12, w * 0.5, h * 0.53, Math.max(w, h) * 0.86);
  wash.addColorStop(0, '#fffdfd');
  wash.addColorStop(0.54, '#f8f1ff');
  wash.addColorStop(1, '#e6eafc');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, w, h);
  const random = mulberry32(934);
  for (let i = 0; i < 36; i++) {
    const x = random() * w;
    const y = random() * h;
    const r = 1 + random() * 3.8;
    ctx.globalAlpha = 0.11 + random() * 0.15;
    ctx.fillStyle = ['#f3a5c2', '#a990df', '#92c9e9', '#f2cc67'][i % 4];
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 0.2;
  ctx.font = '14px sans-serif';
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = i % 2 ? '#f1bd59' : '#bb9ce8';
    ctx.fillText('✦', random() * w, random() * h);
  }
  ctx.restore();
}

/** Rounded toy-like score panel, not a torn paper strip. */
export function drawTornStrip(ctx, x, y, w, h, color, seed = 3) {
  ctx.save();
  const radius = Math.min(16, h * 0.22);
  ctx.shadowColor = 'rgba(92,67,125,.16)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  roundRect(ctx, x, y + 3, w, h - 3, radius);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, color);
  g.addColorStop(1, seed % 2 ? '#f6f0ff' : '#fff8fc');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(202,183,225,.55)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function shade(hex, amount) {
  const h = hex.replace('#', '');
  const values = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return `rgb(${values.map((v) => clamp(Math.round(v * (1 + amount)), 0, 255)).join(',')})`;
}
