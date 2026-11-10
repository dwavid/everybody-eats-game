# Everybody Eats!

You're **Cab**, a cute little chef. Hungry dinner guests arrive one by one, and Cab's goal is to feed each guest a food that **rhymes with their name**. Each guest is a level themed around that food, and you unlock the food by beating the boss: an evil, anthropomorphic version of it.

**Level 1:** Hannah arrives. Han-nah... *ba-na-na!* Banana Grove ends with the boss fight against **Baron Von Peel**.

**Controls:** Arrow keys / WASD to move, Space / Up to jump (jump on enemies to stomp them), X / Z / K to toss a ladle, Down while on a log to drop through it, M to mute. On a phone, use the on-screen buttons (the spoon tosses a ladle). Tap or press Space/Enter to advance dialogue.

**Run locally:** `python3 -m http.server 8000` and open http://localhost:8000

Debug URLs: `?play` (skip the intro), `?boss` (start at the boss arena), `?intro`, `?end`, `?unlock`, `&x=1500` (start at an x position).

See [PLAN.md](PLAN.md) for the roadmap and [CLAUDE.md](CLAUDE.md) for the code layout.
