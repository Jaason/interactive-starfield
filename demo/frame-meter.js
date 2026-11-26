// Browser frame cadence, independent of Starfield internals; constant storage.
export function createFrameMeter(requestFrame, cancelFrame, report) {
  let frameId = null;
  let generation = 0;
  return {
    start() {
      if (frameId !== null) return;
      const current = ++generation;
      let start = null;
      let count = 0;
      function tick(time) {
        if (generation !== current) return;
        if (start === null) start = time;
        else count++;
        if (time - start >= 500) {
          report(Math.round(count * 1000 / (time - start)));
          start = time;
          count = 0;
        }
        frameId = requestFrame(tick);
      }
      frameId = requestFrame(tick);
    },
    stop() {
      generation++;
      if (frameId !== null) cancelFrame(frameId);
      frameId = null;
      report(null);
    },
  };
}
