import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LEVELS,
  Level,
  buildLevel,
  applyMove,
  isSolved,
  findHint,
  countCrossings,
  Hint,
  Slots,
} from './game/engine';
import { drawScene, hitSlot, PegAnim } from './game/render';
import { sound } from './game/sound';
import './styles.css';

interface Move {
  from: number;
  to: number;
}

export default function App() {
  const [levelIdx, setLevelIdx] = useState(0);
  const [level, setLevel] = useState<Level>(() => buildLevel(0));
  const [slots, setSlots] = useState<Slots>(() => level.start);
  const [history, setHistory] = useState<Move[]>([]);
  const [moves, setMoves] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [won, setWon] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [size, setSize] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<PegAnim | null>(null);
  const hintTimer = useRef<number | null>(null);
  const sceneRef = useRef({ slots, selected, hint, won, level, anim: null as PegAnim | null });

  const total = level.def.total;
  const ropeCount = level.ropes.length;
  const crossings = useMemo(() => countCrossings(slots, ropeCount, total), [slots, ropeCount, total]);

  // keep the rAF loop fed with the freshest state
  sceneRef.current = { slots, selected, hint, won, level, anim: animRef.current };

  // ── responsive square canvas ──────────────────────────────
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => setSize(wrap.clientWidth));
    ro.observe(wrap);
    setSize(wrap.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !size) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    const ctx = canvas.getContext('2d');
    ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, [size]);

  // ── render loop ───────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    const loop = (t: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const s = sceneRef.current;
      if (ctx && size) {
        drawScene(ctx, {
          size,
          total: s.level.def.total,
          slots: s.slots,
          ropes: s.level.ropes,
          selected: s.selected,
          hint: s.hint,
          anim: s.anim,
          won: s.won,
          time: t,
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  // ── win detection ─────────────────────────────────────────
  useEffect(() => {
    if (!won && isSolved(slots, ropeCount, total)) {
      const t = window.setTimeout(() => {
        setWon(true);
        sound.win();
      }, 480);
      return () => window.clearTimeout(t);
    }
  }, [slots, won, ropeCount, total]);

  // ── actions ───────────────────────────────────────────────
  const clearHintSoon = () => {
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(null), 2800);
  };

  const handleTap = (slot: number) => {
    if (won) return;
    if (slot < 0) {
      setSelected(null);
      return;
    }
    if (slots[slot] !== null) {
      setHint(null);
      setSelected((prev) => {
        const nextSel = prev === slot ? null : slot;
        if (nextSel !== null) sound.select();
        return nextSel;
      });
      return;
    }
    // empty hole — move the selected peg here
    if (selected === null) {
      sound.error();
      return;
    }
    const from = selected;
    const next = applyMove(slots, from, slot);
    setSlots(next);
    setHistory((h) => [...h, { from, to: slot }]);
    setMoves((m) => m + 1);
    setSelected(null);
    setHint(null);
    sound.move();
    animRef.current = { from, to: slot, start: performance.now(), dur: 320 };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!size) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size;
    const y = ((e.clientY - rect.top) / rect.height) * size;
    handleTap(hitSlot(x, y, total, size));
  };

  const undo = () => {
    if (!history.length || won) return;
    const last = history[history.length - 1];
    setSlots(applyMove(slots, last.to, last.from));
    setHistory((h) => h.slice(0, -1));
    setMoves((m) => Math.max(0, m - 1));
    setSelected(null);
    setHint(null);
    animRef.current = { from: last.to, to: last.from, start: performance.now(), dur: 260 };
  };

  const restart = () => {
    setSlots(level.start);
    setHistory([]);
    setMoves(0);
    setSelected(null);
    setHint(null);
    setWon(false);
    animRef.current = null;
  };

  const loadLevel = (idx: number) => {
    const clamped = Math.max(0, Math.min(LEVELS.length - 1, idx));
    const l = buildLevel(clamped);
    setLevelIdx(clamped);
    setLevel(l);
    setSlots(l.start);
    setHistory([]);
    setMoves(0);
    setSelected(null);
    setHint(null);
    setWon(false);
    animRef.current = null;
  };

  const showHint = () => {
    if (won) return;
    const h = findHint(slots, ropeCount, total);
    if (!h) return;
    setHint(h);
    setSelected(h.from);
    sound.hint();
    clearHintSoon();
  };

  const toggleMute = () => setIsMuted(sound.toggleMuted());

  const stars = moves <= level.def.par ? 3 : moves <= Math.round(level.def.par * 1.6) ? 2 : 1;
  const isLast = levelIdx === LEVELS.length - 1;

  return (
    <div className="app">
      <header className="hud">
        <div className="hud-top">
          <div>
            <p className="eyebrow">Level {levelIdx + 1} / {LEVELS.length}</p>
            <h1>{level.def.name}</h1>
          </div>
          <div className="hud-right">
            <button
              className="mute-btn"
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute sounds' : 'Mute sounds'}
              title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
            <div className="stats">
              <div className="stat">
                <span className="stat-value">{moves}</span>
                <span className="stat-label">Moves</span>
              </div>
            <div className={`stat ${crossings === 0 ? 'stat-ok' : ''}`}>
              <span className="stat-value">{crossings}</span>
              <span className="stat-label">Crossings</span>
            </div>
              <div className="stat">
                <span className="stat-value">{level.def.par}</span>
                <span className="stat-label">Par</span>
              </div>
            </div>
          </div>
        </div>

        <div className="dots">
          {LEVELS.map((l, i) => (
            <button
              key={l.name}
              className={`dot ${i === levelIdx ? 'dot-active' : ''}`}
              onClick={() => loadLevel(i)}
              aria-label={`Level ${i + 1}: ${l.name}`}
            />
          ))}
        </div>
      </header>

      <div className="board-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          style={{ width: size || '100%', height: size || '100%' }}
          onPointerDown={onPointerDown}
          aria-label="Rope untangle board"
        />

        {won && (
          <div className="overlay">
            <div className="card">
              <p className="card-eyebrow">{isLast ? 'All levels complete' : 'Puzzle solved'}</p>
              <h2>{isLast ? 'Master Weaver! 🧶' : 'Untangled!'}</h2>
              <div className="stars" aria-label={`${stars} stars`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className={i < stars ? 'star star-on' : 'star'}>
                    ★
                  </span>
                ))}
              </div>
              <p className="card-moves">
                {moves} moves · par {level.def.par}
              </p>
              <div className="card-actions">
                <button className="btn btn-ghost" onClick={restart}>
                  Replay
                </button>
                {!isLast && (
                  <button className="btn btn-primary" onClick={() => loadLevel(levelIdx + 1)}>
                    Next level →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="controls">
        <button className="btn" onClick={undo} disabled={!history.length || won}>
          ↩ Undo
        </button>
        <button className="btn" onClick={showHint} disabled={won}>
          💡 Hint
        </button>
        <button className="btn" onClick={restart}>
          ⟳ Restart
        </button>
        <button className="btn" onClick={() => loadLevel(levelIdx - 1)} disabled={levelIdx === 0}>
          ‹ Prev
        </button>
        <button className="btn" onClick={() => loadLevel(levelIdx + 1)} disabled={isLast}>
          Next ›
        </button>
      </div>

      <p className="tip">Tap a wooden peg to lift it, then tap an empty hole. Untangle every rope so none cross.</p>
    </div>
  );
}
