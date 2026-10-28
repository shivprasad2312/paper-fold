import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from './game.js';
import { animateCharacter, createCharacterBatches, createCharacterFactory, setCharacterTarget } from './characterRig.js';
import { observeSize, observeVisibility, tryDispose } from './sceneSafety.js';

/** An overlay keeps the reference board and its accessible HTML buttons intact. */
export default function ClassicCharacters({ pieces, reducedMotion, onStatus }) {
  const containerRef = useRef(null);
  const worldRef = useRef(null);
  const latest = useRef({ pieces, reducedMotion, onStatus });
  latest.current = { pieces, reducedMotion, onStatus };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let renderer;
    let factory;
    let batches;
    let stopSize;
    let stopVisibility;
    let frame;
    let initTimer;
    let disposed = false;
    let onContextLost;

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      worldRef.current = null;
      if (initTimer !== undefined) window.clearTimeout(initTimer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      tryDispose(stopSize);
      tryDispose(stopVisibility);
      if (renderer?.domElement && onContextLost) renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      tryDispose(() => batches?.dispose());
      tryDispose(() => factory?.dispose());
      tryDispose(() => renderer?.dispose());
      tryDispose(() => renderer?.forceContextLoss());
      renderer?.domElement?.remove();
    };
    const fail = (error) => {
      if (disposed) return;
      console.warn('Animated characters are unavailable; using the classic sprites.', error);
      cleanup();
      latest.current.onStatus('failed');
    };

    // Let the HTML board (or 3D loading shell) paint before expensive GPU setup.
    // The sprites remain usable while the character renderer starts.
    const initialize = () => {
      if (disposed) return;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        container.appendChild(renderer.domElement);
        onContextLost = (event) => { event.preventDefault(); fail(new Error('WebGL context lost')); };
        renderer.domElement.addEventListener('webglcontextlost', onContextLost);

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-7.5, 7.5, 7.5, -7.5, 0.1, 100);
        camera.position.set(0, 0, 12);
        camera.lookAt(0, 0, 0);
        scene.add(new THREE.HemisphereLight(0xffffff, 0xe8ddcc, 1.7));
        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(-4, 7, 10);
        scene.add(light);

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
            allCharacters.forEach((rig) => { rig.root.visible = false; });
            const now = performance.now();
            visuals.forEach((visual) => {
              const rig = characters[visual.color][visual.index];
              const yard = visual.progress < 0;
              const scale = visual.stacked ? 0.72 : yard ? 1.05 : 0.82;
              rig.root.scale.setScalar(scale);
              // The vertical offset matches the footprint of the HTML hit target.
              const ground = yard ? 0.42 : 0.32;
              const destination = new THREE.Vector3(visual.col - 7.5, 7.5 - visual.row - ground, visual.row * 0.012);
              setCharacterTarget(rig, visual, destination, now, { immediate: immediate || latest.current.reducedMotion });
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
            if (width && height) renderer.setSize(width, height, false);
          } catch (error) { fail(error); }
        };
        resize();
        if (disposed) return;
        stopSize = observeSize(container, resize);

        let inView = true;
        stopVisibility = observeVisibility(container, (visible) => { inView = visible; });
        let previous = performance.now();
        const render = (now) => {
          if (disposed) return;
          try {
            const delta = Math.min((now - previous) / 1000, 0.1);
            previous = now;
            if (inView && !document.hidden) {
              allCharacters.forEach((rig) => {
                if (rig.root.visible) animateCharacter(rig, now, delta, latest.current.reducedMotion);
              });
              batches.update();
              renderer.render(scene, camera);
            }
            frame = requestAnimationFrame(render);
          } catch (error) { fail(error); }
        };
        render(previous);
        if (!disposed) latest.current.onStatus('ready');
      } catch (error) { fail(error); }
    };
    initTimer = window.setTimeout(initialize, 120);
    return cleanup;
  }, []);

  useEffect(() => { worldRef.current?.sync(pieces); }, [pieces, reducedMotion]);
  return <div className="character-canvas" ref={containerRef} aria-hidden="true" />;
}
