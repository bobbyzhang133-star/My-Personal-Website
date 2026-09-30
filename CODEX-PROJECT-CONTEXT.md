# Personal Website - Project Context

## 1. Project Purpose

This repository contains Bobby Zhang's personal portfolio for game development,
film, music, research, and AI tools. Game development is the primary interest.
The current site begins to use game language and a category-selection
"loadout," but the content underneath is still a conventional long-form
portfolio.

The intended long-term direction is to make navigation and interaction feel
like a game while keeping the portfolio practical, readable, accessible, and
fast. This document describes the current implementation only; it does not
implement the future game systems.

## 2. Technology Stack

### Runtime and application framework

- React `19.2.6` and React DOM `19.2.6` are installed.
- The app uses `vinext` `1.0.0-beta.2`, a Vite-based implementation of
  Next-compatible App Router conventions.
- Vite `8.0.13` is the build system.
- TypeScript `5.9.3` is configured in strict, no-emit mode.
- A Cloudflare Worker entry point is provided by `worker/index.ts`.
- `@cloudflare/vite-plugin` and Wrangler provide the local/deployment worker
  environment.
- `@openai/sites-vite-plugin` and `.openai/hosting.json` configure Sites
  integration, retained as legacy infrastructure.
- Netlify is the production host. `netlify.toml` publishes
  `public/portfolio` directly from the `main` branch.

### UI and styling

- The React shell uses plain CSS in `app/globals.css`.
- The actual portfolio is a standalone HTML document with embedded CSS and
  vanilla JavaScript in `public/portfolio/index.html`.
- There is no CSS framework in active use. Tailwind/PostCSS is installed and
  configured, but the portfolio does not use Tailwind classes.
- There is no component library, icon library, animation library, or game
  engine in active use.

### Data and optional infrastructure

- Drizzle ORM is installed, with a D1 adapter helper in `db/index.ts`.
- `db/schema.ts` is intentionally empty.
- `.openai/hosting.json` sets both D1 and R2 to `null`; the portfolio currently
  has no database or object-storage dependency.
- `examples/d1/` contains an opt-in notes API example. It is not routed into the
  active application because it lives under `examples/`, not the root `app/`.
- `app/chatgpt-auth.ts` provides optional ChatGPT authentication helpers, but
  no active page imports them.

## 3. Repository Structure

```text
.
├── app/
│   ├── layout.tsx                    # Root HTML shell and global metadata
│   ├── page.tsx                      # Root route; embeds the portfolio iframe
│   ├── globals.css                   # Full-viewport iframe shell styling
│   ├── chatgpt-auth.ts               # Unused optional auth helpers
│   └── _sites-preview/               # Unused starter loading skeleton
├── public/
│   ├── portfolio/
│   │   ├── index.html                # Actual portfolio UI and behavior
│   │   └── assets/
│   │       ├── covers/               # Seven project/film cover PNGs
│   │       └── menu-objects/          # Seven category object PNGs
│   ├── favicon.svg
│   └── file.svg, globe.svg, window.svg
├── worker/index.ts                   # Cloudflare/vinext request entry point
├── db/                               # Unused D1/Drizzle scaffold
├── drizzle/                          # Empty migration journal
├── examples/d1/                      # Unused example API and schema
├── tests/rendered-html.test.mjs      # Stale starter-skeleton tests
├── .openai/hosting.json              # Sites project, no D1/R2 bindings
├── netlify.toml                      # Production static hosting configuration
├── vite.config.ts                    # vinext, Sites, Cloudflare plugins
├── next.config.ts                    # Empty Next-compatible config
├── tsconfig.json                     # Strict TypeScript configuration
├── eslint.config.mjs                 # JS/TS/React/a11y/Next lint rules
├── postcss.config.mjs                # Tailwind PostCSS plugin (unused by site)
├── package.json                      # Scripts and dependencies
├── package-lock.json                 # npm lockfile
├── pnpm-lock.yaml                    # pnpm lockfile
├── README.md                         # Setup and repository summary
└── AGENTS.md                         # Design and local-first workflow guidance
```

