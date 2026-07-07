// ChessQuest engine — 0x88 alpha-beta engine with transposition table,
// killer moves, passed-pawn/mop-up eval, and Elo throttling.
// Pure module: no DOM. Used from engine-worker.js.

const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
const VALUES = [0, 100, 320, 330, 500, 900, 20000];

const KNIGHT_OFF = [31, 33, 14, 18, -31, -33, -14, -18];
const KING_OFF = [1, -1, 16, -16, 15, 17, -15, -17];
const BISHOP_OFF = [15, 17, -15, -17];
const ROOK_OFF = [1, -1, 16, -16];

// piece-square tables (white perspective, index 0 = a1, row-major by rank)
const PST_P = [
   0,  0,  0,  0,  0,  0,  0,  0,
   5, 10, 10,-20,-20, 10, 10,  5,
   5, -5,-10,  0,  0,-10, -5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5,  5, 10, 25, 25, 10,  5,  5,
  10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50,
   0,  0,  0,  0,  0,  0,  0,  0];
const PST_N = [
 -50,-40,-30,-30,-30,-30,-40,-50,
 -40,-20,  0,  5,  5,  0,-20,-40,
 -30,  5, 10, 15, 15, 10,  5,-30,
 -30,  0, 15, 20, 20, 15,  0,-30,
 -30,  5, 15, 20, 20, 15,  5,-30,
 -30,  0, 10, 15, 15, 10,  0,-30,
 -40,-20,  0,  0,  0,  0,-20,-40,
 -50,-40,-30,-30,-30,-30,-40,-50];
const PST_B = [
 -20,-10,-10,-10,-10,-10,-10,-20,
 -10,  5,  0,  0,  0,  0,  5,-10,
 -10, 10, 10, 10, 10, 10, 10,-10,
 -10,  0, 10, 10, 10, 10,  0,-10,
 -10,  5,  5, 10, 10,  5,  5,-10,
 -10,  0,  5, 10, 10,  5,  0,-10,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -20,-10,-10,-10,-10,-10,-10,-20];
const PST_R = [
   0,  0,  0,  5,  5,  0,  0,  0,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
  -5,  0,  0,  0,  0,  0,  0, -5,
   5, 10, 10, 10, 10, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0];
const PST_Q = [
 -20,-10,-10, -5, -5,-10,-10,-20,
 -10,  0,  5,  0,  0,  0,  0,-10,
 -10,  5,  5,  5,  5,  5,  0,-10,
   0,  0,  5,  5,  5,  5,  0, -5,
  -5,  0,  5,  5,  5,  5,  0, -5,
 -10,  0,  5,  5,  5,  5,  0,-10,
 -10,  0,  0,  0,  0,  0,  0,-10,
 -20,-10,-10, -5, -5,-10,-10,-20];
const PST_K_MID = [
  20, 30, 10,  0,  0, 10, 30, 20,
  20, 20,  0,  0,  0,  0, 20, 20,
 -10,-20,-20,-20,-20,-20,-20,-10,
 -20,-30,-30,-40,-40,-30,-30,-20,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30,
 -30,-40,-40,-50,-50,-40,-40,-30];
const PST_K_END = [
 -50,-30,-30,-30,-30,-30,-30,-50,
 -30,-30,  0,  0,  0,  0,-30,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 30, 40, 40, 30,-10,-30,
 -30,-10, 20, 30, 30, 20,-10,-30,
 -30,-20,-10,  0,  0,-10,-20,-30,
 -50,-40,-30,-20,-20,-30,-40,-50];
const PSTS = [null, PST_P, PST_N, PST_B, PST_R, PST_Q, PST_K_MID];

// passed pawn bonus by rank (from mover's perspective, rank 1..6 meaningful)
const PASSED_BONUS = [0, 8, 14, 24, 42, 70, 110, 0];

const MATE = 100000;
const STOP = Symbol("stop");

