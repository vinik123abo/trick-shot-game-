// דייטון – אפקטים ויזואליים: סצנת לב תלת-ממדית, הטיית כרטיסים, פיצוצי לבבות ואנימציות
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ---------- ערכות צבעים ---------- */
const THEMES = {
  sunset: { name: "שקיעה ורודה", css: ["#ff4f7b", "#ffb36b", "#c86bff"], heart: 0xff3d6e, sheen: 0xffb36b, metal: 0.15, rough: 0.18,
    lights: [0xff4f7b, 0xffb36b, 0xc86bff], palette: [0xff4f7b, 0xffb36b, 0xff8fb1, 0xc86bff, 0xffffff], spark: 0xffd6e4 },
  neon: { name: "ניאון לילי", css: ["#00e5ff", "#ff3df2", "#7c4dff"], heart: 0xff2fe6, sheen: 0x00e5ff, metal: 0.2, rough: 0.15,
    lights: [0x00e5ff, 0xff3df2, 0x7c4dff], palette: [0x00e5ff, 0xff3df2, 0x7c4dff, 0xffffff], spark: 0xaaf6ff },
  gold: { name: "זהב יוקרתי", css: ["#d4a24c", "#f7e3a1", "#7a5414"], heart: 0xd9a441, sheen: 0xfff1c1, metal: 0.9, rough: 0.22,
    lights: [0xffd27a, 0xfff1c1, 0xb07a2a], palette: [0xd4a24c, 0xf7e3a1, 0xffffff, 0x9c7a3c], spark: 0xfff1c1 },
  ocean: { name: "אוקיינוס", css: ["#2ee6c5", "#4da3ff", "#6a7dff"], heart: 0x22d8b8, sheen: 0x4da3ff, metal: 0.2, rough: 0.12,
    lights: [0x2ee6c5, 0x4da3ff, 0x6a7dff], palette: [0x2ee6c5, 0x4da3ff, 0x6a7dff, 0xffffff], spark: 0xc6fff4 },
  wine: { name: "יין אדום", css: ["#e0284f", "#ff8a5c", "#9e2257"], heart: 0xc8102e, sheen: 0xff8a5c, metal: 0.25, rough: 0.2,
    lights: [0xe0284f, 0xff8a5c, 0x9e2257], palette: [0xe0284f, 0xff8a5c, 0x9e2257, 0xffd0c0], spark: 0xffc2b0 },
  pastel: { name: "פסטל בוקר", css: ["#ff6f9c", "#ffb38a", "#b38cff"], heart: 0xff7fa8, sheen: 0xffd0b3, metal: 0.05, rough: 0.25,
    lights: [0xff9fbf, 0xffd0a0, 0xc9b3ff], palette: [0xff9fbf, 0xffc4a3, 0xc9b3ff, 0xffffff], spark: 0xff9fbf },
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};
let recolor3D = null;