Two root PNGs, `games-yellow-card-polish-preview.png` and
`m3-color-polish-preview.png`, are design snapshots rather than runtime assets.

## 4. Application Architecture

The repository has two application layers, but Netlify production hosting
serves the standalone portfolio directly:

```text
Netlify production
└── public/portfolio/index.html

Legacy/local vinext shell
└── Cloudflare Worker / vinext
    └── App Router root: app/page.tsx
        └── Full-screen iframe: /portfolio/index.html
            └── Standalone portfolio document
                ├── Embedded CSS (two style tags)
                ├── Static HTML content
                ├── Local PNG assets
                ├── Remote Google Drive video embeds
                └── One inline vanilla-JavaScript block
```

On Netlify, `public/portfolio/index.html` is served at `/`. The relative asset
paths therefore resolve without the iframe shell. The legacy/local vinext path
still uses `app/layout.tsx` for the outer document and `app/page.tsx` to render
`/portfolio/index.html` in a viewport-filling iframe.

The active portfolio is therefore not composed from React components. Its
sections, cards, styles, and event handlers are all coupled inside the
3,177-line `public/portfolio/index.html` file. React state, React context, and
the installed database/auth scaffolds do not participate in the portfolio.

## 5. Pages / Areas

There is one active application route, `/`, and one directly served portfolio
document, `/portfolio/index.html`.

The portfolio document has this actual content tree:

```text
Portfolio document: public/portfolio/index.html
├── Fixed top navigation (#nav)
│   ├── Brand: "Bobby Zhang - Creative loadout"
│   └── Choose Path button (#menuToggle)
├── Full-screen category selector (#categoryMenu)
│   ├── Featured category stage
│   └── Seven category choices
├── Hero
│   ├── Name and typed creative objective
│   └── Discipline/tool/status metadata
├── Games (#games)
│   └── Five project cards
├── Films (#films)
│   └── Three film cards; two inject Drive video players on click
├── BandDream (#banddream)
│   └── Two always-embedded Google Drive videos
├── Research (#research)
│   ├── Two paper/profile cards
│   ├── Three AI-tool cards
│   └── Current research notes
├── About (#about)
│   ├── Biography
│   └── Four numerical highlights
├── Contact (#contact)
│   └── Email, phone, GitHub, HuggingFace, and itch.io links
├── Now & Next (#now)
│   └── Ten-row experience/current-work timeline
└── Footer
```

The following internal detail links are present in the HTML but their files do
not exist in this repository:

- `public/portfolio/games/one-last-bird.html`
- `public/portfolio/games/chickens-breakout.html`
- `public/portfolio/games/five-nights-at-chickens.html`
- `public/portfolio/games/chickens-nightmare-gamemaker.html`
- `public/portfolio/games/chickens-nightmare-ue5.html`
- `public/portfolio/research/gamification.html`

The Historical War Vehicles card uses `href="#"`, so it returns to the top of
the portfolio rather than opening a detail page.

## 6. Navigation System

### Main navigation

The fixed top bar contains only the brand and the `Choose Path` button.
`setMenu()` in `public/portfolio/index.html` opens or closes the category
selector by changing classes, `aria-expanded`, `aria-hidden`, backdrop state,
body overflow, and focus.

On a clean portfolio URL with no hash, `setMenu(true, false)` automatically
opens the selector. A URL that already contains a section hash does not reopen
it.

### Category selection

Seven `.category-choice` buttons contain the category manifest in `data-*`
attributes:

- target hash
- title
- path/status line
- description
- featured art path and alt text
- accent color

`selectCategory()` reads those attributes and updates the selected button,
accent color, featured image, text, and `Enter [category]` link. This state is
ephemeral DOM state; it is not stored in React, the URL, local storage, or a
database until the visitor activates the Enter link.

### Pointer and keyboard controls

- Click, hover, or focus selects a category.
- Arrow keys move through the category list.
- Home and End select the first or last category.
- Escape closes the selector.
- The close button and backdrop also close it.
- Closing returns focus to `Choose Path` when appropriate.
- Activating `Enter [category]` follows a hash link and closes the selector.
- The UI says "Enter to select," but Enter on a category button only triggers
  that button's selection click. It does not enter the section; the separate
  Enter link must be activated.

