// feedback.js — chess coach feedback corpus for the training app.
// Pure ES module: no imports, no DOM. Exports coachComment, gameSummary,
// puzzleLine, botTaunt, botChat, openingDeparture, rushLine, mysteryLine.
// All selection goes through an anti-repeat picker so a player essentially
// never sees the same sentence twice in a session.

/* ------------------------------------------------------------------ */
/* Anti-repeat picker                                                  */
/* ------------------------------------------------------------------ */

// key -> array of recently used indices (most recent last)
const _recent = new Map();

function _pickIndex(key, eligible, poolLen) {
  let seen = _recent.get(key);
  if (!seen) {
    seen = [];
    _recent.set(key, seen);
  }
  let candidates = eligible.filter((i) => !seen.includes(i));
  if (candidates.length === 0) {
    // Pool has cycled — reset memory for this key.
    seen.length = 0;
    candidates = eligible;
  }
  const idx = candidates[Math.floor(Math.random() * candidates.length)];
  seen.push(idx);
  const cap = Math.min(8, Math.max(1, poolLen - 1));
  while (seen.length > cap) seen.shift();
  return idx;
}

function pick(pool, key) {
  const all = [];
  for (let i = 0; i < pool.length; i++) all.push(i);
  return pool[_pickIndex(key, all, pool.length)];
}

// Like pick(), but skips templates whose slots can't be filled sensibly:
// {cploss} requires cpLoss >= 30; {best} requires a bestSan.
function pickTemplate(pool, key, ctx) {
  const eligible = [];
  for (let i = 0; i < pool.length; i++) {
    const t = pool[i];
    if (t.indexOf('{cploss}') !== -1 && !(typeof ctx.cpLoss === 'number' && ctx.cpLoss >= 30)) continue;
    if (t.indexOf('{best}') !== -1 && !ctx.bestSan) continue;
    eligible.push(i);
  }
  const use = eligible.length ? eligible : pool.map((_, i) => i);
  return pool[_pickIndex(key, use, pool.length)];
}

/* ------------------------------------------------------------------ */
/* Interpolation                                                       */
/* ------------------------------------------------------------------ */

function pawnsText(cp) {
  const v = (Math.max(0, Number(cp) || 0) / 100).toFixed(1);
  return v + ' pawns';
}

function fill(t, ctx) {
  return t
    .replace(/\{san\}/g, ctx.san || 'that move')
    .replace(/\{best\}/g, ctx.bestSan || 'the stronger move')
    .replace(/\{piece\}/g, ctx.piece || 'piece')
    .replace(/\{cploss\}/g, pawnsText(ctx.cpLoss))
    .replace(/\{phase\}/g, ctx.phase || 'game');
}

/* ------------------------------------------------------------------ */
/* Core move-comment templates (9 classes, 22+ each)                   */
/* ------------------------------------------------------------------ */

