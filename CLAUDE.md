# Everybody Eats!

A browser side-scroller (same family as the Boulder game, `dwavid/boulder-game`): Cab the chef feeds dinner guests a food that rhymes with their name. Each guest is a level; beating the food-themed boss unlocks the food. Plain HTML/Canvas/JS, no build step, no dependencies. Keep changes small, readable and easy to test.

## Layout
Plain `<script>` files that share one global scope, loaded in this order by `index.html`:
- `levels.js`: the `LEVELS` array. One entry per guest: guest + food + rhyme, theme, `kinds` (which enemy/hazard art to use), the layout, the boss and the intro/outro dialogue. Also `GROUND`, `IS_TOUCH` and cookie helpers.
- `themes.js`: art. Per-world scenery in `THEMES` (`sky`, `far`, `ground`, `pit`, `plat`, `decor`, decor `kinds`, `wallBg`), the enemy / hazard art tables (`MINI_ART`, `THROWER_ART`, `DROP_ART`, `drawPuddle`, `drawSlicer`, `drawGeyser`, `drawBoat`), and the food icons (`FOODS`).
- `bosses.js`: `BOSSES` (`peel`, `salami`, `gravy`). Each boss has its own state machine (`step`), projectiles (`proj`, `drawProj`), art (`draw`) and hitbox rules.
- `game.js`: the engine: input, sound, state, Cab, enemies, the shared boss engine (`updateBoss`), cutscenes, HUD and the main loop.
- `PLAN.md`: roadmap and done list. Update it when features land.

## Conventions
- Logical resolution 320x180, drawn at 4x (`SS`) so text is crisp. Draw with the `R()` (rect), `disc()` and `sprite()` helpers and integer coordinates. All art is drawn in code; no image files.
- Tunables are in `TUNE` at the top of `game.js`. `loadLevel(i)` copies `LEVELS[i]` into globals (`PITS`, `PLATS`, `BELLS`, `MINIS`, `THROWERS`, `SLICERS`, `GEYSERS`, `PUDDLES`, `DROPS`, `ARENA`, `SEGS`, `DECOR`, `THEME`, `BOSS`, `LV`); `resetRun(x)` builds the runtime objects (`enemies`, `throwers`, `peels` (puddles), `drops`, `slicers`, `geysers`, `movers`, `boss`, ...).
- Level data: `pits` (the ground is the gaps between them), `plats` (one-way: `[x, topY, width]`), `movers` (boats: `[leftMin, leftMax, topY, width, speed, phase]`), `minis` (`[x, floorY, from, to]`), `throwers` (`[x, platformTop]`), `slicers` (`[x, from, to]`), `geysers` (`[x, phase]`), `puddles`, `drops`, `bells` (checkpoints), `signs`, `arena`, and `cookies()`.
- `kinds` picks art and behavior: `mini` = `banana | salami | blob` (blobs hop at you), `thrower` = `monkey | mouse | pod` (monkeys' bananas leave slippery peels; the others' throws just burst), `drop` = `coconut | hook | cloud`, `puddle` = `peel | oil | gravy`. A new kind needs an entry in the matching art table in `themes.js` (and a color list: `MINI_COLORS`, `THROWER_COLORS`, `DROP_COLORS`).
- A new world needs a `THEMES` entry (see `deli` / `bayou`). New guests need `look` handling in `drawGuest` (`game.js`) and a food icon in `FOODS`.
- Design rules (checked by a static script, see Testing): jump apex ~64px, max jump distance ~78px. Platform tops y >= 92; pits <= 56px unless a boat crosses them (boats should tuck ~8px over each bank and pause there). Keep checkpoints on solid ground, 25px+ from pits and 45px+ from enemy patrols, slicers, geysers; put a bell right before each boat lake. A puddle needs ~105px of ground ahead of it before a pit (a slide is ~80px; you can still jump). Geysers: 60px+ from pits and never under a platform (the column is 84px tall). Throwers must stand on a platform. Keep cookies out of the boss arena.
- Cab is `cab` (feet position `x,y`, 10x22 hitbox). Stomp = landing from above on an enemy (`killMini`, `killThrower`, the boss). Hurt = lose a heart + invulnerability. Pits cost a heart and respawn at the last bell; 0 hearts shows the retry screen (boss HP persists). `cab.ride` is the boat Cab is standing on (he's carried by its `dx`).
- Boss engine (`updateBoss`): crossing `ARENA.trigger` starts the fight, drops a crate wall and locks the camera at `ARENA.left`. Generic states: `sleep, intro, hurt, dazed, dying, dead`; everything else (`walk` and his attacks) is the boss's own `step()`. A boss defines `h`/`hw` (stompable top + half-width), `dangerous(b)`, `stompable(b)`, optional `box(b)` (hitbox override, e.g. the rolling salami) and `freezeFace(b)`. His phase (0-2) grows as he's hurt. After he dies a golden food drops; grabbing it starts the ending (outro dialogue -> unlock card -> next guest).
- Peel/puddle objects (`peels`) are generic slippery puddles: bosses and throwers can add to them.
- Sound: all synthesized (`tone`, `noise`, `sfx`), music is a step sequencer in `MUSIC` (each level names its track in `music`). M mutes (saved in localStorage). Level progress is saved as `ee-progress`.
- Touch: use pointer events only; zoom is blocked on purpose (same as the Boulder game).

## Running and testing
- `python3 -m http.server 8000`, then open http://localhost:8000. Debug URLs: `?level=N` plus `&play`, `&boss`, `&intro`, `&end`, `&unlock`, `&x=NNNN`.
- `window.__game` exposes state for Playwright tests (`state`, `cab`, `boss`, `LV`, `step()`, `input`, `setInput`, `setBossHp`, `enemies`, `movers`, ...). A bot that holds right, holds jump through the rise, jumps at pit edges, waits for geysers, and boards/hops off boats can play through each level and beat the boss (refill `hearts` each frame so only pits matter). Quick static checks of the layout rules above are easy to script against `LEVELS`.
- Test both landscape and portrait phone viewports (touch buttons appear under the canvas in portrait).
