// דייטון – תוספות אישיות: התמונה שלכם, ספירה לאחור, כרטיס הזמנה, מבחן התאמה, התקנה כאפליקציה
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const FX = () => window.FX || { burst() {}, buzz() {}, sound() {}, pop() {} };
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2600);
}
const goTab = (name) => $(`.tab[data-tab="${name}"]`)?.click();

/* ===================================================================
 * 1. אתם – שמות ותמונה זוגית
 * =================================================================== */
const couple = Object.assign({ me: "", her: "", bg: true, blur: 6, dark: 55, hero: true }, LS.get("dt_couple", {}));
let photo = null; // dataURL

// התמונה נשמרת ב-IndexedDB (מקום רב יותר מ-localStorage), ורק במכשיר שלך
const IDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      const r = indexedDB.open("dateon", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async get(k) {
    const db = await this.open();
    return new Promise((res) => { const q = db.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); });
  },
  async set(k, v) {
    const db = await this.open();
    return new Promise((res) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = () => res(true); tx.onerror = () => res(false); });
  },
  async del(k) {
    const db = await this.open();
    return new Promise((res) => { const tx = db.transaction("kv", "readwrite"); tx.objectStore("kv").delete(k); tx.oncomplete = () => res(true); });
  },
};

function saveCouple() { LS.set("dt_couple", couple); }

function resizeImage(file, max = 1600) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      res(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("bad image")); };
    img.src = url;
  });
}

function applyPhoto() {
  const bgEl = $("#coupleBg");
  const on = !!photo && couple.bg;
  document.body.classList.toggle("has-photo", on);
  bgEl.querySelector("i").style.backgroundImage = photo ? `url("${photo}")` : "";
  document.documentElement.style.setProperty("--photo-blur", couple.blur + "px");
  document.documentElement.style.setProperty("--photo-dark", couple.dark / 100);
  // פולרואיד בהירו
  const pol = $("#heroPolaroid");
  pol.classList.toggle("hidden", !(photo && couple.hero));
  if (photo) pol.querySelector("img").src = photo;
  pol.querySelector("span").textContent = couple.me && couple.her ? `${couple.me} & ${couple.her} 💕` : "אנחנו 💕";
  // אזור ההעלאה
  $("#photoPreview").innerHTML = photo
    ? `<div class="polaroid mini"><img src="${photo}" alt="התמונה שלכם" /><span>${esc(pol.querySelector("span").textContent)}</span></div>`
    : `<div class="photo-empty">📷<br />עוד לא הוספת תמונה</div>`;
  $("#photoRemove").classList.toggle("hidden", !photo);
  $("#photoOpts").classList.toggle("disabled", !photo);
}

function initCouple() {
  $("#meName").value = couple.me;
  $("#herName").value = couple.her;
  $("#photoBgOn").checked = couple.bg;
  $("#photoHeroOn").checked = couple.hero;
  $("#photoBlur").value = couple.blur;
  $("#photoDark").value = couple.dark;
  ["meName", "herName"].forEach((id) => $("#" + id).addEventListener("input", (e) => {
    couple[id === "meName" ? "me" : "her"] = e.target.value.trim();
    saveCouple(); applyPhoto(); drawInvite();
  }));
  $("#photoBgOn").addEventListener("change", (e) => { couple.bg = e.target.checked; saveCouple(); applyPhoto(); });
  $("#photoHeroOn").addEventListener("change", (e) => { couple.hero = e.target.checked; saveCouple(); applyPhoto(); });
  $("#photoBlur").addEventListener("input", (e) => { couple.blur = +e.target.value; saveCouple(); applyPhoto(); });
  $("#photoDark").addEventListener("input", (e) => { couple.dark = +e.target.value; saveCouple(); applyPhoto(); });
  $("#photoInput").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      photo = await resizeImage(f);
      await IDB.set("photo", photo).catch(() => {});
      applyPhoto(); drawInvite();
      FX().burst(innerWidth / 2, innerHeight / 2, 24); FX().sound("chime");
      toast("התמונה נוספה 💕 (נשמרת רק במכשיר שלך)");
    } catch { toast("לא הצלחתי לקרוא את התמונה"); }
    e.target.value = "";
  });
  $("#photoRemove").addEventListener("click", async () => {
    photo = null;
    await IDB.del("photo").catch(() => {});
    applyPhoto(); drawInvite();
    toast("התמונה הוסרה");
  });
  IDB.get("photo").then((p) => { photo = p; applyPhoto(); drawInvite(); }).catch(() => applyPhoto());
}

/* ===================================================================
 * 2. ספירה לאחור לדייט
 * =================================================================== */
let cd = LS.get("dt_countdown", null); // { title, when (ISO local), place, done }
let cdTimer = null;

function pad2(n) { return String(n).padStart(2, "0"); }
function localInputValue(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`; }
function fmtDateHe(d) {
  try { return d.toLocaleString("he-IL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }); }
  catch { return d.toString(); }
}
function gcalStamp(d) { return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`; }

function calendarUrl(c) {
  const s = new Date(c.when), e = new Date(s.getTime() + 3 * 3600e3);
  const q = new URLSearchParams({ action: "TEMPLATE", text: c.title || "דייט 💘", dates: `${gcalStamp(s)}/${gcalStamp(e)}`, details: "תוכנן עם דייטון 💘", location: c.place || "" });
  return "https://calendar.google.com/calendar/render?" + q.toString();
}

