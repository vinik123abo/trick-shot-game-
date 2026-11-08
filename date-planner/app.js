// דייטון – לוגיקת האפליקציה
const DI = window.DateIdeas;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } },
};

const settings = Object.assign({ apiKey: "", images: true }, LS.get("dt_settings", {}));
let currentPlan = null;
let lastInput = null;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ---------- טופס ---------- */
DI.CITIES.forEach((c) => { const o = document.createElement("option"); o.value = c; $("#cities").appendChild(o); });

$$(".chips").forEach((group) => {
  group.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (group.classList.contains("single")) $$("button", group).forEach((x) => x.classList.toggle("on", x === b));
    else b.classList.toggle("on");
  });
});

function chipVal(name) {
  const g = $(`.chips[data-name="${name}"]`);
  const on = $$("button.on", g).map((b) => b.dataset.v);
  return g.classList.contains("single") ? on[0] : on;
}
function setChips(name, vals) {
  const g = $(`.chips[data-name="${name}"]`);
  const arr = [].concat(vals ?? []);
  $$("button", g).forEach((b) => b.classList.toggle("on", arr.includes(b.dataset.v)));
}

function readForm() {
  return {
    freeText: $("#freeText").value.trim(),
    city: $("#city").value.trim(),
    herLikes: $("#herLikes").value.trim(),
    stage: chipVal("stage") || "first",
    vibes: chipVal("vibes"),
    budget: Number(chipVal("budget") || 2),
    time: chipVal("time") || "evening",
  };
}

function updateModeNote() {
  $("#modeNote").textContent = settings.apiKey
    ? "🤖 מצב AI פעיל – Claude יבנה לך תוכנית אישית מכל תיאור."
    : "⚡ מנוע הרעיונות המובנה פעיל. להתאמה אישית מלאה עם AI – הוסף מפתח Claude בהגדרות ⚙️";
}

/* ---------- Claude ---------- */
const PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "vibe_label", "duration", "budget_estimate", "image_prompt", "timeline", "restaurants", "outfit", "tips", "conversation_starters", "backup_plan", "pro_move"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    vibe_label: { type: "string" },
    duration: { type: "string" },
    budget_estimate: { type: "string" },
    image_prompt: { type: "string" },
    timeline: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["time", "emoji", "title", "description", "place_name", "maps_query", "cost", "image_prompt"],
        properties: {
          time: { type: "string" },
          emoji: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          place_name: { type: "string" },
          maps_query: { type: "string" },
          cost: { type: "number" },
          image_prompt: { type: "string" },
        },
      },
    },
    restaurants: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "why", "price", "maps_query"],
        properties: {
          name: { type: "string" },
          why: { type: "string" },
          price: { type: "string" },
          maps_query: { type: "string" },
        },
      },
    },
    outfit: { type: "string" },
    tips: { type: "array", items: { type: "string" } },
    conversation_starters: { type: "array", items: { type: "string" } },
    backup_plan: { type: "string" },
    pro_move: { type: "string" },
  },
};

const SYSTEM_PROMPT = `אתה "דייטון" – מתכנן דייטים מומחה, חם ומעשי, שעוזר לגברים שלא יודעים לתכנן דייטים.
המשתמש מתאר במילים פשוטות איזה דייט הוא רוצה. אתה בונה תוכנית דייט מלאה ומוכנה לביצוע.

כללים:
- כל הטקסטים בעברית טבעית וזורמת, בגוף שני לגבר ("תזמין", "תביא"), בלי שפה מליצית.
- timeline: 2–4 תחנות בסדר כרונולוגי עם שעה (HH:MM), אימוג'י אחד, כותרת קצרה, תיאור של 1–3 משפטים עם פרטים מעשיים, שם מקום, ועלות משוערת לזוג בשקלים (מספר).
- אם המשתמש ציין עיר – תמליץ על מקומות אמיתיים ומוכרים שאתה בטוח שקיימים שם (מסעדות, חופים, תצפיות, ברים). אם אינך בטוח שמקום ספציפי קיים או פתוח – תתאר את סוג המקום במקום להמציא שם. maps_query הוא מחרוזת חיפוש לגוגל מפות (שם המקום + עיר, או סוג המקום + עיר). בדייט בבית maps_query ריק.
- restaurants: 3 אפשרויות אוכל שמתאימות לתקציב ולאווירה, עם הסבר קצר למה זה מתאים ומחיר (₪/₪₪/₪₪₪ + הערכה לזוג).
- image_prompt (בתוכנית ובכל תחנה): תיאור סצנה באנגלית בלבד למחולל תמונות – צילום קולנועי של זוג בדייט במקום ובתאורה המתאימים, בלי טקסט בתמונה.
- tips: 3–5 טיפים קצרים ומעשיים שמתאימים לשלב הקשר. conversation_starters: 4 שאלות פתיחה טובות. outfit: מה ללבוש. backup_plan: מה עושים אם משהו משתבש (גשם, מקום סגור). pro_move: מחווה קטנה אחת שתעשה רושם.
- תתייחס לתקציב ברצינות. בדייט ראשון – מקום ציבורי, קצר יחסית, שמאפשר לדבר.`;

