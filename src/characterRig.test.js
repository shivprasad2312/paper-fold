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
