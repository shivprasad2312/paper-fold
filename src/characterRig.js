import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TEAM_COLORS = { yellow: 0xf6bd36, red: 0xec6962, blue: 0x4cbecb, green: 0x5abe79 };
const SKIN_COLORS = { yellow: 0xc58960, red: 0xbd7d5b, blue: 0x8f543c, green: 0xc17d52 };
const HAIR_COLORS = { yellow: 0x50372d, red: 0x3a2822, blue: 0x211b1b, green: 0x3b2922 };

function makeMaterial(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.68, ...extra });
}

function part(geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

// Bake rigid details once, while keeping the head, arms, and legs articulated.
function mergeRigidParts(group, geometries) {
  const children = [...group.children];
  const byMaterial = new Map();
  children.forEach((child) => {
    child.updateMatrix();
    const geometry = (child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(child.matrix);
    if (!byMaterial.has(child.material)) byMaterial.set(child.material, []);
    byMaterial.get(child.material).push(geometry);
  });
  const merged = [];
  for (const [material, pieces] of byMaterial) {
    const geometry = mergeGeometries(pieces);
    pieces.forEach((piece) => piece.dispose());
    if (!geometry) {
      merged.forEach((piece) => piece.geometry.dispose());
      return;
    }
    geometries.add(geometry);
    merged.push(part(geometry, material));
  }
  children.forEach((child) => group.remove(child));
  merged.forEach((child) => group.add(child));
}

function makeCurve(points) {
  return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(...points.map(([x, y, z]) => new THREE.Vector3(x, y, z))), 12, 0.012, 6, false);
}

/** Reusable, articulated toy characters, sharing geometry/materials between pieces. */
export function createCharacterFactory() {
  const geometries = new Set();
  const materials = new Set();
  const geo = (value) => { geometries.add(value); return value; };
  const mat = (value) => { materials.add(value); return value; };
  const sphere = geo(new THREE.SphereGeometry(1, 20, 14));
  const bodyGeometry = geo(new RoundedBoxGeometry(0.62, 0.58, 0.42, 3, 0.13));
  const shortsGeometry = geo(new RoundedBoxGeometry(0.5, 0.24, 0.36, 3, 0.06));
  const pocketGeometry = geo(new RoundedBoxGeometry(0.29, 0.14, 0.035, 2, 0.035));
  const armGeometry = geo(new THREE.CapsuleGeometry(0.105, 0.25, 4, 10));
  const legGeometry = geo(new THREE.CylinderGeometry(0.095, 0.09, 0.28, 12));
  const browGeometry = geo(new THREE.CapsuleGeometry(0.019, 0.105, 3, 8));
  const stringGeometry = geo(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8));
  const smileGeometry = geo(makeCurve([[-0.085, 0.015, 0], [0, -0.045, 0.012], [0.085, 0.015, 0]]));
  const frownGeometry = geo(makeCurve([[-0.075, -0.018, 0], [0, 0.045, 0.012], [0.075, -0.018, 0]]));
  const ringGeometry = geo(new THREE.TorusGeometry(0.49, 0.045, 8, 30));
  const shorts = mat(makeMaterial(0xf5eddc));
  const shoes = mat(makeMaterial(0xfffdf7));
  const eyeWhite = mat(makeMaterial(0xfffcf6, { roughness: 0.3 }));
  const pupils = mat(makeMaterial(0x271e1a, { roughness: 0.25 }));
  const mouthMaterial = mat(makeMaterial(0x753c31));
  const cheekMaterial = mat(makeMaterial(0xe88d82, { transparent: true, opacity: 0.45, depthWrite: false }));
  const tearMaterial = mat(makeMaterial(0x78d9ee, { roughness: 0.25, transparent: true, opacity: 0.9 }));
  const colors = Object.fromEntries(Object.keys(TEAM_COLORS).map((color) => [color, {
    clothes: mat(makeMaterial(TEAM_COLORS[color], { roughness: 0.5 })),
    darkerClothes: mat(makeMaterial(new THREE.Color(TEAM_COLORS[color]).multiplyScalar(0.86), { roughness: 0.6 })),
    skin: mat(makeMaterial(SKIN_COLORS[color])),
    hair: mat(makeMaterial(HAIR_COLORS[color], { roughness: 0.55 })),
    ring: mat(makeMaterial(0xffffff, { emissive: TEAM_COLORS[color], emissiveIntensity: 0.3 })),
  }]));

  function addSphere(parent, material, position, scale) {
    const object = part(sphere, material, ...position);
    object.scale.set(...scale);
    parent.add(object);
    return object;
  }

  function buildPrototype(color) {
    const palette = colors[color];
    const root = new THREE.Group();
    const facing = new THREE.Group(); facing.name = 'facing'; root.add(facing);
    const body = new THREE.Group(); body.name = 'body'; facing.add(body);

    const torso = new THREE.Group();
    torso.add(part(bodyGeometry, palette.clothes, 0, 0.79, 0));
    torso.add(part(shortsGeometry, shorts, 0, 0.48, 0));
    torso.add(part(pocketGeometry, palette.darkerClothes, 0, 0.68, 0.214));
    addSphere(torso, palette.clothes, [0, 1.02, -0.06], [0.28, 0.12, 0.23]);
    torso.add(part(stringGeometry, shorts, -0.07, 0.92, 0.218));
    torso.add(part(stringGeometry, shorts, 0.07, 0.92, 0.218));
    addSphere(torso, palette.skin, [0, 1.07, 0], [0.13, 0.14, 0.13]);
    mergeRigidParts(torso, geometries);
    body.add(torso);

    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.name = side < 0 ? 'leftArm' : 'rightArm';
      arm.position.set(side * 0.34, 0.96, 0);
      arm.add(part(armGeometry, palette.clothes, 0, -0.18, 0));
      addSphere(arm, palette.skin, [0, -0.41, 0.015], [0.095, 0.105, 0.09]);
      body.add(arm);

      const leg = new THREE.Group();
      leg.name = side < 0 ? 'leftLeg' : 'rightLeg';
      leg.position.set(side * 0.14, 0.44, 0);
      leg.add(part(legGeometry, palette.skin, 0, -0.13, 0));
      addSphere(leg, shoes, [0, -0.29, 0.055], [0.14, 0.105, 0.21]);
      body.add(leg);
    }

    const head = new THREE.Group(); head.name = 'head'; head.position.y = 1.37; body.add(head);
    const headStatic = new THREE.Group();
    addSphere(headStatic, palette.skin, [0, 0, 0], [0.36, 0.39, 0.34]);
    addSphere(headStatic, palette.skin, [-0.35, 0, 0], [0.075, 0.10, 0.07]);
    addSphere(headStatic, palette.skin, [0.35, 0, 0], [0.075, 0.10, 0.07]);
    addSphere(headStatic, palette.skin, [0, -0.05, 0.342], [0.044, 0.036, 0.034]);
    addSphere(headStatic, cheekMaterial, [-0.23, -0.10, 0.267], [0.052, 0.026, 0.01]);
    addSphere(headStatic, cheekMaterial, [0.23, -0.10, 0.267], [0.052, 0.026, 0.01]);
    // A real back and side silhouette matters when a piece turns away.
    addSphere(headStatic, palette.hair, [0, 0.10, -0.15], [0.365, color === 'red' || color === 'blue' ? 0.40 : 0.30, 0.25]);
    addSphere(headStatic, palette.hair, [0, 0.29, -0.035], [0.37, 0.17, 0.34]);
    addSphere(headStatic, palette.hair, [-0.22, 0.23, 0.20], [0.15, 0.13, 0.15]);
    addSphere(headStatic, palette.hair, [-0.05, 0.26, 0.24], [0.17, 0.13, 0.12]);
    addSphere(headStatic, palette.hair, [0.14, 0.26, 0.20], [0.16, 0.12, 0.14]);
    if (color === 'red') {
      addSphere(headStatic, palette.hair, [-0.31, 0.35, -0.04], [0.17, 0.17, 0.17]);
      addSphere(headStatic, palette.hair, [0.31, 0.35, -0.04], [0.17, 0.17, 0.17]);
      addSphere(headStatic, palette.hair, [-0.32, -0.07, -0.12], [0.09, 0.27, 0.13]);
      addSphere(headStatic, palette.hair, [0.32, -0.07, -0.12], [0.09, 0.27, 0.13]);
    } else if (color === 'blue') {
      addSphere(headStatic, palette.hair, [-0.37, 0.24, -0.04], [0.22, 0.22, 0.21]);
      addSphere(headStatic, palette.hair, [0.37, 0.24, -0.04], [0.22, 0.22, 0.21]);
      addSphere(headStatic, palette.hair, [-0.46, 0.10, -0.04], [0.14, 0.16, 0.14]);
      addSphere(headStatic, palette.hair, [0.46, 0.10, -0.04], [0.14, 0.16, 0.14]);
      addSphere(headStatic, palette.hair, [-0.38, 0.37, -0.04], [0.15, 0.15, 0.15]);
      addSphere(headStatic, palette.hair, [0.38, 0.37, -0.04], [0.15, 0.15, 0.15]);
    } else if (color === 'yellow') {
      addSphere(headStatic, palette.hair, [0.08, 0.38, -0.02], [0.20, 0.13, 0.20]);
    } else {
      addSphere(headStatic, palette.hair, [-0.15, 0.36, 0], [0.18, 0.13, 0.17]);
      addSphere(headStatic, palette.hair, [0.14, 0.36, 0], [0.18, 0.13, 0.17]);
    }
    mergeRigidParts(headStatic, geometries);
    head.add(headStatic);

    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.name = side < 0 ? 'leftEye' : 'rightEye';
      eye.position.set(side * 0.125, 0.045, 0.303);
      addSphere(eye, eyeWhite, [0, 0, 0], [0.073, 0.086, 0.035]);
      addSphere(eye, pupils, [0, 0, 0.032], [0.042, 0.052, 0.023]);
      addSphere(eye, eyeWhite, [-0.012, 0.018, 0.052], [0.012, 0.014, 0.008]);
      head.add(eye);
      const brow = part(browGeometry, palette.hair, side * 0.125, 0.16, 0.284);
      brow.name = side < 0 ? 'leftBrow' : 'rightBrow';
      brow.rotation.z = Math.PI / 2;
      head.add(brow);
      const tear = addSphere(head, tearMaterial, [side * 0.21, -0.105, 0.282], [0.026, 0.046, 0.015]);
      tear.name = side < 0 ? 'leftTear' : 'rightTear';
      tear.visible = false;
    }
    const smile = part(smileGeometry, mouthMaterial, 0, -0.105, 0.329); smile.name = 'smile'; head.add(smile);
    const frown = part(frownGeometry, mouthMaterial, 0, -0.105, 0.329); frown.name = 'frown'; frown.visible = false; head.add(frown);
    const happyMouth = addSphere(head, mouthMaterial, [0, -0.105, 0.329], [0.082, 0.055, 0.016]);
    happyMouth.name = 'happyMouth'; happyMouth.visible = false;

    const ring = part(ringGeometry, palette.ring, 0, 0.06, 0);
    ring.name = 'selectionRing'; ring.rotation.x = -Math.PI / 2; ring.visible = false;
    root.add(ring);
    return root;
  }

  const prototypes = Object.fromEntries(Object.keys(TEAM_COLORS).map((color) => [color, buildPrototype(color)]));

  function create(color, index) {
    const root = prototypes[color].clone(true);
    root.userData.piece = { color, index };
    const find = (name) => root.getObjectByName(name);
    return {
      root, facing: find('facing'), body: find('body'), head: find('head'),
      leftArm: find('leftArm'), rightArm: find('rightArm'), leftLeg: find('leftLeg'), rightLeg: find('rightLeg'),
      leftEye: find('leftEye'), rightEye: find('rightEye'), leftBrow: find('leftBrow'), rightBrow: find('rightBrow'),
      leftTear: find('leftTear'), rightTear: find('rightTear'),
      smile: find('smile'), frown: find('frown'), happyMouth: find('happyMouth'), ring: find('selectionRing'),
      pose: 'idle', poseStarted: 0, heading: 0, destination: new THREE.Vector3(), origin: new THREE.Vector3(),
      moveStarted: 0, moveDuration: 0, initialized: false,
      seed: index + Object.keys(TEAM_COLORS).indexOf(color) * 4,
    };
  }

  return {
    create,
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
  };
}

