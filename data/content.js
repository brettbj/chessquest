// Static content data for the chess training app.
// Pure ES module: no imports, no DOM, JSON-like exports only.

export const TIPS = [
  // Openings (1-10)
  "Develop knights and bishops before moving the same piece twice in the opening.",
  "Fight for the center: pawns and pieces controlling e4, d4, e5, d5 control the game.",
  "Castle early. A king stuck in the center is a target for every tactic in the book.",
  "Don't bring the queen out early; enemy minor pieces will develop with tempo by attacking her.",
  "Connect your rooks: finish development so your rooks defend each other on the back rank.",
  "Make as few pawn moves as you need in the opening; every pawn move leaves a square weak forever.",
  "Develop with a threat when you can, but never make a threat that worsens your position.",
  "Knights before bishops: you usually know where the knight belongs before the bishop does.",
  "Don't grab flank pawns with your queen in the opening; the time lost costs more than the pawn.",
  "Meet a wing attack with action in the center; a center counter-strike is the classic antidote.",
  // Openings continued (11-20)
  "After castling, think twice before pushing the pawns in front of your king.",
  "In gambits, the compensation is time and open lines. If you take, plan to give the pawn back.",
  "Trade a flank pawn for a center pawn when you can; central pawns are worth more.",
  "Watch f7 and f2: they are only defended by the king and attract early attacks.",
  "If your opponent breaks opening principles, open the position and punish the lag in development.",
  "Develop toward the center; a knight on the rim is dim (Tarrasch was right).",
  "Don't block your c-pawn with a knight in queen's pawn openings; you often need c4 or ...c5.",
  "Learn the plans of your openings, not just the moves. Moves run out; plans don't.",
  "In open positions, develop fast; in closed positions, maneuver behind the pawn chain first.",
  "Complete development before starting an attack; attacks with half your army usually rebound.",
  // Tactics (21-40)
  "Loose pieces drop off: undefended pieces are the fuel of almost every tactic.",
  "Before every move, check all checks, captures, and threats - yours and your opponent's.",
  "Look for undefended pieces and overloaded defenders; that's where combinations live.",
  "Examine forcing moves first: they narrow the tree and often hide the win.",
  "When two of your opponent's pieces stand on one line or diagonal, look for a pin or skewer.",
  "Knights fork; if the enemy king and queen are a knight-hop apart, calculate it.",
  "A pinned piece is not a real defender. Count attackers versus defenders with pins in mind.",
  "When you spot a good move, sit on your hands and look for a better one (Lasker).",
  "Desperado: a doomed piece should sell its life as dearly as possible - capture something first.",
  "Removing the guard is a tactic: capture or deflect the defender, then take what it protected.",
  "Discovered attacks are the strongest tactic: the moving piece can go anywhere, even sacrifice itself.",
  "Back-rank weaknesses are tactics waiting to happen. Make luft before you need it.",
  "If a sacrifice looks tempting but unclear, calculate the forcing lines to the end or don't play it.",
  "Count material after every capture sequence in your head before starting it on the board.",
  "In-between moves (zwischenzug) break the rules of recapture; always ask if you must recapture now.",
  "Attack pinned pieces with pawns; the pin means they can't run.",
  "Double attacks win material. Every move, ask: can one of my pieces attack two things at once?",
  "When ahead in development, open lines; tactics flow toward the better-developed side.",
  "A queen and knight cooperate beautifully; keep the pair when you're attacking.",
  "The threat is often stronger than the execution - but only if the threat is real.",
  // Strategy (41-60)
  "Put rooks on open files, then double them. The 7th rank is a rook's paradise.",
  "Knights love outposts: squares defended by your pawn that enemy pawns can never attack.",
  "The bishop pair is a real asset in open positions; avoid trading one bishop for a knight cheaply.",
  "Good bishops stand outside the pawn chain; don't lock your bishop behind its own pawns.",
  "Trade off your bad bishop and keep your good one; make your opponent do the opposite.",
  "Doubled, isolated, and backward pawns are long-term targets. Create them in the enemy camp.",
  "A weak square is only weak if a piece can occupy it. Aim your knights at holes in the pawn structure.",
  "Improve your worst-placed piece when you have no direct plan (Makogonov's rule).",
  "Play on the side where your pawn chain points; that's where your space advantage lives.",
  "An isolated queen's pawn gives active pieces; blockade it, trade minor pieces, and win it in the endgame.",
  "When cramped, trade pieces; when you have more space, avoid trades and keep the squeeze.",
  "Don't release the central tension without a concrete reason; the one who resolves it often concedes something.",
  "Every pawn move gains space but weakens squares behind it. Push with purpose.",
  "The side with more space should attack; the side with less should trade or strike back in the center.",
  "Rooks belong behind passed pawns - yours or your opponent's (Tarrasch).",
  "Open a second front: one weakness can usually be defended, two rarely can.",
  "Prophylaxis wins games: ask what your opponent wants and quietly prevent it.",
  "Bishops of opposite colors favor the attacker in the middlegame and the defender in the endgame.",
  "When ahead in material, trade pieces and keep pawns; when behind, trade pawns and keep pieces alive for counterplay.",
  "A blockading knight in front of an enemy passed pawn is both shield and sword (Nimzowitsch).",
  // Endgames (61-80)
  "In the endgame, the king is a fighting piece. Activate it as soon as the queens come off.",
  "Passed pawns must be pushed - their lust to expand decides endgames (Nimzowitsch).",
  "Learn the opposition: in king and pawn endings, the king that must move often loses the fight.",
  "Put your rook behind a passed pawn: it gains power as the pawn advances.",
  "Rook endings: activity is worth a pawn. An active rook beats a passive rook a pawn up.",
  "Cut off the enemy king with your rook before pushing your passed pawn.",
  "Know the square of the pawn: if the defending king can step inside it, the pawn won't queen alone.",
  "Wrong-colored bishop and rook pawn is a draw; check the corner color before trading down.",
  "In king and pawn endings, count tempi; a single spare pawn move can win the opposition.",
  "Outside passed pawns win endgames: they drag the enemy king away while you eat the other wing.",
  "Two connected passed pawns on the 6th beat a rook. Know this and race accordingly.",
  "Centralize the queen in queen endings; checks and the ability to trade decide everything.",
  "Don't rush in winning endgames: improve your king, fix enemy pawns, then break through.",
  "Knight endings are pawn endings: an extra pawn usually wins. Bishop endings often draw.",
  "In rook endings, the defender's king belongs in front of the pawn; remember Philidor's third-rank defense.",
  "Push your candidate pawn first: the pawn with no enemy pawn in front of it makes the passer.",
  "When defending a rook ending, harass from behind or the side with checks; passive rooks lose.",
  "Zugzwang is an endgame weapon: sometimes the winning move is a quiet one that passes the burden.",
  "Trade into a won pawn ending only after calculating it to the end; pawn endings are unforgiving.",
  "King in front of its pawn plus the opposition wins; pawn in front of its king often only draws.",
  // Practical play (81-100)
  "Sit on your hands: when the move looks obvious, that's exactly when to double-check it.",
  "Blunder-check every move: after deciding, ask what your opponent's best reply is before touching the piece.",
  "Play with a plan. A bad plan is better than no plan; aimless moves lose by themselves (Chigorin).",
  "Use your opponent's thinking time to scan the position for tactics and plan structures, not lines.",
  "Manage the clock: don't spend ten minutes on move six and ten seconds on the critical moment.",
  "When you're winning, simplify: trade pieces, keep pawns, and steer for a technical endgame.",
  "When you're losing, complicate: create problems, avoid trades, and make the win hard to find.",
  "After your opponent moves, ask: what changed? What does that move attack, defend, or abandon?",
  "One deep look beats five shallow ones, but always start wide: list candidate moves before diving.",
  "Never play a fast move in a critical position. Recognize the moments that decide the game.",
  "Don't play hope chess. Assume your opponent will find the best reply, and choose accordingly.",
  "A draw offer is information: ask why they want a draw before you even consider accepting.",
  "In time trouble, prefer solid moves and simple plans; tactics favor the player with time to check them.",
  "Analyze your losses; they are tuition you have already paid, so collect the lesson (Capablanca learned from endings).",
  "Play the position, not the opponent's rating. Strong players blunder; weak players find good moves.",
  "If you can't decide between two moves, pick the one that improves your worst piece or asks a question.",
  "Endgame knowledge steers middlegame decisions: know which endings you're trading into.",
  "Stay alert after winning material; the most common time to blunder is right after your opponent does.",
  "Don't resign in complicated positions at fast time controls; practical chances are real chances.",
  "Consistency beats brilliance: avoiding one blunder per game raises your rating more than one great move.",
];

