// Persistent player state: ratings, XP, streaks, quests, achievements,
// settings, spaced repetition, per-bot records, history.

import { sfx, configureSound } from "./sounds.js";
import { QUEST_POOL, LEVEL_TITLES } from "../data/content.js";

const KEY = "chessquest_v1";

export const DEFAULT_SETTINGS = {
  soundPack: "classic",   // classic | arcade | zen
  volume: 1,
  haptics: true,
  boardTheme: "purple",   // purple | green | walnut | ice
  showDots: true,
  showCoords: true,
  animations: true,
  autoNext: false,
  tutorMode: false,       // hang-warning nudges in bot games
  tonePack: "warm",       // warm | dry | savage
  reviewDepth: "fast",    // fast (d3) | deep (d5)
  evalBar: false,         // live eval bar in bot games
  oled: false,
};

const DEFAULTS = {
  puzzleElo: 800,
  gameElo: 800,
  peakPuzzleElo: 800,
  peakGameElo: 800,
  xp: 0,
  puzzlesSolved: 0,
  puzzlesFailed: 0,
  noHintSolves: 0,
  hardestSolve: 0,
  puzzleHistory: [],
  bestPuzzleStreak: 0,
  rushBest: 0,
  rushGames: 0,
  dailyPuzzle: { lastDone: null, streak: 0 },
  redoQueue: [],            // [{key, fen, moves, rating, themes, due, interval}]
  themeStats: {},           // theme -> {ok, fail}
  gamesPlayed: 0,
  gamesWon: 0,
  gamesWonAsBlack: 0,
  accuracy90Games: 0,
  mysteryRight: 0,
  botsBeaten: [],
  botRecords: {},           // botId -> {w, l, d, streak}
  liveGame: null,           // resumable in-progress game
  modulesDone: {},          // moduleId -> stars
  moduleFirstTry: {},       // moduleId -> true if 3-starred first attempt
  openingDue: {},           // moduleId -> ISO date it comes due for review
  drillsDone: 0,
  workoutsDone: 0,
  reviewsDone: 0,
  movesPlayed: 0,
  timeTrainedMs: 0,
  streak: 0,
  freezes: 0,
  freezeUsedDates: [],
  lastActive: null,
  lastFirstWinDate: null,
  dayLog: [],               // [{date, puzzleElo, gameElo, solved, played, modules}]
  activeQuests: null,       // {date, quests: [{key, label, target, xp, n, done}], rerolled}
  achievements: [],
  savedGames: [],
  profile: { emoji: "🦉", name: "Player" },
  settings: { ...DEFAULT_SETTINGS },
  onboarded: false,
};

let S = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    const merged = { ...DEFAULTS, ...raw };
    merged.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
    return merged;
  } catch { return structuredClone(DEFAULTS); }
}

export function save() {
  localStorage.setItem(KEY, JSON.stringify(S));
}

export const state = () => S;

// ---- settings ---------------------------------------------------------------

export function getSetting(k) { return S.settings[k]; }
export function setSetting(k, v) {
  S.settings[k] = v;
  syncSoundSettings();
  emit({ type: "setting", key: k, value: v });
}
export function syncSoundSettings() {
  configureSound({ pack: S.settings.soundPack, volume: S.settings.volume, haptics: S.settings.haptics });
}

// ---- backup ----------------------------------------------------------------

export function exportSave() { return JSON.stringify(S, null, 1); }
export function importSave(json) {
  const raw = JSON.parse(json); // throws on garbage
  if (typeof raw.puzzleElo !== "number" || typeof raw.xp !== "number")
    throw new Error("not a ChessQuest save file");
  S = { ...DEFAULTS, ...raw };
  S.settings = { ...DEFAULT_SETTINGS, ...(raw.settings || {}) };
  save();
  emit({ type: "imported" });
}

// ---- XP & levels ------------------------------------------------------------

export const levelForXp = (xp) => Math.floor(Math.sqrt(xp / 60)) + 1;
export const xpForLevel = (lvl) => (lvl - 1) ** 2 * 60;
export const levelTitle = (lvl) => LEVEL_TITLES[Math.min(lvl - 1, LEVEL_TITLES.length - 1)];

let listeners = [];
export function onChange(fn) { listeners.push(fn); }
function emit(evt) { listeners.forEach((f) => f(evt)); save(); }

