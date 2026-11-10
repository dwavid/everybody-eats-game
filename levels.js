'use strict';
// Level data for EVERYBODY EATS!  One entry per dinner guest. Loaded before game.js.
// Each level: the guest + the food that rhymes with their name, a theme (scenery), which kinds of
// enemies/hazards it uses, the layout (pits, platforms, enemies, ...) and the boss.
// To add a guest: append an entry here, add art in themes.js (theme + enemy kinds) and a boss in bosses.js.

const GROUND = 150; // y of the ground surface in world space
const G = GROUND;
const IS_TOUCH = matchMedia('(pointer: coarse)').matches;
const kt = (key, touch) => (IS_TOUCH ? touch : key); // sign text: keyboard version, touch version

// cookie helpers (the collectibles)
function cookieRow(out, x, y, n, g) { for (let i = 0; i < n; i++) out.push([x + i * (g || 12), y]); }
function cookieArc(out, x0, x1, y0, h, n) { for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push([x0 + (x1 - x0) * t, y0 - Math.sin(Math.PI * t) * h]); } }
function autoCookies(lv) { // an arc over every pit, a row over every other platform, plus any extras
  const out = [];
  for (const [a, b] of lv.pits) { if (b - a <= 60) cookieArc(out, a - 6, b + 6, 130, 38, 5); else cookieRow(out, a + 10, 126, Math.floor((b - a - 20) / 14), 14); }
  lv.plats.forEach((p, i) => { if (i % 2 === 0) cookieRow(out, p[0] + 6, p[1] - 16, Math.max(2, Math.floor((p[2] - 8) / 12)), 12); });
  for (const [x, y, n] of lv.extraCookies || []) cookieRow(out, x, y, n, 12);
  return out;
}

const LEVELS = [];

