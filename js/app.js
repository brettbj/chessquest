// ChessQuest bootstrap: navigation, dashboard, Today's Plan, settings,
// modals, share card, onboarding, workers, toasts, confetti.

import { state, onChange, levelForXp, xpForLevel, levelTitle, quests, rerollQuest,
         ACHIEVEMENTS, touchDaily, save, getSetting, setSetting, DEFAULT_SETTINGS,
         exportSave, importSave, duePuzzleRedos, addXp, addTrainingTime } from "./state.js";
import { sfx, unlock, soundEnabled, setSoundEnabled } from "./sounds.js";
import { applyBoardSettings } from "./board.js";
import { puzzleMode } from "./puzzles.js";
import { playMode } from "./bots.js";
import { trainerMode, MODULES } from "./trainer.js";
import { reviewMode } from "./review.js";
import { TIPS, WISDOM, MATE_PATTERNS } from "../data/content.js";

const $ = (id) => document.getElementById(id);
const today = () => new Date().toISOString().slice(0, 10);

// ---- workers: one for bot play, one for analysis (never queue behind each other)
const worker = new Worker(new URL("./engine-worker.js", import.meta.url), { type: "module" });
const analysisWorker = new Worker(new URL("./engine-worker.js", import.meta.url), { type: "module" });

// ---- toasts ----
function toast(msg, cls = "") {
  const host = $("toast-host");
  const el = document.createElement("div");
  el.className = "toast " + cls;
  el.textContent = msg;
  if (cls === "ach") el.addEventListener("click", () => { openModal("ach-modal"); renderAchGallery(); });
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; setTimeout(() => el.remove(), 400); }, 3400);
}

// ---- confetti variants ----
const CONFETTI_SETS = {
  default: { colors: ["#f0b429", "#7c5cff", "#2dd4a7", "#ff5c7a", "#4cc2ff"], n: 60, emoji: null },
  win: { colors: [], n: 34, emoji: ["♛", "♞", "♜", "♝", "🏆", "✨"] },
  gold: { colors: ["#f0b429", "#ffd66b", "#fff3c4", "#e8a020"], n: 80, emoji: null },
  stars: { colors: [], n: 28, emoji: ["⭐", "✨", "🌟"] },
};
function confetti(kind) {
  if (!getSetting("animations")) return;
  const set = CONFETTI_SETS[kind] || CONFETTI_SETS.default;
  const host = $("confetti-host");
  for (let i = 0; i < set.n; i++) {
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.left = Math.random() * 100 + "vw";
    p.style.animationDelay = Math.random() * 0.6 + "s";
    if (set.emoji) {
      p.textContent = set.emoji[i % set.emoji.length];
      p.style.background = "none";
      p.style.fontSize = 14 + Math.random() * 12 + "px";
    } else {
      p.style.background = set.colors[i % set.colors.length];
    }
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    host.appendChild(p);
    setTimeout(() => p.remove(), 3200);
  }
}

// ---- modals ----
function openModal(id) { $(id).hidden = false; }
function closeModal(id) { $(id).hidden = true; }
document.querySelectorAll(".modal-close").forEach((b) =>
  b.addEventListener("click", () => closeModal(b.dataset.close)));
document.querySelectorAll(".modal-scrim").forEach((m) =>
  m.addEventListener("click", (e) => { if (e.target === m && m.id !== "onboard-modal") m.hidden = true; }));

function showWisdom() {
  const w = WISDOM[Math.floor(Math.random() * WISDOM.length)];
  $("wisdom-icon").textContent = w.icon;
  $("wisdom-title").textContent = w.title;
  $("wisdom-text").textContent = w.text;
  openModal("wisdom-modal");
}
function showPattern(themeKey) {
  const p = MATE_PATTERNS[themeKey];
  if (!p) return;
  $("pattern-title").textContent = p.title;
  $("pattern-anatomy").textContent = p.anatomy;
  $("pattern-recognize").textContent = p.recognize + (p.example ? " " + p.example : "");
  openModal("pattern-modal");
}

// ---- navigation ----
const views = ["home", "puzzles", "play", "trainer", "review"];
let currentView = "home";

