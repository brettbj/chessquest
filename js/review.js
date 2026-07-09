// Interactive game review: engine-evaluates every move, classifies it, and the
// coach explains it in plain English (with a huge template pool, via feedback.js).
// Feature wave 3: opening-aware departure comments, coach tone, key moments,
// best-move arrows, PV preview, retry-from-here, accuracy sparkline, phase
// breakdown, top-3 alternatives, mate-distance eval label, annotated export.

import { Chess } from "./vendor/chess.esm.js";
import { OPENINGS } from "../data/openings.js";
import { Board } from "./board.js";
import { sfx } from "./sounds.js";
import { state, addXp, checkAchievements, save, getSetting, track } from "./state.js";
import { coachComment, gameSummary, openingDeparture } from "./feedback.js";

const $ = (id) => document.getElementById(id);
const MATE = 100000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// set of known opening-line prefixes for "book" detection
const BOOK = new Set();
for (const op of OPENINGS) {
  for (let i = 1; i <= op.moves.length; i++) BOOK.add(op.moves.slice(0, i).join(" "));
}

const PIECE_NAMES = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
const BAD_CLS = ["inaccuracy", "mistake", "blunder", "miss"];

// Longest OPENINGS entry whose move prefix matches the game line.
// Returns {name, eco, len, full}: len = plies the game stayed in book (longest
// common prefix over all entries); name comes from the longest entry the game
// matched COMPLETELY (so we never name a variation whose defining move wasn't
// played), falling back to the deepest partial match.
export function matchOpening(sans) {
  let bestAny = null, bestFull = null;
  for (const op of OPENINGS) {
    let n = 0;
    while (n < op.moves.length && n < sans.length && op.moves[n] === sans[n]) n++;
    if (n === 0) continue;
    if (!bestAny || n > bestAny.n) bestAny = { op, n };
    if (n === op.moves.length && (!bestFull || n > bestFull.n)) bestFull = { op, n };
  }
  if (!bestAny) return null;
  const named = bestFull || bestAny;
  return { name: named.op.name, eco: named.op.eco, len: bestAny.n, full: !!bestFull };
}

// Format a white-perspective score as '+1.4' / '−0.6' / 'M3' / '−M2'.
export function fmtEval(cp) {
  if (cp > MATE - 1000) return "M" + Math.max(1, Math.ceil((MATE - cp) / 2));
  if (cp < -(MATE - 1000)) return "−M" + Math.max(1, Math.ceil((MATE + cp) / 2));
  const v = cp / 100;
  return (v < 0 ? "−" : "+") + Math.abs(v).toFixed(1);
}

