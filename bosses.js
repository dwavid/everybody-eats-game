'use strict';
// Boss fights, one per world. Loaded after themes.js and before game.js.
// game.js owns what every boss shares (the arena, intro, getting stomped, being hurt, dying, the golden pickup).
// Each boss here provides the parts that differ:
//   name, lines, colors      text and particle colors
//   h, hw                    hitbox: height of his head above the floor (the stompable top) and half-width
//   dazed                    frames he stays dizzy (stompable) after his big move
//   box(b)                   optional per-state hitbox override {hw, h}
//   freezeFace(b)            optional: states where he doesn't turn toward Cab
//   dangerous(b)/stompable(b) which states hurt Cab on touch / which let Cab stomp the head
//   step(b, ph, spd, toCab)  his state machine for walk + his attacks (ph = 0..2, grows as he's hurt)
//   proj(b)                  moves his projectiles (b.shots, b.waves) and hurts Cab
//   draw(b, awake), drawProj(b)
// Shared state on `boss`: x, y, face, state, t, hp, shots[], waves[], flash, bubble.

// ---------------------------------------------------------------- shared bits
function bossStars(x, y) {
  for (let i = 0; i < 3; i++) {
    const a = frame * 0.12 + i * 2.1, sx = x + Math.cos(a) * 12, sy = y + Math.sin(a) * 3;
    R(sx - 1, sy - 2, 3, 1, '#ffe14a'); R(sx - 2, sy - 1, 5, 1, '#ffe14a'); R(sx - 1, sy, 3, 1, '#ffe14a');
  }
}
function bossWindMark(x, y) { if (frame % 10 < 5) txtOutline('!', x, y, 10, '#fff', '#c33', 'center'); }
function bossRiseShock(x) { // a dusty ground slam that sends two shockwaves outward
  sfx.bossSlam(); shake = 9;
  burst(x, GROUND - 2, 12, ['#e8d9b0', '#c9a96b', '#ffd93b'], 2.4);
  const sp = 1.9 + phase() * 0.3;
  boss.waves.push({ x: x - 12, dir: -1, sp, kind: 'dust' }, { x: x + 12, dir: 1, sp, kind: 'dust' });
}
function hitCabIf(cond, x) { if (cond && state === 'play') { hurtCab(x); return true; } return false; }

const BOSSES = {};