function downloadIcs(c) {
  const s = new Date(c.when), e = new Date(s.getTime() + 3 * 3600e3);
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Dateon//HE", "BEGIN:VEVENT", `UID:${Date.now()}@dateon`,
    `DTSTAMP:${gcalStamp(new Date())}`, `DTSTART:${gcalStamp(s)}`, `DTEND:${gcalStamp(e)}`,
    `SUMMARY:${(c.title || "דייט").replace(/[,;]/g, " ")}`, `LOCATION:${(c.place || "").replace(/[,;]/g, " ")}`,
    "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:הדייט מתקרב 💘", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "date.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function renderCountdown() {
  const box = $("#cdDisplay");
  const chip = $("#cdChip");
  clearInterval(cdTimer);
  if (!cd) {
    box.innerHTML = `<p class="hint">עוד לא נקבע תאריך. בחר תאריך ושעה והספירה מתחילה 👇</p>`;
    chip.classList.add("hidden");
    $("#cdActions").classList.add("hidden");
    return;
  }
  $("#cdActions").classList.remove("hidden");
  $("#cdCal").href = calendarUrl(cd);
  box.innerHTML = `
    <div class="cd-title">${esc(cd.title || "הדייט שלנו")} 💘</div>
    <div class="cd-when">${esc(fmtDateHe(new Date(cd.when)))}${cd.place ? " · 📍 " + esc(cd.place) : ""}</div>
    <div class="cd-tiles">
      ${["days:ימים", "hours:שעות", "mins:דקות", "secs:שניות"].map((x) => { const [k, l] = x.split(":"); return `<div class="cd-tile"><b data-k="${k}">00</b><span>${l}</span></div>`; }).join("")}
    </div>
    <div class="cd-msg" id="cdMsg"></div>`;
  const tick = () => {
    const diff = new Date(cd.when) - new Date();
    if (diff <= 0) {
      $$(".cd-tile b", box).forEach((b) => { b.textContent = "00"; });
      $("#cdMsg").textContent = "הגיע הזמן! תהנו 💘";
      chip.textContent = "💘 היום!";
      chip.classList.remove("hidden");
      if (!cd.done) { cd.done = true; LS.set("dt_countdown", cd); FX().burst(innerWidth / 2, innerHeight / 2, 40); FX().sound("fanfare"); }
      clearInterval(cdTimer);
      return;
    }
    const v = { days: Math.floor(diff / 864e5), hours: Math.floor(diff / 36e5) % 24, mins: Math.floor(diff / 6e4) % 60, secs: Math.floor(diff / 1e3) % 60 };
    for (const [k, n] of Object.entries(v)) {
      const el = box.querySelector(`[data-k="${k}"]`);
      const txt = pad2(n);
      if (el && el.textContent !== txt) { el.textContent = txt; el.parentElement.classList.remove("bump"); void el.offsetWidth; el.parentElement.classList.add("bump"); }
    }
    $("#cdMsg").textContent = v.days === 0 && v.hours < 3 ? "עוד ממש קצת! תתחיל להתארגן 😍" : v.days === 0 ? "הדייט היום! 🔥" : v.days <= 2 ? "כבר כמעט! תזמין מקום אם עוד לא 😉" : "";
    chip.textContent = v.days > 0 ? `⏳ ${v.days} ימים` : `⏳ ${v.hours}:${pad2(v.mins)}`;
    chip.classList.remove("hidden");
  };
  tick();
  cdTimer = setInterval(tick, 1000);
}