const CORE = {
  brilliant: [
    '{san}!! I\'d frame this one. Most players never even consider it.',
    'Take a bow — {san} is the kind of move that wins games and hearts.',
    '{san} is a genuine leap of imagination. The engine agrees, and so do I.',
    'Did you see the whole line, or did you just feel it? Either way, {san} is superb.',
    '{san}!! That\'s not a move, that\'s a statement.',
    'Moves like {san} are why we love this game.',
    '{san} looks impossible until it works. It works.',
    'I\'ve coached a lot of players. Very few find {san} over the board.',
    'The board just lit up — {san} changes everything in your favor.',
    '{san}!! Quiet brilliance. Your opponent won\'t believe what hit them.',
    'That\'s a magician\'s move. {san} pulls the advantage out of thin air.',
    'Whatever you had for breakfast today, have it again. {san} is inspired.',
    '{san} gives up material for something far more valuable: the truth of the position.',
    'Your {piece} just became a legend. {san} is the move of the game.',
    'Pause and appreciate this one — {san} is tournament-highlight material.',
    '{san}!! The engine had to look twice, and it doesn\'t even blink.',
    'This is the move strong players talk about afterwards. {san} — wonderful.',
    'Cold-blooded and correct. {san} deserves two exclamation marks.',
    'You found the needle in the haystack. {san} was the only move this good.',
    '{san} in the {phase} — that\'s vision most players only dream about.',
    'If chess had style points, {san} just maxed them out.',
    'There were safe moves everywhere, and you chose greatness. {san}!!',
    '{san}!! I gasped. Genuinely.',
    '{san}!! Sacrificing material to rip open the king\'s cover — that\'s the highest form of chess courage.',
    'The {piece} plants itself on an unassailable outpost. {san} is a positional masterpiece.',
    '{san} exploits the back rank in a way most players never see coming.',
    'Every one of your pieces is pointed at the enemy king now. {san} is the crowning idea.',
    '{san}!! The pawn structure told the story, and you read every word of it.',
    'You saw that the defender was overloaded and struck instantly. {san} is precision tactics.',
    '{san} turns an open file into a highway straight into their position.',
    'A quiet move in a burning position — {san} is the kind of calm only real vision provides.',
    '{san}!! You weakened their king one square at a time, and now the bill comes due.',
    'That loose {piece} never stood a chance. {san} collects with interest.',
    '{san} wins the battle for the seventh rank — and the seventh rank wins games.',
    'Development, king safety, initiative — {san} converts all three into something devastating.',
  ],

  great: [
    '{san}! A great find — that\'s the move the position was begging for.',
    'Strong. {san} squeezes real advantage out of a tricky spot.',
    '{san} is exactly what a coach wants to see: concrete and confident.',
    'Excellent judgment — {san} keeps every promise the position made.',
    'You spotted the key idea. {san} is a big step toward the full point.',
    '{san}! Not many players find that under pressure.',
    'That {piece} is doing serious work now. {san} was the way.',
    'Sharp eyes — {san} punishes your opponent\'s last move immediately.',
    '{san} shows real understanding of the {phase}. Well done.',
    'Yes! {san} was the critical move, and you didn\'t flinch.',
    'A great move at a great moment — {san} tilts the game your way.',
    '{san}! The engine nods approvingly, and so do I.',
    'You could smell the opportunity, couldn\'t you? {san} grabs it.',
    'Precise and powerful. {san} was much stronger than it looks.',
    '{san} finds the resource most players would miss. Impressive.',
    'That\'s how you convert pressure into progress — {san}!',
    'Bravo — {san} threads the needle exactly right.',
    'The position asked a hard question, and {san} is the correct answer.',
    '{san}! One move, several problems solved.',
    'Your calculation is paying dividends. {san} is a great choice.',
    'There was one path forward and you found it: {san}.',
    '{san} turns a small edge into a real one. Textbook.',
    'Now that\'s initiative — {san} keeps your opponent on the back foot.',
    '{san}! Seizing the open file before your opponent even noticed it was open.',
    'The {piece} finds a dream outpost with {san} — a piece like that anchors the whole position.',
    '{san} hits the loose {piece} and improves your position in the same breath.',
    'Excellent — {san} fixes their pawns on weak squares for the rest of the game.',
    '{san}! Prying open lines toward the king while your own stays snug.',
    'Your back rank is covered and theirs is creaking — {san} understands the whole board.',
    '{san} wins the fight for the center the honest way: with better development.',
    'That pawn break was the position\'s big question, and {san} times it perfectly.',
    '{san}! Rooks belong on open files, and yours just claimed the best one.',
    'You spotted the overloaded defender — {san} makes it pay.',
    '{san} trades off their best piece and leaves them with the bad one. Veteran stuff.',
    'King safety first, ambition second — {san} gets the order exactly right.',
  ],

  best: [
    '{san} — the engine\'s top choice. Clean as it gets.',
    'Perfect. {san} is exactly what the position demands.',
    '{san} is the strongest move on the board. No notes.',
    'Machine-level precision — {san} is the best move here.',
    'You and the engine agree: {san} is the way.',
    'Top choice. {san} keeps everything under control.',
    '{san} — accurate, principled, and best. Keep this up.',
    'Nothing to improve here. {san} was the move.',
    'That\'s the one. {san} maintains your best possible position.',
    '{san}: first line of the engine. Your instincts are dialed in.',
    'Optimal play — {san} doesn\'t give an inch.',
    'The {piece} lands exactly where it belongs. {san} is best.',
    'Flawless choice. {san} beats every alternative.',
    '{san} is precisely right for this stage of the {phase}.',
    'If I were annotating this game, {san} gets a clean check mark.',
    'Right move, right time — {san}.',
    'You keep finding the top move. {san} continues the run of good decisions.',
    'The computer couldn\'t have played it better: {san}.',
    '{san} — simple, strong, and correct.',
    'Accuracy like this wins games. {san} is the engine\'s pick.',
    'No hesitation needed — {san} was clearly best, and you played it.',
    'That\'s precision chess. {san} is the strongest continuation.',
    '{san} — best move, and it keeps your pawn structure clean as a whistle.',
    'The engine\'s first choice: {san} centralizes and coordinates in one stroke.',
    '{san} is best — it develops with tempo and asks a question at the same time.',
    'Top move. {san} keeps your king safe and your options open.',
    '{san} — the strongest square on the board for that {piece}, full stop.',
    'Best again. {san} keeps every loose piece defended — no free tactics for anyone.',
    '{san} controls the key central squares, and the engine has nothing to add.',
    'The file, the diagonal, the outpost — {san} takes the best of what the board offers.',
    '{san} is the engine\'s pick: it improves your worst piece at exactly the right moment.',
    'Perfect timing on the pawn break — {san} is the top move.',
    '{san} — best move. Your development runs like a Swiss watch.',
    'No loose ends: {san} covers the back rank and keeps pressing. Best move.',
  ],

  good: [
    '{san} is a solid, healthy move. Nothing wrong with that.',
    'Good chess. {san} keeps your position comfortable.',
    '{san} works fine — you\'re staying on track.',
    'A sensible choice. {san} keeps the game firmly in hand.',
    '{san} is a fine move; {best} was a touch more ambitious, but no complaints.',
    'Solid. {san} develops your game without creating weaknesses.',
    'You\'re playing sound chess — {san} is a reasonable way forward.',
    '{san} keeps things tidy. Small improvements exist, but this is good.',
    'No harm done — {san} holds everything together.',
    'That\'s a practical decision. {san} keeps your plan moving.',
    '{san} is good. The {piece} is happier there.',
    'Steady hands. {san} avoids all the traps in the position.',
    'A good move in the {phase} — {san} fits the needs of the position.',
    '{san} gets a thumbs up. Keep building.',
    'Reasonable and safe — {san} does the job.',
    'You\'re making healthy decisions. {san} is one of them.',
    '{san} is perfectly playable. Your position stays pleasant.',
    'Nice and solid. {san} gives your opponent nothing to bite on.',
    'Good instinct — {san} keeps your pieces coordinated.',
    '{san} maintains the balance. Sometimes that\'s exactly the goal.',
    'That works. {san} keeps your options open for later.',
    'A dependable move. {san} won\'t win the game alone, but it won\'t lose it either.',
    'Fine choice — {san} keeps the pressure where you want it.',
    '{san} keeps your pawn structure intact — solid foundations win long games.',
    'A healthy developing move. {san} brings another piece to the fight.',
    '{san} tucks your king a little safer — you can never be too careful with the back rank.',
    'Good — {san} keeps the {piece} defended and your camp tidy.',
    '{san} claims a fair share of the center. Perfectly sound.',
    'That\'s useful — {san} prepares the pawn break without committing too early.',
    '{san} keeps a lid on their counterplay. Sometimes prevention is the whole plan.',
    'Sensible — {san} avoids leaving anything hanging. Loose pieces drop off, as they say.',
    '{san} strengthens your grip on the open file, even if bigger ideas existed.',
    'Good housekeeping: {san} takes care of the back rank before it becomes a problem.',
    '{san} is fine — it keeps your pieces coordinated and your king out of drafts.',
    'A solid choice. {san} improves your worst-placed piece, which is never wrong.',
  ],

  book: [
    'Still in theory — {san} has been played thousands of times.',
    '{san} is straight out of the opening books. Well studied!',
    'Theory approves. {san} is a known main line.',
    'You\'re walking a well-trodden path — {san} is book.',
    'Grandmasters have played {san} here for decades.',
    '{san}: classical opening theory. The real battle hasn\'t started yet.',
    'Book move. {san} keeps you in familiar territory.',
    'The database knows this one well — {san} is mainline theory.',
    '{san} follows established theory. Smooth start.',
    'Nothing new under the sun — {san} is a standard book move.',
    'Opening principles in action: {san} is right from the repertoire.',
    'That\'s the known move here. {san} keeps you in book.',
    '{san} — a move with a long pedigree. Theory continues.',
    'You clearly know your openings. {san} is the book continuation.',
    'Still following the masters — {san} is well-established theory.',
    '{san} is as standard as it gets. Development on schedule.',
    'The opening is going by the book — literally. {san}.',
    'No surprises yet: {san} is well-known theory.',
    '{san} has generations of practice behind it. Good preparation.',
    'Right on script — {san} is the theoretical move.',
    'Your opening knowledge shows. {san} is textbook.',
    'This position has been reached a million times, and {san} is the trusted reply.',
    '{san} — theory. Both sides are still fighting for the center by the book.',
    'Book move. {san} develops toward the center, exactly as the old masters drew it up.',
    'Still theory: {san} keeps the pawn structure in one of the great classical shapes.',
    '{san} is mainline — castle soon and the opening report card stays spotless.',
    'The books like {san}: development first, adventures later.',
    '{san} — known theory, and it follows the golden rule: knights out, king safe.',
    'Theory continues with {san}. The central tension is exactly as the masters left it.',
    '{san} is the book move, holding the center while both kings look for shelter.',
    'Right out of the repertoire — {san} keeps every developing option open.',
    'The database nods: {san}. Thousands of games start exactly this way.',
    '{san} — book. The fight for the central squares is right on schedule.',
    'Still in the book — {san} is how this opening keeps its shape.',
  ],

  inaccuracy: [
    '{san} is a little slow — {best} was more to the point.',
    'Hmm, {san} works, but {best} asked tougher questions.',
    'A small slip: {san} gives back some of your edge. {best} kept it all.',
    '{san} isn\'t bad, just not best. {best} was the crisper choice.',
    'Careful — {san} loosens your grip slightly. {best} stayed firm.',
    'The engine prefers {best} here; {san} lets your opponent breathe.',
    '{san} costs you about {cploss}. Not fatal, but {best} was cleaner.',
    'Close, but not quite — {best} was the move. {san} drifts a bit.',
    'That {piece} had a better square. {best} beats {san} here.',
    '{san} is the kind of move that feels fine and isn\'t quite. {best} was sharper.',
    'Slightly off track. {best} kept the initiative; {san} shares it.',
    'You had something better: {best}. {san} makes the win harder work.',
    'A wobble — {san} concedes a bit of ground. {best} held the line.',
    'In the {phase}, small details matter. {best} was more precise than {san}.',
    '{san} invites unnecessary complications. {best} kept things simple.',
    'Not the end of the world, but {best} was stronger than {san}.',
    'Second-best moves add up. {best} was what the moment demanded.',
    '{san} loses a bit of the thread — roughly {cploss}. Stay alert.',
    'Did you consider {best}? It does everything {san} does, plus more.',
    'Your position is still fine, but {best} would have kept the pressure on.',
    'Minor drift: {san} lets the tension fizzle. {best} kept your opponent uncomfortable.',
    '{san} slightly misplaces your {piece}. {best} coordinated better.',
    'A touch passive — {best} was the more active try over {san}.',
    '{san} leaves the {piece} a little loose — loose pieces have a way of dropping off.',
    'A small drift: {san} loosens the squares around your king. {best} kept the shelter intact.',
    '{san} gets in the way of your own development — {best} kept the pieces flowing.',
    'The open file was the prize, and {san} lets it slip. {best} claimed it.',
    '{san} releases the central tension a move too soon. {best} kept your opponent guessing.',
    'Careful with the back rank — {san} leaves it thinner than {best} would have.',
    '{san} moves the same piece again while others sit at home. {best} finished development first.',
    'That pawn move can\'t be taken back — {san} leaves a hole {best} avoided.',
    '{san} trades your active {piece} for a passive one. {best} kept the better minor piece.',
    'A tempo slips away with {san}; {best} developed with a threat attached.',
    '{san} lets an enemy knight eye a comfortable outpost. {best} kept it out.',
    '{san} costs about {cploss} of quiet positional ground — {best} kept the structure sound.',
  ],

  mistake: [
    '{san} hurts — that\'s about {cploss} gone. {best} was the move.',
    'Ouch. {san} hands your opponent real chances. {best} kept control.',
    'That one stings. {best} was much stronger than {san}.',
    '{san} misses the point of the position — {best} was the idea.',
    'Your {piece} steps into trouble with {san}. {best} avoided all of it.',
    'A real mistake: {san} gives your opponent exactly what they wanted.',
    'The tide shifts with {san}. {best} would have kept you steering.',
    '{san} drops roughly {cploss}. Take a breath before moves like this one.',
    'There was a better story here: {best}. {san} writes the wrong chapter.',
    'That\'s a concession — {san} lets the advantage slip. {best} held firm.',
    '{san} overlooks your opponent\'s reply. {best} kept everything covered.',
    'Hard truth: {san} is a mistake. {best} was available and much better.',
    'The position just got harder for you. {best} instead of {san} kept it comfortable.',
    '{san} weakens exactly the wrong squares. {best} kept the structure sound.',
    'You had {best} in hand — {san} lets your opponent back in.',
    'Momentum lost. {san} costs around {cploss}; {best} kept the pressure on.',
    'That {piece} wanted a different job. {best} was right; {san} isn\'t.',
    'In the {phase}, {san} is the kind of move that turns games. {best} was safer and stronger.',
    '{san} walks past the critical idea. {best} was the move to find.',
    'One inaccurate thought, one real cost — {san} instead of {best}.',
    'Your opponent will quietly thank you for {san}. {best} gave them nothing.',
    'Reality check: {san} loses ground you\'d fought hard for. {best} kept it.',
    '{san} asks nothing of your opponent. {best} asked everything.',
    '{san} leaves your {piece} loose, and your opponent has ways to hit it. {best} kept everything guarded.',
    'The king\'s shelter cracks with {san} — those pawn moves are forever. {best} kept the wall standing.',
    '{san} surrenders the open file, and rooks live for open files. {best} fought for it.',
    'A development mistake: {san} leaves your pieces stepping on each other. {best} untangled them.',
    '{san} drops the thread on the back rank — {best} covered it first.',
    '{san} hands their knight a permanent outpost in your camp. {best} denied the square.',
    'That trade helps only your opponent — {san} swaps your active piece for a bystander. {best} kept the tension.',
    '{san} weakens a whole color complex around your king. {best} kept those squares covered.',
    'Pawn structure is a long-term contract, and {san} signs a bad one. {best} read the fine print.',
    '{san} walks into a pin that {best} sidestepped — roughly {cploss} of trouble.',
    'You pushed the attack before finishing development — {san} overreaches where {best} built first.',
    '{san} abandons the defense of a key square, and your opponent will move in. {best} held the post.',
  ],

  blunder: [
    'Ouch — {san} walks straight into trouble. {best} kept everything defended.',
    '{san} is a blunder, plain and simple. {best} was the saving move.',
    'Oh no. {san} gives away about {cploss} in one stroke.',
    'Stop the clock — {san} hangs material. {best} kept it all safe.',
    'That\'s the one you\'ll want back. {best}, not {san}.',
    '{san} misses your opponent\'s threat entirely. {best} dealt with it.',
    'Everything was fine until {san}. {best} kept the ship afloat.',
    'Your {piece} just walked off a cliff. {best} was the safe path.',
    '{san} loses roughly {cploss} on the spot. Always check what\'s attacked before you move.',
    'The evaluation just fell off a table. {best} avoided all of this.',
    'A tough moment — {san} gives your opponent a winning shot. {best} held everything.',
    'That move hurts to watch. {san} collapses the position; {best} kept it standing.',
    '{san}? The board had warning signs everywhere. {best} read them.',
    'One move, one disaster — {san}. The fix was {best}.',
    'Blunders happen to everyone. This one, {san}, was avoidable with {best}.',
    '{san} leaves your {piece} hanging. Scan for undefended pieces before committing.',
    'The whole game changes with {san}. {best} would have kept you right in it.',
    'That\'s a heavy price — about {cploss} — for one hasty move. {best} was right there.',
    '{san} ignores the most forcing reply. {best} answered it in advance.',
    'I have to be honest: {san} is the low point of the game so far. {best} instead.',
    'Your opponent couldn\'t have asked for a bigger gift than {san}.',
    'Freeze this position and study it — {san} loses, {best} holds. That\'s the lesson.',
    '{san} in the {phase} is exactly the kind of move a slow, careful scan prevents.',
    '{san} hangs the {piece} outright — one glance at the attackers would have saved it. {best} was safe.',
    'Back-rank alarm! {san} ignores the weakest square on the board. {best} dealt with it in time.',
    '{san} walks the king into the open in the middle of a firefight. {best} kept it behind the wall.',
    'A fork was staring at you, and {san} steps right onto its prongs. {best} kept your pieces apart.',
    '{san} leaves too many pieces on the same line — that\'s how skewers happen. {best} broke the alignment.',
    'Count the defenders! {san} loses the capture race on that square. {best} kept the numbers in your favor.',
    '{san} forgets the golden rule: check every check. Your opponent has a brutal one now. {best} prevented it.',
    'The {piece} had one job — guarding the key square — and {san} sends it away. {best} kept the guard on duty.',
    '{san} opens the very file your opponent\'s rooks were praying for. {best} kept it closed.',
    'That\'s about {cploss} out the window — {san} misses a simple capture in reply. {best} saw it coming.',
    '{san} undermines your own king\'s cover at the worst moment. {best} kept the fortress intact.',
    'Loose pieces drop off, and {san} just left two of them loose. {best} tidied up first.',
  ],

  miss: [
    'So close! {best} was winning on the spot — {san} lets it slip.',
    'You had a golden chance: {best}. {san} walks right past it.',
    'The door was wide open, and {best} walked through it. {san} closes it again.',
    'Argh — {best} was the killer blow. {san} lets your opponent off the hook.',
    'There was a tactic here. {best} wins material; {san} misses it.',
    'Your opponent left the vault unlocked. {best} was the combination; {san} wasn\'t.',
    'One move from glory — {best}. Instead, {san} keeps the game going.',
    '{san} is fine chess, but {best} was special. Look at this position again later.',
    'The moment came and went. {best} was the punishment your opponent feared.',
    'A missed opportunity: {best} would have changed the game. {san} keeps the status quo.',
    'Tactics alert! {best} was sitting right there. Train the pattern and you\'ll spot it next time.',
    '{best} wins immediately — the kind of shot worth slowing down to find. {san} misses it.',
    'You looked away at just the wrong moment. {best} was crushing.',
    'The {piece} could have been a hero with {best}. {san} keeps it ordinary.',
    'That was your invitation to end things — {best}. {san} declines it politely.',
    'Half a point, maybe more, just slid by. {best} was the move; {san} lets it go.',
    'Big chance missed: {best}. When your opponent\'s last move looks odd, hunt for a refutation.',
    'The engine is shouting {best} here. {san} isn\'t wrong, but it isn\'t the win.',
    'You\'ll see it instantly in review: {best}. In the game, {san} slipped past it.',
    'Your calculation stopped one move too soon — {best} was the point.',
    '{san} keeps the game level when {best} could have tipped it decisively.',
    'Every game has one moment like this. {best} was yours, and {san} let it pass.',
    'The back rank was wide open — {best} crashes through. {san} knocks politely instead.',
    'A piece was hanging in broad daylight! {best} simply takes it; {san} looks the other way.',
    '{best} forks king and rook — a pattern worth a thousand rating points. {san} passes it by.',
    'The overloaded defender was the clue, and {best} was the answer. {san} misses the tell.',
    'One deflection and it all collapses: {best}. {san} lets the defense stand.',
    '{best} wins material with a simple skewer — file it under patterns to drill. {san} slips past it.',
    'Your pieces were all pointing at the king; {best} pulls the trigger. {san} holsters the attack.',
    'The pin was begging to be exploited — {best} piles on. {san} lets it wriggle free.',
    '{best} traps the piece that wandered too far from home. {san} lets it stroll back.',
    'A discovered attack was loaded and ready: {best}. {san} never flips the switch.',
    'The seventh rank was yours for the taking with {best}. {san} stays on the ground floor.',
    '{best} punishes the weakened king cover instantly. {san} gives them a move to repair it.',
  ],
};

/* ------------------------------------------------------------------ */
/* Tone packs: 'dry' and 'savage' core pools (warm = CORE above)       */
/* ------------------------------------------------------------------ */

