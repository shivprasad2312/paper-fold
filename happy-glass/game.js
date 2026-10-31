/* game.js -- renderer, input and level flow for the Happy Glass clone. */
import { LEVELS, FIELD } from "./levels.js";
import { createWorld, addInkStroke, step, fillState, R } from "./engine.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const water = document.createElement("canvas");
const wctx = water.getContext("2d");

const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = FIELD.w * DPR;
canvas.height = FIELD.h * DPR;
water.width = FIELD.w;
water.height = FIELD.h;

const INK_COLOUR = "#20242c";
const INK_R = 7;

let levelIndex = 0;
let world = null;
let inkLeft = 0;
let strokes = [];          // committed strokes, for drawing
let drawing = null;        // current stroke points
let won = false;

const els = {
  name: document.getElementById("lvName"),
  num: document.getElementById("lvNum"),
  ink: document.getElementById("inkFill"),
  inkText: document.getElementById("inkText"),
  progress: document.getElementById("progressFill"),
  win: document.getElementById("win"),
  winText: document.getElementById("winText"),
  levels: document.getElementById("levels"),
};

/* ------------------------------------------------------------------ state */

function loadLevel(i) {
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, i));
  const level = LEVELS[levelIndex];
  world = createWorld(structuredClone(level));
  inkLeft = level.ink;
  strokes = [];
  drawing = null;
  won = false;
  els.win.classList.remove("show");
  els.num.textContent = `Level ${levelIndex + 1}`;
  els.name.textContent = level.name;
  drawLevelPills();
  updateHud();
}

function resetLevel() {
  const keep = levelIndex;
  loadLevel(keep);
}

function updateHud() {
  const total = LEVELS[levelIndex].ink;
  els.ink.style.width = `${(inkLeft / total) * 100}%`;
  els.inkText.textContent = `${Math.round(inkLeft)} px`;
  const f = fillState(world);
  els.progress.style.width = `${Math.min(100, f.ratio * 100)}%`;
}

/* ------------------------------------------------------------------ input */

function toField(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((ev.clientX - r.left) / r.width) * FIELD.w,
    y: ((ev.clientY - r.top) / r.height) * FIELD.h,
  };
}

canvas.addEventListener("pointerdown", (ev) => {
  if (won || inkLeft <= 1) return;
  canvas.setPointerCapture(ev.pointerId);
  drawing = [toField(ev)];
});

canvas.addEventListener("pointermove", (ev) => {
  if (!drawing || won) return;
  const p = toField(ev);
  const last = drawing[drawing.length - 1];
  const d = Math.hypot(p.x - last.x, p.y - last.y);
  if (d < 4) return;
  if (d > inkLeft) {                 // consume what's left, then stop
    const k = inkLeft / d;
    drawing.push({ x: last.x + (p.x - last.x) * k, y: last.y + (p.y - last.y) * k });
    inkLeft = 0;
    commit();
    return;
  }
  drawing.push(p);
  inkLeft -= d;
  updateHud();
});

canvas.addEventListener("pointerup", () => {
  if (drawing) commit();
});

canvas.addEventListener("pointercancel", () => {
  drawing = null;
});

function commit() {
  if (!drawing || drawing.length < 2) { drawing = null; return; }
  strokes.push(drawing);
  addInkStroke(world, drawing, INK_R);
  drawing = null;
  updateHud();
}

document.getElementById("reset").addEventListener("click", resetLevel);
document.getElementById("again").addEventListener("click", resetLevel);
document.getElementById("next").addEventListener("click", () =>
  loadLevel(levelIndex + 1 >= LEVELS.length ? 0 : levelIndex + 1));

/* ------------------------------------------------------------------ drawing */

function roundCapsule(x1, y1, x2, y2, r, fill, stroke) {
  ctx.beginPath();
  ctx.lineCap = "round";
  ctx.lineWidth = r * 2;
  if (stroke) ctx.strokeStyle = stroke;
  if (fill) ctx.strokeStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, FIELD.h);
  g.addColorStop(0, "#fdfcf8");
  g.addColorStop(1, "#f2efe6");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FIELD.w, FIELD.h);

  // faint grid, keeps the empty field from feeling flat
  ctx.save();
  ctx.strokeStyle = "rgba(60,70,90,.045)";
  ctx.lineWidth = 1;
  for (let x = 60; x < FIELD.w; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, FIELD.h); ctx.stroke();
  }
  for (let y = 60; y < FIELD.h; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(FIELD.w, y); ctx.stroke();
  }
  ctx.restore();
}

function drawPipe() {
  const p = LEVELS[levelIndex].pipe;
  const x = p.x - p.w / 2 - 12;
  const w = p.w + 24;
  const top = -40, h = p.y + 40;

  ctx.save();
  ctx.fillStyle = "#3b4453";
  ctx.beginPath();
  ctx.roundRect(x, top, w, h, 14);
  ctx.fill();

  ctx.fillStyle = "#4b5563";
  ctx.beginPath();
  ctx.roundRect(x + 6, top, w - 12, h - 10, 10);
  ctx.fill();

  // lip
  ctx.fillStyle = "#2c3440";
  ctx.beginPath();
  ctx.roundRect(x - 6, p.y - 5, w + 12, 22, 10);
  ctx.fill();
  ctx.restore();
}

