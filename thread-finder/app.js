import { createViewer } from './model3d.js';

const { threads, families, IN } = window.THREAD_DATA;
const TM = window.TM;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const f3 = (n) => (n == null || isNaN(n) ? '—' : n.toFixed(3));
const f2 = (n) => (n == null || isNaN(n) ? '—' : n.toFixed(2));
const trim = (n, dp = 3) => (Math.round(n * 10 ** dp) / 10 ** dp).toString();
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* =========================================================
   מצב גלובלי
   ========================================================= */
const S = {
  fam: 'all',
  side: 'ext',
  cls: { metric: { ext: '6g', int: '6H' }, un: { ext: '2A', int: '2B' } },
  q: '',
};
const clsGroup = (t) => (['unc', 'unf'].includes(t.family) ? 'un' : ['mc', 'mf', 'custom'].includes(t.family) ? 'metric' : null);
const clsFor = (t, side) => { const g = clsGroup(t); return g ? S.cls[g][side] : null; };

/* =========================================================
   ערכת צבעים
   ========================================================= */
const root = document.documentElement;
try { const s = localStorage.getItem('tf-theme'); if (s) root.dataset.theme = s; } catch (e) {}
const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
$('#themeBtn').addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  try { localStorage.setItem('tf-theme', root.dataset.theme); } catch (e) {}
});

/* =========================================================
   איור ראשי (בורג מסוגנן)
   ========================================================= */
(function heroArt() {
  const t = threads.find((x) => x.name === 'M12');
  const pr = TM.profile(t);
  const P = t.P, k = 11, cy = 118, x0 = 40, len = 340, headW = 60;
  let top = [], bot = [];
  for (let x = 0; x <= len; x += 1) {
    const u = x / (P * k);
    top.push([x0 + headW + x, cy - pr.rExt(u) * k]);
    bot.push([x0 + headW + x, cy + pr.rExt(u + 0.5) * k]);
  }
  const helix = [];
  for (let i = 0; i < len / (P * k) - 0.5; i++) {
    const xa = x0 + headW + i * P * k, xb = xa + P * k * 0.5;
    helix.push(`<line x1="${xa}" y1="${cy - pr.ext.rMaj * k + 1}" x2="${xb}" y2="${cy + pr.ext.rMaj * k - 1}" />`);
  }
  const body = `M${top.map((p) => p.join(',')).join(' L')} L${bot.reverse().map((p) => p.join(',')).join(' L')} Z`;
  const R = pr.ext.rMaj * k;
  $('#heroArt').innerHTML = `<svg viewBox="0 0 480 260">
    <defs>
      <linearGradient id="hs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f9"/><stop offset=".35" stop-color="#aab3bf"/><stop offset=".55" stop-color="#6c7684"/><stop offset="1" stop-color="#cfd5dd"/></linearGradient>
      <linearGradient id="hh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9edf2"/><stop offset=".5" stop-color="#7b8593"/><stop offset="1" stop-color="#c3c9d1"/></linearGradient>
      <filter id="glow"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <ellipse cx="250" cy="225" rx="200" ry="10" fill="#000" opacity=".35" filter="url(#glow)"/>
    <rect x="${x0}" y="${cy - R * 1.65}" width="${headW}" height="${R * 3.3}" rx="6" fill="url(#hh)"/>
    <rect x="${x0}" y="${cy - R * 0.6}" width="${headW}" height="${R * 1.2}" fill="#fff" opacity=".12"/>
    <path d="${body}" fill="url(#hs)"/>
    <g stroke="#3d4552" stroke-opacity=".35" stroke-width="1.2">${helix.join('')}</g>
    <g stroke="#ff8a3d" stroke-width="2" fill="#ff8a3d">
      <line x1="${x0 + headW + len - 40}" y1="${cy - R - 26}" x2="${x0 + headW + len - 40}" y2="${cy + R + 26}" stroke-dasharray="0"/>
      <path d="M${x0 + headW + len - 46},${cy - R - 16} l6,-10 l6,10z M${x0 + headW + len - 46},${cy + R + 16} l6,10 l6,-10z" stroke="none"/>
    </g>
    <text x="${x0 + headW + len - 30}" y="${cy - R - 30}" fill="#ff8a3d" font-family="JetBrains Mono" font-weight="700" font-size="16">Ø12</text>
    <g stroke="#9aa6b5" stroke-width="1.4" fill="#9aa6b5">
      <line x1="${x0 + headW + 2 * P * k * 1}" y1="${cy + R + 22}" x2="${x0 + headW + 3 * P * k}" y2="${cy + R + 22}"/><line x1="${x0 + headW + 2 * P * k}" y1="${cy + R + 6}" x2="${x0 + headW + 2 * P * k}" y2="${cy + R + 28}"/><line x1="${x0 + headW + 3 * P * k}" y1="${cy + R + 6}" x2="${x0 + headW + 3 * P * k}" y2="${cy + R + 28}"/>
    </g>
    <text x="${x0 + headW + 2.5 * P * k}" y="${cy + R + 46}" text-anchor="middle" fill="#9aa6b5" font-family="JetBrains Mono" font-size="14">P 1.75</text>
  </svg>`;
})();

/* =========================================================
   טבלאות
   ========================================================= */
const famKeys = Object.keys(families);
function renderFamTabs() {
  const counts = Object.fromEntries(famKeys.map((k) => [k, threads.filter((t) => t.family === k).length]));
  $('#famTabs').innerHTML = [['all', 'הכל', threads.length], ...famKeys.map((k) => [k, families[k].label, counts[k]])]
    .map(([k, l, c]) => `<button type="button" role="tab" class="fam${S.fam === k ? ' on' : ''}" data-f="${k}">${l}<span class="c">${c}</span></button>`).join('');
}
$('#famTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.fam'); if (!b) return;
  S.fam = b.dataset.f; renderFamTabs(); renderClsSel(); renderTable();
});
$('#sideSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  S.side = b.dataset.v; $$('#sideSeg button').forEach((x) => x.classList.toggle('on', x === b));
  renderClsSel(); renderTable();
});
function renderClsSel() {
  const sel = $('#clsSel');
  const g = ['unc', 'unf'].includes(S.fam) ? 'un' : ['g', 'r', 'npt'].includes(S.fam) ? null : 'metric';
  if (!g) { sel.hidden = true; return; }
  sel.hidden = false;
  const opts = g === 'un' ? (S.side === 'ext' ? ['2A', '1A', '3A'] : ['2B', '1B', '3B']) : (S.side === 'ext' ? ['6g', '4h', '6h', '6f', '6e', '8g'] : ['6H', '5H', '7H', '6G']);
  sel.innerHTML = opts.map((o) => `<option ${S.cls[g][S.side] === o ? 'selected' : ''}>${o}</option>`).join('');
  sel.dataset.g = g;
  sel.title = 'דרגת סבולת';
}
$('#clsSel').addEventListener('change', (e) => { S.cls[e.target.dataset.g][S.side] = e.target.value; renderTable(); });

