import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glowTexture, beamTexture, disposeTree } from './textures.js';
import { key } from './rules.js';

const THICK = 0.42;
// Matte, porcelain-like slabs lit by the sun (see stage.js).
const TOP = 0xd9dde4;
const SIDE = 0x98a0ac;
const BOTTOM = 0x3c414a;

// Warm sandstone for cracked slabs.
const C_TOP = 0xcfa871;
const C_SIDE = 0x96703f;
const C_BOTTOM = 0x221709;
const C_RIM = 0xffa13d;

// Thin coloured edge highlights, one accent per level (EDGE-style).
const ACCENTS = [0x59ff7c, 0xff4fd8, 0xffe14f, 0x4fd8ff, 0xff8a4f, 0xb07cff, 0x7dffce, 0xff6a5e, 0x9dff4f, 0xff4f8e, 0x4fc8ff, 0xc8ff5e];
const ACCENT_BY_ID = new Map(ACCENTS.map((c, i) => [i + 1, c]));

function paintBox(geo, topHex, sideHex, bottomHex) {
  const count = geo.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const top = new THREE.Color(topHex).convertSRGBToLinear();
  const side = new THREE.Color(sideHex).convertSRGBToLinear();
  const bottom = new THREE.Color(bottomHex).convertSRGBToLinear();
  for (let i = 0; i < count; i++) {
    const face = Math.floor(i / 4); // px nx py ny pz nz
    const c = face === 2 ? top : face === 3 ? bottom : side;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

function slabGeometry(h, top, side, bottom) {
  const g = new THREE.BoxGeometry(0.994, THICK, 0.994);
  paintBox(g, top, side, bottom);
  g.translate(0, h - THICK / 2, 0);
  return g;
}

function pushSeg(arr, a, b) {
  arr.push(a[0], a[1], a[2], b[0], b[1], b[2]);
}

function linesGeometry(arr) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  return g;
}

function rimLines(x, z, h, thick, scale = 1) {
  const bright = [];
  const dim = [];
  const half = 0.5 * scale;
  const yTop = h + 0.008;
  const yBot = h - thick;
  const corners = [
    [x - half, yTop, z - half],
    [x + half, yTop, z - half],
    [x + half, yTop, z + half],
    [x - half, yTop, z + half],
  ];
  for (let i = 0; i < 4; i++) pushSeg(bright, corners[i], corners[(i + 1) % 4]);
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    pushSeg(dim, [a[0], yBot, a[2]], [b[0], yBot, b[2]]);
    pushSeg(dim, a, [a[0], yBot, a[2]]);
  }
  return { bright, dim };
}

