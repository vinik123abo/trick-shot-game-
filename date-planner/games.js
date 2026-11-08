// דייטון – גלגל הדייטים וחפיסת ההחלקה
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DI = window.DateIdeas;
const DP = window.DatePlaces;
const fx = () => window.FX || { burst() {}, buzz() {}, pop() {} };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ======================= גלגל הדייטים ======================= */
// גלגל מציאותי: חישוק זהב, נורות, יתדות ולשונית שנוקשת, פיזיקה אמיתית (אפשר לתפוס ולסובב באצבע)
const WHEEL = DI.QUICK_IDEAS;
const N = WHEEL.length;
const SEG = 360 / N;
const PAL = [["var(--accent)", "var(--depth)"], ["var(--accent2)", "var(--accent-mid)"], ["var(--violet)", "var(--depth)"]];
const BULBS = 24;
const svgNS = "http://www.w3.org/2000/svg";
let angle = 0, vel = 0, running = false, dragging = false, lastSeg = null, armed = false, lastFrame = 0;
let rotG, bulbs = [], flapper, wrap;

function polar(r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}
const mod = (a, m) => ((a % m) + m) % m;

function drawWheel() {
  const svg = $("#wheel");
  let defs = `<defs>
    <radialGradient id="wRim" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff4c8"/><stop offset=".35" stop-color="#e6b84e"/><stop offset=".7" stop-color="#a8761f"/><stop offset="1" stop-color="#5e3f0c"/></radialGradient>
    <radialGradient id="wHub" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#fff6d6"/><stop offset=".5" stop-color="#d9a441"/><stop offset="1" stop-color="#7a5212"/></radialGradient>
    <radialGradient id="wShade" r="50%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>
    <linearGradient id="wGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="wPeg" cx="35%" cy="30%"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="#d9a441"/><stop offset="1" stop-color="#6b4710"/></radialGradient>`;
  WHEEL.forEach((w, i) => {
    const [a, b] = PAL[i % PAL.length];
    defs += `<radialGradient id="wSeg${i}" cx="0" cy="0" r="100" gradientUnits="userSpaceOnUse"><stop offset=".15" style="stop-color:${b}"/><stop offset=".95" style="stop-color:${a}"/></radialGradient>`;
  });
  defs += `</defs>`;
  // חישוק ונורות (לא מסתובבים)
  let out = defs + `<circle r="118" fill="rgba(0,0,0,.35)" transform="translate(0 5)"/><circle r="116" fill="url(#wRim)"/><circle r="104" fill="#2a1406"/>`;
  out += `<g id="wheelBulbs">`;
  for (let i = 0; i < BULBS; i++) { const [x, y] = polar(110, (i / BULBS) * 360); out += `<circle class="bulb" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.4"/>`; }
  out += `</g><g id="wheelRot">`;
  WHEEL.forEach((w, i) => {
    const [x1, y1] = polar(101, i * SEG), [x2, y2] = polar(101, (i + 1) * SEG);
    const mid = (i + 0.5) * SEG;
    out += `<path class="seg" data-i="${i}" d="M0 0 L${x1.toFixed(2)} ${y1.toFixed(2)} A101 101 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="url(#wSeg${i})"/>`;
    const [ex, ey] = polar(87, mid);
    out += `<text class="w-emoji" x="${ex.toFixed(2)}" y="${ey.toFixed(2)}" transform="rotate(${mid} ${ex.toFixed(2)} ${ey.toFixed(2)})">${w.e}</text>`;
    const [tx, ty] = polar(58, mid);
    // בחצי השמאלי הופכים את הכיתוב כדי שלא יהיה הפוך
    const rot = mid > 180 ? mid + 90 : mid - 90;
    const label = w.t.length > 13 ? w.t.split(/\s+/).slice(0, 2).join(" ").replace(/ ו?–?$/, "") : w.t;
    out += `<text class="w-label" x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" transform="rotate(${rot} ${tx.toFixed(2)} ${ty.toFixed(2)})">${esc(label)}</text>`;
  });
  // קווי הפרדה ויתדות
  for (let i = 0; i < N; i++) {
    const [x, y] = polar(101, i * SEG), [px, py] = polar(97, i * SEG);
    out += `<line x1="0" y1="0" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="rgba(255,236,180,.75)" stroke-width="1.2"/>`;
    out += `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="3.2" fill="url(#wPeg)" stroke="rgba(0,0,0,.35)" stroke-width=".5"/>`;
  }
  out += `<circle r="101" fill="url(#wShade)"/></g>`;
  // ברק זכוכית (נשאר במקום – נותן תחושת עומק)
  out += `<path d="M-88 -30 A95 95 0 0 1 88 -30 Q0 -6 -88 -30Z" fill="url(#wGloss)" opacity=".55" pointer-events="none"/>`;
  out += `<circle r="101" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="2"/>`;
  svg.innerHTML = out;
  rotG = $("#wheelRot");
  bulbs = [...svg.querySelectorAll(".bulb")];
  flapper = $("#wheelFlapper");
  wrap = $("#wheelWrap");
  setAngle(angle);
}

