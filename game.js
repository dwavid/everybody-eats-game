'use strict';
// EVERYBODY EATS! — a side-scroller starring Cab, a cute little chef.
// Every dinner guest is a level. Cab feeds each guest a food that rhymes with their name,
// and unlocks the food by beating the boss: an evil, anthropomorphic version of it.
// Level 1: Hannah -> BANANA (Banana Grove, boss: Baron Von Peel).
// Plain Canvas + JS, no build step, all art drawn in code. See CLAUDE.md.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 320, H = 180, SS = 4;
canvas.width = W * SS; canvas.height = H * SS;

const GROUND = 150; // y of the ground surface in world space

// ---------- Tunables ----------
const TUNE = {
  gravity: 0.3, jump: 6.3, maxFall: 7,
  accel: 0.36, airAccel: 0.26, friction: 0.3, maxSpeed: 1.9,
  coyote: 6, buffer: 6,
  hearts: 3, invuln: 100,
  stompBounce: 4.4, stompBounceHeld: 6.2,
  slipSpeed: 2.7, slipFrames: 36,
  ladleSpeed: 3.4, ladleRange: 150, ladleCooldown: 24,
  miniSpeed: 0.38,
  monkeyRange: 210, monkeyEvery: 150, monkeyWind: 28,
  coconutTrigger: 38, coconutShake: 34,
  bossHp: 3, bossSpeed: 0.5, bossPeelWind: 42, bossLeapWind: 30, bossDazed: 140,
  bossHurt: 70, bossIntro: 120,
};

// ---------- Helpers ----------
const PI = Math.PI;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function R(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
function disc(cx, cy, rad, c) {
  ctx.fillStyle = c; cx = Math.round(cx); cy = Math.round(cy);
  for (let y = -rad; y <= rad; y++) {
    const w = Math.round(Math.sqrt(rad * rad - y * y + 0.4));
    ctx.fillRect(cx - w, cy + y, w * 2, 1);
  }
}
function sprite(x, y, rows, pal, flip) {
  x = Math.round(x); y = Math.round(y);
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j];
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '.' || ch === ' ') continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(flip ? x + row.length - 1 - i : x + i, y + j, 1, 1);
    }
  }
}
function hash(a, b) { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const FONT = 'ui-monospace, Menlo, Consolas, monospace';
function txt(s, x, y, size, color, align, shadow) {
  ctx.font = 'bold ' + size + 'px ' + FONT;
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
  if (shadow !== false) { ctx.fillStyle = shadow || 'rgba(40,20,10,.85)'; ctx.fillText(s, x + 1, y + 1); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
function txtOutline(s, x, y, size, color, outline, align) {
  ctx.font = 'bold ' + size + 'px ' + FONT;
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'top';
  ctx.fillStyle = outline;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) ctx.fillText(s, x + dx, y + dy);
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

// ---------- Input ----------
const input = { left: false, right: false, jump: false, down: false, toss: false, jumpPressed: false, tossPressed: false, action: false };
const keyMap = {
  ArrowLeft: 'left', a: 'left', A: 'left',
  ArrowRight: 'right', d: 'right', D: 'right',
  ArrowUp: 'jump', w: 'jump', W: 'jump', ' ': 'jump',
  ArrowDown: 'down', s: 'down', S: 'down',
  x: 'toss', X: 'toss', z: 'toss', Z: 'toss', k: 'toss', K: 'toss', Shift: 'toss',
};
function setInput(name, down) {
  if (name === 'jump' && down && !input.jump) { input.jumpPressed = true; input.action = true; }
  if (name === 'toss' && down && !input.toss) input.tossPressed = true;
  input[name] = down;
}
addEventListener('keydown', (e) => {
  if (e.repeat) { if (keyMap[e.key]) e.preventDefault(); return; }
  const n = keyMap[e.key];
  if (n) { e.preventDefault(); setInput(n, true); audioInit(); }
  else if (e.key === 'Enter') { input.action = true; audioInit(); }
  else if (e.key === 'm' || e.key === 'M') { audioInit(); setMuted(!muted); }
});
addEventListener('keyup', (e) => { const n = keyMap[e.key]; if (n) setInput(n, false); });
addEventListener('blur', () => { for (const k of ['left', 'right', 'jump', 'down', 'toss']) input[k] = false; });
for (const b of document.querySelectorAll('#controls button')) {
  const k = b.dataset.key;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('on'); setInput(k, true); audioInit(); });
  const up = () => { b.classList.remove('on'); setInput(k, false); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); input.action = true; audioInit(); });
// No zooming (iPad/iPhone Safari ignore user-scalable=no)
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => { if (e.touches.length > 1 || (e.scale && e.scale !== 1)) e.preventDefault(); }, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => { const now = Date.now(); if (now - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = now; }, { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault());
addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;

// ---------- Sound (all synthesized) ----------
let ac = null, master = null, muted = false;
try { muted = localStorage.getItem('ee-muted') === '1'; } catch (e) { /* ignore */ }
function audioInit() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
  } catch (e) { ac = null; }
}
function setMuted(m) {
  muted = m;
  try { localStorage.setItem('ee-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
  if (master) master.gain.value = m ? 0 : 0.5;
}
function tone(freq, dur, type, vol, slide, delay) {
  if (!ac || muted) return;
  const t = ac.currentTime + (delay || 0);
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
  g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, delay) {
  if (!ac || muted) return;
  const t = ac.currentTime + (delay || 0);
  const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), g = ac.createGain();
  s.buffer = buf; g.gain.value = vol || 0.15; s.connect(g); g.connect(master); s.start(t);
}
const sfx = {
  jump() { tone(300, 0.16, 'square', 0.08, 380); },
  stomp() { noise(0.1, 0.18); tone(260, 0.14, 'triangle', 0.16, -170); tone(520, 0.08, 'square', 0.06, 200, 0.03); },
  toss() { tone(620, 0.12, 'triangle', 0.09, -260); },
  ding() { tone(1320, 0.22, 'triangle', 0.1); tone(1980, 0.3, 'sine', 0.05, 0, 0.02); },
  hurt() { tone(330, 0.3, 'sawtooth', 0.12, -250); noise(0.12, 0.12); },
  cookie() { tone(988, 0.07, 'square', 0.06); tone(1319, 0.14, 'square', 0.06, 0, 0.06); },
  bell() { tone(1175, 0.7, 'sine', 0.12); tone(1760, 0.9, 'sine', 0.07, 0, 0.03); tone(880, 0.9, 'triangle', 0.05); },
  slip() { tone(250, 0.45, 'sine', 0.12, 700); tone(900, 0.25, 'triangle', 0.08, -600, 0.3); },
  monkey() { tone(700, 0.08, 'square', 0.06, 200); tone(900, 0.1, 'square', 0.06, -200, 0.09); },
  coconut() { noise(0.12, 0.16); tone(180, 0.12, 'triangle', 0.12, -100); },
  bossHit() { noise(0.25, 0.2); tone(200, 0.4, 'sawtooth', 0.14, -150); tone(800, 0.3, 'square', 0.07, -500, 0.05); },
  bossSlam() { noise(0.35, 0.28); tone(90, 0.4, 'triangle', 0.25, -50); },
  bossWind() { tone(180, 0.5, 'sawtooth', 0.06, 200); },
  bossBoom() { noise(0.9, 0.3); tone(140, 0.9, 'sawtooth', 0.18, -110); for (let i = 0; i < 5; i++) tone(500 + i * 120, 0.2, 'square', 0.05, -300, 0.1 + i * 0.07); },
  pit() { tone(500, 0.6, 'triangle', 0.1, -440); },
  talk(hi) { tone(hi ? 520 : 380, 0.05, 'square', 0.04); },
  ding2() { tone(988, 0.15, 'sine', 0.1); tone(1319, 0.3, 'sine', 0.1, 0, 0.12); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'square', 0.08, 0, i * 0.12)); },
  knock() { noise(0.06, 0.25); noise(0.06, 0.25, 0.16); noise(0.06, 0.25, 0.4); },
  doorbell() { tone(784, 0.5, 'sine', 0.14); tone(587, 0.8, 'sine', 0.14, 0, 0.35); },
};
// A tiny step sequencer. Notes are MIDI numbers (60 = middle C), 0 = rest.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MUSIC = {
  grove: { step: 8,
    lead: [72, 0, 76, 0, 79, 0, 76, 0, 74, 0, 77, 0, 81, 0, 77, 0, 72, 0, 76, 79, 84, 0, 79, 0, 74, 0, 72, 0, 71, 0, 0, 0],
    bass: [48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 57, 0, 50, 0, 57, 0, 48, 0, 55, 0, 48, 0, 55, 0, 43, 0, 50, 0, 43, 0, 50, 0] },
  boss: { step: 6,
    lead: [69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 72, 77, 76, 0, 0, 0, 68, 0, 71, 0, 75, 0, 71, 0, 68, 0, 71, 76, 75, 0, 0, 0],
    bass: [45, 45, 0, 45, 45, 0, 45, 0, 45, 45, 0, 45, 48, 0, 47, 0, 44, 44, 0, 44, 44, 0, 44, 0, 44, 44, 0, 44, 47, 0, 46, 0] },
  home: { step: 12,
    lead: [67, 0, 0, 71, 0, 0, 74, 0, 0, 71, 0, 0, 69, 0, 0, 72, 0, 0, 76, 0, 0, 72, 0, 0],
    bass: [43, 0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 52, 0, 0, 0, 0, 0] },
};
let musicName = null, musicFrame = 0, musicStep = 0;
function musicTick() {
  const want = state === 'play' || state === 'dead' ? (boss && boss.active && boss.state !== 'dead' ? 'boss' : 'grove')
    : (state === 'cutscene' || state === 'title' || state === 'unlock') ? 'home' : null;
  if (want !== musicName) { musicName = want; musicFrame = 0; musicStep = 0; }
  if (!want || !ac || muted) return;
  const m = MUSIC[want];
  if (musicFrame++ % m.step !== 0) return;
  const i = musicStep++ % m.lead.length;
  const l = m.lead[i], b = m.bass[i % m.bass.length];
  if (l) tone(mtof(l), 0.13, 'square', 0.028);
  if (b) tone(mtof(b), 0.2, 'triangle', 0.07);
}