// ---- zobrist keys (deterministic PRNG so hashes are stable) ----------------
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0);
  };
}
const rng = mulberry32(0xC0FFEE);
const ZOB_PIECE = []; // [pieceCode 0..12][sq 0..127]
for (let p = 0; p < 13; p++) {
  const row = new Int32Array(128);
  for (let s = 0; s < 128; s++) row[s] = rng() | 0;
  ZOB_PIECE.push(row);
}
const ZOB_SIDE = rng() | 0;
const ZOB_CASTLE = new Int32Array(16);
for (let i = 0; i < 16; i++) ZOB_CASTLE[i] = rng() | 0;
const ZOB_EP = new Int32Array(128);
for (let i = 0; i < 128; i++) ZOB_EP[i] = rng() | 0;
const pcode = (p) => p + 6; // -6..6 -> 0..12

const TT_EXACT = 0, TT_LOWER = 1, TT_UPPER = 2;

export class Engine {
  constructor() {
    this.board = new Int8Array(128);
    this.side = 1;            // 1 = white, -1 = black
    this.castle = 0;          // 1 K, 2 Q, 4 k, 8 q
    this.ep = -1;
    this.kings = { 1: -1, [-1]: -1 };
    this.hist = [];
    this.nodes = 0;
    this.stopAt = Infinity;
    this.nodeCap = Infinity;
    this.hash = 0;
    this.tt = new Map();
    this.killers = [];
  }

  setFen(fen) {
    this.board.fill(0);
    const [pieces, turn, castle, ep] = fen.split(" ");
    let sq = 0x70; // a8
    for (const ch of pieces) {
      if (ch === "/") { sq = (sq & 0xf0) - 16; continue; }
      if (ch >= "1" && ch <= "8") { sq += +ch; continue; }
      const lower = ch.toLowerCase();
      const type = { p: P, n: N, b: B, r: R, q: Q, k: K }[lower];
      const color = ch === lower ? -1 : 1;
      this.board[sq] = type * color;
      if (type === K) this.kings[color] = sq;
      sq++;
    }
    this.side = turn === "w" ? 1 : -1;
    this.castle = 0;
    if (castle.includes("K")) this.castle |= 1;
    if (castle.includes("Q")) this.castle |= 2;
    if (castle.includes("k")) this.castle |= 4;
    if (castle.includes("q")) this.castle |= 8;
    this.ep = ep !== "-" ? sq0x88(ep) : -1;
    this.hist = [];
    this.hash = this.computeHash();
  }

