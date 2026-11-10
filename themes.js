'use strict';
// Scenery and art for each world (theme), plus the enemy / hazard art that levels pick by name
// (see `kinds` in levels.js). Loaded after levels.js and before game.js; everything here only
// runs once the game is going, so it can use the helpers (R, disc, sprite, ...) from game.js.

// ---------------------------------------------------------------- shared banana art
// ---------- Drawing: bananas ----------
function bananaBody(cx, by, h, w, curve, body, dark, light) {
  body = body || '#ffd93b'; dark = dark || '#c99a14'; light = light || '#fff08a';
  let topOff = 0;
  for (let i = 0; i < h; i++) {
    const t = (i + 0.5) / h, sn = Math.sin(PI * t);
    const off = Math.round(curve * sn);
    const th = Math.max(2, Math.round(w * (0.38 + 0.62 * Math.pow(sn, 0.5))));
    const x0 = cx + off - Math.floor(th / 2), y = by - h + i;
    ctx.fillStyle = dark; ctx.fillRect(x0, y, th, 1);
    if (th >= 4) { ctx.fillStyle = body; ctx.fillRect(x0 + 1, y, th - 2, 1); }
    if (th >= 8) { ctx.fillStyle = light; ctx.fillRect(x0 + 1, y, 2, 1); }
    if (i === 0) topOff = off;
  }
  const s = Math.max(2, Math.round(w / 5));
  R(cx + topOff - Math.floor(s / 2), by - h - s, s, s + 1, '#6b4a16'); // stem
  R(cx - Math.floor(s / 2), by - s, s, s, '#4a3010'); // tip
}
function bananaOffAt(h, curve, t) { return Math.round(curve * Math.sin(PI * t)); }
const BANANA_ICON = [
  '......KK..', '.....YYK..', '....YYY...', '...YYYy...', '..YYYYy...', '..YYYY....', '..YYYYY...', '..YYYYYY..', '...YYYYYY.', '....KKKK..',
];
const BANANA_PAL = { Y: '#ffd93b', y: '#fff08a', K: '#7a4b12' };
const GOLD_PAL = { Y: '#ffc400', y: '#fff6a0', K: '#a86a00' };
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];

// Food icons (10x10 pixel sprites) for the recipe card, the arena crates and the golden pickup.
const SALAMI_ICON = [
  '.......SS.', '......KRRK', '.....KRwRK', '....KRRRRK', '...KRRwRK.', '..KRRRRK..', '.KRwRRK...', 'KRRRRK....', 'KRRK......', '.SS.......',
];
const GRAVY_ICON = [
  '..........', 'KK.KKKKK..', '.KGGGGGGK.', '.KgGGGGGKK', '..KwwwwwKK', '..KwwwwwK.', '...KwwwwKK', '...KbbbbK.', '....KKKK..', '..........',
];
const FOODS = {
  banana: { rows: BANANA_ICON, pal: BANANA_PAL, gold: GOLD_PAL },
  salami: { rows: SALAMI_ICON, pal: { R: '#c0443a', w: '#f3cdbd', K: '#6a231f', S: '#e8c878' }, gold: { R: '#ffc400', w: '#fff6a0', K: '#a86a00', S: '#fff6a0' } },
  gravy: { rows: GRAVY_ICON, pal: { G: '#8a4a1a', g: '#b0702a', w: '#ffffff', b: '#8fb8e8', K: '#34506f' }, gold: { G: '#ffc400', g: '#fff6a0', w: '#fff6d0', b: '#ffe070', K: '#a86a00' } },
};
function foodSprite(icon, x, y, gold) { const f = FOODS[icon]; sprite(x, y, f.rows, gold ? f.gold : f.pal); }