const norm = (s) => s.toLowerCase().replace(/[״"”'׳]/g, '').replace(/[×*]/g, 'x').replace(/\s+/g, '').replace(/,/g, '.');
function matches(t, q) {
  if (!q) return true;
  const n = norm(t.full);
  if (n.includes(q) && !/^\d/.test(q)) return true;
  if (t.aliases.some((a) => a && norm(a).startsWith(q))) return true;
  if (/^\d+(\.\d+)?$/.test(q)) { const v = parseFloat(q); if (Math.abs(t.d - v) <= Math.max(0.3, v * 0.03)) return true; }
  return false;
}
$('#q').addEventListener('input', (e) => { S.q = norm(e.target.value.trim()); renderTable(); });

function renderTable() {
  const list = threads.filter((t) => (S.fam === 'all' || t.family === S.fam) && matches(t, S.q));
  const ext = S.side === 'ext';
  $('#thead').innerHTML = ext
    ? `<tr class="grp"><th colspan="3"></th><th colspan="2" class="g">d · קוטר חיצוני</th><th colspan="2" class="g">d2 · קוטר צד</th><th class="g">d3</th><th></th></tr>
       <tr class="sub"><th>הברגה</th><th>סוג</th><th>P · TPI</th><th>max</th><th>min</th><th>max</th><th>min</th><th>max</th><th></th></tr>`
    : `<tr class="grp"><th colspan="3"></th><th colspan="2" class="g">D1 · קוטר קידוח</th><th colspan="2" class="g">D2 · קוטר צד</th><th class="g">D</th><th class="g">מקדח</th><th></th></tr>
       <tr class="sub"><th>הברגה</th><th>סוג</th><th>P · TPI</th><th>min</th><th>max</th><th>min</th><th>max</th><th>min</th><th>Ø</th><th></th></tr>`;
  $('#count').textContent = `${list.length} הברגות · ${ext ? 'מידות לבורג' : 'מידות לאום'}${list.some((t) => clsGroup(t)) ? ' · סבולות מחושבות לפי ISO 965-1 / ASME B1.1' : ''}`;
  if (!list.length) { $('#rows').innerHTML = `<tr><td colspan="10" class="empty">לא נמצאו הברגות. נסו "M12", "3/8" או מספר בלבד (קוטר במ"מ).</td></tr>`; return; }
  $('#rows').innerHTML = list.map((t) => {
    const f = families[t.family], b = TM.basic(t), tl = TM.tol(t, clsFor(t, S.side));
    const pt = `<td class="n">${trim(t.P, 3)}${t.tpi ? ` <span class="muted">· ${t.tpi}</span>` : ''}</td>`;
    const tag = `<td><span class="tag${f.kind === 'taper' ? ' taper' : ''}">${f.label}</span></td>`;
    const name = `<td><span class="tname">${esc(t.name)}</span></td>`;
    const i = threads.indexOf(t);
    let cells;
    if (ext) cells = tl
      ? `<td class="n max">${f3(tl.dMax)}</td><td class="n min">${f3(tl.dMin)}</td><td class="n max">${f3(tl.d2Max)}</td><td class="n min">${f3(tl.d2Min)}</td><td class="n max">${f3(tl.d3Max)}</td>`
      : `<td class="n" colspan="2">${f3(b.d)} <span class="muted">בסיס</span></td><td class="n" colspan="2">${f3(b.d2)}</td><td class="n">${f3(b.d3)}</td>`;
    else cells = tl
      ? `<td class="n min">${f3(tl.D1Min)}</td><td class="n max">${f3(tl.D1Max)}</td><td class="n min">${f3(tl.D2Min)}</td><td class="n max">${f3(tl.D2Max)}</td><td class="n">${f3(tl.DMin)}</td><td class="n">${f2(b.drill)}</td>`
      : `<td class="n" colspan="2">${f3(b.D1)} <span class="muted">בסיס</span></td><td class="n" colspan="2">${f3(b.d2)}</td><td class="n">${f3(b.d)}</td><td class="n">${f2(b.drill)}</td>`;
    return `<tr tabindex="0" data-i="${i}">${name}${tag}${pt}${cells}<td class="go">←</td></tr>`;
  }).join('');
}
const openRow = (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) location.hash = `#t/${tr.dataset.i}`; };
$('#rows').addEventListener('click', openRow);
$('#rows').addEventListener('keydown', (e) => { if (e.key === 'Enter') openRow(e); });
$('#customForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const d = parseFloat($('#cuD').value), P = parseFloat($('#cuP').value);
  if (d > 0 && P > 0 && P < d / 2) location.hash = `#c/${d}/${P}`;
});

/* =========================================================
   פרטי הברגה
   ========================================================= */
const D = { t: null, view: 'bolt', section: true, param: 'major', side: 'ext', tab: 'dims' };
let viewer = null, viewerFailed = false;

const PARAMS = [
  { id: 'major', ext: 'd', int: 'D', name: 'קוטר חיצוני' },
  { id: 'pitchd', ext: 'd2', int: 'D2', name: 'קוטר צד' },
  { id: 'minor', ext: 'd3', int: 'D1', name: 'קוטר פנימי' },
  { id: 'pitch', ext: 'P', int: 'P', name: 'פסיעה' },
  { id: 'angle', ext: 'α', int: 'α', name: 'זווית' },
  { id: 'depth', ext: 'h3', int: 'H1', name: 'עומק שן' },
  { id: 'drill', ext: 'Ø', int: 'Ø', name: 'חומר גלם / מקדח' },
];

function customThread(d, P) {
  return { family: 'custom', name: `M${trim(d)}×${trim(P)}`, full: `M${trim(d)}×${trim(P)} (מיוחד)`, d, P, aliases: [] };
}
families.custom = families.custom || { label: 'מיוחד 60°', std: 'ISO 68-1 (פרופיל בסיס)', angle: 60, kind: 'straight', profile: 'iso' };

function ensureViewer() {
  if (viewer || viewerFailed) return viewer;
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl');
    viewer = createViewer($('#stage'), {
      onPick: (r) => { if (r.side) D.side = r.side; setParam(r.param); },
      onHover: (r, e) => {
        const tip = $('#tip');
        if (!r || !r.param || !e) { tip.hidden = true; return; }
        const rect = $('#stage').getBoundingClientRect();
        const p = PARAMS.find((x) => x.id === r.param);
        tip.textContent = `${r.where} → ${p.name} ${p[r.side || D.side]}`;
        tip.style.left = `${e.clientX - rect.left}px`; tip.style.top = `${e.clientY - rect.top}px`;
        tip.hidden = false;
      },
    });
    viewer.onLabel((pos) => {
      const el = $('#stageLabel');
      if (!pos || !pos.visible) { el.hidden = true; return; }
      el.hidden = false; el.style.left = `${pos.x}px`; el.style.top = `${pos.y}px`;
    });
  } catch (err) {
    viewerFailed = true;
    $('#stageFallback').hidden = false;
  }
  return viewer;
}

function openThread(t) {
  D.t = t;
  D.param = 'major';
  D.view = 'bolt'; D.side = 'ext';
  $$('#viewSeg button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'bolt'));
  const isPipe = ['g', 'r', 'npt'].includes(t.family);
  $('#viewSeg [data-v=bolt]').textContent = isPipe ? 'צינור (זכר)' : 'בורג';
  $('#viewSeg [data-v=nut]').textContent = isPipe ? 'מופה (נקבה)' : 'אום';
  const f = families[t.family], b = TM.basic(t);
  $('#dName').textContent = t.full;
  $('#dSub').textContent = `${f.label} · ${f.std} · פרופיל ${f.angle}° · ${b.taper ? 'קונית 1:16' : 'ישרה'} · הברגה ימנית`;
  $('#dQuick').innerHTML = [
    ['קוטר', `${trim(b.d, 3)}`], ['פסיעה', `${trim(b.P, 3)}`], ['TPI', trim(b.tpi, 2)], ['מקדח', f2(b.drill)],
  ].map(([k, v]) => `<div class="q"><small>${k}</small><b>${v}</b></div>`).join('');
  document.title = `${t.name} · מאתר הברגות`;
  rebuildModel();
  renderParams(); renderInfo(); draw2D(); renderTab();
}

function rebuildModel() {
  const v = ensureViewer(); if (!v) return;
  const pipe = ['g', 'r', 'npt'].includes(D.t.family);
  v.build(TM.profile(D.t), { view: D.view, section: D.section, param: D.param, pipe });
  $('#playBtn').hidden = D.view !== 'assembly';
  $('#playBtn').textContent = '❚❚';
  $('#secChk').closest('.toggle').hidden = D.view === 'assembly';
}

$('#viewSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  D.view = b.dataset.v; $$('#viewSeg button').forEach((x) => x.classList.toggle('on', x === b));
  D.side = D.view === 'nut' ? 'int' : 'ext';
  rebuildModel(); renderParams(); renderInfo(); draw2D();
});
$('#secChk').addEventListener('change', (e) => { D.section = e.target.checked; rebuildModel(); });
$('#resetBtn').addEventListener('click', () => viewer && viewer.resetView());
let playing = true;
$('#playBtn').addEventListener('click', () => { playing = !playing; viewer && viewer.setPlaying(playing); $('#playBtn').textContent = playing ? '❚❚' : '▶'; });

