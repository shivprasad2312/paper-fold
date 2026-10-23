import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { glowTexture } from './textures.js';

// Camera: a near-isometric 3/4 view, slightly yawed for that tilted-grid look.
const YAW = 0.20;
const PITCH = 0.95; // ~54 degrees
const DIST = 80;

export class Stage {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setClearColor(0x05070f, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.scene = new THREE.Scene();

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

    this.buildLights();
    this.buildDust();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.55, 0.5, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xa8d4ff, 0x121a2c, 1.5);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xdfefff, 2.6);
    key.position.set(-6, 12, 8);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x4f86ff, 1.3);
    rim.position.set(8, 5, -10);
    this.scene.add(rim);

    const warm = new THREE.PointLight(0xff5ad9, 15, 26, 2);
    warm.position.set(-5, 6, -6);
    this.scene.add(warm);

    const cool = new THREE.PointLight(0x4fd3f7, 13, 24, 2);
    cool.position.set(6, 4, 6);
    this.scene.add(cool);

    this.ambientLights = { hemi, key, rim, warm, cool };
  }

  buildDust() {
    const count = 260;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = Math.random() * 16 - 4;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
      seed[i] = Math.random() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({
      size: 0.5,
      map: glowTexture(),
      color: 0x8fc8ff,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.dust = new THREE.Points(g, m);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);
    this.dustSeed = seed;
    this.dustBase = pos.slice();
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

  /** Called when the device can't keep up: drop the expensive passes. */
  reduceQuality() {
    if (!this.bloomEnabled) return;
    this.bloomEnabled = false;
    this.bloom.enabled = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.composer.setPixelRatio?.(Math.min(window.devicePixelRatio || 1, 1.25));
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

    // dust drift
    if (this.dust) {
      const arr = this.dust.geometry.attributes.position.array;
      for (let i = 0; i < this.dustSeed.length; i++) {
        const s = this.dustSeed[i];
        arr[i * 3 + 1] += dt * (0.09 + 0.06 * Math.sin(s));
        arr[i * 3 + 0] += dt * 0.05 * Math.sin(this.time * 0.25 + s);
        if (arr[i * 3 + 1] > 14) arr[i * 3 + 1] = -5;
      }
      this.dust.geometry.attributes.position.needsUpdate = true;
    }

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
