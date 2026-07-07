// Puzzle hub: five modes — rated (Elo, streaks, hints, history, replay),
// rush (3 lives, escalating difficulty), daily (one deterministic puzzle/day),
// practice (unrated theme drills), redo (spaced-repetition queue of misses).

import { Chess } from "./vendor/chess.esm.js";
import { PUZZLES } from "../data/puzzles.js";
import { Board } from "./board.js";
import { sfx, moveSound } from "./sounds.js";
import {
  state, save, getSetting, updatePuzzleElo, addXp, track, checkAchievements,
  touchDaily, recordThemeResult, queuePuzzleRedo, duePuzzleRedos, resolveRedo,
} from "./state.js";
import { puzzleLine, rushLine } from "./feedback.js";

const $ = (id) => document.getElementById(id);

// ---- pure helpers (exported for tests) ---------------------------------------

// Same K=32 expectation math as state.updatePuzzleElo:
// win = solve with no hint (score 1), loss = fail (score 0).
export function eloStakes(playerElo, puzzleRating) {
  const K = 32;
  const expected = 1 / (1 + 10 ** ((puzzleRating - playerElo) / 400));
  return { win: Math.round(K * (1 - expected)), loss: Math.round(K * (0 - expected)) };
}

// Deterministic FNV-1a hash of a "YYYY-MM-DD" string into a pool index.
export function dailyIndex(dateStr, poolLen) {
  let h = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % Math.max(1, poolLen);
}

const aOrAn = (w) => (/^[aeiou]/i.test(w) ? "an" : "a");
const todayStr = () => new Date().toISOString().slice(0, 10);
const yesterdayStr = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
const fmtClock = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};

const parsePuzzle = (p) =>
  ({ fen: p[0], moves: p[1].split(" "), rating: p[2], themes: p[3].split(" ") });

// Themes that describe a puzzle's length/context, not its tactical idea.
const GENERIC_THEMES = new Set([
  "short", "long", "veryLong", "oneMove", "advantage", "crushing", "equality",
  "mate", "middlegame", "endgame", "opening", "master", "masterVsMaster", "superGM",
]);

// Most-specific-first ordering used to name a puzzle's motif on a fail.
const MOTIF_PRIORITY = [
  "smotheredMate", "backRankMate", "arabianMate", "anastasiaMate", "bodenMate",
  "doubleBishopMate", "hookMate", "dovetailMate", "killBoxMate", "vukovicMate",
  "discoveredAttack", "discoveredCheck", "doubleCheck", "fork", "pin", "skewer",
  "deflection", "attraction", "clearance", "interference", "intermezzo",
  "xRayAttack", "zugzwang", "trappedPiece", "hangingPiece", "capturingDefender",
  "sacrifice", "promotion", "underPromotion", "enPassant", "quietMove",
  "defensiveMove", "exposedKing", "attackingF2F7", "kingsideAttack",
  "queensideAttack", "advancedPawn",
  "mateIn1", "mateIn2", "mateIn3", "mateIn4", "mateIn5",
];

export function primaryTheme(themes) {
  for (const t of MOTIF_PRIORITY) if (themes.includes(t)) return t;
  return themes.find((t) => !GENERIC_THEMES.has(t)) || "tactic";
}

const MODE_TITLES = {
  rated: "🧩 Rated Puzzles",
  rush: "🌀 Puzzle Rush",
  daily: "📅 Daily Puzzle",
  practice: "🎛 Practice",
  redo: "🔁 Redo Queue",
};

const DAILY_MIN = 900, DAILY_MAX = 1700;
let dailyPoolCache = null;
function dailyPool() {
  // Stable order: PUZZLES order, filtered once.
  return (dailyPoolCache ||= PUZZLES.filter((p) => p[2] >= DAILY_MIN && p[2] <= DAILY_MAX));
}

// ---- puzzle mode -------------------------------------------------------------