function initCountdown() {
  const def = new Date(Date.now() + 3 * 864e5);
  def.setHours(20, 0, 0, 0);
  $("#cdWhen").value = cd ? cd.when : localInputValue(def);
  $("#cdTitle").value = cd?.title || "";
  $("#cdPlace").value = cd?.place || "";
  $("#cdStart").addEventListener("click", () => {
    const when = $("#cdWhen").value;
    if (!when) return toast("בחר תאריך ושעה");
    cd = { title: $("#cdTitle").value.trim() || "הדייט שלנו", when, place: $("#cdPlace").value.trim(), done: false };
    LS.set("dt_countdown", cd);
    renderCountdown(); drawInvite();
    window.DateonNative?.scheduleDate?.(cd).then((ok) => ok && toast("נקבעו תזכורות: יום לפני ושעתיים לפני 🔔"));
    FX().burst(innerWidth / 2, innerHeight / 2, 20); FX().sound("chime");
    toast("הספירה התחילה ⏳");
  });
  $("#cdClear").addEventListener("click", () => { window.DateonNative?.cancelDate?.(); cd = null; localStorage.removeItem("dt_countdown"); renderCountdown(); });
  $("#cdIcs").addEventListener("click", () => cd && downloadIcs(cd));
  $("#cdShare").addEventListener("click", () => {
    if (!cd) return;
    const days = Math.max(0, Math.ceil((new Date(cd.when) - new Date()) / 864e5));
    const txt = `⏳ עוד ${days} ימים ל${cd.title || "דייט שלנו"}! 💘\n📅 ${fmtDateHe(new Date(cd.when))}${cd.place ? "\n📍 " + cd.place : ""}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(txt), "_blank", "noopener");
  });
  $("#cdChip").addEventListener("click", () => { goTab("personal"); setTimeout(() => $("#cdSection").scrollIntoView({ behavior: "smooth", block: "start" }), 80); });
  renderCountdown();
}

/* ===================================================================
 * 3. כרטיס הזמנה מעוצב (Canvas)
 * =================================================================== */
const MSGS = [
  "יש לי תוכנית מיוחדת בשבילך, ואני לא יכול לחכות לראות אותך 💫",
  "פנה את הערב – אני דואג להכל. את רק צריכה להגיע יפה כמו תמיד 😍",
  "ערב אחד, שנינו, בלי טלפונים. מסכימה?",
  "מוכנה להרפתקה קטנה? תסמכי עליי 😉",
  "כי מגיע לך ערב מושלם. ומגיע לי לבלות אותו איתך ❤️",
];
let inv = Object.assign({ style: "romantic", title: "את מוזמנת לדייט", msg: MSGS[0], usePhoto: true }, LS.get("dt_invite", {}));
const W = 1080, H = 1350;

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
  ctx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3);
  ctx.closePath();
}

function wrapLines(ctx, text, maxW) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function text(ctx, str, y, { size = 48, font = "Heebo", weight = 700, color = "#fff", maxW = 860, lh = 1.3, glow = null, grad = null } = {}) {
  ctx.font = `${weight} ${size}px "${font}", "Heebo", sans-serif`;
  ctx.textAlign = "center";
  ctx.direction = "rtl";
  ctx.textBaseline = "top";
  const lines = wrapLines(ctx, str, maxW);
  lines.forEach((ln, i) => {
    const yy = y + i * size * lh;
    if (grad) {
      const g = ctx.createLinearGradient(W / 2 - 300, yy, W / 2 + 300, yy + size);
      grad.forEach((c, j) => g.addColorStop(j / (grad.length - 1), c));
      ctx.fillStyle = g;
    } else ctx.fillStyle = color;
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 30; }
    ctx.fillText(ln, W / 2, yy);
    if (glow) { ctx.fillText(ln, W / 2, yy); ctx.shadowBlur = 0; }
  });
  return y + lines.length * size * lh;
}

let photoImg = null;
function loadPhotoImg() {
  return new Promise((res) => {
    if (!photo) return res(null);
    if (photoImg && photoImg.src === photo) return res(photoImg);
    const i = new Image();
    i.onload = () => { photoImg = i; res(i); };
    i.onerror = () => res(null);
    i.src = photo;
  });
}

function drawCover(ctx, img, x, y, w, h) {
  const k = Math.max(w / img.width, h / img.height);
  const iw = img.width * k, ih = img.height * k;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
}

function inviteData() {
  const when = cd ? fmtDateHe(new Date(cd.when)) : ($("#invWhen").value.trim() || "");
  return {
    to: couple.her || "", from: couple.me || "",
    title: inv.title, msg: inv.msg,
    when: $("#invWhen").value.trim() || when,
    place: $("#invPlace").value.trim() || cd?.place || "",
  };
}

// מחולל מספרים קבוע (כדי שהתמונה הממוזערת והכרטיס המלא ייראו אותו דבר)
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function rad(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
function petal(ctx, x, y, w, h, rot, c1, c2) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = lin(ctx, -w, -h, w, h, [[0, c1], [1, c2]]);
  ctx.beginPath(); ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.beginPath(); ctx.ellipse(-w * .25, -h * .3, w * .35, h * .25, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
function flower(ctx, x, y, r, col, center = "#ffd36b") {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ctx.save(); ctx.translate(x + Math.cos(a) * r * .55, y + Math.sin(a) * r * .55); ctx.rotate(a);
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, r * .6, r * .42, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = center; ctx.beginPath(); ctx.arc(x, y, r * .28, 0, 7); ctx.fill();
}
function leaf(ctx, x, y, l, rot, col = "#7fb48a") {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(l / 2, 0, l / 2, l / 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(l, 0); ctx.stroke();
  ctx.restore();
}

// כל סגנון: רקע, מיקום התחלה, צבע מסגרת לתמונה, לב עליון, צבעי טקסט ותיבת פרטים
const STYLES = {
  romantic: { n: "רומנטי", y: 130, ring: "#fff", heart: "#fff", box: "rgba(255,255,255,.2)",
    P: { c: "#fff", c2: "rgba(255,255,255,.92)", font: "Secular One" },
    bg(ctx) {
      ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, "#ff4f7b"], [.55, "#ff8a6b"], [1, "#ffb36b"]]); ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 26; i++) { ctx.globalAlpha = .12 + ((i * 37) % 10) / 50; ctx.fillStyle = "#fff"; heartPath(ctx, (i * 211) % W, (i * 347) % H, 30 + (i * 53) % 80); ctx.fill(); }
      ctx.globalAlpha = 1;
    } },
  roses: { n: "עלי ורדים", y: 140, ring: "#ffd1dc", heart: "#ffb3c6", box: "rgba(255,200,215,.12)",
    P: { c: "#ffe9ee", c2: "#ffd1dc", font: "Secular One", grad: ["#ffc2d1", "#ffffff", "#ff9fb7"] },
    bg(ctx) {
      ctx.fillStyle = rad(ctx, W / 2, H * .45, 100, 900, [[0, "#6e0f2a"], [1, "#22030c"]]); ctx.fillRect(0, 0, W, H);
      const r = rng(7);
      for (let i = 0; i < 70; i++) {
        let x = r() * W, y = r() * H;
        if (x > 200 && x < W - 200 && y > 300 && y < H - 260) { if (r() < .8) continue; ctx.globalAlpha = .35; } else ctx.globalAlpha = .9;
        petal(ctx, x, y, 22 + r() * 26, 14 + r() * 16, r() * 6.3, "#ff3b6b", "#8a0026");
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = rad(ctx, W / 2, H / 2, 300, 900, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.45)"]]); ctx.fillRect(0, 0, W, H);
    } },
  sunset: { n: "שקיעה על הים", y: 110, ring: "#fff1c1", heart: null, box: "rgba(20,8,40,.35)",
    P: { c: "#fff", c2: "#ffe6f0", font: "Secular One", glow: "rgba(255,120,150,.6)" },
    bg(ctx) {
      const hz = H * .6;
      ctx.fillStyle = lin(ctx, 0, 0, 0, hz, [[0, "#2b1055"], [.45, "#7a2a7e"], [.8, "#e0577a"], [1, "#ffb36b"]]); ctx.fillRect(0, 0, W, hz);
      ctx.fillStyle = rad(ctx, W / 2, hz, 40, 420, [[0, "rgba(255,230,170,.9)"], [1, "rgba(255,180,120,0)"]]); ctx.fillRect(0, 0, W, hz);
      ctx.fillStyle = lin(ctx, 0, hz - 170, 0, hz + 170, [[0, "#fff4cf"], [1, "#ff9a5c"]]);
      ctx.beginPath(); ctx.arc(W / 2, hz, 170, Math.PI, 0); ctx.fill();
      ctx.fillStyle = lin(ctx, 0, hz, 0, H, [[0, "#4a1f6a"], [1, "#12061f"]]); ctx.fillRect(0, hz, W, H - hz);
      const r = rng(3);
      for (let i = 0; i < 60; i++) {
        const y = hz + 10 + Math.pow(r(), 1.6) * (H - hz), w = (1 - (y - hz) / (H - hz)) * 260 * r() + 20;
        ctx.fillStyle = `rgba(255,${190 + r() * 50 | 0},140,${.15 + r() * .35})`; ctx.fillRect(W / 2 - w / 2 + (r() - .5) * 120, y, w, 3);
      }
      ctx.strokeStyle = "rgba(30,10,40,.6)"; ctx.lineWidth = 4;
      [[300, 300], [360, 330], [760, 260]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 18, y - 8); ctx.quadraticCurveTo(x - 8, y - 14, x, y); ctx.quadraticCurveTo(x + 8, y - 14, x + 18, y - 8); ctx.stroke(); });
    } },
  stars: { n: "לילה מכוכב", y: 430, yImg: 140, ring: "#dfe6ff", heart: null, box: "rgba(160,180,255,.1)",
    P: { c: "#eef2ff", c2: "#c9d3f5", font: "Secular One", grad: ["#c9d6ff", "#ffffff", "#ffd6f0"], glow: "rgba(170,190,255,.5)" },
    bg(ctx, img) {
      ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, "#050a24"], [.6, "#14103a"], [1, "#2a1145"]]); ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-.5);
      ctx.fillStyle = rad(ctx, 0, 0, 10, 520, [[0, "rgba(180,160,255,.18)"], [1, "rgba(0,0,0,0)"]]); ctx.scale(2.2, .5); ctx.beginPath(); ctx.arc(0, 0, 520, 0, 7); ctx.fill();
      ctx.restore();
      const r = rng(11);
      for (let i = 0; i < 320; i++) { const s = r() * 2.4 + .4; ctx.fillStyle = `rgba(255,255,255,${.3 + r() * .7})`; ctx.beginPath(); ctx.arc(r() * W, r() * H, s, 0, 7); ctx.fill(); }
      ctx.fillStyle = "#fff6d5"; ctx.shadowColor = "#fff6d5"; ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(170, 170, 70, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = "#08102c"; ctx.beginPath(); ctx.arc(200, 150, 64, 0, 7); ctx.fill();
      // קבוצת כוכבים בצורת לב
      const cx = img ? W - 200 : W / 2, cy = img ? 180 : 230, sc = img ? 6 : 11;
      const pts = [];
      for (let k = 0; k < 16; k++) { const t = (k / 16) * Math.PI * 2; pts.push([cx + 16 * Math.pow(Math.sin(t), 3) * sc, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * sc]); }
      ctx.strokeStyle = "rgba(200,215,255,.5)"; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke();
      pts.forEach(([x, y]) => { ctx.fillStyle = "#fff"; ctx.shadowColor = "#bcd0ff"; ctx.shadowBlur = 16; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill(); });
      ctx.shadowBlur = 0;
    } },
  watercolor: { n: "צבעי מים", y: 150, ring: "#fff", heart: null, box: "rgba(184,58,107,.07)",
    P: { c: "#4a2a3a", c2: "#6a4a5a", font: "Secular One", grad: ["#c2185b", "#e0577a", "#a04ec2"] },
    bg(ctx) {
      ctx.fillStyle = "#fffaf5"; ctx.fillRect(0, 0, W, H);
      const r = rng(5), cols = ["255,150,180", "255,190,150", "200,170,255", "150,220,200", "255,170,200"];
      ctx.globalCompositeOperation = "multiply";
      for (let i = 0; i < 22; i++) {
        const edge = i % 4, x = edge === 0 ? r() * 260 : edge === 1 ? W - r() * 260 : r() * W, y = edge === 2 ? r() * 260 : edge === 3 ? H - r() * 260 : r() * H;
        const rr = 120 + r() * 220, c = cols[i % cols.length];
        ctx.fillStyle = rad(ctx, x, y, 0, rr, [[0, `rgba(${c},.5)`], [.7, `rgba(${c},.18)`], [1, `rgba(${c},0)`]]);
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.lineWidth = 4;
      [[170, 1120, 70, "#e0577a"], [930, 230, 60, "#a04ec2"], [880, 1150, 46, "#e0577a"]].forEach(([x, y, s, c]) => {
        ctx.strokeStyle = c; heartPath(ctx, x, y, s); ctx.stroke(); ctx.globalAlpha = .5; heartPath(ctx, x + 4, y + 3, s); ctx.stroke(); ctx.globalAlpha = 1;
      });
    } },
  bokeh: { n: "אורות חמים", y: 230, ring: "#ffd27a", heart: "#ffd27a", box: "rgba(255,210,122,.1)",
    P: { c: "#fff5e6", c2: "#ffe2bf", font: "Secular One", grad: ["#ffd27a", "#fff5e6", "#ffb36b"], glow: "rgba(255,200,120,.45)" },
    bg(ctx) {
      ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, "#1c0b14"], [1, "#3a1a0e"]]); ctx.fillRect(0, 0, W, H);
      const r = rng(9), cols = ["255,200,110", "255,140,160", "255,170,90", "255,230,170"];
      for (let i = 0; i < 46; i++) {
        const x = r() * W, y = r() * H, rr = 20 + r() * 110, c = cols[i % cols.length], a = .12 + r() * .35;
        ctx.fillStyle = rad(ctx, x, y, rr * .6, rr, [[0, `rgba(${c},${a})`], [1, `rgba(${c},0)`]]); ctx.beginPath(); ctx.arc(x, y, rr, 0, 7); ctx.fill();
      }
      // שרשרת נורות
      [[70, 90], [H - 60, -70]].forEach(([base, sag]) => {
        ctx.strokeStyle = "rgba(40,25,15,.9)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, base); ctx.quadraticCurveTo(W / 2, base + sag * 2, W + 20, base); ctx.stroke();
        for (let i = 0; i <= 16; i++) {
          const t = i / 16, x = -20 + (W + 40) * t, y = (1 - t) * (1 - t) * base + 2 * (1 - t) * t * (base + sag * 2) + t * t * base;
          const c = ["#ffd27a", "#ff9fb1", "#fff1c1"][i % 3];
          ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = 24; ctx.beginPath(); ctx.ellipse(x, y + 14, 9, 13, 0, 0, 7); ctx.fill();
        }
        ctx.shadowBlur = 0;
      });
    } },
  floral: { n: "זר פרחים", y: 210, ring: "#fff", heart: "#e0577a", box: "rgba(176,48,96,.07)",
    P: { c: "#5a2a3a", c2: "#7a4a5a", font: "Secular One", grad: ["#b03060", "#e0577a", "#b03060"] },
    bg(ctx) {
      ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, "#fdeef1"], [1, "#fbe1e7"]]); ctx.fillRect(0, 0, W, H);
      const r = rng(13), cols = ["#f7a1b8", "#ffc6a8", "#ffffff", "#e889a8", "#fbd3e0"];
      const cluster = (cx, cy, n) => {
        for (let i = 0; i < n; i++) leaf(ctx, cx + (r() - .5) * 200, cy + (r() - .5) * 160, 60 + r() * 50, r() * 6.3, r() < .5 ? "#86b893" : "#a7cfa9");
        for (let i = 0; i < n; i++) flower(ctx, cx + (r() - .5) * 180, cy + (r() - .5) * 140, 26 + r() * 26, cols[(r() * cols.length) | 0]);
      };
      cluster(90, 90, 9); cluster(W - 90, 90, 9); cluster(90, H - 90, 9); cluster(W - 90, H - 90, 9);
      for (let i = 0; i < 7; i++) { flower(ctx, 220 + i * 107, 40 + r() * 30, 16 + r() * 8, cols[i % cols.length]); flower(ctx, 220 + i * 107, H - 40 - r() * 30, 16 + r() * 8, cols[(i + 2) % cols.length]); }
      ctx.strokeStyle = "rgba(176,48,96,.25)"; ctx.lineWidth = 2; ctx.strokeRect(70, 70, W - 140, H - 140);
    } },
  letter: { n: "מכתב אהבה", y: 300, ring: "#fff", heart: null, box: "rgba(138,21,48,.06)",
    P: { c: "#3a2030", c2: "#5a3a48", font: "Secular One", grad: ["#8a1530", "#c0284f", "#8a1530"] },
    bg(ctx) {
      ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, "#f6d5d5"], [1, "#eeb0bd"]]); ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 2;
      for (let i = -H; i < W; i += 22) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H, H); ctx.stroke(); }
      ctx.save(); ctx.shadowColor = "rgba(90,20,40,.35)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14;
      ctx.fillStyle = "#fffaf1"; ctx.fillRect(80, 90, W - 160, H - 170); ctx.restore();
      ctx.strokeStyle = "rgba(120,150,200,.22)"; ctx.lineWidth = 2;
      for (let y = 260; y < H - 120; y += 56) { ctx.beginPath(); ctx.moveTo(130, y); ctx.lineTo(W - 130, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(220,90,110,.3)"; ctx.beginPath(); ctx.moveTo(W - 170, 90); ctx.lineTo(W - 170, H - 80); ctx.stroke();
      // חותם שעווה
      const sx = W / 2, sy = 160, r = rng(4);
      ctx.fillStyle = "#a3102c"; ctx.beginPath();
      for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, rr = 78 + (r() - .5) * 12; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = rad(ctx, sx - 20, sy - 20, 5, 80, [[0, "#d63a55"], [1, "#8a0c24"]]); ctx.beginPath(); ctx.arc(sx, sy, 60, 0, 7); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,.28)"; heartPath(ctx, sx, sy - 28, 56); ctx.fill();
      ctx.strokeStyle = "rgba(60,0,10,.35)"; ctx.lineWidth = 3; heartPath(ctx, sx, sy - 28, 56); ctx.stroke();
    } },
  gold: { n: "זהב יוקרתי", y: 130, ring: "#d4a24c", heart: "#d4a24c", box: "rgba(212,162,76,.12)",
    P: { c: "#f7e3a1", c2: "#e9dcc0", font: "Secular One", grad: ["#b8862c", "#f7e3a1", "#d4a24c"] },
    bg(ctx) {
      ctx.fillStyle = "#0b0906"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rad(ctx, W / 2, H / 2, 100, 800, [[0, "rgba(212,162,76,.18)"], [1, "rgba(0,0,0,0)"]]); ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#d4a24c"; ctx.lineWidth = 6; ctx.strokeRect(50, 50, W - 100, H - 100);
      ctx.lineWidth = 2; ctx.strokeRect(74, 74, W - 148, H - 148);
      [[74, 74], [W - 74, 74], [74, H - 74], [W - 74, H - 74]].forEach(([x, y]) => { ctx.fillStyle = "#f7e3a1"; ctx.beginPath(); ctx.arc(x, y, 12, 0, 7); ctx.fill(); });
    } },
  neon: { n: "ניאון", y: 440, ring: null, heart: null, box: "rgba(0,229,255,.1)",
    P: { c: "#e9fdff", c2: "#cfe9f7", font: "Secular One", glow: "#00e5ff" },
    bg(ctx) {
      ctx.fillStyle = "#06040f"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(124,77,255,.18)"; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.shadowColor = "#ff3df2"; ctx.shadowBlur = 40; ctx.strokeStyle = "#ff3df2"; ctx.lineWidth = 10;
      heartPath(ctx, W / 2, 130, 260); ctx.stroke(); ctx.stroke(); ctx.shadowBlur = 0;
    } },
  minimal: { n: "מינימליסטי", y: 290, ring: "#2b2b2b", heart: null, box: "rgba(0,0,0,.04)", title: 84,
    P: { c: "#1f1f1f", c2: "#444", font: "Heebo" },
    bg(ctx) {
      ctx.fillStyle = "#fbf6ef"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "#2b2b2b"; ctx.lineWidth = 2; ctx.strokeRect(90, 90, W - 180, H - 180);
      ctx.fillStyle = "#e0284f"; heartPath(ctx, W / 2, 200, 70); ctx.fill();
    } },
  vintage: { n: "גלויה וינטג'", y: 300, ring: "#fff", heart: null, box: "rgba(181,82,58,.1)", brand: 105,
    P: { c: "#5a2a1a", c2: "#6a4a3a", font: "Secular One" },
    bg(ctx) {
      ctx.fillStyle = "#efe0c2"; ctx.fillRect(0, 0, W, H);
      const r = rng(2);
      for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(120,80,40,${r() * .06})`; ctx.fillRect(r() * W, r() * H, 2, 2); }
      ctx.strokeStyle = "#b5523a"; ctx.lineWidth = 14; ctx.setLineDash([40, 22]); ctx.strokeRect(40, 40, W - 80, H - 80); ctx.setLineDash([]);
      ctx.fillStyle = "#fff"; ctx.fillRect(W - 300, 110, 180, 220);
      ctx.fillStyle = "#e0284f"; ctx.fillRect(W - 285, 125, 150, 190);
      ctx.fillStyle = "#fff"; heartPath(ctx, W - 210, 165, 100); ctx.fill();
      ctx.strokeStyle = "rgba(60,40,30,.5)"; ctx.lineWidth = 4;
      for (let rr = 50; rr <= 90; rr += 20) { ctx.beginPath(); ctx.arc(W - 360, 260, rr, 0, 7); ctx.stroke(); }
    } },
  photo: { n: "התמונה שלנו", y: H - 640, ring: null, heart: null, box: "rgba(255,255,255,.15)", fullPhoto: true,
    P: { c: "#fff", c2: "rgba(255,255,255,.92)", font: "Secular One" },
    bg(ctx, img) {
      if (img) drawCover(ctx, img, 0, 0, W, H);
      else { ctx.fillStyle = lin(ctx, 0, 0, W, H, [[0, "#3a1840"], [1, "#ff4f7b"]]); ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = lin(ctx, 0, H * .25, 0, H, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,.85)"]]); ctx.fillRect(0, 0, W, H);
    } },
};
const INV_STYLES = Object.entries(STYLES).map(([id, s]) => ({ id, n: s.n }));