/* ---------- ערכה בהתאמה אישית ---------- */
const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r) => "#" + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => v + (B[i] - v) * t)); };
const lum = (h) => { const [r, g, b] = hexRgb(h).map((v) => v / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const rgba = (h, a) => `rgba(${hexRgb(h).join(", ")}, ${a})`;
const CUSTOM_VARS = ["--bg", "--text", "--text-soft", "--muted", "--accent", "--accent-mid", "--accent2", "--violet", "--on-accent", "--depth", "--glow-rgb",
  "--a1", "--a2", "--a3", "--glass", "--glass-2", "--glass-hi", "--glass-lo", "--glass-line", "--field", "--bar", "--dlg", "--shadow", "--grain",
  "--line", "--card", "--card2", "--bg2", "color-scheme"];

function customVars({ a, b, bg }) {
  const dark = lum(bg) < 0.45;
  const text = dark ? "#fbf5ff" : "#2a1a2a";
  const mid = mix(a, b, 0.5);
  return {
    "--bg": bg, "--text": text, "--text-soft": mix(text, bg, 0.18), "--muted": mix(text, bg, 0.42),
    "--accent": a, "--accent-mid": mid, "--accent2": b, "--violet": mix(a, dark ? "#7a3cff" : "#b38cff", 0.55),
    "--on-accent": lum(a) > 0.55 ? "#1a0d14" : "#ffffff", "--depth": mix(a, "#000000", 0.38), "--glow-rgb": hexRgb(a).join(", "),
    "--a1": a, "--a2": b, "--a3": mid,
    "--glass": dark ? "rgba(255, 255, 255, 0.06)" : "rgba(255, 255, 255, 0.55)",
    "--glass-2": dark ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.8)",
    "--glass-hi": dark ? "rgba(255, 255, 255, 0.085)" : "rgba(255, 255, 255, 0.75)",
    "--glass-lo": dark ? "rgba(255, 255, 255, 0.02)" : "rgba(255, 255, 255, 0.4)",
    "--glass-line": dark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.12)",
    "--field": dark ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 255, 255, 0.85)",
    "--bar": rgba(bg, 0.65), "--dlg": rgba(mix(bg, text, 0.06), 0.93),
    "--shadow": dark ? "rgba(0, 0, 0, 0.85)" : "rgba(0, 0, 0, 0.2)", "--grain": dark ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.35)",
    "--line": mix(bg, text, 0.2), "--card": mix(bg, text, 0.08), "--card2": mix(bg, text, 0.11), "--bg2": mix(bg, text, 0.06),
    "color-scheme": dark ? "dark" : "light",
  };
}
function customTheme3D({ a, b }) {
  const mid = mix(a, b, 0.5);
  return { name: "הסגנון שלי", css: [a, b, mid], heart: a, sheen: b, metal: 0.2, rough: 0.18, lights: [a, b, mid], palette: [a, b, mid, "#ffffff"], spark: mix(b, "#ffffff", 0.6) };
}
let customColors = (() => { try { return JSON.parse(localStorage.getItem("dt_custom")) || null; } catch { return null; } })();
if (customColors) THEMES.custom = customTheme3D(customColors);

function setRootVars(vars) {
  const r = document.documentElement.style;
  CUSTOM_VARS.forEach((k) => r.removeProperty(k));
  if (vars) Object.entries(vars).forEach(([k, v]) => r.setProperty(k, v));
}

