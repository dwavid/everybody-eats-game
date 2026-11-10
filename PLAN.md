# Everybody Eats! — Plan

**Concept:** Cab the chef feeds hungry dinner guests one at a time. Each guest gets a food that rhymes with their name. Each guest is a level based on that food, and you unlock the food by beating the boss, an evil anthropomorphic version of the food.

**Style:** same as the Boulder game: chunky pixel art drawn in code (no image files), side-scrolling, plain HTML + Canvas + JS, no build step.

## Done
- [x] Cab, the cute little chef (run, jump, stomp, toss a ladle, hurt, joy poses)
- [x] Title screen, Hannah's arrival cutscene with the Han-nah / ba-na-na rhyme, level card
- [x] Level 1: Banana Grove (Hannah -> BANANA): pits, one-way log platforms, cookies to collect, dinner-bell checkpoints
- [x] Banana-themed hazards: mini bananas (stomp or ladle), monkeys that lob banana peels (the peels then lie around), slippery peels (slide, but you can still jump), falling coconuts
- [x] Boss: Baron Von Peel (3 HP). Slides peels along the floor, leaps and slams (shockwaves; he's dizzy afterwards, so stomp his head). Faster and meaner as he gets hurt
- [x] Ending: golden banana, serve Hannah, "NEW FOOD UNLOCKED" recipe card, and a teaser for the next guest at the door
- [x] Hearts, score, game over and retry from the last bell
- [x] Synth sound effects and chiptune music (calm, boss, home), mute with M
- [x] Keyboard and touch controls

## Ideas backlog
- [ ] Guest #2 and beyond (rhymes: e.g. Pete -> a beet? Kerry -> a cherry, Sue -> stew, Dan -> a flan...), each with its own world and food boss
- [ ] A recipe book screen showing all unlocked foods, and unlocked foods giving Cab new abilities
- [ ] Level select, saved progress (localStorage)
- [ ] Portrait phone layout like Boulder (bigger view); gamepad support
- [ ] Hand-drawn sprites; per-level music