function setAngle(a) {
  angle = a;
  rotG?.setAttribute("transform", `rotate(${a.toFixed(2)})`);
  // נקישה כשיתד עוברת את הלשונית
  const seg = Math.floor(mod(-angle, 360) / SEG);
  if (lastSeg !== null && seg !== lastSeg && (Math.abs(vel) > 25 || dragging)) knock();
  lastSeg = seg;
}

function knock() {
  const strength = Math.min(30, 8 + Math.abs(vel) / 30);
  const dir = vel >= 0 ? -1 : 1;
  flapper.style.transition = "transform 40ms ease-out";
  flapper.style.transform = `translateX(-50%) rotate(${dir * strength}deg)`;
  clearTimeout(knock.t);
  knock.t = setTimeout(() => {
    flapper.style.transition = "transform 260ms cubic-bezier(.3, 2.2, .5, 1)";
    flapper.style.transform = "translateX(-50%) rotate(0deg)";
  }, 45);
  fx().sound?.("tick");
  if (Math.abs(vel) < 260) fx().buzz(5);
}

function chase(t) {
  if (!bulbs.length) return;
  const speed = Math.min(30, 4 + Math.abs(vel) / 30);
  const head = Math.floor(t / 1000 * speed) % BULBS;
  bulbs.forEach((b, i) => b.classList.toggle("lit", (i - head + BULBS) % 6 === 0 || (i - head + BULBS) % 6 === 1));
}

function loop(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - (lastFrame || now)) / 1000);
  lastFrame = now;
  if (!dragging) {
    // חיכוך: חזק יותר במהירות גבוהה, ועדין בסוף – כמו גלגל אמיתי
    const decel = 55 + Math.abs(vel) * 0.42;
    const nv = vel - Math.sign(vel) * decel * dt;
    vel = Math.sign(nv) === Math.sign(vel) ? nv : 0;
    setAngle(angle + vel * dt);
    if (vel === 0) return finish();
  }
  chase(now);
  requestAnimationFrame(loop);
}

function startLoop() {
  if (running) return;
  running = true;
  lastFrame = 0;
  wrap.classList.add("spinning");
  $("#wheelResult").classList.add("hidden");
  $$("#wheel .seg.win").forEach((p) => p.classList.remove("win"));
  wrap.classList.remove("party");
  requestAnimationFrame(loop);
}

function spin() {
  if (running && !dragging) return;
  vel = 760 + Math.random() * 620;
  armed = true;
  fx().buzz(20);
  fx().sound?.("whoosh");
  startLoop();
}

function finish() {
  running = false;
  wrap.classList.remove("spinning");
  bulbs.forEach((b) => b.classList.remove("lit"));
  if (!armed) return;
  armed = false;
  const idx = Math.floor(mod(-angle, 360) / SEG) % N;
  showWheelResult(WHEEL[idx], idx);
}