/* ---------- צלילים: מנוע מוזיקלי עם הדהוד, וכמה סגנונות לבחירה ---------- */
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const SOUND_PACKS = {
  piano: { e: "🎹", n: "פסנתר רך" },
  musicbox: { e: "🎶", n: "קופסת נגינה" },
  harp: { e: "🪕", n: "נבל קסום" },
  lofi: { e: "🌙", n: "לו-פיי חמים" },
  strings: { e: "🎻", n: "כינורות" },
  classic: { e: "🎮", n: "משחקי" },
};
const Sound = {
  ctx: null, out: null, wet: null, noiseBuf: null,
  on: (() => { try { return localStorage.getItem("dt_sound") !== "0"; } catch { return true; } })(),
  pack: (() => { try { const p = localStorage.getItem("dt_sound_pack"); return SOUND_PACKS[p] ? p : "piano"; } catch { return "piano"; } })(),
  ac() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      const c = this.ctx = new C();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      comp.connect(c.destination);
      this.out = c.createGain(); this.out.gain.value = 0.9; this.out.connect(comp);
      // הדהוד: תגובת אולם שנוצרת מרעש דועך
      const len = c.sampleRate * 2.8, ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4); }
      const rev = c.createConvolver(); rev.buffer = ir;
      this.wet = c.createGain(); this.wet.gain.value = 1;
      this.wet.connect(rev); rev.connect(comp);
      const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      this.noiseBuf = nb;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  },
  // צליל אחד עם הרמוניות, מעטפת, מסנן ושליחה להדהוד
  voice(n, at, o = {}) {
    const c = this.ctx, t = c.currentTime + at;
    const { dur = 1.2, vol = 0.08, attack = 0.005, partials = [[1, 1]], type = "sine", lp = 4000, wet = 0.25, vib = 0, detune = 0 } = o;
    const env = c.createGain(), filt = c.createBiquadFilter();
    filt.type = "lowpass"; filt.frequency.value = lp; filt.Q.value = 0.5;
    filt.connect(env); env.connect(this.out);
    const send = c.createGain(); send.gain.value = wet; env.connect(send); send.connect(this.wet);
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(vol, t + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let lfo = null;
    if (vib) { lfo = c.createOscillator(); lfo.frequency.value = 5.2; const lg = c.createGain(); lg.gain.value = vib; lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.05); lfo.gain = lg; }
    for (const [ratio, amp] of partials) {
      const osc = c.createOscillator(), g = c.createGain();
      osc.type = type; osc.frequency.value = midi(n) * ratio; osc.detune.value = detune;
      if (lfo) lfo.gain.connect(osc.detune);
      g.gain.value = amp;
      osc.connect(g); g.connect(filt);
      osc.start(t); osc.stop(t + dur + 0.05);
    }
  },
  // משב רוח רך (רעש מסונן שזז)
  air(at, dur, f1, f2, vol = 0.04, wet = 0.3) {
    const c = this.ctx, t = c.currentTime + at;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = "bandpass"; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(f1, t); bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp); bp.connect(g); g.connect(this.out);
    const s = c.createGain(); s.gain.value = wet; g.connect(s); s.connect(this.wet);
    src.start(t); src.stop(t + dur + 0.05);
  },
  inst(pack) {
    const V = (o) => (n, at = 0, vol, dur) => this.voice(n, at, Object.assign({}, o, vol != null ? { vol } : {}, dur != null ? { dur } : {}));
    switch (pack) {
      case "piano": return V({ dur: 1.5, vol: 0.07, attack: 0.004, partials: [[1, 1], [2, 0.32], [3, 0.12], [4, 0.05]], lp: 3600, wet: 0.28 });
      case "musicbox": return V({ dur: 1.9, vol: 0.06, attack: 0.002, partials: [[1, 1], [2.76, 0.28], [5.4, 0.1], [8.93, 0.04]], lp: 9000, wet: 0.4 });
      case "harp": return V({ dur: 2.3, vol: 0.07, attack: 0.003, partials: [[1, 1], [2, 0.45], [3, 0.2], [4, 0.08], [6, 0.03]], lp: 2800, wet: 0.5 });
      case "lofi": return V({ dur: 1.6, vol: 0.075, attack: 0.012, partials: [[1, 1], [2, 0.16], [3, 0.05]], lp: 1300, wet: 0.22, vib: 7, detune: -8 });
      case "strings": return V({ dur: 2.2, vol: 0.05, attack: 0.22, type: "sawtooth", partials: [[1, 1], [1.003, 0.7]], lp: 1700, wet: 0.55, vib: 9 });
      default: return null;
    }
  },
  play(name) {
    if (!this.on) return;
    try {
      if (!this.ac()) return;
      if (this.pack === "classic") return this.classic(name);
      const I = this.inst(this.pack);
      const P = this.pack;
      // צלילים קצרים עדינים (גם בכינורות – פיציקטו)
      const pluck = P === "strings" ? this.inst("harp") : I;
      const up = P === "musicbox" ? 12 : 0;
      const chord = P === "lofi" ? [57, 60, 64, 67, 71] : [60, 64, 67, 71, 74];
      switch (name) {
        case "pop": pluck(79 + up, 0, 0.025, 0.6); break;
        case "tick": pluck(91 + up, 0, 0.008, 0.15); break;
        case "flip": pluck(76 + up, 0, 0.035, 0.7); pluck(83 + up, 0.06, 0.03, 0.8); break;
        case "like": pluck(72 + up, 0, 0.05); pluck(76 + up, 0.08, 0.05); pluck(79 + up, 0.16, 0.05, 1.8); break;
        case "nope": pluck(67 + up, 0, 0.035, 0.7); pluck(62 + up, 0.09, 0.03, 0.9); break;
        case "whoosh": this.air(0, 0.6, 300, 2600, 0.035); pluck(84 + up, 0.25, 0.02, 1); break;
        case "chime": [0, 4, 7, 11, 12].forEach((s, i) => I(72 + s + up, i * 0.075, 0.05, 2)); break;
        case "sparkle": [84, 86, 88, 91, 93, 96].forEach((n, i) => pluck(n + up, i * 0.05, 0.022, 1)); break;
        case "fanfare":
          chord.forEach((n, i) => I(n + up, i * 0.035, 0.04, 2.8));
          [76, 79, 84, 88].forEach((n, i) => I(n + up, 0.3 + i * 0.13, 0.05, i === 3 ? 2.4 : 1.2));
          break;
      }
    } catch { /* ignore */ }
  },
  // הצלילים המקוריים ("משחקי")
  classic(name) {
    const c = this.ctx;
    const T = (freq, start, dur, type = "sine", vol = 0.12, slideTo = null) => {
      const t = c.currentTime + start, o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
    };
    switch (name) {
      case "pop": T(520, 0, 0.09, "sine", 0.1, 900); break;
      case "tick": T(1400, 0, 0.025, "square", 0.025); break;
      case "flip": T(260, 0, 0.12, "triangle", 0.08, 760); break;
      case "like": T(660, 0, 0.12); T(990, 0.09, 0.18); break;
      case "nope": T(320, 0, 0.18, "sawtooth", 0.05, 120); break;
      case "chime": [1047, 1319, 1568, 2093].forEach((f, i) => T(f, i * 0.08, 0.45, "triangle", 0.08)); break;
      case "fanfare": [523, 659, 784, 1047].forEach((f, i) => T(f, i * 0.11, i === 3 ? 0.7 : 0.2, "triangle", 0.12)); break;
      case "sparkle": for (let i = 0; i < 6; i++) T(1500 + Math.random() * 1500, i * 0.05, 0.15, "sine", 0.05); break;
      case "whoosh": T(900, 0, 0.25, "sine", 0.05, 180); break;
    }
  },
};
function sound(name) { Sound.play(name); }
const soundBtn = document.getElementById("soundBtn");
function paintSoundBtn() {
  if (soundBtn) { soundBtn.textContent = Sound.on ? "🔊" : "🔇"; soundBtn.title = Sound.on ? "השתק צלילים" : "הפעל צלילים"; }
  const box = document.getElementById("soundOn");
  if (box) box.checked = Sound.on;
}
document.getElementById("soundOn")?.addEventListener("change", (e) => {
  Sound.on = e.target.checked;
  try { localStorage.setItem("dt_sound", Sound.on ? "1" : "0"); } catch { /* ignore */ }
  paintSoundBtn();
  if (Sound.on) sound("chime");
});
soundBtn?.addEventListener("click", () => {
  Sound.on = !Sound.on;
  try { localStorage.setItem("dt_sound", Sound.on ? "1" : "0"); } catch { /* ignore */ }
  paintSoundBtn();
  sound("chime");
});
paintSoundBtn();

