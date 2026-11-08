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
    kosher: chipVal("kosher") || "any",
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
  required: ["title", "summary", "vibe_label", "duration", "budget_estimate", "image_prompt", "timeline", "restaurants", "outfit", "tips", "conversation_starters", "backup_plan", "pro_move", "shopping_list", "flowers"],
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
        required: ["name", "why", "price", "maps_query", "kashrut"],
        properties: {
          name: { type: "string" },
          why: { type: "string" },
          price: { type: "string" },
          maps_query: { type: "string" },
          kashrut: { type: "string" },
        },
      },
    },
    flowers: { type: "string" },
    outfit: { type: "string" },
    tips: { type: "array", items: { type: "string" } },
    conversation_starters: { type: "array", items: { type: "string" } },
    backup_plan: { type: "string" },
    pro_move: { type: "string" },
    shopping_list: { type: "array", items: { type: "string" } },
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
- shopping_list: אם הדייט (או חלק ממנו) בבית או כולל פיקניק – רשימת קניות מפורטת של מצרכים ודברים להביא/לקנות. אחרת רשימה ריקה.
- אם נשלחה רשימת "מקומות מהמאגר" – תעדיף להשתמש בהם כשהם מתאימים, ותשלים מהידע שלך.
- kashrut בכל מסעדה: "כשר" / "כשר למהדרין" / "לא כשר" רק אם אתה בטוח; אחרת "לבדוק". אם המשתמש ביקש כשר/מהדרין – תמליץ רק על מקומות כשרים שאתה בטוח בהם, ואם אינך בטוח – תכתוב סוג מקום + "כשר" ו-maps_query לחיפוש מקומות כשרים בעיר. אל תמציא תעודות כשרות.
- flowers: המלצה קצרה על זר או פרח שמתאים לדייט (מה, למה, טווח מחיר ומתי לתת).
- תתייחס לתקציב ברצינות. בדייט ראשון – מקום ציבורי, קצר יחסית, שמאפשר לדבר.`;

function placesHint(input) {
  const DP = window.DatePlaces;
  if (!DP) return "";
  const lines = [];
  const anchor = input.anchorId ? DP.ALL.find((x) => x.id === input.anchorId) : null;
  if (anchor) lines.push(`הדייט צריך להיבנות סביב המקום: ${anchor.n} (${anchor.area}, ${anchor.city}) – ${anchor.d}`);
  if (input.homeId) {
    const h = DP.HOME_DATES.find((x) => x.id === input.homeId);
    if (h) lines.push(`זה דייט בבית בסגנון: ${h.t} – ${h.s}. תכלול רשימת קניות.`);
  }
  const city = anchor ? DP.CITIES[anchor.city] : DP.findCity(input.city);
  if (city) {
    lines.push(`מקומות מהמאגר ב${city.name}:`);
    city.items.forEach((p) => lines.push(`- ${p.n} | ${DP.CATS[p.cat].l} | ${p.area} | ${"₪".repeat(p.price)}`));
  }
  return lines.join("\n");
}

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
כשרות: ${input.kosher === "mehadrin" ? "חייב כשר למהדרין" : input.kosher === "kosher" ? "חייב כשר" : "לא משנה"}
${input.variation ? "תן רעיון שונה מהקודם: " + input.variation : ""}
${placesHint(input)}`;

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
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&safe=true&seed=${seed}`;
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
function renderPlan(plan, opts = {}) {
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
        ${s.real_tip ? `<p class="real-tip">📍 ${esc(s.real_tip)}</p>` : ""}
        <div class="meta">
          <span>📍 ${esc(s.place_name)}</span>
          ${s.cost ? `<span>· כ-${esc(s.cost)} ₪</span>` : `<span>· חינם</span>`}
          ${s.kashrut ? kBadge(s.kashrut) : ""}
          ${s.maps_url ? `<a class="map-link" href="${esc(s.maps_url)}" target="_blank" rel="noopener">מצא בגוגל מפות ←</a>` : ""}
        </div>
      </div>
    </li>`).join("");

  const foods = (plan.restaurants || []).map((r) => `
    <div class="food">
      <h5>${esc(r.name)}</h5>
      <p>${esc(r.why)}</p>
      <span class="price">${esc(r.price)}</span>
      ${r.kashrut ? kBadge(r.kashrut) : ""}
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

      ${(plan.shopping_list || []).length ? `
      <h3 class="section-title">🛒 רשימת קניות</h3>
      <div class="tip-box">${shopListHtml(plan.shopping_list, "plan")}
        <div class="actions" style="margin-top:8px"><button class="btn small ghost" data-act="shop">📲 שלח את הרשימה בוואטסאפ</button></div>
      </div>` : ""}

      <h3 class="section-title">🍽️ איפה לאכול</h3>
      <div class="food-grid">${foods}</div>

      <h3 class="section-title">🧠 שיעורי בית לפני הדייט</h3>
      <div class="tips">
        <div class="tip-box"><h5>💡 טיפים</h5><ul>${list(plan.tips)}</ul></div>
        <div class="tip-box"><h5>💬 שאלות לפתיחת שיחה <small class="muted-s">(לחץ על קלף)</small></h5>
          <div class="flip-grid">${(plan.conversation_starters || []).map((q, i) => `
            <button class="flip" type="button"><span class="flip-in">
              <span class="flip-front">🃏<b>שאלה ${i + 1}</b></span>
              <span class="flip-back">${esc(q)}</span>
            </span></button>`).join("")}</div>
        </div>
        <div class="tip-box"><h5>👕 מה ללבוש</h5><ul><li>${esc(plan.outfit)}</li></ul></div>
        <div class="tip-box"><h5>☔ תוכנית גיבוי</h5><ul><li>${esc(plan.backup_plan)}</li></ul></div>
      </div>
      ${flowerBox(plan)}
      <div class="tip-box" style="margin-top:12px"><h5>🏆 המהלך שיעשה את ההבדל</h5><ul><li>${esc(plan.pro_move)}</li></ul></div>

      <div class="result-actions">
        <button class="btn small primary" data-act="save">⭐ שמור</button>
        <button class="btn small ghost" data-act="again">🔄 תוכנית אחרת</button>
        <button class="btn small ghost" data-act="image">🖼️ תמונות חדשות</button>
        <button class="btn small ghost" data-act="share">📲 שלח בוואטסאפ</button>
        <button class="btn small ghost" data-act="copy">📋 העתק</button>
        <button class="btn small ghost" data-act="countdown">⏳ ספירה לאחור</button>
        <button class="btn small ghost" data-act="invite">💌 כרטיס הזמנה</button>
        <button class="btn small ghost" data-act="print">🖨️ הדפס</button>
      </div>
      <p class="mode-note">${plan._source === "claude" ? "🤖 נבנה על ידי Claude" : "⚡ נבנה במנוע הרעיונות המובנה"} · התמונות נוצרות ב-AI להמחשה בלבד. כדאי לבדוק שעות פתיחה ולהזמין מקום מראש.</p>
    </div>`;
  wireImages($("#result"));
  if (!opts.silent) setTimeout(() => { window.FX?.burst(innerWidth / 2, Math.min(innerHeight / 3, 260)); window.FX?.sound("chime"); }, 120);
}

