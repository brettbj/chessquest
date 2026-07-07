// Play vs bots: 16 personalities + adaptive Coach Nova + Mystery Bot.
// Color choice, takebacks, hints, eval bar, table talk, opening book,
// material trays, clocks, rematch, draw offers, PGN, resume, records.

import { Chess } from "./vendor/chess.esm.js";
import { Board } from "./board.js";
import { sfx, moveSound } from "./sounds.js";
import { state, updateGameElo, addXp, track, checkAchievements, saveGame, touchDaily, save,
         recordBotResult, getSetting, firstWinBonusAvailable, claimFirstWinBonus } from "./state.js";
import { botChat, mysteryLine } from "./feedback.js";
import { OPENINGS } from "../data/openings.js";

const $ = (id) => document.getElementById(id);

export const BOTS = [
  { id: "pete",  name: "Pawn Pete",       elo: 350,  face: "🐣", persona: "rookie",   desc: "Learned the rules yesterday. Hangs everything." },
  { id: "rob",   name: "Rookie Rob",      elo: 500,  face: "🐶", persona: "rookie",   desc: "Enthusiastic. Occasionally remembers his queen exists." },
  { id: "wanda", name: "Wobbly Wanda",    elo: 650,  face: "🐢", persona: "zen",      desc: "Slow and unsteady. Beatable if you stay awake." },
  { id: "carl",  name: "Casual Carl",     elo: 800,  face: "🙂", persona: "cheerful", desc: "Plays on his lunch break. Knows one opening. Sort of." },
  { id: "beth",  name: "Bookworm Beth",   elo: 950,  face: "🤓", persona: "professor",desc: "Read half a chess book. The first half." },
  { id: "ed",    name: "Endgame Ed",      elo: 1000, face: "🧓", persona: "gruff",    desc: "Slow starter, but never stops grinding you down." },
  { id: "stan",  name: "Steady Stan",     elo: 1100, face: "🧢", persona: "gruff",    desc: "No fireworks, few blunders. Makes you earn it." },
  { id: "tina",  name: "Tricky Tina",     elo: 1250, face: "🦊", persona: "sly",      desc: "Loves a cheap trick. Don't fall for it." },
  { id: "chad",  name: "Club Chad",       elo: 1400, face: "♟️", persona: "cheerful", desc: "Your average club player. Respectable and stubborn." },
  { id: "sofia", name: "Sharp Sofia",     elo: 1550, face: "🗡️", persona: "sly",      desc: "Tactical and mean. Leave nothing hanging." },
  { id: "sam",   name: "Solid Sam",       elo: 1700, face: "🧱", persona: "gruff",    desc: "A wall. Breaks down only under real pressure." },
  { id: "ava",   name: "Attacking Ava",   elo: 1850, face: "🔥", persona: "menacing", desc: "Comes straight for your king. Defend precisely." },
  { id: "petra", name: "Positional Petra",elo: 2000, face: "🦉", persona: "professor",desc: "Squeezes you slowly. Death by a thousand pawn moves." },
  { id: "greg",  name: "Grinder Greg",    elo: 2150, face: "⚙️", persona: "gruff",    desc: "Never lets go of an advantage. Endgame surgeon." },
  { id: "miko",  name: "Master Miko",     elo: 2300, face: "🥋", persona: "zen",      desc: "Master strength. Bring your best chess." },
  { id: "tal",   name: "Titan Tal",       elo: 2400, face: "⚡", persona: "menacing", desc: "The final boss. Sacrifices will rain on your king." },
];

export const ADAPTIVE_BOT = {
  id: "nova", name: "Coach Nova", face: "🚀", persona: "cheerful", adaptive: true,
  desc: "Adapts to you: always plays just above your level so every game stretches you.",
};
export const MYSTERY_BOT = {
  id: "mystery", name: "Mystery Bot", face: "🎭", persona: "sly", mystery: true,
  desc: "Rating hidden. Beat it — or don't — then guess its strength for bonus XP.",
};

