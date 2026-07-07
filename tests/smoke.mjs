// Headless smoke test for ChessQuest modules.
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};
globalThis.window = globalThis;

const ROOT = "/home/brett/code-wsl/capp";
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? "PASS" : "FAIL") + " — " + msg); if (!cond) failures++; };

// 1. chess.js
const { Chess } = await import(ROOT + "/js/vendor/chess.esm.js");
const c = new Chess();
c.move("e4"); c.move("e5");
ok(c.history().length === 2, "chess.js basic moves");

// 2. feedback corpus
const fb = await import(ROOT + "/js/feedback.js");
let bad = 0;
const classes = ["brilliant","great","best","good","book","inaccuracy","mistake","blunder","miss"];
const outs = new Set();
for (let i = 0; i < 300; i++) {
  const cls = classes[i % classes.length];
  const t = fb.coachComment({ cls, san: "Nxf7+", bestSan: "Qd5", piece: "knight",
    cpLoss: 20 + (i % 40) * 15, evalAfter: 120 - i, phase: ["opening","middlegame","endgame"][i%3],
    isCapture: i % 2 === 0, isCheck: i % 3 === 0, isMate: false,
    turnedWinToLoss: cls === "blunder" && i % 4 === 0,
    turnedWinToDraw: cls === "mistake" && i % 5 === 0,
    missedMate: (cls === "miss" || cls === "blunder") && i % 3 === 0 });
  if (/[{}]/.test(t)) { bad++; if (bad < 3) console.log("   leftover slot:", t); }
  outs.add(t);
}
ok(bad === 0, "coachComment: no unfilled slots in 300 draws");
ok(outs.size > 250, `coachComment variety: ${outs.size}/300 distinct`);
const gs = fb.gameSummary({ result: "win", accuracy: 82, blunders: 1, mistakes: 2, inaccuracies: 3,
  brilliant: 0, great: 1, bestStreak: 6, botName: "Club Chad", phaseWorst: "endgame" });
ok(typeof gs === "string" && gs.length > 40 && !/[{}]/.test(gs), "gameSummary");
ok(!/[{}]/.test(fb.puzzleLine("solve") + fb.puzzleLine("rankUp") + fb.botTaunt("gameStart")), "puzzleLine/botTaunt");

// 3. puzzle data: every move of 200 random puzzles must be legal
const { PUZZLES } = await import(ROOT + "/data/puzzles.js");
ok(PUZZLES.length > 2500, `puzzle count ${PUZZLES.length}`);
let badPz = 0;
for (let i = 0; i < 200; i++) {
  const p = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
  try {
    const g = new Chess(p[0]);
    for (const uci of p[1].split(" ")) {
      const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (!mv) throw new Error("illegal " + uci);
    }
  } catch (e) { badPz++; if (badPz < 3) console.log("   bad puzzle:", p[0], e.message); }
}
ok(badPz === 0, "200 random puzzles replay legally");

// 4. openings replay legally
const { OPENINGS } = await import(ROOT + "/data/openings.js");
let badOp = 0;
for (const op of OPENINGS) {
  try {
    const g = new Chess();
    for (const san of op.moves) if (!g.move(san)) throw new Error(san);
  } catch (e) { badOp++; console.log("   bad opening:", op.name, e.message); }
}
ok(badOp === 0, `all ${OPENINGS.length} openings replay legally`);

// 5. trainer module catalog
const { MODULES } = await import(ROOT + "/js/trainer.js");
const cats = {};
for (const m of MODULES) cats[m.cat] = (cats[m.cat] || 0) + 1;
console.log("   modules by category:", JSON.stringify(cats));
ok(MODULES.length >= 200, `module count ${MODULES.length} >= 200`);

// 6. engine + review classification end-to-end on a short game
const { analysePosition } = await import(ROOT + "/js/engine.js");
const { reviewMode } = await import(ROOT + "/js/review.js");
const moves = ["e4","e5","Nf3","Nc6","Bc4","Nf6","Ng5","d5","exd5","Nxd5","Nxf7","Kxf7","Qf3+","Ke6","Nc3"];
const g = new Chess();
const positions = [g.fen()];
const moveMeta = [];
for (const san of moves) {
  const mv = g.move(san);
  moveMeta.push({ san, from: mv.from, to: mv.to, piece: mv.piece, color: mv.color,
    captured: mv.captured, isCheck: g.inCheck(), isMate: g.isCheckmate(), flags: mv.flags });
  positions.push(g.fen());
}
const t0 = Date.now();
const analysis = positions.map((fen) => analysePosition(fen, 3, 1500));
const analyseMs = Date.now() - t0;
const ctx = { positions, moveMeta, analysis, classified: null,
  pieceCount: reviewMode.pieceCount, bestSanAt: reviewMode.bestSanAt, isSacrifice: reviewMode.isSacrifice };
reviewMode.classify.call(ctx);
ok(ctx.classified.length === moves.length && ctx.classified.every(Boolean), "review classification produced for all moves");
const clsLine = ctx.classified.map((c, i) => moves[i] + ":" + c.cls).join(" ");
console.log("   " + clsLine);
console.log(`   analysis of ${positions.length} positions took ${analyseMs}ms (${Math.round(analyseMs/positions.length)}ms/pos)`);
ok(analyseMs / positions.length < 600, "analysis speed acceptable");
// fried liver Nxf7 sac by white then Kxf7 — expect no crash and sane labels
const kxf7 = ctx.classified[11];
ok(["best","good","great","brilliant","book"].includes(ctx.classified[0].cls), "1.e4 not flagged as an error");

// 7. state module math
const st = await import(ROOT + "/js/state.js");
ok(st.levelForXp(0) === 1 && st.levelForXp(60) === 2 && st.levelForXp(240) === 3, "level curve");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
