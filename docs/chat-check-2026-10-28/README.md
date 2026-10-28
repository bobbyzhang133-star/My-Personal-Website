# Chat Check: selectable object discoverability

Bobby's focus: **Make selectable objects obvious to users so they understand they can select them.** Review the Home Room's five entry objects: Bird → Games, Camera → Films, Book → Research, Guitar → Music, Laptop → AI.

Review the current branch `codex/game-experiences-2026-10-13`, runtime release `0985987b2294`. The pending upload includes the completed studio-menu styling, synchronized entry/module versions, regressions and persistent project rules. This Chat Check does not implement a new discoverability design.

## Evidence and relevant sources

- `room-current.png`: current local Home Room, captured October 28. Assess first-time discovery before hover, rather than assuming a visitor already knows the targets.
- `public/portfolio/assets/js/scenes/room.js`: semantic category links, idle cues, keyboard navigation, touch panning, one-tap navigation and temporary reveal behavior.
- `public/portfolio/assets/js/scenes/room-master.js`: source object contours, positions and support geometry.
- `public/portfolio/assets/css/game-shell.css`: resting/hover/focus/reveal styles and reduced-motion rules; also contains the studio menu changes.
- `public/portfolio/assets/room/master/studio-master.webp`: approved environment artwork.
- `.cursor/rules/clean-ui.mdc` and `scene-ui-art-style.mdc`: approved UI constraints.

## Requested review

1. Can a first-time visitor distinguish interactive objects from decorative props before hovering? Which objects are hardest to discover, and why?
2. Are contour highlights clear on hover and keyboard focus, and does the small question-mark reveal aid communicate its purpose?
3. Does discovery work on touch, where there is no hover? Consider portrait framing, panning, hit areas and reduced motion. A desktop screenshot alone cannot establish mobile usability.
4. Recommend a small, prioritized set of improvements using composition, contrast and restrained object-specific animation. Keep the approved room artwork, grounded dimensions, coherent palette and clean UI. Avoid permanent large labels, oversized cards or blanket neon glows.
5. Provide concrete implementation suggestions and acceptance checks, with relevant file references. Distinguish observed problems from hypotheses that need user testing. Do not redesign unrelated category pages or claim to have tested a site you could not access.

## Verification and limits

Release consistency, 57/57 regression tests, focused ESLint, production build and whitespace checks passed October 28. Existing build output includes a vinext static route-classification note. Earlier menu QA covered desktop, portrait and short landscape, keyboard/menu lifecycle, category returns and theme isolation; those checks are not first-time-user discoverability research.

Production at https://bobbyzhang-profile.netlify.app/ remains release `5d56ac3eab02`; a previous Netlify publication returned Forbidden. Treat it as an older comparison, not proof that the uploaded menu revision is live. Local URLs and filesystem paths are not accessible to an external reviewer. No new public deployment is requested by this Chat Check.
