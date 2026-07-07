// Web Worker: runs the engine off the main thread.
import { pickMoveForElo, analysePosition } from "./engine.js";

self.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === "botmove") {
      const res = pickMoveForElo(msg.fen, msg.elo);
      self.postMessage({ type: "botmove", id: msg.id, ...res });
    } else if (msg.type === "analyse") {
      // fens: array of positions; report progressively
      msg.fens.forEach((fen, i) => {
        const res = analysePosition(fen, msg.depth ?? 3, msg.timeMs ?? 2000);
        self.postMessage({ type: "analysis", id: msg.id, index: i, total: msg.fens.length, ...res });
      });
      self.postMessage({ type: "analysisDone", id: msg.id });
    }
  } catch (err) {
    self.postMessage({ type: "error", id: msg.id, message: String(err && err.stack || err) });
  }
};
