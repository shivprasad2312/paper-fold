// ---------------------------------------------------------------------------
// Procedural audio. Everything here is synthesised at runtime — no samples.
// A slow electronic bed (pad + bass + arp + light percussion) plus one-shot SFX.
// ---------------------------------------------------------------------------

const BPM = 100;
const STEP = 60 / BPM / 4; // 16th note
const BAR = STEP * 16;

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// A-minor flavoured progressions (MIDI note numbers, one chord per bar).
const PROGRESSIONS = [
  [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]], // Am F C G
  [[50, 53, 57, 60], [46, 50, 53, 57], [48, 52, 55, 60], [43, 50, 55, 58]], // Dm Bb C G
  [[45, 48, 52, 55], [41, 48, 53, 57], [43, 47, 50, 55], [40, 47, 52, 55]], // Am F Dm E
  [[52, 55, 59, 62], [48, 52, 55, 59], [50, 54, 57, 62], [45, 52, 57, 60]], // Em C D Am
];

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.started = false;
    this.musicOn = false;
    this.levelSeed = 0;
    this.timer = null;
    this.nextStep = 0;
    this.step = 0;
    this.barCount = 0;
    this.progressionIndex = 0;
    this.transpose = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      this.enabled = false;
      return;
    }
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 3;
    this.comp.attack.value = 0.01;
    this.comp.release.value = 0.25;

    this.master.connect(this.comp);
    this.comp.connect(ctx.destination);

    // simple algorithmic reverb from a decaying noise impulse
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(1.9, 2.6);
    this.reverbGain = ctx.createGain();
    this.reverbGain.gain.value = 0.32;
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.0;
    this.musicBus.connect(this.master);
    this.musicBus.connect(this.reverb);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.85;
    this.sfxBus.connect(this.master);
    this.sfxBus.connect(this.reverb);

    this.noiseBuffer = this.makeNoise(1.2);
  }

  makeImpulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  makeNoise(seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(on ? 0.9 : 0.0, t, 0.06);
  }

  // ------------------------------------------------------------------ music
  startMusic(seed = 0) {
    if (!this.ctx || this.musicOn) {
      this.setLevel(seed);
      return;
    }
    this.musicOn = true;
    this.setLevel(seed);
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setValueAtTime(0.0001, t);
    this.musicBus.gain.exponentialRampToValueAtTime(0.5, t + 1.4);
    this.nextStep = this.ctx.currentTime + 0.08;
    this.step = 0;
    this.barCount = 0;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() {
    if (!this.ctx || !this.musicOn) return;
    this.musicOn = false;
    const t = this.ctx.currentTime;
    this.musicBus.gain.cancelScheduledValues(t);
    this.musicBus.gain.setTargetAtTime(0.0001, t, 0.25);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setLevel(seed) {
    this.levelSeed = seed;
    this.progressionIndex = seed % PROGRESSIONS.length;
    // lift the key a little as the levels go on, but stay in a comfy range
    this.transpose = [0, 2, -3, 5, 0, -2, 3, 0, -5, 2, 0, 4][seed % 12] || 0;
  }

  schedule() {
    if (!this.ctx || !this.musicOn) return;
    const ctx = this.ctx;
    while (this.nextStep < ctx.currentTime + 0.14) {
      this.playStep(this.step, this.nextStep);
      this.nextStep += STEP;
      this.step++;
      if (this.step % 16 === 0) this.barCount++;
    }
  }

  chordAt(bar) {
    const prog = PROGRESSIONS[this.progressionIndex];
    return prog[bar % prog.length].map((n) => n + this.transpose);
  }

  playStep(step, time) {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const chord = this.chordAt(bar);
    const root = chord[0];

    if (s === 0) {
      this.pad(chord, time, BAR * 0.98);
      this.bass(mtof(root - 12), time, STEP * 6);
      this.bass(mtof(root - 12), time + STEP * 8, STEP * 5);
      this.kick(time);
      this.kick(time + STEP * 8);
    }

    // light percussion
    if (s === 4 || s === 12) this.hat(time, 0.05);
    if (s % 2 === 0) this.hat(time, 0.022);
    if (s === 6 || s === 14) this.kick(time, 0.5);

    // arpeggio: chord tones in a rolling pattern, with rests
    const pattern = [0, 2, 1, 3, 2, 0, 3, 1];
    if (s % 2 === 0) {
      const idx = (Math.floor(s / 2) + bar) % 8;
      const tone = chord[pattern[idx] % chord.length] + (idx >= 4 ? 12 : 0);
      this.pluck(mtof(tone + 12), time, 0.18 + (s % 4 === 0 ? 0.1 : 0));
    }

    // occasional shimmer
    if (s === 10 && bar % 4 === 3) {
      this.pluck(mtof(chord[2] + 24), time, 0.6, 0.05);
    }
  }

  pad(chord, time, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.075, time + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(620, time);
    filter.frequency.linearRampToValueAtTime(1100, time + dur * 0.5);
    filter.frequency.linearRampToValueAtTime(700, time + dur);
    filter.Q.value = 1.2;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start(time);
    lfo.stop(time + dur + 0.1);

    filter.connect(g);
    g.connect(this.musicBus);

    for (const note of chord) {
      for (const det of [-7, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(note);
        o.detune.value = det;
        o.connect(filter);
        o.start(time);
        o.stop(time + dur + 0.1);
      }
    }
  }

  bass(freq, time, dur) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = freq / 2;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.22, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;

    o.connect(f);
    sub.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    o.start(time);
    sub.start(time);
    o.stop(time + dur + 0.05);
    sub.stop(time + dur + 0.05);
  }

  pluck(freq, time, dur, gain = 0.05) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.005;

    const g = ctx.createGain();
    const peak = Math.max(0.008, gain);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);

    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(3800, time);
    f.frequency.exponentialRampToValueAtTime(900, time + dur);

    o.connect(f);
    o2.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    o.start(time);
    o2.start(time);
    o.stop(time + dur + 0.02);
    o2.stop(time + dur + 0.02);
  }

  kick(time, vel = 1) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(128, time);
    o.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.5 * vel, time + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
    o.connect(g);
    g.connect(this.musicBus);
    o.start(time);
    o.stop(time + 0.25);
  }

  hat(time, gain) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 8200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    src.connect(f);
    f.connect(g);
    g.connect(this.musicBus);
    src.start(time, Math.random() * 0.5, 0.06);
  }

  // -------------------------------------------------------------------- sfx
  sfx(name, opts = {}) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + 0.001;
    switch (name) {
      case 'roll':
        this.noiseHit(t, 0.055, 900, opts.pitch || 1, 0.1);
        break;
      case 'land':
        this.blip(t, 150, 78, 0.12, 'sine', 0.16);
        break;
      case 'bump':
        this.noiseHit(t, 0.06, 260, 1, 0.14);
        this.blip(t, 110, 70, 0.07, 'square', 0.05);
        break;
      case 'shard':
        this.blip(t, 880, 1320, 0.1, 'sine', 0.18);
        this.blip(t + 0.07, 1320, 1760, 0.12, 'triangle', 0.14);
        break;
      case 'death':
        this.blip(t, 240, 40, 0.55, 'sawtooth', 0.18);
        this.noiseHit(t, 0.4, 400, 0.6, 0.18);
        break;
      case 'win':
        [0, 4, 7, 12, 16].forEach((semi, i) => {
          const f = mtof(60 + 12 + semi + (opts.transpose || 0));
          this.blip(t + i * 0.085, f, f, 0.5, 'triangle', 0.13);
        });
        break;
      case 'ui':
        this.blip(t, 620, 720, 0.07, 'sine', 0.07);
        break;
      case 'push':
        // a telekinetic shove: low effort growl + the block sliding
        this.blip(t, 70, 44, 0.22, 'sawtooth', 0.14);
        this.noiseHit(t + 0.03, 0.14, 500, 0.9, 0.12);
        break;
      case 'windNudge':
        // a soft gust that carries the cube a tile
        this.noiseHit(t, 0.28, 1600, 1.4, 0.07);
        this.blip(t, 320, 520, 0.22, 'sine', 0.05);
        break;
      case 'key':
        // the gate key: a bright golden pickup, one octave above a shard
        this.blip(t, 1174, 1568, 0.12, 'sine', 0.2);
        this.blip(t + 0.09, 1568, 2093, 0.16, 'triangle', 0.16);
        this.blip(t + 0.2, 2093, 2637, 0.2, 'sine', 0.1);
        break;
      case 'gateLocked':
        // the sealed gate refuses: a dull double knock
        this.noiseHit(t, 0.05, 220, 1, 0.16);
        this.blip(t, 140, 80, 0.09, 'square', 0.08);
        this.noiseHit(t + 0.13, 0.05, 200, 1, 0.14);
        this.blip(t + 0.13, 120, 70, 0.09, 'square', 0.07);
        break;
      case 'sliderFell':
        // a bridge letting go: low creak into the void
        this.blip(t, 180, 50, 0.5, 'sawtooth', 0.1);
        this.noiseHit(t + 0.1, 0.35, 300, 0.5, 0.12);
        break;
      case 'medal':
        // a medal chime layered on the win, pitched by tier
        const shift = opts.tier === 'gold' ? 12 : opts.tier === 'silver' ? 7 : 0;
        [0, 7, 12, 19].forEach((semi, i) => {
          this.blip(t + i * 0.08, mtof(69 + semi + shift), mtof(69 + semi + shift), 0.5, 'triangle', 0.09);
        });
        break;
      default:
        break;
    }
  }

  blip(time, f0, f1, dur, type, gain) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, time);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), time + dur * 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    o.connect(g);
    g.connect(this.sfxBus);
    o.start(time);
    o.stop(time + dur + 0.03);
  }

  noiseHit(time, dur, freq, pitch, gain) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq * pitch;
    f.Q.value = 1.4;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus);
    src.start(time, Math.random() * 0.4, dur + 0.02);
  }
}
