'use strict';
// Art for worlds 4-6 (Tomato Garden, Cacciatore Woods, Baloney Factory): food icons, enemies, throwers, hazards and
// the three themes. Same idea as themes.js; this file just registers more entries into its tables.
// Loaded after themes.js.

// ---------------------------------------------------------------- food icons
Object.assign(FOODS, {
  tomato: {
    rows: ['...GGGG...', '.RRRGGRRR.', 'RRrRRRRRRR', 'RrRRRRRRRR', 'RRRRRRRRRR', 'RRRRRRRRRR', 'RRRRRRRRRK', '.RRRRRRRK.', '..RRRRKK..', '...KKKK...'],
    pal: { R: '#e0302a', r: '#ff9a8a', G: '#3aa648', K: '#8a1a18' }, gold: { R: '#ffc400', r: '#fff6a0', G: '#d8a000', K: '#a86a00' },
  },
  cacciatore: {
    rows: ['.KKKK.....', 'KOOOOK....', 'KOoOOOK...', 'KOOOOOOK..', '.KOOOOOK..', '..KKOOK...', '....KwK...', '.....KwK.K', '....KwwKwK', '....KKKKK.'],
    pal: { O: '#d8893a', o: '#f6c070', K: '#7a3f10', w: '#fff4e0' }, gold: { O: '#ffc400', o: '#fff6a0', K: '#a86a00', w: '#fff6d0' },
  },
  bologna: {
    rows: ['..KKKKKK..', '.KPPPPPPK.', 'KPPPpPPPPK', 'KPpPPPPPPK', 'KPPPPPPwPK', 'KPPPPPPPPK', 'KPPwPPPPPK', 'KPPPPPPpPK', '.KPPPPPPK.', '..KKKKKK..'],
    pal: { P: '#f0a0a8', p: '#ffd8dc', w: '#f8e8ea', K: '#a83a42' }, gold: { P: '#ffc400', p: '#fff6a0', w: '#fff6d0', K: '#a86a00' },
  },
});

// ---------------------------------------------------------------- enemies
function squishFlat(e, c1, c2, w) { if (e.squish > 0) { const k = e.squish / 18; R(e.x - w, e.y - 3 * k - 1, w * 2, Math.ceil(3 * k) + 1, c1); R(e.x - w, e.y, w * 2, 1, c2); } }
function drawMiniTomato(e) { // a tomato that rolls at you when you get close
  const x = Math.round(e.x), y = Math.round(e.y);
  if (!e.alive) { squishFlat(e, '#e0302a', '#8a1a18', 9); return; }
  const rolling = e.roll > 0, cy = y - 8;
  if (!rolling) { const st = Math.floor(e.anim) % 2; R(x - 4, y - 2 + (st ? 0 : -1), 3, 3, '#4a2810'); R(x + 2, y - 2 + (st ? -1 : 0), 3, 3, '#4a2810'); }
  disc(x, cy, 8, '#8a1a18'); disc(x, cy, 7, '#e0302a'); R(x - 5, cy - 6, 3, 1, '#ff9a8a'); R(x - 6, cy - 5, 2, 1, '#ff9a8a');
  const a = e.x * 0.25; // the leaf cap and a highlight spin as it rolls
  R(x + Math.cos(a) * 6 - 1, cy + Math.sin(a) * 6 - 1, 3, 3, '#3aa648'); R(x + Math.cos(a + 2.4) * 4, cy + Math.sin(a + 2.4) * 4, 2, 1, '#ff9a8a');
  const fx = x + e.dir;
  R(fx - 3, cy - 2, 2, 3, '#2a1a22'); R(fx + 2, cy - 2, 2, 3, '#2a1a22'); R(fx - 4, cy - 4, 3, 1, '#2a1a22'); R(fx + 2, cy - 4, 3, 1, '#2a1a22'); R(fx - 2, cy + 3, 5, 1, '#3a0a0a');
  if (rolling && e.anim % 6 < 3) { R(x - e.dir * 10, cy + 3, 4, 1, 'rgba(255,255,255,.6)'); R(x - e.dir * 12, cy - 1, 3, 1, 'rgba(255,255,255,.5)'); }
}
function drawMiniMushroom(e) {
  const x = Math.round(e.x), y = Math.round(e.y);
  if (!e.alive) { squishFlat(e, '#d8502a', '#8a2a10', 9); return; }
  const st = Math.floor(e.anim) % 2;
  R(x - 3, y - 9, 6, 9, '#f4e8d0'); R(x - 3, y - 9, 1, 9, '#d8c8a8');
  R(x - 4, y - 2 + (st ? 0 : -1), 3, 2, '#6a4a2a'); R(x + 1, y - 2 + (st ? -1 : 0), 3, 2, '#6a4a2a');
  for (let i = 0; i < 8; i++) { const half = Math.round(9 * Math.sqrt(1 - Math.pow(1 - (i + 0.5) / 8, 2))); R(x - half, y - 17 + i, half * 2, 1, '#8a2a10'); R(x - half + 1, y - 17 + i, half * 2 - 2, 1, '#d8502a'); }
  R(x - 5, y - 13, 3, 2, '#fff'); R(x + 2, y - 15, 3, 2, '#fff'); R(x - 1, y - 11, 2, 1, '#fff');
  R(x - 2 + e.dir, y - 8, 1, 2, '#2a1a22'); R(x + 1 + e.dir, y - 8, 1, 2, '#2a1a22'); R(x - 2, y - 5, 4, 1, '#7a2a2a');
  R(x - 3, y - 10, 2, 1, '#2a1a22'); R(x + 1, y - 10, 2, 1, '#2a1a22');
}
function drawMiniPepper(e) { // a bell pepper that hops at you
  const x = Math.round(e.x), y = Math.round(e.y - (e.z || 0));
  if (!e.alive) { squishFlat(e, '#d02a2a', '#7a1010', 8); return; }
  const air = (e.z || 0) > 0, crouch = e.pre > 0, h = air ? 15 : crouch ? 9 : 12, w = air ? 5 : crouch ? 8 : 6;
  R(x - w, y - h, w * 2, h, '#7a1010'); R(x - w + 1, y - h + 1, w * 2 - 2, h - 2, '#d02a2a'); R(x - w + 1, y - h + 1, 2, 3, '#ff8a7a');
  R(x - 1, y - h - 3, 3, 3, '#3aa648'); R(x, y - h - 4, 2, 1, '#3aa648');
  R(x - 3, y - h + 4, 2, 2, '#fff'); R(x + 1, y - h + 4, 2, 2, '#fff'); R(x - 2 + e.dir, y - h + 4, 1, 2, '#1d1018'); R(x + 2 + e.dir, y - h + 4, 1, 2, '#1d1018');
  R(x - 4, y - h + 3, 3, 1, '#1d1018'); R(x + 1, y - h + 3, 3, 1, '#1d1018'); R(x - 2, y - h + 8, 5, 1, '#1d1018');
}
function drawMiniBread(e) { // an angry slice of toast
  const x = Math.round(e.x), y = Math.round(e.y);
  if (!e.alive) { squishFlat(e, '#e8c888', '#9a6a30', 7); return; }
  const st = Math.floor(e.anim) % 2;
  R(x - 4, y - 2 + (st ? 0 : -1), 3, 3, '#4a2c1a'); R(x + 2, y - 2 + (st ? -1 : 0), 3, 3, '#4a2c1a');
  R(x - 6, y - 15, 12, 13, '#9a6a30'); R(x - 5, y - 14, 10, 11, '#f0dca8'); R(x - 6, y - 16, 4, 2, '#9a6a30'); R(x + 2, y - 16, 4, 2, '#9a6a30'); R(x - 5, y - 14, 10, 1, '#fff2c8');
  R(x - 3 + e.dir, y - 11, 2, 3, '#2a1a22'); R(x + 1 + e.dir, y - 11, 2, 3, '#2a1a22'); R(x - 4, y - 13, 3, 1, '#2a1a22'); R(x + 1, y - 13, 3, 1, '#2a1a22'); R(x - 2, y - 6, 5, 1, '#7a2a2a');
}
function drawMiniPickle(e) { // a pickle that hops at you
  const x = Math.round(e.x), y = Math.round(e.y - (e.z || 0));
  if (!e.alive) { squishFlat(e, '#6aa83a', '#3a6a20', 8); return; }
  const air = (e.z || 0) > 0, crouch = e.pre > 0, h = air ? 18 : crouch ? 11 : 15, w = crouch ? 5 : 4;
  for (let i = 0; i < h; i++) { const t = (i + 0.5) / h, half = Math.max(2, Math.round(w * Math.pow(Math.sin(Math.PI * t), 0.35))); R(x - half, y - h + i, half * 2, 1, '#3a6a20'); R(x - half + 1, y - h + i, half * 2 - 2, 1, '#6aa83a'); }
  R(x - 2, y - h + 3, 1, 1, '#a8d870'); R(x + 1, y - h + 7, 1, 1, '#a8d870'); R(x - 1, y - 4, 1, 1, '#a8d870');
  R(x - 3 + e.dir, y - h + 5, 2, 2, '#fff'); R(x + 1 + e.dir, y - h + 5, 2, 2, '#fff'); R(x - 2 + e.dir, y - h + 6, 1, 1, '#1d1018'); R(x + 2 + e.dir, y - h + 6, 1, 1, '#1d1018');
  R(x - 3, y - h + 4, 3, 1, '#1d1018'); R(x + 1, y - h + 4, 3, 1, '#1d1018'); R(x - 2, y - h + 9, 4, 1, '#1d1018');
}
function drawMiniChick(e) { // Count Cacciatore's baby chicks
  const x = Math.round(e.x), y = Math.round(e.y);
  if (!e.alive) { squishFlat(e, '#ffd93b', '#c99a14', 6); return; }
  const st = Math.floor(e.anim * 2) % 2;
  R(x - 3, y - 2 + (st ? 0 : -1), 1, 3, '#ff9a30'); R(x + 2, y - 2 + (st ? -1 : 0), 1, 3, '#ff9a30');
  disc(x, y - 7, 6, '#e8b820'); disc(x, y - 7, 5, '#ffd93b'); R(x - 3, y - 11, 3, 1, '#fff08a');
  R(x + e.dir * 5 - 1, y - 7, 3, 2, '#ff9a30');
  R(x - 2 + e.dir, y - 9, 1, 2, '#1d1018'); R(x + 1 + e.dir, y - 9, 1, 2, '#1d1018'); R(x - 3, y - 11, 2, 1, '#1d1018'); R(x + 1, y - 11, 2, 1, '#1d1018');
  R(x - 4, y - 8, 2, 3, '#e8b820'); R(x + 3, y - 8, 2, 3, '#e8b820'); R(x, y - 14, 1, 2, '#ffd93b');
}
Object.assign(MINI_ART, { tomato: drawMiniTomato, mushroom: drawMiniMushroom, pepper: drawMiniPepper, bread: drawMiniBread, pickle: drawMiniPickle, chick: drawMiniChick });
Object.assign(MINI_COLORS, {
  tomato: ['#e0302a', '#ff9a8a', '#8a1a18'], mushroom: ['#d8502a', '#ffffff', '#f4e8d0'], pepper: ['#d02a2a', '#ff8a7a', '#3aa648'],
  bread: ['#e8c888', '#f6e8c0', '#9a6a30'], pickle: ['#6aa83a', '#a8d870', '#3a6a20'], chick: ['#ffd93b', '#ffe97a', '#ff9a30'],
});

