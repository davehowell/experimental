// Model Evaluation = Boxing (champion / challenger), on GameShell.
// Your challenger model steps into the ring against the reigning champion. Land punches to win on the
// metrics (the champion's F1 score is its health). Block its counters. KO it to get promoted.
(() => {
  const GREEN = MX.bright, RED = [255, 80, 80], GOLD = [255, 210, 90], CYAN = [90, 220, 255];
  const METRICS = ['ACCURACY', 'PRECISION', 'RECALL', 'F1', 'AUC'];
  const RANGE = 150, PUNCH_CD = 360, P_DMG = 11, C_DMG = 9;

  let G;

  class Boxer {
    constructor(x, facing) { this.x = x; this.facing = facing; this.hp = 100; this.punch = 0; this.block = false; this.hurt = 0; }
    get reach() { return this.x + this.facing * (RANGE * 0.6); }
  }

  class ModelEvaluation {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.reset(); }
    reset() {
      G = this;
      this.groundY = height * 0.72;
      this.player = new Boxer(width / 2 - 120, 1);
      this.champ = new Boxer(width / 2 + 120, -1);
      this.heroIdx = this.shell.selectedHero; this.orient();
      this.lastPunch = 0; this.champTimer = 0; this.sparks = [];
      this._won = false; this._lost = false; this.shakeT = 0;
      this.round = 1;
    }
    // Dave's sprite faces right → he stands on the left. Nadya's faces left → she stands on the
    // right. The champion is always flipped to face whichever side the challenger is on.
    get playerLeft() { return this.shell.selectedHero === 0; }
    orient() {
      const cx = width / 2;
      if (this.playerLeft) { this.player.x = cx - 120; this.champ.x = cx + 120; }
      else { this.player.x = cx + 120; this.champ.x = cx - 120; }
    }
    handleKey(kc, k) {
      if ((k === ' ' || kc === 32) && millis() - this.lastPunch > PUNCH_CD && !this._won && !this._lost) {
        this.lastPunch = millis(); this.player.punch = 1;
        if (abs(this.player.x - this.champ.x) < RANGE) {
          const dmg = this.champ.block ? P_DMG * 0.25 : P_DMG;
          this.champ.hp = max(0, this.champ.hp - dmg); this.champ.hurt = 1; this.shakeT = 0.4;
          this.shell.addScore(this.champ.block ? 5 : 25);
          this.spark((this.player.x + this.champ.x) / 2, this.groundY - 110, this.champ.block ? CYAN : GOLD);
          if (this.champ.hp <= 0) this._won = true;
        }
      }
    }
    spark(x, y, col) { for (let i = 0; i < 12; i++) this.sparks.push({ x, y, vx: random(-5, 5), vy: random(-6, 2), life: 1, col }); }
    update() {
      if (this._won || this._lost) return;
      const p = this.player, c = this.champ;
      if (this.shell.selectedHero !== this.heroIdx) { this.heroIdx = this.shell.selectedHero; this.orient(); }
      p.block = keyIsDown(DOWN_ARROW);
      if (keyIsDown(LEFT_ARROW)) p.x -= 5;
      if (keyIsDown(RIGHT_ARROW)) p.x += 5;
      // keep the challenger on their own side of the champion
      if (this.playerLeft) p.x = constrain(p.x, 80, c.x - 70);
      else p.x = constrain(p.x, c.x + 70, width - 80);
      p.punch = max(0, p.punch - 0.08); c.punch = max(0, c.punch - 0.08);
      p.hurt = max(0, p.hurt - 0.05); c.hurt = max(0, c.hurt - 0.05);
      this.shakeT = max(0, this.shakeT - 0.04);
      this.round = constrain(METRICS.length - floor(c.hp / (100 / METRICS.length)), 1, METRICS.length);

      // champion AI: close distance, occasionally block, throw on a timer (side-agnostic)
      const gap = abs(p.x - c.x);
      const toward = Math.sign(p.x - c.x);   // direction from champion to challenger
      if (gap > RANGE * 0.8) c.x += toward * 3; else if (gap < RANGE * 0.5) c.x -= toward * 2;
      if (this.playerLeft) c.x = constrain(c.x, p.x + 70, width - 80);
      else c.x = constrain(c.x, 80, p.x - 70);
      c.block = (floor(frameCount / 40) % 5 === 0);
      this.champTimer--;
      if (this.champTimer <= 0) {
        this.champTimer = floor(random(60, 110));
        if (gap < RANGE) {
          c.punch = 1;
          const dmg = p.block ? C_DMG * 0.2 : C_DMG;
          p.hp = max(0, p.hp - dmg); p.hurt = 1; this.shakeT = 0.4;
          this.spark((p.x + c.x) / 2, this.groundY - 110, p.block ? CYAN : RED);
          if (p.hp <= 0) this._lost = true;
        }
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) { const s = this.sparks[i]; s.x += s.vx; s.y += s.vy; s.vy += 0.3; s.life -= 0.05; if (s.life <= 0) this.sparks.splice(i, 1); }
    }
    render() {
      push();
      if (this.shakeT > 0) translate(random(-6, 6) * this.shakeT, random(-6, 6) * this.shakeT);
      this.drawRing();
      // metric banner
      push(); textAlign(CENTER, TOP); noStroke();
      glowText('ROUND ' + this.round + '  ·  ' + METRICS[this.round - 1], width / 2, this.groundY + 70, 26, this.shell.accent); pop();
      // health bars
      this.bar(60, 70, this.player.hp, GREEN, 'CHALLENGER (you)', true);
      this.bar(width - 60 - 360, 70, this.champ.hp, RED, 'CHAMPION MODEL v1  ·  F1', false);
      // boxers
      this.drawChampion(this.champ);
      this.drawPlayer(this.player);
      for (const s of this.sparks) { push(); noStroke(); fill(s.col[0], s.col[1], s.col[2], s.life * 255); circle(s.x, s.y, 6); pop(); }
      pop();
    }
    drawRing() {
      push();
      // floor
      stroke(MX.dark[0], MX.dark[1], MX.dark[2]); strokeWeight(2);
      line(40, this.groundY, width - 40, this.groundY);
      // ropes
      for (let i = 1; i <= 3; i++) { stroke(GOLD[0], GOLD[1], GOLD[2], 120); strokeWeight(2); line(40, this.groundY - 60 * i - 40, width - 40, this.groundY - 60 * i - 40); }
      // posts
      stroke(GOLD[0], GOLD[1], GOLD[2]); strokeWeight(6); line(40, this.groundY, 40, this.groundY - 240); line(width - 40, this.groundY, width - 40, this.groundY - 240);
      pop();
    }
    bar(x, y, hp, col, label, left) {
      push();
      noStroke(); fill(0, 0, 0, 160); rect(x, y, 360, 22, 4);
      fill(col[0], col[1], col[2]); rect(x, y, 360 * (hp / 100), 22, 4);
      noFill(); stroke(col[0], col[1], col[2]); strokeWeight(1.5); rect(x, y, 360, 22, 4);
      noStroke(); fill(col[0], col[1], col[2]); textSize(14); textAlign(left ? LEFT : RIGHT, BOTTOM);
      text(label, left ? x : x + 360, y - 4);
      textAlign(left ? RIGHT : LEFT, CENTER); fill(255);
      text(left ? Math.round(hp) + '%' : (hp / 100).toFixed(2), left ? x + 354 : x + 6, y + 11);
      pop();
    }
    drawPlayer(p) {
      // The sprite is drawn as-is — each hero already stands on the side their sprite faces, so they
      // look toward the champion. `pf` points the gloves / lunge at the champion.
      const pf = this.playerLeft ? 1 : -1;
      push(); translate(p.x, this.groundY);
      const img = this.shell.currentHero && this.shell.currentHero.img;
      const lunge = p.punch * 30 * pf;
      if (img && img.width) { imageMode(CENTER); const s = 200 / img.height; image(img, lunge, -img.height * s / 2, img.width * s, img.height * s); }
      else { fill(GREEN[0], GREEN[1], GREEN[2]); noStroke(); rectMode(CENTER); rect(0, -90, 60, 160, 10); }
      noStroke(); fill(p.hurt > 0 ? RED : GREEN);
      circle(pf * 40 + lunge, -120, 30); circle(pf * 20, -150, 24);
      if (p.block) { stroke(CYAN[0], CYAN[1], CYAN[2], 180); strokeWeight(3); noFill(); arc(0, -110, 120, 220, -HALF_PI - 0.6, -HALF_PI + 0.6); }
      pop();
    }
    drawChampion(c) {
      push(); translate(c.x, this.groundY);
      // figure faces the challenger: default art faces left (playerLeft), mirror it when they're on the right
      const flip = this.playerLeft ? 1 : -1, hurt = c.hurt > 0;
      push(); scale(flip, 1);
      const lunge = -c.punch * 30;
      drawingContext.shadowBlur = 16; drawingContext.shadowColor = `rgb(${RED[0]},60,60)`;
      stroke(RED[0], RED[1], RED[2]); strokeWeight(3); fill(40, 0, 0, 200); rectMode(CENTER);
      rect(0, -100, 90, 170, 8);          // body
      rect(0, -210, 64, 60, 8);           // head
      drawingContext.shadowBlur = 0;
      fill(hurt ? 255 : RED[0], hurt ? 200 : 60, 60); noStroke();
      circle(-18, -215, 12); circle(18, -215, 12);   // eyes
      fill(RED[0], RED[1], RED[2]); circle(-40 + lunge, -130, 34); circle(-24, -160, 26);   // gloves
      if (c.block) { stroke(CYAN[0], CYAN[1], CYAN[2], 150); strokeWeight(3); noFill(); arc(0, -120, 130, 240, -HALF_PI - 0.6, -HALF_PI + 0.6); }
      pop();
      noStroke(); fill(RED[0], RED[1], RED[2]); textAlign(CENTER, TOP); textSize(12); text('CHAMPION', 0, 20);   // label unflipped
      pop();
    }
    handleClick() {}
    get won() { return this._won; }
    get lost() { return this._lost; }
  }

  window.DataHeroesGame = ModelEvaluation;
})();