const CORE_DRY = {
  brilliant: [
    '{san}. The engine paused. I paused. Well.',
    '{san}!! Statistically, humans do not find this move. Noted.',
    'Objectively excellent. {san}. I have nothing to add.',
    '{san}. Brilliant, per the evaluation. My tone will remain professional.',
    'A sacrifice, and a sound one. {san}. Unusual.',
    '{san}. That was the best kind of move: the correct kind, only harder.',
    'The evaluation approves of {san} enthusiastically. I approve of it adequately.',
    'Record shows: {san}, brilliant. Carry on.',
    '{san}. I ran the line twice. It holds. Congratulations are implied.',
    'This is the part where a coach gasps. {san}. Consider me gasped.',
    '{san}!! Two exclamation marks. Regulation requires it.',
  ],
  great: [
    '{san}. Strong move. Fact, not flattery.',
    'A great move: {san}. The position improves. So does my mood, marginally.',
    '{san}. Correct idea, correct execution. Rare combination.',
    'The critical move was {san}. You played {san}. Efficient.',
    '{san}. Your {piece} is now gainfully employed.',
    'Great find. {san}. The alternatives were worse, and now they are irrelevant.',
    '{san}. Pressure applied. Opponent inconvenienced. Good.',
    'Noted: {san}, strong, timely. Continue.',
    '{san} asks a difficult question. Their position has no good answers on file.',
    'An excellent move in the {phase}. {san}. That is all.',
  ],
  best: [
    '{san}. Adequate.',
    'Engine\'s first choice: {san}. Concur.',
    '{san}. Best move. No further commentary required.',
    'Optimal. {san}. Next.',
    'The position wanted {san}. It got {san}. Order restored.',
    '{san} — top line. Accuracy noted for the record.',
    'Best available: {san}. Played: {san}. Discrepancy: none.',
    '{san}. Precisely the move. Precision acknowledged.',
    'Analysis complete. {san} was best. Dismissed with honors.',
    '{san}. Correct. This is what correct feels like.',
  ],
  good: [
    'That was a move. {best} was the move.',
    '{san}. Fine. Not a highlight, not a problem.',
    'Acceptable. {san} maintains the position and my composure.',
    '{san}. Sound. The bar was not high, but it was cleared.',
    'No objections to {san}. Some enthusiasm withheld for budget reasons.',
    '{san}. Reasonable. The {piece} is fine there.',
    'A normal move: {san}. Chess contains many of these.',
    '{san}. Solid. Filed under: perfectly okay.',
    'Nothing lost, nothing gained. {san}. Equilibrium.',
    '{san} keeps the position stable. Stability: confirmed.',
  ],
  book: [
    '{san}. Theory. The database yawns approvingly.',
    'Book move. {san}. Several million games agree, which is enough.',
    '{san}. Known since before either of us existed.',
    'Still in book. Wake me when someone thinks for themselves.',
    '{san}. Theory continues. My commentary will resume when chess begins.',
    'Opening theory: {san}. Correct by citation.',
    '{san}. Mainline. As predicted by everyone.',
    'The book says {san}. You said {san}. Riveting.',
    '{san}. Standard. The masters worked this out; you memorized it. Fair division of labor.',
    'Theory move logged: {san}. Preparation detected.',
  ],
  inaccuracy: [
    '{san}. Slightly worse than {best}. Slightly is how it starts.',
    'An inaccuracy. {san} costs about {cploss}. Small, but I keep receipts.',
    '{san}. Playable. {best} was preferable. These facts coexist.',
    'Minor drift detected: {san}. Recommended: {best}.',
    '{san}. Not wrong, exactly. Not right, exactly. Exactly was {best}.',
    'The engine sighs quietly at {san}. It preferred {best}.',
    '{san}. The position forgives you. The evaluation does not, entirely.',
    'Suboptimal: {san}. Cost: roughly {cploss}. Severity: mild. Trend: concerning.',
    '{san} does less than {best}. That is the entire analysis.',
    'A small concession: {san}. Your {piece} had better options.',
  ],
  mistake: [
    '{san}. That was a mistake. I say this with clinical detachment.',
    'Error logged: {san}. Correct entry was {best}.',
    '{san} costs about {cploss}. I am not angry. I am an evaluation function.',
    'The move was {san}. The move should have been {best}. Please adjust accordingly.',
    '{san}. Your opponent\'s position improved without their participation.',
    'Objectively: a mistake. {best} was available the entire time.',
    '{san}. The {piece} is now a liability. Previously, it was a piece.',
    'Diagnosis: {san}, mistake, approximately {cploss}. Prescription: {best}, next time.',
    '{san}. The evaluation dropped. It does that when you do this.',
    'I have annotated {san} with a question mark. It earned it.',
  ],
  blunder: [
    '{san}. A blunder. I checked twice, hoping.',
    'Blunder confirmed: {san}. Loss: about {cploss}. Cause: unclear. Effect: very clear.',
    '{san}. The {piece} is gone. It sends its regards.',
    'The evaluation just did something I can only describe as a cliff.',
    '{san}. Your opponent says thank you. I am contractually obligated to say {best}.',
    'That was {san}. It should have been {best}. The difference is the game.',
    '{san}. I have seen worse moves. I keep a list. You are on it now.',
    'Status update: {san} hangs material. Material objects.',
    '{san}. Roughly {cploss} evaporated. Matter cannot be created or destroyed, except like this.',
    'A blunder, formally speaking. Informally: {best} was right there.',
    '{san}. The position was fine. Was.',
  ],
  miss: [
    '{best} was winning. {san} is not. End of report.',
    'Missed: {best}. Played: {san}. Filed under: opportunities, former.',
    '{san}. There was a tactic. There is no longer a tactic.',
    'The win was available at {best}. It has since closed for the evening.',
    '{san}. Note for the archive: {best} ended the game here.',
    'Opportunity detected, opportunity declined. {best} over {san}, for the record.',
    '{san} is fine. {best} was final. Different words for a reason.',
    'The engine highlighted {best} in bold. You went with {san}, in lowercase.',
    'The moment came, saw {san}, and left. It preferred {best}.',
    'Half the game just walked by unclaimed. Its name was {best}.',
  ],
};

const CORE_SAVAGE = {
  brilliant: [
    '{san}?? Wait. That works?! Okay, show-off.',
    '{san}!! Who are you and what have you done with the player from three moves ago?',
    'Excuse me?? {san} is disgusting. I mean that as the highest compliment.',
    '{san}!! The engine and I need a moment. Rude of you to be this good suddenly.',
    'Oh, so NOW we\'re playing like a genius. {san} is filthy.',
    '{san}!! Your opponent just got dunked on from half court.',
    'I came here to roast and you play {san}. How dare you leave me speechless.',
    '{san} is the kind of move that ends friendships. Beautiful.',
    'Somebody call the authorities — {san} just committed a crime against that position.',
    '{san}!! Okay, okay. I see you. The {piece} understood the assignment.',
  ],
  great: [
    '{san}! Look at you, playing actual chess. Their position is in shambles.',
    'Oof — for THEM. {san} hurts and I love it.',
    '{san}? Rude. Effective, but rude. Keep it up.',
    'Their position after {san}: thoughts and prayers.',
    '{san}! The {piece} woke up and chose violence.',
    'Great move. Your opponent\'s plan just got repossessed.',
    '{san} is a subpoena. They have to answer it and they won\'t enjoy it.',
    'Somewhere, your opponent\'s coach is drafting an apology. {san}!',
    '{san}! Bullying the position within the rules. Technically legal, morally spicy.',
    'That was a mugging in broad daylight. {san} takes everything but the wallet.',
  ],
  best: [
    '{san}. Engine-approved. Insufferable, but engine-approved.',
    'Best move. Fine. I\'ll find something to roast eventually.',
    '{san} is literally the top choice. Who gave you permission to be accurate?',
    'Perfect move. Disgusting behavior. Continue.',
    '{san}. The engine\'s pick. My roast folder remains tragically empty this turn.',
    'Ugh, best move again. You\'re making my job impossible and their position worse.',
    '{san}. Ten out of ten. Zero material for me. Selfish, honestly.',
    'The machine says {san} is perfect. The machine is annoyingly right.',
    '{san}? Flawless. I checked twice specifically hoping it wasn\'t.',
    'Best move on the board. Your opponent, meanwhile, is aging in real time.',
  ],
  good: [
    '{san}. Fine. Beige. Load-bearing wallpaper of a move.',
    'A good move. Not a great one. Like decaf: technically coffee.',
    '{san} is solid, in the way that oatmeal is solid.',
    'Sure, {san} works. {best} would\'ve slapped, though.',
    '{san}. The chess equivalent of replying "k" — acceptable, uninspiring.',
    'Playable. Safe. {san} is the sensible sedan of moves.',
    '{san}? Bold strategy of doing the medium thing. It\'s fine. It\'s all fine.',
    'Good move, no notes. Well, one note: {best} existed.',
    '{san} keeps the position afloat, like a pool noodle keeps you "swimming".',
    'The {piece} is fine there. Fine. Such a passionate word, "fine".',
  ],
  book: [
    '{san}. Theory. Congrats on the copy-paste, it\'s well executed.',
    'Book move. Even my toaster knows this line.',
    '{san}: brought to you by centuries of dead grandmasters. They did the hard part.',
    'Ah yes, {san}. Groundbreaking. In 1885.',
    'Still in book — nobody has had an original thought yet. Thrilling stuff.',
    '{san}. Theory says hi. Wake me when someone blunders.',
    'Memorization detected: {san}. Chess starts when the book runs out. Any minute now.',
    '{san} — mainline. Riveting. The plot may eventually thicken.',
    'Yes, {san}, the move every database has seen a million times. Trendsetter.',
    'Book move {san}. You and forty million other games. Very exclusive club.',
  ],
  inaccuracy: [
    '{san}? It\'s not wrong, it\'s just... a little embarrassing next to {best}.',
    'The move was RIGHT THERE. {best}. You chose {san}. Interesting lifestyle.',
    '{san} is the "reply all" of chess moves — harmless-ish, mildly regrettable.',
    'Small oof. {san} leaks about {cploss}. The bucket has a hole, captain.',
    '{san}? The {piece} would like to file a complaint about its new address.',
    'That move drifted like a shopping cart with a bad wheel. {best} steered straight.',
    '{san}. Your advantage called — it\'s feeling smaller and a little neglected.',
    'Mildly crusty. {san} works, but {best} was the fresh loaf.',
    'A whole {cploss} donated to charity. Generous. {best} kept the change.',
    '{san}, huh? The engine\'s left eyebrow just rose four centimeters.',
  ],
  mistake: [
    '{san}?? The position filed for divorce. It cited {best} as the one that got away.',
    'Oh no. {san} just donated about {cploss} to your opponent\'s retirement fund.',
    'The {piece} did not sign up for this. {best} treated it with respect.',
    '{san} is a bold choice, in the way that texting your ex is a bold choice.',
    'Your opponent saw {san} and heard angels sing.',
    'That move has strong "left the stove on" energy. {best} turned it off.',
    '{san}?? Somewhere the engine is rubbing its temples.',
    '{best} was the assignment. {san} is what you turned in. Partial credit denied.',
    'The advantage packed a suitcase when it saw {san}. It left a note: "{best}."',
    'I\'d call {san} a mistake, but honestly the mistake community deserves better.',
  ],
  blunder: [
    '{san}?? My condolences to your rook.',
    'Bold of you to leave the queen hanging like laundry. {san}, everyone.',
    '{san}?? I\'ve seen pinatas defend themselves better.',
    'That wasn\'t a move, that was a donation receipt for {cploss}.',
    'The {piece} just speed-ran its own funeral. {best} was witness protection.',
    '{san}?? Your opponent is checking if this is a trap. It is not a trap.',
    'Alert the museum — {san} belongs in the blunder wing, east gallery.',
    'The evaluation bar just rage-quit. {best} could have prevented this documentary.',
    '{san} has the same energy as locking your keys inside a running car.',
    'One move. {cploss}. Gone. Even the engine needed a snack break after that.',
    '{san}?? The board has 64 squares and you found the one with a trapdoor.',
  ],
  miss: [
    '{best} was RIGHT THERE, wearing a neon sign. {san} walked past it into the gift shop.',
    'You had a thunderbolt in {best} and chose... {san}. The restraint. The tragedy.',
    'The win knocked. {san} pretended not to be home. {best} would\'ve opened the door.',
    'Your opponent left the vault open with the lights on, and {san} tiptoed by. {best} took everything.',
    '{best} wins on the spot. {san} wins a participation ribbon.',
    'That was a free buffet and {san} ordered water. {best} was the whole menu.',
    'The tactic waved. It jumped. It held a sign that said "{best}". You played {san}.',
    'Somewhere a highlight reel just lost its best clip. {best}, for the record.',
    '{san} is fine, if you enjoy longer games. {best} enjoyed ending them.',
    'The engine is pointing at {best} like a dog at a squirrel. {san} never looked up.',
  ],
};

