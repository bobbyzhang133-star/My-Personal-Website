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

### Original portfolio artwork

- The pixel camera and guitar were created for this Home Room and matched to the Cool School tileset's scale, palette, perspective, and shading language.
- The rug and lighting overlays are original Home Room artwork. They are exported separately where layering is needed for interaction, occlusion, responsive composition, or restrained parallax.
- Exact original-file inventory: `camera-original.svg`, `guitar-original.svg`, `rug-original.svg`, and `lighting-overlay-original.svg`.

### Temporary and missing artwork

- The current bird sprite sheet is an original temporary proxy with idle, walk-left, and walk-right states. It is marked as temporary internally and must not be represented as the final One Last Bird character artwork.
- Temporary-file inventory: `bird-temporary-sprites.svg`.
- The actual One Last Bird sprite was not found in the project files or Git history. The existing flattened game cover is not a reusable character sprite, and no generic third-party bird has been substituted as final artwork.

### Interaction mapping and scope

- Games → Bird
- Films → Camera
- Research → Book
- Music → Guitar
- AI → Computer
- This asset direction applies only to the Home Room. It has not been propagated to the category or professional pages, and this approval pass is not deployed.

## Rejected generated reference

- The OpenArt-generated room concept was rejected and is not used in the Home Room, included in the public asset tree, or shipped. It is preserved only as an archived rejected direction in the Figma file so it cannot be mistaken for an approved production asset.