### Scrolling and section transitions

- Hash links use normal browser anchor scrolling; there is no custom smooth
  scroll controller or scene transition system.
- `IntersectionObserver` adds `.in` to `.reveal` elements once they reach a
  0.1 intersection threshold. The class is never removed, so reveals occur
  once per page load.
- Scrolling past 20 pixels adds `.scrolled` to the top bar.
- Film cards with `.has-video` inject a Google Drive iframe into the thumbnail
  on first click.

### URL and routing behavior

- The vinext App Router exposes only `/`.
- The actual portfolio uses same-document hashes, not application routes.
- At `/`, hashes inside the child iframe belong to the iframe document. The
  parent application URL and React router do not know which portfolio section
  is active.
- Opening `/portfolio/index.html` directly exposes its hash in the browser URL,
  which behaves differently from viewing the same document through `/`.
- There is no active-section tracker, history controller, breadcrumb, back
  stack, or route transition state.

## 7. Existing Game-Like Systems

### Verified systems that exist

1. **Category loadout/select screen**
   - Implemented in `public/portfolio/index.html` around `#categoryMenu` and
     the `selectCategory()`/`setMenu()` functions.
   - Uses large collectible-style object art, path numbers, section-specific
     accents, selection state, and keyboard navigation.
   - This is the strongest current game-like interaction.

2. **Cosmetic Game Mode shortcut**
   - A document-level `G` shortcut toggles an in-memory `gameMode` boolean.
   - It changes the root `--accent` value and applies contrast/saturation to
     the body.
   - The CSS and script reference a `#hint` element, but no such element exists
     in the HTML, so the shortcut has no visible instructions or status label.
   - The state is lost on reload and has no gameplay effect.

3. **Game vocabulary and presentation**
   - Labels such as loadout, paths, playable worlds, systems lab, origin story,
     and current quest provide a game-like frame.
   - Category artwork functions like character/item selection art.

### Systems that do not exist

There is no verified implementation of:

- player/avatar state or movement
- worlds, rooms, scenes, maps, or levels
- NPCs, dialogue, interaction prompts, or branching choices
- quests, inventory, skills, achievements, trophies, or progression
- camera control, physics, collision, sprites, or animation controllers
- canvas, WebGL, Three.js, Phaser, PixiJS, Babylon.js, or another renderer
- game loop or `requestAnimationFrame` loop
- sound effects, music controller, local audio, or audio state
- persistent save data, unlocked state, profile state, or session state

Project descriptions mention those concepts in Bobby's games and research, but
the portfolio website itself does not implement them.

## 8. Design System

### Visual language

The active `fusion-hig-m3` theme combines Apple-like translucent surfaces and
restraint with Material-style color roles, elevation, shapes, state layers, and
focus treatment.

Core visual traits:

- light neutral page foundation with blue/yellow/pink atmospheric gradients
- translucent white navigation and cards with backdrop blur
- large, heavy, tightly spaced display typography
- pill-shaped labels and controls
- rounded cards (`14px` to `40px` system shape tokens)
- category-specific accent rails, glows, chips, and card tints
- subtle elevation tokens and small hover lifts
- generated transparent object artwork in the launch screen

Section colors are explicit CSS variables:

- Games: yellow `#fbbc04`
- Films: purple `#a142f4`
- BandDream: pink `#ff2d55`
- Research: green `#188038`
- About: blue `#007aff`
- Contact: indigo `#5856d6`
- Now & Next: orange `#ff9500`

### Typography

The HTML loads Instrument Serif, Space Grotesk, and JetBrains Mono from Google
Fonts. The final fusion layer primarily uses the system/SF/Google Sans/Space
Grotesk stack for headings and body copy, with JetBrains Mono for technical
labels. Earlier serif rules remain in the file but are mostly overridden by the
later fusion layer.

### Icons and imagery

- There is no icon component/library in use.
- Hamburger bars, arrows, the close mark, dots, and status indicators are CSS
  or text characters.