const NOVA_STYLES = [
  { key: "aggressive", label: "attacking mood", first: ["e4"] },
  { key: "positional", label: "positional mood", first: ["d4", "c4", "Nf3"] },
  { key: "classical", label: "classical mood", first: ["e4", "d4"] },
];

export function adaptiveElo() {
  return Math.min(2450, Math.max(400, state().gameElo + 75));
}

// ---- opening book (built from the openings database) -------------------------
const BOOK = new Map(); // "e4 e5" -> [next SANs]
for (const op of OPENINGS) {
  for (let i = 0; i < op.moves.length; i++) {
    const key = op.moves.slice(0, i).join(" ");
    const arr = BOOK.get(key) || [];
    if (!arr.includes(op.moves[i])) arr.push(op.moves[i]);
    BOOK.set(key, arr);
  }
}

const PIECE_VAL = { p: 1, n: 3, b: 3, r: 5, q: 9 };
const START_COUNTS = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };

export const playMode = {
  board: null,
  chess: null,
  bot: null,
  playerColor: "w",
  gameOver: true,
  pendingId: 0,

  init({ toast, confetti, worker, analysisWorker, gotoReview }) {
    this.toast = toast;
    this.confetti = confetti;
    this.worker = worker;
    this.analysisWorker = analysisWorker;
    this.gotoReview = gotoReview;
    this.board = new Board($("game-board"), {
      onUserMove: (f, t, p) => this.onUserMove(f, t, p),
      canMove: () => !this.gameOver && this.chess && this.chess.turn() === this.playerColor && !this.botThinking,
    });
    worker.addEventListener("message", (e) => {
      const m = e.data;
      if (m.type === "botmove" && m.id === this.pendingId) this.onBotMove(m);
    });
    analysisWorker.addEventListener("message", (e) => {
      const m = e.data;
      if (m.type === "analysis" && typeof m.id === "string" && m.id.startsWith("ghint")) this.onHintResult(m);
    });
    $("btn-game-resign").addEventListener("click", () => this.resign());
    $("btn-game-new").addEventListener("click", () => { this.abandonLive(); this.showSelect(); });
    $("btn-game-review").addEventListener("click", () => { if (this.savedId) this.gotoReview(this.savedId); });
    $("btn-game-takeback").addEventListener("click", () => this.takeback());
    $("btn-game-hint").addEventListener("click", () => this.gameHint());
    $("btn-game-draw").addEventListener("click", () => this.offerDraw());
    $("btn-game-rematch").addEventListener("click", () => this.rematch());
    $("btn-game-pgn").addEventListener("click", () => this.copyPgn());
    $("btn-mystery-guess").addEventListener("click", () => this.mysteryGuess());
    $("mystery-slider").addEventListener("input", (e) => { $("mystery-guess-val").textContent = e.target.value; });
    // color chooser
    document.querySelectorAll("#color-select .color-btn").forEach((b) =>
      b.addEventListener("click", () => {
        $("color-select").hidden = true;
        const c = b.dataset.color === "random" ? (Math.random() < 0.5 ? "w" : "b") : b.dataset.color;
        this.startGame(this.pendingBotId, c);
      }));
    $("btn-color-cancel").addEventListener("click", () => { $("color-select").hidden = true; });
    this.renderBotGrid();
    this.tryResume();
  },

  enter() {
    if (this.gameOver) this.renderBotGrid();
  },

  // ---- roster --------------------------------------------------------------

  renderBotGrid() {
    const grid = $("bot-grid");
    const s = state();
    const cards = [ADAPTIVE_BOT, MYSTERY_BOT, ...BOTS].map((b) => {
      const elo = b.adaptive ? "~" + adaptiveElo() : b.mystery ? "???" : b.elo;
      const rec = s.botRecords[b.id];
      const recTxt = rec ? `${rec.w}W ${rec.l}L ${rec.d}D${rec.streak >= 2 ? " · 🔥" + rec.streak : ""}` : "";
      return `<div class="bot-card ${b.adaptive ? "adaptive" : ""} ${s.botsBeaten.includes(b.id) ? "beaten" : ""}" data-bot="${b.id}">
        <div class="bot-face">${b.face}</div>
        <div class="bot-name">${b.name}</div>
        <div class="bot-elo">${elo}</div>
        <div class="bot-desc">${b.desc}</div>
        ${recTxt ? `<div class="muted bot-rec">${recTxt}</div>` : ""}
      </div>`;
    }).join("");
    grid.innerHTML = cards;
    grid.querySelectorAll(".bot-card").forEach((el) =>
      el.addEventListener("click", () => {
        sfx.click();
        this.pendingBotId = el.dataset.bot;
        const b = this.botById(el.dataset.bot);
        $("color-select-title").textContent = `Play ${b.name} as…`;
        $("color-select").hidden = false;
      }));
  },

  botById(id) {
    if (id === "nova") return { ...ADAPTIVE_BOT, elo: adaptiveElo() };
    if (id === "mystery") {
      const elo = 400 + Math.round(Math.random() * 80) * 25; // 400..2400
      return { ...MYSTERY_BOT, elo };
    }
    return BOTS.find((b) => b.id === id);
  },

  showSelect() {
    $("bot-select").hidden = false;
    $("game-area").hidden = true;
    this.renderBotGrid();
  },

  // ---- game lifecycle ---------------------------------------------------------

  startGame(botId, color, opts = {}) {
    this.bot = opts.bot || this.botById(botId);
    if (this.bot.adaptive) {
      const idx = (+localStorage.getItem("cq_nova_style") || 0) % NOVA_STYLES.length;
      localStorage.setItem("cq_nova_style", idx + 1);
      this.novaStyle = NOVA_STYLES[idx];
    } else this.novaStyle = null;
    this.startFen = opts.fen || null;
    this.chess = opts.fen ? new Chess(opts.fen) : new Chess();
    this.playerColor = color;
    this.gameOver = false;
    this.savedId = null;
    this.botThinking = false;
    this.takebacks = 3;
    this.takebackUsed = false;
    this.hintsLeft = 3;
    this.startTime = Date.now();
    this.lastBotScore = null;
    this.resignPleaded = false;
    sfx.click();
    $("bot-select").hidden = true;
    $("game-area").hidden = false;
    window.scrollTo(0, 0);
    document.getElementById("views").scrollTop = 0;
    if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
    $("game-result-card").hidden = true;
    $("mystery-guess-card").hidden = true;
    $("btn-game-review").hidden = true;
    $("btn-game-rematch").hidden = true;
    $("btn-game-pgn").hidden = true;
    for (const b of ["btn-game-resign", "btn-game-takeback", "btn-game-hint", "btn-game-draw"]) $(b).hidden = false;
    $("takeback-count").textContent = this.takebacks;
    $("gamehint-count").textContent = this.hintsLeft;
    $("game-bot-face").textContent = this.bot.face;
    $("game-bot-name").textContent = this.bot.name + (this.novaStyle ? ` (${this.novaStyle.label})` : "");
    $("game-bot-elo").textContent = " " + (this.bot.mystery ? "???" : this.bot.elo);
    $("you-emoji").textContent = state().profile.emoji;
    $("you-name").textContent = state().profile.name || "You";
    $("game-you-elo").textContent = " " + state().gameElo;
    $("game-moves").innerHTML = "";
    $("game-opening").textContent = "";
    $("game-eval-wrap").hidden = !getSetting("evalBar");
    $("game-eval-fill").style.height = "50%";
    this.board.setGame(this.chess);
    this.board.setOrientation(this.playerColor);
    this.board.setLastMove(null);
    this.board.sync(undefined, undefined, { animate: false });
    this.renderTrays();
    this.startClock();
    // rebuild move list when resuming
    for (const [i, san] of (this.chess.history() || []).entries()) this.pushMoveList(san, i + 1);
    this.setStatus(this.chess.turn() === this.playerColor ? "Your move" : "…");
    if (!opts.resumed) {
      this.speak(this.bot.mystery ? mysteryLine("intro") : botChat("greeting", this.bot.persona));
      this.persistLive(); // during resume the caller replays moves first, then persists
    }
    if (this.chess.turn() !== this.playerColor) this.requestBotMove();
  },

  startFromPosition(fen, targetElo) {
    // pick the fixed bot closest to the given strength
    const bot = BOTS.reduce((a, b) => Math.abs(b.elo - targetElo) < Math.abs(a.elo - targetElo) ? b : a);
    const color = fen.split(" ")[1] === "w" ? "w" : "b";
    this.startGame(bot.id, color, { fen, bot });
    this.toast(`🎮 Retry vs ${bot.name} — find the better path this time.`);
  },

  rematch() {
    const swap = this.playerColor === "w" ? "b" : "w";
    // fresh elo roll for mystery, fresh adaptive target for nova
    this.startGame(this.bot.id, swap);
  },

  tryResume() {
    const lg = state().liveGame;
    if (!lg || !lg.moves) return;
    try {
      const bot = lg.botId === "mystery"
        ? { ...MYSTERY_BOT, elo: lg.botElo }
        : lg.botId === "nova" ? { ...ADAPTIVE_BOT, elo: lg.botElo } : this.botById(lg.botId);
      this.startGame(lg.botId, lg.playerColor, { bot, fen: lg.startFen || undefined, resumed: true });
      for (const san of lg.moves) this.chess.move(san);
      this.takebacks = lg.takebacks; this.takebackUsed = lg.takebackUsed; this.hintsLeft = lg.hintsLeft;
      $("takeback-count").textContent = this.takebacks;
      $("gamehint-count").textContent = this.hintsLeft;
      $("game-moves").innerHTML = "";
      this.chess.history().forEach((san, i) => this.pushMoveList(san, i + 1));
      this.board.sync(undefined, undefined, { animate: false });
      this.renderTrays();
      this.updateOpeningLabel();
      this.setStatus(this.chess.turn() === this.playerColor ? "Your move — game restored" : "…");
      this.persistLive();
      this.toast("♻️ Game restored — you were mid-battle.");
      if (this.chess.turn() !== this.playerColor && !this.chess.isGameOver()) this.requestBotMove();
    } catch {
      state().liveGame = null; save();
      this.showSelect();
    }
  },

  persistLive() {
    if (this.gameOver) { state().liveGame = null; }
    else {
      state().liveGame = {
        botId: this.bot.id, botElo: this.bot.elo, playerColor: this.playerColor,
        startFen: this.startFen, moves: this.chess.history(),
        takebacks: this.takebacks, takebackUsed: this.takebackUsed, hintsLeft: this.hintsLeft,
      };
    }
    save();
  },

  abandonLive() {
    if (!this.gameOver && this.chess && this.chess.history().length > 0) {
      // leaving mid-game keeps it resumable; do nothing
    }
  },

  // ---- moves --------------------------------------------------------------------

  onUserMove(from, to, promotion) {
    const mv = this.chess.move({ from, to, promotion });
    if (!mv) return;
    state().movesPlayed++;
    moveSound(mv, this.chess.inCheck());
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    this.pushMoveList(mv.san, this.chess.history().length);
    this.renderTrays();
    this.updateOpeningLabel();
    if (mv.captured && Math.random() < 0.3) this.speak(botChat("gotCaptured", this.bot.persona));
    this.persistLive();
    if (this.checkEnd()) return;
    this.requestBotMove();
  },

  bookMove() {
    if (this.startFen) return null;
    const hist = this.chess.history();
    const bookDepth = Math.max(2, Math.min(12, Math.round(this.bot.elo / 250)));
    if (hist.length >= bookDepth) return null;
    let options = BOOK.get(hist.join(" "));
    if (!options || !options.length) return null;
    // Nova's style narrows the very first move
    if (this.novaStyle && hist.length === 0) {
      const styled = options.filter((m) => this.novaStyle.first.includes(m));
      if (styled.length) options = styled;
    }
    return options[Math.floor(Math.random() * options.length)];
  },

  requestBotMove() {
    if (this.gameOver) return;
    this.botThinking = true;
    $("game-bot-thinking").hidden = false;
    this.setStatus("…");
    const book = this.bookMove();
    if (book) {
      setTimeout(() => {
        if (this.gameOver) return;
        const mv = this.chess.move(book);
        this.botThinking = false;
        $("game-bot-thinking").hidden = true;
        if (!mv) { this.requestEngineMove(); return; }
        this.afterBotMove(mv, null);
      }, 500 + Math.random() * 600);
      return;
    }
    this.requestEngineMove();
  },

  requestEngineMove() {
    this.pendingId++;
    this.thinkStart = Date.now();
    this.worker.postMessage({ type: "botmove", fen: this.chess.fen(), elo: this.bot.elo, id: this.pendingId });
  },

  onBotMove(m) {
    const apply = () => {
      $("game-bot-thinking").hidden = true;
      this.botThinking = false;
      if (this.gameOver || !m.uci) return;
      const mv = this.chess.move({ from: m.uci.slice(0, 2), to: m.uci.slice(2, 4), promotion: m.uci[4] });
      if (!mv) return;
      this.afterBotMove(mv, m.score ?? null);
    };
    const elapsed = Date.now() - this.thinkStart;
    const floor = 400 + Math.random() * 900;
    setTimeout(apply, Math.max(0, floor - elapsed));
  },

  afterBotMove(mv, botScore) {
    moveSound(mv, this.chess.inCheck());
    this.board.sync(mv.from, mv.to, { captured: !!mv.captured });
    this.pushMoveList(mv.san, this.chess.history().length);
    this.renderTrays();
    this.updateOpeningLabel();
    this.persistLive();
    // table talk + eval bar from the engine's own evaluation (free data)
    if (botScore !== null) {
      const prev = this.lastBotScore;
      this.lastBotScore = botScore;
      this.updateEvalBar(botScore);
      if (botScore > 350 && (prev === null || prev < 120) && Math.random() < 0.8)
        this.speak(botChat("playerBlunder", this.bot.persona));
      else if (botScore < -900 && !this.resignPleaded) {
        this.resignPleaded = true;
        this.speak(botChat("resignPlea", this.bot.persona));
      } else if (botScore < -400 && Math.random() < 0.15)
        this.speak(botChat("botLosing", this.bot.persona));
      else if (this.chess.inCheck() && Math.random() < 0.5)
        this.speak(botChat("check", this.bot.persona));
      else if (mv.captured && Math.random() < 0.3)
        this.speak(botChat("capture", this.bot.persona));
    }
    if (!this.checkEnd()) {
      this.setStatus("Your move");
      this.maybeTutorWarn();
    }
  },

  updateEvalBar(botScore) {
    if (!getSetting("evalBar")) return;
    const botIsWhite = this.playerColor === "b";
    const whiteCp = botIsWhite ? botScore : -botScore;
    const pct = 100 / (1 + Math.exp(-0.00368 * Math.max(-3000, Math.min(3000, whiteCp))));
    $("game-eval-fill").style.height = pct.toFixed(1) + "%";
  },

  // gentle hang-warning after the bot starts thinking (tutor mode)
  maybeTutorWarn() {
    if (!getSetting("tutorMode") || this.gameOver) return;
    // the last bot score is from the bot's perspective — if it jumped very
    // positive the player's previous move was likely a blunder; warn next time.
    // Live pre-move warning: check whether the player's last-moved piece is
    // now attacked by a cheaper piece and insufficiently defended (cheap heuristic).
    const hist = this.chess.history({ verbose: true });
    const last = hist[hist.length - 2]; // player's move (bot just replied)
    if (!last || last.color !== this.playerColor) return;
    const targetSq = last.to;
    const piece = this.chess.get(targetSq);
    if (!piece || piece.color !== this.playerColor) return;
    const attackers = this.chess.moves({ verbose: true })
      .filter((m) => m.to === targetSq && m.captured);
    const cheap = attackers.some((a) => (PIECE_VAL[a.piece] || 0) < (PIECE_VAL[piece.type] || 0));
    if (cheap) this.toast(`⚠️ Careful — your ${PIECE_NAME[piece.type]} on ${targetSq} can be taken cheaply.`);
  },

  // ---- player tools -------------------------------------------------------------

  takeback() {
    if (this.gameOver || this.takebacks <= 0 || this.botThinking) return;
    const hist = this.chess.history();
    if (hist.length < 2 || this.chess.turn() !== this.playerColor) return;
    this.chess.undo(); this.chess.undo();
    this.takebacks--;
    this.takebackUsed = true;
    $("takeback-count").textContent = this.takebacks;
    sfx.click();
    const last = this.chess.history({ verbose: true }).pop();
    this.board.sync(last?.from, last?.to, { animate: false });
    this.rebuildMoveList();
    this.renderTrays();
    this.speak(botChat("takeback", this.bot.persona));
    this.persistLive();
  },

  gameHint() {
    if (this.gameOver || this.hintsLeft <= 0 || this.chess.turn() !== this.playerColor) return;
    this.hintsLeft--;
    $("gamehint-count").textContent = this.hintsLeft;
    addXp(-5, "game hint");
    sfx.click();
    this.analysisWorker.postMessage({ type: "analyse", id: "ghint" + Date.now(), fens: [this.chess.fen()], depth: 4, timeMs: 1500 });
    this.setStatus("Coach is looking…");
  },

  onHintResult(m) {
    if (this.gameOver || !m.bestUci) return;
    this.board.addArrow(m.bestUci.slice(0, 2), m.bestUci.slice(2, 4), "best");
    this.setStatus("Coach suggests the arrow. Your move.");
  },

  offerDraw() {
    if (this.gameOver || this.botThinking) return;
    const s = this.lastBotScore;
    sfx.click();
    if (s !== null && Math.abs(s) <= 60 && this.chess.history().length >= 20) {
      this.endGame(0.5, "Draw agreed. A fair fight.");
    } else {
      this.speak(botChat(s !== null && s > 0 ? "botWinning" : "botLosing", this.bot.persona));
      this.toast("🤝 Draw declined.");
    }
  },

  copyPgn() {
    const headers = [
      ["Event", "ChessQuest training game"],
      ["Site", "ChessQuest"],
      ["Date", new Date().toISOString().slice(0, 10).replaceAll("-", ".")],
      ["White", this.playerColor === "w" ? state().profile.name : this.bot.name],
      ["Black", this.playerColor === "b" ? state().profile.name : this.bot.name],
    ];
    for (const [k, v] of headers) this.chess.header(k, v);
    const pgn = this.chess.pgn();
    (navigator.clipboard?.writeText(pgn) || Promise.reject())
      .then(() => this.toast("📋 PGN copied"))
      .catch(() => {
        const ta = document.createElement("textarea");
        ta.value = pgn; document.body.appendChild(ta); ta.select();
        document.execCommand("copy"); ta.remove();
        this.toast("📋 PGN copied");
      });
  },

  mysteryGuess() {
    const guess = +$("mystery-slider").value;
    $("mystery-guess-card").hidden = true;
    const real = this.bot.elo;
    if (Math.abs(guess - real) <= 200) {
      state().mysteryRight++;
      addXp(60, "mystery guess");
      this.confetti();
      this.toast(`🎭 ${mysteryLine("guessRight")} It was ${real}.`, "ach");
    } else {
      this.toast(`🎭 ${mysteryLine("guessWrong")} It was ${real} (you said ${guess}).`);
    }
    checkAchievements();
    save();
  },

  // ---- UI helpers -----------------------------------------------------------------

  speak(text) {
    if (!text) return;
    const el = $("bot-chat");
    el.textContent = `${this.bot.face} ${text}`;
    el.hidden = false;
    clearTimeout(this._chatT);
    this._chatT = setTimeout(() => { el.hidden = true; }, 4200);
  },

  startClock() {
    clearInterval(this._clockT);
    this._clockT = setInterval(() => {
      if (this.gameOver) { clearInterval(this._clockT); return; }
      const s = Math.floor((Date.now() - this.startTime) / 1000);
      $("game-clock").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    }, 1000);
  },

  updateOpeningLabel() {
    if (this.startFen) return;
    const hist = this.chess.history();
    // longest shared prefix with any known line — shows the name even while
    // the game is still inside a longer book line
    let best = null;
    for (const op of OPENINGS) {
      let n = 0;
      while (n < op.moves.length && n < hist.length && op.moves[n] === hist[n]) n++;
      if (n >= 2 && (!best || n > best.n)) best = { n, name: op.name };
    }
    if (best) $("game-opening").textContent = "📖 " + best.name.split(":")[0];
  },

  renderTrays() {
    // captured = start counts minus what's on the board (relative to start position)
    if (this.startFen) { $("tray-top").innerHTML = ""; $("tray-bottom").innerHTML = ""; return; }
    const counts = { w: { ...START_COUNTS }, b: { ...START_COUNTS } };
    for (const row of this.chess.board())
      for (const cell of row)
        if (cell) counts[cell.color][cell.type]--;
    const capturedBy = (color) => { // pieces COLOR has captured = opponent's missing
      const opp = color === "w" ? "b" : "w";
      const out = [];
      let pts = 0;
      for (const t of ["q", "r", "b", "n", "p"])
        for (let i = 0; i < counts[opp][t]; i++) { out.push({ t, c: opp }); pts += PIECE_VAL[t]; }
      return { out, pts };
    };
    const mine = capturedBy(this.playerColor);
    const theirs = capturedBy(this.playerColor === "w" ? "b" : "w");
    const render = (host, cap, diff) => {
      host.innerHTML = cap.out.map((p) =>
        `<img src="assets/pieces/${p.t}${p.c === "w" ? "l" : "d"}.svg" alt="">`).join("") +
        (diff > 0 ? `<span class="tray-score">+${diff}</span>` : "");
    };
    render($("tray-bottom"), mine, mine.pts - theirs.pts);
    render($("tray-top"), theirs, theirs.pts - mine.pts);
  },

  pushMoveList(san, n) {
    const list = $("game-moves");
    if (n % 2 === 1) {
      const numEl = document.createElement("span");
      numEl.className = "mv num";
      numEl.textContent = Math.ceil(n / 2) + ".";
      list.appendChild(numEl);
    }
    const el = document.createElement("span");
    el.className = "mv";
    el.textContent = san;
    list.appendChild(el);
    list.scrollTop = list.scrollHeight;
  },

  rebuildMoveList() {
    $("game-moves").innerHTML = "";
    this.chess.history().forEach((san, i) => this.pushMoveList(san, i + 1));
  },

  // ---- ending ------------------------------------------------------------------

  checkEnd() {
    const c = this.chess;
    if (!c.isGameOver()) return false;
    let result, text;
    if (c.isCheckmate()) {
      const winnerIsPlayer = c.turn() !== this.playerColor;
      result = winnerIsPlayer ? 1 : 0;
      text = winnerIsPlayer ? "Checkmate — you win! 🎉" : "Checkmate — " + this.bot.name + " wins.";
    } else {
      result = 0.5;
      text = c.isStalemate() ? "Stalemate — draw." :
             c.isThreefoldRepetition() ? "Draw by repetition." :
             c.isInsufficientMaterial() ? "Draw — insufficient material." : "Draw by fifty-move rule.";
    }
    this.endGame(result, text);
    return true;
  },

  resign() {
    if (this.gameOver || !this.chess || this.chess.history().length === 0) { this.showSelect(); return; }
    this.endGame(0, "You resigned. " + this.bot.name + " takes it.");
  },

  endGame(result, text) {
    this.gameOver = true;
    clearInterval(this._clockT);
    touchDaily();
    state().liveGame = null;
    const isCustom = !!this.startFen;
    const delta = isCustom ? 0 : updateGameElo(this.bot.elo, result);
    const s = state();
    if (!isCustom) recordBotResult(this.bot.id, result);
    let xpNote = "";
    if (result === 1) {
      sfx.win();
      this.confetti("win");
      if (!s.botsBeaten.includes(this.bot.id)) s.botsBeaten.push(this.bot.id);
      checkAchievements({ beatElo: this.bot.elo });
      let xp = 40 + Math.round(this.bot.elo / 40);
      if (!isCustom && firstWinBonusAvailable()) {
        claimFirstWinBonus();
        xp *= 2;
        xpNote = " — first win of the day, double XP!";
        this.toast("🌅 First win of the day: 2× XP!", "ach");
      }
      addXp(xp, "game win");
      if (this.playerColor === "b") { s.gamesWonAsBlack++; track("gameWonAsBlack"); }
      track("gameWon");
      if (!this.takebackUsed) track("takebackFreeWin");
      this.speak(botChat("loss", this.bot.persona));
    } else if (result === 0) {
      sfx.lose();
      addXp(10, "game played");
      this.speak(botChat("win", this.bot.persona));
    } else {
      sfx.draw();
      addXp(20, "draw");
      this.speak(botChat("draw", this.bot.persona));
    }
    track("gamePlayed");
    checkAchievements();
    save();
    const card = $("game-result-card");
    card.hidden = false;
    card.className = "card result-card " + (result === 1 ? "win" : result === 0 ? "loss" : "draw");
    card.innerHTML = `<h2>${result === 1 ? "Victory!" : result === 0 ? "Defeat" : "Draw"}</h2>
      <p>${text}${xpNote}</p>
      ${isCustom ? '<p class="muted">Practice position — unrated.</p>'
        : `<p class="delta-banner ${delta >= 0 ? "up" : "down"}">${delta >= 0 ? "+" : ""}${delta} rating</p>`}`;
    this.setStatus(text, result === 1 ? "good" : result === 0 ? "bad" : "");
    for (const b of ["btn-game-resign", "btn-game-takeback", "btn-game-hint", "btn-game-draw"]) $(b).hidden = true;
    $("btn-game-rematch").hidden = false;
    $("btn-game-pgn").hidden = false;
    if (this.bot.mystery) $("mystery-guess-card").hidden = false;
    // save for review (standard-start games only)
    if (!isCustom && this.chess.history().length >= 4) {
      this.savedId = saveGame({
        moves: this.chess.history(),
        playerColor: this.playerColor,
        botName: this.bot.name,
        botFace: this.bot.face,
        botElo: this.bot.elo,
        result,
        date: new Date().toISOString(),
      });
      $("btn-game-review").hidden = false;
      this.toast("🔍 Game saved — tap Review for the full coaching breakdown.");
    }
    this.persistLive();
  },

  setStatus(text, cls) {
    const el = $("game-status");
    el.textContent = text;
    el.className = "turn-banner " + (cls || "");
  },
};

const PIECE_NAME = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
