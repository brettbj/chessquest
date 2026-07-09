// Interactive chessboard component. Rendering + input + game-feel juice.
// Rules come from the chess.js instance the app hands us via setGame().

const FILES = "abcdefgh";
const PIECE_IMG = (p) => `assets/pieces/${p.type}${p.color === "w" ? "l" : "d"}.svg`;

// shared display settings, pushed from the app's settings panel
const DEFAULT_OPTS = { theme: "purple", showDots: true, showCoords: true, animate: true };
const instances = [];
let globalOpts = { ...DEFAULT_OPTS };

export function applyBoardSettings(opts) {
  globalOpts = { ...globalOpts, ...opts };
  for (const b of instances) b.applyOpts();
}

export class Board {
  constructor(host, { orientation = "w", onUserMove = () => {}, canMove = () => true, interactive = true } = {}) {
    this.host = host;
    this.orientation = orientation;
    this.onUserMove = onUserMove;
    this.canMove = canMove;
    this.interactive = interactive;
    this.game = null;
    this.sel = null;
    this.lastMove = null;
    this.checkSq = null;
    this.hintSqs = [];
    this.arrows = [];       // {from, to, cls}
    this.build();
    instances.push(this);
  }

  build() {
    this.host.innerHTML = "";
    this.el = document.createElement("div");
    this.el.className = "board";
    this.el.dataset.btheme = globalOpts.theme;
    this.squares = {};
    for (let i = 0; i < 64; i++) this.el.appendChild(document.createElement("div"));
    // svg overlay for arrows
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("class", "arrow-layer");
    this.svg.setAttribute("viewBox", "0 0 800 800");
    this.el.appendChild(this.svg);
    this.host.appendChild(this.el);
    this.assignCoords();
    this.el.addEventListener("pointerdown", (e) => this.onDown(e));
    this.el.addEventListener("pointermove", (e) => this.onMove(e));
    this.el.addEventListener("pointerup", (e) => this.onUp(e));
    this.el.addEventListener("pointercancel", () => this.endDrag());
    this.el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  applyOpts() {
    this.el.dataset.btheme = globalOpts.theme;
    this.el.classList.toggle("no-coords", !globalOpts.showCoords);
    if (this.game) this.render();
  }

  assignCoords() {
    const kids = this.el.children;
    let i = 0;
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++, i++) {
        const file = this.orientation === "w" ? f : 7 - f;
        const rank = this.orientation === "w" ? 7 - r : r;
        const name = FILES[file] + (rank + 1);
        const sq = kids[i];
        sq.dataset.sq = name;
        sq.className = "sq " + ((file + rank) % 2 === 1 ? "light" : "dark");
        this.squares[name] = sq;
        sq.querySelectorAll(".coord").forEach((c) => c.remove());
        if (r === 7) {
          const c = document.createElement("span");
          c.className = "coord file";
          c.textContent = FILES[file];
          sq.appendChild(c);
        }
        if (f === 0) {
          const c = document.createElement("span");
          c.className = "coord rank";
          c.textContent = rank + 1;
          sq.appendChild(c);
        }
      }
    }
  }

  setGame(game) { this.game = game; this.render(); }

  setOrientation(o) {
    if (o === this.orientation) return;
    this.orientation = o;
    this.assignCoords();
    this.render();
  }

  flip() { this.setOrientation(this.orientation === "w" ? "b" : "w"); }

  render() {
    if (!this.game) return;
    const pos = {};
    for (const row of this.game.board()) {
      for (const cell of row) if (cell) pos[cell.square] = cell;
    }
    for (const [name, sqEl] of Object.entries(this.squares)) {
      sqEl.querySelectorAll(".piece, .dot").forEach((n) => n.remove());
      sqEl.classList.remove("sel", "lastmove", "check", "hintsq", "ghosted-src");
      const p = pos[name];
      if (p) {
        const img = document.createElement("img");
        img.className = "piece";
        img.src = PIECE_IMG(p);
        img.draggable = false;
        sqEl.appendChild(img);
      }
    }
    if (this.lastMove) {
      this.squares[this.lastMove.from]?.classList.add("lastmove");
      this.squares[this.lastMove.to]?.classList.add("lastmove");
    }
    if (this.checkSq) this.squares[this.checkSq]?.classList.add("check");
    for (const s of this.hintSqs) this.squares[s]?.classList.add("hintsq");
    if (this.sel) this.showSelection(this.sel);
    this.renderArrows();
  }

  setLastMove(from, to) { this.lastMove = from ? { from, to } : null; }

  setCheck() {
    this.checkSq = null;
    if (this.game && this.game.inCheck()) {
      const color = this.game.turn();
      for (const row of this.game.board())
        for (const cell of row)
          if (cell && cell.type === "k" && cell.color === color) this.checkSq = cell.square;
    }
  }

  // ---- arrows ---------------------------------------------------------------

  sqCenter(name) {
    const f = FILES.indexOf(name[0]), r = +name[1] - 1;
    const x = this.orientation === "w" ? f : 7 - f;
    const y = this.orientation === "w" ? 7 - r : r;
    return { x: x * 100 + 50, y: y * 100 + 50 };
  }

  addArrow(from, to, cls = "user") {
    if (this.arrows.some((a) => a.from === from && a.to === to && a.cls === cls)) {
      this.arrows = this.arrows.filter((a) => !(a.from === from && a.to === to && a.cls === cls));
    } else {
      this.arrows.push({ from, to, cls });
    }
    this.renderArrows();
  }

  clearArrows(cls) {
    this.arrows = cls ? this.arrows.filter((a) => a.cls !== cls) : [];
    this.renderArrows();
  }

  renderArrows() {
    this.svg.innerHTML = "";
    for (const a of this.arrows) {
      const p1 = this.sqCenter(a.from), p2 = this.sqCenter(a.to);
      const dx = p2.x - p1.x, dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const ux = dx / len, uy = dy / len;
      const startX = p1.x + ux * 22, startY = p1.y + uy * 22;
      const tipX = p2.x, tipY = p2.y;
      const headLen = 34, headW = 24, shaftW = 13;
      const bx = tipX - ux * headLen, by = tipY - uy * headLen;
      const px = -uy, py = ux;
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d",
        `M ${startX + px * shaftW / 2} ${startY + py * shaftW / 2} ` +
        `L ${bx + px * shaftW / 2} ${by + py * shaftW / 2} ` +
        `L ${bx + px * headW / 2} ${by + py * headW / 2} ` +
        `L ${tipX} ${tipY} ` +
        `L ${bx - px * headW / 2} ${by - py * headW / 2} ` +
        `L ${bx - px * shaftW / 2} ${by - py * shaftW / 2} ` +
        `L ${startX - px * shaftW / 2} ${startY - py * shaftW / 2} Z`);
      path.setAttribute("class", "arrow arrow-" + a.cls);
      this.svg.appendChild(path);
    }
  }

  // ---- hints / effects --------------------------------------------------------

  showHint(...sqs) {
    this.hintSqs = sqs;
    if (sqs.length === 2) {
      this.clearArrows("hint");
      this.addArrow(sqs[0], sqs[1], "hint");
    }
    this.render();
  }

  clearHint() { this.hintSqs = []; this.clearArrows("hint"); this.render(); }

  flash(sqName, good) {
    const el = this.squares[sqName];
    if (!el) return;
    const cls = good ? "flash-good" : "flash-bad";
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  }

  // little particle burst on a square (capture juice)
  burst(sqName, colors = ["#ffd66b", "#ff9d5c", "#fff"]) {
    const el = this.squares[sqName];
    if (!el || !globalOpts.animate) return;
    const rect = el.getBoundingClientRect();
    for (let i = 0; i < 7; i++) {
      const p = document.createElement("div");
      p.className = "board-particle";
      const ang = (i / 7) * Math.PI * 2 + Math.random();
      const dist = rect.width * (0.35 + Math.random() * 0.45);
      p.style.left = rect.left + rect.width / 2 + "px";
      p.style.top = rect.top + rect.height / 2 + "px";
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--px", Math.cos(ang) * dist + "px");
      p.style.setProperty("--py", Math.sin(ang) * dist + "px");
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 500);
    }
  }

  // slide a piece from -> to on top of the board, then land with a settle pop
  animateMove(from, to, done) {
    const fromEl = this.squares[from], toEl = this.squares[to];
    const img = fromEl && fromEl.querySelector(".piece");
    if (!img || !toEl || !globalOpts.animate ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      done();
      return;
    }
    const r1 = fromEl.getBoundingClientRect(), r2 = toEl.getBoundingClientRect();
    const fly = img.cloneNode();
    fly.className = "piece-fly";
    fly.style.width = r1.width + "px";
    fly.style.left = r1.left + "px";
    fly.style.top = r1.top + "px";
    document.body.appendChild(fly);
    img.style.visibility = "hidden";
    requestAnimationFrame(() => {
      fly.style.transform = `translate(${r2.left - r1.left}px, ${r2.top - r1.top}px)`;
    });
    setTimeout(() => {
      fly.remove();
      done();
      const landed = toEl.querySelector(".piece");
      if (landed) {
        landed.classList.add("piece-land");
        setTimeout(() => landed.classList.remove("piece-land"), 260);
      }
    }, 150);
  }

  showSelection(sqName) {
    const el = this.squares[sqName];
    if (!el) return;
    el.classList.add("sel");
    if (!globalOpts.showDots) return;
    for (const m of this.game.moves({ square: sqName, verbose: true })) {
      const target = this.squares[m.to];
      if (!target || target.querySelector(".dot")) continue;
      const dot = document.createElement("div");
      dot.className = "dot" + (m.captured ? " capture" : "");
      target.appendChild(dot);
    }
  }

  clearSelection() {
    this.sel = null;
    for (const el of Object.values(this.squares)) {
      el.classList.remove("sel");
      el.querySelectorAll(".dot").forEach((d) => d.remove());
    }
  }

  // ---- input ---------------------------------------------------------------

  sqFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const sq = el && el.closest(".sq");
    return sq ? sq.dataset.sq : null;
  }

  onDown(e) {
    // right button: start drawing an arrow
    if (e.button === 2) {
      const sq = this.sqFromEvent(e);
      if (sq) this.arrowStart = sq;
      return;
    }
    if (!this.interactive || !this.game || !this.canMove()) return;
    const sqName = this.sqFromEvent(e);
    if (!sqName) return;
    if (this.arrows.some((a) => a.cls === "user")) this.clearArrows("user");
    const piece = this.game.get(sqName);
    const myTurn = this.game.turn();

    if (this.sel && this.sel !== sqName) {
      const legal = this.game.moves({ square: this.sel, verbose: true })
        .some((m) => m.to === sqName);
      if (legal) {
        e.preventDefault();
        this.tryMove(this.sel, sqName);
        return;
      }
    }
    if (piece && piece.color === myTurn) {
      e.preventDefault();
      this.clearSelection();
      this.sel = sqName;
      this.showSelection(sqName);
      this.dragStart = { x: e.clientX, y: e.clientY, sq: sqName, id: e.pointerId };
      try { this.el.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
    } else if (this.sel) {
      this.clearSelection();
    }
  }

  onMove(e) {
    if (!this.dragStart || e.pointerId !== this.dragStart.id) return;
    const dx = e.clientX - this.dragStart.x, dy = e.clientY - this.dragStart.y;
    if (!this.ghost && Math.hypot(dx, dy) > 6) {
      const srcEl = this.squares[this.dragStart.sq];
      const img = srcEl.querySelector(".piece");
      if (!img) return;
      const rect = srcEl.getBoundingClientRect();
      this.ghost = img.cloneNode();
      this.ghost.className = "drag-ghost";
      this.ghostSize = rect.width;
      // on touch, lift the piece above the finger so the thumb never hides it,
      // and enlarge it a bit more for visibility
      this.touchDrag = e.pointerType === "touch";
      this.ghostScale = this.touchDrag ? 1.35 : 1.15;
      this.ghost.style.width = rect.width + "px";
      this.ghost.style.left = "0";
      this.ghost.style.top = "0";
      this.ghost.style.transition = "none";
      // spawn exactly where the piece sits — no jump on pickup
      this.dragPos = { x: rect.left, y: rect.top };
      this.dragTarget = { ...this.dragPos };
      this.ghost.style.transform =
        `translate3d(${this.dragPos.x}px, ${this.dragPos.y}px, 0) scale(${this.ghostScale})`;
      document.body.appendChild(this.ghost);
      srcEl.classList.add("ghosted-src");
      img.classList.add("ghosted");
      this.startGhostLoop();
    }
    if (this.ghost) {
      const size = this.ghostSize;
      const lift = this.touchDrag ? size * 0.55 : 0;
      this.dragTarget = { x: e.clientX - size / 2, y: e.clientY - size / 2 - lift };
      // hover highlight follows the visual piece position
      const over = this.sqFromPoint(e.clientX, e.clientY - lift);
      if (over !== this.hoverSq) {
        if (this.hoverSq) this.squares[this.hoverSq]?.classList.remove("drop-hover");
        this.hoverSq = over;
        if (over) this.squares[over]?.classList.add("drop-hover");
      }
    }
  }

  // GPU-composited follow loop: light lerp smooths out pointer-event jitter
  // without adding perceptible lag.
  startGhostLoop() {
    const step = () => {
      if (!this.ghost) return;
      this.dragPos.x += (this.dragTarget.x - this.dragPos.x) * 0.6;
      this.dragPos.y += (this.dragTarget.y - this.dragPos.y) * 0.6;
      this.ghost.style.transform =
        `translate3d(${this.dragPos.x}px, ${this.dragPos.y}px, 0) scale(${this.ghostScale})`;
      this._ghostRaf = requestAnimationFrame(step);
    };
    this._ghostRaf = requestAnimationFrame(step);
  }

  sqFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    const sq = el && el.closest(".sq");
    return sq ? sq.dataset.sq : null;
  }

  onUp(e) {
    // finish arrow drawing
    if (this.arrowStart) {
      const end = this.sqFromEvent(e);
      if (end && end !== this.arrowStart) this.addArrow(this.arrowStart, end, "user");
      this.arrowStart = null;
      return;
    }
    if (!this.dragStart || e.pointerId !== this.dragStart.id) return;
    const from = this.dragStart.sq;
    const lift = this.ghost && this.touchDrag ? this.ghostSize * 0.55 : 0;
    const dropped = this.sqFromPoint(e.clientX, e.clientY - lift);
    const wasDrag = !!this.ghost;
    this.endDrag();
    if (wasDrag && dropped && dropped !== from) {
      const legal = this.game.moves({ square: from, verbose: true })
        .some((m) => m.to === dropped);
      if (legal) this.tryMove(from, dropped, true);
      else { this.clearSelection(); this.render(); }
    }
  }

  endDrag() {
    if (this._ghostRaf) { cancelAnimationFrame(this._ghostRaf); this._ghostRaf = null; }
    if (this.ghost) { this.ghost.remove(); this.ghost = null; }
    if (this.hoverSq) { this.squares[this.hoverSq]?.classList.remove("drop-hover"); this.hoverSq = null; }
    document.querySelectorAll(".ghosted").forEach((el) => el.classList.remove("ghosted"));
    this.dragStart = null;
  }

  tryMove(from, to, wasDrag = false) {
    const moves = this.game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
    if (moves.length === 0) return;
    this.clearSelection();
    this.pendingDrag = wasDrag; // dragged moves land instantly; tapped moves slide
    if (moves[0].promotion) this.askPromotion(from, to, this.game.get(from).color);
    else this.onUserMove(from, to, undefined);
  }

  askPromotion(from, to, color) {
    const overlay = document.createElement("div");
    overlay.className = "promo-overlay";
    const row = document.createElement("div");
    row.className = "promo-row";
    for (const t of ["q", "r", "b", "n"]) {
      const btn = document.createElement("button");
      btn.className = "promo-choice";
      const img = document.createElement("img");
      img.src = `assets/pieces/${t}${color === "w" ? "l" : "d"}.svg`;
      btn.appendChild(img);
      btn.addEventListener("click", () => {
        overlay.remove();
        this.onUserMove(from, to, t);
      });
      row.appendChild(btn);
    }
    overlay.appendChild(row);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
    this.host.appendChild(overlay);
  }

  // Update all decorations after a position change.
  // opts: {captured: bool, animate: bool} — animate slides the piece (skipped for drags).
  sync(lastFrom, lastTo, opts = {}) {
    const wasDrag = this.pendingDrag;
    const finish = () => {
      if (lastFrom !== undefined) this.setLastMove(lastFrom, lastTo);
      this.setCheck();
      this.clearSelection();
      this.clearArrows("hint");
      this.clearArrows("best");
      this.render();
      if (opts.captured && lastTo) this.burst(lastTo);
      if (wasDrag && lastTo) {
        const landed = this.squares[lastTo]?.querySelector(".piece");
        if (landed) {
          landed.classList.add("piece-land");
          setTimeout(() => landed.classList.remove("piece-land"), 260);
        }
      }
    };
    const wantAnim = opts.animate !== false && !this.pendingDrag && lastFrom && lastTo;
    this.pendingDrag = false;
    if (wantAnim) this.animateMove(lastFrom, lastTo, finish);
    else finish();
  }
}
