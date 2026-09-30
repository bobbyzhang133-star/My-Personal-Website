# Bobby Zhang Personal Website

A portfolio for Bobby Zhang's games, films, music, research, and AI tools. This
version combines Apple Human Interface Guidelines, Material Design 3, and a
game-like category-selection experience.

## Highlights

- Interactive `Select your path` portfolio launch screen
- Category-specific generated object artwork
- Responsive layouts for desktop and mobile
- Game project pages and cover artwork
- Film, BandDream, research, about, timeline, and contact sections
- Keyboard-accessible category navigation and reduced-motion support

## Local Development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

The portfolio is served through the application root. The static portfolio
source is located at `public/portfolio/index.html`.

## Validation

```bash
npm run build
```

## Hosting

Production hosting uses Netlify. `netlify.toml` publishes
`public/portfolio` directly, so the portfolio's `index.html` is served at the
site root and its relative image paths continue to work.

Connect this repository to Netlify for continuous deployment from `main`.

## Project Structure

- `app/`: vinext application shell
- `public/portfolio/`: portfolio HTML, game pages, covers, and menu artwork
- `public/portfolio/assets/menu-objects/`: category-selection artwork
- `tests/`: rendered HTML checks
- `AGENTS.md`: design and local-first publishing guidance
- `netlify.toml`: Netlify static publishing and response-header configuration

Website changes should be developed and verified locally. Publishing is a
separate explicit step.
