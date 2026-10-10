import { projects } from '../content.js?v=20261006-2';
import { $$, esc } from '../utils.js?v=20261006-2';
import { addSwipe, bindLinearKeys, sceneController, setRoving } from './shared.js?v=20261006-2';

const games = projects.filter(project => project.category === 'games');

function copy(project, index) {
  return `<p class="eyebrow">Player ${String(index + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="tags">${[...project.roles, ...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('')}</div><a class="select-button" href="${project.detailRoute}">Select project <span aria-hidden="true">↗</span></a>`;
}

export function renderGames({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene games-scene" data-scene="games" tabindex="-1" aria-labelledby="games-title">
    <h1 class="visually-hidden" id="games-title">Character Select</h1>
    <div class="object-stage games-object-stage" data-object-interface="bird-character-select">
      <section class="games-character-ui character-select scene-surface" data-category-interface data-carousel="games" data-keyboard-surface aria-label="Choose a game">
        <div class="object-label games-select-header" aria-hidden="true"><span>CHARACTER SELECT</span><i></i><b>PLAYER 01</b></div>
        <div class="games-roster-stage">
            <button class="carousel-arrow prev" type="button" aria-label="Previous game">←</button>
            <div class="character-track">${games.map((project, index) => `<button class="character" type="button" data-index="${index}" aria-label="Select ${esc(project.title)}" aria-pressed="${index === 0}" tabindex="${index === 0 ? 0 : -1}"><span class="character-frame"><img src="${project.characterArtwork || project.artwork}" alt="${esc(project.title)} character concept" data-asset-status="generated-concept"></span><span>${esc(project.title)}</span></button>`).join('')}</div>
            <button class="carousel-arrow next" type="button" aria-label="Next game">→</button>
        </div>
        <div class="select-copy" aria-live="polite">${copy(games[0], 0)}</div>
        <div class="games-select-hint" aria-hidden="true"><span>← →</span><b>Choose a character</b></div>
      </section>
    </div>
  </main>`;
}

export function mountGames(root) {
  const lifecycle = sceneController();
  const { signal } = lifecycle;
  const surface = root.querySelector('[data-carousel="games"]');
  const items = $$('[data-index]', surface);
  const output = surface.querySelector('.select-copy');
  let index = 0;
  const render = (nextIndex, focus = false) => {
    index = (nextIndex + items.length) % items.length;
    items.forEach((item, itemIndex) => {
      item.dataset.position = itemIndex === index ? 'active' : itemIndex === (index - 1 + items.length) % items.length ? 'prev' : itemIndex === (index + 1) % items.length ? 'next' : 'hidden';
    });
    setRoving(items, index);
    output.innerHTML = copy(games[index], index);
    if (focus) items[index].focus({ preventScroll: true });
  };
  surface.querySelector('.prev').addEventListener('click', () => render(index - 1, true), { signal });
  surface.querySelector('.next').addEventListener('click', () => render(index + 1, true), { signal });
  items.forEach((item, itemIndex) => item.addEventListener('click', () => render(itemIndex), { signal }));
  bindLinearKeys(surface, items, () => index, render, { signal });
  addSwipe(surface, () => render(index + 1), () => render(index - 1), signal);
  render(0);
  return lifecycle;
}
