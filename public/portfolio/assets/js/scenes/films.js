import { projects } from '../content.js?v=39bd00589fe9';
import { $$, esc } from '../utils.js?v=39bd00589fe9';
import { addSwipe, bindLinearKeys, sceneController } from './shared.js?v=39bd00589fe9';
import { ROOM_OBJECT_ASSETS } from './object-assets.js?v=39bd00589fe9';

const films = projects.filter(project => project.category === 'films');

function copy(project, index) {
  return `<p class="eyebrow">Frame ${index + 1} / ${films.length} · ${esc(project.yearStatus)}</p><h2>${esc(project.title)}</h2><p>${esc(project.description)}</p><p class="role-line">${project.roles.map(esc).join(' · ')}</p><a class="select-button" href="${project.detailRoute}">Open film project ↗</a>`;
}

export function renderFilms({ preview = false } = {}) {
  const id = preview ? '' : ' id="main"';
  return `<main${id} class="game-scene object-scene films-scene" data-scene="films" tabindex="-1" aria-labelledby="films-title">
    <h1 class="visually-hidden" id="films-title">Film Archive</h1>
    <div class="object-stage camera-object" data-object-interface="camera">
      <div class="camera-reels" aria-hidden="true"><span></span><span></span></div>
      <div class="camera-top" aria-hidden="true"><img class="object-source-sprite camera-source-sprite" src="${ROOM_OBJECT_ASSETS.films}" alt=""><span>FILM ARCHIVE</span><i></i><b>REC · 24</b></div>
      <div class="camera-body">
        <div class="camera-viewfinder" data-category-interface>
          <div class="viewfinder-hud" aria-hidden="true"><span>REC</span><b>24 FPS</b><i></i></div>
          <section class="film-browser scene-surface" data-film-browser data-keyboard-surface aria-label="Film archive">
            <div class="reel reel-a" aria-hidden="true"></div><div class="reel reel-b" aria-hidden="true"></div>
            <button class="film-arrow prev" type="button" aria-label="Previous film">←</button>
            <div class="film-strip" role="listbox" aria-label="Film projects">${films.map((project, index) => `<button class="film-frame" type="button" role="option" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-index="${index}"><span class="perfs" aria-hidden="true"></span><img src="${project.artwork}" alt="${esc(project.title)} poster"><span>Frame ${String(index + 1).padStart(2, '0')}</span></button>`).join('')}</div>
            <button class="film-arrow next" type="button" aria-label="Next film">→</button>
            <div class="film-copy" aria-live="polite">${copy(films[0], 0)}</div>
          </section>
        </div>
        <div class="camera-controls" aria-hidden="true"><span></span><span></span><i></i><b>ISO 400</b></div>
      </div>
      <div class="camera-grip" aria-hidden="true"></div>
      <div class="camera-feet" aria-hidden="true"><i></i><i></i></div>
    </div>
  </main>`;
}

export function mountFilms(root) {
  const lifecycle = sceneController();
  const { signal } = lifecycle;
  const surface = root.querySelector('[data-film-browser]');
  const frames = $$('.film-frame', surface);
  const output = surface.querySelector('.film-copy');
  let index = 0;
  const render = (nextIndex, focus = false) => {
    index = (nextIndex + frames.length) % frames.length;
    frames.forEach((frame, frameIndex) => {
      const active = frameIndex === index;
      frame.setAttribute('aria-selected', String(active));
      frame.tabIndex = active ? 0 : -1;
      frame.dataset.position = frameIndex - index;
    });
    output.innerHTML = copy(films[index], index);
    if (focus) frames[index].focus({ preventScroll: true });
  };
  surface.querySelector('.prev').addEventListener('click', () => render(index - 1, true), { signal });
  surface.querySelector('.next').addEventListener('click', () => render(index + 1, true), { signal });
  frames.forEach((frame, frameIndex) => frame.addEventListener('click', () => render(frameIndex), { signal }));
  bindLinearKeys(surface, frames, () => index, render, { signal });
  addSwipe(surface, () => render(index + 1), () => render(index - 1), signal);
  render(0);
  return lifecycle;
}