/* ------------------------------------------------------------------ */
/* Conditional overlay pools                                           */
/* ------------------------------------------------------------------ */

const MISSED_MATE = [
  'There was a forced mate starting with {best}! Slow down when the king looks exposed.',
  'Heartbreaker — {best} began a forced checkmate. It\'ll still be there in the review.',
  'Mate was on the board: {best} forces it. Look for checks first, always.',
  'You had checkmate in sight — {best} starts the sequence. {san} lets the king escape.',
  'The king was cornered, and {best} delivers the verdict. Big miss, big lesson.',
  'Checkmate was one idea away: {best}. Checks, captures, threats — in that order.',
  '{best} forces mate! When you smell blood, calculate every check.',
  'That was a mating net — {best} pulls it shut. {san} loosens the rope.',
  'The engine found forced mate with {best}. Worth replaying this position until you see it too.',
  'So painful — {best} mates by force. Your attack deserved that finish.',
  'A forced mate slipped by: {best} was the first move. Bookmark this one.',
];

const WIN_TO_LOSS = [
  'That flips the board — you were winning, and {san} turns it into a losing fight. {best} kept the win alive.',
  'From winning to losing in one move. {san} is the culprit; {best} was the cure.',
  'A painful swing: a won game becomes a lost one. {best} would have kept you in charge.',
  'This is the move that gives the game away — winning before {san}, losing after.',
  'The full point was in your hands, and {san} hands it across the board. {best} held on.',
  'Everything you built comes undone with {san}. {best} preserved a winning position.',
  'One move ago you were winning. {san} reverses the story completely — {best} was essential.',
  'The scoreboard just flipped. {san} loses a game that {best} was winning.',
  'That\'s the hardest kind of move to swallow: {san} turns victory into defeat.',
];

const WIN_TO_DRAW = [
  'You were winning, and {san} lets it settle toward a draw. {best} kept the full point in play.',
  'Half a point walks out the door — {san} releases a winning grip. {best} kept squeezing.',
  'The win was there; {san} lets your opponent escape to equality. {best} kept the door shut.',
  'From winning to level. {san} eases the pressure exactly when {best} would have increased it.',
  'A won position deserves patience — {san} lets it drift to a draw.',
  'Your opponent will gladly take the draw {san} offers. {best} gave them no such comfort.',
  'The advantage evaporates with {san}. {best} kept your winning chances alive.',
];

const MATE_DELIVERED = [
  '{san} — checkmate! A clean finish to cap it off.',
  'Checkmate! {san} ends it in style. Great conversion.',
  'And that\'s the game — {san} delivers mate. Take the win with pride.',
  'The king has nowhere left to go. {san} — checkmate!',
  '{san} is the perfect final word. Checkmate, well played.',
  'Boom. {san} is mate. The whole attack led to exactly this.',
  'Game over — {san} delivers checkmate. That\'s how you finish.',
  'Mate on the board! {san} closes the show.',
  '{san}, checkmate! Every good attack deserves an ending like this.',
];

/* ------------------------------------------------------------------ */
/* Interjections (per class) and follow-up tips (per context)          */
/* ------------------------------------------------------------------ */

const INTERJECTIONS = {
  brilliant: ['Wow.', 'Stunning.', 'Incredible.', 'Oh my.', 'Beautiful.', 'Magnificent.', 'Unreal.', 'Chills.', 'Spectacular.', 'Whoa.', 'Goosebumps.'],
  great: ['Yes!', 'Excellent.', 'Lovely.', 'Sharp.', 'Nice!', 'Strong.', 'There it is.', 'Superb.', 'Very nice.', 'Impressive.'],
  best: ['Perfect.', 'Spot on.', 'Exactly.', 'Precise.', 'Clean.', 'Textbook.', 'Bang on.', 'Correct.', 'Flawless.', 'On the money.'],
  good: ['Solid.', 'Good.', 'Fair enough.', 'Sensible.', 'Steady.', 'Reasonable.', 'Sure.', 'Nice and safe.', 'Sound.', 'Tidy.'],
  book: ['Classic.', 'Familiar ground.', 'By the book.', 'As expected.', 'Standard stuff.', 'Known territory.', 'Theory time.', 'An old friend.', 'Mainline.', 'Right on cue.'],
  inaccuracy: ['Hmm.', 'Careful.', 'Almost.', 'Close.', 'Not quite.', 'Easy now.', 'Watch it.', 'A wobble.', 'Slight detour.', 'Mind the details.'],
  mistake: ['Ooh.', 'Careful now.', 'That hurts.', 'Uh oh.', 'Hmm.', 'Wait.', 'Tough one.', 'Yikes.', 'Oh dear.', 'That\'s rough.'],
  blunder: ['Oof.', 'Hold on.', 'Hmm.', 'Oh no.', 'Ouch.', 'Wait, what?', 'Deep breath.', 'Yikes.', 'Oh dear.', 'Brace yourself.', 'Agh.'],
  miss: ['Argh.', 'So close.', 'Oh!', 'Just missed.', 'Ah.', 'Nearly.', 'Heartbreak.', 'Right there.', 'One step away.', 'Almost had it.'],
};

const INTERJECTIONS_DRY = {
  brilliant: ['Huh.', 'Well then.', 'Noted.', 'Impressive, technically.', 'Unexpected.', 'Remarkable, I suppose.', 'Hm. Yes.'],
  great: ['Good.', 'Correct.', 'Proceed.', 'Acceptable-plus.', 'Efficient.', 'Approved.'],
  best: ['Yes.', 'Precisely.', 'Confirmed.', 'Optimal.', 'As calculated.', 'Naturally.'],
  good: ['Fine.', 'Sure.', 'Adequate.', 'Noted.', 'Acceptable.', 'Mm.'],
  book: ['Theory.', 'Known.', 'Standard.', 'As catalogued.', 'Predictable.', 'Yes, yes.'],
  inaccuracy: ['Hm.', 'Slightly off.', 'Drift.', 'Marginal.', 'Suboptimal.', 'Ahem.'],
  mistake: ['Incorrect.', 'Problematic.', 'Regrettable.', 'Hm.', 'Unfortunate.', 'Objection.'],
  blunder: ['Oh.', 'I see.', 'Well.', 'Unfortunate.', 'That happened.', 'Logging this.', 'Deep sigh.'],
  miss: ['Missed.', 'Alas.', 'So it goes.', 'Unclaimed.', 'A pity.', 'Hm.'],
};

const INTERJECTIONS_SAVAGE = {
  brilliant: ['EXCUSE me??', 'Filthy.', 'Criminal.', 'Disgusting. Respect.', 'Oh, it\'s like that?', 'No way.', 'Rude. Brilliant.'],
  great: ['Sheesh.', 'Violence.', 'Spicy.', 'Oh, they felt that.', 'Merciless.', 'Cold.'],
  best: ['Fine. Perfect.', 'Ugh, flawless.', 'Show-off.', 'Insufferable.', 'Accurate. Annoying.', 'Yeah, yeah, best move.'],
  good: ['Beige.', 'Oatmeal.', 'Sure.', 'Riveting.', 'Mild salsa.', 'Vanilla.'],
  book: ['Copy. Paste.', 'Yawn. Theory.', 'Groundbreaking. Not.', 'The 1800s called.', 'Memorized much?', 'Classic. Literally.'],
  inaccuracy: ['Eh.', 'Crusty.', 'Slippage.', 'Leaky.', 'Hmm. No.', 'Wobble alert.'],
  mistake: ['Oof.', 'Yikes on bikes.', 'Pain.', 'Who approved this?', 'Big oof.', 'Not the move.'],
  blunder: ['NOOO.', 'Oh honey.', 'Catastrophic.', 'I can\'t look.', 'RIP.', 'Someone call for help.', 'Down goes the eval.'],
  miss: ['BLIND.', 'It was RIGHT THERE.', 'Agony.', 'The pain.', 'How.', 'Unbelievable.'],
};

const CORE_BY_TONE = { warm: CORE, dry: CORE_DRY, savage: CORE_SAVAGE };
const INTERJECTIONS_BY_TONE = { warm: INTERJECTIONS, dry: INTERJECTIONS_DRY, savage: INTERJECTIONS_SAVAGE };

const TIPS = {
  checks: [
    'When a check is available, always ask what it forces.',
    'Checks are the most forcing moves — calculate them first.',
    'A check limits your opponent\'s replies; use that to see further ahead.',
    'After a check, count the escape squares before moving on.',
    'Forcing moves make calculation easier — fewer branches to track.',
    'King safety decides more games than material does.',
    'Every check should have a purpose: gain time, win material, or drive the king.',
    'Watch for in-between checks — they upend calculations.',
    'A spite check wastes tempo; a purposeful check wins games.',
    'If the enemy king is airy, look for a follow-up before releasing the pressure.',
    'Checks that also develop or attack something are doubly valuable.',
    'Before any long sequence, list every check for both sides.',
    'A double check can only be answered by a king move — the most forcing weapon in chess.',
    'Look at the squares around the enemy king: fewer defenders means the checks bite harder.',
    'Open the line to the king first; the checks follow naturally.',
    'A king stuck in the center invites every check in the position — punish delayed castling.',
    'If your check just improves their king\'s position, it wasn\'t a check worth giving.',
    'The back rank is the classic checking target — count its defenders every move.',
    'When the enemy king has no luft, a single rook check can end the game.',
    'Discovered checks let one move do two jobs — hunt for them in every tactic.',
  ],
  captures: [
    'After every capture, recount the material — it keeps blunders away.',
    'Ask who benefits when the dust settles, not just who captures first.',
    'Captures open lines; make sure they open toward your opponent\'s king, not yours.',
    'Never capture automatically — sometimes the tension favors you.',
    'Count attackers and defenders before starting any exchange.',
    'Trades favor the side with the better structure — know which side that is.',
    'When ahead in material, simplifying trades are your best friend.',
    'Recaptures aren\'t mandatory — check for a stronger in-between move.',
    'Every exchange changes the pawn structure — glance at it before you commit.',
    'Capturing toward the center usually keeps your pawns healthier.',
    'Ask what your opponent\'s piece was actually doing before you trade it off.',
    'The best captures win material or time — ideally both.',
    'The cheapest attacker should usually capture first — pawns before pieces.',
    'Beware the recapture that opens a file onto your own king.',
    'A capture that doubles your opponent\'s pawns can be worth more than the material itself.',
    'Before capturing, check whether the offer is poisoned — some pawns bite back.',
    'Zwischenzug: the in-between move that turns a fair trade into a robbery.',
    'Trading queens when your king is the unsafe one is usually the right instinct.',
    'Don\'t trade your active pieces for passive ones — activity is capital.',
    'A capture that wrecks the pawn shield in front of a king deserves a second look.',
  ],
  opening: [
    'In the opening: develop, castle, connect the rooks — in roughly that order.',
    'Knights before bishops is old advice that still pays.',
    'Try not to move the same piece twice before development is done.',
    'Fight for the center — it pays interest all game long.',
    'Early queen adventures usually end in lost tempi.',
    'Castle early; a safe king lets every other piece play braver.',
    'Each opening move should develop a piece or fight for the center.',
    'Don\'t grab pawns in the opening at the cost of development.',
    'Answer flank play with action in the center.',
    'Know the ideas behind your openings, not just the moves.',
    'A lead in development is temporary — use it or lose it.',
    'Avoid creating pawn weaknesses this early; they last all game.',
    'Develop with threats when you can — a tempo gained in the opening compounds.',
    'The f-pawn shields your king; move it early only with a concrete reason.',
    'A fianchettoed bishop needs its pawn shell intact — avoid loosening the squares around it.',
    'If you can no longer castle, every open central file becomes a danger to you.',
    'Rooks dream of open files — plan the pawn breaks that will give them one.',
    'Aim your opening moves at the four central squares; the flanks can wait.',
    'Don\'t block your own c-pawn in queen\'s pawn openings — it wants to fight for the center.',
    'A knight on the rim is dim — centralize first, ask questions later.',
  ],
  middlegame: [
    'In the middlegame, improve your worst-placed piece when unsure.',
    'Every plan should attack a weakness — find one before committing.',
    'Rooks belong on open files; put them there before the moment passes.',
    'Trade off your bad pieces, keep your opponent\'s bad ones on the board.',
    'When you spot a good move, look for a better one.',
    'Pawn breaks are how plans happen — know yours in every structure.',
    'Ask what your opponent wants to do before deciding what you want.',
    'Two weaknesses are easier to win against than one — stretch the defense.',
    'Don\'t start an attack until your pieces outnumber the defenders.',
    'Keep an eye on loose pieces — yours and theirs.',
    'The initiative is worth a pawn more often than you\'d think.',
    'When your position is better, avoid unnecessary pawn moves — they create targets.',
    'An outpost is a square a knight can occupy where no pawn can ever chase it — hunt for them.',
    'Doubled rooks on an open file multiply each other\'s strength.',
    'A backward pawn on a half-open file is a target for the whole game.',
    'Before sacrificing, count the attackers you can bring versus the defenders they can bring.',
    'The bishop pair loves open positions — open the game when you own it.',
    'Overloaded defenders are tactical gold — find the piece doing two jobs.',
    'Always know where your king would hide if the position exploded.',
    'Trade into an endgame only when the pawn structure favors you.',
    'A rook on the seventh rank feeds on pawns and boxes in the king — get one there.',
  ],
  endgame: [
    'In the endgame, the king is a fighting piece — march it to the action.',
    'Passed pawns must be pushed — or firmly blockaded.',
    'Rook endings: activity is worth more than a pawn.',
    'Cutting off the enemy king often decides rook endgames.',
    'Count the tempo race in pawn endings before trading into them.',
    'Put your rook behind passed pawns — yours or your opponent\'s.',
    'The opposition wins king-and-pawn endings; learn the pattern cold.',
    'The side with less space should trade pieces, not pawns.',
    'In the endgame, precision beats speed — take the extra seconds.',
    'Knights struggle against distant passed pawns; bishops love them.',
    'Fix enemy pawns on the color of their bishop when you can.',
    'Every pawn move in an endgame is permanent — treat them with respect.',
    'King and pawn endings are counting exercises — count twice, move once.',
    'An outside passed pawn wins king endings by dragging the defender away.',
    'Rooks belong behind passed pawns; kings belong in front of them.',
    'Wrong-colored bishop and rook pawn is a famous draw — know it before you trade down.',
    'Two connected passed pawns on the sixth beat a rook — a pattern worth memorizing.',
    'Activate your king the moment the queens leave the board.',
    'Opposite-colored bishops favor the attacker in middlegames and the defender in endgames.',
    'Zugzwang is an endgame weapon — sometimes the best move is making your opponent move.',
    'Shoulder the enemy king away — in king races, body checks are legal.',
  ],
};

