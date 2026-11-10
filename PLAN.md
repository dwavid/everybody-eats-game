# Everybody Eats! — Plan

**Concept:** Cab the chef feeds hungry dinner guests one at a time. Each guest gets a food that rhymes with their name. Each guest is a level based on that food, and you unlock the food by beating the boss, an evil anthropomorphic version of the food.

**Style:** same as the Boulder game: chunky pixel art drawn in code (no image files), side-scrolling, plain HTML + Canvas + JS, no build step.

## Done
- [x] Levels 2 and 3 (see below) and a proper `LEVELS` system: guest, food, theme, enemy kinds, layout, boss and dialogue are all data in `levels.js`; the title screen has a level picker (progress saved in localStorage); finishing a level leads straight into the next guest's arrival
- [x] Level 2: Salami Deli (Tommy -> SALAMI): indoor deli with brick walls, neon sign and shelves; angry salami slices, mice that toss cheese, spinning slicer blades on the floor, oil puddles that make you slide, salamis that drop from their hooks
- [x] Boss: General Salami. Fires slices at two heights (highs first), then curls up and rolls like a wheel across the arena; when he hits the wall he's dizzy and you stomp his cap. Rolls twice in his last phase
- [x] Level 3: Gravy Bayou (Davey -> GRAVY): Thanksgiving-table world (mashed-potato hills, broccoli trees, dinner-roll platforms); gravy blobs that hop at you, pea-pod shooters, gravy geysers (bubble, then erupt), gravy clouds that drop on you, and moving gravy boats that ferry you across wide gravy lakes
- [x] Boss: Captain Gravy (a gravy boat in a captain's cap). Lobs gravy at marked spots on the floor (each leaves a slippery puddle) and pours a tall wave you must jump early; after pouring he's empty and dizzy, so stomp his cap
- [x] Guests Tommy and Davey (shared body, their own hair/clothes), the Cab skin tone is darker
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
- [ ] More guests (rhyme ideas: Kerry -> cherry, Sue -> stew, Dan -> flan, Pete -> beet, Lou -> ravioli?)
- [ ] A recipe book screen showing all unlocked foods, and unlocked foods giving Cab new abilities
- [ ] Level select, saved progress (localStorage)
- [ ] Portrait phone layout like Boulder (bigger view); gamepad support
- [ ] Hand-drawn sprites; per-level music