export const puzzleMode = {
  board: null,
  chess: null,
  mode: "rated",
  puzzle: null,        // {fen, moves[], rating, themes[]}
  moveIdx: 0,
  failed: false,
  solved: false,
  usedHint: false,
  hintStage: 0,
  awaitingMove: false,
  streak: 0,           // session solve streak (rated/practice)
  replay: false,       // rated sub-state: unrated replay from history
  dailyCounts: false,  // current daily attempt counts toward the streak
  redoItem: null,      // current redo-queue entry (has .key)
  redoSkipped: new Set(), // keys skipped this session (rotate, don't re-serve)
  rush: null,          // {score, lives, target, used:Set, over}
  runStart: 0,         // rush run start timestamp
  puzzleStart: 0,      // per-puzzle timestamp
  gen: 0,              // generation token: invalidates stale timeouts
  timerId: null,
  pips: [],
  recent: JSON.parse(localStorage.getItem("cq_seen_puzzles") || "[]"),
  hist: JSON.parse(localStorage.getItem("cq_puzzle_hist") || "[]"),
  toast: null,
  confetti: null,

  init({ toast, confetti }) {
    this.toast = toast;
    this.confetti = confetti;
    this.board = new Board($("puzzle-board"), {
      onUserMove: (f, t, p) => this.onUserMove(f, t, p),
      canMove: () => this.awaitingMove,
    });
    $("btn-puzzle-hint").addEventListener("click", () => this.hint());
    $("btn-puzzle-skip").addEventListener("click", () => this.skip());
    $("btn-puzzle-next").addEventListener("click", () => this.next());
    document.querySelectorAll("#puzzle-mode-tabs .ttab").forEach((tab) =>
      tab.addEventListener("click", () => {
        if (tab.dataset.pmode === this.mode) return;
        sfx.click();
        this.setMode(tab.dataset.pmode);
      }));
    $("puzzle-history").addEventListener("click", (e) => {
      const row = e.target.closest("[data-hi]");
      if (row && this.mode === "rated") this.replayFromHistory(+row.dataset.hi);
    });
    $("practice-theme").addEventListener("change", () => {
      if (this.mode === "practice") { sfx.click(); this.next(); }
    });
    // keyboard shortcuts — added once; only active on the puzzles view
    document.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!document.querySelector("#view-puzzles.active")) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" ||
                 ae.tagName === "SELECT" || ae.isContentEditable)) return;
      if (e.key === "n" && !$("btn-puzzle-next").hidden) this.next();
      else if (e.key === "h" && !$("btn-puzzle-hint").hidden) this.hint();
      else if (e.key === "s" && !$("btn-puzzle-skip").hidden) this.skip();
    });
    this.updateRedoBadge();
    this.renderSide();
    this.renderHistory();
  },

  enter() {
    this.updateRedoBadge();
    if (!this.puzzle) this.setMode(this.mode);
    else this.renderSide();
  },

  // ---- mode switching ---------------------------------------------------------

  setMode(mode) {
    this.mode = mode;
    this.gen++;                       // cancel any pending timeouts
    this.stopTimer();
    this.replay = false;
    this.redoItem = null;
    this.redoSkipped.clear();
    this.rush = null;
    this.streak = 0;
    this.pips = [];
    this.awaitingMove = false;
    document.querySelectorAll("#puzzle-mode-tabs .ttab").forEach((t) =>
      t.classList.toggle("active", t.dataset.pmode === mode));
    $("puzzle-mode-title").textContent = MODE_TITLES[mode];
    $("practice-theme-row").hidden = mode !== "practice";
    $("puzzle-history-card").hidden = mode !== "rated";
    $("rush-hud").hidden = mode !== "rush";
    $("puzzle-stakes").closest(".elo-row").hidden = mode !== "rated";
    $("puzzle-streak-pips").innerHTML = "";
    $("puzzle-delta").hidden = true;
    $("puzzle-themes").innerHTML = "";
    if (mode === "practice") this.buildPracticeSelect();
    if (mode === "rush") this.startRush();
    else if (mode === "daily") this.startDaily();
    else if (mode === "redo") this.startRedo();
    else this.next();                 // rated & practice
    this.renderSide();
    this.renderHistory();
  },

  // ---- puzzle picking -----------------------------------------------------------

  pickPuzzle() {
    const elo = state().puzzleElo;
    let window = 110;
    let pool = [];
    while (pool.length < 8 && window < 1200) {
      pool = PUZZLES.filter((p, i) =>
        Math.abs(p[2] - elo) <= window && !this.recent.includes(i));
      window += 120;
    }
    if (pool.length === 0) pool = PUZZLES;
    const p = pool[Math.floor(Math.random() * pool.length)];
    this.markSeen(PUZZLES.indexOf(p));
    return parsePuzzle(p);
  },

  pickPracticePuzzle(theme) {
    const elo = state().puzzleElo;
    const themed = PUZZLES.filter((p) => p[3].split(" ").includes(theme));
    let window = 250;
    let pool = [];
    while (pool.length < 5 && window < 1400) {
      pool = themed.filter((p) =>
        Math.abs(p[2] - elo) <= window && !this.recent.includes(PUZZLES.indexOf(p)));
      window += 150;
    }
    if (pool.length === 0) pool = themed.length ? themed : PUZZLES;
    const p = pool[Math.floor(Math.random() * pool.length)];
    this.markSeen(PUZZLES.indexOf(p));
    return parsePuzzle(p);
  },

  pickRushPuzzle() {
    const target = this.rush.target;
    let window = 100;
    let pool = [];
    while (pool.length < 3 && window < 1400) {
      pool = PUZZLES.filter((p, i) =>
        Math.abs(p[2] - target) <= window && !this.rush.used.has(i));
      window += 120;
    }
    if (pool.length === 0) pool = PUZZLES;
    const p = pool[Math.floor(Math.random() * pool.length)];
    this.rush.used.add(PUZZLES.indexOf(p));
    return parsePuzzle(p);
  },

  markSeen(idx) {
    if (idx < 0) return;
    this.recent.push(idx);
    if (this.recent.length > 900) this.recent.splice(0, 200);
    localStorage.setItem("cq_seen_puzzles", JSON.stringify(this.recent));
  },

  // ---- shared loader ------------------------------------------------------------

  loadPuzzle(puzzle, { banner = null, bannerCls = "" } = {}) {
    this.gen++;
    const gen = this.gen;
    this.puzzle = puzzle;
    this.chess = new Chess(puzzle.fen);
    this.moveIdx = 0;
    this.failed = false;
    this.solved = false;
    this.usedHint = false;
    this.hintStage = 0;
    this.awaitingMove = false;
    this.puzzleStart = Date.now();
    $("btn-puzzle-next").hidden = true;
    $("btn-puzzle-hint").hidden = this.mode === "rush";
    $("btn-puzzle-skip").hidden = this.mode === "daily";
    $("puzzle-delta").hidden = true;
    $("puzzle-themes").innerHTML = "";
    // player is the side to move AFTER the setup move
    const setupColor = this.chess.turn();
    this.playerColor = setupColor === "w" ? "b" : "w";
    this.board.setGame(this.chess);
    this.board.setOrientation(this.playerColor);
    this.board.setLastMove(null);
    this.board.sync();
    this.setPrompt(banner || `${this.playerColor === "w" ? "White" : "Black"} to move`, bannerCls);
    $("puzzle-target-elo").textContent = puzzle.rating;
    this.renderStakes();
    if (this.mode !== "rush") this.startTimer(this.puzzleStart);
    // play the setup move after a beat (rush keeps a much faster pace)
    setTimeout(() => { if (gen === this.gen) this.playOpponentMove(); },
      this.mode === "rush" ? 250 : 650);
  },

  renderStakes() {
    const el = $("puzzle-stakes");
    if (this.mode !== "rated" || this.replay || !this.puzzle) { el.textContent = "—"; return; }
    const { win, loss } = eloStakes(state().puzzleElo, this.puzzle.rating);
    el.textContent = `+${win} / −${Math.abs(loss)}`;
  },

  next() {
    if (this.mode === "rush") { this.startRush(); return; }
    if (this.mode === "daily") { this.startDaily(); return; }
    if (this.mode === "redo") { this.startRedo(); return; }
    if (this.mode === "practice") {
      this.loadPuzzle(this.pickPracticePuzzle($("practice-theme").value));
      return;
    }
    this.replay = false;
    this.loadPuzzle(this.pickPuzzle());
  },

  // ---- mode starters ------------------------------------------------------------

  startRush() {
    const s = state();
    this.rush = {
      score: 0, lives: 3, over: false, used: new Set(),
      target: Math.max(500, s.puzzleElo - 400),
    };
    this.runStart = Date.now();
    sfx.rushStart();
    this.renderRushHud();
    this.startTimer(this.runStart);
    this.loadPuzzle(this.pickRushPuzzle(), { banner: rushLine("start") });
    this.renderSide();
  },

  startDaily() {
    const s = state();
    const t = todayStr();
    const pool = dailyPool();
    const puzzle = parsePuzzle(pool[dailyIndex(t, pool.length)]);
    const done = s.dailyPuzzle.lastDone === t;
    const tried = s.dailyPuzzle.lastTried === t;
    this.dailyCounts = !done && !tried;
    const banner = done ? puzzleLine("dailyDone")
      : tried ? "Retry — unrated (streak attempt used)"
      : puzzleLine("daily");
    this.loadPuzzle(puzzle, { banner, bannerCls: done ? "good" : "" });
    this.renderSide();
  },

  startRedo() {
    let due = duePuzzleRedos().slice().sort((a, b) => (a.due < b.due ? -1 : 1));
    this.updateRedoBadge();
    // serve oldest first, but rotate past anything skipped this session
    const unskipped = due.filter((q) => !this.redoSkipped.has(q.key));
    if (unskipped.length) due = unskipped;
    else this.redoSkipped.clear();
    if (due.length === 0) {
      this.redoItem = null;
      this.puzzle = null;
      this.gen++;
      this.stopTimer();
      this.awaitingMove = false;
      this.setPrompt("✨ Redo queue clear — nothing due today. Come back after your next miss.", "good");
      $("btn-puzzle-hint").hidden = true;
      $("btn-puzzle-skip").hidden = true;
      $("btn-puzzle-next").hidden = true;
      $("puzzle-target-elo").textContent = "?";
      $("puzzle-themes").innerHTML =
        `<button class="btn primary" id="btn-redo-to-rated">🧩 Back to Rated</button>`;
      $("btn-redo-to-rated").addEventListener("click", () => {
        sfx.click();
        this.setMode("rated");
      });
      this.renderSide();
      return;
    }
    const item = due[0];
    this.redoItem = item;
    this.loadPuzzle(
      { fen: item.fen, moves: item.moves.split(" "), rating: item.rating, themes: item.themes.split(" ") },
      { banner: puzzleLine("redo") });
    this.renderSide();
  },

  replayFromHistory(i) {
    const h = this.hist[i];
    if (!h || !h.fen) return;
    sfx.click();
    this.replay = true;
    this.loadPuzzle(
      { fen: h.fen, moves: h.moves.split(" "), rating: h.r, themes: h.themes.split(" ") },
      { banner: "Replay — unrated" });
  },

  // ---- move flow ------------------------------------------------------------------

  playOpponentMove() {
    const uci = this.puzzle.moves[this.moveIdx];
    if (!uci) return;
    const mv = this.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    this.moveIdx++;
    moveSound(mv, this.chess.inCheck());
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    this.awaitingMove = true;
    if (this.moveIdx === 1 && this.mode !== "rush") this.setPrompt("Your move", "");
  },

  onUserMove(from, to, promotion) {
    const expected = this.puzzle.moves[this.moveIdx];
    const mv = this.chess.move({ from, to, promotion });
    if (!mv) return;
    const played = from + to + (promotion || "");
    // correct if it matches, or if it delivers mate (lichess rule)
    const ok = played === expected || this.chess.isCheckmate();
    if (!ok) {
      sfx.wrong();
      this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
      this.board.flash(to, false);
      this.chess.undo();
      const gen = this.gen;
      setTimeout(() => { if (gen === this.gen) this.board.sync(); }, 450);
      if (this.mode === "rush") { this.awaitingMove = false; this.loseRushLife(); return; }
      if (!this.failed) {
        this.failed = true;
        this.finish(false);
      }
      return;
    }
    this.moveIdx++;
    moveSound(mv, this.chess.inCheck());
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    this.board.flash(to, true);
    this.board.clearHint();
    this.awaitingMove = false;

    if (this.moveIdx >= this.puzzle.moves.length || this.chess.isCheckmate()) {
      if (this.mode === "rush") this.solveRush();
      else if (!this.failed) this.finish(true);
      return;
    }
    sfx.correct();
    const gen = this.gen;
    setTimeout(() => { if (gen === this.gen) this.playOpponentMove(); },
      this.mode === "rush" ? 250 : 420);
  },

  // ---- finishing (non-rush) ----------------------------------------------------------

  finish(solved) {
    this.solved = solved;
    this.awaitingMove = solved ? false : true; // on fail, let them explore
    this.stopTimer();
    touchDaily();
    if (this.replay) this.finishReplay(solved);
    else if (this.mode === "rated") this.finishRated(solved);
    else if (this.mode === "daily") this.finishDaily(solved);
    else if (this.mode === "practice") this.finishPractice(solved);
    else if (this.mode === "redo") this.finishRedo(solved);
    checkAchievements();
    save();
    $("puzzle-themes").innerHTML = this.puzzle.themes
      .map((t) => `<span class="tag">${prettyTheme(t)}</span>`).join("");
    $("btn-puzzle-next").hidden = false;
    $("btn-puzzle-hint").hidden = true;
    $("btn-puzzle-skip").hidden = true;
    this.renderSide();
    this.renderPips(solved);
  },

  finishRated(solved) {
    const s = state();
    const secs = (Date.now() - this.puzzleStart) / 1000;
    const prevBest = s.bestPuzzleStreak;
    const usedHint = this.usedHint;
    const { delta, milestone } = updatePuzzleElo(this.puzzle.rating, solved, usedHint);
    recordThemeResult(this.puzzle.themes, solved);
    if (solved) {
      this.streak++;
      sfx.solve();
      track("puzzleSolved");
      if (!usedHint) track("puzzleSolvedNoHint");
      if (this.puzzle.themes.some((t) => ["mateIn1", "mateIn2", "mateIn3"].includes(t)))
        track("matePuzzleSolved");
      if (this.streak > prevBest) {
        s.bestPuzzleStreak = this.streak;
        sfx.streak(this.streak);
        this.toast(`🏅 New best streak — ${this.streak} in a row!`, "ach");
      } else if (this.streak === 3 || this.streak % 5 === 0) {
        sfx.streak(this.streak);
        this.confetti();
        const kind = this.streak >= 10 ? "streak10" : this.streak >= 5 ? "streak5" : "streak3";
        this.toast(`🔥 ${this.streak} in a row! ${puzzleLine(kind)}`);
      }
      const fast = secs < 20, slow = secs > 90;
      addXp(10 + Math.min(15, this.streak * 2) + (fast ? 5 : 0), "puzzle");
      this.setPrompt(puzzleLine(fast ? "solveFast" : slow ? "solveSlow" : "solve"), "good");
      if (milestone) {
        this.confetti("gold");
        this.toast(`🏔 New heights: ${milestone}!`, "ach");
        sfx.achievement();
      }
      if (getSetting("autoNext")) {
        const gen = this.gen;
        setTimeout(() => {
          if (gen === this.gen && this.mode === "rated" && !$("btn-puzzle-next").hidden) this.next();
        }, 1200);
      }
    } else {
      this.streak = 0;
      queuePuzzleRedo(this.puzzle);
      this.updateRedoBadge();
      const motif = prettyTheme(primaryTheme(this.puzzle.themes)).toLowerCase();
      this.setPrompt(`${puzzleLine("fail")} This was ${aOrAn(motif)} ${motif} — watch the reveal.`, "bad");
      this.revealSolution();
    }
    const deltaEl = $("puzzle-delta");
    deltaEl.hidden = false;
    deltaEl.textContent = (delta >= 0 ? "+" : "") + delta;
    deltaEl.className = "delta-banner " + (delta >= 0 ? "up" : "down");
    this.pushHistory({
      r: this.puzzle.rating, ok: solved, delta,
      fen: this.puzzle.fen, moves: this.puzzle.moves.join(" "), themes: this.puzzle.themes.join(" "),
    });
  },

  finishDaily(solved) {
    const s = state();
    const t = todayStr();
    recordThemeResult(this.puzzle.themes, solved);
    if (this.dailyCounts) {
      this.dailyCounts = false;
      s.dailyPuzzle.lastTried = t;
      if (solved) {
        s.dailyPuzzle.streak = s.dailyPuzzle.lastDone === yesterdayStr()
          ? s.dailyPuzzle.streak + 1 : 1;
        s.dailyPuzzle.lastDone = t;
        sfx.solve();
        addXp(30, "daily puzzle");
        track("dailyPuzzleDone");
        this.confetti();
        this.setPrompt(puzzleLine("dailyDone"), "good");
        this.toast(`📅 Daily done — ${s.dailyPuzzle.streak}-day daily streak!`, "ach");
      } else {
        this.setPrompt(`${puzzleLine("fail")} Streak attempt used — retry unrated anytime.`, "bad");
        this.revealSolution();
      }
    } else if (solved) {
      sfx.solve();
      this.setPrompt(puzzleLine("solve") + " (unrated)", "good");
    } else {
      this.setPrompt(puzzleLine("fail"), "bad");
      this.revealSolution();
    }
  },

  finishPractice(solved) {
    recordThemeResult(this.puzzle.themes, solved);
    if (solved) {
      this.streak++;
      sfx.solve();
      this.setPrompt(puzzleLine("solve"), "good");
      if (getSetting("autoNext")) {
        const gen = this.gen;
        setTimeout(() => {
          if (gen === this.gen && this.mode === "practice" && !$("btn-puzzle-next").hidden) this.next();
        }, 1200);
      }
    } else {
      this.streak = 0;
      const motif = prettyTheme(primaryTheme(this.puzzle.themes)).toLowerCase();
      this.setPrompt(`${puzzleLine("fail")} This was ${aOrAn(motif)} ${motif} — watch the reveal.`, "bad");
      this.revealSolution();
    }
  },

  finishRedo(solved) {
    if (this.redoItem) resolveRedo(this.redoItem.key, solved);
    this.redoItem = null;
    recordThemeResult(this.puzzle.themes, solved);
    this.updateRedoBadge();
    if (solved) {
      sfx.solve();
      addXp(8, "redo");
      this.setPrompt(puzzleLine("solve") + " Pattern locked in.", "good");
    } else {
      this.setPrompt(`${puzzleLine("fail")} Back in the queue for another round.`, "bad");
      this.revealSolution();
    }
  },

  finishReplay(solved) {
    if (solved) {
      sfx.solve();
      this.setPrompt(puzzleLine("solve") + " (replay — unrated)", "good");
    } else {
      this.setPrompt(puzzleLine("fail") + " (replay — unrated)", "bad");
      this.revealSolution();
    }
  },

  // ---- rush -----------------------------------------------------------------------

  solveRush() {
    this.rush.score++;
    this.rush.target += 60;
    sfx.correct();
    this.renderRushHud();
    if (this.rush.score === 10) { this.toast(`🌀 ${rushLine("milestone10")}`); this.confetti(); }
    if (this.rush.score === 20) { this.toast(`⚡ ${rushLine("milestone20")}`, "ach"); this.confetti("stars"); }
    const gen = this.gen;
    setTimeout(() => {
      if (gen === this.gen && this.rush && !this.rush.over)
        this.loadPuzzle(this.pickRushPuzzle());
    }, 500);
    this.renderSide();
  },

  loseRushLife() {
    if (!this.rush || this.rush.over) return;
    this.rush.lives--;
    sfx.life();
    this.renderRushHud();
    if (this.rush.lives <= 0) { this.rushOver(); return; }
    this.setPrompt(rushLine(this.rush.lives === 2 ? "life1" : "life2"), "bad");
    const gen = this.gen;
    setTimeout(() => {
      if (gen === this.gen && this.rush && !this.rush.over)
        this.loadPuzzle(this.pickRushPuzzle());
    }, 600);
  },

  rushOver() {
    this.rush.over = true;
    this.awaitingMove = false;
    this.stopTimer();
    touchDaily();
    sfx.rushOver();
    const s = state();
    const score = this.rush.score;
    const newBest = score > s.rushBest;
    s.rushGames++;
    s.rushBest = Math.max(s.rushBest, score);
    track("rushPlayed");
    addXp(Math.min(60, score * 4), "rush");
    checkAchievements();
    save();
    this.setPrompt(rushLine("gameover"), "bad");
    const deltaEl = $("puzzle-delta");
    deltaEl.hidden = false;
    deltaEl.textContent = `Score ${score} · Best ${s.rushBest}`;
    deltaEl.className = "delta-banner " + (newBest ? "up" : "down");
    if (newBest) {
      this.toast(`🌀 ${rushLine("newBest")}`, "ach");
      this.confetti("gold");
    }
    $("btn-puzzle-next").hidden = false;
    $("btn-puzzle-skip").hidden = true;
    this.renderSide();
  },

  renderRushHud() {
    if (!this.rush) return;
    $("rush-score").textContent = this.rush.score;
    $("rush-lives").textContent =
      "❤️".repeat(this.rush.lives) + "🖤".repeat(3 - this.rush.lives);
  },

  // ---- reveal / hint / skip ---------------------------------------------------------

  revealSolution() {
    const gen = this.gen;
    const step = () => {
      if (gen !== this.gen) return;
      const uci = this.puzzle.moves[this.moveIdx];
      if (!uci) return;
      const mv = this.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      if (!mv) return;
      this.moveIdx++;
      moveSound(mv, this.chess.inCheck());
      this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
      setTimeout(step, 600);
    };
    setTimeout(step, 700);
  },

  hint() {
    if (!this.awaitingMove || this.mode === "rush") return;
    const uci = this.puzzle.moves[this.moveIdx];
    if (!uci) return;
    if (this.mode !== "practice") this.usedHint = true; // hints are free in practice
    sfx.click();
    if (this.hintStage === 0) {
      this.board.showHint(uci.slice(0, 2));
      this.setPrompt(puzzleLine("hint"), "");
      this.hintStage = 1;
    } else {
      this.board.showHint(uci.slice(0, 2), uci.slice(2, 4));
    }
  },

  skip() {
    if (this.mode === "rush") {
      if (this.awaitingMove && this.rush && !this.rush.over) {
        this.awaitingMove = false;
        this.loseRushLife();
      }
      return;
    }
    if (this.mode === "redo" && this.redoItem) {
      this.redoSkipped.add(this.redoItem.key);
      this.redoItem = null;
      this.next();
      return;
    }
    if (this.mode === "rated" && !this.replay && this.awaitingMove) {
      this.streak = 0;
      const { delta } = updatePuzzleElo(this.puzzle.rating, false, false);
      this.pushHistory({
        r: this.puzzle.rating, ok: false, delta,
        fen: this.puzzle.fen, moves: this.puzzle.moves.join(" "), themes: this.puzzle.themes.join(" "),
      });
      this.renderSide();
    }
    this.next();
  },

  // ---- timer ---------------------------------------------------------------------

  startTimer(baseTs) {
    this.stopTimer();
    const el = $("puzzle-timer");
    el.hidden = false;
    el.textContent = "0:00";
    this.timerId = setInterval(() => {
      el.textContent = fmtClock(Date.now() - baseTs);
    }, 1000);
  },

  stopTimer() {
    if (this.timerId) { clearInterval(this.timerId); this.timerId = null; }
  },

  // ---- history --------------------------------------------------------------------

  pushHistory(entry) {
    this.hist.unshift(entry);
    if (this.hist.length > 20) this.hist.length = 20;
    localStorage.setItem("cq_puzzle_hist", JSON.stringify(this.hist));
    this.renderHistory();
  },

  renderHistory() {
    const host = $("puzzle-history");
    if (!host) return;
    if (this.hist.length === 0) {
      host.innerHTML = `<p class="muted">Solved puzzles show up here — click one to replay it.</p>`;
      return;
    }
    host.innerHTML = this.hist.map((h, i) =>
      `<button class="hist-row ${h.ok ? "hit" : "miss"}" data-hi="${i}" title="Replay unrated">
        <span>${h.ok ? "✓" : "✗"}</span>
        <span class="hist-rating">${h.r}</span>
        <span class="hist-delta ${h.delta >= 0 ? "up" : "down"}">${h.delta >= 0 ? "+" : ""}${h.delta}</span>
      </button>`).join("");
  },

  // ---- redo badge -------------------------------------------------------------------

  updateRedoBadge() {
    const el = $("redo-badge");
    if (!el) return;
    const n = duePuzzleRedos().length;
    el.hidden = n === 0;
    el.textContent = n;
  },

  // ---- side panel / prompt ------------------------------------------------------------

  setPrompt(text, cls) {
    const el = $("puzzle-prompt");
    el.textContent = text;
    el.className = "turn-banner " + (cls || "");
  },

  renderPips(hit) {
    if (this.mode === "rush") return;
    this.pips.push(hit);
    if (this.pips.length > 12) this.pips.shift();
    $("puzzle-streak-pips").innerHTML = this.pips
      .map((h) => `<span class="pip ${h ? "hit" : "miss"}"></span>`).join("");
  },

  renderSide() {
    const s = state();
    $("puzzle-elo-side").textContent = s.puzzleElo;
    $("puzzle-streak").textContent =
      this.mode === "rush" ? (this.rush ? this.rush.score : 0)
      : this.mode === "daily" ? s.dailyPuzzle.streak
      : this.streak;
    $("puzzle-stats-line").textContent =
      this.mode === "rush"
        ? `${s.rushGames} runs · best ${s.rushBest}`
      : this.mode === "daily"
        ? `📅 Daily streak: ${s.dailyPuzzle.streak} day${s.dailyPuzzle.streak === 1 ? "" : "s"}` +
          (s.dailyPuzzle.lastDone === todayStr() ? " · done today ✓" : "")
      : this.mode === "redo"
        ? `${duePuzzleRedos().length} due · ${s.redoQueue.length} in queue`
        : `${s.puzzlesSolved} solved · ${s.puzzlesFailed} failed · best streak ${s.bestPuzzleStreak}`;
    this.drawChart();
  },

  drawChart() {
    const canvas = $("puzzle-chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = state();
    const hist = s.puzzleHistory.slice(-60);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (hist.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,.4)";
      ctx.font = "12px system-ui";
      ctx.fillText("Solve puzzles to see your rating curve", 12, 60);
      return;
    }
    const peak = s.peakPuzzleElo;
    const min = Math.min(...hist) - 30, max = Math.max(...hist, peak) + 30;
    const x = (i) => (i / (hist.length - 1)) * (canvas.width - 16) + 8;
    const y = (v) => canvas.height - 14 - ((v - min) / (max - min)) * (canvas.height - 28);
    // dashed peak line with a tiny label
    ctx.save();
    ctx.strokeStyle = "rgba(240,180,41,.45)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(8, y(peak));
    ctx.lineTo(canvas.width - 8, y(peak));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(240,180,41,.75)";
    ctx.font = "9px system-ui";
    ctx.fillText(`peak ${peak}`, canvas.width - 58, Math.max(9, y(peak) - 3));
    ctx.restore();
    // rating curve
    ctx.strokeStyle = "#f0b429";
    ctx.lineWidth = 2;
    ctx.beginPath();
    hist.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.stroke();
    ctx.fillStyle = "#f0b429";
    ctx.beginPath();
    ctx.arc(x(hist.length - 1), y(hist[hist.length - 1]), 3.5, 0, 7);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.font = "10px system-ui";
    ctx.fillText(Math.max(...hist), 8, 10);
    ctx.fillText(Math.min(...hist), 8, canvas.height - 4);
  },

  // ---- practice select -----------------------------------------------------------------

  practiceBuilt: false,
  buildPracticeSelect() {
    if (this.practiceBuilt) return;
    this.practiceBuilt = true;
    const counts = {};
    for (const p of PUZZLES) {
      for (const t of p[3].split(" ")) {
        if (!GENERIC_THEMES.has(t)) counts[t] = (counts[t] || 0) + 1;
      }
    }
    const themes = Object.keys(counts)
      .filter((t) => counts[t] >= 2)
      .sort((a, b) => prettyTheme(a).localeCompare(prettyTheme(b)));
    $("practice-theme").innerHTML = themes
      .map((t) => `<option value="${t}">${prettyTheme(t)} (${counts[t]})</option>`).join("");
  },
};

// ---- theme labels (imported by trainer.js — keep exported) ------------------------

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
  attackingF2F7: "Attack on f7/f2", enPassant: "En passant",
};
export function prettyTheme(t) {
  return THEME_NAMES[t] || t.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}