function kBadge(t) {
  const cls = /לא כשר/.test(t) ? "no" : /לבדוק/.test(t) ? "check" : /כשר/.test(t) ? "yes" : "check";
  return `<span class="kbadge ${cls}">${cls === "yes" ? "✡️ " : cls === "no" ? "✖ " : "❔ "}${esc(t)}</span>`;
}

function flowerBox(plan) {
  const f = plan.flowers;
  if (!f) return "";
  const DPl = window.DatePlaces;
  const near = typeof f === "object" ? f.maps_url : DPl?.flowerSearch(plan.city);
  const del = typeof f === "object" ? f.delivery_url : DPl?.flowerSearch(plan.city, true);
  const body = typeof f === "object"
    ? `<b>${esc(f.e)} ${esc(f.name)}</b> · <span class="price">${esc(f.price)}</span><br />${esc(f.desc)}<br /><small>💡 ${esc(f.tip)}</small>`
    : esc(f);
  return `<div class="tip-box flower-box" style="margin-top:12px"><h5>💐 פרחים לדייט</h5><p>${body}</p>
    <div class="prow">
      <a class="btn small ghost" href="${esc(near)}" target="_blank" rel="noopener">📍 חנות פרחים</a>
      <a class="btn small ghost" href="${esc(del)}" target="_blank" rel="noopener">🛵 משלוח</a>
      <button class="btn small ghost" data-goflowers>עוד זרים ←</button>
    </div></div>`;
}

