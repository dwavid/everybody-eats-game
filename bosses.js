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
  tip: 'Jump his peels. When he is dizzy, jump on his head!',
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
  tip: 'Jump his slices and rolls. When he is dizzy, stomp his cap!',
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
  tip: 'Jump his waves. When he is empty and dizzy, stomp his cap!',
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

// ================================================================ 4. Sir Splatsalot (tomato)
// A huge bouncing tomato. He tosses mini tomatoes along the floor (jump or stomp them), and bounces toward you in
// squash-and-stretch hops, spraying seeds where he lands. After his last bounce he's splatted flat: stomp him.
function ellipseFill(cx, top, w, h, c1, c2) {
  for (let r = 0; r < h; r++) {
    const dy = ((r + 0.5) / h) * 2 - 1, half = Math.round(w / 2 * Math.sqrt(Math.max(0, 1 - dy * dy)));
    if (half < 1) continue;
    R(cx - half, top + r, half * 2, 1, c1); if (half > 2) R(cx - half + 1, top + r, half * 2 - 2, 1, c2);
  }
}
BOSSES.tomato = {
  name: 'SIR SPLATSALOT',
  tip: 'Jump his bounces. When he is splatted flat, stomp him!',
  lines: { intro: 'Prepare to be SAUCED!', hit: ["Squish! Now I'm really RED!", "You're making me PASTA-way!"], die: 'Tomato, tomahto... it is all... over...' },
  colors: ['#e0302a', '#ff9a8a', '#8a1a18'],
  h: 44, hw: 18, dazed: 130,
  box: (b) => (b.state === 'dazed' ? { hw: 22, h: 26 } : null),
  freezeFace: (b) => b.state === 'hop',
  dangerous: (b) => ['walk', 'toss', 'bounce', 'hop', 'land', 'intro'].includes(b.state),
  stompable: (b) => ['walk', 'toss', 'dazed'].includes(b.state),
  step(b, ph, spd, toCab) {
    switch (b.state) {
      case 'walk': {
        const d = Math.abs(cab.x - b.x);
        b.x += (d > 100 ? toCab : d < 60 ? -toCab : 0) * spd * 0.9;
        if (b.t > 60 - ph * 10) { b.atk++; b.state = b.atk % 2 ? 'toss' : 'bounce'; b.t = 0; sfx.bossWind(); if (b.state === 'bounce') b.hops = 2 + (ph >= 1 ? 1 : 0); }
        break;
      }
      case 'toss':
        if (b.t === 38 || (ph >= 1 && b.t === 68)) { b.shots.push({ kind: 'mini', x: b.x + b.face * 20, dir: b.face, sp: 2 + ph * 0.3, rot: 0 }); sfx.toss(); }
        if (b.t > (ph >= 1 ? 100 : 70)) { b.state = 'walk'; b.t = 0; }
        break;
      case 'bounce': // squashing down for the first hop
        if (b.t === 28) { const air = 46 - ph * 4; b.vy = -(0.5 * TUNE.gravity * air); b.vx = clamp((cab.x - b.x) / air, -3, 3); b.state = 'hop'; b.t = 0; sfx.jump(); }
        break;
      case 'hop':
        b.x += b.vx; b.vy += TUNE.gravity; b.y += b.vy;
        if (b.y >= GROUND) {
          b.y = GROUND; b.vy = 0; shake = 8; sfx.bossSlam(); burst(b.x, GROUND - 3, 10, ['#e0302a', '#ff9a8a', '#8a1a18'], 2.2);
          for (const [vx, vy] of [[-2.2, -3.2], [-1.2, -2.6], [1.2, -2.6], [2.2, -3.2]]) b.shots.push({ kind: 'seed', x: b.x, y: GROUND - 6, vx, vy });
          if (--b.hops > 0) { b.state = 'land'; b.t = 0; } else { b.state = 'dazed'; b.t = 0; }
        }
        break;
      case 'land': // a quick squash between hops
        if (b.t > 12) { const air = 46 - ph * 4; b.vy = -(0.5 * TUNE.gravity * air); b.vx = clamp((cab.x - b.x) / air, -3, 3); b.state = 'hop'; b.t = 0; sfx.jump(); }
        break;
    }
  },
  proj(b) {
    for (const p of b.shots) {
      if (p.kind === 'seed') {
        p.vy += 0.14; p.x += p.vx; p.y += p.vy;
        if (p.y >= GROUND - 2 || p.x < ARENA.left + 4 || p.x > ARENA.right - 4) p.dead = true;
        if (!p.dead && Math.abs(p.x - cab.x) < 6 && p.y > cab.y - 24 && p.y < cab.y + 2) { p.dead = true; hitCabIf(true, p.x); }
      } else { // a mini tomato rolling along the floor; stompable
        p.x += p.dir * p.sp; p.rot += 0.3 * p.dir;
        if (p.x < ARENA.left + 8 || p.x > ARENA.right - 8) p.dead = true;
        if (Math.abs(p.x - cab.x) < 9 && cab.y > GROUND - 15) {
          if (cab.vy > 0 && cab.y - cab.vy <= GROUND - 9) { p.dead = true; cab.vy = -TUNE.stompBounce; cab.onGround = false; sfx.stomp(); burst(p.x, GROUND - 6, 6, BOSSES.tomato.colors, 1.6); addScore(100, p.x, GROUND - 20); }
          else if (hitCabIf(true, p.x)) p.dead = true;
        }
      }
    }
  },
  drawProj(b) {
    for (const p of b.shots) {
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.kind === 'seed') { R(x - 1, y - 2, 3, 4, '#f6e0a0'); R(x - 1, y - 2, 1, 4, '#fff6d0'); R(x, y + 1, 1, 1, '#c8a060'); }
      else { const cy = GROUND - 8; disc(x, cy, 8, '#8a1a18'); disc(x, cy, 7, '#e0302a'); R(x - 5, cy - 6, 3, 1, '#ff9a8a'); R(x + Math.cos(p.rot) * 6 - 1, cy + Math.sin(p.rot) * 6 - 1, 3, 3, '#3aa648'); const fx = x + Math.sign(p.dir); R(fx - 3, cy - 2, 2, 3, '#2a1a22'); R(fx + 2, cy - 2, 2, 3, '#2a1a22'); R(fx - 4, cy - 4, 3, 1, '#2a1a22'); R(fx + 2, cy - 4, 3, 1, '#2a1a22'); }
    }
  },
  draw(b, awake) {
    let x = Math.round(b.x), y = Math.round(b.y);
    const f = b.face;
    const flashing = (b.flash > 0 && frame % 4 < 2) || (b.state === 'dying' && frame % 6 < 3);
    if (b.state === 'dying') x += Math.round(Math.sin(b.t * 1.8) * 2);
    let W2 = 36, H2 = 34;
    if (b.state === 'bounce') { const k = Math.min(1, b.t / 28); W2 = 36 + Math.round(k * 8); H2 = 34 - Math.round(k * 10); }
    else if (b.state === 'hop') { const s = Math.min(1, Math.abs(b.vy) / 6.5); W2 = 36 - Math.round(s * 5); H2 = 34 + Math.round(s * 6); }
    else if (b.state === 'land') { W2 = 44; H2 = 26; }
    else if (b.state === 'dazed') { W2 = 46; H2 = 22; }
    else if (b.state === 'toss' && b.t < 38) { W2 = 36 + Math.round(b.t / 38 * 4); H2 = 34 + Math.round(b.t / 38 * 3); }
    if (b.state !== 'hop') R(x - 15, GROUND, 30, 2, 'rgba(0,0,0,.2)'); else R(x - 11, GROUND, 22, 2, 'rgba(0,0,0,.15)');
    const stepW = b.state === 'walk' ? Math.round(Math.sin(frame * 0.2) * 2) : 0;
    const top = y - 4 - H2, cy = top + (H2 >> 1);
    R(x - 9 + stepW, y - 4, 7, 4, '#4a2810'); R(x + 2 - stepW, y - 4, 7, 4, '#4a2810');
    ellipseFill(x, top, W2, H2, flashing ? '#ffd1d1' : '#8a1a18', flashing ? '#ffffff' : '#e0302a');
    R(x - (W2 >> 1) + 4, top + 3, 5, 2, '#ff9a8a'); R(x - (W2 >> 1) + 3, top + 5, 2, 3, '#ff9a8a'); // highlight
    // leafy crown
    const leaf = flashing ? '#fff' : '#3aa648';
    R(x - 7, top - 2, 14, 3, leaf); R(x - 4, top - 5, 8, 4, leaf); R(x - 10, top, 5, 2, leaf); R(x + 5, top, 5, 2, leaf); R(x - 1, top - 8, 3, 4, '#2f8a3a');
    // tiny arms
    const armUp = b.state === 'toss' && b.t < 38 ? -8 : 0;
    R(x + f * (W2 / 2 - 1), cy + 2 + armUp, 5, 3, '#c02820'); R(x + f * (W2 / 2 + 3), cy + 3 + armUp, 2, 2, '#e0302a');
    R(x - f * (W2 / 2 + 3), cy + 3, 5, 3, '#c02820');
    // face
    const fx = x + f * 3, fy = cy - 3;
    if (b.state === 'dazed' || b.state === 'dying') { for (const dx of [-7, 2]) { R(fx + dx, fy, 5, 1, '#2a1a22'); R(fx + dx + 1, fy + 1, 3, 1, '#2a1a22'); R(fx + dx, fy + 2, 5, 1, '#2a1a22'); } R(fx - 3, fy + 8, 7, 2, '#2a1a22'); R(fx - 1, fy + 9, 3, 1, '#ff9a8a'); }
    else if (b.state === 'hurt') { R(fx - 7, fy, 6, 1, '#2a1a22'); R(fx + 2, fy, 6, 1, '#2a1a22'); R(fx - 4, fy + 6, 8, 4, '#2a1a22'); R(fx - 1, fy + 8, 3, 2, '#ff9a8a'); }
    else {
      R(fx - 7, fy, 5, 5, '#fff'); R(fx + 2, fy, 5, 5, '#fff'); R(fx - 5 + f, fy + 1 + (awake ? 0 : 1), 2, 3, '#c11'); R(fx + 4 + f - 2, fy + 1 + (awake ? 0 : 1), 2, 3, '#c11');
      for (let i = 0; i < 6; i++) { R(fx - 8 + i, fy - 3 + (f > 0 ? i : 5 - i) / 2 | 0, 1, 2, '#2a1a22'); R(fx + 2 + i, fy - 3 + (f > 0 ? 5 - i : i) / 2 | 0, 1, 2, '#2a1a22'); }
      const open = b.state === 'toss' || b.state === 'intro' || b.state === 'hop';
      R(fx - 5, fy + 8, 10, open ? 5 : 3, '#2a1a22'); R(fx - 4, fy + 8, 2, 2, '#fff'); R(fx + 2, fy + 8, 2, 2, '#fff'); R(fx - 1, fy + 8, 2, 2, '#fff'); if (open) R(fx - 2, fy + 11, 4, 2, '#e06a6a');
    }
    if (b.state === 'dazed') bossStars(x, top - 14);
    if (b.state === 'toss' && b.t < 38) bossWindMark(x, top - 22);
    if (b.bubbleT > 0 && b.bubble) bubble(x, top - 22, b.bubble);
  },
};

