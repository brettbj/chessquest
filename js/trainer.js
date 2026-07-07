// Trainer: ~350 modules — openings (learn + quiz), tactics, checkmates,
// endgames, endgame drills vs the engine, daily workout, spaced review.

import { Chess } from "./vendor/chess.esm.js";
import { OPENINGS } from "../data/openings.js";
import { PUZZLES } from "../data/puzzles.js";
import { DRILLS } from "../data/drills.js";
import { OPENING_PLANS } from "../data/content.js";
import { Board } from "./board.js";
import { sfx, moveSound } from "./sounds.js";
import {
  state, addXp, checkAchievements, save, touchDaily, track,
  weakestThemes, duePuzzleRedos, resolveRedo, scheduleOpeningReview, dueOpenings,
} from "./state.js";
import { puzzleLine } from "./feedback.js";

const $ = (id) => document.getElementById(id);

const TIERS = [
  { key: 0, name: "I", lo: 0, hi: 1200, label: "up to 1200" },
  { key: 1, name: "II", lo: 1200, hi: 1600, label: "1200–1600" },
  { key: 2, name: "III", lo: 1600, hi: 2000, label: "1600–2000" },
  { key: 3, name: "IV", lo: 2000, hi: 2400, label: "2000–2400" },
  { key: 4, name: "V", lo: 2400, hi: 3600, label: "2400+" },
];

function tierIndexForElo(elo) {
  const i = TIERS.findIndex((t) => elo >= t.lo && elo < t.hi);
  return i < 0 ? TIERS.length - 1 : i;
}

const TACTIC_THEMES = ["fork", "pin", "skewer", "discoveredAttack", "doubleCheck",
  "sacrifice", "deflection", "attraction", "clearance", "interference", "xRayAttack",
  "trappedPiece", "hangingPiece", "promotion", "advancedPawn", "kingsideAttack",
  "capturingDefender", "intermezzo", "quietMove", "defensiveMove", "exposedKing",
  "opening", "middlegame"];
const MATE_THEMES = ["mateIn1", "mateIn2", "mateIn3", "backRankMate", "smotheredMate"];
const END_THEMES = ["pawnEndgame", "rookEndgame", "queenEndgame", "knightEndgame",
  "bishopEndgame", "endgame"];

const THEME_ICONS = {
  fork: "🍴", pin: "📌", skewer: "🍢", discoveredAttack: "🎭", doubleCheck: "‼️",
  sacrifice: "💥", deflection: "🧲", attraction: "🕸️", clearance: "🧹",
  interference: "🚧", xRayAttack: "🩻", trappedPiece: "🪤", hangingPiece: "🎁",
  promotion: "👑", advancedPawn: "🏃", kingsideAttack: "⚔️", capturingDefender: "🛡️",
  intermezzo: "↩️", quietMove: "🤫", defensiveMove: "🧯", exposedKing: "🌬️",
  opening: "📖", middlegame: "♟️", mateIn1: "🎯", mateIn2: "🎯", mateIn3: "🎯",
  backRankMate: "🚪", smotheredMate: "🐴", pawnEndgame: "♙", rookEndgame: "♖",
  queenEndgame: "♕", knightEndgame: "♘", bishopEndgame: "♗", endgame: "🏁",
};