// ---------- Level 1: Banana Grove ----------
const LEVEL_W = 3800;
const ARENA = { left: 3400, right: 3716, trigger: 3450, bossX: 3630 };
const PITS = [[520, 562], [1150, 1198], [1440, 1484], [1980, 2030], [2160, 2204], [2330, 2374], [2700, 2748], [3010, 3052]];
// one-way platforms [x, topY, width]: jump up through them from below, stand on top
const PLATS = [
  [380, 116, 56], [498, 114, 90], [790, 104, 90], [925, 122, 44], [985, 98, 62],
  [1130, 112, 90], [1590, 100, 80], [1700, 120, 50], [1760, 100, 60], [1840, 118, 60],
  [2140, 114, 80], [2310, 112, 90], [2480, 104, 80], [2860, 108, 70], [2680, 120, 90], [3120, 104, 70],
];
const BELLS = [1000, 1900, 2950, 3340];
const MINIS = [ // x, floorY, range
  [300, GROUND, 230, 480], [700, GROUND, 640, 780], [1080, GROUND, 1050, 1140], [1280, GROUND, 1215, 1400],
  [1620, GROUND, 1550, 1700], [1720, GROUND, 1640, 1800], [2060, GROUND, 2045, 2150], [2250, GROUND, 2215, 2320],
  [2430, GROUND, 2385, 2690], [2790, GROUND, 2760, 2940], [3230, GROUND, 3150, 3330],
  [820, 104, 795, 875], [2500, 104, 2485, 2555],
];
const MONKEYS = [[855, 104], [1655, 100], [2330, 112], [3170, 104]]; // x, platform top
const PEELS = [640, 1305, 1830, 2040, 2570, 2860];
const COCONUTS = [900, 1560, 2420, 3100];
const SIGNS = [
  [80, IS_TOUCH ? '◀ ▶ MOVE' : 'ARROWS MOVE'], [175, IS_TOUCH ? '▲ JUMPS' : 'SPACE JUMPS'],
  [255, 'STOMP BANANAS!'], [345, IS_TOUCH ? '● TOSSES LADLE' : 'X TOSSES LADLE'], [3300, 'BOSS AHEAD!'],
];
function groundSegments() {
  const segs = []; let x = 0;
  for (const [a, b] of PITS) { segs.push([x, a]); x = b; }
  segs.push([x, LEVEL_W]);
  return segs;
}
const SEGS = groundSegments();
const COOKIES = (() => {
  const out = [];
  const row = (x, y, n, g) => { for (let i = 0; i < n; i++) out.push([x + i * (g || 12), y]); };
  const arc = (x0, x1, y0, h, n) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push([x0 + (x1 - x0) * t, y0 - Math.sin(PI * t) * h]); } };
  row(120, 135, 3); row(395, 100, 4); arc(512, 570, 130, 40, 5); row(510, 98, 6);
  row(700, 135, 3); row(800, 88, 5); row(935, 106, 3); row(995, 82, 4);
  arc(1140, 1208, 130, 38, 5); row(1140, 96, 5); row(1260, 135, 3);
  arc(1430, 1494, 130, 38, 5); row(1600, 84, 5); row(1708, 104, 3); row(1770, 84, 4); row(1850, 102, 3);
  arc(1970, 2040, 130, 38, 5); arc(2150, 2214, 130, 38, 5); row(2150, 98, 5); row(2320, 96, 5);
  arc(2320, 2384, 130, 36, 5); row(2490, 88, 5); row(2690, 104, 5); arc(2690, 2758, 130, 38, 5);
  row(2870, 92, 4); arc(3000, 3062, 130, 38, 5); row(3130, 88, 4); row(3200, 135, 4);
  return out;
})();

// ---------- Game state ----------
let state = 'title'; // title | cutscene | card | play | dead | ending | unlock
let frame = 0, shake = 0, flash = 0, fade = 0;
let camX = 0;
let score = 0, hearts = TUNE.hearts, checkpoint = 40;
let bossHp = TUNE.bossHp;
const gotCookies = new Set();
let cab, enemies, monkeys, peels, coconuts, cookies, bells, ladles, bananaThrows, particles, popups, boss;
let item = null; // the golden banana
let sceneLines = null, sceneIdx = 0, sceneChars = 0, sceneAfter = null, sceneT = 0, sceneKind = 'intro';
let cardT = 0, deadT = 0, endT = 0, unlockT = 0;

function newCab(x) {
  return { x, y: GROUND, vx: 0, vy: 0, face: 1, onGround: true, coyote: 0, buf: 0, hurt: 0, stun: 0, slip: 0, slipDir: 1, anim: 0, tossT: 0, ladleCd: 0, dropT: 0, spin: 0, w: 10, h: 22 };
}
function resetRun(x) {
  cab = newCab(x);
  enemies = MINIS.map(([ex, ey, a, b], i) => ({ type: 'mini', x: ex, y: ey, a, b, dir: i % 2 ? 1 : -1, alive: true, t: 0, squish: 0, anim: Math.random() * 20 }));
  monkeys = MONKEYS.map(([mx, my]) => ({ x: mx, y: my, alive: true, cd: 60 + (mx % 60), wind: 0, face: -1, t: 0, squish: 0 }));
  peels = PEELS.map((x) => ({ x, y: GROUND, used: 0, ttl: -1 }));
  coconuts = COCONUTS.map((x) => ({ x, state: 'hang', t: 0, y: 46, vy: 0 }));
  cookies = COOKIES.map(([x, y], i) => ({ x, y, got: gotCookies.has(i), i }));
  bells = BELLS.map((x) => ({ x, on: x <= checkpoint && x > 40, ring: 0 }));
  ladles = []; bananaThrows = []; particles = []; popups = [];
  item = null;
  boss = { active: false, state: 'sleep', t: 0, x: ARENA.bossX, y: GROUND, vx: 0, vy: 0, face: -1, hp: bossHp, atk: 0, peels: [], waves: [], wall: 0, camLock: 0, bubble: '', bubbleT: 0, flash: 0, bannerT: 0 };
  camX = clamp(x - 120, 0, LEVEL_W - W);
}
function startLevel() {
  gotCookies.clear(); score = 0; hearts = TUNE.hearts; checkpoint = 40; bossHp = TUNE.bossHp;
  resetRun(40);
  state = 'card'; cardT = 0;
}

// ---------- Collision world ----------
function solidRects() {
  const out = [];
  for (const [a, b] of SEGS) out.push([a, GROUND, b - a, 60]);
  out.push([ARENA.right, 0, 60, GROUND + 60]);
  if (boss && boss.wall > 0.5) out.push([ARENA.left, 0, 14, GROUND]);
  return out;
}
function hitSolid(x, y, w, h) { // returns the solid rect overlapped, if any
  for (const s of solidRects()) if (x < s[0] + s[2] && x + w > s[0] && y < s[1] + s[3] && y + h > s[1]) return s;
  return null;
}
function supportAt(x, y) { // is there floor at (x, y)? (used by walking enemies)
  if (y === GROUND) { for (const [a, b] of SEGS) if (x >= a && x <= b) return true; return false; }
  for (const p of PLATS) if (p[1] === y && x >= p[0] && x <= p[0] + p[2]) return true;
  return false;
}

// ---------- Effects ----------
function burst(x, y, n, colors, spd, grav) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * PI * 2, s = (0.4 + Math.random()) * (spd || 2);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1, life: 24 + Math.random() * 20, c: colors[i % colors.length], g: grav === undefined ? 0.12 : grav, s: Math.random() < 0.3 ? 2 : 1 });
  }
}
function popup(x, y, s, c) { popups.push({ x, y, s, c: c || '#fff', t: 0 }); }
function addScore(n, x, y) { score += n; if (x !== undefined) popup(x, y, '+' + n, '#fff7b0'); }
const BANANA_COLORS = ['#ffd93b', '#ffe97a', '#c99a14'];

// ---------- Cab ----------
function hurtCab(fromX) {
  if (cab.hurt > 0 || state !== 'play') return;
  hearts--; sfx.hurt(); shake = 6;
  cab.hurt = TUNE.invuln; cab.vy = -3.6; cab.vx = (cab.x < fromX ? -1 : 1) * 2; cab.stun = 14; cab.slip = 0; cab.onGround = false;
  burst(cab.x, cab.y - 12, 6, ['#fff', '#ffd1d1'], 1.6);
  if (hearts <= 0) { state = 'dead'; deadT = 0; cab.vy = -5; sfx.pit(); }
}
function fallInPit() {
  hearts--; sfx.pit(); shake = 5;
  if (hearts <= 0) { state = 'dead'; deadT = 0; cab.y = 215; cab.vy = 0; return; }
  respawn();
}
function respawn() {
  cab.x = checkpoint; cab.y = GROUND; cab.vx = 0; cab.vy = 0; cab.hurt = 90; cab.slip = 0; cab.stun = 0; cab.onGround = true;
  if (boss.active && boss.state !== 'dead') { boss.active = false; boss.state = 'sleep'; boss.wall = 0; boss.x = ARENA.bossX; boss.y = GROUND; boss.peels = []; boss.waves = []; boss.t = 0; boss.hp = bossHp; }
}
function retryAfterDeath() {
  hearts = TUNE.hearts;
  resetRun(checkpoint);
  cab.hurt = 90;
  state = 'play';
}