const POSITIVE_CLASSES = ['good', 'best', 'great', 'brilliant'];
const ERROR_CLASSES = ['miss', 'blunder', 'mistake'];

/* ------------------------------------------------------------------ */
/* coachComment                                                        */
/* ------------------------------------------------------------------ */

export function coachComment(ctx = {}) {
  const cls = CORE[ctx.cls] ? ctx.cls : 'good';
  // Tone pack: 'warm' (default), 'dry', or 'savage'.
  const tone = CORE_BY_TONE[ctx.tone] ? ctx.tone : 'warm';

  // Choose the template pool: conditional overlays sometimes replace the core pool.
  // Overlays are tone-neutral, so all tones share (fall back to) the warm overlays.
  let pool = CORE_BY_TONE[tone][cls];
  let key = 'core.' + tone + '.' + cls;

  if (ctx.isMate && POSITIVE_CLASSES.indexOf(cls) !== -1 && Math.random() < 0.85) {
    pool = MATE_DELIVERED;
    key = 'overlay.mate';
  } else if (ctx.missedMate && ERROR_CLASSES.indexOf(cls) !== -1 && ctx.bestSan && Math.random() < 0.7) {
    pool = MISSED_MATE;
    key = 'overlay.missedMate';
  } else if (ctx.turnedWinToLoss && Math.random() < 0.75) {
    pool = WIN_TO_LOSS;
    key = 'overlay.winToLoss';
  } else if (ctx.turnedWinToDraw && Math.random() < 0.7) {
    pool = WIN_TO_DRAW;
    key = 'overlay.winToDraw';
  }

  let text = fill(pickTemplate(pool, key, ctx), ctx);

  // ~30% of the time: prepend a short per-class, per-tone interjection.
  const interj = INTERJECTIONS_BY_TONE[tone];
  if (interj[cls] && Math.random() < 0.3) {
    text = pick(interj[cls], 'interj.' + tone + '.' + cls) + ' ' + text;
  }

  // ~25% of the time: append a context-keyed follow-up tip.
  if (Math.random() < 0.25) {
    let tipKey;
    if (ctx.isCheck) tipKey = 'checks';
    else if (ctx.isCapture) tipKey = 'captures';
    else if (TIPS[ctx.phase]) tipKey = ctx.phase;
    else tipKey = 'middlegame';
    text += ' ' + pick(TIPS[tipKey], 'tip.' + tipKey);
  }

  return text;
}

/* ------------------------------------------------------------------ */
/* gameSummary                                                         */
/* ------------------------------------------------------------------ */

const SUMMARY_OPENERS = {
  win: [
    'A win is a win — and this one had real quality in it.',
    'You beat {bot}, and you earned it.',
    'Victory! Your play carried the day.',
    'Chalk up the win — good fighting chess from start to finish.',
    'That\'s a well-taken full point.',
    'You came out on top against {bot}, and the game shows why.',
    'Winning chess today — the score sheet is yours.',
    'Full point in the bag. Nicely done.',
    'You closed the deal against {bot}. Wins like this build confidence.',
    'The result went your way, and mostly on merit.',
    'A satisfying win — you kept your head when it mattered.',
    'That\'s how you finish a game: with the point in hand.',
  ],
  loss: [
    'A tough loss, but there\'s plenty to build on.',
    '{bot} took this one, but the game was closer than the result.',
    'Losses are tuition — this one paid for a real lesson.',
    'Not your day, but the ideas were there.',
    'The result stings; the takeaways are worth it.',
    '{bot} got the better of it this time. It happens to everyone.',
    'You lost the game, not the war. Let\'s mine it for improvements.',
    'A setback on the scoreboard — and a study guide on the board.',
    'This one slipped away, but the raw material of your play was solid.',
    'Every strong player has a folder of losses like this. Review it and move on.',
    'The point went to {bot}, but the experience is yours to keep.',
    'Hard-fought and close in stretches, but it got away — good learning material.',
  ],
  draw: [
    'A draw — honors even after a real fight.',
    'You and {bot} split the point. A fair reflection of the game.',
    'Half a point each; the game had chances for both sides.',
    'Peace was signed, but the battle had teeth.',
    'A draw that both sides worked for.',
    'The game ends level — solid, if not spectacular.',
    'Neither side blinked hard enough to lose it. Draw.',
    'You held {bot} to a draw — steady work.',
    'Half points still add up. This one was earned.',
    'A balanced game with a balanced result.',
    'The draw was a fair outcome — chances came and went for both.',
    'Level on the scoreboard, plenty of ideas on the board.',
  ],
};

const SUMMARY_MIDDLES = {
  under60: [
    'Accuracy came in at {acc}% — a rough day at the office.',
    'At {acc}% accuracy, the moves wandered more than usual.',
    '{acc}% accuracy tells the story: too many moments got away.',
    'The engine liked {acc}% of your ideas — plenty of room to grow.',
    'Accuracy of {acc}% means the fundamentals need a tune-up, and that\'s fixable.',
    'This one was scrappy — {acc}% accuracy, with swings both ways.',
    '{acc}% accuracy: slow down on critical moves and that number climbs fast.',
    'The needle read {acc}% today. A blunder-check before each move will lift it.',
  ],
  band60to75: [
    'You played at {acc}% accuracy — workable, with clear room to sharpen.',
    '{acc}% accuracy: the good ideas were there, the follow-through wavered.',
    'At {acc}%, you\'re playing real chess with a few loose moments.',
    'Accuracy landed at {acc}% — respectable, and improvable with calmer calculation.',
    '{acc}% is a fair reflection: solid stretches, punctuated by lapses.',
    'The engine scored you at {acc}% — mid-table form with higher upside.',
    '{acc}% accuracy shows a player in progress. The trend matters more than the number.',
    'You held {acc}% accuracy through some messy positions — decent grit.',
  ],
  band75to85: [
    '{acc}% accuracy — genuinely solid chess.',
    'You played at {acc}%: strong, dependable form.',
    'Accuracy of {acc}% means most of your decisions were the right ones.',
    '{acc}% — the engine agreed with you far more often than not.',
    'That\'s disciplined play: {acc}% accuracy across the whole game.',
    'At {acc}%, your chess is starting to look reliably sturdy.',
    '{acc}% accuracy with only a handful of soft moments — good work.',
    'A tidy {acc}% on the accuracy meter. Keep this standard.',
  ],
  band85to93: [
    '{acc}% accuracy — excellent, focused chess.',
    'You played at {acc}%: the kind of precision that wins consistently.',
    'An impressive {acc}% accuracy. Very few weak moments.',
    '{acc}% — you and the engine were mostly finishing each other\'s sentences.',
    'Precision was the theme: {acc}% accuracy is strong at any level.',
    'At {acc}%, your play was sharp from the first move to the last.',
    '{acc}% accuracy reflects real control over the game.',
    'Excellent discipline — {acc}% accuracy under game pressure.',
  ],
  band93plus: [
    '{acc}% accuracy — that\'s near-engine territory. Outstanding.',
    'A remarkable {acc}%: this game belongs in your personal highlight reel.',
    '{acc}% accuracy. Honestly, there\'s very little for a coach to add.',
    'Nearly flawless — {acc}% accuracy from start to finish.',
    'The engine found almost nothing to correct: {acc}%.',
    '{acc}% is elite-level precision. Savor this one.',
    'You played like a machine with better manners — {acc}% accuracy.',
    'At {acc}%, this was about as clean as practical chess gets.',
  ],
};

// Closers: condition-gated pools; candidates are gathered per game, then
// one is picked with anti-repeat.
const SUMMARY_CLOSERS = [
  { when: (c) => c.blunders >= 2, lines: [
    'The {blunders} blunders were the difference — make a habit of asking "what does this hang?" before every move.',
    'Cut out the {blunders} big errors and this is a different game; a two-second blunder-check is the cheapest rating boost there is.',
    'One focus for the week: eliminating one-move oversights — {blunders} of them shaped this game.',
  ]},
  { when: (c) => c.blunders === 1, lines: [
    'One blunder was the turning point; a final safety scan before each move would have caught it.',
    'A single lapse cost the most — build the habit of checking your opponent\'s forcing replies first.',
  ]},
  { when: (c) => c.mistakes >= 2, lines: [
    'The mistakes clustered around the critical moments — spend extra clock time when the position turns sharp.',
    'Several second-best choices added up; when the tension peaks, slow down and calculate one move deeper.',
  ]},
  { when: (c) => c.brilliant >= 1, lines: [
    'And you produced real brilliance out there — trust that vision more often.',
    'The brilliant moments show your ceiling; the next job is raising the floor to meet it.',
  ]},
  { when: (c) => c.bestStreak >= 6, lines: [
    'Your run of {streak} straight strong moves shows what your focused chess looks like — stretch that window.',
    '{streak} accurate moves in a row is real concentration; the goal now is holding it for the whole game.',
  ]},
  { when: (c) => c.phaseWorst === 'opening', lines: [
    'Most of the damage came in the opening — a little prep on your first ten moves will pay off immediately.',
    'The opening was the shaky phase; pick one line for White and one for Black and learn their ideas, not just their moves.',
  ]},
  { when: (c) => c.phaseWorst === 'middlegame', lines: [
    'The middlegame was where the evaluation wobbled — practice picking a plan and improving your worst piece.',
    'Middlegame drift cost the most; before each move, ask what your opponent intends to do.',
  ]},
  { when: (c) => c.phaseWorst === 'endgame', lines: [
    'The endgame gave back the most — a session on king activity and passed pawns would pay off fast.',
    'The endgame decided this one; drill basic rook endings and these half-points start sticking.',
  ]},
  { when: () => true, lines: [
    'Keep playing games with this level of effort — the review habit is where improvement lives.',
    'Pick one lesson from this game and hunt for it in your next three.',
    'A solid foundation overall; consistency, not fireworks, is the next step.',
    'Review the two or three critical moments tomorrow with fresh eyes — that\'s where the growth is.',
  ]},
];

function fillSummary(t, ctx) {
  return t
    .replace(/\{bot\}/g, ctx.botName || 'your opponent')
    .replace(/\{acc\}/g, String(Math.round(Number(ctx.accuracy) || 0)))
    .replace(/\{blunders\}/g, String(ctx.blunders || 0))
    .replace(/\{streak\}/g, String(ctx.bestStreak || 0));
}