// ---------------------------------------------------------------- throwers (they stand on platforms)
function drawGnome(m) { // a garden gnome who lobs tomatoes
  if (!m.alive) { if (m.squish > 0) R(m.x - 7, m.y - 3, 14, 3, '#d8302a'); return; }
  ctx.save(); ctx.translate(m.x, m.y); ctx.scale(m.face, 1);
  R(-4, -2, 3, 2, '#4a2c1a'); R(1, -2, 3, 2, '#4a2c1a');
  R(-4, -9, 8, 7, '#3b6fd9'); R(-4, -6, 8, 1, '#2a2a3a');
  R(-4, -13, 8, 5, '#fff'); R(-3, -8, 6, 2, '#fff'); // beard
  R(0, -12, 3, 2, '#f0a090'); // nose
  R(-2, -14, 1, 2, '#1d1018'); R(1, -14, 1, 2, '#1d1018');
  for (let i = 0; i < 8; i++) R(-4 + (i >> 1), -15 - i, 8 - i, 1, '#d8302a'); R(-4, -15, 9, 1, '#f0f0f0');
  if (m.wind > 0) { R(4, -21 - Math.round(Math.sin(m.wind * 0.5)), 2, 7, '#3b6fd9'); disc(5, -24, 3, '#e0302a'); } else { R(4, -9, 2, 5, '#3b6fd9'); R(4, -4, 2, 2, '#f0a090'); }
  ctx.restore();
}
function drawHen(m) { // a hen who throws eggs
  if (!m.alive) { if (m.squish > 0) R(m.x - 7, m.y - 3, 14, 3, '#c89a60'); return; }
  ctx.save(); ctx.translate(m.x, m.y); ctx.scale(m.face, 1);
  R(-2, -3, 1, 3, '#ff9a30'); R(2, -3, 1, 3, '#ff9a30');
  disc(0, -9, 7, '#a8743a'); disc(0, -9, 6, '#c89a60'); R(-8, -12, 4, 5, '#a8743a'); R(-9, -14, 3, 3, '#c89a60'); // tail
  R(-2, -9, 5, 5, '#e8c890'); // wing
  disc(4, -16, 4, '#c89a60'); R(2, -22, 2, 3, '#e03030'); R(4, -21, 2, 2, '#e03030'); R(7, -16, 3, 2, '#ff9a30'); R(5, -14, 2, 2, '#e03030');
  R(4, -17, 1, 2, '#1d1018');
  if (m.wind > 0) { const y = -26 - Math.round(Math.sin(m.wind * 0.5)); R(2, y, 5, 6, '#fff8ea'); R(3, y - 1, 3, 1, '#fff8ea'); R(3, y + 1, 1, 1, '#d8c8a0'); }
  ctx.restore();
}
function drawBottle(m) { // a mustard bottle that squirts
  if (!m.alive) { if (m.squish > 0) R(m.x - 6, m.y - 3, 12, 3, '#e0b010'); return; }
  const x = Math.round(m.x), y = Math.round(m.y), w = m.wind > 0 ? 6 : 5, f = m.face;
  R(x - w, y - 14, w * 2, 14, '#a88808'); R(x - w + 1, y - 14, w * 2 - 2, 13, '#ffd820'); R(x - w + 1, y - 13, 2, 9, '#fff08a');
  R(x - 2, y - 17, 4, 3, '#d03a2a'); R(x - 1 + f * (m.wind > 0 ? 2 : 0), y - 19, 2, 3, '#d03a2a');
  R(x - 4, y - 7, 8, 4, '#fff8e0');
  R(x - 3 + f, y - 12, 2, 3, '#1d1018'); R(x + 1 + f, y - 12, 2, 3, '#1d1018'); R(x - 4, y - 14, 3, 1, '#1d1018'); R(x + 1, y - 14, 3, 1, '#1d1018');
  if (m.wind > 0) R(x - 1 + f, y - 9, 3, 2, '#1d1018'); else R(x - 2 + f, y - 9, 4, 1, '#1d1018');
  R(x - 3, y - 2, 2, 2, '#4a4a52'); R(x + 1, y - 2, 2, 2, '#4a4a52');
}
function drawTomatoBall(x, y, rot) { disc(x, y, 4, '#8a1a18'); disc(x, y, 3, '#e0302a'); R(x - 2, y - 2, 1, 1, '#ff9a8a'); R(x + Math.cos(rot) * 2, y + Math.sin(rot) * 2, 2, 1, '#3aa648'); }
function drawEgg(x, y, rot) { ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot); R(-2, -3, 5, 6, '#fff8ea'); R(-1, -4, 3, 1, '#fff8ea'); R(-2, 1, 5, 1, '#d8c8a0'); R(-1, -2, 1, 1, '#ffffff'); ctx.restore(); }
function drawMustardGlob(x, y) { disc(x, y, 3, '#a88808'); disc(x, y, 2, '#ffd820'); R(x - 1, y - 2, 1, 1, '#fff08a'); R(x, y + 3, 1, 2, '#ffd820'); }
Object.assign(THROWN_ART, { gnome: (b) => drawTomatoBall(Math.round(b.x), Math.round(b.y), b.rot), hen: (b) => drawEgg(b.x, b.y, b.rot), bottle: (b) => drawMustardGlob(Math.round(b.x), Math.round(b.y)) });
Object.assign(THROWER_ART, { gnome: drawGnome, hen: drawHen, bottle: drawBottle });
Object.assign(THROWER_COLORS, { gnome: ['#d8302a', '#3b6fd9', '#ffffff'], hen: ['#c89a60', '#fff8ea', '#e03030'], bottle: ['#ffd820', '#fff08a', '#d03a2a'] });
Object.assign(THROWN_COLORS, { gnome: ['#e0302a', '#ff9a8a', '#8a1a18'], hen: ['#fff8ea', '#ffc830', '#d8c8a0'], bottle: ['#ffd820', '#fff08a', '#a88808'] });
Object.assign(THROWER_PUDDLE, { gnome: 1, hen: 1, bottle: 1 }); // what they throw leaves a slippery puddle (sauce, fried egg, mustard)