function updateCab() {
  const c = cab, T = TUNE;
  const prevBottom = c.y, prevY = c.y;
  if (c.hurt > 0) c.hurt--;
  if (c.ladleCd > 0) c.ladleCd--;
  if (c.tossT > 0) c.tossT--;
  if (c.stun > 0) c.stun--;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (c.slip > 0) {
    c.slip--; c.vx = c.slipDir * T.slipSpeed * (0.55 + 0.45 * (c.slip / T.slipFrames)); c.spin += 0.5;
  } else if (c.stun <= 0) {
    const a = c.onGround ? T.accel : T.airAccel;
    if (dir) { c.vx += dir * a; c.face = dir; }
    else if (c.onGround) { c.vx = Math.abs(c.vx) < T.friction ? 0 : c.vx - Math.sign(c.vx) * T.friction; }
    c.vx = clamp(c.vx, -T.maxSpeed, T.maxSpeed);
  }
  // jump (coyote time + jump buffering + variable height)
  if (c.onGround) c.coyote = T.coyote; else if (c.coyote > 0) c.coyote--;
  if (input.jumpPressed) c.buf = T.buffer; else if (c.buf > 0) c.buf--;
  if (c.buf > 0 && c.coyote > 0 && c.stun <= 0) {
    if (input.down && c.onGround && onOneWay()) { c.dropT = 12; c.onGround = false; c.coyote = 0; c.buf = 0; }
    else { c.vy = -T.jump; c.onGround = false; c.coyote = 0; c.buf = 0; sfx.jump(); }
  }
  if (!input.jump && c.vy < -2.4) c.vy *= 0.6;
  if (c.dropT > 0) c.dropT--;
  c.vy = Math.min(c.vy + T.gravity, T.maxFall);

  // move X, then Y, against solids
  c.x += c.vx;
  let s = hitSolid(c.x - c.w / 2, c.y - c.h, c.w, c.h - 1);
  if (s) { if (c.vx > 0) c.x = s[0] - c.w / 2; else if (c.vx < 0) c.x = s[0] + s[2] + c.w / 2; c.vx = 0; if (c.slip > 0) c.slip = 0; }
  c.x = clamp(c.x, 6, LEVEL_W + 40);
  c.y += c.vy;
  c.onGround = false;
  s = hitSolid(c.x - c.w / 2, c.y - c.h, c.w, c.h);
  if (s) {
    if (c.vy > 0) { c.y = s[1]; c.onGround = true; } else { c.y = s[1] + s[3] + c.h; }
    c.vy = 0;
  } else if (c.vy >= 0 && c.dropT <= 0) {
    for (const p of PLATS) {
      if (c.x + c.w / 2 > p[0] && c.x - c.w / 2 < p[0] + p[2] && prevY <= p[1] + 1 && c.y >= p[1]) { c.y = p[1]; c.vy = 0; c.onGround = true; break; }
    }
  }
  if (c.onGround && !c.wasGround) { // landing puff
    burst(c.x, c.y, 3, ['#e8d9b0', '#fff'], 0.8, 0.02);
  }
  c.wasGround = c.onGround;
  if (c.onGround && Math.abs(c.vx) > 0.2) c.anim += Math.abs(c.vx) * 0.12; else if (c.onGround) c.anim = 0;
  if (c.y > 215 && state === 'play') fallInPit();

  // toss a ladle
  if (input.tossPressed && c.ladleCd <= 0 && ladles.length < 2 && c.stun <= 0) {
    ladles.push({ x: c.x + c.face * 8, y: c.y - 14, vx: c.face * T.ladleSpeed + c.vx * 0.3, vy: 0, dist: 0, spin: 0 });
    c.ladleCd = T.ladleCooldown; c.tossT = 10; sfx.toss();
  }
}
function onOneWay() { // standing on a one-way platform (not the ground)?
  for (const p of PLATS) if (cab.y === p[1] && cab.x + 5 > p[0] && cab.x - 5 < p[0] + p[2]) return true;
  return false;
}

// ---------- Enemies ----------
function updateEnemies() {
  for (const e of enemies) {
    if (e.squish > 0) { e.squish--; continue; }
    if (!e.alive) continue;
    e.anim += 0.15;
    e.x += e.dir * TUNE.miniSpeed;
    if (e.x < e.a) { e.x = e.a; e.dir = 1; }
    if (e.x > e.b) { e.x = e.b; e.dir = -1; }
    if (!supportAt(e.x + e.dir * 7, e.y)) e.dir = -e.dir;
    // stomp or hurt
    if (state !== 'play') continue;
    if (Math.abs(cab.x - e.x) < 9 && cab.y > e.y - 16 && cab.y - cab.h < e.y) {
      if (cab.vy > 0 && cab.y - cab.vy <= e.y - 11 + 5) { killMini(e); cab.vy = input.jump ? -TUNE.stompBounceHeld : -TUNE.stompBounce; cab.onGround = false; }
      else hurtCab(e.x);
    }
  }
}
function killMini(e, byLadle) {
  e.alive = false; e.squish = 18; sfx.stomp();
  burst(e.x, e.y - 8, 8, BANANA_COLORS, 1.8);
  addScore(100, e.x, e.y - 22);
  if (!byLadle) shake = 2;
}
function updateMonkeys() {
  for (const m of monkeys) {
    if (m.squish > 0) { m.squish--; continue; }
    if (!m.alive) continue;
    m.t++;
    const dx = cab.x - m.x, dy = cab.y - m.y;
    m.face = dx < 0 ? -1 : 1;
    if (m.wind > 0) {
      m.wind--;
      if (m.wind === 0) { // lob a banana peel at Cab
        const tt = 70, g = 0.1;
        bananaThrows.push({ x: m.x + m.face * 6, y: m.y - 14, vx: clamp(dx / tt, -2.4, 2.4), vy: (dy - 12 - 0.5 * g * tt * tt) / tt, rot: 0 });
        m.cd = TUNE.monkeyEvery; sfx.monkey();
      }
    } else if (Math.abs(dx) < TUNE.monkeyRange && Math.abs(dy) < 130) {
      m.cd--; if (m.cd <= 0) { m.wind = TUNE.monkeyWind; sfx.monkey(); }
    }
    if (state === 'play' && Math.abs(dx) < 10 && cab.y > m.y - 14 && cab.y - cab.h < m.y) {
      if (cab.vy > 0 && cab.y - cab.vy <= m.y - 10 + 5) { killMonkey(m); cab.vy = input.jump ? -TUNE.stompBounceHeld : -TUNE.stompBounce; cab.onGround = false; }
      else hurtCab(m.x);
    }
  }
  for (const b of bananaThrows) {
    b.vy += 0.1; b.x += b.vx; b.y += b.vy; b.rot += 0.25;
    if (state === 'play' && Math.abs(b.x - cab.x) < 8 && b.y > cab.y - 24 && b.y < cab.y + 2) { b.dead = true; hurtCab(b.x); burst(b.x, b.y, 5, BANANA_COLORS, 1.4); }
    else if (b.y >= GROUND - 3 && supportAt(b.x, GROUND)) { b.dead = true; peels.push({ x: Math.round(b.x), y: GROUND, used: 0, ttl: 420 }); }
    else if (b.y > 220) b.dead = true;
  }
  bananaThrows = bananaThrows.filter((b) => !b.dead);
}
function killMonkey(m) {
  m.alive = false; m.squish = 20; sfx.stomp(); burst(m.x, m.y - 8, 8, ['#8a5a2b', '#c9894a', '#f1c9a0'], 1.8);
  addScore(200, m.x, m.y - 22);
}
function updatePeels() {
  for (const p of peels) {
    if (p.ttl > 0 && --p.ttl === 0) p.gone = true;
    if (p.used > 0) p.used--;
    if (state === 'play' && !p.gone && p.used === 0 && cab.slip <= 0 && cab.onGround && cab.y === GROUND && Math.abs(cab.x - p.x) < 9) {
      cab.slip = TUNE.slipFrames; cab.slipDir = cab.face; cab.vy = -2.2; cab.onGround = false; p.used = 90; sfx.slip();
    }
  }
  peels = peels.filter((p) => !p.gone);
}
function updateCoconuts() {
  for (const k of coconuts) {
    k.t++;
    if (k.state === 'hang') {
      if (state === 'play' && Math.abs(cab.x - k.x) < TUNE.coconutTrigger && cab.y > 90) { k.state = 'shake'; k.t = 0; }
    } else if (k.state === 'shake') {
      if (k.t > TUNE.coconutShake) { k.state = 'fall'; k.t = 0; k.vy = 0; }
    } else if (k.state === 'fall') {
      k.vy += 0.35; k.y += k.vy;
      if (state === 'play' && Math.abs(k.x - cab.x) < 9 && k.y > cab.y - 26 && k.y < cab.y) { hurtCab(k.x); k.y = GROUND; }
      if (k.y >= GROUND - 4) { k.state = 'gone'; k.t = 0; sfx.coconut(); burst(k.x, GROUND - 3, 8, ['#6b4423', '#f4efe0', '#9a6b3a'], 1.6); shake = Math.max(shake, 2); }
    } else if (k.state === 'gone') {
      if (k.t > 260) { k.state = 'hang'; k.y = 46; k.t = 0; }
    }
  }
}
function updateCookies() {
  for (const c of cookies) {
    if (c.got) continue;
    if (Math.abs(cab.x - c.x) < 9 && cab.y - 24 < c.y + 4 && cab.y + 4 > c.y) {
      c.got = true; gotCookies.add(c.i); addScore(10); sfx.cookie(); burst(c.x, c.y, 4, ['#ffe08a', '#fff'], 1);
    }
  }
}
function updateBells() {
  for (const b of bells) {
    if (b.ring > 0) b.ring--;
    if (!b.on && Math.abs(cab.x - b.x) < 14 && cab.y > GROUND - 24 && state === 'play') {
      b.on = true; b.ring = 40; checkpoint = b.x; sfx.bell(); popup(b.x, GROUND - 40, 'CHECKPOINT!', '#fff7b0');
      burst(b.x, GROUND - 18, 8, ['#ffe08a', '#fff'], 1.6);
    }
  }
}
function updateLadles() {
  for (const l of ladles) {
    l.x += l.vx; l.dist += Math.abs(l.vx); l.spin += 0.4; l.vy += 0.015; l.y += l.vy;
    if (l.dist > TUNE.ladleRange || l.y > GROUND - 2) { l.dead = true; continue; }
    if (hitSolid(l.x - 2, l.y - 2, 4, 4)) { l.dead = true; burst(l.x, l.y, 3, ['#ccc', '#fff'], 1); sfx.ding(); continue; }
    for (const e of enemies) if (e.alive && Math.abs(l.x - e.x) < 9 && l.y > e.y - 18 && l.y < e.y) { killMini(e, true); l.dead = true; }
    for (const m of monkeys) if (m.alive && Math.abs(l.x - m.x) < 9 && l.y > m.y - 18 && l.y < m.y) { killMonkey(m); l.dead = true; }
    if (boss.active && boss.state !== 'dead' && Math.abs(l.x - boss.x) < 14 && l.y > boss.y - 54 && l.y < boss.y) {
      l.dead = true; sfx.ding(); burst(l.x, l.y, 4, ['#fff', '#ddd'], 1.4); popup(l.x, l.y - 12, 'DING!', '#fff');
    }
  }
  ladles = ladles.filter((l) => !l.dead);
}

