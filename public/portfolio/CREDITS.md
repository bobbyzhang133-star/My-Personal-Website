# Asset Credits

## Portfolio-owned assets

The images under `assets/covers/` and `assets/menu-objects/` were already part of Bobby Zhang's portfolio before this restructuring. Their original authorship and licensing metadata was not recorded in the repository, so no new attribution claims are made here.

## External media

- The Shaman's Documentary — hosted on Google Drive; existing portfolio embed preserved.
- Air Dynamics — hosted on Google Drive; existing portfolio embed preserved.
- That Girl, Take 01 and Take 02 — hosted on Google Drive; existing portfolio embeds preserved.

## Fonts

- Instrument Serif, JetBrains Mono, and Space Grotesk are loaded from Google Fonts. See Google Fonts for their current license files.

## Audio

- [Roomtone Bedroom Yew](https://freesound.org/people/leonelmail/sounds/329569/) by leonelmail, Freesound #329569, is dedicated to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The self-hosted file is the Freesound HQ MP3 preview and has not been materially modified.
- The shared sound manager adds that low-volume loop only in the Home Room, after the visitor enables sound or interacts with a previously saved sound-on preference. It also produces brief, low-volume synthesized interface tones. Sound remains off by default, never autoplays audibly, remembers the visitor's preference, and pauses while the page is hidden.

## Home Room pixel-art system

The [Home Room Pixel Source Board in Figma](https://www.figma.com/design/m7vGVrTAxZHLCVSBbMLpvu/Bobby-Portfolio-Home-Room-Visual-Direction?node-id=7-3) is the visual source of truth for the desktop and mobile room compositions, camera position, object placement, bird walkable region, layer separation, lighting, and HUD placement.

### Third-party CC0 assets

- Primary asset family: [Cool School tileset](https://opengameart.org/content/cool-school-tileset) by NettySvit, licensed under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
- The Home Room uses cropped tiles and props from that family for its walls, floor, window, shelving, cabinets, desks, chair, book, computer, papers, globe, and related background furniture. These assets remain third-party CC0 artwork even where they are combined into project-specific room layers.
- The source sheet was normalized with the connected Adobe workflow using brightness -4, contrast +8, and saturation -12 before its room assets were cropped. Those adjustments are palette/contrast cleanup only and do not change the source license or authorship.

Exact third-party derivative inventory:

- `cool-school-source-adobe.png`
- `cool-school-wall.png`
- `cool-school-floor.png`
- `cool-school-window.png`
- `cool-school-landscape.png`
- `cool-school-bookshelf-left.png`
- `cool-school-bookshelf-right.png`
- `cool-school-low-shelf.png`
- `cool-school-cabinet-tall.png`
- `cool-school-desk-plain.png`
- `cool-school-desk-drawers.png`
- `cool-school-counter-long.png`
- `cool-school-chair-front.png`
- `cool-school-computer.png`
- `cool-school-book.png`
- `cool-school-papers.png`
- `cool-school-globe.png`

### Computer perspective derivatives

- The 48×48 `cool-school-computer.png` remains the licensed CC0 Room object and the identity source for the AI category computer.
- Four project-produced perspective derivatives were created from that exact source with OpenAI ImageGen. The prompts required the source computer's mint casing, navy pixel outline, cream keyboard deck, coral lower lip, and green keys to remain consistent; they did not introduce a different computer or any third-party imagery.
- `cool-school-computer-preferred-perspective.png` is Bobby's selected straight-on, seated-eye-level production shell used at every category breakpoint. Portrait layouts use a closer crop of this same asset rather than substituting a differently proportioned computer.
- `cool-school-computer-mobile-perspective.png`, `cool-school-computer-wide-study.png`, and `cool-school-computer-three-quarter-study.png` are alternate perspective studies retained for provenance and visual comparison. They are not loaded at runtime.
- These files are derivative project assets based on NettySvit's CC0 Cool School computer. The straight-on variants were selected because they permit crisp, accessible live HTML in the screen opening; the three-quarter study was rejected for runtime use because it would require skewing interactive text.

### Original portfolio artwork

- The pixel camera and guitar were created for this Home Room and matched to the Cool School tileset's scale, palette, perspective, and shading language.
- The rug, footprint contact shadow, and lighting overlays are original Home Room artwork. They are exported separately where layering is needed for interaction, grounding, occlusion, or responsive composition.
- Exact original-file inventory: `camera-original.svg`, `guitar-original.svg`, `rug-original.svg`, `contact-shadow-original.svg`, and `lighting-overlay-original.svg`.

### Archived temporary artwork (superseded)

- The current bird sprite sheet is an original temporary proxy with idle, walk-left, and walk-right states. It is marked as temporary internally and must not be represented as the final One Last Bird character artwork.
- Temporary-file inventory: `bird-temporary-sprites.svg`.
- The actual One Last Bird sprite was not found in the project files or Git history. The existing flattened game cover is not a reusable character sprite, and no generic third-party bird has been substituted as final artwork.

### Earlier Games character-select concepts (Bird/Breakout superseded)

- Five transparent character-selection concepts were generated with OpenAI ImageGen from the existing portfolio game covers as visual references. They are project-produced selector artwork, not recovered in-game sprites and not evidence of additional game canon.
- `game-characters/one-last-bird-selector.png` represents the cover's adult Ivory-billed Woodpecker. It remains separate from the missing actual One Last Bird production sprite.
- At Bobby's request, the Home Room now reuses this exact woodpecker PNG as its Games representative. The temporary green bird sheet is no longer runtime-loaded. The shared woodpecker is static character presentation art with lateral room movement, not an invented walking sprite sheet.
- `game-characters/chickens-breakout-selector.png` expands the cover's minimal red circular chicken mark only for character-selection presentation.
- `game-characters/five-nights-at-chickens-selector.png` translates the original black, white, and red chicken creature shown on the project cover.
- `game-characters/chickens-nightmare-gamemaker-selector.png` and `game-characters/chickens-nightmare-ue5-selector.png` are two presentation treatments of the same red-eyed shadow-chicken identity. The UE5 image does not claim a separate canonical character.
- The generation prompts required isolated characters, transparent backgrounds, no text, no logos, and a consistent modern indie pixel-art language. Existing covers remain the canonical project artwork and are preserved unchanged.

### Interaction mapping and scope

- Games → Bird
- Films → Camera
- Research → Book
- Music → Guitar
- AI → Computer
- The coherent Room asset family remains scoped to the creative experience. At Bobby's request, the AI category now reuses perspective derivatives of the exact Room computer so the object remains visually continuous through the transition. No professional page was redesigned, and this pass is not deployed.

## Rejected generated reference

## Draft explorable game environments

## Supplied game files and new portfolio entries

### Game-specific information flows

- Chicken’s Breakout places four sequential project chapters in the actual scrolling world background. The movement, collision, checkpoint, and enemy descriptions also reference its supplied GameMaker object scripts. Text is scene content, not a detached detail-page overlay. The native player and two-frame enemy remain in use.
- Plasteroids uses a 1000 × 4500 world with three authored depth bands and continuous vertical camera travel. Background/palette changes and level markers are portfolio layout choices, not claims that the original level maps were recovered exactly. Each depth has one source fish carrying an illustrated project page. Fish delivery/drift are authored browser movement, not recovered fin-animation clips.
- Unchanged presentation exports: `assets/game-source/plasteroids-deck/level-one.png` = `ppt/media/image54.png` (slide 10 surface-water art), `level-two.png` = `image65.png` (slide 11 trash art), `fish-swordfish.png` = `image51.png`, `fish-manta.png` = `image50.png`, `fish-eel.png` = `image52.png` (slide 8 enemies, reused in level slides). No photographic inspiration pictures with unclear licenses were imported. Crops are sampled at runtime, with aspect ratio preserved.
- `level-three.png` is unchanged supplied Unity `Sprites/Lvl 3 Backgrounds/Level 3 Background .png`. Its pixels match the presentation's deep-water background (`image68.png`). `squishy-level-2-atlas.png` and `squishy-level-3-atlas.png` plus native `.anim`/`.meta` timing now provide the original deeper-water player colors. Native source pixels share one world scale so a tighter transparent crop does not enlarge deeper characters.
- Cat Eat Rat now uses one rat-eye camera (.12 room units), two cheese pickups, two water guns, and a wall-mounted mouse hole. The collection/deposit loop is Bobby's requested portfolio interaction, not a claimed port of the original game's rules. Primitive low-poly pickup meshes project every base vertex onto the same floor plane as the camera; the aperture contacts its wall/floor intersection. Their geometry/materials are original browser assets. The three `assets/game-props/*.svg` files are supporting original vector studies, not native game exports.
- `assets/game-characters/cat-rat-duo.png` is a generated presentation concept made with built-in OpenAI ImageGen, using the supplied gameplay still only as a style/character reference. It depicts the chunky orange cat and smaller olive-brown rat together. It is not an extracted rig, original game sprite, or CC0 asset. The original demo remains evidence in the water-gun archive note.
- Final generation prompt: transparent full-body low-poly toy-like 3D duo, stocky orange cat on left and much smaller olive-brown rat on right, rat about one-third cat body height, frontal three-quarter level camera, both complete bases resting on the same supporting ground plane, unchanged gameplay-inspired matte faceted style, full tails/feet/ears, no text, scenery, furniture, or props. Output from the built-in tool was copied to the project path above, preserving alpha. Camera/geometry/collection rules were declared and smoke-tested before this artwork was generated.

### Supplement descriptions and native character animations (October 13)

- All five non-lock PowerPoint variants in `Presentation-Plasteriod` were inspected. They describe Plasteroids; no separate game decks were found on the supplied drive. `Plasteroids Final Showcase_Real.pptx` provides the final descriptions: slide 1 credits; 4 premise/rules/goal; 7 Squishy and deeper-water colors; 9–13 levels/boss; 15–18 mechanics/difficulty; 20–21 soundtrack/sound techniques. These facts appear in the game, build, and progression discoveries, with source notes. A local reference copy is retained under `artifacts/game-audit`, outside the public site.
- `assets/game-source/animations/bird-idle-0.png`, `bird-moveRight-{0,1}.png`, and `bird-moveLeft-{0,1}.png` are unchanged original PNGs from `spr_MainBird_stand`, `spr_MainBird_right`, and `spr_MainBird_left`. Frame order and 3 fps flight timing come from the GameMaker `.yy` metadata. The selector and woodland now render these source frames, including native left-facing flight. No replacement wing frames were generated.
- `squishy-atlas.png` is the unchanged `bdubose_SquishyAnimations.png` from the supplied Plasteroids Unity source under `CMU/nhsga/Lightning_Round/NHSGA_Asteroids/LR_asteroids`. Original `.anim` keyframe times, `.meta` sprite IDs, and sprite rectangles drive idle/start/swim/end. Unity's bottom-origin rectangles are translated to canvas coordinates. The selector swims, while the exploration sprite responds to movement. One fixed native alpha-union crop `[40,95,365,165]` avoids rescaling or recentering each frame.
- `breakout-enemy-{0,1}.png` are the original `spr_DeadMan` frames at the source's 2 fps. The enemy appears on the Breakout exploration floor with its complete base supported. The main `spr_player` has one frame; a walking sequence is not invented.
- `cat-eat-rat-character-preview.mp4` is a retained, unused silent 8-second excerpt, starting at 12 seconds, from the supplied gameplay demo. The selector now uses the generated cat-and-rat duo documented above. The full demo remains gameplay evidence in the archive note.
- The other three horror selector characters remain explicitly generated static concepts. Unreal `Chicken_Anim` / `chickenresized_Anim` files were found in the source project copies, but `.uasset` animations cannot be loaded directly by this static browser renderer. No engine animations or compiled binaries are falsely represented as recovered browser clips.
- All imported pixels stay unchanged. `scripts/import-game-animations.py` copies sources and mechanically translates animation metadata into `assets/js/game-animation-data.js`. Animation pauses for menu/hidden states, respects reduced motion, and cleans up on scene exit. Source animations are user-supplied project assets, not licensed as CC0.

### Completed geometry-first browser interpretations

All seven game detail routes now enter interactive portfolio worlds. These are original browser interpretations, not ports of the supplied GameMaker/Unity/Unreal executables and not replicas of the full original level maps. The geometry, collision bounds, camera eye levels, and traversal were implemented and checked before missing materials were generated. `?geometry=1` retains a placeholder-only QA view.

- `assets/game-source/bird-forest.png`, `bird-flight.png`, `bird-standing.png`, `bird-nest.png`, and `bird-tree.png` are unchanged PNGs copied from the supplied GameMaker project. Standing uses `spr_MainBird_stand`; flight uses the first `spr_MainBird_right` frame, matching the observed daytime game palette; scenery uses `spr_ForestBack`, `spr_nest`, and `spr_Tree1D`. The renderer samples the tree's native alpha bounds `[13,499,874,1618]` so its visible roots meet the ground plane without transparent-padding drift. The real standing sprite is now also the Room and selector bird. Previous generated woodpecker artwork is no longer used for One Last Bird.
- `breakout-player.png` and `breakout-wall.png` are unchanged `spr_player` and `Spr_wall` PNGs from the supplied Breakout folder. Source code confirms horizontal movement, jump, gravity, and platform collisions. The browser world uses those mechanics with a portfolio-specific traversable layout, not the complete game.
- `plasteroids-squishy.png` is the unchanged embedded `ppt/media/image44.png` from the supplied showcase. Its transparent bounds are `[40,70,285,285]`; the renderer samples that source rectangle without editing the original. Swimming is intentional, not a grounding error.
- `unreal-wall.png` is the supplied Unreal project's `HospitalCorridor.png`. It is used as a corridor wall material in a simplified first-person browser interpretation; the browser does not run Unreal Engine or claim engine-equivalent rendering.
- Built-in OpenAI ImageGen supplied `plasteroids-ocean.png`, `night-wall.png`, and `kitchen-wall.png` only after movement/geometry checks. Prompts specify an orthographic teal/navy ocean layer without characters/UI, a straight-on black/red/checker wall tile, and a straight-on blue-teal/wood kitchen wall tile, matching the supplied gameplay references. The raycasting engine projects wall textures at the actual camera scale; materials never determine collision geometry. Source PNGs and generated materials are distinguished here and are not represented as CC0.
- The earlier Cat/Rat split-camera interpretation is superseded by the single rat-eye camera and collection loop documented above. Its original demonstration is discoverable through a water-gun archive pickup. Horror scenes expose first-person room discoveries; their layouts are portfolio-specific.
- The older image-first generated panoramas remain unused drafts. No compiled game binaries are shipped by the site.

- Cat Eat Rat, Rat Fight Back: original Windows Unity build in `/Volumes/adol U300/CatEatRat_Final/`; supplied recording `/Volumes/adol U300/Cat Eat Rat, Rat Fight Back Demo.mp4`. `assets/game-evidence/cat-eat-rat-gameplay.png` is an unaltered frame extracted at 12 seconds. `cat-eat-rat-demo.mp4` is a 960-pixel-wide browser-compatible transcode of the complete recording. The selector uses an explicitly marked generated duo concept, not recovered character exports. Contribution roles are not inferred.
- Plasteroids!: supplied presentation and builds in `/Volumes/adol U300/Presentation-Plasteriod/`. The inspected showcase credits artists Bennett, Claire, Angela; programmers Mason, Bobby; and sound designer Avery. `plasteroids-gameplay.png` is an unaltered frame from `Final_Demo.mp4` at 18 seconds; `plasteroids-demo.mp4` is a browser-compatible transcode of the complete recording. The selector uses the native Squishy animation atlas. Only the verified pixel-art deck images explicitly listed above are runtime assets; the complete deck remains private.
- The supplied One Last Bird project contains actual daytime sprites under `/Volumes/adol U300/The-last-bird-/the-last-brid/sprites/spr_MainBird_stand/`; the previous missing-source assessment is superseded. The Room now uses this source with measured foot contacts.
- `/Volumes/adol U300/Chickens-Breakout/` contains a GameMaker project and player/chicken sprite sources. `/Volumes/adol U300/Chicken's Nightmare UE5/` contains an Unreal project. `/Volumes/adol U300/Chicken's Nightmare Demo/` is a Windows packaged build, not a new game entry.
- These user-supplied files are not represented as CC0. Source binaries remain on the drive and are not published or offered for download. No executable was launched during this import.

- `assets/game-worlds/one-last-bird.png`, `chickens-breakout.png`, `five-nights-at-chickens.png`, `chickens-nightmare-gamemaker.png`, and `chickens-nightmare-ue5.png` were generated from cover references for an earlier prototype. They are unused drafts, not runtime assets, original game artwork, or screenshots. The geometry-first engine replaces that prototype.
- Prompt set: full-bleed 16:9 environments with grounded, clear foreground travel space and no UI/text; pixel woodland for Bird, minimal gold platform world for Breakout, gritty security office for Five Nights, flat dark pixel chicken store for GameMaker, and realistic restaurant corridor for UE5. These initial interpretations are not approved final art directions.
- Actual source review found `https://bigfatcat79.itch.io/onelastbird`, `https://bigfatcat79.itch.io/chickens`, and `https://bigfatcat79.itch.io/chickens-nightmare`. One Last Bird gameplay was entered and its Space flight tutorial tested: bright layered green forest, tree/nest scenery, and a chunky pixel bird. The two chicken games' menus were inspected, but gameplay review was interrupted by browser-control timeouts. Breakout and the UE5 build remain unavailable without their exact links/builds. The cover-based drafts must not be treated as accurate game-style matches.

- The OpenArt-generated room concept was rejected and is not used in the Home Room, included in the public asset tree, or shipped. It is preserved only as an archived rejected direction in the Figma file so it cannot be mistaken for an approved production asset.