// ---------------------------------------------------------------- jungle (level 1) art
function drawMiniBanana(e) {
  if (!e.alive) { if (e.squish > 0) { const k = e.squish / 18; R(e.x - 7, e.y - 3 * k - 1, 14, Math.ceil(3 * k) + 1, '#ffd93b'); R(e.x - 7, e.y, 14, 1, '#c99a14'); } return; }
  const step = Math.floor(e.anim) % 2;
  R(e.x - 4, e.y - 2, 3, 2 + (step ? 0 : -1) + 1, '#4a3010'); R(e.x + 1, e.y - 2, 3, 2 + (step ? -1 : 0) + 1, '#4a3010');
  bananaBody(Math.round(e.x), e.y - 2, 16, 10, -3 * e.dir, null, null, null);
  const fx = Math.round(e.x) + e.dir * 1;
  const topOff = bananaOffAt(16, -3 * e.dir, 0.4);
  R(fx + topOff - 3, e.y - 12, 2, 3, '#2a1a22'); R(fx + topOff + 1, e.y - 12, 2, 3, '#2a1a22');
  R(fx + topOff - 3, e.y - 14, 3, 1, '#2a1a22'); R(fx + topOff + 1, e.y - 14, 3, 1, '#2a1a22'); // angry brows
  R(fx + topOff - 2, e.y - 7, 4, 1, '#7a2a2a');
}
function drawMonkey(m) {
  if (!m.alive) { if (m.squish > 0) { R(m.x - 7, m.y - 3, 14, 3, '#8a5a2b'); } return; }
  const f = m.face, x = m.x, y = m.y;
  ctx.save(); ctx.translate(x, y); ctx.scale(f, 1);
  R(-6, -2, 4, 2, '#5a3a1a'); R(2, -2, 4, 2, '#5a3a1a');
  R(-5, -10, 10, 8, '#8a5a2b'); R(-3, -8, 6, 6, '#c9894a');
  R(-4, -17, 9, 8, '#8a5a2b'); R(-2, -14, 6, 5, '#f1c9a0'); R(-6, -15, 2, 3, '#8a5a2b'); R(5, -15, 2, 3, '#8a5a2b');
  R(-1, -14, 1, 2, '#2a1a22'); R(2, -14, 1, 2, '#2a1a22'); R(0, -11, 3, 1, '#7a2a2a');
  R(-8, -9, 2, 6, '#8a5a2b'); // tail-ish / arm
  if (m.wind > 0) { R(4, -22 - Math.round(Math.sin(m.wind * 0.5)), 2, 7, '#8a5a2b'); R(3, -25, 4, 3, '#ffd93b'); } else { R(5, -9, 2, 5, '#8a5a2b'); }
  ctx.restore();
}
function drawPeel(x, y, rot, big) {
  const s = big ? 1.4 : 1;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(s, s);
  if (rot !== undefined) ctx.rotate(rot);
  R(-6, -2, 12, 3, '#f6d44a'); R(-6, 1, 12, 1, '#c99a14'); R(-8, -3, 3, 2, '#e8c030'); R(5, -4, 3, 2, '#e8c030'); R(-3, -3, 6, 1, '#fff08a'); R(-1, -5, 2, 2, '#e8c030');
  ctx.restore();
}
function drawDropCoconut(k) {
  if (k.state === 'gone') return;
  const sh = k.state === 'shake' ? Math.round(Math.sin(k.t * 1.2) * 1.5) : 0;
  const y = k.state === 'fall' ? k.y : 46;
  if (k.state !== 'fall') { // leafy cluster stays up in the tree
    disc(k.x + sh, 40, 8, '#2f8f3a'); disc(k.x - 6 + sh, 44, 5, '#3aa648'); disc(k.x + 6 + sh, 44, 5, '#3aa648');
  }
  disc(k.x + sh, y, 4, '#6b4423'); R(k.x + sh - 2, y - 2, 1, 1, '#9a6b3a'); R(k.x + sh - 1, y + 1, 2, 1, '#3e2410');
  if (k.state === 'shake' && k.t % 8 < 4) txtOutline('!', k.x - 1, 58, 9, '#fff', '#c33', 'center');
}
function jungleSky() {
  const bands = ['#7fd0ff', '#92d8ff', '#a8e0ff', '#c2eaff', '#dff3d8', '#fdf3b0'];
  const bh = Math.ceil(GROUND / bands.length);
  for (let i = 0; i < bands.length; i++) R(0, i * bh, W, bh + 1, bands[i]);
  // sun
  disc(262, 34, 17, '#fff4b0'); disc(262, 34, 12, '#ffe45e'); disc(262, 34, 9, '#fff08a');
  // clouds
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 190 + frame * 0.06 - camX * 0.08) % 760 + 760) % 760 - 80, cy = 14 + (i * 23) % 50;
    disc(cx, cy, 6, '#fff'); disc(cx + 9, cy + 2, 7, '#fff'); disc(cx + 19, cy + 3, 5, '#fff'); R(cx - 6, cy + 3, 30, 5, '#fff');
  }
}
function jungleFar() { // distant misty hills
  for (let x = 0; x < W; x += 2) {
    const wx = x + camX * 0.15;
    const h = 38 + Math.sin(wx * 0.021) * 14 + Math.sin(wx * 0.047 + 1) * 7;
    R(x, GROUND - h, 2, h, '#9fd8a8');
  }
  for (let x = 0; x < W; x += 2) {
    const wx = x + camX * 0.3;
    const h = 26 + Math.sin(wx * 0.03 + 2) * 11 + Math.sin(wx * 0.07) * 5;
    R(x, GROUND - h, 2, h, '#6fc07d');
  }
  // silhouette palms
  for (let i = -1; i < 8; i++) {
    const px = Math.round(i * 90 - (camX * 0.45 % 90) + 20);
    const ph = 60 + hash(i + Math.floor(camX * 0.45 / 90), 3) * 20;
    R(px, GROUND - ph, 3, ph, '#3f9a55');
    for (let k = 0; k < 7; k++) { const a = -PI * 0.9 + k * (PI * 0.8 / 6); for (let t = 3; t < 15; t += 2) R(px + 1 + Math.cos(a) * t, GROUND - ph + Math.sin(a) * t * 0.7 + t * t * 0.02, 3, 2, '#3f9a55'); }
  }
}
function jungleGround(a, b) {
  const x0 = Math.max(a, Math.floor(camX) - 4), x1 = Math.min(b, Math.floor(camX) + W + 4);
  if (x1 <= x0) return;
  R(x0, GROUND, x1 - x0, 30, '#8a5a2e');
  R(x0, GROUND + 4, x1 - x0, 26, '#7a4c26');
  for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) {
    for (let r = 0; r < 4; r++) {
      const hv = hash(x, r);
      if (hv < 0.45) R(x + hv * 8, GROUND + 7 + r * 6, 2, 2, hv < 0.2 ? '#a06a38' : '#5f3b1c');
    }
  }
  R(x0, GROUND - 1, x1 - x0, 5, '#46b04a'); R(x0, GROUND - 1, x1 - x0, 1, '#6fd36a'); R(x0, GROUND + 3, x1 - x0, 2, '#2f8f3a');
  for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) { const hv = hash(x, 77); R(x, GROUND + 5, 2, 2 + (hv * 3 | 0), '#2f8f3a'); if (hv > 0.7) R(x, GROUND - 3, 1, 2, '#6fd36a'); }
  if (a > x0 - 1 && a >= Math.floor(camX) - 4) { R(a, GROUND, 2, 30, '#5f3b1c'); }
  if (b < x1 + 1) { R(b - 2, GROUND, 2, 30, '#5f3b1c'); }
}
function junglePlat(p) {
  const [x, y, w] = p;
  R(x, y, w, 7, '#8a5a2e'); R(x, y, w, 2, '#a8743a'); R(x, y + 5, w, 2, '#6b4423');
  for (let i = 6; i < w - 4; i += 12) { R(x + i, y + 3, 4, 1, '#6b4423'); }
  R(x - 1, y + 1, 2, 5, '#6b4423'); R(x + w - 1, y + 1, 2, 5, '#6b4423');
  // leafy top
  for (let i = 0; i < w; i += 3) { const hv = hash(x + i, 4); R(x + i, y - 2 - (hv > 0.5 ? 1 : 0), 2, 3, hv > 0.3 ? '#3aa648' : '#46b04a'); }
  R(x, y - 1, w, 1, '#2f8f3a');
  // hanging vines
  for (let i = 8; i < w; i += 22) R(x + i, y + 7, 1, 4 + (hash(x + i, 8) * 5 | 0), '#2f8f3a');
}
function drawPalm(x, h, sway, tall) {
  for (let i = 0; i < h; i += 3) { const off = Math.round(Math.sin(i * 0.04 + x) * 2 + i * 0.03); R(x + off, GROUND - i - 3, 4, 3, i % 9 ? '#8a5a2e' : '#6b4423'); }
  const top = Math.round(Math.sin(h * 0.04 + x) * 2 + h * 0.03) + x + 2, ty = GROUND - h;
  for (let k = 0; k < 7; k++) {
    const a = -PI + k * (PI / 6), len = tall ? 24 : 18;
    for (let t = 2; t < len; t += 2) {
      const lx = top + Math.cos(a) * t, ly = ty + Math.sin(a) * t * 0.55 + t * t * 0.028 + Math.sin(frame * 0.03 + k) * sway * (t / len);
      R(lx - 1, ly, 4, 2, (k + t) % 3 ? '#2f8f3a' : '#3aa648');
    }
  }
  disc(top - 2, ty + 4, 3, '#6b4423'); disc(top + 3, ty + 5, 3, '#6b4423');
}

