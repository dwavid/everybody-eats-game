'use strict';
// Chiptune big-band swing, inspired by Cab Calloway's "Everybody Eats When They Come to My House" (the title and level 1 use its
// chord changes and swing tempo; no melody or arrangement from the song is used). Loaded before game.js; uses the audio context (`ac`, `muted`) that game.js creates.
//
// How it works: every track is a chord chart (12-bar blues or 16-bar changes). From the chart we build, once and
// deterministically (seeded), a walking bass, brass-style chord stabs, drums and a bebop-ish melody that sticks to the
// chord tones and scale of each chord. A bar has 12 ticks (4 beats of triplets), and swung eighths sit on ticks 0 and 2
// of each beat, so they come out long-short. Notes are scheduled slightly ahead on the audio clock, so timing stays
// steady even when the frame rate wobbles. All sounds are synthesized: pulse waves for lead and brass, triangle bass,
// and noise/sine drums. To change a track: edit its entry in `TRACK_DEFS` (tempo, chords, seed, comping style).

const MUSIC_GAIN = 1.3; // overall music loudness (sound effects sit on top of it)
const MUSIC_VOL = Object.fromEntries(Object.entries({ lead: 0.042, sparkle: 0.012, brass: 0.02, chops: 0.012, bass: 0.1, ride: 0.034, hat: 0.04, kick: 0.15, snare: 0.06 }).map(([k, v]) => [k, v * MUSIC_GAIN]));
const TICKS_PER_BAR = 12; // 4 beats x 3 (triplet grid)

