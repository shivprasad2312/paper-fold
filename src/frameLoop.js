// Request frames only while the board is visible. In reduced-motion mode a
// state/size change invalidates one frame instead of continuously using GPU.
export function createFrameLoop({ render, requestFrame, cancelFrame, continuous = true, active = true }) {
  let frame = null;
  let previous = null;
  let disposed = false;

  const invalidate = () => {
    if (disposed || !active || frame !== null) return;
    frame = requestFrame((time) => {
      frame = null;
      if (disposed || !active) return;
      const delta = previous === null ? 0 : Math.min(Math.max(0, (time - previous) / 1000), 0.1);
      previous = time;
      render(time, delta);
      if (continuous) invalidate();
    });
  };
  const stopFrame = () => {
    if (frame !== null) cancelFrame(frame);
    frame = null;
    previous = null;
  };
  return {
    invalidate,
    setActive(value) {
      if (active === value) return;
      active = value;
      if (active) invalidate();
      else stopFrame();
    },
    setContinuous(value) {
      if (continuous === value) return;
      continuous = value;
      if (continuous) invalidate();
    },
    dispose() { disposed = true; stopFrame(); },
  };
}