function resetScroll() {
  window.scrollTo(0, 0);
  $("views").scrollTop = 0;
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
}

function goto(view, arg) {
  currentView = view;
  resetScroll();
  views.forEach((v) => $("view-" + v).classList.toggle("active", v === view));
  document.querySelectorAll("#tabbar .tab").forEach((t) =>
    t.classList.toggle("active", t.dataset.view === view));
  const mode = { puzzles: puzzleMode, play: playMode, trainer: trainerMode, review: reviewMode }[view];
  if (mode && mode.enter) mode.enter(arg);
  if (view === "home") renderHome();
}

document.querySelectorAll("#tabbar .tab").forEach((t) =>
  t.addEventListener("click", () => { sfx.click(); goto(t.dataset.view); }));
document.querySelectorAll("[data-goto]").forEach((el) =>
  el.addEventListener("click", () => { sfx.click(); goto(el.dataset.goto); }));

// global keyboard map
document.addEventListener("keydown", (e) => {
  if (e.target.matches("input, textarea, select")) return;
  const keys = { 1: "home", 2: "puzzles", 3: "play", 4: "trainer", 5: "review" };
  if (keys[e.key]) { goto(keys[e.key]); }
  else if (e.key === "?") {
    toast("⌨️ 1-5 tabs · N next puzzle · H hint · S skip · ←→ review nav");
  }
});

// ---- topbar ----
function renderTopbar() {
  const s = state();
  const lvl = levelForXp(s.xp);
  $("level-num").textContent = lvl;
  const lo = xpForLevel(lvl), hi = xpForLevel(lvl + 1);
  $("xp-fill").style.width = Math.round(((s.xp - lo) / (hi - lo)) * 100) + "%";
  $("streak-num").textContent = s.streak;
  $("freeze-pips").textContent = "❄".repeat(s.freezes);
  $("puzzle-elo-num").textContent = s.puzzleElo;
  $("game-elo-num").textContent = s.gameElo;
  $("profile-emoji").textContent = s.profile.emoji;
  $("btn-sound").textContent = soundEnabled() ? "🔊" : "🔇";
}

$("btn-sound").addEventListener("click", () => {
  setSoundEnabled(!soundEnabled());
  renderTopbar();
  if (soundEnabled()) sfx.click();
});
$("btn-settings").addEventListener("click", () => { openSettings(); });
$("btn-profile").addEventListener("click", () => { openSettings(); });

// ---- Today's Plan ----
function dayStartSnapshot() {
  const s = state();
  return [...s.dayLog].reverse().find((d) => d.date === today()) ||
    { solved: s.puzzlesSolved, played: s.gamesPlayed, modules: Object.keys(s.modulesDone).length };
}

function planSteps() {
  const s = state();
  const snap = dayStartSnapshot();
  const solvedToday = s.puzzlesSolved - snap.solved;
  const redos = duePuzzleRedos().length;
  return [
    { icon: "📅", label: "Daily puzzle", done: s.dailyPuzzle.lastDone === today(),
      go: () => { goto("puzzles"); document.querySelector('[data-pmode="daily"]')?.click(); } },
    { icon: "🧩", label: `Warm up: 5 rated puzzles (${Math.min(5, solvedToday)}/5)`, done: solvedToday >= 5,
      go: () => { goto("puzzles"); document.querySelector('[data-pmode="rated"]')?.click(); } },
    { icon: "🔁", label: redos ? `Clear ${redos} due retr${redos === 1 ? "y" : "ies"}` : "Retry queue clear", done: redos === 0,
      go: () => { goto("puzzles"); document.querySelector('[data-pmode="redo"]')?.click(); } },
    { icon: "🎓", label: "Complete a trainer module", done: Object.keys(s.modulesDone).length > snap.modules,
      go: () => goto("trainer") },
    { icon: "⚔️", label: "Stretch game vs Coach Nova", done: s.gamesPlayed > snap.played,
      go: () => { goto("play"); } },
  ];
}