// ציור כרטיס שלם על ctx בגודל 1080x1350
function paintInvite(ctx, S, d, img) {
  const st = STYLES[S] || STYLES.romantic;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  st.bg(ctx, img);
  let y = img && st.ring && st.yImg != null ? st.yImg : st.y;
  if (img && st.ring) {
    const r = 130, cx = W / 2, cy = y + r;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(cx, cy, r + 10, 0, 7); ctx.fillStyle = st.ring; ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.clip();
    drawCover(ctx, img, cx - r, cy - r, r * 2, r * 2);
    ctx.restore();
    y = cy + r + 40;
  } else if (st.heart) {
    ctx.fillStyle = st.heart;
    heartPath(ctx, W / 2, y + 30, 160); ctx.fill();
    y += 240;
  }
  const P = st.P;
  if (d.to) y = text(ctx, `${d.to},`, y, { size: 52, weight: 500, color: P.c2, font: "Heebo" }) + 6;
  y = text(ctx, d.title || "את מוזמנת לדייט", y, { size: st.title || 96, font: P.font, weight: 400, color: P.c, glow: P.glow, grad: P.grad, lh: 1.1 }) + 26;
  if (d.msg) y = text(ctx, d.msg, y, { size: 40, weight: 400, color: P.c2, maxW: 820, lh: 1.4 }) + 30;
  const details = [d.when && "📅 " + d.when, d.place && "📍 " + d.place].filter(Boolean);
  if (details.length) {
    const boxH = details.length * 66 + 34, bx = 150, bw = W - 300;
    ctx.fillStyle = st.box;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, y, bw, boxH, 30) : ctx.rect(bx, y, bw, boxH); ctx.fill();
    let yy = y + 22;
    details.forEach((t) => { text(ctx, t, yy, { size: 40, weight: 700, color: P.c, maxW: bw - 60 }); yy += 66; });
    y += boxH + 30;
  }
  if (d.from) text(ctx, `באהבה, ${d.from} ❤️`, Math.min(Math.max(y, H - 200), H - 170), { size: 46, weight: 400, font: P.font, color: P.c, glow: P.glow });
  ctx.globalAlpha = .5;
  text(ctx, "💘 דייטון", H - (st.brand || 88), { size: 24, weight: 500, color: P.c2 });
  ctx.globalAlpha = 1;
  ctx.restore();
}