// בורר סגנון הצלילים
const packBox = document.getElementById("soundPacks");
if (packBox) {
  packBox.innerHTML = Object.entries(SOUND_PACKS).map(([k, p]) => `<button data-pack="${k}" class="${k === Sound.pack ? "on" : ""}">${p.e} ${p.n}</button>`).join("");
  packBox.addEventListener("click", (e) => {
    const b = e.target.closest("[data-pack]");
    if (!b) return;
    Sound.pack = b.dataset.pack;
    try { localStorage.setItem("dt_sound_pack", Sound.pack); } catch { /* ignore */ }
    packBox.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    if (!Sound.on) { Sound.on = true; try { localStorage.setItem("dt_sound", "1"); } catch { /* ignore */ } paintSoundBtn(); }
    sound("chime");
    setTimeout(() => sound("like"), 900);
  });
}
let currentTheme = THEMES[store.get("dt_theme", "sunset")] ? store.get("dt_theme", "sunset") : "sunset";

function applyTheme(key, animate = true) {
  if (!THEMES[key]) key = "sunset";
  currentTheme = key;
  setRootVars(key === "custom" && customColors ? customVars(customColors) : null);
  try { localStorage.setItem("dt_custom_vars", key === "custom" && customColors ? JSON.stringify(customVars(customColors)) : ""); } catch { /* ignore */ }
  document.documentElement.dataset.theme = key;
  store.set("dt_theme", key);
  document.querySelectorAll(".swatch").forEach((b) => b.classList.toggle("on", b.dataset.theme === key));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#1a0f1f";
  recolor3D?.(THEMES[key]);
  if (animate) { burst(innerWidth / 2, 140, 18); sound("sparkle"); }
}

