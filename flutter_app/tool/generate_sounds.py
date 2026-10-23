#!/usr/bin/env python3
"""Generate the game's WAV sound effects (stdlib only).

Mirrors the WebAudio tones used by the web build:
  select  triangle 520 Hz, 90 ms
  move    triangle 340 -> 180 Hz slide, 140 ms
  error   sawtooth 150 Hz, 120 ms
  hint    sine 660 Hz then 880 Hz
  win     triangle C5 E5 G5 C6 arpeggio
"""
import math
import os
import wave

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "sounds")


def _waveform(kind, phase):
    if kind == "sine":
        return math.sin(phase)
    if kind == "triangle":
        return (2 / math.pi) * math.asin(math.sin(phase))
    # sawtooth
    return 2 * (phase / (2 * math.pi) - math.floor(0.5 + phase / (2 * math.pi)))


def tone(freq, dur, kind="sine", gain=0.08, slide_to=None, delay=0.0):
    n = int(SR * (delay + dur))
    buf = [0.0] * n
    start = int(SR * delay)
    phase = 0.0
    for i in range(int(SR * dur)):
        t = i / SR
        f = freq if slide_to is None else freq * (slide_to / freq) ** (t / dur)
        phase += 2 * math.pi * f / SR
        # exponential attack/release envelope, like the WebAudio gain ramps
        env = min(1.0, math.exp(math.log(0.001 / max(gain, 1e-4)) * (1 - min(1, t / 0.012))))
        if t > 0:
            env *= min(1.0, math.exp(math.log(0.001 / max(gain, 1e-4)) * ((t - 0.012) / max(dur - 0.012, 1e-3))))
        buf[start + i] = _waveform(kind, phase) * gain * env
    return buf


def mix(*buffers):
    n = max(len(b) for b in buffers)
    out = [0.0] * n
    for b in buffers:
        for i, v in enumerate(b):
            out[i] += v
    return out


def write(name, buf):
    path = os.path.join(OUT, name)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        frames = bytearray()
        for v in buf:
            v = max(-1.0, min(1.0, v))
            frames += int(v * 32767).to_bytes(2, "little", signed=True)
        w.writeframes(frames)
    print("wrote", path)


def main():
    os.makedirs(OUT, exist_ok=True)
    write("select.wav", tone(520, 0.09, "triangle", 0.25))
    write("move.wav", tone(340, 0.14, "triangle", 0.35, slide_to=180))
    write("error.wav", tone(150, 0.12, "sawtooth", 0.18))
    write("hint.wav", mix(tone(660, 0.10, "sine", 0.25), tone(880, 0.12, "sine", 0.25, delay=0.10)))
    write(
        "win.wav",
        mix(
            *[
                tone(f, 0.28, "triangle", 0.28, delay=i * 0.11)
                for i, f in enumerate((523.25, 659.25, 783.99, 1046.5))
            ]
        ),
    )


if __name__ == "__main__":
    main()