function drawObstacles() {
  for (const o of LEVELS[levelIndex].obstacles || []) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = "#39414f";
    ctx.lineWidth = (o.r || 9) * 2 + 3;
    ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
    ctx.strokeStyle = "#525c6e";
    ctx.lineWidth = (o.r || 9) * 2 - 3;
    ctx.beginPath(); ctx.moveTo(o.x1, o.y1); ctx.lineTo(o.x2, o.y2); ctx.stroke();
    ctx.restore();
  }
}

function drawGlassBack() {
  const g = LEVELS[levelIndex].glass;
  ctx.save();
  ctx.fillStyle = "rgba(196,229,248,.32)";
  ctx.beginPath();
  ctx.roundRect(g.x, g.y, g.w, g.h, 4);
  ctx.fill();
  ctx.restore();
}

function drawGlassFront() {
  const g = LEVELS[levelIndex].glass;
  const f = fillState(world);

  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(120,178,214,.95)";
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(g.x - 4, g.y);
  ctx.lineTo(g.x - 4, g.y + g.h);
  ctx.lineTo(g.x + g.w + 4, g.y + g.h);
  ctx.lineTo(g.x + g.w + 4, g.y);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(g.x + 3, g.y + 12);
  ctx.lineTo(g.x + 3, g.y + g.h - 16);
  ctx.stroke();

  // target line
  const targetY = g.y + g.h - (LEVELS[levelIndex].targetH ?? g.h * 0.5);
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "rgba(58,160,230,.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(g.x + 6, targetY);
  ctx.lineTo(g.x + g.w - 6, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  // face
  const mood = Math.min(1, f.ratio);
  const eyeY = g.y + 42;
  const cx = g.x + g.w / 2;
  ctx.fillStyle = "#3a4658";
  for (const ex of [cx - 22, cx + 22]) {
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 5.5, 7 - mood * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#3a4658";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  const m = -16 + mood * 32;             // frown -> smile
  ctx.moveTo(cx - 20, eyeY + 46);
  ctx.quadraticCurveTo(cx, eyeY + 46 + (m > 0 ? m * 0.9 : m * 0.9), cx + 20, eyeY + 46);
  ctx.stroke();
  ctx.restore();
}

function drawInk() {
  ctx.save();
  ctx.lineCap = "round";
  ctx.strokeStyle = INK_COLOUR;
  ctx.lineWidth = INK_R * 2;
  for (const s of strokes) {
    ctx.beginPath();
    ctx.moveTo(s[0].x, s[0].y);
    for (let i = 1; i < s.length; i++) ctx.lineTo(s[i].x, s[i].y);
    ctx.stroke();
  }
  if (drawing && drawing.length > 1) {
    ctx.beginPath();
    ctx.moveTo(drawing[0].x, drawing[0].y);
    for (let i = 1; i < drawing.length; i++) ctx.lineTo(drawing[i].x, drawing[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWater() {
  wctx.clearRect(0, 0, FIELD.w, FIELD.h);
  wctx.fillStyle = "#3aa0e6";
  wctx.beginPath();
  for (const p of world.particles) {
    if (!p.alive) continue;
    wctx.moveTo(p.x + R, p.y);
    wctx.arc(p.x, p.y, R, 0, Math.PI * 2);
  }
  wctx.fill();

  ctx.save();
  if ("filter" in ctx) {
    ctx.filter = "blur(6px) contrast(15)";
  }
  ctx.drawImage(water, 0, 0);
  ctx.restore();

  // a little sheen on the surface
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.restore();
}

/* ------------------------------------------------------------------ loop */

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  const h = 1 / 120;
  let guard = 0;
  while (acc >= h && guard++ < 8) {
    step(world, h);
    acc -= h;
  }

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackground();
  drawGlassBack();
  drawWater();
  drawGlassFront();
  drawObstacles();
  drawInk();
  drawPipe();
  updateHud();

  if (world.win && !won) {
    won = true;
    const level = LEVELS[levelIndex];
    const spent = Math.round(level.ink - inkLeft);
    els.winText.textContent =
      `Used ${spent} of ${level.ink} px of ink. ` +
      (spent <= level.ink * 0.55 ? "Tidy work." : "It fits, just about.");
    els.win.classList.add("show");
  }

  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ sizing */

function fit() {
  const box = document.querySelector("main").getBoundingClientRect();
  const availW = Math.max(200, box.width - 24);
  const availH = Math.max(200, box.height - 8);
  const scale = Math.min(availW / FIELD.w, availH / FIELD.h);
  canvas.style.width = Math.round(FIELD.w * scale) + "px";
  canvas.style.height = Math.round(FIELD.h * scale) + "px";
}
window.addEventListener("resize", fit);
window.addEventListener("orientationchange", fit);

/* ------------------------------------------------------------------ levels ui */

function drawLevelPills() {
  els.levels.innerHTML = "";
  LEVELS.forEach((lv, i) => {
    const b = document.createElement("button");
    b.className = "pill" + (i === levelIndex ? " on" : "");
    b.textContent = i + 1;
    b.title = lv.name;
    b.addEventListener("click", () => loadLevel(i));
    els.levels.appendChild(b);
  });
}

loadLevel(0);
fit();
requestAnimationFrame(frame);
