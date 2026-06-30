# Data Heroes — the MLOps pipeline as a retro arcade

Eight Matrix-themed p5.js mini-games, one per ML-engineering stage. Pure static (no build step);
deployed as part of the [experimental](../../../) GitHub Pages site.

| # | Stage | Game | File |
|---|-------|------|------|
| 1 | Data Ingestion | Pac-Man | `games/data-ingestion.*` |
| 2 | Data Cleaning | Asteroids | `games/data-cleaning.*` |
| 3 | Feature Engineering | Tetris | `games/feature-engineering.*` |
| 4 | Model Training | Space Invaders | `games/model-training.*` |
| 5 | Model Evaluation (champion/challenger) | Boxing | `games/model-evaluation.*` |
| 6 | Model Deployment | Lunar Lander | `games/model-deployment.*` |
| 7 | Inference (live/batch) | Diner Dash conveyor | `games/inference.*` |
| 8 | Model Monitoring | Missile Command | `games/model-monitoring.*` |

## Architecture

The hub (`index.html` + `hub.js` + `hub-sketch.js`) is a data-driven grid of tiles (`STAGES` in
`hub.js`) that loads each game into an iframe and tracks completion via `postMessage` + localStorage.

Every game runs on a shared **`GameShell`** (`shared/game-shell.js`) which owns *all* the chrome:
state machine (`playing/paused/heroSwap/victory/gameOver`), hero system, pause menu, hero-swap,
victory/fireworks, game-over, HUD, input routing (keyboard + mouse), and return-to-hub. p5 runs in
global mode; the shell exposes hoisted `setup/draw/keyPressed/...` delegators bound to the active
instance.

`shared/shared.js` holds reusable bits: the Matrix palette, matrix-rain, fireworks, the hero roster
(paths derived from `SHARED_BASE` so assets resolve from any page depth and on Pages), and
`sendToHub()`.

## Adding / editing a game

A game is a single class implementing this interface, given the shell:

```js
class MyGame {
  constructor(shell) { this.shell = shell; }
  setup() {}                  // canvas already exists
  update() {}                 // one frame of logic (state === 'playing')
  render() {}                 // draw the game
  handleKey(keyCode, key) {}  // discrete key input
  handleClick(x, y) {}        // optional mouse
  reset() {}                  // restart
  get won() {}  get lost() {} // end conditions
}
window.DataHeroesGame = MyGame;
```

Use `shell.addScore(n)`, `shell.loseLife()`, `shell.lives`, `shell.currentHero`, `shell.accent`.
Continuous input via p5 `keyIsDown(...)` inside `update()`; discrete via `handleKey`.

Then a thin `games/<id>.html` loads p5 + `shared.js` + `game-shell.js` + the game, and bootstraps
`new GameShell(window.DataHeroesGame, { id, phase, accent, ... }).start();`. Add a `STAGES` entry in
`hub.js` (`ready: true`).

## Run locally

```bash
cd docs && python3 -m http.server 8000
# http://localhost:8000/projects/data-heroes/
```

## Controls

Arrows / SPACE (per game) · **P / ESC** pause · in pause: **ENTER** continue, **H** hero, **R**
restart, **M** main menu · end screens: **R** replay, **M** menu.
