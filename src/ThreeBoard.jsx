import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { COLORS, PLAYERS, TRACK, piecePosition } from './game.js';
import { animateCharacter, createCharacterBatches, createCharacterFactory, setCharacterTarget } from './characterRig.js';
import { observeSize, observeVisibility, tryDispose } from './sceneSafety.js';

const THREE_COLORS = { yellow: 0xf5c247, red: 0xee746c, blue: 0x62c5d0, green: 0x6bc989 };

function material(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.76, ...extra });
}

function mesh(geometry, surface, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, surface);
  object.position.set(x, y, z);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function makeStar(radius = 0.29) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const angle = Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? radius : radius * 0.44;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function makeArrow() {
  const shape = new THREE.Shape();
  shape.moveTo(-0.25, -0.09);
  shape.lineTo(0.04, -0.09);
  shape.lineTo(0.04, -0.23);
  shape.lineTo(0.28, 0);
  shape.lineTo(0.04, 0.23);
  shape.lineTo(0.04, 0.09);
  shape.lineTo(-0.25, 0.09);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function flatShape(geometry, surface, row, col, rotation = 0) {
  const shape = new THREE.Mesh(geometry, surface);
  shape.rotation.set(-Math.PI / 2, 0, rotation);
  shape.position.set(col + 0.5 - 7.5, 0.205, row + 0.5 - 7.5);
  shape.receiveShadow = true;
  return shape;
}

function addBoard(scene, resources) {
  const white = material(0xfffbf0);
  const track = material(0xfffdf7);
  const centerWhite = material(0xfffdf5);
  const teams = Object.fromEntries(COLORS.map((color) => [color, material(THREE_COLORS[color])]));
  const tileGeometry = new THREE.BoxGeometry(0.97, 0.075, 0.97);
  const homeGeometry = new THREE.BoxGeometry(5.96, 0.10, 5.96);
  const slotGeometry = new THREE.CylinderGeometry(0.72, 0.76, 0.10, 32);
  const starGeometry = makeStar();
  const arrowGeometry = makeArrow();
  resources.push(white, track, centerWhite, ...Object.values(teams), tileGeometry, homeGeometry, slotGeometry, starGeometry, arrowGeometry);

  const boardBase = mesh(new RoundedBoxGeometry(15.45, 0.48, 15.45, 4, 0.17), white, 0, -0.16, 0);
  boardBase.castShadow = true;
  scene.add(boardBase);

  COLORS.forEach((color) => {
    const [row, col] = PLAYERS[color].home;
    const home = mesh(homeGeometry, teams[color], col + 3 - 7.5, 0.09, row + 3 - 7.5);
    scene.add(home);
    for (let index = 0; index < 4; index += 1) {
      const [r, c] = piecePosition(color, index, -1);
      const slot = mesh(slotGeometry, centerWhite, c - 7.5, 0.19, r - 7.5);
      scene.add(slot);
    }
  });

  const startByIndex = Object.fromEntries(COLORS.map((color) => [PLAYERS[color].start, color]));
  const starByIndex = Object.fromEntries(COLORS.map((color) => [(PLAYERS[color].start + 8) % 52, color]));
  TRACK.forEach(([row, col], index) => {
    const color = startByIndex[index];
    scene.add(mesh(tileGeometry, color ? teams[color] : track, col + 0.5 - 7.5, 0.11, row + 0.5 - 7.5));
    if (starByIndex[index]) scene.add(flatShape(starGeometry, teams[starByIndex[index]], row, col));
    if (color) {
      const rotation = { yellow: 0, red: -Math.PI / 2, blue: Math.PI, green: Math.PI / 2 }[color];
      scene.add(flatShape(arrowGeometry, centerWhite, row, col, rotation));
    }
  });
  COLORS.forEach((color) => PLAYERS[color].lane.forEach(([row, col]) => {
    scene.add(mesh(tileGeometry, teams[color], col + 0.5 - 7.5, 0.11, row + 0.5 - 7.5));
  }));

  // Four triangular home stretches, meeting in the middle of the board.
  const triangles = {
    red: [[-1.5, -1.5], [1.5, -1.5], [0, 0]],
    blue: [[1.5, -1.5], [1.5, 1.5], [0, 0]],
    green: [[-1.5, 1.5], [1.5, 1.5], [0, 0]],
    yellow: [[-1.5, -1.5], [-1.5, 1.5], [0, 0]],
  };
  Object.entries(triangles).forEach(([color, points]) => {
    const shape = new THREE.Shape();
    points.forEach(([x, z], i) => { if (!i) shape.moveTo(x, -z); else shape.lineTo(x, -z); });
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    resources.push(geometry);
    const triangle = new THREE.Mesh(geometry, teams[color]);
    triangle.rotation.x = -Math.PI / 2;
    triangle.position.y = 0.15;
    triangle.receiveShadow = true;
    scene.add(triangle);
  });
  const center = mesh(new THREE.CylinderGeometry(0.46, 0.49, 0.12, 32), centerWhite, 0, 0.21, 0);
  scene.add(center);
}

export default function ThreeBoard({ game, pieces, onMove, disabled, onFallback, reducedMotion }) {
  const containerRef = useRef(null);
  const worldRef = useRef(null);
  const latest = useRef({ onMove, pieces, reducedMotion });
  const [failed, setFailed] = useState(false);
  latest.current = { onMove, pieces, reducedMotion };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let renderer;
    let controls;
    let scene;
    let factory;
    let batches;
    let stopSize;
    let stopVisibility;
    let pointerDown;
    let pointerUp;
    let pointerMove;
    let onContextLost;
    let frame;
    let initTimer;
    let disposed = false;
    const resources = [];

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      worldRef.current = null;
      if (initTimer !== undefined) window.clearTimeout(initTimer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      tryDispose(stopSize);
      tryDispose(stopVisibility);
      tryDispose(() => controls?.dispose());
      const canvas = renderer?.domElement;
      if (canvas) {
        if (pointerDown) canvas.removeEventListener('pointerdown', pointerDown);
        if (pointerUp) canvas.removeEventListener('pointerup', pointerUp);
        if (pointerMove) canvas.removeEventListener('pointermove', pointerMove);
        if (onContextLost) canvas.removeEventListener('webglcontextlost', onContextLost);
      }
      tryDispose(() => batches?.dispose());
      tryDispose(() => factory?.dispose());
      const geometries = new Set();
      const materials = new Set();
      tryDispose(() => scene?.traverse((object) => {
        if (object.geometry) geometries.add(object.geometry);
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach((surface) => materials.add(surface));
      }));
      resources.forEach((resource) => {
        if (resource?.isMaterial) materials.add(resource);
        else if (resource?.isBufferGeometry) geometries.add(resource);
      });
      geometries.forEach((geometry) => tryDispose(() => geometry.dispose()));
      materials.forEach((surface) => tryDispose(() => surface.dispose()));
      tryDispose(() => renderer?.dispose());
      tryDispose(() => renderer?.forceContextLoss());
      canvas?.remove();
    };
    const fail = (error) => {
      if (disposed) return;
      console.warn('The 3D board is unavailable; returning to the classic board is still possible.', error);
      cleanup();
      setFailed(true);
    };

    // Let the HTML board (or 3D loading shell) paint before expensive GPU setup.
    // The sprites remain usable while the character renderer starts.
    const initialize = () => {
      if (disposed) return;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x000000, 0);
        container.prepend(renderer.domElement);
        onContextLost = (event) => { event.preventDefault(); fail(new Error('WebGL context lost')); };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);

        scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 100);
        camera.position.set(0, 21, 22);
        camera.lookAt(0, 0, 0);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.minPolarAngle = 0.20;
        controls.maxPolarAngle = 1.1;
        controls.target.set(0, 0, 0);
        controls.update();

        scene.add(new THREE.HemisphereLight(0xffffff, 0xe9e5cf, 1.15));
        const sun = new THREE.DirectionalLight(0xffffff, 1.35);
        sun.position.set(-8, 20, 12);
        sun.castShadow = true;
        sun.shadow.mapSize.set(1024, 1024);
        sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
        sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -12;
        sun.shadow.camera.near = 0.1; sun.shadow.camera.far = 60;
        sun.shadow.bias = -0.0003;
        sun.shadow.normalBias = 0.035;
        scene.add(sun);

        addBoard(scene, resources);
        factory = createCharacterFactory();
        const characters = Object.fromEntries(COLORS.map((color) => [color, Array.from({ length: 4 }, (_, index) => {
          const rig = factory.create(color, index);
          rig.root.visible = false;
          return rig;
        })]));
        const allCharacters = Object.values(characters).flat();
        batches = createCharacterBatches(scene, allCharacters);

        const sync = (visuals, immediate = false) => {
          if (disposed) return;
          try {
            allCharacters.forEach((rig) => { rig.root.visible = false; rig.selectable = false; });
            const now = performance.now();
            visuals.forEach((visual) => {
              const rig = characters[visual.color][visual.index];
              rig.selectable = visual.selectable;
              setCharacterTarget(rig, visual, new THREE.Vector3(visual.col - 7.5, 0.25, visual.row - 7.5), now,
                { immediate: immediate || latest.current.reducedMotion, showRing: true });
            });
          } catch (error) { fail(error); }
        };
        worldRef.current = { sync };
        sync(latest.current.pieces, true);
        if (disposed) return;

        const resize = () => {
          if (disposed) return;
          try {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (!width || !height) return;
            const aspect = width / height;
            const size = 9.8;
            camera.left = -size * aspect; camera.right = size * aspect;
            camera.top = size; camera.bottom = -size;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height, false);
          } catch (error) { fail(error); }
        };
        resize();
        if (disposed) return;
        stopSize = observeSize(container, resize);

        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        let down = null;
        const findCharacter = (event) => {
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
          raycaster.setFromCamera(pointer, camera);
          // Intersect generous character-sized volumes for easy tapping.
          const center = new THREE.Vector3();
          const hit = new THREE.Vector3();
          let closest = null;
          let distance = Infinity;
          allCharacters.filter((rig) => rig.root.visible && rig.selectable).forEach((rig) => {
            center.copy(rig.root.position).add(new THREE.Vector3(0, 0.95, 0));
            if (raycaster.ray.intersectSphere(new THREE.Sphere(center, 0.85), hit)) {
              const candidateDistance = hit.distanceTo(raycaster.ray.origin);
              if (candidateDistance < distance) { distance = candidateDistance; closest = rig.root; }
            }
          });
          return closest;
        };
        pointerDown = (event) => { down = { x: event.clientX, y: event.clientY }; };
        pointerUp = (event) => {
          if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) { down = null; return; }
          try {
            const character = findCharacter(event);
            if (character) latest.current.onMove(character.userData.piece.index);
          } catch (error) { fail(error); }
          down = null;
        };
        pointerMove = (event) => {
          try { renderer.domElement.style.cursor = findCharacter(event) ? 'pointer' : 'grab'; }
          catch (error) { fail(error); }
        };
        renderer.domElement.style.cursor = 'grab';
        renderer.domElement.addEventListener('pointerdown', pointerDown);
        renderer.domElement.addEventListener('pointerup', pointerUp);
        renderer.domElement.addEventListener('pointermove', pointerMove);

        let inView = true;
        stopVisibility = observeVisibility(container, (visible) => { inView = visible; });
        let previous = performance.now();
        const render = (now) => {
          if (disposed) return;
          try {
            const delta = Math.min((now - previous) / 1000, 0.1);
            previous = now;
            if (inView && !document.hidden) {
              controls.update();
              allCharacters.forEach((rig) => { if (rig.root.visible) animateCharacter(rig, now, delta, latest.current.reducedMotion, Math.atan2(camera.position.x, camera.position.z)); });
              batches.update();
              renderer.render(scene, camera);
            }
            frame = requestAnimationFrame(render);
          } catch (error) { fail(error); }
        };
        render(previous);
      } catch (error) { fail(error); }
    };
    initTimer = window.setTimeout(initialize, 120);
    return cleanup;
  }, []);

  useEffect(() => { worldRef.current?.sync(pieces); }, [pieces, reducedMotion]);

  const sadPiece = pieces.find((piece) => piece.pose === 'sad' || piece.pose === 'sad-walk');
  const dancingPiece = pieces.find((piece) => piece.pose === 'dance');
  return (
    <div className="three-board-frame" ref={containerRef} aria-label="Interactive 3D Ludo board">
      {failed ? <div className="three-error">Your browser couldn’t start the 3D view.<button onClick={onFallback}>Return to classic board</button></div> : <>
        <div className="three-hint">↔ &nbsp; DRAG TO ROTATE <span>·</span> TAP A CHARACTER TO MOVE</div>
        {(sadPiece || dancingPiece) && <div className={`three-reaction ${!dancingPiece && sadPiece ? 'three-reaction--sad' : ''}`} aria-hidden="true">
          {dancingPiece ? `✦ ${PLAYERS[dancingPiece.color].name} made it home!` : `💧 ${PLAYERS[sadPiece.color].name}: Oh no!`}
        </div>}
        {game.phase === 'choose' && !disabled && <div className="three-accessible-moves" aria-label="Choose a character to move">
          <span>Move character:</span>
          {game.legal.map((index) => <button key={index} onClick={() => onMove(index)} aria-label={`Move ${PLAYERS[game.current].name} character ${index + 1}`}>{index + 1}</button>)}
        </div>}
      </>}
    </div>
  );
}
