# Everybody Eats!

You're **Cab**, a cute little chef. Hungry dinner guests arrive one by one, and Cab's goal is to feed each guest a food that **rhymes with their name**. Each guest is a level themed around that food, and you unlock the food by beating the boss: an evil, anthropomorphic version of it.

| # | Guest | Food | Level | Boss |
|---|-------|------|-------|------|
| 1 | Hannah | Banana | Banana Grove (jungle, monkeys, coconuts, slippery peels) | Baron Von Peel |
| 2 | Tommy | Salami | Salami Deli (spinning slicers, cheese-throwing mice, oil puddles, falling salamis) | General Salami |
| 3 | Davey | Gravy | Gravy Bayou (gravy lakes with boats, geysers, hopping gravy blobs, pea-pod shooters) | Captain Gravy |

**Controls:** Arrow keys / WASD to move, Space / Up to jump (jump on enemies to stomp them), X / Z / K to toss a ladle, Down while on a log or shelf to drop through it, M to mute. On a phone, use the on-screen buttons (the spoon tosses a ladle). Tap or press Space/Enter to advance dialogue. On the title screen, left/right or 1-3 picks a level you've unlocked.

**Run locally:** `python3 -m http.server 8000` and open http://localhost:8000

Debug URLs: `?level=2` (pick a level, 1-3), then add `&play` (skip the intro), `&boss` (start at the boss arena), `&intro`, `&end`, `&unlock`, or `&x=1500` (start at an x position).

See [PLAN.md](PLAN.md) for the roadmap and [CLAUDE.md](CLAUDE.md) for the code layout.
