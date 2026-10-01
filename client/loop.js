export const FIXED_DT = 1 / 60;

export function createLoop(update, render, options = {}) {
  const requestFrame = options.requestFrame || globalThis.requestAnimationFrame;
  const cancelFrame =
    options.cancelFrame || globalThis.cancelAnimationFrame || (() => {});
  const maxFrameTime = 0.25;
  const maxSteps = 10;

  let running = false;
  let lastTime = null;
  let accumulator = 0;
  let frameId = 0;

  function frame(currentTime) {
    if (!running) {
      return;
    }

    if (lastTime === null) {
      lastTime = currentTime;
      render(0, 0, 0);
      frameId = requestFrame(frame);
      return;
    }

    const frameTime = Math.min(Math.max(0, currentTime - lastTime) / 1000, maxFrameTime);
    lastTime = currentTime;

    accumulator += frameTime;

    let steps = 0;
    while (accumulator >= FIXED_DT && steps < maxSteps) {
      update(FIXED_DT);
      accumulator -= FIXED_DT;
      steps += 1;
    }

    if (steps === maxSteps && accumulator >= FIXED_DT) {
      accumulator = 0;
    }

    const alpha = accumulator / FIXED_DT;
    render(alpha, frameTime * 1000, steps);
    frameId = requestFrame(frame);
  }

  return {
    start() {
      if (running) {
        return;
      }

      running = true;
      lastTime = null;
      accumulator = 0;
      frameId = requestFrame(frame);
    },
    stop() {
      running = false;
      cancelFrame(frameId);
    }
  };
}