export const LEVEL_TITLES = [
  "Pawn Pusher",
  "Piece Shuffler",
  "Board Wanderer",
  "Hopeful Patzer",
  "Fork Finder",
  "Pin Enthusiast",
  "Castle Builder",
  "Center Grabber",
  "Skewer Scout",
  "Tempo Thief",
  "Club Menace",
  "Coffeehouse Swindler",
  "Gambit Gremlin",
  "Tactics Goblin",
  "Blunder Slayer",
  "Zwischenzug Zealot",
  "Outpost Occupier",
  "File Controller",
  "Bishop Pair Baron",
  "Prophylaxis Prodigy",
  "Initiative Instigator",
  "Positional Sorcerer",
  "Structure Surgeon",
  "Attack Architect",
  "Sacrifice Sommelier",
  "Zugzwang Enjoyer",
  "Fortress Breaker",
  "Endgame Wizard",
  "Opposition Overlord",
  "Passed Pawn Prophet",
  "Rook Lift Royalty",
  "Calculation Machine",
  "Grandmaster of Vibes",
  "Silicon Whisperer",
  "Board Vision Deity",
  "The Final Boss of Your Club",
  "Interdimensional Tactician",
  "Mythical Fish",
  "Chess Deity (self-proclaimed)",
  "64 Squares Incarnate",
];