// ================================================================ 1. Baron Von Peel (banana)
BOSSES.peel = {
  name: 'BARON VON PEEL',
  lines: { intro: 'Nobody eats ME, chef!', hit: ["Ow! That's bananas!", "Now I'm MAD!"], die: "Ugh... I'm... a-PEEL-ing..." },
  colors: ['#ffd93b', '#ffe97a', '#c99a14'],
  h: 52, hw: 17, dazed: 140,
  freezeFace: (b) => b.state === 'air',
  dangerous: (b) => ['walk', 'peel', 'air', 'leap', 'intro'].includes(b.state),
  stompable: (b) => ['walk', 'peel', 'dazed', 'leap'].includes(b.state),
  step(b, ph, spd, toCab) {
    switch (b.state) {
      case 'walk': {
        const d = Math.abs(cab.x - b.x);
        b.x += (d > 90 ? toCab : d < 55 ? -toCab : 0) * spd;
        if (b.t > 70 - ph * 12) { b.atk++; b.state = (b.atk % 2 || ph === 0 && b.atk % 3 === 0) ? 'peel' : 'leap'; if (ph === 0 && b.atk === 1) b.state = 'peel'; b.t = 0; if (b.state === 'peel') sfx.bossWind(); }
        break;
      }
      case 'peel':
        if (b.t === TUNE.bossPeelWind || (ph >= 1 && b.t === TUNE.bossPeelWind + 28)) { b.shots.push({ kind: 'peel', x: b.x + b.face * 16, dir: b.face, sp: 2.2 + ph * 0.35, rot: 0 }); sfx.toss(); }
        if (b.t > TUNE.bossPeelWind + (ph >= 1 ? 52 : 28)) { b.state = 'walk'; b.t = 0; }
        break;
      case 'leap':
        if (b.t === TUNE.bossLeapWind) { const air = 54 - ph * 4; b.vy = -(0.5 * TUNE.gravity * air); b.vx = clamp((cab.x - b.x) / air, -3.4, 3.4); b.state = 'air'; b.t = 0; }
        break;
      case 'air':
        b.x += b.vx; b.vy += TUNE.gravity; b.y += b.vy;
        if (b.y >= GROUND) { b.y = GROUND; b.vy = 0; b.state = 'dazed'; b.t = 0; bossRiseShock(b.x); }
        break;
    }
  },
  proj(b) {
    for (const p of b.shots) {
      p.x += p.dir * p.sp; p.rot += 0.3;
      if (p.x < ARENA.left + 8 || p.x > ARENA.right - 8) p.dead = true;
      if (Math.abs(p.x - cab.x) < 10 && cab.y > GROUND - 8 && hitCabIf(true, p.x)) { p.dead = true; burst(p.x, GROUND - 4, 5, BOSSES.peel.colors, 1.4); }
    }
    for (const w of b.waves) {
      w.x += w.dir * w.sp;
      if (w.x < ARENA.left + 6 || w.x > ARENA.right - 6) w.dead = true;
      if (frame % 3 === 0) particles.push({ x: w.x, y: GROUND - 1, vx: -w.dir * 0.5, vy: -0.5, life: 14, c: '#e8d9b0', g: 0, s: 2 });
      if (Math.abs(w.x - cab.x) < 11 && cab.y > GROUND - 9) hitCabIf(true, w.x);
    }
  },
  drawProj(b) {
    for (const p of b.shots) drawPeel(p.x, GROUND - 4, p.rot, true);
    for (const w of b.waves) { R(w.x - 7, GROUND - 9, 14, 9, 'rgba(232,217,176,.75)'); R(w.x - 4, GROUND - 12, 8, 3, 'rgba(255,255,255,.85)'); R(w.x - 8, GROUND - 3, 16, 3, '#ffd93b'); }
  },
  draw(b, awake) {
    let x = Math.round(b.x), y = Math.round(b.y);
    const f = b.face;
    let sqY = 0, sqX = 0;
    if (b.state === 'leap') { const k = Math.min(1, b.t / TUNE.bossLeapWind); sqY = Math.round(k * 8); sqX = Math.round(k * 3); x += Math.round(Math.sin(b.t * 1.5) * 1); }
    if (b.state === 'air') sqY = b.vy < 0 ? -3 : 0;
    if (b.state === 'dying') x += Math.round(Math.sin(b.t * 1.8) * 2);
    const flashing = (b.flash > 0 && frame % 4 < 2) || (b.state === 'dying' && frame % 6 < 3);
    if (b.state !== 'air') R(x - 14, GROUND, 28, 2, 'rgba(0,0,0,.2)'); else R(x - 10 + (GROUND - b.y) / 20, GROUND, 20, 2, 'rgba(0,0,0,.15)');
    const capeY = y - sqY;
    ctx.fillStyle = '#6a2a8f'; ctx.beginPath();
    ctx.moveTo(x - f * 3, capeY - 42); ctx.lineTo(x - f * 22, capeY - 2); ctx.lineTo(x - f * 4, capeY - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a3fb5'; ctx.beginPath();
    ctx.moveTo(x - f * 3, capeY - 42); ctx.lineTo(x - f * 14, capeY - 8); ctx.lineTo(x - f * 4, capeY - 20); ctx.closePath(); ctx.fill();
    const stepW = b.state === 'walk' ? Math.round(Math.sin(frame * 0.2) * 2) : 0;
    R(x - 9 + stepW, y - 4, 7, 4, '#4a3010'); R(x + 2 - stepW, y - 4, 7, 4, '#4a3010');
    const bh = 50 - sqY, bw = 26 + sqX;
    bananaBody(x, y - 3, bh, bw, 9 * f, flashing ? '#ffffff' : '#ffd93b', flashing ? '#ffd1d1' : '#c99a14', flashing ? '#fff' : '#fff08a');
    const my = y - 3 - Math.round(bh * 0.4), mo = bananaOffAt(bh, 9 * f, 0.55);
    const armUp = b.state === 'peel' ? (b.t < TUNE.bossPeelWind ? -10 : 2) : b.state === 'air' ? -12 : 0;
    R(x + mo + f * 13, my + armUp, 5, 3, '#e8c030'); R(x + mo + f * 17, my + armUp + 1, 3, 3, '#c99a14'); R(x + mo + f * 19, my + armUp + 2, 2, 2, '#f6d44a');
    R(x + mo - f * 16, my + 2, 4, 3, '#e8c030'); R(x + mo - f * 19, my + 4, 3, 3, '#c99a14');
    const fy = y - 3 - Math.round(bh * 0.74), fx = x + bananaOffAt(bh, 9 * f, 0.26) + f * 2;
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
      R(fx - 6, fy + 5, 5, 1, '#3a1d12'); R(fx + 1, fy + 5, 5, 1, '#3a1d12'); R(fx - 7, fy + 4, 1, 1, '#3a1d12'); R(fx + 6, fy + 4, 1, 1, '#3a1d12');
    }
    const tOff = bananaOffAt(bh, 9 * f, 0);
    R(x + tOff - 5, y - 3 - bh - 4, 10, 2, '#1d1424'); R(x + tOff - 3, y - 3 - bh - 9, 6, 6, '#1d1424'); R(x + tOff - 3, y - 3 - bh - 6, 6, 1, '#8a3fb5');
    if (b.state === 'dazed') bossStars(x + tOff, y - bh - 12);
    if (b.state === 'peel' && b.t < TUNE.bossPeelWind) bossWindMark(x + tOff, y - bh - 24);
    if (b.bubbleT > 0 && b.bubble) bubble(x + tOff, y - bh - 28, b.bubble);
  },
};

