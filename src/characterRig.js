import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CHARACTER_BY_ID, DEFAULT_CHARACTERS } from './characters.js';

const TEAM_COLORS = { yellow: 0xf6bd36, red: 0xec6962, blue: 0x4cbecb, green: 0x5abe79, purple: 0x9a76d0, orange: 0xe6924c };
const HUMAN_LOOKS = {
  yellow: { skin: 0xc58960, hair: 0x50372d }, red: { skin: 0xbd7d5b, hair: 0x3a2822 },
  blue: { skin: 0x8f543c, hair: 0x211b1b }, green: { skin: 0xc17d52, hair: 0x3b2922 },
  grandma: { skin: 0xba805f, hair: 0xaaa9a4 }, grandpa: { skin: 0xb47a58, hair: 0x969b98 },
};
const ANIMAL_LOOKS = {
  dog: { fur: 0xc99564, face: 0xe9c49b, detail: 0x79503c },
  cat: { fur: 0x9b9da7, face: 0xe9e4dc, detail: 0x656a78 },
  lion: { fur: 0xe6b75f, face: 0xf4d392, detail: 0xa85f2d },
  horse: { fur: 0xa96849, face: 0xe3bb96, detail: 0x553c32 },
  elephant: { fur: 0x98aab2, face: 0xb6c6c8, detail: 0x778f99 },
  parrot: { fur: 0x59b88d, face: 0xbbe2ad, detail: 0x278e7c },
};

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

// Bake rigid details once, while keeping the head, limbs, tails and wheels articulated.
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

