# Everybody Eats!

A browser side-scroller (same family as the Boulder game, `dwavid/boulder-game`): Cab the chef feeds dinner guests a food that rhymes with their name. Each guest is a level; beating the food-themed boss unlocks the food. Plain HTML/Canvas/JS, no build step, no dependencies. Keep changes small, readable and easy to test.

## Layout
- `index.html`: page, canvas, on-screen touch buttons (left, right, ladle, jump)
- `game.js`: all game code, in sections: helpers, input, sound, level data, state, update, drawing, main loop
- `PLAN.md`: roadmap and done list. Update it when features land.

## Conventions
- Logical resolution 320x180, drawn at 4x (`SS`) so text is crisp. Draw with the `R()` (rect), `disc()` and `sprite()` helpers and integer coordinates. All art is drawn in code; no image files.
- Tunables are in `TUNE` at the top. Level layout is data: `PITS`, `PLATS` (one-way: `[x, topY, width]`), `MINIS`, `MONKEYS`, `PEELS`, `COCONUTS`, `BELLS`, `COOKIES`, `SIGNS`, and `ARENA` for the boss. Ground is `GROUND` (150); ground segments are derived from the pits.
- Jump apex is ~64px, max jump distance ~78px. Platform tops should be y >= 92 and pits <= 56px wide. Keep checkpoints on solid ground, away from enemies, and a peel needs ~100px of ground after it (a slip is ~80px; you can still jump while slipping).
- Cab is `cab` (feet position `x,y`, 10x22 hitbox). Stomp = landing from above on an enemy (`killMini`, `killMonkey`, boss). Hurt = lose a heart + invulnerability. Pits cost a heart and respawn at the last bell; 0 hearts shows the retry screen (boss HP persists).
- Boss (Baron Von Peel): `boss` object and a state machine in `updateBoss` (`sleep, intro, walk, peel, leap, air, dazed, hurt, dying, dead`). Crossing `ARENA.trigger` starts the fight, drops a crate wall and locks the camera at `ARENA.left`. Stomping his head (when grounded and not hurt/dying) hurts him; his phase (0-2) speeds him up and adds a second peel. After he dies a golden banana drops; grabbing it starts the ending (outro dialogue -> unlock card).
- Adding a level/guest: add the name rhyme + intro/outro lines (`INTRO_LINES`/`OUTRO_LINES` style), a themed level data set, a boss, and a food icon. Right now there is a single hard-coded level; when guest #2 lands, turn the level data into a `LEVELS` array.
- Sound: all synthesized (`tone`, `noise`, `sfx`), music is a step sequencer in `MUSIC`. M mutes (saved in localStorage).
- Touch: use pointer events only; zoom is blocked on purpose (same as the Boulder game).

## Running and testing
- `python3 -m http.server 8000`, then open http://localhost:8000. Debug URLs: `?play`, `?boss`, `?intro`, `?end`, `?unlock`, `&x=NNNN`.
- `window.__game` exposes state for Playwright tests (`state`, `cab`, `boss`, `step()`, `input`, `setInput`, `setBossHp`, ...). A bot that holds right, holds jump through the rise, and jumps at pit edges can traverse the level.
- Test both landscape and portrait phone viewports (touch buttons appear under the canvas in portrait).