export const OPENING_PLANS = {
  "Italian Game":
    "White aims the bishop at f7 and prepares the c3+d4 pawn break to build a big center. Typical plans: castle short, play c3, d4 (or the slower d3), and reroute the b1-knight via d2-f1-g3 toward the kingside. Watch f7 and f2 - both sides have early tactics on those squares, and Black must meet d4 accurately in the center.",
  "Ruy Lopez":
    "White pressures the e5-pawn indirectly by attacking its defender on c6, then builds slowly with c3 and d4. The classic Spanish plan is the knight tour Nb1-d2-f1-g3 and a long kingside squeeze; Black counters with ...b5, ...Na5-c4 or the ...d5 break. Watch the a4-e8 diagonal tricks and remember Bxc6 followed by Nxe5 doesn't win a pawn early because of ...Qd4.",
  "Scotch Game":
    "White trades off the center immediately with d4 to get free piece play and an open d-file instead of the slow Spanish maneuvering. Plans include Nxc6 and e5 hitting the f6-knight, or Bc4/Be3 setups with quick queenside castling. Black gets easy development too, so White must use the lead in the center before ...d5 equalizes.",
  "Vienna Game":
    "White delays Nf3 to keep the f4 break available, mixing King's Gambit ideas with sounder development. Plans: f4 followed by Nf3 and a kingside pawn storm, or the quieter g3/Bg2 setup with a grip on d5. Watch out for ...Nxe4 tricks after Bc4 - the Frankenstein-Dracula lines get wild fast.",
  "King's Gambit Accepted":
    "White gives the f-pawn to deflect the e5-pawn, seize the center with d4, and open the f-file against f7. Develop fast (Nf3, Bc4, O-O), regain f4 at leisure, and attack before Black consolidates. The cost is a permanently airy king - Black's ...d5 counter and checks on h4 are the critical tests.",
  "King's Gambit Declined":
    "Black keeps the center closed with ...Bc5 or hits back with ...d5 (Falkbeer) rather than grabbing f4. With ...Bc5 the bishop eyes g1 and discourages castling, so White often plays c3 and d4 to blunt it. White still gets f-file play after fxe5, but the position stays saner than the accepted lines.",
  "London System":
    "White builds the e3-c3 triangle with the dark-squared bishop developed outside the chain to f4 before it gets locked in. Standard plans: Bd3, Nbd2, O-O, then Ne5 supported by f4, with f4-f5 or a Qf3/Bxh7 attack against the kingside. Watch for early ...Qb6 hitting b2, and don't let ...c5 and ...Qb6 pressure arrive before you're coordinated.",
  "English Opening":
    "White fights for d5 from the flank, often fianchettoing to g2 and expanding with b4 or playing a reversed Sicilian a tempo up. Typical plans: Nc3, g3, Bg2, then the b4-b5 queenside minority or d4 in one go. The main thing to watch is Black seizing the center with ...e5 and ...f5 - White's play is on the wings and the long diagonal, not in a pawn duel.",
  "Réti Opening":
    "White attacks the d5-pawn with c4 without committing the center, planning to fianchetto one or both bishops and strike with e4 or d4 later. The hallmark plan is pressure on the long diagonals plus a timely central break once Black's structure is fixed. Flexibility is the point - don't rush the pawn breaks before the pieces aim at the right squares.",
  "Catalan Opening":
    "White combines d4 and c4 with a g2-fianchetto, trading a slower queenside for relentless pressure on the h1-a8 diagonal. Plans: regain c4 with Qc2/Ne5/a4, push e4, and grind the endgame with the better bishop. Black's problem piece is the c8-bishop; White should keep the diagonal open and avoid premature releases of tension.",
  "Four Knights Game":
    "A solid, symmetric fight where all four knights develop before commitments; White chooses between the Spanish Bb5 and the sharper Scotch d4. Plans revolve around small edges: d4 breaks, doubled c-pawns after Bxc6, and slightly faster piece play. Symmetry is not safety - the first player to win the fight for d5/d4 gets a lasting pull.",
  "Ponziani Opening":
    "White plays c3 early to prepare d4 and build the full pawn center. The critical replies are ...d5 and ...Nf6, when White must know concrete lines (Bb5 pressure, e5 pushes) or the loose center backfires. If Black plays passively, White simply gets a strong center for free.",
  "Bishop's Opening":
    "White develops Bc4 before Nf3, keeping f4 available and eyeing f7 immediately. Typical plans: d3, Nf3 (or f4 Vienna-style), c3 and a slow buildup, often transposing to Italian structures. Watch the early ...Nxe4 equalizing trick and ...c6 with ...d5 hitting the bishop.",
  "Center Game":
    "White opens the center at once with d4 and recaptures with the queen, accepting lost time for open lines and often opposite-side castling. The standard setup is Qe3, Nc3, Bd2, O-O-O with pressure down the d-file and g4-g5 storms. Black develops with tempo on the queen, so White must attack fast or stand worse.",
  "Danish Gambit":
    "White offers one or two pawns with c3 (and Bc4) for raging development and the pair of bishops raking b2-g7 and c4-f7. Plans: castle quickly, pile on f7 and the open central files, and crash through before Black untangles. The antidote is ...d5 giving material back - be ready to keep the initiative in the simplified positions too.",
  "Trompowsky Attack":
    "White plays Bg5 on move two to double Black's f-pawns or provoke concessions before Black settles into an Indian setup. Plans: Bxf6 followed by e3/c4 and a big pawn center, or e3-c3 solidity when Black avoids the trade. Watch ...Ne4 hitting the bishop and early ...c5/...Qb6 counterplay against b2.",
  "Colle System":
    "White sets up d4, e3, Bd3, Nbd2, c3 and castles, then unleashes the thematic e4 break for a kingside attack. Classic follow-ups: dxc5, e4-e5 evicting the f6-knight, and the Greek-gift sacrifice on h7. The system's weakness is the buried c1-bishop - if Black trades light-squared bishops or fianchettoes early, switch to the Zukertort b3 setup.",
  "Torre Attack":
    "White develops Bg5 behind a d4/Nf3 skeleton, building the e3-c3 wall and aiming for e4 or Ne5 with a kingside initiative. Typical plans: Bd3, Nbd2, c3, O-O, then e4 in one go or f4 supporting Ne5. Watch ...Qb6 hitting the abandoned b2-pawn and be ready with Qc1 or b3.",
  "King's Indian Attack":
    "White plays the King's Indian setup a tempo up: Nf3, g3, Bg2, d3, Nbd2, e4, castle, then e5 to clamp the center and attack with h4/Nf1-h2-g4. It's a plan-based system, deadliest against French-style ...e6/...d5 setups where the e5 wedge points everything at Black's king. Black's queenside pawn storm races you - speed matters more than material on that wing.",
  "Bird Opening":
    "White grabs e5 with the f-pawn, playing a Dutch a tempo up: Nf3, e3, Be2 or b3 with Bb2, and pressure down the half-open f-file after O-O. Plans include the Stonewall setup with d4 or the leaner b3 lines aiming Ne5 and Rf3 lifts. The critical test is From's Gambit ...e5 - know your reply (accepting or transposing to a King's Gambit with e4).",
  "Nimzo-Larsen Attack":
    "White fianchettoes the queen's bishop first, targeting e5 and the long diagonal, then decides the pawn structure based on Black's setup. Typical plans: e3, Bb5 or Be2, f4 or c4 breaks, and pressure on e5 that turns into a kingside attack. Don't let the b2-bishop bite on granite - challenge Black's e5/d4 pawns with timely breaks.",
  "Evans Gambit":
    "White throws in b4 to deflect the c5-bishop and build the full center with c3 and d4 at gambit speed. Plans: Qb3 hitting f7, Ba3 preventing castling, and rapid central expansion while Black's queenside sleeps. Black's soundest tries return the pawn with ...d5 or retreat ...Bb6; keep the initiative rather than counting pawns.",
  "Smith-Morra Gambit":
    "White gives the d-pawn for open c- and d-files, developing Nc3, Bc4, Qe2, Rd1/Rc1 with heavy pressure before Black finishes development. Thematic blows: Nd5 sacrifices, e5 breaks, and Bxf7 tricks against slow setups. Respect the ...a6/...e6 defensive walls - if the attack stalls, the endgame is simply a pawn down.",
  "Sicilian Defense":
    "Black trades the c-pawn for White's d-pawn to get an unbalanced game with a central pawn majority and half-open c-file. Standard plans: ...a6/...b5 minority expansion, pressure on c3 with rooks on c8, and central breaks with ...d5 or ...e5 at the right moment. The price is conceding early development and space - know your response to White's kingside pawn storms in open Sicilians.",
  "French Defense":
    "Black builds the solid e6/d5 chain, accepting a passive light-squared bishop in exchange for the thematic ...c5 and ...f6 pawn breaks against White's center. Plans: pile on d4 with ...Nc6/...Qb6, break with ...c5, and counterattack the base of White's chain. Solve the c8-bishop problem (trade it via ...b6-...Ba6 or free it after ...f6) or it haunts every endgame.",
  "Caro-Kann Defense":
    "Black supports ...d5 with the c-pawn, getting French-style solidity while keeping the light-squared bishop free to develop to f5 or g4. Plans: sound structure, ...e6 behind the developed bishop, and the ...c5 break for counterplay. The tradeoff is slight passivity - avoid getting squeezed in Advance lines and know the Exchange structure's minority-attack ideas.",
  "Scandinavian Defense":
    "Black challenges e4 immediately, recapturing on d5 with the queen (accepting a tempo loss after Nc3) or with the knight. Plans: a Caro-Kann-like ...c6/...Bf5 setup, quick queenside castling in some lines, and pressure against d4. The cost of the early queen trip is real - keep her safe on a5 or d6 and never fall behind in development further.",
  "Pirc Defense":
    "Black lets White build a big center, then attacks it with the g7-bishop and the ...c5 or ...e5 breaks. Plans: ...O-O, ...c6/...b5 or ...Nc6/...e5, and piece pressure against d4/e4 rather than occupation. Respect the Austrian Attack f4 setups - Black must time the central counterstrike before the pawn storm lands.",
  "Modern Defense":
    "Black fianchettoes on g7 without committing the g8-knight, keeping maximum flexibility to hit the center with ...c5, ...e5, or ...d5 later. Plans mirror the Pirc but with extra options like ...c6/...b5 expansion or an early ...Nc6. The flexibility cuts both ways - White gets a free hand in the center, so Black must strike at it before it rolls forward.",
  "Alekhine Defense":
    "Black provokes White's pawns forward with ...Nf6, planning to undermine the overextended center with ...d6, ...c5 and piece pressure. Typical plans: ...Nb6, ...dxe5 or ...c5 hitting the chain, and targeting d4 with ...Nc6/...Bg4. If White consolidates the space (especially in the Four Pawns Attack), Black is just cramped - the counterattack must be concrete.",
  "Petrov's Defense":
    "Black counterattacks e4 symmetrically instead of defending e5, steering toward a solid, slightly drawish but very sound game. Plans: ...d5 and ...Bd6/...Be7 with quick castling, contesting the e-file with rooks. Don't copy blindly - after Nxe5, ...Nxe4?? loses to Qe2; play ...d6 first.",
  "Philidor Defense":
    "Black defends e5 with ...d6, accepting a modest but resilient position with ideas of ...exd4 or a Hanham setup (...Nd7, ...Be7, ...c6). Plans: ...Re8, ...Bf8 regrouping, and the eventual ...d5 or ...b5 break. Avoid the tactical potholes early (Legal's mate patterns on g4) and don't concede the center with ...exd4 unless it wins the fight for d4.",
  "Nimzo-Indian Defense":
    "Black pins the c3-knight to fight for e4 without occupying the center, often accepting to give the bishop pair for doubled c-pawns. Plans: ...c5 and ...b6 with a light-square blockade (...Ne4, ...f5), or ...d5 structures targeting c4. The strategy is squares over material - keep e4 under control or the concession of the bishop pair goes unpaid.",
  "King's Indian Defense":
    "Black concedes the center, castles, then strikes with ...e5; when White closes with d5, Black attacks the king with ...f5-f4 and a pawn storm while White plays c5 on the queenside. It is a race: Black throws everything kingside (...g5, ...Ng6/...Nf6-h5, ...Rf7-g7), White breaks through on the c-file. Piece count on the attacking wing decides - never trade off your attackers.",
  "Queen's Indian Defense":
    "Black fianchettoes to b7 to control e4, the square the Nimzo fights for, when White avoids Nc3. Plans: ...Bb4+ inserts, ...c5 or ...d5 breaks, and piece pressure on the long diagonal; the ...Ba6 line hits c4 directly. It's a restraint opening - Black wins by preventing e4, not by early aggression.",
  "Grünfeld Defense":
    "Black invites White to build the broad center with cxd5 and e4, then dismantles it with ...c5, ...Bg7 pressure, and ...Nc6/...Qa5 against d4. Every Grünfeld plan runs through d4: pile on it, trade its defenders, and win the resulting endgames with the queenside majority. If the counterpressure ever stalls, White's center rolls - concrete play is mandatory.",
  "Slav Defense":
    "Black defends d5 with ...c6, keeping the c8-bishop's diagonal open unlike the QGD. Plans: ...dxc4 followed by ...Bf5/...Bg4 and ...b5 to keep the pawn or gain time, or solid ...e6 setups. The main tension: developing the bishop outside the chain before playing ...e6, without leaving b7 and the queenside too loose.",
  "Semi-Slav Defense":
    "Black combines ...c6 and ...e6, building an unbreakable d5-point and preparing the dynamic ...dxc4 plus ...b5 grab (Botvinnik/Noteboom territory). Plans: the solid Meran ...b5-...a6-...c5 expansion, or ...Bd6 and ...e5 in Stoltz lines. The c8-bishop is temporarily buried - Black's whole setup banks on the ...c5/...e5 breaks arriving in time.",
  "Dutch Defense":
    "Black grabs e4 from the flank with ...f5, choosing the Stonewall (...d5, ...e6, ...c6 with a clamp and ...Ne4), the Classical (...d6 and ...e5), or Leningrad (...g6 and ...e5/...c5). Kingside attack via ...Qe8-h5 and rook lifts is the dream; the permanently weakened e6/e8 diagonal and h5-e8 checks are the nightmare. Trade off the bad c8-bishop in Stonewalls (...b6-...Ba6 or ...Bd7-e8-h5).",
  "Benoni Defense":
    "Black surrenders central space for a queenside pawn majority and dark-square dynamism: ...exd5, ...d6, ...g6 with the g7-bishop raking d4. Plans: ...a6/...b5 majority rolls, ...Re8 and ...c4/...Nc5 piece play, and the dream ...b5/...f5 breaks. White's e5 and f4-f5 space plans are the danger - Benoni players live and die by activity.",
  "Benko Gambit":
    "Black gives the b-pawn for permanent pressure down the a- and b-files with fianchettoed bishop and doubled rooks. The plan barely changes for 30 moves: ...Bxa6, ...Bg7, ...Nbd7, rooks to a8/b8, and squeeze; the endgame is often better for Black despite the pawn. White must return the pawn or find the e4-e5 central break before the queenside collapses.",
  "Tarrasch Defense":
    "Black frees the position with an early ...c5, accepting an isolated d-pawn in return for open lines and easy piece activity. Plans: ...Nc6, ...Be7/...Bc5, rooks to the center, and using the IQP's dynamism (d4 outposts, kingside attacks) before endgames arrive. Against the g3 fianchetto lines, keep pieces on - every trade makes the isolani weaker.",
  "Queen's Gambit Declined":
    "Black holds d5 with ...e6, accepting the temporarily bad c8-bishop for a rock-solid center. Classical plans: ...Be7, ...O-O, ...Nbd7, then free the game with ...c5 or ...dxc4 and ...e5; the minority attack (White's b4-b5) versus Black's kingside play defines the Exchange structure. Develop the c8-bishop or trade it (...b6/...Bb7, or the Lasker ...Ne4 freeing maneuver) before it becomes a permanent problem.",
  "Queen's Gambit Accepted":
    "Black takes on c4 to free the light-squared bishop and hit back with ...c5, giving up the center only temporarily. Plans: ...a6/...b5 to hold the extra pawn a while, ...Bb7 and ...c5 with quick equality if White is slow. Don't cling to the c4-pawn at the cost of development - the point is easy piece play, not material.",
  "Albin Countergambit":
    "Black answers the Queen's Gambit with ...e5, sacrificing a pawn for the cramping d4-wedge after dxe5 d4. Plans: ...Nc6, ...Bg4/...Bf5, often ...O-O-O with a kingside pawn storm; the wedge on d4 chokes White's development. Beware the Lasker Trap for White (e3?? Bb4+ leads to disaster) and remember Black must attack - quiet play just leaves him a pawn down.",
  "Two Knights Defense":
    "Black meets the Italian bishop with ...Nf6, offering sharp play instead of the quiet ...Bc5. The critical test is Ng5 hitting f7, when Black gambits with ...d5 and ...Na5 for a raging initiative (never take the fried liver bait without knowing it); White can also play d4 for an open fight. Both sides need concrete knowledge - this is the sharpest branch of the Italian complex.",
  "Hungarian Opening":
    "White starts with g3, fianchettoes, and keeps every central option open, often transposing to Catalan, English, or King's Indian Attack setups. Plans: Bg2, Nf3, O-O, then choose c4 or d4 or e4 based on Black's structure. Its strength is flexibility and avoidance of theory; its weakness is that Black can take the full center - be ready to strike back at it.",
  "Sicilian Defense: Closed":
    "White declines the open fight, playing Nc3, g3, Bg2, d3 with a slow kingside plan of f4-f5 and Be3/Qd2. Black counters with the standard queenside program: ...Rb8, ...b5-b4 and pressure down the c-file. It's a pure race of pawn storms on opposite wings - tempo counts double, and the center usually stays shut until one attack lands.",
  "Sicilian Defense: Alapin Variation":
    "White plays c3 to build the full center with d4 without allowing an open Sicilian. Black's critical counters are ...Nf6 (hitting e4 before c3's point lands) and ...d5, both forcing White into IQP or symmetrical structures. White gets sound development and small edges; the plans are classic isolani play - piece activity, Ne5, and kingside chances.",
  "Sicilian Defense: Dragon Variation":
    "Black fianchettoes on g7 and aims everything down the long diagonal and half-open c-file, with ...Rc8 and the thematic exchange sac ...Rxc3. Against the Yugoslav Attack (Be3, f3, Qd2, O-O-O, h4-h5), it's a mating race: White pries open the h-file, Black crashes through on c3 and the a1-h8 diagonal. Know the move orders cold - one slow move loses the race outright.",
  "Sicilian Defense: Najdorf Variation":
    "Black's ...a6 prepares ...e5 (or ...e6) and ...b5, taking d4 territory and starting queenside play before committing the king's setup. Plans: ...e5 with ...Be6/...Nbd7 and the d5-square battle, or flexible ...e6 setups; the minority storm ...b5-b4 counters White's g4/f3 English Attack race. The perpetual issues are the d5-hole and backward d6-pawn - Black's activity must always compensate for them.",
  "Indian Defense: Budapest Gambit":
    "Black gambits with ...e5 against d4+c4, regaining the pawn in most lines after ...Ng4 with active pieces. Plans: ...Bb4+/...Bc5 hitting f2, ...Nc6 piling on e5, and the famous smothered-mate trap if White defends carelessly with the queen. If White returns the pawn calmly (e.g. giving back e5 with Nf3/e3), Black must find activity or stand slightly worse - avoid autopilot.",
  "Italian Game: Giuoco Pianissimo":
    "White plays d3 instead of forcing matters, keeping the tension for a long maneuvering game: c3, Nbd2-f1-g3, Re1, h3, then a slow d4 or kingside buildup. Black mirrors with ...d6, ...a6, and the ...Bc5-a7 retreat, fighting for the d4/d5 breaks. The battle is about timing the central break and the a2-a4 versus ...a7-a5 wing space - patience and piece placement decide, not tactics on move ten.",
};