// local pretty-printer (kept self-contained so this module imports cleanly headless)
const THEME_NAMES = {
  mateIn1: "Mate in 1", mateIn2: "Mate in 2", mateIn3: "Mate in 3",
  discoveredAttack: "Discovered attack", doubleCheck: "Double check",
  xRayAttack: "X-ray", trappedPiece: "Trapped piece", hangingPiece: "Hanging piece",
  backRankMate: "Back-rank mate", smotheredMate: "Smothered mate",
  advancedPawn: "Advanced pawn", exposedKing: "Exposed king",
  kingsideAttack: "Kingside attack", queensideAttack: "Queenside attack",
  capturingDefender: "Remove the defender", intermezzo: "In-between move",
  quietMove: "Quiet move", defensiveMove: "Defense", rookEndgame: "Rook endgame",
  pawnEndgame: "Pawn endgame", queenEndgame: "Queen endgame",
  knightEndgame: "Knight endgame", bishopEndgame: "Bishop endgame",
};
function prettyTheme(t) {
  return THEME_NAMES[t] || t.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function puzzlesFor(theme, tier) {
  return PUZZLES.filter((p) => p[2] >= tier.lo && p[2] < tier.hi && p[3].split(" ").includes(theme));
}

// Build the full module catalog once.
function buildModules() {
  const mods = [];
  OPENINGS.forEach((op, i) => {
    mods.push({
      id: "op:" + i, cat: "openings", icon: op.side === "w" ? "⬜" : "⬛",
      name: op.name, sub: `${op.eco} · play as ${op.side === "w" ? "White" : "Black"} · ${Math.ceil(op.moves.length / 2)} moves`,
      opening: op,
    });
  });
  const addPuzzleMods = (themes, cat, count) => {
    for (const theme of themes) {
      TIERS.forEach((tier, ti) => {
        const pool = puzzlesFor(theme, tier);
        if (pool.length < 4) return;
        mods.push({
          id: `${cat}:${theme}:${ti}`, cat, theme, tier: ti,
          icon: THEME_ICONS[theme] || "🧩",
          name: `${prettyTheme(theme)} ${tier.name}`,
          sub: `${count} puzzles · ${tier.label}`,
          count,
        });
      });
    }
  };
  addPuzzleMods(TACTIC_THEMES, "tactics", 5);
  addPuzzleMods(MATE_THEMES, "checkmates", 5);
  addPuzzleMods(END_THEMES, "endgames", 5);
  for (const d of DRILLS) {
    mods.push({
      id: d.id, cat: "drills", icon: d.icon, name: d.name,
      sub: (d.goal === "mate" ? `checkmate · par ${d.par} moves` : "hold the draw") + ` · vs ${d.botElo} engine`,
      drill: d,
    });
  }
  return mods;
}

export const MODULES = buildModules();

function isLocked(mod) {
  if (mod.tier === undefined || mod.tier === 0) return false;
  const prevId = `${mod.cat}:${mod.theme}:${mod.tier - 1}`;
  return MODULES.some((m) => m.id === prevId) && !state().modulesDone[prevId];
}

// Longest OPENING_PLANS key the opening name (or its family) starts with.
function openingPlan(name) {
  let best = null;
  for (const k of Object.keys(OPENING_PLANS))
    if (name.startsWith(k) && (!best || k.length > best.length)) best = k;
  if (!best) {
    const fam = name.split(":")[0].trim();
    for (const k of Object.keys(OPENING_PLANS))
      if (fam.startsWith(k) && (!best || k.length > best.length)) best = k;
  }
  return best ? OPENING_PLANS[best] : null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export const trainerMode = {
  cat: "openings",
  board: null,
  active: null,
  query: "",
  sortKey: "default",
  _botSeq: 0,
  pendingBotId: null,

  init({ toast, confetti, worker, showPattern, showWisdom }) {
    this.toast = toast;
    this.confetti = confetti || (() => {});
    this.worker = worker || null;
    this.showPattern = showPattern || (() => {});
    this.showWisdom = showWisdom || (() => {});
    this.board = new Board($("module-board"), {
      onUserMove: (f, t, p) => this.onUserMove(f, t, p),
      canMove: () => !!this.awaiting,
    });
    if (this.worker) {
      this.worker.addEventListener("message", (e) => {
        const m = e.data;
        if (!m || m.type !== "botmove") return;
        if (typeof m.id !== "string" || !m.id.startsWith("tr")) return; // not ours (play view uses numeric ids)
        if (m.id !== this.pendingBotId) return;                          // stale reply
        this.pendingBotId = null;
        this.onEngineReply(m);
      });
    }
    document.querySelectorAll("#trainer-tabs .ttab").forEach((b) =>
      b.addEventListener("click", () => {
        document.querySelectorAll("#trainer-tabs .ttab").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        this.cat = b.dataset.cat;
        sfx.click();
        this.renderGrid();
      }));
    $("module-search").addEventListener("input", () => {
      this.query = $("module-search").value.trim().toLowerCase();
      this.renderGrid();
    });
    $("module-sort").addEventListener("change", () => {
      this.sortKey = $("module-sort").value;
      sfx.click();
      this.renderGrid();
    });
    $("btn-workout").addEventListener("click", () => this.startWorkout());
    $("btn-module-exit").addEventListener("click", () => this.exitModule());
    $("btn-module-hint").addEventListener("click", () => this.hint());
    $("btn-module-next").addEventListener("click", () => this.continue_());
    this.renderGrid();
  },

  enter() { this.renderGrid(); },

  // ---------- browser: header, workout banner, recommended, grid ----------

  moduleCardHtml(m) {
    const done = state().modulesDone;
    const stars = done[m.id] || 0;
    const locked = isLocked(m);
    const due = m.opening && this.dueSet && this.dueSet.has(m.id);
    const flip = m.opening && stars === 3;
    return `<div class="module-card ${stars ? "done" : ""} ${locked ? "locked" : ""}" data-mod="${m.id}">
      <div class="module-icon">${locked ? "🔒" : m.icon}</div>
      <div class="module-name">${m.name}${flip ? ' <span class="flip-badge" title="Replay as the other side">⇄</span>' : ""}${due ? ' <span class="due-badge" title="Review due">🔁</span>' : ""}</div>
      <div class="module-sub">${m.sub}</div>
      <div class="stars">${[1, 2, 3].map((i) => `<span class="${i <= stars ? "star" : "off"}">★</span>`).join("")}</div>
    </div>`;
  },

  attachCardClicks(container) {
    container.querySelectorAll(".module-card").forEach((el) =>
      el.addEventListener("click", () => {
        const mod = MODULES.find((m) => m.id === el.dataset.mod);
        if (!mod) return;
        if (isLocked(mod)) { this.toast("🔒 Finish tier " + TIERS[mod.tier - 1].name + " first"); return; }
        this.startModule(mod);
      }));
  },

  sortModules(mods) {
    const done = state().modulesDone;
    const diffKey = (m) => m.opening ? m.opening.moves.length : m.drill ? (m.drill.par || 99) : m.tier;
    const out = mods.slice();
    if (this.sortKey === "name") out.sort((a, b) => a.name.localeCompare(b.name));
    else if (this.sortKey === "difficulty") out.sort((a, b) => diffKey(a) - diffKey(b));
    else if (this.sortKey === "incomplete") out.sort((a, b) => (done[a.id] || 0) - (done[b.id] || 0));
    return out;
  },

  renderGrid() {
    const done = state().modulesDone;
    const doneCount = Object.keys(done).length;
    const totalStars = Object.values(done).reduce((a, b) => a + b, 0);
    $("trainer-progress-label").textContent = `${doneCount} / ${MODULES.length} modules · ${totalStars}★`;
    this.dueSet = new Set(dueOpenings());

    let mods = MODULES.filter((m) => m.cat === this.cat);
    if (this.query) {
      mods = mods.filter((m) =>
        m.name.toLowerCase().includes(this.query) || m.sub.toLowerCase().includes(this.query));
    }
    mods = this.sortModules(mods);
    $("module-grid").innerHTML = mods.map((m) => this.moduleCardHtml(m)).join("");
    this.attachCardClicks($("module-grid"));
    this.renderWorkoutBanner();
    this.renderRecommended();
  },

  renderWorkoutBanner() {
    const doneToday = localStorage.getItem("cq_workout_date") === todayStr();
    const n = this.workoutPlanSize();
    $("btn-workout").textContent = doneToday ? "Again" : "Start";
    $("workout-sub").textContent = doneToday
      ? " — done today! Come back tomorrow, or go again for fun."
      : ` — ${n} item${n === 1 ? "" : "s"} · ~${Math.max(5, Math.round(n * 1.25))} min`;
  },

  renderRecommended() {
    const row = $("recommended-row"), grid = $("recommended-grid");
    const done = state().modulesDone;
    const myTier = tierIndexForElo(state().puzzleElo);
    const picks = [];
    for (const w of weakestThemes(4, 3)) {
      const cands = MODULES.filter((m) =>
        (m.cat === "tactics" || m.cat === "checkmates") && m.theme === w.theme &&
        (done[m.id] || 0) < 3 && !isLocked(m) && Math.abs(m.tier - myTier) <= 1)
        .sort((a, b) => Math.abs(a.tier - myTier) - Math.abs(b.tier - myTier));
      if (cands[0] && !picks.some((p) => p.id === cands[0].id)) picks.push(cands[0]);
      if (picks.length >= 3) break;
    }
    if (!picks.length) { row.hidden = true; grid.innerHTML = ""; return; }
    grid.innerHTML = picks.map((m) => this.moduleCardHtml(m)).join("");
    this.attachCardClicks(grid);
    row.hidden = false;
  },

  // ---------- start / exit ----------

  startModule(mod) {
    sfx.click();
    this.active = mod;
    this.mistakes = 0;
    this.hintsUsed = 0;
    this.phase = null;
    this.drillRetry = false;
    this.isWorkout = false;
    this.wasDue = mod.opening ? dueOpenings().includes(mod.id) : false;
    this.runSeq = (this.runSeq || 0) + 1;
    $("trainer-browser").hidden = true;
    $("module-area").hidden = false;
    $("btn-module-next").hidden = true;
    $("module-plan-card").hidden = true;
    $("module-title").textContent = mod.icon + " " + mod.name;
    if (mod.cat === "checkmates") this.showPattern(mod.theme);
    if (mod.opening) this.startOpening(mod);
    else if (mod.drill) this.startDrill(mod);
    else this.startPuzzleSet(mod);
  },

  exitModule() {
    this.active = null;
    this.awaiting = false;
    this.pendingBotId = null;
    this.runSeq = (this.runSeq || 0) + 1;
    $("trainer-browser").hidden = false;
    $("module-area").hidden = true;
    $("module-plan-card").hidden = true;
    this.renderGrid();
  },

  // guard for async continuations that may outlive the current run
  later(ms, fn) {
    const seq = this.runSeq;
    setTimeout(() => { if (this.runSeq === seq) fn(); }, ms);
  },

  // ---------- opening modules: guided phase then quiz phase ----------

  startOpening(mod) {
    this.phase = "learn";
    const op = mod.opening;
    // "both sides" replay: a 3-starred line runs from the other side
    this.flipSide = state().modulesDone[mod.id] === 3;
    this.playSide = this.flipSide ? (op.side === "w" ? "b" : "w") : op.side;
    this.setupOpeningRun(mod);
    $("module-side-title").textContent = op.name;
    const plan = openingPlan(op.name);
    if (plan) { $("module-plan").textContent = plan; $("module-plan-card").hidden = false; }
    if (this.flipSide) {
      this.instruct(`⇄ You've mastered this line — play it as the OTHER side this time! Learn phase first: follow the highlights for ${this.playSide === "w" ? "White" : "Black"}, then repeat it from memory.`);
    } else {
      this.instruct(`📖 Learn phase — the highlighted squares show each move of the ${op.name}. Play your side's moves; I'll answer for the opponent. Then you'll repeat it from memory.`);
    }
  },

  setupOpeningRun(mod) {
    this.chess = new Chess();
    this.lineIdx = 0;
    this.wrongTries = 0;
    this.board.setGame(this.chess);
    this.board.setOrientation(this.playSide);
    this.board.setLastMove(null);
    this.board.sync();
    this.renderLine();
    this.stepOpening();
  },

  stepOpening() {
    const op = this.active.opening;
    if (this.lineIdx >= op.moves.length) return this.openingPhaseDone();
    const myTurn = (this.chess.turn() === this.playSide);
    if (myTurn) {
      this.awaiting = true;
      if (this.phase === "learn") this.showOpeningHint();
      this.setProgressPips(op.moves.length);
    } else {
      this.awaiting = false;
      this.later(550, () => {
        const san = op.moves[this.lineIdx];
        const mv = this.chess.move(san);
        this.lineIdx++;
        if (mv) { moveSound(mv, this.chess.inCheck()); this.board.sync(mv.from, mv.to, { captured: !!mv.captured }); }
        this.renderLine();
        this.stepOpening();
      });
    }
  },

  showOpeningHint() {
    const san = this.active.opening.moves[this.lineIdx];
    const tmp = new Chess(this.chess.fen());
    const mv = tmp.move(san);
    if (mv) this.board.showHint(mv.from, mv.to);
  },

  onOpeningMove(from, to, promotion) {
    const op = this.active.opening;
    const expectedSan = op.moves[this.lineIdx];
    const mv = this.chess.move({ from, to, promotion });
    if (!mv) return;
    if (mv.san !== expectedSan) {
      this.chess.undo();
      sfx.wrong();
      this.board.flash(to, false);
      this.wrongTries++;
      if (this.phase === "quiz") {
        this.mistakes++;
        if (this.wrongTries >= 2) this.showOpeningHint();
        this.instruct(`Not that one. The line calls for something else${this.wrongTries >= 2 ? " — follow the highlight" : ""}. (${this.mistakes} mistake${this.mistakes === 1 ? "" : "s"})`);
      }
      return;
    }
    this.wrongTries = 0;
    this.lineIdx++;
    moveSound(mv, this.chess.inCheck());
    this.board.clearHint();
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    this.board.flash(to, true);
    sfx.correct();
    this.renderLine();
    this.awaiting = false;
    this.stepOpening();
  },

  openingPhaseDone() {
    this.awaiting = false;
    if (this.phase === "learn") {
      this.instruct("Line complete! Now the real test: play the whole line again from memory. No highlights this time.");
      sfx.moduleDone();
      $("btn-module-next").hidden = false;
      $("btn-module-next").textContent = "Start quiz →";
    } else {
      const stars = this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1;
      const sideNote = this.flipSide ? " (as the other side, no less!)" : "";
      this.completeModule(stars, `You played the ${this.active.opening.name} from memory with ${this.mistakes === 0 ? "zero mistakes. Flawless" : this.mistakes + " mistake" + (this.mistakes === 1 ? "" : "s")}${sideNote}.`);
    }
  },

  // ---------- puzzle-set modules (also powers the daily workout) ----------

  startPuzzleSet(mod) {
    const tier = TIERS[mod.tier];
    const pool = puzzlesFor(mod.theme, tier);
    this.setPuzzles = shuffle(pool.slice()).slice(0, mod.count)
      .map((p) => ({ fen: p[0], moves: p[1].split(" "), rating: p[2] }));
    this.setIdx = 0;
    this.setFails = 0;
    $("module-side-title").textContent = prettyTheme(mod.theme) + " — tier " + tier.name;
    this.instruct(themeIntro(mod.theme) + ` Solve ${mod.count} puzzles. Fewer misses, more stars.`);
    $("module-line").innerHTML = "";
    this.loadSetPuzzle();
  },

  loadSetPuzzle() {
    const p = this.setPuzzles[this.setIdx];
    this.pz = p;
    this.pzMoveIdx = 0;
    this.pzFailed = false;
    this.chess = new Chess(p.fen);
    const setupColor = this.chess.turn();
    this.playerColor = setupColor === "w" ? "b" : "w";
    this.board.setGame(this.chess);
    this.board.setOrientation(this.playerColor);
    this.board.setLastMove(null);
    this.board.sync();
    this.awaiting = false;
    this.setProgressPipsSet();
    this.later(600, () => {
      const uci = p.moves[0];
      const mv = this.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      this.pzMoveIdx = 1;
      if (mv) { moveSound(mv, this.chess.inCheck()); this.board.sync(mv.from, mv.to, { captured: !!mv.captured }); }
      this.awaiting = true;
    });
  },

  onPuzzleSetMove(from, to, promotion) {
    const expected = this.pz.moves[this.pzMoveIdx];
    const mv = this.chess.move({ from, to, promotion });
    if (!mv) return;
    const ok = (from + to + (promotion || "")) === expected || this.chess.isCheckmate();
    if (!ok) {
      this.chess.undo();
      sfx.wrong();
      this.board.flash(to, false);
      if (!this.pzFailed) { this.pzFailed = true; this.setFails++; }
      this.instruct("Not it — look again. " + puzzleLine("fail"));
      this.setProgressPipsSet();
      return;
    }
    this.pzMoveIdx++;
    moveSound(mv, this.chess.inCheck());
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    this.board.flash(to, true);
    this.board.clearHint();
    if (this.pzMoveIdx >= this.pz.moves.length || this.chess.isCheckmate()) {
      this.awaiting = false;
      sfx.correct();
      this.instruct(puzzleLine(this.pzFailed ? "solveSlow" : "solve"));
      if (this.pz.redoKey) resolveRedo(this.pz.redoKey, !this.pzFailed);
      this.setIdx++;
      this.setProgressPipsSet();
      if (this.setIdx >= this.setPuzzles.length) {
        if (this.isWorkout) {
          this.later(700, () => this.finishWorkout());
        } else {
          const stars = this.setFails === 0 ? 3 : this.setFails === 1 ? 2 : 1;
          this.later(700, () => this.completeModule(stars,
            `${this.setPuzzles.length} puzzles down, ${this.setFails} miss${this.setFails === 1 ? "" : "es"}.`));
        }
      } else {
        this.later(900, () => this.loadSetPuzzle());
      }
      return;
    }
    this.awaiting = false;
    this.later(450, () => {
      const uci = this.pz.moves[this.pzMoveIdx];
      const m2 = this.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      this.pzMoveIdx++;
      if (m2) { moveSound(m2, this.chess.inCheck()); this.board.sync(m2.from, m2.to, { captured: !!m2.captured }); }
      this.awaiting = true;
    });
  },

  // ---------- endgame drills vs the engine ----------

  startDrill(mod) {
    const d = mod.drill;
    this.drillMoves = 0;
    this.drillRetry = false;
    this.chess = new Chess(d.fen);
    this.board.setGame(this.chess);
    this.board.setOrientation(d.playerColor);
    this.board.setLastMove(null);
    this.board.sync();
    $("module-title").textContent = mod.icon + " " + mod.name;
    $("module-side-title").textContent = d.name;
    $("module-line").innerHTML = "";
    $("btn-module-next").hidden = true;
    this.instruct(d.intro);
    this.setDrillPips();
    if (this.chess.turn() === d.playerColor) this.awaiting = true;
    else this.requestEngineMove();
  },

  setDrillPips() {
    const d = this.active.drill;
    const total = d.goal === "mate" ? d.par : 30;
    $("module-progress").innerHTML = Array.from({ length: total }, (_, i) =>
      `<span class="pip ${i < Math.min(this.drillMoves, total) ? "hit" : ""}"></span>`).join("");
  },

  requestEngineMove() {
    const d = this.active.drill;
    this.awaiting = false;
    if (!this.worker) { this.toast("Engine unavailable — drills need the engine worker."); return; }
    this.pendingBotId = "tr" + (++this._botSeq);
    $("module-title").textContent = this.active.icon + " " + this.active.name + " …";
    this.worker.postMessage({ type: "botmove", fen: this.chess.fen(), elo: d.botElo, id: this.pendingBotId });
  },

  onEngineReply(m) {
    if (!this.active || !this.active.drill) return;
    $("module-title").textContent = this.active.icon + " " + this.active.name;
    if (!m.uci) { this.checkDrillEnd(false); return; }
    const mv = this.chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
    if (!mv) return;
    moveSound(mv, this.chess.inCheck());
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    if (this.checkDrillEnd(false)) return;
    this.awaiting = true;
  },

  onDrillMove(from, to, promotion) {
    const mv = this.chess.move({ from, to, promotion });
    if (!mv) return;
    this.drillMoves++;
    moveSound(mv, this.chess.inCheck());
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    this.setDrillPips();
    this.awaiting = false;
    if (this.checkDrillEnd(true)) return;
    this.later(300, () => this.requestEngineMove());
  },

  // afterPlayerMove: true when the player just moved. Returns true if the drill ended.
  checkDrillEnd(afterPlayerMove) {
    const d = this.active.drill;
    const c = this.chess;
    if (c.isCheckmate()) {
      // side to move is checkmated
      const playerMated = c.turn() === d.playerColor;
      if (playerMated) this.drillFail("💀 You got checkmated. " + (d.goal === "draw" ? "Keep the rook active and the checks coming." : "Careful with your king!"));
      else this.drillSuccess();
      return true;
    }
    const drawReason =
      c.isStalemate() ? "Stalemate — the enemy king had no moves but wasn't in check." :
      c.isInsufficientMaterial() ? "Not enough material left to mate." :
      (c.isThreefoldRepetition && c.isThreefoldRepetition()) ? "Draw by repetition." :
      c.isDraw() ? "Draw by the 50-move rule." : null;
    if (drawReason) {
      if (d.goal === "draw") this.drillSuccess(drawReason);
      else this.drillFail("🤝 " + drawReason + " That's a draw — the win slipped away.");
      return true;
    }
    if (d.goal === "draw" && afterPlayerMove && this.drillMoves >= 30) {
      this.drillSuccess("You held the fortress for 30 moves.");
      return true;
    }
    return false;
  },

  drillSuccess(note) {
    const d = this.active.drill;
    const s = state();
    s.drillsDone++;
    track("endgameDrillDone");
    let stars, text;
    if (d.goal === "mate") {
      stars = this.drillMoves <= d.par ? 3 : this.drillMoves <= d.par + 8 ? 2 : 1;
      text = `Checkmate in ${this.drillMoves} moves (par ${d.par}).`;
    } else {
      stars = 3;
      text = `Draw held! ${note || ""}`.trim();
    }
    this.completeModule(stars, text);
  },

  drillFail(reason) {
    this.awaiting = false;
    this.pendingBotId = null;
    sfx.wrong();
    this.toast(reason);
    this.instruct(reason + " No stars this time — hit Retry and try again.");
    this.drillRetry = true;
    $("btn-module-next").hidden = false;
    $("btn-module-next").textContent = "Retry drill ↺";
  },

  // ---------- daily workout ----------

  workoutPlanSize() {
    const due = Math.min(2, duePuzzleRedos().length);
    return Math.min(8, due + 6);
  },

  buildWorkoutItems() {
    const s = state();
    const items = [];
    const seen = new Set();
    const push = (fen, moves, rating, extra = {}) => {
      if (seen.has(fen)) return false;
      seen.add(fen);
      items.push({ fen, moves, rating, ...extra });
      return true;
    };
    // 1) up to 2 due spaced-repetition redos
    for (const q of duePuzzleRedos().slice(0, 2))
      push(q.fen, q.moves.split(" "), q.rating, { redoKey: q.key });
    // 2) 3 puzzles from the weakest theme (or a random tactics theme) near our Elo
    const weak = weakestThemes(4, 3)[0];
    const theme = weak ? weak.theme : TACTIC_THEMES[Math.floor(Math.random() * TACTIC_THEMES.length)];
    const near = (target, th) => shuffle(
      PUZZLES.filter((p) => (!th || p[3].split(" ").includes(th)) && !seen.has(p[0]))
        .sort((a, b) => Math.abs(a[2] - target) - Math.abs(b[2] - target))
        .slice(0, 30));
    let added = 0;
    for (const p of near(s.puzzleElo, theme)) {
      if (push(p[0], p[1].split(" "), p[2]) && ++added >= 3) break;
    }
    // 3) 3 fresh stretch puzzles at Elo+100
    added = 0;
    for (const p of near(s.puzzleElo + 100, null)) {
      if (push(p[0], p[1].split(" "), p[2]) && ++added >= 3) break;
    }
    return items.slice(0, 8);
  },

  startWorkout() {
    sfx.click();
    const items = this.buildWorkoutItems();
    if (!items.length) { this.toast("No workout material available yet — solve some puzzles first!"); return; }
    this.active = { id: "workout", cat: "workout", icon: "🏋️", name: "Daily Workout", workout: true };
    this.isWorkout = true;
    this.phase = null;
    this.drillRetry = false;
    this.runSeq = (this.runSeq || 0) + 1;
    this.setPuzzles = items;
    this.setIdx = 0;
    this.setFails = 0;
    $("trainer-browser").hidden = true;
    $("module-area").hidden = false;
    $("btn-module-next").hidden = true;
    $("module-plan-card").hidden = true;
    $("module-title").textContent = "🏋️ Daily Workout";
    $("module-side-title").textContent = "Daily Workout";
    $("module-line").innerHTML = "";
    const redos = items.filter((i) => i.redoKey).length;
    this.instruct(`🏋️ ${items.length} puzzles: ${redos ? redos + " review" + (redos === 1 ? "" : "s") + ", " : ""}your weakest theme, and a few stretch puzzles above your rating. Warm up those calculation muscles!`);
    this.loadSetPuzzle();
  },

  finishWorkout() {
    touchDaily();
    const s = state();
    s.workoutsDone++;
    const total = this.setPuzzles.length;
    const clean = Math.max(0, total - Math.ceil(this.setFails));
    addXp(50, "workout");
    track("moduleDone");
    localStorage.setItem("cq_workout_date", todayStr());
    checkAchievements();
    save();
    sfx.moduleDone();
    this.confetti();
    this.toast(`Workout done — ${clean}/${total} clean`);
    this.instruct(`🏋️ Workout complete! ${clean}/${total} solved cleanly. +50 XP. Same time tomorrow?`);
    $("btn-module-next").hidden = false;
    $("btn-module-next").textContent = "Back to modules →";
    this.awaiting = false;
  },

  // ---------- shared ----------

  onUserMove(from, to, promotion) {
    if (!this.active) return;
    if (this.active.opening) this.onOpeningMove(from, to, promotion);
    else if (this.active.drill) this.onDrillMove(from, to, promotion);
    else this.onPuzzleSetMove(from, to, promotion);
  },

  hint() {
    if (!this.awaiting || !this.active) return;
    sfx.click();
    this.hintsUsed++;
    if (this.active.opening) this.showOpeningHint();
    else if (this.active.drill) {
      this.toast("No hints in drills — trust the technique! Re-read the plan on the right.");
      this.instruct(this.active.drill.intro);
    } else {
      const uci = this.pz.moves[this.pzMoveIdx];
      if (uci) this.board.showHint(uci.slice(0, 2), uci.slice(2, 4));
      if (!this.pzFailed) { this.pzFailed = true; this.setFails += 0.5; }
    }
  },

  continue_() {
    $("btn-module-next").hidden = true;
    if (!this.active) return this.exitModule();
    if (this.drillRetry) {
      this.drillRetry = false;
      this.startDrill(this.active);
      return;
    }
    if (this.active.opening && this.phase === "learn") {
      this.phase = "quiz";
      this.instruct("🧠 Quiz phase — same line, from memory. You've got this.");
      this.setupOpeningRun(this.active);
    } else {
      this.exitModule();
    }
  },

  completeModule(stars, text) {
    touchDaily();
    const s = state();
    const id = this.active.id;
    const firstTime = !(id in s.modulesDone);
    const prev = s.modulesDone[id] || 0;
    s.modulesDone[id] = Math.max(prev, stars);
    let xp = 30 + stars * 10;
    addXp(xp, "module");
    track("moduleDone");
    let extras = "";
    if (firstTime && stars === 3) {
      s.moduleFirstTry[id] = true;
      addXp(25, "perfect first try");
      xp += 25;
      this.toast("💎 Perfect first try!");
    }
    if (this.active.opening) {
      track("openingModuleDone");
      if (this.wasDue) { addXp(15, "opening review"); xp += 15; extras += " 🔁 Review complete, +15 XP."; }
      scheduleOpeningReview(id);
      if (s.modulesDone[id] === 3 && !this.flipSide)
        extras += " ⇄ Mastered! Tap this module again to replay it as the other side.";
    }
    checkAchievements();
    save();
    sfx.moduleDone();
    if (stars === 3) this.confetti();
    this.instruct(`${"★".repeat(stars)}${"☆".repeat(3 - stars)} Module complete! ${text} +${xp} XP${extras}`);
    $("btn-module-next").hidden = false;
    $("btn-module-next").textContent = "Back to modules →";
    this.awaiting = false;
    this.bumpDayCounter();
    this.bumpWisdomCounter();
  },

  bumpDayCounter() {
    let rec = {};
    try { rec = JSON.parse(localStorage.getItem("cq_mod_day") || "{}"); } catch { /* fresh */ }
    if (rec.date !== todayStr()) rec = { date: todayStr(), n: 0 };
    rec.n++;
    localStorage.setItem("cq_mod_day", JSON.stringify(rec));
    if (rec.n === 3) {
      this.toast("🔥 3 modules in one day — training streak!");
      this.confetti();
    }
  },

  bumpWisdomCounter() {
    const n = (parseInt(localStorage.getItem("cq_mod_count") || "0", 10) || 0) + 1;
    localStorage.setItem("cq_mod_count", String(n));
    if (n % 4 === 0) this.later(800, () => this.showWisdom());
  },

  instruct(text) { $("module-instruction").textContent = text; },

  renderLine() {
    const op = this.active.opening;
    $("module-line").innerHTML = op.moves.map((san, i) => {
      const revealed = this.phase === "learn" || i < this.lineIdx;
      const num = i % 2 === 0 ? `<span class="mv num">${i / 2 + 1}.</span>` : "";
      return num + `<span class="mv ${i === this.lineIdx ? "cur" : ""}">${revealed ? san : "?"}</span>`;
    }).join("");
  },

  setProgressPips(total) {
    $("module-progress").innerHTML = Array.from({ length: total }, (_, i) =>
      `<span class="pip ${i < this.lineIdx ? "hit" : ""}"></span>`).join("");
  },

  setProgressPipsSet() {
    $("module-progress").innerHTML = this.setPuzzles.map((_, i) =>
      `<span class="pip ${i < this.setIdx ? "hit" : ""}"></span>`).join("");
  },
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function themeIntro(theme) {
  const intros = {
    fork: "One piece, two targets — the fork wins material by attacking twice at once.",
    pin: "Pin a piece to something more valuable behind it, then pile on.",
    skewer: "Like a pin in reverse: the big piece must move and expose the one behind.",
    discoveredAttack: "Move one piece to unleash another. Double trouble.",
    doubleCheck: "Two checks at once — the king MUST move. Devastating.",
    sacrifice: "Give up material to get something better: mate, or more material back.",
    deflection: "Drag the defender away from its post, then strike what it defended.",
    attraction: "Lure the king or a piece onto a fatal square.",
    clearance: "Clear a square or line your own piece desperately needs.",
    interference: "Cut the communication between enemy pieces.",
    xRayAttack: "Attack through an enemy piece — the threat lands behind it.",
    trappedPiece: "The enemy piece has no safe squares. Hunt it down.",
    hangingPiece: "Something is undefended. Spot it and take it.",
    promotion: "Push that pawn — a new queen changes everything.",
    advancedPawn: "A far-advanced pawn is a monster. Use its power.",
    kingsideAttack: "Storm the castled king. Every tempo counts.",
    capturingDefender: "Remove the defender first, then win what it was guarding.",
    intermezzo: "The in-between move: answer a threat with a bigger threat.",
    quietMove: "No check, no capture — just a quiet move that wins by force.",
    defensiveMove: "Sometimes the winning move is the one that saves you.",
    exposedKing: "Their king is in the open. Punish it.",
    opening: "Sharp tactics straight out of the opening.",
    middlegame: "Rich middlegame positions — calculate carefully.",
    mateIn1: "One move. Find the kill.",
    mateIn2: "Force mate in two — the first move is everything.",
    mateIn3: "Three precise moves to checkmate. See the whole sequence.",
    backRankMate: "The back rank is weak — break through.",
    smotheredMate: "The knight delivers mate to a king smothered by its own pieces.",
    pawnEndgame: "King and pawn endings — where precision is everything.",
    rookEndgame: "Rook endgames: activity beats material.",
    queenEndgame: "Queen endgames — check carefully, centralize, push.",
    knightEndgame: "Knight endings are pawn endings in disguise.",
    bishopEndgame: "Good bishop vs bad bishop — make yours the good one.",
    endgame: "Convert your advantage with clean endgame technique.",
  };
  return intros[theme] || "Find the best move in each position.";
}
