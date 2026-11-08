// דייטון – אינטראקציה עם הגלילה
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;
root.classList.add("sfx");
if (reduce) root.classList.add("sfx-reduce");

/* ---------- סרגל התקדמות + כפתור חזרה למעלה ---------- */
const bar = document.createElement("div");
bar.className = "scroll-progress";
bar.innerHTML = `<i></i><b>💗</b>`;
document.body.appendChild(bar);

const topBtn = document.createElement("button");
topBtn.className = "to-top";
topBtn.title = "חזרה למעלה";
topBtn.setAttribute("aria-label", "חזרה למעלה");
topBtn.innerHTML = `<span>💘</span>`;
document.body.appendChild(topBtn);
topBtn.addEventListener("click", () => {
  window.FX?.sound("whoosh");
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
});

/* ---------- לבבות מרחפים בעומקים שונים (פרלקסה) ---------- */
const floaters = document.createElement("div");
floaters.className = "floaters";
floaters.setAttribute("aria-hidden", "true");
const FL = [];
if (!reduce) {
  const em = ["💗", "💕", "✨", "🌸", "💖", "🌹"];
  for (let i = 0; i < 14; i++) {
    const s = document.createElement("span");
    const depth = 0.15 + Math.random() * 0.85;
    s.textContent = em[i % em.length];
    s.style.left = Math.random() * 100 + "%";
    s.style.top = Math.random() * 100 + "%";
    s.style.fontSize = 10 + depth * 22 + "px";
    s.style.opacity = 0.12 + depth * 0.25;
    s.style.filter = `blur(${(1 - depth) * 2}px)`;
    floaters.appendChild(s);
    FL.push({ el: s, depth, phase: Math.random() * 6.28 });
  }
}
document.body.appendChild(floaters);

/* ---------- מצב גלילה ---------- */
const state = { hero: 0, vel: 0, y: 0 };
window.DateonScroll = state;
const hero = document.querySelector(".hero3d");
let lastY = scrollY, lastT = performance.now(), ticking = false, velDecay = null;

function update() {
  ticking = false;
  const y = scrollY, now = performance.now();
  const dt = Math.max(16, now - lastT);
  const v = ((y - lastY) / dt) * 16; // פיקסלים לפריים
  state.vel = state.vel * 0.7 + v * 0.3;
  lastY = y; lastT = now; state.y = y;

  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const p = Math.min(1, y / max);
  bar.style.setProperty("--p", p);
  topBtn.style.setProperty("--p", p);
  topBtn.classList.toggle("show", y > innerHeight * 0.9);
  const was = document.body.classList.contains("scrolled");
  document.body.classList.toggle("scrolled", y > 30);
  if (was !== y > 30) setTimeout(() => { const h = document.querySelector(".topbar"); if (h) root.style.setProperty("--hdr", h.offsetHeight + "px"); }, 320);

  // הירו: עומק ודהייה
  if (hero) {
    const h = hero.offsetHeight || 1;
    state.hero = Math.min(1, Math.max(0, y / h));
    hero.style.setProperty("--hp", state.hero.toFixed(3));
  }
  // "ג'לי" בגלילה מהירה
  if (!reduce) {
    const sv = Math.max(-5, Math.min(5, state.vel * 0.35));
    root.style.setProperty("--sv", sv.toFixed(2));
    for (const f of FL) f.el.style.transform = `translate3d(0, ${(-y * f.depth * 0.35) % (innerHeight * 1.4)}px, 0) rotate(${Math.sin(f.phase + y / 300) * 20}deg)`;
  }
  // ציר הזמן של התוכנית מצטייר תוך כדי גלילה
  const tl = document.querySelector("#result .timeline");
  if (tl) {
    const r = tl.getBoundingClientRect();
    const k = Math.min(1, Math.max(0, (innerHeight * 0.75 - r.top) / Math.max(1, r.height)));
    tl.style.setProperty("--tl", k.toFixed(3));
  }
  clearTimeout(velDecay);
  velDecay = setTimeout(() => { state.vel = 0; root.style.setProperty("--sv", 0); }, 120);
}
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
addEventListener("resize", update);
update();

/* ---------- הופעה בכניסה למסך ---------- */
const REVEAL = ".card, .section-title, .quick-item, .place, .home-card, .bouquet, .step, .food, .tip-box, .stat, .liked-item, .hero-stats > div";
const io = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); }
  }
}, { rootMargin: "0px 0px -30px 0px", threshold: 0 }) : null;

function watch(scope) {
  if (!io) { document.querySelectorAll(REVEAL).forEach((el) => el.classList.add("seen")); return; }
  (scope.matches && scope.matches(REVEAL) ? [scope] : []).concat([...scope.querySelectorAll(REVEAL)]).forEach((el) => {
    if (!el.classList.contains("seen") && !el.dataset.sfx) { el.dataset.sfx = "1"; io.observe(el); }
  });
}
watch(document.body);
new MutationObserver((muts) => {
  for (const m of muts) m.addedNodes.forEach((n) => { if (n.nodeType === 1) watch(n); });
}).observe(document.querySelector("main"), { childList: true, subtree: true });

// כשמחליפים לשונית – מה שכבר במסך מופיע מיד
document.addEventListener("click", (e) => {
  if (!e.target.closest(".tab, [data-goto]")) return;
  setTimeout(() => {
    document.querySelectorAll(".tab-panel:not(.hidden) [data-sfx]:not(.seen)").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0) el.classList.add("seen");
    });
    update();
  }, 60);
});

// רשת ביטחון: אם משהו לא נצפה (למשל בהדפסה) – מציגים הכל
addEventListener("beforeprint", () => document.querySelectorAll("[data-sfx]").forEach((el) => el.classList.add("seen")));
