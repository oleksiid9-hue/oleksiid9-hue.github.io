/* Робот-супутник: 3D-око, що їде разом зі сторінкою, стежить за курсором,
   нервує від різкої прокрутки, радіє біля кнопок «написати». Потрібен three.js r128. */
(function () {
  if (!window.THREE) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- контейнер ---------- */
  const wrap = document.createElement('div');
  wrap.className = 'bot';
  wrap.setAttribute('aria-hidden', 'true');
  const canvas = document.createElement('canvas');
  wrap.appendChild(canvas);
  document.body.appendChild(wrap);

  /* ---------- перешкоди «поганий зв'язок», коли робот злий ---------- */
  const glStyle = document.createElement('style');
  glStyle.textContent = `
.bot-glitch{position:fixed;inset:0;z-index:44;pointer-events:none;opacity:0}
.bot-glitch b{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(200,30,60,.09) 0 1px,transparent 1px 3px);mix-blend-mode:screen}
.bot-glitch i{position:absolute;left:0;right:0;display:none;background:rgba(200,30,60,.16);mix-blend-mode:screen;box-shadow:0 0 12px rgba(200,30,60,.35)}
html.bot-gl main{transform:translate3d(var(--glx,0px),0,0)}
html.bot-gl main h1,html.bot-gl main h2,html.bot-gl main h3{text-shadow:3px 0 rgba(255,0,60,.85),-3px 0 rgba(0,255,255,.6)}
html.bot-gl main img,html.bot-gl main video{opacity:.3}`;
  document.head.appendChild(glStyle);
  const glEl = document.createElement('div');
  glEl.className = 'bot-glitch'; glEl.setAttribute('aria-hidden', 'true');
  glEl.innerHTML = '<b></b><i></i><i></i>';
  document.body.appendChild(glEl);
  const tears = glEl.querySelectorAll('i');
  let glUntil = 0, nextGl = 0, glOn = false, glLevel = -1;
  function glitch(g, now) {
    // g = 0..1, наскільки сильно злий
    const lv = Math.round(g * 20) / 20;
    if (lv !== glLevel) { glLevel = lv; glEl.style.opacity = (lv * 0.9).toFixed(2); }
    const root = document.documentElement;
    if (g < 0.3 || reduce) {
      if (glOn) { glOn = false; root.classList.remove('bot-gl'); tears.forEach((t) => (t.style.display = 'none')); canvas.style.opacity = ''; canvas.style.transform = ''; }
      return;
    }
    if (!glOn && now > nextGl) {                                  // короткий збій 60–140 мс
      glOn = true; glUntil = now + 60 + Math.random() * 80;
      root.classList.add('bot-gl');
      root.style.setProperty('--glx', ((Math.random() - 0.5) * 16 * g).toFixed(1) + 'px');
      tears.forEach((t) => {
        if (Math.random() < 0.7) { t.style.display = 'block'; t.style.top = (Math.random() * 95) + '%'; t.style.height = (3 + Math.random() * 28) + 'px'; t.style.transform = `translateX(${(Math.random() - 0.5) * 40}px)`; }
      });
      canvas.style.opacity = (0.15 + Math.random() * 0.5).toFixed(2);   // робот «пропадає»
      canvas.style.transform = `translateX(${((Math.random() - 0.5) * 14).toFixed(1)}px)`;
    } else if (glOn && now > glUntil) {
      glOn = false; root.classList.remove('bot-gl');
      tears.forEach((t) => (t.style.display = 'none'));
      canvas.style.opacity = ''; canvas.style.transform = '';
      nextGl = now + (520 - 400 * g) + Math.random() * 300;     // чим злiший — тим частіше
    }
  }

  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); }
  catch (e) { wrap.remove(); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.1, 6.4);

  const C = {
    calm: new THREE.Color(0x39ff7a), amber: new THREE.Color(0xffb020),
    angry: new THREE.Color(0xff2a1f), seam: new THREE.Color(0x2bff6e)
  };

  /* ---------- оточення для металу ---------- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x050607, side: THREE.BackSide })));
  function softbox(color, w, h, p) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.copy(p); m.lookAt(0, 0, 0); env.add(m);
  }
  softbox(0x9a9a9a, 5, 1.5, new THREE.Vector3(2, 6, 4));
  softbox(0xb040ff, 3, 6, new THREE.Vector3(-7, 1, 1));
  softbox(0x30ff70, 6, 3, new THREE.Vector3(0, -6, 2));
  softbox(0x888888, 4, 4, new THREE.Vector3(5, 0, 5));
  scene.environment = pmrem.fromScene(env, 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xc04dff, 2.2); rim.position.set(-5, 2, -2); scene.add(rim);
  const under = new THREE.PointLight(0x39ff7a, 0.9, 5, 2); under.position.set(0, -2.1, 0.8); scene.add(under);
  const eyeLight = new THREE.PointLight(0x39ff7a, 1.2, 3, 2); scene.add(eyeLight);

  /* ---------- корпус ---------- */
  const R = 1;
  const root = new THREE.Group(); scene.add(root);
  const head = new THREE.Group(); root.add(head);
  const shellMat = new THREE.MeshPhysicalMaterial({ color: 0x0e1011, metalness: 0.45, roughness: 0.48, clearcoat: 0.4, clearcoatRoughness: 0.35, envMapIntensity: 0.55 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x070809, metalness: 0.6, roughness: 0.35, envMapIntensity: 0.5 });
  const seamMat = new THREE.MeshBasicMaterial({ color: C.seam.clone(), toneMapped: false });
  const grooveMat = new THREE.MeshStandardMaterial({ color: 0x020303, metalness: 0.2, roughness: 0.8 });

  const EYE_OPEN = Math.acos(0.86);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48, 0, Math.PI * 2, EYE_OPEN, Math.PI - EYE_OPEN), shellMat);
  shell.rotation.x = Math.PI / 2; head.add(shell);

  function sph(la, lo, r) {
    la = THREE.MathUtils.degToRad(la); lo = THREE.MathUtils.degToRad(lo);
    return new THREE.Vector3(r * Math.cos(la) * Math.sin(lo), r * Math.sin(la), r * Math.cos(la) * Math.cos(lo));
  }
  function arc(a, b, c, d, n, rad, mat) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push(sph(a + (c - a) * t, b + (d - b) * t, R + 0.004)); }
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, rad, 8, false), mat));
  }
  arc(-38, -150, -38, 150, 40, 0.008, grooveMat);
  arc(62, -180, 62, 180, 40, 0.008, grooveMat);
  arc(-60, -48, 60, -48, 20, 0.008, grooveMat);
  arc(-60, 62, 50, 62, 20, 0.008, grooveMat);
  arc(-36, -38, -30, 46, 20, 0.016, seamMat);
  arc(-12, -50, 48, -42, 16, 0.014, seamMat);
  arc(55, -20, 46, 55, 16, 0.012, seamMat);
  arc(-48, 66, -8, 70, 12, 0.012, seamMat);
  arc(10, 120, -30, 140, 12, 0.012, seamMat);
  arc(20, -120, -25, -135, 12, 0.012, seamMat);

  function port(lo) {
    const g = new THREE.Group();
    const rimM = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.12, 40), darkMat); rimM.rotation.x = Math.PI / 2; g.add(rimM);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 12, 40), seamMat); ring.position.z = 0.062; g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), new THREE.MeshBasicMaterial({ color: C.seam.clone().multiplyScalar(0.75), toneMapped: false }));
    disc.position.z = 0.061; g.add(disc);
    const p = sph(0, lo, R - 0.03); g.position.copy(p); g.lookAt(p.clone().multiplyScalar(2)); head.add(g);
  }
  port(-82); port(82);
  [[8, 40], [-2, 41], [-11, 41]].forEach(([la, lo]) => {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), seamMat); led.position.copy(sph(la, lo, R + 0.005)); head.add(led);
  });

  /* ---------- око ---------- */
  const EYE_Z = 0.86;
  const eye = new THREE.Group(); eye.position.z = EYE_Z; head.add(eye);
  const socketR = Math.sqrt(R * R - EYE_Z * EYE_Z) - 0.01;
  const socket = new THREE.Mesh(new THREE.TorusGeometry(socketR, 0.055, 20, 80), darkMat); socket.position.z = 0.005; eye.add(socket);
  eye.add(new THREE.Mesh(new THREE.CircleGeometry(socketR, 56), new THREE.MeshStandardMaterial({ color: 0x030404, roughness: 0.6, metalness: 0.4 })));
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.012, 12, 64), darkMat); inner.position.z = 0.01; eye.add(inner);

  function irisTex() {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), m = 128;
    const b = g.createRadialGradient(m, m, 15, m, m, 125);
    b.addColorStop(0, '#fff'); b.addColorStop(0.35, '#e6e6e6'); b.addColorStop(0.8, '#9a9a9a'); b.addColorStop(0.95, '#3a3a3a'); b.addColorStop(1, '#111');
    g.fillStyle = b; g.beginPath(); g.arc(m, m, 128, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 160; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 30 + Math.random() * 20, r1 = 85 + Math.random() * 35;
      g.strokeStyle = `rgba(${Math.random() < .5 ? '255,255,255' : '60,60,60'},${0.15 + Math.random() * 0.35})`;
      g.lineWidth = 0.6 + Math.random();
      g.beginPath(); g.moveTo(m + Math.cos(a) * r0, m + Math.sin(a) * r0); g.lineTo(m + Math.cos(a) * r1, m + Math.sin(a) * r1); g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
  }
  const lid = new THREE.Group(); lid.position.z = 0.014; eye.add(lid);
  const irisMat = new THREE.MeshBasicMaterial({ map: irisTex(), color: C.calm.clone(), toneMapped: false });
  lid.add(new THREE.Mesh(new THREE.CircleGeometry(0.36, 56), irisMat));
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.135, 40), new THREE.MeshBasicMaterial({ color: 0x000000 })); pupil.position.z = 0.004; lid.add(pupil);
  const glint = new THREE.Mesh(new THREE.CircleGeometry(0.05, 20), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(0.12, 0.13, 0.02); lid.add(glint);
  eyeLight.position.set(0, 0, EYE_Z + 0.5); head.add(eyeLight);

  // кільця «мурчання» — біля кнопок написати
  const purr = [0, 1, 2].map(() => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.56, 0.58, 80), new THREE.MeshBasicMaterial({ color: C.calm, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    r.position.z = 0.16; eye.add(r); return r;
  });
  // рвані червоні хвилі — коли злий
  const SEG = 120;
  const rage = [0, 1].map((i) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 6), 3));
    const idx = []; for (let s = 0; s < SEG; s++) { const a = s * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setIndex(idx);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: C.angry, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.position.z = 0.17; m.userData.sd = Math.random() * 100 + i * 17; eye.add(m); return m;
  });
  function rageShape(m, base, w0, t, en) {
    const p = m.geometry.attributes.position.array, sd = m.userData.sd;
    for (let s = 0; s <= SEG; s++) {
      const a = s / SEG * Math.PI * 2;
      let wob = 0.045 * Math.sin(5 * a + t * 9 + sd) + 0.03 * Math.sin(11 * a - t * 13 + sd * 2);
      if (Math.random() < 0.08) wob += (Math.random() - 0.3) * 0.09;
      const r = base + wob * en, w = w0 * (0.6 + 0.8 * Math.abs(Math.sin(7 * a + t * 5 + sd)));
      const c = Math.cos(a), sn = Math.sin(a), k = s * 6;
      p[k] = c * r; p[k + 1] = sn * r; p[k + 2] = 0; p[k + 3] = c * (r + w); p[k + 4] = sn * (r + w); p[k + 5] = 0;
    }
    m.geometry.attributes.position.needsUpdate = true;
  }

  /* ---------- розмір ---------- */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  /* ---------- стан ---------- */
  const ptr = { x: 0, y: 0, has: false, last: -1e9 };
  addEventListener('pointermove', (e) => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.has = true; ptr.last = performance.now(); }, { passive: true });
  document.addEventListener('mouseleave', () => { ptr.has = false; });

  let hoverCta = false;
  document.addEventListener('pointerover', (e) => { hoverCta = !!e.target.closest('.btn, .fab, a[href*="ig.me"], a[href*="t.me"], .pf-toggle, .cf-go'); });

  let agit = 0, angerVis = 0, happy = 0, flinch = 0, lastPoke = -1e9;
  canvas.addEventListener('pointerdown', () => { agit = Math.min(1.5, agit + 0.6); lastPoke = performance.now(); flinch = 1; });

  // реакції на кліки: кнопки й меню — радіє й гойдається; хрестик (закрити меню) — коротка злість
  let joy = 0, snapUntil = 0, sulkAt = -1e9;
  const now0 = () => performance.now();
  function isCross(el) {
    const t = (el.textContent || '').trim(), lab = ((el.getAttribute('aria-label') || '') + ' ' + t).toLowerCase();
    if (/закрити|close/.test(lab) || /^[×✕✖x]$/.test(t)) return true;
    const h = el.closest('header');
    return el.classList.contains('burger') && !!h && h.classList.contains('open');   // відкритий бургер намальований як ×
  }
  // забагато кліків (5 за 2 с будь-де на сторінці) — злиться, і сайт стає червоним
  let clicks = [];
  document.addEventListener('pointerdown', () => {
    const now = performance.now();
    clicks = clicks.filter((c) => now - c < 2000); clicks.push(now);
    if (clicks.length >= 5) { agit = 1.3; angerVis = Math.max(angerVis, 0.7); flinch = 0.8; lastPoke = now; joy = 0; clicks = []; }
  }, true);
  document.addEventListener('click', (e) => {
    if (now0() - lastPoke < 300) return;                         // щойно розізлився від кліків — не радіти
    const el = e.target.closest && e.target.closest('button, a, [role="button"], summary, .btn');
    if (!el || wrap.contains(el)) return;
    const now = performance.now();
    if (isCross(el)) { agit = 1.2; angerVis = Math.max(angerVis, 0.9); flinch = 0.8; lastPoke = now; snapUntil = now + 700; joy = 0; return; }
    // згортаємо щось (портфоліо, пункт послуг, питання) — інколи йому це не подобається
    const pf = el.closest('.pf-toggle'), sm = el.closest('summary');
    const closing = (pf && pf.getAttribute('aria-expanded') === 'true') || (sm && sm.parentElement && sm.parentElement.open);
    if (closing) { if (Math.random() < 0.45) { sulkAt = now; joy = 0; } return; }
    joy = 1; happy = Math.max(happy, 0.8); agit = Math.max(0, agit - 0.4);
  }, true);

  // прокрутка: швидкість і напрям
  let lastY = scrollY, scrollV = 0, lastScrollT = performance.now();
  addEventListener('scroll', () => {
    const now = performance.now(), dt = Math.max(16, now - lastScrollT);
    const dy = scrollY - lastY; lastY = scrollY; lastScrollT = now;
    if (Math.abs(dy) > innerHeight) return;                      // стрибок по меню — не нервує
    scrollV += (dy / dt * 1000 - scrollV) * 0.5;
  }, { passive: true });

  // позиція на екрані: робот «їде» разом із прокруткою і перелітає туди, де немає тексту
  let posY = 0, velY = 0, posX = -1, velX = 0, hop = 0;
  const contact = document.getElementById('contact');

  // чи зайняте місце: текст, кнопки, фото, картки
  const BUSY = 'p,h1,h2,h3,h4,li,a,button,summary,img,video,figure,label,input,textarea,.card,.arc,.cf,.offer,.status,.hud,.kick,.tl li,.faq details';
  function busyAt(x, y) {
    const els = document.elementsFromPoint(x, y);
    for (const el of els) {
      if (wrap.contains(el)) continue;
      if (el.closest('header,.fab')) return 3;                  // шапка й плаваюча кнопка — точно ні
      return el.closest(BUSY) ? 1 : 0;
    }
    return 0;
  }
  function score(x, y, size) {
    let s = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
      s += busyAt(x + size * (0.15 + i * 0.35), y + size * (0.15 + j * 0.35));
    return s;
  }
  let side = 1, offY = 0, lastPick = 0;                         // 1 = праворуч, -1 = ліворуч
  let scrolledSinceFlip = 0, wantFlip = false;
  function pickSpot(baseY, size, vw, topLimit, bottomLimit) {
    const m = vw < 600 ? 2 : 12;
    const xs = { '-1': m, '1': vw - size - m };
    let best = null;
    // прогорнули ~екран — обов'язково перелітає на інший бік і там шукає найвільніше місце
    // щойно перелетів — тримається нового боку, поки не прогорнуть ще пів екрана
    const lock = scrolledSinceFlip < innerHeight * 0.5;
    for (const sd of (wantFlip ? [-side] : lock ? [side] : [side, -side])) for (const dy of [0, -120, 120, -240, 240, -360, 360]) {
      const y = THREE.MathUtils.clamp(baseY + dy, topLimit, bottomLimit);
      // після кожного ~екрана прокрутки його тягне перелетіти на інший бік (якщо там не набагато тісніше)
      const sidePen = sd !== side ? (wantFlip ? -75 : 4) : 0;
      const s = score(xs[sd], y, size) * 10 + Math.abs(dy) / 60 + sidePen + (dy !== offY ? 1 : 0);
      if (!best || s < best.s) best = { s, sd, dy };
    }
    if (best.sd !== side) { hop = 1; scrolledSinceFlip = 0; }   // старт перельоту
    side = best.sd; offY = best.dy;
    return xs;
  }
  let xs = { '-1': 12, '1': innerWidth - 100 };
  let lastFlipY = scrollY;

  const look = { x: 0, y: 0 }, pOff = { x: 0, y: 0 };
  let blinkT = 0, nextBlink = 2 + Math.random() * 3, wander = { x: 0, y: 0, until: 0 };
  const EVENTS = ['sway', 'spin', 'hop', 'peek', 'sway', 'peek'];
  const EV_DUR = { sway: 2600, spin: 1300, hop: 900, peek: 2200 };
  let ev = null, nextEv = performance.now() + 5000 + Math.random() * 6000;
  const tmp = new THREE.Color();
  let lastRgb = '', siteVis = 0, siteHold = 0;
  const clock = new THREE.Clock();
  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) { clock.getDelta(); requestAnimationFrame(tick); } });

  function tick() {
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, now = performance.now();
    const vw = innerWidth, vh = innerHeight, size = wrap.offsetWidth;

    // --- рух уздовж екрана ---
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    const prog = scrollY / max;                                  // 0..1
    const topLimit = 90, bottomLimit = vh - size - 110;          // між шапкою і кнопкою «Обговорити»
    const baseY = topLimit + (bottomLimit - topLimit) * (0.15 + prog * 0.85);
    // кожні 0.35 с шукає вільне місце: свій бік, інший бік, трохи вище чи нижче
    // скільки прогорнули з останнього перельоту: ~0.9 екрана — час перелітати
    scrolledSinceFlip += Math.abs(scrollY - lastFlipY); lastFlipY = scrollY;
    wantFlip = scrolledSinceFlip > vh * 0.9;
    if (now - lastPick > 350) { lastPick = now; xs = pickSpot(baseY, size, vw, topLimit, bottomLimit); }
    const targetY = THREE.MathUtils.clamp(baseY + offY, topLimit, bottomLimit);
    const targetX = xs[side];
    if (posX < 0) { posX = targetX; posY = targetY; }
    // відставання: коли гортаєш, робот трохи «доганяє»
    const lag = reduce ? 0 : THREE.MathUtils.clamp(-scrollV * 0.06, -90, 90);
    velY += ((targetY + lag - posY) * 18 - velY * 7) * dt; posY += velY * dt;
    // переліт через екран: м'яка пружина + дуга вгору
    velX += ((targetX - posX) * 9 - velX * 5) * dt; posX += velX * dt;
    if (reduce) { posX = targetX; posY = targetY; }
    const flyK = Math.min(1, Math.abs(targetX - posX) / Math.max(1, Math.abs(xs['1'] - xs['-1'])));
    hop = Math.max(0, hop - dt * 0.9);
    const arcY = reduce ? 0 : -Math.sin(flyK * Math.PI) * Math.min(120, vh * 0.12);
    // випадкові івенти раз на 7–16 с: погойдатись, крутнутись, підстрибнути, зазирнути в текст
    let evX = 0, evY = 0, evRoll = 0, evYaw = 0, evPitch = 0, evLook = 0;
    if (!reduce) {
      if (!ev && now > nextEv && angerVis < 0.2 && flyK < 0.05) {
        const type = EVENTS[Math.floor(Math.random() * EVENTS.length)];
        ev = { type, t0: now, dur: EV_DUR[type], dir: Math.random() < 0.5 ? -1 : 1 };
      }
      if (ev) {
        const p = (now - ev.t0) / ev.dur;
        if (p >= 1 || angerVis > 0.5) { ev = null; nextEv = now + 7000 + Math.random() * 9000; }
        else {
          const env = Math.sin(p * Math.PI);
          if (ev.type === 'sway') { evX = Math.sin(p * Math.PI * 3) * 28 * env; evRoll = -Math.sin(p * Math.PI * 3) * 0.22 * env; }
          if (ev.type === 'spin') { const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; evYaw = e * Math.PI * 2 * ev.dir; }
          if (ev.type === 'hop') { evY = -Math.abs(Math.sin(p * Math.PI * 2)) * 26 * (1 - p * 0.4); evPitch = Math.sin(p * Math.PI * 2) * 0.15; }
          if (ev.type === 'peek') evLook = Math.min(1, env * 1.6);
        }
      }
    }
    wrap.style.transform = `translate3d(${(posX + evX).toFixed(1)}px,${(posY + arcY + evY).toFixed(1)}px,0)`;

    // --- куди дивитись ---
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const idle = !ptr.has || now - ptr.last > 3500;
    let tx, ty;
    if (idle) {
      if (now > wander.until) wander = { x: -0.3 - Math.random() * 0.7, y: (Math.random() * 2 - 1) * 0.4, until: now + 1200 + Math.random() * 2200 };
      tx = wander.x; ty = wander.y;
    } else {
      tx = THREE.MathUtils.clamp((ptr.x - cx) / (vw * 0.45), -1.2, 1.2);
      ty = THREE.MathUtils.clamp(-(ptr.y - cy) / (vh * 0.45), -1.2, 1.2);
    }
    // івент «зазирнути»: дивиться вбік і вниз, на текст
    if (evLook > 0) { tx = THREE.MathUtils.lerp(tx, -Math.sign(posX - vw / 2 || 1) * 1.1, evLook); ty = THREE.MathUtils.lerp(ty, -0.6, evLook); }
    // при прокрутці дивиться в бік руху
    const sv = THREE.MathUtils.clamp(scrollV / 2500, -1, 1);
    ty = THREE.MathUtils.lerp(ty, -sv, Math.min(1, Math.abs(sv) * 1.5));
    scrollV *= Math.pow(0.02, dt);                                // затухає, коли не гортаєш

    // --- настрій ---
    if (Math.abs(scrollV) > 6000 && !reduce) { agit = Math.min(1.5, agit + dt * 1.6); lastPoke = now; }
    let calmRate = now - lastPoke > 700 ? 1.5 : 0;               // швидко приходить у себе
    if (snapUntil && now > snapUntil) { calmRate = Math.max(calmRate, 4); if (agit <= 0) snapUntil = 0; }
    joy = Math.max(0, joy - dt * 0.45);
    agit = Math.max(0, agit - dt * (calmRate + (hoverCta ? 1.2 : 0)));
    const aT = Math.min(1, agit);
    angerVis += (aT - angerVis) * Math.min(1, dt * (aT > angerVis ? 6 : 4));
    let nearContact = false;
    if (contact) { const r = contact.getBoundingClientRect(); nearContact = r.top < vh * 0.6 && r.bottom > vh * 0.3; }
    // у польоті дивиться туди, куди летить
    if (flyK > 0.05) { tx = THREE.MathUtils.lerp(tx, Math.sign(targetX - posX) * 1.1, Math.min(1, flyK * 3)); ty = THREE.MathUtils.lerp(ty, 0.15, flyK); }
    const wantHappy = angerVis < 0.3 ? Math.max(hoverCta || nearContact ? 1 : 0, joy > 0.15 ? 0.9 : 0) : 0;
    happy += (wantHappy - happy) * Math.min(1, dt * (wantHappy > happy ? 2.5 : 1.2));

    const follow = angerVis > 0.5 ? 10 : 4.5;
    look.x += (-ty * 0.55 - look.x) * Math.min(1, dt * follow);
    look.y += (tx * 0.75 - look.y) * Math.min(1, dt * follow);

    const amp = reduce ? 0 : 0.09;
    root.position.y = Math.sin(t * 1.3) * amp * (1 - angerVis * 0.5) + happy * 0.035 * Math.abs(Math.sin(t * 7)) * (reduce ? 0 : 1);
    let jx = 0, jy = 0;
    if (!reduce && angerVis > 0.05) { jx = (Math.random() - 0.5) * 0.03 * angerVis; jy = (Math.random() - 0.5) * 0.03 * angerVis; }
    flinch = Math.max(0, flinch - dt * 3);
    head.position.set(jx, jy, -flinch * 0.3);
    head.rotation.x = look.x + Math.sin(t * 0.9) * 0.03;
    head.rotation.y = look.y;
    // крен від швидкості руху по екрану
    head.rotation.z = -look.y * 0.12 + THREE.MathUtils.clamp(velY / 3000, -0.25, 0.25) - THREE.MathUtils.clamp(velX / 2500, -0.35, 0.35);
    // радісне гойдання ~2 с після кліку
    head.rotation.z += evRoll; head.rotation.y += evYaw; head.rotation.x += evPitch;
    // повільно повертається навколо своєї осі туди-сюди (~±17°), щоб не стояв статично
    root.rotation.y = reduce ? 0 : Math.sin(t * 0.42) * 0.3 * (1 - angerVis * 0.7);
    // невдоволення, коли щось згорнули: «ні-ні» головою
    const sulkP = (now - sulkAt) / 1100, sulk = sulkP >= 0 && sulkP < 1 ? 1 - sulkP : 0;
    if (sulk > 0 && !reduce) head.rotation.y += Math.sin(sulkP * Math.PI * 6) * 0.28 * sulk;
    const sway = reduce ? 0 : joy * (1 - angerVis);
    head.rotation.z += sway * 0.16 * Math.sin(t * 5);
    root.position.x = sway * 0.06 * Math.sin(t * 5 - 0.6);

    pOff.x += (tx * 0.07 - pOff.x) * Math.min(1, dt * 12);
    pOff.y += (ty * 0.07 - pOff.y) * Math.min(1, dt * 12);
    pupil.position.set(pOff.x, pOff.y, 0.004);
    const dil = 1 + happy * 0.35 * (1 - angerVis);
    const slit = THREE.MathUtils.smoothstep(angerVis, 0.4, 0.85);
    pupil.scale.set(THREE.MathUtils.lerp(dil, 0.24, slit), THREE.MathUtils.lerp(dil, 1.95, slit), 1);

    blinkT += dt; let ls = 1;
    if (blinkT > nextBlink && angerVis < 0.3) {
      const p = (blinkT - nextBlink) / 0.16;
      if (p >= 1) { blinkT = 0; nextBlink = 2.5 + Math.random() * 4; } else ls = Math.max(0.05, Math.abs(1 - 2 * p));
    }
    lid.scale.y = ls;

    if (angerVis < 0.5) tmp.copy(C.calm).lerp(C.amber, angerVis * 2); else tmp.copy(C.amber).lerp(C.angry, (angerVis - 0.5) * 2);
    const pulse = angerVis > 0.5 ? 1 + Math.sin(t * 14) * 0.18 : 1 + Math.sin(t * 2) * 0.06 + happy * 0.12;
    irisMat.color.copy(tmp).multiplyScalar(0.95 * pulse);
    eyeLight.color.copy(tmp); eyeLight.intensity = (1.2 + angerVis * 2.2) * pulse;
    wrap.style.setProperty('--glow', `rgba(${Math.round(tmp.r * 255)},${Math.round(tmp.g * 255)},${Math.round(tmp.b * 255)},${(0.35 + angerVis * 0.3).toFixed(2)})`);

    // сайт злиться разом із роботом: зелена палітра плавно стає червоною
    // коли щось згорнули — палітра кілька разів коротко блимає червоним
    const flick = sulk > 0 ? (Math.floor(sulkP * 7) % 2 === 0 ? 0.85 * sulk + 0.15 : 0) : 0;
    if (flick > 0) { irisMat.color.copy(C.calm).lerp(C.angry, flick); eyeLight.color.copy(irisMat.color); }
    const rageTarget = Math.max(THREE.MathUtils.smoothstep(angerVis, 0.45, 0.85), flick);
    // плавно: червоніє ~за 1.5 с, повертається до зеленого ~за 6 с
    // на піку бордовий ще ~1.5 с тримається, потім повільно відходить
    if (rageTarget > 0.5 && rageTarget >= siteVis - 0.05) siteHold = now + 1500;
    if (rageTarget > siteVis || now > siteHold) siteVis += (rageTarget - siteVis) * Math.min(1, dt * (rageTarget > siteVis ? 1.4 : 0.5));
    const siteRage = siteVis < 0.004 ? 0 : siteVis;
    glitch(THREE.MathUtils.smoothstep(angerVis, 0.45, 0.85), now);
    // зелений → бордовий (у тон рамки Direct)
    const rgb = [Math.round(57 + (200 - 57) * siteRage), Math.round(255 + (30 - 255) * siteRage), Math.round(122 + (60 - 122) * siteRage)].join(',');
    if (rgb !== lastRgb) {
      lastRgb = rgb;
      const st = document.documentElement.style;
      if (siteRage < 0.01) { st.removeProperty('--g-rgb'); st.removeProperty('--green'); }
      else { st.setProperty('--g-rgb', rgb); st.setProperty('--green', `rgb(${rgb})`); }
    }

    purr.forEach((r, i) => { const ph = (t * 0.9 + i / 3) % 1; r.scale.setScalar(1 + ph * 0.55); r.material.opacity = (1 - ph) * happy * 0.8; });
    const rg = THREE.MathUtils.smoothstep(angerVis, 0.45, 0.8);
    rage.forEach((m, i) => {
      if (rg < 0.01) { m.visible = false; return; }
      m.visible = true; const ph = (t * 1.6 + i / 2) % 1;
      rageShape(m, 0.56 + ph * 0.42, 0.012 + 0.014 * (1 - ph), t, 0.6 + rg * 0.8);
      m.material.opacity = Math.pow(1 - ph, 1.3) * rg * (0.75 + Math.random() * 0.25);
    });

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  posY = 90; requestAnimationFrame(tick);
})();