// ---------------------------------------------------------------- chords and scales
const PITCH = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const ION = [0, 2, 4, 5, 7, 9, 11], MIX = [0, 2, 4, 5, 7, 9, 10], DOR = [0, 2, 3, 5, 7, 9, 10], LOC = [0, 1, 3, 5, 6, 8, 10], DIM = [0, 2, 3, 5, 6, 8, 9, 11];
const QUALITY = {
  '6': { iv: [0, 4, 7, 9], scale: ION }, maj7: { iv: [0, 4, 7, 11], scale: ION }, '7': { iv: [0, 4, 7, 10], scale: MIX },
  '9': { iv: [0, 4, 7, 10], scale: MIX }, '13': { iv: [0, 4, 7, 10], scale: MIX }, '13b5': { iv: [0, 4, 6, 10], scale: [0, 2, 4, 6, 8, 10] },
  m7: { iv: [0, 3, 7, 10], scale: DOR }, m6: { iv: [0, 3, 7, 9], scale: DOR }, m7b5: { iv: [0, 3, 6, 10], scale: LOC }, dim7: { iv: [0, 3, 6, 9], scale: DIM },
};
function parseChord(tok) {
  const m = tok.match(/^([A-G])([b#]?)(.*)$/);
  if (!m || !QUALITY[m[3]]) throw new Error('bad chord ' + tok);
  return { r: (PITCH[m[1]] + (m[2] === 'b' ? -1 : m[2] === '#' ? 1 : 0) + 12) % 12, q: m[3], name: tok };
}
function parseProg(str) { // 'C6 | A7 | Dm7 G7' -> one entry per bar: [first-half chord, second-half chord]
  return str.split('|').map((b) => { const t = b.trim().split(/\s+/).map(parseChord); return t.length === 1 ? [t[0], t[0]] : t; });
}
const foldInto = (n, lo, hi) => { while (n < lo) n += 12; while (n > hi) n -= 12; return n; };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function mulberry32(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- track definitions
// bpm, chords, seed, comp (comping style), drums, lead range, blues (adds blue notes), density (how busy the melody is)
const TRACK_DEFS = {
  // Level 1: the chord changes of "Everybody Eats When They Come to My House" (Cab Calloway), moved to F. Chords and tempo only;
  // the melody and arrangement are original.
  grove: { bpm: 152, seed: 19, comp: 'chops', drums: 'swing', lo: 67, hi: 86, density: 0.8,
    prog: 'F6 Fdim7 | Gm7 C13b5 | Gm7 | Db9 C9 | Db9 C9 | F6 Fdim7 | Gm7 C13b5 | F6 | F6 Fdim7 | Gm7 C13b5 | Gm7 | Db9 C9 | Db9 C9 | F6 D7 | Gm7 C7 | F6 C7' },
  deli: { bpm: 138, seed: 23, comp: 'charleston', drums: 'swing', lo: 65, hi: 84, density: 0.75, blues: true,
    prog: 'F7 | Bb7 | F7 | Cm7 F7 | Bb7 | Bdim7 | F7 | Am7 D7 | Gm7 | C7 | F7 D7 | Gm7 C7' },
  bayou: { bpm: 112, seed: 37, comp: 'sparse', drums: 'brush', lo: 63, hi: 82, density: 0.6, blues: true,
    prog: 'Bb7 | Eb7 | Bb7 | Bb7 | Eb7 | Edim7 | Bb7 | D7 | Gm7 | C7 | Bb7 G7 | Cm7 F7' },
  garden: { bpm: 164, seed: 41, comp: 'chops', drums: 'swing', lo: 67, hi: 88, density: 0.85,
    prog: 'G6 | Em7 | Am7 | D7 | G6 | Em7 | Am7 D7 | G6 | Gm7 | C7 | Fmaj7 | Bb7 | Am7 | D7 | G6 Em7 | Am7 D7' },
  woods: { bpm: 132, seed: 53, comp: 'sparse', drums: 'brush', lo: 64, hi: 83, density: 0.65,
    prog: 'Am6 | Bm7b5 E7 | Am6 | Bm7b5 E7 | Dm7 | G7 | Cmaj7 | Bm7b5 E7 | Am6 | F7 | Bm7b5 | E7 | Am6 Dm7 | Bm7b5 E7 | Am6 | E7' },
  factory: { bpm: 172, seed: 67, comp: 'shout', drums: 'drive', lo: 65, hi: 85, density: 0.85, blues: true,
    prog: 'C7 | F7 | C7 | C7 | F7 | F7 | C7 | A7 | D7 | G7 | C7 F7 | C7 G7' },
  bossA: { bpm: 180, seed: 71, comp: 'shout', drums: 'drive', lo: 65, hi: 86, density: 0.9, blues: true,
    prog: 'Dm6 | Dm6 | Gm7 | A7 | Dm6 | Bb7 | Em7b5 A7 | Dm6 A7 | Dm6 | Dm6 | Gm7 | A7 | Bb7 | Gm7 | Em7b5 A7 | Dm6 A7' },
  bossB: { bpm: 172, seed: 83, comp: 'shout', drums: 'drive', lo: 64, hi: 84, density: 0.9, blues: true,
    prog: 'Cm7 | Fm7 | Dm7b5 G7 | Cm7 | Cm7 | Fm7 | Dm7b5 G7 | Cm7 G7 | Cm7 | Fm7 | Dm7b5 G7 | Cm7 | Fm7 | Dm7b5 G7 | Cm7 Fm7 | Dm7b5 G7' },
  bossC: { bpm: 188, seed: 97, comp: 'shout', drums: 'drive', lo: 64, hi: 85, density: 0.95, blues: true,
    prog: 'Em7 | Em7 | Am7 | B7 | Em7 | C7 | Am7 B7 | Em7 B7 | Em7 | Em7 | Am7 | B7 | C7 | Am7 | Em7 C7 | B7' },
  // The title / cutscene theme: the same changes in the original key of C, at the song's swing tempo of 156.
  home: { bpm: 156, seed: 5, comp: 'charleston', drums: 'swing', lo: 67, hi: 86, density: 0.75,
    prog: 'C6 Cdim7 | Dm7 G13b5 | Dm7 | Ab9 G9 | Ab9 G9 | C6 Cdim7 | Dm7 G13b5 | C6 | C6 Cdim7 | Dm7 G13b5 | Dm7 | Ab9 G9 | Ab9 G9 | C6 A7 | Dm7 G7 | C6 G7' },
};

// ---------------------------------------------------------------- building a track from its chart
// rhythm patterns for one bar: [startTick, lengthInTicks]. Swung eighths are (long 2, short 1) on each beat.
const PAT_RUN = [[0, 2], [2, 1], [3, 2], [5, 1], [6, 2], [8, 1], [9, 3]];
const PAT_SYNC = [[0, 3], [3, 2], [5, 1], [6, 3], [9, 2], [11, 1]];
const PAT_TRIPLET = [[0, 1], [1, 1], [2, 1], [3, 3], [6, 1], [7, 1], [8, 1], [9, 3]];
const PAT_LONG = [[0, 6], [6, 3], [9, 3]];
const PAT_SKIP = [[0, 3], [3, 2], [5, 1], [6, 2], [8, 1], [9, 3]];
const COMP = {
  charleston: [[0, 2], [5, 1]], chops: [[0, 1], [3, 1], [6, 1], [9, 1]], shout: [[0, 2], [5, 1], [6, 2], [11, 1]], sparse: [[0, 3], [6, 3]],
};
function chordAt(bar, tick) { return tick < 6 ? bar[0] : bar[1]; }

function buildTrack(name) {
  const def = TRACK_DEFS[name], rng = mulberry32(def.seed), prog = parseProg(def.prog), nBars = prog.length;
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const track = { name, def, nBars, tickSec: 60 / def.bpm / 3, bars: [] };
  const motif = {};
  let cur = Math.round((def.lo + def.hi) / 2), dirn = 1;

  const scalePitches = (c) => { const pcs = QUALITY[c.q].scale.map((i) => (c.r + i) % 12), out = []; for (let m = def.lo; m <= def.hi; m++) if (pcs.includes(m % 12)) out.push(m); return out; };
  const chordTones = (c) => { const pcs = QUALITY[c.q].iv.map((i) => (c.r + i) % 12), out = []; for (let m = def.lo; m <= def.hi; m++) if (pcs.includes(m % 12)) out.push(m); return out; };
  const nearest = (list, v, spread) => { const s = list.slice().sort((a, b) => Math.abs(a - v) - Math.abs(b - v)); return s[Math.min(s.length - 1, Math.floor(rng() * rng() * (spread || 3)))]; };

  for (let b = 0; b < nBars; b++) {
    const bar = prog[b], next = prog[(b + 1) % nBars];
    const out = { chords: bar, melody: [], bass: [], comp: [], drums: [] };
    // ---- walking bass: root, chord tone, chord tone (or the next root), then a chromatic approach to the next bar
    const lowRoot = (c) => foldInto(36 + c.r, 35, 46), tone = (c, k) => foldInto(c.r + QUALITY[c.q].iv[k] + 24, 35, 50);
    const approach = lowRoot(next[0]) + (rng() < 0.55 ? -1 : 1);
    const same = bar[0] === bar[1];
    out.bass = same
      ? [lowRoot(bar[0]), tone(bar[0], pick([1, 2, 1])), tone(bar[0], pick([2, 3, 2])), approach]
      : [lowRoot(bar[0]), tone(bar[0], pick([1, 2])), lowRoot(bar[1]), rng() < 0.5 ? approach : tone(bar[1], 2)];
    // ---- brass / guitar comping: voiced 3rd, 7th and 5th (or 9th) close together
    for (const [t, d] of COMP[def.comp]) {
      const c = chordAt(bar, t), iv = QUALITY[c.q].iv;
      out.comp.push({ t, d, notes: [iv[1], iv[3], (iv[2] + 12 * (rng() < 0.4 ? 1 : 0)) % 24].map((i) => foldInto(c.r + i + 60, 55, 70)) });
    }
    // ---- drums
    const d = def.drums;
    const hit = (t, k, v) => out.drums.push({ t, k, v });
    if (d !== 'brush') hit(0, 'kick', 0.55); if (d === 'drive') hit(6, 'kick', 0.7); else if (d === 'swing') hit(6, 'kick', 0.3);
    for (const t of [0, 3, 6, 9]) hit(t, 'ride', t === 0 || t === 6 ? 1 : 0.85);
    hit(5, 'ride', 0.55); hit(11, 'ride', 0.55);
    hit(3, 'hat', d === 'brush' ? 0.5 : 0.9); hit(9, 'hat', d === 'brush' ? 0.5 : 0.9);
    if (d === 'drive') { hit(3, 'snare', 0.9); hit(9, 'snare', 0.9); } else if (d === 'swing' && rng() < 0.3) hit(pick([8, 11]), 'snare', 0.35);
    if (b % 4 === 3 && d !== 'brush') { hit(9, 'snare', 0.8); hit(10, 'snare', 0.55); hit(11, 'snare', 0.9); } // fill at the end of each phrase
    // ---- melody
    const phraseEnd = b % 4 === 3;
    let pat = (b >= 4 && motif[b - 4] && rng() < 0.65) ? motif[b - 4] : phraseEnd ? PAT_LONG : pick([PAT_RUN, PAT_RUN, PAT_SYNC, PAT_TRIPLET, PAT_SKIP]);
    if (rng() > def.density && !phraseEnd) pat = pick([PAT_LONG, PAT_SYNC]);
    motif[b] = pat;
    const evs = pat.map(([t, dur]) => ({ t, dur, midi: null }));
    const strong = (e, i) => (e.t % 3 === 0 && e.dur >= 2) || i === 0 || i === evs.length - 1;
    evs.forEach((e, i) => { // pass 1: strong notes land on chord tones near the current pitch
      if (!strong(e, i)) return;
      const c = chordAt(bar, e.t), tones = chordTones(c);
      const movers = tones.filter((m) => m !== cur); // prefer a different note than the one we're on, so lines keep moving
      let target = nearest(movers.length && rng() < 0.85 ? movers : tones, cur + dirn * 2, 3);
      if (i === evs.length - 1 && phraseEnd) target = nearest(tones.filter((m) => [QUALITY[c.q].iv[1], QUALITY[c.q].iv[3]].map((x) => (c.r + x) % 12).includes(m % 12)), cur, 2); // end phrases on the 3rd or 7th
      dirn = target >= cur ? 1 : -1; cur = target; e.midi = target;
    });
    evs.forEach((e, i) => { // pass 2: the notes in between walk toward the next strong note (sometimes from a half step away)
      if (e.midi !== null) return;
      const nextStrong = evs.slice(i + 1).find((x) => x.midi !== null), goal = nextStrong ? nextStrong.midi : cur;
      const c = chordAt(bar, e.t), sc = scalePitches(c);
      if (e.dur === 1 && nextStrong && evs[i + 1] === nextStrong && rng() < 0.3) { e.midi = goal + (rng() < 0.65 ? -1 : 1); }
      else {
        const idx = sc.reduce((bi, m, k) => (Math.abs(m - cur) < Math.abs(sc[bi] - cur) ? k : bi), 0);
        let step = goal > cur ? 1 : goal < cur ? -1 : (rng() < 0.5 ? -1 : 1);
        if (rng() < 0.22) step = -step;
        e.midi = sc[Math.max(0, Math.min(sc.length - 1, idx + step))];
        if (def.blues && c.q === '7' && rng() < 0.12) { // a blue note (flat 3rd or flat 5th), in the octave nearest to where the line is
          const pc = (c.r + (rng() < 0.5 ? 3 : 6)) % 12;
          e.midi = foldInto(pc + 60, cur - 6, cur + 5);
        }
      }
      cur = e.midi;
    });
    for (const e of evs) { if (e.dur === 1 && e.midi !== null && rng() < 0.12) continue; out.melody.push({ t: e.t, d: e.dur, midi: foldInto(e.midi, def.lo - 2, def.hi + 2), v: 0.8 + rng() * 0.3 }); }
    track.bars.push(out);
  }
  return track;
}

// ---------------------------------------------------------------- voices (all synthesized)
const pulseWaves = {};
function pulseWave(duty) { // a pulse wave with the given duty cycle (0.5 = square, 0.25 = nasal brass-like)
  if (!pulseWaves[duty]) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) { re[k] = (2 / (k * Math.PI)) * Math.sin(2 * Math.PI * k * duty); im[k] = (2 / (k * Math.PI)) * (1 - Math.cos(2 * Math.PI * k * duty)); }
    pulseWaves[duty] = ac.createPeriodicWave(re, im);
  }
  return pulseWaves[duty];
}
let noiseBuf = null;
function noiseSource(t, dur) {
  if (!noiseBuf) { noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.start(t, Math.random() * 0.5, dur + 0.02); return s;
}
function envGain(t, vol, atk, dur, sus, rel) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + atk);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * sus), t + Math.max(atk + 0.005, dur)); g.gain.linearRampToValueAtTime(0, t + dur + rel);
  return g;
}
function note(t, midi, dur, wave, vol, o) { // one pitched note: wave is 'triangle' or a pulse duty cycle
  o = o || {};
  const rel = o.rel || 0.03, osc = ac.createOscillator(), g = envGain(t, vol, o.atk || 0.004, dur, o.sus === undefined ? 0.55 : o.sus, rel), f = mtof(midi);
  if (typeof wave === 'number') osc.setPeriodicWave(pulseWave(wave)); else osc.type = wave;
  if (o.bend) { osc.frequency.setValueAtTime(f * Math.pow(2, -o.bend / 12), t); osc.frequency.exponentialRampToValueAtTime(f, t + 0.035); } // scoop up into the note
  else osc.frequency.setValueAtTime(f, t);
  if (o.vib && dur > 0.22) { // a little delayed vibrato on long notes, like a sax
    const lfo = ac.createOscillator(), lg = ac.createGain();
    lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.007, t + dur * 0.6);
    lfo.connect(lg); lg.connect(osc.frequency); lfo.start(t); lfo.stop(t + dur + rel + 0.05);
  }
  osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + rel + 0.03);
}
function drum(kind, t, v) {
  const V = MUSIC_VOL;
  if (kind === 'kick') {
    const o = ac.createOscillator(), g = envGain(t, V.kick * v, 0.002, 0.11, 0.05, 0.03);
    o.type = 'sine'; o.frequency.setValueAtTime(135, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.09); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.18);
  } else {
    const dur = kind === 'snare' ? 0.11 : kind === 'ride' ? 0.1 : 0.045;
    const n = noiseSource(t, dur), f = ac.createBiquadFilter(), g = envGain(t, V[kind] * v, 0.001, dur, 0.05, 0.02);
    f.type = kind === 'snare' ? 'bandpass' : 'highpass'; f.frequency.value = kind === 'snare' ? 2000 : kind === 'ride' ? 6500 : 8500; if (kind === 'snare') f.Q.value = 0.7;
    n.connect(f); f.connect(g); g.connect(master);
    if (kind === 'snare') { const o = ac.createOscillator(), og = envGain(t, V.snare * v * 0.6, 0.001, 0.05, 0.05, 0.02); o.type = 'triangle'; o.frequency.setValueAtTime(190, t); o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.08); }
  }
}

