// Data Heroes hub — matrix rain background (p5 global mode).
let hubRain;

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.id('matrix-bg');
  textFont('Courier New');
  hubRain = new MatrixRain(18, 0.5);
}

function draw() {
  background(0, 45);          // low-alpha clear leaves faint matrix trails
  hubRain.render();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  hubRain = new MatrixRain(18, 0.5);
}