// תפיסה וסיבוב באצבע / בעכבר
function pointerAngle(e) {
  const r = $("#wheel").getBoundingClientRect();
  return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
}
function bindDrag() {
  const svg = $("#wheel");
  let prev = 0, samples = [];
  svg.addEventListener("pointerdown", (e) => {
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    prev = pointerAngle(e);
    samples = [[performance.now(), 0]];
    vel = 0;
    wrap.classList.add("grab");
    startLoop();
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const a = pointerAngle(e);
    let d = a - prev;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    prev = a;
    const now = performance.now();
    samples.push([now, d]);
    samples = samples.filter(([t]) => now - t < 90);
    const span = Math.max(16, now - samples[0][0]);
    vel = (samples.reduce((s, [, x]) => s + x, 0) / span) * 1000;
    setAngle(angle + d);
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    wrap.classList.remove("grab");
    vel = Math.max(-2200, Math.min(2200, vel));
    if (Math.abs(vel) > 220) {
      // זריקה חזקה מספיק – הגלגל ממשיך להסתובב ובוחר
      if (Math.abs(vel) < 520) vel = Math.sign(vel) * (520 + Math.random() * 200);
      armed = true;
      fx().sound?.("whoosh");
    } else { vel = 0; armed = false; }
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);
}

function petalRain() {
  if (reduceMotion) return;
  const box = document.createElement("div");
  box.className = "petal-rain";
  box.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 38; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "%";
    p.style.setProperty("--d", (2.6 + Math.random() * 2.2).toFixed(2) + "s");
    p.style.setProperty("--x", ((Math.random() - 0.5) * 160).toFixed(0) + "px");
    p.style.setProperty("--r", (Math.random() * 720 - 360).toFixed(0) + "deg");
    p.style.animationDelay = (Math.random() * 0.9).toFixed(2) + "s";
    p.style.transform = `scale(${0.6 + Math.random() * 0.8})`;
    if (i % 5 === 0) p.className = "heart";
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 5600);
}