// ================================================================ 2. General Salami (salami)
// Fires slices at two heights (high ones pass over a standing Cab, low ones you jump), then curls up and rolls
// across the arena like a wheel. When he smacks the wall he's dizzy and you can stomp his cap.
BOSSES.salami = {
  name: 'GENERAL SALAMI',
  lines: { intro: 'Halt! Nobody slices the General!', hit: ['Ow! Watch the casing!', "Now I'm SALAMI-ing mad!"], die: "I've been... cut... down to size..." },
  colors: ['#c0443a', '#f3cdbd', '#7e2420'],
  h: 54, hw: 15, dazed: 130,
  box: (b) => (b.state === 'roll' ? { hw: 13, h: 26 } : null),
  dangerous: (b) => ['walk', 'slice', 'curl', 'roll', 'intro'].includes(b.state),
  stompable: (b) => ['walk', 'slice', 'curl', 'dazed'].includes(b.state),
  step(b, ph, spd, toCab) {
    switch (b.state) {
      case 'walk': {
        const d = Math.abs(cab.x - b.x);
        b.x += (d > 120 ? toCab : d < 80 ? -toCab : 0) * (spd * 0.8);
        if (b.t > 60 - ph * 10) { b.atk++; b.state = b.atk % 2 ? 'slice' : 'curl'; b.t = 0; sfx.bossWind(); }
        break;
      }
      case 'slice': { // [frame, 'high'|'low'] volleys; highs always come first so you're never in the air for a high one
        const plan = ph === 0 ? [[38, 'h'], [80, 'l']] : ph === 1 ? [[38, 'h'], [80, 'l'], [124, 'l']] : [[38, 'h'], [68, 'h'], [112, 'l'], [156, 'l']];
        for (const [t, k] of plan) if (b.t === t) { b.shots.push({ kind: 'slice', x: b.x + b.face * 18, y: k === 'h' ? GROUND - 30 : GROUND - 7, vx: b.face * (2.1 + 0.25 * ph), rot: 0 }); sfx.toss(); }
        if (b.t > plan[plan.length - 1][0] + 34) { b.state = 'walk'; b.t = 0; }
        break;
      }
      case 'curl':
        if (b.t === 44) { b.state = 'roll'; b.t = 0; b.rdir = toCab; b.rollsLeft = ph >= 2 ? 2 : 1; b.rot = 0; sfx.bossSlam(); }
        break;
      case 'roll': {
        const sp = 3 + ph * 0.45;
        b.x += b.rdir * sp; b.rot += b.rdir * sp / 12;
        if (frame % 4 === 0) particles.push({ x: b.x - b.rdir * 10, y: GROUND - 2, vx: -b.rdir * 0.6, vy: -0.4, life: 14, c: '#e8d9b0', g: 0, s: 2 });
        const hitL = b.x <= ARENA.left + 26, hitR = b.x >= ARENA.right - 24;
        if (hitL || hitR) {
          b.x = hitL ? ARENA.left + 26 : ARENA.right - 24; shake = 8; sfx.bossSlam();
          burst(b.x, GROUND - 14, 8, ['#e8d9b0', '#c0443a'], 2);
          if (b.rollsLeft-- > 0) b.rdir = -b.rdir; else { b.state = 'dazed'; b.t = 0; b.face = hitL ? 1 : -1; }
        }
        break;
      }
    }
  },
  proj(b) {
    for (const p of b.shots) {
      p.x += p.vx; p.rot += 0.35;
      if (p.x < ARENA.left + 6 || p.x > ARENA.right - 6) p.dead = true;
      if (Math.abs(p.x - cab.x) < 9 && p.y + 5 > cab.y - 22 && p.y - 5 < cab.y && hitCabIf(true, p.x)) { p.dead = true; burst(p.x, p.y, 5, BOSSES.salami.colors, 1.4); }
    }
  },
  drawProj(b) {
    for (const p of b.shots) { // a flying slice of salami
      const x = Math.round(p.x), y = Math.round(p.y);
      disc(x, y, 6, '#7e2420'); disc(x, y, 5, '#c0443a'); for (let i = 0; i < 4; i++) { const a = p.rot + i * 1.6; R(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2, 1, '#f3cdbd'); }
      R(x - 4, y - 4, 2, 1, '#e0786a');
    }
  },
  draw(b, awake) {
    let x = Math.round(b.x), y = Math.round(b.y);
    const f = b.face;
    const flashing = (b.flash > 0 && frame % 4 < 2) || (b.state === 'dying' && frame % 6 < 3);
    if (b.state === 'dying') x += Math.round(Math.sin(b.t * 1.8) * 2);
    R(x - 15, GROUND, 30, 2, 'rgba(0,0,0,.2)');
    const C = flashing ? { e: '#ffd1d1', m: '#ffffff', l: '#ffffff', s: '#ffe0e0' } : { e: '#7e2420', m: '#c0443a', l: '#e0786a', s: '#a63830' };
    if (b.state === 'roll') { // a rolling salami wheel
      const cy = y - 13;
      disc(x, cy, 13, C.e); disc(x, cy, 12, C.m); disc(x, cy, 9, flashing ? '#fff' : '#d65a4c');
      for (let i = 0; i < 7; i++) { const a = b.rot + i * 0.9, r = i % 2 ? 6 : 10; R(x + Math.cos(a) * r - 1, cy + Math.sin(a) * r, 2, 1, '#f3cdbd'); }
      R(x - 9, cy - 9, 4, 1, C.l); R(x - 10, cy - 8, 2, 2, C.l);
      const a = b.rot; R(x + Math.cos(a) * 12 - 1, cy + Math.sin(a) * 12 - 1, 3, 3, '#e8c878'); // twine
      R(x - 5, cy - 2, 3, 3, '#fff'); R(x + 2, cy - 2, 3, 3, '#fff'); R(x - 4 + b.rdir, cy - 1, 2, 2, '#1d1018'); R(x + 3 + b.rdir, cy - 1, 2, 2, '#1d1018');
      R(x - 6, cy - 4, 5, 1, '#1d1018'); R(x + 2, cy - 4, 5, 1, '#1d1018'); R(x - 3, cy + 4, 7, 2, '#1d1018'); R(x - 2, cy + 4, 2, 1, '#fff'); R(x + 1, cy + 4, 2, 1, '#fff');
      return;
    }
    const lean = b.state === 'curl' ? Math.round(Math.pow(b.t / 44, 2) * 10) * f : 0;
    const shk = b.state === 'curl' ? Math.round(Math.sin(b.t * 2) * 1) : 0;
    const lo = (h) => Math.round(lean * h / 50) + shk;
    const stepW = b.state === 'walk' ? Math.round(Math.sin(frame * 0.2) * 2) : 0;
    R(x - 9 + stepW, y - 4, 7, 4, '#3a2414'); R(x + 2 - stepW, y - 4, 7, 4, '#3a2414');
    // the salami log: rounded top and bottom
    const H = 48, r = 7;
    for (let i = 0; i < H; i++) {
      const hFromBottom = H - i, yy = y - 4 - hFromBottom;
      let half = 14;
      if (i < r) half = 14 - Math.round(r - Math.sqrt(r * r - (r - i - 0.5) * (r - i - 0.5)));
      else if (i >= H - r) { const k = i - (H - r); half = 14 - Math.round(r - Math.sqrt(r * r - (k + 0.5) * (k + 0.5))); }
      const ox = x + lo(hFromBottom);
      R(ox - half, yy, half * 2, 1, C.e); R(ox - half + 1, yy, half * 2 - 2, 1, C.m);
      R(ox - half + 2, yy, 2, 1, C.l); R(ox + half - 4, yy, 2, 1, C.s);
    }
    for (let j = 0; j < 16; j++) R(x + lo(20) - 11 + (hash(j, 1) * 22 | 0), y - 8 - (hash(j, 2) * 38 | 0), 2, 1, flashing ? '#ffd1d1' : '#f3cdbd');
    for (const hh of [14, 30]) R(x + lo(hh) - 14, y - 4 - hh, 28, 1, '#d9b86a'); // twine bands
    // medals
    for (let i = 0; i < 3; i++) { const mx = x + lo(16) - f * 8 + f * i * 5 - 1; R(mx, y - 24, 3, 3, '#ffd93b'); R(mx + 1, y - 21, 1, 3, i % 2 ? '#3b6fd9' : '#e24a4a'); }
    // arms with little gloves
    const salute = b.state === 'slice' && b.t < 40;
    R(x + lo(28) + f * 13, y - (salute ? 44 : 30), 5, 3, '#4a6a3a'); R(x + lo(28) + f * 17, y - (salute ? 46 : 30), 3, 3, '#f4efe0');
    R(x + lo(26) - f * 17, y - 28 + (b.state === 'dazed' ? 3 : 0), 4, 3, '#4a6a3a'); R(x + lo(26) - f * 20, y - 28, 3, 3, '#f4efe0');
    // face
    const fo = lo(36), fx = x + fo + f * 2, fy = y - 40;
    if (b.state === 'dazed' || b.state === 'dying') {
      for (const dx of [-6, 2]) { R(fx + dx, fy, 4, 1, '#1d1018'); R(fx + dx + 1, fy + 1, 2, 1, '#1d1018'); R(fx + dx, fy + 2, 4, 1, '#1d1018'); }
      R(fx - 3, fy + 8, 7, 2, '#1d1018'); R(fx - 2, fy + 9, 5, 1, '#e06a6a');
    } else if (b.state === 'hurt') {
      R(fx - 7, fy, 5, 1, '#1d1018'); R(fx + 2, fy, 5, 1, '#1d1018'); R(fx - 3, fy + 7, 7, 4, '#1d1018'); R(fx - 1, fy + 9, 3, 2, '#e24a4a');
    } else {
      R(fx - 7, fy, 5, 5, '#fff'); R(fx + 1, fy, 5, 5, '#fff');
      R(fx - 5 + f, fy + 1 + (awake ? 0 : 1), 2, 3, '#1d1018'); R(fx + 3 + f, fy + 1 + (awake ? 0 : 1), 2, 3, '#1d1018');
      for (let i = 0; i < 6; i++) { R(fx - 8 + i, fy - 3 + (f > 0 ? i : 5 - i) / 2 | 0, 1, 2, '#1d1018'); R(fx + 1 + i, fy - 3 + (f > 0 ? 5 - i : i) / 2 | 0, 1, 2, '#1d1018'); }
      const open = b.state === 'slice' || b.state === 'intro';
      R(fx - 3, fy + 8, 7, open ? 4 : 2, '#1d1018'); if (open) R(fx - 1, fy + 10, 3, 2, '#e06a6a');
    }
    // big gray mustache with curly ends
    R(fx - 8, fy + 6, 8, 2, '#d8d8d8'); R(fx, fy + 6, 8, 2, '#d8d8d8'); R(fx - 9, fy + 5, 2, 1, '#d8d8d8'); R(fx + 8, fy + 5, 2, 1, '#d8d8d8'); R(fx - 6, fy + 8, 4, 1, '#b0b0b0'); R(fx + 2, fy + 8, 4, 1, '#b0b0b0');
    // the general's cap with gold braid
    const hx = x + lo(46);
    R(hx - 11, y - 56, 22, 6, '#4a6a3a'); R(hx - 9, y - 59, 18, 3, '#4a6a3a'); R(hx - 11, y - 51, 22, 2, '#ffd93b'); R(hx + f * 4, y - 49, 12, 2, '#2a3a1a'); R(hx - 2, y - 56, 4, 4, '#ffd93b'); R(hx - 1, y - 55, 2, 2, '#e24a4a');
    if (b.state === 'dazed') bossStars(hx, y - 64);
    if (b.state === 'slice' && b.t < 38) bossWindMark(hx, y - 78);
    if (b.state === 'curl') { if (b.t % 8 < 4) bossWindMark(hx, y - 78); }
    if (b.bubbleT > 0 && b.bubble) bubble(hx, y - 66, b.bubble);
  },
};

