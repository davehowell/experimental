// Model Deployment = Lunar Lander, on GameShell.
// Lower the model gently onto the PROD pad. Burn deploy budget (fuel) on thrusters to control descent;
// touch down slow and on-target for a clean rollout. Too fast or off-pad = crashed production.
(() => {
  const GREEN = MX.bright, RED = [255, 80, 80], GOLD = [255, 210, 90], CYAN = [90, 220, 255];
  const GRAV = 0.045, THRUST = 0.12, LAT = 0.07;
  const SAFE_VY = 2.4, SAFE_VX = 1.6;

  let G;

  class ModelDeployment {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.layout(); this.reset(); }
    resize() { this.layout(); }
    layout() {
      this.groundY = height - 90;
      this.padW = 170; this.padX = width / 2 - this.padW / 2;
      // simple jagged terrain points across the width (pad is flat)
      this.terrain = [];
      for (let x = 0; x <= width; x += 60) {
        let y = this.groundY - random(0, 60);
        if (x + 60 > this.padX && x < this.padX + this.padW) y = this.groundY;
        this.terrain.push({ x, y });
      }
    }
    reset() {
      G = this;
      this.x = random(width * 0.25, width * 0.75); this.y = 90;
      this.vx = random(-1, 1); this.vy = 0; this.fuel = 100;
      this.flame = false; this.latFlame = 0; this._won = false; this.fx = [];
      this.landed = false;
    }
    handleKey() {}
    update() {
      if (this._won || this.landed) { this.stepFx(); return; }
      this.flame = false; this.latFlame = 0;
      if (keyIsDown(UP_ARROW) && this.fuel > 0) { this.vy -= THRUST; this.fuel = max(0, this.fuel - 0.4); this.flame = true; }
      if (keyIsDown(LEFT_ARROW) && this.fuel > 0) { this.vx -= LAT; this.fuel = max(0, this.fuel - 0.25); this.latFlame = 1; }
      if (keyIsDown(RIGHT_ARROW) && this.fuel > 0) { this.vx += LAT; this.fuel = max(0, this.fuel - 0.25); this.latFlame = -1; }
      this.vy += GRAV;
      this.x += this.vx; this.y += this.vy;
      this.x = constrain(this.x, 20, width - 20);

      if (this.y >= this.groundY - 22) {
        this.y = this.groundY - 22;
        const onPad = this.x > this.padX + 10 && this.x < this.padX + this.padW - 10;
        const soft = this.vy < SAFE_VY && abs(this.vx) < SAFE_VX;
        if (onPad && soft) { this.landed = true; this._won = true; this.burst(GREEN, 26); }
        else { this.crash(); }
      }
      this.stepFx();
    }
    crash() {
      this.burst(RED, 36); this.shell.loseLife();
      if (this.shell.lives > 0) { this.x = random(width * 0.25, width * 0.75); this.y = 90; this.vx = random(-1, 1); this.vy = 0; this.fuel = 100; }
      else this.landed = true; // shell will flip to gameOver via lives<=0
    }
    burst(col, n) { for (let i = 0; i < n; i++) this.fx.push({ x: this.x, y: this.y + 16, vx: random(-5, 5), vy: random(-6, 3), life: 1, col }); }
    stepFx() { for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.x += f.vx; f.y += f.vy; f.vy += 0.25; f.life -= 0.03; if (f.life <= 0) this.fx.splice(i, 1); } }
    render() {
      // terrain
      push(); noFill(); stroke(MX.dark[0], MX.dark[1], MX.dark[2]); strokeWeight(2);
      beginShape(); vertex(0, height); for (const p of this.terrain) vertex(p.x, p.y); vertex(width, height); endShape(CLOSE);
      pop();
      // pad
      push();
      drawingContext.shadowBlur = 16; drawingContext.shadowColor = `rgb(${GREEN[0]},${GREEN[1]},${GREEN[2]})`;
      stroke(GREEN[0], GREEN[1], GREEN[2]); strokeWeight(4); line(this.padX, this.groundY, this.padX + this.padW, this.groundY);
      drawingContext.shadowBlur = 0;
      for (let i = 0; i <= 4; i++) { const lx = this.padX + (this.padW / 4) * i; const on = floor(frameCount / 15 + i) % 2 === 0; fill(on ? GOLD : [0, 80, 30]); noStroke(); circle(lx, this.groundY - 4, 8); }
      fill(GREEN[0], GREEN[1], GREEN[2]); noStroke(); textAlign(CENTER, TOP); textSize(14); text('PROD ENV', this.padX + this.padW / 2, this.groundY + 8);
      pop();
      // guidance
      const soft = this.vy < SAFE_VY && abs(this.vx) < SAFE_VX;
      const onPad = this.x > this.padX && this.x < this.padX + this.padW;
      this.gauge(soft, onPad);
      // lander (hero)
      if (!this.landed || this._won) this.drawLander();
      for (const f of this.fx) { push(); noStroke(); fill(f.col[0], f.col[1], f.col[2], f.life * 255); circle(f.x, f.y, 6); pop(); }
    }
    drawLander() {
      push(); translate(this.x, this.y);
      // legs
      stroke(GREEN[0], GREEN[1], GREEN[2]); strokeWeight(2); line(-16, 14, -24, 26); line(16, 14, 24, 26); line(-24, 26, -28, 26); line(24, 26, 28, 26);
      const img = this.shell.currentHero && this.shell.currentHero.img;
      if (img && img.width) { imageMode(CENTER); const s = 70 / img.height; image(img, 0, -6, img.width * s, img.height * s); }
      else { noStroke(); fill(GREEN[0], GREEN[1], GREEN[2]); rectMode(CENTER); rect(0, 0, 36, 30, 6); }
      // main flame
      if (this.flame) { noStroke(); for (let i = 0; i < 5; i++) { fill(GOLD[0], GOLD[1] - i * 20, 40, map(i, 0, 5, 220, 30)); const w = 16 - i * 2; triangle(-w / 2, 16, w / 2, 16, 0, 28 + i * 6); } }
      if (this.latFlame) { noStroke(); fill(CYAN[0], CYAN[1], CYAN[2], 200); const s = this.latFlame; for (let i = 0; i < 3; i++) triangle(s * 16, -4, s * 16, 6, s * (24 + i * 6), 1); }
      pop();
    }
    gauge(soft, onPad) {
      push(); textFont('Courier New'); textAlign(LEFT, TOP); textSize(16); noStroke();
      const vcol = this.vy < SAFE_VY ? GREEN : RED, hcol = abs(this.vx) < SAFE_VX ? GREEN : RED;
      fill(MX.medium[0], MX.medium[1], MX.medium[2]); text('V-SPEED', width - 220, 70);
      fill(vcol[0], vcol[1], vcol[2]); text(this.vy.toFixed(2), width - 110, 70);
      fill(MX.medium[0], MX.medium[1], MX.medium[2]); text('H-SPEED', width - 220, 94);
      fill(hcol[0], hcol[1], hcol[2]); text(abs(this.vx).toFixed(2), width - 110, 94);
      fill(MX.medium[0], MX.medium[1], MX.medium[2]); text('FUEL', width - 220, 118);
      const fcol = this.fuel > 25 ? GREEN : RED; fill(fcol[0], fcol[1], fcol[2]); text(Math.round(this.fuel) + '%', width - 110, 118);
      if (soft && onPad) { textAlign(CENTER, TOP); fill(GREEN[0], GREEN[1], GREEN[2]); textSize(18); text('● CLEAR TO DEPLOY', width / 2, 70); }
      pop();
    }
    handleClick() {}
    get won() { return this._won; }
    get lost() { return false; }
  }

  window.DataHeroesGame = ModelDeployment;
})();
