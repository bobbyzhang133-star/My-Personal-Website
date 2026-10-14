# Personal Website — Project Context

## Purpose and production model

Bobby Zhang's portfolio is a game-inspired, multi-page static website for games, films, music, research, AI tools, and professional information. Netlify remains the production host and publishes `public/portfolio` directly. The vinext/React layer is retained as legacy/local infrastructure and is not the production portfolio application.

Do not deploy unless Bobby explicitly requests it.

## Active architecture

```text
public/portfolio/
├── index.html                    # Interactive creative-studio room
├── games/                        # Character select + seven explorable detail routes
├── films/                        # Film strip + three detail routes
├── music/                        # Recording studio + one detail route
├── research/                     # Open book + two detail routes
├── ai/                           # Computer workstation + three detail routes
├── projects/index.html           # Filterable Mission Board, all 16 projects
├── skills-experience/index.html  # Skill Tree + 10-entry Quest Log
├── resume/index.html             # Dossier; no invented resume data
├── about/index.html              # Player Profile, stats, and contact links
├── CREDITS.md
└── assets/
    ├── css/site.css              # Shared tokens, themes, animation, responsive rules
    ├── js/content.js             # Canonical categories, projects, experience, profile
    ├── js/site.js                # Rendering and page-specific interactions
    ├── js/audio.js               # Opt-in UI tones + Home Room ambience
    ├── audio/                    # Licensed, self-hosted Home Room ambience
    ├── room/                     # Home-only layered pixel-art exports
    ├── covers/
    └── menu-objects/
```

All route documents are intentionally thin. They identify the page and load the same CSS and JavaScript modules. `content.js` is the source of truth for repeated project/category data; category pages and the Mission Board do not duplicate project records.

Absolute paths such as `/assets/css/site.css` are correct for Netlify because `public/portfolio` is its publish root. For visual verification, serve `public/portfolio` as the web root.

## Routes and page metaphors

- `/` — layered 2.5D creative room with five interactive objects
- `/games/` — character-select carousel
- `/films/` — horizontal film strip and active-film details
- `/music/` — recording-studio setlist with user-initiated media loading
- `/research/` — open-book chapter browser
- `/ai/` — computer workstation and app-module selector
- `/projects/` — filterable Mission Board
- `/skills-experience/` — Skill Tree and Quest Log
- `/resume/` — professional dossier shell
- `/about/` — Player Profile and contact directory

Every one of the 16 showcase records has a local detail route. Game detail routes enter explorable portfolio interpretations; other details keep the global HUD and available media links.

## Shared systems

The fixed HUD provides Back, Room, Player Menu, and Sound controls on interior routes. On the Home Room, the website-style top HUD is intentionally removed; compact in-room Menu and Sound controls preserve the same functionality without covering the game composition. The pause-style Player Menu links to Projects, Skills & Experience, Resume, and About & Contact. It is a keyboard-accessible modal with focus trapping, focus return, and Escape support. Essential destinations use native links and buttons with focus-visible treatments and touch-sized controls.

The Home Room has five roving-focus object links with arrow-key navigation in addition to normal Tab/Enter and touch behavior. A consistent, always-visible cyan pixel glow outlines each clickable object; hover and keyboard focus strengthen the glow and reveal a compact route name with an `[E]` prompt. The five mappings are Games → Bird, Films → Camera, Research → Book, Music → Guitar, and AI → Computer. The Room is intentionally static under pointer movement so the composition stays stable and comfortable to navigate.

Room-to-category changes now read as player movement through the Room rather than an object flying toward the viewer. The complete `.room-world` performs one camera dolly/pan toward the visible object artwork at a meaningful 1.56–1.78 scale, so walls, floor, supports, neighboring furniture, shadows, and the clicked object move together. Only after the camera lands does the object-local category interface appear with a short non-spatial reveal; category stages are never scaled out of tiny props. Returning closes the local interface first, reconnects the same focused Room state, and restores the camera so the player appears to step backward. The whole viewport never fades or swaps to a detached page, and direct category URLs build the same focused Room backdrop before mounting. For AI, the same open laptop keeps the live interface directly in its screen and its desk remains visible beneath it. History is committed before animation and stale transitions are cancelled so quick Back/Room actions cannot leave the URL and scene out of sync. Professional pages stay more restrained while sharing the same shell. Carousels and browsers support buttons, keyboard commands, and touch swipes. Reduced motion skips spatial travel.

