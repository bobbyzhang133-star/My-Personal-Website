# Site Design Guidance

- Aim for the highest quality the task calls for. Choose the method that delivers the best result, even when it takes more work. Do not take shortcuts that sacrifice fidelity, correctness, accessibility, or maintainability. When replacing approved work, compare the result directly with the approved reference at the actual display size and in its intended context. Resolve visible regressions before calling the work done.

- **Reference check** means the mandatory loop in `.cursor/rules/reference-check.mdc`: (1) inspect the reference, (2) work according to it, (3) compare the actual output against it, and (4) if it does not match, repeat from step 1 until it does. Steps 3 and 4 are crucial completion requirements. Merely acknowledging or documenting mismatches does not complete the task.

- For each guitar model revision, look up a real guitar reference and compare the finished front and angled renders at Music close-up scale. Trace all six strings from their posts through the nut to their saddles and check their order and clearance before delivery.

- Follow `.cursor/rules/films-preserve-and-reference.mdc` for every Films/camera/mechanism task: preserve earlier versions, add to the earlier design, and compare the completed work against Bobby's supplied Cinematic Film Mechanism Interaction Board and baseline screenshots after each task. The v4 rebuild is a separate candidate, not permission to discard the older version.

- Follow `.cursor/rules/publish-completed-website-work.mdc`: always edit and verify locally, provide the working local preview link, and publish to the public website only when Bobby explicitly requests publication of that update.
- Follow `.cursor/rules/chat-check.mdc` when Bobby invokes **Chat Check**: verify and upload the relevant work to GitHub, then send the specified review focus to the designated ChatGPT conversation. Defining the term does not invoke it.
- Follow `.cursor/rules/scene-ui-art-style.mdc` for every UI change: match the active scene's approved palette, rendering style, materials and typography; do not impose one generic skin across different scenes.
- Follow `.cursor/rules/clean-ui.mdc` for portfolio UI work: keep the normal view uncluttered, move secondary controls behind accessible disclosures, and preserve Cat/Rat's approved top-left character return and bottom-right inventory only.
- Follow `.cursor/rules/portfolio-release-navigation.mdc` for every portfolio runtime change: synchronize all entry documents and module versions, verify the release check, and test detail/category/Room return paths.
- Follow `.cursor/rules/game-route-progression.mdc` for game scenes: linear discovery order is not straight geometry or a camera lock; preserve source camera families and local observation freedom.

- For future website design work in this project, use Material Design 3 as the baseline design skill set: color roles, surface containers, elevation, expressive shape, adaptive layout, accessible focus states, and restrained motion.
- Preserve Bobby Zhang's portfolio identity when applying M3. The site should still feel cinematic, creative, and personal; M3 should improve structure, hierarchy, and usability rather than flatten the art direction.
- Prefer token-based CSS variables for color, shape, and motion so future sections can stay visually consistent.
- Check desktop and mobile layouts for title/description overlap before finishing design changes.
- Also use Anshu Chimala's design workflow from Lenny's Newsletter, "How to turn your AI into a world-class designer" (https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world), as a creative-process reference. Start with a bold, specific experiential metaphor instead of a generic layout; use image generation when bespoke visual assets materially strengthen that metaphor; review the result from screenshots rather than code alone; and finish by removing decorative or explanatory elements that do not improve comprehension or interaction.
- When combining this workflow with Apple HIG and Material Design 3, keep the memorable concept in the overall composition and imagery, Apple-level restraint in the final polish, and M3 color roles, states, accessibility, and responsive behavior in the interaction system.
- Default delivery workflow: make and verify website edits locally and send Bobby the clickable local preview URL. Keep changes local until Bobby explicitly asks to publish that update. When asked, use the existing Netlify workflow, verify the deployment and send the clickable live URL; report any failure without claiming the update is live.
