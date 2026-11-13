/* seed.js - sample homes for the demo. All pictures are drawn on the fly (no image files),
   so the demo works offline. Replace them with real photos from the admin panel. */
(function () {
  'use strict';
  const RE = window.RE;
  const W = 1200, H = 750;

  const rng = (seed) => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const rgb = (h) => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
  const col = (a) => 'rgb(' + a.map((x) => Math.round(RE.clamp(x, 0, 255))).join(',') + ')';
  const shade = (h, k) => col(rgb(h).map((x) => (k >= 0 ? x + (255 - x) * k : x * (1 + k))));
  const rgba = (h, a) => { const c = rgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  const mkCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const toBlob = (c, q) => new Promise((r) => c.toBlob(r, 'image/jpeg', q || 0.82));
  const lin = (_, c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s) => g.addColorStop(s[0], s[1])); return g; };
  function poly(ctx, pts, fill) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function rr(ctx, x, y, w, h, r, fill) {
    r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function glow(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); }

  const PAL = [
    { wall: '#e8e3d9', floor: '#8b6b4a', accent: '#35506f', accent2: '#b98b52', warm: '#ffd08f', sky1: '#0d1830', sky2: '#e49a6a' },
    { wall: '#dfe3e8', floor: '#6f6a64', accent: '#2f3b4d', accent2: '#c0a36b', warm: '#ffe0a8', sky1: '#101a38', sky2: '#f0a77a' },
    { wall: '#eae4d6', floor: '#9a7a55', accent: '#46604f', accent2: '#c27b4e', warm: '#ffc987', sky1: '#12203a', sky2: '#e8a070' },
    { wall: '#e6e1da', floor: '#7d5f46', accent: '#6a4a3a', accent2: '#d1a45f', warm: '#ffd59a', sky1: '#161a36', sky2: '#ec9a74' },
    { wall: '#e3e6e6', floor: '#75716b', accent: '#3d4a5c', accent2: '#cf9f60', warm: '#ffd9a0', sky1: '#0e1a34', sky2: '#e9a273' },
  ];

  function label(ctx, txt) {
    ctx.save(); ctx.font = '600 15px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(txt || 'Sample image. Upload your own photos in Admin.', W - 18, H - 16); ctx.restore();
  }

  /* ----- a furnished room (rooms: living, bedroom, kitchen, bath, balcony) ----- */
  function drawRoom(ctx, kind, seed, pal, v) {
    const R = rng(seed * 97 + v * 13 + 5);
    ctx.save();
    if (v % 2 === 1) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const z = v % 3 === 2 ? 1.2 : 1; ctx.translate(W / 2, H * 0.8); ctx.scale(z, z); ctx.translate(-W / 2, -H * 0.8);
    const off = (((v * 37) % 5) - 2) * 24, bx0 = W * 0.2 + off, bx1 = W * 0.8 + off, by0 = H * 0.15, by1 = H * 0.66, bw = bx1 - bx0;
    if (kind === 'balcony') return drawTerrace(ctx, pal, R, v, z);

    poly(ctx, [[0, 0], [W, 0], [bx1, by0], [bx0, by0]], lin(0, ctx, 0, 0, 0, by0, [[0, shade(pal.wall, -0.3)], [1, shade(pal.wall, -0.08)]]));
    poly(ctx, [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], lin(0, ctx, bx0, 0, bx1, 0, [[0, shade(pal.wall, -0.1)], [0.5, shade(pal.wall, 0.02)], [1, shade(pal.wall, -0.12)]]));
    poly(ctx, [[0, 0], [bx0, by0], [bx0, by1], [0, H]], lin(0, ctx, 0, 0, bx0, 0, [[0, shade(pal.wall, -0.4)], [1, shade(pal.wall, -0.18)]]));
    poly(ctx, [[W, 0], [bx1, by0], [bx1, by1], [W, H]], lin(0, ctx, bx1, 0, W, 0, [[0, shade(pal.wall, -0.22)], [1, shade(pal.wall, -0.45)]]));
    poly(ctx, [[0, H], [bx0, by1], [bx1, by1], [W, H]], lin(0, ctx, 0, by1, 0, H, [[0, shade(pal.floor, -0.1)], [1, shade(pal.floor, -0.42)]]));
    ctx.strokeStyle = 'rgba(0,0,0,0.13)'; ctx.lineWidth = 1.4;
    for (let i = 0; i <= 16; i++) { ctx.beginPath(); ctx.moveTo((i * W) / 16, H); ctx.lineTo(bx0 + (bw * i) / 16, by1); ctx.stroke(); }
    for (let i = 1; i < 6; i++) { const y = by1 + (H - by1) * Math.pow(i / 6, 1.6); ctx.beginPath(); ctx.moveTo(((y - by1) / (H - by1)) * 0 + (bx0 * (H - y)) / (H - by1), y); ctx.lineTo(W - ((W - bx1) * (H - y)) / (H - by1), y); ctx.stroke(); }

    // window with a dusk view
    const wx = bx0 + bw * (kind === 'bath' ? 0.7 : 0.1), ww = bw * (kind === 'bath' ? 0.22 : 0.5), wy = by0 + 26, wh = by1 - by0 - 40;
    if (kind !== 'kitchen' || v % 2 === 0) {
      ctx.fillStyle = lin(0, ctx, 0, wy, 0, wy + wh, [[0, pal.sky1], [1, pal.sky2]]); ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = 'rgba(8,14,30,0.8)'; for (let i = 0; i < 9; i++) { const bw2 = 24 + R() * 40, bh = 20 + R() * 70; ctx.fillRect(wx + (i * ww) / 9 + R() * 6, wy + wh - bh, bw2, bh); }
      ctx.fillStyle = 'rgba(255,200,120,0.8)'; for (let i = 0; i < 26; i++) ctx.fillRect(wx + R() * ww, wy + wh - R() * 60, 3, 3);
      ctx.strokeStyle = shade(pal.wall, -0.5); ctx.lineWidth = 5; ctx.strokeRect(wx, wy, ww, wh);
      for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(wx + (ww * i) / 3, wy); ctx.lineTo(wx + (ww * i) / 3, wy + wh); ctx.stroke(); }
      poly(ctx, [[wx, by1], [wx + ww, by1], [wx + ww * 1.5, H], [wx - ww * 0.3, H]], rgba(pal.sky2, 0.1));
    }
    const S = { ctx, pal, R, bx0, bx1, by0, by1, bw };
    ({ living, bedroom, kitchen, bath })[kind](S);

    // warm lamp glow + vignette
    glow(ctx, W * 0.5, by0 + 12, 360, pal.warm, 0.22);
    ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,8,18,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }
  function pendant(c, x, y, pal, r) { c.strokeStyle = 'rgba(30,30,30,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, y); c.stroke(); glow(c, x, y + 10, r || 90, pal.warm, 0.55); rr(c, x - 22, y - 8, 44, 22, 10, pal.warm); }
  function plant(c, x, y, s) { rr(c, x - 16 * s, y - 30 * s, 32 * s, 34 * s, 5, '#4a3a30'); c.fillStyle = '#2f6a4a'; for (let i = 0; i < 7; i++) { c.beginPath(); c.ellipse(x + (i - 3) * 9 * s, y - 52 * s - Math.abs(i - 3) * -6 * s, 8 * s, 30 * s, (i - 3) * 0.28, 0, 7); c.fill(); } }
  function living(S) {
    const { ctx: c, pal, bx0, bx1, by0, by1, bw } = S, sx = bx0 + bw * 0.58;
    poly(c, [[bx0 + bw * 0.12, by1 + 40], [bx1 - bw * 0.02, by1 + 40], [bx1 + bw * 0.12, H - 20], [bx0 - bw * 0.04, H - 20]], rgba(pal.accent2, 0.32)); // rug
    rr(c, sx, by1 - 90, bw * 0.38, 84, 14, shade(pal.accent, -0.1)); rr(c, sx - 14, by1 - 30, bw * 0.38 + 28, 70, 18, pal.accent);
    [0, 1, 2].forEach((i) => rr(c, sx + 14 + i * bw * 0.115, by1 - 66, bw * 0.1, 56, 12, i === 1 ? pal.accent2 : shade(pal.accent, 0.18)));
    rr(c, bx0 + bw * 0.28, by1 + 62, bw * 0.34, 40, 8, shade(pal.floor, -0.25)); rr(c, bx0 + bw * 0.3, by1 + 56, bw * 0.3, 14, 5, '#e9dcc3');
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(bx0 + bw * 0.31, by1 + 102, 10, 26); c.fillRect(bx0 + bw * 0.58, by1 + 102, 10, 26);
    plant(c, bx0 + 34, by1 + 10, 1.5); pendant(c, bx0 + bw * 0.46, by0 + 120, pal, 120);
    rr(c, bx0 + bw * 0.74, by0 + 36, bw * 0.16, bw * 0.2, 4, shade(pal.wall, -0.45)); rr(c, bx0 + bw * 0.755, by0 + 48, bw * 0.13, bw * 0.17, 2, pal.accent2);
  }
  function bedroom(S) {
    const { ctx: c, pal, R, bx0, by0, by1, bw } = S, x0 = bx0 + bw * 0.2, w = bw * 0.6;
    rr(c, x0 - 20, by0 + 70, w + 40, by1 - by0 - 20, 14, pal.accent);
    rr(c, x0 - 40, by1 - 70, w + 80, 170, 18, '#eee9df'); rr(c, x0 - 40, by1 + 36, w + 80, 70, 14, shade(pal.accent2, 0.1));
    [0, 1, 2].forEach((i) => rr(c, x0 + 10 + i * w * 0.31, by1 - 58, w * 0.26, 54, 14, i === 1 ? pal.accent2 : '#faf7f0'));
    [x0 - 130, x0 + w + 62].forEach((x) => { rr(c, x, by1 - 8, 76, 92, 8, shade(pal.floor, -0.15)); glow(c, x + 38, by1 - 46, 70, pal.warm, 0.6); rr(c, x + 24, by1 - 50, 28, 40, 12, pal.warm); });
    rr(c, x0 + w * 0.12, by0 + 18, w * 0.76, 38, 3, shade(pal.wall, -0.4)); plant(c, S.bx1 - 30, by1 + 24, 1.4); R();
  }
  function kitchen(S) {
    const { ctx: c, pal, bx0, bx1, by0, by1, bw } = S;
    rr(c, bx0, by0 + 20, bw, 88, 2, pal.accent); for (let i = 1; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(bx0 + (bw * i) / 6, by0 + 20, 2, 88); }
    c.fillStyle = shade(pal.wall, -0.2); c.fillRect(bx0, by0 + 108, bw, by1 - by0 - 200);
    c.strokeStyle = 'rgba(0,0,0,0.12)'; for (let x = bx0; x < bx1; x += 40) { c.beginPath(); c.moveTo(x, by0 + 108); c.lineTo(x, by1 - 92); c.stroke(); }
    rr(c, bx0, by1 - 92, bw, 16, 2, '#e9e4dc'); rr(c, bx0, by1 - 76, bw, 76, 2, shade(pal.accent, -0.1));
    rr(c, bx0 + bw * 0.4, by0 + 18, bw * 0.2, 54, 8, '#9aa0aa');
    rr(c, bx0 + bw * 0.06, by1 + 50, bw * 0.88, 30, 6, '#efeae1'); rr(c, bx0 + bw * 0.08, by1 + 80, bw * 0.84, 118, 8, pal.accent);
    [0.18, 0.5, 0.82].forEach((f) => { c.fillStyle = '#d9d2c4'; c.fillRect(bx0 + bw * f - 4, by1 + 150, 8, 60); rr(c, bx0 + bw * f - 28, by1 + 128, 56, 18, 9, '#2b2e36'); pendant(c, bx0 + bw * f, by0 + 150, pal, 70); });
  }
  function bath(S) {
    const { ctx: c, pal, bx0, bx1, by0, by1, bw } = S;
    c.strokeStyle = 'rgba(0,0,0,0.14)'; for (let x = bx0; x < bx1; x += 46) { c.beginPath(); c.moveTo(x, by0); c.lineTo(x, by1); c.stroke(); } for (let y = by0; y < by1; y += 46) { c.beginPath(); c.moveTo(bx0, y); c.lineTo(bx1, y); c.stroke(); }
    rr(c, bx0 + bw * 0.1, by0 + 48, bw * 0.38, 210, 12, '#d9e6ee'); glow(c, bx0 + bw * 0.29, by0 + 150, 160, pal.warm, 0.3);
    rr(c, bx0 + bw * 0.06, by1 - 40, bw * 0.46, 70, 10, '#f3f0ea'); rr(c, bx0 + bw * 0.2, by1 - 54, bw * 0.18, 22, 10, '#cfd8de');
    c.fillStyle = '#b9c3cc'; c.fillRect(bx0 + bw * 0.29 - 3, by1 - 100, 6, 50);
    c.fillStyle = '#f6f4ef'; c.beginPath(); c.ellipse(bx0 + bw * 0.6, by1 + 98, bw * 0.3, 62, 0, 0, 7); c.fill();
    c.fillStyle = '#dfe6ea'; c.beginPath(); c.ellipse(bx0 + bw * 0.6, by1 + 94, bw * 0.26, 46, 0, 0, 7); c.fill(); plant(c, bx1 - 20, by1 + 40, 1.2);
  }
  function drawTerrace(ctx, pal, R, v) {
    ctx.fillStyle = lin(0, ctx, 0, 0, 0, H * 0.62, [[0, pal.sky1], [0.7, '#34437a'], [1, pal.sky2]]); ctx.fillRect(-W, -H, W * 3, H * 3);
    glow(ctx, W * (0.3 + 0.1 * (v % 3)), H * 0.55, 380, pal.sky2, 0.5);
    ctx.fillStyle = 'rgba(10,16,34,0.85)'; for (let i = 0; i < 40; i++) { const bw = 30 + R() * 50, bh = 40 + R() * 190; ctx.fillRect(i * 32 - 20, H * 0.62 - bh, bw, bh); }
    ctx.fillStyle = 'rgba(255,205,130,0.85)'; for (let i = 0; i < 160; i++) ctx.fillRect(R() * W, H * 0.62 - R() * 150, 3, 4);
    poly(ctx, [[0, H * 0.62], [W, H * 0.62], [W, H], [0, H]], lin(0, ctx, 0, H * 0.62, 0, H, [[0, shade(pal.floor, -0.2)], [1, shade(pal.floor, -0.55)]]));
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i <= 20; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + (i - 10) * 20, H * 0.62); ctx.lineTo((i * W) / 20, H); ctx.stroke(); }
    ctx.fillStyle = 'rgba(190,215,235,0.22)'; ctx.fillRect(0, H * 0.5, W, H * 0.12); ctx.strokeStyle = 'rgba(230,240,250,0.7)'; ctx.lineWidth = 4; ctx.strokeRect(-4, H * 0.5, W + 8, H * 0.12);
    [0.2, 0.62].forEach((f) => { rr(ctx, W * f, H * 0.74, 250, 58, 12, '#efe9dd'); rr(ctx, W * f + 170, H * 0.69, 80, 52, 14, '#faf6ee'); });
    ctx.fillStyle = 'rgba(255,215,150,1)'; for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc(60 + i * 80, 40 + Math.sin(i) * 18, 5, 0, 7); ctx.fill(); glow(ctx, 60 + i * 80, 40 + Math.sin(i) * 18, 34, pal.warm, 0.5); }
    ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,8,18,0.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  }

  /* ----- outside of a home at dusk ----- */
  function drawExterior(ctx, seed, pal, v) {
    const R = rng(seed * 31 + v * 7 + 3);
    ctx.fillStyle = lin(0, ctx, 0, 0, 0, H * 0.7, [[0, pal.sky1], [0.55, '#33427a'], [1, pal.sky2]]); ctx.fillRect(0, 0, W, H);
    glow(ctx, W * (0.2 + 0.25 * (v % 3)), H * 0.62, 460, pal.sky2, 0.55);
    for (let l = 0; l < 2; l++) { ctx.fillStyle = l ? 'rgba(14,24,48,0.95)' : 'rgba(40,52,92,0.8)'; ctx.beginPath(); ctx.moveTo(0, H); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * (0.56 + l * 0.04) - 40 * Math.sin(x / (130 + l * 60) + seed + l * 2) - 26 * Math.sin(x / 57 + l)); ctx.lineTo(W, H); ctx.fill(); }
    ctx.fillStyle = lin(0, ctx, 0, H * 0.62, 0, H, [[0, '#26402f'], [1, '#0f1d17']]); ctx.fillRect(0, H * 0.64, W, H);
    const sc = 1 + (v % 3) * 0.08, cx = W * (0.46 + ((v % 2) ? 0.04 : -0.03)), base = H * 0.68;
    ctx.save(); ctx.translate(cx, base); ctx.scale(sc, sc);
    const gw = 540 + R() * 120, gh = 120;
    rr(ctx, -gw / 2, -gh, gw, gh, 2, pal.wall); rr(ctx, -gw / 2 + 80, -gh - 108, gw * 0.62, 108, 2, shade(pal.accent, -0.55));
    rr(ctx, -gw / 2 - 30, -gh - 8, gw + 60, 12, 2, '#f1ede4'); rr(ctx, -gw / 2 + 60, -gh - 116, gw * 0.62 + 40, 10, 2, '#f1ede4');
    ctx.fillStyle = pal.warm; for (let i = 0; i < 5; i++) { ctx.globalAlpha = 0.5 + R() * 0.5; ctx.fillRect(-gw / 2 + 24 + i * (gw / 5.2), -gh + 24, gw / 6.4, gh - 40); } ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,205,130,0.9)'; ctx.fillRect(-gw / 2 + 100, -gh - 86, gw * 0.5, 64);
    for (let i = 1; i < 6; i++) { ctx.fillStyle = 'rgba(30,34,44,0.9)'; ctx.fillRect(-gw / 2 + 100 + i * gw * 0.083, -gh - 86, 3, 64); }
    glow(ctx, 0, -gh / 2, 340, pal.warm, 0.28);
    ctx.restore();
    poly(ctx, [[W * 0.5, H * 0.72], [W * 0.98, H * 0.72], [W, H * 0.88], [W * 0.56, H * 0.88]], lin(0, ctx, 0, H * 0.72, 0, H * 0.88, [[0, '#1b8aa0'], [1, '#0d4a62']]));
    glow(ctx, W * 0.74, H * 0.78, 220, '#4de0ff', 0.25);
    [[0.05, 1.5], [0.14, 1.0], [0.9, 1.35], [0.97, 1.8]].forEach((t) => { const x = W * t[0], s = t[1]; ctx.fillStyle = '#10261b'; ctx.beginPath(); ctx.moveTo(x, H * 0.9 - 250 * s); ctx.lineTo(x + 52 * s, H * 0.9); ctx.lineTo(x - 52 * s, H * 0.9); ctx.fill(); });
  }

  /* ----- 360 panorama (equirectangular, 2:1) ----- */
  function drawPano(c) {
    const w = c.width, h = c.height, g = c.getContext('2d'), TAU = Math.PI * 2;
    g.fillStyle = lin(0, g, 0, 0, 0, h / 2, [[0, '#0b1430'], [0.6, '#33427a'], [1, '#e49a6a']]); g.fillRect(0, 0, w, h / 2);
    glow(g, w * 0.3, h * 0.47, w * 0.2, '#ffb080', 0.7);
    g.fillStyle = 'rgba(40,52,92,0.85)'; g.beginPath(); g.moveTo(0, h / 2); for (let x = 0; x <= w; x += 8) g.lineTo(x, h / 2 - 34 - 30 * Math.sin((TAU * 3 * x) / w + 1) - 18 * Math.sin((TAU * 7 * x) / w) - 10 * Math.sin((TAU * 13 * x) / w + 2)); g.lineTo(w, h / 2); g.fill();
    const R = rng(21); for (let i = 0; i < 10; i++) { const x = (i / 10) * w + R() * 60, bw = 90 + R() * 80; g.fillStyle = '#10182c'; g.fillRect(x, h / 2 - 46, bw, 46); g.fillStyle = 'rgba(255,205,130,0.9)'; for (let k = 0; k < 4; k++) g.fillRect(x + 10 + k * 20, h / 2 - 30, 12, 10); }
    g.fillStyle = lin(0, g, 0, h / 2, 0, h, [[0, '#1d3a2d'], [0.5, '#23323a'], [1, '#0a0f14']]); g.fillRect(0, h / 2, w, h / 2);
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 2; for (let i = 0; i < 36; i++) { g.beginPath(); g.moveTo((i * w) / 36, h / 2); g.lineTo((i * w) / 36, h); g.stroke(); }
    for (let k = 1; k < 7; k++) { const y = h / 2 + (h / 2) * Math.pow(k / 7, 1.2); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.font = '700 ' + h * 0.05 + 'px system-ui, sans-serif'; g.textAlign = 'center';
    [['FRONT', 0.5], ['RIGHT', 0.75], ['BACK', 0], ['BACK', 1], ['LEFT', 0.25]].forEach((t) => g.fillText(t[0], t[1] * w, h / 2 - 70));
    g.font = '600 ' + h * 0.03 + 'px system-ui, sans-serif'; g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillText('Sample 360 view. Upload your own panorama in Admin.', w * 0.5, h * 0.62);
  }

  /* ----- sample homes ----- */
  const TXT = {
    villa: 'A single-storey-feel villa that opens to a private pool and lawn. Floor-to-ceiling glass in the living room, a timber-screened upper floor with a master suite, and an outdoor deck that works for dinners or a quiet morning.',
    review: 'First impression: the light. The living room faces west, so the glass wall fills with warm light at the end of the day, and the double-height ceiling keeps it from feeling heavy.\n\nWhat we liked: the pool deck is properly private, the kitchen has a service door to the side so guests never see the prep, and every bedroom has its own bathroom. Storage is generous.\n\nWorth knowing: the road to the plot is narrow for the last 300 metres, so large vehicles should park at the entrance. Monsoon drainage has been handled well, and the plot has not flooded in the last three seasons.',
  };
  function defs() {
    const mk = (o) => Object.assign(RE.blankProperty(), o);
    return [
      mk({ id: 'aurelia-villa', status: 'sale', featured: true, type: 'Villa', title: 'Aurelia Villa', tagline: 'Pool-facing 5 BHK villa, ten minutes from Kihim Beach', price: 85000000, city: 'Alibaug', locality: 'Kihim Beach', address: 'Plot 14, Kihim Beach Road, Alibaug, Maharashtra 402201', map: { input: '18.7156, 72.8785', lat: 18.7156, lng: 72.8785, embed: '' }, bhk: 5, bedrooms: 5, bathrooms: 6, area: 6200, floors: 2, parking: 4, facing: 'South-west', year: 'Ready to move', amenities: ['Private pool', 'Home theatre', 'Lift', 'Solar water heating', '24x7 security', 'Landscaped garden', 'Smart-home wiring', 'EV charging'], description: TXT.villa, review: TXT.review, _rooms: [['Exterior', 'ext', 3], ['Living room', 'living', 4], ['Master bedroom', 'bedroom', 3], ['Kitchen', 'kitchen', 3], ['Bathroom', 'bath', 2]], _pal: 0, _spin: true }),
      mk({ id: 'marina-crest-penthouse', status: 'sale', featured: true, type: 'Penthouse', title: 'Marina Crest Penthouse', tagline: 'Sea-facing 4 BHK on the top two floors, with a private terrace', price: 142000000, city: 'Mumbai', locality: 'Bandra West', address: 'Marina Crest, Carter Road, Bandra West, Mumbai 400050', map: { input: '19.0544, 72.8206', lat: 19.0544, lng: 72.8206, embed: '' }, bhk: 4, bedrooms: 4, bathrooms: 5, area: 4100, floors: 2, parking: 3, facing: 'West, sea view', year: 'Possession Dec 2026', amenities: ['Private terrace', 'Sea view', 'Concierge', 'Gym and spa', 'Podium garden', 'Visitor parking', 'Power backup'], description: 'Two floors at the top of a boutique tower, with a wraparound terrace that looks straight at the Arabian Sea. The living room is 32 feet long and the kitchen has a separate service entry.', review: 'The terrace is the reason to buy this home. At sunset the whole living area turns gold, and the glass railing keeps the view clear from the sofa.\n\nThe layout is practical: four bedrooms on the lower level, a family lounge and the terrace on top. Sound insulation is better than most towers on this stretch.\n\nPossession is planned for December 2026. Ask for the occupancy certificate timeline in writing.', _rooms: [['Exterior', 'ext', 2], ['Living room', 'living', 3], ['Bedroom', 'bedroom', 2], ['Terrace', 'balcony', 2], ['Kitchen', 'kitchen', 2]], _pal: 1, _spin: true }),
      mk({ id: 'palm-grove-residence', status: 'sale', featured: false, type: 'Independent house', title: 'Palm Grove Residence', tagline: '3 BHK house with a courtyard garden in a gated lane', price: 23500000, city: 'Bengaluru', locality: 'Whitefield', address: '14 Palm Grove Lane, Whitefield, Bengaluru 560066', map: { input: '12.9698, 77.7499', lat: 12.9698, lng: 77.7499, embed: '' }, bhk: 3, bedrooms: 3, bathrooms: 3, area: 2400, floors: 2, parking: 2, facing: 'East', year: '2 years old', amenities: ['Courtyard garden', 'Rainwater harvesting', 'Gated lane', 'Solar panels', 'Covered parking'], description: 'A calm east-facing house on a gated lane, with a courtyard garden that brings morning light into the dining area. Ten minutes from the ITPL tech park.', review: 'Compact but well planned. The courtyard does the work of a much larger plot, and the first-floor study is quiet enough for calls.\n\nThe kitchen is on the small side for a family of five. Everything else is easy to live with.', _rooms: [['Exterior', 'ext', 2], ['Living room', 'living', 2], ['Bedroom', 'bedroom', 2], ['Kitchen', 'kitchen', 2]], _pal: 2 }),
      mk({ id: 'lakeside-courtyard-home', status: 'rent', featured: false, type: 'Villa', title: 'Lakeside Courtyard Home', tagline: 'Furnished 4 BHK near Fateh Sagar, with lake-facing balcony', price: 180000, priceNote: 'Furnished, 11 month lease', city: 'Udaipur', locality: 'Fateh Sagar Road', address: '8 Lake View Marg, Fateh Sagar Road, Udaipur 313001', map: { input: '24.6016, 73.6798', lat: 24.6016, lng: 73.6798, embed: '' }, bhk: 4, bedrooms: 4, bathrooms: 4, area: 3600, floors: 2, parking: 2, facing: 'North-east, lake view', year: 'Fully furnished', amenities: ['Lake view', 'Courtyard', 'Furnished', 'Caretaker', 'Wi-Fi', 'Power backup'], description: 'A traditional courtyard house, updated inside. Furnished with local craftwork, a caretaker on site, and a balcony that looks at Fateh Sagar lake.', review: 'This is the kind of home people extend their stay for. Evenings on the balcony are the highlight.\n\nThe lease is 11 months, furnished. Deposit is three months of rent.', _rooms: [['Exterior', 'ext', 2], ['Living room', 'living', 2], ['Bedroom', 'bedroom', 2], ['Balcony', 'balcony', 2]], _pal: 3 }),
      mk({ id: 'sector-54-skyline-apartment', status: 'rent', featured: false, type: 'Apartment', title: 'Sector 54 Skyline Apartment', tagline: 'High-floor 3 BHK on Golf Course Road, semi-furnished', price: 95000, priceNote: 'Semi-furnished', city: 'Gurugram', locality: 'Golf Course Road', address: 'Tower C, Skyline Heights, Sector 54, Gurugram 122011', map: { input: '28.4336, 77.1006', lat: 28.4336, lng: 77.1006, embed: '' }, bhk: 3, bedrooms: 3, bathrooms: 3, area: 2100, floors: 1, parking: 2, facing: 'North', year: '4 years old', amenities: ['Clubhouse', 'Pool', 'Gym', 'Metro nearby', '24x7 security', 'Power backup'], description: 'A 21st-floor apartment on Golf Course Road with a clubhouse downstairs and the metro a short walk away. Semi-furnished with wardrobes, ACs and a modular kitchen.', review: 'Easy to move into: ACs, wardrobes and kitchen are done, so you bring furniture and go. The high floor keeps road noise away.', _rooms: [['Exterior', 'ext', 1], ['Living room', 'living', 2], ['Bedroom', 'bedroom', 2], ['Kitchen', 'kitchen', 1]], _pal: 4 }),
    ];
  }

  async function renderTo(kind, seed, pal, v) {
    const c = mkCanvas(W, H), ctx = c.getContext('2d');
    if (kind === 'ext') drawExterior(ctx, seed, pal, v); else drawRoom(ctx, kind, seed, pal, v);
    label(ctx);
    return toBlob(c, 0.8);
  }
  const tick = () => new Promise((r) => setTimeout(r, 0));

  RE.seed = {
    async run(store, onProgress) {
      const list = defs();
      const total = list.reduce((n, d) => n + d._rooms.reduce((m, r) => m + r[2], 0), 0);
      let done = 0; const step = (msg) => { done++; if (onProgress) onProgress(done / total, msg); };

      for (const d of list) {
        const pal = PAL[d._pal], seed = list.indexOf(d) + 1;
        d.rooms = [];
        for (const rm of d._rooms) {
          const room = { id: RE.uid('room'), name: rm[0], photos: [] };
          for (let v = 0; v < rm[2]; v++) {
            const b = await renderTo(rm[1], seed, pal, v + (rm[1] === 'ext' ? 0 : 1));
            room.photos.push(await store.putMedia(b, { name: RE.slug(rm[0]) + '-' + (v + 1) + '.jpg' }));
            step('Photographing ' + d.title); await tick();
          }
          d.rooms.push(room);
        }
        d.cover = d.rooms[0].photos[0];
        delete d._rooms; delete d._pal; delete d._spin;
        d.createdAt = Date.now() - list.indexOf(d) * 1000;
        await store.saveProp(d);
      }
      if (onProgress) onProgress(1, 'Ready');
      setTimeout(() => RE.seed.addTour(store).then(() => RE.seed.addVideo(store)).catch(() => {}), 2500);
    },

    /* Runs after the site is already showing: the sample 3D walk-around (24 frames of the villa) and a 360 panorama. */
    async addTour(store) {
      const targets = ['aurelia-villa', 'marina-crest-penthouse'];
      if (targets.every((id) => { const p = store.getProp(id); return !p || (p.spin && p.spin.length); })) return;
      const cv = mkCanvas(800, 500), house = RE.house.create(cv, { interactive: false, fixed: true, preserve: true, autoRotate: false, pitch: 0.17, dist: 34 });
      const spin = [];
      for (let i = 0; i < 24; i++) {
        house.view.yaw = (i / 24) * Math.PI * 2 + 0.2; house.draw(0);
        spin.push(await store.putMedia(await toBlob(cv, 0.8), { name: 'walkaround-' + (i + 1) + '.jpg' })); await tick();
      }
      house.destroy();
      const pc = mkCanvas(2048, 1024); drawPano(pc);
      const pano = await store.putMedia(await toBlob(pc, 0.82), { name: 'panorama.jpg' });
      for (const id of targets) {
        const p = store.getProp(id);
        if (p && !(p.spin && p.spin.length)) { const q = RE.clone(p); q.spin = spin.slice(); q.pano = pano; await store.saveProp(q); }
      }
      RE.seedReady = true;
    },

    /* Best effort: film a short orbit of the 3D villa as the sample "home tour" video. */
    async addVideo(store) {
      if (!window.MediaRecorder) return;
      const type = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t));
      if (!type) return;
      const cv = mkCanvas(960, 540), house = RE.house.create(cv, { interactive: false, fixed: true, preserve: true, autoRotate: false, pitch: 0.16, dist: 38 });
      const stream = cv.captureStream(30), rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2500000 }), chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const t0 = performance.now(), DUR = 6000;
      const loop = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / DUR);
        house.view.yaw = 0.2 + k * Math.PI * 1.2; house.view.dist = 40 - k * 9; house.view.pitch = 0.1 + 0.12 * Math.sin(k * Math.PI);
        house.draw((performance.now() - t0) / 1000);
      }, 33);
      rec.start(200);
      await new Promise((r) => setTimeout(r, DUR + 150));
      await new Promise((r) => { rec.onstop = r; rec.stop(); });
      clearInterval(loop); house.destroy();
      if (!chunks.length) return;
      const ref = await store.putMedia(new Blob(chunks, { type: 'video/webm' }), { name: 'sample-home-tour.webm' });
      const p = store.getProp('aurelia-villa');
      if (p && !(p.video && (p.video.ref || p.video.url))) { const q = RE.clone(p); q.video = { kind: 'file', url: '', ref }; await store.saveProp(q); }
    },
  };
})();
