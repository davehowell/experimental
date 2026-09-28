"use strict";

const stages = [
  {
    name: "Intent",
    copy: "Define product behavior, design references, architectural constraints and acceptance criteria. Retrieve a versioned specification from Jira, GitHub Issues, Linear or another backend.",
    output: "Specification and acceptance criteria",
  },
  {
    name: "Build",
    copy: "A reasoning agent plans and implements a scoped change in an isolated environment. It can generate code and automation, with bounded permissions, tool access and retries.",
    output: "Candidate revision and execution trace",
  },
  {
    name: "Verify",
    copy: "Run lint, types, static analysis, unit tests, contracts and integration tests. Check behavior against independently curated acceptance fixtures. Return failures to the agent for repair.",
    output: "Test and analysis results for this revision",
  },
  {
    name: "Review",
    copy: "Use narrow inference for triage and reasoning for ambiguous behavior. When useful, independent correctness, architecture and security reviewers produce findings for an arbiter to reconcile.",
    output: "Evaluation results and resolved findings",
  },
  {
    name: "Attest",
    copy: "Build in a trusted runner. Bind the source revision, artifact digest and required evidence. Verify provenance and release policy. A changed revision must be checked again.",
    output: "Artifact with verified provenance",
  },
  {
    name: "Release",
    copy: "Promote the same artifact through staging and canary deployment. Compare runtime signals with defined thresholds. Expand a healthy rollout or restore the previous artifact and open a repair task.",
    output: "Reliable software running in production",
  },
];
const evidenceNames = ["Intent", "Checks", "Review", "Provenance", "Canary"];
const checkpoint = (stage, title, copy, evidence, extra = {}) => ({
  stage,
  title,
  copy,
  evidence,
  ...extra,
});
const intent = checkpoint(
  0,
  "Load the specification",
  "Read acceptance criteria, design references and risk limits from the selected spec backend. Jira, GitHub Issues, Linear and repository documents are interchangeable inputs.",
  [],
);
const build = checkpoint(
  1,
  "Implement the change",
  "The agent retrieves relevant context and builds a candidate revision in an isolated workspace. Tool permissions and retry limits come from the harness.",
  [0],
);
const verify = checkpoint(
  2,
  "Run deterministic checks",
  "Lint, types, security analysis, contract tests and acceptance tests pass for this revision. Failures return actionable diagnostics to the build agent.",
  [0, 1],
);
const review = checkpoint(
  3,
  "Review and evaluate",
  "Selected reviewers assess correctness, architecture and security in parallel. An arbiter reconciles findings. Evaluation uses curated tasks and acceptance criteria.",
  [0, 1],
);
const reviewed = checkpoint(
  3,
  "Resolve required findings",
  "Required findings are resolved and evaluation thresholds are met. Structured output validation checks report shape; the evaluation checks the substance.",
  [0, 1, 2],
);
const attest = checkpoint(
  4,
  "Verify build provenance",
  "A trusted build binds source revision, builder and artifact digest. Release policy verifies the provenance and required evidence for this exact artifact.",
  [0, 1, 2, 3],
);
const canary = checkpoint(
  5,
  "Deploy a canary",
  "Promote the same artifact through staging to limited production traffic. Hold wider rollout until the configured observation window and health checks pass.",
  [0, 1, 2, 3],
);
const released = checkpoint(
  6,
  "Promote to production",
  "The canary meets the service thresholds. Expand the rollout and continue monitoring availability, errors and latency. Product feedback informs the next change.",
  [0, 1, 2, 3, 4],
  { terminal: "promoted" },
);
const failed = checkpoint(
  2,
  "Contract test failed",
  "The response shape breaks an existing caller. Stop promotion and send the failing contract and diagnostics back to the build agent.",
  [0],
  { problem: true, failed: 1 },
);
const repair = checkpoint(
  1,
  "Repair the contract",
  "The agent restores compatibility and adds a regression test. The revised code must pass verification again. Retry 1 of 2.",
  [0],
  { route: "repair" },
);
const hold = checkpoint(
  4,
  "Missing provenance: hold the artifact",
  "Tests and reviews passed, but the artifact has no verifiable build provenance. Policy blocks deployment and requests a trusted rebuild.",
  [0, 1, 2],
  { problem: true, failed: 3, terminal: "held" },
);
const regression = checkpoint(
  5,
  "Canary health check failed",
  "The error rate exceeds the configured threshold. Stop the rollout and restore the previous known-good artifact.",
  [0, 1, 2, 3],
  { problem: true, failed: 4 },
);
const rollback = checkpoint(
  1,
  "Previous version restored",
  "Production runs the previous artifact. A repair task carries the runtime evidence back to the agent. The failed candidate remains blocked from promotion.",
  [0],
  { problem: true, route: "rollback", terminal: "rolled-back" },
);
const scenarios = {
  clean: [intent, build, verify, review, reviewed, attest, canary, released],
  repair: [
    intent,
    build,
    failed,
    repair,
    verify,
    review,
    reviewed,
    attest,
    canary,
    released,
  ],
  hold: [intent, build, verify, review, reviewed, hold],
  rollback: [
    intent,
    build,
    verify,
    review,
    reviewed,
    attest,
    canary,
    regression,
    rollback,
  ],
};
const executionTypes = [
  [
    "Deterministic",
    "Use code for repeatable rules: lint, type checks, tests, schema validation, provenance verification and deployment policy.",
  ],
  [
    "Narrow inference",
    "Use a bounded model call for classification or structured findings. Its output remains probabilistic, even when it conforms to a schema.",
  ],
  [
    "Reasoning agent",
    "Use planning, tool calls and feedback for implementation, diagnosis and tasks with an uncertain sequence of actions.",
  ],
  [
    "Parallel review",
    "Fan out to relevant independent lenses, then reconcile evidence. Measure the benefit: more reviewers can add correlated errors and cost.",
  ],
];
const evolution = [
  [
    "Prompt engineering",
    "Specify the task, expected behavior and constraints.",
  ],
  [
    "Context engineering",
    "Supply relevant specifications, code, architecture, tools and current feedback.",
  ],
  [
    "Harness engineering",
    "Provide the execution environment, checks, permissions and bounded repair loops.",
  ],
  [
    "Agentic workflows",
    "Compose automation and model calls into a delivery system with explicit promotion and recovery rules.",
  ],
];
const sources = [
  {
    by: "01 / BIRGITTA BÖCKELER · MARTINFOWLER.COM",
    title: "Harness engineering for coding agent users",
    copy: "Guides shape work before execution; sensors return evidence afterward. Humans steer by improving both. Computational and inferential controls have different costs and strengths.",
    use: "In the demo: the human direction band, fast checks and repair loops.",
    url: "https://martinfowler.com/articles/harness-engineering.html",
  },
  {
    by: "02 / GITHUB",
    title: "Spec Kit & intentional development",
    copy: "Carry explicit requirements through planning and implementation. Spec Kit is one approach, not a dependency here. A spec can live in Jira, GitHub Issues, Linear or another system without generating a tree of Markdown files.",
    use: "In the demo: a replaceable spec backend; durable intent, constraints and acceptance criteria.",
    url: "https://github.com/github/spec-kit",
  },
  {
    by: "03 / ANTHROPIC",
    title: "Effective context engineering for AI agents",
    copy: "Treat the information available to an agent as something to curate throughout the task, including tools, retrieved knowledge and accumulated state.",
    use: "In the demo: scoped context enters before the build and returns with actionable feedback.",
    url: "https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents",
  },
  {
    by: "04 / ANTHROPIC",
    title: "Building effective agents",
    copy: "Compose simple patterns: routing, parallel work, orchestration and evaluator feedback. Add complexity when measured results justify it.",
    use: "In the demo: deterministic steps, narrow inference, reasoning and optional fan-out are separate execution choices.",
    url: "https://www.anthropic.com/engineering/building-effective-agents",
  },
  {
    by: "05 / STRIPE ENGINEERING",
    title: "Minions: coding agents, part 2",
    copy: "Stripe describes blueprints that combine fixed code steps with agentic work, supported by development environments, tools and feedback.",
    use: "In the demo: automation owns the workflow while intelligence handles the tasks that need judgment.",
    url: "https://stripe.dev/blog/minions-stripes-one-shot-end-to-end-coding-agents-part-2",
  },
  {
    by: "06 / OPENSSF",
    title: "SLSA: supply-chain integrity",
    copy: "Provenance describes how an artifact was produced. Consumers verify it against their expectations. Build integrity supports trust without proving that the product behaves correctly.",
    use: "In the demo: bind evidence to an artifact digest and reject unverifiable provenance.",
    url: "https://slsa.dev/spec/v1.2/",
  },
  {
    by: "07 / DAVID HOWELL",
    title: "Council of Nark",
    copy: "Independent specialist lenses produce structured findings for an arbiter to reconcile. The project treats the benefit of multiple reviewers as a hypothesis to evaluate; an advantage is not established.",
    use: "In the demo: selective fan-out, evidence-based fusion and unresolved dissent. More agents do not automatically mean more confidence.",
    url: "https://github.com/davehowell/council-of-nark",
  },
  {
    by: "08 / ARGO PROJECT",
    title: "Argo Rollouts: progressive delivery",
    copy: "Canary and blue-green strategies limit rollout exposure. Analysis can use observed metrics to decide whether a rollout advances or aborts.",
    use: "In the demo: a healthy canary unlocks expansion; a regression stops it and triggers recovery.",
    url: "https://argo-rollouts.readthedocs.io/en/stable/",
  },
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const svgNS = "http://www.w3.org/2000/svg";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const points = [
  { x: 100, y: 165 },
  { x: 300, y: 125 },
  { x: 500, y: 185 },
  { x: 700, y: 125 },
  { x: 900, y: 185 },
  { x: 1100, y: 125 },
  { x: 1225, y: 160 },
];
const mainPath =
  "M22 181 " + points.map((p) => `L${p.x} ${p.y}`).join(" ") + " L1260 170";
const loopPaths = points.slice(0, 5).map((a, i) => {
  const b = points[i + 1],
    side = i % 2 === 0 ? -1 : 1,
    dy = b.y - a.y;
  return `M${b.x} ${b.y} C${b.x - 45} ${b.y - dy * 0.225} ${a.x + 55} ${a.y + side * 108} ${a.x - 4} ${a.y + side * 82} C${a.x - 49} ${a.y + side * 55} ${a.x - 32} ${a.y - dy * 0.16} ${a.x} ${a.y}`;
});
// Paint every outline first, then every interior. Intersections become a single
// open channel, with no branch cap or outline crossing the main conduit.
for (const group of ["#pipe-edges", "#pipe-fill"]) {
  $(group).innerHTML = [mainPath, ...loopPaths]
    .map((d) => `<path d="${d}"/>`)
    .join("");
}
$("#gate-markers").innerHTML = points
  .slice(0, 6)
  .map(
    (p, i) =>
      `<path class="gate-marker" data-stage="${i}" d="M${p.x - 7} ${p.y - 18}h14M${p.x - 7} ${p.y + 18}h14"/>`,
  )
  .join("");
$("#stage-labels").innerHTML = stages
  .map(
    (s, i) =>
      `<text class="stage-label" data-stage="${i}" x="${points[i].x}" y="29">${String(i + 1).padStart(2, "0")} ${s.name}</text>`,
  )
  .join("");
$("#story-stages").innerHTML = stages
  .map(
    (s, i) =>
      `<article class="story-stage"><h2><span>0${i + 1}</span>${s.name}</h2><p>${s.copy}</p><p class="output">Output: ${s.output}</p></article>`,
  )
  .join("");
const articles = (items) =>
  items
    .map(
      ([title, copy]) => `<article><h3>${title}</h3><p>${copy}</p></article>`,
    )
    .join("");
$("#execution-types").innerHTML = articles(executionTypes);
$("#evolution-list").innerHTML = articles(evolution);
$("#source-grid").innerHTML = sources
  .map(
    (s) =>
      `<article class="source-card"><p class="source-author">${s.by.replace(/^\d+ \/ /, "")}</p><h2>${s.title}</h2><p>${s.copy}</p><a href="${s.url}" target="_blank" rel="noopener noreferrer">Read source ↗</a></article>`,
  )
  .join("");

let scenario = "repair";
let cursor = 0; // Continuous position between checkpoints; integer positions are reviewable states.
let streamClock = 0;
let playing = !reducedMotion.matches;
let page = "animation";
let seek = null;
let lastTime = null;
let animationId = null;
let displayedIndex = -1;
let routes = [];
const STEP_SECONDS = 3.8;
const STREAM_COUNT = 32;
const particles = Array.from({ length: STREAM_COUNT }, (_, i) => {
  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("r", i % 3 === 0 ? 3.5 : 2.8);
  circle.setAttribute("class", "particle");
  $("#stream").append(circle);
  return circle;
});
const frames = () => scenarios[scenario];
const checkpointIndex = () =>
  Math.min(frames().length - 1, Math.floor(cursor + 1e-7));
const colour = (f) =>
  f.problem
    ? "#ff2a6d"
    : f.terminal === "promoted"
      ? "#51efb0"
      : f.evidence.includes(3)
        ? "#73a7ff"
        : f.evidence.includes(2)
          ? "#05d9e8"
          : f.evidence.includes(1)
            ? "#f5e642"
            : "#cf62f2";
function makeRoute(d) {
  const node = document.createElementNS(svgNS, "path");
  node.setAttribute("d", d);
  const length = node.getTotalLength();
  return { node, length };
}
function rebuildRoutes() {
  routes = frames()
    .slice(1)
    .map((f, i) => {
      const from = points[frames()[i].stage],
        to = points[f.stage];
      if (f.route === "repair") return makeRoute(loopPaths[1]);
      if (f.route === "rollback")
        return makeRoute([4, 3, 2, 1].map((n) => loopPaths[n]).join(" "));
      return makeRoute(`M${from.x} ${from.y} L${to.x} ${to.y}`);
    });
}
function positionAt(value) {
  const last = frames().length - 1;
  if (value <= 0) return points[0];
  if (value >= last) return points[frames()[last].stage];
  const i = Math.floor(value),
    route = routes[i];
  if (!route.length) return points[frames()[i].stage];
  return route.node.getPointAtLength(route.length * (value - i));
}
function renderText(force = false) {
  const i = checkpointIndex(),
    f = frames()[i];
  if (force || i !== displayedIndex) {
    displayedIndex = i;
    $("#event-index").textContent =
      `${String(i + 1).padStart(2, "0")} / ${String(frames().length).padStart(2, "0")}`;
    $("#event-title").textContent = f.title;
    $("#event-copy").textContent = f.copy;
    $("#evidence-count").textContent = `${f.evidence.length} / 5`;
    $("#evidence-list").innerHTML = evidenceNames
      .map(
        (name, n) =>
          `<span class="evidence-chip ${f.evidence.includes(n) ? "passed" : f.failed === n ? "failed" : ""}">${f.evidence.includes(n) ? "✓" : f.failed === n ? "×" : "○"} ${name}</span>`,
      )
      .join("");
    $("#release-state").textContent =
      f.terminal === "promoted"
        ? "Production rollout active."
        : f.terminal === "held"
          ? "Deployment blocked: provenance required."
          : f.terminal === "rolled-back"
            ? "Previous artifact restored; candidate held."
            : f.stage === 5
              ? "Canary active; wider rollout pending."
              : "Production promotion pending.";
    $$("[data-stage]").forEach((el) =>
      el.classList.toggle(
        "active",
        Number(el.dataset.stage) === Math.min(f.stage, 5),
      ),
    );
  }
  $("#back").disabled = cursor <= 0 && !seek;
  $("#step").disabled = cursor >= frames().length - 1 && !seek;
  $("#play").textContent = playing
    ? "Ⅱ Pause"
    : cursor >= frames().length - 1
      ? "↺ Replay"
      : "▶ Play";
  $("#play").setAttribute(
    "aria-label",
    playing
      ? "Pause animation"
      : cursor >= frames().length - 1
        ? "Replay animation"
        : "Play animation",
  );
  $("#run-label").textContent = f.terminal
    ? { promoted: "Production", held: "Held", "rolled-back": "Rolled back" }[
        f.terminal
      ]
    : playing
      ? "Running"
      : "Paused";
}
function draw() {
  const p = positionAt(reducedMotion.matches ? checkpointIndex() : cursor),
    f = frames()[checkpointIndex()];
  $("#tracked").setAttribute("transform", `translate(${p.x} ${p.y})`);
  $("#tracked").style.color = colour(f);
  // Offset changes follow the same scenario, not an unrelated decorative path.
  // Their colour changes only when they reach an evidence checkpoint.
  const period = frames().length + 2;
  particles.forEach((particle, i) => {
    const phase =
      (((reducedMotion.matches ? 0 : streamClock) +
        (i * period) / STREAM_COUNT) %
        period) -
      1;
    let point,
      color,
      opacity = 0.75;
    if (phase < 0) {
      point = {
        x: 22 + (points[0].x - 22) * (phase + 1),
        y: 181 + (points[0].y - 181) * (phase + 1),
      };
      color = colour(frames()[0]);
      opacity = (phase + 1) * 0.75;
    } else if (phase > frames().length - 1) {
      const terminal = frames().at(-1),
        end = positionAt(frames().length - 1),
        t = phase - (frames().length - 1);
      point =
        terminal.terminal === "promoted"
          ? { x: end.x + 35 * t, y: end.y + 10 * t }
          : end;
      color = colour(terminal);
      opacity = Math.max(0, 0.75 * (1 - t));
    } else {
      point = positionAt(phase);
      color = colour(frames()[Math.floor(phase)]);
    }
    particle.setAttribute("cx", point.x);
    particle.setAttribute("cy", point.y);
    particle.setAttribute("fill", color);
    particle.style.opacity = opacity;
  });
}
function tick(now) {
  const elapsed =
    lastTime === null ? 0 : Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (seek) {
    const fraction = Math.min(1, (now - seek.started) / seek.duration);
    const eased = fraction * fraction * (3 - 2 * fraction);
    cursor = seek.from + (seek.to - seek.from) * eased;
    streamClock = seek.streamFrom + (seek.to - seek.from) * eased;
    if (fraction === 1) {
      cursor = seek.to;
      seek = null;
    }
  } else if (playing) {
    const delta = (elapsed / STEP_SECONDS) * Number($("#speed").value);
    cursor = Math.min(frames().length - 1, cursor + delta);
    streamClock += delta;
  }
  renderText();
  draw();
  if ((playing || seek) && page === "animation" && !document.hidden)
    animationId = requestAnimationFrame(tick);
  else {
    animationId = null;
    lastTime = null;
  }
}
function wake() {
  if (animationId === null && page === "animation" && !document.hidden) {
    lastTime = null;
    animationId = requestAnimationFrame(tick);
  }
}
function pause() {
  playing = false;
  seek = null;
  renderText();
  draw();
}
function goTo(target, instant = false) {
  playing = false;
  target = Math.max(0, Math.min(frames().length - 1, target));
  if (instant || reducedMotion.matches) {
    streamClock += target - cursor;
    cursor = target;
    seek = null;
    renderText(true);
    draw();
  } else {
    seek = {
      from: cursor,
      to: target,
      started: performance.now(),
      duration: 340,
      streamFrom: streamClock,
    };
    wake();
  }
}
function step(direction) {
  const base = seek ? seek.to : checkpointIndex();
  goTo(base + direction);
}
$("#back").addEventListener("click", () => step(-1));
$("#step").addEventListener("click", () => step(1));
$("#play").addEventListener("click", () => {
  if (playing) {
    pause();
    return;
  }
  seek = null;
  if (cursor >= frames().length - 1) {
    cursor = 0;
    streamClock = 0;
  }
  playing = true;
  renderText();
  wake();
});
$("#reset").addEventListener("click", () => {
  streamClock = 0;
  goTo(0, true);
  streamClock = 0;
  draw();
});
$("#scenario").addEventListener("change", (event) => {
  scenario = event.target.value;
  cursor = 0;
  streamClock = 0;
  playing = false;
  seek = null;
  rebuildRoutes();
  renderText(true);
  draw();
});
window.addEventListener("keydown", (event) => {
  if (
    page !== "animation" ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.target.closest(
      "select,input,textarea,[contenteditable],.diagram-scroll",
    )
  )
    return;
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    step(event.key === "ArrowLeft" ? -1 : 1);
  }
});
function showPage() {
  const name = location.hash.slice(1);
  page = ["story", "sources"].includes(name) ? name : "animation";
  $$(".page").forEach((panel) => (panel.hidden = panel.id !== page));
  $$("[data-page]").forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (page !== "animation") pause();
  else wake();
}
window.addEventListener("hashchange", showPage);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) pause();
});
rebuildRoutes();
renderText(true);
draw();
showPage();
