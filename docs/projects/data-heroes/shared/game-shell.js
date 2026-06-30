// Data Heroes — GameShell (p5 global mode).
//
// Owns ALL chrome so a game only has to implement mechanics:
//   class MyGame {
//     constructor(shell) { this.shell = shell; }
//     setup() {}                 // init; canvas already exists
//     update() {}                // advance one frame (state === 'playing')
//     render() {}                // draw the game
//     handleKey(keyCode, key) {} // gameplay input (state === 'playing')
//     handleKeyReleased(keyCode, key) {}  // optional
//     resize() {}                // optional, on window resize
//     reset() {}                 // restart to a fresh game
//     get won() {}               // true => victory
//     get lost() {}              // true => game over
//   }
//   new GameShell(MyGame, { id, title, phase, accent, ... }).start();

// The active shell. p5's global hooks (declared at the bottom) delegate here.
let ACTIVE = null;

class GameShell {
  constructor(GameClass, config) {
    this.GameClass = GameClass;
    this.config = Object.assign({
      id: 'game',
      title: 'GAME',
      phase: 'PHASE',
      accent: MX.bright,            // RGB triple for stage colour
      lives: 3,
      showLives: true,
      matrixRain: true,
      controls: 'ARROWS move · SPACE action',
      victoryTitle: 'STAGE COMPLETE',
      gameOverTitle: 'GAME OVER',
      width: null, height: null,    // default: fill window
    }, config);

    this.state = 'playing';         // playing | paused | heroSwap | victory | gameOver
    this.score = 0;
    this.lives = this.config.lives;
    this.heroes = [];
    this.selectedHero = 0;
    this.game = null;
    this.rain = null;
    this.fireworks = [];
  }

  // Register this instance as the active shell. The hoisted global p5 hooks
  // (declared at the bottom of this file) delegate to it.
  start() {
    ACTIVE = this;
    window.shell = this;   // debug/verification hook
  }

  // ---- p5 lifecycle ----
  _preload() {
    this.heroes = HERO_ROSTER.map(h => ({
      name: h.name,
      img: loadImage(h.img),
      face: loadImage(h.face),
      facing: h.facing || 1,
    }));
  }

  _setup() {
    const w = this.config.width || windowWidth;
    const h = this.config.height || windowHeight;
    createCanvas(w, h);
    textFont('Courier New');
    if (this.config.matrixRain) this.rain = new MatrixRain();
    this.game = new this.GameClass(this);
    this.game.setup();
  }

  _draw() {
    background(0);
    if (this.rain) this.rain.render();

    switch (this.state) {
      case 'playing':
        this.game.update();
        this.game.render();
        if (this.game.won === true) { this._enterVictory(); }
        else if (this.game.lost === true || this.lives <= 0) { this.state = 'gameOver'; }
        this._drawHUD();
        break;
      case 'paused':
        this.game.render();
        this._drawHUD();
        this._overlay();
        this._drawPauseMenu();
        break;
      case 'heroSwap':
        this.game.render();
        this._drawHUD();
        this._overlay();
        this._drawHeroSwap();
        break;
      case 'victory':
        this.game.render();
        this._overlay(170);
        this._stepFireworks();
        this._drawVictory();
        break;
      case 'gameOver':
        this.game.render();
        this._overlay(190);
        this._drawGameOver();
        break;
    }
  }

  // ---- API for games ----
  get currentHero() { return this.heroes[this.selectedHero]; }
  get accent() { return this.config.accent; }
  // Horizontal scale to make the current hero face `dir` (1 right, -1 left), given its base facing.
  // Use as: scale(shell.faceScale(dir), 1) before drawing currentHero.img.
  faceScale(dir) { const f = (this.currentHero && this.currentHero.facing) || 1; return (dir < 0 ? -1 : 1) * f; }
  addScore(n) { this.score += n; }
  loseLife() { this.lives = Math.max(0, this.lives - 1); }

  // ---- state transitions ----
  _enterVictory() {
    if (this.state === 'victory') return;
    this.state = 'victory';
    this.fireworks = [];
    for (let i = 0; i < 4; i++) {
      this.fireworks.push(new Firework(random(width * 0.2, width * 0.8), random(height * 0.2, height * 0.5)));
    }
  }
  restart() {
    this.score = 0;
    this.lives = this.config.lives;
    this.fireworks = [];
    this.game.reset();
    this.state = 'playing';
  }
  toHub(completed) { sendToHub(this.config.id, this.score, completed); }

