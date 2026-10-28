import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { animateCharacter, createCharacterBatches, createCharacterFactory, setCharacterTarget } from './characterRig.js';

test('characters swing opposite limbs, dance, and show a sad face', () => {
  const factory = createCharacterFactory();
  const rig = factory.create('red', 0);
  const point = new THREE.Vector3(0, 0, 0);
  const target = (pose, now) => setCharacterTarget(rig, { heading: Math.PI / 2, pose, selectable: false }, point, now, { immediate: now === 0 });
  target('walk', 0);
  animateCharacter(rig, 120, 0.016);
  assert.ok(Math.abs(rig.leftLeg.rotation.x) > 0.4);
  assert.equal(rig.rightLeg.rotation.x, -rig.leftLeg.rotation.x);
  assert.equal(rig.rightArm.rotation.x, -rig.leftArm.rotation.x);
  assert.equal(rig.smile.visible, true);

  target('sad', 200);
  animateCharacter(rig, 220, 0.016);
  assert.equal(rig.frown.visible, true);
  assert.equal(rig.smile.visible, false);
  assert.equal(rig.leftTear.visible, true);
  assert.ok(rig.head.rotation.x > 0); // drooping head
  assert.ok(rig.head.rotation.y < 0); // glances towards the viewer
  assert.notEqual(rig.leftBrow.rotation.z, rig.rightBrow.rotation.z);

  target('sad-walk', 250);
  animateCharacter(rig, 270, 0.016);
  assert.equal(rig.head.rotation.y, 0); // still faces its route on the way back
  assert.equal(rig.frown.visible, true);

  target('dance', 300);
  animateCharacter(rig, 420, 0.016);
  assert.equal(rig.frown.visible, false);
  assert.equal(rig.happyMouth.visible, true);
  assert.ok(rig.leftArm.rotation.z < -1.5 && rig.rightArm.rotation.z > 1.5);
  assert.ok(rig.body.position.y > 0.1);
  factory.dispose();
});

test('reduced motion keeps the expressive poses but removes the repeated movement', () => {
  const factory = createCharacterFactory();
  const rig = factory.create('blue', 1);
  setCharacterTarget(rig, { heading: 0, pose: 'dance', selectable: false }, new THREE.Vector3(), 0, { immediate: true });
  animateCharacter(rig, 100, 0.016, true);
  const first = [rig.body.position.y, rig.body.rotation.z, rig.leftArm.rotation.z];
  animateCharacter(rig, 800, 0.016, true);
  assert.deepEqual([rig.body.position.y, rig.body.rotation.z, rig.leftArm.rotation.z], first);
  assert.equal(rig.happyMouth.visible, true);
  factory.dispose();
});

test('batched rigs preserve visibility and share draw calls', () => {
  const factory = createCharacterFactory();
  const rigs = [factory.create('green', 0), factory.create('green', 1)];
  const scene = new THREE.Scene();
  const batches = createCharacterBatches(scene, rigs);
  const meshCount = [];
  rigs[0].root.traverse((object) => { if (object.isMesh) meshCount.push(object); });
  assert.ok(scene.children.length < meshCount.length * rigs.length);
  rigs[1].root.visible = false;
  batches.update();
  assert.ok(scene.children.some((mesh) => mesh.count > 0));
  assert.ok(scene.children.every((mesh) => mesh.count <= mesh.instanceMatrix.count));
  batches.dispose();
  assert.equal(scene.children.length, 0);
  factory.dispose();
});

test('every catalog character can walk, celebrate, and show sadness', async () => {
  const { CHARACTERS } = await import('./characters.js');
  const factory = createCharacterFactory();
  for (const character of CHARACTERS) {
    const rig = factory.create('yellow', 0, character.id);
    const point = new THREE.Vector3();
    setCharacterTarget(rig, { heading: 1.2, pose: 'walk', selectable: false }, point, 0, { immediate: true });
    animateCharacter(rig, 120, 0.016);
    assert.equal(rig.characterId, character.id);
    assert.ok(Number.isFinite(rig.leftLeg.rotation.x), `${character.id} walking`);
    assert.ok(Math.abs(rig.leftLeg.rotation.x) > 0.1, `${character.id} moves its legs`);
    setCharacterTarget(rig, { heading: 1.2, pose: 'sad', selectable: false }, point, 200);
    animateCharacter(rig, 220, 0.016);
    assert.equal(rig.frown.visible, true, `${character.id} frowns`);
    assert.equal(rig.leftTear.visible, true, `${character.id} has a sad reaction`);
    setCharacterTarget(rig, { heading: 1.2, pose: 'dance', selectable: false }, point, 300);
    animateCharacter(rig, 420, 0.016);
    assert.equal(rig.happyMouth.visible, true, `${character.id} celebrates`);
    assert.ok(rig.body.position.y > 0, `${character.id} dances`);
    if (character.id === 'grandma' || character.id === 'grandpa') assert.ok(rig.root.getObjectByName('stick'));
    if (character.id === 'cyclist') assert.ok(rig.frontWheel && rig.rearWheel && rig.pedals);
  }
  const cyclist = factory.create('blue', 0, 'cyclist');
  setCharacterTarget(cyclist, { heading: 0, pose: 'walk', selectable: false }, new THREE.Vector3(), 0, { immediate: true });
  animateCharacter(cyclist, 120, 0.016);
  assert.notEqual(cyclist.frontWheel.rotation.x, 0, 'bike wheels turn while moving');
  assert.notEqual(cyclist.pedals.rotation.x, 0, 'bike pedals turn while moving');
  factory.dispose();
});

test('team colors change clothing and collars, not character identity', () => {
  const factory = createCharacterFactory();
  const materialsIn = (rig) => {
    const result = new Set();
    rig.root.traverse((object) => { if (object.isMesh) result.add(object.material.color.getHex()); });
    return result;
  };
  for (const [id, naturalColor] of [['dog', 0xc99564], ['parrot', 0x59b88d], ['grandma', 0xba805f], ['aarav', 0xc58960]]) {
    const yellow = factory.create('yellow', 0, id);
    const red = factory.create('red', 0, id);
    const purple = factory.create('purple', 0, id);
    const orange = factory.create('orange', 0, id);
    const yellowColors = materialsIn(yellow);
    const redColors = materialsIn(red);
    const purpleColors = materialsIn(purple);
    const orangeColors = materialsIn(orange);
    assert.ok(yellowColors.has(0xf6bd36), `${id} has yellow team clothing or collar`);
    assert.ok(redColors.has(0xec6962), `${id} has red team clothing or collar`);
    assert.ok(purpleColors.has(0x9a76d0), `${id} has purple team clothing or collar`);
    assert.ok(orangeColors.has(0xe6924c), `${id} has orange team clothing or collar`);
    assert.ok(yellowColors.has(naturalColor) && redColors.has(naturalColor) && purpleColors.has(naturalColor) && orangeColors.has(naturalColor), `${id} retains its natural skin or fur across teams`);
    assert.equal(yellow.characterId, red.characterId);
  }
  factory.dispose();
});