// ---------------------------------------------------------------- 1. Hannah -> BANANA
LEVELS.push({
  id: 'banana', name: 'Banana Grove', theme: 'jungle', music: 'grove',
  guest: { name: 'Hannah', look: 'hannah', color: '#e0559a' },
  food: { name: 'BANANA', icon: 'banana' },
  rhyme: ['HAN-NAH', 'BA-NA-NA'],
  kinds: { mini: 'banana', thrower: 'monkey', drop: 'coconut', puddle: 'peel' },
  boss: 'peel',
  width: 3800,
  arena: { left: 3400, right: 3716, trigger: 3450, bossX: 3630 },
  pits: [[520, 562], [1150, 1198], [1440, 1484], [1980, 2030], [2160, 2204], [2330, 2374], [2700, 2748], [3010, 3052]],
  plats: [
    [380, 116, 56], [498, 114, 90], [790, 104, 90], [925, 122, 44], [985, 98, 62],
    [1130, 112, 90], [1590, 100, 80], [1700, 120, 50], [1760, 100, 60], [1840, 118, 60],
    [2140, 114, 80], [2310, 112, 90], [2480, 104, 80], [2860, 108, 70], [2680, 120, 90], [3120, 104, 70],
  ],
  movers: [],
  bells: [1000, 1900, 2950, 3340],
  minis: [ // x, floorY, patrol from, patrol to
    [300, G, 230, 480], [700, G, 640, 780], [1080, G, 1050, 1140], [1280, G, 1215, 1400],
    [1620, G, 1550, 1700], [1720, G, 1640, 1800], [2060, G, 2045, 2150], [2250, G, 2215, 2320],
    [2430, G, 2385, 2690], [2790, G, 2760, 2900], [3230, G, 3150, 3290],
    [820, 104, 795, 875], [2500, 104, 2485, 2555],
  ],
  throwers: [[855, 104], [1655, 100], [2330, 112], [3170, 104]], // x, platform top
  slicers: [], geysers: [],
  puddles: [640, 1305, 1830, 2040, 2570, 2860],
  drops: [900, 1560, 2420, 3100],
  cookies() {
    const out = [];
    cookieRow(out, 120, 135, 3); cookieRow(out, 395, 100, 4); cookieArc(out, 512, 570, 130, 40, 5); cookieRow(out, 510, 98, 6);
    cookieRow(out, 700, 135, 3); cookieRow(out, 800, 88, 5); cookieRow(out, 935, 106, 3); cookieRow(out, 995, 82, 4);
    cookieArc(out, 1140, 1208, 130, 38, 5); cookieRow(out, 1140, 96, 5); cookieRow(out, 1260, 135, 3);
    cookieArc(out, 1430, 1494, 130, 38, 5); cookieRow(out, 1600, 84, 5); cookieRow(out, 1708, 104, 3); cookieRow(out, 1770, 84, 4); cookieRow(out, 1850, 102, 3);
    cookieArc(out, 1970, 2040, 130, 38, 5); cookieArc(out, 2150, 2214, 130, 38, 5); cookieRow(out, 2150, 98, 5); cookieRow(out, 2320, 96, 5);
    cookieArc(out, 2320, 2384, 130, 36, 5); cookieRow(out, 2490, 88, 5); cookieRow(out, 2690, 104, 5); cookieArc(out, 2690, 2758, 130, 38, 5);
    cookieRow(out, 2870, 92, 4); cookieArc(out, 3000, 3062, 130, 38, 5); cookieRow(out, 3130, 88, 4); cookieRow(out, 3200, 135, 4);
    return out;
  },
  signs: [[80, kt('ARROWS MOVE', '◀ ▶ MOVE')], [175, kt('SPACE JUMPS', '▲ JUMPS')], [255, 'STOMP BANANAS!'], [345, kt('X TOSSES LADLE', '● TOSSES LADLE')], [3300, 'BOSS AHEAD!']],
  intro: [
    { who: 'guest', text: "Hi Cab! I'm Hannah. My tummy is rumbling so loud!" },
    { who: 'cab', text: 'Hannah... Han-nah... what rhymes with that?' },
    { who: 'cab', text: 'BA-NA-NA! Han-nah... ba-na-na!', rhyme: true },
    { who: 'guest', text: 'Ooh! I LOVE bananas!' },
    { who: 'cab', text: 'One banana, coming up! The ripest ones grow in Banana Grove...' },
    { who: 'cab', text: '...where a very grumpy banana lives. Wish me luck!' },
  ],
  outro: [
    { who: 'cab', text: 'Dinner is served! One perfectly ripe banana for Hannah!', serve: true },
    { who: 'guest', text: "Yum! Han-nah, ba-na-na... it RHYMES! You're the best chef, Cab!", rhyme: true },
  ],
});

