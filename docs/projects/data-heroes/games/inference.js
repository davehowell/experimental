// Inference = Diner Dash / conveyor, on GameShell.
// Prediction requests ride conveyor lanes toward the serving station. Move between lanes and SPACE to
// serve the request in the zone before it falls off the end (an SLA miss). Periodic BATCH floods hit
// harder. Serve the target volume to meet the SLA and win.
(() => {
  const GREEN = MX.bright, ORANGE = [255, 133, 0], RED = [255, 80, 80], CYAN = [90, 220, 255], GOLD = [255, 210, 90];
  const LANES = 4, TARGET = 18;
  const KINDS = ['GET /predict', 'POST /score', 'QUERY', 'EMBED', 'RANK', 'CLASSIFY'];

  let G;

  class Req {
    constructor(lane, batch) {
      this.lane = lane; this.x = -60; this.batch = !!batch;
      this.label = batch ? 'BATCH' : random(KINDS);
      this.w = batch ? 92 : 116; this.served = false;
    }
  }

  class Inference {
    constructor(shell) { this.shell = shell; G = this; }
    setup() { this.layout(); this.reset(); }
    resize() { this.layout(); }
    layout() {
      this.top = height * 0.26; this.gap = (height * 0.5) / LANES;
      this.dropX = width - 70;                       // right edge: a request past this is dropped
      this.serveX = this.dropX - 230;                // serve-zone band ends at the drop edge
      this.stationX = (this.serveX + this.dropX) / 2; // station box centred inside the zone
    }
    laneY(i) { return this.top + i * this.gap + this.gap / 2; }
    reset() {
      G = this;
      this.reqs = []; this.fx = []; this.lane = 1; this.served = 0;
      this.spawnT = 40; this.batchT = 600; this.speed = 2.2; this._won = false; this.swing = 0;
    }
    handleKey(kc, k) {
      if (kc === UP_ARROW) this.lane = (this.lane - 1 + LANES) % LANES;
      else if (kc === DOWN_ARROW) this.lane = (this.lane + 1) % LANES;
      else if (k === ' ' || kc === 32) this.serve();
    }
    serve() {
      this.swing = 1;
      // nearest serveable request in current lane within the serving zone
      let best = null;
      for (const r of this.reqs) {
        if (r.served || r.lane !== this.lane) continue;
        if (r.x + r.w / 2 > this.serveX && r.x < this.dropX) { if (!best || r.x > best.x) best = r; }
      }
      if (best) {
        best.served = true; this.served++;
        this.shell.addScore(best.batch ? 40 : 20);
        this.burst(best.x + best.w / 2, this.laneY(best.lane), best.batch ? GOLD : GREEN);
        if (this.served >= TARGET) this._won = true;
      }
    }
    burst(x, y, col) { for (let i = 0; i < 10; i++) this.fx.push({ x, y, vx: random(-4, 4), vy: random(-4, 4), life: 1, col }); }
    update() {
      if (this._won) { this.stepFx(); return; }
      this.speed += 0.0015;
      this.swing = max(0, this.swing - 0.12);
      // spawn singles
      if (--this.spawnT <= 0) { this.reqs.push(new Req(floor(random(LANES)))); this.spawnT = max(28, 70 - this.served * 1.5); }
      // batch floods
      if (--this.batchT <= 0) { const l = floor(random(LANES)); for (let i = 0; i < LANES; i++) this.reqs.push(Object.assign(new Req((l + i) % LANES, true), { x: -60 - i * 80 })); this.batchT = 520; }
      // move
      for (const r of this.reqs) if (!r.served) r.x += this.speed * (r.batch ? 1.15 : 1);
      // drops
      for (let i = this.reqs.length - 1; i >= 0; i--) {
        const r = this.reqs[i];
        if (r.served) { r.x += 6; r.alpha = (r.alpha ?? 1) - 0.08; if (r.alpha <= 0) this.reqs.splice(i, 1); continue; }
        if (r.x > this.dropX) { this.shell.loseLife(); this.burst(this.dropX, this.laneY(r.lane), RED); this.reqs.splice(i, 1); }
      }
      this.stepFx();
    }
    stepFx() { for (let i = this.fx.length - 1; i >= 0; i--) { const f = this.fx[i]; f.x += f.vx; f.y += f.vy; f.life -= 0.05; if (f.life <= 0) this.fx.splice(i, 1); } }
    render() {
      // highlight the lane the hero is in, so it's clear which lane SPACE will serve
      push(); noStroke(); fill(this.shell.accent[0], this.shell.accent[1], this.shell.accent[2], 22);
      rect(0, this.laneY(this.lane) - this.gap / 2, this.dropX, this.gap); pop();
      // lanes / conveyor belts
      push();
      for (let i = 0; i < LANES; i++) {
        const y = this.laneY(i);
        stroke(0, 90, 30); strokeWeight(1);
        for (let x = 20; x < this.dropX; x += 28) line(x, y + this.gap / 2 - 4, x + 14, y + this.gap / 2 - 4);
        // belt direction ticks animate
        stroke(0, 70, 24); for (let x = (frameCount * this.speed) % 40 - 40; x < this.dropX; x += 40) { line(x, y - this.gap / 2 + 6, x + 10, y - this.gap / 2 + 6); }
      }
      pop();
      // serving zone (green band) ending at the red DROP edge
      const zTop = this.top - 6, zBot = this.top + this.gap * LANES + 6;
      push();
      noStroke(); fill(GREEN[0], GREEN[1], GREEN[2], 30); rect(this.serveX, zTop, this.dropX - this.serveX, zBot - zTop);
      stroke(GREEN[0], GREEN[1], GREEN[2], 160); strokeWeight(1.5); line(this.serveX, zTop, this.serveX, zBot);
      stroke(RED[0], RED[1], RED[2], 170); line(this.dropX, zTop, this.dropX, zBot);
      noStroke(); fill(GREEN[0], GREEN[1], GREEN[2]); textAlign(CENTER, BOTTOM); textSize(13);
      text('SERVE ZONE — press SPACE here', (this.serveX + this.dropX) / 2, zTop - 4);
      fill(RED[0], RED[1], RED[2]); textAlign(CENTER, TOP); textSize(11); text('DROP', this.dropX, zBot + 4);
      pop();
      // requests
      for (const r of this.reqs) this.drawReq(r);
      // station (hero) at current lane
      push(); translate(this.stationX, this.laneY(this.lane));
      stroke(GREEN[0], GREEN[1], GREEN[2]); strokeWeight(2); noFill(); rectMode(CENTER); rect(0, 0, this.gap - 8, this.gap - 8, 6);
      const img = this.shell.currentHero && this.shell.currentHero.img;
      if (img && img.width) { imageMode(CENTER); const s = (this.gap * 0.9) / img.height; image(img, -this.swing * 12, 0, img.width * s, img.height * s); }
      else { fill(GREEN[0], GREEN[1], GREEN[2]); noStroke(); circle(0, 0, this.gap * 0.5); }
      pop();
      for (const f of this.fx) { push(); noStroke(); fill(f.col[0], f.col[1], f.col[2], f.life * 255); circle(f.x, f.y, 6); pop(); }
      // progress + how-to hint
      push(); textAlign(CENTER, TOP); noStroke();
      fill(this.shell.accent[0], this.shell.accent[1], this.shell.accent[2]); textSize(20);
      text('SERVED  ' + this.served + ' / ' + TARGET, width / 2, 64);
      fill(MX.medium[0], MX.medium[1], MX.medium[2]); textSize(14);
      text('↑↓ move to a request\'s lane, then SPACE while it\'s in the SERVE ZONE — before it DROPs', width / 2, 92);
      pop();
    }
    drawReq(r) {
      const y = this.laneY(r.lane), a = (r.alpha ?? 1) * 255;
      const col = r.batch ? GOLD : (r.x > this.serveX ? CYAN : ORANGE);
      push(); translate(r.x, y);
      drawingContext.shadowBlur = 8; drawingContext.shadowColor = `rgb(${col[0]},${col[1]},${col[2]})`;
      noFill(); stroke(col[0], col[1], col[2], a); strokeWeight(2); rectMode(CENTER); rect(0, 0, r.w, this.gap * 0.5, 6);
      drawingContext.shadowBlur = 0; noStroke(); fill(col[0], col[1], col[2], a); textAlign(CENTER, CENTER); textSize(13);
      text(r.label, 0, 0);
      // pulsing prompt when this request can be served right now (your lane, inside the zone)
      if (!r.served && r.lane === this.lane && r.x + r.w / 2 > this.serveX && r.x < this.dropX) {
        const pulse = 0.55 + 0.45 * sin(frameCount * 0.2);
        fill(GOLD[0], GOLD[1], GOLD[2], pulse * 255); textSize(15); text('▶ SPACE', 0, -this.gap * 0.34);
      }
      pop();
    }
    handleClick() {}
    get won() { return this._won; }
    get lost() { return false; }
  }

  window.DataHeroesGame = Inference;
})();