export function addXp(amount, why = "") {
  const before = levelForXp(S.xp);
  S.xp += amount;
  const after = levelForXp(S.xp);
  sfx.xp();
  emit({ type: "xp", amount, why });
  if (after > before) {
    sfx.levelup();
    if (after % 5 === 0) {
      S.freezes = Math.min(3, S.freezes + 1);
      emit({ type: "freezeEarned" });
    }
    emit({ type: "levelup", level: after, title: levelTitle(after) });
  }
}

// ---- daily streak, day log, freezes -----------------------------------------

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);

export function touchDaily() {
  const t = today();
  if (S.lastActive === t) return;
  if (S.lastActive === daysAgo(1)) {
    S.streak += 1;
  } else if (S.lastActive === daysAgo(2) && S.freezes > 0) {
    S.freezes -= 1;
    S.freezeUsedDates.push(daysAgo(1));
    S.streak += 1;
    emit({ type: "freezeUsed" });
  } else {
    S.streak = 1;
  }
  S.lastActive = t;
  // daily snapshot for weekly recap
  S.dayLog.push({ date: t, puzzleElo: S.puzzleElo, gameElo: S.gameElo,
    solved: S.puzzlesSolved, played: S.gamesPlayed, modules: Object.keys(S.modulesDone).length });
  if (S.dayLog.length > 90) S.dayLog.shift();
  emit({ type: "streak", streak: S.streak });
  checkAchievements();
}

export function addTrainingTime(ms) {
  S.timeTrainedMs += ms;
  // saved lazily by the next emit; avoid save-spam
}

// ---- rotating daily quests ----------------------------------------------------

function drawQuests() {
  const pool = [...QUEST_POOL];
  const picked = [];
  // seed by date so everyone gets a stable draw per day
  let seed = [...today()].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
  while (picked.length < 3 && pool.length) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return picked.map((q) => ({ ...q, n: 0, done: false }));
}

export function quests() {
  const t = today();
  if (!S.activeQuests || S.activeQuests.date !== t) {
    S.activeQuests = { date: t, quests: drawQuests(), rerolled: false };
    save();
  }
  return S.activeQuests;
}

export function rerollQuest(idx) {
  const aq = quests();
  if (aq.rerolled) return false;
  const used = new Set(aq.quests.map((q) => q.key));
  const options = QUEST_POOL.filter((q) => !used.has(q.key));
  if (!options.length) return false;
  aq.quests[idx] = { ...options[Math.floor(Math.random() * options.length)], n: 0, done: false };
  aq.rerolled = true;
  emit({ type: "quest" });
  return true;
}

// Feature code calls track('eventKey') whenever something quest-worthy happens.
export function track(event, n = 1) {
  const aq = quests();
  let changed = false;
  for (const q of aq.quests) {
    if (q.track === event && !q.done) {
      q.n += n;
      if (q.n >= q.target) {
        q.done = true;
        addXp(q.xp, "quest: " + q.label);
        emit({ type: "questDone", quest: q });
      }
      changed = true;
    }
  }
  if (aq.quests.every((q) => q.done) && !aq.bonusClaimed) {
    aq.bonusClaimed = true;
    addXp(100, "all quests");
    emit({ type: "questsComplete" });
  }
  if (changed) emit({ type: "quest" });
}

// ---- elo ---------------------------------------------------------------------

export function updatePuzzleElo(puzzleRating, solved, usedHint) {
  const K = 32;
  const expected = 1 / (1 + 10 ** ((puzzleRating - S.puzzleElo) / 400));
  const score = solved ? (usedHint ? 0.7 : 1) : 0;
  const delta = Math.round(K * (score - expected));
  const before = S.puzzleElo;
  S.puzzleElo = Math.max(300, S.puzzleElo + delta);
  S.peakPuzzleElo = Math.max(S.peakPuzzleElo, S.puzzleElo);
  S.puzzleHistory.push(S.puzzleElo);
  if (S.puzzleHistory.length > 60) S.puzzleHistory.shift();
  if (solved) {
    S.puzzlesSolved++;
    if (!usedHint) S.noHintSolves++;
    S.hardestSolve = Math.max(S.hardestSolve, puzzleRating);
  } else S.puzzlesFailed++;
  const milestone = Math.floor(S.puzzleElo / 100) > Math.floor(before / 100) && delta > 0
    ? Math.floor(S.puzzleElo / 100) * 100 : null;
  emit({ type: "puzzleElo", delta, milestone });
  checkAchievements();
  return { delta, milestone };
}