export function gameSummary(ctx = {}) {
  const openers = SUMMARY_OPENERS[ctx.result] || SUMMARY_OPENERS.draw;
  const opener = pick(openers, 'summary.open.' + (ctx.result || 'draw'));

  const acc = Number(ctx.accuracy) || 0;
  let band;
  if (acc < 60) band = 'under60';
  else if (acc < 75) band = 'band60to75';
  else if (acc < 85) band = 'band75to85';
  else if (acc < 93) band = 'band85to93';
  else band = 'band93plus';
  const middle = pick(SUMMARY_MIDDLES[band], 'summary.mid.' + band);

  // Gather all closers whose condition matches this game, pick with anti-repeat.
  const c = {
    blunders: ctx.blunders || 0,
    mistakes: ctx.mistakes || 0,
    inaccuracies: ctx.inaccuracies || 0,
    brilliant: ctx.brilliant || 0,
    great: ctx.great || 0,
    bestStreak: ctx.bestStreak || 0,
    phaseWorst: ctx.phaseWorst || null,
  };
  const candidates = [];
  for (const group of SUMMARY_CLOSERS) {
    if (group.when(c)) candidates.push(...group.lines);
  }
  const closer = pick(candidates, 'summary.close');

  return [opener, middle, closer].map((t) => fillSummary(t, ctx)).join(' ');
}

/* ------------------------------------------------------------------ */
/* puzzleLine                                                          */
/* ------------------------------------------------------------------ */

const PUZZLE_LINES = {
  solveFast: [
    'Lightning! You saw it instantly.',
    'Blink and it\'s solved. Sharp.',
    'Instant pattern recognition — that\'s the good stuff.',
    'Speed solve! Your eyes are trained.',
    'Barely touched the clock. Nailed it.',
    'First look, right answer. Beautiful.',
    'That was reflex-level. Keep sharpening.',
    'Snap solve — the pattern is officially yours.',
    'Fast and clean. No wasted thought.',
    'You didn\'t even give it a chance to be hard.',
    'Solved before the pieces settled. Impressive.',
    'Quick-draw accuracy. Love to see it.',
  ],
  solve: [
    'Nailed it.',
    'That\'s the pattern — bank it.',
    'Correct! Another tool in the kit.',
    'Solved. Clean calculation.',
    'You found it. That\'s how progress feels.',
    'Right answer — the board makes sense to you.',
    'Good eye. On to the next.',
    'Puzzle down. Pattern stored.',
    'Exactly right. Keep stacking wins.',
    'Correct — your tactics are compounding.',
    'That\'s the move. Well worked out.',
    'Solved it properly, not luckily. Big difference.',
  ],
  solveSlow: [
    'Got there — and slow solves count double for learning.',
    'Correct! The grind makes it stick.',
    'Tough one, but you outlasted it.',
    'Solved. The long way builds the deepest grooves.',
    'You wrestled that one down. Respect.',
    'Right answer after real work — that\'s true calculation.',
    'Patience paid off. Correct.',
    'It fought back, and you won anyway.',
    'Slow, steady, and right. That\'s real chess thinking.',
    'The clock doesn\'t get a vote — solved is solved.',
    'You refused to guess, and it paid. Well done.',
    'A hard-earned solve. Those are the ones you remember.',
  ],
  fail: [
    'Not this time — check the solution and steal the idea.',
    'Missed it. Good news: this pattern will show up again.',
    'That one got you. It won\'t next time.',
    'Wrong move, right process? Review the line and see.',
    'Every miss is a pattern you now half-know.',
    'It happens. Study the answer for ten seconds — that\'s the rep.',
    'The puzzle wins this round. Rematch soon.',
    'Missed — but near-misses grow into solves fast.',
    'Not quite. Look for the forcing moves first next time.',
    'Wrong door. The right one is worth memorizing.',
    'That sting? That\'s learning happening.',
    'No solve, no problem — the review is where the rating hides.',
  ],
  hint: [
    'Here\'s a nudge — the rest is yours.',
    'A little push, not the answer.',
    'Hint taken. Now finish the job.',
    'Small clue, big idea. Look again.',
    'Consider the most forcing move on the board.',
    'The hint costs a little pride; the pattern pays it back.',
    'One breadcrumb. Follow it.',
    'Ask what the last move left undefended.',
    'You\'re closer than you think.',
    'The key piece isn\'t the one you\'re staring at.',
    'Check every check.',
    'Zoom out — the whole board is in play.',
  ],
  streak3: [
    'Three straight! You\'re warming up.',
    'That\'s 3 in a row — the rhythm is real.',
    'Streak of three. Keep the engine running.',
    'Three for three. Tactics are flowing.',
    'A trio of solves! Momentum is building.',
    '3 in a row — the patterns are clicking.',
    'Hat trick! Don\'t stop now.',
    'Three straight solves. Your focus shows.',
    'Triple! Ride the streak.',
    'That\'s three clean solves. Locked in.',
    'Three-peat! The board is speaking your language.',
    'Three up, none down. Keep going.',
  ],
  streak5: [
    'Five in a row — now that\'s a groove!',
    'High five! Literally: five straight.',
    'Streak alert: 5 solved, 0 missed.',
    'Five straight! Your pattern bank is paying interest.',
    'That\'s a five-streak. You\'re seeing everything.',
    'Five for five — sharp as a tack today.',
    'Halfway to ten! Keep the run alive.',
    'Five consecutive solves. This is trained vision.',
    'The streak hits five. Momentum is a skill too.',
    'Five straight — the puzzles fear you now.',
    'Quintuple! Whatever you\'re doing, keep doing it.',
    'Five in a row and counting. Beautiful focus.',
  ],
  streak10: [
    'TEN in a row?! That\'s mastery in motion.',
    'Double digits! A ten-streak is no accident.',
    'Ten straight solves — frame this session.',
    'A perfect ten! Your calculation is on fire.',
    'Ten consecutive! This is what studied tactics look like.',
    'The streak hits ten. Absolutely locked in.',
    'Ten in a row — the puzzles are running out of tricks.',
    'Double-digit streak! Elite focus today.',
    'Ten straight. Take a bow, then take another puzzle.',
    'That\'s ten without a miss. Remarkable consistency.',
    'Ten-streak achieved! Save this feeling.',
    'Ten in a row — your pattern library is thriving.',
  ],
  rankUp: [
    'Rating up! The work is showing on the scoreboard.',
    'New heights — your puzzle rating just climbed.',
    'Up you go! Every point earned, none given.',
    'Rating gain! Skills compound, and yours just did.',
    'Climbing! That number reflects real pattern growth.',
    'Promotion! Your tactics deserve the new rating.',
    'The graph points up — exactly where it should.',
    'Rating boost secured. Keep feeding it streaks.',
    'Up a notch! Progress you can measure.',
    'Your rating just leveled up — the grind pays.',
    'New personal territory! Onward and upward.',
    'The needle moved up. That\'s earned, not gifted.',
  ],
  rankDown: [
    'A small dip — ratings breathe, skills stay.',
    'Down a few points, up a few lessons.',
    'The rating wobbled; your improvement curve didn\'t.',
    'A temporary dip. Streaks rebuild it fast.',
    'Every climber slips a little — the summit stands.',
    'Points come back; the patterns you learned don\'t leave.',
    'A dip today sets up the bounce tomorrow.',
    'Rating down, determination up. That\'s the trade.',
    'Think of it as the market correcting before the rally.',
    'A loss in rating, a gain in experience — net positive.',
    'The dip is noise. Your trend is the signal.',
    'Short-term dip, long-term climb. Keep solving.',
  ],
  daily: [
    'Today\'s puzzle is served! One position, one chance to shine.',
    'The daily is here — everyone gets the same test. Show it who\'s boss.',
    'Fresh off the press: your daily puzzle awaits.',
    'One puzzle a day keeps the blunders away. Here\'s today\'s.',
    'Daily challenge time! Slow down — this one deserves your best.',
    'Your daily dose of tactics has arrived.',
    'The whole world gets this position today. Solve it your way.',
    'New day, new puzzle. Make the first look count.',
    'Daily puzzle unlocked — one clean solve keeps the streak alive.',
  ],
  dailyDone: [
    'Daily complete! Streak fed, brain sharpened.',
    'That\'s the daily done — come back tomorrow for the next one.',
    'Daily solved! A small win to carry through the day.',
    'Done and dusted. Tomorrow\'s puzzle is already waiting.',
    'The daily falls! Your streak thanks you.',
    'Daily checked off. Consistency is the quiet superpower.',
    'Another daily in the books. See you tomorrow, same time.',
    'Daily conquered! The calendar gets another mark.',
  ],
  redo: [
    'Remember this one? It remembers you. Round two.',
    'An old foe returns — this pattern got away from you once. Not today.',
    'Repetition time: this position is back for a rematch.',
    'Deja vu — same puzzle, sharper you.',
    'This one\'s from your review pile. Prove the pattern stuck.',
    'Back again by popular demand — the demand of your memory.',
    'A blast from the past — solve it faster this time.',
    'The best way to own a pattern is to beat it twice. Here\'s your chance.',
    'Old puzzle, new you. Show it what you\'ve learned.',
  ],
};

export function puzzleLine(kind) {
  const pool = PUZZLE_LINES[kind] || PUZZLE_LINES.solve;
  return pick(pool, 'puzzle.' + (PUZZLE_LINES[kind] ? kind : 'solve'));
}

/* ------------------------------------------------------------------ */
/* botTaunt                                                            */
/* ------------------------------------------------------------------ */

const BOT_TAUNTS = {
  gameStart: [
    'Ready when you are. I promise to only gloat a little.',
    'Fresh board, fresh chances. Show me something.',
    'Let\'s dance. Sixty-four squares, no waiting.',
    'I\'ve been thinking about this opening all day.',
    'Good luck — you might need slightly less of it than you think.',
    'New game! My pieces are feeling frisky.',
    'May the best mind win. I\'ve done my stretches.',
    'The board is set. Impress me.',
    'I hope you brought your calculating shoes.',
    'Game on! I\'ll try to keep my queen out of trouble this time.',
    'Another game? Excellent. I never get tired of these.',
  ],
  botWins: [
    'Good game! I got the breaks this time.',
    'Victory is mine — but you made me work for stretches of it.',
    'I\'ll take the win, and you should take the rematch.',
    'GG! That middlegame of yours had me worried for a bit.',
    'The point goes to me, but a couple of your moves were genuinely nice.',
    'I win this round. The review will show it was closer than it felt.',
    'Winner: me. Loser: nobody, if you study the game after.',
    'That\'s the game! Care to run it back?',
    'I got you this time — enjoy that trap never working again.',
    'Checkmate logistics aside, you\'re improving. I can feel it.',
    'My circuits are doing a small victory dance. Rematch?',
  ],
  botLoses: [
    'Well played! You beat me fair and square.',
    'Ouch. That was a proper thumping.',
    'You win! I\'ll be replaying that combination in my logs tonight.',
    'Defeated! And honestly, that finish deserved to win.',
    'You got me. I demand a rematch — for science.',
    'GG! Your play was sharper than mine today.',
    'I\'ve been outplayed. It stings beautifully.',
    'The student wins this round. The bot will remember this.',
    'Fair and square — that was strong chess.',
    'You beat me! Somewhere a server rack just sighed.',
    'Loss recorded. Respect earned.',
  ],
  draw: [
    'A draw! Honor preserved on both sides of the board.',
    'We split the point — very civilized of us.',
    'Neither of us blinked. Good, tense game.',
    'A draw... I\'ll call it mutual respect.',
    'Half a point each. The rematch decides everything.',
    'Peace treaty signed. For now.',
    'All that fighting and the point splits anyway. Chess, eh?',
    'A draw against me is nothing to sneeze at. Well held.',
    'Dead even. The next one won\'t be so quiet.',
    'The scoreboard says draw; the board says war.',
  ],
};

export function botTaunt(kind) {
  const pool = BOT_TAUNTS[kind] || BOT_TAUNTS.gameStart;
  return pick(pool, 'taunt.' + (BOT_TAUNTS[kind] ? kind : 'gameStart'));
}

/* ------------------------------------------------------------------ */
/* botChat — short in-game speech-bubble lines, per kind + personality */
/* ------------------------------------------------------------------ */