function renderParams() {
  $('#params').innerHTML = PARAMS.map((p) => `<button type="button" class="pchip${D.param === p.id ? ' on' : ''}" data-p="${p.id}"><i>${p[D.side]}</i>${p.name}</button>`).join('');
}
$('#params').addEventListener('click', (e) => { const b = e.target.closest('.pchip'); if (b) setParam(b.dataset.p); });

function setParam(p) {
  D.param = p;
  renderParams(); renderInfo(); draw2D();
  if (viewer) viewer.highlight(p);
}

/* ----- מידע על פרמטר ----- */
function wires(b) {
  const P = b.P;
  if (b.angle === 55) { const w = 0.5637 * P; return { w, M: (d2) => d2 + 3.1657 * w - 0.9605 * P }; }
  const w = 0.57735 * P; return { w, M: (d2) => d2 + 3 * w - 0.866025 * P };
}

function paramInfo(param, side) {
  const t = D.t, b = TM.basic(t), cls = clsFor(t, side), tl = TM.tol(t, cls);
  const ext = side === 'ext';
  const P = b.P;
  const o = { sym: PARAMS.find((x) => x.id === param)[side], cls };
  switch (param) {
    case 'major':
      o.title = 'קוטר חיצוני'; o.where = ext ? 'נמדד על פסגות שיני הבורג' : 'קוטר תחתית השן באום';
      o.nom = b.d;
      if (tl) { if (ext) { o.max = tl.dMax; o.min = tl.dMin; o.tol = tl.Td; } else { o.min = tl.DMin; o.maxNote = 'לא מוגבל'; } }
      o.text = ext ? 'זהו הקוטר שלפיו נקרא שם ההברגה. הוא נמדד בקליבר על פסגות השיניים, ובורג תקין נמדד בדרך כלל מעט מתחת לנומינלי.' : 'הקוטר בתחתית החריץ של האום. התקן מגדיר רק מינימום, כי הכלי חייב לחתוך עמוק מספיק כדי שפסגות הבורג לא ייגעו בתחתית.';
      o.machine = ext
        ? `<b>חריטת חומר גלם:</b> Ø${f3(tl ? tl.dMax - 0.02 : b.d - 0.05)} עד Ø${f3(tl ? (tl.dMax + tl.dMin) / 2 : b.d - 0.1)}. פזה 45° בקצה עד Ø${f2(b.d3 - 0.1)}.`
        : `<b>עומק חיתוך:</b> כלי ההברגה חייב להגיע לפחות ל-Ø${f3(tl ? tl.DMin : b.d)}.`;
      o.label = tl && ext ? `d ${f3(tl.dMax)} / ${f3(tl.dMin)}` : `${ext ? 'd' : 'D'} ${f3(b.d)}`;
      break;
    case 'pitchd': {
      o.title = 'קוטר צד'; o.where = 'נמדד על צלעות השן, בגובה שבו רוחב השן שווה לרוחב הרווח';
      o.nom = b.d2;
      if (tl) { if (ext) { o.max = tl.d2Max; o.min = tl.d2Min; o.tol = tl.Td2; } else { o.min = tl.D2Min; o.max = tl.D2Max; o.tol = tl.TD2; } }
      o.text = 'זה הקוטר החשוב ביותר להתאמה בין בורג לאום. מודדים אותו בשיטת 3 חוטים, במיקרומטר לקוטר צד, או בודקים בטבעת או פקק GO/NO-GO.';
      if (b.profile !== 'npt') {
        const W = wires(b);
        o.machine = ext
          ? `<b>מדידת 3 חוטים:</b> חוט מיטבי Ø${f3(W.w)} · מידה מעל החוטים M = ${tl ? `${f3(W.M(tl.d2Max))} עד ${f3(W.M(tl.d2Min))}` : f3(W.M(b.d2))}`
          : `<b>בדיקה:</b> פקק הברגה GO/NO-GO ${cls || ''}. חוט מיטבי למדידת אום Ø${f3(W.w)}.`;
      }
      o.label = tl ? `${ext ? 'd2' : 'D2'} ${f3(o.max)} / ${f3(o.min)}` : `d2 ${f3(b.d2)}`;
      break;
    }
    case 'minor':
      o.title = ext ? 'קוטר פנימי של הבורג' : 'קוטר פנימי של האום (קידוח)';
      o.where = ext ? 'קוטר הליבה, בתחתית החריץ' : 'פסגות שיני האום, כלומר קוטר החור';
      o.nom = ext ? b.d3 : b.D1;
      if (tl) { if (ext) { o.max = tl.d3Max; o.minNote = 'נקבע לפי רדיוס התחתית'; } else { o.min = tl.D1Min; o.max = tl.D1Max; o.tol = tl.TD1; } }
      o.text = ext ? 'קוטר הליבה קובע את חוזק הבורג (שטח החתך). בחריטה מגיעים אליו בסוף ההזנה הרדיאלית.' : 'זה קוטר הקידוח או החריטה לפני ההברגה. קידוח קטן מדי ישבור את הברז, וקידוח גדול מדי ייתן שן חלשה.';
      o.machine = ext
        ? `<b>קוטר X סופי בחריטה:</b> ≈ Ø${f3(tl ? tl.d3Max : b.d3)} (הזנה רדיאלית ${f3(TM.turning(t, 'ext').ap)} מ"מ).`
        : `<b>קידוח / חריטה:</b> Ø${tl ? `${f3(tl.D1Min)} עד ${f3(tl.D1Max)} · מומלץ Ø${f2(tl.D1Min + (tl.D1Max - tl.D1Min) * 0.6)}` : f3(b.D1)} · מקדח מקובל Ø${f2(b.drill)}${b.drillLabel ? ` (${b.drillLabel})` : ''}`;
      if (tl && !ext && tl.approxMinor) o.machine += ' <span class="muted">· סבולת בקירוב</span>';
      o.label = `${ext ? 'd3' : 'D1'} ${tl ? (ext ? f3(tl.d3Max) : `${f3(tl.D1Min)}–${f3(tl.D1Max)}`) : f3(o.nom)}`;
      break;
    case 'pitch':
      o.title = 'פסיעה'; o.where = 'המרחק בין שתי שיניים סמוכות, וגם ההתקדמות בכל סיבוב (בהברגה חד-התחלתית)';
      o.nom = P; o.unit = 'מ"מ'; o.extra = [['TPI', trim(IN / P, 2)], ['עלייה לסיבוב', `${trim(P, 3)} מ"מ`]];
      o.text = 'במודל מסומן סיבוב אחד שלם של הסליל: מנקודת ההתחלה עד הסוף ההתקדמות היא בדיוק פסיעה אחת.';
      o.machine = `<b>הזנה במחרטה:</b> ${trim(P, 3)} מ"מ/סיבוב${t.tpi ? ` · בתיבת הילוכים אינץ': ${t.tpi} TPI` : ''}. ב-CNC: F${trim(P, 4)}.`;
      o.label = `P ${trim(P, 3)}${t.tpi ? ` · ${t.tpi} TPI` : ''}`;
      break;
    case 'angle':
      o.title = 'זווית הפרופיל'; o.where = 'הזווית בין שתי צלעות השן';
      o.nom = b.angle; o.unit = '°'; o.dp = 0; o.extra = [['חצי זווית', `${b.angle / 2}°`], ['שיפוע', b.taper ? '1:16 (1°47′)' : 'ישרה']];
      o.text = b.angle === 55 ? 'הברגות ויטוורת / BSP: זווית של 55° עם פסגות ותחתיות מעוגלות.' : 'הברגות מטריות, UN ו-NPT: זווית של 60°. בבסיס הפרופיל הפסגה שטוחה (P/8) והתחתית מעוגלת.';
      o.machine = `<b>הזנה בזווית צד:</b> ${b.angle === 55 ? 27 : 29.5}° · כלי חיתוך (פלטה) ${b.angle}°${b.angle === 60 ? ' (פרופיל מלא או חלקי)' : ''}.`;
      o.label = `${b.angle}°`;
      break;
    case 'depth': {
      const tr = TM.turning(t, side);
      o.title = ext ? 'עומק שן בבורג (h3)' : 'עומק שן באום (H1)';
      o.where = 'המרחק הרדיאלי בין הפסגה לתחתית';
      o.nom = ext ? b.hExt : b.hInt; o.extra = [['משולש יסוד H', `${f3(b.H)} מ"מ`], ['הזנה כוללת בחריטה', `${f3(tr.ap)} מ"מ`]];
      o.text = 'עומק השן קובע את עומק ההזנה הרדיאלית הכוללת בחריטה ואת גובה הפרופיל של כלי הכרסום.';
      o.machine = `<b>חריטה:</b> ${tr.passes} מעברים בהזנה פוחתת, ובסיום מעבר ניקוי אחד או שניים. פירוט בלשונית "חריטה".`;
      o.label = `${ext ? 'h3' : 'H1'} ${f3(o.nom)}`;
      break;
    }
    case 'drill':
      o.title = ext ? 'קוטר חומר גלם' : 'מקדח הברזה';
      o.where = ext ? 'הקוטר שאליו חורטים לפני חיתוך ההברגה' : 'קוטר הקידוח לפני הברזה';
      o.nom = ext ? (tl ? tl.dMax - 0.03 : b.d - 0.05) : b.drill;
      if (!ext && tl) { o.min = tl.D1Min; o.max = tl.D1Max; o.tol = tl.TD1; o.rangeNote = 'תחום D1 המותר'; }
      o.text = ext ? 'בחריטה חורטים את חומר הגלם מעט מתחת ל-d מקסימום, כי ההברגה "מנפחת" את החומר בקצת. בגלגול הברגה חומר הגלם קרוב לקוטר הצד.' : `מקדח מקובל ≈ 75% הברגה${b.drillLabel ? ` (${b.drillLabel})` : ''}. בחומרים קשים או עם ברז מעצב (גלגול) יש להתאים את הקוטר.`;
      o.machine = ext ? `<b>לגלגול הברגה:</b> חומר גלם ≈ Ø${f3(b.d2 - 0.01)} (קרוב לקוטר הצד).` : `<b>ברז מעצב (ללא שבב):</b> קידוח ≈ Ø${f2(b.d - 0.5 * P)}.`;
      o.label = `Ø${f2(o.nom)}`;
      break;
  }
  return o;
}

