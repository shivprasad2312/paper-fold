import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Camera: a near-isometric 3/4 view, slightly yawed for that tilted-grid look.
const YAW = 0.20;
const PITCH = 0.95; // ~54 degrees
const DIST = 80;

// Two worlds, one engine: the dark void (floating in space) and the light
// high-key room (soft white sky, gentle shadows). Same slabs, same shadows —
// only the light changes, which is what makes both looks read as clean.
const THEMES = {
  dark: {
    background: 0x020309,
    hemiSky: 0xdde6f2,
    hemiGround: 0x0a0d14,
    hemiIntensity: 0.85,
    sunColor: 0xfff6e8,
    sunIntensity: 3.0,
    fillColor: 0x9db8e8,
    fillIntensity: 0.5,
    exposure: 1.12,
    bloomStrength: 0.5,
    bloomThreshold: 0.94,
    stars: 0.7,
  },
  light: {
    background: 0xe9edf4,
    hemiSky: 0xffffff,
    hemiGround: 0xaebcd2,
    hemiIntensity: 1.2,
    sunColor: 0xfff4e0,
    sunIntensity: 2.7,
    fillColor: 0xcfe0f5,
    fillIntensity: 0.9,
    exposure: 1.06,
    bloomStrength: 0.3,
    bloomThreshold: 0.97,
    stars: 0,
  },
};

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setClearColor(0x020309, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    // Real-time shadows: soft sun from high above.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020309);

    this.camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 260);
    this.camera.up.set(0, 1, 0);

    // Point the camera at the origin from the classic 3/4 angle.
    this.viewDir = new THREE.Vector3(
      Math.sin(YAW) * Math.cos(PITCH),
      Math.sin(PITCH),
      Math.cos(YAW) * Math.cos(PITCH),
    ).normalize();

    this.levelCenter = new THREE.Vector3();
    this.corners = [];
    this.focus = new THREE.Vector3();
    this.target = new THREE.Vector3();
    this.shakeAmp = 0;
    this.aspect = 1;
    this.time = 0;
    this.bloomEnabled = true;
    this.quality = 1;
    this.theme = 'dark';

    this.buildLights();
    this.buildStars();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.5, 0.94);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    this.setTheme('dark');
  }

  /** Swap the world: 'dark' void or 'light' high-key. Instant, no rebuilds. */
  setTheme(name) {
    const t = THEMES[name] || THEMES.dark;
    this.theme = name;
    this.renderer.setClearColor(t.background, 1);
    this.scene.background.set(t.background);
    const { hemi, key, fill } = this.ambientLights;
    hemi.color.set(t.hemiSky);
    hemi.groundColor.set(t.hemiGround);
    hemi.intensity = t.hemiIntensity;
    key.color.set(t.sunColor);
    key.intensity = t.sunIntensity;
    fill.color.set(t.fillColor);
    fill.intensity = t.fillIntensity;
    this.renderer.toneMappingExposure = t.exposure;
    this.bloom.strength = t.bloomStrength;
    this.bloom.threshold = t.bloomThreshold;
    this.stars.material.opacity = t.stars;
    this.stars.visible = t.stars > 0;
  }

  buildLights() {
    // Soft daylight from the sky; the ground side stays dark space.
    const hemi = new THREE.HemisphereLight(0xdde6f2, 0x0a0d14, 0.85);
    this.scene.add(hemi);

    // The sun: high above, slightly forward-left, casting the level's shadow.
    const key = new THREE.DirectionalLight(0xfff6e8, 3.0);
    key.position.set(10, 42, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 8;
    key.shadow.camera.far = 120;
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -14;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.03;
    key.shadow.radius = 6;
    key.shadow.blurSamples = 16;
    this.scene.add(key);
    this.scene.add(key.target);
    this.key = key;

    // A faint cool fill so the shadowed faces aren't pure black.
    const fill = new THREE.DirectionalLight(0x9db8e8, 0.5);
    fill.position.set(-18, 26, -20);
    this.scene.add(fill);

    this.ambientLights = { hemi, key, fill };
  }

  /** A distant shell of faint stars — the floating-in-space void. */
  buildStars() {
    const count = 700;
    const pos = new Float32Array(count * 3);
    const size = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 60 + Math.random() * 70;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) * 0.72 + 8;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      size[i] = Math.random() < 0.12 ? 0.8 : 0.4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const m = new THREE.PointsMaterial({
      color: 0xc9d6ec,
      size: 0.55,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    this.stars = new THREE.Points(g, m);
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }

  /** Fit the orthographic view around a level's world bounds. */
  fitLevel(min, max) {
    this.levelCenter.set((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
    this.corners = [];
    for (const x of [min.x, max.x]) {
      for (const y of [min.y, max.y]) {
        for (const z of [min.z, max.z]) {
          this.corners.push(new THREE.Vector3(x, y, z));
        }
      }
    }
    this.target.copy(this.levelCenter);
    this.focus.set(0, 0, 0);

    // Aim the sun at the level and size its shadow frustum to cover it.
    const cx = this.levelCenter.x;
    const cz = this.levelCenter.z;
    const span = Math.max(max.x - min.x, max.z - min.z) * 0.5 + 5.5;
    const sc = this.key.shadow.camera;
    sc.left = -span;
    sc.right = span;
    sc.top = span;
    sc.bottom = -span;
    sc.updateProjectionMatrix();
    this.key.position.set(cx + 9, max.y + 34, cz + 13);
    this.key.target.position.set(cx, 0, cz);
    this.key.target.updateMatrixWorld();

    this.applyFit();
  }

  applyFit() {
    const c = this.levelCenter;
    const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), this.viewDir).normalize();
    const up = new THREE.Vector3().crossVectors(this.viewDir, right).normalize();
    let maxR = 0.001;
    let maxU = 0.001;
    const v = new THREE.Vector3();
    for (const p of this.corners) {
      v.copy(p).sub(c);
      maxR = Math.max(maxR, Math.abs(v.dot(right)));
      maxU = Math.max(maxU, Math.abs(v.dot(up)));
    }
    const pad = this.aspect < 0.8 ? 1.08 : 1.2;
    const aspect = this.aspect;
    const halfH = Math.max(maxU * pad, (maxR * pad) / aspect);
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.right = halfH * aspect;
    this.camera.left = -halfH * aspect;
    // Near/far around the pivot distance.
    this.camera.near = 0.1;
    this.camera.far = DIST * 3;
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.aspect = w / Math.max(1, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.composer.setPixelRatio?.(Math.min(window.devicePixelRatio || 1, 2));
    this.bloom.setSize(w, h);
    this.camera.left = -10 * this.aspect;
    this.camera.right = 10 * this.aspect;
    this.applyFit();
  }

  /**
   * Called (up to twice) when the device can't keep up:
   * stage 2 drops shadow mapping, stage 3 drops bloom + resolution.
   */
  reduceQuality() {
    if (this.quality >= 3) return;
    this.quality++;
    if (this.quality === 2) {
      this.key.castShadow = false;
    } else if (this.quality === 3) {
      this.bloomEnabled = false;
      this.bloom.enabled = false;
      const pr = Math.min(window.devicePixelRatio || 1, 1.25);
      this.renderer.setPixelRatio(pr);
      this.composer.setPixelRatio?.(pr);
    }
  }

  shake(amount = 0.25) {
    this.shakeAmp = Math.max(this.shakeAmp, amount);
  }

  /** Nudge the aim towards the cube, keeping the whole level in frame. */
  setFocus(x, z, weight = 0.16, maxOffset = 0.9) {
    const ox = (x - this.levelCenter.x) * weight;
    const oz = (z - this.levelCenter.z) * weight;
    this.focus.set(
      THREE.MathUtils.clamp(ox, -maxOffset, maxOffset),
      0,
      THREE.MathUtils.clamp(oz, -maxOffset, maxOffset),
    );
  }

  update(dt) {
    this.time += dt;

    // stars drift almost imperceptibly
    if (this.stars) this.stars.rotation.y += dt * 0.004;

    // gentle camera easing
    const desired = new THREE.Vector3(
      this.levelCenter.x + this.focus.x,
      this.levelCenter.y,
      this.levelCenter.z + this.focus.z,
    );
    this.target.lerp(desired, 1 - Math.pow(0.001, dt));

    const pos = new THREE.Vector3().copy(this.target).addScaledVector(this.viewDir, DIST);

    if (this.shakeAmp > 0.001) {
      const s = this.shakeAmp;
      pos.x += (Math.random() - 0.5) * s;
      pos.y += (Math.random() - 0.5) * s;
      pos.z += (Math.random() - 0.5) * s;
      this.shakeAmp *= Math.pow(0.02, dt);
    }

    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  render() {
    if (this.bloomEnabled) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