/** Articulated toys are built lazily for selected character/team combinations. */
export function createCharacterFactory() {
  const geometries = new Set();
  const materials = new Set();
  const geo = (value) => { geometries.add(value); return value; };
  const mat = (value) => { materials.add(value); return value; };
  const sphere = geo(new THREE.SphereGeometry(1, 20, 14));
  const bodyGeometry = geo(new RoundedBoxGeometry(0.62, 0.58, 0.42, 3, 0.13));
  const elderTop = geo(new RoundedBoxGeometry(0.62, 0.68, 0.42, 3, 0.12));
  const robeGeometry = geo(new RoundedBoxGeometry(0.54, 0.44, 0.38, 3, 0.08));
  const sashGeometry = geo(new RoundedBoxGeometry(0.13, 0.68, 0.04, 2, 0.025));
  const shortsGeometry = geo(new RoundedBoxGeometry(0.5, 0.24, 0.36, 3, 0.06));
  const pocketGeometry = geo(new RoundedBoxGeometry(0.29, 0.14, 0.035, 2, 0.035));
  const armGeometry = geo(new THREE.CapsuleGeometry(0.105, 0.25, 4, 10));
  const legGeometry = geo(new THREE.CylinderGeometry(0.095, 0.09, 0.28, 12));
  const browGeometry = geo(new THREE.CapsuleGeometry(0.019, 0.105, 3, 8));
  const stringGeometry = geo(new THREE.CylinderGeometry(0.013, 0.013, 0.16, 8));
  const rodGeometry = geo(new THREE.CylinderGeometry(1, 1, 1, 10));
  const coneGeometry = geo(new THREE.ConeGeometry(1, 1, 12));
  const smileGeometry = geo(makeCurve([[-0.085, 0.015, 0], [0, -0.045, 0.012], [0.085, 0.015, 0]]));
  const frownGeometry = geo(makeCurve([[-0.075, -0.018, 0], [0, 0.045, 0.012], [0.075, -0.018, 0]]));
  const ringGeometry = geo(new THREE.TorusGeometry(0.49, 0.045, 8, 30));
  const collarGeometry = geo(new THREE.TorusGeometry(0.24, 0.048, 8, 24));
  const wheelGeometry = geo(new THREE.TorusGeometry(0.22, 0.035, 8, 24));
  const shorts = mat(makeMaterial(0xf5eddc));
  const shoes = mat(makeMaterial(0xfffdf7));
  const sandals = mat(makeMaterial(0x80583c));
  const eyeWhite = mat(makeMaterial(0xfffcf6, { roughness: 0.3 }));
  const pupils = mat(makeMaterial(0x271e1a, { roughness: 0.25 }));
  const mouthMaterial = mat(makeMaterial(0x753c31));
  const cheekMaterial = mat(makeMaterial(0xe88d82, { transparent: true, opacity: 0.45, depthWrite: false }));
  const tearMaterial = mat(makeMaterial(0x78d9ee, { roughness: 0.25, transparent: true, opacity: 0.9 }));
  const sari = mat(makeMaterial(0xa9ca69));
  const wood = mat(makeMaterial(0x96633b));
  const gold = mat(makeMaterial(0xe6b64e, { roughness: 0.35 }));
  const bindi = mat(makeMaterial(0xa73f3b));
  const tire = mat(makeMaterial(0x444c4c));
  const metal = mat(makeMaterial(0xf0e8d3, { roughness: 0.35 }));
  const beak = mat(makeMaterial(0xf4b04b));
  const pink = mat(makeMaterial(0xe7a29b));
  const colors = Object.fromEntries(Object.keys(TEAM_COLORS).map((color) => [color, {
    clothes: mat(makeMaterial(TEAM_COLORS[color], { roughness: 0.5 })),
    darkerClothes: mat(makeMaterial(new THREE.Color(TEAM_COLORS[color]).multiplyScalar(0.86), { roughness: 0.6 })),
    ring: mat(makeMaterial(0xffffff, { emissive: TEAM_COLORS[color], emissiveIntensity: 0.3 })),
  }]));
  const humans = Object.fromEntries(Object.entries(HUMAN_LOOKS).map(([name, look]) => [name, {
    skin: mat(makeMaterial(look.skin)), hair: mat(makeMaterial(look.hair, { roughness: 0.55 })),
  }]));
  const animals = Object.fromEntries(Object.entries(ANIMAL_LOOKS).map(([name, look]) => [name, {
    fur: mat(makeMaterial(look.fur)), face: mat(makeMaterial(look.face)), detail: mat(makeMaterial(look.detail)),
  }]));

  function addSphere(parent, material, position, scale) {
    const object = part(sphere, material, ...position);
    object.scale.set(...scale);
    parent.add(object);
    return object;
  }

  function addRod(parent, material, from, to, radius) {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const rod = part(rodGeometry, material);
    rod.position.copy(start.add(end).multiplyScalar(0.5));
    rod.scale.set(radius, direction.length(), radius);
    rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
    parent.add(rod);
    return rod;
  }

  function addFace(head, eyebrowMaterial, { eyeX = 0.125, eyeY = 0.045, eyeZ = 0.303, mouthY = -0.105, mouthZ = 0.329 } = {}) {
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      eye.name = side < 0 ? 'leftEye' : 'rightEye';
      eye.position.set(side * eyeX, eyeY, eyeZ);
      addSphere(eye, eyeWhite, [0, 0, 0], [0.073, 0.086, 0.035]);
      addSphere(eye, pupils, [0, 0, 0.032], [0.042, 0.052, 0.023]);
      addSphere(eye, eyeWhite, [-0.012, 0.018, 0.052], [0.012, 0.014, 0.008]);
      head.add(eye);
      const brow = part(browGeometry, eyebrowMaterial, side * eyeX, eyeY + 0.115, eyeZ - 0.019);
      brow.name = side < 0 ? 'leftBrow' : 'rightBrow';
      brow.rotation.z = Math.PI / 2;
      head.add(brow);
      const tear = addSphere(head, tearMaterial, [side * (eyeX + 0.08), eyeY - 0.15, eyeZ - 0.02], [0.026, 0.046, 0.015]);
      tear.name = side < 0 ? 'leftTear' : 'rightTear';
      tear.visible = false;
    }
    const smile = part(smileGeometry, mouthMaterial, 0, mouthY, mouthZ); smile.name = 'smile'; head.add(smile);
    const frown = part(frownGeometry, mouthMaterial, 0, mouthY, mouthZ); frown.name = 'frown'; frown.visible = false; head.add(frown);
    const happyMouth = addSphere(head, mouthMaterial, [0, mouthY, mouthZ], [0.082, 0.055, 0.016]);
    happyMouth.name = 'happyMouth'; happyMouth.visible = false;
  }

  function addRing(root, team) {
    const ring = part(ringGeometry, colors[team].ring, 0, 0.06, 0);
    ring.name = 'selectionRing'; ring.rotation.x = -Math.PI / 2; ring.visible = false;
    root.add(ring);
  }

  function addBike(facing, team) {
    const bike = new THREE.Group(); bike.name = 'bike'; facing.add(bike);
    const frameMaterial = colors[team].clothes;
    for (const [name, z] of [['rearWheel', -0.39], ['frontWheel', 0.39]]) {
      const wheel = new THREE.Group(); wheel.name = name; wheel.position.set(0, 0.23, z);
      const rim = part(wheelGeometry, tire); rim.rotation.y = Math.PI / 2; wheel.add(rim);
      addRod(wheel, metal, [0, -0.19, 0], [0, 0.19, 0], 0.012);
      addRod(wheel, metal, [0, 0, -0.19], [0, 0, 0.19], 0.012);
      addSphere(wheel, gold, [0, 0, 0], [0.035, 0.035, 0.035]);
      bike.add(wheel);
    }
    // Frame, handlebars and seat stay inside a compact board-square footprint.
    addRod(bike, frameMaterial, [0, 0.23, -0.39], [0, 0.50, -0.08], 0.026);
    addRod(bike, frameMaterial, [0, 0.50, -0.08], [0, 0.28, 0.10], 0.026);
    addRod(bike, frameMaterial, [0, 0.28, 0.10], [0, 0.23, -0.39], 0.026);
    addRod(bike, frameMaterial, [0, 0.50, -0.08], [0, 0.48, 0.32], 0.026);
    addRod(bike, frameMaterial, [0, 0.48, 0.32], [0, 0.28, 0.10], 0.026);
    addRod(bike, metal, [0, 0.23, 0.39], [0, 0.79, 0.30], 0.025);
    addRod(bike, metal, [-0.24, 0.79, 0.30], [0.24, 0.79, 0.30], 0.022);
    addRod(bike, metal, [0, 0.50, -0.08], [0, 0.57, -0.08], 0.022);
    addSphere(bike, tire, [0, 0.58, -0.08], [0.15, 0.035, 0.10]);
    const pedals = new THREE.Group(); pedals.name = 'pedals'; pedals.position.set(0, 0.28, 0.10);
    addRod(pedals, metal, [0, -0.12, 0], [0, 0.12, 0], 0.018);
    addRod(pedals, tire, [-0.10, 0.12, 0], [0.10, 0.12, 0], 0.023);
    addRod(pedals, tire, [-0.10, -0.12, 0], [0.10, -0.12, 0], 0.023);
    bike.add(pedals);
  }

  function buildHuman(spec, team) {
    const palette = { ...colors[team], ...humans[spec.style] };
    const elder = spec.kind === 'elder';
    const root = new THREE.Group();
    const facing = new THREE.Group(); facing.name = 'facing'; root.add(facing);
    const body = new THREE.Group(); body.name = 'body';
    if (spec.ride === 'bike') { body.position.y = 0.14; body.position.z = -0.08; }
    facing.add(body);
    const torso = new THREE.Group();
    if (elder) {
      torso.add(part(elderTop, spec.style === 'grandma' ? sari : palette.clothes, 0, 0.72, 0));
      torso.add(part(robeGeometry, spec.style === 'grandma' ? sari : shorts, 0, 0.32, 0));
      if (spec.style === 'grandma') {
        const sash = part(sashGeometry, palette.clothes, 0.04, 0.73, 0.222);
        sash.rotation.z = -0.48; torso.add(sash);
      }
    } else {
      torso.add(part(bodyGeometry, palette.clothes, 0, 0.79, 0));
      torso.add(part(shortsGeometry, shorts, 0, 0.48, 0));
      torso.add(part(pocketGeometry, palette.darkerClothes, 0, 0.68, 0.214));
      addSphere(torso, palette.clothes, [0, 1.02, -0.06], [0.28, 0.12, 0.23]);
      torso.add(part(stringGeometry, shorts, -0.07, 0.92, 0.218));
      torso.add(part(stringGeometry, shorts, 0.07, 0.92, 0.218));
    }
    addSphere(torso, palette.skin, [0, 1.07, 0], [0.13, 0.14, 0.13]);
    mergeRigidParts(torso, geometries);
    body.add(torso);

    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.name = side < 0 ? 'leftArm' : 'rightArm';
      arm.position.set(side * 0.34, 0.96, 0);
      arm.add(part(armGeometry, palette.clothes, 0, -0.18, 0));
      addSphere(arm, palette.skin, [0, -0.41, 0.015], [0.095, 0.105, 0.09]);
      if (elder && side === 1) {
        const stick = new THREE.Group(); stick.name = 'stick';
        addRod(stick, wood, [0.02, -0.38, 0.04], [0.08, -0.94, 0.07], 0.022);
        addSphere(stick, wood, [0.02, -0.38, 0.04], [0.04, 0.04, 0.04]);
        arm.add(stick);
      }
      body.add(arm);
      const leg = new THREE.Group();
      leg.name = side < 0 ? 'leftLeg' : 'rightLeg';
      leg.position.set(side * 0.14, 0.44, 0);
      leg.add(part(legGeometry, palette.skin, 0, -0.13, 0));
      addSphere(leg, elder ? sandals : shoes, [0, -0.29, 0.055], [0.14, 0.105, 0.21]);
      if (spec.ride === 'skates') {
        addSphere(leg, palette.darkerClothes, [0, -0.33, 0.05], [0.14, 0.045, 0.22]);
        for (const z of [-0.09, 0.04, 0.17]) addSphere(leg, tire, [0, -0.385, z], [0.058, 0.058, 0.055]);
      }
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
    if (spec.style === 'grandma') {
      addSphere(headStatic, palette.hair, [0, 0.16, -0.14], [0.36, 0.27, 0.25]);
      addSphere(headStatic, palette.hair, [0, 0.29, -0.035], [0.37, 0.16, 0.33]);
      addSphere(headStatic, palette.hair, [0, 0.20, -0.34], [0.18, 0.18, 0.16]);
      addSphere(headStatic, bindi, [0, 0.19, 0.304], [0.032, 0.032, 0.015]);
      addSphere(headStatic, gold, [-0.355, -0.055, 0.06], [0.042, 0.045, 0.035]);
      addSphere(headStatic, gold, [0.355, -0.055, 0.06], [0.042, 0.045, 0.035]);
    } else if (spec.style === 'grandpa') {
      addSphere(headStatic, palette.hair, [0, 0.08, -0.18], [0.35, 0.28, 0.20]);
      addSphere(headStatic, palette.hair, [-0.31, 0.12, 0], [0.10, 0.19, 0.15]);
      addSphere(headStatic, palette.hair, [0.31, 0.12, 0], [0.10, 0.19, 0.15]);
      addSphere(headStatic, palette.hair, [-0.055, -0.095, 0.326], [0.068, 0.025, 0.022]);
      addSphere(headStatic, palette.hair, [0.055, -0.095, 0.326], [0.068, 0.025, 0.022]);
    } else {
      const longHair = spec.style === 'red' || spec.style === 'blue';
      addSphere(headStatic, palette.hair, [0, 0.10, -0.15], [0.365, longHair ? 0.40 : 0.30, 0.25]);
      addSphere(headStatic, palette.hair, [0, 0.29, -0.035], [0.37, 0.17, 0.34]);
      addSphere(headStatic, palette.hair, [-0.22, 0.23, 0.20], [0.15, 0.13, 0.15]);
      addSphere(headStatic, palette.hair, [-0.05, 0.26, 0.24], [0.17, 0.13, 0.12]);
      addSphere(headStatic, palette.hair, [0.14, 0.26, 0.20], [0.16, 0.12, 0.14]);
      if (spec.style === 'red') {
        for (const side of [-1, 1]) {
          addSphere(headStatic, palette.hair, [side * 0.31, 0.35, -0.04], [0.17, 0.17, 0.17]);
          addSphere(headStatic, palette.hair, [side * 0.32, -0.07, -0.12], [0.09, 0.27, 0.13]);
        }
      } else if (spec.style === 'blue') {
        for (const side of [-1, 1]) {
          addSphere(headStatic, palette.hair, [side * 0.37, 0.24, -0.04], [0.22, 0.22, 0.21]);
          addSphere(headStatic, palette.hair, [side * 0.46, 0.10, -0.04], [0.14, 0.16, 0.14]);
          addSphere(headStatic, palette.hair, [side * 0.38, 0.37, -0.04], [0.15, 0.15, 0.15]);
        }
      } else if (spec.style === 'yellow') {
        addSphere(headStatic, palette.hair, [0.08, 0.38, -0.02], [0.20, 0.13, 0.20]);
      } else {
        addSphere(headStatic, palette.hair, [-0.15, 0.36, 0], [0.18, 0.13, 0.17]);
        addSphere(headStatic, palette.hair, [0.14, 0.36, 0], [0.18, 0.13, 0.17]);
      }
    }
    if (spec.ride === 'skates') {
      addSphere(headStatic, palette.darkerClothes, [0, 0.42, -0.04], [0.38, 0.15, 0.34]);
      addSphere(headStatic, shorts, [0, 0.55, -0.04], [0.12, 0.025, 0.28]);
    }
    mergeRigidParts(headStatic, geometries);
    head.add(headStatic);
    addFace(head, palette.hair, spec.style === 'grandpa' ? { mouthY: -0.16 } : {});
    if (spec.ride === 'bike') addBike(facing, team);
    addRing(root, team);
    return root;
  }

  function buildAnimal(spec, team) {
    const palette = animals[spec.id];
    const bird = spec.kind === 'bird';
    const root = new THREE.Group();
    const facing = new THREE.Group(); facing.name = 'facing'; root.add(facing);
    const body = new THREE.Group(); body.name = 'body'; facing.add(body);
    addSphere(body, palette.fur, bird ? [0, 0.68, 0] : [0, 0.65, -0.08], bird ? [0.33, 0.40, 0.30] : [0.36, 0.30, 0.50]);
    if (bird) addSphere(body, palette.face, [0, 0.61, 0.25], [0.23, 0.24, 0.07]);

    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.name = side < 0 ? 'leftArm' : 'rightArm';
      arm.position.set(side * (bird ? 0.31 : 0.23), bird ? 0.78 : 0.49, bird ? 0 : 0.21);
      if (bird) addSphere(arm, palette.detail, [side * 0.025, -0.11, 0], [0.14, 0.26, 0.12]);
      else {
        addSphere(arm, palette.fur, [0, -0.19, 0], [0.11, 0.24, 0.11]);
        addSphere(arm, spec.id === 'horse' ? palette.detail : palette.face, [0, -0.37, 0.035], [0.13, 0.09, 0.14]);
      }
      body.add(arm);
      const leg = new THREE.Group(); leg.name = side < 0 ? 'leftLeg' : 'rightLeg';
      leg.position.set(side * (bird ? 0.13 : 0.23), bird ? 0.34 : 0.49, bird ? 0 : -0.32);
      if (bird) {
        addRod(leg, palette.detail, [0, 0, 0], [0, -0.23, 0], 0.035);
        addSphere(leg, beak, [0, -0.25, 0.05], [0.11, 0.055, 0.15]);
      } else {
        addSphere(leg, palette.fur, [0, -0.19, 0], [0.11, 0.24, 0.11]);
        addSphere(leg, spec.id === 'horse' ? palette.detail : palette.face, [0, -0.37, 0.035], [0.13, 0.09, 0.14]);
      }
      body.add(leg);
    }
    const tail = new THREE.Group(); tail.name = 'tail'; tail.position.set(0, 0.75, bird ? -0.26 : -0.52);
    if (bird) {
      for (const side of [-1, 0, 1]) addSphere(tail, side === 0 ? beak : palette.detail, [side * 0.08, -0.15, -0.13], [0.07, 0.25, 0.07]);
    } else {
      addRod(tail, palette.fur, [0, 0, 0], [0, 0.18, -0.30], 0.055);
      if (spec.id === 'lion' || spec.id === 'horse') addSphere(tail, palette.detail, [0, 0.18, -0.30], [0.09, 0.11, 0.10]);
    }
    body.add(tail);

    const head = new THREE.Group(); head.name = 'head'; head.position.set(0, bird ? 1.16 : 1.13, bird ? 0.04 : 0.30); body.add(head);
    const headStatic = new THREE.Group();
    if (spec.id === 'lion') addSphere(headStatic, palette.detail, [0, 0.02, -0.10], [0.43, 0.41, 0.29]);
    addSphere(headStatic, palette.fur, [0, 0, 0], spec.id === 'horse' ? [0.31, 0.38, 0.30] : [0.33, 0.32, 0.30]);
    if (!bird && spec.id !== 'elephant') addSphere(headStatic, palette.face,
      spec.id === 'horse' ? [0, -0.12, 0.31] : [0, -0.11, 0.255],
      spec.id === 'horse' ? [0.19, 0.15, 0.24] : [0.20, 0.13, 0.16]);
    if (spec.id === 'dog') {
      for (const side of [-1, 1]) addSphere(headStatic, palette.detail, [side * 0.30, 0.015, -0.04], [0.12, 0.25, 0.14]);
    } else if (spec.id === 'cat' || spec.id === 'horse') {
      for (const side of [-1, 1]) {
        const ear = part(coneGeometry, palette.fur, side * 0.23, 0.31, 0); ear.scale.set(0.115, spec.id === 'horse' ? 0.34 : 0.23, 0.11); ear.rotation.z = -side * 0.16; headStatic.add(ear);
        addSphere(headStatic, spec.id === 'cat' ? pink : palette.detail, [side * 0.23, 0.29, 0.08], [0.045, 0.09, 0.025]);
      }
      if (spec.id === 'horse') {
        addSphere(headStatic, palette.detail, [0, 0.31, -0.02], [0.18, 0.10, 0.23]);
        addSphere(headStatic, palette.detail, [0, -0.04, -0.28], [0.13, 0.30, 0.11]);
      } else {
        for (const side of [-1, 1]) for (const y of [-0.10, -0.15])
          addRod(headStatic, palette.face, [side * 0.13, y, 0.37], [side * 0.38, y + (y === -0.10 ? 0.035 : -0.025), 0.31], 0.008);
      }
    } else if (spec.id === 'lion') {
      for (const side of [-1, 1]) {
        addSphere(headStatic, palette.detail, [side * 0.34, -0.12, -0.04], [0.15, 0.20, 0.16]);
        addSphere(headStatic, palette.fur, [side * 0.29, 0.27, 0.01], [0.10, 0.10, 0.09]);
      }
    } else if (spec.id === 'elephant') {
      for (const side of [-1, 1]) addSphere(headStatic, palette.face, [side * 0.34, 0.02, -0.05], [0.24, 0.29, 0.11]);
    } else if (bird) {
      for (const side of [-1, 1]) addSphere(headStatic, palette.detail, [side * 0.12, 0.29, -0.02], [0.10, 0.14, 0.09]);
      addSphere(headStatic, beak, [0, -0.08, 0.32], [0.14, 0.14, 0.17]);
      const bill = part(coneGeometry, beak, 0, -0.18, 0.37); bill.rotation.x = Math.PI; bill.scale.set(0.105, 0.18, 0.09); headStatic.add(bill);
    }
    if (!bird && spec.id !== 'elephant') addSphere(headStatic, pupils, [0, -0.07, spec.id === 'horse' ? 0.53 : 0.395], [0.064, 0.043, 0.035]);
    mergeRigidParts(headStatic, geometries);
    head.add(headStatic);
    if (spec.id === 'elephant') {
      const trunk = new THREE.Group(); trunk.name = 'trunk'; trunk.position.set(0, -0.07, 0.26);
      addSphere(trunk, palette.fur, [0, -0.14, 0.07], [0.10, 0.21, 0.10]);
      addSphere(trunk, palette.fur, [0, -0.29, 0.11], [0.095, 0.09, 0.10]);
      head.add(trunk);
    }
    addFace(head, palette.detail, { eyeX: 0.12, eyeY: 0.045, eyeZ: 0.275, mouthY: -0.16, mouthZ: 0.39 });
    // Team-colored collar remains visible without recoloring the animal's fur.
    const collar = part(collarGeometry, colors[team].clothes, 0, bird ? 0.91 : 0.86, bird ? 0.02 : 0.25);
    collar.rotation.x = Math.PI / 2; body.add(collar);
    addSphere(body, gold, [0, bird ? 0.86 : 0.81, bird ? 0.25 : 0.49], [0.05, 0.06, 0.03]);
    addRing(root, team);
    return root;
  }

  const prototypes = new Map();
  function create(team, index, characterId = DEFAULT_CHARACTERS[team]) {
    const spec = CHARACTER_BY_ID[characterId] || CHARACTER_BY_ID[DEFAULT_CHARACTERS[team]];
    const key = `${spec.id}:${team}`;
    if (!prototypes.has(key)) prototypes.set(key, spec.kind === 'animal' || spec.kind === 'bird' ? buildAnimal(spec, team) : buildHuman(spec, team));
    const root = prototypes.get(key).clone(true);
    root.userData.piece = { color: team, index };
    const find = (name) => root.getObjectByName(name);
    return {
      root, characterId: spec.id, kind: spec.kind, ride: spec.ride || null,
      facing: find('facing'), body: find('body'), head: find('head'),
      leftArm: find('leftArm'), rightArm: find('rightArm'), leftLeg: find('leftLeg'), rightLeg: find('rightLeg'),
      leftEye: find('leftEye'), rightEye: find('rightEye'), leftBrow: find('leftBrow'), rightBrow: find('rightBrow'),
      leftTear: find('leftTear'), rightTear: find('rightTear'),
      smile: find('smile'), frown: find('frown'), happyMouth: find('happyMouth'), ring: find('selectionRing'),
      tail: find('tail'), trunk: find('trunk'), frontWheel: find('frontWheel'), rearWheel: find('rearWheel'), pedals: find('pedals'),
      pose: 'idle', poseStarted: 0, heading: 0, destination: new THREE.Vector3(), origin: new THREE.Vector3(),
      moveStarted: 0, moveDuration: 0, initialized: false,
      seed: index + Object.keys(TEAM_COLORS).indexOf(team) * 4,
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

/** Shared directional movement and expressive poses for every character family. */
export function animateCharacter(rig, now, delta, reducedMotion = false, cameraHeading = 0) {
  if (rig.moveDuration > 0) {
    const progress = Math.min(1, Math.max(0, (now - rig.moveStarted) / rig.moveDuration));
    const eased = progress * progress * (3 - 2 * progress);
    rig.root.position.lerpVectors(rig.origin, rig.destination, eased);
    if (progress === 1) rig.moveDuration = 0;
  }
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
  const animal = rig.kind === 'animal';
  const bird = rig.kind === 'bird';

  rig.body.position.y = (rig.ride === 'bike' ? 0.14 : 0) + (walk ? (animal || bird ? 0.045 : 0.035) * bounce : dancing && !reducedMotion ? 0.10 + 0.11 * Math.abs(dance) : 0);
  rig.body.rotation.x = sad ? (animal || bird ? 0.07 : 0.13) : walk && !animal && !bird ? 0.08 : 0;
  rig.body.rotation.z = dancing ? dance * 0.16 : walk ? swing * 0.035 : 0;
  rig.leftLeg.rotation.x = walk ? swing * (sad ? 0.30 : 0.60) : dancing ? dance * 0.40 : 0;
  rig.rightLeg.rotation.x = -rig.leftLeg.rotation.x;
  rig.leftLeg.rotation.z = rig.ride === 'skates' && walk ? 0.20 + swing * 0.16 : 0;
  rig.rightLeg.rotation.z = rig.ride === 'skates' && walk ? -0.20 + swing * 0.16 : 0;
  rig.leftArm.rotation.x = walk ? -swing * (sad ? 0.22 : 0.57) : dancing ? dance * 0.25 : 0;
  rig.rightArm.rotation.x = walk ? swing * (sad ? 0.22 : 0.57) : dancing ? -dance * 0.25 : 0;
  rig.leftArm.rotation.z = dancing ? -2.25 + dance * 0.2 : (animal ? 0 : -0.22);
  rig.rightArm.rotation.z = dancing ? 2.25 - dance * 0.2 : (animal ? 0 : 0.22);
  if (rig.kind === 'elder' && walk) rig.rightArm.rotation.x = -0.08 + swing * 0.10;
  if (rig.ride === 'bike' && !dancing) {
    rig.leftArm.rotation.x = -0.90; rig.rightArm.rotation.x = -0.90;
    rig.leftLeg.rotation.x = walk ? swing * 0.55 : 0.22;
    rig.rightLeg.rotation.x = walk ? -swing * 0.55 : -0.22;
  }
  if (rig.ride === 'skates' && walk) {
    rig.body.rotation.z = swing * 0.10;
    rig.leftArm.rotation.z = -0.45 + swing * 0.16; rig.rightArm.rotation.z = 0.45 + swing * 0.16;
  }
  if (bird && walk) { rig.leftArm.rotation.z = -0.3 - Math.abs(swing) * 0.2; rig.rightArm.rotation.z = 0.3 + Math.abs(swing) * 0.2; }
  if (rig.tail) rig.tail.rotation.y = reducedMotion ? 0 : (dancing ? dance : swing) * 0.35;
  if (rig.trunk) rig.trunk.rotation.x = sad ? 0.15 : dancing ? -0.4 - dance * 0.2 : swing * 0.08;
  if (rig.frontWheel) rig.frontWheel.rotation.x = walk && !reducedMotion ? -t * 9 : 0;
  if (rig.rearWheel) rig.rearWheel.rotation.x = walk && !reducedMotion ? -t * 9 : 0;
  if (rig.pedals) rig.pedals.rotation.x = walk && !reducedMotion ? -t * 7 : 0;
  rig.head.rotation.x = sad ? 0.28 : walk ? -0.035 : 0;
  rig.head.rotation.z = sad ? 0.12 : dancing ? -dance * 0.12 : walk ? -swing * 0.025 : 0;
  const glance = Math.atan2(Math.sin(cameraHeading - rig.facing.rotation.y), Math.cos(cameraHeading - rig.facing.rotation.y));
  // Reactions may glance at the viewer, but walking heads face the route.
  rig.head.rotation.y = (rig.pose === 'sad' || dancing ? THREE.MathUtils.clamp(glance, -1.1, 1.1) : 0) + (dancing ? dance * 0.16 : 0);

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

/** Batch identical meshes across the independently animated pieces. */
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