// ---------------------------------------------------------------- things that fall on you
function drawDropVine(k) { // ripe tomatoes hanging from a vine: walk under and one drops
  if (k.state === 'gone') return;
  const sh = k.state === 'shake' ? Math.round(Math.sin(k.t * 1.2) * 1.5) : 0, x = k.x + sh;
  const y = k.state === 'fall' ? k.y : 46;
  if (k.state !== 'fall') { R(x - 12, 33, 24, 3, '#3a8a3a'); disc(x - 7, 36, 4, '#46b04a'); disc(x + 7, 36, 4, '#46b04a'); disc(x, 34, 4, '#3aa648'); R(x, 36, 1, y - 38, '#3a8a3a'); }
  disc(x, y, 5, '#8a1a18'); disc(x, y, 4, '#e0302a'); R(x - 2, y - 3, 2, 1, '#ff9a8a'); R(x - 1, y - 6, 3, 2, '#3aa648');
  if (k.state === 'shake' && k.t % 8 < 4) txtOutline('!', k.x - 1, 60, 9, '#fff', '#c33', 'center');
}
function drawDropPinecone(k) { // a pinecone dropping from a pine branch
  if (k.state === 'gone') return;
  const sh = k.state === 'shake' ? Math.round(Math.sin(k.t * 1.2) * 1.5) : 0, x = k.x + sh;
  const y = k.state === 'fall' ? k.y : 46;
  if (k.state !== 'fall') { R(x - 14, 34, 28, 3, '#3a2a1a'); for (let i = -12; i < 12; i += 3) { R(x + i, 36, 2, 5, '#2f6a3a'); R(x + i + 1, 40, 1, 2, '#2f6a3a'); } }
  for (let r = 0; r < 5; r++) R(x - 3 + (r === 0 || r === 4 ? 1 : 0), y - 6 + r * 2, 6 - (r === 0 || r === 4 ? 2 : 0), 2, r % 2 ? '#8a5a2a' : '#6a3f1a');
  R(x - 1, y - 8, 2, 2, '#6a3f1a');
  if (k.state === 'shake' && k.t % 8 < 4) txtOutline('!', k.x - 1, 60, 9, '#fff', '#c33', 'center');
}
function drawDropCleaver(k) { // a meat cleaver on a chain: the chain snaps when you walk under
  if (k.state === 'gone') return;
  const sh = k.state === 'shake' ? Math.round(Math.sin(k.t * 1.4) * 1.5) : 0, x = k.x + sh;
  const y = k.state === 'fall' ? k.y : 46;
  if (k.state !== 'fall') for (let yy = 12; yy < y - 6; yy += 3) R(x - 1 + ((yy / 3) & 1), yy, 2, 2, '#8a8f9a');
  R(x - 6, y - 5, 12, 9, '#c9ced6'); R(x - 6, y + 3, 12, 1, '#fff'); R(x - 5, y - 4, 10, 1, '#e8ecf2'); R(x - 3, y - 1, 2, 2, '#4a4a52');
  R(x - 2, y - 11, 4, 6, '#6a4a2a'); R(x - 2, y - 11, 4, 1, '#8a6a3a');
  if (k.state === 'shake' && k.t % 8 < 4) txtOutline('!', k.x - 1, 62, 9, '#fff', '#c33', 'center');
}
Object.assign(DROP_ART, { vine: drawDropVine, pinecone: drawDropPinecone, cleaver: drawDropCleaver });
Object.assign(DROP_COLORS, { vine: ['#e0302a', '#ff9a8a', '#3aa648'], pinecone: ['#6a3f1a', '#8a5a2a', '#2f6a3a'], cleaver: ['#c9ced6', '#ffffff', '#6a4a2a'] });

