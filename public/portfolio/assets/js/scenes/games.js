import { projects } from '../content.js?v=43292090dc3e';
import { $$, esc } from '../utils.js?v=43292090dc3e';
import { addSwipe, bindLinearKeys, sceneController, setRoving } from './shared.js?v=43292090dc3e';
import { GAME_ANIMATIONS, mountCharacterAnimations } from '../game-animation.js?v=43292090dc3e';

const games = projects.filter(project => project.category === 'games');

function characterArt(project) {
  const animation = GAME_ANIMATIONS[project.id];
  const status = animation ? 'original-game-animation' : project.characterAssetStatus || project.artworkStatus || 'generated-concept';
  const alt = animation || status === 'original-game-sprite' ? 'original game character' : status === 'original-game-model-posed-render' ? 'original Cat and Rat models posed together' : status.includes('generated') ? 'character concept' : 'gameplay preview';
  return `<img src="${project.characterArtwork || project.artwork}" alt="${esc(project.title)} ${alt}" data-asset-status="${status}">${animation ? `<canvas class="character-animation" data-character-animation="${project.id}" aria-hidden="true"></canvas>` : ''}${project.characterVideo ? `<video class="character-video" src="${project.characterVideo}" muted loop playsinline preload="none" poster="${project.artwork}" aria-hidden="true" hidden></video>` : ''}`;
}

function copy(project, index) {
  return `<p class="eyebrow">Player ${String(index + 1).padStart(2, '0')} / ${String(games.length).padStart(2, '0')}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><div class="tags">${[...project.roles, ...project.technologies].map(tag => `<span>${esc(tag)}</span>`).join('')}</div><a class="select-button" href="${project.detailRoute}">Select project <span aria-hidden="true">↗</span></a>`;
}

export function renderGames({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene games-scene" data-scene="games" tabindex="-1" aria-labelledby="games-title">
    <h1 class="visually-hidden" id="games-title">Character Select</h1>
    <div class="object-stage games-object-stage" data-object-interface="bird-character-select">
      <section class="games-character-ui character-select scene-surface" data-category-interface data-carousel="games" data-keyboard-surface aria-label="Choose a game">
        <div class="games-roster-stage">
            <button class="carousel-arrow prev" type="button" aria-label="Previous game">←</button>
            <div class="character-track">${games.map((project, index) => `<a class="character" href="${project.detailRoute}" data-index="${index}" aria-label="Open ${esc(project.title)}" tabindex="${index === 0 ? 0 : -1}"><span class="character-frame">${characterArt(project)}</span><span class="visually-hidden">${esc(project.title)}</span></a>`).join('')}</div>
            <button class="carousel-arrow next" type="button" aria-label="Next game">→</button>
        </div>
        <div class="select-copy visually-hidden" aria-live="polite">${copy(games[0], 0)}</div>
        <a class="game-select-action select-button" href="${games[0].detailRoute}" aria-label="Select ${esc(games[0].title)}">Select game <span aria-hidden="true">↗</span></a>
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
  const selectAction = surface.querySelector('.game-select-action');
  let index = 0;
  const render = (nextIndex, focus = false) => {
    index = (nextIndex + items.length) % items.length;
    items.forEach((item, itemIndex) => {
      item.dataset.position = itemIndex === index ? 'active' : itemIndex === (index - 1 + items.length) % items.length ? 'prev' : itemIndex === (index + 1) % items.length ? 'next' : 'hidden';
    });
    setRoving(items, index);
    output.innerHTML = copy(games[index], index);
    selectAction.innerHTML = `Select ${esc(games[index].title)} <span aria-hidden="true">↗</span>`;
    selectAction.href = games[index].detailRoute;
    selectAction.setAttribute('aria-label', `Select ${games[index].title}`);
    if (focus) items[index].focus({ preventScroll: true });
  };
  surface.querySelector('.prev').addEventListener('click', () => render(index - 1, true), { signal });
  surface.querySelector('.next').addEventListener('click', () => render(index + 1, true), { signal });
  items.forEach((item, itemIndex) => item.addEventListener('click', () => render(itemIndex), { signal }));
  bindLinearKeys(surface, items, () => index, render, { signal });
  addSwipe(surface, () => render(index + 1), () => render(index - 1), signal);
  render(0);
  mountCharacterAnimations(root, signal);
  return lifecycle;
}