const panel = document.getElementById("themePanel");
function renderSwatches() {
  document.getElementById("swatches").innerHTML = Object.entries(THEMES).map(([k, t]) => `
  <button class="swatch" data-theme="${k}" ${k === "custom" && customColors ? `style="${Object.entries(customVars(customColors)).map(([a, b]) => `${a}:${b}`).join(";")}"` : ""}><i style="background: conic-gradient(from 210deg, ${t.css[0]}, ${t.css[1]}, ${t.css[2]}, ${t.css[0]})"></i>${t.name}</button>`).join("");
  document.querySelectorAll(".swatch").forEach((b) => b.classList.toggle("on", b.dataset.theme === currentTheme));
}
renderSwatches();

// בונה הסגנון
const ctA = document.getElementById("ctA"), ctB = document.getElementById("ctB"), ctBg = document.getElementById("ctBg");
if (customColors) { ctA.value = customColors.a; ctB.value = customColors.b; ctBg.value = customColors.bg; }
let ctTimer = null;
function applyCustom(anim) {
  customColors = { a: ctA.value, b: ctB.value, bg: ctBg.value };
  try { localStorage.setItem("dt_custom", JSON.stringify(customColors)); } catch { /* ignore */ }
  THEMES.custom = customTheme3D(customColors);
  renderSwatches();
  applyTheme("custom", anim);
}
[ctA, ctB, ctBg].forEach((el) => el.addEventListener("input", () => { clearTimeout(ctTimer); ctTimer = setTimeout(() => applyCustom(false), 60); }));
document.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => {
  const [a, c, bg] = b.dataset.preset.split(",");
  ctA.value = a; ctB.value = c; ctBg.value = bg;
  applyCustom(true);
}));
document.getElementById("swatches").addEventListener("click", (e) => {
  const b = e.target.closest(".swatch");
  if (b) { applyTheme(b.dataset.theme); buzz(15); }
});
document.getElementById("themeBtn").addEventListener("click", (e) => { e.stopPropagation(); panel.classList.toggle("open"); });
document.addEventListener("click", (e) => { if (panel.classList.contains("open") && !panel.contains(e.target)) panel.classList.remove("open"); });

/* ---------- רטט ---------- */
const hapticBox = document.getElementById("hapticOn");
hapticBox.checked = store.get("dt_haptic", "1") === "1";
hapticBox.addEventListener("change", () => store.set("dt_haptic", hapticBox.checked ? "1" : "0"));
function buzz(pattern) {
  if (hapticBox.checked && navigator.vibrate) { try { navigator.vibrate(pattern); } catch { /* ignore */ } }
}

/* ---------- שובל לבבות ---------- */
const trailBox = document.getElementById("trailOn");
trailBox.checked = store.get("dt_trail", "0") === "1";
trailBox.addEventListener("change", () => store.set("dt_trail", trailBox.checked ? "1" : "0"));
let lastTrail = 0;
document.addEventListener("pointermove", (e) => {
  if (!trailBox.checked || reduceMotion || e.pointerType !== "mouse") return;
  const now = performance.now();
  if (now - lastTrail < 45) return;
  lastTrail = now;
  const s = document.createElement("span");
  s.className = "trail";
  s.textContent = ["💗", "✨", "💕"][Math.floor(Math.random() * 3)];
  s.style.left = e.clientX + "px";
  s.style.top = e.clientY + "px";
  document.body.appendChild(s);
  s.addEventListener("animationend", () => s.remove());
}, { passive: true });