// ---------------------------------------------------------------- enemy art
function drawMiniSalami(e) { // an angry slice of salami with little boots
  const x = Math.round(e.x), y = Math.round(e.y);
  if (!e.alive) { if (e.squish > 0) { const k = e.squish / 18; R(x - 9, y - 3 * k - 1, 18, Math.ceil(3 * k) + 1, '#c0443a'); R(x - 9, y, 18, 1, '#8a2a26'); R(x - 4, y - 3 * k - 1, 2, 1, '#f3cdbd'); } return; }
  const step = Math.floor(e.anim) % 2;
  R(x - 5, y - 2 + (step ? 0 : -1), 3, 3, '#4a2c1a'); R(x + 2, y - 2 + (step ? -1 : 0), 3, 3, '#4a2c1a');
  const cy = y - 10;
  disc(x, cy, 8, '#7e2420'); disc(x, cy, 7, '#c0443a');
  R(x - 5, cy - 6, 4, 1, '#e0786a'); R(x - 6, cy - 5, 2, 1, '#e0786a');
  for (const [dx, dy] of [[-4, -3], [3, -5], [5, 0], [-5, 2], [1, 4], [-1, -6], [4, 4]]) R(x + dx, cy + dy, 2, 1, '#f3cdbd');
  const fx = x + e.dir;
  R(fx - 3, cy - 2, 2, 3, '#2a1a22'); R(fx + 2, cy - 2, 2, 3, '#2a1a22'); R(fx - 4, cy - 4, 3, 1, '#2a1a22'); R(fx + 2, cy - 4, 3, 1, '#2a1a22'); R(fx - 2, cy + 3, 5, 1, '#3a1010');
}
function drawMiniBlob(e) { // a lumpy gravy blob that hops when you get close
  const x = Math.round(e.x), y = Math.round(e.y - (e.z || 0));
  if (!e.alive) { if (e.squish > 0) { const k = e.squish / 18; R(x - 10, y - 2 * k - 1, 20, Math.ceil(2 * k) + 1, '#7a4418'); R(x - 12, y, 24, 1, '#5a3010'); } return; }
  const air = (e.z || 0) > 0, crouch = e.pre > 0;
  const h = air ? 17 : crouch ? 10 : 14 + (Math.floor(e.anim) % 2 ? 0 : -1), wm = air ? 7 : crouch ? 11 : 9;
  for (let i = 0; i < h; i++) {
    const t = (i + 0.5) / h, half = Math.max(2, Math.round(wm * Math.sqrt(1 - Math.pow(1 - t, 2))));
    R(x - half, y - h + i, half * 2, 1, '#4a2810'); R(x - half + 1, y - h + i, half * 2 - 2, 1, '#7a4418');
  }
  R(x - wm + 3, y - h + 3, 3, 2, '#b0702a'); R(x - wm + 3, y - h + 3, 1, 1, '#f0c080');
  R(x - 4, y - h + 5, 3, 3, '#fff'); R(x + 1, y - h + 5, 3, 3, '#fff');
  R(x - 3 + e.dir, y - h + 6, 2, 2, '#1d1018'); R(x + 2 + e.dir, y - h + 6, 2, 2, '#1d1018');
  R(x - 5, y - h + 4, 3, 1, '#1d1018'); R(x + 2, y - h + 4, 3, 1, '#1d1018');
  R(x - 2, y - h + 10, 5, 1, '#1d1018');
}
function drawCheese(x, y, rot) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot !== undefined) ctx.rotate(rot);
  R(-4, -3, 8, 6, '#ffd23a'); R(-4, -3, 8, 1, '#ffe97a'); R(-4, 2, 8, 1, '#c99a14'); R(-1, -1, 2, 2, '#c99a14'); R(2, 0, 1, 1, '#c99a14'); R(-3, 1, 1, 1, '#c99a14');
  ctx.restore();
}
function drawMouse(m) { // a mouse who throws cheese
  if (!m.alive) { if (m.squish > 0) R(m.x - 7, m.y - 3, 14, 3, '#8a8f9a'); return; }
  ctx.save(); ctx.translate(m.x, m.y); ctx.scale(m.face, 1);
  R(-9, -3, 4, 1, '#d9a7a7'); R(-11, -4, 3, 1, '#d9a7a7');
  R(-5, -2, 3, 2, '#5a5f6a'); R(2, -2, 3, 2, '#5a5f6a');
  R(-5, -9, 10, 8, '#9aa0ad'); R(-3, -7, 6, 6, '#d8dce6');
  R(-4, -15, 9, 7, '#9aa0ad'); disc(-3, -16, 3, '#9aa0ad'); disc(3, -16, 3, '#9aa0ad'); disc(-3, -16, 2, '#e9a7b4'); disc(3, -16, 2, '#e9a7b4');
  R(4, -11, 2, 2, '#e9a7b4'); R(-1, -12, 1, 2, '#1d1018'); R(2, -12, 1, 2, '#1d1018'); R(5, -9, 3, 1, '#d8dce6');
  if (m.wind > 0) { R(4, -22 - Math.round(Math.sin(m.wind * 0.5)), 2, 7, '#9aa0ad'); drawCheese(5, -26); } else { R(5, -9, 2, 5, '#9aa0ad'); }
  ctx.restore();
}
function drawPod(m) { // a pea pod that spits peas
  const x = Math.round(m.x), y = Math.round(m.y);
  if (!m.alive) { if (m.squish > 0) R(x - 6, y - 3, 12, 3, '#3f9a45'); return; }
  const wind = m.wind > 0, pw = wind ? 6 : 5;
  R(x - 9, y - 3, 7, 3, '#2f8f3a'); R(x + 3, y - 3, 7, 3, '#2f8f3a');
  for (let i = 0; i < 18; i++) {
    const t = (i + 0.5) / 18, half = Math.max(2, Math.round(pw * Math.pow(Math.sin(PI * t), 0.4)));
    R(x - half, y - 21 + i, half * 2, 1, '#2f8f3a'); R(x - half + 1, y - 21 + i, half * 2 - 2, 1, '#4ab85a');
  }
  R(x, y - 24, 1, 4, '#2f8f3a'); R(x + 1, y - 25, 3, 1, '#2f8f3a');
  disc(x, y - 6, 2, '#8fe06a'); disc(x, y - 6, 1, '#c8f5a0');
  const f = m.face;
  R(x - 3 + f, y - 17, 2, 3, '#1d1018'); R(x + 1 + f, y - 17, 2, 3, '#1d1018'); R(x - 3 + f, y - 17, 1, 1, '#fff'); R(x + 1 + f, y - 17, 1, 1, '#fff');
  if (wind) { R(x - 2 + f * 2, y - 12, 4, 3, '#1d1018'); R(x - 1 + f * 2, y - 10, 2, 1, '#e06a6a'); } else R(x - 2 + f, y - 11, 4, 1, '#1d1018');
}
function drawPea(x, y) { disc(x, y, 3, '#2f8f3a'); disc(x, y, 2, '#6fd05a'); R(x - 1, y - 1, 1, 1, '#d8ffb8'); }
function drawThrown(kind, b) { // kind: 'monkey' | 'mouse' | 'pod' -> what they throw
  if (kind === 'monkey') drawPeel(b.x, b.y, b.rot, false);
  else if (kind === 'mouse') drawCheese(b.x, b.y, b.rot);
  else drawPea(Math.round(b.x), Math.round(b.y));
}
const THROWER_ART = { monkey: drawMonkey, mouse: drawMouse, pod: drawPod };
const MINI_ART = { banana: drawMiniBanana, salami: drawMiniSalami, blob: drawMiniBlob };
const MINI_COLORS = { banana: ['#ffd93b', '#ffe97a', '#c99a14'], salami: ['#c0443a', '#f3cdbd', '#7e2420'], blob: ['#7a4418', '#b0702a', '#4a2810'] };
const THROWER_COLORS = { monkey: ['#8a5a2b', '#c9894a', '#f1c9a0'], mouse: ['#9aa0ad', '#d8dce6', '#e9a7b4'], pod: ['#2f8f3a', '#4ab85a', '#8fe06a'] };