function tolBar(o) {
  if (o.max == null || o.min == null) return '';
  const lo = Math.min(o.min, o.nom), hi = Math.max(o.max, o.nom);
  const pad = (hi - lo) * 0.25 || 0.01;
  const pos = (v) => ((v - (lo - pad)) / (hi - lo + 2 * pad)) * 100;
  // RTL: ציר משמאל לימין
  return `<div class="tolbar" dir="ltr">
    <div class="axis"></div>
    <div class="zone" style="left:${pos(o.min)}%;width:${pos(o.max) - pos(o.min)}%"></div>
    <div class="nom" style="left:${pos(o.nom)}%"></div>
    <span class="lbl" style="left:${pos(o.nom) - 4}%">נומינלי</span>
  </div>`;
}

function renderInfo() {
  const o = paramInfo(D.param, D.side);
  const dp = o.dp ?? 3, unit = o.unit ?? 'מ"מ';
  const hasTol = o.max != null || o.min != null;
  $('#info').innerHTML = `
    <div class="info-head"><span class="sym">${o.sym}</span><div><h3>${o.title}</h3><p>${o.where}</p></div></div>
    <div class="big">${o.nom.toFixed(dp)} <small>${unit}</small></div>
    ${o.cls ? `<div class="muted small">דרגת סבולת <b>${o.cls}</b> · ${D.side === 'ext' ? 'בורג' : 'אום'}${o.tol ? ` · רוחב סבולת ${o.tol} µm` : ''}</div>` : (['g', 'r', 'npt'].includes(D.t.family) && !['pitch', 'angle'].includes(D.param) ? '<div class="muted small">מידת בסיס (בהברגות צנרת הסבולות לפי התקן הייעודי)</div>' : '')}
    ${hasTol ? `<div class="limits">
        <div class="lim max"><small>מקסימום</small><b>${o.max != null ? o.max.toFixed(3) : `<span class="muted small">${o.maxNote || '—'}</span>`}</b></div>
        <div class="lim min"><small>מינימום</small><b>${o.min != null ? o.min.toFixed(3) : `<span class="muted small">${o.minNote || '—'}</span>`}</b></div>
      </div>${tolBar(o)}` : ''}
    ${o.extra ? `<div class="limits">${o.extra.map(([k, v]) => `<div class="lim"><small>${k}</small><b>${v}</b></div>`).join('')}</div>` : ''}
    <p class="explain">${o.text}</p>
    ${o.machine ? `<div class="machine">${o.machine}</div>` : ''}
    <div class="side-pick seg" id="infoSide">
      <button type="button" data-v="ext" class="${D.side === 'ext' ? 'on' : ''}">בורג</button>
      <button type="button" data-v="int" class="${D.side === 'int' ? 'on' : ''}">אום</button>
    </div>
    ${clsGroup(D.t) ? `<select id="infoCls" aria-label="דרגת סבולת" style="margin-inline-start:6px">${TM.classes(D.t)[D.side].map((c) => `<option ${c === o.cls ? 'selected' : ''}>${c}</option>`).join('')}</select>` : ''}
  `;
  $('#stageLabel').textContent = o.label || '';
  $('#infoSide').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    D.side = b.dataset.v; renderParams(); renderInfo(); draw2D();
  });
  const cs = $('#infoCls');
  if (cs) cs.addEventListener('change', () => { S.cls[clsGroup(D.t)][D.side] = cs.value; renderInfo(); renderTab(); });
}

