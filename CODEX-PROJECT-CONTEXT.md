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
    ├── js/audio.js               # Opt-in synthesized UI tones and saved preference
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

The fixed HUD provides Back (where relevant), Room, Player Menu, and Sound controls. The pause-style Player Menu links to Projects, Skills & Experience, Resume, and About & Contact. It is a keyboard-accessible modal with focus trapping, focus return, and Escape support. Essential destinations use native links and buttons with focus-visible treatments and touch-sized controls.

Page changes use a brief shared transition. Each creative category uses a different navigation metaphor and color system; professional pages stay more restrained while sharing the same shell. Carousels and browsers support buttons, keyboard commands, and touch swipes. Reduced-motion rules disable nonessential transforms, smooth scrolling, and continuous effects.

The home environment is original DOM/CSS artwork supplemented by existing repository object assets. Final panoramic room artwork can replace the CSS art layer later without changing routes or interaction logic.

## Content inventory

The shared model contains 14 showcase records: five games, three films, one music project, two research records, and three AI tools. It also preserves the existing 10 timeline entries, biography, four statistics, five contact channels, two research notes, and four Google Drive media links.

The title “My GitHub Profile” is deliberately preserved. The resume route deliberately contains no fabricated credentials. Game download/store links, full paper content, detailed credits, and project-process material were not present in the source and are not invented.

## Assets and audio

Existing covers and menu-object PNGs remain in place. `CREDITS.md` records known provenance limits and external media. No external sound files ship. Sound is off by default and may be enabled through the global control; the site then synthesizes short, low-volume UI tones with the Web Audio API. The preference is stored locally, and the audio context pauses when the page is hidden. There is no audible autoplay.

The room backdrop is currently CSS/HTML art. The attempted generated concept-art pass produced no artifact because the image service was unavailable, so no AI-generated image was silently substituted or added to the repository.

## Validation

`tests/rendered-html.test.mjs` validates every index and project detail document, shared modules, inventory counts, and accessibility hooks. Normal repository checks are `npm test`, `npm run lint`, and `npm run build`. Use a static server rooted at `public/portfolio` to validate the actual Netlify path model and browser layouts on desktop and mobile.