// ---------------------------------------------------------------- hazards: spikes, bounce pads, conveyor belts, presses
function drawSpikes(s) { // thorn bushes (garden) and bear traps (woods): deadly, hop over them
  const x = Math.round(s.x), w = s.w, hw = w >> 1;
  if (s.kind === 'thorns') {
    R(x - hw, GROUND - 6, w, 6, '#2f6a2a'); R(x - hw + 1, GROUND - 8, w - 2, 3, '#3a8a3a'); R(x - hw + 3, GROUND - 10, w - 6, 3, '#46b04a');
    for (let i = 0; i < w - 2; i += 4) { R(x - hw + 1 + i, GROUND - 13 - ((i >> 2) % 2), 1, 5, '#e8e8d0'); R(x - hw + 2 + i, GROUND - 11, 1, 2, '#e8e8d0'); }
    for (let i = 0; i < 3; i++) { const rx = x - hw + 4 + i * ((w - 8) / 2 | 0); disc(rx, GROUND - 8, 2, '#d0243a'); R(rx - 1, GROUND - 9, 1, 1, '#ff8090'); }
  } else { // bear trap
    R(x - hw, GROUND - 3, w, 3, '#5a5f6a'); R(x - hw + 2, GROUND - 4, w - 4, 1, '#8a8f9a');
    for (let i = 0; i < w - 2; i += 3) { R(x - hw + 1 + i, GROUND - 9 + ((i / 3) & 1), 2, 6, '#c9ced6'); R(x - hw + 1 + i, GROUND - 10 + ((i / 3) & 1), 1, 1, '#fff'); }
    R(x - hw, GROUND - 6, 2, 3, '#8a8f9a'); R(x + hw - 2, GROUND - 6, 2, 3, '#8a8f9a'); R(x - 1, GROUND - 5, 3, 2, '#c03030');
  }
}
function drawSpring(sp) { // a bouncy mushroom: land on top of it to launch
  const x = Math.round(sp.x), sq = sp.sq > 0 ? Math.round(Math.sin(sp.sq * 0.7) * 3) : 0;
  R(x - 3, GROUND - 6, 6, 6, '#f4e8d0'); R(x - 3, GROUND - 6, 1, 6, '#d8c8a8');
  for (let i = 0; i < 6; i++) { const half = Math.round(11 * Math.sqrt(1 - Math.pow(1 - (i + 0.5) / 6, 2))); R(x - half, GROUND - 12 + sq + i, half * 2, 1, '#8a1a30'); R(x - half + 1, GROUND - 12 + sq + i, half * 2 - 2, 1, '#e0405a'); }
  R(x - 6, GROUND - 10 + sq, 3, 2, '#fff'); R(x + 2, GROUND - 11 + sq, 3, 2, '#fff'); R(x - 1, GROUND - 8 + sq, 2, 1, '#fff'); R(x - 9, GROUND - 7 + sq, 2, 1, '#ff9aa8');
}
function drawBelt(b) { // a conveyor belt: chevrons march along it and push Cab
  const x0 = Math.round(b.x0), w = Math.round(b.x1 - b.x0), dir = b.dir;
  R(x0, GROUND, w, 6, '#2a2e36'); R(x0, GROUND, w, 1, '#6a7280'); R(x0, GROUND + 5, w, 1, '#14161a');
  const off = (((frame * 0.8 * dir) % 12) + 12) % 12;
  const chev = dir > 0 ? [[0, 1], [1, 2], [2, 3], [1, 4], [0, 5]] : [[2, 1], [1, 2], [0, 3], [1, 4], [2, 5]];
  for (let x = x0 - 12 + off; x < x0 + w; x += 12) for (const [cx, cy] of chev) { const px = Math.round(x + cx * 1.5); if (px >= x0 + 5 && px < x0 + w - 5) R(px, GROUND + cy - 1, 2, 1, '#ffd23a'); }
  for (const rx of [x0 + 3, x0 + w - 3]) { disc(rx, GROUND + 3, 3, '#6a7280'); disc(rx, GROUND + 3, 1, '#14161a'); }
}
function drawGeyserPress(g) { // a sandwich press: rises, shakes, then slams down on a timer
  const t = (frame + g.phase * 240) % 240, x = Math.round(g.x);
  let bottom;
  if (t < 110) bottom = GROUND - 76; else if (t < 160) bottom = GROUND - 76 + Math.round((t - 110) / 50 * 8) + (t % 4 < 2 ? 1 : -1);
  else if (t < 166) bottom = GROUND - 68 + Math.round((t - 160) / 6 * 68); else if (t < 220) bottom = GROUND; else bottom = GROUND - Math.round((t - 220) / 20 * 76);
  R(x - 2, 0, 4, bottom - 22, '#6a7280'); R(x - 1, 0, 1, bottom - 22, '#a8b0bc');
  R(x - 14, bottom - 22, 28, 22, '#4a525e'); R(x - 14, bottom - 22, 28, 3, '#8a94a2'); R(x - 14, bottom - 3, 28, 3, '#2a2e36');
  for (let i = 0; i < 4; i++) R(x - 11 + i * 7, bottom - 16, 4, 8, '#ffd23a'); // hazard stripes
  for (let i = 0; i < 3; i++) R(x - 9 + i * 8, bottom - 14, 3, 8, '#1d1018');
  if (t >= 110 && t < 160 && frame % 8 < 4) { R(x - 1, bottom - 30, 3, 3, '#e03030'); txtOutline('!', x, GROUND - 40, 9, '#fff', '#c33', 'center'); }
  R(x - 14, GROUND - 1, 28, 1, 'rgba(0,0,0,.25)');
}
function drawGeyser(g) { if ((LV.kinds.geyser || 'gravy') === 'press') drawGeyserPress(g); else drawGeyserGravy(g); }