- Runtime imagery consists of 14 PNGs: seven covers and seven menu objects.
- The menu objects are transparent collectible-style raster illustrations.
- The repository has no runtime 3D model, sprite sheet, texture atlas, or audio
  file.

### What already feels game-like

- full-screen path selection on first entry
- selected-state roster with arrow-key browsing
- featured category object and dynamic accent color
- numbered paths and game-oriented terminology
- large staged artwork with a loadout-like readout

### What remains conventional

- all substantive content is a vertical scrolling portfolio
- project cards and timeline are standard web sections
- entering a path only scrolls to a section
- there is no spatial continuity, avatar, world model, progression, consequence,
  or interaction beyond choosing and scrolling

### CSS organization

`public/portfolio/index.html` contains two style tags, 23 inline style
attributes, and several chronological override layers: the original dark
portfolio, an M3 refinement, the Apple/Google fusion theme, section color
enhancements, and the game-like selector. This preserves visual history but
creates specificity and maintenance risk.

## 9. State Management

There is no state-management library.

Active state is limited to local variables and DOM attributes in the inline
script:

- `i`: typewriter character index
- selected category: represented by `aria-pressed` on category buttons
- menu open state: represented by classes and ARIA attributes
- injected film player state: represented by whether a thumbnail contains an
  iframe
- reveal state: represented by the `.in` class
- `gameMode`: one in-memory boolean
- navigation bar state: represented by the `.scrolled` class

Nothing is persisted. There is no React state, reducer, context, global store,
URL-derived active-section model, local/session storage, or server state.

## 10. Animation / Graphics Systems

### Existing animation

- CSS pulse and cursor blink keyframes from the original theme
- floating animation for the selected category object
- opacity/transform reveal transitions triggered by `IntersectionObserver`
- hover lifts, shadow changes, and color transitions
- a JavaScript typewriter effect using recursive `setTimeout`
- a 140 ms image-swap transition in `selectCategory()`

The final fusion theme disables the original brand pulse. A
`prefers-reduced-motion` rule shortens CSS animation/transition duration, but it
does not disable the JavaScript typewriter or image-swap timers.

### Graphics

There is no canvas, SVG scene, WebGL, or 3D rendering path. All graphics are
normal DOM/CSS/raster images. This keeps the current site simple but means a
future overworld or avatar system would be a new subsystem rather than an
extension of an existing renderer.

## 11. Asset System

Runtime assets are organized clearly under `public/portfolio/assets/`:

```text
assets/
├── covers/
│   ├── one-last-bird.png
│   ├── chickens-breakout.png
│   ├── five-nights.png
│   ├── cn-gamemaker.png
│   ├── shamans-documentary.png
│   ├── air-dynamics.png
│   └── war-vehicles.png
└── menu-objects/
    ├── games-woodpecker.png
    ├── films-camera.png
    ├── banddream-guitar.png
    ├── research-flask.png
    ├── about-compass.png
    ├── contact-phone.png
    └── now-quest-map.png
```

The seven menu object PNGs are the dominant payload, totaling roughly 6.4 MB
in source form. The built output is approximately 10 MB. The two largest menu
assets are approximately 1.2 MB each in source and expand to about 2.1 MB each
in the build output. All seven choice thumbnails and the active hero are loaded
on the launch screen; there is no lazy loading, responsive `srcset`, AVIF/WebP
variant, or preload strategy.

Video is not stored locally. Four Google Drive URLs are used:

- two film videos injected after a click
- two BandDream videos loaded immediately as iframes

There is no local audio, video, model, font, or animation asset pipeline.

## 12. Responsive / Mobile Architecture

The portfolio uses CSS media queries rather than JavaScript layout state.
Important breakpoints are `1050px`, `980px`, `880px`, `780px`, and `700px`.

Verified responsive behavior includes:

- hero changes from two columns to one
- work cards collapse to one column
- film/music video cards collapse to one column
- research cards collapse to full width
- About columns collapse to one column
- timeline changes from four columns to a two-column stacked layout
- contact links change from five columns to two, then one
- the stats strip changes from four columns to two
- corner metadata is hidden on smaller screens
- the category roster becomes a horizontally scrollable, snap-aligned list
- category cards and artwork shrink at the mobile breakpoint
- the selector removes its keyboard-instruction pills on small screens

