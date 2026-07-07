# ChessQuest — 100 improvements

Status legend: each item is implemented in the referenced module unless noted.

## Puzzles (1–15)
1. **Puzzle Rush** — separate mode: escalating difficulty, 3 lives, score + personal best, frenetic sounds. `puzzles.js`
2. **Daily Puzzle** — one fixed puzzle per calendar day (seeded by date), bonus XP, its own completion calendar streak. `puzzles.js`
3. **Solve timer + speed bonus** — visible timer; solving under 30s/60s grants bonus XP and "solveFast" praise lines. `puzzles.js`
4. **Spaced-repetition retry queue** — failed puzzles return after 1 day, then 3, then 7; "Redo" pill shows queue size. `puzzles.js`
5. **Theme practice mode** — casual (unrated) practice filtered to any theme from a picker. `puzzles.js`
6. **Solution explanations** — after a fail, the reveal names the motif ("this was a *deflection*: …") using theme data. `puzzles.js`
7. **Rating milestone celebrations** — crossing each 100 boundary upward: confetti + banner + achievement check. `puzzles.js`
8. **New-best-streak celebration** — beating your best streak fires a special toast/sound. `puzzles.js`
9. **Rating delta preview** — shows "+12 / −18" stakes before you move. `puzzles.js`
10. **Puzzle history list** — last 20 puzzles with result and rating; tap to retry any (unrated). `puzzles.js`
11. **Keyboard shortcuts** — N next, H hint, S skip on desktop. `puzzles.js`
12. **Distinct final-move sound** — intermediate correct "ding" vs full-solve fanfare (kept), plus near-miss sound on almost-solves. `sounds.js`
13. **Auto-next toggle** — after a solve, auto-advance after 1.2s (setting). `puzzles.js`
14. **Hardest-solve stat** — track and show the highest-rated puzzle you've ever solved. `state.js` + puzzles side panel
15. **First-try purity** — track solve-without-hint rate, shown in stats. `state.js`

## Play vs bots (16–30)
16. **Color chooser** — White / Black / Random dialog before each game. `bots.js`
17. **Takebacks** — 3 per game (undoes your move + bot reply), disabled in the last 10 moves of a loss for honesty. `bots.js`
18. **In-game hint** — asks the engine for your best move (max 3/game, costs 5 XP each). `bots.js`
19. **Eval bar during play** — optional "training wheels" toggle, live eval bar next to the game board. `bots.js`
20. **Bot table talk** — bots comment on captures, checks, your blunders, their wins — personality-flavored chat bubble. `bots.js` + `feedback.js`
21. **Opening name display** — live "Italian Game: …" label while the game is still in book. `bots.js`
22. **Material tray** — captured pieces + pawn-count advantage shown for both sides. `bots.js`
23. **Per-bot records** — W/L/D + current win streak vs each bot, shown on bot cards. `state.js`, `bots.js`
24. **Ladder badges** — beating a bot stamps its card; beating all bots up to an Elo unlocks "conqueror" achievements. `bots.js`
25. **Coach nudges** — optional warning when your last move hangs a piece (Nova-style tutor mode setting). `bots.js`
26. **Rematch button** — instant rematch with colors swapped. `bots.js`
27. **Draw offers** — you can offer a draw; bot accepts when eval is near equal (and vice versa never — bots are proud). `bots.js`
28. **Game clock** — elapsed time per game displayed. `bots.js`
29. **PGN export** — copy any finished game as PGN with headers. `bots.js`, `review.js`
30. **Resume in-progress game** — game state persists; closing the app mid-game restores it. `bots.js`, `state.js`

## Trainer (31–45)
31. **Endgame drills vs engine** — new module type: win KQ+K, KR+K, KP+K, 2 bishops, Q vs R, Lucena, Philidor… engine defends. `trainer.js` + `data/content.js`
32. **Daily workout** — one-tap mixed session: 4 due retries / weak themes + 4 fresh puzzles + 1 opening refresh. `trainer.js`
33. **Weakness detection** — per-theme accuracy tracked; "Recommended for you" row surfaces your 3 worst themes. `state.js`, `trainer.js`
34. **Opening spaced repetition** — completed openings come "due" after 3/7/21 days; due badge + review keeps stars. `trainer.js`
35. **Module search** — instant filter box over all modules. `trainer.js`
36. **Module sorting** — by name, difficulty, completion, recommended. `trainer.js`
37. **Opening plans** — each opening family shows its strategic ideas ("aims for…, typical plans…"). `data/content.js`
38. **Star totals** — trainer header counts total stars (x/837), not just modules. `trainer.js`
39. **Perfect-first-try bonus** — 3-starring a module on first attempt: +25 XP bonus & sparkle. `trainer.js`
40. **Checkmate pattern gallery** — illustrated explainer card (pattern anatomy) before each mate module. `data/content.js`
41. **Tier V (2000–2400+) modules** — added where puzzle data supports it. `data/puzzles.js` regen
42. **Both-sides opening mode** — after 3-starring an opening, replay it from the other color. `trainer.js`
43. **Module day streak** — completing 3 modules in one day: bonus + toast. `trainer.js`
44. **Wisdom cards** — short chess-principle cards shown between module completions. `data/content.js`
45. **Progress ring** — home trainer card gets a completion ring visual. `app.js`