// ---------------------------------------------------------------- theme: Tomato Garden (a sunny farm)
function gardenSky() {
  const bands = ['#6ec6ff', '#86d0ff', '#a0daff', '#bde6ff', '#d8f2ff', '#eefaff'];
  const bh = Math.ceil(GROUND / bands.length);
  for (let i = 0; i < bands.length; i++) R(0, i * bh, W, bh + 1, bands[i]);
  disc(52, 34, 15, '#fff4b0'); disc(52, 34, 11, '#ffe45e'); disc(52, 34, 8, '#fff08a');
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 190 + frame * 0.06 - camX * 0.08) % 760 + 760) % 760 - 80, cy = 14 + (i * 23) % 50;
    disc(cx, cy, 6, '#fff'); disc(cx + 9, cy + 2, 7, '#fff'); disc(cx + 19, cy + 3, 5, '#fff'); R(cx - 6, cy + 3, 30, 5, '#fff');
  }
}
function gardenFar() { // crop-row hills, a red barn with a silo, a spinning windmill
  for (let x = 0; x < W; x += 2) { const wx = x + camX * 0.15; const h = 40 + Math.sin(wx * 0.02) * 12 + Math.sin(wx * 0.045 + 1) * 6; R(x, GROUND - h, 2, h, '#a8dc78'); }
  for (let x = 0; x < W; x += 2) { const wx = x + camX * 0.3; const h = 24 + Math.sin(wx * 0.03 + 2) * 9; R(x, GROUND - h, 2, h, '#86c85a'); if (((x + Math.floor(camX * 0.3)) / 2) % 6 < 1) R(x, GROUND - h, 1, h, '#6aaf45'); }
  for (let k = -1; k < 3; k++) { // barns (parallax .3)
    const bx = Math.round(k * 520 + 160 - camX * 0.3 + ((Math.floor((camX * 0.3 + 520) / 520) - 1) * 520));
    if (bx < -80 || bx > W + 10) continue;
    const by = GROUND - 22;
    R(bx, by - 26, 48, 26, '#b8352e'); R(bx - 3, by - 32, 54, 7, '#6a2420'); R(bx + 6, by - 38, 36, 7, '#6a2420'); R(bx + 14, by - 12, 20, 12, '#8a2620');
    R(bx + 14, by - 12, 20, 1, '#fff'); R(bx + 14, by - 1, 20, 1, '#fff'); R(bx + 14, by - 12, 1, 12, '#fff'); R(bx + 33, by - 12, 1, 12, '#fff'); for (let i = 0; i < 12; i++) { R(bx + 15 + i * 1.5, by - 12 + i, 1, 1, '#fff'); R(bx + 32 - i * 1.5, by - 12 + i, 1, 1, '#fff'); }
    R(bx + 52, by - 40, 10, 40, '#d8d8e0'); R(bx + 52, by - 40, 3, 40, '#f0f0f6'); disc(bx + 57, by - 41, 5, '#a8a8b8');
  }
  for (let k = -1; k < 3; k++) { // windmill
    const wx = Math.round(k * 700 + 420 - camX * 0.35 + ((Math.floor((camX * 0.35 + 700) / 700) - 1) * 700)), wy = GROUND - 62;
    if (wx < -50 || wx > W + 50) continue;
    for (let i = 0; i < 40; i++) R(wx - 4 + (i >> 4), wy + 22 + i, 8 - (i >> 3), 1, '#e8e0d0');
    for (let b = 0; b < 4; b++) { const a = frame * 0.03 + b * PI / 2; for (let t = 3; t < 22; t += 2) R(wx + Math.cos(a) * t - 1, wy + 20 + Math.sin(a) * t - 1, 3, 3, b % 2 ? '#fff' : '#d8c8a8'); }
    disc(wx, wy + 20, 3, '#8a6a4a');
  }
}
function gardenGround(a, b) {
  const x0 = Math.max(a, Math.floor(camX) - 4), x1 = Math.min(b, Math.floor(camX) + W + 4);
  if (x1 <= x0) return;
  R(x0, GROUND, x1 - x0, 30, '#7a4a2a'); R(x0, GROUND + 4, x1 - x0, 26, '#6a3e22');
  for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) for (let r = 0; r < 4; r++) { const hv = hash(x, r + 11); if (hv < 0.4) R(x + hv * 8, GROUND + 8 + r * 6, 2, 1, hv < 0.15 ? '#9a6a40' : '#4a2a14'); }
  for (let y = GROUND + 9; y < GROUND + 30; y += 7) R(x0, y, x1 - x0, 1, '#5a3418'); // furrows
  R(x0, GROUND - 1, x1 - x0, 5, '#52b448'); R(x0, GROUND - 1, x1 - x0, 1, '#7ad26a'); R(x0, GROUND + 3, x1 - x0, 2, '#2f8f3a');
  for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) { const hv = hash(x, 77); R(x, GROUND + 5, 2, 2 + (hv * 3 | 0), '#2f8f3a'); if (hv > 0.7) R(x, GROUND - 3, 1, 2, '#7ad26a'); }
  if (a >= Math.floor(camX) - 4) R(a, GROUND, 2, 30, '#4a2a14');
  if (b <= Math.floor(camX) + W + 4) R(b - 2, GROUND, 2, 30, '#4a2a14');
}
function gardenPit(a, b) { // an irrigation ditch
  R(a, GROUND, b - a, 40, '#2a5a8a');
  for (let x = a; x < b; x += 4) { const wy = GROUND + 2 + Math.round(Math.sin(x * 0.4 + frame * 0.12) * 1.3); R(x, wy, Math.min(4, b - x), 3, '#4a90c8'); R(x, wy, Math.min(4, b - x), 1, '#9ad0f0'); }
  for (let x = a + 6; x < b; x += 14) { const by = GROUND + 10 + ((frame * 0.4 + x) % 14); R(x, by, 2, 2, '#7ab8e0'); }
  R(a, GROUND + 20, b - a, 20, '#1f4870');
}
function gardenPlat(p) { // wooden planks nailed to stakes
  const [x, y, w] = p;
  R(x, y, w, 6, '#d8b070'); R(x, y, w, 1, '#f0cc8a'); R(x, y + 5, w, 1, '#9a7840'); R(x, y + 2, w, 1, '#c09858');
  for (const nx of [x + 3, x + w - 4]) { R(nx, y + 2, 1, 1, '#4a4a52'); }
  for (const sx of [x + 6, x + w - 9]) { R(sx, y + 6, 3, 5, '#9a7840'); }
  for (let i = 4; i < w - 4; i += 13) { R(x + i, y - 1, 3, 1, '#3aa648'); R(x + i + 1, y - 2, 1, 1, '#46b04a'); }
}
function gardenDecor(d) {
  const x = d.x;
  if (d.kind === 'tomatoplant') { R(x, GROUND - 40, 2, 40, '#c8a870'); for (let i = 0; i < 4; i++) { const ty = GROUND - 8 - i * 9, s = i % 2 ? 1 : -1; disc(x + 1 + s * 6, ty, 3, '#3aa648'); disc(x + 1 - s * 4, ty - 4, 3, '#46b04a'); if (i < 3) { disc(x + 1 + s * 7, ty + 3, 4, '#e0302a'); R(x + s * 7, ty + 1, 2, 1, '#ff9a8a'); } } disc(x + 1, GROUND - 41, 4, '#3aa648'); }
  else if (d.kind === 'sunflower') { R(x, GROUND - 38, 2, 38, '#3a8a3a'); R(x - 5, GROUND - 22, 5, 2, '#46b04a'); R(x + 2, GROUND - 16, 5, 2, '#46b04a'); disc(x + 1, GROUND - 42, 8, '#ffc820'); disc(x + 1, GROUND - 42, 5, '#6a3f1a'); R(x - 1, GROUND - 44, 1, 1, '#a8743a'); }
  else if (d.kind === 'scarecrow') { R(x, GROUND - 34, 2, 34, '#8a6a3a'); R(x - 11, GROUND - 28, 24, 2, '#8a6a3a'); R(x - 5, GROUND - 28, 12, 12, '#3b6fd9'); R(x - 5, GROUND - 24, 12, 2, '#e0302a'); disc(x + 1, GROUND - 36, 5, '#f0d090'); R(x - 6, GROUND - 42, 14, 2, '#6a3f1a'); R(x - 3, GROUND - 47, 8, 5, '#6a3f1a'); R(x - 1, GROUND - 37, 1, 1, '#1d1018'); R(x + 2, GROUND - 37, 1, 1, '#1d1018'); R(x - 11, GROUND - 31, 3, 3, '#e8c870'); R(x + 11, GROUND - 31, 3, 3, '#e8c870'); }
  else if (d.kind === 'fence') { for (let i = 0; i < 4; i++) { R(x + i * 7, GROUND - 14, 4, 14, '#f4f0e4'); R(x + i * 7, GROUND - 14, 4, 2, '#fff'); } R(x, GROUND - 10, 25, 2, '#e0dccc'); R(x, GROUND - 4, 25, 2, '#e0dccc'); }
  else if (d.kind === 'cabbage') { disc(x, GROUND - 6, 7, '#5ab84a'); disc(x - 2, GROUND - 7, 5, '#78d068'); disc(x + 3, GROUND - 5, 4, '#46a03a'); R(x - 3, GROUND - 8, 5, 1, '#b8f0a8'); }
  else if (d.kind === 'bucket') { R(x - 6, GROUND - 12, 12, 12, '#9aa0aa'); R(x - 6, GROUND - 12, 12, 2, '#c8ced6'); R(x - 5, GROUND - 4, 10, 1, '#6a7280'); R(x - 6, GROUND - 16, 1, 5, '#6a7280'); R(x + 5, GROUND - 16, 1, 5, '#6a7280'); R(x - 6, GROUND - 17, 12, 1, '#6a7280'); disc(x - 2, GROUND - 11, 2, '#e0302a'); disc(x + 2, GROUND - 11, 2, '#e0302a'); }
}

