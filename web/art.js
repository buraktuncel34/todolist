/* Günlük — background scenes (flat SVG). They sit in the corners / along the bottom so the task area stays clean. */
'use strict';

(function () {
  const svg = (vb, body, par = 'xMidYMid meet') => `<svg viewBox="${vb}" preserveAspectRatio="${par}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const tr = body => `<div class="art art-tr">${svg('0 0 400 400', body, 'xMaxYMin meet')}</div>`;
  const tl = body => `<div class="art art-tl">${svg('0 0 400 250', body, 'xMinYMin meet')}</div>`;
  const bottom = body => `<div class="art art-bottom">${svg('0 0 1440 320', body, 'xMidYMax slice')}</div>`;
  const full = body => `<div class="art art-full">${svg('0 0 1440 900', body, 'xMidYMid slice')}</div>`;

  // deterministic pseudo-random so the scene is the same on every device
  const rng = seed => () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

  function palm(x, y, scale, trunk, leaf) {
    const leafPath = 'M0 0 Q -60 -48 -132 -18 Q -96 -30 -64 -14 Q -34 -6 0 0Z';
    const angles = [-18, 18, 52, 96, 140, 176, 212, -52];
    return `<g transform="translate(${x} ${y}) scale(${scale})">
      <path d="M92 250 C 70 170 40 100 0 0" fill="none" stroke="${trunk}" stroke-width="15" stroke-linecap="round"/>
      <path d="M92 250 C 70 170 40 100 0 0" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="15" stroke-dasharray="3 15"/>
      ${angles.map((a, i) => `<path d="${leafPath}" fill="${leaf[i % leaf.length]}" transform="rotate(${a})"/>`).join('')}
      <circle cx="4" cy="8" r="7" fill="#7a5638"/><circle cx="-8" cy="4" r="6" fill="#6b4a30"/>
    </g>`;
  }

  function pine(x, base, h, color) {
    const R = Math.round, w = h * 0.46;
    let d = `M${R(x - h * 0.03)} ${R(base)}h${R(h * 0.06)}v${-R(h * 0.14)}h${-R(h * 0.06)}Z`;
    for (let k = 0; k < 3; k++) {
      const top = base - h + k * h * 0.24, bot = top + h * 0.46, half = (w / 2) * (0.62 + k * 0.22);
      d += `M${R(x - half)} ${R(bot)}L${R(x)} ${R(top)}L${R(x + half)} ${R(bot)}Z`;
    }
    return `<path d="${d}" fill="${color}"/>`;
  }

  function forestRow(color, base, minH, varH, step, seed) {
    const r = rng(seed);
    let s = '';
    for (let x = -30; x < 1480; x += step * (0.7 + r() * 0.6)) s += pine(x, base, minH + r() * varH, color);
    return s + `<rect x="0" y="${base - 2}" width="1440" height="${322 - base}" fill="${color}"/>`;
  }

  function cloud(x, y, s, fill) {
    return `<g transform="translate(${x} ${y}) scale(${s})" fill="${fill}">
      <ellipse cx="0" cy="0" rx="58" ry="30"/><ellipse cx="46" cy="-14" rx="44" ry="34"/><ellipse cx="96" cy="2" rx="50" ry="26"/>
      <rect x="-40" y="0" width="170" height="26" rx="13"/></g>`;
  }

  function stars(n, seed, w, h) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      const rad = r() < 0.15 ? 2.2 : 1.2;
      s += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${rad}" fill="#fff" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
    }
    return s;
  }

  const SCENES = [
    { k: 'none', name: 'Yok', html: '' },
    {
      k: 'palmiye', name: 'Palmiye',
      html: tr(`<circle cx="150" cy="120" r="52" fill="#ffd58a" opacity=".7"/>
          <path d="M70 70 q 9 -9 18 0 q 9 -9 18 0 M110 40 q 7 -7 14 0 q 7 -7 14 0" fill="none" stroke="#7d8aa6" stroke-width="2.5" stroke-linecap="round" opacity=".6"/>
          ${palm(318, 150, 1.05, '#9a7651', ['#3f9d6f', '#2f8a5e', '#4cae7c'])}
          ${palm(392, 230, 0.75, '#8a6948', ['#5bb98a', '#3f9d6f'])}`) +
        bottom(`<path d="M0 270 C 240 250 480 285 720 268 S 1200 250 1440 266 V320 H0Z" fill="#9fd6e6" opacity=".55"/>
          <path d="M0 292 C 300 278 560 302 820 290 S 1240 280 1440 292 V320 H0Z" fill="#f3e2bd" opacity=".8"/>`),
    },
    {
      k: 'daglar', name: 'Dağlar',
      html: bottom(`<circle cx="1110" cy="120" r="62" fill="#ffd9a8" opacity=".75"/>
          <path d="M0 220 L180 118 L320 200 L480 86 L640 190 L800 108 L980 212 L1140 96 L1300 190 L1440 136 V320 H0Z" fill="#cdd8f3"/>
          <path d="M480 86 L520 112 L500 116 L470 104Z M1140 96 L1180 124 L1158 126 L1128 112Z" fill="#fff" opacity=".8"/>
          <path d="M0 262 L220 168 L400 252 L560 158 L760 262 L940 178 L1120 262 L1300 188 L1440 242 V320 H0Z" fill="#a8b9e8"/>
          <path d="M0 300 C 240 240 420 300 640 270 S 1040 232 1240 280 S 1400 270 1440 280 V320 H0Z" fill="#8199d9"/>`),
    },
    {
      k: 'sahil', name: 'Sahil',
      html: tr(`<circle cx="280" cy="110" r="58" fill="#ffd27a" opacity=".75"/>${cloud(70, 90, 0.8, '#ffffff')}`) +
        bottom(`<path d="M0 200 C 120 182 240 218 360 200 S 600 182 720 200 S 960 218 1080 200 S 1320 182 1440 200 V320 H0Z" fill="#9ed8ec"/>
          <path d="M0 236 C 140 220 280 252 420 236 S 700 220 840 236 S 1120 252 1260 236 S 1400 226 1440 232 V320 H0Z" fill="#6fc0de"/>
          <path d="M0 270 C 200 260 420 286 640 272 S 1060 256 1440 276 V320 H0Z" fill="#f1dcae"/>
          <path d="M200 236 q 20 -10 40 0 M820 228 q 18 -9 36 0" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>`),
    },
    {
      k: 'orman', name: 'Çam ormanı',
      html: tl(`${cloud(70, 70, 0.7, '#e3ecf5')}${cloud(230, 120, 0.5, '#eaf1f8')}`) +
        bottom(`${forestRow('#a9d2bd', 250, 90, 70, 46, 7)}${forestRow('#6fae8f', 282, 80, 60, 40, 19)}${forestRow('#3f7d63', 312, 70, 50, 34, 31)}`),
    },
    {
      k: 'gunbatimi', name: 'Gün batımı',
      html: `<div class="art art-full">${svg('0 0 1440 900', `<defs><linearGradient id="gb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffb38a" stop-opacity="0"/><stop offset="1" stop-color="#ffb38a" stop-opacity=".22"/></linearGradient></defs>
            <rect width="1440" height="900" fill="url(#gb)"/>`, 'none')}</div>` +
        bottom(`<circle cx="1040" cy="236" r="110" fill="#ffc27a" opacity=".9"/>
          <path d="M0 236 C 220 176 420 236 620 206 S 1000 176 1200 226 S 1400 206 1440 216 V320 H0Z" fill="#f4a98c"/>
          <path d="M0 270 C 260 230 520 286 760 256 S 1180 236 1440 266 V320 H0Z" fill="#e2848a"/>
          <path d="M0 300 C 300 280 600 310 900 292 S 1300 286 1440 298 V320 H0Z" fill="#b8698c"/>`),
    },
    {
      k: 'gece', name: 'Gece',
      html: full(stars(70, 11, 1440, 520)) +
        tr(`<defs><mask id="moon"><rect width="400" height="400" fill="#fff"/><circle cx="296" cy="96" r="46" fill="#000"/></mask></defs>
          <circle cx="272" cy="110" r="50" fill="#fff3c4" mask="url(#moon)"/>`) +
        bottom(`<path d="M0 240 C 260 190 480 250 720 220 S 1180 190 1440 236 V320 H0Z" fill="#3b4a7a" opacity=".55"/>
          <path d="M0 282 C 300 250 600 296 900 268 S 1300 256 1440 276 V320 H0Z" fill="#26325c" opacity=".7"/>`),
    },
    {
      k: 'bulutlar', name: 'Bulutlar',
      html: tl(`${cloud(60, 70, 0.9, '#dfe9f6')}${cloud(220, 150, 0.6, '#e9f0f9')}`) +
        tr(`${cloud(170, 80, 0.85, '#dfe9f6')}${cloud(250, 190, 0.55, '#e9f0f9')}`) +
        bottom(`${cloud(160, 300, 1.4, '#e4edf8')}${cloud(620, 315, 1.8, '#dde8f5')}${cloud(1160, 300, 1.5, '#e4edf8')}`),
    },
    {
      k: 'col', name: 'Çöl',
      html: tr(`<circle cx="260" cy="120" r="60" fill="#ffcf6e" opacity=".75"/>`) +
        bottom(`<path d="M0 230 C 200 190 380 240 560 220 S 900 186 1100 226 S 1360 214 1440 222 V320 H0Z" fill="#f3d7a2"/>
          <path d="M0 276 C 260 244 520 290 780 262 S 1220 240 1440 270 V320 H0Z" fill="#e9bc76"/>
          <g fill="#5f9e6e" transform="translate(1180 160)">
            <rect x="-11" y="0" width="22" height="120" rx="11"/>
            <path d="M-11 66 h-22 a11 11 0 0 1 -11 -11 v-30 a11 11 0 0 1 22 0 v19 h11Z"/>
            <path d="M11 46 h20 a11 11 0 0 0 11 -11 v-24 a11 11 0 0 0 -22 0 v13 h-9Z"/>
          </g>`),
    },
  ];

  const THEMES = [
    { k: 'mavi', name: 'Mavi', c: ['#3563f0', '#7a4dff'] },
    { k: 'mor', name: 'Mor', c: ['#7c3aed', '#c026d3'] },
    { k: 'orman', name: 'Orman', c: ['#059669', '#0d9488'] },
    { k: 'okyanus', name: 'Okyanus', c: ['#0891b2', '#2563eb'] },
    { k: 'gunbatimi', name: 'Gün batımı', c: ['#ea580c', '#e11d48'] },
    { k: 'pembe', name: 'Pembe', c: ['#db2777', '#9333ea'] },
    { k: 'grafit', name: 'Grafit', c: ['#334155', '#0f172a'] },
  ];

  window.ART = { SCENES, THEMES };
})();