## Game review (46–55)
46. **Best-move highlight** — for inaccuracy or worse, "show best" pulses the engine move on the board. `review.js`
47. **PV preview** — step through the engine's best line from any position (up to 4 plies) then snap back. `review.js`
48. **Retry from here** — branch any review position into a live game vs a bot at that position. `review.js` → `bots.js`
49. **Accuracy sparkline** — per-move accuracy graph; click to jump. `review.js`
50. **Phase breakdown** — opening/middlegame/endgame accuracy split with your weakest phase called out. `review.js`
51. **Key moments bar** — jump buttons for every blunder/missed win/brilliant. `review.js`
52. **Auto-review prompt** — after a game ends, a toast offers one-tap review. `bots.js`
53. **Annotated export** — copy the game as text with classifications + comments. `review.js`
54. **Coach tone packs** — Encouraging / Dry / Savage comment styles (setting). `feedback.js`
55. **Review depth setting** — Fast (d3) / Deep (d5) analysis choice. `review.js`

## Gamification (56–70)
56. **20 new achievements** — rush scores, daily puzzle streaks, endgame drills, ladder conquests, purity, night owl…. `state.js`
57. **Achievement gallery** — dedicated panel with locked-hint cards and rarity tiers. `app.js`
58. **Weekly recap** — Monday card summarizing last week: rating change, puzzles, accuracy trend. `app.js`
59. **Level titles** — every level has a title (Novice → … → Grandpatzer → Mythical Fish). `data/content.js`
60. **First-win-of-the-day bonus** — 2× XP on your first bot win daily. `state.js`
61. **Rotating daily quests** — 3 drawn from a 14-quest pool (win as Black, solve 3 mate puzzles, 90% accuracy game…). `state.js`
62. **Quest reroll** — swap one quest per day. `state.js`, `app.js`
63. **Streak freezes** — earn one per 5 levels; auto-consumed to protect a missed day. `state.js`
64. **Confetti variants** — gold rain for achievements, piece-emoji rain for game wins, star burst for 3-stars. `app.js`
65. **Richer toasts** — icons per event type, achievement toasts are tappable → gallery. `app.js`
66. **Near-miss sound + combo pitch ladder** — rising pitch per streak step (kept), sad-trombone-ish near miss. `sounds.js`
67. **Haptics** — vibration on capture/solve/level-up where supported. `sounds.js`
68. **Profile card** — pick an avatar emoji + display name, shown on home & share card. `app.js`
69. **Stats panel** — lifetime stats: time trained, moves played, favorite theme, purity, hardest solve, peak ratings. `app.js`
70. **Share card** — canvas-rendered brag image (rating, streak, level) via native share/download. `app.js`

## Board & UX (71–85)
71. **Board themes** — Classic Purple / Tournament Green / Walnut / Ice, live preview in settings. `board.js`, CSS
72. **Piece slide animations** — pieces glide between squares (with reduced-motion respect). `board.js`
73. **Legal-dot toggle** — hide move dots for purists. `board.js`
74. **Coordinates toggle** — show/hide file/rank labels. `board.js`
75. **Arrow drawing** — right-drag (desktop) / two-finger drag (touch) draws analysis arrows; auto-used for hints & best-move. `board.js`
76. **Capture flash** — brief red pulse on captured square. `board.js`
77. **Review flip button** — flip the review board orientation any time. `review.js`
78. **Settings modal** — sound pack/volume, haptics, board theme, dots, coords, animations, auto-next, tutor mode, tone pack, review depth, eval bar, OLED mode, reset. `app.js`
79. **Save backup** — export/import full progress as a JSON file (protects localStorage). `app.js`
80. **OLED black mode** — pure-black background variant for OLED phones. CSS
81. **Bigger-screen layout polish** — three-zone layout ≥1200px; iPad landscape tuned. CSS
82. **PWA update toast** — new service-worker version prompts one-tap reload. `app.js`, `sw.js`
83. **Empty states with CTAs** — every empty list points somewhere useful. all views
84. **Onboarding + calibration** — first-run: pick avatar, then 3 quick puzzles set your starting rating honestly. `app.js`
85. **Global keyboard map** — 1–5 switch tabs, arrows in review, N/H/S in puzzles, ? shows cheatsheet. `app.js`

## Engine & infrastructure (86–92)
86. **Transposition table + killer moves** — faster, stronger search at the same depth. `engine.js`
87. **Opening book for bots** — bots play real theory (weighted by Elo) out of the openings DB instead of engine moves for the first plies. `bots.js`
88. **Endgame eval terms** — passed-pawn push bonus, king activity, mop-up eval for KX vs K. `engine.js`
89. **Nova style rotation** — the adaptive bot alternates aggressive/positional/endgame-grinder personalities per game. `bots.js`
90. **Top-3 move display** — review shows the engine's three candidate moves with evals. `review.js`
91. **Mate-distance labels** — evals show "M3" instead of huge centipawn numbers everywhere. `review.js`, `bots.js`
92. **Analysis worker pool** — separate worker for review analysis so bot play never queues behind it. `app.js`

## Content (93–100)
93. **4,200+ puzzles** — bigger, wider sample incl. 2400+ tier and daily-puzzle pool. `data/puzzles.js`
94. **+150 coach templates** — richer, more specific commentary; tone-pack aware. `feedback.js`
95. **Opening-aware review lines** — "You left Italian Game theory at move 6 — {best} was the move." `review.js` + `feedback.js`
96. **Expanded bot bios + records** — every bot card shows your history against it. `bots.js`
97. **Peak-rating marker** — rating chart shows your all-time-high line. `puzzles.js`
98. **100 chess tips** — rotating tip ticker on home. `data/content.js`
99. **Mystery Bot** — hidden random Elo (400–2400); guess its rating within 200 after the game for bonus XP. `bots.js`
100. **Sound packs** — Classic / Arcade / Zen synthesized sets. `sounds.js`