function shopListHtml(items, key) {
  return `<ul class="shop-list">${items.map((x, i) => `
    <li><label><input type="checkbox" data-shop="${esc(key)}-${i}" /> ${esc(x)}</label></li>`).join("")}</ul>`;
}
document.addEventListener("change", (e) => {
  if (e.target.matches(".shop-list input")) e.target.parentElement.classList.toggle("done", e.target.checked);
});
function shareShopping(title, items) {
  const text = `🛒 רשימת קניות – ${title}\n` + items.map((x) => "▫️ " + x).join("\n");
  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener");
}

function planToText(p) {
  const lines = [`💘 ${p.title}`, p.summary, `⏱️ ${p.duration} | 💰 ${p.budget_estimate}`, "", "🗓️ התוכנית:"];
  p.timeline.forEach((s) => lines.push(`${s.time} ${s.emoji} ${s.title} – ${s.place_name}${s.maps_url ? "\n" + s.maps_url : ""}`));
  lines.push("", "🍽️ אוכל:");
  (p.restaurants || []).forEach((r) => lines.push(`• ${r.name} (${r.price})`));
  if ((p.shopping_list || []).length) lines.push("", "🛒 קניות: " + p.shopping_list.join(", "));
  if (p.flowers) lines.push("", "💐 " + (typeof p.flowers === "object" ? `${p.flowers.name} (${p.flowers.price})` : p.flowers));
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
    renderPlan(currentPlan, { silent: true });
  } else if (act === "share") {
    window.open("https://wa.me/?text=" + encodeURIComponent(planToText(currentPlan)), "_blank", "noopener");
  } else if (act === "copy") {
    try { await navigator.clipboard.writeText(planToText(currentPlan)); toast("הועתק 📋"); }
    catch { toast("לא הצלחתי להעתיק"); }
  } else if (act === "shop") {
    shareShopping(currentPlan.title, currentPlan.shopping_list);
  } else if (act === "countdown" || act === "invite") {
    window.DateonExtras?.fromPlan(currentPlan, act);
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

/* ---------- טאבים ---------- */
function showTab(name) {
  $$(".tab").forEach((t) => t.classList.toggle("on", t.dataset.tab === name));
  $$(".tab-panel").forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== name));
  // אם גללנו מתחת להירו – חוזרים לראש התוכן, לא לראש הדף
  const hero = $(".hero3d");
  const contentTop = hero ? hero.offsetTop + hero.offsetHeight : 0;
  // בטלפון (סרגל לשוניות תחתון) תמיד קופצים לתוכן; במחשב – רק אם גללנו מתחת להירו
  const mobile = matchMedia("(max-width: 640px)").matches;
  if (mobile || window.scrollY > contentTop) window.scrollTo({ top: Math.max(0, contentTop - (mobile ? 8 : 0)), behavior: "smooth" });
}
$$(".tab").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));

/* ---------- מקומות ---------- */
const DP = window.DatePlaces;
const placesState = { city: Object.keys(DP.CITIES)[0], group: "all", near: null, kosher: "" };

$("#placeCity").innerHTML = `<option value="__near" hidden>📍 הכי קרובים אליי</option>` +
  Object.values(DP.CITIES).map((c) => `<option value="${esc(c.name)}">${esc(c.name)} (${c.items.length})</option>`).join("");