let sdkPromise = null;
function loadSdk() {
  // טעינה רק כשיש מפתח – כך האפליקציה עובדת גם בלי חיבור ל-CDN
  sdkPromise ||= import("https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.3.0/+esm");
  return sdkPromise;
}

async function buildPlanWithClaude(input) {
  const { default: Anthropic } = await loadSdk();
  const client = new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });

  const stageLabel = DI.STAGE_LABEL[input.stage] || "";
  const vibes = (input.vibes || []).map((v) => DI.VIBE_LABEL[v]).join(", ") || "לבחירתך";
  const budget = { 1: "חסכוני", 2: "בינוני", 3: "מפנק" }[input.budget];
  const userMsg = `תבנה לי דייט.
תיאור חופשי: ${input.freeText || "(לא נכתב – תפתיע אותי)"}
עיר/אזור: ${input.city || "לא צוין"}
מה היא אוהבת: ${input.herLikes || "לא צוין"}
סוג הדייט: ${stageLabel}
אווירה: ${vibes}
תקציב: ${budget}
מתי: ${DI.TIME[input.time]?.label || "ערב"}
${input.variation ? "תן רעיון שונה מהקודם: " + input.variation : ""}`;

  const stream = client.beta.messages.stream({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: { type: "json_schema", schema: PLAN_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMsg }],
  });
  const msg = await stream.finalMessage();

  if (msg.stop_reason === "refusal") throw Object.assign(new Error("refusal"), { kind: "refusal" });
  const textBlock = msg.content.find((b) => b.type === "text");
  if (!textBlock) throw new Error("empty response");
  const plan = JSON.parse(textBlock.text);
  plan.city = input.city;
  plan.timeline.forEach((s) => { s.maps_url = DI.mapsUrl(s.maps_query, ""); });
  plan.restaurants.forEach((r) => { r.maps_url = DI.mapsUrl(r.maps_query, ""); });
  plan._source = "claude";
  return plan;
}

/* ---------- בניית תוכנית ---------- */
async function build(input, opts = {}) {
  lastInput = input;
  const result = $("#result");
  result.classList.remove("hidden");
  result.innerHTML = `<div class="card loader"><span class="heart">💘</span><p>${settings.apiKey ? "Claude מתכנן לך את הדייט המושלם..." : "בונים לך את הדייט..."}</p></div>`;
  result.scrollIntoView({ behavior: "smooth", block: "start" });
  setBusy(true);

  let plan;
  try {
    if (settings.apiKey) {
      try {
        plan = await buildPlanWithClaude(Object.assign({}, input, opts.variation ? { variation: currentPlan?.title } : {}));
      } catch (err) {
        console.error(err);
        const status = err?.status;
        toast(status === 401 ? "מפתח ה-API לא תקין – עברתי למנוע המובנה" : err.kind === "refusal" ? "ה-AI לא יכול לעזור בבקשה הזו – עברתי למנוע המובנה" : "בעיה בחיבור ל-AI – עברתי למנוע המובנה");
      }
    }
    if (!plan) {
      // קצת השהיה כדי שהאנימציה תורגש
      await new Promise((r) => setTimeout(r, 650));
      plan = DI.buildPlanOffline(Object.assign({}, input, { exclude: opts.exclude || [] }));
    }
    currentPlan = plan;
    renderPlan(plan);
  } finally {
    setBusy(false);
  }
}

function setBusy(b) {
  $("#buildBtn").disabled = b;
  $("#randomBtn").disabled = b;
}

/* ---------- תמונות ---------- */
function imageUrl(prompt, w, h, seed) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
}

function imageBlock(prompt, emoji, w, h, seed) {
  if (!settings.images || !prompt) {
    return `<div class="img-wrap loaded"><div class="img-fallback">${esc(emoji || "💘")}</div></div>`;
  }
  return `<div class="img-wrap" data-emoji="${esc(emoji || "💘")}">
      <img alt="" loading="lazy" src="${esc(imageUrl(prompt, w, h, seed))}" />
      <div class="img-loading">${esc(emoji || "💘")}<br/>מצייר את הדייט...</div>
    </div>`;
}

function wireImages(root) {
  $$(".img-wrap img", root).forEach((img) => {
    const wrap = img.parentElement;
    const done = () => wrap.classList.add("loaded");
    if (img.complete && img.naturalWidth) done();
    img.addEventListener("load", done);
    img.addEventListener("error", () => {
      wrap.innerHTML = `<div class="img-fallback">${esc(wrap.dataset.emoji)}</div>`;
      done();
    });
  });
}