function drawPuddle(kind, x) { // slippery puddles (touch one and Cab slides)
  const y = GROUND;
  if (kind === 'peel') { drawPeel(x, y - 2, undefined, false); return; }
  if (kind === 'oil') { R(x - 10, y - 2, 20, 2, '#d9a826'); R(x - 7, y - 3, 14, 1, '#f0c840'); R(x - 4, y - 3, 3, 1, '#fff2a0'); R(x - 11, y - 1, 22, 1, '#b8841a'); return; }
  R(x - 11, y - 2, 22, 2, '#6b3a14'); R(x - 8, y - 3, 16, 1, '#8a4f22'); R(x - 5, y - 3, 4, 1, '#c88a48'); R(x + 3, y - 4, 2, 1, '#8a4f22'); R(x - 12, y - 1, 24, 1, '#4a2810');
}
function drawDropHook(k) { // a salami hanging from the ceiling beam by a rope; the rope snaps when you walk under
  if (k.state === 'gone') return;
  const sh = k.state === 'shake' ? Math.round(Math.sin(k.t * 1.4) * 1.5) : 0;
  const y = k.state === 'fall' ? k.y : 46;
  if (k.state !== 'fall') { R(k.x + sh - 4, 14, 1, y - 20, '#c9b48a'); R(k.x + sh + 3, 14, 1, y - 20, '#c9b48a'); }
  const x = k.x + sh;
  disc(x - 6, y, 4, '#c0443a'); disc(x + 6, y, 4, '#c0443a'); R(x - 6, y - 4, 12, 8, '#c0443a'); R(x - 6, y - 4, 12, 1, '#e0786a'); R(x - 8, y + 3, 16, 1, '#7e2420');
  R(x - 3, y - 1, 2, 1, '#f3cdbd'); R(x + 2, y + 1, 2, 1, '#f3cdbd'); R(x - 1, y - 3, 2, 1, '#f3cdbd'); R(x - 10, y - 1, 2, 2, '#e8c878');
  if (k.state === 'shake' && k.t % 8 < 4) txtOutline('!', k.x - 1, 62, 9, '#fff', '#c33', 'center');
}
function drawDropCloud(k) { // a little gravy cloud that rains one big drop on you
  if (k.state === 'gone') return;
  const sh = k.state === 'shake' ? Math.round(Math.sin(k.t * 1.2) * 1.5) : 0;
  const cx = k.x + sh;
  disc(cx, 36, 7, '#6b4a30'); disc(cx - 8, 39, 5, '#7a5538'); disc(cx + 8, 39, 5, '#7a5538'); R(cx - 12, 39, 24, 4, '#6b4a30'); R(cx - 4, 31, 4, 1, '#a07850');
  const y = k.state === 'fall' ? k.y : (k.state === 'shake' ? 46 + (k.t / TUNE.coconutShake) * 4 : 46);
  if (k.state === 'fall') R(k.x, y - 12, 1, 8, '#8a5a30');
  disc(k.x + sh, y, 4, '#6b3a14'); R(k.x + sh - 2, y - 2, 1, 1, '#c88a48'); R(k.x + sh, y - 6, 1, 3, '#6b3a14');
  if (k.state === 'shake' && k.t % 8 < 4) txtOutline('!', k.x - 1, 58, 9, '#fff', '#c33', 'center');
}
const DROP_ART = { coconut: drawDropCoconut, hook: drawDropHook, cloud: drawDropCloud };
const DROP_COLORS = { coconut: ['#6b4423', '#f4efe0', '#9a6b3a'], hook: ['#c0443a', '#f3cdbd', '#7e2420'], cloud: ['#6b3a14', '#c88a48', '#8a5a30'] };