  // ---- input ----
  _keyPressed() {
    const k = key, kc = keyCode;
    if (this.state === 'playing') {
      if (k === 'p' || k === 'P' || kc === ESCAPE) { this.state = 'paused'; return false; }
      this.game.handleKey(kc, k);
      if ([LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(kc) || k === ' ') return false;
    } else if (this.state === 'paused') {
      if (kc === ENTER || kc === RETURN || kc === ESCAPE) this.state = 'playing';
      else if (k === 'h' || k === 'H') this.state = 'heroSwap';
      else if (k === 'r' || k === 'R') this.restart();
      else if (k === 'm' || k === 'M') this.toHub(false);
      return false;
    } else if (this.state === 'heroSwap') {
      if (kc === LEFT_ARROW) this.selectedHero = (this.selectedHero - 1 + this.heroes.length) % this.heroes.length;
      else if (kc === RIGHT_ARROW) this.selectedHero = (this.selectedHero + 1) % this.heroes.length;
      else if (kc === ENTER || kc === RETURN) this.state = 'playing';
      else if (kc === ESCAPE) this.state = 'paused';
      return false;
    } else if (this.state === 'victory') {
      if (k === 'r' || k === 'R') this.restart();
      else if (k === 'm' || k === 'M' || kc === ENTER || kc === RETURN || kc === ESCAPE) this.toHub(true);
      return false;
    } else if (this.state === 'gameOver') {
      if (k === 'r' || k === 'R') this.restart();
      else if (k === 'm' || k === 'M' || kc === ESCAPE) this.toHub(false);
      return false;
    }
  }

  _keyReleased() {
    if (this.state === 'playing' && typeof this.game.handleKeyReleased === 'function') {
      this.game.handleKeyReleased(keyCode, key);
    }
  }

  _mousePressed() {
    if (this.state === 'playing' && typeof this.game.handleClick === 'function') {
      this.game.handleClick(mouseX, mouseY);
    } else if ((this.state === 'victory' || this.state === 'gameOver') && typeof this.game.handleClick !== 'function') {
      // allow click-to-advance on end screens for games without their own click handling
    }
  }

  _windowResized() {
    if (this.config.width && this.config.height) return;
    resizeCanvas(windowWidth, windowHeight);
    if (this.config.matrixRain) this.rain = new MatrixRain();
    if (typeof this.game.resize === 'function') this.game.resize();
  }

  // ---- chrome rendering ----
  _overlay(alpha = 150) {
    push();
    noStroke();
    fill(0, 0, 0, alpha);
    rect(0, 0, width, height);
    pop();
  }

  _drawHUD() {
    const a = this.accent;
    push();
    textFont('Courier New');
    noStroke();
    // Score (top-left)
    textAlign(LEFT, TOP);
    textSize(20);
    fill(MX.medium[0], MX.medium[1], MX.medium[2]);
    text('SCORE', 24, 20);
    fill(a[0], a[1], a[2]);
    textSize(26);
    text(formatScore(this.score), 24, 42);

    // Phase (top-center)
    textAlign(CENTER, TOP);
    glowText('// ' + this.config.phase, width / 2, 24, 22, a);

    // Lives + hero (top-right)
    textAlign(RIGHT, TOP);
    let rx = width - 24;
    if (this.config.showLives) {
      fill(a[0], a[1], a[2]);
      textSize(22);
      text('♥ '.repeat(Math.max(0, this.lives)).trim() || '—', rx, 20);
    }
    fill(MX.medium[0], MX.medium[1], MX.medium[2]);
    textSize(18);
    const hero = this.currentHero;
    text('HERO: ' + (hero ? hero.name : '—'), rx, this.config.showLives ? 48 : 22);

    // Controls help (bottom-left)
    textAlign(LEFT, BOTTOM);
    textSize(14);
    fill(MX.dark[0], MX.dark[1], MX.dark[2]);
    text(this.config.controls + '   ·   P pause', 24, height - 18);
    pop();
  }

  _drawPauseMenu() {
    const a = this.accent;
    push();
    textAlign(CENTER, CENTER);
    glowText('PAUSED', width / 2, height / 2 - 120, 56, a);
    const rows = [
      ['ENTER', 'Continue'],
      ['H', 'Change Hero'],
      ['R', 'Restart'],
      ['M', 'Main Menu'],
    ];
    textFont('Courier New');
    let y = height / 2 - 30;
    for (const [key_, label] of rows) {
      fill(a[0], a[1], a[2]); textSize(24); textAlign(RIGHT, CENTER);
      text(key_, width / 2 - 20, y);
      fill(MX.medium[0], MX.medium[1], MX.medium[2]); textAlign(LEFT, CENTER);
      text(label, width / 2 + 20, y);
      y += 46;
    }
    pop();
  }

  _drawHeroSwap() {
    const a = this.accent;
    push();
    textAlign(CENTER, CENTER);
    glowText('CHOOSE YOUR HERO', width / 2, height / 2 - 160, 40, a);

    const n = this.heroes.length;
    const slot = 160;
    const startX = width / 2 - ((n - 1) * slot) / 2;
    for (let i = 0; i < n; i++) {
      const h = this.heroes[i];
      const x = startX + i * slot;
      const y = height / 2 - 10;
      const sel = i === this.selectedHero;
      const box = sel ? 130 : 110;
      push();
      noFill();
      stroke(sel ? a : MX.dark);
      strokeWeight(sel ? 4 : 2);
      rectMode(CENTER);
      rect(x, y, box, box, 8);
      if (h.face) { imageMode(CENTER); image(h.face, x, y, box - 12, box - 12); }
      noStroke();
      fill(sel ? a : MX.medium);
      textAlign(CENTER, TOP);
      textSize(sel ? 22 : 18);
      text(h.name, x, y + box / 2 + 12);
      pop();
    }
    fill(MX.medium[0], MX.medium[1], MX.medium[2]);
    textAlign(CENTER, CENTER);
    textSize(18);
    text('← →  select      ENTER  confirm      ESC  back', width / 2, height / 2 + 150);
    pop();
  }

  _stepFireworks() {
    if (frameCount % 35 === 0) {
      this.fireworks.push(new Firework(random(width * 0.15, width * 0.85), random(height * 0.15, height * 0.55)));
    }
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      this.fireworks[i].update();
      this.fireworks[i].render();
      if (this.fireworks[i].dead) this.fireworks.splice(i, 1);
    }
  }

