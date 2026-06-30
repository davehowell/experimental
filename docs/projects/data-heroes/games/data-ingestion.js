// Data Ingestion = Pac-Man, on GameShell.
// Gobble raw-data records from across the data lake while dodging corrupt-data ghosts. A validated
// batch (power pellet) lets you purge corrupt records for points. Ingest every record to win.
(() => {
  const COLS = 15, ROWS = 9;
  const GREEN = MX.bright, CYAN = [90, 220, 255], GOLD = [255, 210, 90];
  const GHOSTS = [
    { name: 'DUPE', col: [255, 80, 80] },
    { name: 'CORRUPT', col: [255, 150, 40] },
    { name: 'MALFORMED', col: [200, 90, 255] },
  ];

  let G;

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  class Mover {
    constructor(gc, gr, speed) { this.gc = gc; this.gr = gr; this.speed = speed; this.dir = [0, 0]; const [x, y] = G.center(gc, gr); this.x = x; this.y = y; }
    centered() { const [cx, cy] = G.center(this.gc, this.gr); return abs(this.x - cx) < this.speed && abs(this.y - cy) < this.speed; }
    snap() { const [cx, cy] = G.center(this.gc, this.gr); this.x = cx; this.y = cy; }
    canStep(d) { const nc = this.gc + d[0], nr = this.gr + d[1]; return G.isPath(nc, nr); }
    advance() { // call when centered; moves grid cell in current dir if possible
      if (this.canStep(this.dir)) { this.gc += this.dir[0]; this.gr += this.dir[1]; }
      else this.snap();
    }
    glide() { const [cx, cy] = G.center(this.gc, this.gr); this.x += constrain(cx - this.x, -this.speed, this.speed); this.y += constrain(cy - this.y, -this.speed, this.speed); }
  }

  class DataIngestion {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.layout(); this.reset(); }
    resize() { this.layout(); this.placePixels(); }
    layout() {
      this.cell = Math.floor(Math.min((height - 170) / ROWS, (width - 120) / COLS, 48));
      this.mw = this.cell * COLS; this.mh = this.cell * ROWS;
      this.ox = Math.round((width - this.mw) / 2); this.oy = Math.round((height - this.mh) / 2 + 20);
    }
    center(gc, gr) { return [this.ox + gc * this.cell + this.cell / 2, this.oy + gr * this.cell + this.cell / 2]; }
    isPath(gc, gr) { return gc >= 0 && gc < COLS && gr >= 0 && gr < ROWS && this.grid[gr][gc] !== 1; }
    reset() {
      G = this;
      // lattice maze: border walls + single-cell pillars at even/even interior cells (always connected)
      this.grid = []; this.dots = []; this.totalDots = 0;
      for (let r = 0; r < ROWS; r++) {
        this.grid[r] = [];
        for (let c = 0; c < COLS; c++) {
          const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
          const pillar = r % 2 === 0 && c % 2 === 0;
          this.grid[r][c] = (border || pillar) ? 1 : 0;
        }
      }
      // dots on alternating path cells (keeps a quick demo length); power pellets near corners
      for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if (this.grid[r][c] === 0 && (r + c) % 2 === 0) { this.dots.push({ c, r, eaten: false, power: false }); }
      const corners = [[1, 1], [COLS - 2, 1], [1, ROWS - 2], [COLS - 2, ROWS - 2]];
      for (const [c, r] of corners) { const d = this.dots.find(d => d.c === c && d.r === r); if (d) d.power = true; }
      this.totalDots = this.dots.length;
      this.placePixels();
      this.hero = new Mover((COLS - 1) / 2 | 0, (ROWS - 1) / 2 | 0, max(2.5, this.cell / 12)); this.hero.want = [0, 0]; this.hero.face = 1;
      this.ghosts = GHOSTS.map((g, i) => { const m = new Mover(1 + i * 2, 1, max(2, this.cell / 14)); m.col = g.col; m.name = g.name; m.dir = random(DIRS); return m; });
      this.power = 0; this._won = false;
    }
    placePixels() { /* pixels derived from grid each frame via center(); nothing cached */ }
    handleKey(kc, k) {
      if (kc === LEFT_ARROW) this.hero.want = [-1, 0];
      else if (kc === RIGHT_ARROW) this.hero.want = [1, 0];
      else if (kc === UP_ARROW) this.hero.want = [0, -1];
      else if (kc === DOWN_ARROW) this.hero.want = [0, 1];
    }
    update() {
      if (this._won) return;
      const h = this.hero;
      if (h.centered()) {
        h.snap();
        if (h.want && h.canStep(h.want)) h.dir = h.want;
        if (h.dir[0]) h.face = h.dir[0] > 0 ? 1 : -1;
        h.advance();
      }
      h.glide();
      // eat
      if (h.centered()) {
        const d = this.dots.find(d => !d.eaten && d.c === h.gc && d.r === h.gr);
        if (d) { d.eaten = true; this.shell.addScore(d.power ? 50 : 10); if (d.power) this.power = 360; }
      }
      if (this.dots.every(d => d.eaten)) this._won = true;
      if (this.power > 0) this.power--;

      for (const g of this.ghosts) {
        const frightened = this.power > 0;
        g.speed = frightened ? max(1.5, this.cell / 18) : max(2, this.cell / 14);
        if (g.centered()) {
          g.snap();
          const opts = DIRS.filter(d => g.canStep(d) && !(d[0] === -g.dir[0] && d[1] === -g.dir[1]));
          const choices = opts.length ? opts : DIRS.filter(d => g.canStep(d));
          if (choices.length) {
            // bias: chase hero (or flee when frightened)
            choices.sort((a, b) => score(a) - score(b));
            function score(d) { const nc = g.gc + d[0], nr = g.gr + d[1]; const dd = dist(nc, nr, h.gc, h.gr); return frightened ? -dd : dd; }
            g.dir = random() < 0.7 ? choices[0] : random(choices);
          }
          g.advance();
        }
        g.glide();
        // collision
        if (dist(g.x, g.y, h.x, h.y) < this.cell * 0.6) {
          if (frightened) { this.shell.addScore(150); const [sx, sy] = this.center(g.gc, g.gr); g.gc = 9; g.gr = 1; g.snap(); }
          else { this.shell.loseLife(); this.resetPositions(); break; }
        }
      }
    }
    resetPositions() {
      const h = this.hero; h.gc = (COLS - 1) / 2 | 0; h.gr = (ROWS - 1) / 2 | 0; h.dir = [0, 0]; h.want = [0, 0]; h.snap();
      this.ghosts.forEach((g, i) => { g.gc = 1 + i * 2; g.gr = 1; g.dir = random(DIRS); g.snap(); });
      this.power = 0;
    }
    render() {
      const cell = this.cell;
      // walls
      push();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (this.grid[r][c] === 1) {
        const x = this.ox + c * cell, y = this.oy + r * cell;
        noFill(); stroke(0, 120, 40); strokeWeight(2);
        drawingContext.shadowBlur = 6; drawingContext.shadowColor = 'rgb(0,180,60)';
        rect(x + cell * 0.18, y + cell * 0.18, cell * 0.64, cell * 0.64, 4);
      }
      pop();
      // dots
      push();
      for (const d of this.dots) {
        if (d.eaten) continue;
        const [x, y] = this.center(d.c, d.r);
        if (d.power) { const p = 0.6 + 0.4 * sin(frameCount * 0.15); noStroke(); fill(CYAN[0], CYAN[1], CYAN[2], 255 * p); circle(x, y, cell * 0.42); }
        else { noStroke(); fill(GREEN[0], GREEN[1], GREEN[2]); circle(x, y, cell * 0.14); }
      }
      pop();
      // ghosts
      for (const g of this.ghosts) this.drawGhost(g);
      // hero
      push(); translate(this.hero.x, this.hero.y);
      scale(this.shell.faceScale(this.hero.face || 1), 1);
      const img = this.shell.currentHero && this.shell.currentHero.img;
      if (img && img.width) { imageMode(CENTER); const s = (cell * 1.4) / img.height; image(img, 0, 0, img.width * s, img.height * s); }
      else { fill(GOLD[0], GOLD[1], GOLD[2]); noStroke(); circle(0, 0, cell * 0.7); }
      pop();
      // remaining counter
      push(); textAlign(CENTER, TOP); noStroke(); fill(this.shell.accent[0], this.shell.accent[1], this.shell.accent[2]); textSize(16);
      const left = this.dots.filter(d => !d.eaten).length;
      text('RECORDS LEFT: ' + left, width / 2, this.oy - 4); pop();
    }
    drawGhost(g) {
      const cell = this.cell, frightened = this.power > 0, r = cell * 0.34;
      push(); translate(g.x, g.y);
      const col = frightened ? [80, 120, 255] : g.col;
      drawingContext.shadowBlur = 12; drawingContext.shadowColor = `rgb(${col[0]},${col[1]},${col[2]})`;
      fill(col[0], col[1], col[2], frightened ? 180 : 220); noStroke();
      arc(0, 0, r * 2, r * 2, PI, TWO_PI); rect(-r, 0, r * 2, r);
      // feet
      fill(0); for (let i = -1; i <= 1; i++) circle(i * r * 0.7, r, r * 0.4);
      // eyes
      fill(255); circle(-r * 0.4, -r * 0.1, r * 0.5); circle(r * 0.4, -r * 0.1, r * 0.5);
      fill(0, 0, 120); circle(-r * 0.4, -r * 0.1, r * 0.22); circle(r * 0.4, -r * 0.1, r * 0.22);
      drawingContext.shadowBlur = 0; noStroke(); fill(col[0], col[1], col[2]); textAlign(CENTER, TOP); textSize(10); text(g.name, 0, r + 4);
      pop();
    }
    handleClick() {}
    get won() { return this._won; }
    get lost() { return false; }
  }

  window.DataHeroesGame = DataIngestion;
})();