function renderPlan() {
  const steps = planSteps();
  $("today-plan").innerHTML = "<h3>🗺 Today's plan</h3>" + steps.map((st, i) =>
    `<button class="plan-step ${st.done ? "done" : ""}" data-plan="${i}">
      <span>${st.done ? "✅" : st.icon}</span><span>${st.label}</span><span class="muted">${st.done ? "" : "→"}</span>
    </button>`).join("");
  $("today-plan").querySelectorAll(".plan-step").forEach((el) =>
    el.addEventListener("click", () => { sfx.click(); steps[+el.dataset.plan].go(); }));
  if (steps.every((s) => s.done) && localStorage.getItem("cq_plan_done") !== today()) {
    localStorage.setItem("cq_plan_done", today());
    addXp(80, "daily plan complete");
    confetti("gold");
    toast("🗺 Today's plan complete! +80 XP — you got better today.", "ach");
  }
}

// ---- home ----
function renderHome() {
  const s = state();
  const hour = new Date().getHours();
  const name = s.profile.name && s.profile.name !== "Player" ? s.profile.name : null;
  const base = hour < 5 ? "Night owl" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("greeting").textContent = `${base}${name ? ", " + name : ""} — ready to train?`;
  const lvl = levelForXp(s.xp);
  $("level-title").textContent = levelTitle(lvl);
  $("daily-summary").textContent =
    `Level ${lvl} · ${s.xp} XP · ${s.streak}-day streak · ${s.puzzlesSolved} puzzles · ${s.gamesWon} bot wins`;
  renderPlan();
  renderQuests();

  $("home-puzzle-elo").textContent = s.puzzleElo;
  $("home-game-elo").textContent = s.gameElo;
  $("home-puzzle-sub").textContent = `peak ${s.peakPuzzleElo} · best streak ${s.bestPuzzleStreak} · rush best ${s.rushBest}`;
  $("home-game-sub").textContent = `${s.gamesWon}W of ${s.gamesPlayed} · peak ${s.peakGameElo}`;
  const done = Object.keys(s.modulesDone).length;
  $("home-modules").textContent = done;
  $("home-modules-sub").textContent = `of ${MODULES.length} modules`;
  const ring = $("trainer-ring");
  const C = 2 * Math.PI * 26;
  ring.style.strokeDasharray = `${(done / MODULES.length) * C} ${C}`;
  $("home-reviews").textContent = s.reviewsDone;

  $("ach-count").textContent = `${s.achievements.length}/${ACHIEVEMENTS.length}`;
  $("achievements-strip").innerHTML = ACHIEVEMENTS.slice(0, 30).map((a) => {
    const got = s.achievements.includes(a.id);
    return `<span class="tag" title="${a.name} — ${a.desc}" style="${got ? "" : "opacity:.3;filter:grayscale(1)"}">${a.icon} ${a.name}</span>`;
  }).join("");
  renderRecap();
}

function renderQuests() {
  const aq = quests();
  $("quests").innerHTML = "<h3>🎯 Daily quests</h3>" + aq.quests.map((q, i) => {
    const v = Math.min(q.n, q.target);
    return `<div class="quest ${q.done ? "done" : ""}">
      <span>${q.done ? "✅" : "⬜"} ${q.label}</span>
      <div class="quest-bar"><div class="quest-fill" style="width:${(v / q.target) * 100}%"></div></div>
      <span class="muted">${v}/${q.target}</span>
      ${!q.done && !aq.rerolled ? `<button class="btn mini quest-reroll" data-q="${i}" title="Swap this quest">🎲</button>` : ""}
    </div>`;
  }).join("");
  $("quests").querySelectorAll(".quest-reroll").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (rerollQuest(+b.dataset.q)) { sfx.click(); renderQuests(); }
    }));
}

function renderRecap() {
  const s = state();
  const card = $("recap-card");
  const log = s.dayLog;
  if (log.length < 2) { card.hidden = true; return; }
  const weekAgoIdx = log.findIndex((d) => d.date >= new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10));
  if (weekAgoIdx < 0 || weekAgoIdx === log.length - 1) { card.hidden = true; return; }
  const a = log[weekAgoIdx], b = log[log.length - 1];
  const dSolved = s.puzzlesSolved - a.solved;
  const dPlayed = s.gamesPlayed - a.played;
  const dElo = s.puzzleElo - a.puzzleElo;
  if (dSolved + dPlayed === 0) { card.hidden = true; return; }
  card.hidden = false;
  card.innerHTML = `<h3>📆 Last 7 days</h3>
    <p><b>${dSolved}</b> puzzles · <b>${dPlayed}</b> games ·
    puzzle rating <b class="${dElo >= 0 ? "up-text" : "down-text"}">${dElo >= 0 ? "+" : ""}${dElo}</b> ·
    ${Object.keys(s.modulesDone).length - a.modules} modules</p>`;
}