// ---------------------------------------------------------------- 2. Tommy -> SALAMI
LEVELS.push({
  id: 'salami', name: 'Salami Deli', theme: 'deli', music: 'deli',
  guest: { name: 'Tommy', look: 'tommy', color: '#e0793a' },
  food: { name: 'SALAMI', icon: 'salami' },
  rhyme: ['TOM-MY', 'SA-LA-MI'],
  kinds: { mini: 'salami', thrower: 'mouse', drop: 'hook', puddle: 'oil' },
  boss: 'salami',
  width: 3500,
  arena: { left: 3100, right: 3416, trigger: 3150, bossX: 3330 },
  pits: [[480, 524], [900, 946], [1300, 1346], [1720, 1768], [2000, 2046], [2330, 2380], [2700, 2748]],
  plats: [
    [350, 118, 60], [470, 112, 70], [610, 100, 80], [770, 116, 60], [885, 108, 80], [1060, 100, 80],
    [1190, 118, 60], [1280, 110, 80], [1470, 104, 80], [1590, 118, 50], [1700, 106, 90], [1850, 98, 70],
    [1980, 112, 80], [2140, 100, 80], [2310, 108, 90], [2480, 118, 60], [2570, 100, 80], [2690, 112, 80], [2850, 104, 80],
  ],
  movers: [],
  bells: [1040, 1880, 2790, 3040],
  minis: [
    [250, G, 190, 400], [610, G, 560, 660], [1130, G, 1100, 1220], [1420, G, 1380, 1460],
    [1810, G, 1780, 1830], [2100, G, 2070, 2160], [2640, G, 2620, 2680], [2880, G, 2850, 2910],
    [2260, G, 2200, 2290],
  ],
  throwers: [[660, 100], [1530, 104], [2200, 100], [2900, 104]],
  slicers: [[760, 700, 820], [1570, 1520, 1620], [2520, 2460, 2580]], // x, patrol from, patrol to (spinning blades on the floor)
  geysers: [],
  puddles: [590, 1160, 2200, 2960],
  drops: [1250, 1960, 2900, 450],
  extraCookies: [[120, 135, 3], [2960, 135, 3]],
  cookies() { return autoCookies(this); },
  signs: [[330, kt('X TOSSES LADLE', '● TOSSES LADLE')], [640, 'SPINNING SLICERS!'], [3010, 'BOSS AHEAD!']],
  intro: [
    { who: 'guest', text: "Heya Cab! I'm Tommy. I could eat a whole deli right now!" },
    { who: 'cab', text: 'Tommy... Tom-my... what rhymes with Tommy?' },
    { who: 'cab', text: 'SA-LA-MI! Tom-my... sa-la-mi!', rhyme: true },
    { who: 'guest', text: 'Salami?! That is my FAVORITE!' },
    { who: 'cab', text: 'The finest salami hangs in the Salami Deli...' },
    { who: 'cab', text: '...and I hear a certain General guards it. Wish me luck!' },
  ],
  outro: [
    { who: 'cab', text: 'Order up! One big, juicy salami for Tommy!', serve: true },
    { who: 'guest', text: 'Tom-my, sa-la-mi... it RHYMES! Best chef ever, Cab!', rhyme: true },
  ],
});

// ---------------------------------------------------------------- 3. Davey -> GRAVY
LEVELS.push({
  id: 'gravy', name: 'Gravy Bayou', theme: 'bayou', music: 'bayou',
  guest: { name: 'Davey', look: 'davey', color: '#3b8fd9' },
  food: { name: 'GRAVY', icon: 'gravy' },
  rhyme: ['DAY-VEE', 'GRAY-VEE'],
  kinds: { mini: 'blob', thrower: 'pod', drop: 'cloud', puddle: 'gravy' },
  boss: 'gravy',
  width: 3500,
  arena: { left: 3100, right: 3416, trigger: 3150, bossX: 3330 },
  pits: [[500, 546], [1000, 1048], [1500, 1650], [2000, 2160], [2550, 2598], [2850, 2896]],
  // gravy boats: [leftMin, leftMax, topY, width, speed, startPhase] — they ferry you across the wide lakes
  movers: [[1490, 1610, G, 48, 0.55, 0], [1990, 2120, G, 48, 0.6, 0.5]],
  plats: [
    [380, 112, 60], [480, 104, 80], [700, 118, 60], [830, 100, 80], [980, 110, 80], [1150, 100, 70],
    [1260, 116, 50], [1380, 104, 70], [1700, 100, 70], [1790, 118, 50], [1870, 102, 70], [2200, 108, 70],
    [2300, 98, 80], [2420, 116, 50], [2530, 106, 90], [2680, 100, 70], [2830, 112, 80],
  ],
  bells: [880, 1440, 1960, 2480, 3040],
  minis: [
    [250, G, 190, 400], [620, G, 570, 700], [1100, G, 1070, 1180], [1280, G, 1240, 1320],
    [1750, G, 1730, 1790], [2260, G, 2240, 2300], [2640, G, 2620, 2700], [2930, G, 2900, 2960],
    [1860, G, 1840, 1900],
  ],
  throwers: [[860, 100], [1180, 100], [2560, 106], [2710, 100]],
  slicers: [],
  geysers: [[330, 0], [790, 80], [1335, 40], [2400, 0], [2780, 60]], // x, phase
  puddles: [600, 1100, 1700, 2200, 2950],
  drops: [440, 1220, 2300, 3000],
  extraCookies: [[120, 135, 3], [2960, 135, 3]],
  cookies() { return autoCookies(this); },
  signs: [[330, kt('X TOSSES LADLE', '● TOSSES LADLE')], [1275, 'HOP ON THE GRAVY BOAT!'], [3010, 'BOSS AHEAD!']],
  intro: [
    { who: 'guest', text: "Hi Cab! I'm Davey. My mashed potatoes look SO plain..." },
    { who: 'cab', text: 'Davey... Day-vey... what rhymes with Davey?' },
    { who: 'cab', text: 'GRAY-VEE! Day-vey... gray-vey!', rhyme: true },
    { who: 'guest', text: 'Gravy! Yes, please! Pour it on!' },
    { who: 'cab', text: 'The richest gravy flows through Gravy Bayou...' },
    { who: 'cab', text: '...where a certain Captain rules the boats. Hold my ladle!' },
  ],
  outro: [
    { who: 'cab', text: 'Dinner is served! A big boat of gravy for Davey!', serve: true },
    { who: 'guest', text: "Day-vey, gray-vey... it RHYMES! Pour me another, chef!", rhyme: true },
  ],
});

