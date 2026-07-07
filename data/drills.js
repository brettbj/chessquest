// Endgame drills: play out standard technique positions against the engine.
// The player always has the winning (or holding) side; the engine defends well.

export const DRILLS = [
  {
    id: "drill:kq", name: "Queen Mate", icon: "♕", fen: "8/8/8/3k4/8/8/8/KQ6 w - - 0 1",
    playerColor: "w", goal: "mate", par: 12, botElo: 2400,
    intro: "King + queen vs king. Box the king in with queen-a-knight's-move-away, walk your king up, deliver mate. Watch for stalemate!",
  },
  {
    id: "drill:kr", name: "Rook Mate", icon: "♖", fen: "8/8/8/3k4/8/8/8/KR6 w - - 0 1",
    playerColor: "w", goal: "mate", par: 18, botElo: 2400,
    intro: "King + rook vs king. Cut the king off with the rook, shoulder it to the edge with your king, mate on the rim.",
  },
  {
    id: "drill:krr", name: "Two-Rook Ladder", icon: "♜", fen: "8/8/8/4k3/8/8/8/KR1R4 w - - 0 1",
    playerColor: "w", goal: "mate", par: 10, botElo: 2400,
    intro: "The lawnmower mate: alternate rook checks rank by rank, marching the king to the edge. Your king can nap.",
  },
  {
    id: "drill:kbb", name: "Two Bishops", icon: "♗", fen: "8/8/8/3k4/8/8/8/KBB5 w - - 0 1",
    playerColor: "w", goal: "mate", par: 24, botElo: 2400,
    intro: "Two bishops form a moving wall. Herd the king to a corner — any corner — and close the net with your king's help.",
  },
  {
    id: "drill:kp", name: "King & Pawn", icon: "♙", fen: "8/8/4k3/8/4K3/4P3/8/8 w - - 0 1",
    playerColor: "w", goal: "mate", par: 20, botElo: 2400,
    intro: "The heart of endgame theory: opposition. Your spare pawn tempo wins the fight of the kings. Escort the pawn home, promote, and mate.",
  },
  {
    id: "drill:lucena", name: "Lucena Position", icon: "🌉", fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1",
    playerColor: "w", goal: "mate", par: 14, botElo: 2400,
    intro: "The most important rook endgame: build the bridge. Check the king away, bring your rook to the 4th rank, and shelter your king behind it.",
  },
  {
    id: "drill:philidor", name: "Philidor Defense", icon: "🛡️", fen: "4k3/8/8/4PK2/8/8/r7/4R3 b - - 0 1",
    playerColor: "b", goal: "draw", par: 0, botElo: 2400,
    intro: "Now DEFEND a rook endgame down a pawn. Keep your rook on your third rank until the pawn steps forward — then check from behind forever. Hold the draw!",
  },
  {
    id: "drill:kpp", name: "Connected Passers", icon: "👯", fen: "8/8/8/3k4/8/8/2PP4/3K4 w - - 0 1",
    playerColor: "w", goal: "mate", par: 22, botElo: 2400,
    intro: "Two connected passed pawns beat a king: advance them side by side so they defend each other, promote one, then mate.",
  },
];