// ================================================================ 5. Count Cacciatore (chicken)
// A roast chicken in a hunter's hat. He sends baby chicks running at you from both walls (stomp or hop them), then
// flaps up out of sight while his shadow tracks you, and dive-bombs where it locks. He lands head-first, legs kicking.
function chickenSprite(b, awake, flipped) { // drawn at the origin with the feet at (0,0), facing +x (the caller scales)
  const flashing = (b.flash > 0 && frame % 4 < 2) || (b.state === 'dying' && frame % 6 < 3);
  const gold = flashing ? '#ffffff' : '#d89a4a', dark = flashing ? '#ffd1d1' : '#8a5a20', light = flashing ? '#fff' : '#f0c070';
  const flap = (b.state === 'flap' || b.state === 'rise') ? Math.round(Math.sin(frame * 0.7) * 6) : 0;
  const stepW = b.state === 'walk' ? Math.round(Math.sin(frame * 0.2) * 2) : 0;
  R(-6 + stepW, -9, 2, 7, '#e8902a'); R(3 - stepW, -9, 2, 7, '#e8902a'); R(-9 + stepW, -2, 6, 2, '#e8902a'); R(1 - stepW, -2, 6, 2, '#e8902a'); R(-9 + stepW, -3, 1, 1, '#e8902a'); R(5 - stepW, -3, 1, 1, '#e8902a');
  R(-19, -34, 7, 14, dark); R(-17, -36, 5, 4, gold); R(-21, -30, 4, 10, gold); R(-19, -22, 7, 3, light); // tail feathers
  disc(0, -21, 15, dark); disc(0, -21, 14, gold); disc(2, -18, 9, light);
  R(-8, -29, 5, 2, light); R(-9, -28, 2, 2, light); // highlight
  for (let i = 0; i < 3; i++) { disc(-6 + i * 6, -14 + i * -4 + 4, 2, '#d03a2a'); R(-7 + i * 6, -15 + i * -4 + 4, 1, 1, '#ff8a7a'); } // sash of pepper rings
  R(-4, -24 - flap, 9, 7, dark); R(-3, -23 - flap, 7, 5, gold); R(-6, -26 - flap, 5, 4, dark); R(-5, -25 - flap, 3, 2, gold); // wing
  disc(9, -38, 8, dark); disc(9, -38, 7, gold); R(15, -39, 6, 3, '#ff9a30'); R(15, -37, 5, 1, '#c86a10'); R(13, -34, 3, 4, '#e03030'); // head, beak, wattle
  R(6, -49, 3, 5, '#e03030'); R(9, -50, 3, 5, '#e03030'); R(12, -48, 3, 4, '#e03030'); // comb
  if (b.state === 'dazed' || b.state === 'dying') { for (const dx of [5, 11]) { R(dx, -41, 3, 1, '#1d1018'); R(dx + 1, -40, 1, 1, '#1d1018'); R(dx, -39, 3, 1, '#1d1018'); } }
  else if (b.state === 'hurt') { R(5, -41, 4, 1, '#1d1018'); R(11, -41, 4, 1, '#1d1018'); }
  else { R(6, -41, 3, 4, '#fff'); R(12, -41, 3, 4, '#fff'); R(7 + 1, -40 + (awake ? 0 : 1), 2, 3 - (awake ? 0 : 1), '#c11'); R(13, -40 + (awake ? 0 : 1), 2, 3 - (awake ? 0 : 1), '#c11'); R(5, -44, 4, 1, '#1d1018'); R(6, -43, 3, 1, '#1d1018'); R(11, -44, 4, 1, '#1d1018'); R(11, -43, 3, 1, '#1d1018'); }
  // hunter's hat with a feather
  R(2, -48, 15, 3, '#2f5a2f'); R(4, -55, 11, 8, '#3a6a3a'); R(6, -58, 7, 4, '#3a6a3a'); R(4, -49, 11, 2, '#c8a040'); R(13, -64, 2, 10, '#d03a3a'); R(14, -66, 2, 6, '#f06a6a');
}
BOSSES.chicken = {
  name: 'COUNT CACCIATORE',
  tip: 'Hop his chicks. When his beak is stuck, stomp him!',
  lines: { intro: 'Welcome to MY hunting grounds!', hit: ['Cluck! My feathers!', 'Now I am FOWL-tempered!'], die: 'I have been... plucked...' },
  colors: ['#d89a4a', '#f0c070', '#e03030'],
  h: 56, hw: 16, dazed: 140,
  box: (b) => (b.state === 'dive' ? { hw: 14, h: 40 } : b.state === 'dazed' ? { hw: 16, h: 52 } : null),
  freezeFace: (b) => ['rise', 'track', 'dive'].includes(b.state),
  dangerous: (b) => ['walk', 'flap', 'dive', 'intro'].includes(b.state),
  stompable: (b) => ['walk', 'flap', 'dazed'].includes(b.state),
  spawnChick(side) {
    if (enemies.filter((e) => e.kind === 'chick' && e.alive).length >= 6) return;
    enemies.push({ type: 'mini', kind: 'chick', x: side < 0 ? ARENA.left + 18 : ARENA.right - 18, y: GROUND, z: 0, vz: 0, pre: 0, hopCd: 0, a: ARENA.left + 10, b: ARENA.right - 10, dir: -side, alive: true, t: 0, squish: 0, anim: 0 });
  },
  step(b, ph, spd, toCab) {
    switch (b.state) {
      case 'walk': {
        const d = Math.abs(cab.x - b.x);
        b.x += (d > 110 ? toCab : d < 70 ? -toCab : 0) * spd * 0.9;
        if (b.t > 58 - ph * 8) { b.atk++; b.state = b.atk % 2 ? 'flap' : 'rise'; b.t = 0; sfx.bossWind(); }
        break;
      }
      case 'flap': // flaps his wings and sends in chicks: one from each wall, more as he gets hurt
        for (let i = 0; i <= ph; i++) if (b.t === 26 + i * 34) { BOSSES.chicken.spawnChick(-1); BOSSES.chicken.spawnChick(1); sfx.monkey(); }
        if (b.t > 40 + ph * 34) { b.state = 'walk'; b.t = 0; }
        break;
      case 'rise':
        b.y -= 7 + b.t * 0.15;
        if (b.y < -70) { b.state = 'track'; b.t = 0; b.y = -70; }
        break;
      case 'track': // out of sight; his shadow follows you, then locks
        if (b.t < 56) b.x += (cab.x - b.x) * 0.09; b.x = clamp(b.x, ARENA.left + 24, ARENA.right - 20);
        if (b.t === 56) sfx.bossWind();
        if (b.t >= 82) { b.state = 'dive'; b.t = 0; b.vy = 11; }
        break;
      case 'dive':
        b.y += b.vy;
        if (b.y >= GROUND) { b.y = GROUND; b.vy = 0; b.state = 'dazed'; b.t = 0; shake = 10; sfx.bossSlam(); burst(b.x + 6, GROUND - 2, 12, ['#e8d9b0', '#c9a96b', '#d89a4a'], 2.4); }
        break;
    }
  },
  proj() {},
  drawProj(b) { // the shadow that tells you where he'll land
    if (b.state === 'track' || (b.state === 'rise' && b.y < 20)) {
      const x = Math.round(b.x), lock = b.state === 'track' && b.t >= 56, k = b.state === 'track' ? Math.min(1, b.t / 56) : 0;
      const w = 14 - Math.round(k * 4);
      R(x - w, GROUND - 1, w * 2, 1, lock ? 'rgba(255,40,40,.95)' : 'rgba(0,0,0,.45)'); R(x - w + 3, GROUND - 2, w * 2 - 6, 1, lock ? 'rgba(255,80,80,.6)' : 'rgba(0,0,0,.25)');
      if (lock && frame % 6 < 3) txtOutline('!', x, GROUND - 24, 10, '#fff', '#c33', 'center');
    }
  },
  draw(b, awake) {
    if (b.y < -20) return;
    let x = Math.round(b.x), y = Math.round(b.y);
    const stuck = b.state === 'dazed' && b.stuck;
    if (b.state === 'dying') x += Math.round(Math.sin(b.t * 1.8) * 2);
    if (b.state === 'dive' || b.state === 'rise') R(x - 12, GROUND, 24, 2, 'rgba(0,0,0,.15)'); else R(x - 14, GROUND, 28, 2, 'rgba(0,0,0,.2)');
    ctx.save();
    if (b.state === 'dazed') { ctx.translate(x, y - 56); ctx.scale(b.face, -1); } // head first into the ground, legs in the air
    else { ctx.translate(x, y); ctx.scale(b.face, 1); }
    chickenSprite(b, awake, b.state === 'dazed');
    ctx.restore();
    if (b.state === 'dazed') { for (let i = 0; i < 3; i++) R(x + b.face * 14 + (i - 1) * 4, GROUND - 3 - (frame % 12 > 6 ? 1 : 0), 2, 2, '#c9a96b'); bossStars(x, y - 66); }
    if (b.state === 'flap' && b.t < 26) bossWindMark(x, y - 74);
    if (b.bubbleT > 0 && b.bubble) bubble(x, y - 70, b.bubble);
  },
};