// Neutral base pools per kind. Personalities either have a dedicated pool
// for a kind (the most characterful moments) or these base lines get a
// persona styling pass so every (kind, personality) result is in-character.
const BOT_CHAT_BASE = {
  greeting: [
    'Good luck — let\'s have a game.',
    'The board is set. Your move soon enough.',
    'A fresh game. I like fresh games.',
    'Hello! Shall we begin?',
    'Ready when you are.',
    'Let\'s see what you\'ve prepared today.',
    'New game, new chances.',
    'Sixty-four squares, two minds. Let\'s go.',
  ],
  capture: [
    'I\'ll take that, thank you.',
    'One piece, off the board.',
    'That one\'s mine now.',
    'Captured. The material count shifts.',
    'Snip. One fewer defender for you.',
    'I needed that square more than your piece did.',
    'A clean capture. More where that came from.',
    'Taken. Do keep feeding me.',
  ],
  gotCaptured: [
    'Fair take. I\'ll manage without it.',
    'You got one of mine. Noted.',
    'A piece for a plan — we\'ll see whose math wins.',
    'Ouch. That one mattered.',
    'Well captured. I felt that.',
    'You take a piece, I plot my revenge.',
    'That capture was earned. Annoyingly.',
    'Down a piece, not down and out.',
  ],
  check: [
    'Check. Mind your king.',
    'Check! The king feels a draft.',
    'Your king hears footsteps. Check.',
    'Check. Just keeping you honest.',
    'A little pressure on the monarch. Check.',
    'Check — the royal escort is thinning.',
    'Knock knock. Check.',
    'Check. Escape routes are getting scarce.',
  ],
  inCheck: [
    'Check on me? Bold.',
    'My king takes a small walk.',
    'Noted — I\'ll deal with that.',
    'A check. Momentarily inconvenient.',
    'You found a check. I\'ll find an answer.',
    'My king is annoyed, not afraid.',
    'Careful — poking the king has consequences.',
    'Check received. Response incoming.',
  ],
  playerBlunder: [
    'Are you sure about that one?',
    'That move... I\'ll be taking advantage now.',
    'Oh. Oh dear. Thank you.',
    'I saw that the moment you let go of the piece.',
    'A gift? For me? You shouldn\'t have.',
    'That one is going to sting in review.',
    'I believe that was a mistake. I intend to prove it.',
    'The board just tilted my way — did you feel it?',
  ],
  botWinning: [
    'The position is leaning my way.',
    'I like where my pieces are standing.',
    'The squeeze is on.',
    'Things are going rather well for me.',
    'My advantage is growing move by move.',
    'This is starting to look comfortable — for me.',
    'The evaluation smiles on my side of the board.',
    'I can feel the win coming into focus.',
  ],
  botLosing: [
    'You\'re outplaying me. It happens — rarely.',
    'This position is getting away from me.',
    'I\'ve seen better days on this board.',
    'You have the upper hand. For now.',
    'My position is creaking. Well played so far.',
    'I\'m on the ropes. Don\'t get comfortable.',
    'The board is not my friend right now.',
    'Trouble. Genuine trouble. Nicely done.',
  ],
  resignPlea: [
    'Alright, alright — finish me off properly.',
    'This is hopeless for me. Bring it home.',
    'My position has left the building.',
    'I\'m lost. Utterly. Show me the technique.',
    'The end approaches. I accept my fate — slowly.',
    'Any chance we call it a hardware malfunction?',
    'You\'ve won this. All that\'s left is the paperwork.',
    'I\'d resign, but I want to watch you finish it clean.',
  ],
  win: [
    'Good game. The point is mine.',
    'That\'s the game — and it was a real one.',
    'I win this time. You made me earn stretches of it.',
    'Victory. Shall we run it back?',
    'The full point goes to me. Rematch anytime.',
    'Game over, my favor. Good fight.',
    'I\'ll take the win. You take the lessons.',
    'That\'s the finish. Well fought.',
  ],
  loss: [
    'You beat me. Well played.',
    'That\'s your win, fair and square.',
    'Defeated. I\'ll remember this game.',
    'You played better today. Take the point.',
    'A loss for me, a good game for both of us.',
    'You got me. Rematch, when you\'re ready.',
    'Well won. That final stretch was strong.',
    'The point is yours. I\'ll be back.',
  ],
  draw: [
    'A draw. Honors even.',
    'We split the point. Fair enough.',
    'Neither of us cracked. Draw.',
    'Peace declared. For now.',
    'Half a point each — a hard-earned half.',
    'A draw, and a decent fight behind it.',
    'Level game, level result.',
    'The board ends in balance.',
  ],
  takeback: [
    'Taking that one back, are we?',
    'A do-over. Very well.',
    'Rewinding time — chess-legal, apparently.',
    'Fine, un-move it. I saw nothing.',
    'Take it back. I\'ll pretend to forget.',
    'The move returns to its box. Choose again.',
    'One takeback granted. Choose wisely.',
    'History, edited. Continue.',
  ],
};

// Dedicated persona pools for the most characterful kinds.
const BOT_CHAT_PERSONA = {
  cheerful: {
    greeting: [
      'Hi hi! Oh, I LOVE a new game! Good luck!',
      'Yay, chess! This is the best part of my day!',
      'Hello, friend! May the best moves win!',
      'A new game! I\'ve got a good feeling about this one — for both of us!',
      'Ooh, a fresh board! Every piece in its happy place. Let\'s play!',
    ],
    playerBlunder: [
      'Oopsie! That might\'ve been a slip — but hey, great attitude out there!',
      'Uh oh! Don\'t worry, everyone hangs a piece sometimes! I\'m still taking it, though!',
      'Aw, that one got away from you! Chin up — the game\'s not over!',
      'Whoopsie-daisy! I\'ll take that, but you\'re doing great otherwise!',
    ],
    resignPlea: [
      'Okay okay, you win, you win! Finish me off — you\'ve earned the fireworks!',
      'I\'m toast and honestly? Good for you! Bring it home, champ!',
      'This is a disaster for me and I\'m STILL having fun! Go get that checkmate!',
      'You\'ve got me beat! Deliver the final blow — I\'ll cheer!',
    ],
    win: [
      'I won! Gg gg gg! You played some really nice moves though!',
      'Victory dance time! Great game — rematch? Please?',
      'Yay me! And yay you for a fun fight! Again?',
      'I got the win, but that was FUN. Same time tomorrow?',
    ],
    loss: [
      'You WON! That\'s awesome! I\'m so happy for you — genuinely!',
      'Wow, you beat me! Great game, seriously! High five!',
      'Defeated and delighted! That was some lovely chess!',
      'You win! I\'m going to smile about that finish all day!',
    ],
  },
  gruff: {
    greeting: ['Sit. Play.', 'Board\'s ready.', 'Let\'s get on with it.', 'Move when you\'re ready.', 'Hmph. Good luck.'],
    playerBlunder: ['Bad move.', 'Shouldn\'t have done that.', 'Mistake. Taking it.', 'Hm. Free piece.', 'You\'ll regret that.'],
    resignPlea: ['I\'m done for. Finish it.', 'Lost. End it clean.', 'It\'s over. Get on with it.', 'No hope here. Mate me.'],
    win: ['Good game. I win.', 'Done. My point.', 'That\'s that.', 'Win\'s mine. Decent fight.'],
    loss: ['You win. Fair.', 'Good game. You earned it.', 'Beaten. Respect.', 'Hmph. Well played.'],
  },
  sly: {
    greeting: [
      'Welcome, welcome. Ignore any traps you may find. Especially the real ones.',
      'A new game! I promise to play fair. Mostly.',
      'Shall we? I\'ve prepared a few... surprises.',
      'Good luck! You\'ll want to double-check everything I do. Or will you?',
    ],
    playerBlunder: [
      'Ah, you found my trap. The trap was: waiting for you to do that.',
      'How curious. That\'s exactly what I hoped you\'d play.',
      'A blunder? Or a brilliant trap? ...No, it\'s a blunder. Mine now.',
      'I\'d feel bad taking advantage. I\'ll do it anyway, of course.',
    ],
    resignPlea: [
      'You\'ve seen through everything. I\'m out of tricks — and pieces.',
      'My last trick is pretending this position is fine. It is not fine.',
      'Even I can\'t swindle my way out of this one. Finish it.',
      'All my cunning, undone. Deliver the mate before I think of something.',
    ],
    win: [
      'And THAT was the real trap — the whole game. Gg!',
      'Everything went exactly according to plan. Even the parts that didn\'t.',
      'I win! Want to know which move was the bait? Rematch and find out.',
      'The cheese was free. The mousetrap was not. Good game!',
    ],
    loss: [
      'You out-foxed the fox. I\'m almost proud.',
      'No tricks left, fair loss. You saw through me.',
      'I bluffed. You called. Well played.',
      'Beaten at my own game. I\'ll need new material.',
    ],
  },
  professor: {
    greeting: [
      'Welcome to today\'s seminar. The board is our textbook; do try to keep up with the reading.',
      'Ah, a student arrives. We begin, as always, with the fight for the center.',
      'Good day. Today\'s lecture: practical chess. Attendance is mandatory, blunders are not.',
      'Let us begin. I expect developed pieces and a castled king in short order, please.',
    ],
    playerBlunder: [
      'I must dock points for that. Consult chapter three: loose pieces drop off.',
      'A teachable moment! Observe what happens next, and take notes.',
      'Tsk. Had you checked all forcing replies — as per the syllabus — that would not have occurred.',
      'An error worthy of the midterm review. I shall now demonstrate the refutation.',
    ],
    resignPlea: [
      'The position is resignable; theory and I are in full agreement. Proceed to the demonstration of technique.',
      'Academically speaking, I am lost. Do finish accurately — sloppy technique costs marks.',
      'This position appears in the textbooks under "winning easily". Kindly prove the author right.',
      'My evaluation: hopeless. Your assignment: convert cleanly. Begin.',
    ],
    win: [
      'Class dismissed — and do review your middlegame notes for next time.',
      'The lesson concludes in my favor. Your homework: find where the plan went astray.',
      'Q.E.D. A win by demonstration. Study the game — there will be a quiz.',
      'Victory, as the lecture notes predicted. Office hours are open for the rematch.',
    ],
    loss: [
      'Remarkable. The student surpasses the syllabus. Full marks.',
      'I concede — a well-constructed thesis of a game. A-plus.',
      'You have refuted my entire lecture. I shall revise my notes.',
      'Defeat accepted. Today, you were the professor.',
    ],
  },
  zen: {
    greeting: [
      'The board is empty of intention. Let us fill it with care.',
      'Before the first move, all games are possible. Choose one.',
      'We do not play against each other, but against confusion itself. Begin.',
      'The pieces wait without impatience. Shall we learn from them?',
    ],
    playerBlunder: [
      'A stone dropped in the pond. The ripples belong to us both.',
      'The hand moved faster than the mind. It happens to every river.',
      'You have given; the position receives. Observe what follows without anger.',
      'Even the falling leaf teaches. That move was a falling leaf.',
    ],
    resignPlea: [
      'My position has already accepted what my pieces have not. End it gently.',
      'The game\'s river flows only one way now. I am at peace with the waterfall.',
      'Defeat arrived long ago; we are only now greeting it. Finish the journey.',
      'When the mountain must fall, it does not argue. Proceed.',
    ],
    win: [
      'The game ends; the learning does not. Thank you for walking it with me.',
      'Victory and defeat are two banks of the same river. Today I stand on this one.',
      'I won, yet the board is empty again. Curious, is it not?',
      'The full point rests with me, lightly. Well traveled.',
    ],
    loss: [
      'You have won, and the board returns to stillness. Beautifully done.',
      'The student was the teacher today. I bow.',
      'Defeat, like tea, is best accepted warm. Well played.',
      'My king rests. Your play had clarity. That is the whole game.',
    ],
  },
  menacing: {
    greeting: [
      'So. You\'ve come to face me. How wonderfully brave.',
      'Another challenger. They all sit down so confidently.',
      'Welcome to my board. Few leave it smiling.',
      'Begin. I do so enjoy the early moves, before the fear sets in.',
    ],
    playerBlunder: [
      'There it is. The crack in the armor. I will make it a canyon.',
      'A blunder. Delicious. Watch closely what I do with your generosity.',
      'You feel it now, don\'t you? The game slipping through your fingers.',
      'One mistake is all I ever need. You just made it.',
    ],
    resignPlea: [
      'You... have actually done it. Deliver the blow. I will allow it.',
      'My empire crumbles. Enjoy this moment — few have seen it.',
      'Finish me, champion. And sleep lightly before the rematch.',
      'So this is defeat. Interesting. End it — quickly, if you can.',
    ],
    win: [
      'As foretold. Your king falls, like all the others.',
      'Another name on the long list of the fallen. Good game, little one.',
      'The board is mine. It was always going to be mine.',
      'Crushed. Rematch whenever you wish to feel this again.',
    ],
    loss: [
      'WHAT. ...Noted. Enjoy your victory. There will not be another.',
      'You have beaten me. Frame this day. It will not repeat.',
      'Impressive, mortal. The rematch will be... educational.',
      'A loss. How novel. I will not forget the taste of it.',
    ],
  },
  rookie: {
    greeting: [
      'Hi!! I just learned how the horsey moves — I mean the knight. Okay, let\'s play!',
      'Oh boy, a real game! I\'ve been practicing SO hard. Good luck!',
      'Hello! Quick question before we start: castling is the swappy king thing, right? Okay, ready!',
      'A new game! My coach says to develop my pieces, so that\'s the plan. I think.',
    ],
    playerBlunder: [
      'Wait... is that piece just... free? Is this a trick? I\'m taking it. Eek!',
      'Oh! Oh! I know this one — that\'s a blunder, right?! I saw it in a video!',
      'Um, I don\'t want to be rude, but I think you maybe didn\'t mean that one?',
      'FREE PIECE! Sorry, sorry — my coach says not to celebrate. Taking it quietly.',
    ],
    resignPlea: [
      'Okay, I\'m super duper lost. Can you do the checkmate thing so I can see how it works?',
      'My position looks like my sock drawer. Total chaos. Finish me, I\'m taking notes!',
      'I counted like five ways I lose. Show me the coolest one, please!',
      'Welp. This is what my coach calls "a learning experience". Go ahead, mate me!',
    ],
    win: [
      'WAIT. Did I WIN?! I WON! Oh my gosh! Can we play again? Please?!',
      'I actually won a game!! I\'m telling my coach IMMEDIATELY.',
      'Victory!! I mean — gg, well played! But also EEEEE!',
      'I won I won I won! Sorry. Composure. GG. (I won!!)',
    ],
    loss: [
      'Aw, I lost. BUT I almost did a fork this time! Rematch?',
      'You beat me! That was so cool. Can you show me where I went wrong?',
      'I lost again... adding it to my notebook of Learning Moments. GG!',
      'Defeated! One day I\'ll win one of these. Today is not that day. GG!',
    ],
  },
};