  _drawVictory() {
    const a = this.accent;
    push();
    textAlign(CENTER, CENTER);
    glowText(this.config.victoryTitle, width / 2, height / 2 - 60, 60, a);
    fill(MX.medium[0], MX.medium[1], MX.medium[2]);
    textSize(28);
    text('SCORE  ' + formatScore(this.score), width / 2, height / 2 + 10);
    fill(MX.dark[0], MX.dark[1], MX.dark[2]);
    textSize(20);
    text('R  replay        M / ENTER  next stage', width / 2, height / 2 + 70);
    pop();
  }

  _drawGameOver() {
    push();
    textAlign(CENTER, CENTER);
    glowText(this.config.gameOverTitle, width / 2, height / 2 - 50, 60, [255, 70, 70]);
    fill(MX.medium[0], MX.medium[1], MX.medium[2]);
    textSize(26);
    text('SCORE  ' + formatScore(this.score), width / 2, height / 2 + 14);
    fill(MX.dark[0], MX.dark[1], MX.dark[2]);
    textSize(20);
    text('R  retry        M  main menu', width / 2, height / 2 + 66);
    pop();
  }
}

// Hoisted global p5 hooks — present before p5 boots, delegate to the active shell.
function preload()       { if (ACTIVE) ACTIVE._preload(); }
function setup()         { if (ACTIVE) ACTIVE._setup(); }
function draw()          { if (ACTIVE) ACTIVE._draw(); }
function keyPressed()    { return ACTIVE ? ACTIVE._keyPressed() : undefined; }
function keyReleased()   { if (ACTIVE) ACTIVE._keyReleased(); }
function mousePressed()  { if (ACTIVE) ACTIVE._mousePressed(); }
function windowResized() { if (ACTIVE) ACTIVE._windowResized(); }