function drawSlicer(s) { // a spinning deli-slicer blade rolling back and forth on a track
  if (s.a !== undefined) { for (let x = s.a - 8; x < s.b + 8; x += 6) R(x, GROUND - 1, 3, 1, '#4a4a52'); }
  const cx = Math.round(s.x), cy = GROUND - 8;
  disc(cx, cy, 8, '#5a6070'); disc(cx, cy, 7, '#c9ced6'); disc(cx, cy, 4, '#9aa3b0'); disc(cx, cy, 1, '#3a3f4a');
  for (let i = 0; i < 8; i++) { const a = s.rot + i * PI / 4; R(cx + Math.cos(a) * 8.5 - 1, cy + Math.sin(a) * 8.5 - 1, 2, 2, '#f0f4fa'); R(cx + Math.cos(a + 0.4) * 4, cy + Math.sin(a + 0.4) * 4, 1, 1, '#6a7280'); }
  R(cx - 6, cy - 6, 3, 1, '#fff');
}
function geyserState(g) { const t = (frame + g.phase * 240) % 240; return t < 110 ? 'idle' : t < 160 ? 'warn' : t < 220 ? 'on' : 'idle'; }
const GEYSER_TOP = 84;
function drawGeyser(g) {
  const st = geyserState(g), x = Math.round(g.x), t = (frame + g.phase * 240) % 240;
  R(x - 9, GROUND - 3, 18, 3, '#4a2810'); R(x - 6, GROUND - 4, 12, 1, '#6b3a14');
  if (st === 'idle') { if (t % 40 < 8) { R(x - 2, GROUND - 6, 2, 2, '#8a5a30'); R(x + 1, GROUND - 7, 1, 1, '#c88a48'); } return; }
  if (st === 'warn') {
    const k = (t - 110) / 50;
    for (let i = 0; i < 3; i++) { const bx = x - 5 + ((i * 5 + frame) % 11), by = GROUND - 5 - ((frame * 0.7 + i * 5) % (6 + 8 * k)); disc(bx, by, 2, '#8a5a30'); R(bx - 1, by - 1, 1, 1, '#c88a48'); }
    if (frame % 6 < 3) txtOutline('!', x, GROUND - 40, 9, '#fff', '#c33', 'center');
    return;
  }
  const grow = Math.min(1, (t - 160) / 8);
  const h = Math.round(GEYSER_TOP * grow);
  R(x - 6, GROUND - h, 12, h, '#6b3a14'); R(x - 4, GROUND - h, 5, h, '#8a4f22'); R(x - 6, GROUND - h, 1, h, '#4a2810'); R(x + 5, GROUND - h, 1, h, '#4a2810');
  disc(x, GROUND - h, 8, '#6b3a14'); disc(x - 2, GROUND - h - 1, 5, '#8a4f22'); R(x - 4, GROUND - h - 4, 2, 2, '#c88a48');
  for (let i = 0; i < 4; i++) { const a = frame * 0.2 + i * 1.6; R(x + Math.cos(a) * 12, GROUND - h + 6 + (frame * 1.5 + i * 9) % 30, 2, 2, '#8a4f22'); }
}
function drawBoat(m) { // a gravy boat ferry with a friendly face
  const x = Math.round(m.x), y = m.y + Math.round(Math.sin(frame * 0.07 + m.phase * 6) * 0.6), w = m.w;
  R(x, y, w, 2, '#8a4a1a'); R(x + 3, y, w - 12, 1, '#b0702a'); // gravy on top
  for (let i = 0; i < 9; i++) { const inset = Math.floor(i * 1.3); R(x + inset, y + 2 + i, w - inset * 2, 1, i % 3 === 0 ? '#c9d3e8' : '#ffffff'); }
  R(x + 6, y + 5, w - 12, 1, '#8fb8e8'); R(x + 8, y + 10, w - 16, 1, '#34506f');
  R(x - 5, y - 2, 6, 2, '#ffffff'); R(x - 6, y - 3, 3, 1, '#ffffff'); // spout
  R(x + w - 1, y + 1, 5, 2, '#ffffff'); R(x + w + 3, y + 3, 2, 5, '#ffffff'); R(x + w - 1, y + 7, 5, 2, '#ffffff'); // handle
  R(x + 12, y + 4, 2, 3, '#1d1018'); R(x + 20, y + 4, 2, 3, '#1d1018'); R(x + 14, y + 8, 6, 1, '#1d1018'); R(x + 11, y + 7, 1, 1, '#e8888e'); R(x + 23, y + 7, 1, 1, '#e8888e');
  if (frame % 18 < 9) R(x - 9 - (frame % 9) / 3, y + 6, 4, 1, 'rgba(255,255,255,.7)');
}