/* ---------- תצוגה ---------- */
function renderPlan(plan) {
  const seed = Math.floor(Math.random() * 1e6);
  plan._seed = plan._seed || seed;
  const list = (arr) => (arr || []).map((x) => `<li>${esc(x)}</li>`).join("");

  const steps = plan.timeline.map((s, i) => `
    <li class="step">
      ${imageBlock(s.image_prompt, s.emoji, 512, 384, plan._seed + i + 1)}
      <div class="step-body">
        <span class="step-time">${esc(s.time)}</span>
        <h4>${esc(s.emoji)} ${esc(s.title)}</h4>
        <p>${esc(s.description)}</p>
        <div class="meta">
          <span>📍 ${esc(s.place_name)}</span>
          ${s.cost ? `<span>· כ-${esc(s.cost)} ₪</span>` : `<span>· חינם</span>`}
          ${s.maps_url ? `<a class="map-link" href="${esc(s.maps_url)}" target="_blank" rel="noopener">מצא בגוגל מפות ←</a>` : ""}
        </div>
      </div>
    </li>`).join("");

  const foods = (plan.restaurants || []).map((r) => `
    <div class="food">
      <h5>${esc(r.name)}</h5>
      <p>${esc(r.why)}</p>
      <span class="price">${esc(r.price)}</span>
      ${r.maps_url ? ` · <a class="map-link" href="${esc(r.maps_url)}" target="_blank" rel="noopener">חפש במפה</a>` : ""}
    </div>`).join("");

  $("#result").innerHTML = `
    <div class="card">
      <div class="result-hero">
        ${imageBlock(plan.image_prompt, plan.timeline[0]?.emoji, 1280, 800, plan._seed)}
        <div class="hero-overlay">
          <h2>${esc(plan.title)}</h2>
          <p>${esc(plan.summary)}</p>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><b>${esc(plan.duration)}</b><span>משך</span></div>
        <div class="stat"><b>${esc(plan.budget_estimate)}</b><span>תקציב משוער</span></div>
        <div class="stat"><b>${esc(plan.vibe_label || "—")}</b><span>אווירה</span></div>
      </div>

      <h3 class="section-title">🗓️ התוכנית שלך, שלב אחרי שלב</h3>
      <ol class="timeline">${steps}</ol>

      <h3 class="section-title">🍽️ איפה לאכול</h3>
      <div class="food-grid">${foods}</div>

      <h3 class="section-title">🧠 שיעורי בית לפני הדייט</h3>
      <div class="tips">
        <div class="tip-box"><h5>💡 טיפים</h5><ul>${list(plan.tips)}</ul></div>
        <div class="tip-box"><h5>💬 שאלות לפתיחת שיחה</h5><ul>${list(plan.conversation_starters)}</ul></div>
        <div class="tip-box"><h5>👕 מה ללבוש</h5><ul><li>${esc(plan.outfit)}</li></ul></div>
        <div class="tip-box"><h5>☔ תוכנית גיבוי</h5><ul><li>${esc(plan.backup_plan)}</li></ul></div>
      </div>
      <div class="tip-box" style="margin-top:12px"><h5>🏆 המהלך שיעשה את ההבדל</h5><ul><li>${esc(plan.pro_move)}</li></ul></div>

      <div class="result-actions">
        <button class="btn small primary" data-act="save">⭐ שמור</button>
        <button class="btn small ghost" data-act="again">🔄 תוכנית אחרת</button>
        <button class="btn small ghost" data-act="image">🖼️ תמונות חדשות</button>
        <button class="btn small ghost" data-act="share">📲 שלח בוואטסאפ</button>
        <button class="btn small ghost" data-act="copy">📋 העתק</button>
        <button class="btn small ghost" data-act="print">🖨️ הדפס</button>
      </div>
      <p class="mode-note">${plan._source === "claude" ? "🤖 נבנה על ידי Claude" : "⚡ נבנה במנוע הרעיונות המובנה"} · התמונות נוצרות ב-AI להמחשה בלבד. כדאי לבדוק שעות פתיחה ולהזמין מקום מראש.</p>
    </div>`;
  wireImages($("#result"));
}

function planToText(p) {
  const lines = [`💘 ${p.title}`, p.summary, `⏱️ ${p.duration} | 💰 ${p.budget_estimate}`, "", "🗓️ התוכנית:"];
  p.timeline.forEach((s) => lines.push(`${s.time} ${s.emoji} ${s.title} – ${s.place_name}${s.maps_url ? "\n" + s.maps_url : ""}`));
  lines.push("", "🍽️ אוכל:");
  (p.restaurants || []).forEach((r) => lines.push(`• ${r.name} (${r.price})`));
  lines.push("", "👕 " + p.outfit, "🏆 " + p.pro_move);
  return lines.join("\n");
}

