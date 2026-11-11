(function () {
  const { threads, families, drillInch, IN } = window.THREAD_DATA;
  const $ = (s) => document.querySelector(s);
  const fmt = (n, dp = 2) => (Math.round(n * 10 ** dp) / 10 ** dp).toString();
  const mmIn = (mm) => `${fmt(mm, 3)} מ"מ <span class="sub">(${fmt(mm / IN, 4)}")</span>`;

  // ---------- חישובי מידות ----------
  function dims(t) {
    const f = families[t.family];
    const P = t.P, d = t.d;
    const out = { angle: f.angle };
    if (f.profile === 'whit') {
      out.h = 0.640327 * P;
      out.d2 = d - 0.640327 * P;
      out.d1 = d - 1.280654 * P;
      out.D1 = out.d1;
    } else if (f.profile === 'npt') {
      out.h = 0.8 * P;
      out.d2 = null;
      out.d1 = d - 1.6 * P;
      out.D1 = out.d1;
    } else {
      out.h = 0.613435 * P;         // עומק הברגה חיצונית
      out.d2 = d - 0.649519 * P;   // קוטר צד (פסיעה)
      out.d1 = d - 1.226869 * P;   // קוטר פנימי בורג
      out.D1 = d - 1.082532 * P;   // קוטר פנימי אום
    }
    if (t.drill) out.drill = t.drill;
    else if (t.drillName) {
      const nm = t.drillName;
      let inch = drillInch[nm];
      if (inch == null) inch = fracToInch(nm);
      out.drill = inch * IN;
      out.drillLabel = nm.startsWith('#') ? `מקדח ${nm}` : /^[A-Z]$/.test(nm) ? `מקדח אות ${nm}` : `${nm}"`;
    } else out.drill = d - P;
    return out;
  }
  function fracToInch(s) {
    let whole = 0, frac = s;
    if (s.includes('-')) { const [w, f] = s.split('-'); whole = +w; frac = f; }
    if (!frac.includes('/')) return +s;
    const [a, b] = frac.split('/').map(Number);
    return whole + a / b;
  }

  // ---------- חיפוש ----------
  const norm = (s) => s.toLowerCase()
    .replace(/[״"”'׳]/g, '"').replace(/["]/g, '')
    .replace(/[×*]/g, 'x').replace(/\s+/g, '')
    .replace(/^#?no\.?/, '#').replace(/,/g, '.');

  let activeFam = 'all';
  const famOrder = ['all', ...Object.keys(families)];
  const chips = $('#chips');
  famOrder.forEach((k) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (k === 'all' ? ' on' : '');
    b.textContent = k === 'all' ? 'הכל' : families[k].label;
    b.dataset.f = k;
    b.onclick = () => { activeFam = k; chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b)); renderSearch(); };
    chips.appendChild(b);
  });

  function matches(t, q) {
    if (!q) return true;
    const n = norm(t.full);
    if (n.includes(q) && !/^\d/.test(q)) return true;
    if (t.aliases.some(a => a && norm(a).startsWith(q))) return true;
    // מספר בודד → קוטר במ"מ
    if (/^\d+(\.\d+)?$/.test(q)) {
      const v = parseFloat(q);
      if (Math.abs(t.d - v) <= Math.max(0.3, v * 0.03)) return true;
    }
    return false;
  }

  function renderSearch() {
    const q = norm($('#q').value.trim());
    const list = threads.filter(t => (activeFam === 'all' || t.family === activeFam) && matches(t, q));
    $('#count').textContent = `${list.length} הברגות`;
    const rows = $('#rows');
    if (!list.length) { rows.innerHTML = `<tr><td colspan="6" class="empty">לא נמצאו הברגות. נסו "M12", "3/8" או מספר בלבד (קוטר במ"מ).</td></tr>`; return; }
    rows.innerHTML = list.slice(0, 300).map((t) => {
      const f = families[t.family], dm = dims(t);
      return `<tr tabindex="0" data-i="${threads.indexOf(t)}">
        <td><bdi dir="ltr" class="tname">${t.name}</bdi></td>
        <td><span class="tag${f.kind === 'taper' ? ' taper' : ''}">${f.label}</span></td>
        <td class="n">${fmt(t.d, 3)}</td>
        <td class="n">${fmt(t.P, 3)}</td>
        <td class="n">${t.tpi ?? '—'}</td>
        <td class="n">${fmt(dm.drill, 2)}${dm.drillLabel ? ` <span class="sub">${dm.drillLabel}</span>` : ''}</td>
      </tr>`;
    }).join('');
  }
  $('#q').addEventListener('input', renderSearch);
  $('#rows').addEventListener('click', (e) => { const tr = e.target.closest('tr[data-i]'); if (tr) openDetail(threads[+tr.dataset.i]); });
  $('#rows').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const tr = e.target.closest('tr[data-i]'); if (tr) openDetail(threads[+tr.dataset.i]); } });

  // ---------- חלון פרטים ----------
  function profileSVG(angle, taper) {
    const W = 560, H = 150, pitchPx = 80, depth = 0.6 * pitchPx / Math.tan((angle / 2) * Math.PI / 180) * 0.5;
    const top = 40, bot = top + depth;
    const half = Math.tan((angle / 2) * Math.PI / 180) * depth; // חצי רוחב שן בבסיס
    const flat = (pitchPx - 2 * half) / 2;
    let pts = [], x = 20;
    pts.push(`${x},${H - 10}`);
    pts.push(`${x},${bot}`);
    while (x + pitchPx <= W - 40) {
      pts.push(`${x + flat / 2},${bot}`);
      pts.push(`${x + flat / 2 + half},${top}`);
      pts.push(`${x + flat * 1.5 + half},${top}`);
      pts.push(`${x + flat * 1.5 + 2 * half},${bot}`);
      x += pitchPx;
    }
    pts.push(`${x},${bot}`, `${x},${H - 10}`);
    const x0 = 20 + flat / 2 + half + flat / 2, x1 = x0 + pitchPx;
    const ax = 20 + pitchPx + flat / 2;
    return `<svg class="profile" viewBox="0 0 ${W} ${H}" role="img" aria-label="שרטוט פרופיל הברגה">
      <polygon class="metal" points="${pts.join(' ')}"/>
      <line class="dim" x1="${x0}" y1="22" x2="${x1}" y2="22"/>
      <line class="dim" x1="${x0}" y1="16" x2="${x0}" y2="${top}"/><line class="dim" x1="${x1}" y1="16" x2="${x1}" y2="${top}"/>
      <text x="${(x0 + x1) / 2}" y="16" text-anchor="middle">P</text>
      <line class="axis" x1="${ax + half + flat / 2}" y1="${top - 6}" x2="${ax + half + flat / 2}" y2="${bot + 6}"/>
      <text x="${ax + half + flat / 2 + 6}" y="${bot + 22}">${angle}°</text>
      <line class="dim" x1="${x + 12}" y1="${top}" x2="${x + 12}" y2="${bot}"/>
      <text x="${x + 18}" y="${(top + bot) / 2 + 4}">h</text>
      ${taper ? `<text x="20" y="${H - 16}">קונית 1:16</text>` : ''}
    </svg>`;
  }

  function openDetail(t) {
    const f = families[t.family], dm = dims(t);
    $('#dTitle').textContent = t.full;
    const items = [
      ['משפחה', f.label], ['תקן', f.std],
      ['קוטר חיצוני (נומינלי)', mmIn(t.d)],
      ['פסיעה', `${fmt(t.P, 4)} מ"מ`],
      ['כרכים לאינץ\' (TPI)', t.tpi ? t.tpi : fmt(IN / t.P, 2)],
      ['זווית פרופיל', `${f.angle}°`],
      ['עומק הברגה', `${fmt(dm.h, 3)} מ"מ`],
    ];
    if (dm.d2) items.push(['קוטר צד (d2)', `${fmt(dm.d2, 3)} מ"מ`]);
    items.push([f.profile === 'npt' ? 'קוטר פנימי משוער' : 'קוטר פנימי בורג (d3)', `${fmt(dm.d1, 3)} מ"מ`]);
    if (f.profile === 'iso') items.push(['קוטר פנימי אום (D1)', `${fmt(dm.D1, 3)} מ"מ`]);
    items.push(['מקדח הברזה', `${fmt(dm.drill, 2)} מ"מ${dm.drillLabel ? ` <span class="sub">(${dm.drillLabel})</span>` : ''}`]);
    items.push(['צורה', f.kind === 'taper' ? 'קונית 1:16 (1°47′)' : 'ישרה']);
    const notes = {
      g: 'הברגה ישרה — האטימה בשייבה, אורינג או משטח. מתחברת לנקבה G או Rp.',
      r: 'הברגה קונית — האטימה בהברגה עצמה (טפלון/דבק). זכר R, נקבה Rc (קונית) או Rp (ישרה). הקוטר נמדד במישור המדידה.',
      npt: 'הברגה קונית אמריקאית בזווית 60°. אינה תואמת ל-BSP למרות דמיון במידות. הקוטר הוא קוטר הצינור החיצוני.',
      unc: 'הברגה אמריקאית גסה. מקדח ההברזה הוא המקדח המקובל (~75% הברגה).',
      unf: 'הברגה אמריקאית עדינה. מקדח ההברזה הוא המקדח המקובל (~75% הברגה).',
      mc: 'מקדח הברזה = קוטר פחות פסיעה.', mf: 'מקדח הברזה = קוטר פחות פסיעה.'
    };
    $('#dBody').innerHTML = `<dl class="kv">${items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      ${profileSVG(f.angle, f.kind === 'taper')}
      <p class="note">${notes[t.family] || ''}</p>`;
    $('#detail').showModal();
  }
  $('#detail').addEventListener('click', (e) => { if (e.target === $('#detail')) $('#detail').close(); });

  // ---------- זיהוי ----------
  let part = 'ext';
  $('#partSeg').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    part = b.dataset.v;
    $('#partSeg').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('#diaLabel').textContent = part === 'ext' ? 'קוטר חיצוני שנמדד' : 'קוטר החור (פנימי) שנמדד';
    $('#mDia').placeholder = part === 'ext' ? 'למשל 7.9' : 'למשל 6.8';
    identify();
  });

  function readPitch(valEl, unitEl) {
    const v = parseFloat(valEl.value);
    if (!(v > 0)) return null;
    return unitEl.value === 'tpi' ? IN / v : v;
  }

  function identify() {
    const dv = parseFloat($('#mDia').value);
    const dia = dv > 0 ? ($('#mDiaUnit').value === 'in' ? dv * IN : dv) : null;
    const P = readPitch($('#mPitch'), $('#mPitchUnit'));
    const shape = $('#mShape').value;
    const conv = $('#pitchConv');
    if (P) conv.textContent = $('#mPitchUnit').value === 'tpi' ? `= ${fmt(P, 3)} מ"מ פסיעה` : `= ${fmt(IN / P, 2)} TPI`;
    else conv.textContent = '';

    const box = $('#idResults');
    if (!dia) { box.innerHTML = `<div class="notice">הזינו קוטר (ופסיעה אם ידועה) כדי לקבל התאמות.</div>`; return; }

    const scored = threads
      .filter(t => shape === 'any' || families[t.family].kind === shape)
      .map(t => {
        const dm = dims(t);
        const ref = part === 'ext' ? t.d : (families[t.family].profile === 'iso' ? dm.D1 : dm.d1);
        // בורג שחוק נמדד מעט פחות מהנומינלי — מעט סלחנות כלפי מטה
        let dErr = (dia - ref) / ref;
        if (part === 'ext' && dErr < 0) dErr *= 0.7;
        const pErr = P ? Math.abs(P - t.P) / t.P : 0;
        const score = Math.abs(dErr) * 100 + pErr * 160;
        return { t, ref, dErr: (dia - ref) / ref, pErr, score, absD: dia - ref };
      })
      .filter(r => Math.abs(r.dErr) < 0.08 && (!P || r.pErr < 0.08))
      .sort((a, b) => a.score - b.score)
      .slice(0, 8);

    if (!scored.length) {
      box.innerHTML = `<div class="notice">לא נמצאה הברגה סטנדרטית קרובה. בדקו את המדידה — ייתכן שמדובר בהברגה מיוחדת (טרפזית, אופניים, צילינדר וכו').</div>`;
      return;
    }
    box.innerHTML = scored.map((r, i) => {
      const f = families[r.t.family];
      const ok = Math.abs(r.dErr) < 0.02 && r.pErr < 0.015;
      const mid = Math.abs(r.dErr) < 0.045 && r.pErr < 0.04;
      const badge = ok ? '<span class="badge good">התאמה גבוהה</span>' : mid ? '<span class="badge ok">התאמה סבירה</span>' : '<span class="badge far">רחוק</span>';
      const sign = r.absD >= 0 ? '+' : '−';
      return `<div class="match${i === 0 && ok ? ' best' : ''}" data-i="${threads.indexOf(r.t)}" tabindex="0">
        <div class="rank">${i + 1}</div>
        <div>
          <h3><bdi dir="ltr" class="tname">${r.t.full}</bdi> <span class="tag${f.kind === 'taper' ? ' taper' : ''}">${f.label}</span></h3>
          <div class="meta">
            <span>${part === 'ext' ? 'קוטר' : 'קוטר חור'}: <b class="num">${fmt(r.ref, 2)}</b> מ"מ <bdi dir="ltr" class="dev">(${sign}${fmt(Math.abs(r.absD), 2)})</bdi></span>
            <span>פסיעה: <b class="num">${fmt(r.t.P, 3)}</b> מ"מ${r.t.tpi ? ` · ${r.t.tpi} TPI` : ''}</span>
            <span>זווית ${f.angle}°</span>
          </div>
        </div>
        ${badge}
      </div>`;
    }).join('') + (P ? '' : `<div class="notice">ללא פסיעה ההתאמה לפי קוטר בלבד — הוסיפו פסיעה לדיוק.</div>`);
  }
  ['#mDia', '#mDiaUnit', '#mPitch', '#mPitchUnit', '#mShape'].forEach(s => $(s).addEventListener('input', identify));
  $('#idResults').addEventListener('click', (e) => { const m = e.target.closest('.match'); if (m) openDetail(threads[+m.dataset.i]); });
  $('#idResults').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const m = e.target.closest('.match'); if (m) openDetail(threads[+m.dataset.i]); } });

  function countHelper() {
    const n = parseFloat($('#cTurns').value), L = parseFloat($('#cLen').value);
    const o = $('#cOut');
    if (n > 0 && L > 0) {
      // n פסגות = n-1 פסיעות
      const P = L / Math.max(1, n - 1);
      o.innerHTML = `<span class="num">${fmt(P, 3)}</span> מ"מ · <span class="num">${fmt(IN / P, 1)}</span> TPI <button type="button" class="chip" id="usePitch">השתמש</button>`;
      $('#usePitch').onclick = () => { $('#mPitch').value = fmt(P, 3); $('#mPitchUnit').value = 'mm'; identify(); };
    } else o.textContent = '—';
  }
  ['#cTurns', '#cLen'].forEach(s => $(s).addEventListener('input', countHelper));

  // ---------- מחשבון ----------
  function calc() {
    const dv = parseFloat($('#kD').value);
    const d = dv > 0 ? ($('#kDUnit').value === 'in' ? dv * IN : dv) : null;
    const P = readPitch($('#kP'), $('#kPUnit'));
    const pct = Math.min(100, Math.max(50, parseFloat($('#kPct').value) || 75));
    const out = $('#calcOut');
    if (!d || !P) { out.innerHTML = '<p class="muted">הזינו קוטר ופסיעה.</p>'; return; }
    const H = 0.866025 * P;
    const d2 = d - 0.649519 * P, d3 = d - 1.226869 * P, D1 = d - 1.082532 * P;
    const drill = d - 1.299038 * P * (pct / 100); // 100% = 2×0.6495P (נוסחה מקובלת)
    const near = threads.filter(t => families[t.family].profile === 'iso' && Math.abs(t.d - d) < 0.05 && Math.abs(t.P - P) / P < 0.01);
    const rows = [
      ['גובה משולש יסוד H', H], ['קוטר צד d2 / D2', d2], ['קוטר פנימי בורג d3', d3],
      ['קוטר פנימי אום D1', D1], ['עומק הברגה חיצונית', 0.613435 * P], ['עומק מגע', 0.541266 * P],
      [`מקדח הברזה (${pct}%)`, drill], ['מקדח מעבר (בינוני)', d * 1.1]
    ];
    out.innerHTML = `<h2>תוצאות <span class="num">Ø${fmt(d, 3)} × ${fmt(P, 3)}</span></h2>
      <p class="muted">${fmt(IN / P, 2)} TPI · ${near.length ? `תואם לתקן: <b>${near.map(t => t.full).join(', ')}</b>` : 'לא נמצא בטבלת התקנים'}</p>
      <dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${mmIn(v)}</dd></div>`).join('')}</dl>
      ${profileSVG(60, false)}
      <p class="note">נוסחאות לפי ISO 68-1 (פרופיל בסיסי, ללא סבולות). מקדח מעבר לפי ISO 273 בקירוב.</p>`;
  }
  ['#kD', '#kDUnit', '#kP', '#kPUnit', '#kPct'].forEach(s => $(s).addEventListener('input', calc));

  // ---------- לשוניות ----------
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(b => { const on = b.dataset.tab === name; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    try { history.replaceState(null, '', '#' + name); } catch (e) {}
  }
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  const h = location.hash.slice(1);
  if (['search', 'identify', 'calc', 'guide'].includes(h)) showTab(h);

  // ---------- ערכת צבעים ----------
  const root = document.documentElement;
  try { const s = localStorage.getItem('tf-theme'); if (s) root.dataset.theme = s; } catch (e) {}
  $('#themeBtn').addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('tf-theme', root.dataset.theme); } catch (e) {}
  });

  renderSearch(); identify(); calc();
})();