/* ----- שרטוט חתך דו-ממדי ----- */
function draw2D() {
  const t = D.t, pr = TM.profile(t), b = pr.basic, P = b.P;
  const W = 820, H = 360, x0 = 90, x1 = 800, turns = 2.5;
  const k = (x1 - x0) / (turns * P);
  const yMaj = 120;
  const y = (r) => yMaj + (pr.ext.rMaj - r) * k;
  const xs = [];
  for (let i = 0; i <= 600; i++) xs.push(x0 + (x1 - x0) * i / 600);
  const uAt = (x) => (x - x0) / (k * P) - 0.25;
  const boltPts = xs.map((x) => [x, y(pr.rExt(uAt(x)))]);
  const nutPts = xs.map((x) => [x, y(pr.rInt(uAt(x))) - 2]);
  const yBot = H - 40, yTop = 18;
  const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('');
  const boltArea = `${path(boltPts)} L${x1},${yBot} L${x0},${yBot} Z`;
  const nutArea = `${path(nutPts)} L${x1},${yTop} L${x0},${yTop} Z`;
  const showNut = D.view !== 'bolt' || D.side === 'int';
  const showBolt = D.view !== 'nut' || D.side === 'ext';

  // אזורים לחיצים: סיווג לפי הפונקציה הגולמית
  const segs = (raw, classify) => {
    const out = []; let cur = null;
    xs.forEach((x) => {
      const u = uAt(x); let f = u - Math.floor(u); const tt = f > 0.5 ? 1 - f : f;
      const c = classify(tt);
      const yy = y(raw(tt));
      if (!cur || cur.c !== c) { if (cur) { cur.pts.push([x, yy]); out.push(cur); } cur = { c, pts: [] }; }
      cur.pts.push([x, yy]);
    });
    if (cur) out.push(cur);
    return out;
  };
  const e = pr.ext, n = pr.int;
  const boltSegs = segs(pr.rawExt, (tt) => (tt <= e.crest ? 'major' : tt <= e.crest + e.flank ? 'pitchd' : 'minor'));
  const nutSegs = segs(pr.rawInt, (tt) => (tt <= n.root ? 'major' : tt <= n.root + n.flank ? 'pitchd' : 'minor'));
  const hot = (list, side, dy = 0) => list.map((s) => `<path class="hot${D.param === s.c && D.side === side ? ' on' : ''}" data-p="${s.c}" data-s="${side}" d="${path(s.pts.map((p) => [p[0], p[1] + dy]))}"><title>${PARAMS.find((x) => x.id === s.c).name}</title></path>`).join('');

  const ext = D.side === 'ext';
  const refs = [
    { id: 'major', r: b.d / 2, l: ext ? `d ${trim(b.d, 3)}` : `D ${trim(b.d, 3)}` },
    { id: 'pitchd', r: b.d2 / 2, l: `${ext ? 'd2' : 'D2'} ${trim(b.d2, 3)}` },
    ext ? { id: 'minor', r: b.d3 / 2, l: `d3 ${trim(b.d3, 3)}` } : { id: 'minor', r: b.D1 / 2, l: `D1 ${trim(b.D1, 3)}` },
  ];
  const refSel = D.param === 'drill' && !ext ? 'minor' : D.param;
  let dims = '';
  // אמצע פסגת בורג: uAt(x)=n → x = x0 + (n+0.25)kP
  const crestX = (i) => x0 + (i + 0.25) * k * P;
  const rootX = (i) => crestX(i) + 0.5 * k * P;
  if (D.param === 'pitch') {
    const a = crestX(1), c = crestX(2), yy = yTop + 14;
    dims = `<line class="dim" x1="${a}" y1="${yy}" x2="${c}" y2="${yy}" marker-start="url(#ar)" marker-end="url(#ar)"/>
      <line class="dim" x1="${a}" y1="${yy - 8}" x2="${a}" y2="${y(b.d / 2)}" stroke-dasharray="3 3"/><line class="dim" x1="${c}" y1="${yy - 8}" x2="${c}" y2="${y(b.d / 2)}" stroke-dasharray="3 3"/>
      <rect x="${(a + c) / 2 - 62}" y="${yy - 11}" width="124" height="22" rx="6" fill="var(--surface)"/>
      <text class="dimtxt" x="${(a + c) / 2}" y="${yy + 5}" text-anchor="middle">P = ${trim(P, 3)}</text>`;
  } else if (D.param === 'angle') {
    const cx = crestX(1), half = (b.angle / 2) * Math.PI / 180;
    const crestHalfW = e.crest * P * k;
    const apexY = y(b.d / 2) - crestHalfW / Math.tan(half);
    const yR = y(b.d3 / 2);
    const dx = (yR - apexY) * Math.tan(half);
    const R = 46;
    dims = `<line class="dim" x1="${cx}" y1="${apexY}" x2="${cx - dx}" y2="${yR}"/><line class="dim" x1="${cx}" y1="${apexY}" x2="${cx + dx}" y2="${yR}"/>
      <path class="dim" d="M${cx - R * Math.sin(half)},${apexY + R * Math.cos(half)} A${R},${R} 0 0 0 ${cx + R * Math.sin(half)},${apexY + R * Math.cos(half)}"/>
      <text class="dimtxt" x="${cx}" y="${apexY + R + 18}" text-anchor="middle">${b.angle}°</text>`;
  } else if (D.param === 'depth') {
    const xx = rootX(1);
    const ya = y(b.d / 2), yb = y((ext ? b.d3 : b.D1) / 2);
    dims = `<line class="dim" x1="${xx}" y1="${ya}" x2="${xx}" y2="${yb}" marker-start="url(#ar)" marker-end="url(#ar)"/>
      <rect x="${xx + 8}" y="${(ya + yb) / 2 - 12}" width="120" height="24" rx="6" fill="var(--surface)"/>
      <text class="dimtxt" x="${xx + 14}" y="${(ya + yb) / 2 + 5}">${ext ? 'h3' : 'H1'} = ${trim(ext ? b.hExt : b.hInt, 3)}</text>`;
  }
  const refLines = refs.map((r) => {
    const on = refSel === r.id;
    return `<line class="ref${on ? ' on' : ''}" x1="${x0 - 6}" x2="${x1}" y1="${y(r.r)}" y2="${y(r.r)}"/>
      <text class="reflbl${on ? ' on' : ''}" x="${x0 - 10}" y="${y(r.r) + 4}" text-anchor="end">${r.l.split(' ')[0]}</text>
      ${on ? `<rect x="${x1 - 150}" y="${y(r.r) - 26}" width="148" height="20" rx="5" fill="var(--surface)"/><text class="dimtxt" x="${x1 - 6}" y="${y(r.r) - 11}" text-anchor="end">Ø ${r.l.split(' ')[1]}</text>` : ''}`;
  }).join('');

  $('#svg2d').innerHTML = `<svg class="p2d" viewBox="0 0 ${W} ${H}" role="img" aria-label="חתך פרופיל ההברגה">
    <defs>
      <linearGradient id="gBolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c7cdd6"/><stop offset="1" stop-color="#8b95a3"/></linearGradient>
      <linearGradient id="gNut" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#e2b45c"/><stop offset="1" stop-color="#b98429"/></linearGradient>
      <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#000" stroke-opacity=".12" stroke-width="2"/></pattern>
      <marker id="ar" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="var(--accent)"/></marker>
      <clipPath id="clipA"><rect x="${x0}" y="0" width="${x1 - x0}" height="${H}"/></clipPath>
    </defs>
    <g clip-path="url(#clipA)">
      ${showNut ? `<path class="nut" d="${nutArea}" opacity="${D.side === 'int' ? 1 : 0.55}"/><path d="${nutArea}" fill="url(#hatch)"/><path class="outline" d="${path(nutPts)}"/>` : ''}
      ${showBolt ? `<path class="bolt" d="${boltArea}" opacity="${D.side === 'ext' ? 1 : 0.55}"/><path d="${boltArea}" fill="url(#hatch)"/><path class="outline" d="${path(boltPts)}"/>` : ''}
    </g>
    <line class="axisline" x1="${x0}" x2="${x1}" y1="${yBot + 22}" y2="${yBot + 22}"/>
    <text class="partlbl" x="${x1}" y="${yBot + 16}" text-anchor="end">ציר ההברגה (לא בקנה מידה) ↓</text>
    ${showNut ? `<text class="partlbl" x="${x1 - 6}" y="${yTop + 34}" text-anchor="end">אום</text>` : ''}
    ${showBolt ? `<text class="partlbl" x="${x1 - 6}" y="${yBot - 8}" text-anchor="end">בורג</text>` : ''}
    ${refLines}
    ${showBolt ? hot(boltSegs, 'ext') : ''}
    ${showNut ? hot(nutSegs, 'int', -2) : ''}
    ${dims}
  </svg>`;
}
$('#svg2d').addEventListener('click', (e) => {
  const h = e.target.closest('.hot'); if (!h) return;
  D.side = h.dataset.s; setParam(h.dataset.p);
});

/* ----- לשוניות: מידות / חריטה / כרסום ----- */
$('#dTabs').addEventListener('click', (e) => {
  const b = e.target.closest('.tab'); if (!b) return;
  D.tab = b.dataset.t; $$('#dTabs .tab').forEach((x) => x.classList.toggle('on', x === b));
  renderTab();
});
function renderTab() {
  ['dims', 'turn', 'mill'].forEach((k) => { $(`#tp-${k}`).hidden = D.tab !== k; });
  if (D.tab === 'dims') renderDims();
  if (D.tab === 'turn') renderTurn();
  if (D.tab === 'mill') renderMill();
}