// ---------- Boss: Baron Von Peel ----------
function phase() { return TUNE.bossHp - boss.hp; } // 0, 1, 2
function say(s, t) { boss.bubble = s; boss.bubbleT = t; }
function startFight() {
  boss.active = true; boss.state = 'intro'; boss.t = 0; boss.bannerT = 140; say('Nobody eats ME, chef!', 100);
  sfx.bossWind();
}
function bossShock(x) {
  sfx.bossSlam(); shake = 9;
  burst(x, GROUND - 2, 12, ['#e8d9b0', '#c9a96b', '#ffd93b'], 2.4);
  const sp = 1.9 + phase() * 0.3;
  boss.waves.push({ x: x - 12, dir: -1, sp }, { x: x + 12, dir: 1, sp });
}
function updateBoss() {
  const b = boss;
  b.flash = Math.max(0, b.flash - 1);
  if (b.bubbleT > 0) b.bubbleT--;
  if (b.bannerT > 0) b.bannerT--;
  b.wall = b.active && b.state !== 'dead' ? Math.min(1, b.wall + 0.04) : Math.max(0, b.wall - 0.04);
  if (!b.active) {
    if (state === 'play' && cab.x > ARENA.trigger && b.state === 'sleep') startFight();
    return;
  }
  b.camLock = Math.min(1, b.camLock + 0.05);
  b.t++;
  const ph = phase();
  const spd = TUNE.bossSpeed + ph * 0.15;
  const toCab = cab.x < b.x ? -1 : 1;
  if (b.state !== 'air' && b.state !== 'hurt' && b.state !== 'dazed' && b.state !== 'dying' && b.state !== 'dead') b.face = toCab;

  switch (b.state) {
    case 'intro':
      if (b.t > TUNE.bossIntro) { b.state = 'walk'; b.t = 0; }
      break;
    case 'walk': {
      const d = Math.abs(cab.x - b.x);
      const mv = d > 90 ? toCab : d < 55 ? -toCab : 0;
      b.x += mv * spd;
      if (b.t > 70 - ph * 12) { b.atk++; b.state = (b.atk % 2 || ph === 0 && b.atk % 3 === 0) ? 'peel' : 'leap'; if (ph === 0 && b.atk === 1) b.state = 'peel'; b.t = 0; if (b.state === 'peel') sfx.bossWind(); }
      break;
    }
    case 'peel':
      if (b.t === TUNE.bossPeelWind || (ph >= 1 && b.t === TUNE.bossPeelWind + 28)) {
        b.peels.push({ x: b.x + b.face * 16, dir: b.face, sp: 2.2 + ph * 0.35, rot: 0 }); sfx.toss();
      }
      if (b.t > TUNE.bossPeelWind + (ph >= 1 ? 52 : 28)) { b.state = 'walk'; b.t = 0; }
      break;
    case 'leap':
      if (b.t === TUNE.bossLeapWind) {
        const air = 54 - ph * 4;
        b.vy = -(0.5 * TUNE.gravity * air); b.vx = clamp((cab.x - b.x) / air, -3.4, 3.4); b.state = 'air'; b.t = 0; b.landY = GROUND;
      }
      break;
    case 'air':
      b.x += b.vx; b.vy += TUNE.gravity; b.y += b.vy;
      if (b.y >= GROUND) { b.y = GROUND; b.vy = 0; b.state = 'dazed'; b.t = 0; bossShock(b.x); }
      break;
    case 'dazed':
      if (b.t > TUNE.bossDazed - ph * 15) { b.state = 'walk'; b.t = 0; }
      break;
    case 'hurt':
      b.x += (b.t < 30 ? -b.face * 0.8 : 0);
      if (b.t > TUNE.bossHurt) { b.state = 'walk'; b.t = 0; }
      break;
    case 'dying':
      if (b.t % 6 === 0) burst(b.x + (Math.random() - 0.5) * 20, b.y - 10 - Math.random() * 40, 3, BANANA_COLORS, 1.4);
      if (b.t > 100) {
        b.state = 'dead'; b.t = 0; sfx.bossBoom(); shake = 14; flash = 10;
        burst(b.x, b.y - 28, 40, BANANA_COLORS.concat(['#fff', '#6b4423']), 3.6);
        item = { x: b.x, y: b.y - 60, vy: -2, t: 0 };
        addScore(2000, b.x, b.y - 70);
      }
      break;
  }
  b.x = clamp(b.x, ARENA.left + 24, ARENA.right - 20);

  // peels and shockwaves
  for (const p of b.peels) {
    p.x += p.dir * p.sp; p.rot += 0.3;
    if (p.x < ARENA.left + 8 || p.x > ARENA.right - 8) p.dead = true;
    if (state === 'play' && Math.abs(p.x - cab.x) < 10 && cab.y > GROUND - 8) { hurtCab(p.x); p.dead = true; burst(p.x, GROUND - 4, 5, BANANA_COLORS, 1.4); }
  }
  b.peels = b.peels.filter((p) => !p.dead);
  for (const w of b.waves) {
    w.x += w.dir * w.sp;
    if (w.x < ARENA.left + 6 || w.x > ARENA.right - 6) w.dead = true;
    if (frame % 3 === 0) particles.push({ x: w.x, y: GROUND - 1, vx: -w.dir * 0.5, vy: -0.5, life: 14, c: '#e8d9b0', g: 0, s: 2 });
    if (state === 'play' && Math.abs(w.x - cab.x) < 11 && cab.y > GROUND - 9) { hurtCab(w.x); }
  }
  b.waves = b.waves.filter((w) => !w.dead);

  // touching / stomping Baron Von Peel
  const dangerous = b.state === 'walk' || b.state === 'peel' || b.state === 'air' || b.state === 'leap' || b.state === 'intro';
  const stompable = b.state === 'walk' || b.state === 'peel' || b.state === 'dazed' || b.state === 'leap';
  const top = b.y - 52;
  if (state === 'play' && Math.abs(cab.x - b.x) < 17 && cab.y > top && cab.y - cab.h < b.y) {
    if (stompable && cab.vy > 0 && cab.y - cab.vy <= top + 9) {
      b.hp--; bossHp = b.hp; b.flash = 20; b.t = 0; sfx.bossHit(); shake = 8;
      cab.vy = -TUNE.stompBounceHeld; cab.onGround = false; cab.hurt = Math.max(cab.hurt, 20);
      burst(b.x, top, 10, BANANA_COLORS, 2.4);
      addScore(500, b.x, top - 10);
      b.peels = []; b.waves = b.waves.filter((w) => false);
      if (b.hp <= 0) { b.state = 'dying'; say('Ugh... I\'m... a-PEEL-ing...', 110); }
      else { b.state = 'hurt'; say(['', 'Ow! That\'s bananas!', 'Now I\'m MAD!'][3 - b.hp] || 'Ow!', 80); }
    } else if (dangerous) hurtCab(b.x);
  }
}

// ---------- Update ----------
function updatePlay() {
  updateCab();
  updateEnemies(); updateMonkeys(); updatePeels(); updateCoconuts(); updateCookies(); updateBells(); updateLadles(); updateBoss();
  // golden banana drop
  if (item) {
    item.t++;
    item.vy += 0.12; item.y += item.vy;
    if (item.y > GROUND - 10) { item.y = GROUND - 10; item.vy = -Math.abs(item.vy) * 0.4; if (Math.abs(item.vy) < 0.4) item.vy = 0; }
    if (state === 'play' && item.t > 40 && Math.abs(cab.x - item.x) < 14 && cab.y - 30 < item.y + 10 && cab.y + 6 > item.y) {
      state = 'ending'; endT = 0; sfx.win(); burst(item.x, item.y, 20, ['#fff', '#ffe08a', '#ffd93b'], 2.6); item.got = true;
    }
  }
  // camera
  let target = cab.x - 130 + cab.face * 22;
  if (boss.camLock > 0) target = target + (ARENA.left - target) * boss.camLock;
  target = clamp(target, 0, LEVEL_W - W);
  camX += (target - camX) * 0.12;
  if (Math.abs(target - camX) < 0.3) camX = target;
}
function updateParticles() {
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
  particles = particles.filter((p) => p.life > 0);
  for (const p of popups) { p.t++; p.y -= 0.4; }
  popups = popups.filter((p) => p.t < 50);
}

// ---------- Cutscene dialogue ----------
const INTRO_LINES = [
  { who: 'hannah', text: "Hi Cab! I'm Hannah. My tummy is rumbling so loud!" },
  { who: 'cab', text: 'Hannah... Han-nah... what rhymes with that?' },
  { who: 'cab', text: 'BA-NA-NA! Han-nah... ba-na-na!', rhyme: true },
  { who: 'hannah', text: 'Ooh! I LOVE bananas!' },
  { who: 'cab', text: 'One banana, coming up! The ripest ones grow in Banana Grove...' },
  { who: 'cab', text: '...where a very grumpy banana lives. Wish me luck!' },
];
const OUTRO_LINES = [
  { who: 'cab', text: 'Dinner is served! One perfectly ripe banana for Hannah!', serve: true },
  { who: 'hannah', text: "Yum! Han-nah, ba-na-na... it RHYMES! You're the best chef, Cab!", rhyme: true },
];
function startScene(lines, kind, after) {
  sceneLines = lines; sceneIdx = 0; sceneChars = 0; sceneAfter = after; sceneKind = kind; sceneT = 0; state = 'cutscene';
}
function updateScene() {
  sceneT++;
  const line = sceneLines[sceneIdx];
  const entering = sceneKind === 'intro' && sceneT < 70;
  if (entering) { if (sceneT === 8) sfx.doorbell(); input.action = false; return; }
  if (sceneChars < line.text.length) {
    const before = Math.floor(sceneChars);
    sceneChars += 0.7;
    if (Math.floor(sceneChars) !== before && Math.floor(sceneChars) % 2 === 0) sfx.talk(line.who === 'hannah');
  }
  if (input.action) {
    if (sceneChars < line.text.length) sceneChars = line.text.length;
    else if (++sceneIdx >= sceneLines.length) { const f = sceneAfter; sceneLines = null; f(); return; }
    else { sceneChars = 0; if (sceneLines[sceneIdx].rhyme) sfx.ding2(); }
  }
}