The compact category screen uses `100dvh`, overflow scrolling, stable aspect
ratios, and horizontal scroll containment, which are good foundations for
mobile. There is no touch gesture logic; touch relies on normal button/link and
scroll behavior.

## 13. Important Files

- `public/portfolio/index.html`: Read first. It contains nearly all visible UI,
  content, CSS, navigation behavior, and interaction state.
- `app/page.tsx`: Shows that the portfolio is embedded rather than rendered as
  React components.
- `app/globals.css`: Defines the full-screen iframe boundary and outer overflow.
- `app/layout.tsx`: Defines outer metadata and document structure.
- `vite.config.ts`: Explains vinext, Sites, Cloudflare, and local polling setup.
- `worker/index.ts`: Production request handling and optional image optimizer.
- `package.json`: Installed dependencies and build/test/lint commands.
- `tests/rendered-html.test.mjs`: Currently stale; tests the removed starter
  skeleton instead of the portfolio.
- `app/_sites-preview/`: Unused starter skeleton retained only by stale tests.
- `AGENTS.md`: Design principles and local-first publishing policy.
- `.openai/hosting.json`: Sites project identity; D1/R2 are disabled.

## 14. Technical Strengths

1. **Low runtime complexity.** The portfolio is mostly static DOM and CSS, so
   it builds quickly and does not depend on a backend.
2. **Clear content anchors.** Seven stable section IDs already provide a useful
   vocabulary for future scenes, destinations, quests, or map nodes.
3. **Declarative category metadata.** The category buttons already contain a
   compact content manifest in `data-*` attributes that can be extracted into a
   structured model later.
4. **Useful interaction/accessibility groundwork.** Real buttons and links,
   focus-visible styles, ARIA selection state, Escape handling, arrow-key
   navigation, and focus restoration are already present.
5. **Responsive foundations.** The existing grids, breakpoints, dynamic
   viewport height, and mobile category carousel are reasonably adaptable.
6. **Tokenized section identity.** Color, shape, motion, elevation, and
   per-section accents are expressed as CSS variables.
7. **No graphics-engine lock-in.** A future 2D/3D layer can be selected based on
   actual requirements rather than inherited technical debt from an existing
   game engine.

## 15. Technical Problems / Risks

### Current problems

1. **Six broken internal detail links.** Five game pages and one research page
   are referenced but absent.
2. **Stale tests.** `tests/rendered-html.test.mjs` expects the original loading
   skeleton and currently fails both tests. The production build and lint pass.
3. **Monolithic implementation.** Content, styling, and behavior are coupled in
   one 3,177-line HTML file with layered overrides and inline styles.
4. **Iframe architecture boundary.** The React app cannot directly observe or
   control the portfolio's selected section, focus, scroll position, or DOM.
5. **Incomplete selector modality.** The full-screen selector does not use
   `role="dialog"`, `aria-modal`, `inert`, or a focus trap. Underlying content
   remains in the accessibility tree and keyboard tab order while it is open.
6. **Misleading keyboard copy.** "Enter to select" does not navigate from a
   selected category button; visitors must activate a separate link.
7. **Invisible Game Mode status.** The code references `#hint`, but the element
   is absent.
8. **External media fragility.** Google Drive embeds depend on third-party
   availability and permissions and have no local fallback/error UI.
9. **Heavy launch assets.** All menu art is raster, relatively large, and loaded
   immediately without responsive variants or lazy loading.
10. **Unused scaffold surface.** Auth, D1, the starter preview, Tailwind, and
    related dependencies are not part of the active portfolio but increase
    repository complexity.
11. **Two package-manager lockfiles.** `package-lock.json` and `pnpm-lock.yaml`
    can drift unless one package manager is designated as authoritative.

### Potential future problems

1. Adding HUD, avatar, quest, and route state inside the iframe would create a
   second application architecture and make parent/child synchronization hard.