  computeHash() {
    let h = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = this.board[sq];
      if (p !== 0) h ^= ZOB_PIECE[pcode(p)][sq];
    }
    if (this.side === -1) h ^= ZOB_SIDE;
    h ^= ZOB_CASTLE[this.castle];
    if (this.ep >= 0) h ^= ZOB_EP[this.ep];
    return h | 0;
  }

  attacked(sq, by) {
    const b = this.board;
    if (by === 1) {
      if (((sq - 15) & 0x88) === 0 && b[sq - 15] === P) return true;
      if (((sq - 17) & 0x88) === 0 && b[sq - 17] === P) return true;
    } else {
      if (((sq + 15) & 0x88) === 0 && b[sq + 15] === -P) return true;
      if (((sq + 17) & 0x88) === 0 && b[sq + 17] === -P) return true;
    }
    for (const o of KNIGHT_OFF) {
      const t = sq + o;
      if ((t & 0x88) === 0 && b[t] === N * by) return true;
    }
    for (const o of KING_OFF) {
      const t = sq + o;
      if ((t & 0x88) === 0 && b[t] === K * by) return true;
    }
    for (const o of BISHOP_OFF) {
      let t = sq + o;
      while ((t & 0x88) === 0) {
        const p = b[t];
        if (p !== 0) {
          if ((p === B * by) || (p === Q * by)) return true;
          break;
        }
        t += o;
      }
    }
    for (const o of ROOK_OFF) {
      let t = sq + o;
      while ((t & 0x88) === 0) {
        const p = b[t];
        if (p !== 0) {
          if ((p === R * by) || (p === Q * by)) return true;
          break;
        }
        t += o;
      }
    }
    return false;
  }

  inCheck(side = this.side) {
    return this.attacked(this.kings[side], -side);
  }

  genMoves(capsOnly = false) {
    const moves = [];
    const b = this.board, s = this.side;
    for (let from = 0; from < 128; from++) {
      if (from & 0x88) { from += 7; continue; }
      const p = b[from];
      if (p === 0 || Math.sign(p) !== s) continue;
      const type = Math.abs(p);
      if (type === P) {
        const dir = 16 * s;
        const one = from + dir;
        if (!capsOnly && (one & 0x88) === 0 && b[one] === 0) {
          this.pushPawn(moves, from, one, 0, 0);
          const startRank = s === 1 ? 1 : 6;
          const two = from + 2 * dir;
          if ((from >> 4) === startRank && b[two] === 0)
            moves.push({ from, to: two, piece: p, capt: 0, promo: 0, flags: 4 });
        }
        for (const d of [dir + 1, dir - 1]) {
          const to = from + d;
          if (to & 0x88) continue;
          if (b[to] !== 0 && Math.sign(b[to]) === -s)
            this.pushPawn(moves, from, to, b[to], 0);
          else if (to === this.ep)
            moves.push({ from, to, piece: p, capt: P * -s, promo: 0, flags: 1 });
        }
      } else {
        const offs = type === N ? KNIGHT_OFF : type === K ? KING_OFF
          : type === B ? BISHOP_OFF : type === R ? ROOK_OFF
          : KING_OFF;
        const slide = type === B || type === R || type === Q;
        for (const o of offs) {
          let to = from + o;
          while ((to & 0x88) === 0) {
            const t = b[to];
            if (t === 0) {
              if (!capsOnly) moves.push({ from, to, piece: p, capt: 0, promo: 0, flags: 0 });
            } else {
              if (Math.sign(t) === -s)
                moves.push({ from, to, piece: p, capt: t, promo: 0, flags: 0 });
              break;
            }
            if (!slide) break;
            to += o;
          }
        }
        if (type === K && !capsOnly) this.genCastles(moves, from);
      }
    }
    return moves;
  }

  pushPawn(moves, from, to, capt, flags) {
    const p = this.board[from];
    const lastRank = this.side === 1 ? 7 : 0;
    if ((to >> 4) === lastRank) {
      for (const promo of [Q, N, R, B])
        moves.push({ from, to, piece: p, capt, promo: promo * this.side, flags });
    } else {
      moves.push({ from, to, piece: p, capt, promo: 0, flags });
    }
  }

  genCastles(moves, from) {
    const s = this.side, b = this.board;
    const rights = s === 1 ? this.castle & 3 : (this.castle >> 2) & 3;
    if (rights === 0 || this.attacked(from, -s)) return;
    if ((rights & 1) && b[from + 1] === 0 && b[from + 2] === 0 &&
        b[from + 3] === R * s &&
        !this.attacked(from + 1, -s) && !this.attacked(from + 2, -s))
      moves.push({ from, to: from + 2, piece: K * s, capt: 0, promo: 0, flags: 2 });
    if ((rights & 2) && b[from - 1] === 0 && b[from - 2] === 0 && b[from - 3] === 0 &&
        b[from - 4] === R * s &&
        !this.attacked(from - 1, -s) && !this.attacked(from - 2, -s))
      moves.push({ from, to: from - 2, piece: K * s, capt: 0, promo: 0, flags: 2 });
  }

  make(m) {
    const b = this.board;
    this.hist.push({ m, castle: this.castle, ep: this.ep, hash: this.hash });
    let h = this.hash;
    h ^= ZOB_CASTLE[this.castle];
    if (this.ep >= 0) h ^= ZOB_EP[this.ep];

    h ^= ZOB_PIECE[pcode(m.piece)][m.from];              // lift piece
    if (m.capt && !(m.flags & 1)) h ^= ZOB_PIECE[pcode(m.capt)][m.to];
    const placed = m.promo || m.piece;
    h ^= ZOB_PIECE[pcode(placed)][m.to];                 // place piece

    b[m.to] = placed;
    b[m.from] = 0;
    if (m.flags & 1) {                                    // en passant
      const capSq = m.to - 16 * this.side;
      h ^= ZOB_PIECE[pcode(b[capSq])][capSq];
      b[capSq] = 0;
    }
    if (m.flags & 2) {                                    // castle: move rook
      if (m.to > m.from) {
        h ^= ZOB_PIECE[pcode(b[m.to + 1])][m.to + 1] ^ ZOB_PIECE[pcode(b[m.to + 1])][m.to - 1];
        b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = 0;
      } else {
        h ^= ZOB_PIECE[pcode(b[m.to - 2])][m.to - 2] ^ ZOB_PIECE[pcode(b[m.to - 2])][m.to + 1];
        b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = 0;
      }
    }
    if (Math.abs(m.piece) === K) this.kings[this.side] = m.to;
    const clr = (sq) => {
      if (sq === 0x04) this.castle &= ~3;
      else if (sq === 0x00) this.castle &= ~2;
      else if (sq === 0x07) this.castle &= ~1;
      else if (sq === 0x74) this.castle &= ~12;
      else if (sq === 0x70) this.castle &= ~8;
      else if (sq === 0x77) this.castle &= ~4;
    };
    clr(m.from); clr(m.to);
    this.ep = (m.flags & 4) ? m.from + 16 * this.side : -1;
    this.side = -this.side;

    h ^= ZOB_CASTLE[this.castle];
    if (this.ep >= 0) h ^= ZOB_EP[this.ep];
    h ^= ZOB_SIDE;
    this.hash = h | 0;
  }

  unmake() {
    const { m, castle, ep, hash } = this.hist.pop();
    this.side = -this.side;
    this.castle = castle;
    this.ep = ep;
    this.hash = hash;
    const b = this.board;
    b[m.from] = m.piece;
    b[m.to] = 0;
    if (m.flags & 1) b[m.to - 16 * this.side] = m.capt;
    else if (m.capt) b[m.to] = m.capt;
    if (m.flags & 2) {
      if (m.to > m.from) { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = 0; }
      else { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = 0; }
    }
    if (Math.abs(m.piece) === K) this.kings[this.side] = m.from;
  }

  legalMoves() {
    const out = [];
    for (const m of this.genMoves()) {
      this.make(m);
      if (!this.attacked(this.kings[-this.side], this.side)) out.push(m);
      this.unmake();
    }
    return out;
  }

  // static eval from side-to-move perspective
  evaluate() {
    const b = this.board;
    let score = 0, phase = 0;
    let wMinor = 0, bMinor = 0, wPawnN = 0, bPawnN = 0;
    const wPawns = [], bPawns = [];
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq];
      if (p === 0) continue;
      const type = Math.abs(p), color = Math.sign(p);
      if (type !== P && type !== K) {
        phase += VALUES[type];
        if (color === 1) wMinor += VALUES[type]; else bMinor += VALUES[type];
      }
      if (type === P) {
        if (color === 1) { wPawnN++; wPawns.push(sq); } else { bPawnN++; bPawns.push(sq); }
      }
      if (type === K) continue; // king PST needs final phase; added below
      const idx64 = ((sq >> 4) << 3) | (sq & 7);
      const pstIdx = color === 1 ? idx64 : (idx64 ^ 56);
      score += color * (VALUES[type] + PSTS[type][pstIdx]);
    }
    const endgame = phase < 1600;
    const kingPst = endgame ? PST_K_END : PST_K_MID;
    for (const color of [1, -1]) {
      const ksq = this.kings[color];
      const idx64 = ((ksq >> 4) << 3) | (ksq & 7);
      score += color * kingPst[color === 1 ? idx64 : (idx64 ^ 56)];
    }

    // passed pawns (scaled up in the endgame)
    const scale = endgame ? 1.5 : 1;
    for (const sq of wPawns) {
      if (isPassed(b, sq, 1)) score += PASSED_BONUS[sq >> 4] * scale;
    }
    for (const sq of bPawns) {
      if (isPassed(b, sq, -1)) score -= PASSED_BONUS[7 - (sq >> 4)] * scale;
    }

    // mop-up: drive a lone king to the edge and bring our king close
    if (bMinor === 0 && bPawnN === 0 && (wMinor >= 500 || (wMinor >= 330 && wPawnN > 0))) {
      score += mopUp(this.kings[1], this.kings[-1]);
    } else if (wMinor === 0 && wPawnN === 0 && (bMinor >= 500 || (bMinor >= 330 && bPawnN > 0))) {
      score -= mopUp(this.kings[-1], this.kings[1]);
    }

    return score * this.side + 10; // small tempo bonus
  }

  orderMoves(moves, pvMove, ply) {
    const k = this.killers[ply];
    for (const m of moves) {
      m.score = 0;
      if (pvMove && m.from === pvMove.from && m.to === pvMove.to && m.promo === pvMove.promo)
        m.score = 1e9;
      else if (m.capt)
        m.score = 1e6 + VALUES[Math.abs(m.capt)] * 10 - VALUES[Math.abs(m.piece)];
      else if (m.promo) m.score = 9e5;
      else if (k && ((k[0] && sameMove(m, k[0])) || (k[1] && sameMove(m, k[1]))))
        m.score = 8e5;
    }
    moves.sort((a, b) => b.score - a.score);
  }

  quiesce(alpha, beta) {
    this.nodes++;
    const stand = this.evaluate();
    if (stand >= beta) return beta;
    if (stand > alpha) alpha = stand;
    const caps = this.genMoves(true);
    this.orderMoves(caps, null, 99);
    for (const m of caps) {
      if (this.nodes > this.nodeCap) break;
      this.make(m);
      if (this.attacked(this.kings[-this.side], this.side)) { this.unmake(); continue; }
      const score = -this.quiesce(-beta, -alpha);
      this.unmake();
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  alphabeta(depth, alpha, beta, ply) {
    if (depth <= 0) return this.quiesce(alpha, beta);
    this.nodes++;
    if (this.nodes > this.nodeCap || (this.nodes % 2048 === 0 && Date.now() > this.stopAt)) throw STOP;

    const alphaOrig = alpha;
    let ttMove = null;
    const entry = this.tt.get(this.hash);
    if (entry) {
      ttMove = entry.move;
      if (entry.depth >= depth && Math.abs(entry.score) < MATE - 1000) {
        if (entry.flag === TT_EXACT) return entry.score;
        if (entry.flag === TT_LOWER && entry.score > alpha) alpha = entry.score;
        else if (entry.flag === TT_UPPER && entry.score < beta) beta = entry.score;
        if (alpha >= beta) return entry.score;
      }
    }

    const moves = this.genMoves();
    this.orderMoves(moves, ttMove, ply);
    let legal = 0, bestMove = null, bestScore = -Infinity;
    const check = this.inCheck();
    for (const m of moves) {
      this.make(m);
      if (this.attacked(this.kings[-this.side], this.side)) { this.unmake(); continue; }
      legal++;
      const score = -this.alphabeta(depth - 1, -beta, -alpha, ply + 1);
      this.unmake();
      if (score > bestScore) { bestScore = score; bestMove = m; }
      if (score > alpha) alpha = score;
      if (alpha >= beta) {
        if (!m.capt && !m.promo) {                    // killer move
          const k = (this.killers[ply] ||= [null, null]);
          if (!k[0] || !sameMove(m, k[0])) { k[1] = k[0]; k[0] = m; }
        }
        break;
      }
    }
    if (legal === 0) return check ? -MATE + ply : 0;

    // store in TT (skip unstable mate scores)
    if (Math.abs(bestScore) < MATE - 1000 && this.tt.size < 1 << 20) {
      const flag = bestScore <= alphaOrig ? TT_UPPER : bestScore >= beta ? TT_LOWER : TT_EXACT;
      this.tt.set(this.hash, { depth, score: bestScore, flag, move: bestMove });
    }
    return alpha >= beta ? beta : bestScore;
  }

  // Score every root move at given depth. Score from side-to-move perspective.
  scoreRootMoves(depth, timeMs = 3000, nodeCap = 600000) {
    this.nodes = 0;
    this.stopAt = Date.now() + timeMs;
    this.nodeCap = nodeCap;
    this.tt.clear();
    this.killers = [];
    const moves = this.legalMoves();
    const scored = moves.map((m) => ({ move: m, score: -Infinity }));
    let lastComplete = null;
    for (let d = 1; d <= depth; d++) {
      try {
        scored.sort((a, b) => b.score - a.score);
        for (const entry of scored) {
          this.make(entry.move);
          entry.score = -this.alphabeta(d - 1, -MATE, MATE, 1);
          this.unmake();
        }
        lastComplete = scored.map((e) => ({ move: e.move, score: e.score }));
      } catch (e) {
        if (e !== STOP) throw e;
        while (this.hist.length) this.unmake();
        break;
      }
    }
    const result = lastComplete || scored.map((e) => ({ move: e.move, score: e.score }));
    result.sort((a, b) => b.score - a.score);
    return result;
  }
}

function phaseLess(phase) { return phase < 1600; }

function sameMove(a, b) {
  return a.from === b.from && a.to === b.to && a.promo === b.promo;
}

function isPassed(board, sq, color) {
  const file = sq & 7;
  const dir = 16 * color;
  for (let f = Math.max(0, file - 1); f <= Math.min(7, file + 1); f++) {
    let t = (sq & 0xf0) + f + dir;
    while ((t & 0x88) === 0) {
      if (board[t] === -P * color) return false;
      t += dir;
    }
  }
  return true;
}

function mopUp(winnerK, loserK) {
  const lf = loserK & 7, lr = loserK >> 4;
  const centerDist = Math.max(Math.abs(lf - 3.5), Math.abs(lr - 3.5)) * 2; // 1..7
  const kingDist = Math.abs((winnerK & 7) - lf) + Math.abs((winnerK >> 4) - lr);
  return 12 * centerDist + 6 * (14 - kingDist);
}

function sq0x88(alg) {
  return (alg.charCodeAt(0) - 97) + ((alg.charCodeAt(1) - 49) << 4);
}
export function sqAlg(sq) {
  return String.fromCharCode(97 + (sq & 7)) + String.fromCharCode(49 + (sq >> 4));
}
export function moveUci(m) {
  const promo = m.promo ? { [N]: "n", [B]: "b", [R]: "r", [Q]: "q" }[Math.abs(m.promo)] : "";
  return sqAlg(m.from) + sqAlg(m.to) + promo;
}

// ---- Elo throttling -------------------------------------------------------

export function eloParams(elo) {
  const depth = elo < 650 ? 1 : elo < 1000 ? 2 : elo < 1450 ? 3 : elo < 1850 ? 4
    : elo < 2300 ? 5 : 6;
  const temp = Math.max(6, 340 - elo * 0.135);
  const timeMs = elo < 1000 ? 600 : elo < 1800 ? 1300 : 2600;
  return { depth, temp, timeMs };
}

// Pick a move like a player of the given Elo would.
export function pickMoveForElo(fen, elo, rng2 = Math.random) {
  const eng = new Engine();
  eng.setFen(fen);
  const { depth, temp, timeMs } = eloParams(elo);
  const scored = eng.scoreRootMoves(depth, timeMs);
  if (scored.length === 0) return null;
  const best = scored[0].score;
  // with a forced mate on the board, any club-level player just converts
  if (best > MATE - 1000 && elo >= 1200) {
    return { uci: moveUci(scored[0].move), score: best, best: moveUci(scored[0].move) };
  }
  const weights = scored.map((s) => {
    const deficit = best - s.score;
    if (deficit > 90000) return elo < 600 ? 1e-6 : 0;
    return Math.exp(-deficit / temp);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng2() * total;
  for (let i = 0; i < scored.length; i++) {
    r -= weights[i];
    if (r <= 0) return { uci: moveUci(scored[i].move), score: scored[i].score, best: moveUci(scored[0].move) };
  }
  return { uci: moveUci(scored[0].move), score: best, best: moveUci(scored[0].move) };
}

// Full-strength analysis of one position (for game review / hints).
export function analysePosition(fen, depth = 4, timeMs = 2500) {
  const eng = new Engine();
  eng.setFen(fen);
  const legal = eng.legalMoves();
  if (legal.length === 0) {
    return { score: eng.inCheck() ? -MATE : 0, bestUci: null, mate: eng.inCheck(), moves: [] };
  }
  const scored = eng.scoreRootMoves(depth, timeMs);
  const top = scored[0];
  return {
    score: top.score,
    bestUci: moveUci(top.move),
    mateIn: top.score > MATE - 200 ? Math.ceil((MATE - top.score) / 2) :
            top.score < -MATE + 200 ? -Math.ceil((MATE + top.score) / 2) : null,
    moves: scored.slice(0, 3).map((s) => ({ uci: moveUci(s.move), score: s.score })),
  };
}