// ---------- Drawing: characters ----------
const CAB_PAL = { skin: '#ffd9b3', skin2: '#f0b98c', white: '#ffffff', shade: '#d9dff0', red: '#e24a4a', pants: '#3b4a8a', shoe: '#4a2c1a', dark: '#2a1a22', cheek: '#ff9aa0' };
function drawCab(x, y, face, o) { // x = center, y = feet. o: {scale, walk, air, vy, toss, hurt, talk, joy, spin, back}
  o = o || {};
  const s = o.scale || 1;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * s, s);
  const P = CAB_PAL;
  const w = Math.sin(o.walk || 0);
  const bob = o.air ? 0 : (o.walk ? Math.abs(w) > 0.5 ? 1 : 0 : 0);
  if (o.spin) { ctx.rotate(o.spin); ctx.translate(0, -10); }
  // legs
  const la = o.air ? 0 : Math.round(w * 2), lb = o.air ? 1 : -Math.round(w * 2);
  R(-4 + la, -6, 3, 4, P.pants); R(1 + lb, -6, 3, 4, P.pants);
  R(-5 + la, -2, 5, 2, P.shoe); R(1 + lb, -2, 5, 2, P.shoe);
  // jacket
  R(-5, -13 - bob, 10, 8 + bob, P.white); R(-5, -6, 10, 1, P.shade); R(-5, -13 - bob, 1, 8 + bob, P.shade);
  R(2, -11 - bob, 1, 1, P.dark); R(2, -8 - bob, 1, 1, P.dark);
  R(-3, -14 - bob, 6, 2, P.red); // neckerchief
  // arms
  if (o.joy || o.air && (o.vy || 0) < 0) { R(-7, -19 - bob, 2, 6, P.white); R(-7, -21 - bob, 2, 2, P.skin); R(5, -19 - bob, 2, 6, P.white); R(5, -21 - bob, 2, 2, P.skin); }
  else if (o.toss) { R(4, -14 - bob, 5, 2, P.white); R(9, -14 - bob, 2, 2, P.skin); R(-6, -11 - bob, 2, 4, P.white); }
  else if (o.serve) { R(3, -12 - bob, 6, 2, P.white); R(9, -13 - bob, 2, 2, P.skin); R(-6, -11 - bob, 2, 4, P.white); }
  else { const sw = Math.round(w * 2); R(-7, -11 - bob, 2, 4, P.white); R(-7, -8 - bob + sw, 2, 2, P.skin); R(5, -11 - bob, 2, 4, P.white); R(5, -8 - bob - sw, 2, 2, P.skin); }
  // head
  const hy = -17 - bob;
  disc(0, hy, 5, P.skin);
  R(-5, hy + 1, 1, 2, P.skin2); R(-4, hy + 4, 7, 1, P.skin2);
  if (!o.back) {
    const blink = (Math.floor(frame / 120) % 3 === 0 && frame % 120 < 6);
    if (o.hurt) { R(0, hy - 2, 2, 1, P.dark); R(3, hy - 2, 2, 1, P.dark); R(1, hy - 1, 1, 1, P.dark); R(4, hy - 1, 1, 1, P.dark); }
    else if (blink) { R(0, hy - 1, 2, 1, P.dark); R(3, hy - 1, 2, 1, P.dark); }
    else { R(0, hy - 2, 2, 3, P.dark); R(3, hy - 2, 2, 3, P.dark); R(0, hy - 2, 1, 1, '#fff'); R(3, hy - 2, 1, 1, '#fff'); }
    R(-1, hy + 1, 2, 1, P.cheek); R(4, hy + 1, 2, 1, P.cheek);
    if (o.talk && Math.floor(frame / 6) % 2) { R(2, hy + 2, 2, 2, P.dark); }
    else if (o.hurt) { R(2, hy + 2, 2, 1, P.dark); }
    else { R(1, hy + 2, 3, 1, P.dark); R(0, hy + 1, 1, 1, P.dark); R(4, hy + 1, 1, 1, P.dark); }
  }
  // chef hat
  R(-4, hy - 7, 9, 3, P.white); R(-4, hy - 5, 9, 1, P.shade);
  disc(0, hy - 10, 4, P.white); disc(-4, hy - 8, 2, P.white); disc(4, hy - 8, 2, P.white);
  R(-1, hy - 13, 3, 1, P.shade); R(-5, hy - 9, 1, 1, P.shade);
  ctx.restore();
}
const HAN_PAL = { skin: '#e9b48b', skin2: '#c98f66', hair: '#3a2418', hair2: '#5a3a28', dress: '#e0559a', dress2: '#b83e7e', clip: '#ffd93b', dark: '#2a1a22', cheek: '#ff8f95', shoe: '#7a2a52' };
function drawHannah(x, y, face, o) {
  o = o || {};
  const s = o.scale || 1, P = HAN_PAL;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * s, s);
  const w = Math.sin(o.walk || 0);
  R(-3, -5, 2, 5, P.skin); R(1, -5, 2, 5, P.skin); R(-4, -1, 3, 1, P.shoe); R(1, -1, 3, 1, P.shoe);
  // dress (triangle-ish)
  R(-5, -7, 10, 3, P.dress); R(-4, -11, 8, 5, P.dress); R(-5, -5, 10, 1, P.dress2);
  R(-3, -12, 6, 1, P.dress2);
  R(-6, -11, 2, 5, P.skin); R(4, -11, 2, 5, P.skin);
  if (o.hungry) { R(-6, -8, 12, 1, P.skin); }
  // head with long hair
  const hy = -17;
  R(-6, hy - 4, 12, 14, P.hair); R(-5, hy - 5, 10, 1, P.hair); R(-6, hy + 9, 12, 1, P.hair2);
  disc(0, hy, 5, P.skin);
  R(-5, hy - 5, 11, 3, P.hair); R(-5, hy - 3, 3, 2, P.hair); R(4, hy - 3, 2, 3, P.hair);
  disc(-1, hy - 8, 3, P.hair); // bun
  R(3, hy - 6, 2, 2, P.clip); // banana-yellow hair clip
  const blink = (Math.floor(frame / 100) % 3 === 1 && frame % 100 < 6);
  if (blink) { R(0, hy - 1, 2, 1, P.dark); R(3, hy - 1, 2, 1, P.dark); }
  else { R(0, hy - 2, 2, 3, P.dark); R(3, hy - 2, 2, 3, P.dark); R(0, hy - 2, 1, 1, '#fff'); R(3, hy - 2, 1, 1, '#fff'); }
  R(-1, hy + 1, 2, 1, P.cheek); R(4, hy + 1, 2, 1, P.cheek);
  if (o.talk && Math.floor(frame / 6) % 2) R(2, hy + 2, 2, 2, P.dark); else { R(1, hy + 2, 3, 1, P.dark); R(0, hy + 1, 1, 1, P.dark); R(4, hy + 1, 1, 1, P.dark); }
  ctx.restore();
}

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