// ---------------------------------------------------------------- theme: Cacciatore Woods (an autumn hunting forest)
function woodsSky() {
  const bands = ['#ffc888', '#ffd49a', '#ffdfae', '#ffe9c4', '#fff1d8', '#fff8ea'];
  const bh = Math.ceil(GROUND / bands.length);
  for (let i = 0; i < bands.length; i++) R(0, i * bh, W, bh + 1, bands[i]);
  disc(250, 44, 20, '#ffb060'); disc(250, 44, 15, '#ffd080'); disc(250, 44, 10, '#fff0b0');
  for (let i = 0; i < 5; i++) { const a = -0.25 + i * 0.22; for (let t = 24; t < 110; t += 3) R(250 - Math.cos(a) * t, 44 + Math.sin(a + 0.35) * t, 2, 1, 'rgba(255,240,190,.35)'); }
}
function woodsFar() { // layers of autumn trees
  for (let x = 0; x < W; x += 2) { const wx = x + camX * 0.12; const h = 46 + Math.sin(wx * 0.017) * 14 + Math.sin(wx * 0.05 + 1) * 6; R(x, GROUND - h, 2, h, '#d8b088'); }
  for (let i = -1; i < 10; i++) { // far pines
    const px = Math.round(i * 60 - (camX * 0.25 % 60) + 16), th = 36 + hash(i + Math.floor(camX * 0.25 / 60), 4) * 22 | 0;
    for (let r = 0; r < 5; r++) R(px - 8 + r * 2, GROUND - th + r * 8, 16 - r * 4, 9, '#5a7a4a');
    R(px - 1, GROUND - th + 36, 3, 10, '#6a4a2a');
  }
  for (let i = -1; i < 7; i++) { // near maples in fall colours
    const px = Math.round(i * 96 - (camX * 0.45 % 96) + 30), th = 28 + hash(i + Math.floor(camX * 0.45 / 96), 6) * 14 | 0, c = ['#d8601e', '#e8902a', '#c83a1e'][(i + Math.floor(camX * 0.45 / 96) + 30) % 3 | 0] || '#d8601e';
    R(px, GROUND - th, 4, th, '#6a4a2a'); disc(px + 2, GROUND - th - 4, 12, c); disc(px - 8, GROUND - th + 4, 8, c); disc(px + 12, GROUND - th + 3, 8, c); disc(px + 2, GROUND - th - 8, 7, '#f0a040');
  }
}
function woodsGround(a, b) {
  const x0 = Math.max(a, Math.floor(camX) - 4), x1 = Math.min(b, Math.floor(camX) + W + 4);
  if (x1 <= x0) return;
  R(x0, GROUND, x1 - x0, 30, '#6a4a2a'); R(x0, GROUND + 5, x1 - x0, 25, '#4a3220');
  for (let x = Math.floor(x0 / 6) * 6; x < x1; x += 6) for (let r = 0; r < 4; r++) { const hv = hash(x, r + 21); if (hv < 0.4) R(x + hv * 8, GROUND + 8 + r * 6, 2, 1, hv < 0.15 ? '#8a6a3a' : '#2a1a10'); }
  R(x0, GROUND - 1, x1 - x0, 5, '#5a7a3a'); R(x0, GROUND - 1, x1 - x0, 1, '#7a9a4a'); R(x0, GROUND + 3, x1 - x0, 2, '#3a5a2a');
  for (let x = Math.floor(x0 / 5) * 5; x < x1; x += 5) { const hv = hash(x, 91); R(x, GROUND - 2, 2, 1, hv < 0.3 ? '#e0701e' : hv < 0.55 ? '#c8301e' : hv < 0.75 ? '#e8b02a' : '#5a7a3a'); if (hv > 0.85) R(x, GROUND - 3, 1, 2, '#e0701e'); }
  if (a >= Math.floor(camX) - 4) R(a, GROUND, 2, 30, '#2a1a10');
  if (b <= Math.floor(camX) + W + 4) R(b - 2, GROUND, 2, 30, '#2a1a10');
}
function woodsPit(a, b) { // a misty ravine
  R(a, GROUND, b - a, 40, '#2a2030'); R(a, GROUND + 10, b - a, 30, '#1a1420');
  for (let x = a + 3; x < b; x += 9) R(x, GROUND, 2, 5 + (hash(x, 9) * 8 | 0), '#4a3a2a');
  for (let i = 0; i < 3; i++) { const mx = a + ((frame * 0.3 + i * 17) % (b - a)); R(mx, GROUND + 4 + i * 5, 8, 2, 'rgba(255,255,255,.18)'); }
}
function woodsPlat(p) { // a log ledge
  const [x, y, w] = p;
  R(x, y, w, 8, '#6a4222'); R(x, y, w, 2, '#8a5a30'); R(x, y + 6, w, 2, '#4a2c14'); disc(x + 2, y + 4, 4, '#8a5a30'); disc(x + 2, y + 4, 2, '#c8a060'); disc(x + w - 2, y + 4, 4, '#8a5a30'); disc(x + w - 2, y + 4, 2, '#c8a060');
  for (let i = 8; i < w - 6; i += 11) R(x + i, y + 3, 5, 1, '#4a2c14');
  for (let i = 3; i < w - 3; i += 5) { const hv = hash(x + i, 5); R(x + i, y - 2, 3, 2, hv > 0.5 ? '#6a9a3a' : '#e0701e'); }
}
function woodsDecor(d) {
  const x = d.x;
  if (d.kind === 'pine') { const h = 50 + hash(d.x, 3) * 22 | 0; R(x - 2, GROUND - 12, 5, 12, '#5a3a1a'); for (let r = 0; r < 6; r++) { const w = 22 - r * 3, y = GROUND - 12 - (h / 6) * r - 6; R(x - w / 2, y - 8, w, 9, r % 2 ? '#2f6a3a' : '#3a7a44'); R(x - w / 2, y - 8, w, 1, '#5a9a5a'); } }
  else if (d.kind === 'oak') { R(x - 3, GROUND - 40, 7, 40, '#5a3a1a'); R(x - 3, GROUND - 40, 2, 40, '#7a5a2a'); const c = ['#d8601e', '#e8902a', '#c83a1e'][(x / 30 | 0) % 3]; disc(x, GROUND - 46, 15, c); disc(x - 12, GROUND - 38, 9, c); disc(x + 12, GROUND - 38, 9, c); disc(x - 3, GROUND - 52, 8, '#f0a040'); }
  else if (d.kind === 'mushrooms') { for (let i = 0; i < 3; i++) { const mx = x - 8 + i * 8, h = 6 + (i % 2) * 4; R(mx - 1, GROUND - h, 3, h, '#f4e8d0'); for (let r = 0; r < 3; r++) R(mx - 4 + r, GROUND - h - 3 + r, 9 - r * 2, 1, i === 1 ? '#c87a3a' : '#c03a2a'); R(mx - 1, GROUND - h - 2, 1, 1, '#fff'); } }
  else if (d.kind === 'stump') { R(x - 8, GROUND - 12, 16, 12, '#6a4222'); R(x - 8, GROUND - 14, 16, 3, '#c8a060'); R(x - 5, GROUND - 13, 10, 1, '#a88040'); R(x - 2, GROUND - 13, 4, 1, '#6a4222'); R(x - 8, GROUND - 3, 3, 3, '#6a4222'); R(x + 5, GROUND - 3, 3, 3, '#6a4222'); }
  else if (d.kind === 'berries') { disc(x, GROUND - 6, 7, '#3a6a2a'); disc(x - 8, GROUND - 4, 5, '#4a7a34'); disc(x + 8, GROUND - 4, 5, '#4a7a34'); for (let i = 0; i < 6; i++) { disc(x - 9 + i * 4, GROUND - 5 - (i % 3) * 3, 2, '#8a1a6a'); R(x - 10 + i * 4, GROUND - 6 - (i % 3) * 3, 1, 1, '#d070c0'); } }
  else if (d.kind === 'logs') { for (let i = 0; i < 3; i++) { R(x - 14 + (i > 1 ? 7 : i * 14) - (i > 1 ? 0 : 0), GROUND - 7 - (i > 1 ? 8 : 0), 14, 7, '#6a4222'); disc(x - 14 + (i > 1 ? 7 : i * 14), GROUND - 4 - (i > 1 ? 8 : 0), 3, '#c8a060'); } }
}