2. Continuing to add behavior directly to the monolithic HTML will increase
   selector conflicts, event coupling, and regression risk.
3. A full 3D/WebGL overworld would add a large asset/rendering budget on top of
   an already image-heavy first screen, especially on mobile.
4. Always-running visual effects, audio, or camera motion would require explicit
   reduced-motion, mute, pause, visibility, and low-power handling.
5. Deep links, browser back/forward behavior, analytics, and shareable project
   URLs will remain weak until navigation state is represented at the app level.
6. Persisted progression would require versioned state and a clear distinction
   between playful progress and access to essential portfolio information.

### Already designed well for expansion

- The section IDs can become stable destination IDs.
- The existing category manifest can become structured application data.
- Section colors already form a navigation legend.
- Category assets already provide visual identities for future world nodes.
- The static content remains usable without a canvas or game renderer.
- Keyboard and mobile considerations exist early rather than being entirely
  absent.

## 16. Best Expansion Points for Game-Like Features

### Navigation/world state - build this first

Relevant current code:

- `public/portfolio/index.html` category buttons near `#categoryMenu`
- `selectCategory()` and `setMenu()` in the same file
- section IDs `#games`, `#films`, `#banddream`, `#research`, `#about`,
  `#contact`, and `#now`

Extract the existing `data-*` category manifest into one structured source of
truth and define an explicit navigation state: selected destination, active
destination, previous destination, menu state, and transition state. This is
the minimum foundation needed by a hub, map, HUD, avatar, quests, and browser
history. It can initially preserve the current visual UI and content.

The iframe boundary should be resolved or deliberately bridged before this
state becomes complex. Prefer moving the portfolio into the application layer
over creating a second full game application inside the iframe, unless a
specific isolation requirement justifies it.

### Game hub / overworld

- Start from the category selector/stage in `public/portfolio/index.html`.
- Reuse the seven section IDs, category art, descriptions, and accents as world
  nodes.
- Keep essential destinations accessible through a conventional fallback list.

### Player avatar / profile screen

- `#about` is the natural profile destination.
- The hero metadata and About stats can become character attributes.
- No current avatar state or model exists; this would be new UI built on the
  future navigation state.

### Interactive project worlds

- `#games` and its `.work` cards are the correct project data source.
- Missing detail pages must be resolved before turning cards into levels.
- Each project should gain a stable route/data record before adding richer
  scenes.

### Skill tree

- The About `.strip`, hero tool/stack metadata, and project role tags are the
  closest current sources.
- There is no canonical skill data model, so one should be created before the
  tree visualization.

### Quest/history log

- `#now .timeline` already contains quest-like chronological entries.
- Timeline rows can become structured quest records with status and related
  project IDs without changing their readable fallback presentation.

### Achievements

- The About stats and project completion labels are seed data.
- Achievement criteria and state do not exist; avoid inventing unlock logic
  until project/quest data is structured.

### HUD and map

- The fixed `#nav` is the natural HUD mounting point.
- The category selector is the current map/destination picker.
- Both need access to the same app-level navigation state to avoid duplicated
  truth.

### Dialogue and interaction prompts

- No existing dialogue system is present.
- A future accessible dialogue component should live in the application layer,
  not be added as more ad hoc inline HTML/JavaScript.

### Sound design and transitions

- No sound system exists.
- Any future audio manager should include explicit mute, volume, autoplay-safe
  start behavior, visibility pause, and persistence.
- Existing CSS motion tokens and reduced-motion rules can seed transitions, but
  JavaScript-driven animations also need reduced-motion checks.

## 17. Recommended Files to Read First

Read in this order:

1. `CODEX-PROJECT-CONTEXT.md`
2. `AGENTS.md`
3. `public/portfolio/index.html`
4. `app/page.tsx`
5. `app/globals.css`
6. `app/layout.tsx`
7. `package.json`
8. `vite.config.ts`
9. `worker/index.ts`
10. `tests/rendered-html.test.mjs`

Before implementing future game-like systems, also verify the six missing
detail-page targets and decide whether the root app should continue embedding
the portfolio or own it directly.
