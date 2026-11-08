// דייטון – אפקטים ויזואליים: סצנת לב תלת-ממדית, הטיית כרטיסים, פיצוצי לבבות ואנימציות
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

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
  if (b) pop(e.clientX, e.clientY);
});

/* ---------- סמן לשוניות נע ---------- */
function moveInk() {
  const nav = document.querySelector(".tabs");
  const ink = nav && nav.querySelector(".tab-ink");
  const on = nav && nav.querySelector(".tab.on");
  if (!ink || !on) return;
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
  setTimeout(() => document.querySelector(".tabs").scrollIntoView({ behavior: "smooth", block: "start" }), 60);
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
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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
    heart.rotation.y += 0.006 + spinBoost * 0.1;
    heartGroup.rotation.x += (target.y * 0.35 - heartGroup.rotation.x) * 0.06;
    heartGroup.rotation.y += (target.x * 0.6 - heartGroup.rotation.y) * 0.06;
    heartGroup.position.y = Math.sin(t * 1.2) * 0.12;
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
  if (reduceMotion) frame(); else loop();
}
initHero3D();

window.FX = { burst, pop };