export const MATE_PATTERNS = {
  mateIn1: {
    title: "Mate in One",
    anatomy:
      "Every mate in one is a check the king cannot answer: no flight square, no block, no capture of the checker. The method is exhaustive, not inspired - list every checking move you have, then test each against the three escapes. Most misses come from skipping a 'silly-looking' check, especially pawn checks and long-range checks from across the board.",
    recognize:
      "A cornered or boxed-in king, defenders that are pinned or overloaded, and any check you haven't actually calculated yet.",
    example:
      "The classic is a queen landing next to the enemy king, protected by another piece, with the king's escape squares covered or occupied by its own pawns.",
  },
  mateIn2: {
    title: "Mate in Two",
    anatomy:
      "A mate in two is a forcing funnel: your first move restricts the replies, and every reply meets a mate in one. Calculate checks first, then captures and mating threats; for each candidate, enumerate all of the defender's legal answers and confirm a mate against each one. The first move often sacrifices material or is a quiet move that simply takes away the last flight square.",
    recognize:
      "A king with almost no air, heavy pieces already aimed at it, and a defender that is doing two jobs - deflect it and the mate in one appears.",
    example:
      "A typical construction is a queen sacrifice that drags a defender off its post, after which a knight or rook delivers the mate the defender was preventing.",
  },
  mateIn3: {
    title: "Mate in Three",
    anatomy:
      "Deeper mates are built from the same bricks: forcing moves in forcing order, pruning as you go. Work check-capture-threat at every ply, but stay alert for the quiet key move - the move that cuts off escape or brings a final attacker while the defender is tied up. Verify the defender's most annoying reply at each step; a mate in three fails at its longest branch, not its prettiest.",
    recognize:
      "Look for a sequence starter that forces the king onto a worse square or strips its pawn cover; if two checks in a row leave the king boxed in, hunt for the finisher.",
    example:
      "The classic shape is check driving the king up the board, a second check cutting off retreat, and a third piece arriving to seal the mating net.",
  },
  backRankMate: {
    title: "Back-Rank Mate",
    anatomy:
      "A rook or queen lands on the eighth rank and the king, fenced in by its own unmoved pawns, has nowhere to run. The pattern's engine is the defender count on the back rank: when the last defender is traded, deflected, or overloaded, the invasion is decisive. Many combinations exist only to remove that one defender.",
    recognize:
      "A castled king behind three unmoved pawns and a back rank guarded by a single rook - then count whether that guard can be captured, pinned, or dragged away.",
    example:
      "The classic construction is a queen or rook offering itself to deflect the defending rook, after which the other rook mates on the back rank.",
  },
  smotheredMate: {
    title: "Smothered Mate",
    anatomy:
      "A knight delivers mate to a king completely walled in by its own pieces - the one mate no blockade can stop, since the knight jumps over everything. The full mechanism (Philidor's legacy) uses a queen check to force the king into the corner, then a queen sacrifice on g8 to compel a rook to seal the last square, and finally the knight check that nothing can answer.",
    recognize:
      "An enemy king in the corner with its own rook and pawns packed around it, plus your knight within reach of f7/f2 - check whether a double check and queen sacrifice force the burial.",
    example:
      "The classic runs Qb3-ish pressure, Nf7+ then Nh6 double check, Qg8+!! Rxg8, and Nf7 mate with the king smothered by its own rook and pawns.",
  },
};