// ---------------------------------------------------------------- 4. Plato -> TOMATO
LEVELS.push({
  id: 'tomato', name: 'Tomato Garden', theme: 'garden', music: 'garden',
  guest: { name: 'Plato', look: 'plato', color: '#7a8a3a' },
  food: { name: 'TOMATO', icon: 'tomato' },
  rhyme: ['PLAY-TOE', 'TO-MAY-TO'],
  kinds: { mini: 'tomato', thrower: 'gnome', drop: 'vine', puddle: 'sauce' },
  boss: 'tomato',
  width: 3500,
  arena: { left: 3100, right: 3416, trigger: 3150, bossX: 3330 },
  pits: [[560, 606], [1080, 1130], [1620, 1670], [2120, 2172], [2640, 2690]],
  plats: [
    [380, 118, 60], [530, 106, 90], [720, 100, 80], [880, 116, 60], [1040, 104, 100], [1230, 114, 70],
    [1370, 100, 80], [1500, 118, 60], [1590, 106, 100], [1770, 102, 70], [1880, 118, 60], [2000, 100, 80],
    [2090, 108, 110], [2290, 116, 60], [2400, 100, 80], [2520, 114, 60], [2610, 104, 110], [2800, 108, 70],
  ],
  movers: [],
  bells: [980, 1490, 2030, 2560, 3040],
  minis: [ // rolling tomatoes
    [260, G, 200, 420], [680, G, 650, 860], [1200, G, 1160, 1340], [1700, G, 1690, 1860], [2230, G, 2190, 2400], [2760, G, 2710, 2900],
  ],
  throwers: [[760, 100], [1410, 100], [2040, 100], [2440, 100]], // gnomes
  slicers: [], geysers: [],
  spikes: [[440, 26, 'thorns'], [900, 28, 'thorns'], [1400, 26, 'thorns'], [1960, 28, 'thorns'], [2320, 26, 'thorns'], [2840, 28, 'thorns']],
  puddles: [700, 1230, 1760, 2200, 2730],
  drops: [770, 1310, 1900, 2380, 2780],
  extraCookies: [[120, 135, 3], [2960, 135, 3]],
  cookies() { return autoCookies(this); },
  signs: [[330, 'THORNS HURT! HOP OVER!'], [620, 'TOMATOES ROLL AT YOU!'], [3010, 'BOSS AHEAD!']],
  intro: [
    { who: 'guest', text: 'Greetings, Cab! I am Plato. I have pondered what to eat all day.' },
    { who: 'cab', text: 'Plato... Play-toe... what rhymes with Plato?' },
    { who: 'cab', text: 'TO-MAY-TO! Play-toe... to-may-to!', rhyme: true },
    { who: 'guest', text: 'A tomato! Ah, the perfect form of a juicy red fruit!' },
    { who: 'cab', text: 'The ripest tomatoes grow in the Tomato Garden...' },
    { who: 'cab', text: '...where a very squishy knight lives. Wish me luck!' },
  ],
  outro: [
    { who: 'cab', text: 'Dinner is served! One perfectly ripe tomato for Plato!', serve: true },
    { who: 'guest', text: 'Play-toe, to-may-to... it RHYMES! A truly philosophical meal, Cab!', rhyme: true },
  ],
});