export const reviewMode = {
  board: null,
  game: null,          // saved game record
  analysis: null,      // per-position results
  ply: 0,
  pvActive: false,     // engine-line preview playing (navigation locked)
  _pvToken: 0,
  _pvSeq: 0,
  _pvPending: null,

  init({ worker, toast, retryPosition }) {
    this.worker = worker;
    this.toast = toast;
    this.retryPosition = retryPosition;
    this.board = new Board($("review-board"), { interactive: false });
    worker.addEventListener("message", (e) => this.onWorkerMsg(e.data));
    $("btn-review-exit").addEventListener("click", () => this.showList());
    $("btn-review-first").addEventListener("click", () => this.goto(0));
    $("btn-review-prev").addEventListener("click", () => this.goto(this.ply - 1));
    $("btn-review-next").addEventListener("click", () => this.goto(this.ply + 1));
    $("btn-review-last").addEventListener("click", () => this.goto(this.positions.length - 1));
    $("btn-review-flip").addEventListener("click", () => { sfx.click(); this.board.flip(); });
    $("btn-review-best").addEventListener("click", () => this.showBestMove());
    $("btn-review-pv").addEventListener("click", () => this.togglePv());
    $("btn-review-retry").addEventListener("click", () => this.doRetry());
    $("btn-review-export").addEventListener("click", () => this.exportGame());
    $("acc-spark").addEventListener("click", (e) => this.onSparkClick(e));
    document.addEventListener("keydown", (e) => {
      if ($("view-review").classList.contains("active") && !$("review-area").hidden) {
        if (e.key === "ArrowLeft") { e.preventDefault(); this.goto(this.ply - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); this.goto(this.ply + 1); }
      }
    });
  },

  enter(gameId) {
    if (gameId) this.open(gameId);
    else this.showList();
  },

  showList() {
    this.cancelPv();
    $("review-list-area").hidden = false;
    $("review-area").hidden = true;
    const games = state().savedGames;
    $("review-list").innerHTML = games.length === 0
      ? `<p class="muted">No games yet — go beat a bot first! 🤖</p>`
      : games.map((g) => {
        const icon = g.result === 1 ? "🏆" : g.result === 0 ? "❌" : "🤝";
        const d = new Date(g.date);
        return `<div class="review-item" data-game="${g.id}">
          <span>${icon}</span>
          <b>${g.botFace || "🤖"} vs ${g.botName} (${g.botElo})</b>
          <span class="muted">${g.playerColor === "w" ? "White" : "Black"} · ${g.moves.length} plies · ${d.toLocaleDateString()}</span>
          ${g.analysis ? '<span class="tag">analysed</span>' : ""}
        </div>`;
      }).join("");
    $("review-list").querySelectorAll(".review-item").forEach((el) =>
      el.addEventListener("click", () => this.open(el.dataset.game)));
  },

  open(gameId) {
    const g = state().savedGames.find((x) => x.id === gameId);
    if (!g) return this.showList();
    this.cancelPv();
    this.game = g;
    this._commentCache = {};
    this._commentTone = getSetting("tonePack");
    this.summaryText = null;
    this.departurePly = -1;
    sfx.click();
    $("review-list-area").hidden = true;
    $("review-area").hidden = false;

    // rebuild positions
    const chess = new Chess();
    this.positions = [chess.fen()];
    this.moveMeta = [];
    for (const san of g.moves) {
      const mv = chess.move(san);
      this.moveMeta.push({ san, from: mv.from, to: mv.to, piece: mv.piece, color: mv.color,
        captured: mv.captured, isCheck: chess.inCheck(), isMate: chess.isCheckmate(),
        flags: mv.flags });
      this.positions.push(chess.fen());
    }
    this.opening = matchOpening(g.moves);
    this.board.setOrientation(g.playerColor);   // reset any flip from last session

    // reset feature UI until analysis lands
    $("key-moments").innerHTML = "";
    $("acc-spark").hidden = true;
    $("phase-breakdown").innerHTML = "";
    $("review-alts").innerHTML = "";
    $("btn-review-export").hidden = true;
    $("eval-num").textContent = "";

    this.renderMoveList();
    this.goto(0);

    if (g.analysis) {
      this.analysis = g.analysis;
      this.finishAnalysis(false);
    } else {
      this.analysis = new Array(this.positions.length).fill(null);
      this.classified = null;
      $("review-summary-title").textContent = "Analysing your game…";
      $("review-accuracy").hidden = true;
      $("review-counts").innerHTML = "";
      $("review-progressbar").hidden = false;
      $("review-progressbar").firstElementChild.style.width = "0%";
      this.analysisId = "an" + Date.now();
      const deep = getSetting("reviewDepth") === "deep";
      this.worker.postMessage({ type: "analyse", id: this.analysisId, fens: this.positions,
        depth: deep ? 5 : 4, timeMs: deep ? 2500 : 1500 });
    }
  },

  onWorkerMsg(m) {
    // one-off PV-preview probe replies
    if (this._pvPending && m.id === this._pvPending.id) {
      if (m.type === "analysis") {
        const p = this._pvPending;
        this._pvPending = null;
        p.resolve(m);
      }
      return;
    }
    if (m.type === "analysis" && m.id === this.analysisId) {
      this.analysis[m.index] = { score: m.score, bestUci: m.bestUci, mateIn: m.mateIn, moves: m.moves };
      const pct = Math.round(((m.index + 1) / m.total) * 100);
      const bar = $("review-progressbar");
      if (bar.firstElementChild) bar.firstElementChild.style.width = pct + "%";
    } else if (m.type === "analysisDone" && m.id === this.analysisId) {
      this.finishAnalysis(true);
    }
  },

  finishAnalysis(fresh) {
    this.classify();
    this.computeDeparture();
    $("review-progressbar").hidden = true;
    this.renderSummary();
    this.renderMoveList();
    this.renderKeyMoments();
    this.renderSparkline();
    this.renderPhases();
    $("btn-review-export").hidden = false;
    this.goto(this.ply);
    if (fresh) {
      const s = state();
      s.reviewsDone++;
      addXp(25, "review");
      track("reviewDone");
      if (this.playerAcc >= 90) s.accuracy90Games++;
      if (this.playerAcc >= 85) track("accuracy85Game");
      checkAchievements();
      // cache into the saved game (keep top-3 moves for the alternatives panel)
      this.game.analysis = this.analysis.map((a) => a && ({
        score: a.score, bestUci: a.bestUci, mateIn: a.mateIn,
        moves: a.moves ? a.moves.slice(0, 3).map((m) => ({ uci: m.uci, score: m.score })) : undefined,
        gap: a.moves && a.moves.length > 1 ? a.moves[0].score - a.moves[1].score : 0,
      }));
      save();
      sfx.moduleDone();
    }
  },

  // score at position i is from side-to-move perspective; flip to white POV
  whiteScore(i) {
    const a = this.analysis[i];
    if (!a) return 0;
    const stmWhite = this.positions[i].split(" ")[1] === "w";
    return stmWhite ? a.score : -a.score;
  },

  classify() {
    this.classified = [];
    let sanLine = [];
    for (let i = 0; i < this.moveMeta.length; i++) {
      const meta = this.moveMeta[i];
      const before = this.analysis[i], after = this.analysis[i + 1];
      sanLine.push(meta.san);
      if (!before || !after) { this.classified.push(null); continue; }
      // eval from the mover's perspective
      const evalBefore = before.score;
      const evalAfter = -after.score;
      const cpLoss = Math.max(0, Math.min(1200, evalBefore - evalAfter));
      const playedUci = meta.from + meta.to;
      const isBest = before.bestUci && before.bestUci.startsWith(playedUci);
      const gap = before.moves && before.moves.length > 1 ? before.moves[0].score - before.moves[1].score : (before.gap || 0);

      let cls;
      if (meta.isMate) cls = "best";
      else if (BOOK.has(sanLine.join(" "))) cls = "book";
      else if (before.mateIn > 0 && !(after.mateIn < 0) && cpLoss >= 250) cls = "miss";
      else if (evalBefore > 400 && evalAfter < 150 && evalAfter > -150) cls = "miss";
      else if (cpLoss >= 280) cls = "blunder";
      else if (cpLoss >= 130) cls = "mistake";
      else if (cpLoss >= 60) cls = "inaccuracy";
      else if (isBest && this.isSacrifice(i, meta) && evalAfter > -80) cls = "brilliant";
      else if (isBest && gap >= 160) cls = "great";
      else if (isBest || cpLoss < 15) cls = "best";
      else cls = "good";

      const phase = i < 14 ? "opening" : this.pieceCount(i) <= 12 ? "endgame" : "middlegame";
      const wpB = winProb(evalBefore), wpA = winProb(evalAfter);
      const acc = Math.max(0, Math.min(100, 103.17 * Math.exp(-0.04354 * (wpB - wpA)) - 3.17));

      this.classified.push({
        cls, cpLoss, evalAfter, phase, acc,
        bestSan: this.bestSanAt(i),
        turnedWinToLoss: evalBefore > 250 && evalAfter < -150,
        turnedWinToDraw: evalBefore > 250 && Math.abs(evalAfter) <= 150,
        missedMate: before.mateIn > 0 && cls !== "best" && cls !== "great" && cls !== "brilliant" && cpLoss > 100,
      });
    }
  },

  // First player move that left known book, provided the game matched some
  // opening for ≥4 plies and that move was inaccuracy/mistake/blunder.
  computeDeparture() {
    this.departurePly = -1;
    const om = this.opening;
    if (!om || om.len < 4 || om.len >= this.moveMeta.length) return;
    const i = om.len;                       // first out-of-book ply (BOOK holds all opening prefixes)
    const meta = this.moveMeta[i];
    const c = this.classified && this.classified[i];
    if (meta && c && meta.color === this.game.playerColor &&
        ["inaccuracy", "mistake", "blunder"].includes(c.cls)) {
      this.departurePly = i;
    }
  },

  pieceCount(i) {
    return this.positions[i].split(" ")[0].replace(/[^a-zA-Z]/g, "").length;
  },

  bestSanAt(i) {
    const a = this.analysis[i];
    if (!a || !a.bestUci) return "—";
    return uciToSan(this.positions[i], a.bestUci);
  },

  // naive sacrifice check: moved piece can be captured by a cheaper attacker
  isSacrifice(i, meta) {
    if (meta.piece === "p" || meta.piece === "k") return false;
    try {
      const c = new Chess(this.positions[i + 1]);
      const val = { p: 1, n: 3, b: 3, r: 5, q: 9 };
      for (const mv of c.moves({ verbose: true })) {
        if (mv.to === meta.to && mv.captured === meta.piece &&
            (val[mv.piece] || 0) < (val[meta.piece] || 0)) {
          const capturedVal = meta.captured ? val[meta.captured] || 0 : 0;
          return val[meta.piece] - capturedVal >= 2;
        }
      }
    } catch { /* ignore */ }
    return false;
  },

  renderSummary() {
    const g = this.game;
    const counts = { brilliant: 0, great: 0, best: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0 };
    let accSum = 0, accN = 0, botAccSum = 0, botAccN = 0;
    let bestStreak = 0, cur = 0;
    const phaseLoss = { opening: 0, middlegame: 0, endgame: 0 };
    this.classified.forEach((c, i) => {
      if (!c) return;
      const isPlayer = this.moveMeta[i].color === g.playerColor;
      if (isPlayer) {
        counts[c.cls]++;
        accSum += c.acc; accN++;
        phaseLoss[c.phase] += c.cpLoss;
        if (["best", "great", "brilliant", "good", "book"].includes(c.cls)) { cur++; bestStreak = Math.max(bestStreak, cur); }
        else cur = 0;
      } else { botAccSum += c.acc; botAccN++; }
    });
    const acc = accN ? accSum / accN : 0;
    const botAcc = botAccN ? botAccSum / botAccN : 0;
    this.playerAcc = acc;
    const phaseWorst = Object.entries(phaseLoss).sort((a, b) => b[1] - a[1])[0];

    const titleEl = $("review-summary-title");
    titleEl.textContent = "☕ Coach's verdict";
    if (this.opening && this.opening.len >= 4) {
      const span = document.createElement("span");
      span.className = "muted";
      span.style.cssText = "display:block;font-size:0.7em;font-weight:600;";
      span.textContent = this.opening.name;
      titleEl.appendChild(span);
    }
    const accEl = $("review-accuracy");
    accEl.hidden = false;
    accEl.innerHTML = `<div><span class="acc-num">${acc.toFixed(1)}%</span><span class="acc-label">You</span></div>
      <div><span class="acc-num">${botAcc.toFixed(1)}%</span><span class="acc-label">${g.botName}</span></div>`;
    $("review-counts").innerHTML = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `<div class="${k}"><span class="cls-badge ${k}">${CLS_LABEL[k]}</span> ${v}</div>`).join("");

    this.summaryText = gameSummary({
      result: g.result === 1 ? "win" : g.result === 0 ? "loss" : "draw",
      accuracy: acc, blunders: counts.blunder, mistakes: counts.mistake,
      inaccuracies: counts.inaccuracy, brilliant: counts.brilliant, great: counts.great,
      bestStreak, botName: g.botName,
      phaseWorst: phaseWorst && phaseWorst[1] > 100 ? phaseWorst[0] : null,
    });
    if (this.ply === 0) $("review-comment").textContent = this.summaryText;
  },

  // ---- key moments bar --------------------------------------------------------

  renderKeyMoments() {
    const host = $("key-moments");
    const PRI = { blunder: 0, miss: 1, brilliant: 2, mistake: 3, great: 4 };
    const items = [];
    this.classified.forEach((c, i) => {
      if (c && this.moveMeta[i].color === this.game.playerColor && PRI[c.cls] !== undefined) {
        items.push({ i, cls: c.cls });
      }
    });
    items.sort((a, b) => PRI[a.cls] - PRI[b.cls] || a.i - b.i);
    const top = items.slice(0, 8).sort((a, b) => a.i - b.i);
    host.hidden = false; // reserved space — an appearing bar must not shift the nav row
    if (top.length === 0) { host.innerHTML = ""; return; }
    host.innerHTML = top.map(({ i, cls }) =>
      `<button class="km-btn ${cls}" data-ply="${i + 1}">${CLS_ICON[cls] || "•"} ${moveNoStr(i)}${this.moveMeta[i].san}</button>`
    ).join("");
    host.querySelectorAll(".km-btn").forEach((el) =>
      el.addEventListener("click", () => { sfx.click(); this.goto(+el.dataset.ply); }));
  },

  // ---- accuracy sparkline -------------------------------------------------------

  renderSparkline() {
    const cv = $("acc-spark");
    const pts = [];
    this.classified.forEach((c, i) => {
      if (c && this.moveMeta[i].color === this.game.playerColor) pts.push({ i, acc: c.acc, cls: c.cls });
    });
    if (pts.length < 2) { cv.hidden = true; this._sparkPts = null; return; }
    cv.hidden = false;
    const W = cv.width, H = cv.height, pad = 4;
    const x = (k) => pad + (k / (pts.length - 1)) * (W - 2 * pad);
    const y = (acc) => H - pad - (acc / 100) * (H - 2 * pad);
    const g2 = cv.getContext("2d");
    g2.clearRect(0, 0, W, H);
    // area
    g2.beginPath();
    g2.moveTo(x(0), H - pad);
    pts.forEach((p, k) => g2.lineTo(x(k), y(p.acc)));
    g2.lineTo(x(pts.length - 1), H - pad);
    g2.closePath();
    g2.fillStyle = "rgba(167, 139, 250, 0.16)";
    g2.fill();
    // line
    g2.beginPath();
    pts.forEach((p, k) => k === 0 ? g2.moveTo(x(k), y(p.acc)) : g2.lineTo(x(k), y(p.acc)));
    g2.strokeStyle = "#a78bfa";
    g2.lineWidth = 1.5;
    g2.stroke();
    // dots on the extremes
    const DOT = { blunder: "#f87171", miss: "#e879a9", brilliant: "#2dd4bf" };
    pts.forEach((p, k) => {
      if (!DOT[p.cls]) return;
      g2.beginPath();
      g2.arc(x(k), y(p.acc), 2.6, 0, Math.PI * 2);
      g2.fillStyle = DOT[p.cls];
      g2.fill();
    });
    this._sparkPts = pts.map((p, k) => ({ x: x(k), ply: p.i + 1 }));
  },

  onSparkClick(e) {
    if (!this._sparkPts || !this._sparkPts.length) return;
    const cv = $("acc-spark");
    const rect = cv.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (cv.width / rect.width);
    let best = this._sparkPts[0];
    for (const p of this._sparkPts) if (Math.abs(p.x - cx) < Math.abs(best.x - cx)) best = p;
    this.goto(best.ply);
  },

  // ---- phase breakdown ------------------------------------------------------------

  renderPhases() {
    const sums = { opening: [0, 0], middlegame: [0, 0], endgame: [0, 0] };
    this.classified.forEach((c, i) => {
      if (c && this.moveMeta[i].color === this.game.playerColor) {
        sums[c.phase][0] += c.acc;
        sums[c.phase][1]++;
      }
    });
    let worst = null, worstAvg = Infinity;
    for (const p of ["opening", "middlegame", "endgame"]) {
      if (sums[p][1] === 0) continue;
      const avg = sums[p][0] / sums[p][1];
      if (avg < worstAvg) { worstAvg = avg; worst = p; }
    }
    const LABEL = { opening: "Opening", middlegame: "Middlegame", endgame: "Endgame" };
    $("phase-breakdown").innerHTML = ["opening", "middlegame", "endgame"].map((p) => {
      const [sum, n] = sums[p];
      const val = n ? (sum / n).toFixed(0) + "%" : "—";
      return `<div class="phase${p === worst ? " worst" : ""}"><b>${val}</b><span>${LABEL[p]}</span></div>`;
    }).join("");
  },

  renderMoveList() {
    const host = $("review-moves");
    host.innerHTML = this.moveMeta.map((m, i) => {
      const c = this.classified && this.classified[i];
      const badge = c && !["best", "good", "book"].includes(c.cls)
        ? `<span class="cls-badge ${c.cls}">${CLS_ICON[c.cls]}</span>` : "";
      const num = i % 2 === 0 ? `<span class="mv num">${i / 2 + 1}.</span>` : "";
      return num + `<span class="mv ${i + 1 === this.ply ? "cur" : ""}" data-ply="${i + 1}">${m.san}${badge}</span>`;
    }).join("");
    host.querySelectorAll(".mv[data-ply]").forEach((el) =>
      el.addEventListener("click", () => this.goto(+el.dataset.ply)));
  },

  goto(ply) {
    if (!this.positions) return;
    if (this.pvActive) return;              // navigation locked during PV preview
    this.ply = Math.max(0, Math.min(this.positions.length - 1, ply));
    this.board.clearArrows("best");         // clear best-move arrow + pulse on navigation
    this.board.hintSqs = [];
    const chess = new Chess(this.positions[this.ply]);
    this.board.setGame(chess);
    if (this.ply > 0) {
      const m = this.moveMeta[this.ply - 1];
      this.board.setLastMove(m.from, m.to);
    } else this.board.setLastMove(null);
    this.board.setCheck();
    this.board.render();
    this.renderMoveList();
    this.updateEvalBar();
    this.updateComment();
    this.renderAlts();
    this.updateToolButtons();
  },

  updateEvalBar() {
    const a = this.analysis && this.analysis[this.ply];
    const ws = a ? this.whiteScore(this.ply) : 0;
    const pct = Math.abs(ws) >= MATE - 300
      ? (ws > 0 ? 100 : 0)
      : winProb(ws);
    $("eval-fill").style.height = pct + "%";
    $("eval-num").textContent = a ? fmtEval(ws) : "";
  },

  updateToolButtons() {
    const prev = this.ply > 0 && this.analysis ? this.analysis[this.ply - 1] : null;
    const c = this.ply > 0 && this.classified ? this.classified[this.ply - 1] : null;
    $("btn-review-best").disabled = !(prev && prev.bestUci && c && BAD_CLS.includes(c.cls));
    const cur = this.analysis && this.analysis[this.ply];
    $("btn-review-pv").disabled = !(cur && cur.bestUci && cur.moves && cur.moves.length > 0);
    if (!this.pvActive) $("btn-review-pv").textContent = "▶️ Line";
    const stm = this.positions[this.ply].split(" ")[1];
    $("btn-review-retry").disabled = !(this.ply >= 1 && this.retryPosition && stm === this.game.playerColor);
  },

  // ---- best-move show -------------------------------------------------------------

  showBestMove() {
    const prev = this.ply > 0 && this.analysis ? this.analysis[this.ply - 1] : null;
    if (!prev || !prev.bestUci) return;
    sfx.click();
    // show the missed best move on the position it was available in
    const from = prev.bestUci.slice(0, 2), to = prev.bestUci.slice(2, 4);
    this.board.clearArrows("best");
    this.board.addArrow(from, to, "best");
    this.board.hintSqs = [from, to];        // pulse-hint the squares
    this.board.render();
  },

  // ---- PV preview -------------------------------------------------------------------

  quickAnalyse(fen) {
    return new Promise((resolve) => {
      const id = "pv" + (++this._pvSeq);
      const timer = setTimeout(() => {
        if (this._pvPending && this._pvPending.id === id) { this._pvPending = null; resolve(null); }
      }, 3000);
      this._pvPending = { id, resolve: (r) => { clearTimeout(timer); resolve(r); } };
      this.worker.postMessage({ type: "analyse", id, fens: [fen], depth: 3, timeMs: 600 });
    });
  },

  async togglePv() {
    if (this.pvActive) { this.cancelPv(); this.goto(this.ply); return; }
    const a = this.analysis && this.analysis[this.ply];
    if (!a || !a.bestUci) return;
    this.pvActive = true;
    const token = ++this._pvToken;
    $("btn-review-pv").textContent = "⏹";
    this.board.clearArrows("best");
    this.board.hintSqs = [];
    const chess = new Chess(this.positions[this.ply]);
    let uci = a.bestUci;
    for (let n = 0; n < 4 && uci; n++) {
      let mv;
      try {
        mv = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      } catch { break; }
      if (!mv) break;
      if (token !== this._pvToken) return;
      this.board.setGame(chess);
      this.board.setLastMove(mv.from, mv.to);
      this.board.setCheck();
      this.board.render();
      sfx.move();
      if (n === 3 || chess.isGameOver()) break;
      // no deep PV data: probe the resulting position for its best reply
      const [res] = await Promise.all([this.quickAnalyse(chess.fen()), sleep(600)]);
      if (token !== this._pvToken) return;   // cancelled mid-flight
      uci = res && res.bestUci;
    }
    await sleep(1200);
    if (token !== this._pvToken) return;
    this.pvActive = false;
    $("btn-review-pv").textContent = "▶️ Line";
    this.goto(this.ply);                     // snap back to the review position
  },

  cancelPv() {
    this._pvToken++;
    this._pvPending = null;
    this.pvActive = false;
    const btn = typeof document !== "undefined" && document.getElementById("btn-review-pv");
    if (btn) btn.textContent = "▶️ Line";
  },

  // ---- retry from here -----------------------------------------------------------

  doRetry() {
    if (!this.retryPosition || !this.game) return;
    sfx.click();
    this.retryPosition(this.positions[this.ply], this.game.botElo);
  },

  // ---- top-3 alternatives ----------------------------------------------------------

  renderAlts() {
    const host = $("review-alts");
    host.innerHTML = "";
    if (this.ply === 0 || !this.analysis) return;
    const prev = this.analysis[this.ply - 1];
    if (!prev || !prev.moves || prev.moves.length === 0) return;  // old cached analyses lack .moves
    const fen = this.positions[this.ply - 1];
    const stmWhite = fen.split(" ")[1] === "w";
    host.innerHTML = prev.moves.slice(0, 3).map((m, k) => {
      const san = uciToSan(fen, m.uci);
      const ws = stmWhite ? m.score : -m.score;
      return `<div class="alt-row"><span>${k === 0 ? "★ " : ""}${san}</span><span>${fmtEval(ws)}</span></div>`;
    }).join("");
  },

  // ---- comments ---------------------------------------------------------------------

  getComment(i) {
    const tone = getSetting("tonePack");
    if (!this._commentCache || this._commentTone !== tone) {
      this._commentCache = {};                // invalidate cache when tone changes
      this._commentTone = tone;
    }
    if (this._commentCache[i]) return this._commentCache[i];
    const meta = this.moveMeta[i];
    const c = this.classified[i];
    let text;
    if (i === this.departurePly && this.opening) {
      text = openingDeparture({
        openingName: this.opening.name,
        moveNo: Math.floor(i / 2) + 1,
        best: c.bestSan,
        san: meta.san,
      });
    } else {
      text = coachComment({
        cls: c.cls, san: meta.san, bestSan: c.bestSan,
        piece: PIECE_NAMES[meta.piece], cpLoss: c.cpLoss,
        evalAfter: c.evalAfter, phase: c.phase,
        isCapture: !!meta.captured, isCheck: meta.isCheck, isMate: meta.isMate,
        turnedWinToLoss: c.turnedWinToLoss, turnedWinToDraw: c.turnedWinToDraw,
        missedMate: c.missedMate,
        tone,
      });
    }
    this._commentCache[i] = text;
    return text;
  },

  updateComment() {
    const labelEl = $("review-move-label");
    const commentEl = $("review-comment");
    if (this.ply === 0) {
      labelEl.innerHTML = "";
      commentEl.textContent = this.summaryText ||
        (this.classified ? "Use ◀ ▶ to step through the game." : "Analysing… you can already step through the moves.");
      return;
    }
    const i = this.ply - 1;
    const meta = this.moveMeta[i];
    const c = this.classified && this.classified[i];
    const moveNo = moveNoStr(i);
    if (!c) {
      labelEl.innerHTML = `<b>${moveNo} ${meta.san}</b>`;
      commentEl.textContent = "Still analysing this one…";
      return;
    }
    labelEl.innerHTML = `<b>${moveNo} ${meta.san}</b> <span class="cls-badge ${c.cls}">${CLS_LABEL[c.cls]}</span>`;
    const isPlayer = meta.color === this.game.playerColor;
    if (!isPlayer) {
      commentEl.textContent = botMoveNote(c, meta, this.game.botName);
      return;
    }
    commentEl.textContent = this.getComment(i);
  },

  // ---- annotated export ---------------------------------------------------------------

  exportGame() {
    const g = this.game;
    if (!g || !this.classified) return;
    const you = (state().profile && state().profile.name) || "You";
    const bot = `${g.botName} (${g.botElo})`;
    const white = g.playerColor === "w" ? you : bot;
    const black = g.playerColor === "w" ? bot : you;
    const result = g.result === 1 ? "Win" : g.result === 0 ? "Loss" : "Draw";
    const lines = [
      `${white} vs ${black}`,
      `Result: ${result} (for ${you}) · ${new Date(g.date).toLocaleDateString()}`,
    ];
    if (this.opening && this.opening.len >= 4) lines.push(`Opening: ${this.opening.name}`);
    lines.push("");
    for (let i = 0; i < this.moveMeta.length; i++) {
      const meta = this.moveMeta[i];
      const c = this.classified[i];
      const tag = c ? ` [${CLS_LABEL[c.cls]}]` : "";
      lines.push(`${moveNoStr(i)} ${meta.san}${tag}`);
      if (c && meta.color === g.playerColor && ["mistake", "blunder", "miss"].includes(c.cls)) {
        lines.push(`   ${this.getComment(i)}`);
      }
    }
    const text = lines.join("\n");
    const done = () => { if (this.toast) this.toast("Annotated game copied! 📋"); };
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;left:-9999px;top:0;";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        done();
      } catch { if (this.toast) this.toast("Couldn't copy — sorry!"); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
  },
};

