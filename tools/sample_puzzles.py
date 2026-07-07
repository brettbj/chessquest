#!/usr/bin/env python3
"""Sample Lichess puzzles into data/puzzles.js.

Strategy: decode the truncated .zst prefix stream, keep high-quality rows,
then select (a) ~2200 puzzles stratified across rating buckets for the rated
puzzle mode, and (b) enough per (theme, tier) for the trainer modules.
"""
import io, csv, json, random, sys
import zstandard

random.seed(42)

SRC = "puzzles_prefix.zst"
OUT = "../data/puzzles.js"

# Themes the trainer builds modules from (must match trainer.js)
TRAINER_THEMES = [
    "mateIn1", "mateIn2", "mateIn3", "fork", "pin", "skewer",
    "discoveredAttack", "doubleCheck", "sacrifice", "deflection",
    "attraction", "clearance", "interference", "xRayAttack",
    "trappedPiece", "hangingPiece", "backRankMate", "smotheredMate",
    "promotion", "advancedPawn", "exposedKing", "kingsideAttack",
    "capturingDefender", "intermezzo", "quietMove", "defensiveMove",
    "rookEndgame", "pawnEndgame", "queenEndgame", "knightEndgame",
    "bishopEndgame", "endgame", "middlegame", "opening",
]
TIERS = [(0, 1200), (1200, 1600), (1600, 2000), (2000, 2400), (2400, 3600)]
PER_THEME_TIER = 14          # puzzles per trainer module
BUCKETS = list(range(500, 3000, 100))
PER_BUCKET = 150              # rated-mode pool

rows = []
dctx = zstandard.ZstdDecompressor()
with open(SRC, "rb") as fh:
    reader = dctx.stream_reader(fh, read_across_frames=True)
    text = io.TextIOWrapper(reader, encoding="utf-8", errors="replace")
    try:
        rdr = csv.reader(text)
        header = next(rdr)
        for row in rdr:
            if len(row) < 8:
                continue
            try:
                rating = int(row[3]); rd = int(row[4])
                pop = int(row[5]); plays = int(row[6])
            except ValueError:
                continue
            moves = row[2].split()
            if not (2 <= len(moves) <= 10):
                continue
            if pop < 88 or plays < 300 or rd > 85:
                continue
            rows.append((row[0], row[1], row[2], rating, row[7]))
    except (zstandard.ZstdError, EOFError):
        pass  # truncated prefix — expected
    except Exception as e:
        print(f"stream ended: {e}", file=sys.stderr)

print(f"candidates: {len(rows)}")

selected = {}  # id -> row

def take(pool, n):
    random.shuffle(pool)
    got = 0
    for r in pool:
        if r[0] in selected:
            continue
        selected[r[0]] = r
        got += 1
        if got >= n:
            break
    return got

# (a) rated-mode stratification
by_bucket = {b: [] for b in BUCKETS}
for r in rows:
    b = min(max((r[3] // 100) * 100, 500), 2900)
    by_bucket[b].append(r)
for b in BUCKETS:
    got = take(by_bucket[b], PER_BUCKET)
    if got < PER_BUCKET:
        print(f"  bucket {b}: only {got}", file=sys.stderr)

# (b) trainer coverage
short = []
for theme in TRAINER_THEMES:
    themed = [r for r in rows if theme in r[4].split()]
    for lo, hi in TIERS:
        pool = [r for r in themed if lo <= r[3] < hi]
        have = sum(1 for r in selected.values()
                   if theme in r[4].split() and lo <= r[3] < hi)
        need = PER_THEME_TIER - have
        if need > 0:
            got = take(pool, need)
            if have + got < PER_THEME_TIER:
                short.append(f"{theme}@{lo}-{hi}: {have+got}")

if short:
    print("short modules:", len(short), file=sys.stderr)
    for s in short:
        print("  " + s, file=sys.stderr)

# compact output: [fen, moves, rating, themes]
out = [[r[1], r[2], r[3], r[4]] for r in selected.values()]
random.shuffle(out)
js = "// Auto-generated from the Lichess puzzle database (CC0).\n" \
     "// fields: [fen, uciMoves, rating, themes]\n" \
     "export const PUZZLES = " + json.dumps(out, separators=(",", ":")) + ";\n"
with open(OUT, "w") as f:
    f.write(js)
print(f"wrote {len(out)} puzzles, {len(js)//1024} KB")