let drawPending = false;
async function drawInvite() {
  if (drawPending) return;
  drawPending = true;
  await new Promise((r) => requestAnimationFrame(r));
  drawPending = false;
  const cv = $("#invCanvas");
  if (!cv) return;
  try { await Promise.all([document.fonts.load('80px "Secular One"'), document.fonts.load('700 40px "Heebo"')]); } catch { /* offline */ }
  const img = inv.usePhoto ? await loadPhotoImg() : null;
  paintInvite(cv.getContext("2d"), inv.style, inviteData(), img);
  scheduleThumbs();
}

// גלריית סגנונות עם תמונות ממוזערות אמיתיות
let thumbTimer = null, thumbKey = "";
function scheduleThumbs() {
  clearTimeout(thumbTimer);
  thumbTimer = setTimeout(renderThumbs, 350);
}
async function renderThumbs() {
  const img = inv.usePhoto ? await loadPhotoImg() : null;
  const d = inviteData();
  const key = JSON.stringify([d, !!img, img && img.src.length]);
  if (key === thumbKey) return;
  thumbKey = key;
  for (const c of $$("#invStyles canvas")) {
    const ctx = c.getContext("2d");
    ctx.setTransform(c.width / W, 0, 0, c.height / H, 0, 0);
    paintInvite(ctx, c.dataset.s, d, img);
  }
}