function renderDims() {
  const t = D.t, b = TM.basic(t);
  const te = TM.tol(t, clsFor(t, 'ext')), ti = TM.tol(t, clsFor(t, 'int'));
  const row = (p, side, sym, name, nom, max, min, tol) =>
    `<tr class="click" data-p="${p}" data-s="${side}"><td class="sy">${sym}</td><td>${name}</td><td class="n">${f3(nom)}</td><td class="n">${max == null ? '—' : f3(max)}</td><td class="n">${min == null ? '—' : f3(min)}</td><td class="n">${tol ? tol + ' µm' : '—'}</td></tr>`;
  const head = (title, cls) => `<h3 style="margin:4px 0 8px">${title}${cls ? ` <span class="tag">${cls}</span>` : ''}</h3>`;
  const tbl = (rows) => `<div class="table-wrap" style="max-height:none"><table class="dt"><thead><tr><th></th><th>מידה</th><th>נומינלי</th><th>max</th><th>min</th><th>סבולת</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  $('#tp-dims').innerHTML = `<div class="grid2">
    <div>${head('בורג (הברגה חיצונית)', te && te.cls)}${tbl(
      row('major', 'ext', 'd', 'קוטר חיצוני', b.d, te?.dMax, te?.dMin, te?.Td) +
      row('pitchd', 'ext', 'd2', 'קוטר צד', b.d2, te?.d2Max, te?.d2Min, te?.Td2) +
      row('minor', 'ext', 'd3', 'קוטר פנימי', b.d3, te?.d3Max, null, null) +
      row('depth', 'ext', 'h3', 'עומק שן', b.hExt, null, null, null))}</div>
    <div>${head('אום (הברגה פנימית)', ti && ti.cls)}${tbl(
      row('major', 'int', 'D', 'קוטר חיצוני', b.d, null, ti?.DMin, null) +
      row('pitchd', 'int', 'D2', 'קוטר צד', b.d2, ti?.D2Max, ti?.D2Min, ti?.TD2) +
      row('minor', 'int', 'D1', 'קוטר פנימי', b.D1, ti?.D1Max, ti?.D1Min, ti?.TD1) +
      row('drill', 'int', 'Ø', 'מקדח הברזה', b.drill, null, null, null))}</div>
  </div>
  <div class="kpis">
    <div class="kpi"><small>פסיעה</small><b>${trim(b.P, 4)} מ"מ</b></div>
    <div class="kpi"><small>TPI</small><b>${trim(b.tpi, 2)}</b></div>
    <div class="kpi"><small>משולש יסוד H</small><b>${f3(b.H)}</b></div>
    <div class="kpi"><small>זווית</small><b>${b.angle}°</b></div>
  </div>
  <p class="muted small">לחיצה על שורה מסמנת את המידה במודל. ${clsGroup(t) ? 'הסבולות מחושבות לפי נוסחאות התקן ועשויות להיות שונות בכמה מיקרונים מהטבלאות המודפסות.' : 'בהברגות צנרת מוצגות מידות בסיס.'}</p>`;
}
$('#tp-dims').addEventListener('click', (e) => {
  const r = e.target.closest('tr.click'); if (!r) return;
  D.side = r.dataset.s; setParam(r.dataset.p);
  $('.studio').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

/* חריטה */
const TS = { side: 'ext', passes: 0, vc: 120, L: 0, spring: 1 };
function renderTurn() {
  const t = D.t, b = TM.basic(t), f = families[t.family];
  if (!TS.L || TS.t !== t) { TS.L = Math.round(b.d * 1.5); TS.passes = 0; TS.t = t; TS.side = D.side; }
  const tr = TM.turning(t, TS.side, TS.passes || 0);
  const ext = TS.side === 'ext';
  const tl = TM.tol(t, clsFor(t, TS.side));
  const dRef = ext ? (tl ? tl.dMax - 0.03 : b.d) : (tl ? (tl.D1Min + tl.D1Max) / 2 : b.D1);
  const xFinal = ext ? dRef - 2 * tr.ap : dRef + 2 * tr.ap;
  const rpm = Math.round(1000 * TS.vc / (Math.PI * b.d));
  const vf = rpm * b.P;
  const taperR = b.taper ? -(TS.L / 32) : 0;
  const firstCut = tr.ap / Math.sqrt(tr.passes);
  const xStart = ext ? b.d + 2 : Math.max(1, b.D1 - 2);
  const g76 = [
    `<span class="c">(${t.full} ${ext ? 'EXTERNAL' : 'INTERNAL'} - FANUC G76)</span>`,
    `G97 S${rpm} M03`,
    `G00 X${xStart.toFixed(3)} Z${(3 * b.P).toFixed(3)}`,
    `<span class="k">G76</span> P${String(TS.spring).padStart(2, '0')}00${b.angle} Q${Math.round(Math.max(0.02, tr.ap / 12) * 1000)} R0.02`,
    `<span class="k">G76</span> X${xFinal.toFixed(3)} Z-${TS.L.toFixed(3)}${taperR ? ` R${(ext ? taperR : -taperR).toFixed(3)}` : ''} P${Math.round(tr.ap * 1000)} Q${Math.round(firstCut * 1000)} F${trim(b.P, 4)}`,
    `G00 X${(ext ? xStart + 20 : xStart).toFixed(3)} Z50.`,
  ].join('\n');
  const g92 = [
    `<span class="c">(G92 - PASS BY PASS)</span>`,
    `G00 X${xStart.toFixed(3)} Z${(3 * b.P).toFixed(3)}`,
    ...tr.rows.map((r, i) => `${i === 0 ? '<span class="k">G92</span> ' : '     '}X${(ext ? dRef - 2 * r.cum : dRef + 2 * r.cum).toFixed(3)}${i === 0 ? ` Z-${TS.L.toFixed(3)} F${trim(b.P, 4)}` : ''}`),
    ...Array.from({ length: TS.spring }, () => `     X${xFinal.toFixed(3)} <span class="c">(SPRING)</span>`),
    `G00 X${(xStart + (ext ? 20 : 0)).toFixed(3)} Z50.`,
  ].join('\n');
  $('#tp-turn').innerHTML = `
    <div class="seg" id="turnSide"><button type="button" data-v="ext" class="${ext ? 'on' : ''}">בורג (חיצוני)</button><button type="button" data-v="int" class="${!ext ? 'on' : ''}">אום (פנימי)</button></div>
    <div class="form-grid four">
      <label class="field"><span>מספר מעברים</span><input type="number" id="tPass" min="2" max="40" value="${tr.passes}"></label>
      <label class="field"><span>מהירות חיתוך Vc (מ'/דקה)</span><input type="number" id="tVc" min="5" value="${TS.vc}"></label>
      <label class="field"><span>אורך הברגה (מ"מ)</span><input type="number" id="tL" min="1" value="${TS.L}"></label>
      <label class="field"><span>מעברי ניקוי</span><input type="number" id="tSp" min="0" max="5" value="${TS.spring}"></label>
    </div>
    <div class="kpis">
      <div class="kpi"><small>הזנה רדיאלית כוללת</small><b>${f3(tr.ap)} מ"מ</b></div>
      <div class="kpi"><small>${ext ? 'קוטר חומר גלם' : 'קוטר קידוח'}</small><b>Ø${f3(dRef)}</b></div>
      <div class="kpi"><small>קוטר X סופי</small><b>Ø${f3(xFinal)}</b></div>
      <div class="kpi"><small>זווית הזנה צידית</small><b>${tr.flank}°</b></div>
      <div class="kpi"><small>סיבובים (S)</small><b>${rpm}</b></div>
      <div class="kpi"><small>הזנה (F)</small><b>${trim(b.P, 4)} מ"מ/סיבוב</b></div>
      <div class="kpi ${vf > 6000 ? 'warn' : ''}"><small>מהירות ציר Z</small><b>${Math.round(vf)} מ"מ/דק'</b></div>
      <div class="kpi"><small>מעבר ראשון / אחרון</small><b>${f3(tr.rows[0].inc)} / ${f3(tr.rows[tr.rows.length - 1].inc)}</b></div>
    </div>
    ${vf > 6000 ? '<div class="alert warn">מהירות ציר Z גבוהה. כדאי להוריד סיבובים כדי שהמכונה תספיק להאיץ ולהאט.</div>' : ''}
    <h3 style="margin:16px 0 8px">טבלת מעברים (הזנה פוחתת)</h3>
    <div class="bars">${tr.rows.map((r) => {
      const prev = (r.cum - r.inc) / tr.ap * 100, now = r.inc / tr.ap * 100;
      return `<div class="bar"><span class="muted">#${r.x}</span><div class="track" dir="ltr"><span class="done" style="width:${prev}%"></span><span class="now" style="width:${now}%"></span></div><span class="v">${f3(r.inc)} → X${f3(ext ? dRef - 2 * r.cum : dRef + 2 * r.cum)}</span></div>`;
    }).join('')}</div>
    <div class="grid2">
      <div><div class="code-head"><b>תוכנית G76 (פאנוק)</b><button type="button" class="btn ghost" data-copy="g76">העתק</button></div><pre class="code" id="g76">${g76}</pre></div>
      <div><div class="code-head"><b>תוכנית G92 (מעבר-מעבר)</b><button type="button" class="btn ghost" data-copy="g92">העתק</button></div><pre class="code" id="g92">${g92}</pre></div>
    </div>
    <p class="muted small">חישוב ההזנה הפוחתת: Δap = ap/√(n−1) · √φ, כאשר φ = 0.3 במעבר הראשון ו-φ = n−1 במעברים שאחריו. ${b.taper ? 'בהברגה קונית ערך R ב-G76 הוא הפרש הרדיוסים לאורך ההברגה (1:16). ' : ''}בדקו את הפורמט מול בקר המכונה שלכם.</p>`;
  $('#turnSide').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (bt) { TS.side = bt.dataset.v; renderTurn(); } });
  const bind = (id, key, int) => $(id).addEventListener('change', (e) => { const v = int ? parseInt(e.target.value, 10) : parseFloat(e.target.value); if (v >= 0) { TS[key] = v; renderTurn(); } });
  bind('#tPass', 'passes', true); bind('#tVc', 'vc'); bind('#tL', 'L'); bind('#tSp', 'spring', true);
}

/* כרסום */
const MS = { side: 'int', tool: 0, z: 3, vc: 120, fz: 0.05, L: 0, climb: true };
function renderMill() {
  const t = D.t, b = TM.basic(t);
  if (MS.t !== t) { MS.t = t; MS.side = D.side; MS.L = Math.round(b.d * 1.5); MS.tool = 0; }
  const ext = MS.side === 'ext';
  if (!MS.tool) MS.tool = ext ? Math.max(4, Math.round(b.d * 0.8)) : Math.max(1, Math.floor(b.D1 * 0.65 * 2) / 2);
  const Dt = MS.tool;
  const tl = TM.tol(t, clsFor(t, MS.side));
  const target = ext ? (tl ? tl.d3Max : b.d3) : (tl ? tl.DMin + 0.01 : b.d);
  const R = ext ? (target + Dt) / 2 : (target - Dt) / 2;
  const n = Math.round(1000 * MS.vc / (Math.PI * Dt));
  const vfEdge = MS.fz * MS.z * n;
  const vfC = Math.round(ext ? vfEdge * (b.d + Dt) / b.d : vfEdge * (b.d - Dt) / b.d);
  const turns = Math.ceil(MS.L / b.P);
  const tooBig = !ext && Dt >= b.D1 * 0.98;
  const warnBig = !ext && Dt > b.D1 * 0.7 && !tooBig;
  const lines = [];
  const c = (s) => `<span class="c">(${s})</span>`;
  lines.push(c(`${t.full} ${ext ? 'EXTERNAL' : 'INTERNAL'} THREAD MILL - RH - ${MS.climb ? 'CLIMB' : 'CONVENTIONAL'}`));
  lines.push(c(`TOOL D${trim(Dt, 3)}  PATH R${trim(R, 4)}  TURNS ${turns}`));
  lines.push('G90 G17 G54 G00 X0. Y0.');
  lines.push(`S${n} M03`);
  lines.push('G43 Z5. H01');
  // הברגה ימנית: פנימית כרסום מטפס = מלמטה למעלה עם G03; חיצונית מטפס = מלמעלה למטה עם G02
  const up = ext ? !MS.climb : MS.climb;
  const arc = (ext ? (MS.climb ? 'G02' : 'G03') : (MS.climb ? 'G03' : 'G02'));
  const zStart = up ? -turns * b.P : 0;
  const dz = up ? b.P : -b.P;
  if (ext) {
    lines.push(`G00 X${(R + Dt / 2 + 2).toFixed(3)} Y0.`);
    lines.push(`G00 Z${zStart.toFixed(3)}`);
    lines.push(`G01 X${R.toFixed(3)} F${Math.round(vfC / 2)}`);
  } else {
    lines.push(`G00 Z${zStart.toFixed(3)}`);
    lines.push(`G01 X${(R / 2).toFixed(3)} Y0. F${Math.round(vfC / 2)}`);
    lines.push(`<span class="k">${arc}</span> X${R.toFixed(3)} Y0. R${(R / 4 + 0.0001).toFixed(3)} ${c('ARC-IN')}`);
  }
  let z = zStart;
  for (let i = 0; i < turns; i++) {
    z += dz;
    lines.push(`<span class="k">${arc}</span> X${R.toFixed(3)} Y0. I${(-R).toFixed(3)} J0. Z${z.toFixed(3)}${i === 0 ? ` F${vfC}` : ''}`);
  }
  lines.push(ext ? `G01 X${(R + Dt / 2 + 2).toFixed(3)}` : 'G01 X0. Y0.');
  lines.push('G00 Z5.');
  lines.push('M05');
  const code = lines.join('\n');
  // איור מבט על
  const sc = 110 / Math.max(b.d / 2 + (ext ? Dt : 0), 1);
  const svg = `<svg class="mill-svg" viewBox="-130 -130 260 260" aria-label="מבט על של מסלול הכרסום">
    <circle r="${(b.d / 2) * sc}" fill="${ext ? 'url(#mB)' : 'none'}" stroke="var(--muted)" stroke-dasharray="${ext ? '0' : '4 4'}"/>
    ${ext ? '' : `<circle r="${(b.d / 2) * sc + 18}" fill="url(#mN)"/><circle r="${(b.D1 / 2) * sc}" fill="var(--surface)"/><circle r="${(b.d / 2) * sc}" fill="none" stroke="var(--muted)" stroke-dasharray="4 4"/>`}
    <circle r="${R * sc}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>
    <circle cx="${R * sc}" cy="0" r="${(Dt / 2) * sc}" fill="var(--blue)" fill-opacity=".35" stroke="var(--blue)" stroke-width="2"/>
    <circle cx="${R * sc}" cy="0" r="2.5" fill="var(--blue)"/>
    <path d="M${R * sc * Math.cos(-0.5)},${R * sc * Math.sin(-0.5)} A${R * sc},${R * sc} 0 0 ${arc === 'G03' ? 0 : 1} ${R * sc * Math.cos(-1.2)},${R * sc * Math.sin(-1.2)}" fill="none" stroke="var(--accent)" stroke-width="3" marker-end="url(#mA)"/>
    <defs>
      <radialGradient id="mB"><stop offset="0" stop-color="#c7cdd6"/><stop offset="1" stop-color="#8b95a3"/></radialGradient>
      <radialGradient id="mN"><stop offset=".6" stop-color="#e2b45c"/><stop offset="1" stop-color="#b98429"/></radialGradient>
      <marker id="mA" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/></marker>
    </defs>
  </svg>`;
  $('#tp-mill').innerHTML = `
    <div class="seg" id="millSide"><button type="button" data-v="int" class="${!ext ? 'on' : ''}">פנימית (אום)</button><button type="button" data-v="ext" class="${ext ? 'on' : ''}">חיצונית (בורג)</button></div>
    <div class="grid2" style="margin-top:6px">
      <div>
        <div class="form-grid" style="grid-template-columns:1fr 1fr">
          <label class="field"><span>קוטר כרסום Dt (מ"מ)</span><input type="number" id="mTool" step="0.1" min="0.5" value="${Dt}"></label>
          <label class="field"><span>מספר שיניים z</span><input type="number" id="mZ" min="1" value="${MS.z}"></label>
          <label class="field"><span>Vc (מ'/דקה)</span><input type="number" id="mVc" min="5" value="${MS.vc}"></label>
          <label class="field"><span>fz (מ"מ/שן)</span><input type="number" id="mFz" step="0.005" min="0.001" value="${MS.fz}"></label>
          <label class="field"><span>אורך הברגה (מ"מ)</span><input type="number" id="mL" min="1" value="${MS.L}"></label>
          <label class="field"><span>שיטה</span><select id="mClimb"><option value="1" ${MS.climb ? 'selected' : ''}>מטפס (מומלץ)</option><option value="0" ${!MS.climb ? 'selected' : ''}>קונבנציונלי</option></select></label>
        </div>
      </div>
      <div>${svg}</div>
    </div>
    ${tooBig ? `<div class="alert warn">הכלי גדול מדי: קוטר הכלי חייב להיות קטן מקוטר הקידוח D1 = ${f3(b.D1)}.</div>` : warnBig ? `<div class="alert warn">הכלי גדול מ-70% מקוטר הקידוח, ויש סיכון לחיתוך יתר. מומלץ Ø${f2(b.D1 * 0.65)} או פחות.</div>` : '<div class="alert ok">יחס קוטר הכלי לחור תקין.</div>'}
    <div class="kpis">
      <div class="kpi"><small>רדיוס מסלול מרכז הכלי</small><b>R${f3(R)}</b></div>
      <div class="kpi"><small>קוטר יעד (עומק מלא)</small><b>Ø${f3(target)}</b></div>
      <div class="kpi"><small>סיבובים S</small><b>${n}</b></div>
      <div class="kpi"><small>הזנה מתוקנת (מרכז)</small><b>F${vfC}</b></div>
      <div class="kpi"><small>הזנה בשפת הכלי</small><b>${Math.round(vfEdge)} מ"מ/דק'</b></div>
      <div class="kpi"><small>סיבובי סליל</small><b>${turns}</b></div>
      <div class="kpi"><small>פקודה</small><b>${arc}</b></div>
      <div class="kpi"><small>כיוון Z</small><b>${up ? 'למעלה ↑' : 'למטה ↓'}</b></div>
    </div>
    <div class="code-head"><b>תוכנית כרסום סלילי (פאנוק / Haas)</b><button type="button" class="btn ghost" data-copy="gmill">העתק</button></div>
    <pre class="code" id="gmill">${code}</pre>
    <p class="muted small">המסלול מתוכנת למרכז הכלי בלי תיקון רדיוס (G41/G42). מרכז ההברגה ב-X0 Y0 ופני החלק ב-Z0. בדקו בסימולציה לפני הרצה.</p>`;
  $('#millSide').addEventListener('click', (e) => { const bt = e.target.closest('button'); if (bt) { MS.side = bt.dataset.v; MS.tool = 0; renderMill(); } });
  const bind = (id, key, fn = parseFloat) => $(id).addEventListener('change', (e) => { const v = fn(e.target.value); if (v > 0 || key === 'climb') { MS[key] = v; renderMill(); } });
  bind('#mTool', 'tool'); bind('#mZ', 'z', (v) => parseInt(v, 10)); bind('#mVc', 'vc'); bind('#mFz', 'fz'); bind('#mL', 'L');
  $('#mClimb').addEventListener('change', (e) => { MS.climb = e.target.value === '1'; renderMill(); });
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const txt = $('#' + b.dataset.copy).textContent;
  navigator.clipboard?.writeText(txt).then(() => { const o = b.textContent; b.textContent = 'הועתק ✓'; setTimeout(() => (b.textContent = o), 1400); }).catch(() => {});
});

/* =========================================================
   זיהוי לפי מדידה
   ========================================================= */
let part = 'ext';
$('#partSeg').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  part = b.dataset.v; $$('#partSeg button').forEach((x) => x.classList.toggle('on', x === b));
  $('#diaLabel').textContent = part === 'ext' ? 'קוטר חיצוני שנמדד' : 'קוטר החור (פנימי) שנמדד';
  identify();
});
function identify() {
  const dv = parseFloat($('#mDia').value);
  const dia = dv > 0 ? ($('#mDiaUnit').value === 'in' ? dv * IN : dv) : null;
  const pv = parseFloat($('#mPitch').value);
  const P = pv > 0 ? ($('#mPitchUnit').value === 'tpi' ? IN / pv : pv) : null;
  const shape = $('#mShape').value;
  $('#pitchConv').textContent = P ? ($('#mPitchUnit').value === 'tpi' ? `= ${trim(P, 3)} מ"מ` : `= ${trim(IN / P, 2)} TPI`) : '';
  const box = $('#idResults');
  if (!dia) { box.innerHTML = '<div class="notice">הזינו קוטר (ופסיעה אם ידועה) כדי לקבל התאמות.</div>'; return; }
  const scored = threads.filter((t) => shape === 'any' || families[t.family].kind === shape).map((t) => {
    const b = TM.basic(t);
    const ref = part === 'ext' ? t.d : b.D1;
    let dErr = (dia - ref) / ref; const raw = dErr;
    if (part === 'ext' && dErr < 0) dErr *= 0.7;
    const pErr = P ? Math.abs(P - t.P) / t.P : 0;
    return { t, ref, dErr: raw, pErr, score: Math.abs(dErr) * 100 + pErr * 160 };
  }).filter((r) => Math.abs(r.dErr) < 0.08 && (!P || r.pErr < 0.08)).sort((a, b) => a.score - b.score).slice(0, 8);
  if (!scored.length) { box.innerHTML = '<div class="notice">לא נמצאה הברגה סטנדרטית קרובה. בדקו את המדידה, או פתחו הברגה מיוחדת מעמוד הטבלאות.</div>'; return; }
  box.innerHTML = scored.map((r, i) => {
    const f = families[r.t.family];
    const ok = Math.abs(r.dErr) < 0.02 && r.pErr < 0.015, mid = Math.abs(r.dErr) < 0.045 && r.pErr < 0.04;
    const dd = r.dErr * r.ref;
    return `<div class="match${i === 0 && ok ? ' best' : ''}" data-i="${threads.indexOf(r.t)}" tabindex="0">
      <div class="rank">${i + 1}</div>
      <div><h3><span class="tname">${esc(r.t.full)}</span> <span class="tag${f.kind === 'taper' ? ' taper' : ''}">${f.label}</span></h3>
        <div class="meta"><span>${part === 'ext' ? 'קוטר' : 'קוטר חור'}: <b class="num">${f2(r.ref)}</b> <bdi dir="ltr">(${dd >= 0 ? '+' : '−'}${f2(Math.abs(dd))})</bdi></span><span>פסיעה: <b class="num">${trim(r.t.P, 3)}</b>${r.t.tpi ? ` · ${r.t.tpi} TPI` : ''}</span><span>${f.angle}°</span></div>
      </div>
      <span class="badge ${ok ? 'good' : mid ? 'ok' : 'far'}">${ok ? 'התאמה גבוהה' : mid ? 'התאמה סבירה' : 'רחוק'}</span>
    </div>`;
  }).join('');
}
['#mDia', '#mDiaUnit', '#mPitch', '#mPitchUnit', '#mShape'].forEach((s) => $(s).addEventListener('input', identify));
const openMatch = (e) => { const m = e.target.closest('.match'); if (m) location.hash = `#t/${m.dataset.i}`; };
$('#idResults').addEventListener('click', openMatch);
$('#idResults').addEventListener('keydown', (e) => { if (e.key === 'Enter') openMatch(e); });

/* =========================================================
   ניתוב
   ========================================================= */
function route() {
  const h = location.hash.slice(1) || 'tables';
  let view = h;
  if (h.startsWith('t/')) {
    const t = threads[parseInt(h.slice(2), 10)];
    if (t) { view = 'detail'; showView(view); if (D.t !== t) openThread(t); return; }
    view = 'tables';
  } else if (h.startsWith('c/')) {
    const [, d, P] = h.split('/');
    const dd = parseFloat(d), pp = parseFloat(P);
    if (dd > 0 && pp > 0) { showView('detail'); if (!D.t || D.t.d !== dd || D.t.P !== pp) openThread(customThread(dd, pp)); return; }
    view = 'tables';
  }
  if (!['tables', 'identify', 'guide'].includes(view)) view = 'tables';
  document.title = 'מאתר הברגות';
  showView(view);
}
function showView(v) {
  $$('.view').forEach((el) => el.classList.toggle('on', el.id === `view-${v}`));
  $$('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === v || (v === 'detail' && a.dataset.nav === 'tables')));
  window.scrollTo({ top: 0 });
}
window.addEventListener('hashchange', route);

renderFamTabs(); renderClsSel(); renderTable(); identify();
route();
