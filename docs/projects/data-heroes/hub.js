// Data Heroes hub — stage registry, tiles, iframe loader, progress tracking.

const STAGES = [
  {
    id: 'data-ingestion', title: 'Data Ingestion', stage: 'Pac-Man',
    desc: 'Gobble raw data from every source across the data lake, dodging corrupt-record ghosts.',
    accent: '#00b4d8', ready: true,
  },
  {
    id: 'data-cleaning', title: 'Data Cleaning', stage: 'Asteroids',
    desc: 'Blast corrupted data — outliers, duplicates, nulls — out of the matrix before it spreads.',
    accent: '#00ff41', ready: true,
  },
  {
    id: 'feature-engineering', title: 'Feature Engineering', stage: 'Tetris',
    desc: 'Stack and combine raw fields into clean, structured feature rows with the tractor beam.',
    accent: '#9d4edd', ready: true,
  },
  {
    id: 'model-training', title: 'Model Training', stage: 'Space Invaders',
    desc: 'Defeat waves of training batches and epochs to drive down loss and converge the model.',
    accent: '#0096c7', ready: true,
  },
  {
    id: 'model-evaluation', title: 'Model Evaluation', stage: 'Boxing',
    desc: 'Your challenger steps into the ring against the reigning champion. Win on the metrics.',
    accent: '#f5e642', ready: true,
  },
  {
    id: 'model-deployment', title: 'Model Deployment', stage: 'Lunar Lander',
    desc: 'Roll out to production without crashing. Manage thrust and fuel for a soft landing.',
    accent: '#ff006e', ready: true,
  },
  {
    id: 'inference', title: 'Inference', stage: 'Diner Dash',
    desc: 'Serve predictions before requests pile up — a live stream and a batch queue to clear.',
    accent: '#fb8500', ready: true,
  },
  {
    id: 'model-monitoring', title: 'Model Monitoring', stage: 'Missile Command',
    desc: 'Intercept drift, anomalies and degradation before they hit production models.',
    accent: '#fb5607', ready: true,
  },
];

const PROGRESS_KEY = 'data-heroes-progress';
let progress = loadProgress();

document.addEventListener('DOMContentLoaded', () => {
  renderTiles();
  renderGallery();
  window.addEventListener('message', onGameMessage);
});

function renderTiles() {
  const root = document.getElementById('pipeline');
  root.innerHTML = '';
  STAGES.forEach((s, i) => {
    const done = progress[s.id]?.completed;
    const best = progress[s.id]?.score || 0;
    const tile = document.createElement('div');
    tile.className = 'tile' + (done ? ' complete' : '');
    tile.style.borderColor = s.accent;
    tile.style.boxShadow = `0 0 22px ${hexA(s.accent, 0.18)}`;
    tile.style.color = s.accent;
    tile.onmouseenter = () => { tile.style.boxShadow = `0 0 30px ${hexA(s.accent, 0.45)}`; };
    tile.onmouseleave = () => { tile.style.boxShadow = `0 0 22px ${hexA(s.accent, 0.18)}`; };
    tile.onclick = () => launch(s);

    const status = s.ready
      ? `<span class="status live" style="color:${s.accent}">${done ? 'Complete · ' + formatScore(best) : 'Playable'}</span>`
      : `<span class="status" style="color:#5a7a5a">Building…</span>`;

    tile.innerHTML = `
      <div class="order" style="color:${s.accent}">STAGE ${String(i + 1).padStart(2, '0')}</div>
      <h2>${s.title}</h2>
      <div class="stage">${s.stage}</div>
      <p>${s.desc}</p>
      ${status}`;
    root.appendChild(tile);
  });
}

function renderGallery() {
  const g = document.getElementById('gallery');
  g.innerHTML = '';
  HERO_ROSTER.forEach(h => {
    const img = document.createElement('img');
    img.src = h.face;
    img.alt = h.name;
    img.title = h.name;
    g.appendChild(img);
  });
}

function launch(stage) {
  if (!stage.ready) { toast(`${stage.title} is still being built`); return; }
  const frame = document.getElementById('game-frame');
  frame.src = `games/${stage.id}.html`;
  frame.style.display = 'block';
  frame.focus();
}

function onGameMessage(e) {
  if (!e.data || e.data.type !== 'gameComplete') return;
  const { game, score, completed } = e.data;
  const frame = document.getElementById('game-frame');
  frame.style.display = 'none';
  frame.src = '';

  if (completed) {
    const prev = progress[game]?.score || 0;
    progress[game] = { completed: true, score: Math.max(prev, score || 0) };
    saveProgress();
    renderTiles();
    const s = STAGES.find(x => x.id === game);
    toast(`${s ? s.title : 'Stage'} complete!`);
  }
}

// --- helpers ---
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function loadProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; }
  catch { return {}; }
}
function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}
let toastTimer = null;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2600);
}
