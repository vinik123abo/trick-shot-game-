// דייטון – גלגל הדייטים וחפיסת ההחלקה
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const DI = window.DateIdeas;
const DP = window.DatePlaces;
const fx = () => window.FX || { burst() {}, buzz() {}, pop() {} };
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ======================= גלגל הדייטים ======================= */
const WHEEL = DI.QUICK_IDEAS;
const FILLS = ["var(--accent)", "var(--accent2)", "var(--violet)", "var(--accent-mid)"];
const N = WHEEL.length;
const SEG = 360 / N;
let wheelRot = 0;
let spinning = false;

function polar(r, deg) {
  const a = (deg - 90) * Math.PI / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

function drawWheel() {
  const svg = $("#wheel");
  let out = `<defs><radialGradient id="wshade"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity=".28"/></radialGradient></defs>`;
  WHEEL.forEach((w, i) => {
    const [x1, y1] = polar(96, i * SEG);
    const [x2, y2] = polar(96, (i + 1) * SEG);
    const [tx, ty] = polar(66, (i + 0.5) * SEG);
    out += `<path d="M0 0 L${x1} ${y1} A96 96 0 0 1 ${x2} ${y2} Z" style="fill:${FILLS[i % FILLS.length]}" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`;
    out += `<text x="${tx}" y="${ty}" font-size="17" text-anchor="middle" dominant-baseline="central" transform="rotate(${(i + 0.5) * SEG} ${tx} ${ty})">${w.e}</text>`;
  });
  out += `<circle r="96" fill="url(#wshade)"/><circle r="97" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"/>`;
  // נורות לד מסביב
  for (let i = 0; i < N * 2; i++) {
    const [x, y] = polar(90, i * (SEG / 2) + SEG / 4);
    out += `<circle class="bulb" cx="${x}" cy="${y}" r="2.2" style="animation-delay:${(i % 2) * 0.4}s"/>`;
  }
  svg.innerHTML = out;
}

function spin() {
  if (spinning) return;
  spinning = true;
  $("#wheelResult").classList.add("hidden");
  const wrap = $(".wheel-wrap");
  wrap.classList.add("spinning");
  const extra = 360 * (5 + Math.floor(Math.random() * 3)) + Math.random() * 360;
  wheelRot += extra;
  const svg = $("#wheel");
  const dur = reduceMotion ? 10 : 4800;
  svg.style.transition = `transform ${dur}ms cubic-bezier(.12, .7, .1, 1)`;
  svg.style.transform = `rotate(${wheelRot}deg)`;
  fx().buzz(20);
  fx().sound?.("whoosh");

  // "תקתוק" רטט כשעוברים בין פלחים
  let lastSeg = -1;
  const t0 = performance.now();
  const tick = () => {
    if (!spinning) return;
    const m = new DOMMatrix(getComputedStyle(svg).transform);
    const ang = ((Math.atan2(m.b, m.a) * 180 / Math.PI) + 360) % 360;
    const seg = Math.floor(ang / SEG);
    if (seg !== lastSeg) {
      lastSeg = seg;
      $(".wheel-pointer").classList.remove("tick");
      void $(".wheel-pointer").offsetWidth;
      $(".wheel-pointer").classList.add("tick");
      if (performance.now() - t0 > 2500) fx().buzz(4);
      fx().sound?.("tick");
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  setTimeout(() => {
    spinning = false;
    wrap.classList.remove("spinning");
    const at = (360 - (wheelRot % 360)) % 360;
    const idx = Math.floor(at / SEG) % N;
    showWheelResult(WHEEL[idx], idx);
  }, dur + 80);
}

function showWheelResult(w, idx) {
  const r = $("#wheelResult");
  r.innerHTML = `
    <div class="wr-emoji">${w.e}</div>
    <div class="wr-text"><small>הגלגל בחר בשבילך:</small><b>${esc(w.t)}</b><span>${esc(w.s)}</span></div>
    <div class="wr-btns">
      <button class="btn primary" data-wbuild="${idx}">✨ בנה את הדייט הזה</button>
      <button class="btn ghost" data-wagain>🎡 עוד סיבוב</button>
    </div>`;
  r.classList.remove("hidden");
  const box = $(".wheel-wrap").getBoundingClientRect();
  fx().burst(box.left + box.width / 2, box.top + box.height / 2, 30);
  fx().buzz([40, 60, 40]);
  fx().sound?.("fanfare");
}

$("#spinBtn").addEventListener("click", spin);
$("#wheelResult").addEventListener("click", (e) => {
  if (e.target.closest("[data-wagain]")) return spin();
  const b = e.target.closest("[data-wbuild]");
  if (!b) return;
  // משתמשים במנגנון הרעיונות המהירים הקיים
  document.querySelector(`.tab[data-tab="plan"]`).click();
  document.querySelector(`#quickGrid [data-q="${b.dataset.wbuild}"]`)?.click();
});
drawWheel();

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