// ---- tips ticker ----
let tipIdx = Math.floor(Math.random() * TIPS.length);
function rotateTip() {
  const el = $("tip-text");
  el.style.opacity = "0";
  setTimeout(() => {
    tipIdx = (tipIdx + 1) % TIPS.length;
    el.textContent = TIPS[tipIdx];
    el.style.opacity = "1";
  }, 400);
}
$("tip-text").textContent = TIPS[tipIdx];
setInterval(rotateTip, 12000);
$("tip-ticker").addEventListener("click", rotateTip);

// ---- settings ----
const AVATARS = ["🦉", "🦊", "🐺", "🦁", "🐸", "🐙", "🦄", "🐲", "👑", "🥷", "🧙", "🤖", "😈", "🐴", "☕", "⚡"];

function openSettings() {
  const s = state();
  for (const k of ["boardTheme", "soundPack", "tonePack", "reviewDepth"]) $("set-" + k).value = s.settings[k];
  $("set-volume").value = s.settings.volume;
  for (const k of ["haptics", "animations", "oled", "showDots", "showCoords", "autoNext", "tutorMode", "evalBar"])
    $("set-" + k).checked = s.settings[k];
  $("set-name").value = s.profile.name;
  renderAvatarRow($("avatar-row"), s.profile.emoji);
  openModal("settings-modal");
}

function renderAvatarRow(host, current) {
  host.innerHTML = AVATARS.map((a) =>
    `<button class="avatar-choice ${a === current ? "sel" : ""}" data-a="${a}">${a}</button>`).join("");
  host.querySelectorAll(".avatar-choice").forEach((b) =>
    b.addEventListener("click", () => {
      state().profile.emoji = b.dataset.a;
      save();
      renderAvatarRow(host, b.dataset.a);
      renderTopbar();
      sfx.click();
    }));
}

for (const k of ["boardTheme", "soundPack", "tonePack", "reviewDepth"]) {
  $("set-" + k).addEventListener("change", (e) => { setSetting(k, e.target.value); applyVisualSettings(); });
}
$("set-volume").addEventListener("input", (e) => { setSetting("volume", +e.target.value); sfx.correct(); });
for (const k of ["haptics", "animations", "oled", "showDots", "showCoords", "autoNext", "tutorMode", "evalBar"]) {
  $("set-" + k).addEventListener("change", (e) => { setSetting(k, e.target.checked); applyVisualSettings(); });
}
$("set-name").addEventListener("change", (e) => {
  state().profile.name = e.target.value.trim() || "Player";
  save();
  renderHome();
});

function applyVisualSettings() {
  const s = state().settings;
  applyBoardSettings({ theme: s.boardTheme, showDots: s.showDots, showCoords: s.showCoords, animate: s.animations });
  document.documentElement.classList.toggle("oled", s.oled);
  $("game-eval-wrap").hidden = !s.evalBar;
}