$("#result").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-act]");
  if (!b || !currentPlan) return;
  const act = b.dataset.act;
  if (act === "save") {
    const saved = LS.get("dt_saved", []);
    saved.unshift(Object.assign({}, currentPlan, { _savedAt: Date.now() }));
    LS.set("dt_saved", saved.slice(0, 30));
    updateSavedCount();
    toast("נשמר! ⭐");
  } else if (act === "again") {
    const exclude = currentPlan.timeline.map((s) => s._id).filter(Boolean);
    build(lastInput || readForm(), { variation: true, exclude });
  } else if (act === "image") {
    currentPlan._seed = Math.floor(Math.random() * 1e6);
    renderPlan(currentPlan);
  } else if (act === "share") {
    window.open("https://wa.me/?text=" + encodeURIComponent(planToText(currentPlan)), "_blank", "noopener");
  } else if (act === "copy") {
    try { await navigator.clipboard.writeText(planToText(currentPlan)); toast("הועתק 📋"); }
    catch { toast("לא הצלחתי להעתיק"); }
  } else if (act === "print") {
    window.print();
  }
});

/* ---------- שמורים ---------- */
function updateSavedCount() { $("#savedCount").textContent = LS.get("dt_saved", []).length; }

function renderSaved() {
  const saved = LS.get("dt_saved", []);
  $("#savedList").innerHTML = saved.length
    ? saved.map((p, i) => `
      <div class="saved-item">
        <div><b>${esc(p.title)}</b><small>${esc(p.summary)}</small></div>
        <div class="row">
          <button class="btn small primary" data-open="${i}">פתח</button>
          <button class="btn small ghost" data-del="${i}">🗑️</button>
        </div>
      </div>`).join("")
    : `<p class="hint">עוד לא שמרת דייטים. בנה דייט ולחץ ⭐ שמור.</p>`;
}

$("#savedBtn").addEventListener("click", () => { renderSaved(); $("#savedDlg").showModal(); });
$("#closeSaved").addEventListener("click", () => $("#savedDlg").close());
$("#savedList").addEventListener("click", (e) => {
  const saved = LS.get("dt_saved", []);
  const o = e.target.closest("[data-open]");
  const d = e.target.closest("[data-del]");
  if (o) {
    currentPlan = saved[Number(o.dataset.open)];
    $("#savedDlg").close();
    $("#result").classList.remove("hidden");
    renderPlan(currentPlan);
    $("#result").scrollIntoView({ behavior: "smooth" });
  } else if (d) {
    saved.splice(Number(d.dataset.del), 1);
    LS.set("dt_saved", saved);
    updateSavedCount();
    renderSaved();
  }
});

/* ---------- הגדרות ---------- */
$("#settingsBtn").addEventListener("click", () => {
  $("#apiKey").value = settings.apiKey;
  $("#imagesOn").checked = settings.images;
  $("#settingsDlg").showModal();
});
$("#settingsDlg").addEventListener("close", () => {
  if ($("#settingsDlg").returnValue !== "save") return;
  settings.apiKey = $("#apiKey").value.trim();
  settings.images = $("#imagesOn").checked;
  LS.set("dt_settings", settings);
  updateModeNote();
  toast("ההגדרות נשמרו");
});

/* ---------- רעיונות מהירים ---------- */
$("#quickGrid").innerHTML = DI.QUICK_IDEAS.map((q, i) => `
  <button class="quick-item" data-q="${i}">
    <span class="em">${q.e}</span><b>${esc(q.t)}</b><small>${esc(q.s)}</small>
  </button>`).join("");

$("#quickGrid").addEventListener("click", (e) => {
  const b = e.target.closest("[data-q]");
  if (!b) return;
  const q = DI.QUICK_IDEAS[Number(b.dataset.q)];
  $("#freeText").value = q.text;
  setChips("vibes", q.vibes);
  setChips("budget", String(q.budget));
  setChips("time", q.time);
  if (q.stage) setChips("stage", q.stage);
  build(readForm());
});

/* ---------- כפתורים ראשיים ---------- */
$("#buildBtn").addEventListener("click", () => build(readForm()));
$("#randomBtn").addEventListener("click", () => {
  const allV = ["romantic", "adventure", "chill", "creative", "nature", "foodie", "culture"];
  const v = allV.sort(() => Math.random() - 0.5).slice(0, 2);
  const input = Object.assign(readForm(), { vibes: v, time: ["morning", "noon", "evening", "night"][Math.floor(Math.random() * 4)] });
  setChips("vibes", v);
  setChips("time", input.time);
  build(input);
});

updateModeNote();
updateSavedCount();
