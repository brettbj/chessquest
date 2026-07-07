#!/usr/bin/env python3
"""Build data/openings.js: curated opening trainer modules from lichess TSVs."""
import csv, json, re

# family name -> side the student plays ('w' or 'b')
FAMILIES = {
    "Italian Game": "w", "Ruy Lopez": "w", "Scotch Game": "w",
    "Vienna Game": "w", "King's Gambit Accepted": "w", "King's Gambit Declined": "w", 
    "London System": "w", "English Opening": "w", "Réti Opening": "w",
    "Catalan Opening": "w", "Four Knights Game": "w", "Ponziani Opening": "w",
    "Bishop's Opening": "w", "Center Game": "w", "Danish Gambit": "w",
    "Trompowsky Attack": "w", "Colle System": "w", "Torre Attack": "w",
    "King's Indian Attack": "w", "Bird Opening": "w", "Nimzo-Larsen Attack": "w",
    "Evans Gambit": "w", "Italian Game: Giuoco Pianissimo": "w", "Smith-Morra Gambit": "w",
    "Sicilian Defense: Closed": "w", "Sicilian Defense: Alapin Variation": "w",
    "Sicilian Defense": "b", "French Defense": "b", "Caro-Kann Defense": "b",
    "Scandinavian Defense": "b", "Pirc Defense": "b", "Modern Defense": "b",
    "Alekhine Defense": "b", "Petrov's Defense": "b", "Philidor Defense": "b",
    "Nimzo-Indian Defense": "b", "King's Indian Defense": "b",
    "Queen's Indian Defense": "b", "Grünfeld Defense": "b",
    "Slav Defense": "b", "Semi-Slav Defense": "b", "Dutch Defense": "b",
    "Benoni Defense": "b", "Benko Gambit": "b", "Indian Defense: Budapest Gambit": "b",
    "Tarrasch Defense": "b", "Queen's Gambit Declined": "b",
    "Queen's Gambit Accepted": "b", "Albin Countergambit": "b",
    "Two Knights Defense": "b", "Hungarian Opening": "w",
    "Najdorf": "b", "Sicilian Defense: Dragon Variation": "b",
}

rows = []
for f in "abcde":
    with open(f"openings_{f}.tsv") as fh:
        rdr = csv.reader(fh, delimiter="\t")
        next(rdr)
        for eco, name, pgn in rdr:
            san = re.sub(r"\d+\.\s*", "", pgn).split()
            rows.append((eco, name, san))

modules = []
seen = set()
for fam, side in FAMILIES.items():
    matches = [r for r in rows if r[1] == fam or r[1].startswith(fam + ":")
               or (": " + fam) in r[1]]
    matches = [r for r in matches if 4 <= len(r[2]) <= 20]
    if not matches:
        print("no match:", fam)
        continue
    # main line: the exact-name entry if present, else shortest
    main = next((r for r in matches if r[1] == fam), None)
    if main is None:
        main = min(matches, key=lambda r: len(r[2]))
    picks = [main]
    # variations: longest distinct lines, prefer ones extending the main line
    vars_ = sorted((r for r in matches if r[1] != main[1] and len(r[2]) >= 6),
                   key=lambda r: -len(r[2]))
    for v in vars_:
        if len(picks) >= 3:
            break
        if all(v[1] != p[1] and v[2] != p[2] for p in picks):
            picks.append(v)
    for eco, name, san in picks:
        if name in seen:
            continue
        seen.add(name)
        modules.append({"eco": eco, "name": name, "moves": san, "side": side})

js = ("// Auto-generated from lichess-org/chess-openings (CC0).\n"
      "export const OPENINGS = " +
      json.dumps(modules, separators=(",", ":"), ensure_ascii=False) + ";\n")
with open("../data/openings.js", "w") as f:
    f.write(js)
print(f"wrote {len(modules)} opening modules")