export function buildLevelView(level) {
  const group = new THREE.Group();
  const staticGeos = [];
  const brightSegs = [];
  const dimSegs = [];
  const crumbles = new Map();

  const accent = ACCENT_BY_ID.get(level.id) || 0x59ff7c;
  const accentDim = new THREE.Color(accent).multiplyScalar(0.4);

  const bounds = {
    min: new THREE.Vector3(Infinity, Infinity, Infinity),
    max: new THREE.Vector3(-Infinity, -Infinity, -Infinity),
  };

  const slabMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.0,
    flatShading: true,
  });
  const crumbleMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.0,
    flatShading: true,
  });

  for (const tile of level.tiles.values()) {
    if (tile.crumble) continue;
    const g = slabGeometry(tile.h, TOP, SIDE, BOTTOM);
    g.translate(tile.x, 0, tile.z);
    staticGeos.push(g);
    const { bright, dim } = rimLines(tile.x, tile.z, tile.h, THICK);
    brightSegs.push(...bright);
    dimSegs.push(...dim);

    bounds.min.x = Math.min(bounds.min.x, tile.x - 0.5);
    bounds.max.x = Math.max(bounds.max.x, tile.x + 0.5);
    bounds.min.z = Math.min(bounds.min.z, tile.z - 0.5);
    bounds.max.z = Math.max(bounds.max.z, tile.z + 0.5);
    bounds.min.y = Math.min(bounds.min.y, tile.h - THICK);
    bounds.max.y = Math.max(bounds.max.y, tile.h + 1.6);
  }

  // Merge all static slabs into a single draw call (still casts/receives shadows).
  if (staticGeos.length) {
    const merged = mergeGeometries(staticGeos, false);
    staticGeos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, slabMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // ---- step counter: a floating glowing number, EDGE-style ---------------
  const counterCanvas = document.createElement('canvas');
  counterCanvas.width = 256;
  counterCanvas.height = 128;
  const counterCtx = counterCanvas.getContext('2d');
  const counterTex = new THREE.CanvasTexture(counterCanvas);
  counterTex.colorSpace = THREE.SRGBColorSpace;
  function drawCounter(n) {
    const ctx = counterCtx;
    ctx.clearRect(0, 0, 256, 128);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = accent;
    ctx.shadowBlur = 26;
    ctx.fillStyle = accent;
    ctx.font = 'bold 82px "Segoe UI", system-ui, sans-serif';
    ctx.fillText(String(n), 128, 54);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(230,240,255,0.55)';
    ctx.font = '600 19px "Segoe UI", system-ui, sans-serif';
    ctx.fillText('S T E P S', 128, 106);
    counterTex.needsUpdate = true;
  }
  drawCounter(0);
  const counter = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: counterTex, transparent: true, depthWrite: false }),
  );
  counter.scale.set(2.5, 1.25, 1);
  // Float it off to the side of the level (like EDGE's score) so it clears the
  // goal's beam of light, and make sure the camera fit includes it.
  const counterX = (bounds.min.x + bounds.max.x) / 2 + 2.3;
  const counterY = bounds.max.y + 1.35;
  const counterZ = (bounds.min.z + bounds.max.z) / 2;
  counter.position.set(counterX, counterY, counterZ);
  bounds.max.x = Math.max(bounds.max.x, counterX + 1.6);
  bounds.max.y = Math.max(bounds.max.y, counterY + 1.2);
  group.add(counter);
  let counterPulse = 0;
  function setSteps(n) {
    drawCounter(n);
    counterPulse = 1;
  }

  const brightRimMat = new THREE.LineBasicMaterial({
    color: accent,
    transparent: true,
    opacity: 0.95,
  });
  const dimRimMat = new THREE.LineBasicMaterial({
    color: accentDim,
    transparent: true,
    opacity: 0.5,
  });
  if (brightSegs.length) group.add(new THREE.LineSegments(linesGeometry(brightSegs), brightRimMat));
  if (dimSegs.length) group.add(new THREE.LineSegments(linesGeometry(dimSegs), dimRimMat));

  // ---- crumble slabs (their own meshes so they can fall away) --------------
  const crumbleRimMat = new THREE.LineBasicMaterial({
    color: C_RIM,
    transparent: true,
    opacity: 0.95,
  });

  for (const tile of level.tiles.values()) {
    if (!tile.crumble) continue;
    // A thinner, inset plate so cracked ground reads as a separate piece.
    const g = slabGeometry(tile.h - 0.02, C_TOP, C_SIDE, C_BOTTOM);
    g.scale(0.94, 1, 0.94);
    const mesh = new THREE.Mesh(g, crumbleMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const holder = new THREE.Group();
    holder.add(mesh);

    const { bright, dim } = rimLines(0, 0, tile.h - 0.02, THICK * 0.8, 0.94);
    const rim = new THREE.LineSegments(linesGeometry(bright), crumbleRimMat);
    const dimL = new THREE.LineSegments(linesGeometry(dim), dimRimMat);
    holder.add(rim, dimL);
    holder.position.set(tile.x, 0, tile.z);
    group.add(holder);

    crumbles.set(key(tile.x, tile.z), {
      tile,
      holder,
      mesh,
      state: 'idle', // idle | ticking | falling | gone
      timer: 0,
      shake: 0,
      vy: 0,
      spin: new THREE.Vector3(),
      baseY: 0,
    });
  }

  // ---- goal: a glowing pad with a beam of light rising into space ----------
  const goal = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({
    color: 0x33312a,
    emissive: new THREE.Color(0xffe9a8),
    emissiveIntensity: 1.15,
    roughness: 0.45,
    metalness: 0.1,
  });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.82), padMat);
  pad.position.y = 0.04;
  pad.castShadow = true;
  goal.add(pad);

  const beamMat = new THREE.MeshBasicMaterial({
    map: beamTexture(),
    color: 0x9fe6ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.3, 30, 14, 1, true), beamMat);
  beam.position.y = 15;
  goal.add(beam);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff3c8, transparent: true, opacity: 0.9 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.014, 8, 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.09;
  goal.add(ring);

  const haloMat = new THREE.SpriteMaterial({
    map: glowTexture(),
    color: 0xffe9a8,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.setScalar(1.8);
  halo.position.set(0, 0.35, 0);
  goal.add(halo);

  goal.position.set(level.goal.x, level.goal.h, level.goal.z);
  group.add(goal);

  // ---- shards: small floating orange cubes ---------------------------------
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0xff9d2e,
    emissive: new THREE.Color(0xff6a00),
    emissiveIntensity: 0.5,
    roughness: 0.35,
    metalness: 0.1,
  });
  const shardGeo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
  const shards = level.shards.map((s, i) => {
    const tile = level.tiles.get(s.id);
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(shardGeo, shardMat);
    mesh.castShadow = true;
    holder.add(mesh);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xff9d2e,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(0.65);
    holder.add(glow);
    holder.position.set(s.x, tile.h + 0.5, s.z);
    group.add(holder);
    return { ...s, holder, mesh, glow, phase: i * 1.7, collected: false, anim: 0 };
  });

  // ---- sentinels: dark patrol cubes with a glowing face ---------------------
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2f333d, roughness: 0.5, metalness: 0.35 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x140008,
    emissive: new THREE.Color(0xff2e6a),
    emissiveIntensity: 2.4,
  });
  const bodyGeo = new RoundedBoxGeometry(0.44, 0.44, 0.44, 3, 0.07);
  const eyeGeo = new THREE.SphereGeometry(0.05, 10, 10);
  const orbs = level.orbs.map((def, i) => {
    const pts = def.path.map(([x, z]) => new THREE.Vector2(x, z));
    const segs = [];
    let total = 0;
    for (let s = 0; s < pts.length; s++) {
      const a = pts[s];
      const b = pts[(s + 1) % pts.length];
      const len = a.distanceTo(b);
      if (len > 1e-4) {
        segs.push({ a, b, len, start: total });
        total += len;
      }
    }
    const holder = new THREE.Group();
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    holder.add(body);
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.095, 0.05, 0.19);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.095, 0.05, 0.19);
    holder.add(eyeL, eyeR);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xff3f74,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(1.0);
    holder.add(glow);
    group.add(holder);
    return {
      def,
      holder,
      glow,
      body,
      segs,
      total: Math.max(total, 0.001),
      dist: (def.phase || 0) * total,
      h: 0,
      pos: new THREE.Vector3(),
      prev: new THREE.Vector3(),
    };
  });

  // ---------------------------------------------------------------- update --
  const clock = { t: 0 };
  const tileAt = (x, z) => level.tiles.get(key(Math.round(x), Math.round(z)));

  function update(dt, time, cubePos) {
    clock.t = time;

    // step counter pop
    if (counterPulse > 0) {
      counterPulse = Math.max(0, counterPulse - dt * 4);
      counter.scale.set(2.5 + counterPulse * 0.35, 1.25 + counterPulse * 0.18, 1);
    }

    // shards: bob and slowly tumble
    for (const s of shards) {
      if (s.collected) {
        s.anim += dt * 3.2;
        const k = Math.min(1, s.anim);
        s.holder.scale.setScalar(1 + k * 1.8);
        s.holder.position.y += dt * 2.2;
        s.mesh.rotation.y += dt * 12;
        s.glow.material.opacity = Math.max(0, 0.8 * (1 - k));
        s.holder.visible = k < 1;
        continue;
      }
      s.mesh.rotation.y += dt * 1.7;
      s.mesh.rotation.x += dt * 0.8;
      const tile = tileAt(s.x, s.z);
      s.holder.position.y = tile.h + 0.52 + Math.sin(time * 2 + s.phase) * 0.07;
      s.glow.material.opacity = 0.4 + Math.sin(time * 3 + s.phase) * 0.12;
    }

    // goal pad
    ring.rotation.z += dt * 0.9;
    ring.scale.setScalar(1 + Math.sin(time * 2.4) * 0.06);
    halo.material.opacity = 0.26 + Math.sin(time * 2.2) * 0.06;
    beamMat.opacity = 0.4 + Math.sin(time * 1.4) * 0.08;

    // crumbles
    for (const c of crumbles.values()) {
      if (c.state === 'ticking') {
        c.timer -= dt;
        c.shake = Math.max(0, c.timer / c.tickLength);
        const amp = 0.018 + (1 - c.shake) * 0.02;
        c.holder.position.x = c.tile.x + (Math.random() - 0.5) * amp * 3;
        c.holder.position.z = c.tile.z + (Math.random() - 0.5) * amp * 3;
        if (c.mesh.material !== crumbleMat) c.mesh.material = crumbleMat;
        if (c.timer <= 0) {
          c.state = 'falling';
          c.vy = 0;
          c.spin.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.6);
          c.holder.position.x = c.tile.x;
          c.holder.position.z = c.tile.z;
        }
      } else if (c.state === 'falling') {
        c.vy -= dt * 9;
        c.holder.position.y += c.vy * dt;
        c.holder.rotation.x += c.spin.x * dt;
        c.holder.rotation.y += c.spin.y * dt;
        c.holder.rotation.z += c.spin.z * dt;
        c.holder.scale.multiplyScalar(Math.pow(0.55, dt));
        if (c.holder.position.y < c.tile.h - 6) {
          c.state = 'gone';
          c.holder.visible = false;
        }
      }
    }

    // sentinels: patrol, face their heading
    for (const o of orbs) {
      o.dist = (o.dist + o.def.speed * dt) % o.total;
      let seg = o.segs[o.segs.length - 1];
      for (const s of o.segs) {
        if (o.dist >= s.start && o.dist < s.start + s.len) {
          seg = s;
          break;
        }
      }
      const f = seg.len > 0 ? (o.dist - seg.start) / seg.len : 0;
      const x = seg.a.x + (seg.b.x - seg.a.x) * f;
      const z = seg.a.y + (seg.b.y - seg.a.y) * f;
      const t = tileAt(x, z);
      if (t) o.h = t.h;
      o.holder.position.set(x, o.h + 0.5 + Math.sin(time * 2.6) * 0.05, z);
      o.pos.copy(o.holder.position);
      const dx = x - o.prev.x;
      const dz = z - o.prev.z;
      if (dx * dx + dz * dz > 1e-10) {
        const targetY = Math.atan2(dx, dz);
        let d = targetY - o.holder.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        o.holder.rotation.y += d * Math.min(1, dt * 8);
      }
      o.prev.set(x, 0, z);
      o.glow.material.opacity = 0.26 + Math.sin(time * 5.2) * 0.1;
    }
  }

  function breakAt(x, z) {
    const c = crumbles.get(key(x, z));
    if (!c || c.state !== 'idle') return;
    c.state = 'ticking';
    c.timer = 0.75;
    c.tickLength = 0.75;
  }

  function isBroken(x, z) {
    const c = crumbles.get(key(x, z));
    return !!c && (c.state === 'falling' || c.state === 'gone');
  }

  function collectShard(shard) {
    shard.collected = true;
    shard.anim = 0;
  }

  function reset() {
    for (const c of crumbles.values()) {
      c.state = 'idle';
      c.holder.visible = true;
      c.holder.position.set(c.tile.x, 0, c.tile.z);
      c.holder.rotation.set(0, 0, 0);
      c.holder.scale.setScalar(1);
    }
    for (const s of shards) {
      s.collected = false;
      s.anim = 0;
      s.holder.visible = true;
      s.holder.scale.setScalar(1);
      s.holder.position.set(s.x, level.tiles.get(s.id).h + 0.5, s.z);
      s.glow.material.opacity = 0.5;
    }
    for (const o of orbs) {
      o.dist = (o.def.phase || 0) * o.total;
      o.holder.rotation.set(0, 0, 0);
    }
  }

  function dispose() {
    disposeTree(group);
    slabMat.dispose();
    crumbleMat.dispose();
    brightRimMat.dispose();
    dimRimMat.dispose();
    crumbleRimMat.dispose();
    shardMat.dispose();
    shardGeo.dispose();
    padMat.dispose();
    beamMat.dispose();
    ringMat.dispose();
    haloMat.dispose();
    bodyMat.dispose();
    eyeMat.dispose();
    bodyGeo.dispose();
    eyeGeo.dispose();
    counterTex.dispose();
  }

  return {
    group,
    bounds,
    boundsCenter: new THREE.Vector3(
      (bounds.min.x + bounds.max.x) / 2,
      0,
      (bounds.min.z + bounds.max.z) / 2,
    ),
    crumbles,
    shards,
    orbs,
    goal,
    update,
    setSteps,
    breakAt,
    isBroken,
    collectShard,
    reset,
    dispose,
  };
}
