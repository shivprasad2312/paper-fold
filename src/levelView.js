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
const ACCENTS = [0x59ff7c, 0xff4fd8, 0xffe14f, 0x4fd8ff, 0xff8a4f, 0xb07cff, 0x7dffce, 0xff6a5e, 0x9dff4f, 0xff4f8e, 0x4fc8ff, 0xc8ff5e, 0xffd23e, 0xff5e3a];
const ACCENT_BY_ID = new Map(ACCENTS.map((c, i) => [i + 1, c]));

function smooth(t) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

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

  // ---- sliding bridge tiles: they rise and sink on a clock ------------------
  // Solid while level (phase < 0.5), they dip 0.4 into the void for the rest
  // of the cycle, flashing amber in the last moment before they let go.
  const sliders = [];
  for (const gdef of level.sliders) {
    for (const tile of level.tiles.values()) {
      if (!gdef.tileSet.has(key(tile.x, tile.z))) continue;
      const g = slabGeometry(tile.h, 0xbfc8d8, 0x78829a, BOTTOM);
      const mat = slabMat.clone();
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const holder = new THREE.Group();
      holder.add(mesh);
      const { bright, dim } = rimLines(0, 0, tile.h, THICK);
      holder.add(new THREE.LineSegments(linesGeometry(bright), brightRimMat));
      holder.add(new THREE.LineSegments(linesGeometry(dim), dimRimMat));
      holder.position.set(tile.x, 0, tile.z);
      group.add(holder);
      sliders.push({ tile, holder, mat, gdef });
    }
  }

  // ---- obstacle blocks: dark cubes you can shove aside ----------------------
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.6, metalness: 0.3 });
  const blockGeo = new RoundedBoxGeometry(0.52, 0.52, 0.52, 3, 0.08);
  const blocks = new Map();
  const blockStarts = [];
  for (const b of level.blocks) {
    const tile = level.tiles.get(key(b.x, b.z));
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(blockGeo, blockMat);
    mesh.castShadow = true;
    holder.add(mesh);
    holder.position.set(b.x, tile.h + 0.26, b.z);
    group.add(holder);
    const rec = { x: b.x, z: b.z, holder, anim: null, start: { x: b.x, z: b.z, h: tile.h } };
    blocks.set(key(b.x, b.z), rec);
    blockStarts.push(rec);
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

  // ---- locked goal: a padlock hovering over the gate until the key is found -
  let gateLocked = false;
  let lockSprite = null;
  if (level.gateKey) {
    gateLocked = true;
    const lockCanvas = document.createElement('canvas');
    lockCanvas.width = 128;
    lockCanvas.height = 128;
    const lc = lockCanvas.getContext('2d');
    lc.clearRect(0, 0, 128, 128);
    lc.strokeStyle = '#ffd76a';
    lc.lineWidth = 9;
    lc.beginPath();
    lc.arc(64, 52, 22, Math.PI, 0); // shackle
    lc.stroke();
    lc.fillStyle = '#3a3f4d';
    lc.strokeStyle = '#ffd76a';
    lc.beginPath();
    lc.roundRect(30, 52, 68, 54, 10); // body
    lc.fill();
    lc.stroke();
    lc.fillStyle = '#ffd76a';
    lc.beginPath();
    lc.arc(64, 76, 8, 0, Math.PI * 2); // keyhole
    lc.fill();
    const lockTex = new THREE.CanvasTexture(lockCanvas);
    lockTex.colorSpace = THREE.SRGBColorSpace;
    lockSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: lockTex, transparent: true, depthWrite: false }),
    );
    lockSprite.scale.set(0.85, 0.85, 1);
    lockSprite.position.set(level.goal.x, level.goal.h + 1.15, level.goal.z);
    group.add(lockSprite);
  }

  // ---- the gate key: a golden octahedron that floats where you must go ------
  let keyItem = null;
  if (level.gateKey) {
    const ktile = level.tiles.get(key(level.gateKey.x, level.gateKey.z));
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.2),
      new THREE.MeshStandardMaterial({
        color: 0xffd23e,
        emissive: new THREE.Color(0xffb300),
        emissiveIntensity: 0.9,
        roughness: 0.25,
        metalness: 0.6,
      }),
    );
    mesh.castShadow = true;
    holder.add(mesh);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xffd23e,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(0.9);
    holder.add(glow);
    holder.position.set(level.gateKey.x, ktile.h + 0.55, level.gateKey.z);
    group.add(holder);
    keyItem = { holder, mesh, glow, collected: false, anim: 0 };
  }

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

  // ---- wind: faint streaks swept across the level in the breeze's direction -
  const windStreaks = [];
  if (level.wind) {
    const dir = new THREE.Vector3(level.wind.x, 0, level.wind.z);
    if (dir.lengthSq() > 0) {
      dir.normalize();
      const rotY = Math.atan2(-dir.z, dir.x);
      const len = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) + 3;
      const cx = (bounds.min.x + bounds.max.x) / 2;
      const cz = (bounds.min.z + bounds.max.z) / 2;
      for (let i = 0; i < 14; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0xbfe8ff,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const geo = new THREE.PlaneGeometry(len, 0.03);
        geo.rotateX(-Math.PI / 2); // lie flat
        const m = new THREE.Mesh(geo, mat);
        m.rotation.y = rotY;
        m.position.y = 0.25 + Math.random() * 2.4;
        // keep each streak offset slightly to the side of the centre line
        const side = (Math.random() - 0.5) * (Math.min(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z) + 1);
        const px = -dir.z, pz = dir.x; // perpendicular
        m.position.x = cx + px * side;
        m.position.z = cz + pz * side;
        group.add(m);
        windStreaks.push({ m, offset: Math.random(), speed: 0.16 + Math.random() * 0.1, len, dir, px, pz, side, cx, cz });
      }
    }
  }

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

    // sliding bridges: level while up, a dip into the void while sunk,
    // amber warning in the last moment before they let go
    for (const s of sliders) {
      const ph = ((time / s.gdef.period + s.gdef.phase) % 1 + 1) % 1;
      let off = 0;
      if (ph >= 0.42 && ph < 0.5) off = -0.4 * smooth((ph - 0.42) / 0.08);
      else if (ph >= 0.5 && ph < 0.92) off = -0.4;
      else if (ph >= 0.92) off = -0.4 * (1 - smooth((ph - 0.92) / 0.08));
      s.holder.position.y = off;
      const warn = ph >= 0.34 && ph < 0.5 ? (ph - 0.34) / 0.16 : 0;
      s.mat.emissive.setRGB(warn * 0.55, warn * 0.18, 0);
      s.mat.emissiveIntensity = 1;
    }

    // obstacle blocks: settle to their pushed tile
    for (const b of blocks.values()) {
      if (!b.anim) continue;
      b.anim.t += dt / 0.22;
      const k = Math.min(1, b.anim.t);
      b.holder.position.lerpVectors(b.anim.from, b.anim.to, smooth(k));
      b.holder.rotation.z = Math.sin(k * Math.PI) * 0.12;
      if (k >= 1) {
        b.anim = null;
        b.holder.rotation.z = 0;
      }
    }

    // gate key: bob, spin and shine
    if (keyItem) {
      if (keyItem.collected) {
        keyItem.anim += dt * 3.2;
        const k = Math.min(1, keyItem.anim);
        keyItem.holder.scale.setScalar(1 + k * 1.8);
        keyItem.holder.position.y += dt * 2.2;
        keyItem.mesh.rotation.y += dt * 12;
        keyItem.glow.material.opacity = Math.max(0, 0.8 * (1 - k));
        keyItem.holder.visible = k < 1;
      } else {
        keyItem.mesh.rotation.y += dt * 1.4;
        const kt = tileAt(keyItem.holder.position.x, keyItem.holder.position.z);
        keyItem.holder.position.y = (kt ? kt.h : 0) + 0.55 + Math.sin(time * 2.2) * 0.07;
        keyItem.glow.material.opacity = 0.5 + Math.sin(time * 3.1) * 0.15;
      }
    }

    // locked goal: dimmed pad and beam, padlock bobbing overhead
    const targetEmit = gateLocked ? 0.3 : 1.15;
    padMat.emissiveIntensity += (targetEmit - padMat.emissiveIntensity) * Math.min(1, dt * 5);
    if (lockSprite) {
      lockSprite.visible = gateLocked;
      lockSprite.position.y = level.goal.h + 1.15 + Math.sin(time * 1.8) * 0.08;
    }
    beamMat.opacity = (gateLocked ? 0.08 : 0.4) + (gateLocked ? 0 : Math.sin(time * 1.4) * 0.08);
    halo.material.opacity = gateLocked ? 0.06 : 0.26 + Math.sin(time * 2.2) * 0.06;
    ringMat.opacity = gateLocked ? 0.25 : 0.9;

    // wind streaks: fade in, sweep, fade out
    for (const w of windStreaks) {
      const p = (time * w.speed + w.offset) % 1;
      w.m.position.x = w.cx + w.dir.x * (-w.len / 2 + p * w.len) + w.px * w.side;
      w.m.position.z = w.cz + w.dir.z * (-w.len / 2 + p * w.len) + w.pz * w.side;
      w.m.material.opacity = Math.sin(p * Math.PI) * 0.32;
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

  /** Is the sliding bridge at (x, z) currently up? Shares the render clock. */
  function sliderUp(x, z) {
    for (const s of sliders) {
      if (s.tile.x === x && s.tile.z === z) {
        const ph = ((clock.t / s.gdef.period + s.gdef.phase) % 1 + 1) % 1;
        return ph < 0.5;
      }
    }
    return true;
  }

  function collectShard(shard) {
    shard.collected = true;
    shard.anim = 0;
  }

  function collectGateKey() {
    if (keyItem && !keyItem.collected) {
      keyItem.collected = true;
      keyItem.anim = 0;
      gateLocked = false;
    }
  }

  function setGoalLocked(locked) {
    gateLocked = locked;
  }

  /** Slide a block one tile after the game has resolved the push. */
  function pushBlockVisual(x, z, dx, dz) {
    const b = blocks.get(key(x, z));
    if (!b) return;
    const nx = x + dx;
    const nz = z + dz;
    const tile = level.tiles.get(key(nx, nz));
    if (!tile) return;
    blocks.delete(key(x, z));
    b.x = nx;
    b.z = nz;
    blocks.set(key(nx, nz), b);
    b.anim = {
      t: 0,
      from: b.holder.position.clone(),
      to: new THREE.Vector3(nx, tile.h + 0.26, nz),
    };
  }

  function reset() {
    blocks.clear();
    for (const b of blockStarts) {
      const tile = level.tiles.get(key(b.start.x, b.start.z));
      b.x = b.start.x;
      b.z = b.start.z;
      b.anim = null;
      b.holder.position.set(b.start.x, tile.h + 0.26, b.start.z);
      b.holder.rotation.set(0, 0, 0);
      blocks.set(key(b.x, b.z), b);
    }
    if (keyItem) {
      keyItem.collected = false;
      keyItem.anim = 0;
      keyItem.holder.visible = true;
      keyItem.holder.scale.setScalar(1);
      const kt = level.tiles.get(key(level.gateKey.x, level.gateKey.z));
      keyItem.holder.position.set(level.gateKey.x, kt.h + 0.55, level.gateKey.z);
      keyItem.glow.material.opacity = 0.6;
    }
    gateLocked = !!level.gateKey;
    if (padMat) padMat.emissiveIntensity = gateLocked ? 0.3 : 1.15;
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
    blockMat.dispose();
    blockGeo.dispose();
    for (const s of sliders) s.mat.dispose();
    for (const w of windStreaks) {
      w.m.material.dispose();
      w.m.geometry.dispose();
    }
    if (lockSprite) {
      lockSprite.material.map.dispose();
      lockSprite.material.dispose();
    }
    if (keyItem) {
      keyItem.mesh.material.dispose();
      keyItem.mesh.geometry.dispose();
      keyItem.glow.material.dispose();
    }
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
    blocks,
    goal,
    sliders,
    update,
    setSteps,
    breakAt,
    isBroken,
    sliderUp,
    collectShard,
    collectGateKey,
    setGoalLocked,
    pushBlockVisual,
    reset,
    dispose,
  };
}