$("btn-export-save").addEventListener("click", () => {
  const blob = new Blob([exportSave()], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `chessquest-save-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("⬇️ Save exported — keep it somewhere safe.");
});
$("btn-import-save").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    importSave(await f.text());
    toast("⬆️ Save imported! Reloading…");
    setTimeout(() => location.reload(), 900);
  } catch (err) {
    toast("❌ That file isn't a ChessQuest save. " + err.message, "bad");
  }
});
$("btn-reset").addEventListener("click", () => {
  if (confirm("Reset ALL progress? This cannot be undone. Export a save first if unsure.")) {
    localStorage.clear();
    location.reload();
  }
});

// ---- achievements gallery ----
$("btn-ach-gallery").addEventListener("click", () => { renderAchGallery(); openModal("ach-modal"); });
function renderAchGallery() {
  const s = state();
  $("ach-modal-count").textContent = `${s.achievements.length}/${ACHIEVEMENTS.length}`;
  $("ach-gallery").innerHTML = ACHIEVEMENTS.map((a) => {
    const got = s.achievements.includes(a.id);
    return `<div class="ach-card ${got ? "" : "locked"}">
      <div class="ach-icon">${got ? a.icon : "🔒"}</div>
      <b>${a.name}</b>
      <span class="muted">${a.desc}</span>
    </div>`;
  }).join("");
}

// ---- stats ----
$("btn-stats").addEventListener("click", () => { renderStats(); openModal("stats-modal"); });
function renderStats() {
  const s = state();
  const hrs = (s.timeTrainedMs / 36e5).toFixed(1);
  const fav = Object.entries(s.themeStats).sort((a, b) => (b[1].ok + b[1].fail) - (a[1].ok + a[1].fail))[0];
  const purity = s.puzzlesSolved ? Math.round((s.noHintSolves / s.puzzlesSolved) * 100) : 0;
  const cells = [
    [s.puzzlesSolved, "puzzles solved"], [purity + "%", "hint-free"],
    [s.hardestSolve || "—", "hardest solve"], [s.peakPuzzleElo, "peak puzzle rating"],
    [s.gamesPlayed, "games played"], [s.peakGameElo, "peak game rating"],
    [s.movesPlayed, "moves played"], [hrs + "h", "time trained"],
    [s.rushBest, "rush best"], [s.dailyPuzzle.streak, "daily streak"],
    [Object.values(s.modulesDone).reduce((a, b) => a + b, 0) + "★", "stars earned"],
    [fav ? fav[0] : "—", "most-trained theme"],
  ];
  $("stats-grid").innerHTML = cells.map(([v, l]) =>
    `<div class="stat-cell"><b>${v}</b><span class="muted">${l}</span></div>`).join("");
}

// ---- share card ----
$("btn-share").addEventListener("click", () => { drawShareCard(); openModal("share-modal"); });
function drawShareCard() {
  const s = state();
  const c = $("share-canvas"), x = c.getContext("2d");
  const grad = x.createLinearGradient(0, 0, 0, 340);
  grad.addColorStop(0, "#241f33"); grad.addColorStop(1, "#191722");
  x.fillStyle = grad; x.fillRect(0, 0, 600, 340);
  x.fillStyle = "#f0b429"; x.font = "bold 30px system-ui";
  x.fillText("♞ ChessQuest", 32, 52);
  x.fillStyle = "#fff"; x.font = "bold 26px system-ui";
  x.fillText(`${s.profile.emoji} ${s.profile.name} — ${levelTitle(levelForXp(s.xp))}`, 32, 108);
  x.font = "17px system-ui"; x.fillStyle = "rgba(255,255,255,.85)";
  const lines = [
    `🧩 Puzzle rating ${s.puzzleElo}  (peak ${s.peakPuzzleElo})`,
    `⚔️ Game rating ${s.gameElo} · ${s.gamesWon} bot wins`,
    `🔥 ${s.streak}-day streak · 🌀 rush best ${s.rushBest}`,
    `🎓 ${Object.keys(s.modulesDone).length} modules · 🏆 ${s.achievements.length} achievements`,
  ];
  lines.forEach((l, i) => x.fillText(l, 32, 160 + i * 36));
  x.fillStyle = "rgba(255,255,255,.4)"; x.font = "13px system-ui";
  x.fillText(new Date().toDateString(), 32, 316);
}
$("btn-share-download").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = $("share-canvas").toDataURL("image/png");
  a.download = "chessquest-progress.png";
  a.click();
});
if (navigator.share) {
  $("btn-share-native").hidden = false;
  $("btn-share-native").addEventListener("click", async () => {
    const blob = await new Promise((r) => $("share-canvas").toBlob(r));
    try {
      await navigator.share({ files: [new File([blob], "chessquest.png", { type: "image/png" })], title: "My ChessQuest progress" });
    } catch { /* user cancelled */ }
  });
}

// ---- onboarding + calibration ----
function maybeOnboard() {
  if (state().onboarded) return;
  renderAvatarRow($("onboard-avatars"), state().profile.emoji);
  openModal("onboard-modal");
  $("btn-onboard-next").addEventListener("click", () => {
    state().profile.name = $("onboard-name").value.trim() || "Player";
    save();
    $("onboard-step-1").hidden = true;
    $("onboard-step-2").hidden = false;
  });
  $("btn-onboard-skip").addEventListener("click", () => finishOnboard(false));
  $("btn-onboard-calibrate").addEventListener("click", () => finishOnboard(true));
}

let calibration = null;
function finishOnboard(calibrate) {
  state().onboarded = true;
  save();
  closeModal("onboard-modal");
  renderHome(); renderTopbar();
  if (calibrate) {
    calibration = { results: [] };
    goto("puzzles");
    toast("📏 Calibration: 3 puzzles. Just do your best.");
  } else {
    toast(`Welcome, ${state().profile.name}! Starting rating: 800. Go get 'em.`);
  }
}

onChange((evt) => {
  if (calibration && evt.type === "puzzleElo") {
    calibration.results.push(evt.delta > 0);
    if (calibration.results.length >= 3) {
      const wins = calibration.results.filter(Boolean).length;
      const est = Math.max(500, Math.min(1600, 700 + wins * 175));
      const s = state();
      s.puzzleElo = est;
      s.peakPuzzleElo = Math.max(s.peakPuzzleElo, est);
      s.gameElo = Math.max(400, est - 100);
      calibration = null;
      save();
      renderTopbar();
      confetti("gold");
      toast(`📏 Calibrated! Starting ratings — puzzles: ${est}, games: ${Math.max(400, est - 100)}.`, "ach");
    }
  }
});

// ---- state event reactions ----
onChange((evt) => {
  renderTopbar();
  if (evt.type === "levelup") {
    toast(`⭐ Level ${evt.level} — ${evt.title}!`, "ach");
    confetti("stars");
  } else if (evt.type === "achievement") {
    toast(`🏆 ${evt.achievement.icon} ${evt.achievement.name} — ${evt.achievement.desc}`, "ach");
  } else if (evt.type === "questsComplete") {
    toast("🎯 All daily quests complete! +100 XP", "ach");
    confetti("gold");
  } else if (evt.type === "questDone") {
    toast(`🎯 Quest done: ${evt.quest.label} (+${evt.quest.xp} XP)`);
  } else if (evt.type === "freezeEarned") {
    toast("❄️ Streak freeze earned — an off day won't break your streak.");
  } else if (evt.type === "freezeUsed") {
    toast("❄️ A streak freeze saved your streak. Welcome back!");
  } else if (evt.type === "puzzleElo" && evt.milestone) {
    // handled by puzzles.js with confetti; topbar already refreshed
  }
  if (currentView === "home") renderHome();
});

// ---- audio unlock on first gesture (iOS requirement) ----
["pointerdown", "touchend", "keydown"].forEach((evt) =>
  document.addEventListener(evt, () => unlock(), { once: true, passive: true }));

// ---- time-trained accumulator ----
setInterval(() => {
  if (document.visibilityState === "visible") addTrainingTime(30000);
}, 30000);
window.addEventListener("pagehide", save);

// ---- boot ----
touchDaily();
puzzleMode.init({ toast, confetti });
playMode.init({ toast, confetti, worker, analysisWorker, gotoReview: (gameId) => goto("review", gameId) });
trainerMode.init({ toast, confetti, worker, showPattern, showWisdom });
reviewMode.init({
  toast, worker: analysisWorker,
  retryPosition: (fen, botElo) => { goto("play"); playMode.startFromPosition(fen, botElo); },
});
applyVisualSettings();
renderTopbar();
renderHome();
// a restored mid-game should greet the player, not hide behind the home tab
if (playMode.chess && !playMode.gameOver) goto("play");
maybeOnboard();
save();

// debug/test handle
window.__cq = { puzzleMode, playMode, trainerMode, reviewMode, state, goto };

// ---- PWA service worker + update toast ----
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController) toast("⬆️ ChessQuest updated — close and reopen for the newest version.");
    hadController = true;
  });
}