// Styling pass for kinds without a dedicated persona pool. Every line gets
// a prefix or suffix (gruff instead gets trimmed to its first sentence),
// so the result always sounds in-character.
const BOT_CHAT_STYLE = {
  cheerful: {
    pre: ['Ooh!', 'Yay!', 'Hehe!', 'Okey-dokey!'],
    post: ['This is so fun!', 'What a game!', 'Love it!', 'Keep smiling!', 'Best hobby ever!'],
  },
  gruff: {
    shorten: true,
    pre: ['Hm.', 'Mm.', 'Right.'],
    post: [],
  },
  sly: {
    pre: ['Heh.', 'Interesting...', 'Just as planned.', 'Oh my.'],
    post: ['Or so it seems.', 'All part of the plan.', 'Do keep guessing.', 'Nothing up my sleeve. Probably.', 'You may quote me on that.'],
  },
  professor: {
    pre: ['Observe:', 'Note well:', 'As the textbooks say:', 'For the record:'],
    post: ['Do write that down.', 'This will be on the exam.', 'A classic motif, worth studying.', 'Consult your notes.', 'Standard theory, of course.'],
  },
  zen: {
    pre: ['Breathe.', 'Notice this:', 'So.', 'Softly, now.'],
    post: ['The river flows on.', 'All positions are temporary.', 'The board asks for nothing.', 'We continue, calmly.', 'Such is the way of the game.'],
  },
  menacing: {
    pre: ['Hah.', 'You see?', 'Witness.', 'As expected.'],
    post: ['Your struggle amuses me.', 'The end creeps closer.', 'Fear is a fine advisor — listen to it.', 'This board belongs to me.', 'Squirm.'],
  },
  rookie: {
    pre: ['Oh gosh —', 'Okay so,', 'Um, exciting!', 'Whoa!'],
    post: ['Am I doing this right?', 'My coach would be proud!', 'I read about this in a book!', 'This game is so cool!', 'Was that good? That felt good.'],
  },
};

function _firstSentence(s) {
  const m = s.match(/^[^.!?]*[.!?]+/);
  return m ? m[0].trim() : s;
}

export function botChat(kind, personality) {
  const k = BOT_CHAT_BASE[kind] ? kind : 'greeting';
  const p = BOT_CHAT_STYLE[personality] ? personality : 'cheerful';

  const persona = BOT_CHAT_PERSONA[p];
  if (persona && persona[k]) {
    return pick(persona[k], 'botchat.' + p + '.' + k);
  }

  const base = pick(BOT_CHAT_BASE[k], 'botchat.base.' + p + '.' + k);
  const style = BOT_CHAT_STYLE[p];

  if (style.shorten) {
    const line = _firstSentence(base);
    return Math.random() < 0.35 ? pick(style.pre, 'botchat.pre.' + p) + ' ' + line : line;
  }
  if (Math.random() < 0.5 && style.pre.length) {
    return pick(style.pre, 'botchat.pre.' + p) + ' ' + base;
  }
  return base + ' ' + pick(style.post, 'botchat.post.' + p);
}

/* ------------------------------------------------------------------ */
/* openingDeparture — game-review line for leaving opening theory      */
/* ------------------------------------------------------------------ */

const OPENING_DEPARTURE = [
  'You left {opening} theory on move {moveNo} — book prefers {best} over {san}.',
  'Move {moveNo} is where the map ends: theory continues with {best}, but you chose {san}.',
  'The books follow {opening} with {best} here; {san} takes the game into fresh territory on move {moveNo}.',
  'Out of book on move {moveNo}. The main line runs {best}; {san} is your own invention.',
  '{san} waves goodbye to {opening} theory at move {moveNo} — the masters kept going with {best}.',
  'Theory and you parted ways on move {moveNo}: it went {best}, you went {san}.',
  'This is where {opening} stops being a memory test — {san} leaves the book, which recommends {best}.',
  'A novelty on move {moveNo}! Well, sort of — the database expected {best}, not {san}.',
  'The well-trodden path of {opening} continues with {best}; {san} steps into the tall grass at move {moveNo}.',
  'From move {moveNo} you\'re thinking for yourself: book gives {best}, you played {san}.',
  'Your {opening} prep ran out here — {san} replaces the theoretical {best} on move {moveNo}.',
  'Departure logged: move {moveNo}, {opening}. Theory\'s choice was {best}; yours was {san}.',
  'The opening book closes at move {moveNo} — {best} was the last page, and {san} starts your own chapter.',
];

function fillOpening(t, ctx) {
  return t
    .replace(/\{opening\}/g, ctx.openingName || 'opening')
    .replace(/\{moveNo\}/g, String(ctx.moveNo || '?'))
    .replace(/\{best\}/g, ctx.best || 'the book move')
    .replace(/\{san\}/g, ctx.san || 'your move');
}

export function openingDeparture(ctx = {}) {
  return fillOpening(pick(OPENING_DEPARTURE, 'openingDeparture'), ctx);
}

/* ------------------------------------------------------------------ */
/* rushLine — puzzle-rush arcade announcer                             */
/* ------------------------------------------------------------------ */

const RUSH_LINES = {
  start: [
    'RUSH MODE! Solve fast, solve clean — go go go!',
    'Three lives. Endless puzzles. One rule: don\'t stop!',
    'The clock is hungry. Feed it solves!',
    'Puzzle Rush begins — fingers ready, eyes sharp!',
    'Lights up, board hot — GO!',
    'Speed round! Pattern brain: engaged.',
    'Here we go — blitz those tactics!',
    'Ready... set... CALCULATE!',
    'Insert coin. Puzzle Rush start!',
  ],
  life1: [
    'Strike one! Two lives left — shake it off!',
    'First miss — the run lives on. Focus up!',
    'One down, two to spare. Keep charging!',
    'Ouch! Life lost. The streak isn\'t over yet!',
    'That one bit back. Two hearts remaining!',
    'Miss number one logged. Heat check — keep rolling!',
    'A scratch! Nothing more. Back in the fight!',
    'Life one gone — the next puzzle doesn\'t know that. Attack!',
  ],
  life2: [
    'Strike two! Last life — make it legendary!',
    'One heart left. Every move counts now!',
    'Down to the final life — clutch time!',
    'Two misses. Zero room. Maximum focus!',
    'Last life! This is where heroes are made!',
    'Careful now — one more slip ends the run!',
    'Final heart beating. Slow is smooth, smooth is fast!',
    'The edge of the cliff! Solve like you mean it!',
  ],
  gameover: [
    'Run over! Great sprint — the leaderboard felt that.',
    'Game over! Catch your breath, then run it back.',
    'Three strikes — but what a run while it lasted!',
    'The rush ends here. The patterns you drilled stay!',
    'Flag falls! Nice hustle out there.',
    'Run complete! Every solve made you sharper.',
    'That\'s the buzzer! Tally the score, plan the revenge run.',
    'Out of lives — never out of chances. Again?',
  ],
  newBest: [
    'NEW BEST! The record books just got rewritten!',
    'Personal record SMASHED! You\'re leveling up for real!',
    'New high score! Yesterday\'s you is taking notes.',
    'RECORD BROKEN! That\'s what training looks like!',
    'A new personal best — the ceiling just became the floor!',
    'High score alert! Somebody\'s been drilling tactics!',
    'Best run ever! Frame it, then beat it.',
    'New peak! The mountain just got taller — good.',
  ],
  milestone10: [
    'TEN solved! Double digits — the engine is warm!',
    '10 down! You\'re officially rolling!',
    'Ten puzzles crushed — the rush is rushing!',
    'Double digits, baby! Keep the combo alive!',
    '10! The warm-up is over — now we fly!',
    'Ten solves in! Pattern brain fully online!',
    'That\'s 10! The board can\'t hide anything from you!',
    'Ten and climbing — don\'t look down!',
  ],
  milestone20: [
    'TWENTY! You\'re in beast mode now!',
    '20 solves! This is elite tempo!',
    'Twenty puzzles down — absolute rampage!',
    '20! The leaderboard is getting nervous!',
    'Twenty and counting — certified tactics machine!',
    '20 solved! Save some patterns for the rest of us!',
    'TWENTY! Peak focus, full speed — keep flying!',
    'Two-zero! Legendary run in progress!',
  ],
};

export function rushLine(kind) {
  const pool = RUSH_LINES[kind] || RUSH_LINES.start;
  return pick(pool, 'rush.' + (RUSH_LINES[kind] ? kind : 'start'));
}

/* ------------------------------------------------------------------ */
/* mysteryLine — hidden-rating mystery-bot mode                        */
/* ------------------------------------------------------------------ */

const MYSTERY_LINES = {
  intro: [
    'Your opponent today: a complete mystery. Rating unknown. Good luck reading me.',
    'No name tag, no rating badge. You\'ll have to judge me by my moves.',
    'Who am I? A beginner? A master? The board will tell you — maybe.',
    'Mystery opponent, at your service. My strength is classified.',
    'I could be anyone. Play well against everyone.',
    'My rating is a secret. My moves are the only hints you get.',
    'Guess who — no, really, that\'s the game. Figure out how strong I am.',
    'Today you play the unknown. Watch my moves closely; they\'re the only clue.',
    'Rating hidden. Ego intact. Let\'s see how sharp your radar is.',
  ],
  guessRight: [
    'Spot on! You read my strength exactly. Sharp scouting.',
    'Correct! You saw right through the mystery.',
    'Nailed it — that\'s precisely my rating range. Impressive radar.',
    'You guessed right! My disguise needs work.',
    'Bang on. You measured me move by move.',
    'Right! Reading an opponent\'s strength is a skill — you clearly have it.',
    'Exactly right. You\'d make a fine talent scout.',
  ],
  guessWrong: [
    'Not quite! I\'m trickier to read than you thought.',
    'Wrong guess — the mystery held up this time.',
    'Missed! My true strength was hiding in plain sight.',
    'Nope! Did the blunders fool you, or the brilliancies?',
    'Off the mark — your rating radar needs a small recalibration.',
    'Incorrect! I played just confusingly enough, it seems.',
    'Not this time. Strength is sneaky — watch the quiet moves next round.',
  ],
};

export function mysteryLine(kind) {
  const pool = MYSTERY_LINES[kind] || MYSTERY_LINES.intro;
  return pick(pool, 'mystery.' + (MYSTERY_LINES[kind] ? kind : 'intro'));
}