// ---------------------------------------------------------------- theme: Baloney Factory (a steel sandwich factory)
function factorySky() { // the back wall: steel panels, windows, pipes (screen space)
  R(0, 0, W, GROUND, '#5a6676');
  const off = Math.floor(camX * 0.2);
  for (let x = -(off % 40); x < W; x += 40) { R(x, 0, 1, GROUND, '#48525f'); R(x + 1, 0, 1, GROUND, '#6a7686'); }
  for (let y = 12; y < GROUND; y += 30) R(0, y, W, 1, '#48525f');
  for (let i = 0; i < 4; i++) { // windows with a pale sky
    const wx = ((i * 140 - camX * 0.25) % 560 + 560) % 560 - 60;
    R(wx - 2, 22, 44, 30, '#2a323e'); R(wx, 24, 40, 26, '#bfe0f0'); R(wx, 24, 40, 5, '#d8f0fa'); R(wx + 19, 24, 2, 26, '#2a323e'); R(wx, 36, 40, 2, '#2a323e');
  }
}
function factoryFar() { // pipes and tanks (parallax) and a steel-grate catwalk across the top
  for (let x = -(Math.floor(camX * 0.4) % 90); x < W; x += 90) { const i = Math.floor((x + camX * 0.4) / 90), hv = hash(i, 71); R(x + 20, 60, 12, GROUND - 60, '#7a8696'); R(x + 20, 60, 3, GROUND - 60, '#a0acba'); if (hv < 0.5) { R(x + 8, 68, 40, 6, '#7a8696'); R(x + 8, 68, 40, 1, '#a0acba'); } for (let r = 0; r < 3; r++) R(x + 18, 76 + r * 26, 16, 3, '#4a5666'); }
  R(0, 0, W, 8, '#3a4452'); for (let x = -(Math.floor(camX * 0.6) % 14); x < W; x += 14) R(x, 0, 2, 8, '#2a323e'); R(0, 8, W, 2, '#8a94a2');
  for (let x = -(Math.floor(camX * 0.5) % 70); x < W; x += 70) { R(x + 4, 10, 2, 16, '#8a94a2'); for (let y = 12; y < 26; y += 4) R(x + 3 + (y & 4 ? 0 : 1), y, 3, 2, '#6a7686'); } // hanging chains
  R(0, GROUND - 24, W, 24, '#8a94a2'); R(0, GROUND - 26, W, 3, '#ffd23a'); for (let x = -(Math.floor(camX * 0.8) % 16); x < W; x += 16) R(x, GROUND - 26, 8, 3, '#1d1018');
  for (let x = -(Math.floor(camX * 0.8) % 20); x < W; x += 20) R(x, GROUND - 22, 1, 22, '#6a7686');
}
function factoryGround(a, b) {
  const x0 = Math.max(a, Math.floor(camX) - 4), x1 = Math.min(b, Math.floor(camX) + W + 4);
  if (x1 <= x0) return;
  R(x0, GROUND, x1 - x0, 30, '#3a424e'); R(x0, GROUND, x1 - x0, 4, '#8a94a2'); R(x0, GROUND, x1 - x0, 1, '#c8d0da'); R(x0, GROUND + 4, x1 - x0, 1, '#1d222a');
  for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) { R(x, GROUND + 5, 1, 25, '#2a303a'); R(x + 3, GROUND + 1, 2, 2, '#2a303a'); R(x + 8, GROUND + 1, 2, 2, '#2a303a'); }
  for (let y = GROUND + 12; y < GROUND + 30; y += 9) R(x0, y, x1 - x0, 1, '#2a303a');
  for (let x = Math.floor(x0 / 16) * 16; x < x1; x += 16) { R(x + 2, GROUND + 14, 3, 3, '#5a6676'); R(x + 10, GROUND + 22, 3, 3, '#5a6676'); }
  if (a >= Math.floor(camX) - 4) R(a, GROUND, 2, 30, '#14181e');
  if (b <= Math.floor(camX) + W + 4) R(b - 2, GROUND, 2, 30, '#14181e');
}
function factoryPit(a, b) { // a meat grinder: spinning cogs
  R(a, GROUND, b - a, 40, '#14181e');
  for (let x = a + 12; x < b + 6; x += 22) { const cx = Math.min(x, b - 6), cy = GROUND + 16; disc(cx, cy, 9, '#6a7686'); disc(cx, cy, 6, '#8a94a2'); disc(cx, cy, 2, '#2a303a'); for (let i = 0; i < 8; i++) { const ang = frame * 0.12 * (x % 2 ? 1 : -1) + i * PI / 4; R(cx + Math.cos(ang) * 10 - 1, cy + Math.sin(ang) * 10 - 1, 3, 3, '#a8b0bc'); } }
  R(a, GROUND, b - a, 3, '#c03030'); R(a, GROUND, b - a, 1, '#ff6060');
}
function factoryPlat(p) { // a slice of bread
  const [x, y, w] = p;
  R(x, y, w, 8, '#9a6a30'); R(x + 1, y + 1, w - 2, 6, '#f0dca8'); R(x + 1, y + 1, w - 2, 1, '#fff2c8'); R(x, y, 3, 3, '#9a6a30'); R(x + w - 3, y, 3, 3, '#9a6a30'); R(x + 2, y - 2, w - 4, 2, '#b88040'); R(x + 3, y - 1, w - 6, 1, '#d8a060');
  for (let i = 8; i < w - 6; i += 11) { R(x + i, y + 4, 1, 1, '#d8c088'); R(x + i + 4, y + 3, 1, 1, '#d8c088'); }
  R(x + 1, y + 7, w - 2, 1, '#c8a868');
}
function factoryDecor(d) {
  const x = d.x;
  if (d.kind === 'drum') { R(x - 8, GROUND - 20, 16, 20, '#5a6676'); R(x - 8, GROUND - 20, 16, 2, '#8a94a2'); R(x - 8, GROUND - 14, 16, 2, '#3a4452'); R(x - 8, GROUND - 6, 16, 2, '#3a4452'); R(x - 4, GROUND - 13, 8, 5, '#ffd820'); R(x - 3, GROUND - 12, 6, 3, '#d0a000'); }
  else if (d.kind === 'crate') { R(x - 12, GROUND - 14, 24, 14, '#c8a068'); R(x - 12, GROUND - 14, 24, 2, '#e8c088'); R(x - 12, GROUND - 1, 24, 1, '#7a5a30'); R(x - 1, GROUND - 14, 2, 14, '#7a5a30'); for (let i = 0; i < 3; i++) { disc(x - 7 + i * 7, GROUND - 16, 4, '#f0a0a8'); R(x - 9 + i * 7, GROUND - 18, 2, 1, '#ffd8dc'); } }
  else if (d.kind === 'grinder') { R(x - 14, GROUND - 24, 28, 24, '#6a7686'); R(x - 14, GROUND - 24, 28, 3, '#a0acba'); R(x - 10, GROUND - 38, 20, 14, '#8a94a2'); R(x - 12, GROUND - 40, 24, 3, '#a0acba'); R(x - 5, GROUND - 14, 10, 6, '#1d222a'); R(x + 14, GROUND - 14, 8, 3, '#f0a0a8'); R(x + 22, GROUND - 13, 3, 2, '#f0a0a8'); disc(x - 8, GROUND - 18, 2, '#e03030'); }
  else if (d.kind === 'jars') { for (let i = 0; i < 3; i++) { const jx = x - 12 + i * 10; R(jx, GROUND - 18, 8, 18, '#a8d8c0'); R(jx, GROUND - 18, 8, 3, '#3a4452'); R(jx + 1, GROUND - 14, 2, 10, '#d8f0e0'); R(jx + 3, GROUND - 12, 3, 8, '#6aa83a'); } }
  else if (d.kind === 'pipe') { R(x - 3, GROUND - 46, 6, 46, '#8a94a2'); R(x - 3, GROUND - 46, 2, 46, '#c8d0da'); R(x - 5, GROUND - 30, 10, 3, '#5a6676'); R(x - 5, GROUND - 14, 10, 3, '#5a6676'); R(x + 3, GROUND - 40, 14, 5, '#8a94a2'); R(x + 3, GROUND - 40, 14, 1, '#c8d0da'); R(x + 14, GROUND - 42, 4, 9, '#5a6676'); }
}

// ---------------------------------------------------------------- register the themes
Object.assign(THEMES, {
  garden: { sky: gardenSky, far: gardenFar, ground: gardenGround, pit: gardenPit, plat: gardenPlat, decor: gardenDecor, wallBg: '#52b448',
    kinds: [['tomatoplant', 0.3], ['sunflower', 0.5], ['scarecrow', 0.58], ['fence', 0.75], ['cabbage', 0.9], ['bucket', 1]] },
  woods: { sky: woodsSky, far: woodsFar, ground: woodsGround, pit: woodsPit, plat: woodsPlat, decor: woodsDecor, wallBg: '#5a7a3a',
    kinds: [['pine', 0.3], ['oak', 0.5], ['mushrooms', 0.68], ['stump', 0.8], ['berries', 0.92], ['logs', 1]] },
  factory: { sky: factorySky, far: factoryFar, ground: factoryGround, pit: factoryPit, plat: factoryPlat, decor: factoryDecor, wallBg: '#3a4452',
    kinds: [['drum', 0.25], ['crate', 0.5], ['grinder', 0.62], ['jars', 0.82], ['pipe', 1]] },
});