export const WISDOM = [
  {
    title: "Loose pieces drop off",
    text: "Nearly every tactic begins with an undefended or underdefended piece; forks, pins, and double attacks all need a loose target. Keep your pieces protecting each other and half of your opponent's combinations never get off the ground. John Nunn's 'LPDO' is shorthand for the most profitable scan in chess.",
    icon: "🧲",
  },
  {
    title: "The principle of two weaknesses",
    text: "One weakness can be defended forever - the defender simply parks a piece on it. Winning technique means creating a second weakness on the other wing and switching attacks between them faster than the defense can shuffle. Stretch the defender until something snaps.",
    icon: "⚖️",
  },
  {
    title: "Trade when ahead, complicate when behind",
    text: "Material advantages grow as pieces leave the board, because the extra unit becomes a larger share of the remaining force. So the winner should simplify toward a clean endgame while the loser should keep queens on and muddy the water. Every trade is a small negotiation - know which side of it you're on.",
    icon: "🔁",
  },
  {
    title: "Passed pawns are criminals",
    text: "Nimzowitsch said a passed pawn is a criminal that must be kept under lock and key; mild measures like mere observation are not enough. Blockade it - ideally with a knight - before it advances, because every square it gains raises the price of stopping it. Its 'lust to expand' is not a metaphor; unattended passers decide games by themselves.",
    icon: "🔒",
  },
  {
    title: "The threat is stronger than the execution",
    text: "A standing threat ties enemy pieces to defense move after move, while executing it cashes that pressure in just once. Keep the tension when your opponent must keep answering a question, and release it only when the answer wins something concrete. Tartakower's quip is really about not spending your positional income too early.",
    icon: "🗡️",
  },
  {
    title: "Sit on your hands",
    text: "When you see a good move, look for a better one - Lasker's advice targets the exact moment blunders happen, right after you fall in love with an idea. The first decent move you spot anchors your thinking and hides alternatives. A ten-second scan of other candidates is the cheapest rating insurance available.",
    icon: "🪑",
  },
  {
    title: "A knight on the rim is dim",
    text: "A centralized knight controls up to eight squares; on the edge it controls four, and in the corner just two. Tarrasch's rhyme encodes real arithmetic - piece value is mostly square count. Send knights toward the center and toward outposts where no enemy pawn can ever evict them.",
    icon: "🐴",
  },
  {
    title: "Rooks belong behind passed pawns",
    text: "Behind your own passer, the rook gains scope with every advance; behind the enemy's, it shepherds the pawn's every step. In front of a pawn, the same rook loses squares as the pawn walks toward it. Tarrasch's rule wins more rook endgames than any other single sentence.",
    icon: "🏰",
  },
  {
    title: "The king is a fighting piece",
    text: "Steinitz declared the king a strong piece that can defend itself, and in the endgame it is worth roughly a rook's worth of activity. Once queens leave the board, the player whose king marches first often wins the same position the other king would lose. Endgames are won by the monarch who shows up for work.",
    icon: "👑",
  },
  {
    title: "Why the center rules everything",
    text: "Pieces in the center reach both wings; pieces on one wing may never reach the other in time. Central control is really a mobility bank - you're storing future tempi wherever the game breaks out. That's why a wing attack is best met by a central counterstrike: you're attacking the attacker's supply lines.",
    icon: "🎯",
  },
  {
    title: "Every pawn move is a promise",
    text: "Pawns cannot move backward, so each push permanently abandons the squares it used to guard. Philidor called pawns the soul of chess because their structure decides which pieces are good, where the breaks are, and who stands better in the endgame. Push with a plan or don't push at all.",
    icon: "♟️",
  },
  {
    title: "Prophylaxis: play their moves too",
    text: "Nimzowitsch taught that preventing your opponent's plan is as valuable as advancing your own. Before each move ask 'what do they want?' - a quiet move that kills their only idea often outscores an aggressive one that ignores it. Strong players spend half their clock inside the opponent's head.",
    icon: "🛡️",
  },
  {
    title: "The isolani's double life",
    text: "An isolated queen's pawn is a middlegame asset - open lines, a knight outpost on e5, kingside attacks - and an endgame liability that must be defended by pieces forever. So the isolani side should attack and avoid trades, while the other side swaps pieces and heads for the ending. Same pawn, two opposite games.",
    icon: "🏝️",
  },
  {
    title: "Bad bishops guard good pawns",
    text: "A bishop hemmed in by its own pawns looks miserable, but Suba noted the bad bishop often defends exactly the pawns that hold the position together. Judge bishops by their duties, not just their diagonals - and if yours truly has no future, trade it off before your opponent fixes the structure permanently.",
    icon: "⛪",
  },
  {
    title: "Do not hurry",
    text: "In technical positions, the endgame maxim 'do not hurry' means: repeat once, improve your king, fix enemy pawns on vulnerable squares, and only then break through. Rushing gives the defender the one thing that saves lost positions - concrete chances. The win ripens; your job is not to pick it green.",
    icon: "🐢",
  },
  {
    title: "The opposition is a weapon",
    text: "In king endings, facing the enemy king with one square between forces them to step aside - and that sidestep decides promotion races. Whoever does NOT have to move often controls the position; this is zugzwang in its purest form. Master this one geometric idea and basic pawn endings become arithmetic.",
    icon: "🤝",
  },
  {
    title: "Attack the base of the chain",
    text: "Nimzowitsch's rule for pawn chains: the head is protected, but the base is defended only by pieces. Strike the rear pawn (French players hit d4 with ...c5, then f6 against e5) and the whole chain sags. Chains fall backward, not forward.",
    icon: "⛓️",
  },
  {
    title: "Development is a loan",
    text: "Gambits work because time is convertible into material - and the exchange rate is brutal. If you accept a gambit, plan to return the pawn at the moment it buys back your development; if you play one, attack before the loan is called in. Morphy's games are foreclosure proceedings against people who fell behind in development.",
    icon: "⏳",
  },
  {
    title: "The bishop pair is an endgame heirloom",
    text: "Two bishops cover both colors and grow stronger as the board opens and pawns come off - unlike knights, they lose nothing to distance. Steinitz's advice: if you own the pair, open the position and avoid trading either one cheaply; if you face it, keep things closed and hunt one bishop down.",
    icon: "🔭",
  },
  {
    title: "Check all checks",
    text: "Forcing moves - checks, captures, threats - are the skeleton of calculation because they limit the opponent's replies to a countable few. Scanning them first isn't optional discipline; it's how tactics are found rather than stumbled upon. Most missed wins were legal checks nobody examined.",
    icon: "🔍",
  },
  {
    title: "The blockader does double duty",
    text: "Nimzowitsch showed that a piece blockading a passed or backward pawn isn't passive - it stands on a square the pawn can never attack, radiating influence while it guards. The knight is the ideal blockader because it loses no scope standing still. Blockade first, ask questions later.",
    icon: "🚧",
  },
  {
    title: "Play the board, not the opponent",
    text: "The position doesn't know your opponent's rating, and neither should your move selection. Fear of a title makes you passive; contempt for a low rating makes you careless - both are ways of not looking at the board. Capablanca claimed he considered only the position; it worked out fine for him.",
    icon: "🎭",
  },
  {
    title: "One weakness must be fixed first",
    text: "Before you can attack a weakness, it must be unable to run away - fix it in place with pawns or piece pressure, then pile up. A weak pawn that can advance or trade itself off was never really weak. Restrain, blockade, destroy: Nimzowitsch's sequence works in that order only.",
    icon: "📌",
  },
  {
    title: "Quantity of attackers, not courage",
    text: "A sound sacrifice on a castled king is mostly counting: attackers that can reach the king versus defenders that can come back. If you outnumber the defense at the point of contact, the material investment usually returns with interest; if not, no amount of bravery balances the books. Count before you leap.",
    icon: "🧮",
  },
  {
    title: "Endgames teach chess backwards",
    text: "Capablanca advised studying endings first, because with few pieces you see each piece's true powers in isolation - knowledge that then guides every middlegame trade. Knowing you win the resulting king-and-pawn ending converts vague pressure into a forcing sequence. The endgame is where evaluation stops being an opinion.",
    icon: "🎓",
  },
  {
    title: "The long diagonal is real estate",
    text: "A fianchettoed bishop on an open long diagonal attacks the corner, the center, and everything between - and its absence after a trade leaves permanent square weaknesses around your king. That's why trading the Dragon or King's Indian bishop is worth material, and why 'take the g7-bishop' is a whole attacking plan by itself.",
    icon: "📐",
  },
  {
    title: "Space means options",
    text: "A space advantage isn't about territory for its own sake - it means your pieces switch wings faster than theirs, so you can attack where you outnumber. The cramped side suffocates unless it trades pieces to reduce the traffic jam. Hence the twin rules: with space, avoid exchanges; without it, seek them.",
    icon: "🗺️",
  },
  {
    title: "Zugzwang: the burden of moving",
    text: "Sometimes every legal move worsens your position, and the obligation to move becomes the losing factor. Endgame technique often means passing the ball: triangulate with the king or spend a spare pawn tempo so your opponent faces the fatal turn. The strongest move in chess is occasionally the one your opponent is forced to make.",
    icon: "♻️",
  },
  {
    title: "Open files are conveyor belts",
    text: "A rook on an open file does nothing by itself - the point is the seventh rank it leads to, where rooks eat pawns and paralyze kings. So the real fight is for the file's entry square, and doubling rooks is how you win that fight. He who controls the only open file usually controls the endgame.",
    icon: "🛗",
  },
  {
    title: "Why gambiteers die in endgames",
    text: "Initiative is perishable; material is not. Every trade of pieces converts a dynamic edge into nothing while leaving the pawn deficit intact, which is why the defender against a gambit trades at every opportunity. If you play gambits, learn to sense the last moment your attack can cash in - after it, you're just down a pawn.",
    icon: "📉",
  },
  {
    title: "The f7 square is a lifelong bruise",
    text: "Defended only by the king, f7 (and f2) is the target of the oldest attacks in chess - the Fried Liver, Legal's mate, and every scholar's-mate cousin. Before castling, treat any piece aimed there as a loaded gun. After castling, the bruise moves to h7 and the Greek gift begins its patrol.",
    icon: "🩹",
  },
  {
    title: "Candidate moves before calculation",
    text: "Kotov's discipline: list the reasonable moves first, then calculate each once, rather than diving down one line and resurfacing biased. Depth without breadth misses the better move sitting one candidate to the left. The habit costs thirty seconds and refunds whole games.",
    icon: "🌳",
  },
  {
    title: "Exchange sacrifices buy squares",
    text: "A rook for a minor piece is a bad trade in a ledger and often a great one on a board: the sacrificer gets a monster knight, a wrecked pawn structure to farm, or the death of a key defender. Petrosian made careers nervous with it. Value pieces by their futures, not their price tags.",
    icon: "💱",
  },
  {
    title: "Weak squares outlive weak pawns",
    text: "A weak pawn can sometimes be traded off, but a hole - a square no pawn can ever defend again - is forever. An enemy knight arriving there becomes a permanent tenant you cannot evict, only tolerate. Count the holes you create before every pawn push; the squares remember.",
    icon: "🕳️",
  },
  {
    title: "Attack where you're stronger",
    text: "Play happens where your pawn chain points and where your pieces outnumber theirs - attacking into your opponent's strength is donating tempi. The closed-position algorithm is simple: find the wing where you have more space and force lines open exactly there. Let the pawn structure tell you which side of the board you live on.",
    icon: "🧭",
  },
  {
    title: "Time trouble is self-inflicted",
    text: "Clock catastrophe is usually caused early, by burning minutes on positions where three moves were equally fine. Spend time where the game branches - critical pawn breaks, irreversible trades - and move fast when the position is stable. The clock is a piece; blundering it loses like blundering a rook.",
    icon: "⏰",
  },
  {
    title: "The defender's best friend is a trade",
    text: "Each exchange removes an attacker from the board and a worry from the defender's ledger - mating attacks need bodies. That's why the attacker should avoid trades and the defender should offer them, even at the cost of structure. When under assault, count your opponent's attackers; when the number drops below critical mass, you've survived.",
    icon: "🤺",
  },
  {
    title: "Small advantages compound",
    text: "Steinitz's accumulation theory: winning attacks are earned by stacking minor pluses - better bishop, safer king, healthier pawns - until the position itself justifies violence. Attack prematurely and a sound defense refutes you; wait until the advantages pile up and the combination plays itself. Chess punishes both cowardice and impatience.",
    icon: "🧱",
  },
  {
    title: "Every move should have a purpose",
    text: "Capablanca's standard: each move should develop, restrain, improve, or threaten - moves that do none of these donate tempo. 'Waiting' is only a real plan in zugzwang situations; everywhere else, aimlessness is a slow blunder. If you can't say what a move accomplishes in one sentence, it probably doesn't.",
    icon: "🧠",
  },
  {
    title: "Learn from losses, verify wins",
    text: "A win can hide as many mistakes as a loss - your opponent just failed to punish them. Review defeats to find the lesson and review victories to find the luck. Botvinnik built a world-championship method on honest annotation of his own games; the habit scales down perfectly to yours.",
    icon: "📖",
  },
];