export function updateGameElo(botElo, result) {
  const K = 32;
  const expected = 1 / (1 + 10 ** ((botElo - S.gameElo) / 400));
  const delta = Math.round(K * (result - expected));
  S.gameElo = Math.max(300, S.gameElo + delta);
  S.peakGameElo = Math.max(S.peakGameElo, S.gameElo);
  S.gamesPlayed++;
  if (result === 1) S.gamesWon++;
  emit({ type: "gameElo", delta });
  checkAchievements();
  return delta;
}

export function recordBotResult(botId, result) {
  const r = (S.botRecords[botId] ||= { w: 0, l: 0, d: 0, streak: 0 });
  if (result === 1) { r.w++; r.streak = Math.max(1, r.streak + 1); }
  else if (result === 0) { r.l++; r.streak = Math.min(-1, r.streak - 1); }
  else { r.d++; r.streak = 0; }
}

export function recordThemeResult(themes, ok) {
  for (const t of themes) {
    const ts = (S.themeStats[t] ||= { ok: 0, fail: 0 });
    ok ? ts.ok++ : ts.fail++;
  }
}

export function weakestThemes(minAttempts = 4, count = 3) {
  return Object.entries(S.themeStats)
    .map(([t, s]) => ({ theme: t, n: s.ok + s.fail, rate: s.ok / (s.ok + s.fail) }))
    .filter((x) => x.n >= minAttempts)
    .sort((a, b) => a.rate - b.rate)
    .slice(0, count);
}

// First bot win each day pays double
export function firstWinBonusAvailable() { return S.lastFirstWinDate !== today(); }
export function claimFirstWinBonus() { S.lastFirstWinDate = today(); }

// ---- spaced repetition ---------------------------------------------------------

export function queuePuzzleRedo(puzzle) {
  const key = puzzle.fen;
  if (S.redoQueue.some((q) => q.key === key)) return;
  S.redoQueue.push({ key, fen: puzzle.fen, moves: puzzle.moves.join(" "),
    rating: puzzle.rating, themes: puzzle.themes.join(" "),
    due: daysFromNow(1), interval: 1 });
  if (S.redoQueue.length > 40) S.redoQueue.shift();
  save();
}

export function duePuzzleRedos() {
  const t = today();
  return S.redoQueue.filter((q) => q.due <= t);
}

export function resolveRedo(key, solved) {
  const i = S.redoQueue.findIndex((q) => q.key === key);
  if (i < 0) return;
  const q = S.redoQueue[i];
  if (solved) {
    if (q.interval >= 7) S.redoQueue.splice(i, 1);        // graduated
    else { q.interval = q.interval === 1 ? 3 : 7; q.due = daysFromNow(q.interval); }
  } else {
    q.interval = 1; q.due = daysFromNow(1);
  }
  save();
}

export function scheduleOpeningReview(moduleId) {
  const cur = S.openingDue[moduleId];
  const next = !cur ? 3 : cur.interval === 3 ? 7 : 21;
  S.openingDue[moduleId] = { due: daysFromNow(next), interval: next };
  save();
}

export function dueOpenings() {
  const t = today();
  return Object.entries(S.openingDue).filter(([, v]) => v.due <= t).map(([id]) => id);
}

const daysFromNow = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// ---- achievements --------------------------------------------------------------