function showWheelResult(w, idx) {
  $(`#wheel .seg[data-i="${idx}"]`)?.classList.add("win");
  wrap.classList.add("party");
  const r = $("#wheelResult");
  r.innerHTML = `
    <div class="wr-emoji">${w.e}</div>
    <div class="wr-text"><small>הגורל בחר בשבילכם:</small><b>${esc(w.t)}</b><span>${esc(w.s)}</span></div>
    <div class="wr-btns">
      <button class="btn primary" data-wbuild="${idx}">✨ בנה את הדייט הזה</button>
      <button class="btn ghost" data-wagain>🎡 עוד סיבוב</button>
    </div>`;
  r.classList.remove("hidden");
  const box = wrap.getBoundingClientRect();
  fx().burst(box.left + box.width / 2, box.top + box.height / 2, 34);
  fx().buzz([40, 60, 40]);
  fx().sound?.("fanfare");
  petalRain();
  setTimeout(() => r.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" }), 400);
}

$("#spinBtn").addEventListener("click", spin);
$("#wheelResult").addEventListener("click", (e) => {
  if (e.target.closest("[data-wagain]")) return spin();
  const b = e.target.closest("[data-wbuild]");
  if (!b) return;
  document.querySelector(`.tab[data-tab="plan"]`).click();
  document.querySelector(`#quickGrid [data-q="${b.dataset.wbuild}"]`)?.click();
});
drawWheel();
bindDrag();
// כשמחליפים ערכת צבעים – הגלגל נצבע מחדש לבד (הצבעים הם משתני CSS)

/* ======================= חפיסת ההחלקה ======================= */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const VIBE = DI.VIBE_LABEL;
const POOL = shuffle([
  ...DI.ACTIVITIES.filter((a) => a.role !== "close").map((a) => ({
    key: "a:" + a.id, e: a.e, t: a.t, d: a.d, cost: a.cost, tags: a.v.map((v) => VIBE[v]).filter(Boolean), kind: a.home ? "בבית" : "יציאה", mainId: a.id, vibes: a.v,
  })),
  ...DP.HOME_DATES.map((h) => ({
    key: "h:" + h.id, e: h.e, t: h.t, d: h.s + ". " + h.steps[0] + ".", cost: h.cost, tags: h.v.map((v) => VIBE[v]).filter(Boolean), kind: "בבית", homeId: h.id, vibes: ["home"].concat(h.v),
  })),
]);

let deckIdx = 0;
const history = [];
let liked = LS.get("dt_liked", []);

function cardHtml(c, depth) {
  return `<div class="swipe-card" data-depth="${depth}" style="--d:${depth}">
    <div class="sc-stamp like">אהבתי ❤</div><div class="sc-stamp nope">דלג ✖</div>
    <div class="sc-top"><span class="sc-emoji">${c.e}</span><span class="sc-kind">${c.kind}</span></div>
    <h4>${esc(c.t)}</h4>
    <p>${esc(c.d)}</p>
    <div class="sc-tags">${c.tags.slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("")}<span class="sc-cost">${c.cost ? "כ-" + c.cost + " ₪" : "חינם"}</span></div>
  </div>`;
}

function renderDeck() {
  const deck = $("#deck");
  const cards = [];
  for (let i = 2; i >= 0; i--) {
    const c = POOL[(deckIdx + i) % POOL.length];
    cards.push(cardHtml(c, i));
  }
  deck.innerHTML = cards.join("");
  bindTop();
}

function bindTop() {
  const el = $('#deck .swipe-card[data-depth="0"]');
  if (!el) return;
  let sx = 0, sy = 0, dx = 0, dy = 0, drag = false;
  el.addEventListener("pointerdown", (e) => {
    drag = true; sx = e.clientX; sy = e.clientY; el.setPointerCapture(e.pointerId);
    el.style.transition = "none";
  });
  el.addEventListener("pointermove", (e) => {
    if (!drag) return;
    dx = e.clientX - sx; dy = e.clientY - sy;
    el.style.transform = `translate(${dx}px, ${dy * 0.3}px) rotate(${dx / 14}deg)`;
    el.style.setProperty("--like", Math.max(0, Math.min(1, dx / 110)));
    el.style.setProperty("--nope", Math.max(0, Math.min(1, -dx / 110)));
  });
  const end = () => {
    if (!drag) return;
    drag = false;
    el.style.transition = "";
    if (dx > 100) swipe(1);
    else if (dx < -100) swipe(-1);
    else { el.style.transform = ""; el.style.setProperty("--like", 0); el.style.setProperty("--nope", 0); }
    dx = dy = 0;
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

function swipe(dir) {
  const el = $('#deck .swipe-card[data-depth="0"]');
  if (!el || el.classList.contains("gone")) return;
  const c = POOL[deckIdx % POOL.length];
  el.classList.add("gone");
  el.style.setProperty(dir > 0 ? "--like" : "--nope", 1);
  el.style.transform = `translate(${dir * 150}vw, -40px) rotate(${dir * 40}deg)`;
  history.push({ idx: deckIdx, liked: dir > 0 });
  if (dir > 0) {
    if (!liked.some((l) => l.key === c.key)) liked.unshift(c);
    LS.set("dt_liked", liked.slice(0, 40));
    renderLiked();
    const r = el.getBoundingClientRect();
    fx().burst(r.left + r.width / 2, r.top + r.height / 3, 12);
    fx().buzz(25);
    fx().sound?.("like");
  } else {
    fx().buzz(8);
    fx().sound?.("nope");
  }
  deckIdx++;
  setTimeout(renderDeck, 320);
}

function undo() {
  const h = history.pop();
  if (!h) return;
  deckIdx = h.idx;
  if (h.liked) {
    const key = POOL[h.idx % POOL.length].key;
    liked = liked.filter((l) => l.key !== key);
    LS.set("dt_liked", liked);
    renderLiked();
  }
  renderDeck();
  fx().buzz(10);
}

function renderLiked() {
  $("#likedList").innerHTML = liked.length ? liked.map((c, i) => `
    <div class="liked-item">
      <span class="li-e">${c.e}</span><b>${esc(c.t)}</b>
      <button class="btn small primary" data-lbuild="${i}">✨ בנה</button>
      <button class="btn small ghost" data-ldel="${i}" title="הסר">✖</button>
    </div>`).join("") : `<p class="hint">עוד לא אהבת כלום – תתחיל להחליק 😉</p>`;
}

$("#likedList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-lbuild]");
  const d = e.target.closest("[data-ldel]");
  if (d) { liked.splice(Number(d.dataset.ldel), 1); LS.set("dt_liked", liked); renderLiked(); return; }
  if (!b) return;
  const c = liked[Number(b.dataset.lbuild)];
  window.Dateon?.buildFrom({ freeText: c.t, vibes: c.vibes, mainId: c.mainId, homeId: c.homeId });
});

$("#swYes").addEventListener("click", () => swipe(1));
$("#swNo").addEventListener("click", () => swipe(-1));
$("#swUndo").addEventListener("click", undo);
document.addEventListener("keydown", (e) => {
  if ($('[data-panel="surprise"]').classList.contains("hidden") || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
  if (e.key === "ArrowRight") swipe(1);
  if (e.key === "ArrowLeft") swipe(-1);
});

renderDeck();
renderLiked();