export const QUEST_POOL = [
  { key: "solve-puzzles", label: "Solve 5 puzzles", target: 5, xp: 40, track: "puzzleSolved" },
  { key: "clean-solves", label: "Solve 3 puzzles without hints", target: 3, xp: 45, track: "puzzleSolvedNoHint" },
  { key: "mate-hunter", label: "Solve 4 checkmate puzzles", target: 4, xp: 45, track: "matePuzzleSolved" },
  { key: "win-a-game", label: "Win 1 game", target: 1, xp: 50, track: "gameWon" },
  { key: "dark-side-win", label: "Win 1 game as Black", target: 1, xp: 55, track: "gameWonAsBlack" },
  { key: "play-games", label: "Play 2 games", target: 2, xp: 35, track: "gamePlayed" },
  { key: "finish-modules", label: "Complete 2 lesson modules", target: 2, xp: 40, track: "moduleDone" },
  { key: "opening-scholar", label: "Complete 1 opening module", target: 1, xp: 35, track: "openingModuleDone" },
  { key: "endgame-grinder", label: "Complete 2 endgame drills", target: 2, xp: 45, track: "endgameDrillDone" },
  { key: "review-mistakes", label: "Complete 1 game review", target: 1, xp: 40, track: "reviewDone" },
  { key: "rush-hour", label: "Play 1 round of puzzle rush", target: 1, xp: 35, track: "rushPlayed" },
  { key: "daily-devotion", label: "Solve the daily puzzle", target: 1, xp: 30, track: "dailyPuzzleDone" },
  { key: "no-takebacks", label: "Win 1 game without takebacks", target: 1, xp: 60, track: "takebackFreeWin" },
  { key: "precision-play", label: "Finish 1 game with 85%+ accuracy", target: 1, xp: 55, track: "accuracy85Game" },
];