export const ACHIEVEMENTS = [
  { id: "first-puzzle", icon: "🧩", name: "First Blood", desc: "Solve your first puzzle", test: (s) => s.puzzlesSolved >= 1 },
  { id: "puzzle-25", icon: "🧠", name: "Sharp Eyes", desc: "Solve 25 puzzles", test: (s) => s.puzzlesSolved >= 25 },
  { id: "puzzle-100", icon: "⚡", name: "Tactic Machine", desc: "Solve 100 puzzles", test: (s) => s.puzzlesSolved >= 100 },
  { id: "puzzle-500", icon: "🌟", name: "Pattern Oracle", desc: "Solve 500 puzzles", test: (s) => s.puzzlesSolved >= 500 },
  { id: "streak-3", icon: "🔥", name: "Warming Up", desc: "3-day streak", test: (s) => s.streak >= 3 },
  { id: "streak-7", icon: "🔥", name: "On Fire", desc: "7-day streak", test: (s) => s.streak >= 7 },
  { id: "streak-30", icon: "🌋", name: "Unstoppable", desc: "30-day streak", test: (s) => s.streak >= 30 },
  { id: "pstreak-5", icon: "🎯", name: "Combo x5", desc: "5 puzzle solve streak", test: (s) => s.bestPuzzleStreak >= 5 },
  { id: "pstreak-10", icon: "🎯", name: "Combo x10", desc: "10 puzzle solve streak", test: (s) => s.bestPuzzleStreak >= 10 },
  { id: "elo-1000", icon: "📈", name: "Four Digits", desc: "Reach 1000 puzzle rating", test: (s) => s.puzzleElo >= 1000 },
  { id: "elo-1400", icon: "📈", name: "Club Player", desc: "Reach 1400 puzzle rating", test: (s) => s.puzzleElo >= 1400 },
  { id: "elo-1800", icon: "📈", name: "Strong Stuff", desc: "Reach 1800 puzzle rating", test: (s) => s.puzzleElo >= 1800 },
  { id: "elo-2200", icon: "👑", name: "Tactics Royalty", desc: "Reach 2200 puzzle rating", test: (s) => s.puzzleElo >= 2200 },
  { id: "first-win", icon: "⚔️", name: "Giant Slayer Jr.", desc: "Beat your first bot", test: (s) => s.gamesWon >= 1 },
  { id: "wins-10", icon: "⚔️", name: "Battle Tested", desc: "Win 10 games", test: (s) => s.gamesWon >= 10 },
  { id: "wins-50", icon: "🗡️", name: "Bot Scourge", desc: "Win 50 games", test: (s) => s.gamesWon >= 50 },
  { id: "beat-1200", icon: "🤖", name: "Silicon Snack", desc: "Beat a 1200+ bot", test: (s, x) => x?.beatElo >= 1200 },
  { id: "beat-1600", icon: "🤖", name: "Circuit Breaker", desc: "Beat a 1600+ bot", test: (s, x) => x?.beatElo >= 1600 },
  { id: "beat-2000", icon: "💀", name: "Machine Crusher", desc: "Beat a 2000+ bot", test: (s, x) => x?.beatElo >= 2000 },
  { id: "beat-2400", icon: "🏆", name: "Titan Toppler", desc: "Beat a 2400 bot", test: (s, x) => x?.beatElo >= 2400 },
  { id: "modules-5", icon: "🎓", name: "Student", desc: "Complete 5 trainer modules", test: (s) => Object.keys(s.modulesDone).length >= 5 },
  { id: "modules-25", icon: "🎓", name: "Scholar", desc: "Complete 25 trainer modules", test: (s) => Object.keys(s.modulesDone).length >= 25 },
  { id: "modules-100", icon: "🏛️", name: "Professor", desc: "Complete 100 trainer modules", test: (s) => Object.keys(s.modulesDone).length >= 100 },
  { id: "review-1", icon: "🔍", name: "Self Aware", desc: "Review a game", test: (s) => s.reviewsDone >= 1 },
  { id: "review-10", icon: "🔍", name: "Film Study", desc: "Review 10 games", test: (s) => s.reviewsDone >= 10 },
  { id: "level-5", icon: "⭐", name: "Rising Star", desc: "Reach level 5", test: (s) => levelForXp(s.xp) >= 5 },
  { id: "level-10", icon: "⭐", name: "Dedicated", desc: "Reach level 10", test: (s) => levelForXp(s.xp) >= 10 },
  { id: "level-25", icon: "💫", name: "Obsessed (good)", desc: "Reach level 25", test: (s) => levelForXp(s.xp) >= 25 },
  // --- wave 2 ---
  { id: "rush-5", icon: "🌀", name: "Rush Hour", desc: "Score 5+ in Puzzle Rush", test: (s) => s.rushBest >= 5 },
  { id: "rush-12", icon: "🌪️", name: "Storm Chaser", desc: "Score 12+ in Puzzle Rush", test: (s) => s.rushBest >= 12 },
  { id: "rush-20", icon: "⚡", name: "Lightning Brain", desc: "Score 20+ in Puzzle Rush", test: (s) => s.rushBest >= 20 },
  { id: "daily-3", icon: "📅", name: "Regular", desc: "3-day daily-puzzle streak", test: (s) => s.dailyPuzzle.streak >= 3 },
  { id: "daily-7", icon: "📅", name: "Daily Devotee", desc: "7-day daily-puzzle streak", test: (s) => s.dailyPuzzle.streak >= 7 },
  { id: "daily-30", icon: "🗓️", name: "Ritualist", desc: "30-day daily-puzzle streak", test: (s) => s.dailyPuzzle.streak >= 30 },
  { id: "drill-1", icon: "🏁", name: "Technique", desc: "Complete an endgame drill", test: (s) => s.drillsDone >= 1 },
  { id: "drill-5", icon: "🏁", name: "Closer", desc: "Complete 5 endgame drills", test: (s) => s.drillsDone >= 5 },
  { id: "purity-50", icon: "🧼", name: "No Hints Needed", desc: "50 hint-free solves", test: (s) => s.noHintSolves >= 50 },
  { id: "hard-1800", icon: "🧗", name: "Overachiever", desc: "Solve an 1800+ rated puzzle", test: (s) => s.hardestSolve >= 1800 },
  { id: "hard-2200", icon: "🏔️", name: "Summit", desc: "Solve a 2200+ rated puzzle", test: (s) => s.hardestSolve >= 2200 },
  { id: "black-win-5", icon: "⬛", name: "Dark Side", desc: "Win 5 games as Black", test: (s) => s.gamesWonAsBlack >= 5 },
  { id: "acc-90", icon: "🎻", name: "Virtuoso", desc: "Play a 90%+ accuracy game", test: (s) => s.accuracy90Games >= 1 },
  { id: "mystery-1", icon: "🎭", name: "Bot Whisperer", desc: "Guess a Mystery Bot's rating", test: (s) => s.mysteryRight >= 1 },
  { id: "workout-5", icon: "🏋️", name: "Gym Rat", desc: "Finish 5 daily workouts", test: (s) => s.workoutsDone >= 5 },
  { id: "moves-1000", icon: "♟️", name: "Thousand Hands", desc: "Play 1,000 moves", test: (s) => s.movesPlayed >= 1000 },
  { id: "time-10h", icon: "⏳", name: "Deep Work", desc: "Train for 10 hours total", test: (s) => s.timeTrainedMs >= 36e6 },
  { id: "night-owl", icon: "🦇", name: "Night Owl", desc: "Train between midnight and 5am", test: () => { const h = new Date().getHours(); return h >= 0 && h < 5; } },
  { id: "openings-10", icon: "📚", name: "Bookworm", desc: "3-star 10 opening modules", test: (s) => Object.entries(s.modulesDone).filter(([k, v]) => k.startsWith("op:") && v === 3).length >= 10 },
  { id: "stars-100", icon: "✨", name: "Constellation", desc: "Collect 100 stars", test: (s) => Object.values(s.modulesDone).reduce((a, b) => a + b, 0) >= 100 },
  { id: "peak-diff", icon: "🚀", name: "Glow Up", desc: "Gain 300 puzzle rating from your start", test: (s) => s.peakPuzzleElo >= 1100 && s.peakPuzzleElo - 800 >= 300 },
];

export function checkAchievements(extra) {
  for (const a of ACHIEVEMENTS) {
    if (S.achievements.includes(a.id)) continue;
    if (a.test(S, extra)) {
      S.achievements.push(a.id);
      sfx.achievement();
      emit({ type: "achievement", achievement: a });
      addXp(50, "achievement");
    }
  }
}

// ---- saved games for review ------------------------------------------------------

export function saveGame(game) {
  game.id = "g" + Date.now();
  S.savedGames.unshift(game);
  if (S.savedGames.length > 20) S.savedGames.pop();
  emit({ type: "gameSaved" });
  return game.id;
}

export function updateSavedGame(id, patch) {
  const g = S.savedGames.find((g) => g.id === id);
  if (g) Object.assign(g, patch);
  save();
}

// initialize sound settings on load
syncSoundSettings();
