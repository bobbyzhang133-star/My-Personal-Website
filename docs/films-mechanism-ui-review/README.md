# Films UI as part of the mechanism — Chat Check

Bobby’s focus: “Rather than having webpage-liek UI, I want the UI to be part of the films mechinic system.”

Current local runtime: `3fe186ecf43b`, native Blender/WebGL model v5. Public hosting has not been updated. Earlier v1–v4 model assets remain available; v5 adds to the v3 casting/frame/reel layout. The UI redesign has not been implemented in this review checkpoint.

## Evidence

- [Current desktop](desktop.jpg)
- [Current portrait](portrait.jpg)
- [Active transport](transport.jpg)
- [Room return](room-return.jpg)
- [Earlier version](earlier-version.jpg)
- [Bobby’s mechanism reference board](mechanism-reference.png)

The permanent `.gate-deck` bottom area still contains Previous/Next, gate state, a Play button, title, metadata, description and source/project links. It is styled to match the machinery, but remains a webpage panel rather than a control surface in the mechanism. This is the primary review target. Suggest a specific physical layout and interaction sequence rather than simply recoloring that panel.

## Source

- `public/portfolio/assets/js/scenes/films.js`: rendering, navigation, playback, pause and selected-frame state.
- `public/portfolio/assets/js/scenes/camera-live.js`: actual shared 3D camera, model rendering, projected film planes and hit tests.
- `public/portfolio/assets/js/scenes/film-kinematics.js`: path frames and coupled mechanism movement.
- `public/portfolio/assets/js/scenes/film-gate-geometry.js`: shared canonical model coordinates.
- `public/portfolio/assets/css/game-shell.css`: scoped Films UI and responsive layout.
- `scripts/build-camera-reference.py`, `film-reference-model.py`, `film-reference-materials.py`: native Blender source and export.
- `public/portfolio/assets/room/camera-live-v5/`: active geometry, portable GLB and surface maps.

## Review constraints

Keep the old versions and extend the earlier design. Preserve the Room camera identity, grounded support, actual 3D opening, fixed visible gate, original cover aspect ratios, empty leader frames, same-selection playback return and working source links. Preserve the clean global Room/Menu controls. Native model changes should use connected Blender MCP. HTML semantics and hit targets may remain as accessible overlays registered to modeled surfaces; the goal is a physical-looking and physically placed UI, not inaccessible canvas-only controls. Ensure keyboard, focus, touch, minimum usable targets and reduced motion.

Use the mandatory reference-check loop: inspect the supplied board → implement accordingly → compare actual screenshots/motion → repeat from step 1 while relevant mismatches remain. Keep the current vertical layout and always-visible cutaway gate, as Bobby requested after the reference board. Work only in Films and its camera transition. Do not redesign other pages or publicly deploy.

Local verification before upload: 101 Node regressions, scoped ESLint, production build, Python syntax, release and whitespace checks. Desktop/portrait/landscape, selection, pause/resume, source-video imagery, resize, reduced motion, Room return and detail return were reviewed. No claim of remote CI or physical-device performance. This scoped commit excludes unrelated local authoring files, private recovery assets, decks and game builds.

Please return a focused, concrete implementation prompt for Codex, including modeled controls/surfaces, content hierarchy, positions relative to the gate, motion behavior, mobile adaptation and acceptance checks.
