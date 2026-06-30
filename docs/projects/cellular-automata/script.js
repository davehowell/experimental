(function () {
  "use strict";
  var themes = {
    green:  { bg: "#001100", cell: "#00ff00", ui: "#00cc00" },
    orange: { bg: "#110800", cell: "#ff8800", ui: "#cc6600" },
    white:  { bg: "#000000", cell: "#ffffff", ui: "#cccccc" },
    amber:  { bg: "#0f0a00", cell: "#ffaa00", ui: "#cc8800" },
    pink:   { bg: "#1a0014", cell: "#ff2a6d", ui: "#b81e4e" },
    cyan:   { bg: "#001417", cell: "#05d9e8", ui: "#048c96" },
    blue:   { bg: "#00081a", cell: "#3d8bff", ui: "#2456a6" },
    purple: { bg: "#14001a", cell: "#c724ff", ui: "#8016a6" }
  };
  var patterns = {
    single:  { name: "SINGLE CELL", cells: [[0,0]] },
    glider:  { name: "GLIDER",  cells: [[1,0],[2,1],[0,2],[1,2],[2,2]] },
    blinker: { name: "BLINKER", cells: [[-1,0],[0,0],[1,0]] },
    block:   { name: "BLOCK",   cells: [[0,0],[1,0],[0,1],[1,1]] },
    beacon:  { name: "BEACON",  cells: [[0,0],[1,0],[0,1],[3,2],[2,3],[3,3]] },
    toad:    { name: "TOAD",    cells: [[1,0],[2,0],[3,0],[0,1],[1,1],[2,1]] },
    pulsar:  { name: "PULSAR",  cells: [
      [-6,-4],[-5,-4],[-4,-4],[-2,-4],[-1,-4],[0,-4],
      [-6,-2],[-1,-2],[0,-2],[-6,-1],[-1,-1],[0,-1],
      [-6,0],[-5,0],[-4,0],[-2,0],[-1,0],[0,0],
      [-4,-6],[-4,-5],[-2,-6],[-2,-5],[0,-6],[0,-5],
      [-4,2],[-4,1],[-2,2],[-2,1],[0,2],[0,1],
      [-6,2],[-5,2],[-2,2],[-1,2],[0,2],
      [-6,4],[-1,4],[0,4],[-6,5],[-1,5],[0,5],
      [-6,6],[-5,6],[-4,6],[-2,6],[-1,6],[0,6]
    ]}
  };
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var state = {
    cellSize: 6, speed: 100, generation: 0, running: false,
    theme: "green", rule: "life", pattern: "single", drawing: false,
    grid: [], gw: 0, gh: 0, timer: null
  };
  function emptyGrid(w, h) {
    var g = new Array(h);
    for (var y = 0; y < h; y++) g[y] = new Array(w).fill(0);
    return g;
  }
  function applyTheme() {
    var t = themes[state.theme];
    document.documentElement.style.setProperty("--bg", t.bg);
    document.documentElement.style.setProperty("--cell", t.cell);
    document.documentElement.style.setProperty("--ui", t.ui);
  }
  function resize() {
    var wrap = document.getElementById("canvas-wrap");
    var w = Math.max(200, wrap.clientWidth - 16);
    var h = Math.max(150, wrap.clientHeight - 16);
    canvas.width = w; canvas.height = h;
    var newGw = Math.floor(w / state.cellSize);
    var newGh = Math.floor(h / state.cellSize);
    var old = state.grid, oldGw = state.gw, oldGh = state.gh;
    var fresh = emptyGrid(newGw, newGh);
    if (old.length) {
      var copyH = Math.min(oldGh, newGh), copyW = Math.min(oldGw, newGw);
      for (var y = 0; y < copyH; y++)
        for (var x = 0; x < copyW; x++) fresh[y][x] = old[y][x];
    }
    state.grid = fresh; state.gw = newGw; state.gh = newGh;
    document.getElementById("griddim").textContent = newGw + " × " + newGh;
    draw();
  }
  function countNeighbors(grid, x, y, sts) {
    var count = 0;
    for (var dy = -1; dy <= 1; dy++)
      for (var dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < state.gw && ny >= 0 && ny < state.gh)
          if (sts.indexOf(grid[ny][nx]) !== -1) count++;
      }
    return count;
  }
  function stepLife(grid) {
    var ng = emptyGrid(state.gw, state.gh);
    for (var y = 0; y < state.gh; y++)
      for (var x = 0; x < state.gw; x++) {
        var n = countNeighbors(grid, x, y, [1]);
        ng[y][x] = grid[y][x] === 1 ? ((n === 2 || n === 3) ? 1 : 0) : (n === 3 ? 1 : 0);
      }
    return ng;
  }
  function stepBrian(grid) {
    var ng = emptyGrid(state.gw, state.gh);
    for (var y = 0; y < state.gh; y++)
      for (var x = 0; x < state.gw; x++) {
        if (grid[y][x] === 0) ng[y][x] = (countNeighbors(grid, x, y, [1]) === 2) ? 1 : 0;
        else if (grid[y][x] === 1) ng[y][x] = 2;
        else ng[y][x] = 0;
      }
    return ng;
  }
  function stepGeneration() {
    state.grid = state.rule === "brian" ? stepBrian(state.grid) : stepLife(state.grid);
    state.generation++;
    document.getElementById("gen").textContent = state.generation;
    draw();
  }
  function draw() {
    var t = themes[state.theme], cs = state.cellSize;
    ctx.fillStyle = t.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (var y = 0; y < state.gh; y++) {
      var row = state.grid[y]; if (!row) continue;
      for (var x = 0; x < state.gw; x++)
        if (row[x] > 0) {
          ctx.fillStyle = (state.rule === "brian" && row[x] === 2) ? t.ui : t.cell;
          ctx.fillRect(x * cs, y * cs, cs - 1, cs - 1);
        }
    }
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    for (var sy = 0; sy < canvas.height; sy += 2) ctx.fillRect(0, sy, canvas.width, 1);
  }
  function placePattern(cx, cy, key) {
    var p = patterns[key]; if (!p) return;
    for (var i = 0; i < p.cells.length; i++) {
      var x = cx + p.cells[i][0], y = cy + p.cells[i][1];
      if (x >= 0 && x < state.gw && y >= 0 && y < state.gh) state.grid[y][x] = 1;
    }
    draw();
  }
  function eventCell(e) {
    var rect = canvas.getBoundingClientRect(), cx, cy;
    if (e.touches && e.touches.length) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
    else { cx = e.clientX; cy = e.clientY; }
    var px = (cx - rect.left) * (canvas.width / rect.width);
    var py = (cy - rect.top) * (canvas.height / rect.height);
    return { x: Math.floor(px / state.cellSize), y: Math.floor(py / state.cellSize) };
  }
  function paint(e) {
    if (!state.drawing) return;
    e.preventDefault();
    var c = eventCell(e);
    if (c.x < 0 || c.x >= state.gw || c.y < 0 || c.y >= state.gh) return;
    if (state.pattern === "single") { state.grid[c.y][c.x] = 1; draw(); }
    else placePattern(c.x, c.y, state.pattern);
  }
  function startPaint(e) { state.drawing = true; e.preventDefault(); paint(e); }
  function endPaint() { state.drawing = false; }
  canvas.addEventListener("mousedown", startPaint);
  canvas.addEventListener("mousemove", paint);
  window.addEventListener("mouseup", endPaint);
  canvas.addEventListener("mouseleave", endPaint);
  canvas.addEventListener("touchstart", startPaint, { passive: false });
  canvas.addEventListener("touchmove", paint, { passive: false });
  canvas.addEventListener("touchend", endPaint);
  canvas.addEventListener("touchcancel", endPaint);
  function setRunning(run) {
    state.running = run;
    document.getElementById("status").textContent = run ? "RUNNING" : "PAUSED";
    document.getElementById("play").textContent = run ? "PAUSE" : "PLAY";
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    if (run) state.timer = setInterval(stepGeneration, state.speed);
  }
  document.getElementById("play").onclick = function () { setRunning(!state.running); };
  document.getElementById("step").onclick = function () { stepGeneration(); };
  document.getElementById("clear").onclick = function () {
    state.grid = emptyGrid(state.gw, state.gh); state.generation = 0;
    document.getElementById("gen").textContent = "0"; setRunning(false); draw();
  };
  document.getElementById("random").onclick = function () {
    for (var y = 0; y < state.gh; y++)
      for (var x = 0; x < state.gw; x++) state.grid[y][x] = Math.random() < 0.3 ? 1 : 0;
    state.generation = 0; document.getElementById("gen").textContent = "0"; draw();
  };
  var speedEl = document.getElementById("speed");
  speedEl.oninput = function () {
    state.speed = Number(speedEl.value);
    document.getElementById("speedval").textContent = state.speed;
    if (state.running) setRunning(true);
  };
  var sizeEl = document.getElementById("size");
  sizeEl.oninput = function () {
    state.cellSize = Number(sizeEl.value);
    document.getElementById("sizeval").textContent = state.cellSize; resize();
  };
  var patternSel = document.getElementById("pattern");
  Object.keys(patterns).forEach(function (key) {
    var o = document.createElement("option");
    o.value = key; o.textContent = patterns[key].name; patternSel.appendChild(o);
  });
  patternSel.onchange = function () {
    state.pattern = patternSel.value;
    document.getElementById("modename").textContent = patterns[state.pattern].name;
  };
  document.getElementById("rule").onchange = function (e) { state.rule = e.target.value; };
  document.getElementById("theme").onchange = function (e) {
    state.theme = e.target.value; applyTheme(); draw();
  };
  document.getElementById("qglider").onclick = function () {
    placePattern(Math.floor(state.gw / 4), Math.floor(state.gh / 4), "glider");
  };
  document.getElementById("qpulsar").onclick = function () {
    placePattern(Math.floor(state.gw / 2), Math.floor(state.gh / 2), "pulsar");
  };
  document.getElementById("toggle").onclick = function () {
    var c = document.getElementById("controls");
    c.classList.toggle("collapsed");
    document.getElementById("toggle").innerHTML = c.classList.contains("collapsed") ? "&#9650;" : "&#9660;";
    setTimeout(resize, 320);
  };
  applyTheme();
  var rt;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(resize, 150); });
  window.addEventListener("orientationchange", function () { setTimeout(resize, 300); });
  resize();
})();