/* ---------- הטיה תלת-ממדית לכרטיסים ---------- */
const TILT_SEL = ".tilt, .quick-item, .place, .home-card, .step, .food, .stat, .tip-box, .result-hero";
let tiltEl = null;

function resetTilt(el) {
  if (!el) return;
  el.style.transform = "";
  el.classList.remove("tilting");
}

if (finePointer && !reduceMotion) {
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest(TILT_SEL);
    if (el !== tiltEl) { resetTilt(tiltEl); tiltEl = el; }
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const max = el.classList.contains("result-hero") ? 4 : 9;
    el.classList.add("tilting");
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * max}deg) rotateY(${(x - 0.5) * max}deg) translateZ(6px)`;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  }, { passive: true });
  document.addEventListener("pointerleave", () => { resetTilt(tiltEl); tiltEl = null; });
}

/* ---------- פיצוץ לבבות ---------- */
const BURST = ["💖", "💘", "💕", "✨", "🌹", "💗", "🥂"];
function burst(x = innerWidth / 2, y = innerHeight / 3, n = 26) {
  if (reduceMotion) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "burst";
    s.textContent = BURST[i % BURST.length];
    const ang = Math.random() * Math.PI * 2;
    const dist = 90 + Math.random() * 220;
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    s.style.setProperty("--dy", Math.sin(ang) * dist - 120 + "px");
    s.style.setProperty("--rot", (Math.random() * 720 - 360) + "deg");
    s.style.fontSize = 16 + Math.random() * 22 + "px";
    s.style.animationDelay = Math.random() * 0.12 + "s";
    document.body.appendChild(s);
    s.addEventListener("animationend", () => s.remove());
  }
}

function pop(x, y) { burst(x, y, 8); }

// לבבות קטנים בכל לחיצה על כפתור ראשי
document.addEventListener("pointerdown", (e) => {
  const b = e.target.closest(".btn.primary, .quick-item, .tab");
  if (b) { pop(e.clientX, e.clientY); sound("pop"); }
});

/* ---------- סמן לשוניות נע ---------- */
function moveInk() {
  const nav = document.querySelector(".tabs");
  const ink = nav && nav.querySelector(".tab-ink");
  const on = nav && nav.querySelector(".tab.on");
  if (!ink || !on) return;
  const nr = nav.getBoundingClientRect(), or = on.getBoundingClientRect();
  if (or.left < nr.left + 4 || or.right > nr.right - 4) on.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  ink.style.width = on.offsetWidth + "px";
  ink.style.transform = `translateX(${on.offsetLeft - nav.scrollLeft}px)`;
}
new MutationObserver(moveInk).observe(document.querySelector(".tabs"), { subtree: true, attributes: true, attributeFilter: ["class"] });
addEventListener("resize", moveInk);
document.querySelector(".tabs").addEventListener("scroll", moveInk, { passive: true });
document.fonts?.ready.then(moveInk);
setTimeout(moveInk, 50);

/* ---------- גובה הכותרת (ללשוניות הדביקות) ---------- */
function setHeaderVar() {
  const h = document.querySelector(".topbar");
  if (h) document.documentElement.style.setProperty("--hdr", h.offsetHeight + "px");
}
setHeaderVar();
addEventListener("resize", setHeaderVar);

/* ---------- כפתורי הירו ---------- */
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-goto]");
  if (!g) return;
  document.querySelector(`.tab[data-tab="${g.dataset.goto}"]`)?.click();
  // בטלפון הלשוניות בתחתית – גוללים לתחילת התוכן
  setTimeout(() => {
    const mobile = matchMedia("(max-width: 640px)").matches;
    (mobile ? document.querySelector("main") : document.querySelector(".tabs")).scrollIntoView({ behavior: "smooth", block: "start" });
  }, 60);
});

/* ---------- מונים ---------- */
function countUp() {
  document.querySelectorAll("[data-count]").forEach((el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion) { el.textContent = target; return; }
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1400);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
countUp();

/* ---------- סצנת תלת-ממד ---------- */
async function initHero3D() {
  const canvas = document.getElementById("heroCanvas");
  if (!canvas) return;
  let THREE;
  try {
    THREE = await import("https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js");
  } catch {
    document.body.classList.add("no-3d");
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    document.body.classList.add("no-3d");
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia("(max-width: 640px)").matches ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // צורת לב
  const s = new THREE.Shape();
  s.moveTo(0, 0.5);
  s.bezierCurveTo(0, 0.5, -0.4, 1.4, -1.4, 1.4);
  s.bezierCurveTo(-2.9, 1.4, -2.9, -0.4, -2.9, -0.4);
  s.bezierCurveTo(-2.9, -1.4, -1.8, -2.5, 0, -3.5);
  s.bezierCurveTo(1.8, -2.5, 2.9, -1.4, 2.9, -0.4);
  s.bezierCurveTo(2.9, -0.4, 2.9, 1.4, 1.4, 1.4);
  s.bezierCurveTo(0.4, 1.4, 0, 0.5, 0, 0.5);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: true, bevelSegments: 12, steps: 1, bevelSize: 0.45, bevelThickness: 0.45, curveSegments: 48 });
  geo.center();

  const heartMat = new THREE.MeshPhysicalMaterial({
    color: 0xff3d6e, roughness: 0.18, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08,
    sheen: 1, sheenColor: new THREE.Color(0xffb36b), iridescence: 0.35,
  });
  const heart = new THREE.Mesh(geo, heartMat);
  heart.scale.setScalar(0.62);
  const heartGroup = new THREE.Group();
  heartGroup.add(heart);
  const world = new THREE.Group(); // כל הסצנה – מוזזת הצידה כדי לא להסתיר את הטקסט
  world.add(heartGroup);
  scene.add(world);

  // לבבות קטנים מרחפים
  const palette = [0xff4f7b, 0xffb36b, 0xff8fb1, 0xc86bff, 0xffffff];
  const minis = [];
  for (let i = 0; i < 22; i++) {
    const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: palette[i % palette.length], roughness: 0.3, metalness: 0.1, clearcoat: 0.8,
      transparent: true, opacity: 0.85,
    }));
    const sc = 0.07 + Math.random() * 0.12;
    m.scale.setScalar(sc);
    m.userData = {
      r: 2.2 + Math.random() * 2.4, a: Math.random() * Math.PI * 2, sp: 0.15 + Math.random() * 0.35,
      y: (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 4, spin: (Math.random() - 0.5) * 2,
    };
    minis.push(m);
    world.add(m);
  }

  // ניצוצות
  const pts = new THREE.BufferGeometry();
  const N = 260, arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 16;
    arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
  }
  pts.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  const sparkles = new THREE.Points(pts, new THREE.PointsMaterial({ color: 0xffd6e4, size: 0.04, transparent: true, opacity: 0.8 }));
  scene.add(sparkles);

  // תאורה
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 6); scene.add(key);
  const pink = new THREE.PointLight(0xff4f7b, 40, 30); pink.position.set(-4, -2, 4); scene.add(pink);
  const warm = new THREE.PointLight(0xffb36b, 35, 30); warm.position.set(4, 2, 3); scene.add(warm);
  const rim = new THREE.PointLight(0xc86bff, 30, 30); rim.position.set(0, 3, -4); scene.add(rim);

  // צביעה מחדש לפי ערכת הצבעים – במעבר חלק
  recolor3D = (t) => {
    const from = { h: heartMat.color.clone(), s: heartMat.sheenColor.clone(), l: [pink.color.clone(), warm.color.clone(), rim.color.clone()] };
    const to = { h: new THREE.Color(t.heart), s: new THREE.Color(t.sheen), l: t.lights.map((c) => new THREE.Color(c)) };
    heartMat.metalness = t.metal;
    heartMat.roughness = t.rough;
    minis.forEach((m, i) => m.material.color.set(t.palette[i % t.palette.length]));
    sparkles.material.color.set(t.spark);
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 700);
      heartMat.color.copy(from.h).lerp(to.h, k);
      heartMat.sheenColor.copy(from.s).lerp(to.s, k);
      [pink, warm, rim].forEach((L, i) => L.color.copy(from.l[i]).lerp(to.l[i], k));
      spinBoost += 0.02;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // אינטראקציה: עכבר / הטיית טלפון / גרירה
  const target = { x: 0, y: 0 };
  let spinBoost = 0, dragging = false, lastX = 0;
  const hero = canvas.closest(".hero3d");
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    target.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    target.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (dragging) { spinBoost += (e.clientX - lastX) * 0.004; lastX = e.clientX; }
  });
  hero.addEventListener("pointerdown", (e) => { dragging = true; lastX = e.clientX; });
  addEventListener("pointerup", () => { dragging = false; });
  canvas.addEventListener("click", () => { spinBoost += 0.6; heartMat.color.offsetHSL(0.04, 0, 0); });
  addEventListener("deviceorientation", (e) => {
    if (e.gamma == null) return;
    target.x = Math.max(-1, Math.min(1, e.gamma / 30));
    target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
  });

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // בנייד הלב קצת קטן יותר ומוזז למעלה
    camera.position.z = w < 640 ? 9.2 : 9;
    minis.forEach((m, i) => { m.visible = w >= 640 || i % 2 === 0; });
    world.position.x = w >= 900 ? -2.6 : w >= 640 ? -1.4 : 0;
    world.position.y = w < 640 ? 0.3 : 0;
    camera.updateProjectionMatrix();
  }
  addEventListener("resize", resize);
  resize();

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }).observe(canvas);

  const clock = new THREE.Clock();
  let running = false;
  function frame() {
    const t = clock.getElapsedTime();
    // פעימה
    const beat = 1 + Math.max(0, Math.sin(t * 3.2)) ** 8 * 0.08;
    heartGroup.scale.setScalar(beat);
    spinBoost *= 0.95;
    const SC = window.DateonScroll || { hero: 0, vel: 0 };
    heart.rotation.y += 0.006 + spinBoost * 0.1 + Math.min(0.18, Math.abs(SC.vel) * 0.004);
    world.scale.setScalar(1 - SC.hero * 0.3);
    heartGroup.rotation.x += (target.y * 0.35 - heartGroup.rotation.x) * 0.06;
    heartGroup.rotation.y += (target.x * 0.6 - heartGroup.rotation.y) * 0.06;
    heartGroup.position.y = Math.sin(t * 1.2) * 0.12 + SC.hero * 1.4;
    for (const m of minis) {
      const u = m.userData;
      u.a += u.sp * 0.01;
      m.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * u.sp * 2 + u.a) * 0.4, u.z + Math.sin(u.a) * 1.5);
      m.rotation.y += u.spin * 0.02;
    }
    sparkles.rotation.y = t * 0.03;
    camera.position.x += (target.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y += (-target.y * 0.4 - camera.position.y) * 0.04;
    camera.lookAt(camera.position.x * 0.5, 0, 0);
    renderer.render(scene, camera);
  }
  function loop() {
    if (running) return;
    running = true;
    const tick = () => {
      if (!visible || document.hidden) { running = false; return; }
      frame();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });
  document.body.classList.add("has-3d");
  recolor3D(THEMES[currentTheme]);
  if (reduceMotion) frame(); else loop();
}
initHero3D();

applyTheme(currentTheme, false);
window.FX = { burst, pop, buzz, applyTheme, THEMES, sound, Sound, SOUND_PACKS };
