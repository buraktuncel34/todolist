/* Günlük — "all done today" celebration. Pure code (one canvas + inline SVG), loaded only when needed.
   Phase 1: rainbow bursts at random spots all over the screen, each throwing big ornaments (ribbons, stars, dots,
   triangles, streamers) that fill the whole screen and flutter down. Phase 2: "Tebrikler!" + dancing characters. */
'use strict';

(function () {
  const COLORS = ['#ff4d6d', '#ffb703', '#06d6a0', '#3a86ff', '#8338ec', '#ff7b00', '#00bbf9', '#f15bb5'];
  const DURATION = 8500;
  const CAST_AT = 2300;  // the rainbow explosions own the screen first, then the text + dancers come in

  const CSS = `
  #celebrate { position: fixed; inset: 0; z-index: 90; pointer-events: auto; cursor: pointer; animation: cel-in .25s ease; }
  #celebrate.out { animation: cel-out .5s ease forwards; }
  #celebrate canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
  #celebrate .cel-veil { position: absolute; inset: 0; background: radial-gradient(circle at 50% 40%, rgba(12,14,34,.74), rgba(8,10,26,.9)); }
  body.celebrating #toast, body.celebrating #main .empty { opacity: 0 !important; }
  .cel-text { position: absolute; left: 50%; top: 34%; transform: translate(-50%, -50%); text-align: center; width: min(92vw, 720px);
    opacity: 0; }
  #celebrate.cast .cel-text { opacity: 1; animation: cel-pop .9s cubic-bezier(.2, 1.6, .4, 1) both; }
  .cel-text b { display: block; font-size: clamp(44px, 9vw, 96px); font-weight: 900; letter-spacing: -.02em; line-height: 1;
    background: linear-gradient(90deg, #ffd166, #ff4d6d, #8338ec, #3a86ff, #06d6a0, #ffd166); background-size: 300% 100%;
    -webkit-background-clip: text; background-clip: text; color: transparent; animation: cel-shine 2.4s linear infinite;
    filter: drop-shadow(0 6px 24px rgba(255, 209, 102, .45)); }
  .cel-text span { display: inline-block; margin-top: 14px; padding: 10px 22px; border-radius: 40px; font-size: clamp(16px, 3.4vw, 24px);
    font-weight: 700; color: #fff; background: rgba(255,255,255,.16);
    box-shadow: 0 0 0 1px rgba(255,255,255,.25), 0 10px 40px rgba(131,56,236,.35); animation: cel-float 2s ease-in-out infinite alternate .9s; }
  .cel-dancers { opacity: 0; transition: opacity .5s ease, translate .6s cubic-bezier(.2, 1.4, .4, 1); translate: 0 60px; }
  #celebrate.cast .cel-dancers { opacity: 1; translate: 0 0; }
  .cel-dancers { position: absolute; left: 50%; bottom: max(7%, calc(env(safe-area-inset-bottom, 0px) + 150px)); transform: translateX(-50%); display: flex; gap: clamp(10px, 4vw, 48px); align-items: flex-end; }
  .cel-d { width: clamp(70px, 14vw, 120px); animation: cel-hop .5s ease-in-out infinite alternate; transform-origin: 50% 100%; }
  .cel-d:nth-child(2) { animation-delay: .25s; width: clamp(84px, 17vw, 140px); }
  .cel-d:nth-child(3) { animation-delay: .12s; }
  .cel-d .arm-l { transform-origin: 38px 58px; animation: cel-wave-l .4s ease-in-out infinite alternate; }
  .cel-d .arm-r { transform-origin: 62px 58px; animation: cel-wave-r .4s ease-in-out infinite alternate .2s; }
  .cel-d .leg-l { transform-origin: 44px 84px; animation: cel-kick .5s ease-in-out infinite alternate; }
  .cel-d .leg-r { transform-origin: 56px 84px; animation: cel-kick .5s ease-in-out infinite alternate-reverse; }
  @keyframes cel-in { from { opacity: 0; } }
  @keyframes cel-out { to { opacity: 0; } }
  @keyframes cel-pop { 0% { transform: translate(-50%, -50%) scale(.2) rotate(-8deg); opacity: 0; } 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
  @keyframes cel-shine { to { background-position: 300% 0; } }
  @keyframes cel-float { to { transform: translateY(-8px) scale(1.03); } }
  @keyframes cel-hop { from { transform: translateY(0) rotate(-6deg); } to { transform: translateY(-26px) rotate(6deg); } }
  @keyframes cel-wave-l { from { transform: rotate(20deg); } to { transform: rotate(-70deg); } }
  @keyframes cel-wave-r { from { transform: rotate(-20deg); } to { transform: rotate(70deg); } }
  @keyframes cel-kick { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
  `;

  // a round little character: body, face, waving arms, kicking legs, party hat
  function dancer(body, hat) {
    return `<svg class="cel-d" viewBox="0 0 100 110" aria-hidden="true">
      <g class="leg-l"><path d="M44 84 L38 104" stroke="#2b2d42" stroke-width="6" stroke-linecap="round"/><ellipse cx="36" cy="105" rx="7" ry="4" fill="#2b2d42"/></g>
      <g class="leg-r"><path d="M56 84 L62 104" stroke="#2b2d42" stroke-width="6" stroke-linecap="round"/><ellipse cx="64" cy="105" rx="7" ry="4" fill="#2b2d42"/></g>
      <g class="arm-l"><path d="M38 58 L18 50" stroke="${body}" stroke-width="7" stroke-linecap="round"/><circle cx="16" cy="49" r="5" fill="#ffd6a5"/></g>
      <g class="arm-r"><path d="M62 58 L82 50" stroke="${body}" stroke-width="7" stroke-linecap="round"/><circle cx="84" cy="49" r="5" fill="#ffd6a5"/></g>
      <ellipse cx="50" cy="64" rx="22" ry="24" fill="${body}"/>
      <circle cx="50" cy="34" r="17" fill="#ffd6a5"/>
      <circle cx="44" cy="32" r="2.6" fill="#2b2d42"/><circle cx="56" cy="32" r="2.6" fill="#2b2d42"/>
      <path d="M43 39 Q50 46 57 39" stroke="#2b2d42" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="40" cy="38" r="2.6" fill="#ff8fab" opacity=".7"/><circle cx="60" cy="38" r="2.6" fill="#ff8fab" opacity=".7"/>
      <path d="M38 20 L50 -2 L62 20 Z" fill="${hat}"/><circle cx="50" cy="-2" r="3.5" fill="#fff"/>
      <path d="M40 16 L60 16" stroke="#fff" stroke-width="2.4" opacity=".7"/>
    </svg>`;
  }

  window.runCelebration = function () {
    if (document.getElementById('celebrate')) return;
    if (!document.getElementById('cel-css')) {
      const st = document.createElement('style');
      st.id = 'cel-css';
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const root = document.createElement('div');
    root.id = 'celebrate';
    root.setAttribute('role', 'status');
    root.innerHTML = `<div class="cel-veil"></div><canvas></canvas>
      <div class="cel-text"><b>Tebrikler!</b><span>Bugün bütün işleri tamamladın 🎉</span></div>
      <div class="cel-dancers">${dancer('#3a86ff', '#ffb703')}${dancer('#ff4d6d', '#06d6a0')}${dancer('#8338ec', '#ff7b00')}</div>`;
    document.body.appendChild(root);
    document.body.classList.add('celebrating');

    let raf = 0, done = false;
    const close = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      root.classList.add('out');
      document.body.classList.remove('celebrating');
      document.removeEventListener('keydown', onKey);
      setTimeout(() => root.remove(), 500);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    root.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    setTimeout(close, DURATION);
    setTimeout(() => root.classList.add('cast'), CAST_AT);

    // ---- canvas: rainbow bursts + ornaments ----
    const cv = root.querySelector('canvas');
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const size = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    window.addEventListener('resize', size, { once: true });
    const rnd = (a, b) => a + Math.random() * (b - a);
    const small = W < 600;
    const SPARK_MAX = small ? 900 : 1800;   // glowing rainbow sparks
    const ORN_MAX = small ? 380 : 700;      // ornaments (confetti shapes)
    const sparks = [], orns = [], rings = [];
    const SHAPES = ['rect', 'rect', 'circle', 'star', 'tri', 'ribbon', 'ribbon', 'streamer'];
    const rainbow = (i, n, shift) => `hsl(${((i / n) * 360 + shift) % 360} 95% 60%)`;

    const ornament = (x, y, a, v, hue) => ({
      x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, shape: SHAPES[(Math.random() * SHAPES.length) | 0],
      s: rnd(8, small ? 15 : 19), r: rnd(0, 6.28), vr: rnd(-0.25, 0.25), flip: rnd(0, 6.28),
      c: `hsl(${hue} 95% ${rnd(52, 64)}%)`, wob: rnd(0, 6.28),
    });

    // one burst = a full rainbow ring of sparks + an expanding glow ring + ornaments flying out in every direction
    const burst = (x, y, power = 1) => {
      const n = Math.round((small ? 54 : 84) * power), shift = rnd(0, 360);
      for (let i = 0; i < n && sparks.length < SPARK_MAX; i++) {
        const a = (i / n) * 6.283 + rnd(-0.04, 0.04), v = rnd(5, 11) * power;
        sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: rnd(0.012, 0.02), c: rainbow(i, n, shift) });
      }
      rings.push({ x, y, r: 6, a: 1, shift });
      const m = Math.round((small ? 26 : 40) * power);
      for (let i = 0; i < m && orns.length < ORN_MAX; i++) {
        const a = rnd(0, 6.283);
        orns.push(ornament(x, y, a, rnd(4, 15) * power, (a / 6.283) * 360 + shift));
      }
    };

    const drawOrnament = o => {
      ctx.save(); ctx.translate(o.x, o.y); ctx.rotate(o.r);
      const sq = Math.abs(Math.cos(o.flip)) * 0.8 + 0.2;   // 3D flip as it tumbles
      ctx.fillStyle = o.c; ctx.strokeStyle = o.c;
      const z = o.s;
      switch (o.shape) {
        case 'rect': ctx.fillRect(-z / 2, -z * 0.3 * sq, z, z * 0.6 * sq); break;
        case 'circle': ctx.beginPath(); ctx.ellipse(0, 0, z * 0.42, z * 0.42 * sq, 0, 0, 6.283); ctx.fill(); break;
        case 'tri': ctx.beginPath(); ctx.moveTo(0, -z * 0.5 * sq); ctx.lineTo(z * 0.5, z * 0.4 * sq); ctx.lineTo(-z * 0.5, z * 0.4 * sq); ctx.closePath(); ctx.fill(); break;
        case 'star': {
          ctx.beginPath();
          for (let k = 0; k < 10; k++) { const rr = k % 2 ? z * 0.24 : z * 0.6, aa = (k / 10) * 6.283 - 1.57; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr * sq); }
          ctx.closePath(); ctx.fill(); break;
        }
        case 'ribbon': {  // a wavy curled ribbon
          ctx.lineWidth = z * 0.28; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-z, 0);
          ctx.bezierCurveTo(-z * 0.4, -z * 0.8 * sq, z * 0.4, z * 0.8 * sq, z, 0); ctx.stroke(); break;
        }
        default: {        // long serpentine streamer
          ctx.lineWidth = z * 0.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-z * 1.6, 0);
          for (let k = -3; k <= 3; k++) ctx.lineTo(k * z * 0.5, Math.sin(k + o.wob) * z * 0.35 * sq);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    // opening: a huge rainbow blast from the centre that reaches every edge, then random bursts all over
    burst(W / 2, H / 2, small ? 1.5 : 1.8);
    const t0 = performance.now();
    let nextBurst = 120;

    const frame = now => {
      const t = now - t0;
      ctx.clearRect(0, 0, W, H);
      // random rainbow bursts anywhere on screen: dense at first, calmer once the text is in
      if (t > nextBurst && t < DURATION - 1500) {
        burst(rnd(W * 0.06, W * 0.94), rnd(H * 0.06, H * 0.9), rnd(0.8, 1.2));
        nextBurst = t + (t < CAST_AT ? rnd(90, 170) : rnd(450, 800));
      }
      // ornaments keep raining from the top so the whole screen stays decorated
      if (t > 600 && t < DURATION - 1800 && orns.length < ORN_MAX && Math.random() < 0.5) {
        orns.push(ornament(rnd(0, W), -20, 1.57, rnd(1, 3), rnd(0, 360)));
      }

      ctx.globalCompositeOperation = 'lighter';
      // expanding rainbow glow rings
      for (let i = rings.length - 1; i >= 0; i--) {
        const g = rings[i];
        g.r += small ? 7 : 10; g.a -= 0.035;
        if (g.a <= 0) { rings.splice(i, 1); continue; }
        ctx.globalAlpha = g.a * 0.55; ctx.lineWidth = 6;
        ctx.strokeStyle = `hsl(${(g.shift + g.r) % 360} 100% 65%)`;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, 6.283); ctx.stroke();
      }
      // sparks as glowing streaks
      ctx.lineCap = 'round';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.px = p.x; p.py = p.y;
        p.x += p.vx; p.y += p.vy; p.vx *= 0.955; p.vy = p.vy * 0.955 + 0.08; p.life -= p.decay;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.strokeStyle = p.c; ctx.lineWidth = 3 * p.life + 1;
        ctx.beginPath(); ctx.moveTo(p.px - p.vx * 2, p.py - p.vy * 2); ctx.lineTo(p.x, p.y); ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
      // ornaments: fly out, then flutter down with air resistance and a little sway
      const fade = Math.min(1, (DURATION - t) / 1000);
      ctx.globalAlpha = fade;
      for (let i = orns.length - 1; i >= 0; i--) {
        const o = orns[i];
        o.vx *= 0.955; o.vy = o.vy * 0.955 + 0.16; o.wob += 0.09; o.flip += 0.12; o.r += o.vr;
        o.x += o.vx + Math.sin(o.wob) * 0.9; o.y += Math.min(o.vy, 4.2);
        if (o.y > H + 40) { orns.splice(i, 1); continue; }
        drawOrnament(o);
      }
      ctx.globalAlpha = 1;
      if (!done) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  };
})();