$("#placeCity").value = placesState.city;
$("#pcatChips").innerHTML = DP.GROUPS.map(([k, l], i) => `<button data-v="${k}" class="${i ? "" : "on"}">${l}</button>`).join("");
$("#pcatChips").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) { placesState.group = b.dataset.v; renderPlaces(); }
});
$("#placeCity").addEventListener("change", (e) => {
  if (e.target.value === "__near") return;
  placesState.city = e.target.value;
  placesState.near = null;
  renderPlaces();
});
$("#nearMe").addEventListener("click", () => {
  if (!navigator.geolocation) return toast("הדפדפן לא תומך במיקום");
  $("#placesNote").textContent = "מאתר את המיקום שלך...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      placesState.near = [pos.coords.latitude, pos.coords.longitude];
      $("#placeCity").value = "__near";
      renderPlaces();
    },
    () => { $("#placesNote").textContent = ""; toast("לא הצלחתי לקבל מיקום – בחר עיר מהרשימה"); },
    { timeout: 10000 }
  );
});

function fmtDist(d) {
  if (d == null) return "";
  return d < 1 ? " · פחות מקילומטר" : ` · כ-${Math.round(d)} ק"מ`;
}

$("#kosherOnly").addEventListener("change", (e) => {
  if (!e.target.checked) $("#mehadrinOnly").checked = false;
  placesState.kosher = e.target.checked ? ($("#mehadrinOnly").checked ? "mehadrin" : "kosher") : "";
  renderPlaces();
});
$("#mehadrinOnly").addEventListener("change", (e) => {
  if (e.target.checked) $("#kosherOnly").checked = true;
  placesState.kosher = $("#kosherOnly").checked ? (e.target.checked ? "mehadrin" : "kosher") : "";
  renderPlaces();
});

const CUISINES = ["איטלקי", "סושי", "בשרים", "דגים", "חלבי", "בראנץ'", "המבורגר", "אסייתי", "טבעוני", "מסעדת שף"];
function renderPlacesExtra(cityName) {
  const box = $("#placesExtra");
  const showFood = placesState.group === "all" || placesState.group === "food";
  if (!showFood) { box.innerHTML = ""; return; }
  const k = placesState.kosher;
  const links = k ? DP.kosherLinks(cityName, k === "mehadrin") : [];
  box.innerHTML = `
    ${k ? `<div class="kosher-finder">
      <b>✡️ מסעדות ${k === "mehadrin" ? "כשרות למהדרין" : "כשרות"} ב${esc(cityName)}</b>
      <small>במאגר מסומנים רק מקומות שיש מקור לכשרות שלהם. לרשימה מלאה ועדכנית:</small>
      <div class="prow">${links.map((l) => `<a class="btn small ghost" href="${esc(l.u)}" target="_blank" rel="noopener">${l.l}</a>`).join("")}</div>
    </div>` : ""}
    <div class="cuisine-row"><span>🔎 חיפוש מהיר במפה${k ? " (כשר)" : ""}:</span>
      ${CUISINES.map((c) => `<a href="${esc(DP.cuisineSearch(cityName, c, k))}" target="_blank" rel="noopener">${esc(c)}</a>`).join("")}
    </div>`;
}