// ================================================================ 3. Captain Gravy (gravy)
// Lobs gravy at spots marked on the floor (each leaves a slippery puddle), and pours a tall gravy wave you have to
// jump early. After pouring he's empty and dizzy: stomp his cap.
BOSSES.gravy = {
  name: 'CAPTAIN GRAVY',
  lines: { intro: 'All aboard the gravy train!', hit: ['Gurgle! Steady as she goes!', 'Man overboard!'], die: "I'm... all out of... gravy..." },
  colors: ['#6b3a14', '#b0702a', '#ffffff'],
  h: 44, hw: 20, dazed: 130,
  freezeFace: (b) => b.state === 'pour' && b.t > 20,
  dangerous: (b) => ['walk', 'lob', 'pour', 'intro'].includes(b.state),
  stompable: (b) => ['walk', 'lob', 'dazed'].includes(b.state),
  step(b, ph, spd, toCab) {
    switch (b.state) {
      case 'walk': {
        const d = Math.abs(cab.x - b.x);
        b.x += (d > 110 ? toCab : d < 70 ? -toCab : 0) * (spd * 0.9);
        b.empty = false;
        if (b.t > 52 - ph * 8) { b.atk++; b.state = b.atk % 2 ? 'lob' : 'pour'; b.t = 0; sfx.bossWind(); }
        break;
      }
      case 'lob': {
        const n = 2 + ph;
        for (let i = 0; i < n; i++) if (b.t === 30 + i * 16) {
          const off = (i - (n - 1) / 2) * 46 + (i % 2 ? 10 : -10);
          const tx = clamp(cab.x + off, ARENA.left + 20, ARENA.right - 16);
          b.shots.push({ kind: 'glob', x0: b.x + b.face * 18, y0: GROUND - 28, tx, u: 0, T: 62 }); sfx.toss();
        }
        if (b.t > 30 + (n - 1) * 16 + 24) { b.state = 'walk'; b.t = 0; }
        break;
      }
      case 'pour': {
        const pourAt = 46, second = pourAt + 36;
        if (b.t === pourAt || (ph >= 2 && b.t === second)) { b.waves.push({ kind: 'gravy', x: b.x + b.face * 24, dir: b.face, sp: 1.7 + 0.25 * ph }); sfx.bossSlam(); shake = 4; }
        if (b.t > (ph >= 2 ? second : pourAt) + 26) { b.state = 'dazed'; b.t = 0; b.empty = true; }
        break;
      }
    }
  },
  proj(b) {
    for (const g of b.shots) { // gravy globs flying in an arc to a marked spot
      g.u += 1 / g.T;
      g.x = g.x0 + (g.tx - g.x0) * g.u; g.y = g.y0 + (GROUND - g.y0) * g.u - Math.sin(PI * g.u) * 62;
      if (Math.abs(g.x - cab.x) < 7 && g.y > cab.y - 24 && g.y < cab.y + 2 && hitCabIf(true, g.x)) { g.dead = true; burst(g.x, g.y, 6, BOSSES.gravy.colors, 1.6); }
      if (g.u >= 1 && !g.dead) {
        g.dead = true; sfx.coconut(); burst(g.tx, GROUND - 3, 8, BOSSES.gravy.colors, 1.6);
        peels.push({ x: Math.round(g.tx), y: GROUND, used: 0, ttl: 420 });
      }
    }
    for (const w of b.waves) {
      w.x += w.dir * w.sp;
      if (w.x < ARENA.left + 8 || w.x > ARENA.right - 8) w.dead = true;
      if (frame % 3 === 0) particles.push({ x: w.x, y: GROUND - 10 - Math.random() * 10, vx: -w.dir * 0.4, vy: -0.6, life: 14, c: '#a8682a', g: 0.05, s: 2 });
      if (Math.abs(w.x - cab.x) < 11 && cab.y > GROUND - 22) hitCabIf(true, w.x);
    }
  },
  drawProj(b) {
    for (const g of b.shots) { // marker on the floor where it will land, then the glob itself
      const mx = Math.round(g.tx), pulse = Math.round(g.u * 6);
      R(mx - 10 + pulse, GROUND - 1, 20 - pulse * 2, 1, 'rgba(255,60,60,.85)'); R(mx - 8 + pulse, GROUND - 2, 16 - pulse * 2, 1, 'rgba(255,60,60,.45)');
      const x = Math.round(g.x), y = Math.round(g.y);
      disc(x, y, 5, '#4a2810'); disc(x, y, 4, '#6b3a14'); R(x - 2, y - 3, 2, 1, '#c88a48'); R(x, y - 8, 1, 3, '#6b3a14');
    }
    for (const w of b.waves) { // a tall wave of gravy
      const x = Math.round(w.x), d = w.dir;
      R(x - 9, GROUND - 14, 18, 14, '#6b3a14'); R(x - 8, GROUND - 18, 14, 4, '#6b3a14'); R(x - 6 * d - 3, GROUND - 22, 8, 4, '#6b3a14');
      R(x - 6 * d - 3, GROUND - 22, 8, 1, '#c88a48'); R(x - 8, GROUND - 18, 14, 1, '#a8682a'); R(x + 5 * d, GROUND - 24, 3, 2, '#c88a48'); R(x - 9, GROUND - 1, 18, 1, '#4a2810');
      R(x - 4, GROUND - 10, 3, 1, '#a8682a'); R(x + 2, GROUND - 7, 3, 1, '#a8682a');
    }
  },
  draw(b, awake) {
    let x = Math.round(b.x), y = Math.round(b.y);
    const f = b.face;
    const flashing = (b.flash > 0 && frame % 4 < 2) || (b.state === 'dying' && frame % 6 < 3);
    if (b.state === 'dying') x += Math.round(Math.sin(b.t * 1.8) * 2);
    R(x - 18, GROUND, 36, 2, 'rgba(0,0,0,.2)');
    const white = flashing ? '#ffffff' : '#ffffff', shade = flashing ? '#ffd1d1' : '#c9d3e8', blue = flashing ? '#ffd1d1' : '#8fb8e8', navy = '#1f3a6a';
    // lean while pouring: the boat tips toward the spout
    let tilt = 0;
    if (b.state === 'pour') tilt = b.t < 46 ? Math.round(b.t / 46 * 12) : (b.t < 72 || b.t > 120 ? 12 : 12);
    const lo = (h) => Math.round(tilt * f * h / 30);
    // legs
    const stepW = b.state === 'walk' ? Math.round(Math.sin(frame * 0.2) * 2) : 0;
    R(x - 9 + stepW, y - 4, 6, 4, '#34506f'); R(x + 3 - stepW, y - 4, 6, 4, '#34506f');
    // hull: wide at the top, narrow at the bottom
    for (let i = 0; i < 22; i++) {
      const hh = i + 5, inset = Math.floor((21 - i) * 0.4), ox = x + lo(hh);
      R(ox - 20 + inset, y - 4 - hh, 40 - inset * 2, 1, i % 7 === 3 ? blue : (i < 3 ? shade : white));
      R(ox - 20 + inset, y - 4 - hh, 1, 1, shade); R(ox + 19 - inset, y - 4 - hh, 1, 1, shade);
    }
    R(x - 17 + lo(8), y - 12, 34, 1, blue); R(x - 15 + lo(20), y - 24, 30, 1, blue);
    // gravy inside (full) or empty with leftover drips
    const gy = y - 28 + 0, gx = x + lo(24);
    R(gx - 19, y - 30, 38, 4, b.empty ? '#e8edf5' : '#6b3a14'); R(gx - 17, y - 30, 34, 1, b.empty ? '#ffffff' : '#a8682a');
    if (b.empty) { R(gx - 12, y - 28, 5, 2, '#8a4f22'); R(gx + 5, y - 28, 4, 2, '#8a4f22'); }
    // spout (front) and handle (back)
    const sx = x + lo(26) + f * 20;
    R(sx - (f > 0 ? 0 : 7), y - 31, 7, 3, white); R(sx + f * 5 - (f > 0 ? 0 : 5), y - 33, 5, 3, white); R(sx - (f > 0 ? 0 : 7), y - 27, 7, 1, shade);
    const hx = x + lo(20) - f * 21;
    R(hx - (f > 0 ? 2 : 0), y - 26, 5, 3, white); R(hx - f * 4 - (f > 0 ? 0 : 0), y - 23, 3, 9, white); R(hx - (f > 0 ? 2 : 0), y - 15, 5, 3, white);
    // gravy stream while pouring
    if (b.state === 'pour' && b.t >= 46 && b.t < 46 + (phase() >= 2 ? 62 : 26)) { const px = sx + f * 5; R(px, y - 30, 3, 30, '#6b3a14'); R(px, y - 30, 1, 30, '#a8682a'); R(px - 3, y - 2, 9, 2, '#6b3a14'); }
    // face on the hull
    const fo = lo(14), fx = x + fo + f * 2, fy = y - 24;
    if (b.state === 'dazed' || b.state === 'dying') {
      for (const dx of [-8, 3]) { R(fx + dx, fy, 5, 1, '#1d1018'); R(fx + dx + 1, fy + 1, 3, 1, '#1d1018'); R(fx + dx, fy + 2, 5, 1, '#1d1018'); }
      R(fx - 3, fy + 8, 7, 2, '#1d1018'); R(fx - 2, fy + 9, 5, 1, '#e06a6a');
    } else if (b.state === 'hurt') {
      R(fx - 8, fy, 6, 1, '#1d1018'); R(fx + 3, fy, 6, 1, '#1d1018'); R(fx - 3, fy + 7, 7, 4, '#1d1018'); R(fx - 1, fy + 9, 3, 2, '#e24a4a');
    } else {
      R(fx - 8, fy, 6, 5, '#fff'); R(fx + 3, fy, 6, 5, '#fff'); R(fx - 6 + f, fy + 1, 3, 3, '#1d1018'); R(fx + 5 + f, fy + 1, 3, 3, '#1d1018');
      for (let i = 0; i < 6; i++) { R(fx - 9 + i, fy - 3 + (f > 0 ? i : 5 - i) / 2 | 0, 1, 2, '#1d1018'); R(fx + 3 + i, fy - 3 + (f > 0 ? 5 - i : i) / 2 | 0, 1, 2, '#1d1018'); }
      const open = b.state === 'lob' || b.state === 'pour' || b.state === 'intro';
      R(fx - 4, fy + 8, 9, open ? 4 : 2, '#1d1018'); if (open) R(fx - 1, fy + 10, 3, 2, '#e06a6a');
    }
    // captain's cap
    const cx = x + lo(34);
    R(cx - 13, y - 40, 26, 7, white); R(cx - 13, y - 40, 26, 1, shade); R(cx - 13, y - 34, 26, 2, navy); R(cx + f * 4 - (f > 0 ? 0 : 12), y - 32, 12, 2, navy);
    R(cx - 3, y - 39, 6, 4, '#ffd93b'); R(cx - 1, y - 38, 2, 2, '#e24a4a');
    if (b.state === 'dazed') bossStars(cx, y - 48);
    if (b.state === 'lob' && b.t < 30) bossWindMark(cx, y - 62);
    if (b.state === 'pour' && b.t < 46 && b.t % 8 < 4) bossWindMark(cx, y - 62);
    if (b.bubbleT > 0 && b.bubble) bubble(cx, y - 50, b.bubble);
  },
};
