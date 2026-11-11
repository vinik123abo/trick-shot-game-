/* מודל תלת-ממדי אינטראקטיבי של בורג / אום / הרכבה.
 * הסליל נבנה מפונקציית הפרופיל האמיתית של ההברגה, כך שהחתך מראה את הצורה המדויקת.
 */
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const TAU = Math.PI * 2;

export function createViewer(container, { onPick, onHover }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  camera.position.set(4.2, 2.2, 5.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.2;
  controls.minDistance = 1.5; controls.maxDistance = 14;
  controls.addEventListener('start', () => { controls.autoRotate = false; });

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd9b0, 0.6); rim.position.set(-4, 2, -3); scene.add(rim);

  const mats = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc9ced6, metalness: 0.92, roughness: 0.28, side: THREE.DoubleSide }),
    steelFlat: new THREE.MeshStandardMaterial({ color: 0xc2c7cf, metalness: 0.9, roughness: 0.32, side: THREE.DoubleSide, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd8a54a, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }),
    brassFlat: new THREE.MeshStandardMaterial({ color: 0xcf9c40, metalness: 0.88, roughness: 0.34, side: THREE.DoubleSide, flatShading: true }),
    cut: new THREE.MeshStandardMaterial({ color: 0x56606e, metalness: 0.2, roughness: 0.55, side: THREE.DoubleSide }),
    cutNut: new THREE.MeshStandardMaterial({ color: 0x8a6526, metalness: 0.2, roughness: 0.55, side: THREE.DoubleSide }),
  };

  const world = new THREE.Group(); scene.add(world);
  const overlay = new THREE.Group(); scene.add(overlay);
  let state = null; // { prof, parts, scale, ... }
  let anim = null;

  /* ---------- בניית גיאומטריה ---------- */
  const P3 = (r, th, z) => [r * Math.cos(th), z, -r * Math.sin(th)];

  function gridMesh(nTh, nZ, fn, mat, userData) {
    // fn(i, j) -> [x,y,z]
    const pos = new Float32Array((nTh + 1) * (nZ + 1) * 3);
    let k = 0;
    for (let j = 0; j <= nZ; j++) for (let i = 0; i <= nTh; i++) { const p = fn(i, j); pos[k++] = p[0]; pos[k++] = p[1]; pos[k++] = p[2]; }
    const idx = [];
    const W = nTh + 1;
    for (let j = 0; j < nZ; j++) for (let i = 0; i < nTh; i++) {
      const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.userData = userData || {};
    return m;
  }

  /* חלק סיבובי: מקטעים לאורך הציר, כל אחד עם רדיוס חיצוני ופנימי (פונקציות של z,θ) */
  function revolvedPart(segs, thMax, mat, matFlat, matCut, tag) {
    const g = new THREE.Group();
    const full = thMax >= TAU - 1e-6;
    const nTh = Math.round(144 * thMax / TAU);
    const th = (i) => i / nTh * thMax;
    segs.forEach((s, si) => {
      const z = (j) => s.z0 + (s.z1 - s.z0) * j / s.nz;
      g.add(gridMesh(nTh, s.nz, (i, j) => P3(s.rOut(z(j), th(i)), th(i), z(j)), s.flatOut ? matFlat : mat, { tag, kind: s.kindOut || 'outer' }));
      if (s.rIn) g.add(gridMesh(nTh, s.nz, (i, j) => P3(s.rIn(z(j), th(i)), th(i), z(j)), s.flatIn ? matFlat : mat, { tag, kind: s.kindIn || 'inner' }));
      const rIn = s.rIn || (() => 0);
      // מכסים בקצוות / מעבר בין מקטעים
      const ring = (zz, rA, rB) => g.add(gridMesh(nTh, 1, (i, j) => P3(j ? rB(zz, th(i)) : rA(zz, th(i)), th(i), zz), mat, { tag, kind: 'face' }));
      if (si === 0) ring(s.z0, rIn, s.rOut);
      if (si === segs.length - 1) ring(s.z1, rIn, s.rOut);
      else { const n = segs[si + 1]; ring(s.z1, s.rOut, n.rOut); }
      // משטחי חתך
      if (!full) for (const tc of [0, thMax]) {
        g.add(gridMesh(1, s.nz, (i, j) => P3(i ? s.rOut(z(j), tc) : rIn(z(j), tc), tc, z(j)), matCut, { tag, kind: 'cut' }));
      }
    });
    return g;
  }

  const hexR = (af) => (th) => { // רדיוס משושה (af = מפתח, מ"מ) — פינות ב-0°,60°...
    const a = ((th % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6;
    return (af / 2) / Math.cos(a);
  };

  const nutLenOf = (d, P, Lt) => Math.min(Lt * 0.55, Math.max(0.8 * d, 5 * P));
  function build(prof, opts) {
    // ניקוי
    for (const g of [world, overlay]) while (g.children.length) { const c = g.children.pop(); c.traverse?.(o => o.geometry?.dispose()); }
    if (anim) anim = null;
    const b = prof.basic, P = b.P, d = b.d;
    const pipe = opts.pipe, taper = b.taper;
    const turns = Math.min(34, Math.max(6, Math.round(1.5 * d / P)));
    const Lt = turns * P;
    const headLen = pipe ? 0.45 * d : 0.65 * d;
    const total = opts.view === 'nut' ? Math.max(nutLenOf(d, P, Lt), 1.6 * d) : Lt + headLen;
    const scale = 3.1 / Math.max(total, 1.7 * d);
    const taperK = taper ? 1 / 32 : 0;
    const zMid = Lt / 2;
    const uOf = (z, th) => z / P - th / TAU;
    const tipCh = (z, r, rMin) => Math.min(r, rMin * 0.985 + (Lt - z) * 1.0);
    const rExt = (z, th) => {
      const tp = taperK * (zMid - z);
      return tipCh(z, prof.rExt(uOf(z, th)) + tp, prof.ext.rMin + tp);
    };
    const clr = Math.max(0.04 * (b.hExt), 0.004 * d); // מרווח חזותי בין בורג לאום
    const nutLen = nutLenOf(d, P, Lt);
    const nutTurns = Math.round(nutLen / P);
    const NL = nutTurns * P;

    const parts = {};
    const thBolt = opts.view === 'bolt' && opts.section ? Math.PI * 1.5 : TAU;
    if (opts.view === 'bolt' || opts.view === 'assembly') {
      const segs = [];
      if (pipe) {
        const bore = (prof.ext.rMin) * 0.72;
        const rPipe = prof.ext.rMaj + taperK * zMid;
        segs.push({ z0: -0.45 * d, z1: 0, nz: 2, rOut: () => rPipe, rIn: () => bore });
        segs.push({ z0: 0, z1: Lt, nz: turns * 22, rOut: rExt, rIn: () => bore, kindOut: 'thread' });
      } else {
        const af = Math.round(d * 1.55 * 2) / 2;
        const H = 0.65 * d;
        const hx = hexR(af);
        segs.push({ z0: -H, z1: -H * 0.08, nz: 1, rOut: (z, th) => hx(th), flatOut: true, kindOut: 'head' });
        segs.push({ z0: -H * 0.08, z1: 0, nz: 1, rOut: () => af / 2 * 0.97, kindOut: 'head' });
        segs.push({ z0: 0, z1: Lt, nz: turns * 22, rOut: rExt, kindOut: 'thread' });
      }
      const bolt = revolvedPart(segs, thBolt, mats.steel, mats.steelFlat, mats.cut, 'bolt');
      parts.bolt = bolt; world.add(bolt);
    }
    if (opts.view === 'nut' || opts.view === 'assembly') {
      const thNut = opts.section || opts.view === 'assembly' ? Math.PI * 1.5 : TAU;
      const z0 = 0;
      const af = Math.round(d * 1.6 * 2) / 2;
      const rIn = (z, th) => prof.rInt(uOf(z, th)) + clr + taperK * (zMid - z);
      const outer = pipe ? (() => prof.int.rMaj * 1.28 + taperK * zMid) : hexR(af);
      const segs = [{ z0, z1: z0 + NL, nz: nutTurns * 22, rOut: (z, th) => outer(th), rIn, flatOut: !pipe, kindIn: 'thread', kindOut: 'body' }];
      const nut = new THREE.Group();
      nut.add(revolvedPart(segs, thNut, mats.brass, mats.brassFlat, mats.cutNut, 'nut'));
      parts.nut = nut; world.add(nut);
    }
    world.scale.setScalar(scale);
    overlay.scale.setScalar(scale);
    const yOff = -(opts.view === 'nut' ? NL / 2 : Lt / 2 - (pipe ? 0.2 * d : 0.3 * d)) * scale;
    world.position.y = yOff; overlay.position.y = yOff;
    state = { prof, parts, scale, Lt, NL, turns, nutTurns, P, opts, taperK, zMid, clr, uOf };
    if (opts.view === 'assembly') startAssembly();
    highlight(opts.param);
  }

  function startAssembly() {
    const nut = state.parts.nut;
    const maxShift = state.Lt - state.NL; // כמה סיבובים אפשר להבריג
    anim = { t: 0, maxT: Math.floor(maxShift / state.P) };
    anim.update = (dt) => {
      if (!anim.playing) return;
      anim.t += dt * 0.9;
      const cycle = anim.maxT * 2;
      let tt = anim.t % cycle; if (tt > anim.maxT) tt = cycle - tt; // הלוך-חזור
      nut.position.y = tt * state.P;
      nut.rotation.y = tt * TAU; // הברגה ימנית: סיבוב + התקדמות של פסיעה לכל סיבוב
    };
    anim.playing = true;
  }

  /* ---------- הדגשת פרמטר ---------- */
  const acc = new THREE.Color('#ff7a1a');
  function ghostCyl(r, z0, z1, through) {
    const g = new THREE.CylinderGeometry(r, r, z1 - z0, 96, 1, true);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: acc, transparent: true, opacity: through ? 0.32 : 0.22, depthWrite: false, depthTest: !through, side: THREE.DoubleSide }));
    m.position.y = (z0 + z1) / 2; m.renderOrder = 5;
    overlay.add(m);
    for (const z of [z0, z1]) {
      const c = new THREE.EllipseCurve(0, 0, r, r).getPoints(96);
      const lg = new THREE.BufferGeometry().setFromPoints(c.map(p => new THREE.Vector3(p.x, z, p.y)));
      const l = new THREE.LineLoop(lg, new THREE.LineBasicMaterial({ color: acc, depthTest: false, transparent: true }));
      l.renderOrder = 6; overlay.add(l);
    }
    // קו קוטר מעל הקצה
    const y = z1 + (z1 - z0) * 0.04;
    const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-r, y, 0), new THREE.Vector3(r, y, 0)]);
    const l = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: acc, depthTest: false, transparent: true }));
    l.renderOrder = 7; overlay.add(l);
    for (const sx of [-1, 1]) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.05, r * 0.14, 12), new THREE.MeshBasicMaterial({ color: acc, depthTest: false, transparent: true }));
      cone.rotation.z = sx * Math.PI / 2; cone.position.set(sx * (r - r * 0.07), y, 0); cone.renderOrder = 7; overlay.add(cone);
    }
    return new THREE.Vector3(0, y, 0);
  }
  function helixTube(r, z0, turns) {
    const pts = [];
    for (let i = 0; i <= 200; i++) { const t = i / 200 * turns; const th = t * TAU; pts.push(new THREE.Vector3(...P3(r, th, z0 + t * state.P))); }
    const curve = new THREE.CatmullRomCurve3(pts);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, state.P * 0.07, 8), new THREE.MeshBasicMaterial({ color: acc, depthTest: false, transparent: true, opacity: 0.95 }));
    m.renderOrder = 8; overlay.add(m);
    for (const p of [pts[0], pts[pts.length - 1]]) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(state.P * 0.16, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
      s.position.copy(p); s.renderOrder = 9; overlay.add(s);
    }
    return pts[pts.length - 1].clone();
  }

  let labelAnchor = null;
  function highlight(param) {
    while (overlay.children.length) { const c = overlay.children.pop(); c.geometry?.dispose(); }
    labelAnchor = null;
    if (!state || !param) return;
    const { prof, Lt, NL, opts } = state;
    const b = prof.basic;
    const side = opts.view === 'nut' ? 'int' : 'ext';
    const isNut = side === 'int';
    const z0 = isNut ? 0 : 0, z1 = isNut ? NL : Lt;
    const r = {
      major: b.d / 2,
      pitchd: b.d2 / 2,
      minor: (isNut ? b.D1 : b.d3) / 2,
    }[param];
    if (r) {
      const through = isNut ? param === 'major' || param === 'pitchd' : param !== 'major';
      labelAnchor = ghostCyl(r + (isNut ? -0.002 : 0.002) * b.d, z0, z1, through);
    } else if (param === 'pitch') {
      const rr = isNut ? b.D1 / 2 : b.d / 2;
      labelAnchor = helixTube(rr * (isNut ? 0.99 : 1.01), (isNut ? 0 : Lt * 0.35), 1);
    } else if (param === 'depth' || param === 'angle') {
      const rr = isNut ? b.D1 / 2 : b.d3 / 2;
      ghostCyl(rr, z0, z1, true);
      labelAnchor = ghostCyl(b.d / 2, z0, z1, false);
    }
  }

  /* ---------- בחירה בעכבר ---------- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev) {
    if (!state) return null;
    const rect = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(world.children, true);
    if (!hits.length) return null;
    const h = hits[0];
    const ud = h.object.userData;
    const p = world.worldToLocal(h.point.clone());
    const rr = Math.hypot(p.x, p.z), z = p.y;
    const b = state.prof.basic;
    const isNut = ud.tag === 'nut';
    if (ud.kind === 'head') return { param: 'drill', where: 'ראש הבורג', point: h.point };
    const tp = state.taperK * (state.zMid - z);
    const rMaj = b.d / 2 + tp + (isNut ? state.clr : 0);
    const rMin = (isNut ? b.D1 : b.d3) / 2 + tp + (isNut ? state.clr : 0);
    const hgt = rMaj - rMin;
    if (isNut && rr > rMaj + hgt * 0.4) return { param: null, where: 'גוף האום', point: h.point };
    if (!isNut && rr < rMin - hgt * 0.4) return { param: 'minor', where: 'ליבת הבורג', point: h.point };
    const f = (rr - rMin) / hgt;
    let param, where;
    if (f > 0.82) { param = 'major'; where = isNut ? 'תחתית שן האום' : 'פסגת השן'; }
    else if (f < 0.18) { param = 'minor'; where = isNut ? 'פסגת שן האום' : 'תחתית השן'; }
    else { param = 'pitchd'; where = 'צלע השן'; }
    return { param, where, side: isNut ? 'int' : 'ext', point: h.point };
  }
  let downAt = null;
  renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const r = pick(e); if (r && r.param) onPick(r);
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const r = pick(e);
    renderer.domElement.style.cursor = r && r.param ? 'pointer' : 'grab';
    onHover && onHover(r, e);
  });
  renderer.domElement.addEventListener('pointerleave', () => onHover && onHover(null));

  /* ---------- לולאה ---------- */
  const clock = new THREE.Clock();
  let labelCb = null;
  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();
  const v = new THREE.Vector3();
  let running = true;
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (anim && anim.update) anim.update(dt);
    controls.update();
    renderer.render(scene, camera);
    if (labelCb) {
      if (labelAnchor) {
        v.copy(labelAnchor); overlay.localToWorld(v); v.project(camera);
        labelCb({ x: (v.x + 1) / 2 * container.clientWidth, y: (1 - v.y) / 2 * container.clientHeight, visible: v.z < 1 });
      } else labelCb(null);
    }
  }
  loop();

  return {
    build,
    highlight: (p) => { if (state) { state.opts.param = p; highlight(p); } },
    setPlaying: (on) => { if (anim) anim.playing = on; },
    isAnimated: () => !!anim,
    resetView: () => { camera.position.set(4.2, 2.2, 5.2); controls.target.set(0, 0, 0); controls.autoRotate = true; },
    onLabel: (cb) => { labelCb = cb; },
    setTheme: (dark) => { renderer.toneMappingExposure = dark ? 1.0 : 1.1; }
  };
}