function drawMini(e) {
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
function drawBell(b) {
  const x = b.x, y = GROUND;
  R(x - 7, y - 2, 14, 2, '#5a3a1a'); R(x - 1, y - 22, 3, 21, '#7a4e22'); R(x - 8, y - 24, 17, 2, '#7a4e22');
  const sw = b.ring > 0 ? Math.round(Math.sin(b.ring * 0.8) * 2) : 0;
  const c1 = b.on ? '#ffd93b' : '#b9b9c4', c2 = b.on ? '#fff08a' : '#e6e6ee', c3 = b.on ? '#c99a14' : '#8a8a96';
  disc(x + sw, y - 16, 5, c1); R(x + sw - 5, y - 16, 11, 4, c1); R(x + sw - 6, y - 12, 13, 1, c3); R(x + sw - 3, y - 19, 2, 2, c2); R(x + sw, y - 11, 2, 2, c3);
  R(x - 1, y - 24, 3, 2, c3);
}
function drawCookie(c) {
  const bob = Math.round(Math.sin(frame * 0.08 + c.x) * 1.5);
  disc(c.x, c.y + bob, 4, '#c98b3e'); disc(c.x, c.y + bob, 3, '#e3a455');
  R(c.x - 2, c.y + bob - 1, 1, 1, '#5a3318'); R(c.x + 1, c.y + bob - 2, 1, 1, '#5a3318'); R(c.x, c.y + bob + 1, 1, 1, '#5a3318'); R(c.x + 2, c.y + bob + 1, 1, 1, '#5a3318');
}
function drawSign(x, text) {
  ctx.font = 'bold 6px ' + FONT;
  const w = Math.ceil(ctx.measureText(text).width) + 8;
  R(x - 1, GROUND - 12, 3, 12, '#6b4423');
  R(x - w / 2, GROUND - 26, w, 14, '#a8743a'); R(x - w / 2, GROUND - 26, w, 1, '#d09a58'); R(x - w / 2, GROUND - 13, w, 1, '#6b4423');
  txt(text, x, GROUND - 24, 6, '#fff7e0', 'center', '#4a2c1a');
}
function drawCoconutCluster(k) {
  if (k.state === 'gone') return;
  const sh = k.state === 'shake' ? Math.round(Math.sin(k.t * 1.2) * 1.5) : 0;
  const y = k.state === 'fall' ? k.y : 46;
  if (k.state !== 'fall') { // leafy cluster stays up in the tree
    disc(k.x + sh, 40, 8, '#2f8f3a'); disc(k.x - 6 + sh, 44, 5, '#3aa648'); disc(k.x + 6 + sh, 44, 5, '#3aa648');
  }
  disc(k.x + sh, y, 4, '#6b4423'); R(k.x + sh - 2, y - 2, 1, 1, '#9a6b3a'); R(k.x + sh - 1, y + 1, 2, 1, '#3e2410');
  if (k.state === 'shake' && k.t % 8 < 4) txtOutline('!', k.x - 1, 58, 9, '#fff', '#c33', 'center');
}

// ---------- Drawing: Baron Von Peel ----------
function drawBoss() {
  const b = boss;
  if (b.state === 'sleep' && !b.active) { drawBossBody(b, 0); return; }
  drawBossBody(b, 1);
}
function drawBossBody(b, awake) {
  if (b.state === 'dead') return;
  let x = Math.round(b.x), y = Math.round(b.y);
  const f = b.face;
  let sqY = 0, sqX = 0;
  if (b.state === 'leap') { const k = Math.min(1, b.t / TUNE.bossLeapWind); sqY = Math.round(k * 8); sqX = Math.round(k * 3); x += Math.round(Math.sin(b.t * 1.5) * 1); }
  if (b.state === 'air') { sqY = b.vy < 0 ? -3 : 0; }
  if (b.state === 'dying') x += Math.round(Math.sin(b.t * 1.8) * 2);
  const flashing = (b.flash > 0 && frame % 4 < 2) || (b.state === 'dying' && frame % 6 < 3);
  // shadow
  if (b.state !== 'air') R(x - 14, GROUND, 28, 2, 'rgba(0,0,0,.2)'); else R(x - 10 + (GROUND - b.y) / 20, GROUND, 20, 2, 'rgba(0,0,0,.15)');
  // cape (behind)
  const capeY = y - sqY;
  ctx.fillStyle = '#6a2a8f'; ctx.beginPath();
  ctx.moveTo(x - f * 3, capeY - 42); ctx.lineTo(x - f * 22, capeY - 2); ctx.lineTo(x - f * 4, capeY - 4); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a3fb5'; ctx.beginPath();
  ctx.moveTo(x - f * 3, capeY - 42); ctx.lineTo(x - f * 14, capeY - 8); ctx.lineTo(x - f * 4, capeY - 20); ctx.closePath(); ctx.fill();
  // feet
  const stepW = b.state === 'walk' ? Math.round(Math.sin(frame * 0.2) * 2) : 0;
  R(x - 9 + stepW, y - 4, 7, 4, '#4a3010'); R(x + 2 - stepW, y - 4, 7, 4, '#4a3010');
  // body
  const bh = 50 - sqY, bw = 26 + sqX;
  const body = flashing ? '#ffffff' : '#ffd93b', dark = flashing ? '#ffd1d1' : '#c99a14', light = flashing ? '#fff' : '#fff08a';
  bananaBody(x, y - 3, bh, bw, 9 * f, body, dark, light);
  // peeled "arms": peel strips
  const my = y - 3 - Math.round(bh * 0.4);
  const mo = bananaOffAt(bh, 9 * f, 0.55);
  const armUp = b.state === 'peel' ? (b.t < TUNE.bossPeelWind ? -10 : 2) : b.state === 'air' ? -12 : 0;
  R(x + mo + f * 13, my + armUp, 5, 3, '#e8c030'); R(x + mo + f * 17, my + armUp + 1, 3, 3, '#c99a14'); R(x + mo + f * 19, my + armUp + 2, 2, 2, '#f6d44a');
  R(x + mo - f * 16, my + 2, 4, 3, '#e8c030'); R(x + mo - f * 19, my + 4, 3, 3, '#c99a14');
  // face
  const fy = y - 3 - Math.round(bh * 0.74);
  const fo = bananaOffAt(bh, 9 * f, 0.26);
  const fx = x + fo + f * 2;
  if (b.state === 'dazed' || b.state === 'dying') {
    for (const dx of [-5, 3]) { R(fx + dx, fy, 4, 1, '#2a1a22'); R(fx + dx + 1, fy + 1, 2, 1, '#2a1a22'); R(fx + dx, fy + 2, 4, 1, '#2a1a22'); }
    R(fx - 2, fy + 7, 5, 2, '#2a1a22'); R(fx - 1, fy + 8, 3, 1, '#c33');
  } else if (b.state === 'hurt') {
    R(fx - 6, fy - 1, 5, 1, '#2a1a22'); R(fx + 2, fy - 1, 5, 1, '#2a1a22'); R(fx - 4, fy, 1, 1, '#2a1a22'); R(fx + 4, fy, 1, 1, '#2a1a22');
    R(fx - 3, fy + 6, 7, 4, '#2a1a22'); R(fx - 1, fy + 8, 3, 2, '#e24a4a');
  } else {
    const ex = awake ? 0 : 1;
    R(fx - 6, fy, 4, 4, '#fff'); R(fx + 2, fy, 4, 4, '#fff');
    R(fx - 4 + f, fy + 1 + ex, 2, 3 - ex, '#c11'); R(fx + 4 + f - 2, fy + 1 + ex, 2, 3 - ex, '#c11');
    for (let i = 0; i < 5; i++) { R(fx - 7 + i, fy - 3 + (f > 0 ? i : 4 - i) / 2 | 0, 1, 2, '#2a1a22'); R(fx + 2 + i, fy - 3 + (f > 0 ? 4 - i : i) / 2 | 0, 1, 2, '#2a1a22'); }
    const open = b.state === 'peel' || b.state === 'intro' || b.state === 'air';
    R(fx - 4, fy + 7, 9, open ? 5 : 3, '#2a1a22'); R(fx - 3, fy + 7, 2, 2, '#fff'); R(fx + 2, fy + 7, 2, 2, '#fff'); if (open) R(fx - 1, fy + 10, 3, 2, '#c33');
    // little curly mustache
    R(fx - 6, fy + 5, 5, 1, '#3a1d12'); R(fx + 1, fy + 5, 5, 1, '#3a1d12'); R(fx - 7, fy + 4, 1, 1, '#3a1d12'); R(fx + 6, fy + 4, 1, 1, '#3a1d12');
  }
  // monocle-free evil top: tiny black top hat on the stem
  const tOff = bananaOffAt(bh, 9 * f, 0);
  R(x + tOff - 5, y - 3 - bh - 4, 10, 2, '#1d1424'); R(x + tOff - 3, y - 3 - bh - 9, 6, 6, '#1d1424'); R(x + tOff - 3, y - 3 - bh - 6, 6, 1, '#8a3fb5');
  // dazed stars
  if (b.state === 'dazed') for (let i = 0; i < 3; i++) {
    const a = frame * 0.12 + i * 2.1;
    const sx = x + tOff + Math.cos(a) * 12, sy = y - bh - 12 + Math.sin(a) * 3;
    R(sx - 1, sy - 2, 3, 1, '#ffe14a'); R(sx - 2, sy - 1, 5, 1, '#ffe14a'); R(sx - 1, sy, 3, 1, '#ffe14a');
  }
  if (b.state === 'peel' && b.t < TUNE.bossPeelWind && frame % 10 < 5) txtOutline('!', x + tOff, y - bh - 24, 10, '#fff', '#c33', 'center');
  // speech bubble
  if (b.bubbleT > 0 && b.bubble) bubble(x + tOff, y - bh - 28, b.bubble);
}
function bubble(cx, y, text) {
  ctx.font = 'bold 7px ' + FONT;
  const w = Math.ceil(ctx.measureText(text).width) + 10;
  const x = clamp(Math.round(cx - w / 2), Math.round(camX) + 4, Math.round(camX) + W - w - 4);
  R(x, y - 10, w, 12, '#fff'); R(x + 1, y - 11, w - 2, 1, '#fff'); R(x + 1, y + 2, w - 2, 1, '#fff'); R(x, y + 2, w, 0, '#fff');
  R(cx - 2, y + 3, 4, 2, '#fff'); R(cx - 1, y + 5, 2, 1, '#fff');
  txt(text, x + w / 2, y - 8, 7, '#2a1a22', 'center', false);
}

// ---------- Drawing: scenery ----------
function drawSky() {
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
function drawFar() { // distant misty hills
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
function drawGroundSeg(a, b) {
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
function drawPitBackdrop() {
  for (const [a, b] of PITS) {
    if (b < camX - 4 || a > camX + W + 4) continue;
    R(a, GROUND, b - a, 40, '#1b2a1f');
    for (let x = a + 4; x < b; x += 8) R(x, GROUND + 6 + (hash(x, 5) * 14 | 0), 2, 2, '#2f4a35');
    R(a, GROUND + 22, b - a, 1, '#254030');
    // dangling roots
    for (let x = a + 5; x < b; x += 11) R(x, GROUND, 1, 6 + (hash(x, 9) * 8 | 0), '#4a6a3a');
  }
}
function drawPlat(p) {
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
const DECOR = (() => {
  const out = [];
  for (let x = 30; x < LEVEL_W; x += 55 + Math.floor(hash(x, 1) * 90)) {
    if (PITS.some(([a, b]) => x > a - 14 && x < b + 14)) continue;
    if (x > ARENA.left - 30 && x < ARENA.right + 40) continue;
    const r = hash(x, 2);
    out.push({ x, kind: r < 0.4 ? 'palm' : r < 0.7 ? 'bush' : r < 0.85 ? 'flower' : 'banana' });
  }
  for (const x of COCONUTS) out.push({ x, kind: 'bigpalm' });
  return out;
})();
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
function drawDecor() {
  for (const d of DECOR) {
    if (d.x < camX - 40 || d.x > camX + W + 40) continue;
    if (d.kind === 'palm') drawPalm(d.x, 60 + hash(d.x, 3) * 25, 1.5, false);
    else if (d.kind === 'bigpalm') drawPalm(d.x, 100, 2, true);
    else if (d.kind === 'bush') { disc(d.x, GROUND - 4, 6, '#2f8f3a'); disc(d.x + 8, GROUND - 3, 5, '#3aa648'); disc(d.x - 7, GROUND - 3, 5, '#46b04a'); R(d.x - 10, GROUND - 3, 24, 3, '#2f8f3a'); }
    else if (d.kind === 'flower') { for (let i = 0; i < 3; i++) { const fx = d.x + i * 5; R(fx, GROUND - 6, 1, 6, '#2f8f3a'); R(fx - 1, GROUND - 8, 3, 3, ['#ff6b8a', '#fff', '#ffb84a'][i]); R(fx, GROUND - 7, 1, 1, '#ffe14a'); } }
    else if (d.kind === 'banana') { drawPalm(d.x, 55, 1.2, false); for (let i = 0; i < 3; i++) { sprite(d.x - 4 + i * 4, GROUND - 52 + (i % 2) * 3, BANANA_ICON, BANANA_PAL); } }
  }
}
function drawBossWall() {
  const w = boss.wall; if (w <= 0) return;
  const x = ARENA.left, bottom = Math.round(GROUND * w);
  for (let y = bottom - 12; y > -14; y -= 12) {
    R(x, y, 14, 12, '#a8743a'); R(x, y, 14, 1, '#d09a58'); R(x, y + 11, 14, 1, '#6b4423'); R(x + 6, y, 1, 12, '#6b4423'); R(x + 3, y + 5, 8, 2, '#ffd93b');
  }
}
function drawRightWall() {
  const x = ARENA.right;
  for (let y = GROUND - 12; y > -14; y -= 12) { R(x, y, 24, 12, '#a8743a'); R(x, y, 24, 1, '#d09a58'); R(x, y + 11, 24, 1, '#6b4423'); R(x + 11, y, 1, 12, '#6b4423'); R(x + 6, y + 5, 12, 2, '#ffd93b'); }
  R(x + 24, 0, 100, GROUND, '#3f9a55');
}
function drawArenaDecor() {
  // banana crates stacked in the corners of the arena
  for (const [cx, n] of [[ARENA.left + 4, 2], [ARENA.right - 26, 1]]) for (let i = 0; i < n; i++) {
    R(cx, GROUND - 12 * (i + 1), 22, 12, '#b5803f'); R(cx, GROUND - 12 * (i + 1), 22, 1, '#d6a15e'); R(cx, GROUND - 12 * i - 1, 22, 1, '#6b4423'); R(cx + 10, GROUND - 12 * (i + 1), 2, 12, '#6b4423');
    sprite(cx + 6, GROUND - 12 * (i + 1) + 1, BANANA_ICON, BANANA_PAL);
  }
}

// ---------- Drawing: HUD & screens ----------
function drawHud() {
  for (let i = 0; i < TUNE.hearts; i++) sprite(6 + i * 10, 6, HEART, { X: i < hearts ? '#ff4a6a' : '#4a2a3a' });
  sprite(6, 17, BANANA_ICON, BANANA_PAL);
  txt('Banana Grove', 18, 19, 7, '#fff', 'left');
  txt(String(score).padStart(6, '0'), W - 6, 6, 8, '#fff', 'right');
  const ck = 'x ' + gotCookies.size; ctx.font = 'bold 7px ' + FONT; const cw = Math.ceil(ctx.measureText(ck).width);
  txt(ck, W - 6, 20, 7, '#fff3c4', 'right');
  disc(W - 12 - cw, 23, 3, '#c98b3e'); R(W - 13 - cw, 22, 1, 1, '#5a3318'); R(W - 11 - cw, 24, 1, 1, '#5a3318');
  if (boss.active && boss.state !== 'dead') {
    txt('BARON VON PEEL', W / 2, 6, 8, '#ffd1ff', 'center', '#3a1050');
    for (let i = 0; i < TUNE.bossHp; i++) sprite(W / 2 - TUNE.bossHp * 6 + i * 12, 17, BANANA_ICON, i < boss.hp ? BANANA_PAL : { Y: '#5a4a3a', y: '#6a5a4a', K: '#3a2a1a' });
  }
  if (muted) txt('MUTE', W / 2, H - 10, 6, '#fff', 'center');
}
function drawWorld() {
  const cx = Math.round(camX);
  ctx.save();
  const sx = shake > 0 ? Math.round((Math.random() - 0.5) * shake) : 0, sy = shake > 0 ? Math.round((Math.random() - 0.5) * shake) : 0;
  ctx.translate(-cx + sx, sy);
  drawPitBackdrop();
  drawDecor();
  for (const [a, b] of SEGS) drawGroundSeg(a, b);
  for (const p of PLATS) if (p[0] + p[2] > cx - 10 && p[0] < cx + W + 10) drawPlat(p);
  drawArenaDecor();
  for (const [x, t] of SIGNS) if (Math.abs(x - cx - 160) < 220) drawSign(x, t);
  for (const k of coconuts) drawCoconutCluster(k);
  for (const b of bells) drawBell(b);
  for (const p of peels) drawPeel(p.x, GROUND - 2, undefined, false);
  for (const c of cookies) if (!c.got && Math.abs(c.x - cx - 160) < 180) drawCookie(c);
  for (const m of monkeys) drawMonkey(m);
  for (const e of enemies) if (Math.abs(e.x - cx - 160) < 200) drawMini(e);
  drawBoss();
  for (const p of boss.peels) drawPeel(p.x, GROUND - 4, p.rot, true);
  for (const w of boss.waves) { R(w.x - 7, GROUND - 9, 14, 9, 'rgba(232,217,176,.75)'); R(w.x - 4, GROUND - 12, 8, 3, 'rgba(255,255,255,.85)'); R(w.x - 8, GROUND - 3, 16, 3, '#ffd93b'); }
  for (const b of bananaThrows) drawPeel(b.x, b.y, b.rot, false);
  for (const l of ladles) { ctx.save(); ctx.translate(Math.round(l.x), Math.round(l.y)); ctx.rotate(l.spin); R(-1, -1, 7, 2, '#8a6a4a'); disc(-3, 0, 3, '#c9ced6'); disc(-3, 0, 2, '#9aa0aa'); ctx.restore(); }
  if (item && !item.got) {
    const g = 0.5 + 0.5 * Math.sin(frame * 0.2);
    disc(item.x, item.y, 12 + g * 3, 'rgba(255,240,120,.25)'); disc(item.x, item.y, 8, 'rgba(255,240,120,.35)');
    sprite(item.x - 5, item.y - 5 + Math.round(Math.sin(frame * 0.1) * 2), BANANA_ICON, GOLD_PAL);
    if (frame % 10 < 5) R(item.x + 8, item.y - 8, 1, 3, '#fff');
  }
  if (state !== 'dead' || deadT < 40) {
    const c = cab;
    if (!(c.hurt > 0 && frame % 6 < 3 && state === 'play')) {
      drawCab(c.x, c.y, c.face, { walk: c.anim * 1.4, air: !c.onGround, vy: c.vy, toss: c.tossT > 0, hurt: c.stun > 0 || state === 'dead', joy: state === 'ending', spin: c.slip > 0 ? c.spin : 0 });
    }
  }
  drawRightWall(); drawBossWall();
  for (const k of coconuts) if (k.state === 'fall') drawCoconutCluster(k);
  for (const p of particles) R(p.x, p.y, p.s, p.s, p.c);
  for (const p of popups) txtOutline(p.s, p.x, p.y, 7, p.c, '#3a2410', 'center');
  ctx.restore();
}

// ---------- Dining room (cutscenes, title) ----------
function drawRoom() {
  R(0, 0, W, H, '#f6d8a8');
  ctx.save(); ctx.translate(0, -26);
  for (let x = 0; x < W; x += 16) R(x, 26, 8, 94, '#f0cb94'); R(0, 0, W, 26, '#f6d8a8'); for (let x = 0; x < W; x += 16) R(x, 0, 8, 26, '#f0cb94');
  R(0, 98, W, 22, '#a8743a'); R(0, 98, W, 2, '#d09a58'); R(0, 118, W, 2, '#6b4423'); // wainscot
  R(0, 120, W, 90, '#8a5a2e');
  for (let x = 0; x < W; x += 30) R(x, 120, 1, 90, '#6b4423');
  for (let y = 135; y < H + 30; y += 15) R(0, y, W, 1, '#6b4423');
  // window with night sky
  R(118, 14, 84, 62, '#fff0cf'); R(122, 18, 76, 54, '#1d2a5a');
  for (let i = 0; i < 10; i++) R(126 + hash(i, 1) * 68, 22 + hash(i, 2) * 44, 1, 1, '#fff');
  disc(180, 34, 7, '#fff4b0'); disc(183, 32, 6, '#1d2a5a');
  R(158, 18, 4, 54, '#fff0cf'); R(122, 44, 76, 4, '#fff0cf');
  R(112, 76, 96, 5, '#d6a15e');
  // lamp
  R(159, 0, 2, 8, '#6b4423'); R(150, 8, 20, 6, '#ffd93b'); R(152, 14, 16, 2, '#fff08a');
  disc(160, 28, 14, 'rgba(255,230,150,.12)');
  // door on the right
  R(262, 40, 40, 80, '#6b4423'); R(265, 44, 34, 76, '#8a5a2e'); R(268, 50, 12, 28, '#a8743a'); R(284, 50, 12, 28, '#a8743a'); R(268, 84, 12, 28, '#a8743a'); R(284, 84, 12, 28, '#a8743a'); disc(295, 84, 2, '#ffd93b');
  // table
  R(100, 124, 100, 6, '#e24a4a'); for (let x = 100; x < 200; x += 8) R(x, 124, 4, 6, '#fff');
  R(104, 130, 92, 3, '#b83a3a'); R(108, 133, 6, 20, '#6b4423'); R(186, 133, 6, 20, '#6b4423');
  disc(150, 123, 12, '#fff'); R(138, 122, 24, 3, '#fff'); R(138, 124, 24, 1, '#d9dff0');
  R(118, 120, 2, 5, '#c9ced6'); R(180, 120, 2, 5, '#c9ced6');
  ctx.restore();
}
function drawHungryBubbles(x, y) {
  if (frame % 60 < 30) { txtOutline('grrrrr...', x, y, 7, '#fff', '#7a2a52', 'center'); }
}
function drawDialogue(line) {
  const shown = line.text.slice(0, Math.floor(sceneChars));
  R(8, 136, W - 16, 40, '#2a1a22'); R(10, 138, W - 20, 36, '#fff8e8'); R(10, 138, W - 20, 2, '#ffd93b');
  const name = line.who === 'cab' ? 'CAB' : 'HANNAH';
  R(14, 130, name.length * 6 + 10, 12, line.who === 'cab' ? '#3b4a8a' : '#e0559a');
  txt(name, 19, 132, 7, '#fff', 'left', false);
  // word wrap
  ctx.font = 'bold 8px ' + FONT;
  const words = shown.split(' '); let lineStr = '', y = 145;
  for (const w of words) {
    const test = lineStr ? lineStr + ' ' + w : w;
    if (ctx.measureText(test).width > W - 40) { txt(lineStr, 18, y, 8, '#2a1a22', 'left', false); y += 10; lineStr = w; } else lineStr = test;
  }
  txt(lineStr, 18, y, 8, '#2a1a22', 'left', false);
  if (sceneChars >= line.text.length && frame % 40 < 24) R(W - 22, 164, 6, 6, '#e0559a');
}
function drawCutscene() {
  drawRoom();
  const line = sceneLines[sceneIdx];
  let hx = 232, hAlpha = 1;
  if (sceneKind === 'intro' && sceneT < 70) { hx = 232 + Math.max(0, 70 - sceneT) * 2.2; }
  // Cab, Hannah (2x so they read as characters)
  const talking = sceneChars < line.text.length;
  const walkH = sceneKind === 'intro' && sceneT < 70 ? sceneT * 0.4 : 0;
  drawCab(70, 134, 1, { scale: 3, talk: talking && line.who === 'cab', joy: line.rhyme && line.who === 'cab' && Math.floor(frame / 15) % 2, serve: line.serve });
  drawHannah(hx, 134, -1, { scale: 3, talk: talking && line.who === 'hannah', walk: walkH, hungry: true });
  if (sceneKind === 'intro' && sceneT >= 70 && sceneIdx === 0 && !talking) drawHungryBubbles(hx, 30);
  if (line.serve || (sceneKind === 'outro' && sceneIdx >= 0)) { // banana on the plate (and in Hannah's hands later)
    sprite(145, 87, BANANA_ICON, BANANA_PAL);
  }
  if (line.rhyme && line.who === 'cab') { // the rhyme appears over his head
    const k = Math.min(1, sceneChars / 12), by = 30 - Math.round(Math.sin(frame * 0.12) * 2);
    txtOutline('HAN-NAH', 70, 14, 10, '#ffd1ec', '#7a2a52', 'center');
    txtOutline('BA-NA-NA', 70, 26, 10, '#fff08a', '#7a5a10', 'center');
    if (k >= 1) sprite(112, by - 2, BANANA_ICON, BANANA_PAL);
  }
  if (line.rhyme && line.who === 'hannah') {
    txtOutline('HAN-NAH = BA-NA-NA', 232, 30, 7, '#fff08a', '#7a5a10', 'center');
  }
  if (sceneKind === 'outro' || sceneIdx >= 0) drawDialogue(line);
}
function drawTitle() {
  drawSky(); drawFarScreen();
  R(0, GROUND, W, 30, '#8a5a2e'); R(0, GROUND - 1, W, 5, '#46b04a'); R(0, GROUND - 1, W, 1, '#6fd36a');
  const bob = Math.round(Math.abs(Math.sin(frame * 0.08)) * 4);
  txtOutline('EVERYBODY', W / 2, 18 + bob / 2, 26, '#ffd93b', '#5a2a12', 'center');
  txtOutline('EATS!', W / 2, 46 + bob / 2, 30, '#ff6b8a', '#5a1230', 'center');
  drawCab(70, GROUND - bob, 1, { scale: 2, joy: bob > 2, air: bob > 0, vy: -1 });
  for (let i = 0; i < 3; i++) sprite(262 + i * 14, GROUND - 14 - (i === 1 ? 6 : 0), BANANA_ICON, BANANA_PAL);
  if (frame % 60 < 40) txtOutline(IS_TOUCH ? 'TAP TO START' : 'PRESS SPACE TO START', 176, 96, 9, '#fff', '#3a2410', 'center');
  txt('Cab the chef must feed', 176, 112, 6, '#fff', 'center');
  txt('every hungry dinner guest!', 176, 121, 6, '#fff', 'center');
  txt('Level 1: Hannah -> BANANA', 176, 133, 6, '#fff8c0', 'center');
}
function drawFarScreen() { drawFar(); }
function drawCard() {
  R(0, 0, W, H, '#1d1424');
  const t = Math.min(1, cardT / 20);
  ctx.globalAlpha = t;
  txtOutline('LEVEL 1', W / 2, 44, 10, '#ffe08a', '#000', 'center');
  txtOutline('BANANA GROVE', W / 2, 60, 20, '#ffd93b', '#5a3a08', 'center');
  txt('Guest: Hannah', W / 2, 92, 8, '#ffd1ec', 'center');
  txt('Dish: BANANA  (rhymes with Hannah!)', W / 2, 104, 8, '#fff8c0', 'center');
  sprite(W / 2 - 5, 120, BANANA_ICON, BANANA_PAL);
  txt(IS_TOUCH ? 'Stomp bananas. Beat the boss!' : 'Stomp bananas. Toss ladles. Beat the boss!', W / 2, 146, 7, '#aab', 'center');
  ctx.globalAlpha = 1;
}
function drawDead() {
  ctx.fillStyle = 'rgba(20,10,30,.6)'; ctx.fillRect(0, 0, W, H);
  txtOutline('Oh no! Cab got slippy!', W / 2, 60, 12, '#fff', '#5a1230', 'center');
  txt('Hearts refilled. Banana boss HP stays hurt!', W / 2, 82, 7, '#ffd1ec', 'center');
  if (deadT > 50 && frame % 40 < 28) txtOutline(IS_TOUCH ? 'TAP TO TRY AGAIN' : 'PRESS SPACE TO TRY AGAIN', W / 2, 104, 9, '#fff08a', '#3a2410', 'center');
}
function drawUnlock() {
  drawRoom();
  const t = Math.min(1, unlockT / 25);
  ctx.fillStyle = 'rgba(20,10,30,' + (0.65 * t) + ')'; ctx.fillRect(0, 0, W, H);
  if (unlockT < 25) return;
  const s = Math.min(1, (unlockT - 25) / 20);
  txtOutline('NEW FOOD UNLOCKED!', W / 2, 16, 14, '#ffe08a', '#5a3a08', 'center');
  // recipe card
  R(100, 40, 120, 76, '#2a1a22'); R(102, 42, 116, 72, '#fff8e8'); R(102, 42, 116, 6, '#ffd93b');
  const g = 0.5 + 0.5 * Math.sin(frame * 0.15);
  disc(160, 74, 18 + g * 3, 'rgba(255,230,120,.35)');
  ctx.save(); ctx.translate(160, 74); ctx.scale(3, 3); sprite(-5, -5, BANANA_ICON, GOLD_PAL); ctx.restore();
  txt('BANANA', 160, 94, 11, '#8a5a10', 'center', false);
  txt('for Hannah  (rhymes!)', 160, 106, 6, '#7a5a40', 'center', false);
  if (unlockT > 90) {
    txt('Recipe book: 1 food', W / 2, 124, 8, '#fff', 'center');
    txtOutline('Ding-dong!  Another guest is at the door...', W / 2, 138, 8, '#ffd1ec', '#3a0a20', 'center');
    
  }
  if (unlockT > 130) {
    R(266, 20, 32, 76, '#ffe9a8'); R(270, 54, 24, 42, '#1a0f22'); disc(282, 50, 7, '#1a0f22'); R(268, 62, 3, 20, '#1a0f22'); R(293, 62, 3, 20, '#1a0f22');
    txtOutline('?', 282, 24, 14, '#ffd1ec', '#7a2a52', 'center');
  }
  if (unlockT > 150 && frame % 40 < 28) txt(IS_TOUCH ? 'TAP TO PLAY AGAIN' : 'PRESS SPACE TO PLAY AGAIN', W / 2, 168, 7, '#fff08a', 'center');
}
function drawPlay() {
  drawSky(); drawFar();
  if (boss.flash > 0 && frame % 4 < 2) { /* subtle hit flash handled in body */ }
  drawWorld();
  drawHud();
  if (boss.bannerT > 0) {
    const t = boss.bannerT, a = Math.min(1, t / 20, (140 - t) / 20);
    ctx.globalAlpha = Math.max(0, a);
    R(0, 30, W, 28, 'rgba(40,10,60,.75)'); ctx.globalAlpha = Math.max(0, a);
    txtOutline('BOSS FIGHT', W / 2, 33, 8, '#ffd1ff', '#3a1050', 'center');
    txtOutline('BARON VON PEEL', W / 2, 43, 13, '#ffd93b', '#5a2a12', 'center');
    ctx.globalAlpha = 1;
  }
  if (state === 'ending') { ctx.fillStyle = 'rgba(255,255,255,' + clamp((endT - 30) / 40, 0, 1) + ')'; ctx.fillRect(0, 0, W, H); }
  if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + flash / 10 + ')'; ctx.fillRect(0, 0, W, H); }
}

function draw() {
  ctx.setTransform(SS, 0, 0, SS, 0, 0);
  ctx.imageSmoothingEnabled = false;
  switch (state) {
    case 'title': drawTitle(); break;
    case 'cutscene': drawCutscene(); break;
    case 'card': drawCard(); break;
    case 'play': case 'ending': drawPlay(); break;
    case 'dead': drawPlay(); drawDead(); break;
    case 'unlock': drawUnlock(); break;
  }
}

// ---------- Main loop ----------
function step() {
  frame++;
  if (shake > 0) shake -= 0.5;
  if (flash > 0) flash--;
  switch (state) {
    case 'title':
      if (input.action) { audioInit(); startScene(INTRO_LINES, 'intro', () => startLevel()); }
      break;
    case 'cutscene': updateScene(); break;
    case 'card':
      cardT++;
      if (cardT > 150 || (cardT > 30 && input.action)) { state = 'play'; }
      break;
    case 'play': updatePlay(); updateParticles(); break;
    case 'dead':
      deadT++; cab.vy += TUNE.gravity; cab.y += cab.vy;
      updateParticles(); updateBoss();
      if (deadT > 50 && input.action) retryAfterDeath();
      break;
    case 'ending':
      endT++; updateParticles(); cab.vx = 0;
      if (endT > 100) { startScene(OUTRO_LINES, 'outro', () => { state = 'unlock'; unlockT = 0; sfx.win(); }); }
      break;
    case 'unlock':
      unlockT++;
      if (unlockT === 90) sfx.doorbell();
      if (unlockT === 130) sfx.knock();
      if (unlockT > 150 && input.action) { state = 'title'; }
      break;
  }
  input.jumpPressed = false; input.tossPressed = false; input.action = false;
  musicTick();
}
let acc = 0, last = performance.now();
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}

// ---------- Boot ----------
resetRun(40);
(function boot() {
  const q = new URLSearchParams(location.search);
  if (q.has('boss')) { checkpoint = 3340; resetRun(3340); state = 'play'; }
  else if (q.has('play')) { startLevel(); state = 'play'; }
  else if (q.has('intro')) { startScene(INTRO_LINES, 'intro', () => startLevel()); }
  else if (q.has('end')) { startScene(OUTRO_LINES, 'outro', () => { state = 'unlock'; unlockT = 0; }); }
  else if (q.has('unlock')) { state = 'unlock'; unlockT = 0; }
  if (q.has('x')) { const x = +q.get('x'); checkpoint = x; resetRun(x); }
})();
window.__game = {
  get state() { return state; }, set state(v) { state = v; },
  get cab() { return cab; }, get boss() { return boss; }, get hearts() { return hearts; }, set hearts(v) { hearts = v; },
  get score() { return score; }, get enemies() { return enemies; }, get monkeys() { return monkeys; }, get peels() { return peels; },
  get checkpoint() { return checkpoint; }, get camX() { return camX; }, get item() { return item; },
  input, setInput, step, startLevel, resetRun, TUNE, PITS, PLATS, LEVEL_W, ARENA, frame: () => frame,
  setBossHp(n) { bossHp = n; boss.hp = n; },
};
requestAnimationFrame(loop);