// ---------------------------------------------------------------- themes
function deliSky() { // the whole deli wall: brick, beam, shelves, neon sign (screen space)
  R(0, 0, W, GROUND, '#9a4636');
  const off = Math.floor(camX * 0.2);
  for (let y = 0; y < GROUND; y += 8) {
    R(0, y, W, 1, '#7a3226');
    const sh = ((y / 8) % 2) * 12;
    for (let x = -((off + sh) % 24); x < W; x += 24) R(x, y, 1, 8, '#7a3226');
  }
  for (let i = 0; i < 24; i++) { const bx = (hash(i, 51) * 360 - off * 0.5 + 360) % 340; R(bx, 14 + hash(i, 52) * 120 | 0, 11, 6, '#a8503c'); }
  // neon sign
  for (let i = 0; i < 3; i++) {
    const sx = ((i * 480 - camX * 0.25) % 1440 + 1440) % 1440 - 200;
    if (sx > -80 && sx < W + 20) { R(sx - 2, 26, 60, 26, '#2a1218'); R(sx, 28, 56, 22, '#1d0c10'); txtOutline('DELI', sx + 28, 31, 16, '#ff7a7a', '#ff2a4a', 'center'); }
  }
  // shelves with jars and cheese (parallax)
  for (let k = 0; k < 2; k++) {
    const y = 66 + k * 34, par = k ? 0.35 : 0.3;
    R(0, y, W, 3, '#5a3a22'); R(0, y + 3, W, 1, '#3a2414');
    for (let x = -(Math.floor(camX * par) % 22); x < W; x += 22) {
      const hv = hash(Math.floor((x + camX * par) / 22), 20 + k);
      if (hv < 0.35) { R(x + 3, y - 11, 8, 11, '#e0c060'); R(x + 3, y - 11, 8, 2, '#8a8a8a'); R(x + 4, y - 8, 6, 5, '#c8a040'); }
      else if (hv < 0.6) { R(x + 2, y - 13, 7, 13, '#4a8a3a'); R(x + 2, y - 13, 7, 2, '#3a3a3a'); R(x + 4, y - 9, 3, 3, '#c0d890'); }
      else if (hv < 0.8) { disc(x + 8, y - 5, 5, '#ffd23a'); R(x + 3, y - 5, 10, 5, '#ffd23a'); R(x + 7, y - 6, 2, 2, '#c99a14'); }
      else { R(x + 4, y - 9, 9, 9, '#c0443a'); R(x + 4, y - 9, 9, 2, '#e0786a'); }
    }
  }
  R(0, 0, W, 12, '#4a2c1a'); R(0, 12, W, 2, '#2a190f'); R(0, 0, W, 2, '#6b4423');
  for (let x = -(Math.floor(camX * 0.5) % 52); x < W; x += 52) R(x, 0, 2, 12, '#3a2414');
}
function deliFar() { // hanging salamis and garlic from the beam, and the cream-tile wainscot (parallax)
  for (let x = -(Math.floor(camX * 0.5) % 46); x < W; x += 46) {
    const i = Math.floor((x + camX * 0.5) / 46), hv = hash(i, 61);
    if (hv < 0.45) { R(x + 6, 14, 1, 8 + (hv * 20 | 0), '#c9b48a'); const sy = 22 + (hv * 20 | 0); disc(x + 3, sy, 3, '#b83a30'); disc(x + 10, sy, 3, '#b83a30'); R(x + 3, sy - 3, 8, 6, '#b83a30'); R(x + 5, sy - 1, 2, 1, '#f3cdbd'); }
    else if (hv < 0.75) { R(x + 6, 14, 1, 6, '#c9b48a'); for (let g = 0; g < 4; g++) { disc(x + 3 + g * 3, 24 + (g % 2) * 4, 3, '#f4ecd8'); R(x + 3 + g * 3, 20 + (g % 2) * 4, 1, 3, '#d8c8a8'); } }
  }
  R(0, GROUND - 28, W, 28, '#efe5cf'); R(0, GROUND - 30, W, 3, '#6b4423'); R(0, GROUND - 27, W, 1, '#8a5a2e');
  for (let x = -(Math.floor(camX * 0.8) % 12); x < W; x += 12) R(x, GROUND - 26, 1, 26, '#d8cdb4');
  for (let y = GROUND - 14; y < GROUND; y += 13) R(0, y, W, 1, '#d8cdb4');
}
function deliGround(a, b) {
  const x0 = Math.max(a, Math.floor(camX) - 4), x1 = Math.min(b, Math.floor(camX) + W + 4);
  if (x1 <= x0) return;
  R(x0, GROUND, x1 - x0, 30, '#5a3a2a');
  for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) {
    const cx = Math.max(x, x0), cw = Math.min(x + 8, x1) - cx;
    for (let r = 0; r < 2; r++) R(cx, GROUND + r * 4, cw, 4, ((x / 8 + r) & 1) ? '#c4453a' : '#f3ecdc');
  }
  R(x0, GROUND, x1 - x0, 1, '#fff'); R(x0, GROUND + 8, x1 - x0, 2, '#3a2418');
  for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) { R(x, GROUND + 10, 1, 20, '#4a2e20'); }
  for (let y = GROUND + 16; y < GROUND + 30; y += 9) R(x0, y, x1 - x0, 1, '#4a2e20');
  if (a >= Math.floor(camX) - 4) R(a, GROUND, 2, 30, '#2a190f');
  if (b <= Math.floor(camX) + W + 4) R(b - 2, GROUND, 2, 30, '#2a190f');
}
function deliPit(a, b) { // a dark cellar trapdoor
  R(a, GROUND, b - a, 40, '#150d12');
  R(a, GROUND + 8, b - a, 1, '#241820'); R(a, GROUND + 18, b - a, 1, '#241820');
  for (let x = a + 6; x < b; x += 14) { if ((Math.floor(frame / 50) + x) % 5) { R(x, GROUND + 14 + (hash(x, 3) * 10 | 0), 1, 2, '#ffd23a'); R(x + 3, GROUND + 14 + (hash(x, 3) * 10 | 0), 1, 2, '#ffd23a'); } }
  for (let x = a + 3; x < b; x += 9) R(x, GROUND, 1, 4 + (hash(x, 9) * 5 | 0), '#3a2a30');
}
function deliPlat(p) { // a wooden shelf on metal brackets
  const [x, y, w] = p;
  R(x, y, w, 6, '#a8743a'); R(x, y, w, 1, '#d6a15e'); R(x, y + 5, w, 1, '#6b4423'); R(x + 1, y + 2, w - 2, 1, '#8a5a2e');
  for (const bx of [x + 4, x + w - 8]) { R(bx, y + 6, 4, 2, '#5a6070'); R(bx, y + 8, 3, 2, '#5a6070'); R(bx, y + 10, 2, 1, '#5a6070'); }
  R(x, y + 6, w, 1, '#3a2414');
}
function deliDecor(d) {
  const x = d.x;
  if (d.kind === 'barrel') { R(x - 7, GROUND - 16, 14, 16, '#8a5a2e'); R(x - 7, GROUND - 13, 14, 2, '#4a4a52'); R(x - 7, GROUND - 5, 14, 2, '#4a4a52'); R(x - 6, GROUND - 17, 12, 2, '#a8743a'); R(x - 5, GROUND - 15, 2, 14, '#a8743a'); }
  else if (d.kind === 'cheese') { R(x - 12, GROUND - 8, 24, 8, '#e8b830'); R(x - 12, GROUND - 8, 24, 2, '#ffd23a'); R(x - 4, GROUND - 5, 2, 2, '#b08a10'); R(x + 5, GROUND - 4, 2, 2, '#b08a10'); R(x - 8, GROUND - 14, 16, 6, '#e8b830'); R(x - 8, GROUND - 14, 16, 2, '#ffd23a'); R(x + 2, GROUND - 12, 2, 2, '#b08a10'); R(x - 12, GROUND - 1, 24, 1, '#b08a10'); }
  else if (d.kind === 'olives') { R(x - 10, GROUND - 10, 20, 10, '#b5803f'); R(x - 10, GROUND - 10, 20, 1, '#d6a15e'); R(x - 10, GROUND - 1, 20, 1, '#6b4423'); for (let i = 0; i < 4; i++) { disc(x - 7 + i * 5, GROUND - 12, 2, '#5a8a2a'); R(x - 8 + i * 5, GROUND - 13, 1, 1, '#a8d070'); } }
  else if (d.kind === 'shelfunit') { R(x - 18, GROUND - 60, 36, 60, '#6b4423'); R(x - 16, GROUND - 58, 32, 56, '#3b2414'); for (let k = 0; k < 3; k++) { const sy = GROUND - 42 + k * 19; R(x - 16, sy, 32, 2, '#6b4423'); for (let j = 0; j < 4; j++) { const c = hash(d.x + j, k + 7); R(x - 14 + j * 8, sy - 10, 6, 10, c < 0.33 ? '#c0443a' : c < 0.66 ? '#e0c060' : '#4a8a3a'); R(x - 14 + j * 8, sy - 10, 6, 2, '#bbb'); } } }
  else if (d.kind === 'table') { R(x - 12, GROUND - 14, 24, 3, '#e24a4a'); for (let i = 0; i < 6; i++) R(x - 12 + i * 4, GROUND - 14, 2, 3, '#fff'); R(x - 1, GROUND - 11, 3, 11, '#6b4423'); R(x - 6, GROUND - 1, 13, 1, '#6b4423'); R(x + 5, GROUND - 25, 3, 11, '#2f6a3a'); R(x + 6, GROUND - 28, 1, 3, '#2f6a3a'); }
  else if (d.kind === 'crate') { R(x - 9, GROUND - 14, 18, 14, '#b5803f'); R(x - 9, GROUND - 14, 18, 1, '#d6a15e'); R(x - 9, GROUND - 1, 18, 1, '#6b4423'); R(x - 1, GROUND - 14, 2, 14, '#6b4423'); R(x - 6, GROUND - 10, 4, 6, '#c0443a'); R(x + 3, GROUND - 10, 4, 6, '#c0443a'); }
}
function bayouSky() {
  const bands = ['#ffb86b', '#ffc77e', '#ffd694', '#ffe3aa', '#ffefc4', '#fff6dc'];
  const bh = Math.ceil(GROUND / bands.length);
  for (let i = 0; i < bands.length; i++) R(0, i * bh, W, bh + 1, bands[i]);
  disc(236, 78, 30, '#ffa850'); disc(236, 78, 24, '#ffc060'); disc(236, 78, 18, '#ffd884');
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 210 + frame * 0.05 - camX * 0.08) % 800 + 800) % 800 - 90, cy = 12 + (i * 29) % 44;
    disc(cx, cy, 6, '#fff3e0'); disc(cx + 9, cy + 2, 7, '#fff3e0'); disc(cx + 19, cy + 3, 5, '#fff3e0'); R(cx - 6, cy + 3, 30, 5, '#fff3e0');
  }
}
function bayouFar() { // mashed-potato hills with melting butter, and broccoli forests
  for (let x = 0; x < W; x += 2) { const wx = x + camX * 0.12; const h = 44 + Math.sin(wx * 0.018) * 15 + Math.sin(wx * 0.05 + 1) * 6; R(x, GROUND - h, 2, h, '#f6e9bf'); if (h > 52) R(x, GROUND - h, 2, 1, '#fff6d0'); }
  for (let x = 0; x < W; x += 2) { const wx = x + camX * 0.26; const h = 28 + Math.sin(wx * 0.028 + 2) * 11 + Math.sin(wx * 0.07) * 5; R(x, GROUND - h, 2, h, '#ead9a0'); }
  for (let i = -1; i < 7; i++) { // butter pats melting
    const bx = Math.round(i * 130 - (camX * 0.26 % 130) + 40), by = GROUND - 32 - hash(i + Math.floor(camX * 0.26 / 130), 5) * 10 | 0;
    R(bx, by, 12, 5, '#ffe46a'); R(bx, by, 12, 1, '#fff3a0'); R(bx + 3, by + 5, 2, 3, '#ffe46a');
  }
  for (let i = -1; i < 8; i++) { // silhouette broccoli trees
    const px = Math.round(i * 86 - (camX * 0.45 % 86) + 14), th = 26 + hash(i + Math.floor(camX * 0.45 / 86), 7) * 14 | 0;
    R(px, GROUND - th, 4, th, '#9ab86a'); disc(px + 2, GROUND - th - 2, 9, '#7fae5a'); disc(px - 6, GROUND - th + 3, 6, '#7fae5a'); disc(px + 10, GROUND - th + 3, 6, '#7fae5a');
  }
}
function bayouGround(a, b) { // crispy stuffing crust on top of mashed potatoes
  const x0 = Math.max(a, Math.floor(camX) - 4), x1 = Math.min(b, Math.floor(camX) + W + 4);
  if (x1 <= x0) return;
  R(x0, GROUND, x1 - x0, 30, '#f0e2b0'); R(x0, GROUND + 6, x1 - x0, 24, '#e6d49a');
  for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) for (let r = 0; r < 4; r++) { const hv = hash(x, r + 30); if (hv < 0.4) R(x + hv * 8, GROUND + 9 + r * 5, 2, 1, hv < 0.15 ? '#fff6d0' : '#c8b478'); }
  R(x0, GROUND - 1, x1 - x0, 6, '#c98a3a'); R(x0, GROUND - 1, x1 - x0, 1, '#e0a850'); R(x0, GROUND + 4, x1 - x0, 2, '#8a5a22');
  for (let x = Math.floor(x0 / 3) * 3; x < x1; x += 3) { const hv = hash(x, 80); R(x, GROUND - 2 - (hv * 2 | 0), 2, 2, hv > 0.5 ? '#e0a850' : '#a8682a'); if (hv > 0.8) R(x, GROUND + 5, 1, 3, '#8a5a22'); }
  if (a >= Math.floor(camX) - 4) R(a, GROUND, 2, 30, '#8a5a22');
  if (b <= Math.floor(camX) + W + 4) R(b - 2, GROUND, 2, 30, '#8a5a22');
}
function bayouPit(a, b) { // a river of gravy
  R(a, GROUND, b - a, 40, '#4a2810'); R(a, GROUND + 10, b - a, 30, '#3a1e0c');
  for (let x = a; x < b; x += 4) { const wy = GROUND + 2 + Math.round(Math.sin(x * 0.35 + frame * 0.1) * 1.4); R(x, wy, Math.min(4, b - x), 3, '#8a4f22'); R(x, wy, Math.min(4, b - x), 1, '#c88a48'); }
  for (let x = a + 5; x < b; x += 17) { const by = GROUND + 8 + ((frame * 0.5 + x) % 12); R(x, by, 2, 2, '#a8682a'); }
}
function bayouPlat(p) { // a dinner roll
  const [x, y, w] = p;
  disc(x + 3, y + 4, 4, '#a8682a'); disc(x + w - 3, y + 4, 4, '#a8682a'); R(x + 3, y, w - 6, 9, '#a8682a');
  disc(x + 3, y + 3, 4, '#d89a4a'); disc(x + w - 3, y + 3, 4, '#d89a4a'); R(x + 3, y - 1, w - 6, 8, '#d89a4a');
  R(x + 3, y - 1, w - 6, 2, '#eebf70'); R(x + 2, y + 6, w - 4, 2, '#a8682a');
  for (let i = 10; i < w - 6; i += 14) { R(x + i, y + 1, 1, 4, '#b87a32'); R(x + i + 1, y, 1, 1, '#eebf70'); }
}
function bayouDecor(d) {
  const x = d.x;
  if (d.kind === 'broccoli') { const h = 30 + hash(d.x, 3) * 22 | 0; R(x - 3, GROUND - h, 6, h, '#a8c070'); R(x - 3, GROUND - h, 2, h, '#c0d888'); disc(x, GROUND - h - 2, 11, '#3f8a3a'); disc(x - 9, GROUND - h + 4, 7, '#4aa04a'); disc(x + 9, GROUND - h + 4, 7, '#4aa04a'); disc(x - 3, GROUND - h - 6, 6, '#5fbf5a'); disc(x + 5, GROUND - h - 1, 4, '#5fbf5a'); }
  else if (d.kind === 'bean') { R(x, GROUND - 74, 2, 74, '#4a8a3a'); for (let i = 0; i < 4; i++) { const by = GROUND - 66 + i * 15, s = i % 2 ? 1 : -1; R(x + (s > 0 ? 2 : -4), by, 3, 13, '#6fbf4a'); R(x + (s > 0 ? 2 : -4), by, 1, 13, '#9ae070'); } }
  else if (d.kind === 'cranberry') { disc(x, GROUND - 6, 7, '#2f8f3a'); disc(x - 8, GROUND - 4, 5, '#3aa648'); disc(x + 8, GROUND - 4, 5, '#3aa648'); for (let i = 0; i < 5; i++) { disc(x - 8 + i * 4, GROUND - 5 - (i % 2) * 5, 2, '#d0243a'); R(x - 9 + i * 4, GROUND - 6 - (i % 2) * 5, 1, 1, '#ff8090'); } }
  else if (d.kind === 'butter') { R(x - 10, GROUND - 10, 20, 10, '#ffe46a'); R(x - 10, GROUND - 10, 20, 2, '#fff3a0'); R(x - 10, GROUND - 1, 20, 1, '#d8b830'); R(x + 6, GROUND - 3, 3, 4, '#ffe46a'); R(x + 5, GROUND, 5, 1, '#ffe46a'); }
  else if (d.kind === 'peas') { for (let i = 0; i < 4; i++) { disc(x - 6 + i * 4, GROUND - 3 - (i % 2) * 3, 3, '#4ab85a'); R(x - 7 + i * 4, GROUND - 5 - (i % 2) * 3, 1, 1, '#c8f5a0'); } }
}
function jungleDecor(d) {
  if (d.kind === 'palm') drawPalm(d.x, 60 + hash(d.x, 3) * 25, 1.5, false);
  else if (d.kind === 'bigpalm') drawPalm(d.x, 100, 2, true);
  else if (d.kind === 'bush') { disc(d.x, GROUND - 4, 6, '#2f8f3a'); disc(d.x + 8, GROUND - 3, 5, '#3aa648'); disc(d.x - 7, GROUND - 3, 5, '#46b04a'); R(d.x - 10, GROUND - 3, 24, 3, '#2f8f3a'); }
  else if (d.kind === 'flower') { for (let i = 0; i < 3; i++) { const fx = d.x + i * 5; R(fx, GROUND - 6, 1, 6, '#2f8f3a'); R(fx - 1, GROUND - 8, 3, 3, ['#ff6b8a', '#fff', '#ffb84a'][i]); R(fx, GROUND - 7, 1, 1, '#ffe14a'); } }
  else if (d.kind === 'banana') { drawPalm(d.x, 55, 1.2, false); for (let i = 0; i < 3; i++) sprite(d.x - 4 + i * 4, GROUND - 52 + (i % 2) * 3, BANANA_ICON, BANANA_PAL); }
}
function junglePit(a, b) {
  R(a, GROUND, b - a, 40, '#1b2a1f');
  for (let x = a + 4; x < b; x += 8) R(x, GROUND + 6 + (hash(x, 5) * 14 | 0), 2, 2, '#2f4a35');
  R(a, GROUND + 22, b - a, 1, '#254030');
  for (let x = a + 5; x < b; x += 11) R(x, GROUND, 1, 6 + (hash(x, 9) * 8 | 0), '#4a6a3a');
}

