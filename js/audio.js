/* ==========================================================================
   audio.js — all sound is synthesised with the WebAudio API (no asset files)
   ========================================================================== */
(function (global) {
  'use strict';
  const HG = global.HG;

  const Sfx = {
    ctx: null,
    master: null,
    muted: !HG.save.sound,
    pourGain: null,
    pourSrc: null,
    noiseBuf: null,
    _lastPlop: 0,
    _lastScribble: 0,

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return this.ctx;
      }
      const AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      const ctx = (this.ctx = new AC());
      const master = (this.master = ctx.createGain());
      master.gain.value = this.muted ? 0 : 0.85;
      master.connect(ctx.destination);

      // reusable noise buffer (1s of white noise)
      const len = ctx.sampleRate;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;

      // continuous "pouring water" bed, gated by pouring state
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1500;
      bp.Q.value = 0.7;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 600;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(bp).connect(hp).connect(g).connect(master);
      src.start();
      this.pourSrc = src;
      this.pourGain = g;
      return ctx;
    },

    setEnabled(on) {
      this.muted = !on;
      HG.save.sound = on;
      if (this.master) this.master.gain.value = on ? 0.85 : 0;
      if (on) this.ensure();
    },

    _pourLevel: -1,
    setPour(level) {
      if (!this.ctx || !this.pourGain) return;
      level = Math.round(level * 20) / 20;
      if (level === this._pourLevel) return;
      this._pourLevel = level;
      const t = this.ctx.currentTime;
      const target = this.muted ? 0 : Math.min(0.16, level * 0.16);
      this.pourGain.gain.cancelScheduledValues(t);
      this.pourGain.gain.setTargetAtTime(target, t, 0.12);
    },

    _tone(freq, dur, type, gain, when, slideTo) {
      if (!this.ctx || this.muted) return;
      const ctx = this.ctx;
      const t0 = (when || 0) + ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain || 0.12), t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },

    _noise(dur, freq, Q, gain, type) {
      if (!this.ctx || this.muted) return;
      const ctx = this.ctx;
      const t0 = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq;
      f.Q.value = Q || 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain || 0.1, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    },

    click() { this.ensure(); this._tone(540, 0.07, 'triangle', 0.07, 0, 460); },
    draw() {
      if (!this.ctx) return;
      const now = performance.now();
      if (now - this._lastScribble < 55) return;
      this._lastScribble = now;
      this._noise(0.06, 2400 + Math.random() * 900, 1.4, 0.035, 'bandpass');
    },
    plop() {
      if (!this.ctx) return;
      const now = performance.now();
      if (now - this._lastPlop < 45) return;
      this._lastPlop = now;
      const f = 380 + Math.random() * 460;
      this._tone(f, 0.09, 'sine', 0.05, 0, f * 0.55);
    },
    splash() { this._noise(0.3, 900, 0.6, 0.12, 'lowpass'); },
    star(i) {
      this.ensure();
      const base = 660 * Math.pow(1.19, i || 0);
      this._tone(base, 0.26, 'triangle', 0.10);
      this._tone(base * 1.5, 0.3, 'sine', 0.06, 0.05);
    },
    win() {
      this.ensure();
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => this._tone(f, 0.42, 'triangle', 0.1, i * 0.09));
      this._tone(261.6, 0.7, 'sine', 0.07, 0.05);
    },
    fail() {
      this.ensure();
      this._tone(300, 0.22, 'sawtooth', 0.055, 0, 210);
      this._tone(196, 0.4, 'triangle', 0.07, 0.14, 150);
    },
    erase() { this.ensure(); this._noise(0.18, 1200, 0.5, 0.07, 'lowpass'); },
  };

  HG.Sfx = Sfx;
})(window);