function invText() {
  const d = inviteData();
  return `💌 ${d.to ? d.to + ", " : ""}${d.title}\n${d.msg}${d.when ? "\n📅 " + d.when : ""}${d.place ? "\n📍 " + d.place : ""}${d.from ? "\n\nבאהבה, " + d.from + " ❤️" : ""}`;
}

async function shareInvite() {
  await drawInvite();
  const cv = $("#invCanvas");
  if (window.DateonNative?.shareImage) {
    FX().sound("chime");
    try { await window.DateonNative.shareImage(cv.toDataURL("image/png"), invText(), "invitation.png"); } catch { /* בוטל */ }
    return;
  }
  const blob = await new Promise((r) => cv.toBlob(r, "image/png"));
  const file = new File([blob], "invitation.png", { type: "image/png" });
  FX().sound("chime");
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: invText() }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  downloadBlob(blob, "invitation.png");
  toast("הכרטיס ירד – שלח אותו לה בוואטסאפ 💌");
  window.open("https://wa.me/?text=" + encodeURIComponent(invText()), "_blank", "noopener");
}

function downloadBlob(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function initInvite() {
  if (!STYLES[inv.style]) inv.style = "romantic";
  $("#invStyles").innerHTML = INV_STYLES.map((s) => `<button data-v="${s.id}" class="inv-style ${s.id === inv.style ? "on" : ""}" title="${esc(s.n)}"><canvas data-s="${s.id}" width="216" height="270"></canvas><span>${esc(s.n)}</span></button>`).join("");
  $("#invMsgs").innerHTML = MSGS.map((m, i) => `<option value="${i}">${esc(m)}</option>`).join("");
  $("#invTitle").value = inv.title;
  $("#invMsg").value = inv.msg;
  $("#invUsePhoto").checked = inv.usePhoto;
  const save = () => { LS.set("dt_invite", inv); drawInvite(); };
  $("#invStyles").addEventListener("click", (e) => {
    const b = e.target.closest("button.inv-style");
    if (!b) return;
    inv.style = b.dataset.v;
    $$("#invStyles button").forEach((x) => x.classList.toggle("on", x === b));
    b.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    $("#invCanvas").classList.remove("swap"); void $("#invCanvas").offsetWidth; $("#invCanvas").classList.add("swap");
    FX().sound("flip"); save();
  });
  $("#invTitle").addEventListener("input", (e) => { inv.title = e.target.value; save(); });
  $("#invMsg").addEventListener("input", (e) => { inv.msg = e.target.value; save(); });
  $("#invMsgs").addEventListener("change", (e) => { inv.msg = MSGS[+e.target.value]; $("#invMsg").value = inv.msg; save(); });
  $("#invUsePhoto").addEventListener("change", (e) => { inv.usePhoto = e.target.checked; save(); });
  ["invWhen", "invPlace"].forEach((id) => $("#" + id).addEventListener("input", () => drawInvite()));
  $("#invDownload").addEventListener("click", async () => {
    await drawInvite();
    if (window.DateonNative?.shareImage) { // באפליקציה אין "הורדות" – שומרים דרך תפריט השיתוף
      try { await window.DateonNative.shareImage($("#invCanvas").toDataURL("image/png"), "", "invitation.png"); } catch { /* בוטל */ }
      return;
    }
    $("#invCanvas").toBlob((b) => downloadBlob(b, "invitation.png"), "image/png");
    FX().sound("pop");
  });
  $("#invShare").addEventListener("click", shareInvite);
  $("#invCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(invText()); toast("הטקסט הועתק 📋"); } catch { toast("לא הצלחתי להעתיק"); }
  });
  // הטיה תלת-ממדית לתצוגה המקדימה
  const stage = $("#invStage");
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    $("#invCanvas").style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg)`;
  });
  stage.addEventListener("pointerleave", () => { $("#invCanvas").style.transform = ""; });
  drawInvite();
}

/* ===================================================================
 * 4. מבחן: איזה סוג דייט מתאים לכם?
 * =================================================================== */
const QUIZ = [
  { q: "ערב שישי פנוי. מה הכי בא לכם?", a: [["לשבת במקום שקט עם יין ונרות", { romantic: 2, chill: 1 }], ["משהו שמעלה אדרנלין", { adventure: 2 }], ["לבשל משהו טעים בבית", { home: 2, foodie: 1 }], ["הופעה או הצגה", { culture: 2 }]] },
  { q: "איזה נוף הכי מדבר אליכם?", a: [["שקיעה על הים", { romantic: 1, nature: 1 }], ["הרים ומפלים", { nature: 2, adventure: 1 }], ["אורות של עיר בלילה", { culture: 1, adventure: 1 }], ["הסלון שלנו עם שמיכה", { home: 2, chill: 1 }]] },
  { q: "מה הכי חשוב בדייט מוצלח?", a: [["שיחה עמוקה", { romantic: 1, chill: 1 }], ["לצחוק הרבה", { adventure: 1, creative: 1 }], ["אוכל מעולה", { foodie: 2 }], ["לחוות משהו חדש", { creative: 1, culture: 1, adventure: 1 }]] },
  { q: "בחרו קינוח:", a: [["פונדו שוקולד לשניים", { romantic: 1, home: 1 }], ["גלידה בהליכה", { chill: 1, nature: 1 }], ["קינוח שף מושקע", { foodie: 2 }], ["מה שמוכרים בדוכן ברחוב", { adventure: 1, foodie: 1 }]] },
  { q: "יש לכם יום שלם. איך הוא מתחיל?", a: [["קפה ומאפה בבית קפה קטן", { chill: 2 }], ["טיול בוקר בטבע", { nature: 2 }], ["סדנה – קדרות, בישול, ציור", { creative: 2 }], ["מוזיאון ובראנץ'", { culture: 1, foodie: 1 }]] },
  { q: "איזה תיאור הכי מתאים לכם כזוג?", a: [["רומנטיקנים חסרי תקנה", { romantic: 2 }], ["שני ילדים גדולים", { adventure: 1, creative: 1 }], ["אוהבי שקט ונוחות", { chill: 1, home: 1 }], ["חובבי טעמים ומקומות חדשים", { foodie: 1, culture: 1 }]] },
];
const TYPES = {
  romantic: { e: "🌹", n: "הרומנטיקנים", d: "נרות, שקיעות ושיחות עד מאוחר. אתם נהנים מהרגעים הקטנים והמושקעים.", ideas: "שקיעה על החוף · ארוחה לאור נרות · בר יין אינטימי" },
  adventure: { e: "⚡", n: "ההרפתקנים", d: "שגרה זה לא בשבילכם. אתם צריכים אדרנלין, צחוק ומשהו לספר עליו אחר כך.", ideas: "חדר בריחה · קיאקים · באולינג ותחרות" },
  chill: { e: "☕", n: "הנינוחים", d: "בלי לחץ ובלי טקסים. קפה טוב, הליכה ושיחה – וזה מושלם.", ideas: "קפה והליכה · פיקניק בפארק · גלידה בטיילת" },
  creative: { e: "🎨", n: "היצירתיים", d: "אתם אוהבים ליצור ביחד ולצאת עם משהו ביד – וזיכרון בלב.", ideas: "סדנת קדרות · ציור ויין · מבשלים מתכון חדש" },
  nature: { e: "🌿", n: "חובבי הטבע", d: "אוויר פתוח, נוף ושקט. הכי טוב לכם רחוק מהרעש.", ideas: "מסלול ומעיין · כוכבים במדבר · פיקניק בטבע" },
  foodie: { e: "🍝", n: "הגורמים", d: "הדרך ללב שלכם עוברת דרך הצלחת. כל דייט הוא חוויה קולינרית.", ideas: "סיבוב טעימות בשוק · מסעדת שף · סדנת בישול" },
  culture: { e: "🎭", n: "אנשי התרבות", d: "הופעות, סרטים ואמנות – ואחר כך שעות של שיחה על מה שראיתם.", ideas: "הופעה חיה · מוזיאון · סינמטק ובר" },
  home: { e: "🏠", n: "הביתיים", d: "הדייט הכי טוב שלכם הוא בבית, עם אוכל טוב, שמיכה ואחד את השנייה.", ideas: "ערב פסטה טרייה · קולנוע ביתי · ספא בסלון" },
};
let qi = 0, qScore = {};

function renderQuiz() {
  const box = $("#quizBox");
  if (qi < 0) {
    box.innerHTML = `<div class="quiz-start"><div class="quiz-big">🧠💘</div><p>6 שאלות קצרות, ותדעו בדיוק איזה דייט הכי מתאים לכם.</p><button class="btn primary big" id="quizGo">בואו נתחיל</button></div>`;
    $("#quizGo").onclick = () => { qi = 0; qScore = {}; renderQuiz(); };
    return;
  }
  if (qi >= QUIZ.length) return showQuizResult();
  const Q = QUIZ[qi];
  box.innerHTML = `
    <div class="quiz-progress"><i style="width:${(qi / QUIZ.length) * 100}%"></i></div>
    <div class="quiz-card">
      <small>שאלה ${qi + 1} מתוך ${QUIZ.length}</small>
      <h4>${esc(Q.q)}</h4>
      <div class="quiz-answers">${Q.a.map(([t], i) => `<button class="quiz-a" data-i="${i}">${esc(t)}</button>`).join("")}</div>
    </div>`;
  $$(".quiz-a", box).forEach((b) => b.addEventListener("click", () => {
    for (const [k, v] of Object.entries(Q.a[+b.dataset.i][1])) qScore[k] = (qScore[k] || 0) + v;
    b.classList.add("picked");
    FX().sound("pop"); FX().buzz(10);
    setTimeout(() => { qi++; renderQuiz(); }, 380);
  }));
}

function showQuizResult() {
  const sorted = Object.entries(qScore).sort((a, b) => b[1] - a[1]);
  const top = sorted[0]?.[0] || "romantic", second = sorted[1]?.[0];
  const T = TYPES[top];
  const total = sorted.reduce((s, x) => s + x[1], 0) || 1;
  LS.set("dt_quiz", { top, second });
  $("#quizBox").innerHTML = `
    <div class="quiz-result">
      <div class="qr-emoji">${T.e}</div>
      <small>אתם...</small>
      <h4>${T.n}</h4>
      <p>${T.d}</p>
      <div class="qr-bars">${sorted.slice(0, 3).map(([k, v]) => `<div><span>${TYPES[k].e} ${TYPES[k].n}</span><i style="--w:${Math.round((v / total) * 100)}%"></i><b>${Math.round((v / total) * 100)}%</b></div>`).join("")}</div>
      <p class="qr-ideas">💡 דייטים בשבילכם: ${T.ideas}</p>
      <div class="actions">
        <button class="btn primary" id="quizBuild">✨ בנה לנו דייט כזה</button>
        <button class="btn ghost" id="quizShare">📲 שתף</button>
        <button class="btn ghost" id="quizAgain">🔄 שוב</button>
      </div>
    </div>`;
  const r = $("#quizBox").getBoundingClientRect();
  FX().burst(r.left + r.width / 2, r.top + 120, 34); FX().sound("fanfare"); FX().buzz([30, 40, 30]);
  $("#quizAgain").onclick = () => { qi = 0; qScore = {}; renderQuiz(); };
  $("#quizBuild").onclick = () => window.Dateon?.buildFrom({ freeText: `דייט בסגנון ${T.n}`, vibes: [top, second].filter(Boolean) });
  $("#quizShare").onclick = () => window.open("https://wa.me/?text=" + encodeURIComponent(`עשיתי את המבחן בדייטון – אנחנו ${T.n} ${T.e}\n${T.d}\nבואי נעשה דייט כזה? 😉`), "_blank", "noopener");
}

/* ===================================================================
 * 4ב. זרים ופרחים
 * =================================================================== */
function initFlowers() {
  const DP = window.DatePlaces;
  if (!DP || !$("#flowerSection")) return;
  let occ = "first";
  const cityGuess = () => $("#city")?.value.trim() || "";
  $("#flowerOcc").innerHTML = DP.OCCASIONS.map((o, i) => `<button data-v="${o.id}" class="${i ? "" : "on"}">${o.l}</button>`).join("");
  const render = () => {
    const list = DP.BOUQUETS.filter((b) => b.occ.includes(occ));
    $("#bouquetList").innerHTML = list.map((b) => `
      <div class="bouquet">
        <div class="bq-e">${b.e}</div>
        <h5>${esc(b.n)}</h5>
        <p class="bq-f">${esc(b.f)}</p>
        <p class="bq-m">💬 ${esc(b.m)}</p>
        <span class="price">${esc(b.price)}</span>
        <p class="bq-tip">💡 ${esc(b.tip)}</p>
        <div class="prow">
          <a class="btn small ghost" href="${esc(DP.flowerSearch(cityGuess()))}" target="_blank" rel="noopener">📍 איפה קונים</a>
          <button class="btn small ghost" data-bqshare="${b.id}">📲 תזכורת לעצמי</button>
        </div>
      </div>`).join("");
  };
  $("#flowerOcc").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    occ = b.dataset.v;
    $$("#flowerOcc button").forEach((x) => x.classList.toggle("on", x === b));
    FX().sound("flip");
    render();
  });
  $("#bouquetList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-bqshare]");
    if (!b) return;
    const q = DP.BOUQUETS.find((x) => x.id === b.dataset.bqshare);
    window.open("https://wa.me/?text=" + encodeURIComponent(`💐 תזכורת: לקנות ${q.n} (${q.price})\n${q.f}\n💡 ${q.tip}`), "_blank", "noopener");
  });
  const refreshLinks = () => {
    $("#flowerNear").href = DP.flowerSearch(cityGuess());
    $("#flowerDelivery").href = DP.flowerSearch(cityGuess(), true);
  };
  $("#flowerTips").innerHTML = DP.FLOWER_TIPS.map((t) => `<li>${esc(t)}</li>`).join("");
  $("#city")?.addEventListener("input", refreshLinks);
  refreshLinks();
  render();
}

/* ===================================================================
 * 5. חיבור לתוכנית הדייט (כפתורי "ספירה" ו"הזמנה")
 * =================================================================== */
function fromPlan(plan, mode) {
  if (!plan) return;
  const firstPlace = (plan.timeline?.find((s) => s.place_name && s.place_name !== "בבית")?.place_name || "").split(" · ")[0];
  goTab("personal");
  if (mode === "countdown") {
    $("#cdTitle").value = plan.title;
    $("#cdPlace").value = firstPlace;
    const t = plan.timeline?.[0]?.time;
    if (t && /^\d\d:\d\d$/.test(t)) {
      const d = new Date($("#cdWhen").value || Date.now());
      const [h, m] = t.split(":").map(Number);
      d.setHours(h, m, 0, 0);
      $("#cdWhen").value = localInputValue(d);
    }
    setTimeout(() => { $("#cdSection").scrollIntoView({ behavior: "smooth", block: "start" }); $("#cdWhen").focus({ preventScroll: true }); }, 120);
    toast("בחר תאריך ולחץ 'התחל ספירה' ⏳");
  } else {
    $("#invPlace").value = firstPlace;
    if (!cd && plan.timeline?.[0]?.time) $("#invWhen").value = `ב-${plan.timeline[0].time}`;
    inv.msg = `${plan.title} – ${plan.summary}`.slice(0, 160);
    $("#invMsg").value = inv.msg;
    LS.set("dt_invite", inv);
    drawInvite();
    setTimeout(() => $("#invSection").scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }
}

/* ===================================================================
 * 6. התקנה כאפליקציה (PWA)
 * =================================================================== */
let installEvt = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvt = e;
  $("#installBtn").classList.remove("hidden");
  $("#installRow").classList.remove("hidden");
});
async function doInstall() {
  if (!installEvt) {
    toast(/iphone|ipad|ipod/i.test(navigator.userAgent) ? "באייפון: שתף ⬆️ ← 'הוסף למסך הבית'" : "בדפדפן: תפריט ⋮ ← 'התקן אפליקציה'");
    return;
  }
  installEvt.prompt();
  const { outcome } = await installEvt.userChoice.catch(() => ({}));
  if (outcome === "accepted") { FX().burst(); FX().sound("fanfare"); toast("דייטון הותקן! 🎉"); }
  installEvt = null;
  $("#installBtn").classList.add("hidden");
}
addEventListener("appinstalled", () => { $("#installBtn").classList.add("hidden"); });

if (!window.DateonNative?.native && "serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  // כשמגיעה גרסה חדשה – מציעים לרענן (אחרת המשתמש רואה את הישנה עד הביקור הבא)
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController) { hadController = true; return; }
    if (document.querySelector(".update-bar")) return;
    const bar = document.createElement("div");
    bar.className = "update-bar";
    bar.innerHTML = `<span>✨ דייטון עודכן לגרסה חדשה</span><button class="btn small primary">רענן</button>`;
    bar.querySelector("button").onclick = () => location.reload();
    document.body.appendChild(bar);
  });
}

/* ---------- הפעלה ---------- */
initCouple();
initCountdown();
initInvite();
initFlowers();
qi = -1; renderQuiz();
$("#installBtn").addEventListener("click", doInstall);
$("#installNow")?.addEventListener("click", doInstall);
if (matchMedia("(display-mode: standalone)").matches) document.body.classList.add("standalone");
// טיפ התקנה לאייפון (שם אין כפתור התקנה אוטומטי)
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (isIOS && !standalone && !window.DateonNative?.native && !LS.get("dt_ios_hint", false)) {
  setTimeout(() => {
    const tip = document.createElement("div");
    tip.className = "ios-hint";
    tip.innerHTML = `<span>📲 להתקנה כאפליקציה: לחצו על <b>שתף</b> ⬆️ ואז <b>"הוסף למסך הבית"</b></span><button aria-label="סגור">✕</button>`;
    tip.querySelector("button").onclick = () => { tip.remove(); LS.set("dt_ios_hint", true); };
    document.body.appendChild(tip);
  }, 5000);
}
// קיצורי דרך מהאייקון (#plan, #surprise, #personal...)
const hashTab = location.hash.slice(1);
if (hashTab && $(`.tab[data-tab="${hashTab}"]`)) setTimeout(() => goTab(hashTab), 50);

window.DateonExtras = { fromPlan, drawInvite };
