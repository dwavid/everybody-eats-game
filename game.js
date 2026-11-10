'use strict';
// EVERYBODY EATS! — a side-scroller starring Cab, a cute little chef.
// Every dinner guest is a level. Cab feeds each guest a food that rhymes with their name,
// and unlocks the food by beating the boss: an evil, anthropomorphic version of it.
// Levels 1-3: Hannah -> BANANA, Tommy -> SALAMI, Davey -> GRAVY (data in levels.js, art in themes.js, bosses in bosses.js).
// This file is the engine. Plain Canvas + JS, no build step, all art drawn in code. See CLAUDE.md.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 320, H = 180, SS = 4;
canvas.width = W * SS; canvas.height = H * SS;


// ---------- Tunables ----------
const TUNE = {
  gravity: 0.3, fallGravity: 0.42, jump: 6.3, jumpCut: 1.4, maxFall: 7, // falling is heavier than rising; letting go of jump caps the rise speed at jumpCut
  accel: 0.36, airAccel: 0.3, airTurn: 0.5, friction: 0.3, airFriction: 0.14, maxSpeed: 1.9,
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
const input = { left: false, right: false, jump: false, down: false, toss: false, jumpPressed: false, tossPressed: false, action: false, leftPressed: false, rightPressed: false };
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
  if ((name === 'left' || name === 'right') && down && !input[name]) input[name + 'Pressed'] = true;
  input[name] = down;
}
addEventListener('keydown', (e) => {
  if (e.repeat) { if (keyMap[e.key]) e.preventDefault(); return; }
  const n = keyMap[e.key];
  if (n) { e.preventDefault(); setInput(n, true); audioInit(); }
  else if (e.key === 'Enter') { input.action = true; audioInit(); }
  else if (e.key === 'm' || e.key === 'M') { audioInit(); setMuted(!muted); }
  else if (state === 'title' && /^[1-9]$/.test(e.key) && +e.key - 1 <= progress) { titleSel = +e.key - 1; audioInit(); }
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
  rumble() { noise(0.5, 0.12); tone(70, 0.5, 'triangle', 0.14, 20); },
  geyser() { noise(0.4, 0.22); tone(220, 0.5, 'sawtooth', 0.08, 300); },
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
  deli: { step: 7,
    lead: [76, 0, 79, 76, 81, 0, 79, 0, 77, 0, 81, 77, 83, 0, 81, 0, 76, 79, 83, 0, 81, 79, 77, 0, 74, 0, 77, 74, 76, 0, 0, 0],
    bass: [45, 0, 52, 0, 45, 0, 52, 0, 41, 0, 48, 0, 41, 0, 48, 0, 45, 0, 52, 0, 45, 0, 52, 0, 40, 0, 47, 0, 40, 0, 47, 0] },
  bayou: { step: 10,
    lead: [67, 0, 0, 70, 0, 72, 73, 72, 0, 70, 0, 0, 67, 0, 0, 0, 65, 0, 0, 68, 0, 70, 71, 70, 0, 68, 0, 0, 65, 0, 0, 0],
    bass: [43, 0, 43, 0, 50, 0, 43, 0, 43, 0, 43, 0, 50, 0, 53, 0, 41, 0, 41, 0, 48, 0, 41, 0, 41, 0, 41, 0, 48, 0, 51, 0] },
  home: { step: 12,
    lead: [67, 0, 0, 71, 0, 0, 74, 0, 0, 71, 0, 0, 69, 0, 0, 72, 0, 0, 76, 0, 0, 72, 0, 0],
    bass: [43, 0, 0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 45, 0, 0, 0, 0, 0, 52, 0, 0, 0, 0, 0] },
};
let musicName = null, musicFrame = 0, musicStep = 0;
function musicTick() {
  const want = state === 'play' || state === 'dead' ? (boss && boss.active && boss.state !== 'dead' ? 'boss' : LV.music)
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

// ---------- Current level ----------
// LEVELS (levels.js) holds the data for every guest. loadLevel(i) copies the current one into these globals.
let levelIdx = 0, LV = LEVELS[0], BOSS = BOSSES[LV.boss], THEME = THEMES[LV.theme];
let LEVEL_W, ARENA, PITS, PLATS, BELLS, MINIS, THROWERS, SLICERS, GEYSERS, PUDDLES, DROPS, SIGNS, SEGS, COOKIES, DECOR;
function loadLevel(i) {
  levelIdx = i; LV = LEVELS[i]; THEME = THEMES[LV.theme]; BOSS = BOSSES[LV.boss];
  LEVEL_W = LV.width; ARENA = LV.arena; PITS = LV.pits; PLATS = LV.plats; BELLS = LV.bells; MINIS = LV.minis;
  THROWERS = LV.throwers; SLICERS = LV.slicers; GEYSERS = LV.geysers; PUDDLES = LV.puddles; DROPS = LV.drops; SIGNS = LV.signs;
  SEGS = []; let x = 0;
  for (const [a, b] of PITS) { SEGS.push([x, a]); x = b; }
  SEGS.push([x, LEVEL_W]);
  COOKIES = LV.cookies(); DECOR = genDecor(LV);
}

// ---------- Game state ----------
let state = 'title'; // title | cutscene | card | play | dead | ending | unlock
let frame = 0, shake = 0, flash = 0, fade = 0;
let camX = 0, camFollow = 0;
let score = 0, hearts = TUNE.hearts, checkpoint = 40;
let bossHp = TUNE.bossHp;
const gotCookies = new Set();
let cab, enemies, throwers, peels, drops, slicers, geysers, movers, cookies, bells, ladles, thrown, particles, popups, boss;
let item = null; // the golden banana
let sceneLines = null, sceneIdx = 0, sceneChars = 0, sceneAfter = null, sceneT = 0, sceneKind = 'intro';
let cardT = 0, deadT = 0, endT = 0, unlockT = 0;
let titleSel = 0, progress = 0; // title-screen level picker; progress = highest unlocked level (0-based)
try { progress = clamp(+localStorage.getItem('ee-progress') || 0, 0, LEVELS.length - 1); } catch (e) { /* ignore */ }
function saveProgress(p) { progress = Math.max(progress, p); try { localStorage.setItem('ee-progress', String(progress)); } catch (e) { /* ignore */ } }

function newCab(x) {
  return { x, y: GROUND, vx: 0, vy: 0, face: 1, onGround: true, coyote: 0, buf: 0, hurt: 0, stun: 0, slip: 0, slipDir: 1, anim: 0, tossT: 0, ladleCd: 0, dropT: 0, spin: 0, ride: null, w: 10, h: 22 };
}
function resetRun(x) {
  cab = newCab(x);
  enemies = MINIS.map(([ex, ey, a, b], i) => ({ type: 'mini', kind: LV.kinds.mini, x: ex, y: ey, z: 0, vz: 0, pre: 0, hopCd: 50 + (ex % 40), a, b, dir: i % 2 ? 1 : -1, alive: true, t: 0, squish: 0, anim: Math.random() * 20 }));
  throwers = THROWERS.map(([mx, my]) => ({ kind: LV.kinds.thrower, x: mx, y: my, alive: true, cd: 60 + (mx % 60), wind: 0, face: -1, t: 0, squish: 0 }));
  peels = PUDDLES.map((x) => ({ x, y: GROUND, used: 0, ttl: -1 }));
  drops = DROPS.map((x) => ({ x, state: 'hang', t: 0, y: 46, vy: 0 }));
  slicers = SLICERS.map(([sx, a, b], i) => ({ x: sx, a, b, dir: i % 2 ? 1 : -1, rot: 0 }));
  geysers = GEYSERS.map(([gx, ph]) => ({ x: gx, phase: ph / 240, prev: 'idle' }));
  movers = LV.movers.map(([min, max, y, w, sp, ph]) => ({ min, max, y, w, sp, phase: ph, x: min + (max - min) * ph, dir: 1, dx: 0 }));
  cookies = COOKIES.map(([x, y], i) => ({ x, y, got: gotCookies.has(i), i }));
  bells = BELLS.map((x) => ({ x, on: x <= checkpoint && x > 40, ring: 0 }));
  ladles = []; thrown = []; particles = []; popups = [];
  item = null;
  boss = { kind: LV.boss, active: false, state: 'sleep', t: 0, x: ARENA.bossX, y: GROUND, vx: 0, vy: 0, face: -1, hp: bossHp, atk: 0, shots: [], waves: [], empty: false, wall: 0, camLock: 0, bubble: '', bubbleT: 0, flash: 0, bannerT: 0 };
  camFollow = clamp(x - 120, 0, LEVEL_W - W); camX = Math.round(camFollow);
}
function startLevel(i, keepScore) {
  loadLevel(i);
  gotCookies.clear(); if (!keepScore) score = 0;
  hearts = TUNE.hearts; checkpoint = 40; bossHp = TUNE.bossHp;
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
  cab.x = checkpoint; cab.y = GROUND; cab.vx = 0; cab.vy = 0; cab.hurt = 90; cab.slip = 0; cab.stun = 0; cab.onGround = true; cab.ride = null;
  if (boss.active && boss.state !== 'dead') { boss.active = false; boss.state = 'sleep'; boss.wall = 0; boss.x = ARENA.bossX; boss.y = GROUND; boss.shots = []; boss.waves = []; boss.t = 0; boss.hp = bossHp; boss.empty = false; boss.camLock = 0; }
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
    const a = c.onGround ? T.accel : (dir && c.vx * dir < 0 ? T.airTurn : T.airAccel); // turning around in the air is quicker
    if (dir) { c.vx += dir * a; c.face = dir; }
    else if (c.onGround) { c.vx = Math.abs(c.vx) < T.friction ? 0 : c.vx - Math.sign(c.vx) * T.friction; }
    else { c.vx = Math.abs(c.vx) < T.airFriction ? 0 : c.vx - Math.sign(c.vx) * T.airFriction; } // let go of the d-pad in the air and you brake
    c.vx = clamp(c.vx, -T.maxSpeed, T.maxSpeed);
  }
  // jump (coyote time + jump buffering + variable height)
  if (c.onGround) c.coyote = T.coyote; else if (c.coyote > 0) c.coyote--;
  if (input.jumpPressed) c.buf = T.buffer; else if (c.buf > 0) c.buf--;
  if (c.buf > 0 && c.coyote > 0 && c.stun <= 0) {
    if (input.down && c.onGround && onOneWay()) { c.dropT = 12; c.onGround = false; c.coyote = 0; c.buf = 0; }
    else { c.vy = -T.jump; c.onGround = false; c.ride = null; c.coyote = 0; c.buf = 0; sfx.jump(); }
  }
  if (!input.jump && c.vy < -T.jumpCut) c.vy = -T.jumpCut; // let go early = short hop
  if (c.dropT > 0) c.dropT--;
  c.vy = Math.min(c.vy + (c.vy < 0 ? T.gravity : T.fallGravity), T.maxFall);

  // move X (carried along if standing on a boat), then Y, against solids
  if (c.ride) c.x += c.ride.dx;
  c.x += c.vx;
  let s = hitSolid(c.x - c.w / 2, c.y - c.h, c.w, c.h - 1);
  if (s) { if (c.vx > 0) c.x = s[0] - c.w / 2; else if (c.vx < 0) c.x = s[0] + s[2] + c.w / 2; c.vx = 0; if (c.slip > 0) c.slip = 0; }
  c.x = clamp(c.x, 6, LEVEL_W + 40);
  c.y += c.vy;
  c.onGround = false; c.ride = null;
  s = hitSolid(c.x - c.w / 2, c.y - c.h, c.w, c.h);
  if (s) {
    if (c.vy > 0) { c.y = s[1]; c.onGround = true; } else { c.y = s[1] + s[3] + c.h; }
    c.vy = 0;
  } else if (c.vy >= 0 && c.dropT <= 0) {
    for (const p of PLATS) {
      if (c.x + c.w / 2 > p[0] && c.x - c.w / 2 < p[0] + p[2] && prevY <= p[1] + 1 && c.y >= p[1]) { c.y = p[1]; c.vy = 0; c.onGround = true; break; }
    }
    if (!c.onGround) for (const m of movers) {
      if (c.x + c.w / 2 > m.x && c.x - c.w / 2 < m.x + m.w && prevY <= m.y + 1 && c.y >= m.y) { c.y = m.y; c.vy = 0; c.onGround = true; c.ride = m; break; }
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
    let sp = TUNE.miniSpeed;
    if (e.kind === 'blob') { // gravy blobs squat, then hop toward you when you're close
      if (e.z > 0 || e.vz) { e.vz -= 0.22; e.z += e.vz; sp *= 2.2; if (e.z <= 0) { e.z = 0; e.vz = 0; } }
      else if (e.pre > 0) { sp = 0; if (--e.pre === 0) { e.vz = 2.6; e.z = 0.01; if (Math.abs(cab.x - e.x) < 110) e.dir = cab.x < e.x ? -1 : 1; } }
      else if (--e.hopCd <= 0 && Math.abs(cab.x - e.x) < 100) { e.pre = 14; e.hopCd = 90; }
    }
    e.x += e.dir * sp;
    if (e.x < e.a) { e.x = e.a; e.dir = 1; }
    if (e.x > e.b) { e.x = e.b; e.dir = -1; }
    if (!supportAt(e.x + e.dir * 7, e.y)) e.dir = -e.dir;
    // stomp or hurt
    if (state !== 'play') continue;
    const ey = e.y - e.z;
    if (Math.abs(cab.x - e.x) < 9 && cab.y > ey - 16 && cab.y - cab.h < ey) {
      if (cab.vy > 0 && cab.y - cab.vy <= ey - 11 + 5) { killMini(e); cab.vy = input.jump ? -TUNE.stompBounceHeld : -TUNE.stompBounce; cab.onGround = false; }
      else hurtCab(e.x);
    }
  }
}
function killMini(e, byLadle) {
  e.alive = false; e.squish = 18; e.z = 0; sfx.stomp();
  burst(e.x, e.y - 8, 8, MINI_COLORS[e.kind], 1.8);
  addScore(100, e.x, e.y - 22);
  if (!byLadle) shake = 2;
}
const THROWN_COLORS = { monkey: ['#ffd93b', '#ffe97a', '#c99a14'], mouse: ['#ffd23a', '#ffe97a', '#c99a14'], pod: ['#2f8f3a', '#6fd05a', '#c8f5a0'] };
function updateThrowers() {
  for (const m of throwers) {
    if (m.squish > 0) { m.squish--; continue; }
    if (!m.alive) continue;
    m.t++;
    const dx = cab.x - m.x, dy = cab.y - m.y;
    m.face = dx < 0 ? -1 : 1;
    if (m.wind > 0) {
      m.wind--;
      if (m.wind === 0) { // lob something at Cab
        const tt = 70, g = 0.1;
        thrown.push({ kind: m.kind, x: m.x + m.face * 6, y: m.y - 14, vx: clamp(dx / tt, -2.4, 2.4), vy: (dy - 12 - 0.5 * g * tt * tt) / tt, rot: 0 });
        m.cd = TUNE.monkeyEvery; sfx.monkey();
      }
    } else if (Math.abs(dx) < TUNE.monkeyRange && Math.abs(dy) < 130) {
      m.cd--; if (m.cd <= 0) { m.wind = TUNE.monkeyWind; sfx.monkey(); }
    }
    if (state === 'play' && Math.abs(dx) < 10 && cab.y > m.y - 14 && cab.y - cab.h < m.y) {
      if (cab.vy > 0 && cab.y - cab.vy <= m.y - 10 + 5) { killThrower(m); cab.vy = input.jump ? -TUNE.stompBounceHeld : -TUNE.stompBounce; cab.onGround = false; }
      else hurtCab(m.x);
    }
  }
  for (const b of thrown) {
    b.vy += 0.1; b.x += b.vx; b.y += b.vy; b.rot += 0.25;
    if (state === 'play' && Math.abs(b.x - cab.x) < 8 && b.y > cab.y - 24 && b.y < cab.y + 2) { b.dead = true; hurtCab(b.x); burst(b.x, b.y, 5, THROWN_COLORS[b.kind], 1.4); }
    else if (b.y >= GROUND - 3 && supportAt(b.x, GROUND)) {
      b.dead = true;
      if (b.kind === 'monkey') peels.push({ x: Math.round(b.x), y: GROUND, used: 0, ttl: 420 }); // a thrown banana leaves a slippery peel
      else burst(b.x, GROUND - 3, 6, THROWN_COLORS[b.kind], 1.4);
    }
    else if (b.y > 220) b.dead = true;
  }
  thrown = thrown.filter((b) => !b.dead);
}
function killThrower(m) {
  m.alive = false; m.squish = 20; sfx.stomp(); burst(m.x, m.y - 8, 8, THROWER_COLORS[m.kind], 1.8);
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
function updateDrops() { // things that fall when you walk under them: coconuts, hanging salamis, gravy drops
  for (const k of drops) {
    k.t++;
    if (k.state === 'hang') {
      if (state === 'play' && Math.abs(cab.x - k.x) < TUNE.coconutTrigger && cab.y > 90) { k.state = 'shake'; k.t = 0; }
    } else if (k.state === 'shake') {
      if (k.t > TUNE.coconutShake) { k.state = 'fall'; k.t = 0; k.vy = 0; }
    } else if (k.state === 'fall') {
      k.vy += 0.35; k.y += k.vy;
      if (state === 'play' && Math.abs(k.x - cab.x) < 9 && k.y > cab.y - 26 && k.y < cab.y) { hurtCab(k.x); k.y = GROUND; }
      if (k.y >= GROUND - 4) { k.state = 'gone'; k.t = 0; sfx.coconut(); burst(k.x, GROUND - 3, 8, DROP_COLORS[LV.kinds.drop], 1.6); shake = Math.max(shake, 2); }
    } else if (k.state === 'gone') {
      if (k.t > 260) { k.state = 'hang'; k.y = 46; k.t = 0; }
    }
  }
}
function updateMovers() { // boats ferrying Cab over the wide gravy lakes
  for (const m of movers) {
    const px = m.x;
    if (m.pause > 0) m.pause--; // rests a moment at each bank so you can hop on and off
    else {
      m.x += m.dir * m.sp;
      if (m.x > m.max) { m.x = m.max; m.dir = -1; m.pause = 45; }
      if (m.x < m.min) { m.x = m.min; m.dir = 1; m.pause = 45; }
    }
    m.dx = m.x - px;
  }
}
function updateSlicers() { // spinning deli blades: deadly, just hop over them
  for (const s of slicers) {
    s.x += s.dir * 1.1; s.rot += 0.35 * s.dir;
    if (s.x < s.a) { s.x = s.a; s.dir = 1; }
    if (s.x > s.b) { s.x = s.b; s.dir = -1; }
    if (state === 'play' && Math.abs(cab.x - s.x) < 11 && cab.y > GROUND - 15) hurtCab(s.x);
  }
}
function updateGeysers() { // gravy geysers: bubble (warning), then erupt in a tall column you wait out
  for (const g of geysers) {
    const st = geyserState(g);
    if (st !== g.prev) { if (st === 'warn' && Math.abs(cab.x - g.x) < 200) sfx.rumble(); if (st === 'on' && Math.abs(cab.x - g.x) < 200) sfx.geyser(); g.prev = st; }
    if (state === 'play' && st === 'on' && Math.abs(cab.x - g.x) < 9 && cab.y > GROUND - GEYSER_TOP) hurtCab(g.x);
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
    for (const e of enemies) if (e.alive && Math.abs(l.x - e.x) < 9 && l.y > e.y - e.z - 18 && l.y < e.y - e.z) { killMini(e, true); l.dead = true; }
    for (const m of throwers) if (m.alive && Math.abs(l.x - m.x) < 9 && l.y > m.y - 18 && l.y < m.y) { killThrower(m); l.dead = true; }
    if (boss.active && boss.state !== 'dead' && Math.abs(l.x - boss.x) < BOSS.hw && l.y > boss.y - BOSS.h && l.y < boss.y) {
      l.dead = true; sfx.ding(); burst(l.x, l.y, 4, ['#fff', '#ddd'], 1.4); popup(l.x, l.y - 12, 'DING!', '#fff');
    }
  }
  ladles = ladles.filter((l) => !l.dead);
}

// ---------- Boss engine (what every boss shares; each boss's own moves live in bosses.js) ----------
function phase() { return TUNE.bossHp - boss.hp; } // 0, 1, 2: he gets meaner as he's hurt
function say(s, t) { boss.bubble = s; boss.bubbleT = t; }
const BANNER_FRAMES = 230;
function startFight() {
  boss.active = true; boss.state = 'intro'; boss.t = 0; boss.bannerT = BANNER_FRAMES; say(BOSS.lines.intro, 100);
  sfx.bossWind();
}
function updateBoss() {
  const b = boss, def = BOSS;
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
  if (!(def.freezeFace && def.freezeFace(b)) && !['hurt', 'dazed', 'dying', 'dead'].includes(b.state)) b.face = toCab;

  switch (b.state) {
    case 'intro': if (b.t > TUNE.bossIntro) { b.state = 'walk'; b.t = 0; } break;
    case 'dazed': if (b.t > def.dazed - ph * 15) { b.state = 'walk'; b.t = 0; } break;
    case 'hurt':
      b.x += (b.t < 30 ? -b.face * 0.8 : 0);
      if (b.t > TUNE.bossHurt) { b.state = 'walk'; b.t = 0; }
      break;
    case 'dying':
      if (b.t % 6 === 0) burst(b.x + (Math.random() - 0.5) * 20, b.y - 10 - Math.random() * 40, 3, def.colors, 1.4);
      if (b.t > 100) {
        b.state = 'dead'; b.t = 0; sfx.bossBoom(); shake = 14; flash = 10;
        burst(b.x, b.y - 28, 40, def.colors.concat(['#fff']), 3.6);
        item = { x: b.x, y: b.y - 60, vy: -2, t: 0 };
        addScore(2000, b.x, b.y - 70);
      }
      break;
    default: def.step(b, ph, spd, toCab); // walk and his attacks
  }
  b.x = clamp(b.x, ARENA.left + 24, ARENA.right - 20);

  def.proj(b);
  b.shots = b.shots.filter((p) => !p.dead);
  b.waves = b.waves.filter((w) => !w.dead);

  // touching / stomping him
  const box = (def.box && def.box(b)) || { hw: def.hw, h: def.h };
  const top = b.y - box.h;
  const head = Math.min(24, Math.round(box.h * 0.45)); // the top of him is his weak spot (and harmless to brush past)
  if (state === 'play' && Math.abs(cab.x - b.x) < box.hw && cab.y > top && cab.y - cab.h < b.y) {
    if (def.stompable(b) && cab.vy > 0 && cab.y <= top + head) {
      b.hp--; bossHp = b.hp; b.flash = 20; b.t = 0; b.empty = false; sfx.bossHit(); shake = 8;
      cab.vy = -TUNE.stompBounceHeld; cab.onGround = false; cab.hurt = Math.max(cab.hurt, 20);
      burst(b.x, top, 10, def.colors, 2.4);
      addScore(500, b.x, top - 10);
      b.shots = []; b.waves = [];
      if (b.hp <= 0) { b.state = 'dying'; say(def.lines.die, 110); }
      else { b.state = 'hurt'; say(def.lines.hit[2 - b.hp] || 'Ow!', 80); }
    } else if (cab.y > top + head && def.dangerous(b)) hurtCab(b.x);
  }
}

// ---------- Update ----------
function updatePlay() {
  updateMovers();
  updateCab();
  updateEnemies(); updateThrowers(); updatePeels(); updateDrops(); updateSlicers(); updateGeysers();
  updateCookies(); updateBells(); updateLadles(); updateBoss();
  // golden food drop (the boss's reward)
  if (item) {
    item.t++;
    item.vy += 0.12; item.y += item.vy;
    if (item.y > GROUND - 10) { item.y = GROUND - 10; item.vy = -Math.abs(item.vy) * 0.4; if (Math.abs(item.vy) < 0.4) item.vy = 0; }
    if (state === 'play' && item.t > 40 && Math.abs(cab.x - item.x) < 14 && cab.y - 30 < item.y + 10 && cab.y + 6 > item.y) {
      state = 'ending'; endT = 0; sfx.win(); burst(item.x, item.y, 20, ['#fff', '#ffe08a', '#ffd93b'], 2.6); item.got = true;
    }
  }
  updateCamera();
}
// The camera follows Cab with a dead zone: it stays put while he's in the middle of the screen and tracks him exactly
// (no easing) when he leaves it, so he never shimmers on screen. Big jumps (respawns) glide instead. Whole pixels only.
const CAM_LEFT = 105, CAM_RIGHT = 150;
function updateCamera() {
  const sx = cab.x - camFollow;
  let want = sx < CAM_LEFT ? cab.x - CAM_LEFT : sx > CAM_RIGHT ? cab.x - CAM_RIGHT : camFollow;
  want = clamp(want, 0, LEVEL_W - W);
  camFollow = Math.abs(want - camFollow) > 8 ? camFollow + (want - camFollow) * 0.2 : want;
  const pos = boss.camLock > 0 ? camFollow + (ARENA.left - camFollow) * boss.camLock : camFollow;
  camX = Math.round(pos);
}
function updateParticles() {
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
  particles = particles.filter((p) => p.life > 0);
  for (const p of popups) { p.t++; p.y -= 0.4; }
  popups = popups.filter((p) => p.t < 50);
}

// ---------- Cutscene dialogue ----------
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
    if (Math.floor(sceneChars) !== before && Math.floor(sceneChars) % 2 === 0) sfx.talk(line.who === 'guest');
  }
  if (input.action) {
    if (sceneChars < line.text.length) sceneChars = line.text.length;
    else if (++sceneIdx >= sceneLines.length) { const f = sceneAfter; sceneLines = null; f(); return; }
    else { sceneChars = 0; if (sceneLines[sceneIdx].rhyme) sfx.ding2(); }
  }
}

// ---------- Drawing: characters ----------
const CAB_PAL = { skin: '#8d5a3b', skin2: '#6e4429', white: '#ffffff', shade: '#d9dff0', red: '#e24a4a', pants: '#3b4a8a', shoe: '#4a2c1a', dark: '#1d1018', cheek: '#c96f66' };
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

// ---- Tommy and Davey share one body; Hannah has her own (long hair, dress)
const TOMMY = { skin: '#f6cfa8', skin2: '#dca072', hair: '#c8622a', hair2: '#e8843a', shirt: '#ffffff', stripe: '#e0793a', pants: '#3b5fa8', shoe: '#ffffff', cheek: '#ff9a90', dark: '#2a1a22', freckles: true };
const DAVEY = { skin: '#d9a577', skin2: '#b88255', hair: '#1d1824', hair2: '#3a3048', shirt: '#ffffff', vest: '#f0c040', tie: '#d23a3a', pants: '#a89060', shoe: '#5a3a22', cheek: '#e8887a', dark: '#2a1a22', glasses: '#2a3a6a' };
function drawPerson(P, x, y, face, o) {
  o = o || {};
  const s = o.scale || 1;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(face * s, s);
  const w = Math.sin(o.walk || 0), la = Math.round(w * 2);
  R(-4 + la, -7, 3, 5, P.pants); R(1 - la, -7, 3, 5, P.pants);
  R(-5 + la, -2, 5, 2, P.shoe); R(1 - la, -2, 5, 2, P.shoe);
  R(-5, -14, 10, 8, P.shirt); R(-5, -7, 10, 1, '#d9dff0');
  if (P.stripe) { R(-5, -12, 10, 2, P.stripe); R(-5, -8, 10, 2, P.stripe); }
  if (P.vest) { R(-4, -13, 8, 7, P.vest); R(-1, -13, 2, 7, P.shirt); R(2, -10, 1, 1, '#a07818'); R(2, -8, 1, 1, '#a07818'); R(-3, -14, 6, 1, P.shirt); }
  R(-7, -13, 2, 5, P.shirt); R(5, -13, 2, 5, P.shirt);
  R(-7, -8, 2, 2, P.skin); R(5, -8, 2, 2, P.skin);
  const hy = -18;
  disc(0, hy, 5, P.skin); R(-4, hy + 4, 7, 1, P.skin2);
  if (P.hair === '#c8622a') { // Tommy: messy ginger hair
    R(-6, hy - 5, 12, 3, P.hair); R(-6, hy - 3, 2, 5, P.hair); R(5, hy - 3, 2, 4, P.hair); R(-3, hy - 8, 2, 3, P.hair2); R(1, hy - 8, 3, 3, P.hair); R(4, hy - 7, 2, 2, P.hair2);
  } else { // Davey: neat dark hair with a side part
    R(-6, hy - 5, 12, 3, P.hair); R(-6, hy - 3, 2, 4, P.hair); R(5, hy - 3, 2, 3, P.hair); R(-5, hy - 6, 10, 2, P.hair2); R(1, hy - 5, 1, 2, P.skin);
  }
  const blink = (Math.floor(frame / 110) % 3 === 2 && frame % 110 < 6);
  if (blink) { R(0, hy - 1, 2, 1, P.dark); R(3, hy - 1, 2, 1, P.dark); }
  else { R(0, hy - 2, 2, 3, P.dark); R(3, hy - 2, 2, 3, P.dark); R(0, hy - 2, 1, 1, '#fff'); R(3, hy - 2, 1, 1, '#fff'); }
  if (P.glasses) { R(-1, hy - 3, 7, 1, P.glasses); R(-1, hy + 1, 7, 1, P.glasses); R(-1, hy - 3, 1, 5, P.glasses); R(2, hy - 3, 1, 5, P.glasses); R(5, hy - 3, 1, 5, P.glasses); R(6, hy - 2, 1, 1, P.glasses); }
  if (P.freckles) { R(-1, hy + 1, 1, 1, '#c87a50'); R(1, hy + 2, 1, 1, '#c87a50'); R(5, hy + 1, 1, 1, '#c87a50'); }
  R(-1, hy + 1, 2, 1, P.cheek); R(4, hy + 1, 2, 1, P.cheek);
  if (o.talk && Math.floor(frame / 6) % 2) R(1, hy + 2, 4, 3, P.dark); else { R(1, hy + 3, 4, 1, P.dark); R(0, hy + 2, 1, 1, P.dark); R(5, hy + 2, 1, 1, P.dark); }
  if (P.tie) { R(-2, -14, 2, 2, P.tie); R(1, -14, 2, 2, P.tie); R(0, -14, 1, 2, '#8a2020'); }
  ctx.restore();
}
function drawGuest(look, x, y, face, o) {
  if (look === 'tommy') drawPerson(TOMMY, x, y, face, o);
  else if (look === 'davey') drawPerson(DAVEY, x, y, face, o);
  else drawHannah(x, y, face, o);
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
function bubble(cx, y, text) {
  ctx.font = 'bold 7px ' + FONT;
  const w = Math.ceil(ctx.measureText(text).width) + 10;
  const x = clamp(Math.round(cx - w / 2), Math.round(camX) + 4, Math.round(camX) + W - w - 4);
  R(x, y - 10, w, 12, '#fff'); R(x + 1, y - 11, w - 2, 1, '#fff'); R(x + 1, y + 2, w - 2, 1, '#fff'); R(x, y + 2, w, 0, '#fff');
  R(cx - 2, y + 3, 4, 2, '#fff'); R(cx - 1, y + 5, 2, 1, '#fff');
  txt(text, x + w / 2, y - 8, 7, '#2a1a22', 'center', false);
}

// ---------- Drawing: scenery ----------
function crate(x, y, w) { // a wooden crate stamped with the level's food
  R(x, y, w, 12, '#a8743a'); R(x, y, w, 1, '#d09a58'); R(x, y + 11, w, 1, '#6b4423'); R(x + (w >> 1) - 1, y, 1, 12, '#6b4423');
}
function drawBossWall() {
  const w = boss.wall; if (w <= 0) return;
  const x = ARENA.left, bottom = Math.round(GROUND * w);
  for (let y = bottom - 12; y > -14; y -= 12) { crate(x, y, 14); R(x + 3, y + 5, 8, 2, '#ffd93b'); }
}
function drawRightWall() {
  const x = ARENA.right;
  for (let y = GROUND - 12; y > -14; y -= 12) { crate(x, y, 24); R(x + 6, y + 5, 12, 2, '#ffd93b'); }
  R(x + 24, 0, 100, GROUND, THEME.wallBg);
}
function drawArenaDecor() {
  // food crates stacked in the corners of the arena
  for (const [cx, n] of [[ARENA.left + 4, 2], [ARENA.right - 26, 1]]) for (let i = 0; i < n; i++) {
    const cy = GROUND - 12 * (i + 1);
    crate(cx, cy, 22); R(cx + 10, cy, 2, 12, '#6b4423');
    foodSprite(LV.food.icon, cx + 6, cy + 1);
  }
}

// ---------- Drawing: HUD & screens ----------
function drawHud() {
  for (let i = 0; i < TUNE.hearts; i++) sprite(6 + i * 10, 6, HEART, { X: i < hearts ? '#ff4a6a' : '#4a2a3a' });
  foodSprite(LV.food.icon, 6, 17);
  txt(LV.name, 18, 19, 7, '#fff', 'left');
  txt(String(score).padStart(6, '0'), W - 6, 6, 8, '#fff', 'right');
  const ck = 'x ' + gotCookies.size; ctx.font = 'bold 7px ' + FONT; const cw = Math.ceil(ctx.measureText(ck).width);
  txt(ck, W - 6, 20, 7, '#fff3c4', 'right');
  disc(W - 12 - cw, 23, 3, '#c98b3e'); R(W - 13 - cw, 22, 1, 1, '#5a3318'); R(W - 11 - cw, 24, 1, 1, '#5a3318');
  if (boss.active && boss.state !== 'dead') {
    txt(BOSS.name, W / 2, 6, 8, '#ffd1ff', 'center', '#3a1050');
    for (let i = 0; i < TUNE.bossHp; i++) {
      if (i >= boss.hp) ctx.globalAlpha = 0.28;
      foodSprite(LV.food.icon, W / 2 - TUNE.bossHp * 6 + i * 12, 17);
      ctx.globalAlpha = 1;
    }
  }
  if (muted) txt('MUTE', W / 2, H - 10, 6, '#fff', 'center');
}
function drawWorld() {
  const cx = Math.round(camX);
  ctx.save();
  const sx = shake > 0 ? Math.round((Math.random() - 0.5) * shake) : 0, sy = shake > 0 ? Math.round((Math.random() - 0.5) * shake) : 0;
  ctx.translate(-cx + sx, sy);
  for (const [a, b] of PITS) if (b > cx - 4 && a < cx + W + 4) THEME.pit(a, b);
  for (const d of DECOR) if (d.x > cx - 40 && d.x < cx + W + 40) THEME.decor(d);
  for (const [a, b] of SEGS) THEME.ground(a, b);
  for (const p of PLATS) if (p[0] + p[2] > cx - 10 && p[0] < cx + W + 10) THEME.plat(p);
  for (const m of movers) drawBoat(m);
  drawArenaDecor();
  for (const [x, t] of SIGNS) if (Math.abs(x - cx - 160) < 220) drawSign(x, t);
  for (const g of geysers) if (Math.abs(g.x - cx - 160) < 200) drawGeyser(g);
  for (const s of slicers) drawSlicer(s);
  const dropArt = DROP_ART[LV.kinds.drop];
  for (const k of drops) dropArt(k);
  for (const b of bells) drawBell(b);
  for (const p of peels) drawPuddle(LV.kinds.puddle, p.x);
  for (const c of cookies) if (!c.got && Math.abs(c.x - cx - 160) < 180) drawCookie(c);
  for (const m of throwers) THROWER_ART[m.kind](m);
  for (const e of enemies) if (Math.abs(e.x - cx - 160) < 200) MINI_ART[e.kind](e);
  if (boss.state !== 'dead') BOSS.draw(boss, boss.active);
  BOSS.drawProj(boss);
  drawStompCue();
  for (const b of thrown) drawThrown(b.kind, b);
  for (const l of ladles) { ctx.save(); ctx.translate(Math.round(l.x), Math.round(l.y)); ctx.rotate(l.spin); R(-1, -1, 7, 2, '#8a6a4a'); disc(-3, 0, 3, '#c9ced6'); disc(-3, 0, 2, '#9aa0aa'); ctx.restore(); }
  if (item && !item.got) {
    const g = 0.5 + 0.5 * Math.sin(frame * 0.2);
    disc(item.x, item.y, 12 + g * 3, 'rgba(255,240,120,.25)'); disc(item.x, item.y, 8, 'rgba(255,240,120,.35)');
    foodSprite(LV.food.icon, item.x - 5, item.y - 5 + Math.round(Math.sin(frame * 0.1) * 2), true);
    if (frame % 10 < 5) R(item.x + 8, item.y - 8, 1, 3, '#fff');
  }
  if (state !== 'dead' || deadT < 40) {
    const c = cab;
    if (!(c.hurt > 0 && frame % 6 < 3 && state === 'play')) {
      drawCab(c.x, c.y, c.face, { walk: c.anim * 1.4, air: !c.onGround, vy: c.vy, toss: c.tossT > 0, hurt: c.stun > 0 || state === 'dead', joy: state === 'ending', spin: c.slip > 0 ? c.spin : 0 });
    }
  }
  drawRightWall(); drawBossWall();
  for (const k of drops) if (k.state === 'fall') dropArt(k);
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
  const name = line.who === 'cab' ? 'CAB' : LV.guest.name.toUpperCase();
  R(14, 130, name.length * 6 + 10, 12, line.who === 'cab' ? '#3b4a8a' : LV.guest.color);
  txt(name, 19, 132, 7, '#fff', 'left', false);
  ctx.font = 'bold 8px ' + FONT;
  const words = shown.split(' '); let lineStr = '', y = 145;
  for (const w of words) {
    const test = lineStr ? lineStr + ' ' + w : w;
    if (ctx.measureText(test).width > W - 40) { txt(lineStr, 18, y, 8, '#2a1a22', 'left', false); y += 10; lineStr = w; } else lineStr = test;
  }
  txt(lineStr, 18, y, 8, '#2a1a22', 'left', false);
  if (sceneChars >= line.text.length && frame % 40 < 24) R(W - 22, 164, 6, 6, LV.guest.color);
}
function drawCutscene() {
  drawRoom();
  const line = sceneLines[sceneIdx];
  let hx = 232;
  if (sceneKind === 'intro' && sceneT < 70) hx = 232 + Math.max(0, 70 - sceneT) * 2.2;
  const talking = sceneChars < line.text.length;
  const walkH = sceneKind === 'intro' && sceneT < 70 ? sceneT * 0.4 : 0;
  drawCab(70, 134, 1, { scale: 3, talk: talking && line.who === 'cab', joy: line.rhyme && line.who === 'cab' && Math.floor(frame / 15) % 2, serve: line.serve });
  drawGuest(LV.guest.look, hx, 134, -1, { scale: 3, talk: talking && line.who === 'guest', walk: walkH, hungry: true });
  if (sceneKind === 'intro' && sceneT >= 70 && sceneIdx === 0 && !talking) drawHungryBubbles(hx, 30);
  if (line.serve || sceneKind === 'outro') foodSprite(LV.food.icon, 145, 87); // the dish on the table
  if (line.rhyme && line.who === 'cab') { // the rhyme appears over his head
    const k = Math.min(1, sceneChars / 12), by = 30 - Math.round(Math.sin(frame * 0.12) * 2);
    txtOutline(LV.rhyme[0], 70, 14, 10, '#ffd1ec', '#7a2a52', 'center');
    txtOutline(LV.rhyme[1], 70, 26, 10, '#fff08a', '#7a5a10', 'center');
    if (k >= 1) foodSprite(LV.food.icon, 114, by - 2);
  }
  if (line.rhyme && line.who === 'guest') txtOutline(LV.rhyme[0] + ' = ' + LV.rhyme[1], 232, 30, 7, '#fff08a', '#7a5a10', 'center');
  drawDialogue(line);
}
function drawTitle() {
  THEMES.jungle.sky(); THEMES.jungle.far();
  R(0, GROUND, W, 30, '#8a5a2e'); R(0, GROUND - 1, W, 5, '#46b04a'); R(0, GROUND - 1, W, 1, '#6fd36a');
  const bob = Math.round(Math.abs(Math.sin(frame * 0.08)) * 4);
  txtOutline('EVERYBODY', W / 2, 18 + bob / 2, 26, '#ffd93b', '#5a2a12', 'center');
  txtOutline('EATS!', W / 2, 46 + bob / 2, 30, '#ff6b8a', '#5a1230', 'center');
  drawCab(70, GROUND - bob, 1, { scale: 2, joy: bob > 2, air: bob > 0, vy: -1 });
  for (let i = 0; i < 3; i++) foodSprite(LEVELS[i].food.icon, 244 + i * 22, GROUND - 14 - (i === 1 ? 6 : 0));
  if (frame % 60 < 40) txtOutline(IS_TOUCH ? 'TAP TO START' : 'PRESS SPACE TO START', 176, 96, 9, '#fff', '#3a2410', 'center');
  txt('Cab the chef must feed', 176, 112, 6, '#fff', 'center');
  txt('every hungry dinner guest!', 176, 121, 6, '#fff', 'center');
  const L = LEVELS[titleSel];
  txt((titleSel > 0 ? '< ' : '  ') + 'Level ' + (titleSel + 1) + ': ' + L.guest.name + ' -> ' + L.food.name + (titleSel < progress ? ' >' : '  '), 176, 133, 6, '#fff8c0', 'center');
  if (progress > 0) txt(IS_TOUCH ? '(use the arrows to pick a level)' : '(left / right or 1-' + (progress + 1) + ' picks a level)', 176, 142, 5, '#fff', 'center');
}
function drawCard() {
  R(0, 0, W, H, '#1d1424');
  const t = Math.min(1, cardT / 20);
  ctx.globalAlpha = t;
  txtOutline('LEVEL ' + (levelIdx + 1), W / 2, 44, 10, '#ffe08a', '#000', 'center');
  txtOutline(LV.name.toUpperCase(), W / 2, 60, 20, '#ffd93b', '#5a3a08', 'center');
  txt('Guest: ' + LV.guest.name, W / 2, 92, 8, '#ffd1ec', 'center');
  txt('Dish: ' + LV.food.name + '  (rhymes with ' + LV.guest.name + '!)', W / 2, 104, 8, '#fff8c0', 'center');
  foodSprite(LV.food.icon, W / 2 - 5, 120);
  txt(IS_TOUCH ? 'Stomp enemies. Beat the boss!' : 'Stomp enemies. Toss ladles. Beat the boss!', W / 2, 146, 7, '#aab', 'center');
  ctx.globalAlpha = 1;
}
function drawDead() {
  ctx.fillStyle = 'rgba(20,10,30,.6)'; ctx.fillRect(0, 0, W, H);
  txtOutline("Oh no! Cab's out of hearts!", W / 2, 60, 12, '#fff', '#5a1230', 'center');
  txt('Hearts refilled. The boss stays hurt!', W / 2, 82, 7, '#ffd1ec', 'center');
  if (deadT > 50 && frame % 40 < 28) txtOutline(IS_TOUCH ? 'TAP TO TRY AGAIN' : 'PRESS SPACE TO TRY AGAIN', W / 2, 104, 9, '#fff08a', '#3a2410', 'center');
}
function drawUnlock() {
  drawRoom();
  const t = Math.min(1, unlockT / 25);
  ctx.fillStyle = 'rgba(20,10,30,' + (0.65 * t) + ')'; ctx.fillRect(0, 0, W, H);
  if (unlockT < 25) return;
  txtOutline('NEW FOOD UNLOCKED!', W / 2, 16, 14, '#ffe08a', '#5a3a08', 'center');
  R(100, 40, 120, 76, '#2a1a22'); R(102, 42, 116, 72, '#fff8e8'); R(102, 42, 116, 6, '#ffd93b');
  const g = 0.5 + 0.5 * Math.sin(frame * 0.15);
  disc(160, 74, 18 + g * 3, 'rgba(255,230,120,.35)');
  ctx.save(); ctx.translate(160, 74); ctx.scale(3, 3); foodSprite(LV.food.icon, -5, -5, true); ctx.restore();
  txt(LV.food.name, 160, 94, 11, '#8a5a10', 'center', false);
  txt('for ' + LV.guest.name + '  (rhymes!)', 160, 106, 6, '#7a5a40', 'center', false);
  if (unlockT > 90) {
    txt('Recipe book: ' + (levelIdx + 1) + (levelIdx ? ' foods' : ' food'), W / 2, 124, 8, '#fff', 'center');
    const more = levelIdx + 1 < LEVELS.length;
    txtOutline(more ? 'Ding-dong!  Another guest is at the door...' : 'More hungry guests are on their way!', W / 2, 138, 8, '#ffd1ec', '#3a0a20', 'center');
  }
  if (unlockT > 130) {
    R(266, 20, 32, 76, '#ffe9a8'); R(270, 54, 24, 42, '#1a0f22'); disc(282, 50, 7, '#1a0f22'); R(268, 62, 3, 20, '#1a0f22'); R(293, 62, 3, 20, '#1a0f22');
    txtOutline('?', 282, 24, 14, '#ffd1ec', '#7a2a52', 'center');
  }
  if (unlockT > 150 && frame % 40 < 28) txt(IS_TOUCH ? (levelIdx + 1 < LEVELS.length ? 'TAP FOR THE NEXT GUEST' : 'TAP TO CONTINUE') : (levelIdx + 1 < LEVELS.length ? 'PRESS SPACE FOR THE NEXT GUEST' : 'PRESS SPACE TO CONTINUE'), W / 2, 168, 7, '#fff08a', 'center');
}
function drawStompCue() { // a bouncing arrow over his head while he's dizzy, so it's obvious what to do
  if (!boss.active || boss.state !== 'dazed') return;
  const x = Math.round(boss.x), y = Math.round(boss.y - BOSS.h - 30 + Math.sin(frame * 0.25) * 2);
  if (frame % 24 < 18) {
    R(x - 5, y - 1, 11, 1, '#a02020'); for (let i = 0; i < 5; i++) R(x - 4 + i, y + i, 9 - 2 * i, 1, '#ffe14a');
    R(x - 1, y + 5, 3, 1, '#a02020');
    txtOutline('STOMP!', x, y - 11, 8, '#fff', '#c33', 'center');
  }
}
function drawPlay() {
  THEME.sky(); THEME.far();
  drawWorld();
  drawHud();
  if (boss.bannerT > 0) {
    const t = boss.bannerT, a = Math.min(1, t / 20, (BANNER_FRAMES - t) / 20);
    ctx.globalAlpha = Math.max(0, a);
    R(0, 28, W, 31, 'rgba(40,10,60,.75)'); ctx.globalAlpha = Math.max(0, a);
    txtOutline(BOSS.name, W / 2, 31, 13, '#ffd93b', '#5a2a12', 'center');
    txtOutline(BOSS.tip, W / 2, 48, 7, '#fff', '#3a1050', 'center');
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
      if (input.leftPressed) titleSel = Math.max(0, titleSel - 1);
      if (input.rightPressed) titleSel = Math.min(progress, titleSel + 1);
      if (input.action) { audioInit(); loadLevel(titleSel); startScene(LV.intro, 'intro', () => startLevel(levelIdx, levelIdx > 0)); }
      break;
    case 'cutscene': updateScene(); break;
    case 'card':
      cardT++;
      if (cardT > 150 || (cardT > 30 && input.action)) state = 'play';
      break;
    case 'play': updatePlay(); updateParticles(); break;
    case 'dead':
      deadT++; cab.vy += TUNE.gravity; cab.y += cab.vy;
      updateParticles(); updateBoss();
      if (deadT > 50 && input.action) retryAfterDeath();
      break;
    case 'ending':
      endT++; updateParticles(); cab.vx = 0;
      if (endT > 100) startScene(LV.outro, 'outro', () => { state = 'unlock'; unlockT = 0; sfx.win(); saveProgress(Math.min(levelIdx + 1, LEVELS.length - 1)); });
      break;
    case 'unlock':
      unlockT++;
      if (unlockT === 90) sfx.doorbell();
      if (unlockT === 130) sfx.knock();
      if (unlockT > 150 && input.action) {
        if (levelIdx + 1 < LEVELS.length) { loadLevel(levelIdx + 1); startScene(LV.intro, 'intro', () => startLevel(levelIdx, true)); }
        else { state = 'title'; titleSel = 0; }
      }
      break;
  }
  input.jumpPressed = false; input.tossPressed = false; input.action = false; input.leftPressed = false; input.rightPressed = false;
  musicTick();
}
let acc = 0, last = performance.now();
function loop(now) {
  let dt = Math.min(100, now - last); last = now;
  for (const hz of [30, 60, 120]) { const t = 1000 / hz; if (Math.abs(dt - t) < 1.3) { dt = t; break; } } // snap to the display's refresh so the 60Hz steps stay evenly spaced
  acc += dt;
  while (acc >= 1000 / 60 - 0.01) { step(); acc -= 1000 / 60; }
  draw();
  requestAnimationFrame(loop);
}

// ---------- Boot ----------
loadLevel(0);
resetRun(40);
(function boot() {
  const q = new URLSearchParams(location.search);
  // ?level=N picks a level; then ?play (start playing), ?boss (boss arena), ?intro, ?end, ?unlock; &x=NNNN teleports
  const li = q.has('level') ? clamp((+q.get('level') || 1) - 1, 0, LEVELS.length - 1) : 0;
  if (q.has('level')) { saveProgress(li); titleSel = li; }
  loadLevel(li); resetRun(40);
  if (q.has('boss')) { checkpoint = LV.bells[LV.bells.length - 1]; resetRun(checkpoint); state = 'play'; }
  else if (q.has('play')) { startLevel(li); state = 'play'; }
  else if (q.has('intro')) { startScene(LV.intro, 'intro', () => startLevel(li)); }
  else if (q.has('end')) { startScene(LV.outro, 'outro', () => { state = 'unlock'; unlockT = 0; }); }
  else if (q.has('unlock')) { state = 'unlock'; unlockT = 0; }
  if (q.has('x')) { const x = +q.get('x'); checkpoint = x; resetRun(x); }
})();
window.__game = {
  get state() { return state; }, set state(v) { state = v; },
  get cab() { return cab; }, get boss() { return boss; }, get hearts() { return hearts; }, set hearts(v) { hearts = v; },
  get score() { return score; }, get enemies() { return enemies; }, get throwers() { return throwers; }, get peels() { return peels; },
  get slicers() { return slicers; }, get geysers() { return geysers; }, get movers() { return movers; }, get drops() { return drops; },
  get checkpoint() { return checkpoint; }, get camX() { return camX; }, get item() { return item; },
  get LV() { return LV; }, get levelIdx() { return levelIdx; }, get PITS() { return PITS; }, get PLATS() { return PLATS; }, get ARENA() { return ARENA; }, get LEVEL_W() { return LEVEL_W; },
  input, setInput, step, startLevel, resetRun, loadLevel, TUNE, LEVELS, frame: () => frame,
  setBossHp(n) { bossHp = n; boss.hp = n; },
};
requestAnimationFrame(loop);