const CLS_LABEL = {
  brilliant: "Brilliant!!", great: "Great!", best: "Best", good: "Good", book: "Book",
  inaccuracy: "Inaccuracy", mistake: "Mistake", blunder: "Blunder", miss: "Missed win",
};
const CLS_ICON = {
  brilliant: "!!", great: "!", inaccuracy: "?!", mistake: "?", blunder: "??", miss: "✗",
};

const moveNoStr = (i) => Math.floor(i / 2) + 1 + (i % 2 === 0 ? "." : "…");

function uciToSan(fen, uci) {
  try {
    const c = new Chess(fen);
    const mv = c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return mv ? mv.san : "—";
  } catch { return "—"; }
}

function winProb(cp) {
  return Math.round(1000 / (1 + Math.exp(-0.00368 * Math.max(-3000, Math.min(3000, cp))))) / 10;
}

function botMoveNote(c, meta, botName) {
  if (c.cls === "blunder") return `${botName} blundered here — ${meta.san} loses ground. Did you spot why?`;
  if (c.cls === "mistake") return `${botName} slipped with ${meta.san}. There was a better option.`;
  if (c.cls === "book") return `${botName} stays in known theory with ${meta.san}.`;
  if (c.cls === "brilliant" || c.cls === "great") return `${meta.san} — a strong shot from ${botName}. Take note of the idea.`;
  return `${botName} plays ${meta.san}.`;
}
