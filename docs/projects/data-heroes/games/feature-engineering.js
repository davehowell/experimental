// Feature Engineering = Tetris, on GameShell.
// Stack data-engineering blocks into clean feature rows. The hero drags pieces with a tractor beam.
// Historical fixes baked in: the hero sprite is never rotated through 360° (it stays upright and is
// horizontally FLIPPED to face the piece, with a small clamped tilt); the tractor beam is pure
// geometry (emitter → piece centroid) and its intensity decays when idle.
(() => {
  const COLS = 10, ROWS = 20, TARGET_LINES = 8;
  const TYPES = 'IOTSZJL';
  const SHAPES = {
    I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]],
  };
  const COLORS = {
    I: [0, 230, 255], O: [255, 225, 70], T: [200, 90, 255], S: [90, 255, 130],
    Z: [255, 90, 200], J: [90, 150, 255], L: [255, 165, 60],
  };
  // Feature-engineering / aggregation terms — one picked at random per piece.
  const TERMS = ['COALESCE', 'COUNT', 'SUM', 'ONE-HOT', 'NORMALIZE', 'SCALE', 'BUCKET', 'LAG',
    'ROLLING', 'AVG', 'EMBED', 'ENCODE', 'IMPUTE', 'BIN', 'DEDUPE', 'PIVOT', 'RANK', 'MIN-MAX'];
  // Hold-to-repeat tuning (ms): DAS = delay before auto-repeat, REPEAT = repeat cadence, SOFT = soft-drop cadence.
  const DAS_DELAY = 150, DAS_REPEAT = 45, SOFT_MS = 28;

  let G;

  class Piece {
    constructor(type) {
      this.type = type; this.shape = SHAPES[type].map(r => r.slice());
      this.col = COLORS[type]; this.word = random(TERMS);
      this.x = floor(COLS / 2) - floor(this.shape[0].length / 2); this.y = 0; this.rot = 0;
    }
    rotated() {
      const s = this.shape, out = [];
      for (let c = 0; c < s[0].length; c++) { out.push([]); for (let r = s.length - 1; r >= 0; r--) out[c].push(s[r][c]); }
      return out;
    }
    cells(shape) {
      shape = shape || this.shape; const out = [];
      for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) if (shape[r][c]) out.push([this.x + c, this.y + r]);
      return out;
    }
  }

  class FeatureEngineering {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.layout(); this.reset(); }
    resize() { this.layout(); }
    layout() {
      this.cell = Math.floor(Math.min((height - 140) / ROWS, (width * 0.42) / COLS, 34));
      this.bw = this.cell * COLS; this.bh = this.cell * ROWS;
      this.bx = Math.round(width / 2 - this.bw / 2 - 90);
      this.by = Math.round((height - this.bh) / 2 + 16);
      this.heroX = this.bx + this.bw + 150; this.heroY = this.by + this.bh * 0.5;
    }
    reset() {
      G = this;
      this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
      this.piece = this.spawn(); this.next = this.spawn();
      this.lines = 0; this.level = 1; this.interval = 800; this.lastFall = millis();
      this.beam = 0; this._won = false; this._lost = false;
      this.dasDir = 0; this.dasNext = 0; this.softNext = 0;
    }
    spawn() { return new Piece(TYPES[floor(random(TYPES.length))]); }
    move(dx, dy) {
      if (this.validAt(this.piece.shape, this.piece.x + dx, this.piece.y + dy)) { this.piece.x += dx; this.piece.y += dy; return true; }
      return false;
    }
    validAt(shape, nx, ny) {
      for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const x = nx + c, y = ny + r;
        if (x < 0 || x >= COLS || y >= ROWS) return false;
        if (y >= 0 && this.grid[y][x]) return false;
      }
      return true;
    }
    rotate() {
      const rs = this.piece.rotated();
      for (const kick of [0, 1, -1, 2, -2]) {
        if (this.validAt(rs, this.piece.x + kick, this.piece.y)) { this.piece.shape = rs; this.piece.x += kick; this.piece.rot = (this.piece.rot + 90) % 360; return; }
      }
    }
    lock() {
      for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++) {
        if (!this.piece.shape[r][c]) continue;
        const x = this.piece.x + c, y = this.piece.y + r;
        if (y < 0) { this._lost = true; return; }
        this.grid[y][x] = this.piece.col;
      }
      this.clearLines();
      this.piece = this.next; this.next = this.spawn();
      this.piece.x = floor(COLS / 2) - floor(this.piece.shape[0].length / 2); this.piece.y = 0;
      if (!this.validAt(this.piece.shape, this.piece.x, this.piece.y)) this._lost = true;
      this.lastFall = millis();
    }
    clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (this.grid[r].every(v => v !== 0)) { this.grid.splice(r, 1); this.grid.unshift(Array(COLS).fill(0)); cleared++; r++; }
      }
      if (cleared) {
        this.lines += cleared;
        this.shell.addScore([0, 100, 300, 500, 800][cleared] * this.level);
        this.level = floor(this.lines / 4) + 1;
        this.interval = max(120, 800 - (this.level - 1) * 70);
        if (this.lines >= TARGET_LINES) this._won = true;
      }
    }
    // Rotate / hard-drop are discrete (one per press). Left/right/down auto-repeat while held
    // (handled in update via keyIsDown), so a key press here only needs the one-shot actions.
    handleKey(kc, k) {
      if (kc === UP_ARROW) { this.rotate(); this.beam = 1; }
      else if (k === ' ' || kc === 32) {
        let n = 0; while (this.move(0, 1)) n++; this.shell.addScore(n * 2 * this.level); this.beam = 1; this.lock();
      }
    }
    update() {
      if (this._won || this._lost) return;
      this.beam = max(0, this.beam - 0.04);
      const now = millis();
      // horizontal auto-repeat (DAS): immediate move on press, then repeat after a short delay while held
      const dir = (keyIsDown(LEFT_ARROW) ? -1 : 0) + (keyIsDown(RIGHT_ARROW) ? 1 : 0);
      if (dir === 0) this.dasDir = 0;
      else if (dir !== this.dasDir) { this.dasDir = dir; if (this.move(dir, 0)) this.beam = 1; this.dasNext = now + DAS_DELAY; }
      else if (now >= this.dasNext) { if (this.move(dir, 0)) this.beam = 1; this.dasNext = now + DAS_REPEAT; }
      // soft drop: hold ↓ to descend fast (skips the piece down)
      if (keyIsDown(DOWN_ARROW) && now >= this.softNext) {
        if (this.move(0, 1)) { this.shell.addScore(this.level); this.lastFall = now; }
        this.softNext = now + SOFT_MS; this.beam = 1;
      }
      // gravity
      if (now - this.lastFall > this.interval) { if (!this.move(0, 1)) this.lock(); this.lastFall = now; }
    }
    // --- rendering ---
    cellScreen(cx, cy) { return [this.bx + cx * this.cell + this.cell / 2, this.by + cy * this.cell + this.cell / 2]; }
    drawCell(cx, cy, col, ghost) {
      const x = this.bx + cx * this.cell, y = this.by + cy * this.cell;
      push();
      if (ghost) { noFill(); stroke(col[0], col[1], col[2], 70); strokeWeight(1); }
      else {
        fill(col[0], col[1], col[2], 38); stroke(col[0], col[1], col[2]); strokeWeight(2);
        drawingContext.shadowBlur = 8; drawingContext.shadowColor = `rgb(${col[0]},${col[1]},${col[2]})`;
      }
      rect(x + 1, y + 1, this.cell - 2, this.cell - 2, 3);
      pop();
    }
    pieceCentroid() {
      const cs = this.piece.cells(); let sx = 0, sy = 0;
      for (const [c, r] of cs) { const [x, y] = this.cellScreen(c, r); sx += x; sy += y; }
      return [sx / cs.length, sy / cs.length];
    }
    drawWord() {
      const cs = this.piece.cells();
      let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
      for (const [c, r] of cs) { minC = min(minC, c); maxC = max(maxC, c); minR = min(minR, r); maxR = max(maxR, r); }
      const wC = maxC - minC + 1, hC = maxR - minR + 1, vertical = hC > wC;
      const fitPx = (vertical ? hC : wC) * this.cell * 0.86;
      const [pcx, pcy] = this.pieceCentroid();
      push();
      textAlign(CENTER, CENTER); textStyle(BOLD);
      textSize(20); const tw = max(1, textWidth(this.piece.word));
      const size = constrain(20 * fitPx / tw, 7, this.cell * 0.6);
      translate(pcx, pcy); if (vertical) rotate(-HALF_PI);
      noStroke(); fill(this.piece.col[0], this.piece.col[1], this.piece.col[2]);
      drawingContext.shadowBlur = 6; drawingContext.shadowColor = `rgb(${this.piece.col[0]},${this.piece.col[1]},${this.piece.col[2]})`;
      textSize(size); text(this.piece.word, 0, 0);
      pop();
    }
    render() {
      // board frame
      push(); noFill(); stroke(MX.dark[0], MX.dark[1], MX.dark[2]); strokeWeight(2);
      rect(this.bx - 2, this.by - 2, this.bw + 4, this.bh + 4, 4);
      // faint grid
      stroke(0, 60, 20, 60); strokeWeight(1);
      for (let c = 1; c < COLS; c++) line(this.bx + c * this.cell, this.by, this.bx + c * this.cell, this.by + this.bh);
      for (let r = 1; r < ROWS; r++) line(this.bx, this.by + r * this.cell, this.bx + this.bw, this.by + r * this.cell);
      pop();
      // locked cells
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c]) this.drawCell(c, r, this.grid[r][c]);
      // ghost
      let gy = this.piece.y; while (this.validAt(this.piece.shape, this.piece.x, gy + 1)) gy++;
      for (const [c, r] of this.piece.cells()) this.drawCell(c, r - this.piece.y + gy, this.piece.col, true);
      // active piece + word (auto-sized to fit the piece, rotated when the piece is taller than wide)
      for (const [c, r] of this.piece.cells()) if (r >= 0) this.drawCell(c, r, this.piece.col);
      this.drawWord();
      // side panel: NEXT + lines
      const px = this.bx + this.bw + 40, py = this.by + 10;
      push(); textAlign(CENTER, TOP); fill(MX.medium[0], MX.medium[1], MX.medium[2]); textSize(16); text('NEXT', px + 50, py);
      noFill(); stroke(MX.dark[0], MX.dark[1], MX.dark[2]); rect(px, py + 24, 100, 100, 4); pop();
      const ncell = 22;
      for (let r = 0; r < this.next.shape.length; r++) for (let c = 0; c < this.next.shape[r].length; c++) if (this.next.shape[r][c]) {
        push(); fill(this.next.col[0], this.next.col[1], this.next.col[2], 50); stroke(this.next.col[0], this.next.col[1], this.next.col[2]); strokeWeight(2);
        rect(px + 28 + c * ncell, py + 44 + r * ncell, ncell - 2, ncell - 2, 2); pop();
      }
      push(); textAlign(CENTER, TOP); noStroke(); fill(this.accent());
      textSize(20); text('LINES', px + 50, py + 150); textSize(30); text(this.lines + ' / ' + TARGET_LINES, px + 50, py + 176);
      textSize(16); fill(MX.medium[0], MX.medium[1], MX.medium[2]); text('LEVEL ' + this.level, px + 50, py + 220); pop();
      // hero + tractor beam (aimed at the active piece centroid)
      const [pcx, pcy] = this.pieceCentroid();
      this.drawHero(pcx, pcy);
    }
    accent() { const a = this.shell.accent; return color(a[0], a[1], a[2]); }
    drawHero(pcx, pcy) {
      const ex = this.heroX - 26, ey = this.heroY - 12;   // beam emitter (hero's hand, board side)
      if (this.beam > 0.02) {
        push();
        for (let i = 0; i < 4; i++) {
          const a = this.beam * 60 * (1 - i * 0.2);
          stroke(this.piece.col[0], this.piece.col[1], this.piece.col[2], a); strokeWeight(14 - i * 3);
          line(ex, ey, pcx, pcy);
        }
        for (let i = 0; i < 6; i++) {
          const t = ((frameCount + i * 9) % 60) / 60;
          const x = lerp(ex, pcx, t), y = lerp(ey, pcy, t);
          noStroke(); fill(this.piece.col[0], this.piece.col[1], this.piece.col[2], this.beam * 200);
          circle(x + random(-4, 4), y + random(-4, 4), random(3, 6));
        }
        pop();
      }
      push();
      translate(this.heroX, this.heroY);
      // face the piece by MIRRORING (never rotate past vertical); small clamped tilt only
      let tilt = atan2(pcy - this.heroY, Math.max(40, Math.abs(pcx - this.heroX)));
      tilt = constrain(tilt, -PI / 8, PI / 8);
      scale(this.shell.faceScale(-1), 1);   // face left toward the board, per hero's base facing
      rotate(-tilt);
      const h = this.shell.currentHero;
      if (h && h.img && h.img.width) { imageMode(CENTER); const s = 120 / h.img.height; image(h.img, 0, 0, h.img.width * s, h.img.height * s); }
      else { fill(MX.bright[0], MX.bright[1], MX.bright[2]); noStroke(); circle(0, 0, 50); }
      pop();
    }
    handleClick() {}
    get won() { return this._won; }
    get lost() { return this._lost; }
  }

  window.DataHeroesGame = FeatureEngineering;
})();
