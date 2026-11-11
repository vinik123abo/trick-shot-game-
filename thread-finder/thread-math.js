/* חישובי מידות, סבולות ופרופיל הברגה.
 * מטרי: ISO 68-1 (פרופיל בסיס), ISO 965-1 (סבולות, לפי הנוסחאות שבתקן).
 * UN: ASME B1.1 (נוסחאות סבולת לפי מחלקה).
 * צנרת (G/R/NPT): מידות בסיס בלבד.
 */
(function () {
  const { families, drillInch, IN } = window.THREAD_DATA;

  function fracToInch(s) {
    let whole = 0, frac = s;
    if (s.includes('-')) { const [w, f] = s.split('-'); whole = +w; frac = f; }
    if (!frac.includes('/')) return +s;
    const [a, b] = frac.split('/').map(Number);
    return whole + a / b;
  }

  /* מידות בסיס (מ"מ) */
  function basic(t) {
    const f = families[t.family];
    const P = t.P, d = t.d;
    const o = { P, d, angle: f.angle, profile: f.profile };
    if (f.profile === 'whit') {
      o.H = 0.960491 * P;
      o.hExt = o.hInt = 0.640327 * P;
      o.d2 = d - 0.640327 * P;
      o.d3 = o.D1 = d - 1.280654 * P;
      o.crestW = o.rootW = P / 6;          // רוחב "שטוח" שקול (הפסגה מעוגלת r=0.137P)
      o.round = 0.137 * P;
    } else if (f.profile === 'npt') {
      o.H = 0.866025 * P;
      o.hExt = o.hInt = 0.8 * P;
      o.d2 = d - 0.8 * P;
      o.d3 = o.D1 = d - 1.6 * P;
      o.crestW = o.rootW = 0.038 * P;
    } else {
      o.H = 0.866025 * P;
      o.hExt = 0.613435 * P;    // h3
      o.hInt = 0.541266 * P;    // H1
      o.d2 = d - 0.649519 * P;
      o.d3 = d - 1.226869 * P;
      o.D1 = d - 1.082532 * P;
      o.crestW = P / 8;         // פסגת בורג
      o.rootWInt = P / 8;       // תחתית אום
      o.crestWInt = P / 4;      // פסגת אום
      o.rootR = 0.125 * P;      // רדיוס תחתית מינימלי (בורג)
    }
    // מקדח הברזה
    if (t.drill) o.drill = t.drill;
    else if (t.drillName) {
      const nm = t.drillName;
      let inch = drillInch[nm];
      if (inch == null) inch = fracToInch(nm);
      o.drill = inch * IN;
      o.drillLabel = nm.startsWith('#') ? `מקדח ${nm}` : /^[A-Z]$/.test(nm) ? `מקדח אות ${nm}` : `${nm}"`;
    } else o.drill = Math.round((d - P) * 20) / 20;
    o.taper = f.kind === 'taper';
    o.tpi = t.tpi || IN / P;
    return o;
  }

  /* ---------- ISO 965-1 ---------- */
  const RANGES = [0.99, 1.4, 2.8, 5.6, 11.2, 22.4, 45, 90, 180, 355, 600];
  function dMean(d) {
    for (let i = 0; i < RANGES.length - 1; i++) if (d <= RANGES[i + 1]) return Math.sqrt(RANGES[i] * RANGES[i + 1]);
    return Math.sqrt(355 * 600);
  }
  const GK = { 3: 0.5, 4: 0.63, 5: 0.8, 6: 1, 7: 1.25, 8: 1.6, 9: 2 };
  const um = (x) => Math.sign(x) * Math.round(Math.abs(x)); // מיקרון
  // עיגול לסדרת R40 (כפי שנעשה בטבלאות ISO 965)
  const R40 = [1, 1.06, 1.12, 1.18, 1.25, 1.32, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2, 2.12, 2.24, 2.36, 2.5, 2.65, 2.8, 3, 3.15, 3.35, 3.55, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.3, 5.6, 6, 6.3, 6.7, 7.1, 7.5, 8, 8.5, 9, 9.5, 10];
  const r40 = (x) => {
    if (x <= 0) return 0;
    const e = Math.pow(10, Math.floor(Math.log10(x))), m = x / e;
    let best = R40[0];
    for (const v of R40) if (Math.abs(v - m) < Math.abs(best - m)) best = v;
    return Math.round(best * e);
  };

  function isoExt(t, cls) {
    const b = basic(t), P = b.P;
    const grade = +cls[0], letter = cls[1];
    const es = { e: -(50 + 11 * P), f: -(30 + 11 * P), g: -(15 + 11 * P), h: 0 }[letter];
    const Td = r40(GK[grade >= 6 ? (grade >= 8 ? 8 : 6) : 4] * (180 * Math.pow(P, 2 / 3) - 3.15 / Math.sqrt(P)));
    const Td2 = r40(GK[grade] * 90 * Math.pow(P, 0.4) * Math.pow(dMean(b.d), 0.1));
    const esR = um(es);
    return {
      side: 'ext', cls, es: esR, Td, Td2,
      dMax: b.d + esR / 1000, dMin: b.d + (esR - Td) / 1000,
      d2Max: b.d2 + esR / 1000, d2Min: b.d2 + (esR - Td2) / 1000,
      d3Max: b.d3 + esR / 1000, d3Min: null
    };
  }
  function isoInt(t, cls) {
    const b = basic(t), P = b.P;
    const grade = +cls[0], letter = cls[1];
    const EI = um(letter === 'G' ? 15 + 11 * P : 0);
    const Td2_6 = 90 * Math.pow(P, 0.4) * Math.pow(dMean(b.d), 0.1);
    const TD2 = r40(GK[grade] * 1.32 * Td2_6);
    const TD1_6 = P < 1 ? 433 * P - 190 * Math.pow(P, 1.22) : 230 * Math.pow(P, 0.7);
    const TD1 = r40(GK[grade] * TD1_6);
    return {
      side: 'int', cls, EI, TD1, TD2,
      DMin: b.d + EI / 1000, DMax: null,
      D2Min: b.d2 + EI / 1000, D2Max: b.d2 + (EI + TD2) / 1000,
      D1Min: b.D1 + EI / 1000, D1Max: b.D1 + (EI + TD1) / 1000
    };
  }

  /* ---------- ASME B1.1 (UN) ---------- */
  function unTol(t, cls) {
    const b = basic(t);
    const D = b.d / IN, P = b.P / IN, LE = 9 * P;
    const Td2A = 0.0015 * Math.cbrt(D) + 0.0015 * Math.sqrt(LE) + 0.015 * Math.pow(P, 2 / 3);
    const c = +cls[0], side = cls[1] === 'A' ? 'ext' : 'int';
    const mm = (x) => x * IN;
    const d2 = D - 0.649519 * P;
    if (side === 'ext') {
      const tdF = { 1: 1.5, 2: 1, 3: 0.75 }[c];
      const allow = c === 3 ? 0 : 0.3 * Td2A;
      const majT = 0.060 * Math.pow(P, 2 / 3);
      const dMax = D - allow;
      return {
        side, cls, es: -Math.round(mm(allow) * 1000), Td: Math.round(mm(majT) * 1000), Td2: Math.round(mm(Td2A * tdF) * 1000),
        dMax: mm(dMax), dMin: mm(dMax - majT),
        d2Max: mm(d2 - allow), d2Min: mm(d2 - allow - Td2A * tdF),
        d3Max: mm(D - 1.226869 * P - allow), d3Min: null
      };
    }
    const tdF = { 1: 1.95, 2: 1.3, 3: 0.975 }[c];
    const D1 = D - 1.082532 * P;
    let tD1 = D >= 0.25 ? 0.25 * P - 0.4 * P * P : 0.05 * Math.pow(P, 2 / 3) + 0.03 * P / D - 0.002;
    tD1 = Math.min(Math.max(tD1, 0.12 * P), 0.394 * P);
    if (c === 3) tD1 *= 0.75; // קירוב
    return {
      side, cls, EI: 0, TD1: Math.round(mm(tD1) * 1000), TD2: Math.round(mm(Td2A * tdF) * 1000), approxMinor: true,
      DMin: mm(D), DMax: null,
      D2Min: mm(d2), D2Max: mm(d2 + Td2A * tdF),
      D1Min: mm(D1), D1Max: mm(D1 + tD1)
    };
  }

  function classes(t) {
    const f = t.family;
    if (f === 'mc' || f === 'mf' || f === 'custom') return { ext: ['6g', '4h', '6h', '6f', '6e', '8g'], int: ['6H', '5H', '7H', '6G'], def: ['6g', '6H'] };
    if (f === 'unc' || f === 'unf') return { ext: ['2A', '1A', '3A'], int: ['2B', '1B', '3B'], def: ['2A', '2B'] };
    return null;
  }
  function tol(t, cls) {
    if (!cls) return null;
    const f = t.family;
    if (f === 'unc' || f === 'unf') return unTol(t, cls);
    if (/[a-z]$/.test(cls)) return isoExt(t, cls);
    return isoInt(t, cls);
  }

  /* ---------- פרופיל (לשרטוט ולמודל) ----------
   * מחזיר פונקציות רדיוס לפי מרחק t ממרכז פסגת הבורג (ביחידות פסיעה, 0..0.5).
   */
  function profile(t) {
    const b = basic(t);
    const rMaj = b.d / 2;
    let ext, int;
    if (b.profile === 'iso') {
      const rMinE = b.d3 / 2, rMinI = b.D1 / 2;
      const cw = 1 / 16, spanE = (rMaj - rMinE) * Math.tan(Math.PI / 6) / b.P;
      ext = { rMaj, rMin: rMinE, crest: cw, flank: spanE };
      const spanI = (rMaj - rMinI) * Math.tan(Math.PI / 6) / b.P;
      int = { rMaj, rMin: rMinI, root: 1 / 16, flank: spanI };
    } else {
      const half = b.angle / 2 * Math.PI / 180;
      const rMin = b.d3 / 2;
      const span = (rMaj - rMin) * Math.tan(half) / b.P;
      const c = (1 - 2 * span) / 4;
      ext = { rMaj, rMin, crest: c, flank: span };
      int = { rMaj, rMin, root: c, flank: span };
    }
    const round = b.profile === 'whit' ? 0.09 : b.profile === 'iso' ? 0.02 : 0.01;
    function lut(fn) {
      const N = 512, a = new Float32Array(N + 1);
      for (let i = 0; i <= N; i++) a[i] = fn(i / N * 0.5);
      if (round > 0) { // החלקה (עיגול פסגות/תחתיות)
        const k = Math.max(1, Math.round(round / 0.5 * N)), out = new Float32Array(N + 1);
        for (let i = 0; i <= N; i++) {
          let s = 0, n = 0;
          for (let j = -k; j <= k; j++) {
            let idx = i + j; if (idx < 0) idx = -idx; if (idx > N) idx = 2 * N - idx;
            s += a[idx]; n++;
          }
          out[i] = s / n;
        }
        return out;
      }
      return a;
    }
    const extFn = (tt) => {
      const e = ext;
      if (tt <= e.crest) return e.rMaj;
      if (tt <= e.crest + e.flank) return e.rMaj - (tt - e.crest) / e.flank * (e.rMaj - e.rMin);
      return e.rMin;
    };
    const intFn = (tt) => {
      const e = int;
      if (tt <= e.root) return e.rMaj;
      if (tt <= e.root + e.flank) return e.rMaj - (tt - e.root) / e.flank * (e.rMaj - e.rMin);
      return e.rMin;
    };
    const L1 = lut(extFn), L2 = lut(intFn);
    const sample = (L, u) => { // u = מיקום יחסי בפסיעה (כל מספר)
      let f = u - Math.floor(u); const tt = f > 0.5 ? 1 - f : f;
      const x = tt / 0.5 * 512, i = Math.floor(x), fr = x - i;
      return i >= 512 ? L[512] : L[i] * (1 - fr) + L[i + 1] * fr;
    };
    return {
      basic: b, ext, int,
      rExt: (u) => sample(L1, u),
      rInt: (u) => sample(L2, u),
      rawExt: extFn, rawInt: intFn
    };
  }

  /* ---------- חריטה ---------- */
  function turning(t, side, n) {
    const b = basic(t);
    const ap = side === 'ext' ? (b.profile === 'iso' ? 0.6134 * b.P : b.hExt) : (b.profile === 'iso' ? 0.5413 * b.P : b.hInt);
    const passes = n || Math.max(4, Math.round(3 + 2.5 * b.P));
    const rows = [];
    let prev = 0;
    for (let x = 1; x <= passes; x++) {
      const phi = x === 1 ? 0.3 : x - 1;
      const cum = Math.min(ap, ap * Math.sqrt(phi / (passes - 1)));
      rows.push({ x, cum, inc: cum - prev });
      prev = cum;
    }
    rows[rows.length - 1].cum = ap;
    return { ap, passes, rows, flank: b.angle === 55 ? 27 : 29.5 };
  }

  window.TM = { basic, tol, classes, profile, turning, fracToInch };
})();
