import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture, beamTexture, disposeTree } from './textures.js';
import { key } from './rules.js';

const THICK = 0.42;
const SIDE = 0x22354f;
const TOP = 0x4d6f9e;
const BOTTOM = 0x0c1524;
const RIM = 0x63e4ff;
const EDGE = 0x27496f;

const C_SIDE = 0x6e4522;
const C_TOP = 0xc9853f;
const C_RIM = 0xffb44d;

const tmpColor = new THREE.Color();

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
  const crumbleMeshes = [];

  const bounds = {
    min: new THREE.Vector3(Infinity, Infinity, Infinity),
    max: new THREE.Vector3(-Infinity, -Infinity, -Infinity),
  };

  const slabMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.22,
    flatShading: true,
  });
  const crumbleMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.72,
    metalness: 0.12,
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

  // Merge all static slabs into a single draw call.
  if (staticGeos.length) {
    const merged = mergeGeometries(staticGeos, false);
    staticGeos.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(merged, slabMat);
    mesh.castShadow = false;
    group.add(mesh);
  }

  const brightRimMat = new THREE.LineBasicMaterial({
    color: RIM,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dimRimMat = new THREE.LineBasicMaterial({
    color: EDGE,
    transparent: true,
    opacity: 0.5,
  });
  if (brightSegs.length) group.add(new THREE.LineSegments(linesGeometry(brightSegs), brightRimMat));
  if (dimSegs.length) group.add(new THREE.LineSegments(linesGeometry(dimSegs), dimRimMat));

  // ---- crumble slabs (their own meshes so they can fall away) --------------
  const crumbleRimMat = new THREE.LineBasicMaterial({
    color: C_RIM,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (const tile of level.tiles.values()) {
    if (!tile.crumble) continue;
    // A thinner, inset plate so cracked ground reads as a separate piece.
    const g = slabGeometry(tile.h - 0.02, C_TOP, C_SIDE, 0x1a1109);
    g.scale(0.94, 1, 0.94);
    const mesh = new THREE.Mesh(g, crumbleMat);
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
    crumbleMeshes.push(mesh);
  }

  // ---- goal gate -----------------------------------------------------------
  const goal = new THREE.Group();
  const goalMat = new THREE.MeshStandardMaterial({
    color: 0x0a2740,
    emissive: new THREE.Color(0x5ce1ff),
    emissiveIntensity: 1.15,
    roughness: 0.4,
    metalness: 0.3,
  });
  const postGeo = new THREE.BoxGeometry(0.07, 0.86, 0.07);
  const postL = new THREE.Mesh(postGeo, goalMat);
  postL.position.set(-0.33, 0.43, 0);
  const postR = postL.clone();
  postR.position.x = 0.33;
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.73, 0.07, 0.07), goalMat);
  lintel.position.set(0, 0.86, 0);
  goal.add(postL, postR, lintel);

  const veil = new THREE.Mesh(
    new THREE.PlaneGeometry(0.62, 0.8),
    new THREE.MeshBasicMaterial({
      color: 0x39c8ff,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  veil.position.set(0, 0.43, 0);
  goal.add(veil);

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: 0x5ce1ff,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.scale.setScalar(1.9);
  halo.position.set(0, 0.45, 0);
  goal.add(halo);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.012, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x9df1ff, transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.02;
  goal.add(ring);

  goal.position.set(level.goal.x, level.goal.h, level.goal.z);
  group.add(goal);

  // ---- shards --------------------------------------------------------------
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x6b4a00,
    emissive: new THREE.Color(0xffc857),
    emissiveIntensity: 1.3,
    roughness: 0.25,
    metalness: 0.6,
  });
  const shards = level.shards.map((s, i) => {
    const tile = level.tiles.get(s.id);
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), shardMat);
    holder.add(mesh);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xffc857,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(0.72);
    holder.add(glow);
    holder.position.set(s.x, tile.h + 0.5, s.z);
    group.add(holder);
    return { ...s, holder, mesh, glow, phase: i * 1.7, collected: false, anim: 0 };
  });

  // ---- orbs ----------------------------------------------------------------
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
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 1),
      new THREE.MeshStandardMaterial({
        color: 0x3a0018,
        emissive: new THREE.Color(0xff2e6a),
        emissiveIntensity: 1.7,
        roughness: 0.3,
        metalness: 0.4,
      }),
    );
    holder.add(core);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0xff3f74,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(1.5);
    holder.add(glow);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.012, 6, 36),
      new THREE.MeshBasicMaterial({ color: 0xff8fb0, transparent: true, opacity: 0.8 }),
    );
    ring.rotation.x = Math.PI / 2.4;
    holder.add(ring);
    group.add(holder);
    return {
      def,
      holder,
      glow,
      core,
      ring,
      segs,
      total: Math.max(total, 0.001),
      dist: (def.phase || 0) * total,
      h: 0,
      pos: new THREE.Vector3(),
      prevKey: null,
    };
  });

  // ---------------------------------------------------------------- update --
  const clock = { t: 0 };
  const tileAt = (x, z) => level.tiles.get(key(Math.round(x), Math.round(z)));

  function update(dt, time, cubePos) {
    clock.t = time;

    // shards
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
      s.glow.material.opacity = 0.45 + Math.sin(time * 3 + s.phase) * 0.1;
    }

    // goal
    ring.rotation.z += dt * 0.9;
    ring.scale.setScalar(1 + Math.sin(time * 2.4) * 0.06);
    halo.material.opacity = 0.42 + Math.sin(time * 2.2) * 0.08;
    veil.material.opacity = 0.13 + Math.sin(time * 3.1) * 0.05;

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

    // orbs
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
      o.core.rotation.y += dt * 2.4;
      o.ring.rotation.z += dt * 1.7;
      o.glow.material.opacity = 0.5 + Math.sin(time * 6.4) * 0.12;
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
      s.glow.material.opacity = 0.8;
    }
    for (const o of orbs) o.dist = (o.def.phase || 0) * o.total;
  }

  function dispose() {
    disposeTree(group);
    slabMat.dispose();
    crumbleMat.dispose();
    brightRimMat.dispose();
    dimRimMat.dispose();
    crumbleRimMat.dispose();
    shardMat.dispose();
    goalMat.dispose();
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
    breakAt,
    isBroken,
    collectShard,
    reset,
    dispose,
  };
}