/** Set a new target without jumping if another step is already in flight. */
export function setCharacterTarget(rig, visual, destination, now, { immediate = false, showRing = false } = {}) {
  if (!rig.initialized || immediate) {
    rig.root.position.copy(destination);
    rig.origin.copy(destination);
    rig.destination.copy(destination);
    rig.facing.rotation.y = visual.heading;
    rig.initialized = true;
    rig.moveDuration = 0;
  } else if (rig.destination.distanceToSquared(destination) > 0.000001) {
    rig.origin.copy(rig.root.position);
    rig.destination.copy(destination);
    rig.moveStarted = now;
    rig.moveDuration = visual.duration || 160;
  }
  if (rig.pose !== visual.pose) rig.poseStarted = now;
  rig.pose = visual.pose;
  rig.heading = visual.heading;
  rig.ring.visible = showRing && visual.selectable;
  rig.root.visible = true;
}

/** Procedural joint and facial animation shared by the overhead and 3D views. */
export function animateCharacter(rig, now, delta, reducedMotion = false, cameraHeading = 0) {
  if (rig.moveDuration > 0) {
    const progress = Math.min(1, Math.max(0, (now - rig.moveStarted) / rig.moveDuration));
    const eased = progress * progress * (3 - 2 * progress);
    rig.root.position.lerpVectors(rig.origin, rig.destination, eased);
    if (progress === 1) rig.moveDuration = 0;
  }
  // A stopped character can turn to show an emotion. During every walking
  // segment its whole body follows the route, including the return to the yard.
  const reaction = rig.pose === 'sad' || rig.pose === 'dance' || rig.pose === 'cheer';
  const facingTarget = reaction ? cameraHeading : rig.heading;
  const angleDelta = Math.atan2(Math.sin(facingTarget - rig.facing.rotation.y), Math.cos(facingTarget - rig.facing.rotation.y));
  if (reducedMotion) rig.facing.rotation.y = facingTarget;
  else rig.facing.rotation.y += angleDelta * (1 - Math.exp(-Math.min(delta, 0.1) * 14));

  const t = Math.max(0, (now - rig.poseStarted) / 1000);
  const walk = rig.pose === 'walk' || rig.pose === 'sad-walk';
  const sad = rig.pose === 'sad' || rig.pose === 'sad-walk';
  const dancing = rig.pose === 'dance' || rig.pose === 'cheer';
  const swing = reducedMotion ? 0 : Math.sin(t * (sad ? 8 : 13));
  const dance = reducedMotion ? 0 : Math.sin(t * 8);
  const bounce = reducedMotion ? 0 : Math.abs(Math.sin(t * 13));

  rig.body.position.y = walk ? 0.035 * bounce : dancing && !reducedMotion ? 0.10 + 0.11 * Math.abs(dance) : 0;
  rig.body.rotation.x = sad ? 0.13 : walk ? 0.08 : 0;
  rig.body.rotation.z = dancing ? dance * 0.16 : walk ? swing * 0.035 : 0;
  rig.leftLeg.rotation.x = walk ? swing * (sad ? 0.30 : 0.60) : dancing ? dance * 0.40 : 0;
  rig.rightLeg.rotation.x = -rig.leftLeg.rotation.x;
  rig.leftArm.rotation.x = walk ? -swing * (sad ? 0.22 : 0.57) : dancing ? dance * 0.25 : 0;
  rig.rightArm.rotation.x = walk ? swing * (sad ? 0.22 : 0.57) : dancing ? -dance * 0.25 : 0;
  rig.leftArm.rotation.z = dancing ? -2.25 + dance * 0.2 : -0.22;
  rig.rightArm.rotation.z = dancing ? 2.25 - dance * 0.2 : 0.22;
  rig.head.rotation.x = sad ? 0.28 : walk ? -0.035 : 0;
  rig.head.rotation.z = sad ? 0.12 : dancing ? -dance * 0.12 : walk ? -swing * 0.025 : 0;
  // A brief glance exposes an expression without turning the travelling body
  // away from its route. Clamp it to a natural neck rotation.
  const glance = Math.atan2(Math.sin(cameraHeading - rig.facing.rotation.y), Math.cos(cameraHeading - rig.facing.rotation.y));
  rig.head.rotation.y = (sad || dancing ? THREE.MathUtils.clamp(glance, -1.1, 1.1) : 0) + (dancing ? dance * 0.16 : 0);

  const blinkPhase = (now / 1000 + rig.seed * 0.67) % 5.3;
  const blink = !reducedMotion && blinkPhase < 0.14 ? Math.max(0.08, Math.abs(blinkPhase - 0.07) / 0.07) : 1;
  const eyeScale = sad ? Math.min(0.65, blink) : blink;
  rig.leftEye.scale.y = eyeScale; rig.rightEye.scale.y = eyeScale;
  rig.leftBrow.rotation.z = Math.PI / 2 + (sad ? 0.3 : dancing ? -0.12 : 0);
  rig.rightBrow.rotation.z = Math.PI / 2 + (sad ? -0.3 : dancing ? 0.12 : 0);
  rig.smile.visible = !sad && !dancing;
  rig.frown.visible = sad;
  rig.happyMouth.visible = dancing;
  rig.leftTear.visible = sad; rig.rightTear.visible = sad;
  if (rig.ring.visible) rig.ring.scale.setScalar(reducedMotion ? 1 : 1 + Math.sin(now / 200) * 0.08);
}

