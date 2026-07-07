# ♞ ChessQuest

A gamified chess training app — rated puzzles, an Elo ladder of bots, ~280 trainer
modules, and move-by-move game review with a coach that never repeats itself.
Built as an offline-capable PWA: one codebase, installs like a native app on
**macOS and iOS**.

## Features

- **🧩 Rated puzzles** — 2,698 real Lichess puzzles (400–2800). You have a puzzle
  Elo that rises and falls with real K-32 Elo math; puzzles are always served near
  your level. Streaks, rating chart, hints, theme tags.
- **🤖 Play bots** — 16 personalities from Pawn Pete (350) to Titan Tal (2400),
  plus **Coach Nova**, an adaptive bot that always plays ~75 points above your
  current game rating so every game stretches you. Powered by a built-in
  alpha-beta engine whose move choice is Elo-calibrated (weak bots make *human*
  mistakes, not random ones).
- **🎓 Trainer, 279 modules** — 143 opening lines (guided learn phase, then play
  the line from memory for stars), 92 tactics modules (23 themes × 4 difficulty
  tiers with tier unlocking), 20 checkmate-pattern modules, 24 endgame modules.
- **🔍 Game review** — every bot game is saved; the engine evaluates each move
  (depth 4 + quiescence, in a Web Worker), classifies it
  (Brilliant/Great/Best/Good/Book/Inaccuracy/Mistake/Blunder/Missed win), shows an
  eval bar and accuracy %, and a coach explains each move drawing on ~660 text
  templates with layered variation — you'll essentially never read the same
  sentence twice.
- **🎮 Gamification** — XP and levels, daily quests, daily streak, 26
  achievements, confetti, and a full set of synthesized sound effects (moves,
  captures, checks, victory fanfares, level-ups — no audio files, pure WebAudio).

## Run it (Mac)

```bash
npm start          # → http://localhost:8080
```

Any static file server works — there is no build step and no runtime dependency.

## Put it on your iPhone

The app needs HTTPS (or localhost) for full PWA install. Easiest options:

1. **GitHub Pages** (recommended): push this folder to a repo, enable Pages,
   then on the iPhone open the URL in Safari → Share → **Add to Home Screen**.
   It installs full-screen with its own icon and works fully offline afterwards.
2. **Same Wi-Fi, quick test**: `npm start` on the Mac, open
   `http://<mac-ip>:8080` in iOS Safari. Everything works; only the
   offline/service-worker install is skipped (HTTP limitation).
3. Any static host (Netlify/Vercel/Cloudflare Pages) — drag-and-drop the folder.

On the Mac you can likewise install it from Safari (File → Add to Dock) or just
use it in the browser.

## Project layout

```
index.html            app shell
css/style.css         full theme
js/engine.js          0x88 alpha-beta chess engine + Elo throttling
js/engine-worker.js   engine in a Web Worker (bot moves + review analysis)
js/board.js           touch/mouse chessboard component
js/puzzles.js         rated puzzle mode
js/bots.js            bot roster + game flow
js/trainer.js         module catalog + opening/tactic runners
js/review.js          analysis, classification, accuracy
js/feedback.js        ~660-template coach commentary corpus
js/state.js           persistence, Elo, XP, quests, achievements
js/sounds.js          synthesized sound effects
data/puzzles.js       2,698 Lichess puzzles (CC0)
data/openings.js      143 opening lines (lichess-org/chess-openings, CC0)
tools/                data pipeline scripts (regenerate data/*)
tests/smoke.mjs       headless test suite (`npm test`)
```

Progress is stored in `localStorage` on the device.

## Data & licenses

Puzzles and opening lines from the [Lichess database](https://database.lichess.org)
(CC0). Piece images: Cburnett chess set via Wikimedia Commons. chess.js (BSD-2)
for rules/legality. Engine, UI, and everything else written for this project.
