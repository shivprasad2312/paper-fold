/**
 * Tiny synthesised soundtrack — no audio files needed.
 * Everything is built from oscillators and a scrap of noise, so the whole
 * game stays a single small bundle.
 */
export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = readFlag('paperfold.muted') === true;
    this.volume = 0.5;
  }

  /** Must be called from a user gesture at least once. */
  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 22;
      compressor.ratio.value = 8;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.24;

      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(compressor);
      compressor.connect(this.ctx.destination);

      this.noiseBuffer = this.makeNoiseBuffer(0.4);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    writeFlag('paperfold.muted', muted);
    if (this.master && this.ctx) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(muted ? 0 : this.volume, t, 0.02);
    }
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  makeNoiseBuffer(seconds) {
    const rate = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.floor(rate * seconds), rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  tone(freq, opts = {}) {
    if (!this.ctx || this.muted) return;
    const {
      type = 'sine',
      dur = 0.3,
      vol = 0.15,
      slideTo = null,
      delay = 0,
      attack = 0.006,
    } = opts;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(24, slideTo), t0 + dur);
    }
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  noise(dur = 0.06, freq = 1200, vol = 0.1, delay = 0) {
    if (!this.ctx || !this.noiseBuffer || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  drop() {
    this.tone(170, { type: 'triangle', dur: 0.11, vol: 0.16, slideTo: 95 });
    this.noise(0.05, 1500, 0.05);
  }

  merge(tier = 1, combo = 1) {
    // Pentatonic ladder: bigger fruit, higher, happier note.
    const ladder = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
    const semitone = ladder[Math.min(tier, ladder.length - 1)] + (combo > 1 ? 2 : 0);
    const freq = 174 * Math.pow(2, semitone / 12);
    this.tone(freq, { type: 'triangle', dur: 0.34, vol: 0.19 });
    this.tone(freq * 2, { type: 'sine', dur: 0.28, vol: 0.08, delay: 0.015 });
    this.tone(freq * 1.5, { type: 'sine', dur: 0.42, vol: 0.055, delay: 0.05 });
    this.noise(0.05, 2400, 0.03);
  }

  pop() {
    this.tone(880, { type: 'sine', dur: 0.22, vol: 0.12, slideTo: 1320 });
    this.tone(440, { type: 'triangle', dur: 0.3, vol: 0.1, delay: 0.02 });
  }

  gameOver() {
    [392, 311, 247, 185].forEach((f, i) => {
      this.tone(f, { type: 'triangle', dur: 0.5, vol: 0.16, delay: i * 0.15 });
    });
    this.tone(92, { type: 'sine', dur: 0.7, vol: 0.1, delay: 0.1 });
  }

  newBest() {
    [523, 659, 784, 1047].forEach((f, i) => {
      this.tone(f, { type: 'sine', dur: 0.4, vol: 0.11, delay: i * 0.085 });
    });
  }

  win() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => {
      this.tone(f, { type: 'triangle', dur: 0.5, vol: 0.13, delay: i * 0.1 });
    });
    this.noise(0.3, 3200, 0.06);
  }

  click() {
    this.tone(560, { type: 'sine', dur: 0.06, vol: 0.07, slideTo: 700 });
  }
}

function readFlag(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? false : JSON.parse(raw);
  } catch {
    return false;
  }
}

function writeFlag(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage might be blocked — no big deal */
  }
}
