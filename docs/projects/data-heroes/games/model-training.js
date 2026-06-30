// Model Training = Space Invaders, on GameShell.
// Shoot down waves of training batches/epochs to drive loss down. The Hyperparameter Optimizer orb,
// when shot, sweeps the whole formation. Clear the waves and the COMPLEX MODEL boss converges → win.
(() => {
  const CYAN = [0, 230, 255], MAGENTA = [255, 90, 220], YELLOW = [255, 225, 70];
  const GOLD = [255, 210, 90], RED = [255, 80, 80], GREEN = MX.bright;
  const FIRE_MS = 260, OPTIMIZER_AT = 150;

  let G;

  class Alien {
    constructor(x, y, label, col, pts) { this.x = x; this.y = y; this.w = 56; this.h = 34; this.label = label; this.col = col; this.pts = pts; this.dead = false; this.ph = random(TWO_PI); }
    render() {
      push(); translate(this.x, this.y);
      const p = 0.7 + 0.3 * sin(frameCount * 0.08 + this.ph);
      drawingContext.shadowBlur = 16 * p; drawingContext.shadowColor = `rgb(${this.col[0]},${this.col[1]},${this.col[2]})`;
      noFill(); stroke(this.col[0], this.col[1], this.col[2]); strokeWeight(2.5);
      rect(-this.w / 2, -this.h / 2, this.w, this.h, 5);
      // little invader feet
      line(-this.w / 2, this.h / 2, -this.w / 2 - 6, this.h / 2 + 7);
      line(this.w / 2, this.h / 2, this.w / 2 + 6, this.h / 2 + 7);
      drawingContext.shadowBlur = 0; noStroke(); fill(this.col[0], this.col[1], this.col[2]); textAlign(CENTER, CENTER); textSize(11);
      text(this.label, 0, 0); pop();
    }
    hit(x, y) { return x > this.x - this.w / 2 && x < this.x + this.w / 2 && y > this.y - this.h / 2 && y < this.y + this.h / 2; }
  }

  class Boss extends Alien {
    constructor(x, y) { super(x, y, 'COMPLEX MODEL', RED, 600); this.w = 150; this.h = 64; this.hp = 8; this.max = 8; }
    render() {
      push(); translate(this.x, this.y);
      const p = 0.6 + 0.4 * sin(frameCount * 0.1);
      drawingContext.shadowBlur = 30 * p; drawingContext.shadowColor = `rgb(${RED[0]},80,80)`;
      noFill(); stroke(RED[0], RED[1], RED[2]); strokeWeight(3); rect(-this.w / 2, -this.h / 2, this.w, this.h, 8);
      stroke(255, 140, 60, 150); rect(-this.w / 2 + 8, -this.h / 2 + 8, this.w - 16, this.h - 16, 6);
      drawingContext.shadowBlur = 0; noStroke(); fill(RED[0], RED[1], RED[2]); textAlign(CENTER, CENTER); textSize(15); text(this.label, 0, 0);
      // hp bar
      fill(0, 0, 0, 160); rect(-this.w / 2, -this.h / 2 - 14, this.w, 7);
      fill(GREEN[0], GREEN[1], GREEN[2]); rect(-this.w / 2, -this.h / 2 - 14, this.w * (this.hp / this.max), 7);
      pop();
    }
  }

  class Shot { constructor(x, y, vy, col) { this.x = x; this.y = y; this.vy = vy; this.col = col; } update() { this.y += this.vy; } render() { push(); stroke(this.col[0], this.col[1], this.col[2]); strokeWeight(3); drawingContext.shadowBlur = 8; drawingContext.shadowColor = `rgb(${this.col[0]},${this.col[1]},${this.col[2]})`; line(this.x, this.y, this.x, this.y - 14 * Math.sign(this.vy || 1)); pop(); } }

  class Optimizer {
    constructor() { this.x = random(width * 0.2, width * 0.8); this.y = -30; this.r = 22; this.dead = false; }
    update() { this.y += 1.0; if (this.y > height + 40) this.dead = true; }
    render() {
      push(); translate(this.x, this.y); rotate(frameCount * 0.05);
      const p = 0.7 + 0.3 * sin(frameCount * 0.13);
      drawingContext.shadowBlur = 28 * p; drawingContext.shadowColor = `rgb(${GOLD[0]},${GOLD[1]},${GOLD[2]})`;
      noFill(); stroke(GOLD[0], GOLD[1], GOLD[2]); strokeWeight(3); circle(0, 0, this.r * 1.6);
      for (let i = 0; i < 3; i++) { const a = i / 3 * TWO_PI; const x = cos(a) * this.r, y = sin(a) * this.r; circle(x, y, 8); line(0, 0, x, y); }
      circle(0, 0, 10); pop();
      push(); noStroke(); fill(GOLD[0], GOLD[1], GOLD[2]); textAlign(CENTER, TOP); textSize(12); text('HYPERPARAM OPT', this.x, this.y + this.r + 6); pop();
    }
    hit(x, y) { return dist(x, y, this.x, this.y) < this.r + 6; }
  }

  class ModelTraining {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.reset(); }
    reset() {
      G = this;
      this.px = width / 2; this.py = height - 70; this.pw = 70;
      this.bullets = []; this.bombs = []; this.fx = [];
      this.aliens = []; this.boss = null; this.bossSpawned = false;
      this.optimizer = null; this.optimizerDone = false; this.sweep = 0;
      this.lastFire = 0; this._won = false;
      // formation: 2 rows
      const cols = 4, x0 = width / 2 - (cols - 1) * 90 / 2, y0 = 120;
      const rows = [
        { label: 'BATCH', col: CYAN, pts: 50 },
        { label: 'EPOCH', col: MAGENTA, pts: 80 },
      ];
      rows.forEach((rw, r) => { for (let c = 0; c < cols; c++) this.aliens.push(new Alien(x0 + c * 90, y0 + r * 70, rw.label + '_' + (c + 1), rw.col, rw.pts)); });
      this.dir = 1; this.speed = 0.7;
    }
    boom(x, y, col, n) { for (let i = 0; i < (n || 8); i++) this.fx.push({ x, y, vx: random(-3, 3), vy: random(-3, 3), life: 1, col: col || YELLOW }); }
    handleKey(kc, k) { /* movement + fire handled via keyIsDown in update */ }
    update() {
      if (this._won) return;
      // movement
      if (keyIsDown(LEFT_ARROW)) this.px = max(this.pw / 2, this.px - 7);
      if (keyIsDown(RIGHT_ARROW)) this.px = min(width - this.pw / 2, this.px + 7);
      if (keyIsDown(32) && millis() - this.lastFire > FIRE_MS) { this.bullets.push(new Shot(this.px, this.py - 30, -11, GREEN)); this.lastFire = millis(); }

      // formation move
      if (this.aliens.length) {
        let edge = false;
        for (const a of this.aliens) { a.x += this.dir * (this.speed + (8 - this.aliens.length) * 0.12); if (a.x > width - 50 || a.x < 50) edge = true; }
        if (edge) { this.dir *= -1; this.aliens.forEach(a => a.y += 24); }
        // random bombs
        if (random() < 0.02 && this.aliens.length) { const a = random(this.aliens); this.bombs.push(new Shot(a.x, a.y + 20, 6, RED)); }
        // reached bottom?
        for (const a of this.aliens) if (a.y > this.py - 30) { this.shell.loseLife(); a.dead = true; this.boom(a.x, a.y, RED); }
        this.aliens = this.aliens.filter(a => !a.dead);
      }

      // boss spawn
      if (!this.aliens.length && !this.bossSpawned) { this.boss = new Boss(width / 2, 140); this.bossSpawned = true; }
      if (this.boss) {
        this.boss.x += this.dir * 1.6; if (this.boss.x > width - 90 || this.boss.x < 90) this.dir *= -1;
        if (random() < 0.04) this.bombs.push(new Shot(this.boss.x + random(-50, 50), this.boss.y + 30, 6.5, RED));
      }

      // optimizer
      if (!this.optimizer && !this.optimizerDone && this.shell.score >= OPTIMIZER_AT && this.aliens.length) this.optimizer = new Optimizer();
      if (this.optimizer) { this.optimizer.update(); if (this.optimizer.dead) { this.optimizer = null; this.optimizerDone = true; } }
      if (this.sweep > 0) this.sweep -= 0.05;

      // bullets
      this.bullets.forEach(b => b.update());
      this.bombs.forEach(b => b.update());
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i]; let hitSomething = false;
        if (this.optimizer && this.optimizer.hit(b.x, b.y)) {
          this.optimizer = null; this.optimizerDone = true; this.sweep = 1;
          this.aliens.forEach(a => { this.shell.addScore(a.pts); this.boom(a.x, a.y, a.col, 10); }); this.aliens = [];
          if (this.boss) this.boss.hp -= 4;
          hitSomething = true;
        }
        for (let j = this.aliens.length - 1; j >= 0 && !hitSomething; j--) {
          if (this.aliens[j].hit(b.x, b.y)) { this.shell.addScore(this.aliens[j].pts); this.boom(this.aliens[j].x, this.aliens[j].y, this.aliens[j].col); this.aliens.splice(j, 1); hitSomething = true; }
        }
        if (!hitSomething && this.boss && this.boss.hit(b.x, b.y)) { this.boss.hp--; this.boom(b.x, b.y, RED, 4); if (this.boss.hp <= 0) { this.boom(this.boss.x, this.boss.y, RED, 40); this._won = true; this.boss = null; } hitSomething = true; }
        if (hitSomething || b.y < -20) this.bullets.splice(i, 1);
      }
      // bombs vs player
      for (let i = this.bombs.length - 1; i >= 0; i--) {
        const b = this.bombs[i];
        if (b.y > this.py - 24 && abs(b.x - this.px) < this.pw / 2) { this.shell.loseLife(); this.boom(this.px, this.py, RED, 14); this.bombs.splice(i, 1); }
        else if (b.y > height + 20) this.bombs.splice(i, 1);
      }
      // fx
      for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.x += f.vx; f.y += f.vy; f.life -= 0.04; if (f.life <= 0) this.fx.splice(i, 1); }
    }
    render() {
      // loss meter hint line
      push(); stroke(GREEN[0], GREEN[1], GREEN[2], 60); strokeWeight(1); line(0, this.py + 26, width, this.py + 26); pop();
      this.aliens.forEach(a => a.render());
      if (this.boss) this.boss.render();
      if (this.optimizer) this.optimizer.render();
      this.bullets.forEach(b => b.render());
      this.bombs.forEach(b => b.render());
      for (const f of this.fx) { push(); noStroke(); fill(f.col[0], f.col[1], f.col[2], f.life * 255); circle(f.x, f.y, 5); pop(); }
      if (this.sweep > 0) { push(); noStroke(); fill(GOLD[0], GOLD[1], GOLD[2], this.sweep * 120); rect(0, 110, width, 220); pop(); }
      // player ship (hero)
      push(); translate(this.px, this.py);
      stroke(GREEN[0], GREEN[1], GREEN[2]); strokeWeight(2); line(0, -34, 0, -46);
      const h = this.shell.currentHero;
      if (h && h.img && h.img.width) { imageMode(CENTER); const s = 70 / h.img.height; image(h.img, 0, 0, h.img.width * s, h.img.height * s); }
      else { fill(GREEN[0], GREEN[1], GREEN[2]); noStroke(); triangle(-26, 20, 26, 20, 0, -26); }
      pop();
    }
    handleClick() {}
    get won() { return this._won; }
    get lost() { return false; }
  }

  window.DataHeroesGame = ModelTraining;
})();
