import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { colorsFor } from './game.js';
import { animateCharacter, createCharacterBatches, createCharacterFactory, setCharacterTarget } from './characterRig.js';
import { observeSize, observeVisibility, tryDispose } from './sceneSafety.js';
import { createFrameLoop } from './frameLoop.js';

/** An overlay keeps the reference board and its accessible HTML buttons intact. */
export default function ClassicCharacters({ pieces, characterChoices, playerCount, teamColors, reducedMotion, onStatus }) {
  const containerRef = useRef(null);
  const worldRef = useRef(null);
  const latest = useRef({ pieces, characterChoices, playerCount, teamColors, reducedMotion, onStatus });
  latest.current = { pieces, characterChoices, playerCount, teamColors, reducedMotion, onStatus };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    let renderer;
    let factory;
    let batches;
    let stopSize;
    let stopVisibility;
    let stopPageVisibility;
    let frameLoop;
    let initTimer;
    let disposed = false;
    let onContextLost;

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      worldRef.current = null;
      if (initTimer !== undefined) window.clearTimeout(initTimer);
      tryDispose(() => frameLoop?.dispose());
      tryDispose(stopSize);
      tryDispose(stopVisibility);
      tryDispose(stopPageVisibility);
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

    // Let the HTML board paint before expensive GPU setup.
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
        let characters = {};
        let allCharacters = [];
        let currentChoices;
        let currentTeamColors;
        let currentPlayerCount;

        const sync = (visuals, immediate = false) => {
          if (disposed) return;
          try {
            allCharacters.forEach((rig) => { rig.root.visible = false; });
            const now = performance.now();
            visuals.forEach((visual) => {
              const rig = characters[visual.color][visual.index];
              const yard = visual.progress < 0;
              const scale = visual.stacked ? 0.72 : yard ? 1.05 : 0.82;
              const radialScale = latest.current.playerCount > 4 ? (yard ? 0.84 : 0.93) : 1;
              rig.root.scale.setScalar(scale * radialScale);
              // The vertical offset matches the footprint of the HTML hit target.
              const ground = yard ? 0.42 : 0.32;
              const destination = new THREE.Vector3(visual.col - 7.5, 7.5 - visual.row - ground, visual.row * 0.012);
              setCharacterTarget(rig, visual, destination, now, { immediate: immediate || latest.current.reducedMotion });
            });
            frameLoop?.setContinuous(!latest.current.reducedMotion);
            frameLoop?.invalidate();
          } catch (error) { fail(error); }
        };
        const setChoices = (choices, count, teamColors) => {
          const colors = colorsFor(count);
          if (disposed || (currentPlayerCount === count && colors.every((seat) =>
            currentChoices?.[seat] === choices[seat] && currentTeamColors?.[seat] === (teamColors?.[seat] ?? seat)))) return;
          try {
            batches?.dispose();
            characters = Object.fromEntries(colors.map((seat) => [seat, Array.from({ length: 4 }, (_, index) => {
              const rig = factory.create(teamColors?.[seat] ?? seat, index, choices[seat]);
              rig.root.visible = false;
              return rig;
            })]));
            allCharacters = Object.values(characters).flat();
            batches = createCharacterBatches(scene, allCharacters);
            currentChoices = { ...choices };
            currentTeamColors = Object.fromEntries(colors.map((seat) => [seat, teamColors?.[seat] ?? seat]));
            currentPlayerCount = count;
            sync(latest.current.pieces, true);
          } catch (error) { fail(error); }
        };
        worldRef.current = { sync, setChoices };
        setChoices(latest.current.characterChoices, latest.current.playerCount, latest.current.teamColors);
        if (disposed) return;

        const resize = () => {
          if (disposed) return;
          try {
            const width = container.clientWidth;
            const height = container.clientHeight;
            if (width && height) renderer.setSize(width, height, false);
            frameLoop?.invalidate();
          } catch (error) { fail(error); }
        };
        resize();
        if (disposed) return;
        stopSize = observeSize(container, resize);

        let inView = true;
        let pageHidden = false;
        let firstFrame = true;
        frameLoop = createFrameLoop({
          requestFrame: (callback) => requestAnimationFrame(callback),
          cancelFrame: (frame) => cancelAnimationFrame(frame),
          continuous: !latest.current.reducedMotion,
          active: !document.hidden,
          render: (now, delta) => {
            if (disposed) return;
            try {
              allCharacters.forEach((rig) => {
                if (rig.root.visible) animateCharacter(rig, now, delta, latest.current.reducedMotion);
              });
              batches.update();
              renderer.render(scene, camera);
              // Keep the static sprites until an actual frame has painted.
              if (firstFrame) { firstFrame = false; latest.current.onStatus('ready'); }
            } catch (error) { fail(error); }
          },
        });
        const updateVisibility = () => frameLoop?.setActive(inView && !document.hidden && !pageHidden);
        const hidePage = () => { pageHidden = true; updateVisibility(); };
        const showPage = () => { pageHidden = false; updateVisibility(); };
        document.addEventListener('visibilitychange', updateVisibility);
        window.addEventListener('pagehide', hidePage);
        window.addEventListener('pageshow', showPage);
        stopPageVisibility = () => {
          document.removeEventListener('visibilitychange', updateVisibility);
          window.removeEventListener('pagehide', hidePage);
          window.removeEventListener('pageshow', showPage);
        };
        stopVisibility = observeVisibility(container, (visible) => { inView = visible; updateVisibility(); });
        frameLoop.invalidate();
      } catch (error) { fail(error); }
    };
    initTimer = window.setTimeout(initialize, 120);
    return cleanup;
  }, []);

  useEffect(() => { worldRef.current?.setChoices(characterChoices, playerCount, teamColors); }, [characterChoices, playerCount, teamColors]);
  useEffect(() => { worldRef.current?.sync(pieces); }, [pieces, reducedMotion]);
  return <div className="character-canvas" ref={containerRef} aria-hidden="true" />;
}
