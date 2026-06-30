// Data Cleaning = Asteroids, ported onto GameShell (RGB; matrix rain comes from the shell).
// Blast corrupted data (asteroids). At 500 pts a "Gemini" powerup spawns; firing it unleashes
// the Database Cleaner that wipes every record on screen → victory.
(() => {
  const TURN = 0.07, THRUST = 0.16, FRICTION = 0.99, MAX_SPEED = 6.5;
  const BULLET_SPEED = 9, FIRE_MS = 120, BULLET_LIFE = 80;
  const AST_NUM = 8, AST_SIZE = 70, AST_MIN = 22, AST_SPEED = 1.2;
  const INVINCIBLE = 120, POWERUP_AT = 500;
  const SQL = ['SELECT', 'DELETE', 'WHERE', 'UPDATE', 'CLEAN', 'CAST', 'TRIM', 'FIX'];
  const BITS = ['0', '1', ';', '{}', '=>', 'if', '0x', '#!', '*', '&', 'NaN', 'NULL'];
  const GREEN = MX.bright, DGREEN = [0, 170, 50], CYAN = [80, 220, 255], GOLD = [255, 215, 90];

  let G; // active game (module singleton — one game per page)

  class Particle {
    constructor(x, y, col) {
      this.pos = createVector(x, y);
      this.vel = p5.Vector.random2D().mult(random(1, 5));
      this.life = 1; this.col = col || GREEN;
      this.char = random(BITS); this.size = random(10, 18);
    }
    update() { this.pos.add(this.vel); this.vel.mult(0.95); this.life -= 0.04; }
    render() {
      push(); noStroke(); fill(this.col[0], this.col[1], this.col[2], this.life * 255);
      textAlign(CENTER, CENTER); textSize(this.size);
      text(this.char, this.pos.x, this.pos.y); pop();
    }
    get dead() { return this.life <= 0; }
  }

  class Bullet {
    constructor(pos, angle) {
      this.pos = pos.copy();
      this.vel = p5.Vector.fromAngle(angle).mult(BULLET_SPEED);
      this.r = 14; this.life = BULLET_LIFE; this.word = random(SQL);
    }
    update() { this.pos.add(this.vel); this.life--; }
    render() {
      push(); noStroke();
      fill(CYAN[0], CYAN[1], CYAN[2], constrain(map(this.life, 0, 30, 0, 255), 0, 255));
      textAlign(CENTER, CENTER); textSize(20);
      text(this.word, this.pos.x, this.pos.y); pop();
    }
    isOffscreen() {
      return this.pos.x < -this.r || this.pos.x > width + this.r ||
             this.pos.y < -this.r || this.pos.y > height + this.r || this.life <= 0;
    }
    hits(a) { return dist(this.pos.x, this.pos.y, a.pos.x, a.pos.y) < this.r + a.r; }
  }

  class Asteroid {
    constructor(pos, r) {
      this.pos = pos ? pos.copy() : createVector(random(width), random(height));
      this.r = (r || AST_SIZE) * random(0.7, 1.1);
      this.vel = p5.Vector.random2D().mult(random(AST_SPEED * 0.4, AST_SPEED));
      this.n = floor(random(7, 12));
      this.offsets = Array.from({ length: this.n }, () => random(-this.r * 0.45, this.r * 0.3));
      this.angle = random(TWO_PI); this.spin = random(-0.015, 0.015);
      this.bits = [];
      const nb = floor(map(this.r, AST_MIN, AST_SIZE, 1, 4));
      for (let i = 0; i < nb; i++) {
        const a = random(TWO_PI), d = random(0.1, 0.5);
        this.bits.push({ c: random(BITS), x: cos(a) * this.r * d, y: sin(a) * this.r * d, s: max(9, this.r * 0.22) });
      }
    }
    update() { this.pos.add(this.vel); this.angle += this.spin; }
    render() {
      push(); translate(this.pos.x, this.pos.y); rotate(this.angle);
      stroke(GREEN[0], GREEN[1], GREEN[2]); strokeWeight(1.5);
      fill(DGREEN[0], DGREEN[1], DGREEN[2], 60);
      beginShape();
      for (let i = 0; i < this.n; i++) {
        const a = map(i, 0, this.n, 0, TWO_PI), rv = this.r + this.offsets[i];
        vertex(rv * cos(a), rv * sin(a));
      }
      endShape(CLOSE);
      noStroke(); fill(GREEN[0], GREEN[1], GREEN[2]); textAlign(CENTER, CENTER);
      for (const b of this.bits) { textSize(b.s); text(b.c, b.x, b.y); }
      pop();
    }
    edges() {
      if (this.pos.x > width + this.r) this.pos.x = -this.r; else if (this.pos.x < -this.r) this.pos.x = width + this.r;
      if (this.pos.y > height + this.r) this.pos.y = -this.r; else if (this.pos.y < -this.r) this.pos.y = height + this.r;
    }
    breakup() { return [new Asteroid(this.pos, this.r * 0.62), new Asteroid(this.pos, this.r * 0.62)]; }
  }

  class Powerup {
    constructor() {
      this.pos = createVector(random(width * 0.2, width * 0.8), random(height * 0.2, height * 0.8));
      this.r = 30; this.angle = 0; this.float = 0;
    }
    update() { this.angle += 0.03; this.float = sin(frameCount * 0.05) * 10; }
    render() {
      push(); translate(this.pos.x, this.pos.y + this.float); rotate(this.angle);
      const pulse = 0.7 + 0.3 * sin(frameCount * 0.12);
      drawingContext.shadowBlur = 25 * pulse; drawingContext.shadowColor = `rgb(${GOLD[0]},${GOLD[1]},${GOLD[2]})`;
      noFill(); stroke(GOLD[0], GOLD[1], GOLD[2]); strokeWeight(3);
      const s = this.r, cd = s * 0.2;
      const shape = () => {
        beginShape(); vertex(0, -s);
        quadraticVertex(cd, -cd, s, 0); quadraticVertex(cd, cd, 0, s);
        quadraticVertex(-cd, cd, -s, 0); quadraticVertex(-cd, -cd, 0, -s); endShape();
      };
      shape(); scale(0.6); shape();
      pop();
      push(); noStroke(); fill(GOLD[0], GOLD[1], GOLD[2]); textAlign(CENTER, TOP); textSize(13);
      text('AI CLEANER', this.pos.x, this.pos.y + this.float + this.r + 6); pop();
    }
  }

  class DatabaseCleaner extends Bullet {
    constructor(pos, angle) {
      super(pos, angle);
      this.heading = angle; this.expanding = false; this.rate = 0; this.rot = 0;
      this.max = max(width, height) * 1.5; this.cleared = new Set();
    }
    update() {
      if (!this.expanding) {
        this.pos.add(this.vel); this.life--;
        if (this.life < 70) { this.expanding = true; this.life = 400; G.bullets = G.bullets.filter(b => b === this); }
      } else {
        this.rate += 14; this.r = this.rate; this.rot += 0.05;
        for (let i = G.asteroids.length - 1; i >= 0; i--) {
          const a = G.asteroids[i];
          if (dist(this.pos.x, this.pos.y, a.pos.x, a.pos.y) < this.r + a.r && !this.cleared.has(a)) {
            this.cleared.add(a);
            G.shell.addScore(scoreFor(a));
            G.burst(a.pos.x, a.pos.y, 6, CYAN);
            G.asteroids.splice(i, 1);
          }
        }
      }
    }
    render() {
      push(); translate(this.pos.x, this.pos.y);
      if (!this.expanding) {
        rotate(this.heading); noFill(); stroke(CYAN[0], CYAN[1], CYAN[2]); strokeWeight(2);
        const w = 70, h = 36; ellipse(0, -h / 2, w, w / 3); ellipse(0, h / 2, w, w / 3);
        line(-w / 2, -h / 2, -w / 2, h / 2); line(w / 2, -h / 2, w / 2, h / 2);
      } else {
        rotate(this.rot);
        for (let i = 0; i < 3; i++) {
          const radius = this.r - i * 50;
          if (radius <= 0) continue;
          const al = map(radius, 0, this.max, 200, 0) * (1 - i * 0.3);
          noFill(); stroke(CYAN[0] - i * 20, CYAN[1], CYAN[2], al); strokeWeight(3 - i);
          const w = radius * 2, h = w * 0.66; ellipse(0, -h / 2, w, w / 3); ellipse(0, h / 2, w, w / 3);
          for (let a = 0; a < TWO_PI; a += PI / 4) { const x = cos(a) * radius; line(x, -h / 2, x, h / 2); }
        }
      }
      pop();
    }
    isOffscreen() { return this.r >= this.max; }
  }

  class Player {
    constructor() { this.reset(true); }
    reset(fresh) {
      this.pos = createVector(width / 2, height / 2); this.vel = createVector(0, 0);
      this.heading = -PI / 2; this.invincible = true; this.invTimer = INVINCIBLE;
      this.flame = 0;
    }
    handleInput() {
      if (keyIsDown(LEFT_ARROW)) this.heading -= TURN;
      if (keyIsDown(RIGHT_ARROW)) this.heading += TURN;
      if (keyIsDown(UP_ARROW)) { this.vel.add(p5.Vector.fromAngle(this.heading).mult(THRUST)); this.flame = (this.flame + 8) % 60; }
      if (keyIsDown(DOWN_ARROW)) this.vel.add(p5.Vector.fromAngle(this.heading + PI).mult(THRUST * 0.6));
    }
    update() {
      this.vel.mult(FRICTION); this.vel.limit(MAX_SPEED); this.pos.add(this.vel);
      if (this.invincible && --this.invTimer <= 0) this.invincible = false;
    }
    edges() {
      const r = this.cr;
      if (this.pos.x > width + r) this.pos.x = -r; else if (this.pos.x < -r) this.pos.x = width + r;
      if (this.pos.y > height + r) this.pos.y = -r; else if (this.pos.y < -r) this.pos.y = height + r;
    }
    get sprite() { const h = G.shell.currentHero; return h && h.img && h.img.width ? h.img : null; }
    get scale() { const s = this.sprite; return s ? 90 / s.height : 1; }
    get cr() { const s = this.sprite; return s ? s.height * this.scale * 0.34 : 30; }
    shoot() {
      const nose = this.sprite ? this.sprite.height * this.scale / 2 + 8 : 30;
      const p = createVector(this.pos.x + nose * cos(this.heading), this.pos.y + nose * sin(this.heading));
      if (G.hasPowerup) { G.bullets.push(new DatabaseCleaner(p, this.heading)); G.hasPowerup = false; }
      else G.bullets.push(new Bullet(p, this.heading));
    }
    render() {
      if (this.invincible && floor(frameCount / 6) % 2 === 0) return;
      push(); translate(this.pos.x, this.pos.y); rotate(this.heading + PI / 2);
      const s = this.sprite;
      if (s) { imageMode(CENTER); image(s, 0, 0, s.width * this.scale, s.height * this.scale); }
      else { fill(GREEN[0], GREEN[1], GREEN[2]); noStroke(); triangle(0, -22, -14, 16, 14, 16); }
      if (keyIsDown(UP_ARROW) && this.vel.magSq() > 0.02) {
        noStroke(); textAlign(CENTER, CENTER);
        for (let i = 0; i < 6; i++) {
          fill(GOLD[0], GOLD[1] - i * 10, 60, map(i, 0, 6, 220, 20));
          textSize(random(10, 15));
          text(random(['0', '1', '/', '*']), random(-12, 12), (s ? s.height * this.scale / 2 : 18) + i * 10);
        }
      }
      pop();
    }
    hits(o) { return dist(this.pos.x, this.pos.y, o.pos.x, o.pos.y) < this.cr + o.r * 0.8; }
  }

  function scoreFor(a) { return floor(map(a.r, AST_MIN, AST_SIZE, 50, 10)); }

  class DataCleaning {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.reset(); }
    reset() {
      G = this;
      this.player = new Player();
      this.bullets = []; this.asteroids = []; this.fx = [];
      this.powerup = null; this.hasPowerup = false; this.powerupSpawned = false;
      this.lastFire = 0; this._won = false;
      this.spawn(AST_NUM, AST_SIZE);
    }
    spawn(n, size) {
      for (let i = 0; i < n; i++) {
        let x, y, tries = 0;
        do { x = random(width); y = random(height); tries++; }
        while (tries < 60 && dist(x, y, this.player.pos.x, this.player.pos.y) < size * 2 + 120);
        this.asteroids.push(new Asteroid(createVector(x, y), size));
      }
    }
    burst(x, y, n, col) { for (let i = 0; i < n; i++) this.fx.push(new Particle(x, y, col)); }
    playerHit() { this.shell.loseLife(); if (this.shell.lives > 0) this.player.reset(); }

    update() {
      const cleanerActive = this.bullets.some(b => b instanceof DatabaseCleaner);
      const cleanerExpanding = this.bullets.some(b => b instanceof DatabaseCleaner && b.expanding);

      this.player.handleInput(); this.player.update(); this.player.edges();

      if (keyIsDown(32) && !cleanerActive && millis() - this.lastFire >= FIRE_MS) {
        this.player.shoot(); this.lastFire = millis();
      }

      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i]; b.update();
        if (b.isOffscreen()) {
          if (b instanceof DatabaseCleaner && b.expanding) { this.asteroids = []; this._won = true; }
          this.bullets.splice(i, 1);
        }
      }

      for (const a of this.asteroids) { a.update(); a.edges(); if (!this.player.invincible && this.player.hits(a)) { this.playerHit(); break; } }

      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (b instanceof DatabaseCleaner) continue;
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
          const a = this.asteroids[j];
          if (b.hits(a)) {
            this.shell.addScore(scoreFor(a)); this.burst(a.pos.x, a.pos.y, 5);
            if (a.r > AST_MIN * 1.6 && !cleanerExpanding) this.asteroids.push(...a.breakup());
            this.asteroids.splice(j, 1); this.bullets.splice(i, 1); break;
          }
        }
      }

      if (this.shell.score >= POWERUP_AT && !this.powerupSpawned && !this.hasPowerup) {
        this.powerup = new Powerup(); this.powerupSpawned = true;
      }
      if (this.powerup) { this.powerup.update(); if (this.player.hits(this.powerup)) { this.hasPowerup = true; this.powerup = null; } }

      if (this.asteroids.length === 0 && !cleanerExpanding && !this._won) {
        this.spawn(min(20, AST_NUM + floor(this.shell.score / 300)), AST_SIZE);
      }

      for (let i = this.fx.length - 1; i >= 0; i--) { this.fx[i].update(); if (this.fx[i].dead) this.fx.splice(i, 1); }
    }

    render() {
      for (const a of this.asteroids) a.render();
      for (const b of this.bullets) b.render();
      if (this.powerup) this.powerup.render();
      for (const f of this.fx) f.render();
      this.player.render();
      if (this.hasPowerup) {
        push(); textAlign(CENTER, TOP); textSize(18);
        fill(GOLD[0], GOLD[1], GOLD[2]);
        text('DATABASE CLEANER ARMED — SPACE to unleash', width / 2, height - 64); pop();
      }
    }

    handleKey() {}
    get won() { return this._won; }
    get lost() { return false; }
  }

  window.DataHeroesGame = DataCleaning;
})();