function renderPlaces() {
  let items;
  if (placesState.near) {
    items = DP.nearest(placesState.near, 400);
    $("#placesNote").textContent = `ממוין לפי מרחק ממך · העיר הקרובה במאגר: ${DP.nearestCity(placesState.near).name}`;
  } else {
    items = DP.CITIES[placesState.city].items;
    $("#placesNote").textContent = "";
  }
  if (placesState.group !== "all") items = items.filter((p) => DP.CATS[p.cat].g === placesState.group);
  if (placesState.kosher) items = items.filter((p) => p.cat !== "rest" || (p.kosher && p.kosher.k === "yes" && (placesState.kosher !== "mehadrin" || p.kosher.meh)));
  renderPlacesExtra(placesState.near ? DP.nearestCity(placesState.near).name : placesState.city);
  if (placesState.near) items = items.slice(0, 40);
  $("#placesList").innerHTML = items.length ? items.map((p) => {
    const c = DP.CATS[p.cat];
    return `<div class="place">
      <div class="ptop"><h5>${c.e} ${esc(p.n)}</h5><span class="badge">${c.l}</span></div>
      <div class="pmeta">📍 ${esc(p.area)}${placesState.near ? " · " + esc(p.city) : ""} · ${p.price === 1 ? "זול / חינם" : "₪".repeat(p.price)}${fmtDist(p.dist)}</div>
      <p>${esc(p.d)}</p>
      ${p.kosher && (p.kosher.k !== "check" || placesState.kosher || p.cat === "rest") ? kBadge(p.kosher.t) : ""}
      <div class="prow">
        <a class="btn small ghost" href="${esc(DP.mapsLink(p))}" target="_blank" rel="noopener">🗺️ ${p.generic ? "פתח חיפוש" : "במפה"}</a>
        ${p.generic ? "" : `<button class="btn small primary" data-anchor="${esc(p.id)}">✨ בנה דייט כאן</button>`}
      </div>
    </div>`;
  }).join("") : `<p class="hint">אין מקומות בקטגוריה הזו כאן עדיין – נסה קטגוריה אחרת.</p>`;
}
$("#placesList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-anchor]");
  if (!b) return;
  const p = DP.ALL.find((x) => x.id === b.dataset.anchor);
  showTab("plan");
  $("#city").value = DP.CITIES[p.city].alias[0];
  $("#freeText").value = `דייט סביב ${p.n} (${p.area})`;
  build(Object.assign(readForm(), { anchorId: p.id }));
});

/* ---------- דייט בבית ---------- */
$("#homeList").innerHTML = DP.HOME_DATES.map((h) => `
  <div class="home-card">
    <span class="em">${h.e}</span>
    <h5>${esc(h.t)}</h5>
    <p class="sub">${esc(h.s)} · כ-${h.cost} ₪</p>
    <details><summary>🛒 רשימת קניות (${h.shop.length})</summary>${shopListHtml(h.shop, h.id)}</details>
    <details><summary>📋 איך עושים את זה</summary><ol>${h.steps.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></details>
    <div class="prow">
      <button class="btn small primary" data-home="${h.id}">✨ תוכנית מלאה</button>
      <button class="btn small ghost" data-homeshop="${h.id}">📲 שלח רשימה</button>
    </div>
  </div>`).join("");
$("#homeList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-home]");
  const s = e.target.closest("[data-homeshop]");
  if (s) {
    const h = DP.HOME_DATES.find((x) => x.id === s.dataset.homeshop);
    shareShopping(h.t, h.shop);
  } else if (b) {
    const h = DP.HOME_DATES.find((x) => x.id === b.dataset.home);
    showTab("plan");
    $("#freeText").value = `דייט בבית: ${h.t}`;
    setChips("vibes", ["home"].concat(h.v.slice(0, 1)));
    setChips("stage", "couple");
    build(Object.assign(readForm(), { homeId: h.id }));
  }
});

document.addEventListener("click", (e) => {
  if (e.target.closest("[data-goflowers]")) {
    showTab("personal");
    setTimeout(() => $("#flowerSection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }
});
document.addEventListener("click", (e) => {
  const f = e.target.closest(".flip");
  if (f) { f.classList.toggle("flipped"); window.FX?.buzz(8); window.FX?.sound("flip"); }
});

// ממשק לקבצים אחרים (משחקים) לבניית דייט
window.Dateon = {
  buildFrom(extra) {
    showTab("plan");
    if (extra.freeText) $("#freeText").value = extra.freeText;
    if (extra.vibes) setChips("vibes", extra.vibes.filter((v) => DI.VIBE_LABEL[v]));
    if (extra.homeId) setChips("stage", "couple");
    build(Object.assign(readForm(), extra));
  },
};

renderPlaces();
updateModeNote();
updateSavedCount();