// ================================================================ 6. King Baloney (bologna)
// A crowned slice of bologna. He throws his crown like a boomerang along the floor (hop it going out and coming back),
// and claps two slices of bread in from both walls: dodge them and they squash HIM, and he's flat and dizzy.
BOSSES.baloney = {
  name: 'KING BALONEY',
  tip: 'Dodge his bread so it squishes HIM, then stomp him!',
  lines: { intro: 'Everything I say is BALONEY!', hit: ['Ow! My casing!', 'Now you have sliced me THIN!'], die: 'This is... all... baloney...' },
  colors: ['#f0a0a8', '#ffd8dc', '#a83a42'],
  h: 52, hw: 21, dazed: 150,
  box: (b) => (b.state === 'dazed' ? { hw: 23, h: 28 } : null),
  freezeFace: (b) => b.state === 'sandwich' && b.t > 20,
  dangerous: (b) => ['walk', 'crown', 'sandwich', 'intro'].includes(b.state),
  stompable: (b) => ['walk', 'crown', 'dazed'].includes(b.state),
  step(b, ph, spd, toCab) {
    const cx = (ARENA.left + ARENA.right) / 2;
    switch (b.state) {
      case 'walk': {
        const d = Math.abs(cab.x - b.x);
        b.x += (d > 120 ? toCab : d < 80 ? -toCab : 0) * spd * 0.8;
        if (b.t > 56 - ph * 8) { b.atk++; b.state = b.atk % 2 ? 'sandwich' : 'crown'; b.t = 0; sfx.bossWind(); }
        break;
      }
      case 'crown': // throws his crown out along the floor and it comes back
        if (b.t === 30) { b.shots.push({ kind: 'crown', x: b.x + b.face * 14, dir: b.face, out: true, dist: 0, max: 130 + ph * 20, rot: 0 }); sfx.toss(); }
        if (b.t > 40 && !b.shots.some((s) => s.kind === 'crown')) { b.state = 'walk'; b.t = 0; }
        if (b.t > 240) { b.state = 'walk'; b.t = 0; b.shots = b.shots.filter((s) => s.kind !== 'crown'); }
        break;
      case 'sandwich': { // he slides to the middle and claps; bread slides in from both walls toward him
        if (b.t < 40) b.x += (cx - b.x) * 0.12;
        if (b.t === 44) {
          const sp = 2 + ph * 0.25;
          b.shots.push({ kind: 'bread', x: ARENA.left + 14, dir: 1, sp, stuck: false }, { kind: 'bread', x: ARENA.right - 14, dir: -1, sp, stuck: false }); sfx.bossSlam();
        }
        if (b.t > 44) {
          const breads = b.shots.filter((s) => s.kind === 'bread');
          if (breads.length === 2 && breads.every((s) => s.stuck)) { // both slices reached him: he's squished
            b.shots = b.shots.filter((s) => s.kind !== 'bread'); b.state = 'dazed'; b.t = 0; shake = 9; sfx.bossSlam(); sfx.ding();
            burst(b.x, GROUND - 20, 12, ['#f0dca8', '#9a6a30', '#f0a0a8'], 2.4); popup(b.x, GROUND - 60, 'SQUISHED!', '#fff');
          } else if (b.t > 220) { b.shots = b.shots.filter((s) => s.kind !== 'bread'); b.state = 'walk'; b.t = 0; }
        }
        break;
      }
    }
  },
  proj(b) {
    for (const p of b.shots) {
      if (p.kind === 'crown') {
        p.rot += 0.5;
        if (p.out) { p.x += p.dir * 3; p.dist += 3; if (p.dist >= p.max || p.x < ARENA.left + 10 || p.x > ARENA.right - 10) p.out = false; }
        else { const dx = b.x - p.x; p.x += Math.sign(dx) * 3.4; if (Math.abs(dx) < 10) { p.dead = true; sfx.ding(); } }
        if (!p.dead && Math.abs(p.x - cab.x) < 10 && cab.y > GROUND - 18) hitCabIf(true, p.x);
      } else if (!p.stuck) { // bread
        p.x += p.dir * p.sp;
        if (Math.abs(p.x - b.x) <= BOSSES.baloney.hw + 8) p.stuck = true;
        else if (Math.abs(p.x - cab.x) < 10 && cab.y > GROUND - 16) hitCabIf(true, p.x);
      }
    }
  },
  drawProj(b) {
    for (const p of b.shots) {
      const x = Math.round(p.x);
      if (p.kind === 'crown') { ctx.save(); ctx.translate(x, GROUND - 12); ctx.rotate(p.rot); R(-6, -2, 12, 5, '#ffd93b'); R(-6, -5, 3, 3, '#ffd93b'); R(-1, -6, 3, 4, '#ffd93b'); R(3, -5, 3, 3, '#ffd93b'); R(-1, 0, 2, 2, '#e03030'); R(-6, 2, 12, 1, '#c99a14'); ctx.restore(); }
      else { R(x - 8, GROUND - 16, 16, 16, '#9a6a30'); R(x - 7, GROUND - 15, 14, 14, '#f0dca8'); R(x - 7, GROUND - 15, 14, 2, '#fff2c8'); R(x - 8, GROUND - 17, 5, 2, '#9a6a30'); R(x + 3, GROUND - 17, 5, 2, '#9a6a30'); R(x - 3, GROUND - 9, 1, 1, '#d8c088'); R(x + 2, GROUND - 6, 1, 1, '#d8c088'); }
    }
  },
  draw(b, awake) {
    let x = Math.round(b.x), y = Math.round(b.y);
    const f = b.face;
    const flashing = (b.flash > 0 && frame % 4 < 2) || (b.state === 'dying' && frame % 6 < 3);
    if (b.state === 'dying') x += Math.round(Math.sin(b.t * 1.8) * 2);
    const flat = b.state === 'dazed';
    R(x - 18, GROUND, 36, 2, 'rgba(0,0,0,.2)');
    const rim = flashing ? '#ffd1d1' : '#a83a42', body = flashing ? '#ffffff' : '#f0a0a8', inner = flashing ? '#fff' : '#f8b4b8';
    const stepW = b.state === 'walk' ? Math.round(Math.sin(frame * 0.2) * 2) : 0;
    R(x - 9 + stepW, y - 4, 7, 4, '#4a2c1a'); R(x + 2 - stepW, y - 4, 7, 4, '#4a2c1a');
    // royal cape behind
    if (!flat) { ctx.fillStyle = '#7a2a8f'; ctx.beginPath(); ctx.moveTo(x - f * 4, y - 40); ctx.lineTo(x - f * 24, y - 3); ctx.lineTo(x - f * 4, y - 6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a04ab8'; ctx.beginPath(); ctx.moveTo(x - f * 4, y - 40); ctx.lineTo(x - f * 15, y - 9); ctx.lineTo(x - f * 4, y - 22); ctx.closePath(); ctx.fill(); }
    const bw = flat ? 46 : 38, bh = flat ? 20 : 38, top = y - 4 - bh, cy = top + (bh >> 1);
    ellipseFill(x, top, bw, bh, rim, body);
    ellipseFill(x, top + 3, bw - 8, bh - 6, body, inner);
    for (const [dx, dy] of [[-10, -6], [8, -8], [11, 3], [-12, 4], [-2, 9], [3, -13], [-5, -12]]) if (!flat || Math.abs(dy) < 7) R(x + dx, cy + (flat ? dy >> 1 : dy), 2, 2, '#f8e0e0');
    R(x - 13, top + 3, 5, 1, '#fff'); R(x - 14, top + 4, 2, 2, '#fff');
    // arms with white gloves
    R(x + f * (bw / 2 - 2), cy + 4, 5, 3, '#fff'); R(x - f * (bw / 2 + 2), cy + 4, 5, 3, '#fff');
    // face
    const fx = x + f * 2, fy = cy - 5;
    if (b.state === 'dazed' || b.state === 'dying') { for (const dx of [-8, 3]) { R(fx + dx, fy, 5, 1, '#1d1018'); R(fx + dx + 1, fy + 1, 3, 1, '#1d1018'); R(fx + dx, fy + 2, 5, 1, '#1d1018'); } R(fx - 3, fy + 8, 7, 2, '#1d1018'); }
    else if (b.state === 'hurt') { R(fx - 8, fy, 6, 1, '#1d1018'); R(fx + 3, fy, 6, 1, '#1d1018'); R(fx - 3, fy + 8, 7, 3, '#1d1018'); }
    else { R(fx - 8, fy, 6, 5, '#fff'); R(fx + 3, fy, 6, 5, '#fff'); R(fx - 6 + f, fy + 1 + (awake ? 0 : 1), 2, 3, '#1d1018'); R(fx + 5 + f, fy + 1 + (awake ? 0 : 1), 2, 3, '#1d1018'); for (let i = 0; i < 6; i++) { R(fx - 9 + i, fy - 3 + (f > 0 ? i : 5 - i) / 2 | 0, 1, 2, '#1d1018'); R(fx + 3 + i, fy - 3 + (f > 0 ? 5 - i : i) / 2 | 0, 1, 2, '#1d1018'); } }
    if (!flat) { R(fx - 9, fy + 7, 9, 3, '#f0f0f0'); R(fx, fy + 7, 9, 3, '#f0f0f0'); R(fx - 10, fy + 6, 2, 2, '#f0f0f0'); R(fx + 9, fy + 6, 2, 2, '#f0f0f0'); R(fx - 6, fy + 10, 12, 1, '#c8c8c8'); } // big white moustache
    // the crown (missing while it's flying)
    const crownOut = b.shots.some((s) => s.kind === 'crown');
    if (!crownOut) { const cyy = top - 8; R(x - 9, cyy + 4, 18, 5, '#ffd93b'); R(x - 9, cyy, 4, 5, '#ffd93b'); R(x - 2, cyy - 2, 4, 7, '#ffd93b'); R(x + 5, cyy, 4, 5, '#ffd93b'); R(x - 9, cyy + 8, 18, 1, '#c99a14'); R(x - 1, cyy + 5, 2, 2, '#e03030'); R(x - 7, cyy + 5, 2, 2, '#3b6fd9'); R(x + 5, cyy + 5, 2, 2, '#3b6fd9'); }
    else if (frame % 20 < 10) R(x + 8, top + 2, 1, 4, '#8ad0ff'); // a sweat drop
    if (b.state === 'dazed') bossStars(x, top - 12);
    if (b.state === 'sandwich' && b.t < 44) bossWindMark(x, top - 20);
    if (b.state === 'crown' && b.t < 30) bossWindMark(x, top - 20);
    if (b.bubbleT > 0 && b.bubble) bubble(x, top - 20, b.bubble);
  },
};
