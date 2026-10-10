# Personal Website — Project Context

## Purpose and production model

Bobby Zhang's portfolio is a game-inspired, multi-page static website for games, films, music, research, AI tools, and professional information. Netlify remains the production host and publishes `public/portfolio` directly. The vinext/React layer is retained as legacy/local infrastructure and is not the production portfolio application.

Do not deploy unless Bobby explicitly requests it.

## Active architecture

```text
public/portfolio/
├── index.html                    # Interactive creative-studio room
├── games/                        # Character select + five detail routes
├── films/                        # Film strip + three detail routes
├── music/                        # Recording studio + one detail route
├── research/                     # Open book + two detail routes
├── ai/                           # Computer workstation + three detail routes
├── projects/index.html           # Filterable Mission Board, all 14 projects
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

Every one of the 14 showcase records has a local detail route. Those detail pages keep the global HUD and expose any available external launch or media link.

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

The actual One Last Bird sprite was not found after auditing the project files and Git history. The current bird sheet is an original, explicitly temporary animation proxy with idle, walk-left, and walk-right states; it is not named as or represented to be the missing final sprite. The rejected OpenArt-generated room concept is not used or shipped.

## Content inventory

The shared model contains 14 showcase records: five games, three films, one music project, two research records, and three AI tools. It also preserves the existing 10 timeline entries, biography, four statistics, five contact channels, two research notes, and four Google Drive media links.

The title “My GitHub Profile” is deliberately preserved. The resume route deliberately contains no fabricated credentials. Game download/store links, full paper content, detailed credits, and project-process material were not present in the source and are not invented.

## Assets and audio

Existing covers and menu-object PNGs remain in place. `CREDITS.md` records known provenance limits, the Home Room source and derivative status, external media, and the room-tone license. The Home Room includes a self-hosted 31-second CC0 MP3, “Roomtone Bedroom Yew” by leonelmail (Freesound #329569), at low volume. Sound is off by default; the global control enables the loop and brief synthesized UI tones only after a user gesture, persists the preference locally, fades the loop, pauses while the page is hidden, and fails silently if media is unavailable. Category and professional pages keep interface tones only.

The licensed Home Room furniture remains limited to the Room itself, except for explicit same-object derivatives used to maintain category continuity. The AI category uses Bobby's selected straight-on seated perspective derived from the exact CC0 Room laptop at every breakpoint; portrait layouts use a closer crop of that same asset instead of a different computer. The source sprite remains unchanged in the Room, and alternate mobile, wide, and three-quarter studies are retained but not runtime-loaded. Its pixel palette, tiled surroundings, and physical-object framing continue through Games, Films, Research, Music, and AI. The professional pages retain their conventional readable layouts. Bobby subsequently requested that the Home HUD removal and clickable-object glow update be published through the existing Netlify workflow.

## Validation

`tests/rendered-html.test.mjs` validates every index and project detail document, shared modules, inventory counts, accessibility hooks, semantic grounding contracts, transition alignment hooks, and the persistent image-dimension rule. Normal repository checks are `npm test`, `npm run lint`, and `npm run build`. Use a static server rooted at `public/portfolio` to validate the actual Netlify path model and browser layouts on desktop and mobile. A grounding review must inspect the named depth planes, every declared contact point across each complete base, support-surface containment for elevated props, the full-width contact shadows, and both directions of the shared-object transition at the normal desktop viewport, 390 × 844 portrait, and 844 × 390 landscape. No deployment was performed.