/**
 * Submit the independently animated meshes as GPU instances. Each rig still has
 * its own joints and expression; only identical geometry/material draw calls
 * are shared. This is important for keeping sixteen characters smooth on phones.
 */
export function createCharacterBatches(scene, rigs) {
  const groups = new Map();
  const keyFor = (mesh) => `${mesh.geometry.id}:${mesh.material.id}:${mesh.castShadow ? 1 : 0}`;
  rigs.forEach((rig) => rig.root.traverse((object) => {
    if (!object.isMesh) return;
    const key = keyFor(object);
    if (!groups.has(key)) groups.set(key, { geometry: object.geometry, material: object.material, casts: object.castShadow, capacity: 0 });
    groups.get(key).capacity += 1;
  }));
  groups.forEach((group) => {
    group.mesh = new THREE.InstancedMesh(group.geometry, group.material, group.capacity);
    group.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.mesh.frustumCulled = false;
    group.mesh.castShadow = group.casts;
    group.mesh.receiveShadow = true;
    group.mesh.count = 0;
    scene.add(group.mesh);
  });
  return {
    update() {
      groups.forEach((group) => { group.mesh.count = 0; });
      rigs.forEach((rig) => {
        if (!rig.root.visible) return;
        rig.root.updateMatrixWorld(true);
        rig.root.traverseVisible((object) => {
          if (!object.isMesh) return;
          const group = groups.get(keyFor(object));
          group.mesh.setMatrixAt(group.mesh.count, object.matrixWorld);
          group.mesh.count += 1;
        });
      });
      groups.forEach((group) => { group.mesh.instanceMatrix.needsUpdate = true; });
    },
    dispose() {
      groups.forEach((group) => { scene.remove(group.mesh); group.mesh.dispose(); });
      groups.clear();
    },
  };
}
