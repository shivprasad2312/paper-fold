// ─────────────────────────────────────────────────────────────
// Tiny WebAudio sound engine — no audio assets needed.
// ─────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
}

function tone({ freq, duration, type = 'sine', gain = 0.08, delay = 0, slideTo }: ToneOpts) {
  const ac = audio();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export const sound = {
  get muted() {
    return muted;
  },
  toggleMuted() {
    muted = !muted;
    return muted;
  },
  select() {
    tone({ freq: 520, duration: 0.09, type: 'triangle', gain: 0.06 });
  },
  move() {
    // wooden peg dropping into a hole: short pitch drop
    tone({ freq: 340, slideTo: 180, duration: 0.14, type: 'triangle', gain: 0.1 });
  },
  error() {
    tone({ freq: 150, duration: 0.12, type: 'sawtooth', gain: 0.05 });
  },
  hint() {
    tone({ freq: 660, duration: 0.1, type: 'sine', gain: 0.06 });
    tone({ freq: 880, duration: 0.12, type: 'sine', gain: 0.06, delay: 0.1 });
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) =>
      tone({ freq, duration: 0.28, type: 'triangle', gain: 0.08, delay: i * 0.11 }),
    );
  },
};