Games no longer invents a rectangular console around the bird. The exact focused Room bird stays visible as the shared physical object while a transparent character-selection HUD appears around it. The selector uses five generated transparent pixel-art character concepts derived from the real project covers; they are selector presentation art rather than recovered production sprites. The actual One Last Bird sprite remains missing, Chicken's Breakout retains its minimal red circular identity, and the GameMaker/UE5 Nightmare variants intentionally represent the same core red-eyed shadow chicken with different rendering treatment.

The Home Room uses one coherent 48-pixel asset family rather than CSS-drawn furniture or a generated panorama. The primary third-party family is NettySvit's [Cool School tileset](https://opengameart.org/content/cool-school-tileset), licensed [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Its walls, floor, window, furnishings, book, and computer were normalized through Adobe with brightness -4, contrast +8, and saturation -12, then cropped without introducing unrelated imagery. Camera, guitar, rug, and lighting art are original portfolio assets matched to that family.

The visual source of truth began with the [Home Room Pixel Source Board in Figma](https://www.figma.com/design/m7vGVrTAxZHLCVSBbMLpvu/Bobby-Portfolio-Home-Room-Visual-Direction?node-id=7-3). The implemented composition was subsequently revised toward a lower, forward-facing first-person viewpoint: the wall/floor junction is 68% on desktop and 64% on mobile, furniture and interactive props were enlarged to fill the frame, and the rug is foreshortened. Production exports remain layered so background, furniture, interactables, bird, foreground occluders, contact shadows, and lighting can move or occlude independently.

Grounding is now a semantic geometry system rather than a collection of hand-tuned bottom offsets. `assets/js/scenes/room-geometry.js` records each sprite's intrinsic dimensions and explicit source-space contact points for every leg, foot, base segment, or supporting edge. Floor furniture is aligned to explicit rear, workstation, middle, and front depth planes (70.5%, 72%, 76.5%, and 88% on desktop; 66.5%, 68%, 75%, and 80% on mobile). The bird has its own walk plane at 85% desktop and 79.5% mobile, and its patrol remains lateral so all foot markers stay on that plane. Supported objects are aligned to semantic surfaces on their actual furniture, and every contact point must remain inside the complete supporting surface; touching only one edge or the lowest non-transparent pixel does not count as support. Hidden sprites are excluded from validation and their shadows are suppressed; on mobile, the globe is explicitly remapped to the visible left bookcase instead of a hidden support. This keeps the camera on the low shelf, computer on the desk, book on the foreground counter, globe on the bookcase, papers on the shelf, chair on both feet, and guitar on its full base instead of visually hanging from a single corner.

Ground-plane contact shadows are generated from the full footprint width only after geometric alignment, so they reinforce depth without substituting for correct placement. The runtime recalculates geometry after image load and resize, gates the ready state on zero contact failures and support containment, and updates the AI category's desk support anchor. Newly rendered or measured transition rooms are aligned before camera scaling; captured backdrops preserve their already-correct local translations instead of being remeasured in transformed screen coordinates. The enlarged AI laptop aligns the meaningful visible base from an alpha-threshold scan rather than an almost-transparent cleanup fringe. Direct category loads, forward morphs, reverse transitions, and returning to the Room therefore share the same support geometry. Add `?grounding-guides` to a Room URL to expose the named depth planes and floor boundary during visual review.

The persistent rule `.cursor/rules/image-dimension-grounding-checks.mdc` makes this approach mandatory for future image work. It requires a declared camera, horizon, ground plane, vanishing point, scale key, intrinsic-size and transparent-padding audit, full-footprint/support-polygon check, perspective-aware contact points, temporary guide overlays, and desktop/mobile/transition screenshots before completion or publishing. Its drawing guidance is grounded in Adobe's perspective-grid documentation and Autodesk's perspective-guide, floor-contact-marker, and ground-shadow documentation; contact shadows remain a verification cue, never the placement mechanism. The companion rule `.cursor/rules/room-camera-travel-continuity.mdc` requires Room-world camera travel, stable shared-object identity, object-local UI reveal after arrival, and the exact reverse order on exit; it explicitly forbids scaling a category container out of a small prop.

The supplied external-drive GameMaker source contains the actual One Last Bird sprites. Its daytime standing sprite is now used in Home and character selection; its flight sprite is used in the explorable woodland. This supersedes the earlier temporary bird and generated selector concept. The rejected OpenArt-generated room concept is not used.

## Content inventory

The shared model contains 16 showcase records: seven games, three films, one music project, two research records, and three AI tools. It also preserves the existing 10 timeline entries, biography, four statistics, five contact channels, two research notes, and four Google Drive media links.

The title “My GitHub Profile” is deliberately preserved. The resume route deliberately contains no fabricated credentials. Game download/store links, full paper content, detailed credits, and project-process material were not present in the source and are not invented.

## Assets and audio

Existing covers and menu-object PNGs remain in place. `CREDITS.md` records known provenance limits, the Home Room source and derivative status, external media, and the room-tone license. The Home Room includes a self-hosted 31-second CC0 MP3, “Roomtone Bedroom Yew” by leonelmail (Freesound #329569), at low volume. Sound is off by default; the global control enables the loop and brief synthesized UI tones only after a user gesture, persists the preference locally, fades the loop, pauses while the page is hidden, and fails silently if media is unavailable. Category and professional pages keep interface tones only.

The licensed Home Room furniture remains limited to the Room itself, except for explicit same-object derivatives used to maintain category continuity. The AI category uses Bobby's selected straight-on seated perspective derived from the exact CC0 Room laptop at every breakpoint; portrait layouts use a closer crop of that same asset instead of a different computer. The source sprite remains unchanged in the Room, and alternate mobile, wide, and three-quarter studies are retained but not runtime-loaded. Its pixel palette, tiled surroundings, and physical-object framing continue through Games, Films, Research, Music, and AI. The professional pages retain their conventional readable layouts. Bobby subsequently requested that the Home HUD removal and clickable-object glow update be published through the existing Netlify workflow.

## Validation

Game-specific revision supersedes the generic four-station model for three titles. `game-experiences.js` renders Breakout's four ordered in-background chapters, Plasteroids' continuous vertical three-depth map and one fish-delivered illustrated page per level, and Cat Eat Rat's single rat-eye collection/deposit loop. `experience-state.js` owns chapter order, depth ranges, object positions, rat inventory invariants, and fully grounded pickup mesh geometry. Actual presentation PNGs and deeper Squishy native animation atlases are reused. Cat/Rat selection uses an explicitly generated duo concept, not footage as its representative. Two cheeses and two water guns each unlock their own note; returning carried cheese to the wall/floor-attached hole unlocks another. Duplicate pickup/deposit rewards are rejected, storage is validated, and a restart action is available. Accessible destination navigation remains an alternative to keyboard/touch travel. No other category or professional-page redesign is included, and this is local-only.

Verification for this revision: all 23 route/state/geometry regression tests, focused ESLint, release synchronization, diff whitespace checks, and the production build passed. Browser review covered all four rightward Breakout chapters, ocean descent through all three levels and page folding, both cheeses and both water guns followed by a two-cheese home deposit, the paired selector, and the current Room return. Portrait 390 × 844 and landscape 844 × 390 were inspected alongside desktop. Screenshots are retained under `artifacts/game-audit`; no deployment was performed. These scenes remain portfolio interpretations, not original executable ports.

October 13 supplement follow-through: the five Plasteroids PowerPoint variants were read and the final deck's verified gameplay, progression, production, audio, and credits now populate canonical `gameDetails` in `content.js` and the exploration discoveries. No decks for other games were found. A private local deck copy is retained in `artifacts/game-audit` so these references survive drive disconnection. `game-animation.js` uses unchanged native Bird flight/standing frames and Squishy idle/start/swim/end atlas frames with original timing and stable alpha-union crops. Games selection animates Bird and Squishy and shows actual Cat/Rat motion footage. The Breakout world includes its original two-frame enemy, but its one-frame player remains unchanged. Unreal animation assets require an engine export before browser use; horror concepts remain static and clearly generated. Reduced motion, hidden/menu pause, fallback artwork, and scene cleanup are mandatory. No new character artwork was generated or deployed.

Geometry-first completion supersedes the opt-in panorama prototype: all seven game detail routes now enter `game-world.js` automatically. `world-engine.js` owns world-unit geometry, full-footprint collision, reachable discovery destinations, flight/swimming, platform jumping, first-person projection, and Cat/Rat split eye-level cameras. Artwork is applied only after those models are checked; `?geometry=1` keeps a placeholder-only QA mode. Actual supplied bird/Breakout sprites are reused, the real bird replaces the generated Room/selector bird, and the recovered Squishy sprite is sampled at its native alpha bounds. Generated ocean/wall materials are mapped to these layouts and documented in CREDITS; old generated panoramas are not runtime-loaded. Each scene has four discoverable records, keyboard/touch controls, modal reading/media, a discovery-navigation alternative, pause-on-menu/hidden behavior, and explicit Characters/Room routes. These are portfolio interpretations, not executable ports, original map replicas, or native UE5 rendering. Source demos remain playable in the archive discoveries. Professional pages are unchanged apart from shared project inventory.

Supplied-game import: Games now has seven entries and the complete portfolio has sixteen projects. Cat Eat Rat, Rat Fight Back and Plasteroids! have selector entries, detail routes, authentic gameplay stills, and self-hosted demo videos extracted/transcoded from the supplied external-drive recordings. Plasteroids credits and premise come from the supplied showcase; Cat Eat Rat contribution roles remain unconfirmed. Archive counts are data-driven. The drive also supplies actual One Last Bird sprites, Breakout GameMaker source, and the Unreal Nightmare project; the prior missing-source status is superseded. Windows executables were not run or shipped. Geometry-first exploration prototypes and final art are still separate unfinished work; this import adds the two new games without presenting the generic generated environments as completed game experiences.

Earlier exploration prototype (superseded): the opt-in `?explore=1` side-scroller used cover-based panoramas. Those unused drafts remain in `assets/game-worlds/`; they are not approved or runtime-loaded. The supplied files now drive seven normal-route geometry-first interpretations as described above. Native Windows builds were not run; supplied footage/source review is distinct from native gameplay testing.

Earlier October 12 character update (superseded): the generated woodpecker replaced the green proxy. The supplied daytime GameMaker bird now replaces that concept in Home and selection; the geometry table uses its actual 192 × 192 frame and source-space foot contacts. The visible Select game link follows the active character and opens its exploration route.

Release/navigation repair: all HTML entry documents (including 14 detail pages and all professional pages) and relative runtime module imports now share a content-derived revision generated by `scripts/sync-portfolio-release.mjs`. Its `--check` mode blocks mixed or stale releases in the regression suite. Re-run synchronization after JS/CSS edits. `scripts/serve-portfolio.py` provides no-store local preview headers; Netlify `_headers` requires revalidation. Back-forward-cache restores reload the document, and the Room action always navigates explicitly to Home rather than calling browser Back. The persistent `.cursor/rules/portfolio-release-navigation.mdc` governs these checks.

October 9 annotation revision: AI uses a much closer whole-world camera approach, with the seated laptop's full base constrained to 88% of the measured desk surface and centered over that surface. Desktop intentionally crops the keyboard so the display is the primary working area. Games now centers camera travel on the bird, replaces its focused silhouette with one selected character concept, and exposes only previous/next arrows; clicking the character opens its project. Descriptions remain available to assistive technology rather than covering the room. These revisions are local previews, not a deployment.

`tests/rendered-html.test.mjs` validates every index and project detail document, shared modules, inventory counts, accessibility hooks, semantic grounding contracts, transition alignment hooks, and the persistent image-dimension rule. Normal repository checks are `npm test`, `npm run lint`, and `npm run build`. Use a static server rooted at `public/portfolio` to validate the actual Netlify path model and browser layouts on desktop and mobile. A grounding review must inspect the named depth planes, every declared contact point across each complete base, support-surface containment for elevated props, the full-width contact shadows, and both directions of the shared-object transition at the normal desktop viewport, 390 × 844 portrait, and 844 × 390 landscape. No deployment was performed.