// decor kinds per theme (cumulative chance), placed along the level by genDecor()
const THEMES = {
  jungle: { sky: jungleSky, far: jungleFar, ground: jungleGround, pit: junglePit, plat: junglePlat, decor: jungleDecor, wallBg: '#3f9a55',
    kinds: [['palm', 0.4], ['bush', 0.7], ['flower', 0.85], ['banana', 1]], bigAt: 'drops' },
  deli: { sky: deliSky, far: deliFar, ground: deliGround, pit: deliPit, plat: deliPlat, decor: deliDecor, wallBg: '#7a3226',
    kinds: [['barrel', 0.2], ['cheese', 0.4], ['olives', 0.55], ['shelfunit', 0.75], ['table', 0.9], ['crate', 1]] },
  bayou: { sky: bayouSky, far: bayouFar, ground: bayouGround, pit: bayouPit, plat: bayouPlat, decor: bayouDecor, wallBg: '#e6d49a',
    kinds: [['broccoli', 0.3], ['bean', 0.45], ['cranberry', 0.65], ['butter', 0.8], ['peas', 1]] },
};
function genDecor(lv) {
  const th = THEMES[lv.theme], out = [];
  for (let x = 30; x < lv.width; x += 55 + Math.floor(hash(x, 1) * 90)) {
    if (lv.pits.some(([a, b]) => x > a - 16 && x < b + 16)) continue;
    if (x > lv.arena.left - 30 && x < lv.arena.right + 40) continue;
    const r = hash(x, 2);
    out.push({ x, kind: th.kinds.find((k) => r < k[1])[0] });
  }
  if (th.bigAt) for (const x of lv.drops) out.push({ x, kind: 'bigpalm' });
  return out;
}