// ---------------------------------------------------------------- 5. Dory -> CACCIATORE
LEVELS.push({
  id: 'cacciatore', name: 'Cacciatore Woods', theme: 'woods', music: 'woods',
  guest: { name: 'Dory', look: 'dory', color: '#1aa8a0' },
  food: { name: 'CACCIATORE', icon: 'cacciatore' },
  rhyme: ['DOR-EE', 'CAT-CHA-TOR-EE'],
  kinds: { mini: 'mushroom', thrower: 'hen', drop: 'pinecone', puddle: 'egg' },
  boss: 'chicken',
  width: 3500,
  arena: { left: 3100, right: 3416, trigger: 3150, bossX: 3330 },
  pits: [[500, 548], [1060, 1110], [1580, 1630], [2090, 2140], [2600, 2650]],
  plats: [
    [380, 116, 60], [470, 104, 80], [760, 100, 80], [880, 118, 60], [1000, 106, 100], [1180, 114, 70],
    [1320, 100, 80], [1480, 118, 60], [1530, 106, 100], [1730, 102, 70], [1860, 118, 60], [1980, 100, 80],
    [2040, 108, 110], [2250, 116, 60], [2380, 100, 80], [2500, 114, 60], [2550, 104, 110], [2760, 108, 70],
    [610, 52, 70, 'hi'], [1260, 52, 80, 'hi'], [2310, 52, 80, 'hi'], // canopy ledges: bounce up on a mushroom
  ],
  movers: [],
  springs: [665, 1300, 2350],
  bells: [960, 1500, 2000, 2520, 3040],
  minis: [ // x, floorY, from, to, kind
    [250, G, 190, 400, 'mushroom'], [800, G, 760, 900, 'pepper'], [1150, G, 1120, 1230, 'mushroom'], [1410, G, 1380, 1450, 'pepper'],
    [1700, G, 1680, 1780, 'mushroom'], [1900, G, 1870, 1950, 'pepper'], [2220, G, 2190, 2290, 'mushroom'], [2430, G, 2400, 2460, 'pepper'],
    [2710, G, 2680, 2790, 'mushroom'], [2900, G, 2880, 2960, 'pepper'],
  ],
  throwers: [[790, 100], [1360, 100], [2020, 100], [2420, 100]], // hens
  slicers: [], geysers: [],
  spikes: [[330, 24, 'trap'], [850, 24, 'trap'], [1250, 24, 'trap'], [1840, 24, 'trap'], [2300, 24, 'trap'], [2860, 24, 'trap']],
  puddles: [700, 1140, 1730, 2170, 2750],
  drops: [780, 1430, 1960, 2440, 2800],
  extraCookies: [[120, 135, 3], [2960, 135, 3]],
  cookies() { return autoCookies(this); },
  signs: [[330, 'BEAR TRAPS! JUMP!'], [570, 'BOUNCE ON THE MUSHROOMS!'], [3010, 'BOSS AHEAD!']],
  intro: [
    { who: 'guest', text: "Hi Cab! I'm Dory. Wait... why did I come here? Oh right, I'm hungry!" },
    { who: 'cab', text: 'Dory... Dor-ee... what rhymes with Dory?' },
    { who: 'cab', text: 'CAT-CHA-TOR-EE! Dor-ee... cat-cha-tor-ee!', rhyme: true },
    { who: 'guest', text: 'Cacciatore? What is that? ...Oh yes, I love it!' },
    { who: 'cab', text: 'Chicken cacciatore means hunter style. I will hunt in Cacciatore Woods...' },
    { who: 'cab', text: '...where a very fowl Count lurks. Wish me luck!' },
  ],
  outro: [
    { who: 'cab', text: 'Dinner is served! Chicken cacciatore for Dory!', serve: true },
    { who: 'guest', text: 'Dor-ee, cat-cha-tor-ee... it RHYMES! Wait, what are we eating? ...Yum!', rhyme: true },
  ],
});

