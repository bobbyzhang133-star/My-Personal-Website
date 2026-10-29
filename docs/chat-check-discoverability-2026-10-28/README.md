# Chat Check: selectable objects still need clearer indications

Bobby's latest feedback: **“Still not much indication for interactable objects.”**

Review the current Home Room and recommend a concrete next pass. This is a review request, not authorization to deploy or automatically implement the response.

- Repository: `bobbyzhang133-star/My-Personal-Website`
- Branch: `codex/game-experiences-2026-10-13`
- Runtime: `43292090dc3e`
- Previous reviewed commit: `6fb2821945ee94deaa1fc65b27af78d33afb8477`

## Current implementation

- Bird → Games, Camera → Films, Book → Research, Electric guitar → Music, Laptop → AI.
- Room-referenced art revisions give the guitar a wine-red/cream identity, the book an indigo cover edge, and the camera chrome/blue-green highlights. The book is still open with mostly cream pages visible. Laptop and bird opaque source pixels are retained. Registered crops, silhouette contours and support planes share the master camera.
- `room-discovery.js` starts a first-session lesson 1550 ms after loaded/visible/stable Home, with 85 ms contour stagger. Meaningful interaction acknowledges the lesson; session acknowledgement suppresses repeated introductions. Menu, hidden and busy states pause/cancel it.
- Manual `?` reveal lasts 2300 ms and has a small “Show interactive objects” hover/focus tooltip. Object names, `[E]` and large permanent cards are absent.
- Camera glints alternate around 6.2/6.8-second cycles; book page corner lifts three pixels; guitar gets a restrained reflection; laptop screen and bird retain their cues. Reduced motion uses static contrast/saturation instead of moving idle cues.
- Object-shaped cream contours/dark keylines appear on hover/reveal; keyboard adds a dashed focus cue. Click/tap activates directly. Portrait pans sideways; targets keep minimum hit-area expansion.
- Latest framing covers the viewport uniformly; no corner sound HUD. Sound is default-on with mute in Settings, subject to browser gesture requirements.

## Review questions

1. Before any hover or help interaction, do the five targets communicate selectable objects, or just attractive decoration? Rank them and identify what the current resting screenshots actually support.
2. Distinguish visual salience from clickability. Are the new palettes sufficient? Does the open book's small colored cover edge materially help?
3. Does the early, brief lesson reliably teach the interaction? Inspect acknowledgement/cancellation paths: could focusing one target or panning once suppress discovery before other targets were noticed? Do not simply recommend the earlier reveal timing again; that change already exists.
4. On portrait, does a reveal of offscreen objects teach anything useful? Recommend a minimal solution that preserves one-tap entry, deliberate panning and grounded camera continuity.
5. What persistent or repeatable cue, if any, would communicate interactivity better while matching this room's art and avoiding excessive labels, halos or a crowded HUD? Evaluate the prior no-permanent-outline preference against Bobby's continuing usability feedback, rather than assuming the current balance succeeds.
6. Give a prioritized, bounded implementation plan, source paths and acceptance checks. Include a small first-time-user test and reduced-motion/touch criteria. Separate observations, hypotheses and unperformed tests.

## Evidence

Fresh browser captures of this runtime, not the older public deployment:

- [Desktop resting, 1280 × 720](room-rest.png)
- [Desktop manual reveal](room-reveal.png)
- [Keyboard focus](room-keyboard.png)
- [Portrait resting, 390 × 844](room-portrait-rest.png)
- [Portrait manual reveal](room-portrait-reveal.png)

These are viewport/browser reviews, not physical-phone tests or first-time-user research. An acknowledged browser session was used for the fresh captures; they do not prove first-entry timing. Automated lifecycle regressions cover lesson timing/cancellation/session behavior. Motion cannot be judged from a static image alone.

Source paths: `public/portfolio/assets/js/scenes/{room.js,room-discovery.js,room-master.js}`, `public/portfolio/assets/css/game-shell.css`, `public/portfolio/assets/room/master/discoverability-provenance.json`, and `tests/rendered-html.test.mjs`.

Validation at upload: release consistency, **65/65 tests**, runtime/scripts/test ESLint, build and whitespace checks passed. Desktop Home loaded the current runtime with zero broken completed images. Build retains its existing vinext static-classification advisory. Prior local category/Room and source-link verification is recorded in project context; those are not usability success evidence.

The upload also preserves already-completed media-source restoration and the explicit local-preview/publication rule so the integrated runtime remains coherent. They are outside this review's design focus. Private decks, raw game builds, recovery artifacts and local-only launchers are excluded. No public deployment is requested; the public Netlify site is an older revision and must not be used as evidence for this commit.
