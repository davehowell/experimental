// Data Heroes — shared utilities (p5 global mode).
// Matrix palette, hero roster, matrix-rain + firework effects, hub messaging.

const MX = {
  bright: [0, 255, 65],
  medium: [0, 204, 51],
  dark:   [0, 136, 34],
  dim:    [0, 68, 17],
};

// Absolute URL of the shared/ directory, derived from this script's own location so
// asset paths resolve identically from the hub (./) and from games/ (one level deeper),
// locally and on GitHub Pages.
const SHARED_BASE = (function () {
  const s = document.currentScript && document.currentScript.src;
  return s ? s.replace(/[^/]*$/, '') : 'shared/';
})();

// Heroes available across all games. Add team members here once and every game gets them.
// `facing` = the horizontal direction the sprite naturally looks (1 = right, -1 = left). The two
// sprites are a mirror pair, so games must consult this before flipping for a desired direction.
const HERO_ROSTER = [
  { name: 'DAVE',  img: SHARED_BASE + 'sprites/Dave.png',  face: SHARED_BASE + 'sprites/Dave_face.png',  facing: 1  },
  { name: 'NADYA', img: SHARED_BASE + 'sprites/Nadya.png', face: SHARED_BASE + 'sprites/Nadya_face.png', facing: -1 },
];

// Pad a score with leading zeros for the arcade look.
function formatScore(score) {
  return Math.max(0, Math.floor(score)).toString().padStart(7, '0');
}

// Draw glowing text using the current p5 fill; restores state afterwards.
function glowText(str, x, y, size, col) {
  push();
  const c = col || MX.bright;
  textAlign(CENTER, CENTER);
  textSize(size);
  drawingContext.shadowBlur = size * 0.6;
  drawingContext.shadowColor = `rgb(${c[0]},${c[1]},${c[2]})`;
  fill(c[0], c[1], c[2]);
  noStroke();
  text(str, x, y);
  pop();
}

// Notify the hub (parent frame) that a game ended. completed=true marks the stage done.
function sendToHub(gameId, score, completed) {
  const msg = { type: 'gameComplete', game: gameId, score: score || 0, completed: !!completed };
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(msg, '*');
  } else {
    // Standalone fallback: games live in games/<id>.html, hub is one level up.
    window.location.href = '../index.html';
  }
}

// --- Matrix rain background -------------------------------------------------
const MATRIX_CHARS =
  'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

class MatrixSymbol {
  constructor(x, y, speed, first, opacity, size) {
    this.x = x; this.y = y;
    this.speed = speed; this.first = first;
    this.opacity = opacity; this.size = size;
    this.switchInterval = Math.round(Math.random() * 22 + 8);
    this.pick();
  }
  pick() { this.value = MATRIX_CHARS.charAt(Math.floor(Math.random() * MATRIX_CHARS.length)); }
  render() {
    push();
    const c = this.first ? [180, 255, 200] : MX.medium;
    fill(c[0], c[1], c[2], this.opacity);
    noStroke();
    textSize(this.size);
    textAlign(CENTER, CENTER);
    text(this.value, this.x, this.y);
    pop();
    this.y = this.y >= height + this.size ? -this.size : this.y + this.speed;
    if (frameCount % this.switchInterval === 0) this.pick();
  }
}

class MatrixStream {
  constructor(x, size) {
    this.x = x; this.size = size;
    this.symbols = [];
    this.total = Math.round(Math.random() * 20 + 10);
    this.speed = Math.random() * 4 + 2;
    this.baseOpacity = Math.random() * 120 + 60;
    let y = Math.random() * -height * 0.5;
    const step = this.baseOpacity / this.total;
    for (let i = 0; i < this.total; i++) {
      this.symbols.push(new MatrixSymbol(this.x, y, this.speed, i === 0,
        Math.max(20, this.baseOpacity - i * step), this.size));
      y -= this.size * (Math.random() * 0.2 + 0.9);
    }
  }
  render() { this.symbols.forEach(s => s.render()); }
}

class MatrixRain {
  constructor(symbolSize = 18, density = 0.6) {
    this.size = symbolSize;
    this.streams = [];
    const cols = Math.floor((width / symbolSize) * density);
    for (let i = 0; i < cols; i++) {
      this.streams.push(new MatrixStream(Math.random() * width, symbolSize));
    }
  }
  render() {
    push();
    for (const s of this.streams) s.render();
    pop();
  }
}

// --- Fireworks (victory celebration) --------------------------------------
class Firework {
  constructor(x, y, hue) {
    this.particles = [];
    const col = hue || [Math.random() * 255, 255, Math.random() * 120 + 120];
    const n = Math.floor(Math.random() * 30 + 40);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 6 + 1;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 1, decay: Math.random() * 0.015 + 0.008,
        size: Math.random() * 3 + 1, col,
      });
    }
  }
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.06; // gravity
      p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
  render() {
    push();
    noStroke();
    for (const p of this.particles) {
      fill(p.col[0], p.col[1], p.col[2], p.life * 255);
      circle(p.x, p.y, p.size * 2);
    }
    pop();
  }
  get dead() { return this.particles.length === 0; }
}