// ---------------------------------------------------------------- 6. Tony -> BOLOGNA
LEVELS.push({
  id: 'bologna', name: 'Baloney Factory', theme: 'factory', music: 'factory',
  guest: { name: 'Tony', look: 'tony', color: '#3aa648' },
  food: { name: 'BOLOGNA', icon: 'bologna' },
  rhyme: ['TOE-NEE', 'BA-LOW-NEE'],
  kinds: { mini: 'bread', thrower: 'bottle', drop: 'cleaver', puddle: 'mustard', geyser: 'press' },
  boss: 'baloney',
  width: 3500,
  arena: { left: 3100, right: 3416, trigger: 3150, bossX: 3330 },
  pits: [[560, 606], [1180, 1230], [1860, 1910], [2500, 2550]],
  plats: [
    [380, 118, 60], [520, 106, 100], [720, 100, 80], [860, 116, 60], [1060, 104, 100], [1280, 100, 80],
    [1420, 118, 60], [1560, 106, 80], [1700, 100, 80], [1810, 108, 100], [1980, 116, 60], [2100, 100, 80],
    [2250, 118, 60], [2400, 106, 100], [2640, 100, 80], [2780, 116, 60], [2900, 104, 70],
  ],
  movers: [],
  belts: [[760, 980, -1], [1380, 1600, 1], [2040, 2260, -1], [2680, 2900, 1]], // x from, x to, direction (they push Cab along)
  bells: [1100, 1790, 2440, 3040],
  minis: [ // x, floorY, from, to, kind
    [300, G, 270, 340, 'bread'], [640, G, 620, 700, 'pickle'], [880, G, 840, 940, 'bread'], [1330, G, 1290, 1350, 'pickle'],
    [1640, G, 1620, 1720, 'bread'], [1960, G, 1930, 2010, 'pickle'], [2150, G, 2100, 2200, 'bread'], [2340, G, 2320, 2380, 'pickle'],
    [2760, G, 2720, 2840, 'bread'], [2960, G, 2930, 2990, 'pickle'],
  ],
  throwers: [[750, 100], [1310, 100], [1730, 100], [2130, 100]], // mustard bottles
  slicers: [],
  geysers: [[250, 0], [690, 40], [1010, 100], [1520, 120], [2350, 60]], // sandwich presses: x, phase
  spikes: [],
  puddles: [450, 1050, 1400, 2000, 2620],
  drops: [350, 1480, 1840, 2200, 2800],
  extraCookies: [[120, 135, 3], [2960, 135, 3]],
  cookies() { return autoCookies(this); },
  signs: [[330, 'PRESSES SLAM! WAIT & RUN!'], [700, 'CONVEYOR BELTS PUSH YOU!'], [3010, 'BOSS AHEAD!']],
  intro: [
    { who: 'guest', text: "Yo Cab! I'm Tony. I could eat a whole sandwich... or ten!" },
    { who: 'cab', text: 'Tony... Toe-nee... what rhymes with Tony?' },
    { who: 'cab', text: 'BA-LOW-NEE! Toe-nee... ba-low-nee!', rhyme: true },
    { who: 'guest', text: 'Bologna! My favorite sandwich meat!' },
    { who: 'cab', text: 'The freshest bologna comes from the Baloney Factory...' },
    { who: 'cab', text: '...run by a king who is full of baloney. Wish me luck!' },
  ],
  outro: [
    { who: 'cab', text: 'Order up! A big thick slice of bologna for Tony!', serve: true },
    { who: 'guest', text: "Toe-nee, ba-low-nee... it RHYMES! That's no baloney, Cab!", rhyme: true },
  ],
});
