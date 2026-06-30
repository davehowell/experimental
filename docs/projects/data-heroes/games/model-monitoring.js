// Model Monitoring = Missile Command, on GameShell.
// Defend 3 production models from incoming drift/anomaly/latency threats. Mouse aims, click fires
// an interceptor that detonates and clears threats in its blast. Intercept the SYSTEM RESET orb to
// arm a screen-wide purge (SPACE). Survive long enough and a PRODUCTION OUTAGE boss appears — purge
// it to win.
(() => {
  const MODELS = ['NEURAL NET', 'XGBOOST', 'RANDOM FOREST'];
  const THREATS = ['DRIFT', 'ANOMALY', 'LATENCY', 'NULLS', 'SKEW', 'OUTLIER', 'P99', 'NaN'];
  const RED = [255, 70, 70], ORANGE = [255, 150, 40], CYAN = [90, 220, 255];
  const GREEN = MX.bright, GOLD = [255, 215, 90];
  const BOSS_AT = 420;            // score that triggers the outage boss
  const POWERUP_AT = 220;

  let G;

  class Threat {
    constructor(target, boss) {
      this.x = random(width * 0.1, width * 0.9); this.y = -20;
      this.target = target;
      const tx = target.x, ty = target.y;
      const sp = boss ? 0.6 : random(0.8, 1.5) + G.shell.score / 2200;
      const a = atan2(ty - this.y, tx - this.x);
      this.vx = cos(a) * sp; this.vy = sin(a) * sp;
      this.label = boss ? 'PRODUCTION OUTAGE' : random(THREATS);
      this.boss = !!boss; this.r = boss ? 46 : 13; this.hp = boss ? 6 : 1;
      this.trail = [];
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      this.trail.push({ x: this.x, y: this.y });
      if (this.trail.length > 18) this.trail.shift();
    }
    render() {
      push();
      noFill();
      stroke(this.boss ? RED[0] : ORANGE[0], this.boss ? 40 : 110, this.boss ? 40 : 40, 90);
      strokeWeight(this.boss ? 3 : 1.5);
      for (let i = 1; i < this.trail.length; i++) line(this.trail[i - 1].x, this.trail[i - 1].y, this.trail[i].x, this.trail[i].y);
      const pulse = 0.7 + 0.3 * sin(frameCount * 0.2);
      drawingContext.shadowBlur = 18 * pulse; drawingContext.shadowColor = `rgb(${RED[0]},60,60)`;
      noFill(); stroke(RED[0], RED[1], RED[2]); strokeWeight(2);
      circle(this.x, this.y, this.r * 2);
      if (this.boss) { stroke(RED[0], RED[1], RED[2], 120); circle(this.x, this.y, this.r * 1.3); }
      drawingContext.shadowBlur = 0;
      noStroke(); fill(RED[0], RED[1], RED[2]); textAlign(CENTER, CENTER); textSize(this.boss ? 16 : 11);
      text(this.label, this.x, this.y - this.r - 9);
      if (this.boss) {
        fill(0, 0, 0, 150); rect(this.x - 40, this.y + this.r + 6, 80, 6);
        fill(RED[0], RED[1], RED[2]); rect(this.x - 40, this.y + this.r + 6, 80 * (this.hp / 6), 6);
      }
      pop();
    }
  }

  class Interceptor {
    constructor(tx, ty) {
      this.sx = G.turret.x; this.sy = G.turret.y; this.tx = tx; this.ty = ty;
      this.x = this.sx; this.y = this.sy;
      const a = atan2(ty - this.sy, tx - this.sx);
      this.vx = cos(a) * 13; this.vy = sin(a) * 13; this.done = false;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (dist(this.x, this.y, this.tx, this.ty) < 16) { this.done = true; G.explosions.push(new Boom(this.tx, this.ty)); }
    }
    render() {
      push(); stroke(CYAN[0], CYAN[1], CYAN[2]); strokeWeight(2);
      line(this.sx, this.sy, this.x, this.y);
      drawingContext.shadowBlur = 12; drawingContext.shadowColor = `rgb(${CYAN[0]},${CYAN[1]},${CYAN[2]})`;
      fill(255); noStroke(); circle(this.x, this.y, 6); pop();
    }
  }

  class Boom {
    constructor(x, y, big) { this.x = x; this.y = y; this.r = 4; this.max = big ? max(width, height) : 300; this.grow = big ? 40 : 11; this.hit = new Set(); }
    update() { this.r += this.grow; if (this.r > this.max * 0.5) this.grow = -Math.abs(this.grow); }
    render() {
      push();
      const a = map(this.r, 0, this.max, 220, 0);
      noStroke(); fill(GREEN[0], GREEN[1], GREEN[2], a * 0.5); circle(this.x, this.y, this.r * 2);
      stroke(255, 255, 255, a); strokeWeight(2); noFill(); circle(this.x, this.y, this.r * 2); pop();
    }
    get dead() { return this.r <= 0; }
  }

  class ResetOrb {
    constructor() { this.x = random(width * 0.2, width * 0.8); this.y = random(height * 0.2, height * 0.45); this.r = 22; }
    render() {
      push(); translate(this.x, this.y);
      const p = 0.7 + 0.3 * sin(frameCount * 0.12); rotate(frameCount * 0.03);
      drawingContext.shadowBlur = 28 * p; drawingContext.shadowColor = `rgb(${GOLD[0]},${GOLD[1]},${GOLD[2]})`;
      noFill(); stroke(GOLD[0], GOLD[1], GOLD[2]); strokeWeight(3);
      for (let i = 0; i < 6; i++) { const a = i / 6 * TWO_PI; line(0, 0, cos(a) * this.r, sin(a) * this.r); }
      circle(0, 0, this.r * 1.4); pop();
      push(); noStroke(); fill(GOLD[0], GOLD[1], GOLD[2]); textAlign(CENTER, TOP); textSize(12);
      text('SYSTEM RESET', this.x, this.y + this.r + 6); pop();
    }
  }

  class ModelMonitoring {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.reset(); }
    reset() {
      G = this;
      const y = height - 90;
      this.models = MODELS.map((name, i) => ({ name, x: width * (i + 1) / (MODELS.length + 1), y, alive: true }));
      this.turret = { x: width / 2, y: height - 36 };
      this.threats = []; this.interceptors = []; this.explosions = [];
      this.orb = null; this.orbDone = false; this.armed = false;
      this.boss = null; this.bossDone = false; this._won = false;
      this.spawnTimer = 0; this.tick = 0;
    }
    aliveModels() { return this.models.filter(m => m.alive); }
    handleClick(x, y) { if (y < this.turret.y - 10) this.interceptors.push(new Interceptor(x, y)); }
    handleKey(kc, k) {
      if ((k === ' ' || kc === 32) && this.armed) {
        this.armed = false;
        this.explosions.push(new Boom(width / 2, height / 2, true));
        this.threats = this.threats.filter(t => t.boss);
        if (this.boss) { this.boss.hp -= 4; this.threats.filter(t => t.boss).forEach(t => t.hp -= 4); }
      }
    }
    update() {
      this.tick++;
      const alive = this.aliveModels();
      // spawn threats
      this.spawnTimer--;
      if (this.spawnTimer <= 0 && alive.length && !this._won) {
        this.threats.push(new Threat(random(alive)));
        this.spawnTimer = max(45, 105 - this.tick * 0.04 - this.shell.score * 0.015);
      }
      // boss
      if (!this.bossDone && this.shell.score >= BOSS_AT && alive.length) {
        this.boss = new Threat(random(alive), true); this.threats.push(this.boss); this.bossDone = true;
      }
      // powerup
      if (!this.orb && !this.orbDone && !this.armed && this.shell.score >= POWERUP_AT) this.orb = new ResetOrb();

      this.threats.forEach(t => t.update());
      this.interceptors.forEach(i => i.update());
      this.explosions.forEach(e => e.update());

      // explosion vs threats / orb
      for (const e of this.explosions) {
        for (let i = this.threats.length - 1; i >= 0; i--) {
          const t = this.threats[i];
          if (e.hit.has(t)) continue;
          if (dist(e.x, e.y, t.x, t.y) < e.r + t.r) {
            e.hit.add(t); t.hp--;
            if (t.hp <= 0) {
              this.shell.addScore(t.boss ? 300 : 25);
              for (let p = 0; p < (t.boss ? 30 : 6); p++) this.explosions.push(Object.assign(new Boom(t.x + random(-20, 20), t.y + random(-20, 20)), { max: 30, grow: 3 }));
              if (t.boss) { this._won = true; }
              this.threats.splice(i, 1);
            }
          }
        }
        if (this.orb && !e.hit.has(this.orb) && dist(e.x, e.y, this.orb.x, this.orb.y) < e.r + this.orb.r) {
          this.armed = true; this.orb = null; this.orbDone = true;
        }
      }
      // threats reaching the ground / models
      for (let i = this.threats.length - 1; i >= 0; i--) {
        const t = this.threats[i];
        if (t.y >= t.target.y - 6) {
          if (t.boss) { this.aliveModels().forEach(m => m.alive = false); for (let k = 0; k < 3; k++) this.shell.loseLife(); }
          else if (t.target.alive) { t.target.alive = false; this.shell.loseLife(); }
          this.threats.splice(i, 1);
        }
      }
      this.interceptors = this.interceptors.filter(i => !i.done);
      this.explosions = this.explosions.filter(e => !e.dead);
      if (this.orb) { /* static float */ }
    }
    render() {
      // ground
      push(); stroke(GREEN[0], GREEN[1], GREEN[2], 120); strokeWeight(2);
      line(0, height - 60, width, height - 60); pop();
      // models
      for (const m of this.models) {
        push(); textAlign(CENTER, CENTER);
        if (m.alive) {
          drawingContext.shadowBlur = 14; drawingContext.shadowColor = `rgb(${GREEN[0]},${GREEN[1]},${GREEN[2]})`;
          noFill(); stroke(GREEN[0], GREEN[1], GREEN[2]); strokeWeight(2);
          rectMode(CENTER); rect(m.x, m.y, 130, 46, 6);
          drawingContext.shadowBlur = 0; noStroke(); fill(GREEN[0], GREEN[1], GREEN[2]); textSize(13); text(m.name, m.x, m.y);
        } else {
          noFill(); stroke(RED[0], 60, 60); strokeWeight(2); rectMode(CENTER); rect(m.x, m.y, 130, 46, 6);
          noStroke(); fill(RED[0], 80, 80); textSize(12); text(m.name, m.x, m.y - 8); textSize(11); text('OFFLINE', m.x, m.y + 10);
        }
        pop();
      }
      this.threats.forEach(t => t.render());
      this.interceptors.forEach(i => i.render());
      this.explosions.forEach(e => e.render());
      if (this.orb) this.orb.render();
      // turret (hero)
      push(); translate(this.turret.x, this.turret.y);
      const a = atan2(mouseY - this.turret.y, mouseX - this.turret.x);
      stroke(CYAN[0], CYAN[1], CYAN[2]); strokeWeight(4); line(0, 0, cos(a) * 34, sin(a) * 34);
      const h = this.shell.currentHero;
      if (h && h.img && h.img.width) { imageMode(CENTER); const s = 64 / h.img.height; image(h.img, 0, -6, h.img.width * s, h.img.height * s); }
      else { fill(GREEN[0], GREEN[1], GREEN[2]); noStroke(); triangle(-16, 0, 16, 0, 0, -22); }
      pop();
      // crosshair
      push(); stroke(CYAN[0], CYAN[1], CYAN[2], 180); strokeWeight(1.5); noFill();
      circle(mouseX, mouseY, 26); line(mouseX - 18, mouseY, mouseX + 18, mouseY); line(mouseX, mouseY - 18, mouseX, mouseY + 18); pop();
      // status
      if (this.armed) { push(); textAlign(CENTER, TOP); textSize(18); fill(GOLD[0], GOLD[1], GOLD[2]); text('SYSTEM RESET ARMED — SPACE to purge', width / 2, height - 86); pop(); }
    }
    get won() { return this._won; }
    get lost() { return false; }
  }

  window.DataHeroesGame = ModelMonitoring;
})();
