/* Roam Sweet Roam — demo app brain. Vanilla JS, no build. */
(function () {
  "use strict";
  const D = window.DEMO, A = window.APP;
  const screen = document.getElementById("screen");
  const dotsEl = document.getElementById("dots");
  const navbar = document.getElementById("navbar");
  const sb = document.querySelector(".statusbar");

  const FLOW = ["consent", "shortlist", "makeaday", "optimizing", "route", "arriving", "proof", "agent", "dashboard", "close"];

  const state = {
    unlocked: false,
    idx: -1,                // -1 = splash
    selected: new Set(D.properties.map((p) => p.id)),
    toggles: { cafe: true, park: true, lunch: true },
    startTime: "9:00",
    bailed: false,
    timers: [],
    map: null,
    raf: null,
  };

  /* ---------- helpers ---------- */
  const byId = (id) =>
    D.properties.find((p) => p.id === id) || D.stops.find((s) => s.id === id);
  const isProp = (id) => !!D.properties.find((p) => p.id === id);
  function activeItinerary() {
    return D.itinerary.filter((leg) => {
      if (leg.refType === "stop") {
        const t = byId(leg.refId).type;
        return state.toggles[t === "cafe" ? "cafe" : t === "park" ? "park" : "lunch"];
      }
      return !state.bailed || leg.refId !== "p3";
    });
  }
  function clearTimers() {
    state.timers.forEach(clearTimeout);
    state.timers = [];
    if (state.raf) cancelAnimationFrame(state.raf);
    if (state.map) { state.map.remove(); state.map = null; }
  }
  const later = (fn, ms) => state.timers.push(setTimeout(fn, ms));
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

  /* set status-bar text colour for dark vs light screens */
  function sbTone(dark) { sb.style.setProperty("--sb-color", dark ? "#fff" : "#111"); }

  /* ---------- nav ---------- */
  function setDots() {
    dotsEl.innerHTML = FLOW.map((_, i) =>
      `<span class="dot ${i === state.idx ? "on" : ""}"></span>`).join("");
  }
  function go(delta) {
    const n = state.idx + delta;
    if (n < 0) { state.unlocked && (state.idx = -1, renderSplash()); return; }
    if (n >= FLOW.length) return;
    state.idx = n;
    render(FLOW[n]);
  }
  function gotoName(name) { state.idx = FLOW.indexOf(name); render(name); }

  document.getElementById("navNext").onclick = () => go(1);
  document.getElementById("navBack").onclick = () => go(-1);
  window.addEventListener("keydown", (e) => {
    if (!state.unlocked) return;
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  });

  function render(name) {
    clearTimers();
    navbar.style.display = "flex";
    setDots();
    SCREENS[name]();
  }

  /* ============================================================
     SPLASH / UNLOCK
     ============================================================ */
  function renderSplash() {
    clearTimers();
    navbar.style.display = "none";
    sbTone(true);
    const params = new URLSearchParams(location.search);
    const auto = (params.get("k") || "").toLowerCase() === A.password;
    if (auto) state.unlocked = true;
    screen.innerHTML = `
      <div class="splash">
        ${LOGO_MARK}
        <div class="logo-word">Roam<small>Sweet&nbsp;Roam</small></div>
        <p class="splash-tag">${esc(D.copy.splashTagline)}</p>
        <div class="pwwrap">
          ${auto ? "" : `<input class="pw" id="pw" type="text" inputmode="text"
              autocapitalize="none" placeholder="Enter access code" />
            <div class="pw-note">Gear Up preview · code shared on the day</div>`}
        </div>
        <div class="byline">Plan the day · roam the market · home sweet roam</div>
      </div>`;
    const cta = ctaButton(auto ? "Plan your Saturday →" : "Plan your Saturday →", () => {
      if (!state.unlocked) {
        const v = (document.getElementById("pw").value || "").trim().toLowerCase();
        if (v !== A.password) { shake(document.getElementById("pw")); return; }
        state.unlocked = true;
      }
      gotoName("consent");
    });
    screen.querySelector(".splash").appendChild(cta);
    const pw = document.getElementById("pw");
    if (pw) pw.addEventListener("keydown", (e) => { if (e.key === "Enter") cta.click(); });
  }
  function shake(el) { el.style.animation = "none"; el.offsetHeight; el.style.animation = "shake .4s"; }

  /* ============================================================
     SCREENS
     ============================================================ */
  const SCREENS = {};

  /* ---- consent ---- */
  SCREENS.consent = function () {
    sbTone(false);
    const rows = [
      ["📍", "Location on Saturdays", "So we can build your route and pad arrival times for parking."],
      ["✅", "Auto check-in at opens", "Skip the paper sign-in sheet — we let the agent know you've arrived."],
      ["📊", "Help improve the market map", "Share anonymised attendance to power smarter routes for everyone."],
    ];
    screen.innerHTML = `
      <div class="view"><div class="pad stagger">
        <div class="eyebrow"><span class="dotmark"></span>One quick thing</div>
        <h1 class="title">We ask once — clearly.</h1>
        <p class="sub">Roam only works with a couple of permissions. Flip any off; the app still plans your day.</p>
        <div class="consent-card" style="margin-top:18px">
          ${rows.map((r) => `
            <div class="consent-row">
              <div class="consent-ico">${r[0]}</div>
              <div style="flex:1"><b>${r[1]}</b><p>${r[2]}</p></div>
              <div class="toggle"></div>
            </div>`).join("")}
        </div>
        <div class="consent-fine">You're consenting to attendance check-in at Ray White opens only. You can withdraw anytime in Settings. No data is shared with other agencies.</div>
      </div></div>`;
    staggerKids();
    screen.appendChild(ctaButton("Allow & continue →", () => go(1)));
  };

  /* ---- shortlist ---- */
  SCREENS.shortlist = function () {
    sbTone(false);
    const cards = D.properties.map((p) => {
      const on = state.selected.has(p.id);
      return `
      <div class="card" data-id="${p.id}">
        ${on ? '<div class="check">✓</div>' : ""}
        <div class="card-hero" style="background:linear-gradient(135deg,hsl(${p.hue} 55% 62%),hsl(${p.hue + 25} 50% 45%))">
          <div class="ico">${HOME_ICONS[p.icon] || "🏠"}</div>
          <span class="badge ${p.checkInEnabled ? "rw" : ""}">${p.checkInEnabled ? "◤ Ray White" : esc(p.agency.split(" ").slice(0, 2).join(" "))}</span>
          <span class="badge time">${p.ofiStart}–${p.ofiEnd}</span>
        </div>
        <div class="card-body">
          <div class="price">${esc(p.price)}</div>
          <div class="addr">${esc(p.address)}</div>
          <div class="suburb">${esc(p.suburb)} · ${esc(p.propertyType)}</div>
          <div class="specs"><span>🛏 ${p.beds}</span><span>🛁 ${p.baths}</span><span>🚗 ${p.cars}</span></div>
        </div>
      </div>`;
    }).join("");
    screen.innerHTML = `
      <div class="view"><div class="pad">
        <div class="eyebrow"><span class="dotmark"></span>Saturday ${D.itinerary[0].arrive}am start</div>
        <h1 class="title">${esc(D.copy.shortlistHeader)}</h1>
        <p class="sub">${esc(D.copy.shortlistSub)} Tap to add or drop.</p>
        <div class="urlbar" style="margin-top:16px"><span class="plus">+</span> Paste a realestate.com.au or Domain link…</div>
        ${cards}
        <p class="sub" style="text-align:center;margin-top:4px">Mixed agencies — we route the whole market, not just one.</p>
      </div></div>`;
    screen.querySelectorAll(".card").forEach((c) => c.onclick = () => {
      const id = c.dataset.id;
      state.selected.has(id) ? state.selected.delete(id) : state.selected.add(id);
      SCREENS.shortlist();
    });
    screen.appendChild(ctaButton(`Plan my day · ${state.selected.size} opens →`, () => go(1)));
  };

  /* ---- make a day ---- */
  SCREENS.makeaday = function () {
    sbTone(false);
    const opts = [
      ["cafe", "☕", D.copy.toggles.cafe, "Double Roasters — 10% off for Roam users"],
      ["park", "🛝", D.copy.toggles.park, "Steel Park — riverside playground"],
      ["lunch", "🍔", D.copy.toggles.lunch, "The Henson — kids eat free"],
    ];
    const times = ["8:30", "9:00", "9:30", "10:00"];
    screen.innerHTML = `
      <div class="view"><div class="pad">
        <div class="eyebrow"><span class="dotmark"></span>Make it a day, not a chore</div>
        <h1 class="title">Build breaks into the run.</h1>
        <p class="sub">A day of opens with kids is brutal. We slot in the good stuff between houses.</p>
        <p class="sub" style="font-weight:700;color:var(--nc-ink);margin:18px 0 8px">Start the day at</p>
        <div class="timepick">${times.map((t) => `<span class="chip ${t === state.startTime ? "on" : ""}" data-t="${t}">${t}</span>`).join("")}</div>
        ${opts.map((o) => `
          <div class="optrow ${state.toggles[o[0]] ? "" : "off"}" data-k="${o[0]}">
            <span class="emo">${o[1]}</span>
            <div class="t"><b>${esc(o[2])}</b><p>${esc(o[3])}</p></div>
            <div class="toggle"></div>
          </div>`).join("")}
      </div></div>`;
    screen.querySelectorAll(".chip").forEach((c) => c.onclick = () => { state.startTime = c.dataset.t; SCREENS.makeaday(); });
    screen.querySelectorAll(".optrow").forEach((r) => r.onclick = () => { const k = r.dataset.k; state.toggles[k] = !state.toggles[k]; SCREENS.makeaday(); });
    screen.appendChild(ctaButton("Build my Saturday →", () => go(1)));
  };

  /* ---- optimizing ---- */
  SCREENS.optimizing = function () {
    sbTone(true);
    const steps = D.copy.optimizer.steps;
    const pipe = D.copy.pipeline;
    screen.innerHTML = `
      <div class="opt-screen">
        <div class="pipeline">
          ${pipe.map((s, i) => `
            <div class="pl-step" data-i="${i}"><b>${esc(s.head)}</b><span>${esc(s.lines.join(" · "))}</span></div>
            ${i < pipe.length - 1 ? '<span class="pl-arrow">›</span>' : ""}`).join("")}
        </div>
        <div class="opt-title">${esc(D.copy.optimizer.title)}</div>
        ${steps.map((s, i) => `
          <div class="opt-step" data-i="${i}">
            <span class="oico">${s.icon}</span>
            <div style="flex:1"><b>${esc(s.name)}</b><p>${esc(s.detail)}</p></div>
            <span class="spin"></span>
          </div>`).join("")}
      </div>`;
    const plSteps = [...screen.querySelectorAll(".pl-step")];
    const oSteps = [...screen.querySelectorAll(".opt-step")];
    oSteps.forEach((s, i) => {
      later(() => {
        s.classList.add("on");
        plSteps[Math.min(i, plSteps.length - 1)].classList.add("on");
      }, 250 + i * 650);
      later(() => {
        s.classList.add("done");
        s.querySelector(".spin").outerHTML = '<span class="tick">✓</span>';
      }, 250 + i * 650 + 520);
    });
    later(() => { plSteps[plSteps.length - 1].classList.add("on"); }, 250 + oSteps.length * 650);
    later(() => go(1), 250 + oSteps.length * 650 + 700);
  };

  /* ---- route / map ---- */
  SCREENS.route = function () {
    sbTone(true);
    screen.innerHTML = `
      <div class="map-wrap">
        <div class="map-fallback" id="mapfb"></div>
        <div id="map"></div>
        <div class="map-grad"></div>
      </div>
      <div class="route-head">
        <div class="eyebrow"><span class="dotmark"></span>Your optimised route</div>
        <b>${esc(D.copy.routeTitle)}</b>
        <p>${esc(D.copy.routeSub)}</p>
      </div>
      <div class="sheet">
        <div class="sheet-grip"></div>
        <div class="mapbtns">
          <button class="mapbtn a" id="appleMaps">${NAV_SVG} Apple Maps</button>
          <button class="mapbtn g" id="gMaps">${NAV_SVG} Google Maps</button>
        </div>
        <div class="sheet-scroll">
          <div id="legs">${legHTML()}</div>
          <button class="cta inline" id="startDay">Start the day →</button>
        </div>
      </div>`;
    initMap();
    bindLegButtons();
    document.getElementById("gMaps").onclick = () => window.open(googleMapsUrl(), "_blank");
    document.getElementById("appleMaps").onclick = () => window.open(appleMapsUrl(), "_blank");
    document.getElementById("startDay").onclick = () => go(1);
  };

  function legHTML() {
    const items = activeItinerary();
    return items.map((leg, i) => {
      const it = byId(leg.refId);
      const property = isProp(leg.refId);
      const rw = property && it.checkInEnabled;
      const numCls = rw ? "rw" : property ? "" : "stop";
      const title = property ? it.address : `${it.emoji} ${it.name}`;
      const meta = property
        ? `${esc(it.agency)}`
        : `${esc(it.why)}`;
      const last = i === items.length - 1;
      return `
        <div class="leg">
          <div class="leg-rail"><div class="leg-num ${numCls}">${i + 1}</div>${last ? "" : '<div class="leg-line"></div>'}</div>
          <div class="leg-body">
            <div class="lt">${leg.arrive}${leg.driveMins ? ` · ${leg.driveMins} min drive · ${leg.distanceKm} km` : " · first stop"}</div>
            <b>${esc(title)}</b>
            <div class="leg-meta">${meta}</div>
            <div class="leg-meta" style="margin-top:4px">
              <span class="parkpill ${leg.parkingHard ? "hard" : ""}">🅿️ ${esc(leg.parkingNote)}</span>
            </div>
            ${!property ? `<div class="perk">★ ${esc(it.perk)}</div>` : ""}
            ${property && !rw ? `<button class="bailbtn" data-bail="${it.id}">${esc(D.copy.bailOut)}</button>` : ""}
            ${rw ? `<div class="perk" style="color:var(--nc-primary-d)">◤ Auto check-in ready</div>` : ""}
          </div>
        </div>`;
    }).join("");
  }
  function bindLegButtons() {
    screen.querySelectorAll("[data-bail]").forEach((b) => b.onclick = () => {
      showToast(D.copy.bailOutToast);
      later(() => {
        state.bailed = true;
        document.getElementById("legs").innerHTML = legHTML();
        bindLegButtons();
        refreshMap();
        hideToast();
      }, 1500);
    });
  }

  /* ---- Leaflet map ---- */
  function pinIcon(label, kind) {
    const cls = kind === "rw" ? "rw" : kind === "stop" ? "stop" : "";
    return L.divIcon({
      className: "", iconSize: [30, 30], iconAnchor: [15, 30],
      html: `<div class="pin ${cls}" style="animation-delay:${label * 0.08}s"><span>${label}</span></div>`,
    });
  }
  function initMap() {
    const fb = document.getElementById("mapfb");
    const map = L.map("map", { zoomControl: false, attributionControl: false, dragging: true, tap: true });
    state.map = map;
    let loaded = false;
    const tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 19,
    });
    tiles.on("load", () => { loaded = true; });
    tiles.addTo(map);
    later(() => { if (!loaded) fb.style.display = "block"; }, 2600);
    drawRoute();
  }
  function drawRoute() {
    const map = state.map;
    const items = activeItinerary();
    const pts = items.map((leg) => { const o = byId(leg.refId); return [o.lat, o.lng]; });
    // outline + main line
    L.polyline(pts, { color: "#fff", weight: 8, opacity: 0.9, lineJoin: "round" }).addTo(map);
    const line = L.polyline(pts, { color: "#11BDBD", weight: 4, opacity: 0.95, lineJoin: "round" }).addTo(map);
    items.forEach((leg, i) => {
      const o = byId(leg.refId);
      const property = isProp(leg.refId);
      const kind = property ? (o.checkInEnabled ? "rw" : "prop") : "stop";
      L.marker([o.lat, o.lng], { icon: pinIcon(i + 1, kind) }).addTo(map);
    });
    map.fitBounds(L.latLngBounds(pts), { paddingTopLeft: [26, 128], paddingBottomRight: [26, 466] });
    animateCar(line.getLatLngs());
    state._line = line;
  }
  function refreshMap() {
    if (!state.map) return;
    state.map.eachLayer((l) => { if (l instanceof L.Polyline || l instanceof L.Marker) state.map.removeLayer(l); });
    drawRoute();
  }
  function animateCar(latlngs) {
    if (latlngs.length < 2) return;
    const car = L.marker(latlngs[0], {
      icon: L.divIcon({ className: "", html: '<div class="carmark">🚗</div>', iconSize: [24, 24], iconAnchor: [12, 12] }),
      zIndexOffset: 1000,
    }).addTo(state.map);
    const segs = [];
    let total = 0;
    for (let i = 0; i < latlngs.length - 1; i++) {
      const d = state.map.distance(latlngs[i], latlngs[i + 1]);
      segs.push(d); total += d;
    }
    const DUR = 5500; let start = null;
    function step(ts) {
      if (!start) start = ts;
      let t = ((ts - start) % DUR) / DUR;
      let target = t * total, acc = 0, i = 0;
      while (i < segs.length && acc + segs[i] < target) { acc += segs[i]; i++; }
      if (i >= segs.length) i = segs.length - 1;
      const f = segs[i] ? (target - acc) / segs[i] : 0;
      const a = latlngs[i], b = latlngs[i + 1] || a;
      car.setLatLng([a.lat + (b.lat - a.lat) * f, a.lng + (b.lng - a.lng) * f]);
      state.raf = requestAnimationFrame(step);
    }
    state.raf = requestAnimationFrame(step);
  }
  function googleMapsUrl() {
    const items = activeItinerary();
    const pts = items.map((l) => { const o = byId(l.refId); return `${o.lat},${o.lng}`; });
    const origin = pts[0], destination = pts[pts.length - 1];
    const waypoints = pts.slice(1, -1).join("|");
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
  }
  function appleMapsUrl() {
    const items = activeItinerary();
    const o0 = byId(items[0].refId), o1 = byId(items[1].refId);
    return `https://maps.apple.com/?saddr=${o0.lat},${o0.lng}&daddr=${o1.lat},${o1.lng}&dirflg=d`;
  }

  /* ---- arriving / geofence ---- */
  SCREENS.arriving = function () {
    sbTone(false);
    const rw = D.properties.filter((p) => p.checkInEnabled).pop();
    screen.innerHTML = `
      <div class="arrive">
        <div class="geo"><div class="ring"></div><div class="ring"></div><div class="ring"></div><div class="dotc">📍</div></div>
        <h2 id="arriveH">You're nearly there</h2>
        <p id="arriveP">You're 180m from <span class="addrbig">${esc(rw.address)}</span> — a Ray White open.</p>
      </div>`;
    const h = document.getElementById("arriveH"), p = document.getElementById("arriveP");
    const cta = ctaButton("Checking you in…", () => go(1));
    cta.style.opacity = ".5"; cta.style.pointerEvents = "none";
    screen.querySelector(".arrive").appendChild(cta);
    later(() => { p.innerHTML = `Ray White open — logging your visit automatically. No paper sign-in sheet.`; }, 1400);
    later(() => {
      h.textContent = "Checked in ✓";
      h.style.color = "var(--nc-green)";
      p.innerHTML = `You're on the agent's list as a warm buyer.`;
      cta.textContent = "Show my pass →";
      cta.style.opacity = "1"; cta.style.pointerEvents = "auto";
    }, 2600);
  };

  /* ---- proof ticket ---- */
  SCREENS.proof = function () {
    sbTone(true);
    const rw = D.properties.filter((p) => p.checkInEnabled).pop();
    screen.innerHTML = `
      <div class="proof">
        <div class="ticket">
          <div class="ticket-top">
            <div class="bigtick">✓</div>
            <h2>Checked in</h2>
            <p class="sub">${esc(D.copy.proofSub)}</p>
          </div>
          <div class="ticket-perf"><div class="perfline"></div></div>
          <div class="ticket-bot">
            <div class="tk-row"><span class="k">Buyer</span><span class="v">${esc(A.buyer.name)}</span></div>
            <div class="tk-row"><span class="k">Property</span><span class="v">${esc(rw.address)}</span></div>
            <div class="tk-row"><span class="k">Agency</span><span class="v"><span class="tk-rw">◤ Ray White</span></span></div>
            <div class="tk-row"><span class="k">Agent</span><span class="v">${esc(rw.agent)}</span></div>
            <div class="tk-row"><span class="k">Time</span><span class="v">12:15pm · Sat</span></div>
            <div class="verifystripe"></div>
          </div>
        </div>
        <div class="show-agent">👋 Show this to the agent — or it's already on their iPad</div>
      </div>`;
    screen.appendChild(ctaButton("Meanwhile, on the agent's iPad… →", () => go(1)));
  };

  /* ---- agent iPad ---- */
  SCREENS.agent = function () {
    sbTone(true);
    const rw = D.properties.filter((p) => p.checkInEnabled).pop();
    screen.innerHTML = `
      <div class="agent">
        <div class="ipad">
          <div class="ipad-bar"><span class="nclogo">NURTURE<b>CLOUD</b></span> · Check-in
            <span class="live">LIVE</span></div>
          <div class="ipad-title">${esc(rw.address)} <span>· ${esc(rw.agent)} · 12:15pm</span></div>
          <div id="attlist">
            <div class="att"><div class="av">PR</div><div class="nm"><b>Priya R.</b><p>Signed in · 12:02pm</p></div>
              <div class="intent"><div class="score">64</div><div class="lbl">intent</div></div></div>
            <div class="att"><div class="av">JM</div><div class="nm"><b>James M.</b><p>Signed in · 12:09pm</p></div>
              <div class="intent"><div class="score">71</div><div class="lbl">intent</div></div></div>
          </div>
        </div>
        <p class="agent-note">${esc(D.copy.agentBlurb)}</p>
      </div>`;
    later(() => {
      const list = document.getElementById("attlist");
      const el = document.createElement("div");
      el.className = "att new";
      el.innerHTML = `<div class="av">DS</div>
        <div class="nm"><b>${esc(A.buyer.name)}</b><p>Auto check-in · just now</p>
          <span class="tag">◤ via Roam · 4th open today</span></div>
        <div class="intent"><div class="score">89</div><div class="lbl">intent</div></div>`;
      list.prepend(el);
    }, 650);
    screen.appendChild(ctaButton("So what does NurtureCloud see? →", () => go(1)));
  };

  /* ---- dashboard reveal ---- */
  SCREENS.dashboard = function () {
    sbTone(true);
    const d = D.dashboard;
    const verified = 1930, intent = d.inspectionsToday - verified;
    screen.innerHTML = `
      <div class="view dash"><div>
        <div class="dash-h">
          <div class="eyebrow"><span class="dotmark"></span>Behind the scenes</div>
          <h2>What NurtureCloud sees this Saturday</h2>
        </div>
        <div class="bignum"><div class="n" id="bignum">0</div>
          <div class="l">inspections attended today — across the whole market</div></div>
        <div class="statgrid">
          <div class="stat"><div class="v">${d.agenciesCount}</div><div class="k">agencies covered</div></div>
          <div class="stat"><div class="v">${d.suburbsCount}</div><div class="k">suburbs</div></div>
        </div>
        <div class="split">
          <div class="verified"><div class="badge2" style="color:var(--nc-green)">Verified</div>
            <div class="v2">${verified.toLocaleString()}</div>
            <div class="k2">geofence check-ins at Ray White opens — ground truth</div></div>
          <div class="intent2"><div class="badge2" style="color:var(--nc-coral)">New signal</div>
            <div class="v2">${intent.toLocaleString()}</div>
            <div class="k2">planned visits to <b>other agencies</b> we'd never otherwise see</div></div>
        </div>
        <div class="feat-h">ML features generated today</div>
        <div class="feat">${d.mlFeatures.map((f) => `<span>${esc(f)}</span>`).join("")}</div>
        <div class="lookalike"><b>${d.lookalikeCount.toLocaleString()}</b> lookalike buyers
          <p>${esc(d.lookalikeLine.split("—")[1] || d.lookalikeLine)}</p></div>
        <div class="punch">${esc(d.punchline).replace("no property platform", "<span>no property platform</span>")}</div>
      </div></div>`;
    countUp(document.getElementById("bignum"), d.inspectionsToday, 1400);
    screen.appendChild(ctaButton("The catch → ", () => go(1)));
  };
  function countUp(el, target, dur) {
    let start = null;
    function step(ts) {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(e * target).toLocaleString();
      if (p < 1) state.raf = requestAnimationFrame(step);
    }
    state.raf = requestAnimationFrame(step);
  }

  /* ---- close ---- */
  SCREENS.close = function () {
    sbTone(true);
    screen.innerHTML = `
      <div class="close">
        <h1>Roam Sweet Roam</h1>
        <div class="three">
          <b class="a">Cheap to prototype.</b>
          <b class="b">Fun to demo.</b>
          <b class="c">Dangerous if it works.</b>
        </div>
        <p class="foot">${esc(D.copy.closing)}</p>
        <p class="foot" style="margin-top:14px;font-style:italic">The catch: it only works if buyers come back, the consent is clean, and the signal beats what we already have. A cheap Saturday to find out.</p>
        <div class="ncmark">a <b>NurtureCloud</b> curiosity · Gear Up 2026</div>
      </div>`;
    const cta = ctaButton("↺ Run it again", () => { state.bailed = false; gotoName("shortlist"); });
    cta.classList.add("ghost");
    screen.appendChild(cta);
  };

  /* ---------- shared bits ---------- */
  function ctaButton(label, onClick) {
    const b = document.createElement("button");
    b.className = "cta"; b.textContent = label; b.onclick = onClick;
    return b;
  }
  function staggerKids() {
    screen.querySelectorAll(".stagger > *").forEach((el, i) => el.style.animationDelay = `${i * 0.07}s`);
  }
  function showToast(text) {
    hideToast();
    const t = document.createElement("div");
    t.className = "toast"; t.id = "toast";
    t.innerHTML = `<span class="spin"></span> ${esc(text)}`;
    screen.appendChild(t);
  }
  function hideToast() { const t = document.getElementById("toast"); if (t) t.remove(); }

  const HOME_ICONS = { terrace: "🏘️", semi: "🏠", apartment: "🏢", townhouse: "🏗️", house: "🏡" };
  const NAV_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style="margin-right:3px"><path d="M2 11 22 2l-9 20-2-9z"/></svg>';
  const LOGO_MARK = `<svg class="logo-mark" viewBox="0 0 100 100" fill="none">
    <path d="M50 14 L86 44 H74 V82 H58 V58 H42 V82 H26 V44 H14 Z" fill="#fff" opacity=".96"/>
    <circle cx="50" cy="50" r="9" fill="#11BDBD"/>
    <path d="M50 41 a9 9 0 1 1 -0.01 0" stroke="#fff" stroke-width="3" fill="none"/>
  </svg>`;

  /* shake keyframes injected */
  const style = document.createElement("style");
  style.textContent = "@keyframes shake{10%,90%{transform:translateX(-2px)}30%,70%{transform:translateX(4px)}50%{transform:translateX(-6px)}}";
  document.head.appendChild(style);

  // Presenter / test hook: RSR.goto('dashboard'), RSR.go(1), RSR.unlock()
  window.RSR = {
    goto: (name) => { state.unlocked = true; gotoName(name); },
    go, unlock: () => { state.unlocked = true; },
    flow: FLOW,
  };

  renderSplash();
})();