// ---------------------------------------------------------------- playing a track
function scheduleTick(tr, idx, t) {
  const bar = tr.bars[Math.floor(idx / TICKS_PER_BAR) % tr.nBars], tk = idx % TICKS_PER_BAR, ts = tr.tickSec, V = MUSIC_VOL;
  for (const m of bar.melody) if (m.t === tk) {
    const dur = m.d * ts * (m.d >= 3 ? 0.92 : m.d === 2 ? 0.78 : 0.62);
    note(t, m.midi, dur, 0.25, V.lead * m.v, { atk: 0.006, sus: 0.7, rel: 0.04, vib: m.d >= 3, bend: m.d >= 2 && m.t % 3 === 0 && ((idx * 7) % 5 === 0) ? 1 : 0 });
    if (m.d >= 2) note(t, m.midi + 12, dur * 0.8, 0.125, V.sparkle * m.v, { atk: 0.004, sus: 0.4 });
  }
  for (const c of bar.comp) if (c.t === tk) for (const n of c.notes) note(t, n, c.d * ts * 0.7, 0.25, tr.def.comp === 'chops' ? V.chops : V.brass, { atk: 0.006, sus: 0.35, rel: 0.05 });
  if (tk % 3 === 0) note(t, bar.bass[tk / 3], ts * 3 * 0.86, 'triangle', V.bass, { atk: 0.003, sus: 0.25, rel: 0.04 });
  for (const d of bar.drums) if (d.t === tk) drum(d.k, t, d.v);
}
let musicName = null, musicNext = 0, musicIdx = 0, musicTrack = null;
const TRACKS = {};
function musicWanted() {
  if (state === 'play' || state === 'dead') {
    if (boss && boss.active && boss.state !== 'dead') return ['bossA', 'bossB', 'bossC'][levelIdx % 3];
    return LV.music;
  }
  return (state === 'cutscene' || state === 'title' || state === 'unlock') ? 'home' : null;
}
function musicTick() {
  const want = musicWanted();
  if (want !== musicName) { musicName = want; musicTrack = null; musicIdx = 0; musicNext = 0; }
  if (!want || !ac || muted) return;
  if (!musicTrack) { musicTrack = TRACKS[want] || (TRACKS[want] = buildTrack(want)); musicNext = ac.currentTime + 0.06; musicIdx = 0; }
  if (musicNext < ac.currentTime - 0.25) musicNext = ac.currentTime + 0.05; // fell behind (tab was hidden, or just unmuted): resume from now
  while (musicNext < ac.currentTime + 0.14) { scheduleTick(musicTrack, musicIdx, musicNext); musicNext += musicTrack.tickSec; musicIdx++; }
}
