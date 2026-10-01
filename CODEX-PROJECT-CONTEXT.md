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

The Home Room has five roving-focus object links with arrow-key navigation in addition to normal Tab/Enter and touch behavior. A consistent, always-visible cyan pixel glow outlines each clickable object; hover and keyboard focus strengthen the glow and reveal a compact route name with an `[E]` prompt. The five mappings are Games → Bird, Films → Camera, Research → Book, Music → Guitar, and AI → Computer. Parallax is isolated on inner wrappers so it does not overwrite object or NPC transforms.

Page changes use a brief shared transition. Each creative category uses a different navigation metaphor and color system; professional pages stay more restrained while sharing the same shell. Carousels and browsers support buttons, keyboard commands, and touch swipes. Reduced-motion rules disable nonessential transforms, smooth scrolling, and continuous effects.

The Home Room uses one coherent 48-pixel asset family rather than CSS-drawn furniture or a generated panorama. The primary third-party family is NettySvit's [Cool School tileset](https://opengameart.org/content/cool-school-tileset), licensed [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). Its walls, floor, window, furnishings, book, and computer were normalized through Adobe with brightness -4, contrast +8, and saturation -12, then cropped without introducing unrelated imagery. Camera, guitar, rug, and lighting art are original portfolio assets matched to that family.

The visual source of truth is the [Home Room Pixel Source Board in Figma](https://www.figma.com/design/m7vGVrTAxZHLCVSBbMLpvu/Bobby-Portfolio-Home-Room-Visual-Direction?node-id=7-3). It defines the desktop and mobile compositions, camera, object positions, bird walkable region, foreground/background separation, lighting, and HUD placement. Production exports remain layered so background, furniture, interactables, bird, foreground occluders, and lighting can move or occlude independently.

The actual One Last Bird sprite was not found after auditing the project files and Git history. The current bird sheet is an original, explicitly temporary animation proxy with idle, walk-left, and walk-right states; it is not named as or represented to be the missing final sprite. The rejected OpenArt-generated room concept is not used or shipped.

## Content inventory

The shared model contains 14 showcase records: five games, three films, one music project, two research records, and three AI tools. It also preserves the existing 10 timeline entries, biography, four statistics, five contact channels, two research notes, and four Google Drive media links.

The title “My GitHub Profile” is deliberately preserved. The resume route deliberately contains no fabricated credentials. Game download/store links, full paper content, detailed credits, and project-process material were not present in the source and are not invented.

## Assets and audio

Existing covers and menu-object PNGs remain in place. `CREDITS.md` records known provenance limits, the Home Room source and derivative status, external media, and the room-tone license. The Home Room includes a self-hosted 31-second CC0 MP3, “Roomtone Bedroom Yew” by leonelmail (Freesound #329569), at low volume. Sound is off by default; the global control enables the loop and brief synthesized UI tones only after a user gesture, persists the preference locally, fades the loop, pauses while the page is hidden, and fails silently if media is unavailable. Category and professional pages keep interface tones only.

This art direction remains limited to the Home Room and is not propagated into Games, Films, Research, Music, AI, or the professional pages. Bobby subsequently requested that the Home HUD removal and clickable-object glow update be published through the existing Netlify workflow.

## Validation

`tests/rendered-html.test.mjs` validates every index and project detail document, shared modules, inventory counts, and accessibility hooks. Normal repository checks are `npm test`, `npm run lint`, and `npm run build`. Use a static server rooted at `public/portfolio` to validate the actual Netlify path model and browser layouts on desktop and mobile.
